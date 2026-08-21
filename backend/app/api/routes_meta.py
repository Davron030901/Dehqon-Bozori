"""Reference data + public stats.

The frontend renders its category chips, region dropdowns and unit selectors
straight from here, so editing catalog.py updates the bot AND the website.
"""
from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter
from sqlalchemy import func, select

from app.catalog import CATEGORIES, REGIONS, UNITS
from app.config import settings
from app.db.database import ContactEvent, Listing, User, utcnow

from .deps import DbSession
from app.models.schemas import StatsOut

router = APIRouter(tags=["meta"])


@router.get("/meta")
async def get_meta() -> dict:
    return {
        "categories": [
            {"key": k, "uz": v["uz"], "ru": v["ru"], "emoji": v["emoji"]}
            for k, v in CATEGORIES.items()
        ],
        "regions": [{"key": k, "uz": v["uz"], "ru": v["ru"]} for k, v in REGIONS.items()],
        "units": [{"key": k, "uz": v["uz"], "ru": v["ru"]} for k, v in UNITS.items()],
        "currency": settings.default_currency,
        "bot_username": settings.bot_username,
        "page_size": settings.web_page_size,
    }


@router.get("/stats", response_model=StatsOut)
async def get_stats(session: DbSession) -> StatsOut:
    async def count(model, *conds) -> int:
        stmt = select(func.count()).select_from(model)
        if conds:
            stmt = stmt.where(*conds)
        return (await session.execute(stmt)).scalar_one()

    day_ago = utcnow() - timedelta(days=1)
    regions = (
        await session.execute(
            select(func.count(func.distinct(Listing.region))).where(
                Listing.status == "active"
            )
        )
    ).scalar_one()

    return StatsOut(
        listings=await count(Listing),
        active_listings=await count(Listing, Listing.status == "active"),
        sellers=await count(User),
        regions=regions or 0,
        contacts=await count(ContactEvent),
        listings_today=await count(Listing, Listing.created_at >= day_ago),
    )


@router.get("/health")
async def health(session: DbSession) -> dict:
    await session.execute(select(1))
    return {"status": "ok", "db": settings.database_url.split("://", 1)[0]}
