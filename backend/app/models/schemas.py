"""Pydantic request/response models for the public JSON API."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


def _own_upload(value: str | None) -> str | None:
    """A client may only point a listing at a photo it uploaded through us.

    An arbitrary URL would be hot-linked into every buyer's browser, and the
    website's image optimiser refuses unknown hosts — the listing page would
    crash instead of showing the picture.
    """
    if value in (None, ""):
        return value
    if not value.startswith("/media/uploads/") or ".." in value:
        raise ValueError("photo_url must come from /api/my/upload")
    return value


# --------------------------------------------------------------------------- #
#  Output
# --------------------------------------------------------------------------- #
class SellerOut(BaseModel):
    id: int
    full_name: str | None = None
    username: str | None = None
    phone: str | None = None
    region: str | None = None
    village: str | None = None


class ListingOut(BaseModel):
    id: int
    title: str
    category: str
    category_label: str
    category_emoji: str
    description: str | None = None
    price: float
    price_display: str
    currency: str
    unit: str
    unit_label: str
    quantity: str | None = None
    region: str
    region_label: str
    district: str | None = None
    # Resolved name for `district`. Listings posted before the district picker
    # existed hold free text there; this is what to show either way.
    district_label: str | None = None
    photo: str | None = None          # absolute-ish URL, or null -> use emoji
    has_photo: bool = False
    phone: str | None = None
    telegram_username: str | None = None
    whatsapp: str | None = None
    status: str
    source: str
    views: int = 0
    harvest_date: str | None = None
    is_new_today: bool = False
    created_at: datetime
    seller: SellerOut | None = None
    # How many times buyers tapped Call / Telegram / WhatsApp. Only filled on
    # the seller's own listings (GET /api/my/listings) — it is the number that
    # tells a grower the listing is working, and nobody else's business.
    contacts_count: int | None = None


class ListingPage(BaseModel):
    items: list[ListingOut]
    total: int
    page: int
    per_page: int
    pages: int


class ContactOut(BaseModel):
    channel: str
    phone: str | None = None
    tel_link: str | None = None
    telegram_link: str | None = None
    whatsapp_link: str | None = None


class SellerPublicOut(BaseModel):
    """What a buyer may see about a seller on their public page."""

    id: int
    full_name: str | None = None
    username: str | None = None
    phone: str | None = None
    region: str | None = None
    region_label: str | None = None
    village: str | None = None
    active_listings: int = 0
    total_listings: int = 0
    member_since: datetime | None = None


class FacetsOut(BaseModel):
    """Active-listing counts, so filters only offer choices that have produce."""

    total: int
    categories: dict[str, int]
    regions: dict[str, int]
    # Districts of the `region` query parameter when one is given, otherwise of
    # every region. Keys are slugs, or the free text older listings hold.
    districts: dict[str, int]


class ReportOut(BaseModel):
    id: int
    listing_id: int
    listing_title: str | None = None
    reason: str
    note: str | None = None
    status: str
    created_at: datetime


class StatsOut(BaseModel):
    listings: int
    active_listings: int
    sellers: int
    regions: int
    contacts: int
    listings_today: int


# --------------------------------------------------------------------------- #
#  Auth
# --------------------------------------------------------------------------- #
class AuthStartOut(BaseModel):
    code: str
    deep_link: str
    expires_at: datetime


class AuthPollOut(BaseModel):
    status: str                     # pending | ok | expired
    token: str | None = None
    user: SellerOut | None = None
    is_admin: bool = False


class MeOut(BaseModel):
    user: SellerOut
    is_admin: bool
    language: str
    listings_count: int


# --------------------------------------------------------------------------- #
#  Input
# --------------------------------------------------------------------------- #
class ListingIn(BaseModel):
    title: str = Field(min_length=2, max_length=100)
    category: str
    price: float = Field(gt=0, le=1_000_000_000)
    unit: str = "kg"
    quantity: str | None = Field(default=None, max_length=64)
    region: str
    district: str | None = Field(default=None, max_length=128)
    description: str | None = Field(default=None, max_length=1000)
    phone: str | None = Field(default=None, max_length=32)
    telegram_username: str | None = Field(default=None, max_length=64)
    whatsapp: str | None = Field(default=None, max_length=32)
    harvest_date: date | None = None
    photo_url: str | None = None
    photo_file_id: str | None = None

    @field_validator("telegram_username")
    @classmethod
    def _strip_at(cls, v: str | None) -> str | None:
        return v.lstrip("@").strip() if v else None

    @field_validator("title", "quantity", "district", "description")
    @classmethod
    def _clean(cls, v: str | None) -> str | None:
        return v.strip() if isinstance(v, str) else v

    @field_validator("photo_url")
    @classmethod
    def _photo(cls, v: str | None) -> str | None:
        return _own_upload(v)


class ListingPatch(BaseModel):
    """Partial update. Every field is optional; only the ones sent change.

    Catalogue references (category, unit, region, district) are validated
    against catalog.py / districts.py in the route, with the listing's current
    values filled in for whatever was not sent — so changing only the region
    can never leave a district from another province behind.
    """

    title: str | None = Field(default=None, min_length=2, max_length=100)
    category: str | None = None
    price: float | None = Field(default=None, gt=0, le=1_000_000_000)
    unit: str | None = None
    quantity: str | None = Field(default=None, max_length=64)
    region: str | None = None
    district: str | None = Field(default=None, max_length=128)
    description: str | None = Field(default=None, max_length=1000)
    phone: str | None = Field(default=None, max_length=32)
    telegram_username: str | None = Field(default=None, max_length=64)
    whatsapp: str | None = Field(default=None, max_length=32)
    harvest_date: date | None = None
    photo_url: str | None = Field(default=None, max_length=512)
    photo_file_id: str | None = Field(default=None, max_length=255)
    status: str | None = None       # active | sold

    @field_validator("status")
    @classmethod
    def _status(cls, v: str | None) -> str | None:
        if v is not None and v not in ("active", "sold"):
            raise ValueError("status must be 'active' or 'sold'")
        return v

    @field_validator("telegram_username")
    @classmethod
    def _strip_at(cls, v: str | None) -> str | None:
        return v.lstrip("@").strip() if v else v

    @field_validator("title", "quantity", "district", "description")
    @classmethod
    def _clean(cls, v: str | None) -> str | None:
        return v.strip() if isinstance(v, str) else v

    @field_validator("photo_url")
    @classmethod
    def _photo(cls, v: str | None) -> str | None:
        return _own_upload(v)


class ReportIn(BaseModel):
    reason: Literal["spam", "fraud", "wrong_price", "sold", "other"]
    note: str | None = Field(default=None, max_length=500)


class ReportPatch(BaseModel):
    status: Literal["open", "resolved"]


class FavoriteSyncIn(BaseModel):
    """Favourites saved on a device before the person signed in."""

    ids: list[int] = Field(default_factory=list, max_length=200)


class ProfileIn(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    region: str | None = None
    village: str | None = Field(default=None, max_length=128)
    language: str | None = None

    @field_validator("language")
    @classmethod
    def _lang(cls, v: str | None) -> str | None:
        if v is not None and v not in ("uz", "ru"):
            raise ValueError("language must be 'uz' or 'ru'")
        return v


class AdminListingIn(ListingIn):
    """Admin creating a listing for a seller who phoned in."""

    seller_name: str | None = Field(default=None, max_length=255)
    seller_phone: str | None = Field(default=None, max_length=32)


class UploadOut(BaseModel):
    photo_url: str
    # Permanent Telegram file_id, when photo archiving is configured.
    # Survives a container restart; photo_url alone may not.
    photo_file_id: str | None = None
