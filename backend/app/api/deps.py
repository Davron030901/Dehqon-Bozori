"""FastAPI dependencies: database session and bearer-token authentication."""
from __future__ import annotations

from typing import Annotated, AsyncIterator

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.database import User, WebSession, session_factory, utcnow


# listings.id and friends are Postgres INTEGER. asyncpg refuses to send a
# larger number at all, so an out-of-range id from a URL or a phone's storage
# became a 500 instead of a 404. Every id parameter is bounded by this.
MAX_DB_ID = 2_147_483_647
# users.id is BIGINT (Telegram ids, and negative ids for offline sellers).
MAX_BIGINT = 2**63 - 1


async def get_session() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session


DbSession = Annotated[AsyncSession, Depends(get_session)]


def _token_from_header(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split(None, 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return authorization.strip() or None


async def optional_user(
    session: DbSession,
    authorization: Annotated[str | None, Header()] = None,
) -> User | None:
    """Resolve the caller from a bearer token, or None for anonymous buyers."""
    token = _token_from_header(authorization)
    if not token:
        return None
    ws = await session.get(WebSession, token)
    if ws is None:
        return None
    expires = ws.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=utcnow().tzinfo)
    if expires < utcnow():
        await session.delete(ws)
        await session.commit()
        return None
    return await session.get(User, ws.user_id)


OptionalUser = Annotated[User | None, Depends(optional_user)]


async def current_user(user: OptionalUser) -> User:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tizimga kiring / Войдите в систему",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def is_admin(user: User | None) -> bool:
    return bool(user and user.id in settings.admin_id_list)


async def admin_user(user: CurrentUser) -> User:
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin huquqi kerak / Нужны права администратора")
    return user


AdminUser = Annotated[User, Depends(admin_user)]
