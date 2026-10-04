"""Service / repository layer.

All database queries and presentation helpers live here so handlers stay thin.
Note: in async SQLAlchemy we never touch lazy relationships (e.g. listing.seller);
related rows are always fetched explicitly with session.get / select.
"""
from __future__ import annotations

import html

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog import category_label, region_label, unit_label
from app.db.database import Favorite, Listing, User
from app.districts import district_label
from app.phones import normalize_phone  # noqa: F401 — re-exported for callers


# --------------------------------------------------------------------------- #
#  Users
# --------------------------------------------------------------------------- #
async def get_or_create_user(session: AsyncSession, tg_user) -> tuple[User, bool]:
    """Fetch the user by Telegram id, creating it on first contact.

    Returns (user, created). Keeps username/full_name fresh on every call.
    """
    user = await session.get(User, tg_user.id)
    if user is None:
        user = User(
            id=tg_user.id,
            username=tg_user.username,
            full_name=tg_user.full_name,
            language="uz",
        )
        session.add(user)
        await session.commit()
        return user, True

    changed = False
    if user.username != tg_user.username:
        user.username = tg_user.username
        changed = True
    if user.full_name != tg_user.full_name:
        user.full_name = tg_user.full_name
        changed = True
    if changed:
        await session.commit()
    return user, False


async def get_lang(session: AsyncSession, user_id: int) -> str:
    user = await session.get(User, user_id)
    return user.language if user else "uz"


async def get_or_create_offline_seller(
    session: AsyncSession,
    name: str | None = None,
    phone: str | None = None,
    region: str | None = None,
    village: str | None = None,
) -> User:
    """Find a seller by phone number, or mint an "offline" one.

    Most village growers phone the founder rather than use the bot or the site.
    This gives them a real seller row anyway, matched on phone so the same
    person is never duplicated, with a synthetic **negative** id that can never
    collide with a Telegram user id. If they later start the bot, the two rows
    can be merged by hand.

    Lives here rather than in the API layer because both the admin HTTP
    endpoints and the bot's /admin command create sellers this way, and the
    matching rule must be identical in both.
    """
    phone = normalize_phone(phone)
    if phone:
        existing = (
            await session.execute(select(User).where(User.phone == phone).limit(1))
        ).scalar_one_or_none()
        if existing is not None:
            # Fill in blanks we have just learned, never overwrite what is there.
            if name and not existing.full_name:
                existing.full_name = name
            if region and not existing.region:
                existing.region = region
            if village and not existing.village:
                existing.village = village
            return existing

    min_id = (await session.execute(select(func.min(User.id)))).scalar()
    new_id = min(-1, (min_id or 0) - 1)

    user = User(
        id=new_id,
        full_name=name or "Dehqon",
        phone=phone,
        region=region,
        village=village,
        language="uz",
    )
    session.add(user)
    await session.flush()
    return user


# --------------------------------------------------------------------------- #
#  Formatting / cards
# --------------------------------------------------------------------------- #
def _esc(value) -> str:
    return html.escape(str(value)) if value is not None else ""


def format_price(value, currency: str = "so'm", lang: str = "uz") -> str:
    """8000 -> '8 000 so'm'. Falls back gracefully on bad input."""
    try:
        num = int(round(float(value)))
    except (TypeError, ValueError):
        return f"{value} {currency}"
    grouped = f"{num:,}".replace(",", " ")
    return f"{grouped} {currency}"


def listing_card(listing, lang: str, *, show_contact: bool = False, seller=None) -> str:
    """Render a listing (ORM row or SimpleNamespace) as an HTML caption."""
    lines: list[str] = []

    if getattr(listing, "status", "active") == "sold":
        lines.append(t("badge_sold", lang))

    lines.append(f"<b>{_esc(listing.title)}</b>")
    lines.append(category_label(listing.category, lang))
    lines.append("")
    lines.append(
        t(
            "card_price",
            lang,
            price=format_price(listing.price, getattr(listing, "currency", "so'm"), lang),
            unit=unit_label(listing.unit, lang),
        )
    )

    if getattr(listing, "quantity", None):
        lines.append(t("card_qty", lang, qty=_esc(listing.quantity)))

    location = region_label(listing.region, lang)
    district = getattr(listing, "district", None)
    if district:
        # Newer listings store a slug, older ones whatever the seller typed.
        # The fallback renders both as something a person can read.
        location = f"{location}, {_esc(district_label(district, fallback=district))}"
    lines.append(t("card_region", lang, region=location))

    if getattr(listing, "description", None):
        lines.append("")
        lines.append(_esc(listing.description))

    if show_contact:
        lines.append("")
        phone = getattr(listing, "phone", None) or (
            getattr(seller, "phone", None) if seller else None
        )
        if phone:
            lines.append(t("card_phone", lang, phone=_esc(phone)))
        if seller and getattr(seller, "username", None):
            lines.append(t("card_tg", lang, username=_esc(seller.username)))

    return "\n".join(lines)


