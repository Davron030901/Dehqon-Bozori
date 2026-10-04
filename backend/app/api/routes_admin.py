"""Admin panel API.

Most village sellers will phone the founder rather than post anything
themselves. These endpoints let an admin create a listing on their behalf: a
lightweight seller record is created (or reused, matched on phone number) and
gets a synthetic negative id so it never collides with a real Telegram id. If
that person later starts the bot, the admin can merge them by editing the
listing's seller.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query
from sqlalchemy import func, select

from app.db.database import ContactEvent, Listing, Report, User, utcnow
from app.db.queries import get_or_create_offline_seller, normalize_phone  # noqa: F401
from app.districts import district_label

from .deps import MAX_DB_ID, AdminUser, DbSession
from app.models.schemas import (
    AdminListingIn,
    ListingOut,
    ListingPage,
    ReportOut,
    ReportPatch,
)
from .serializers import serialize_listing
from .routes_seller import build_listing

router = APIRouter(prefix="/admin", tags=["admin"])

# `get_or_create_offline_seller` and `normalize_phone` live in app/db/queries.py
# so the bot's /admin command and these endpoints create sellers by exactly the
# same rule — matched on phone, synthetic negative id, never duplicated.


@router.get("/listings", response_model=ListingPage)
async def all_listings(
    session: DbSession,
    _admin: AdminUser,
    q: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    lang: str = "uz",
) -> ListingPage:
    conds = []
    if status:
        conds.append(Listing.status == status)
    if q:
        conds.append(func.lower(Listing.title).like(f"%{q.lower()}%"))

    base = select(Listing).where(*conds) if conds else select(Listing)
    total = (
        await session.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()
    rows = (
        await session.execute(
            base.order_by(Listing.created_at.desc(), Listing.id.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).scalars().all()

    ids = {l.seller_id for l in rows}
    sellers = {
        u.id: u
        for u in (
            await session.execute(select(User).where(User.id.in_(ids)))
        ).scalars().all()
    } if ids else {}

    return ListingPage(
        items=[serialize_listing(l, lang, sellers.get(l.seller_id)) for l in rows],
        total=total,
        page=page,
        per_page=per_page,
        pages=max(1, -(-total // per_page)),
    )


@router.post("/listings", response_model=ListingOut, status_code=201)
async def create_for_seller(
    session: DbSession, _admin: AdminUser, payload: AdminListingIn, lang: str = "uz"
) -> ListingOut:
    seller = await get_or_create_offline_seller(
        session,
        payload.seller_name,
        payload.seller_phone or payload.phone,
        payload.region,
        # The seller's "village" is shown to people — store the district's
        # name, never its slug ("Urgut", not "urgut").
        district_label(payload.district, fallback=payload.district) or None,
    )
    listing = build_listing(payload, seller.id, source="admin")
    if not listing.phone:
        listing.phone = seller.phone
    session.add(listing)
    await session.commit()
    await session.refresh(listing)
    return serialize_listing(listing, lang, seller)


@router.delete("/listings/{listing_id}", status_code=204)
async def delete_any(
    session: DbSession, _admin: AdminUser, listing_id: Annotated[int, Path(ge=1, le=MAX_DB_ID)]
) -> None:
    listing = await session.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(404, "not found")
    await session.delete(listing)
    await session.commit()


@router.get("/dashboard")
async def dashboard(session: DbSession, _admin: AdminUser) -> dict:
    async def count(model, *conds) -> int:
        stmt = select(func.count()).select_from(model)
        if conds:
            stmt = stmt.where(*conds)
        return (await session.execute(stmt)).scalar_one()

    week_ago = utcnow() - timedelta(days=7)

    by_category = (
        await session.execute(
            select(Listing.category, func.count())
            .where(Listing.status == "active")
            .group_by(Listing.category)
            .order_by(func.count().desc())
        )
    ).all()
    by_region = (
        await session.execute(
            select(Listing.region, func.count())
            .where(Listing.status == "active")
            .group_by(Listing.region)
            .order_by(func.count().desc())
        )
    ).all()
    by_source = (
        await session.execute(
            select(Listing.source, func.count()).group_by(Listing.source)
        )
    ).all()
    by_channel = (
        await session.execute(
            select(ContactEvent.channel, func.count()).group_by(ContactEvent.channel)
        )
    ).all()

    top = (
        await session.execute(
            select(Listing)
            .where(Listing.status == "active")
            .order_by(Listing.views.desc())
            .limit(10)
        )
    ).scalars().all()

    return {
        "totals": {
            "listings": await count(Listing),
            "active": await count(Listing, Listing.status == "active"),
            "sold": await count(Listing, Listing.status == "sold"),
            "users": await count(User),
            "contacts": await count(ContactEvent),
            "contacts_week": await count(ContactEvent, ContactEvent.created_at >= week_ago),
            "listings_week": await count(Listing, Listing.created_at >= week_ago),
            "open_reports": await count(Report, Report.status == "open"),
        },
        "by_category": [{"key": k, "count": c} for k, c in by_category],
        "by_region": [{"key": k, "count": c} for k, c in by_region],
        "by_source": [{"key": k or "bot", "count": c} for k, c in by_source],
        "by_channel": [{"key": k, "count": c} for k, c in by_channel],
        "top_listings": [
            {"id": l.id, "title": l.title, "views": l.views or 0} for l in top
        ],
    }


# --------------------------------------------------------------------------- #
#  Reports — buyers flagging spam, fraud, fake prices
# --------------------------------------------------------------------------- #
@router.get("/reports", response_model=list[ReportOut])
async def list_reports(
    session: DbSession,
    _admin: AdminUser,
    status: str | None = Query("open", description="open | resolved | empty for all"),
    limit: int = Query(100, ge=1, le=500),
) -> list[ReportOut]:
    stmt = (
        select(Report, Listing.title)
        .join(Listing, Listing.id == Report.listing_id, isouter=True)
        .order_by(Report.created_at.desc(), Report.id.desc())
        .limit(limit)
    )
    if status:
        stmt = stmt.where(Report.status == status)
    rows = (await session.execute(stmt)).all()
    return [
        ReportOut(
            id=r.id,
            listing_id=r.listing_id,
            listing_title=title,
            reason=r.reason,
            note=r.note,
            status=r.status,
            created_at=r.created_at,
        )
        for r, title in rows
    ]


@router.patch("/reports/{report_id}", response_model=ReportOut)
async def update_report(
    session: DbSession,
    _admin: AdminUser,
    report_id: Annotated[int, Path(ge=1, le=MAX_DB_ID)],
    payload: ReportPatch,
) -> ReportOut:
    report = await session.get(Report, report_id)
    if report is None:
        raise HTTPException(404, "not found")
    report.status = payload.status
    await session.commit()
    listing = await session.get(Listing, report.listing_id)
    return ReportOut(
        id=report.id,
        listing_id=report.listing_id,
        listing_title=listing.title if listing else None,
        reason=report.reason,
        note=report.note,
        status=report.status,
        created_at=report.created_at,
    )
