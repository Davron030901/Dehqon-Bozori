"""Reply and inline keyboard builders."""
from __future__ import annotations

from aiogram.types import InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder

from app.catalog import CATEGORIES, REGIONS, UNITS
from app.db.queries import format_price
from app.districts import districts_of
from app.bot.texts import BTN, t


def _short(text: str, limit: int = 28) -> str:
    return text if len(text) <= limit else text[: limit - 1] + "…"


# --------------------------------------------------------------------------- #
#  Reply keyboards
# --------------------------------------------------------------------------- #
def main_menu(lang: str):
    b = ReplyKeyboardBuilder()
    b.button(text=BTN["sell"][lang])
    b.button(text=BTN["buy"][lang])
    b.button(text=BTN["search"][lang])
    b.button(text=BTN["favorites"][lang])
    b.button(text=BTN["my_listings"][lang])
    b.button(text=BTN["profile"][lang])
    b.button(text=BTN["website"][lang])
    b.button(text=BTN["help"][lang])
    b.adjust(2, 2, 2, 2)
    return b.as_markup(resize_keyboard=True)


def cancel_kb(lang: str):
    b = ReplyKeyboardBuilder()
    b.button(text=BTN["cancel"][lang])
    b.adjust(1)
    return b.as_markup(resize_keyboard=True)


def skip_cancel_kb(lang: str):
    b = ReplyKeyboardBuilder()
    b.button(text=BTN["skip"][lang])
    b.button(text=BTN["cancel"][lang])
    b.adjust(2)
    return b.as_markup(resize_keyboard=True)


def phone_kb(lang: str, saved: str | None = None):
    b = ReplyKeyboardBuilder()
    if saved:
        b.button(text=saved)
    b.button(text=BTN["share_phone"][lang], request_contact=True)
    b.button(text=BTN["skip"][lang])
    b.button(text=BTN["cancel"][lang])
    if saved:
        b.adjust(1, 1, 2)
    else:
        b.adjust(1, 2)
    return b.as_markup(resize_keyboard=True)


# --------------------------------------------------------------------------- #
#  Inline keyboards
# --------------------------------------------------------------------------- #
def language_kb():
    b = InlineKeyboardBuilder()
    b.button(text="🇺🇿 O'zbekcha", callback_data="lang:uz")
    b.button(text="🇷🇺 Русский", callback_data="lang:ru")
    b.adjust(2)
    return b.as_markup()


def categories_kb(lang: str, prefix: str, include_all: bool = False):
    b = InlineKeyboardBuilder()
    if include_all:
        b.button(text=t("all_categories", lang), callback_data=f"{prefix}:all")
    for key, item in CATEGORIES.items():
        b.button(text=f'{item["emoji"]} {item[lang]}', callback_data=f"{prefix}:{key}")
    b.adjust(2)
    b.row(InlineKeyboardButton(text=t("ik_cancel", lang), callback_data="cancel"))
    return b.as_markup()


def use_saved_region_kb(saved_label: str, lang: str):
    b = InlineKeyboardBuilder()
    b.button(text=t("ik_use_saved_region", lang, region=saved_label), callback_data="region_use_saved")
    b.button(text=t("ik_change_region", lang), callback_data="region_change")
    b.adjust(1)
    b.row(InlineKeyboardButton(text=t("ik_cancel", lang), callback_data="cancel"))
    return b.as_markup()


def regions_kb(lang: str, prefix: str, include_all: bool = False):
    b = InlineKeyboardBuilder()
    if include_all:
        b.button(text=t("all_regions", lang), callback_data=f"{prefix}:all")
    for key, item in REGIONS.items():
        b.button(text=item[lang], callback_data=f"{prefix}:{key}")
    b.adjust(2)
    b.row(InlineKeyboardButton(text=t("ik_cancel", lang), callback_data="cancel"))
    return b.as_markup()


def districts_kb(region: str, lang: str, prefix: str):
    """Districts and cities of one region, as inline buttons.

    Cities come first (districts.py already orders them that way) because a
    grower's nearest bazaar is usually the one they name. Two columns keeps the
    longest list — Tashkent region's 22 entries — inside a couple of thumb
    scrolls on a phone.

    A "skip" button stays, because some sellers genuinely do not want to say
    more than the region, and forcing a choice would lose the listing.
    """
    b = InlineKeyboardBuilder()
    for item in districts_of(region):
        marker = "🏙" if item["type"] == "city" else "•"
        b.button(text=f'{marker} {_short(item["uz"], 20)}', callback_data=f'{prefix}:{item["key"]}')
    b.adjust(2)
    b.row(
        InlineKeyboardButton(text=t("ik_skip_district", lang), callback_data=f"{prefix}:skip"),
        InlineKeyboardButton(text=t("ik_cancel", lang), callback_data="cancel"),
    )
    return b.as_markup()


def units_kb(lang: str, prefix: str = "unit"):
    b = InlineKeyboardBuilder()
    for key, item in UNITS.items():
        b.button(text=item[lang], callback_data=f"{prefix}:{key}")
    b.adjust(3)
    b.row(InlineKeyboardButton(text=t("ik_cancel", lang), callback_data="cancel"))
    return b.as_markup()


def confirm_kb(lang: str):
    b = InlineKeyboardBuilder()
    b.button(text=t("ik_post", lang), callback_data="confirm_yes")
    b.button(text=t("ik_cancel", lang), callback_data="cancel")
    b.adjust(2)
    return b.as_markup()


