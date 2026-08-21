"""Founder's admin panel, inside the bot.

Most village growers will phone rather than type. This is the flow for that
call: you ask for their number, tap through the same questions the seller flow
asks, and the listing goes live under a seller record matched on that phone.

The same thing is possible over HTTP (`POST /listings` with `X-Admin-Token`) and
from the website's admin page, but neither is usable while you are standing in a
field holding a phone — which is exactly when these calls come in.

Every handler here is gated on ADMIN_IDS. Seller-facing handlers can only ever
touch the caller's own rows; these can touch anyone's, so the guard is repeated
on each entry point rather than assumed from the one before it.
"""
from __future__ import annotations

import re

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, ReplyKeyboardRemove
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog import CATEGORIES, REGIONS, UNITS
from app.config import settings
from app.db.database import Favorite, Listing, User
from app.bot.keyboards import (
    admin_listing_mgmt_kb,
    admin_listings_kb,
    admin_menu_kb,
    cancel_kb,
    categories_kb,
    confirm_kb,
    districts_kb,
    main_menu,
    regions_kb,
    skip_cancel_kb,
    units_kb,
)
from app.districts import district_label, is_valid_district
from app.db.queries import (
    count_all,
    get_lang,
    get_or_create_offline_seller,
    listing_card,
    normalize_phone,
    send_listing,
)
from app.bot.states import AdminListing
from app.bot.texts import btn_texts, t

router = Router(name="admin")

_PHONE_RE = re.compile(r"^\+?\d[\d\s\-()]{6,18}$")

# A listing built from a namespace rather than an ORM row, so the preview can be
# rendered before anything is written. Mirrors app/bot/handlers/add_listing.py.
from types import SimpleNamespace  # noqa: E402


def is_admin(user_id: int) -> bool:
    return user_id in settings.admin_id_list


async def _deny(target, session: AsyncSession, user_id: int) -> bool:
    """Answer with the refusal and return True when the caller is not an admin."""
    if is_admin(user_id):
        return False
    lang = await get_lang(session, user_id)
    if isinstance(target, CallbackQuery):
        await target.answer(t("not_admin", lang), show_alert=True)
    else:
        await target.answer(t("not_admin", lang))
    return True


# --------------------------------------------------------------------------- #
#  Entry point
# --------------------------------------------------------------------------- #
@router.message(Command("admin"))
async def admin_menu(message: Message, state: FSMContext, session: AsyncSession) -> None:
    if await _deny(message, session, message.from_user.id):
        return
    await state.clear()
    lang = await get_lang(session, message.from_user.id)
    await message.answer(t("admin_menu", lang), reply_markup=admin_menu_kb(lang))


@router.callback_query(F.data == "admin_stats")
async def admin_stats(callback: CallbackQuery, session: AsyncSession) -> None:
    if await _deny(callback, session, callback.from_user.id):
        return
    lang = await get_lang(session, callback.from_user.id)
    await callback.message.answer(
        t(
            "stats_text",
            lang,
            users=await count_all(session, User),
            active=await count_all(session, Listing, Listing.status == "active"),
            total=await count_all(session, Listing),
            favs=await count_all(session, Favorite),
        )
    )
    await callback.answer()


# --------------------------------------------------------------------------- #
#  Recent listings — moderation across every seller
# --------------------------------------------------------------------------- #
@router.callback_query(F.data == "admin_recent")
async def admin_recent(callback: CallbackQuery, session: AsyncSession) -> None:
    if await _deny(callback, session, callback.from_user.id):
        return
    lang = await get_lang(session, callback.from_user.id)
    rows = (
        await session.execute(
            select(Listing).order_by(Listing.created_at.desc(), Listing.id.desc()).limit(15)
        )
    ).scalars().all()
    if not rows:
        await callback.message.answer(t("admin_no_listings", lang))
        await callback.answer()
        return
    await callback.message.answer(
        t("admin_recent_header", lang, count=len(rows)),
        reply_markup=admin_listings_kb(rows, lang),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("adminview:"))
