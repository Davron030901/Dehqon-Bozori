"""A tiny in-process rate limiter.

Three public endpoints can be driven by anyone with curl and each has a cost
that lands on a real person or on the database:

  * POST /api/listings/{id}/contact — pings the seller's Telegram. Without a
    limit, a loop is a free way to flood a grower's phone at 3 a.m.
  * POST /api/auth/start            — writes an auth code row.
  * POST /api/listings/{id}/report  — wakes the founder up.

The service runs as ONE process (API + bot, see app/main.py), so a dict in
memory is an honest store: no Redis to pay for, no shared state to lose. If
the API is ever scaled to several instances, each gets its own budget — a
looser limit, never a broken one.
"""
from __future__ import annotations

import time
from collections import deque

from fastapi import HTTPException, Request

from app.config import settings

# key -> timestamps of recent hits, oldest first
_hits: dict[str, deque[float]] = {}
_last_sweep = 0.0
# A flood of distinct keys must not be able to grow memory without bound.
MAX_KEYS = 50_000


def client_ip(request: Request) -> str:
    """The caller's address, as reported by OUR proxy — not by the caller.

    X-Forwarded-For is a list every proxy appends to; everything left of the
    entries our own proxies added was written by the client and can be any
    value. uvicorn with forwarded_allow_ips="*" trusts the LEFT-most entry,
    so a script sending a fresh fake address per request got a fresh rate
    limit bucket every time. Count TRUSTED_PROXY_HOPS entries from the right
    instead (Render's edge = 1).
    """
    hops = max(1, settings.trusted_proxy_hops)
    raw = request.headers.get("x-forwarded-for", "")
    hosts = [h.strip() for h in raw.split(",") if h.strip()]
    if len(hosts) >= hops:
        return hosts[-hops][:64]
    return request.client.host if request.client else "unknown"


def _sweep(now: float, horizon: float) -> None:
    """Drop keys nobody has touched for a while, so memory stays bounded."""
    global _last_sweep
    if now - _last_sweep < 60:
        return
    _last_sweep = now
    for key in [k for k, q in _hits.items() if not q or now - q[-1] > horizon]:
        _hits.pop(key, None)


def allow(key: str, limit: int, window_seconds: float) -> bool:
    """Record a hit and return True while `key` is within `limit` per window."""
    now = time.monotonic()
    _sweep(now, max(window_seconds, 3600))
    if key not in _hits and len(_hits) >= MAX_KEYS:
        # Under a flood of new keys, forget the oldest rather than grow forever.
        _hits.pop(next(iter(_hits)))
    bucket = _hits.setdefault(key, deque())
    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()
    if len(bucket) >= limit:
        return False
    bucket.append(now)
    return True


def enforce(key: str, limit: int, window_seconds: float) -> None:
    """`allow`, but answers 429 instead of returning False."""
    if not allow(key, limit, window_seconds):
        raise HTTPException(
            429,
            "Juda ko'p so'rov — birozdan keyin urinib ko'ring / "
            "Слишком много запросов, попробуйте позже",
        )


def reset() -> None:
    """Forget everything. Tests call this between scenarios."""
    _hits.clear()