# --------------------------------------------------------------------------- #
#  Listings
# --------------------------------------------------------------------------- #
async def query_listings(
    session: AsyncSession,
    *,
    category: str | None = None,
    region: str | None = None,
    search: str | None = None,
    offset: int = 0,
    limit: int = 5,
) -> tuple[list[Listing], int]:
    """Return (rows, total_count) of active listings matching the filters."""
    conds = [Listing.status == "active"]
    if category:
        conds.append(Listing.category == category)
    if region:
        conds.append(Listing.region == region)
    if search:
        like = f"%{search.lower()}%"
        conds.append(
            or_(
                func.lower(Listing.title).like(like),
                func.lower(func.coalesce(Listing.description, "")).like(like),
            )
        )

    base = select(Listing).where(*conds)
    total = (
        await session.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()
    rows = (
        await session.execute(
            base.order_by(Listing.created_at.desc(), Listing.id.desc())
            .offset(offset)
            .limit(limit)
        )
    ).scalars().all()
    return rows, total


async def get_user_listings(
    session: AsyncSession, user_id: int, limit: int = 30
) -> list[Listing]:
    rows = (
        await session.execute(
            select(Listing)
            .where(Listing.seller_id == user_id)
            .order_by(Listing.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return rows


# --------------------------------------------------------------------------- #
#  Favorites
# --------------------------------------------------------------------------- #
async def is_favorite(session: AsyncSession, user_id: int, listing_id: int) -> bool:
    res = await session.execute(
        select(Favorite.id).where(
            Favorite.user_id == user_id, Favorite.listing_id == listing_id
        )
    )
    return res.scalar_one_or_none() is not None


async def add_favorite(session: AsyncSession, user_id: int, listing_id: int) -> bool:
    if await is_favorite(session, user_id, listing_id):
        return False
    session.add(Favorite(user_id=user_id, listing_id=listing_id))
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        return False
    return True


async def remove_favorite(session: AsyncSession, user_id: int, listing_id: int) -> bool:
    res = await session.execute(
        select(Favorite).where(
            Favorite.user_id == user_id, Favorite.listing_id == listing_id
        )
    )
    fav = res.scalar_one_or_none()
    if not fav:
        return False
    await session.delete(fav)
    await session.commit()
    return True


async def get_user_favorites(
    session: AsyncSession, user_id: int, limit: int = 30
) -> list[Listing]:
    rows = (
        await session.execute(
            select(Listing)
            .join(Favorite, Favorite.listing_id == Listing.id)
            .where(Favorite.user_id == user_id)
            .order_by(Favorite.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return rows


# --------------------------------------------------------------------------- #
#  Photos — one listing, two possible upload paths
# --------------------------------------------------------------------------- #
def listing_photo(listing):
    """Return something aiogram can send as a photo, or None.

    Listings created in the bot carry a Telegram `photo_file_id`; listings
    created on the website carry a `photo_url` pointing at a file under
    media/. This resolves either into a valid `answer_photo` argument so the
    bot renders web listings exactly like its own.
    """
    file_id = getattr(listing, "photo_file_id", None)
    if file_id:
        return file_id

    url = getattr(listing, "photo_url", None)
    if not url or not url.startswith("/media/"):
        return None

    from app.config import settings  # local import keeps this helper cheap

    root = settings.media_dir.resolve()
    candidate = (root / url[len("/media/"):]).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None
    if not candidate.is_file():
        return None

    from aiogram.types import FSInputFile

    return FSInputFile(str(candidate))


async def send_listing(target, listing, caption: str, reply_markup=None):
    """Send a listing card with its photo when there is one, text otherwise.

    `target` is any object with .answer/.answer_photo (a Message).
    """
    photo = listing_photo(listing)
    if photo is not None:
        try:
            return await target.answer_photo(
                photo, caption=caption, reply_markup=reply_markup
            )
        except Exception:
            pass  # expired file_id, missing file — fall back to text
    return await target.answer(caption, reply_markup=reply_markup)


# --------------------------------------------------------------------------- #
#  Stats (admin)
# --------------------------------------------------------------------------- #
async def count_all(session: AsyncSession, model, *conds) -> int:
    stmt = select(func.count()).select_from(model)
    if conds:
        stmt = stmt.where(*conds)
    return (await session.execute(stmt)).scalar_one()


# Imported at the bottom to avoid a circular import at module load time.
from app.bot.texts import t  # noqa: E402
