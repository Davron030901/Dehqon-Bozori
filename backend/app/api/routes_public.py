"""The unprefixed REST surface described in the deployment spec.

`/health`, `/listings`, `/sellers`, `/contact-events` — no `/api` prefix, so
Render's health check and any external integration can use the documented
paths. These are thin wrappers: the real logic lives in routes_listings.py and
routes_seller.py, so there is exactly one implementation of each behaviour.

Field names here follow the frontend's vocabulary (`product_name`,
`price_per_kg`, `is_sold_out`) rather than the internal column names, so the
shapes match `frontend/lib/types.ts` exactly.
"""
from __future__ import annotations

import hmac
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select

from app.catalog import CATEGORIES, REGIONS
from app.config import settings
from app.db.database import ContactEvent, Listing, User
from app.db.queries import get_or_create_offline_seller, normalize_phone
from app.districts import DISTRICT_TO_REGION

from . import ratelimit
from .deps import MAX_DB_ID, DbSession
from .routes_listings import get_listing, list_listings
from .serializers import serialize_listing

router = APIRouter(tags=["public"])


async def require_admin_token(
    x_admin_token: Annotated[str | None, Header()] = None,
) -> None:
    """Guard for endpoints that can write on behalf of any seller.

    Fails closed: if ADMIN_API_TOKEN is not configured, these endpoints are
    disabled entirely rather than left open. Compared with `compare_digest` so
    the check does not leak the token through timing.
    """
    expected = settings.admin_api_token
    if not expected:
        raise HTTPException(
            503,
            "ADMIN_API_TOKEN sozlanmagan — bu endpoint o'chirilgan / "
            "endpoint disabled until ADMIN_API_TOKEN is set",
        )
    if not x_admin_token or not hmac.compare_digest(x_admin_token, expected):
        raise HTTPException(401, "X-Admin-Token noto'g'ri / invalid")


# --------------------------------------------------------------------------- #
#  Health
# --------------------------------------------------------------------------- #
@router.get("/health")
async def health(session: DbSession) -> dict:
    """Liveness probe for Render. Touches the database so a broken
    DATABASE_URL fails the deploy instead of serving a dead service."""
    await session.execute(select(1))
    return {
        "status": "ok",
        "database": settings.database_url.split("://", 1)[0],
        "env": settings.env,
    }


# --------------------------------------------------------------------------- #
#  Listings — same handlers, documented paths
# --------------------------------------------------------------------------- #
router.add_api_route("/listings", list_listings, methods=["GET"], tags=["public"])
router.add_api_route(
    "/listings/{listing_id}", get_listing, methods=["GET"], tags=["public"]
)


class SellerIn(BaseModel):
    """Register a grower. Phone is the identity, as in the village."""

    phone: str = Field(min_length=7, max_length=32)
    full_name: str | None = Field(default=None, max_length=255)
    village: str | None = Field(default=None, max_length=128)
    district: str | None = Field(default=None, max_length=128)
    region: str = "samarkand"
    telegram_chat_id: int | None = None

    @field_validator("phone")
    @classmethod
    def _normalize(cls, v: str) -> str:
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) < 7:
            raise ValueError("phone number looks too short")
        # The one normalisation every seller-creating path shares.
        return normalize_phone(v)


class SellerOut(BaseModel):
    id: int
    phone: str | None
    full_name: str | None
    village: str | None
    region: str | None
    created: bool


@router.post(
    "/sellers",
    response_model=SellerOut,
    status_code=201,
    tags=["public"],
    dependencies=[Depends(require_admin_token)],
)
async def register_seller(session: DbSession, payload: SellerIn) -> SellerOut:
    """Create (or update) a seller record, matched on phone number.

    If `telegram_chat_id` is supplied that becomes the primary key, so the same
    person registering through the bot and through the site is one account and
    the bot can message them later. Otherwise the seller gets a synthetic
    negative id, which can never collide with a real Telegram id.
    """
    if payload.region not in REGIONS:
        raise HTTPException(422, f"Noma'lum hudud: {payload.region}")

    existing = (
        await session.execute(select(User).where(User.phone == payload.phone).limit(1))
    ).scalar_one_or_none()

    if existing is not None:
        for field in ("full_name", "village", "region"):
            value = getattr(payload, field)
            if value and not getattr(existing, field):
                setattr(existing, field, value)
        await session.commit()
        return SellerOut(
            id=existing.id,
            phone=existing.phone,
            full_name=existing.full_name,
            village=existing.village,
            region=existing.region,
            created=False,
        )

    if payload.telegram_chat_id:
        user_id = payload.telegram_chat_id
        if await session.get(User, user_id) is not None:
            raise HTTPException(409, "Bu Telegram hisobi allaqachon ro'yxatdan o'tgan")
    else:
        min_id = (await session.execute(select(User.id).order_by(User.id.asc()).limit(1))).scalar()
        user_id = min(-1, (min_id or 0) - 1)

    user = User(
        id=user_id,
        phone=payload.phone,
        full_name=payload.full_name or "Dehqon",
        village=payload.village,
        region=payload.region,
        language="uz",
    )
    session.add(user)
    await session.commit()

    return SellerOut(
        id=user.id,
        phone=user.phone,
        full_name=user.full_name,
        village=user.village,
        region=user.region,
        created=True,
    )


