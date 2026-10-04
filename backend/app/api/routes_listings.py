"""Public buyer-facing endpoints — no registration, no friction."""
from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Path, Query, Request, Response
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select, update

from app.catalog import region_label
from app.config import settings
from app.db.database import ContactEvent, Listing, Report, User
from app.districts import is_valid_district

from . import media, notify, ratelimit
from .deps import MAX_BIGINT, MAX_DB_ID, DbSession, OptionalUser
from app.models.schemas import (
    ContactOut,
    FacetsOut,
    ListingOut,
    ListingPage,
    ReportIn,
    SellerPublicOut,
)
from .serializers import (
    serialize_listing,
    telegram_link,
    tel_link,
    whatsapp_link,
)

router = APIRouter(tags=["listings"])

Sort = Literal["new", "price_asc", "price_desc", "popular"]


def _parse_ids(raw: str) -> list[int]:
    """'3, 7,x,7' -> [3, 7]. Junk is ignored rather than turned into a 422,
    because the list comes straight out of a phone's local storage."""
    out: list[int] = []
    for chunk in raw.split(","):
        chunk = chunk.strip()[:12]
        if chunk.isdigit() and 0 < int(chunk) <= MAX_DB_ID and int(chunk) not in out:
            out.append(int(chunk))
    return out[:100]


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
    seller_id: int | None = Query(None, ge=-MAX_BIGINT, le=MAX_BIGINT),
    ids: str | None = Query(
        None,
        description="Comma-separated listing ids (max 100) — a device's saved favourites",
    ),
    page: int = Query(1, ge=1),
    per_page: int = Query(0, ge=0, le=100),
    lang: str = "uz",
) -> ListingPage:
    per_page = per_page or settings.web_page_size

    conds = []
    if ids is not None:
        wanted = _parse_ids(ids)
        if not wanted:
            return ListingPage(items=[], total=0, page=page, per_page=per_page, pages=1)
        conds.append(Listing.id.in_(wanted))
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
    listing_id: Annotated[int, Path(ge=1, le=MAX_DB_ID)],
    lang: str = "uz",
    count_view: bool = True,
) -> ListingOut:
    listing = await session.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(404, "E'lon topilmadi / Объявление не найдено")

    if count_view:
        # A server-side increment: two simultaneous readers (the bot and the
        # website) must not both write views=11 over views=10.
        await session.execute(
            update(Listing)
            .where(Listing.id == listing_id)
            .values(views=func.coalesce(Listing.views, 0) + 1)
        )
        await session.commit()
        await session.refresh(listing)

    seller = await session.get(User, listing.seller_id)
    return serialize_listing(listing, lang, seller)


@router.get("/listings/{listing_id}/similar", response_model=list[ListingOut])
async def similar_listings(
    session: DbSession,
    listing_id: Annotated[int, Path(ge=1, le=MAX_DB_ID)],
    limit: int = Query(4, ge=1, le=12),
    lang: str = "uz",
) -> list[ListingOut]:
    """Active listings in the same category — same region first, newest next.

    The detail page used to download every listing to pick four of them; this
    asks the database for exactly the four.
    """
    listing = await session.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(404, "E'lon topilmadi / Объявление не найдено")

    same_region = (Listing.region == listing.region).desc()
    rows = (
        await session.execute(
            select(Listing)
            .where(
                Listing.status == "active",
                Listing.category == listing.category,
                Listing.id != listing.id,
            )
            .order_by(same_region, Listing.created_at.desc(), Listing.id.desc())
            .limit(limit)
        )
    ).scalars().all()
    sellers = await _sellers_for(session, rows)
    return [serialize_listing(l, lang, sellers.get(l.seller_id)) for l in rows]


@router.get("/facets", response_model=FacetsOut)
async def facets(session: DbSession, region: str | None = None) -> FacetsOut:
    """How many active listings sit under each category, region and district.

    Filters offer only the choices that lead somewhere: a buyer should never
    pick "Xorazm" and land on an empty page.
    """
    active = Listing.status == "active"

    async def grouped(column, *extra) -> dict[str, int]:
        rows = (
            await session.execute(
                select(column, func.count()).where(active, *extra).group_by(column)
            )
        ).all()
        return {k: n for k, n in rows if k}

    district_scope = (Listing.region == region,) if region else ()
    total = (
        await session.execute(select(func.count()).select_from(Listing).where(active))
    ).scalar_one()
    return FacetsOut(
        total=total,
        categories=await grouped(Listing.category),
        regions=await grouped(Listing.region),
        districts=await grouped(Listing.district, *district_scope),
    )


