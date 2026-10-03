"""Buyer handlers: browsing, searching, viewing, contacting, favorites."""
from __future__ import annotations

import html

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog import category_label, region_label
from app.config import settings
from app.db.database import ContactEvent, Listing, User
from app.bot.keyboards import (
    categories_kb,
    contact_link_kb,
    favorites_kb,
    listing_detail_kb,
    main_menu,
    regions_kb,
    results_kb,
)
from app.db.queries import (
    add_favorite,
    get_lang,
    get_user_favorites,
    is_favorite,
    listing_card,
    query_listings,
    remove_favorite,
    send_listing,
)
from app.bot.states import Browse, Search
from app.bot.texts import btn_texts, t

router = Router(name="buyer")


# --------------------------------------------------------------------------- #
#  Browse: category -> region -> results
# --------------------------------------------------------------------------- #
@router.message(F.text.in_(btn_texts("buy")))
async def start_buy(message: Message, state: FSMContext, session: AsyncSession) -> None:
    await state.clear()
    lang = await get_lang(session, message.from_user.id)
    await state.update_data(b_category=None, b_region=None, b_search=None, b_page=0)
    await message.answer(
        t("buy_choose_category", lang),
        reply_markup=categories_kb(lang, "bcat", include_all=True),
    )


@router.callback_query(F.data.startswith("bcat:"))
async def buy_category(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, callback.from_user.id)
    key = callback.data.split(":", 1)[1]
    await state.update_data(b_category=None if key == "all" else key)
    await callback.message.edit_text(
        t("buy_choose_region", lang),
        reply_markup=regions_kb(lang, "breg", include_all=True),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("breg:"))
