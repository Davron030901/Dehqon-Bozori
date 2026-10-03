"""Application configuration — shared by the Telegram bot and the web API.

All values are read from environment variables / the .env file.
Only BOT_TOKEN is required; everything else has sane defaults so the whole
platform runs locally on SQLite out of the box.
"""
from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ — the parent of the `app` package. media/ and web/ live here, next
# to the Dockerfile, so a container volume can be mounted at one known path.
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Telegram ---------------------------------------------------------
    # Bot token from @BotFather
    bot_token: str
    # Bot @username without the @ — used to build t.me login / contact links
    bot_username: str = ""

    # --- Database ---------------------------------------------------------
    # SQLAlchemy async URL.
    #   local dev  -> sqlite+aiosqlite:///dehqon_bozori.db
    #   production -> postgresql+asyncpg://user:pass@host:5432/dbname (Supabase)
    database_url: str = "sqlite+aiosqlite:///dehqon_bozori.db"

    # --- Web API ----------------------------------------------------------
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    # Public URL of THIS service (the API), e.g. https://dehqonbozori.onrender.com
    public_base_url: str = "http://localhost:8000"
    # Public URL of the storefront (the Next.js site on Vercel), e.g.
    # https://dehqon-bozori.vercel.app. The bot's "open the website" button and
    # the API's `/` signpost point here. Empty falls back to PUBLIC_BASE_URL,
    # which is only right for the archived single-domain setup.
    site_url: str = ""
    # Optional download link for the Android app (an EAS build or a Play Store
    # page). Shown by the bot and the website when set.
    android_app_url: str = ""
    # Comma-separated allowed browser origins. "*" is fine while the API also
    # serves the frontend from the same domain.
    cors_origins: str = "*"

    # The original vanilla-JS PWA in backend/web/ has been superseded by the
    # Next.js app in frontend/. It is kept in the tree for reference but is no
    # longer served, so the two can never drift apart in production. Set this to
    # true to bring the old pages back at /, /e/{id}, /sell, /my, /admin.
    serve_legacy_web: bool = False

    # --- Access -----------------------------------------------------------
    # Comma-separated Telegram user IDs allowed to use /stats and the admin panel
    admin_ids: str = ""
    # Shared secret for the machine-to-machine endpoints (POST /listings,
    # POST /sellers, PATCH /listings/{id}/sold). Leave empty to keep those
    # endpoints disabled — they fail closed, never open.
    admin_api_token: str = ""

    # --- Runtime ----------------------------------------------------------
    env: str = "development"
    # Render injects PORT; it must win over API_PORT.
    port: int | None = None

    # --- Photo storage ----------------------------------------------------
    # Render's free disk is wiped on every deploy and restart, so photos
    # uploaded through the website would vanish. Set this to a Telegram chat id
    # (a private channel the bot is an admin of, or your own user id) and the
    # backend mirrors every web upload into Telegram, storing the permanent
    # file_id. Telegram then becomes the durable, free photo store — the same
    # one the bot already uses.
    photo_archive_chat_id: int | None = None

    # --- Marketplace ------------------------------------------------------
    default_currency: str = "so'm"
    listings_per_page: int = 5      # bot browsing
    web_page_size: int = 24         # website grid
    max_upload_mb: int = 8

    @field_validator("port", "photo_archive_chat_id", mode="before")
    @classmethod
    def _blank_is_none(cls, value):
        """Treat an empty environment variable as "not set".

        `.env.example` ships these keys with no value, and Render leaves an
        unfilled variable as an empty string — both would otherwise fail
        int-parsing and crash the container on boot.
        """
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("bot_username", "admin_ids", "admin_api_token", mode="before")
    @classmethod
    def _todo_is_blank(cls, value):
        """`.env` ships TODO_ placeholders for the values only the founder knows.

        Treating them as "not set" means an unfilled placeholder behaves exactly
        like an empty variable — a clear startup warning and a fail-closed
        endpoint — instead of building a `t.me/TODO_BOT_USERNAME_QOYING` link or
        crashing `int()` on a non-numeric admin id.
        """
        if isinstance(value, str) and value.strip().upper().startswith("TODO"):
            return ""
        return value

    @property
    def admin_id_list(self) -> list[int]:
        """Numeric admin ids. Non-numeric junk is skipped, never raised.

        A typo in ADMIN_IDS should cost you the admin panel, not the whole
        container — `check_config()` reports it loudly at boot instead.
        """
        ids: list[int] = []
        for chunk in self.admin_ids.replace(" ", "").split(","):
            if not chunk:
                continue
            try:
                ids.append(int(chunk))
            except ValueError:
                continue
        return ids

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()] or ["*"]

    @property
    def storefront_url(self) -> str:
        """Where a person should be sent to browse listings, without a trailing /."""
        return (self.site_url or self.public_base_url).rstrip("/")

    @property
    def bind_port(self) -> int:
        """Port to listen on. PORT (injected by Render) wins over API_PORT."""
        return self.port or self.api_port

    @property
    def media_dir(self) -> Path:
        p = BASE_DIR / "media"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def web_dir(self) -> Path:
        return BASE_DIR / "web"


settings = Settings()


def check_config() -> list[str]:
    """Return human-readable warnings about half-configured settings.

    Every one of these used to fail silently: an empty BOT_USERNAME produced an
    empty login link, an empty ADMIN_IDS locked the founder out of their own
    dashboard, and an empty PHOTO_ARCHIVE_CHAT_ID lost every website photo on
    the next deploy — all without a single line in the log. They are warnings
    rather than errors so the API still boots and serves buyers, which works
    fine without any of them.
    """
    warnings: list[str] = []

    if not settings.bot_username:
        warnings.append(
            "BOT_USERNAME bo'sh — saytdagi «Telegram orqali kirish» ishlamaydi "
            "(/api/auth/start 503 qaytaradi). @BotFather'dagi bot @username'ini "
            "@ belgisisiz qo'ying."
        )
    if not settings.admin_id_list:
        warnings.append(
            "ADMIN_IDS bo'sh yoki noto'g'ri — botdagi /stats va /admin, hamda "
            "/api/admin/* yopiq. Telegram ID'ingizni @userinfobot'dan oling."
        )
    if not settings.admin_api_token:
        warnings.append(
            "ADMIN_API_TOKEN bo'sh — POST /listings, POST /sellers va "
            "PATCH /listings/{id}/sold o'chirilgan (503)."
        )
    if settings.env != "development" and settings.photo_archive_chat_id is None:
        warnings.append(
            "PHOTO_ARCHIVE_CHAT_ID bo'sh — saytdan yuklangan rasmlar birinchi "
            "qayta ishga tushishda yo'qoladi. Yopiq Telegram kanal oching."
        )
    if settings.env != "development" and not settings.site_url:
        warnings.append(
            "SITE_URL bo'sh — botdagi «Saytni ochish» tugmasi API manziliga "
            "(PUBLIC_BASE_URL) olib boradi, saytga emas. Vercel manzilini "
            "qo'ying, masalan https://dehqon-bozori.vercel.app"
        )
    if settings.env != "development" and "*" in settings.cors_origin_list:
        warnings.append(
            "CORS_ORIGINS=* — production'da o'z domeningizni yozing, masalan "
            "https://dehqon-bozori.vercel.app"
        )
    if settings.env != "development" and settings.database_url.startswith("sqlite"):
        warnings.append(
            "DATABASE_URL hali ham SQLite — Render'ning diski har deploy'da "
            "tozalanadi, ma'lumotlar yo'qoladi. Supabase Session pooler URL'ini "
            "qo'ying."
        )
    return warnings
