"""Pydantic request/response models for the public JSON API."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


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


class ListingPatch(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=100)
    price: float | None = Field(default=None, gt=0)
    quantity: str | None = None
    description: str | None = Field(default=None, max_length=1000)
    phone: str | None = None
    telegram_username: str | None = None
    whatsapp: str | None = None
    status: str | None = None       # active | sold

    @field_validator("status")
    @classmethod
    def _status(cls, v: str | None) -> str | None:
        if v is not None and v not in ("active", "sold"):
            raise ValueError("status must be 'active' or 'sold'")
        return v


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