async def admin_view(callback: CallbackQuery, session: AsyncSession) -> None:
    if await _deny(callback, session, callback.from_user.id):
        return
    lang = await get_lang(session, callback.from_user.id)
    listing = await session.get(Listing, int(callback.data.split(":", 1)[1]))
    if listing is None:
        await callback.answer(t("admin_listing_gone", lang), show_alert=True)
        return
    seller = await session.get(User, listing.seller_id)
    await send_listing(
        callback.message,
        listing,
        listing_card(listing, lang, show_contact=True, seller=seller),
        admin_listing_mgmt_kb(listing, lang),
    )
    await callback.answer()


async def _admin_set_status(
    callback: CallbackQuery, session: AsyncSession, status: str
) -> None:
    lang = await get_lang(session, callback.from_user.id)
    listing = await session.get(Listing, int(callback.data.split(":", 1)[1]))
    if listing is None:
        await callback.answer(t("admin_listing_gone", lang), show_alert=True)
        return
    listing.status = status
    await session.commit()
    seller = await session.get(User, listing.seller_id)
    caption = listing_card(listing, lang, show_contact=True, seller=seller)
    try:
        if callback.message.photo:
            await callback.message.edit_caption(
                caption=caption, reply_markup=admin_listing_mgmt_kb(listing, lang)
            )
        else:
            await callback.message.edit_text(
                caption, reply_markup=admin_listing_mgmt_kb(listing, lang)
            )
    except Exception:
        pass
    await callback.answer(
        t("listing_marked_sold" if status == "sold" else "listing_marked_active", lang)
    )


@router.callback_query(F.data.startswith("adminsold:"))
async def admin_mark_sold(callback: CallbackQuery, session: AsyncSession) -> None:
    if await _deny(callback, session, callback.from_user.id):
        return
    await _admin_set_status(callback, session, "sold")


@router.callback_query(F.data.startswith("adminactive:"))
async def admin_mark_active(callback: CallbackQuery, session: AsyncSession) -> None:
    if await _deny(callback, session, callback.from_user.id):
        return
    await _admin_set_status(callback, session, "active")


@router.callback_query(F.data.startswith("admindel:"))
async def admin_delete(callback: CallbackQuery, session: AsyncSession) -> None:
    if await _deny(callback, session, callback.from_user.id):
        return
    lang = await get_lang(session, callback.from_user.id)
    listing = await session.get(Listing, int(callback.data.split(":", 1)[1]))
    if listing is not None:
        await session.delete(listing)
        await session.commit()
    await callback.answer(t("admin_deleted", lang), show_alert=True)


