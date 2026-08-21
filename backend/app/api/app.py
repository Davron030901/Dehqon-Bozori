"""FastAPI application for Dehqon Bozori.

Serves the JSON API under /api, uploaded photos under /media, and the
mobile-first PWA at /. One process, one domain, one deploy — and the same
database the Telegram bot uses.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import check_config, settings
from app.db.database import init_db

from . import notify
from . import (
    routes_admin,
    routes_auth,
    routes_listings,
    routes_meta,
    routes_public,
    routes_seller,
)

logger = logging.getLogger("dehqon_bozori.api")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    for warning in check_config():
        logger.warning("SOZLAMA: %s", warning)
    logger.info("API ready — db=%s", settings.database_url.split("://", 1)[0])
    yield
    await notify.close_bot()


app = FastAPI(
    title="Dehqon Bozori API",
    version="1.0.0",
    description=(
        "Connects village growers directly with buyers. The Telegram bot and "
        "this website share one database, so data written by either is "
        "immediately visible to the other."
    ),
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (
    routes_meta.router,
    routes_listings.router,
    routes_auth.router,
    routes_admin.router,
    routes_seller.router,
):
    app.include_router(r, prefix="/api")

# The unprefixed REST surface (/health, /listings, /sellers, /contact-events)
# described in the deployment spec. Same handlers, no /api prefix, so a plain
# `GET /health` works for Render's health check.
app.include_router(routes_public.router)


@app.exception_handler(Exception)
async def unhandled(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled API error: %s", exc)
    return JSONResponse(
        status_code=500, content={"detail": "Server xatosi / Ошибка сервера"}
    )


# --------------------------------------------------------------------------- #
#  Static: uploaded photos + the PWA
# --------------------------------------------------------------------------- #
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")

# The vanilla-JS PWA in backend/web/ was the original storefront. The Next.js
# app in frontend/ replaced it, and serving both meant every change had to be
# made twice — so this is off unless SERVE_LEGACY_WEB=true brings it back.
WEB_DIR = settings.web_dir
if settings.serve_legacy_web and WEB_DIR.is_dir():
    logger.warning(
        "SERVE_LEGACY_WEB=true — backend/web/ arxivlangan eski sayt xizmat "
        "qilmoqda. Asosiy sayt: frontend/ (Next.js)."
    )
    app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")

    def _page(name: str):
        async def handler() -> FileResponse:
            return FileResponse(WEB_DIR / name)

        return handler

    # Clean URLs for the PWA's pages.
    for path, filename in (
        ("/", "index.html"),
        ("/e/{listing_id}", "listing.html"),
        ("/sell", "sell.html"),
        ("/my", "my.html"),
        ("/admin", "admin.html"),
    ):
        app.add_api_route(
            path, _page(filename), methods=["GET"], include_in_schema=False
        )

    for asset in ("manifest.webmanifest", "sw.js", "app.js", "styles.css", "icon.svg"):
        app.add_api_route(
            f"/{asset}",
            _page(asset),
            methods=["GET"],
            include_in_schema=False,
        )

else:

    @app.get("/", include_in_schema=False)
    async def root() -> dict:
        """This service is an API now, not a website.

        Someone opening the Render URL in a browser deserves a signpost rather
        than a bare 404 — the storefront lives on Vercel.
        """
        return {
            "service": "Dehqon Bozori API",
            "docs": "/api/docs",
            "health": "/health",
            "sayt": "https://dehqon-bozori.vercel.app",
            "note": (
                "Bu API. Sayt Next.js (frontend/) va Vercel'da turadi. "
                "Eski PWA uchun: SERVE_LEGACY_WEB=true"
            ),
        }
