"""Bridge handlers between the Telegram bot and the website.

Registered before every other router so the `/start login_<code>` deep link is
handled before the generic `/start`.
"""
from __future__ import annotations

import secrets

from aiogram import F, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    CallbackQuery,
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
    """The storefront (Vercel), not this API — see SITE_URL in config.py."""
    return settings.storefront_url + path


def _button_safe(url: str) -> bool:
    """Telegram rejects URL buttons pointing at localhost, and a rejected
    keyboard means the whole message is never delivered."""
    host = url.split("://", 1)[-1].split("/", 1)[0].split(":", 1)[0]
    return url.startswith(("http://", "https://")) and host not in ("localhost", "127.0.0.1", "0.0.0.0")


def site_kb(lang: str) -> InlineKeyboardMarkup | None:
    rows = []
    if _button_safe(site_url("/")):
        rows.append([InlineKeyboardButton(text=t("web_open_site", lang), url=site_url("/"))])
    if settings.android_app_url and _button_safe(settings.android_app_url):
        rows.append([
            InlineKeyboardButton(text=t("web_open_app", lang), url=settings.android_app_url)
        ])
    return InlineKeyboardMarkup(inline_keyboard=rows) if rows else None


# --------------------------------------------------------------------------- #
#  /start login_<code>  — approve a website / app login, by number matching
# --------------------------------------------------------------------------- #
def _usable(row: AuthCode | None) -> bool:
    if row is None or row.consumed or not row.match_code:
        return False
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=utcnow().tzinfo)
    return expires >= utcnow()


def match_kb(code: str, match_code: str, lang: str) -> InlineKeyboardMarkup:
    """The right number among two decoys, in random order, plus "not me".

    The person who started the login sees the number on their own screen.
    Someone who was only SENT the link does not — a guess is right one time in
    three, and a wrong guess burns the code for good.
    """
    numbers = {match_code}
    while len(numbers) < 3:
        numbers.add(str(10 + secrets.randbelow(90)))
    choices = sorted(numbers, key=lambda _: secrets.randbelow(1000))
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=n, callback_data=f"wlogin:{code}:{n}") for n in choices],
            [InlineKeyboardButton(text=t("ik_not_me", lang), callback_data=f"wlogin:{code}:no")],
        ]
    )


@router.message(CommandStart(deep_link=True, magic=F.args.startswith("login_")))
async def web_login(
    message: Message,
    command: CommandObject,
    session: AsyncSession,
    state: FSMContext,
) -> None:
    """Never approve on the tap alone — ask which number the screen shows.

    Approving straight away let anyone take over an account: start a login,
    send the t.me link to a seller ("your listing got a complaint, open this"),
    and the seller's single tap on Start handed the attacker a 60-day session.
    """
    await state.clear()
    user, _ = await get_or_create_user(session, message.from_user)
    lang = user.language or "uz"

    code_value = (command.args or "")[len("login_"):].strip()
    row = await session.get(AuthCode, code_value) if code_value else None
    if not _usable(row):
        await message.answer(t("web_login_expired", lang), reply_markup=main_menu(lang))
        return

    await message.answer(
        t("web_login_confirm", lang), reply_markup=match_kb(row.code, row.match_code, lang)
    )


@router.callback_query(F.data.startswith("wlogin:"))
async def web_login_choice(callback: CallbackQuery, session: AsyncSession) -> None:
    user, _ = await get_or_create_user(session, callback.from_user)
    lang = user.language or "uz"
    parts = (callback.data or "").split(":", 2)
    code_value, choice = (parts[1], parts[2]) if len(parts) == 3 else ("", "")
    row = await session.get(AuthCode, code_value) if code_value else None

    if not _usable(row) or row.approved:
        text = t("web_login_expired", lang)
    elif choice != row.match_code:
        # Wrong number or "not me": this code can never be approved again.
        row.consumed = True
        await session.commit()
        text = t("web_login_denied", lang)
    else:
        row.approved = True
        row.user_id = user.id
        await session.commit()
        text = t("web_login_ok", lang)

    try:
        await callback.message.edit_text(text)
    except Exception:
        await callback.message.answer(text, reply_markup=main_menu(lang))
    await callback.answer()


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
