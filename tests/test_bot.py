"""Telegram bot structure and translation tests.

Importing aiogram is slow and needs the full dependency tree, so this checks
what actually breaks in practice and can be verified without a live Telegram
connection:

  * every router is registered, in an order where /cancel and the web-login
    deep link still win
  * every FSM state in the "add listing" flow has a handler
  * every UI string exists in BOTH Uzbek and Russian — a missing key silently
    falls back to Uzbek for a Russian-speaking trader, which is the kind of bug
    nobody reports and everybody notices
  * catalog labels are complete
  * no user-facing string was left hard-coded in a handler

    python tests/test_bot.py
"""
from __future__ import annotations

import ast
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
BOT = BACKEND / "app" / "bot"
sys.path.insert(0, str(BACKEND))

os.environ.setdefault("BOT_TOKEN", "0:test")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

PASS: list[str] = []
FAIL: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    (PASS if ok else FAIL).append(name)
    mark = "\033[92m PASS\033[0m" if ok else "\033[91m FAIL\033[0m"
    print(f"{mark}  {name}" + (f"  — {detail}" if detail and not ok else ""))


def main() -> int:
    # ---------------------------------------------------------- i18n ------
    from app.bot.texts import BTN, TEXTS, t

    uz, ru = set(TEXTS["uz"]), set(TEXTS["ru"])
    check("uz and ru have the same string keys",
          uz == ru,
          f"only uz: {sorted(uz - ru)[:5]}, only ru: {sorted(ru - uz)[:5]}")
    check(f"translation set is non-trivial ({len(uz)} keys)", len(uz) > 50)

    empty = [k for lang in ("uz", "ru") for k, v in TEXTS[lang].items() if not v.strip()]
    check("no empty translations", not empty, str(empty[:5]))

    # Placeholders must match between languages, or .format() silently drops
    # the value and the trader sees a message with a missing name or price.
    mismatched = []
    for key in uz & ru:
        holes_uz = set(re.findall(r"\{(\w+)\}", TEXTS["uz"][key]))
        holes_ru = set(re.findall(r"\{(\w+)\}", TEXTS["ru"][key]))
        if holes_uz != holes_ru:
            mismatched.append(f"{key}: uz={holes_uz} ru={holes_ru}")
    check("format placeholders match across languages",
          not mismatched, "; ".join(mismatched[:3]))

    for name, labels in BTN.items():
        check(f"button '{name}' has uz + ru", "uz" in labels and "ru" in labels)

    check("t() falls back rather than raising", t("does_not_exist", "uz") == "does_not_exist")
    check("t() formats", "Ali" in t("welcome_back", "uz", name="Ali"))

    # ------------------------------------------------------- catalog ------
    from app.catalog import CATEGORIES, REGIONS, UNITS, category_label, region_label

    for key, item in CATEGORIES.items():
        check(f"category '{key}' complete",
              all(f in item for f in ("uz", "ru", "emoji")))
    check(f"all 14 regions present ({len(REGIONS)})", len(REGIONS) == 14)
    for key, item in REGIONS.items():
        check(f"region '{key}' bilingual", "uz" in item and "ru" in item)
    for key, item in UNITS.items():
        check(f"unit '{key}' bilingual", "uz" in item and "ru" in item)
    check("unknown category degrades to its key", category_label("nope", "uz") == "nope")
    check("unknown region degrades to its key", region_label("nope", "uz") == "nope")

    # ------------------------------------------------------ districts ----
    from app.districts import (
        DISTRICTS,
        DISTRICT_TO_REGION,
        district_count,
        district_label,
        districts_of,
        is_valid_district,
    )

    check(f"every region has districts ({len(DISTRICTS)})",
          set(DISTRICTS) == set(REGIONS),
          f"only in districts: {sorted(set(DISTRICTS) - set(REGIONS))}, "
          f"only in regions: {sorted(set(REGIONS) - set(DISTRICTS))}")

    for region, items in DISTRICTS.items():
        check(f"region '{region}' has at least one district", len(items) > 0)

    # A key that appears twice would make DISTRICT_TO_REGION silently wrong for
    # one of them, and listings would file themselves under the wrong province.
    all_keys = [item["key"] for items in DISTRICTS.values() for item in items]
    duplicates = sorted({k for k in all_keys if all_keys.count(k) > 1})
    check("district keys are unique across every region",
          not duplicates, str(duplicates[:5]))

    check(f"district index is complete ({district_count()})",
          len(DISTRICT_TO_REGION) == len(all_keys))
    check(f"district catalogue is non-trivial ({district_count()})",
          district_count() >= 150)

    for items in DISTRICTS.values():
        for item in items:
            check(f"district '{item['key']}' is complete",
                  all(f in item for f in ("key", "uz", "type"))
                  and item["type"] in ("city", "district")
                  and bool(item["uz"].strip()))

    # Cities before districts: a grower names their nearest bazaar first.
    for region, items in DISTRICTS.items():
        types = [i["type"] for i in items]
        first_district = types.index("district") if "district" in types else len(types)
        check(f"'{region}' lists cities before districts",
              "city" not in types[first_district:], str(types))

    check("a real district validates against its own region",
          is_valid_district("urgut", "samarkand"))
    check("a district does not validate against another region",
          not is_valid_district("urgut", "fergana"))
    check("an unknown district never validates", not is_valid_district("nope", "samarkand"))
    check("district_label resolves a known slug",
          district_label("urgut") == "Urgut")
    check("district_label passes free text through unchanged",
          district_label("Chorbog'", fallback="Chorbog'") == "Chorbog'")
    check("district_label falls back for an unknown slug",
          district_label("nope", fallback="Nope") == "Nope")
    check("districts_of is empty for an unknown region", districts_of("nope") == [])
    check("Tashkent city is covered too", len(districts_of("tashkent_city")) == 12)

    # -------------------------------------------------------- routers -----
    from app.bot.handlers import get_routers

    routers = get_routers()
    names = [r.name for r in routers]
    check("all seven routers registered", len(routers) == 7, str(names))
    check("cancel router is first (so /cancel beats any FSM step)",
          names[0] == "cancel", str(names))
    check("web router precedes common (so /start login_… is not swallowed)",
          names.index("web") < names.index("common"), str(names))
    check("admin router precedes seller (neither FSM may swallow the other)",
          names.index("admin") < names.index("seller"), str(names))
    check("common router is last (its catch-all must not shadow menus)",
          names[-1] == "common", str(names))
    check("router names are unique", len(set(names)) == len(names), str(names))

    # ------------------------------------------------------ FSM states ----
    from aiogram.fsm.state import State

    from app.bot.states import AdminListing, CreateListing

    def states_of(group) -> list[str]:
        # Only real State objects — `dir()` also returns aiogram's own helpers.
        return [
            name
            for name in dir(group)
            if not name.startswith("_") and isinstance(getattr(group, name), State)
        ]

    flow = states_of(CreateListing)
    check(f"add-listing flow has every step ({len(flow)})", len(flow) >= 9, str(flow))

    add_listing_src = (BOT / "handlers" / "add_listing.py").read_text(encoding="utf-8")
    for state in flow:
        check(f"FSM state CreateListing.{state} has a handler",
              f"CreateListing.{state}" in add_listing_src)

    # The founder posting for a grower who phoned. A dead end here means a call
    # you cannot turn into a listing while the person is still on the line.
    admin_flow = states_of(AdminListing)
    check(f"admin flow has every step ({len(admin_flow)})", len(admin_flow) >= 9,
          str(admin_flow))

    admin_src = (BOT / "handlers" / "admin.py").read_text(encoding="utf-8")
    for state in admin_flow:
        check(f"FSM state AdminListing.{state} has a handler",
              f"AdminListing.{state}" in admin_src)

    # The admin flow can write for ANY seller, so unlike the seller handlers it
    # cannot rely on "the caller owns this row" — every entry point re-checks.
    check("admin handlers gate on ADMIN_IDS",
          "settings.admin_id_list" in admin_src and admin_src.count("_deny") >= 6,
          f"_deny used {admin_src.count('_deny')} times")
    check("admin seller lookup reuses the shared matching rule",
          "get_or_create_offline_seller" in admin_src)

    # District is a button now, not free text. A stale keyboard from an earlier
    # attempt must not file produce under the wrong province.
    for name, src in (("add_listing.py", add_listing_src), ("admin.py", admin_src)):
        check(f"{name}: district is chosen from a keyboard",
              "districts_kb" in src)
        check(f"{name}: district is validated against the chosen region",
              "is_valid_district" in src)

    # ------------------------------------- handlers are wired to routers ---
    for path in sorted((BOT / "handlers").glob("*.py")):
        if path.name == "__init__.py":
            continue
        src = path.read_text(encoding="utf-8")
        tree = ast.parse(src)
        handlers = [
            n for n in ast.walk(tree)
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.decorator_list
        ]
        decorated = [
            n for n in handlers
            if any("router" in ast.dump(d) for d in n.decorator_list)
        ]
        check(f"{path.name}: handlers registered on a router",
              len(decorated) > 0 or path.name == "__init__.py",
              f"{len(handlers)} decorated functions, none on a router")

    # ------------------------------- no hard-coded user-facing strings -----
    # Cyrillic or Uzbek-specific letters outside texts.py mean a string escaped
    # the translation table and can never be shown in the other language.
    offenders = []
    for path in sorted(BOT.rglob("*.py")):
        if path.name in ("texts.py", "keyboards.py"):
            continue
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            code = line.split("#")[0]
            if re.search(r'"[^"]*[а-яА-ЯёЁ][^"]*"', code) or re.search(
                r"'[^']*[а-яА-ЯёЁ][^']*'", code
            ):
                offenders.append(f"{path.name}:{lineno}")
    check("no Russian text hard-coded outside texts.py",
          not offenders, ", ".join(offenders[:4]))

    # ------------------------------------------------ photo resolution ----
    from types import SimpleNamespace

    from app.db.queries import listing_photo

    check("bot uses a Telegram file_id when it has one",
          listing_photo(SimpleNamespace(photo_file_id="abc", photo_url=None)) == "abc")
    check("bot ignores a photo_url pointing outside media/",
          listing_photo(SimpleNamespace(photo_file_id=None,
                                        photo_url="/media/../../etc/passwd")) is None)
    check("bot handles a listing with no photo at all",
          listing_photo(SimpleNamespace(photo_file_id=None, photo_url=None)) is None)

    print("\n" + "=" * 64)
    print(f"  bot: {len(PASS)} passed, {len(FAIL)} failed")
    if FAIL:
        for name in FAIL:
            print(f"    · {name}")
    print("=" * 64)
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
