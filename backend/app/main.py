"""Entrypoint — runs the FastAPI server and the Telegram bot together.

    python -m app.main          # API + bot   (what the Dockerfile runs)
    python -m app.main web      # API only
    python -m app.main bot      # bot only

One process by default. The API and the bot share a database, an event loop and
a connection pool, which means one Render service instead of two — half the
cold starts, half the bill, and no cross-process locking.

Split them (`web` on one service, `bot` on another) once DATABASE_URL points at
Supabase Postgres, which both can talk to at the same time.
"""
from __future__ import annotations

import asyncio
import logging
import sys

import uvicorn

from app.config import check_config, settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("dehqon_bozori.main")


async def serve_web() -> None:
    """Uvicorn, bound to 0.0.0.0 and the port Render injects."""
    config = uvicorn.Config(
        "app.api.app:app",
        host=settings.api_host,
        port=settings.bind_port,
        log_level="info",
        access_log=False,
        proxy_headers=True,       # Render terminates TLS in front of us
        forwarded_allow_ips="*",
    )
    await uvicorn.Server(config).serve()


async def serve_bot() -> None:
    from aiogram import Bot, Dispatcher
    from aiogram.client.default import DefaultBotProperties
    from aiogram.enums import ParseMode
    from aiogram.fsm.storage.memory import MemoryStorage
    from aiogram.types import BotCommand

    from app.bot.handlers import get_routers
    from app.bot.middlewares import DbSessionMiddleware
    from app.db.database import init_db

    await init_db()

    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())
    dp.update.middleware(DbSessionMiddleware())
    for router in get_routers():
        dp.include_router(router)

    try:
        await bot.set_my_commands([
            BotCommand(command="start", description="Boshlash / Начать"),
            BotCommand(command="sayt", description="Sayt / Сайт"),
            BotCommand(command="help", description="Yordam / Помощь"),
            BotCommand(command="cancel", description="Bekor qilish / Отмена"),
            # Visible to everyone, but /admin and /stats refuse anyone whose id
            # is not in ADMIN_IDS — a hidden command is not a security boundary.
            BotCommand(command="admin", description="Admin panel"),
            BotCommand(command="stats", description="Statistika / Статистика"),
        ])
        await bot.delete_webhook(drop_pending_updates=True)
    except Exception as exc:
        logger.warning("Telegram setup call failed: %s", exc)

    logger.info("Bot polling started")
    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


async def run(mode: str) -> None:
    logger.info(
        "Dehqon Bozori | mode=%s env=%s db=%s port=%s",
        mode,
        settings.env,
        settings.database_url.split("://", 1)[0],
        settings.bind_port,
    )

    # Half-configured settings used to fail silently. Say them out loud instead.
    for warning in check_config():
        logger.warning("SOZLAMA: %s", warning)

    if mode == "web":
        await serve_web()
        return
    if mode == "bot":
        await serve_bot()
        return

    # Both. If either task dies, cancel the other and surface the error so the
    # container exits and Render restarts it — a half-dead service (API up, bot
    # silently gone) is worse than a restart.
    tasks = [
        asyncio.create_task(serve_web(), name="web"),
        asyncio.create_task(serve_bot(), name="bot"),
    ]
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)
    for task in pending:
        task.cancel()
    await asyncio.gather(*pending, return_exceptions=True)
    for task in done:
        exc = task.exception()
        if exc is not None:
            raise exc


def main() -> None:
    mode = sys.argv[1].lower() if len(sys.argv) > 1 else "all"
    if mode not in ("all", "web", "bot"):
        print(__doc__)
        raise SystemExit(1)
    try:
        asyncio.run(run(mode))
    except (KeyboardInterrupt, SystemExit):
        logger.info("Stopped.")


if __name__ == "__main__":
    main()
