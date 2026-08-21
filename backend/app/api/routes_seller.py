"""Seller endpoints — the website half of "E'lon berish".

A listing created here is written to the same `listings` table the bot writes
to, so it appears in the bot's browse/search and in the seller's "E'lonlarim"
immediately.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Path, UploadFile
from sqlalchemy import select

from app.catalog import CATEGORIES, REGIONS, UNITS, region_label
from app.config import settings
from app.db.database import Listing, User
from app.districts import DISTRICT_TO_REGION, district_label

from . import media
from .deps import CurrentUser, DbSession
from app.models.schemas import ListingIn, ListingOut, ListingPatch, UploadOut
from .serializers import serialize_listing

router = APIRouter(prefix="/my", tags=["seller"])


def validate_refs(
    category: str, region: str, unit: str, district: str | None = None
) -> None:
    if category not in CATEGORIES:
        raise HTTPException(422, f"Noma'lum kategoriya: {category}")
    if region not in REGIONS:
        raise HTTPException(422, f"Noma'lum hudud: {region}")
    if unit not in UNITS:
        raise HTTPException(422, f"Noma'lum o'lchov birligi: {unit}")

    # A district is optional, and free text is still accepted so older clients
    # and the "I typed my village name" case keep working. But if it looks like
    # a slug from our own catalogue, it must belong to the region that was
    # chosen — otherwise a mis-wired form could file Urgut under Khorezm and
    # nothing downstream would ever notice.
    if district and district in DISTRICT_TO_REGION:
        if DISTRICT_TO_REGION[district] != region:
            raise HTTPException(
                422,
                f"{district_label(district)} — bu {region_label(region, 'uz')} "
                f"hududiga tegishli emas",
            )


def build_listing(payload: ListingIn, seller_id: int, source: str) -> Listing:
    validate_refs(payload.category, payload.region, payload.unit, payload.district)
    return Listing(
        seller_id=seller_id,
        title=payload.title,
        category=payload.category,
        description=payload.description or None,
        price=payload.price,
        currency=settings.default_currency,
        unit=payload.unit,
        quantity=payload.quantity or None,
        region=payload.region,
        district=payload.district or None,
        photo_url=payload.photo_url or None,
        photo_file_id=payload.photo_file_id or None,
        phone=payload.phone or None,
        telegram_username=payload.telegram_username or None,
        whatsapp=payload.whatsapp or None,
        harvest_date=payload.harvest_date.isoformat() if payload.harvest_date else None,
        status="active",
        source=source,
    )


@router.post("/upload", response_model=UploadOut)
async def upload_photo(
    _user: CurrentUser, file: Annotated[UploadFile, File()]
) -> UploadOut:
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"Rasm {settings.max_upload_mb} MB dan katta")
    if not data:
        raise HTTPException(422, "Bo'sh fayl")
    try:
        url = media.save_upload(data, file.content_type, file.filename)
    except ValueError:
        raise HTTPException(422, "Faqat JPG, PNG yoki WEBP rasm yuklang")

    # Mirror into Telegram so the photo outlives an ephemeral container disk.
    # Best effort: if it fails the local copy still serves the listing.
    file_id = await media.archive_to_telegram(data, file.filename or "listing.jpg")
    return UploadOut(photo_url=url, photo_file_id=file_id)


@router.get("/listings", response_model=list[ListingOut])
async def my_listings(
    session: DbSession, user: CurrentUser, lang: str = "uz"
) -> list[ListingOut]:
    rows = (
        await session.execute(
            select(Listing)
            .where(Listing.seller_id == user.id)
            .order_by(Listing.created_at.desc(), Listing.id.desc())
        )
    ).scalars().all()
    return [serialize_listing(l, lang, user) for l in rows]


@router.post("/listings", response_model=ListingOut, status_code=201)
async def create_listing(
    session: DbSession, user: CurrentUser, payload: ListingIn, lang: str = "uz"
) -> ListingOut:
    listing = build_listing(payload, user.id, source="web")

    # Keep the seller's profile in sync so the bot shows the same contacts.
    if payload.phone and not user.phone:
        user.phone = payload.phone
    if payload.region and not user.region:
        user.region = payload.region

    session.add(listing)
    await session.commit()
    await session.refresh(listing)
    return serialize_listing(listing, lang, user)


async def _owned(session, listing_id: int, user: User) -> Listing:
    listing = await session.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(404, "E'lon topilmadi / Объявление не найдено")
    if listing.seller_id != user.id and user.id not in settings.admin_id_list:
        raise HTTPException(403, "Bu e'lon sizniki emas / Это не ваше объявление")
    return listing


@router.patch("/listings/{listing_id}", response_model=ListingOut)
async def update_listing(
    session: DbSession,
    user: CurrentUser,
    listing_id: Annotated[int, Path(ge=1)],
    payload: ListingPatch,
    lang: str = "uz",
) -> ListingOut:
    listing = await _owned(session, listing_id, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)
    await session.commit()
    await session.refresh(listing)
    seller = await session.get(User, listing.seller_id)
    return serialize_listing(listing, lang, seller)


@router.delete("/listings/{listing_id}", status_code=204)
async def delete_listing(
    session: DbSession, user: CurrentUser, listing_id: Annotated[int, Path(ge=1)]
) -> None:
    listing = await _owned(session, listing_id, user)
    await session.delete(listing)
    await session.commit()
