"""Public buyer-facing endpoints — no registration, no friction."""
from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Path, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select

from app.config import settings
from app.db.database import ContactEvent, Listing, User
from app.districts import is_valid_district

from . import media, notify
from .deps import DbSession
from app.models.schemas import ContactOut, ListingOut, ListingPage
from .serializers import (
    serialize_listing,
    telegram_link,
    tel_link,
    whatsapp_link,
)

router = APIRouter(tags=["listings"])

Sort = Literal["new", "price_asc", "price_desc", "popular"]


async def _sellers_for(session, listings: list[Listing]) -> dict[int, User]:
    """One query for every seller on the page — no N+1, no lazy loading."""
    ids = {l.seller_id for l in listings}
    if not ids:
        return {}
    rows = (await session.execute(select(User).where(User.id.in_(ids)))).scalars().all()
    return {u.id: u for u in rows}


@router.get("/listings", response_model=ListingPage)
async def list_listings(
    session: DbSession,
    q: str | None = Query(None, description="Free-text search over title/description"),
    category: str | None = None,
    region: str | None = None,
    district: str | None = None,
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    sort: Sort = "new",
    include_sold: bool = False,
    seller_id: int | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(0, ge=0, le=100),
    lang: str = "uz",
) -> ListingPage:
    per_page = per_page or settings.web_page_size

    conds = []
    if not include_sold:
        conds.append(Listing.status == "active")
    if category:
        conds.append(Listing.category == category)
    if region:
        conds.append(Listing.region == region)
    if district:
        # A known slug matches exactly — anything else is treated as free text,
        # because listings posted before the district picker existed still hold
        # whatever the seller typed ("Urgut tumani", "urgut", "URGUT").
        if is_valid_district(district):
            conds.append(Listing.district == district)
        else:
            conds.append(func.lower(Listing.district).like(f"%{district.lower()}%"))
    if seller_id:
        conds.append(Listing.seller_id == seller_id)
    if min_price is not None:
        conds.append(Listing.price >= min_price)
    if max_price is not None:
        conds.append(Listing.price <= max_price)
    if q:
        like = f"%{q.strip().lower()}%"
        conds.append(
            or_(
                func.lower(Listing.title).like(like),
                func.lower(func.coalesce(Listing.description, "")).like(like),
                func.lower(func.coalesce(Listing.district, "")).like(like),
            )
        )

    base = select(Listing).where(*conds) if conds else select(Listing)

    total = (
        await session.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()

    order = {
        "new": (Listing.created_at.desc(), Listing.id.desc()),
        "price_asc": (Listing.price.asc(), Listing.id.desc()),
        "price_desc": (Listing.price.desc(), Listing.id.desc()),
        "popular": (Listing.views.desc(), Listing.created_at.desc()),
    }[sort]

    rows = (
        await session.execute(
            base.order_by(*order).offset((page - 1) * per_page).limit(per_page)
        )
    ).scalars().all()

    sellers = await _sellers_for(session, rows)
    return ListingPage(
        items=[serialize_listing(l, lang, sellers.get(l.seller_id)) for l in rows],
        total=total,
        page=page,
        per_page=per_page,
        pages=max(1, -(-total // per_page)),
    )


@router.get("/listings/{listing_id}", response_model=ListingOut)
async def get_listing(
    session: DbSession,
    listing_id: Annotated[int, Path(ge=1)],
    lang: str = "uz",
    count_view: bool = True,
) -> ListingOut:
    listing = await session.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(404, "E'lon topilmadi / Объявление не найдено")

    if count_view:
        listing.views = (listing.views or 0) + 1
        await session.commit()

    seller = await session.get(User, listing.seller_id)
    return serialize_listing(listing, lang, seller)


@router.post("/listings/{listing_id}/contact", response_model=ContactOut)
async def register_contact(
    session: DbSession,
    listing_id: Annotated[int, Path(ge=1)],
    channel: Literal["call", "telegram", "whatsapp"] = "call",
) -> ContactOut:
    """Record a buyer reaching out and ping the seller on Telegram.

    Returns the contact links too, so the browser can open tel:/t.me/wa.me
    right after this call resolves.
    """
    listing = await session.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(404, "E'lon topilmadi / Объявление не найдено")

    session.add(ContactEvent(listing_id=listing_id, channel=channel, source="web"))
    await session.commit()

    seller = await session.get(User, listing.seller_id)
    lang = seller.language if seller else "uz"
    notify.send_background(
        listing.seller_id, notify.contact_message(listing.title, channel, lang)
    )

    phone = listing.phone or (seller.phone if seller else None)
    username = listing.telegram_username or (seller.username if seller else None)
    return ContactOut(
        channel=channel,
        phone=phone,
        tel_link=tel_link(phone),
        telegram_link=telegram_link(username),
        whatsapp_link=whatsapp_link(listing.whatsapp or phone),
    )


@router.get("/photo/{listing_id}")
async def get_photo(session: DbSession, listing_id: Annotated[int, Path(ge=1)]):
    """Serve a listing photo regardless of where it was uploaded.

    Website uploads live on disk; Telegram uploads are fetched once through the
    Bot API and cached, so a listing posted from a village phone shows up as a
    normal image on the website.
    """
    listing = await session.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(404, "not found")

    if listing.photo_url:
        path = media.local_path_for(listing.photo_url)
        if path:
            return FileResponse(path, headers={"Cache-Control": "public, max-age=604800"})

    if listing.photo_file_id:
        path = await media.telegram_photo_path(listing.photo_file_id)
        if path:
            return FileResponse(
                path,
                media_type="image/jpeg",
                headers={"Cache-Control": "public, max-age=604800"},
            )

    return Response(status_code=404)
