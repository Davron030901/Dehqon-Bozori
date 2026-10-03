"""Seller endpoints — the website half of "E'lon berish".

A listing created here is written to the same `listings` table the bot writes
to, so it appears in the bot's browse/search and in the seller's "E'lonlarim"
immediately.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Path, UploadFile
from sqlalchemy import delete, func, select

from app.catalog import CATEGORIES, REGIONS, UNITS, region_label
from app.config import settings
from app.db.database import ContactEvent, Favorite, Listing, User
from app.districts import DISTRICT_TO_REGION, district_label

from . import media
from .deps import CurrentUser, DbSession
from app.models.schemas import (
    FavoriteSyncIn,
    ListingIn,
    ListingOut,
    ListingPatch,
    UploadOut,
)
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

    # One grouped query for every listing's contact taps — the number that
    # tells a grower whether a listing is working.
    contacts: dict[int, int] = {}
    if rows:
        contacts = dict(
            (
                await session.execute(
                    select(ContactEvent.listing_id, func.count())
                    .where(ContactEvent.listing_id.in_([l.id for l in rows]))
                    .group_by(ContactEvent.listing_id)
                )
            ).all()
        )

    out = []
    for listing in rows:
        item = serialize_listing(listing, lang, user)
        item.contacts_count = contacts.get(listing.id, 0)
        out.append(item)
    return out


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
    data = payload.model_dump(exclude_unset=True)

    # Required columns cannot be blanked by sending null.
    for field in ("title", "category", "price", "unit", "region", "status"):
        if field in data and data[field] is None:
            data.pop(field)

    # Validate the catalogue references as they will be AFTER the update.
    category = data.get("category", listing.category)
    region = data.get("region", listing.region)
    unit = data.get("unit", listing.unit)
    if "region" in data and data["region"] != listing.region and "district" not in data:
        # A new province makes the old district meaningless (or wrong).
        if listing.district in DISTRICT_TO_REGION:
            data["district"] = None
    district = data.get("district", listing.district)
    validate_refs(category, region, unit, district)

    if "harvest_date" in data:
        data["harvest_date"] = data["harvest_date"].isoformat() if data["harvest_date"] else None
    for field in ("quantity", "district", "description", "phone",
                  "telegram_username", "whatsapp", "photo_url", "photo_file_id"):
        if field in data and data[field] == "":
            data[field] = None

    # A new web photo replaces the old Telegram one too, or /api/photo/<id>
    # would keep serving the picture the seller just removed.
    if data.get("photo_url") and "photo_file_id" not in data:
        data["photo_file_id"] = None

    for field, value in data.items():
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


# --------------------------------------------------------------------------- #
#  Favourites — the same table the bot's ⭐ button writes to
# --------------------------------------------------------------------------- #
@router.get("/favorites", response_model=list[ListingOut])
async def my_favorites(
    session: DbSession, user: CurrentUser, lang: str = "uz"
) -> list[ListingOut]:
    """Saved listings, newest save first. Sold ones stay, flagged as sold, so a
    buyer can see why the tomatoes they saved yesterday are gone."""
    rows = (
        await session.execute(
            select(Listing)
            .join(Favorite, Favorite.listing_id == Listing.id)
            .where(Favorite.user_id == user.id)
            .order_by(Favorite.created_at.desc(), Favorite.id.desc())
            .limit(200)
        )
    ).scalars().all()
    ids = {l.seller_id for l in rows}
    sellers = {
        u.id: u
        for u in (await session.execute(select(User).where(User.id.in_(ids)))).scalars()
    } if ids else {}
    return [serialize_listing(l, lang, sellers.get(l.seller_id)) for l in rows]


@router.get("/favorites/ids", response_model=list[int])
async def my_favorite_ids(session: DbSession, user: CurrentUser) -> list[int]:
    """Just the ids — cheap enough to fetch on every app start to paint hearts."""
    rows = (
        await session.execute(
            select(Favorite.listing_id).where(Favorite.user_id == user.id)
        )
    ).scalars().all()
    return list(rows)


@router.put("/favorites/{listing_id}", status_code=204)
async def add_favorite(
    session: DbSession, user: CurrentUser, listing_id: Annotated[int, Path(ge=1)]
) -> None:
    if await session.get(Listing, listing_id) is None:
        raise HTTPException(404, "E'lon topilmadi / Объявление не найдено")
    exists = (
        await session.execute(
            select(Favorite.id).where(
                Favorite.user_id == user.id, Favorite.listing_id == listing_id
            )
        )
    ).scalar_one_or_none()
    if exists is None:
        session.add(Favorite(user_id=user.id, listing_id=listing_id))
        await session.commit()


@router.delete("/favorites/{listing_id}", status_code=204)
async def remove_favorite(
    session: DbSession, user: CurrentUser, listing_id: Annotated[int, Path(ge=1)]
) -> None:
    await session.execute(
        delete(Favorite).where(
            Favorite.user_id == user.id, Favorite.listing_id == listing_id
        )
    )
    await session.commit()


@router.post("/favorites/sync", response_model=list[int])
async def sync_favorites(
    session: DbSession, user: CurrentUser, payload: FavoriteSyncIn
) -> list[int]:
    """Merge favourites a device saved while signed out, return the full set.

    Buyers never have to register, so hearts tapped before signing in live on
    the device. Signing in should not lose them — and should not duplicate the
    ones the bot already has.
    """
    have = set(
        (
            await session.execute(
                select(Favorite.listing_id).where(Favorite.user_id == user.id)
            )
        ).scalars().all()
    )
    wanted = {i for i in payload.ids if i > 0} - have
    if wanted:
        existing = set(
            (
                await session.execute(select(Listing.id).where(Listing.id.in_(wanted)))
            ).scalars().all()
        )
        for listing_id in sorted(existing):
            session.add(Favorite(user_id=user.id, listing_id=listing_id))
        await session.commit()
        have |= existing
    return sorted(have)
