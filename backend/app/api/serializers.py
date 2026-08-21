"""Turn ORM rows into API payloads.

Labels are resolved server-side from catalog.py so the bot and the website can
never drift apart on what "vegetables" or "samarkand" is called.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.catalog import CATEGORIES, category_label, region_label, unit_label
from app.config import settings
from app.db.database import Listing, User
from app.db.queries import format_price
from app.districts import district_label

from app.models.schemas import ListingOut, SellerOut

# Uzbekistan is UTC+5 — "listed today" has to mean today in the village,
# not today in UTC.
UZ_TZ = timezone(timedelta(hours=5))


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def is_new_today(created_at: datetime | None) -> bool:
    created = _aware(created_at)
    if created is None:
        return False
    return created.astimezone(UZ_TZ).date() == datetime.now(UZ_TZ).date()


def photo_url_for(listing: Listing) -> str | None:
    """Public URL for a listing photo, whichever surface uploaded it.

    When a listing has a Telegram file_id as well as a local file, we serve it
    through /api/photo/<id> rather than linking the file directly: that route
    falls back to Telegram if the local copy is gone, which is exactly what
    happens after a restart on an ephemeral disk.
    """
    if listing.photo_file_id:
        return f"/api/photo/{listing.id}"
    if listing.photo_url:
        return listing.photo_url
    return None


def digits_only(value: str | None) -> str | None:
    if not value:
        return None
    kept = "".join(c for c in value if c.isdigit())
    return kept or None


def tel_link(phone: str | None) -> str | None:
    d = digits_only(phone)
    return f"tel:+{d}" if d else None


def whatsapp_link(number: str | None) -> str | None:
    d = digits_only(number)
    return f"https://wa.me/{d}" if d else None


def telegram_link(username: str | None) -> str | None:
    if not username:
        return None
    return f"https://t.me/{username.lstrip('@')}"


def serialize_seller(user: User | None) -> SellerOut | None:
    if user is None:
        return None
    return SellerOut(
        id=user.id,
        full_name=user.full_name,
        username=user.username,
        phone=user.phone,
        region=user.region,
        village=user.village,
    )


def serialize_listing(
    listing: Listing,
    lang: str = "uz",
    seller: User | None = None,
) -> ListingOut:
    cat = CATEGORIES.get(listing.category, {})
    currency = listing.currency or settings.default_currency

    # A listing's own contact fields win; otherwise fall back to the seller's
    # profile so a bot listing (which only asks for a phone) still exposes the
    # seller's Telegram handle on the website.
    phone = listing.phone or (seller.phone if seller else None)
    tg = listing.telegram_username or (seller.username if seller else None)

    return ListingOut(
        id=listing.id,
        title=listing.title,
        category=listing.category,
        category_label=category_label(listing.category, lang, with_emoji=False),
        category_emoji=cat.get("emoji", "📦"),
        description=listing.description,
        price=float(listing.price),
        price_display=format_price(listing.price, currency, lang),
        currency=currency,
        unit=listing.unit,
        unit_label=unit_label(listing.unit, lang),
        quantity=listing.quantity,
        region=listing.region,
        region_label=region_label(listing.region, lang),
        district=listing.district,
        # Older rows hold free text where newer ones hold a slug; the fallback
        # means both render as something a person can read.
        district_label=district_label(listing.district, fallback=listing.district),
        photo=photo_url_for(listing),
        has_photo=bool(listing.photo_url or listing.photo_file_id),
        phone=phone,
        telegram_username=tg,
        whatsapp=listing.whatsapp,
        status=listing.status,
        source=listing.source or "bot",
        views=listing.views or 0,
        harvest_date=listing.harvest_date,
        is_new_today=is_new_today(listing.created_at),
        created_at=_aware(listing.created_at) or datetime.now(timezone.utc),
        seller=serialize_seller(seller),
    )