async def buy_region(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    key = callback.data.split(":", 1)[1]
    await state.update_data(b_region=None if key == "all" else key, b_page=0)
    await state.set_state(Browse.results)
    await _show_results(callback, state, session, edit=True)
    await callback.answer()


@router.callback_query(F.data == "buy_restart")
async def buy_restart(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    lang = await get_lang(session, callback.from_user.id)
    await state.update_data(b_category=None, b_region=None, b_search=None, b_page=0)
    await callback.message.edit_text(
        t("buy_choose_category", lang),
        reply_markup=categories_kb(lang, "bcat", include_all=True),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("bpage:"))
async def buy_page(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    page = int(callback.data.split(":", 1)[1])
    await state.update_data(b_page=page)
    await _show_results(callback, state, session, edit=True)
    await callback.answer()


@router.callback_query(F.data == "noop")
async def noop(callback: CallbackQuery) -> None:
    await callback.answer()


async def _show_results(
    event: Message | CallbackQuery,
    state: FSMContext,
    session: AsyncSession,
    *,
    edit: bool,
) -> None:
    data = await state.get_data()
    user_id = event.from_user.id
    lang = await get_lang(session, user_id)
    page = data.get("b_page", 0)
    per = settings.listings_per_page
    category = data.get("b_category")
    region = data.get("b_region")
    search = data.get("b_search")

    rows, total = await query_listings(
        session,
        category=category,
        region=region,
        search=search,
        offset=page * per,
        limit=per,
    )

    pages = max(1, (total + per - 1) // per)
    if search:
        header = t("results_search_header", lang, q=search, count=total, page=page + 1, pages=pages)
    else:
        cat_txt = category_label(category, lang) if category else t("all_categories", lang)
        reg_txt = region_label(region, lang) if region else t("all_regions", lang)
        header = t(
            "results_header", lang, category=cat_txt, region=reg_txt,
            count=total, page=page + 1, pages=pages,
        )

    if total == 0:
        text = header + "\n\n" + t("no_results", lang)
        markup = results_kb([], page, total, per, lang)
    else:
        text = header
        markup = results_kb(rows, page, total, per, lang)

    if isinstance(event, CallbackQuery):
        target = event.message
        if edit:
            await target.edit_text(text, reply_markup=markup)
        else:
            await target.answer(text, reply_markup=markup)
    else:
        await event.answer(text, reply_markup=markup)


# --------------------------------------------------------------------------- #
#  View a single listing
# --------------------------------------------------------------------------- #
@router.callback_query(F.data.startswith("view:"))
async def view_listing(callback: CallbackQuery, session: AsyncSession) -> None:
    lang = await get_lang(session, callback.from_user.id)
    listing_id = int(callback.data.split(":", 1)[1])
    listing = await session.get(Listing, listing_id)
    if not listing or listing.status != "active":
        await callback.answer(t("listing_gone", lang), show_alert=True)
        return
    # Views are counted on the website and in the app; a buyer opening the
    # listing in the bot is just as real.
    listing.views = (listing.views or 0) + 1
    await session.commit()
    seller = await session.get(User, listing.seller_id)
    caption = listing_card(listing, lang, show_contact=False, seller=seller)
    fav = await is_favorite(session, callback.from_user.id, listing_id)
    kb = listing_detail_kb(listing_id, fav, lang)
    await send_listing(callback.message, listing, caption, kb)
    await callback.answer()


# --------------------------------------------------------------------------- #
#  Contact the seller (and notify them)
# --------------------------------------------------------------------------- #
@router.callback_query(F.data.startswith("contact:"))
async def contact_seller(
    callback: CallbackQuery, session: AsyncSession, bot: Bot
) -> None:
    lang = await get_lang(session, callback.from_user.id)
    listing_id = int(callback.data.split(":", 1)[1])
    listing = await session.get(Listing, listing_id)
    if not listing:
        await callback.answer(t("listing_gone", lang), show_alert=True)
        return
    seller = await session.get(User, listing.seller_id)

    parts = [t("contact_title", lang)]
    phone = listing.phone or (seller.phone if seller else None)
    if phone:
        parts.append(t("contact_phone", lang, phone=phone))
    if seller and seller.username:
        parts.append(t("contact_tg", lang, username=seller.username))
    if not phone and not (seller and seller.username):
        parts.append(t("contact_none", lang))

    await callback.message.answer(
        "\n".join(parts), reply_markup=contact_link_kb(seller, lang)
    )

    # Count the tap like the website does, so the admin dashboard and the
    # seller's own numbers include buyers who came through the bot.
    session.add(ContactEvent(listing_id=listing_id, channel="telegram", source="bot"))
    await session.commit()

    # Best-effort notification to the seller.
    if seller:
        buyer = callback.from_user
        buyer_ref = f"@{buyer.username}" if buyer.username else (buyer.full_name or str(buyer.id))
        try:
            await bot.send_message(
                seller.id,
                t(
                    "seller_notify",
                    seller.language,
                    # parse_mode is HTML: an unescaped "<" in a title or a
                    # buyer's name makes Telegram refuse the whole message.
                    title=html.escape(listing.title),
                    buyer=html.escape(buyer_ref),
                ),
            )
        except Exception:
            pass

    await callback.answer()


# --------------------------------------------------------------------------- #
#  Favorite toggle
# --------------------------------------------------------------------------- #
@router.callback_query(F.data.startswith("fav:"))
async def fav_add(callback: CallbackQuery, session: AsyncSession) -> None:
    lang = await get_lang(session, callback.from_user.id)
    listing_id = int(callback.data.split(":", 1)[1])
    await add_favorite(session, callback.from_user.id, listing_id)
    try:
        await callback.message.edit_reply_markup(
            reply_markup=listing_detail_kb(listing_id, True, lang)
        )
    except Exception:
        pass
    await callback.answer(t("fav_added", lang))


@router.callback_query(F.data.startswith("unfav:"))
async def fav_remove(callback: CallbackQuery, session: AsyncSession) -> None:
    lang = await get_lang(session, callback.from_user.id)
    listing_id = int(callback.data.split(":", 1)[1])
    await remove_favorite(session, callback.from_user.id, listing_id)
    try:
        await callback.message.edit_reply_markup(
            reply_markup=listing_detail_kb(listing_id, False, lang)
        )
    except Exception:
        pass
    await callback.answer(t("fav_removed", lang))


@router.message(F.text.in_(btn_texts("favorites")))
async def show_favorites(message: Message, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    rows = await get_user_favorites(session, message.from_user.id)
    if not rows:
        await message.answer(t("no_favorites", lang), reply_markup=main_menu(lang))
        return
    await message.answer(
        t("favorites_header", lang, count=len(rows)),
        reply_markup=favorites_kb(rows, lang),
    )


# --------------------------------------------------------------------------- #
#  Search
# --------------------------------------------------------------------------- #
@router.message(F.text.in_(btn_texts("search")))
async def start_search(message: Message, state: FSMContext, session: AsyncSession) -> None:
    from app.bot.keyboards import cancel_kb

    await state.clear()
    lang = await get_lang(session, message.from_user.id)
    await state.set_state(Search.query)
    await message.answer(t("search_prompt", lang), reply_markup=cancel_kb(lang))


@router.message(Search.query, F.text)
async def do_search(message: Message, state: FSMContext, session: AsyncSession) -> None:
    lang = await get_lang(session, message.from_user.id)
    query = message.text.strip()
    if len(query) < 2:
        await message.answer(t("err_search", lang))
        return
    await state.clear()
    await state.update_data(b_category=None, b_region=None, b_search=query, b_page=0)
    await state.set_state(Browse.results)
    # Restore the main menu, then send the results list.
    await message.answer(
        t("search_results_for", lang, q=query), reply_markup=main_menu(lang)
    )
    await _show_results(message, state, session, edit=False)