@router.get("/sellers/{seller_id}", response_model=SellerPublicOut, tags=["sellers"])
async def seller_profile(
    session: DbSession,
    seller_id: Annotated[int, Path(ge=-MAX_BIGINT, le=MAX_BIGINT)],
    lang: str = "uz",
) -> SellerPublicOut:
    """A seller's public card. Their listings come from
    `GET /api/listings?seller_id=…`, which already paginates and filters.

    Offline sellers (negative ids, created by the admin for growers who phone
    in) have pages too — they are real people with real produce.
    """
    user = await session.get(User, seller_id)
    if user is None:
        raise HTTPException(404, "Sotuvchi topilmadi / Продавец не найден")

    async def count(*conds) -> int:
        return (
            await session.execute(
                select(func.count()).select_from(Listing).where(
                    Listing.seller_id == seller_id, *conds
                )
            )
        ).scalar_one()

    total = await count()
    # Only people who sell have a public page. A buyer who once opened the bot,
    # or the founder, has a users row too — and anyone who knows a Telegram id
    # could otherwise read that person's phone number and name here. A seller's
    # details are already public on their listings, so this exposes nothing new.
    if total == 0:
        raise HTTPException(404, "Sotuvchi topilmadi / Продавец не найден")
    return SellerPublicOut(
        id=user.id,
        full_name=user.full_name,
        username=user.username,
        phone=user.phone,
        region=user.region,
        region_label=region_label(user.region, lang) if user.region else None,
        village=user.village,
        active_listings=await count(Listing.status == "active"),
        total_listings=total,
        member_since=user.created_at,
    )


@router.post("/listings/{listing_id}/report", status_code=201)
async def report_listing(
    request: Request,
    session: DbSession,
    user: OptionalUser,
    listing_id: Annotated[int, Path(ge=1, le=MAX_DB_ID)],
    payload: ReportIn,
) -> dict:
    """Flag a listing for the founder: spam, fraud, a fake price, already sold.

    Anonymous on purpose — buyers never register. The admins get a Telegram
    message straight away, and the report waits in the admin panel.
    """
    ratelimit.enforce(f"report:{ratelimit.client_ip(request)}", limit=5, window_seconds=3600)

    listing = await session.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(404, "E'lon topilmadi / Объявление не найдено")

    report = Report(
        listing_id=listing_id,
        reporter_id=user.id if user else None,
        reason=payload.reason,
        note=(payload.note or "").strip() or None,
        status="open",
    )
    session.add(report)
    await session.commit()

    for admin_id in settings.admin_id_list:
        notify.send_background(
            admin_id, notify.report_message(listing.id, listing.title, payload.reason, report.note)
        )
    return {"ok": True, "id": report.id}


@router.post("/listings/{listing_id}/contact", response_model=ContactOut)
async def register_contact(
    request: Request,
    session: DbSession,
    listing_id: Annotated[int, Path(ge=1, le=MAX_DB_ID)],
    channel: Literal["call", "telegram", "whatsapp"] = "call",
    source: Literal["web", "app"] = "web",
) -> ContactOut:
    """Record a buyer reaching out and ping the seller on Telegram.

    Returns the contact links too, so the browser can open tel:/t.me/wa.me
    right after this call resolves.

    Every tap is counted, but the seller's phone buzzes at most once per buyer
    per listing every ten minutes — otherwise this endpoint is a free way to
    flood a grower's Telegram with a loop.
    """
    listing = await session.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(404, "E'lon topilmadi / Объявление не найдено")

    ip = ratelimit.client_ip(request)
    # A hard ceiling on the analytics too, so a script cannot inflate a
    # listing's numbers on the admin dashboard.
    ratelimit.enforce(f"contact:{ip}", limit=60, window_seconds=600)

    session.add(ContactEvent(listing_id=listing_id, channel=channel, source=source))
    await session.commit()

    seller = await session.get(User, listing.seller_id)
    lang = seller.language if seller else "uz"
    if ratelimit.allow(f"notify:{ip}:{listing_id}", limit=1, window_seconds=600):
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
async def get_photo(session: DbSession, listing_id: Annotated[int, Path(ge=1, le=MAX_DB_ID)]):
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