def listing_detail_kb(listing_id: int, is_fav: bool, lang: str):
    b = InlineKeyboardBuilder()
    b.button(text=t("ik_contact", lang), callback_data=f"contact:{listing_id}")
    if is_fav:
        b.button(text=t("ik_unfav", lang), callback_data=f"unfav:{listing_id}")
    else:
        b.button(text=t("ik_fav", lang), callback_data=f"fav:{listing_id}")
    b.adjust(1)
    return b.as_markup()


def results_kb(rows, page: int, total: int, per: int, lang: str):
    b = InlineKeyboardBuilder()
    for listing in rows:
        emoji = CATEGORIES.get(listing.category, {}).get("emoji", "•")
        label = f"{emoji} {_short(listing.title)} · {format_price(listing.price, listing.currency, lang)}"
        b.button(text=label, callback_data=f"view:{listing.id}")
    b.adjust(1)

    pages = max(1, (total + per - 1) // per)
    nav: list[InlineKeyboardButton] = []
    if page > 0:
        nav.append(InlineKeyboardButton(text="⬅️", callback_data=f"bpage:{page - 1}"))
    nav.append(InlineKeyboardButton(text=f"{page + 1}/{pages}", callback_data="noop"))
    if (page + 1) * per < total:
        nav.append(InlineKeyboardButton(text="➡️", callback_data=f"bpage:{page + 1}"))
    if nav:
        b.row(*nav)

    b.row(
        InlineKeyboardButton(
            text=t("ik_change_filter", lang), callback_data="buy_restart"
        )
    )
    return b.as_markup()


def favorites_kb(rows, lang: str):
    b = InlineKeyboardBuilder()
    for listing in rows:
        emoji = CATEGORIES.get(listing.category, {}).get("emoji", "•")
        dot = "" if listing.status == "active" else "🔴 "
        label = f"{dot}{emoji} {_short(listing.title)} · {format_price(listing.price, listing.currency, lang)}"
        b.button(text=label, callback_data=f"view:{listing.id}")
    b.adjust(1)
    return b.as_markup()


def my_listings_kb(rows, lang: str):
    b = InlineKeyboardBuilder()
    for listing in rows:
        dot = "🟢" if listing.status == "active" else "🔴"
        label = f"{dot} {_short(listing.title)} · {format_price(listing.price, listing.currency, lang)}"
        b.button(text=label, callback_data=f"myview:{listing.id}")
    b.adjust(1)
    return b.as_markup()


def my_listing_mgmt_kb(listing, lang: str):
    b = InlineKeyboardBuilder()
    if listing.status == "active":
        b.button(text=t("ik_sold", lang), callback_data=f"sold:{listing.id}")
    else:
        b.button(text=t("ik_activate", lang), callback_data=f"activate:{listing.id}")
    b.button(text=t("ik_editprice", lang), callback_data=f"editprice:{listing.id}")
    b.button(text=t("ik_delete", lang), callback_data=f"del:{listing.id}")
    b.adjust(1)
    return b.as_markup()


def del_confirm_kb(listing_id: int, lang: str):
    b = InlineKeyboardBuilder()
    b.button(text=t("ik_yes", lang), callback_data=f"delok:{listing_id}")
    b.button(text=t("ik_no", lang), callback_data=f"delno:{listing_id}")
    b.adjust(2)
    return b.as_markup()


def contact_link_kb(seller, lang: str):
    if seller and seller.username:
        b = InlineKeyboardBuilder()
        b.button(text=t("ik_write", lang), url=f"https://t.me/{seller.username}")
        return b.as_markup()
    return None


def profile_kb(lang: str):
    b = InlineKeyboardBuilder()
    b.button(text=t("ik_change_lang", lang), callback_data="change_lang")
    b.button(text=t("ik_update_phone", lang), callback_data="update_phone")
    b.button(text=t("ik_set_location", lang), callback_data="set_location")
    b.adjust(1)
    return b.as_markup()


# --------------------------------------------------------------------------- #
#  Admin
# --------------------------------------------------------------------------- #
def admin_menu_kb(lang: str):
    b = InlineKeyboardBuilder()
    b.button(text=t("ik_admin_add", lang), callback_data="admin_add")
    b.button(text=t("ik_admin_recent", lang), callback_data="admin_recent")
    b.button(text=t("ik_admin_stats", lang), callback_data="admin_stats")
    b.adjust(1)
    return b.as_markup()


def admin_listings_kb(rows, lang: str):
    """Recent listings across every seller — the founder's moderation view."""
    b = InlineKeyboardBuilder()
    for listing in rows:
        dot = "🟢" if listing.status == "active" else "🔴"
        emoji = CATEGORIES.get(listing.category, {}).get("emoji", "•")
        label = (
            f"{dot} {emoji} {_short(listing.title, 22)} · "
            f"{format_price(listing.price, listing.currency, lang)}"
        )
        b.button(text=label, callback_data=f"adminview:{listing.id}")
    b.adjust(1)
    return b.as_markup()


def admin_listing_mgmt_kb(listing, lang: str):
    """Same actions as a seller's own listing, but usable on anyone's."""
    b = InlineKeyboardBuilder()
    if listing.status == "active":
        b.button(text=t("ik_sold", lang), callback_data=f"adminsold:{listing.id}")
    else:
        b.button(text=t("ik_activate", lang), callback_data=f"adminactive:{listing.id}")
    b.button(text=t("ik_delete", lang), callback_data=f"admindel:{listing.id}")
    b.adjust(1)
    return b.as_markup()
