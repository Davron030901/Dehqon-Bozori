"""Photo handling.

The bot stores Telegram `file_id`s; the website uploads real files. This module
bridges the two so a single <img src="/api/photo/<id>"> works no matter which
surface created the listing.

Durability note — this matters on Render's free tier, where the container's
disk is wiped on every deploy and restart. A photo written only to media/ would
disappear along with it. So when PHOTO_ARCHIVE_CHAT_ID is configured, every web
upload is also pushed into Telegram and we keep the returned file_id: Telegram
becomes a free, permanent photo store, and the local file degrades to a cache.
Without that setting the upload still works, but the README is explicit that it
will not survive a restart on an ephemeral disk.
"""
from __future__ import annotations

import asyncio
import logging
import mimetypes
import secrets
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger("dehqon_bozori.media")

UPLOAD_DIR = settings.media_dir / "uploads"
CACHE_DIR = settings.media_dir / "telegram"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
}

_tg_locks: dict[str, asyncio.Lock] = {}


def save_upload(data: bytes, content_type: str | None, filename: str | None) -> str:
    """Persist a browser upload and return the public URL path."""
    ext = ALLOWED_IMAGE_TYPES.get((content_type or "").lower())
    if ext is None and filename:
        guessed, _ = mimetypes.guess_type(filename)
        ext = ALLOWED_IMAGE_TYPES.get((guessed or "").lower())
    if ext is None:
        raise ValueError("unsupported image type")

    name = f"{secrets.token_urlsafe(16).replace('-', '').replace('_', '')}{ext}"
    (UPLOAD_DIR / name).write_bytes(data)
    return f"/media/uploads/{name}"


async def archive_to_telegram(data: bytes, filename: str = "listing.jpg") -> str | None:
    """Mirror a web upload into Telegram and return its permanent file_id.

    Returns None when archiving is not configured or Telegram refuses — callers
    treat that as "keep the local file only", so a failure here can never lose
    the listing itself.
    """
    chat_id = settings.photo_archive_chat_id
    if not chat_id or not settings.bot_token:
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{settings.bot_token}/sendPhoto",
                data={"chat_id": str(chat_id), "disable_notification": "true"},
                files={"photo": (filename, data)},
            )
            response.raise_for_status()
            payload = response.json()
            if not payload.get("ok"):
                return None
            # Telegram returns several sizes; the last is the largest.
            sizes = payload["result"].get("photo") or []
            return sizes[-1]["file_id"] if sizes else None
    except Exception as exc:
        logger.warning("Could not archive photo to Telegram: %s", exc)
        return None


def local_path_for(photo_url: str | None) -> Path | None:
    """Map a stored /media/... URL back to a file on disk (path-traversal safe)."""
    if not photo_url or not photo_url.startswith("/media/"):
        return None
    candidate = (settings.media_dir / photo_url[len("/media/"):]).resolve()
    try:
        candidate.relative_to(settings.media_dir.resolve())
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


async def telegram_photo_path(file_id: str) -> Path | None:
    """Download (once) a Telegram photo and cache it on disk.

    Returns the cached path, or None if Telegram is unreachable / the token is
    missing. Cached forever — Telegram file_ids are immutable.
    """
    safe = "".join(c for c in file_id if c.isalnum() or c in "-_")[:120]
    if not safe:
        return None
    cached = CACHE_DIR / f"{safe}.jpg"
    if cached.is_file():
        return cached

    lock = _tg_locks.setdefault(safe, asyncio.Lock())
    async with lock:
        if cached.is_file():
            return cached
        token = settings.bot_token
        if not token:
            return None
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                info = await client.get(
                    f"https://api.telegram.org/bot{token}/getFile",
                    params={"file_id": file_id},
                )
                info.raise_for_status()
                payload = info.json()
                if not payload.get("ok"):
                    return None
                remote = payload["result"]["file_path"]
                blob = await client.get(
                    f"https://api.telegram.org/file/bot{token}/{remote}"
                )
                blob.raise_for_status()
                tmp = cached.with_suffix(".part")
                tmp.write_bytes(blob.content)
                tmp.replace(cached)
                return cached
        except Exception as exc:  # network, auth, deleted file…
            logger.warning("Telegram photo fetch failed for %s: %s", safe[:12], exc)
            return None
        finally:
            _tg_locks.pop(safe, None)