# --------------------------------------------------------------------------- #
#  Add a listing on behalf of a grower — phone first, because it is the identity
# --------------------------------------------------------------------------- #
@router.callback_query(F.data == "admin_add")
async def admin_add_start(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    if await _deny(callback, session, callback.from_user.id):
        return
    lang = await get_lang(session, callback.from_user.id)
    await state.clear()
    await state.set_state(AdminListing.seller_phone)
    await callback.message.answer(
        t("admin_ask_seller_phone", lang), reply_markup=cancel_kb(lang)
    )
    await callback.answer()


@router.message(AdminListing.seller_phone, F.text)
async def admin_seller_phone(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    raw = message.text.strip()
    if not _PHONE_RE.match(raw):
        await message.answer(t("err_phone", lang))
        return

    phone = normalize_phone(raw)
    await state.update_data(seller_phone=phone)

    # Tell the founder immediately whether this is a returning grower. Finding
    # out after the fact that you created a duplicate is the expensive version.
    existing = (
        await session.execute(select(User).where(User.phone == phone).limit(1))
    ).scalar_one_or_none()
    if existing is not None:
        count = await count_all(session, Listing, Listing.seller_id == existing.id)
        await state.update_data(seller_name=existing.full_name)
        await message.answer(
            t(
                "admin_seller_found",
                lang,
                name=existing.full_name or "Dehqon",
                count=count,
            )
        )
        await state.set_state(AdminListing.category)
        await message.answer(
            t("sell_choose_category", lang), reply_markup=categories_kb(lang, "acat")
        )
        return

    await message.answer(t("admin_seller_new", lang))
    await state.set_state(AdminListing.seller_name)
    await message.answer(
        t("admin_ask_seller_name", lang), reply_markup=skip_cancel_kb(lang)
    )


@router.message(AdminListing.seller_name, F.text.in_(btn_texts("skip")))
async def admin_seller_name_skip(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    await state.update_data(seller_name=None)
    await state.set_state(AdminListing.category)
    await message.answer(
        t("sell_choose_category", lang), reply_markup=categories_kb(lang, "acat")
    )


@router.message(AdminListing.seller_name, F.text)
async def admin_seller_name(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    await state.update_data(seller_name=message.text.strip()[:255])
    await state.set_state(AdminListing.category)
    await message.answer(
        t("sell_choose_category", lang), reply_markup=categories_kb(lang, "acat")
    )


# --- category -> title -> price -> unit ------------------------------------ #
@router.callback_query(AdminListing.category, F.data.startswith("acat:"))
async def admin_category(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    key = callback.data.split(":", 1)[1]
    if key not in CATEGORIES:
        await callback.answer()
        return
    lang = await get_lang(session, callback.from_user.id)
    await state.update_data(category=key)
    await state.set_state(AdminListing.title)
    await callback.message.edit_text(t("sell_enter_title", lang))
    await callback.message.answer("✏️", reply_markup=cancel_kb(lang))
    await callback.answer()


@router.message(AdminListing.title, F.text)
async def admin_title(message: Message, state: FSMContext, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    title = message.text.strip()
    if not (2 <= len(title) <= 100):
        await message.answer(t("err_title", lang))
        return
    await state.update_data(title=title)
    await state.set_state(AdminListing.price)
    await message.answer(t("sell_enter_price", lang), reply_markup=cancel_kb(lang))


@router.message(AdminListing.price, F.text)
async def admin_price(message: Message, state: FSMContext, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    raw = message.text.replace(" ", "").replace(",", "").replace("'", "").replace(".", "")
    if not raw.isdigit() or int(raw) <= 0:
        await message.answer(t("err_price", lang))
        return
    await state.update_data(price=int(raw))
    await state.set_state(AdminListing.unit)
    await message.answer(t("sell_choose_unit", lang), reply_markup=units_kb(lang, "aunit"))


@router.callback_query(AdminListing.unit, F.data.startswith("aunit:"))
async def admin_unit(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    key = callback.data.split(":", 1)[1]
    if key not in UNITS:
        await callback.answer()
        return
    lang = await get_lang(session, callback.from_user.id)
    await state.update_data(unit=key)
    await state.set_state(AdminListing.quantity)
    await callback.message.edit_text(t("sell_enter_quantity", lang))
    await callback.message.answer("📦", reply_markup=skip_cancel_kb(lang))
    await callback.answer()


# --- quantity -> region -> district ---------------------------------------- #
async def _admin_ask_region(message: Message, state: FSMContext, lang: str) -> None:
    await state.set_state(AdminListing.region)
    await message.answer(t("sell_choose_region", lang), reply_markup=regions_kb(lang, "areg"))


@router.message(AdminListing.quantity, F.text.in_(btn_texts("skip")))
async def admin_quantity_skip(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    await state.update_data(quantity=None)
    await _admin_ask_region(message, state, lang)


@router.message(AdminListing.quantity, F.text)
async def admin_quantity(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    await state.update_data(quantity=message.text.strip()[:64])
    await _admin_ask_region(message, state, lang)


async def _admin_ask_district(
    callback: CallbackQuery, state: FSMContext, region: str, lang: str
) -> None:
    await state.set_state(AdminListing.district)
    await callback.message.edit_text(
        t("sell_choose_district", lang, region=REGIONS[region][lang]),
        reply_markup=districts_kb(region, lang, "adist"),
    )


@router.callback_query(AdminListing.region, F.data.startswith("areg:"))
async def admin_region(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    key = callback.data.split(":", 1)[1]
    if key not in REGIONS:
        await callback.answer()
        return
    lang = await get_lang(session, callback.from_user.id)
    await state.update_data(region=key)
    await _admin_ask_district(callback, state, key, lang)
    await callback.answer()


@router.callback_query(AdminListing.district, F.data.startswith("adist:"))
async def admin_district(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, callback.from_user.id)
    key = callback.data.split(":", 1)[1]
    data = await state.get_data()
    region = data.get("region")

    if key == "skip":
        await state.update_data(district=None)
    elif not is_valid_district(key, region):
        # Stale keyboard from an earlier attempt — re-ask instead of filing the
        # grower's produce under the wrong region.
        await _admin_ask_district(callback, state, region, lang)
        await callback.answer()
        return
    else:
        await state.update_data(district=key)

    await state.set_state(AdminListing.photo)
    await callback.message.edit_text(t("sell_send_photo", lang))
    await callback.message.answer("📷", reply_markup=skip_cancel_kb(lang))
    await callback.answer()


@router.message(AdminListing.district)
async def admin_district_typed(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    """Re-show the keyboard instead of letting a typed answer fall through."""
    lang = await get_lang(session, message.from_user.id)
    data = await state.get_data()
    region = data.get("region")
    if region not in REGIONS:
        await state.set_state(AdminListing.region)
        await message.answer(
            t("sell_choose_region", lang), reply_markup=regions_kb(lang, "areg")
        )
        return
    await message.answer(
        t("sell_choose_district", lang, region=REGIONS[region][lang]),
        reply_markup=districts_kb(region, lang, "adist"),
    )


# --- photo -> preview ------------------------------------------------------ #
@router.message(AdminListing.photo, F.photo)
async def admin_photo(message: Message, state: FSMContext, session: AsyncSession) -> None:
    await state.update_data(photo_file_id=message.photo[-1].file_id)
    await _admin_preview(message, state, session)


@router.message(AdminListing.photo, F.text.in_(btn_texts("skip")))
async def admin_photo_skip(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    await state.update_data(photo_file_id=None)
    await _admin_preview(message, state, session)


@router.message(AdminListing.photo)
async def admin_photo_invalid(message: Message, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    await message.answer(t("err_need_photo", lang))


async def _admin_preview(
    message: Message, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, message.from_user.id)
    data = await state.get_data()
    preview = SimpleNamespace(
        title=data["title"],
        category=data["category"],
        price=data["price"],
        currency=settings.default_currency,
        unit=data["unit"],
        quantity=data.get("quantity"),
        region=data["region"],
        district=data.get("district"),
        description=None,
        photo_file_id=data.get("photo_file_id"),
        phone=data.get("seller_phone"),
        status="active",
    )
    seller_label = data.get("seller_name") or data.get("seller_phone") or "Dehqon"
    caption = t("admin_preview_title", lang, seller=seller_label) + "\n\n" + listing_card(
        preview, lang, show_contact=True
    )
    await state.set_state(AdminListing.confirm)
    await send_listing(message, preview, caption, confirm_kb(lang))
    await message.answer(t("sell_confirm_q", lang), reply_markup=ReplyKeyboardRemove())


@router.callback_query(AdminListing.confirm, F.data == "confirm_yes")
async def admin_confirm(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    if await _deny(callback, session, callback.from_user.id):
        return
    lang = await get_lang(session, callback.from_user.id)
    data = await state.get_data()

    try:
        seller = await get_or_create_offline_seller(
            session,
            name=data.get("seller_name"),
            phone=data.get("seller_phone"),
            region=data.get("region"),
            # The listing stores the slug; the seller's profile stores the name,
            # because `village` is shown directly on their card.
            village=district_label(data.get("district")) or None,
        )
        listing = Listing(
            seller_id=seller.id,
            title=data["title"],
            category=data["category"],
            price=data["price"],
            currency=settings.default_currency,
            unit=data["unit"],
            quantity=data.get("quantity"),
            region=data["region"],
            district=data.get("district"),
            photo_file_id=data.get("photo_file_id"),
            phone=data.get("seller_phone") or seller.phone,
            status="active",
            source="admin",
        )
        session.add(listing)
        await session.commit()
        await session.refresh(listing)
    except Exception:
        await session.rollback()
        await state.clear()
        await callback.message.answer(
            t("err_listing_save", lang), reply_markup=main_menu(lang)
        )
        await callback.answer()
        return

    await state.clear()
    try:
        await callback.message.edit_reply_markup(reply_markup=None)
    except Exception:
        pass
    await callback.message.answer(
        t(
            "admin_created",
            lang,
            id=listing.id,
            seller=seller.full_name or "Dehqon",
            phone=seller.phone or "—",
        ),
        reply_markup=main_menu(lang),
    )
    await callback.answer()
