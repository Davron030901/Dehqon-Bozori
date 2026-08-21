"""Outbound Telegram notifications sent from the web side.

When a buyer taps "Call" on the website, the seller gets a Telegram message
from the bot within a second. This is the most visible proof that the two
surfaces are one platform.

The Bot object is created lazily and reused; sends are fire-and-forget so a
Telegram outage never breaks a web request.
"""
from __future__ import annotations

import asyncio
import logging

from app.config import settings

logger = logging.getLogger("dehqon_bozori.notify")

_bot = None
_bot_lock = asyncio.Lock()


async def _get_bot():
    global _bot
    if _bot is not None:
        return _bot
    async with _bot_lock:
        if _bot is None:
            from aiogram import Bot
            from aiogram.client.default import DefaultBotProperties
            from aiogram.enums import ParseMode

            _bot = Bot(
                token=settings.bot_token,
                default=DefaultBotProperties(parse_mode=ParseMode.HTML),
            )
    return _bot


async def close_bot() -> None:
    global _bot
    if _bot is not None:
        try:
            await _bot.session.close()
        except Exception:
            pass
        _bot = None


async def _send(chat_id: int, text: str) -> None:
    try:
        bot = await _get_bot()
        await bot.send_message(chat_id, text, disable_web_page_preview=True)
    except Exception as exc:
        # Seller blocked the bot, never started it, or Telegram is down.
        logger.info("Notification to %s not delivered: %s", chat_id, exc)


def send_background(chat_id: int | None, text: str) -> None:
    """Queue a message without making the caller wait for Telegram."""
    if not chat_id or chat_id < 0:  # negative ids are admin-created pseudo users
        return
    try:
        asyncio.get_running_loop().create_task(_send(chat_id, text))
    except RuntimeError:
        pass


CHANNEL_LABEL = {
    "call": {"uz": "telefon orqali", "ru": "по телефону"},
    "telegram": {"uz": "Telegram orqali", "ru": "через Telegram"},
    "whatsapp": {"uz": "WhatsApp orqali", "ru": "через WhatsApp"},
    "view": {"uz": "e'loningizni ko'rdi", "ru": "посмотрел ваше объявление"},
}


def contact_message(title: str, channel: str, lang: str = "uz") -> str:
    label = CHANNEL_LABEL.get(channel, CHANNEL_LABEL["call"]).get(lang, "")
    if lang == "ru":
        return (
            f"🔔 <b>Покупатель заинтересовался!</b>\n\n"
            f"Кто-то на сайте нажал «связаться» {label} по объявлению:\n"
            f"<b>{title}</b>\n\n"
            f"Ожидайте звонка или сообщения. 🌿"
        )
    return (
        f"🔔 <b>Xaridor qiziqdi!</b>\n\n"
        f"Saytda kimdir <b>{title}</b> e'loningiz bo'yicha {label} bog'lanmoqchi.\n\n"
        f"Qo'ng'iroq yoki xabarni kuting. 🌿"
    )
