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

# key -> timestamps of recent hits, oldest first
_hits: dict[str, deque[float]] = {}
_last_sweep = 0.0


def client_ip(request: Request) -> str:
    """Best-effort caller address. uvicorn runs with proxy_headers=True, so
    behind Render's proxy this is the real client, not the load balancer."""
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
