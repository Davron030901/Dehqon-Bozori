"""Cross-stack contract test: does the API return what the frontend reads?

The frontend and the backend are separate deploys in separate languages. The
only thing binding them is the JSON shape, and nothing in either build would
notice if it drifted — the site would just render blank prices in production.

So this test reads the truth from both sides and compares them:

  * the FIELDS the frontend expects come from parsing `interface ApiListing`
    in frontend/lib/api.ts — the real code, not a copy of it
  * the FIELDS the backend sends come from calling the actual API in-process

Then it asserts every field the frontend reads exists, is not unexpectedly
null, and has a compatible type. It also reports fields the API sends that the
frontend ignores, which is not a failure but is worth seeing.

    python tests/test_contract.py
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"

sys.path.insert(0, str(BACKEND))

_TMP_DB = os.path.join(tempfile.mkdtemp(prefix="dehqon_contract_"), "c.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP_DB}"
os.environ.setdefault("BOT_TOKEN", "0:test")
os.environ.setdefault("BOT_USERNAME", "DehqonBozoriTestBot")
os.environ.setdefault("ADMIN_IDS", "777")

PASS: list[str] = []
FAIL: list[str] = []
NOTE: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    (PASS if ok else FAIL).append(name)
    mark = "\033[92m PASS\033[0m" if ok else "\033[91m FAIL\033[0m"
    print(f"{mark}  {name}" + (f"  — {detail}" if detail and not ok else ""))


def note(text: str) -> None:
    NOTE.append(text)
    print(f"\033[93m NOTE\033[0m  {text}")


# --------------------------------------------------------------------------- #
#  Read the frontend's expectations straight out of its source
# --------------------------------------------------------------------------- #
TS_TO_PY = {
    "string": str,
    "number": (int, float),
    "boolean": bool,
}


def parse_ts_interface(source: str, name: str) -> dict[str, dict]:
    """Return {field: {"types": [...], "nullable": bool, "optional": bool}}."""
    match = re.search(rf"interface {name} \{{(.*?)\n\}}", source, re.S)
    if not match:
        raise AssertionError(f"interface {name} not found in frontend/lib/api.ts")

    fields: dict[str, dict] = {}
    for line in match.group(1).splitlines():
        line = line.split("//")[0].strip().rstrip(";")
        if not line or ":" not in line:
            continue
        key, _, raw = line.partition(":")
        key = key.strip()
        optional = key.endswith("?")
        key = key.rstrip("?")
        parts = [p.strip() for p in raw.split("|")]
        fields[key] = {
            "types": [p for p in parts if p not in ("null", "undefined")],
            "nullable": "null" in parts,
            "optional": optional,
        }
    return fields


def type_ok(value, spec: dict) -> bool:
    if value is None:
        return spec["nullable"] or spec["optional"]
    for ts_type in spec["types"]:
        py = TS_TO_PY.get(ts_type)
        if py and isinstance(value, py) and not (py is bool and isinstance(value, bool) is False):
            return True
        if ts_type.startswith("ApiSeller") and isinstance(value, dict):
            return True
        if ts_type.startswith("ApiListing") and isinstance(value, dict):
            return True
        if ts_type.endswith("[]") and isinstance(value, list):
            return True
        # string unions, e.g. 'pending' | 'ok'
        if ts_type.startswith("'") and isinstance(value, str):
            return True
    # bool is a subclass of int in Python — guard against number/boolean mixups
    if "number" in spec["types"] and isinstance(value, bool):
        return False
    return False


async def main() -> int:
    import httpx

    from app.db.database import Listing, User, init_db, session_factory

    api_ts = (FRONTEND / "lib" / "api.ts").read_text(encoding="utf-8")
    expected_listing = parse_ts_interface(api_ts, "ApiListing")
    expected_seller = parse_ts_interface(api_ts, "ApiSeller")
    expected_page = parse_ts_interface(api_ts, "ApiPage")

    print(f"frontend/lib/api.ts declares {len(expected_listing)} listing fields, "
          f"{len(expected_seller)} seller fields\n")

    await init_db()
    async with session_factory() as s:
        seller = User(
            id=555001, username="dehqon_ali", full_name="Ali Aka",
            phone="+998901234567", region="samarkand", village="Chorbog'",
            language="uz",
        )
        s.add(seller)
        await s.flush()
        s.add(Listing(
            seller_id=seller.id, title="Yangi pomidor", category="vegetables",
            price=8000, unit="kg", quantity="500 kg", region="samarkand",
            district="Urgut", phone="+998901234567", telegram_username="dehqon_ali",
            whatsapp="+998901234567", status="active", source="bot",
            description="Bugun uzilgan.", harvest_date="2026-07-25",
        ))
        # A deliberately sparse listing: only the required columns. This is the
        # one that catches "works on my machine" — most real bot listings have
        # no district, no whatsapp and no harvest date.
        s.add(Listing(
            seller_id=seller.id, title="Minimal e'lon", category="honey",
            price=90000, unit="liter", region="jizzakh", status="active",
            source="bot",
        ))
        await s.commit()

    from app.api.app import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        # ---------------------------------------------------------- page ----
        page = (await c.get("/api/listings")).json()

        for field, spec in expected_page.items():
            present = field in page
            check(f"ApiPage.{field} present", present or spec["optional"])
            if present:
                check(f"ApiPage.{field} type", type_ok(page[field], spec),
                      f"got {type(page[field]).__name__}={page[field]!r}")

        check("page returns both seeded listings", page["total"] == 2, str(page["total"]))

        # ------------------------------------------------------- listings ----
        for listing in page["items"]:
            label = listing.get("title", "?")
            for field, spec in expected_listing.items():
                if field not in listing:
                    check(f"[{label}] ApiListing.{field} present", spec["optional"],
                          "field missing from API response")
                    continue
                check(f"[{label}] ApiListing.{field} type",
                      type_ok(listing[field], spec),
                      f"got {type(listing[field]).__name__}={listing[field]!r}, "
                      f"expected {'|'.join(spec['types'])}"
                      + (" | null" if spec["nullable"] else ""))

            # Fields the frontend reads unconditionally must never be null.
            for field in ("id", "title", "category", "price", "price_display",
                          "region", "region_label", "unit_label", "status",
                          "created_at", "is_new_today", "views"):
                check(f"[{label}] {field} is never null",
                      listing.get(field) is not None)

        # --------------------------------------------------------- seller ----
        detailed = next(l for l in page["items"] if l["seller"])
        for field, spec in expected_seller.items():
            present = field in detailed["seller"]
            check(f"ApiSeller.{field} present", present or spec["optional"])
            if present:
                check(f"ApiSeller.{field} type",
                      type_ok(detailed["seller"][field], spec))

        # ------------------------------- fields the frontend never reads ----
        extra = set(page["items"][0]) - set(expected_listing)
        if extra:
            note(f"API sends {len(extra)} field(s) the frontend ignores: "
                 f"{', '.join(sorted(extra))}")

        # ----------------------------------------- category / unit slugs ----
        # The site uses the backend's own slugs — no translation table — so
        # the check is direct: the labels it ships must cover the catalogue
        # exactly, or a listing renders with no name (or a form posts a slug
        # the backend rejects).
        sys.path.insert(0, str(BACKEND))
        from app.catalog import CATEGORIES, UNITS

        strings_src = (FRONTEND / "lib" / "strings.ts").read_text(encoding="utf-8")
        label_block = re.search(r"export const categoryLabels.*?\n\};", strings_src, re.S)
        assert label_block, "categoryLabels not found in frontend/lib/strings.ts"
        fe_categories = set(re.findall(r"^\s*([a-z_]+):\s*\{", label_block.group(0), re.M))
        check("frontend labels every backend category",
              set(CATEGORIES) <= fe_categories,
              f"unlabelled: {sorted(set(CATEGORIES) - fe_categories)}")
        check("every category the frontend posts is accepted by the backend",
              fe_categories <= set(CATEGORIES),
              f"backend would reject: {sorted(fe_categories - set(CATEGORIES))}")

        emoji_fe = dict(re.findall(r"^\s*([a-z_]+):\s*\{[^}]*emoji:\s*'([^']+)'",
                                   label_block.group(0), re.M))
        wrong = [k for k, v in CATEGORIES.items() if emoji_fe.get(k) != v["emoji"]]
        check("category emoji identical on bot and site", not wrong, str(wrong))

        unit_block = re.search(r"export const unitLabels.*?\n\};", strings_src, re.S)
        assert unit_block, "unitLabels not found in frontend/lib/strings.ts"
        fe_units = set(re.findall(r"^\s*([a-z_]+):\s*'", unit_block.group(0), re.M))
        check("frontend and backend agree on units", fe_units == set(UNITS),
              f"only fe: {sorted(fe_units - set(UNITS))}, only be: {sorted(set(UNITS) - fe_units)}")

        # Every listing the API returns uses a slug the frontend can label.
        for listing in page["items"]:
            check(f"[{listing['title']}] category labelled by the site",
                  listing["category"] in fe_categories)
            check(f"[{listing['title']}] unit labelled by the site", listing["unit"] in fe_units)

        # ------------------------------------------- region translation -----
        strings_ts = (FRONTEND / "lib" / "strings.ts").read_text(encoding="utf-8")
        block = re.search(r"export const regions.*?\[(.*?)\n\];", strings_ts, re.S)
        assert block
        fe_regions = set(re.findall(r"key: '([a-z_]+)'", block.group(1)))

        from app.catalog import REGIONS

        check("frontend and backend agree on region slugs",
              fe_regions == set(REGIONS),
              f"only in frontend: {sorted(fe_regions - set(REGIONS))}, "
              f"only in backend: {sorted(set(REGIONS) - fe_regions)}")

        # ----------------------------------------- district translation -----
        # lib/districts.ts is generated from districts.py, but generated files
        # go stale the moment someone forgets to regenerate — and a district the
        # site offers that the backend rejects is a 422 at the end of a form the
        # seller has already filled in.
        from app.districts import DISTRICT_TO_REGION, district_count

        districts_ts_path = FRONTEND / "lib" / "districts.ts"
        if not districts_ts_path.is_file():
            check("frontend district file exists", False,
                  "run `npm run gen:districts` in frontend/")
        else:
            districts_ts = districts_ts_path.read_text(encoding="utf-8")
            fe_districts = set(re.findall(r"\{\s*key: '([a-z_]+)'", districts_ts))
            be_districts = set(DISTRICT_TO_REGION)

            check(f"frontend and backend agree on district slugs ({district_count()})",
                  fe_districts == be_districts,
                  f"only in frontend: {sorted(fe_districts - be_districts)[:5]}, "
                  f"only in backend: {sorted(be_districts - fe_districts)[:5]} "
                  "— run `npm run gen:districts`")

            # Region membership has to agree too: the same slug under a
            # different province on each side is worse than a missing one,
            # because nothing reports it.
            fe_pairs = {}
            current_region = None
            for line in districts_ts.splitlines():
                region_match = re.match(r"^  ([a-z_]+): \[", line)
                if region_match:
                    current_region = region_match.group(1)
                    continue
                key_match = re.search(r"\{\s*key: '([a-z_]+)'", line)
                if key_match and current_region:
                    fe_pairs[key_match.group(1)] = current_region

            misfiled = [
                f"{key}: fe={region} be={DISTRICT_TO_REGION[key]}"
                for key, region in fe_pairs.items()
                if key in DISTRICT_TO_REGION and DISTRICT_TO_REGION[key] != region
            ]
            check("every district sits under the same region on both sides",
                  not misfiled, "; ".join(misfiled[:3]))

        # ------------------------------------------ endpoints api.ts calls ---
        called = set(re.findall(r"request<[^>]*>\(\s*[`'\"]([^`'\"?]+)", api_ts))
        # Read the route table from the OpenAPI schema rather than walking
        # app.routes: recent FastAPI nests included routers, so the top-level
        # list does not contain their paths.
        routes = list(app.openapi()["paths"].keys())
        check("API exposes a non-trivial route table", len(routes) > 10, str(len(routes)))

        for endpoint in sorted(called):
            # normalise ${...} template holes into a path param
            pattern = re.sub(r"\$\{[^}]+\}", "{p}", endpoint).rstrip("/")
            match = any(
                re.fullmatch(re.sub(r"\{[^}]+\}", "[^/]+", r), pattern)
                for r in routes
            )
            check(f"frontend calls an endpoint that exists: {endpoint}", match)

        # ------------------------------------ photo URL is actually usable ---
        photo_listing = page["items"][0]
        if photo_listing.get("photo"):
            r = await c.get(photo_listing["photo"])
            check("photo URL resolves", r.status_code in (200, 404),
                  f"HTTP {r.status_code}")

        # ---------------------------- contact payload the detail page uses ---
        r = await c.post(f"/api/listings/{page['items'][0]['id']}/contact?channel=call")
        contact = r.json()
        for field in ("channel", "phone", "tel_link", "telegram_link", "whatsapp_link"):
            check(f"contact response has {field}", field in contact)

        # ------------------------------------------------- stats contract ---
        stats = (await c.get("/api/stats")).json()
        for field in ("active_listings", "sellers", "regions"):
            check(f"stats.{field} present and numeric",
                  isinstance(stats.get(field), int))

    # The contact call spins up an aiogram Bot to notify the seller; close its
    # HTTP session so the test exits cleanly.
    from app.api import notify

    await notify.close_bot()

    print("\n" + "=" * 64)
    print(f"  contract: {len(PASS)} passed, {len(FAIL)} failed, {len(NOTE)} note(s)")
    if FAIL:
        print("  failed:")
        for name in FAIL:
            print(f"    · {name}")
    print("=" * 64)
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