# --------------------------------------------------------------------------- #
#  Mark sold
# --------------------------------------------------------------------------- #
class SoldIn(BaseModel):
    is_sold_out: bool = True


@router.patch(
    "/listings/{listing_id}/sold",
    tags=["public"],
    dependencies=[Depends(require_admin_token)],
)
async def mark_sold(
    session: DbSession,
    listing_id: Annotated[int, Path(ge=1, le=MAX_DB_ID)],
    payload: SoldIn | None = None,
) -> dict:
    """Soft-hide a listing from buyer results (or bring it back)."""
    listing = await session.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(404, "E'lon topilmadi / Объявление не найдено")

    sold = True if payload is None else payload.is_sold_out
    listing.status = "sold" if sold else "active"
    await session.commit()
    return {"id": listing.id, "is_sold_out": sold}


# --------------------------------------------------------------------------- #
#  Contact analytics
# --------------------------------------------------------------------------- #
class ContactEventIn(BaseModel):
    listing_id: int = Field(ge=1, le=MAX_DB_ID)
    channel: Literal["call", "telegram", "whatsapp"]


@router.post("/contact-events", status_code=201, tags=["public"])
async def log_contact_event(
    request: Request, session: DbSession, payload: ContactEventIn
) -> dict:
    """Record that a buyer tapped a contact button.

    Kept deliberately anonymous: which listing and which channel, nothing about
    the buyer. That is enough to see what is working without collecting
    anything a person would mind us having.
    """
    # Same ceiling as /api/listings/{id}/contact, so neither door can be used
    # to inflate a listing's numbers on the admin dashboard.
    ratelimit.enforce(f"contact:{ratelimit.client_ip(request)}", limit=60, window_seconds=600)
    if await session.get(Listing, payload.listing_id) is None:
        raise HTTPException(404, "E'lon topilmadi")

    session.add(
        ContactEvent(listing_id=payload.listing_id, channel=payload.channel, source="web")
    )
    await session.commit()
    return {"ok": True}


# --------------------------------------------------------------------------- #
#  Create a listing (bot / admin panel / server-side form posts)
# --------------------------------------------------------------------------- #
class PublicListingIn(BaseModel):
    """Frontend-shaped listing payload."""

    seller_phone: str = Field(min_length=7, max_length=32)
    product_name: str = Field(min_length=2, max_length=100)
    category: str
    price_per_kg: float = Field(gt=0)
    quantity_kg: float | None = Field(default=None, ge=0)
    village: str | None = None
    district: str | None = None
    region: str = "samarkand"
    harvest_date: date | None = None
    photo_url: str | None = None
    phone: str | None = None
    telegram_username: str | None = None
    whatsapp_number: str | None = None
    description: str | None = Field(default=None, max_length=1000)


@router.post(
    "/listings",
    status_code=201,
    tags=["public"],
    dependencies=[Depends(require_admin_token)],
)
async def create_listing_public(session: DbSession, payload: PublicListingIn) -> dict:
    """Create a listing on behalf of a seller identified by phone number.

    Requires `X-Admin-Token`, because it can write for any seller. Sellers
    posting their own produce use the authenticated `/api/my/listings`
    instead, which can only ever write for the caller.
    """
    if payload.category not in CATEGORIES:
        raise HTTPException(422, f"Noma'lum kategoriya: {payload.category}")
    if payload.region not in REGIONS:
        raise HTTPException(422, f"Noma'lum hudud: {payload.region}")
    if payload.district in DISTRICT_TO_REGION and DISTRICT_TO_REGION[payload.district] != payload.region:
        raise HTTPException(422, f"Tuman {payload.district} bu hududga tegishli emas")

    # Same rule as the bot's /admin and the website's admin page: matched on
    # phone, synthetic negative id, never duplicated.
    seller = await get_or_create_offline_seller(
        session, None, payload.seller_phone, payload.region, payload.village
    )
    phone = seller.phone

    listing = Listing(
        seller_id=seller.id,
        title=payload.product_name,
        category=payload.category,
        description=payload.description,
        price=payload.price_per_kg,
        currency=settings.default_currency,
        unit="kg",
        quantity=f"{payload.quantity_kg:g} kg" if payload.quantity_kg else None,
        region=payload.region,
        district=payload.district,
        photo_url=payload.photo_url,
        phone=payload.phone or phone,
        telegram_username=(payload.telegram_username or "").lstrip("@") or None,
        whatsapp=payload.whatsapp_number,
        harvest_date=payload.harvest_date.isoformat() if payload.harvest_date else None,
        status="active",
        source="api",
    )
    session.add(listing)
    await session.commit()
    await session.refresh(listing)

    return serialize_listing(listing, "uz", seller).model_dump(mode="json")
