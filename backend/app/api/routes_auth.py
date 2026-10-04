"""Passwordless login, verified by the Telegram bot.

Why not SMS: an SMS gateway costs money and needs a contract. Every seller here
already has Telegram, and tying the web account to the Telegram account means
listings, favourites and notifications follow the person across both surfaces.

    1. browser  POST /api/auth/start   -> code + t.me deep link + a 2-digit
                                          match_code to show on screen
    2. seller   taps the link; the bot asks them to pick the number on their
                screen among decoys, and only then approves the code
    3. browser  GET  /api/auth/poll    -> bearer token

Step 2 is the guard against a phishing link: an attacker can start a login
and send the deep link to a victim, but the victim does not see the attacker's
screen, so a tap on "Start" alone no longer hands over the account.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Request
from sqlalchemy import delete, func, select

from app.catalog import REGIONS
from app.config import settings
from app.db.database import AuthCode, Listing, User, WebSession, utcnow
from app.db.queries import normalize_phone

from . import ratelimit
from .deps import CurrentUser, DbSession, _token_from_header, is_admin
from app.models.schemas import AuthPollOut, AuthStartOut, MeOut, ProfileIn
from .serializers import serialize_seller

router = APIRouter(prefix="/auth", tags=["auth"])


def _aware(dt):
    return dt.replace(tzinfo=utcnow().tzinfo) if dt and dt.tzinfo is None else dt


@router.post("/start", response_model=AuthStartOut)
async def start_login(request: Request, session: DbSession) -> AuthStartOut:
    # Without a bot username there is no t.me link to send anyone to. Returning
    # an empty string here used to hand the browser a dead button and no
    # explanation; fail loudly instead, so a missing BOT_USERNAME is a
    # five-second fix rather than an afternoon of debugging the login flow.
    bot = settings.bot_username.lstrip("@")
    if not bot:
        raise HTTPException(
            503,
            "BOT_USERNAME sozlanmagan — Telegram orqali kirish o'chirilgan / "
            "login disabled until BOT_USERNAME is set",
        )

    # Each call writes a row; a loop should not be able to fill the table.
    ratelimit.enforce(f"auth:{ratelimit.client_ip(request)}", limit=20, window_seconds=600)

    # Opportunistic cleanup of stale codes.
    await session.execute(delete(AuthCode).where(AuthCode.expires_at < utcnow()))

    code = AuthCode.new()
    session.add(code)
    await session.commit()

    deep_link = f"https://t.me/{bot}?start=login_{code.code}"
    return AuthStartOut(
        code=code.code,
        deep_link=deep_link,
        expires_at=code.expires_at,
        match_code=code.match_code or "",
    )


@router.get("/poll", response_model=AuthPollOut)
async def poll_login(session: DbSession, code: str) -> AuthPollOut:
    row = await session.get(AuthCode, code)
    if row is None:
        return AuthPollOut(status="expired")
    if _aware(row.expires_at) < utcnow():
        await session.delete(row)
        await session.commit()
        return AuthPollOut(status="expired")
    # Consumed first: a code refused in the bot ("not me", or the wrong
    # number) is consumed without being approved, and the waiting screen must
    # hear that at once rather than spin until the code times out.
    if row.consumed:
        # Approved and consumed = the token was already handed out once.
        return AuthPollOut(status="expired" if row.approved else "refused")
    if not row.approved or row.user_id is None:
        return AuthPollOut(status="pending")

    user = await session.get(User, row.user_id)
    if user is None:
        return AuthPollOut(status="expired")

    web_session = WebSession.new(user.id)
    session.add(web_session)
    row.consumed = True
    await session.commit()

    return AuthPollOut(
        status="ok",
        token=web_session.token,
        user=serialize_seller(user),
        is_admin=is_admin(user),
    )


@router.get("/me", response_model=MeOut)
async def me(session: DbSession, user: CurrentUser) -> MeOut:
    count = (
        await session.execute(
            select(func.count()).select_from(Listing).where(Listing.seller_id == user.id)
        )
    ).scalar_one()
    return MeOut(
        user=serialize_seller(user),
        is_admin=is_admin(user),
        language=user.language or "uz",
        listings_count=count,
    )


@router.patch("/me", response_model=MeOut)
async def update_me(session: DbSession, user: CurrentUser, payload: ProfileIn) -> MeOut:
    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    if "region" in data and data["region"] and data["region"] not in REGIONS:
        raise HTTPException(422, f"Noma'lum hudud: {data['region']}")
    if "phone" in data:
        # Same normalisation the admin tools use, so a seller who registers on
        # the site is matched — not duplicated — when the founder later adds a
        # listing for the same number.
        data["phone"] = normalize_phone(data["phone"])
    for field in ("full_name", "village"):
        if field in data:
            data[field] = data[field].strip() or None
    for field in ("full_name", "phone", "region", "village", "language"):
        if field in data:
            setattr(user, field, data[field])
    await session.commit()
    return await me(session, user)


@router.post("/logout")
async def logout(
    session: DbSession,
    user: CurrentUser,
    authorization: Annotated[str | None, Header()] = None,
    everywhere: bool = False,
) -> dict:
    """End this session — or, with `everywhere=true`, every session.

    Signing out of the website used to sign the phone app out too, because it
    deleted every token the person had. One device, one token.
    """
    if everywhere:
        await session.execute(delete(WebSession).where(WebSession.user_id == user.id))
    else:
        token = _token_from_header(authorization)
        await session.execute(delete(WebSession).where(WebSession.token == token))
    await session.commit()
    return {"ok": True}


@router.post("/approve")
async def approve_from_bot(session: DbSession, code: str, user_id: int) -> dict:
    """Internal hook used by the bot when it runs in a separate process.

    In the default single-process deployment the bot approves codes directly
    through the shared database and never calls this.
    """
    raise HTTPException(404, "not enabled")
