"""Profile handlers: profile card, language/phone/location updates, admin /stats."""
from __future__ import annotations

import re

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog import REGIONS
from app.config import settings
from app.db.database import Favorite, Listing, User
from app.bot.keyboards import language_kb, main_menu, phone_kb, profile_kb, regions_kb, skip_cancel_kb
from app.db.queries import count_all, get_lang
from app.bot.states import ProfileEdit
from app.bot.texts import btn_texts, t

router = Router(name="profile")

_PHONE_RE = re.compile(r"^\+?\d[\d\s\-()]{6,18}$")


@router.message(F.text.in_(btn_texts("profile")))
async def show_profile(message: Message, session: AsyncSession) -> None:
    user = await session.get(User, message.from_user.id)
    lang = user.language if user else "uz"

    listings = await count_all(session, Listing, Listing.seller_id == message.from_user.id)
    favs = await count_all(session, Favorite, Favorite.user_id == message.from_user.id)

    username = f"@{user.username}" if user and user.username else t("not_set", lang)
    phone = user.phone if user and user.phone else t("not_set", lang)
    name = (user.full_name if user and user.full_name else message.from_user.first_name) or "-"

    if user and user.region and user.region in REGIONS:
        region_name = REGIONS[user.region][lang]
        location = f"{region_name}, {user.village}" if user.village else region_name
    else:
        location = t("not_set", lang)

    await message.answer(
        t(
            "profile_header",
            lang,
            name=name,
            username=username,
            phone=phone,
            location=location,
            lang_name=t("lang_name", lang),
            listings=listings,
            favs=favs,
        ),
        reply_markup=profile_kb(lang),
    )


@router.callback_query(F.data == "change_lang")
async def change_lang(callback: CallbackQuery, session: AsyncSession) -> None:
    lang = await get_lang(session, callback.from_user.id)
    await callback.message.edit_text(t("choose_language", lang), reply_markup=language_kb())
    await callback.answer()


@router.callback_query(F.data == "update_phone")
async def update_phone_start(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, callback.from_user.id)
    user = await session.get(User, callback.from_user.id)
    saved = user.phone if user else None
    await state.set_state(ProfileEdit.phone)
    await callback.message.answer(
        t("update_phone_prompt", lang), reply_markup=phone_kb(lang, saved)
    )
    await callback.answer()


@router.message(ProfileEdit.phone, F.contact)
async def update_phone_contact(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    await _save_phone(message, state, session, message.contact.phone_number)


@router.message(ProfileEdit.phone, F.text.in_(btn_texts("skip")))
async def update_phone_skip(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    await state.clear()
    await message.answer(t("main_menu_hint", lang), reply_markup=main_menu(lang))


@router.message(ProfileEdit.phone, F.text)
async def update_phone_text(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    phone = message.text.strip()
    if not _PHONE_RE.match(phone):
        await message.answer(t("err_phone", lang))
        return
    await _save_phone(message, state, session, phone)


async def _save_phone(
    message: Message, state: FSMContext, session: AsyncSession, phone: str
) -> None:
    lang = await get_lang(session, message.from_user.id)
    user = await session.get(User, message.from_user.id)
    if user:
        user.phone = phone
        await session.commit()
    await state.clear()
    await message.answer(t("phone_updated", lang), reply_markup=main_menu(lang))


# --------------------------------------------------------------------------- #
#  Location (region + village) editing
# --------------------------------------------------------------------------- #
@router.callback_query(F.data == "set_location")
async def set_location_start(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, callback.from_user.id)
    await state.set_state(ProfileEdit.region)
    await callback.message.answer(
        t("set_location_region_prompt", lang),
        reply_markup=regions_kb(lang, "preg"),
    )
    await callback.answer()


@router.callback_query(ProfileEdit.region, F.data.startswith("preg:"))
async def set_location_region(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    key = callback.data.split(":", 1)[1]
    if key not in REGIONS:
        await callback.answer()
        return
    lang = await get_lang(session, callback.from_user.id)
    await state.update_data(new_region=key)
    await state.set_state(ProfileEdit.village)
    await callback.message.edit_text(t("set_location_village_prompt", lang))
    await callback.message.answer("🏘", reply_markup=skip_cancel_kb(lang))
    await callback.answer()


@router.message(ProfileEdit.village, F.text.in_(btn_texts("skip")))
async def set_location_village_skip(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    data = await state.get_data()
    new_region = data.get("new_region", "")
    user = await session.get(User, message.from_user.id)
    if user:
        user.region = new_region
        user.village = None
        await session.commit()
    await state.clear()
    region_name = REGIONS.get(new_region, {}).get(lang, new_region)
    await message.answer(
        t("location_saved", lang, location=region_name), reply_markup=main_menu(lang)
    )


@router.message(ProfileEdit.village, F.text)
async def set_location_village(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    village = message.text.strip()[:128]
    data = await state.get_data()
    new_region = data.get("new_region", "")
    user = await session.get(User, message.from_user.id)
    if user:
        user.region = new_region
        user.village = village
        await session.commit()
    await state.clear()
    region_name = REGIONS.get(new_region, {}).get(lang, new_region)
    location_text = f"{region_name}, {village}"
    await message.answer(
        t("location_saved", lang, location=location_text), reply_markup=main_menu(lang)
    )


# --------------------------------------------------------------------------- #
#  Admin
# --------------------------------------------------------------------------- #
@router.message(Command("stats"))
async def stats(message: Message, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    if message.from_user.id not in settings.admin_id_list:
        await message.answer(t("not_admin", lang))
        return
    users = await count_all(session, User)
    total = await count_all(session, Listing)
    active = await count_all(session, Listing, Listing.status == "active")
    favs = await count_all(session, Favorite)
    await message.answer(
        t("stats_text", lang, users=users, active=active, total=total, favs=favs)
    )
