"""Bridge handlers between the Telegram bot and the website.

Registered before every other router so the `/start login_<code>` deep link is
handled before the generic `/start`.
"""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.database import AuthCode, utcnow
from app.bot.keyboards import main_menu
from app.db.queries import get_or_create_user
from app.bot.texts import btn_texts, t

router = Router(name="web")


def site_url(path: str = "") -> str:
    return settings.public_base_url.rstrip("/") + path


def site_kb(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=t("web_open_site", lang), url=site_url("/"))]
        ]
    )


# --------------------------------------------------------------------------- #
#  /start login_<code>  — approve a website login
# --------------------------------------------------------------------------- #
@router.message(CommandStart(deep_link=True, magic=F.args.startswith("login_")))
async def web_login(
    message: Message,
    command: CommandObject,
    session: AsyncSession,
    state: FSMContext,
) -> None:
    await state.clear()
    user, _ = await get_or_create_user(session, message.from_user)
    lang = user.language or "uz"

    code_value = (command.args or "")[len("login_"):].strip()
    row = await session.get(AuthCode, code_value) if code_value else None

    expires = row.expires_at if row else None
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=utcnow().tzinfo)

    if row is None or row.consumed or (expires and expires < utcnow()):
        await message.answer(t("web_login_expired", lang), reply_markup=main_menu(lang))
        return

    row.approved = True
    row.user_id = user.id
    await session.commit()

    await message.answer(t("web_login_ok", lang), reply_markup=main_menu(lang))


# --------------------------------------------------------------------------- #
#  /sayt  — link to the website
# --------------------------------------------------------------------------- #
@router.message(Command("sayt", "site", "web"))
@router.message(F.text.in_(btn_texts("website")))
async def open_site(message: Message, session: AsyncSession) -> None:
    user, _ = await get_or_create_user(session, message.from_user)
    lang = user.language or "uz"
    await message.answer(
        t("web_site_intro", lang, url=site_url("/")), reply_markup=site_kb(lang)
    )
