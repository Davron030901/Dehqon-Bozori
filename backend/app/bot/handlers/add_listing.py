"""Seller handlers: listing creation flow and listing management."""
from __future__ import annotations

import re
from types import SimpleNamespace

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, ReplyKeyboardRemove
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog import CATEGORIES, REGIONS, UNITS
from app.config import settings
from app.db.database import Listing, User
from app.bot.keyboards import (
    cancel_kb,
    categories_kb,
    confirm_kb,
    del_confirm_kb,
    districts_kb,
    main_menu,
    my_listing_mgmt_kb,
    my_listings_kb,
    phone_kb,
    regions_kb,
    skip_cancel_kb,
    units_kb,
    use_saved_region_kb,
)
from app.districts import district_label, is_valid_district
from app.db.queries import (
    format_price,
    normalize_phone,
    get_lang,
    get_or_create_user,
    get_user_listings,
    listing_card,
    send_listing,
)
from app.bot.states import CreateListing, EditListing
from app.bot.texts import btn_texts, t

router = Router(name="seller")

_PHONE_RE = re.compile(r"^\+?\d[\d\s\-()]{6,18}$")


# --------------------------------------------------------------------------- #
#  Start: choose category
# --------------------------------------------------------------------------- #
@router.message(F.text.in_(btn_texts("sell")))
async def start_sell(message: Message, state: FSMContext, session: AsyncSession) -> None:
    await state.clear()
    user, _ = await get_or_create_user(session, message.from_user)
    lang = user.language
    await state.set_state(CreateListing.category)
    await message.answer(
        t("sell_choose_category", lang), reply_markup=categories_kb(lang, "cat")
    )


