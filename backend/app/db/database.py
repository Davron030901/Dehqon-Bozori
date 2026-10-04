"""Database layer: SQLAlchemy 2.0 (async) models + engine + session factory.

This module is the SINGLE source of truth for both the Telegram bot and the
FastAPI web backend. Both import these models and talk to the same database, so
a listing created in the bot appears instantly on the website and vice-versa.

Default backend is SQLite (aiosqlite), opened in WAL mode so the bot and the
API can read/write concurrently. Point DATABASE_URL at Postgres
(postgresql+asyncpg://...) to use Supabase or any Postgres instance.
"""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    event,
    func,
    inspect,
    select,
    text,
    update,
)
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.config import settings

logger = logging.getLogger("dehqon_bozori.db")


class Base(AsyncAttrs, DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------- #
#  Users
# --------------------------------------------------------------------------- #
class User(Base):
    """A person. `id` is the Telegram user id when they came from the bot.

    Sellers added manually by an admin (people who phone the founder) get a
    synthetic negative id so they never collide with real Telegram ids.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    region: Mapped[str | None] = mapped_column(String(32), nullable=True)
    village: Mapped[str | None] = mapped_column(String(128), nullable=True)
    language: Mapped[str] = mapped_column(String(2), default="uz")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# --------------------------------------------------------------------------- #
#  Listings
# --------------------------------------------------------------------------- #
class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    seller_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(32), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(8), default="so'm")
    unit: Mapped[str] = mapped_column(String(16), default="kg")
    quantity: Mapped[str | None] = mapped_column(String(64), nullable=True)
    region: Mapped[str] = mapped_column(String(32), index=True)
    district: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Two photo sources, kept side by side so both clients can render a listing:
    #   photo_file_id -> uploaded through Telegram (bot). The API turns it into
    #                    a real image via the Telegram getFile API and caches it.
    #   photo_url     -> uploaded through the website, stored under media/.
    photo_file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    telegram_username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(32), nullable=True)

    status: Mapped[str] = mapped_column(String(16), default="active", index=True)
    source: Mapped[str] = mapped_column(String(16), default="bot")  # bot | web | admin
    views: Mapped[int] = mapped_column(Integer, default=0)
    harvest_date: Mapped[str | None] = mapped_column(String(16), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


Index("ix_listings_status_created", Listing.status, Listing.created_at.desc())


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "listing_id", name="uq_user_listing"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    listing_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("listings.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# --------------------------------------------------------------------------- #
#  Analytics — who tapped "call" / "telegram" / "whatsapp", and from where
# --------------------------------------------------------------------------- #
class ContactEvent(Base):
    __tablename__ = "contact_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    listing_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("listings.id", ondelete="CASCADE"), index=True
    )
    channel: Mapped[str] = mapped_column(String(16))  # call | telegram | whatsapp
    source: Mapped[str] = mapped_column(String(16), default="web")  # web | bot
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


# --------------------------------------------------------------------------- #
#  Moderation — a buyer flags a listing as spam, fraud or already sold
# --------------------------------------------------------------------------- #
REPORT_REASONS = ("spam", "fraud", "wrong_price", "sold", "other")


class Report(Base):
    """A complaint about a listing.

    Buyers do not register, so `reporter_id` is usually empty — the report is
    still worth having, because the founder looks at the listing, not at who
    complained. Resolving a report never deletes anything by itself; the admin
    decides what to do with the listing.
    """

    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    listing_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("listings.id", ondelete="CASCADE"), index=True
    )
    reporter_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    reason: Mapped[str] = mapped_column(String(16))
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# --------------------------------------------------------------------------- #
#  Website auth — passwordless, verified through the Telegram bot
# --------------------------------------------------------------------------- #
class AuthCode(Base):
    """A short-lived login code.

    Flow: website/app creates a code and shows its two-digit `match_code` ->
    user opens t.me/<bot>?start=login_<code> -> bot asks them to pick that
    number among decoys -> on the right pick it approves the code and attaches
    the Telegram user id -> website/app polls and receives a session token.

    No SMS gateway, no passwords, and the web account IS the bot account, so
    listings follow the seller between the two.
    """

    __tablename__ = "auth_codes"

    code: Mapped[str] = mapped_column(String(16), primary_key=True)
    # Shown on the screen that started the login; the bot asks the person to
    # pick it among decoys. Someone who was merely SENT the deep link cannot
    # see that screen, so they cannot approve an attacker's login by accident.
    match_code: Mapped[str | None] = mapped_column(String(4), nullable=True)
    user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    @staticmethod
    def new(ttl_minutes: int = 10) -> "AuthCode":
        raw = secrets.token_urlsafe(12).replace("-", "").replace("_", "")
        return AuthCode(
            code=raw[:12],
            match_code=str(10 + secrets.randbelow(90)),  # 10..99
            expires_at=utcnow() + timedelta(minutes=ttl_minutes),
        )


class WebSession(Base):
    """A bearer token handed to the browser after a successful login."""

    __tablename__ = "web_sessions"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    @staticmethod
    def new(user_id: int, ttl_days: int = 60) -> "WebSession":
        return WebSession(
            token=secrets.token_urlsafe(32),
            user_id=user_id,
            expires_at=utcnow() + timedelta(days=ttl_days),
        )


# --------------------------------------------------------------------------- #
#  Engine / session factory
# --------------------------------------------------------------------------- #
_is_sqlite = settings.database_url.startswith("sqlite")

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    # SQLite: wait instead of instantly raising "database is locked" when the
    # bot and the API happen to write at the same moment.
    connect_args={"timeout": 30} if _is_sqlite else {},
)

if _is_sqlite:

    @event.listens_for(engine.sync_engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):  # pragma: no cover - driver hook
        cur = dbapi_conn.cursor()
        for pragma in (
            "PRAGMA journal_mode=WAL",   # concurrent readers + one writer
            "PRAGMA synchronous=NORMAL",
            "PRAGMA busy_timeout=30000",
            "PRAGMA foreign_keys=ON",
        ):
            try:
                cur.execute(pragma)
            except Exception:
                # WAL needs shared memory, which some filesystems (network
                # shares, synced folders, certain container volumes) do not
                # provide. Losing a tuning pragma is fine; refusing to start
                # is not — fall back to the default journal mode.
                pass
        cur.close()


session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


# Columns added after the first release: (table, column, full statement).
# Added in place on start-up so an existing database (including the live one)
# upgrades without losing data. Whole literal statements — no SQL is ever
# assembled from strings.
_ADD_COLUMNS: tuple[tuple[str, str, str], ...] = (
    ("users", "region", "ALTER TABLE users ADD COLUMN region VARCHAR(32)"),
    ("users", "village", "ALTER TABLE users ADD COLUMN village VARCHAR(128)"),
    ("listings", "photo_url", "ALTER TABLE listings ADD COLUMN photo_url VARCHAR(512)"),
    ("listings", "telegram_username", "ALTER TABLE listings ADD COLUMN telegram_username VARCHAR(64)"),
    ("listings", "whatsapp", "ALTER TABLE listings ADD COLUMN whatsapp VARCHAR(32)"),
    ("listings", "source", "ALTER TABLE listings ADD COLUMN source VARCHAR(16) DEFAULT 'bot'"),
    ("listings", "views", "ALTER TABLE listings ADD COLUMN views INTEGER DEFAULT 0"),
    ("listings", "harvest_date", "ALTER TABLE listings ADD COLUMN harvest_date VARCHAR(16)"),
    ("auth_codes", "match_code", "ALTER TABLE auth_codes ADD COLUMN match_code VARCHAR(4)"),
)


def _missing_columns(sync_conn) -> list[tuple[str, str, str]]:
    inspector = inspect(sync_conn)
    missing = []
    for table, column, statement in _ADD_COLUMNS:
        existing = {c["name"] for c in inspector.get_columns(table)}
        if column not in existing:
            missing.append((table, column, statement))
    return missing


async def init_db() -> None:
    """Create missing tables, add missing columns, tidy legacy data.

    Each step commits on its own. This used to run create_all and every
    ALTER TABLE in ONE transaction, swallowing "column already exists" errors —
    harmless on SQLite, but on Postgres the first failed statement aborts the
    transaction and the final COMMIT silently becomes a ROLLBACK, taking the
    freshly created tables (the new `reports` table among them) with it. Now
    only the columns that are really missing are added, each in its own
    transaction, so nothing ever fails on purpose.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with engine.connect() as conn:
        missing = await conn.run_sync(_missing_columns)
    for table, column, statement in missing:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(statement))
            logger.info("Added column %s.%s", table, column)
        except Exception as exc:  # another instance got there first
            logger.warning("Could not add %s.%s: %s", table, column, exc)

    await _normalise_stored_phones()


async def _normalise_stored_phones() -> None:
    """Rewrite stored phone numbers into the canonical '+998…' form.

    Offline sellers are found by an exact match on `users.phone`. Phones saved
    before normalisation learned the +998 rule ('+901234567'), or saved raw from
    the bot ('998901234567', '+998 90 123 45 67'), would never match the same
    grower typed in again — and a duplicate seller would be created. Listing
    phones typed as '90 123 45 67' made the website's Call button dial +90…,
    which is Turkey. Idempotent: rows already canonical are left alone, so after
    the first start-up this is one cheap read per column.
    """
    from app.phones import normalize_phone

    targets = (
        (User, User.id, User.phone),
        (Listing, Listing.id, Listing.phone),
        (Listing, Listing.id, Listing.whatsapp),
    )
    async with session_factory() as session:
        changed = 0
        for model, key, column in targets:
            rows = (await session.execute(select(key, column).where(column.is_not(None)))).all()
            for row_id, raw in rows:
                canonical = normalize_phone(raw)
                if canonical and canonical != raw:
                    await session.execute(
                        update(model).where(key == row_id).values({column.key: canonical})
                    )
                    changed += 1
        if changed:
            await session.commit()
            logger.info("Normalised %d stored phone number(s)", changed)
