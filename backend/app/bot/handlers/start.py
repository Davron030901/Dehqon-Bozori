"""Common handlers: /start, language selection, /help, cancel and fallback.

Two routers are exported:
  * cancel_router  -> registered FIRST so /cancel works inside any FSM state
  * router         -> registered LAST; holds /start, /help and the catch-all
"""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import User
from app.bot.keyboards import language_kb, main_menu
from app.db.queries import get_lang, get_or_create_user
from app.bot.texts import btn_texts, t

router = Router(name="common")
cancel_router = Router(name="cancel")


# --------------------------------------------------------------------------- #
#  /start  &  language
# --------------------------------------------------------------------------- #
@router.message(CommandStart())
async def cmd_start(message: Message, session: AsyncSession, state: FSMContext) -> None:
    await state.clear()
    user, created = await get_or_create_user(session, message.from_user)
    if created:
        await message.answer(t("choose_language", "uz"), reply_markup=language_kb())
    else:
        await message.answer(
            t("welcome_back", user.language, name=message.from_user.first_name),
            reply_markup=main_menu(user.language),
        )


@router.callback_query(F.data.startswith("lang:"))
async def set_language(
    callback: CallbackQuery, session: AsyncSession
) -> None:
    lang = callback.data.split(":", 1)[1]
    if lang not in ("uz", "ru"):
        lang = "uz"
    user = await session.get(User, callback.from_user.id)
    if user:
        user.language = lang
        await session.commit()
    await callback.message.edit_text(t("language_set", lang))
    await callback.message.answer(t("main_menu_hint", lang), reply_markup=main_menu(lang))
    await callback.answer()


# --------------------------------------------------------------------------- #
#  /help
# --------------------------------------------------------------------------- #
@router.message(Command("help"))
@router.message(F.text.in_(btn_texts("help")))
async def cmd_help(message: Message, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    await message.answer(t("help_text", lang), reply_markup=main_menu(lang))


# --------------------------------------------------------------------------- #
#  Catch-all (only when no FSM state is active)
# --------------------------------------------------------------------------- #
@router.message(StateFilter(None))
async def fallback(message: Message, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    await message.answer(t("unknown", lang), reply_markup=main_menu(lang))


# --------------------------------------------------------------------------- #
#  Cancel — works in every state (registered first)
# --------------------------------------------------------------------------- #
@cancel_router.message(Command("cancel"))
@cancel_router.message(F.text.in_(btn_texts("cancel")))
async def cancel_message(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    current = await state.get_state()
    await state.clear()
    lang = await get_lang(session, message.from_user.id)
    key = "cancelled" if current is not None else "nothing_to_cancel"
    await message.answer(t(key, lang), reply_markup=main_menu(lang))


@cancel_router.callback_query(F.data == "cancel")
async def cancel_callback(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    await state.clear()
    lang = await get_lang(session, callback.from_user.id)
    try:
        await callback.message.edit_text(t("cancelled", lang))
    except Exception:
        pass
    await callback.message.answer(t("main_menu_hint", lang), reply_markup=main_menu(lang))
    await callback.answer()