@router.callback_query(CreateListing.category, F.data.startswith("cat:"))
async def sell_category(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    key = callback.data.split(":", 1)[1]
    if key not in CATEGORIES:
        await callback.answer()
        return
    lang = await get_lang(session, callback.from_user.id)
    await state.update_data(category=key)
    await state.set_state(CreateListing.title)
    await callback.message.edit_text(t("sell_enter_title", lang))
    await callback.message.answer("✏️", reply_markup=cancel_kb(lang))
    await callback.answer()


# --------------------------------------------------------------------------- #
#  Title -> price -> unit
# --------------------------------------------------------------------------- #
@router.message(CreateListing.title, F.text)
async def sell_title(message: Message, state: FSMContext, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    title = message.text.strip()
    if not (2 <= len(title) <= 100):
        await message.answer(t("err_title", lang))
        return
    await state.update_data(title=title)
    await state.set_state(CreateListing.price)
    await message.answer(t("sell_enter_price", lang), reply_markup=cancel_kb(lang))


@router.message(CreateListing.price, F.text)
async def sell_price(message: Message, state: FSMContext, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    raw = message.text.replace(" ", "").replace(",", "").replace("'", "").replace(".", "")
    if not raw.isdigit() or int(raw) <= 0:
        await message.answer(t("err_price", lang))
        return
    await state.update_data(price=int(raw))
    await state.set_state(CreateListing.unit)
    await message.answer(t("sell_choose_unit", lang), reply_markup=units_kb(lang))


@router.callback_query(CreateListing.unit, F.data.startswith("unit:"))
async def sell_unit(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    key = callback.data.split(":", 1)[1]
    if key not in UNITS:
        await callback.answer()
        return
    lang = await get_lang(session, callback.from_user.id)
    await state.update_data(unit=key)
    await state.set_state(CreateListing.quantity)
    await callback.message.edit_text(t("sell_enter_quantity", lang))
    await callback.message.answer("📦", reply_markup=skip_cancel_kb(lang))
    await callback.answer()


# --------------------------------------------------------------------------- #
#  Quantity (optional) -> region
# --------------------------------------------------------------------------- #
async def _ask_region(
    message: Message, state: FSMContext, session: AsyncSession, lang: str
) -> None:
    """Show region selection. If user has a saved region, offer to reuse it."""
    await state.set_state(CreateListing.region)
    user = await session.get(User, message.from_user.id)
    if user and user.region and user.region in REGIONS:
        saved_label = REGIONS[user.region][lang]
        await message.answer(
            t("sell_use_saved_region", lang, region=saved_label),
            reply_markup=use_saved_region_kb(saved_label, lang),
        )
    else:
        await message.answer(t("sell_choose_region", lang), reply_markup=regions_kb(lang, "reg"))


@router.message(CreateListing.quantity, F.text.in_(btn_texts("skip")))
async def sell_quantity_skip(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    await state.update_data(quantity=None)
    await _ask_region(message, state, session, lang)


@router.message(CreateListing.quantity, F.text)
async def sell_quantity(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    await state.update_data(quantity=message.text.strip()[:64])
    await _ask_region(message, state, session, lang)


async def _ask_district(callback: CallbackQuery, state: FSMContext, region: str, lang: str) -> None:
    """Offer the districts of the chosen region.

    This used to be a free-text question, and the answers showed it: "Urgut",
    "urgut tumani", "Urgut t.", "Chorbog' qishlogi". None of those match each
    other, so a buyer filtering by district saw a fraction of what was there.
    """
    await state.set_state(CreateListing.district)
    await callback.message.edit_text(
        t("sell_choose_district", lang, region=REGIONS[region][lang]),
        reply_markup=districts_kb(region, lang, "dist"),
    )


@router.callback_query(CreateListing.region, F.data == "region_use_saved")
async def sell_use_saved_region(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, callback.from_user.id)
    user = await session.get(User, callback.from_user.id)
    if not user or not user.region or user.region not in REGIONS:
        await callback.message.edit_text(
            t("sell_choose_region", lang), reply_markup=regions_kb(lang, "reg")
        )
        await callback.answer()
        return
    await state.update_data(region=user.region)
    await _ask_district(callback, state, user.region, lang)
    await callback.answer()


@router.callback_query(CreateListing.region, F.data == "region_change")
async def sell_change_region(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, callback.from_user.id)
    await callback.message.edit_text(
        t("sell_choose_region", lang), reply_markup=regions_kb(lang, "reg")
    )
    await callback.answer()


@router.callback_query(CreateListing.region, F.data.startswith("reg:"))
async def sell_region(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    key = callback.data.split(":", 1)[1]
    if key not in REGIONS:
        await callback.answer()
        return
    lang = await get_lang(session, callback.from_user.id)
    await state.update_data(region=key)
    # Save region to user profile for future auto-fill
    user = await session.get(User, callback.from_user.id)
    if user and user.region != key:
        user.region = key
        await session.commit()
    await _ask_district(callback, state, key, lang)
    await callback.answer()


# --------------------------------------------------------------------------- #
#  District (a button now, not free text) -> description -> photo
# --------------------------------------------------------------------------- #
@router.callback_query(CreateListing.district, F.data.startswith("dist:"))
async def sell_district(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, callback.from_user.id)
    key = callback.data.split(":", 1)[1]
    data = await state.get_data()
    region = data.get("region")

    if key == "skip":
        await state.update_data(district=None)
    else:
        # A district from another region means a stale keyboard — someone tapped
        # a message from an earlier attempt. Re-ask rather than file it wrong.
        if not is_valid_district(key, region):
            await _ask_district(callback, state, region, lang)
            await callback.answer()
            return
        await state.update_data(district=key)
        # Remember it, so the seller's next listing can offer it as the default.
        user = await session.get(User, callback.from_user.id)
        if user and user.village != district_label(key):
            user.village = district_label(key)
            await session.commit()

    await state.set_state(CreateListing.description)
    await callback.message.edit_text(t("sell_enter_description", lang))
    await callback.message.answer("📝", reply_markup=skip_cancel_kb(lang))
    await callback.answer()


@router.message(CreateListing.district)
async def sell_district_typed(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    """The district is a button, but people type anyway.

    Without this the message falls through to the catch-all handler, which
    answers "Tushunmadim" and leaves the seller staring at a keyboard they just
    tried to use. Re-showing it is a better answer than a shrug.
    """
    lang = await get_lang(session, message.from_user.id)
    data = await state.get_data()
    region = data.get("region")
    if region not in REGIONS:
        # No region in state — the flow is broken; send them back to pick one.
        await state.set_state(CreateListing.region)
        await message.answer(
            t("sell_choose_region", lang), reply_markup=regions_kb(lang, "reg")
        )
        return
    await message.answer(
        t("sell_choose_district", lang, region=REGIONS[region][lang]),
        reply_markup=districts_kb(region, lang, "dist"),
    )


@router.message(CreateListing.description, F.text.in_(btn_texts("skip")))
async def sell_description_skip(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    await state.update_data(description=None)
    await state.set_state(CreateListing.photo)
    await message.answer(t("sell_send_photo", lang), reply_markup=skip_cancel_kb(lang))


@router.message(CreateListing.description, F.text)
async def sell_description(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    await state.update_data(description=message.text.strip()[:1000])
    await state.set_state(CreateListing.photo)
    await message.answer(t("sell_send_photo", lang), reply_markup=skip_cancel_kb(lang))


@router.message(CreateListing.photo, F.photo)
async def sell_photo(message: Message, state: FSMContext, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    await state.update_data(photo_file_id=message.photo[-1].file_id)
    await _ask_phone(message, state, session, lang)


@router.message(CreateListing.photo, F.text.in_(btn_texts("skip")))
async def sell_photo_skip(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    await state.update_data(photo_file_id=None)
    await _ask_phone(message, state, session, lang)


@router.message(CreateListing.photo)
async def sell_photo_invalid(message: Message, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    await message.answer(t("err_need_photo", lang))


# --------------------------------------------------------------------------- #
#  Phone -> confirm
# --------------------------------------------------------------------------- #
async def _ask_phone(
    message: Message, state: FSMContext, session: AsyncSession, lang: str
) -> None:
    user = await session.get(User, message.from_user.id)
    saved = user.phone if user else None
    await state.set_state(CreateListing.phone)
    await message.answer(t("sell_enter_phone", lang), reply_markup=phone_kb(lang, saved))


@router.message(CreateListing.phone, F.contact)
async def sell_phone_contact(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    await _save_phone_and_preview(message, state, session, lang, message.contact.phone_number)


@router.message(CreateListing.phone, F.text.in_(btn_texts("skip")))
async def sell_phone_skip(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    await _save_phone_and_preview(message, state, session, lang, None)


@router.message(CreateListing.phone, F.text)
async def sell_phone_text(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    phone = message.text.strip()
    if not _PHONE_RE.match(phone):
        await message.answer(t("err_phone", lang))
        return
    await _save_phone_and_preview(message, state, session, lang, phone)


async def _save_phone_and_preview(
    message: Message,
    state: FSMContext,
    session: AsyncSession,
    lang: str,
    phone: str | None,
) -> None:
    # One canonical form ('+998901234567') for every phone the bot stores:
    # Telegram's contact button sends '998901234567', people type
    # '90 123 45 67' — and the founder's /admin finds growers by exact match.
    phone = normalize_phone(phone)
    await state.update_data(phone=phone)
    # Remember the phone on the user profile for next time.
    if phone:
        user = await session.get(User, message.from_user.id)
        if user and user.phone != phone:
            user.phone = phone
            await session.commit()

    data = await state.get_data()
    user = await session.get(User, message.from_user.id)
    preview = SimpleNamespace(
        title=data["title"],
        category=data["category"],
        price=data["price"],
        currency=settings.default_currency,
        unit=data["unit"],
        quantity=data.get("quantity"),
        region=data["region"],
        district=data.get("district"),
        description=data.get("description"),
        photo_file_id=data.get("photo_file_id"),
        phone=data.get("phone"),
        status="active",
    )
    caption = t("sell_preview_title", lang) + "\n\n" + listing_card(
        preview, lang, show_contact=True, seller=user
    )
    await state.set_state(CreateListing.confirm)

    await send_listing(message, preview, caption, confirm_kb(lang))
    # ReplyKeyboardRemove prevents main menu buttons from accidentally clearing FSM state
    await message.answer(t("sell_confirm_q", lang), reply_markup=ReplyKeyboardRemove())


@router.callback_query(CreateListing.confirm, F.data == "confirm_yes")
async def sell_confirm(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, callback.from_user.id)
    data = await state.get_data()
    try:
        listing = Listing(
            seller_id=callback.from_user.id,
            title=data["title"],
            category=data["category"],
            description=data.get("description"),
            price=data["price"],
            currency=settings.default_currency,
            unit=data["unit"],
            quantity=data.get("quantity"),
            region=data["region"],
            district=data.get("district"),
            photo_file_id=data.get("photo_file_id"),
            phone=data.get("phone"),
            status="active",
        )
        session.add(listing)
        await session.commit()
    except Exception:
        await state.clear()
        await callback.message.answer(t("err_listing_save", lang), reply_markup=main_menu(lang))
        await callback.answer()
        return
    await state.clear()
    try:
        await callback.message.edit_reply_markup(reply_markup=None)
    except Exception:
        pass
    await callback.message.answer(
        t("sell_created", lang, id=listing.id), reply_markup=main_menu(lang)
    )
    await callback.answer()


# --------------------------------------------------------------------------- #
#  My listings
# --------------------------------------------------------------------------- #
@router.message(F.text.in_(btn_texts("my_listings")))
async def my_listings(message: Message, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    rows = await get_user_listings(session, message.from_user.id)
    if not rows:
        await message.answer(t("no_my_listings", lang), reply_markup=main_menu(lang))
        return
    await message.answer(
        t("my_listings_header", lang, count=len(rows)),
        reply_markup=my_listings_kb(rows, lang),
    )


@router.callback_query(F.data.startswith("myview:"))
async def my_view(callback: CallbackQuery, session: AsyncSession) -> None:
    lang = await get_lang(session, callback.from_user.id)
    listing_id = int(callback.data.split(":", 1)[1])
    listing = await session.get(Listing, listing_id)
    if not listing or listing.seller_id != callback.from_user.id:
        await callback.answer(t("not_your_listing", lang), show_alert=True)
        return
    seller = await session.get(User, listing.seller_id)
    caption = listing_card(listing, lang, show_contact=True, seller=seller)
    kb = my_listing_mgmt_kb(listing, lang)
    await send_listing(callback.message, listing, caption, kb)
    await callback.answer()


async def _set_status(callback: CallbackQuery, session: AsyncSession, status: str) -> None:
    lang = await get_lang(session, callback.from_user.id)
    listing_id = int(callback.data.split(":", 1)[1])
    listing = await session.get(Listing, listing_id)
    if not listing or listing.seller_id != callback.from_user.id:
        await callback.answer(t("not_your_listing", lang), show_alert=True)
        return
    listing.status = status
    await session.commit()
    seller = await session.get(User, listing.seller_id)
    caption = listing_card(listing, lang, show_contact=True, seller=seller)
    try:
        if callback.message.photo:
            await callback.message.edit_caption(
                caption=caption, reply_markup=my_listing_mgmt_kb(listing, lang)
            )
        else:
            await callback.message.edit_text(
                caption, reply_markup=my_listing_mgmt_kb(listing, lang)
            )
    except Exception:
        pass
    note = "listing_marked_sold" if status == "sold" else "listing_marked_active"
    await callback.answer(t(note, lang))


@router.callback_query(F.data.startswith("sold:"))
async def mark_sold(callback: CallbackQuery, session: AsyncSession) -> None:
    await _set_status(callback, session, "sold")


@router.callback_query(F.data.startswith("activate:"))
async def mark_active(callback: CallbackQuery, session: AsyncSession) -> None:
    await _set_status(callback, session, "active")


@router.callback_query(F.data.startswith("del:"))
async def delete_prompt(callback: CallbackQuery, session: AsyncSession) -> None:
    lang = await get_lang(session, callback.from_user.id)
    listing_id = int(callback.data.split(":", 1)[1])
    listing = await session.get(Listing, listing_id)
    if not listing or listing.seller_id != callback.from_user.id:
        await callback.answer(t("not_your_listing", lang), show_alert=True)
        return
    await callback.message.answer(
        t("del_confirm_q", lang), reply_markup=del_confirm_kb(listing_id, lang)
    )
    await callback.answer()


@router.callback_query(F.data.startswith("delok:"))
async def delete_confirm(callback: CallbackQuery, session: AsyncSession) -> None:
    lang = await get_lang(session, callback.from_user.id)
    listing_id = int(callback.data.split(":", 1)[1])
    listing = await session.get(Listing, listing_id)
    if listing and listing.seller_id == callback.from_user.id:
        await session.delete(listing)
        await session.commit()
    try:
        await callback.message.edit_text(t("del_done", lang))
    except Exception:
        pass
    await callback.answer()


@router.callback_query(F.data.startswith("delno:"))
async def delete_cancel(callback: CallbackQuery, session: AsyncSession) -> None:
    lang = await get_lang(session, callback.from_user.id)
    try:
        await callback.message.delete()
    except Exception:
        pass
    await callback.answer(t("cancelled", lang))


# --------------------------------------------------------------------------- #
#  Edit price
# --------------------------------------------------------------------------- #
@router.callback_query(F.data.startswith("editprice:"))
async def edit_price_start(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, callback.from_user.id)
    listing_id = int(callback.data.split(":", 1)[1])
    listing = await session.get(Listing, listing_id)
    if not listing or listing.seller_id != callback.from_user.id:
        await callback.answer(t("not_your_listing", lang), show_alert=True)
        return
    await state.set_state(EditListing.price)
    await state.update_data(edit_id=listing_id)
    await callback.message.answer(t("editprice_prompt", lang), reply_markup=cancel_kb(lang))
    await callback.answer()


@router.message(EditListing.price, F.text)
async def edit_price_save(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    raw = message.text.replace(" ", "").replace(",", "").replace("'", "").replace(".", "")
    if not raw.isdigit() or int(raw) <= 0:
        await message.answer(t("err_price", lang))
        return
    data = await state.get_data()
    listing = await session.get(Listing, data.get("edit_id"))
    if listing and listing.seller_id == message.from_user.id:
        listing.price = int(raw)
        await session.commit()
        price = format_price(listing.price, listing.currency, lang)
    else:
        price = format_price(int(raw), settings.default_currency, lang)
    await state.clear()
    await message.answer(
        t("editprice_done", lang, price=price), reply_markup=main_menu(lang)
    )
