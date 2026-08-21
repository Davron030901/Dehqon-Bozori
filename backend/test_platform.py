"""End-to-end test of the shared backend.

Proves the one thing that matters for this project: the Telegram bot and the
website are the same platform. A row written through the bot's data layer is
served by the web API, and a listing created through the web API is found by
the bot's own query functions.

Runs against a throwaway database, so it never touches dehqon_bozori.db.

    python test_platform.py
"""
from __future__ import annotations

import asyncio
import os
import sys
import tempfile

# Point every module at a scratch database BEFORE anything imports config.
_TMP_DB = os.path.join(tempfile.mkdtemp(prefix="dehqon_test_"), "test.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP_DB}"
os.environ.setdefault("BOT_TOKEN", "0:test")
os.environ.setdefault("BOT_USERNAME", "DehqonBozoriTestBot")
os.environ.setdefault("ADMIN_IDS", "777")
# Blank optional integers are exactly what .env.example ships and what Render
# sends for an unfilled variable — they must be read as "not set", not crash.
os.environ.setdefault("PHOTO_ARCHIVE_CHAT_ID", "")
os.environ.setdefault("PORT", "")

import httpx  # noqa: E402

from app.db.database import (  # noqa: E402
    AuthCode,
    ContactEvent,
    Listing,
    User,
    init_db,
    session_factory,
)
from app.config import settings  # noqa: E402
from app.db.queries import listing_photo, query_listings  # noqa: E402

PASS, FAIL = [], []


def check(name: str, condition: bool, detail: str = "") -> None:
    (PASS if condition else FAIL).append(name)
    mark = "\033[92m PASS\033[0m" if condition else "\033[91m FAIL\033[0m"
    print(f"{mark}  {name}" + (f"  — {detail}" if detail and not condition else ""))


# 1x1 transparent PNG
TINY_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c6360000002000100ffff03000006000557bfabd400"
    "00000049454e44ae426082"
)


async def main() -> int:
    from app.api.app import app

    await init_db()

    # --------------------------------------------------------------- setup --
    # Simulate the BOT writing straight to the shared tables.
    async with session_factory() as s:
        seller = User(
            id=555001, username="dehqon_ali", full_name="Ali Aka",
            phone="+998901234567", region="samarkand", village="Chorbog'",
            language="uz",
        )
        admin = User(id=777, username="founder", full_name="Davron", language="uz")
        s.add_all([seller, admin])
        await s.flush()
        s.add(Listing(
            seller_id=seller.id, title="Yangi pomidor", category="vegetables",
            price=8000, unit="kg", quantity="500 kg", region="samarkand",
            district="Urgut", phone="+998901234567", status="active",
            source="bot", description="Bugun uzilgan.",
        ))
        s.add(Listing(
            seller_id=seller.id, title="Qora uzum", category="fruits",
            price=15000, unit="kg", region="samarkand", status="active", source="bot",
        ))
        s.add(Listing(
            seller_id=seller.id, title="Eski karam", category="vegetables",
            price=3000, unit="kg", region="bukhara", status="sold", source="bot",
        ))
        await s.commit()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        # --------------------------------------------------------- public ---
        r = await c.get("/api/health")
        check("health endpoint", r.status_code == 200 and r.json()["status"] == "ok")

        r = await c.get("/api/meta")
        m = r.json()
        check("meta serves catalog", len(m["categories"]) >= 5 and len(m["regions"]) == 14)
        check("meta exposes bot username", m["bot_username"] == "DehqonBozoriTestBot")

        r = await c.get("/api/listings")
        data = r.json()
        check("BOT listing visible on WEBSITE", data["total"] == 2,
              f"expected 2 active, got {data['total']}")
        check("sold listings hidden by default",
              all(i["status"] == "active" for i in data["items"]))
        first = data["items"][0]
        check("labels resolved server-side",
              first["region_label"] == "Samarqand" and first["category_emoji"] != "")
        check("price formatted for humans", "8 000" in first["price_display"]
              or "15 000" in first["price_display"], first["price_display"])
        check("'listed today' badge computed", first["is_new_today"] is True)

        r = await c.get("/api/listings?lang=ru")
        check("Russian labels", r.json()["items"][0]["region_label"] == "Самарканд")

        r = await c.get("/api/listings?q=pomidor")
        check("search by product name", r.json()["total"] == 1)

        r = await c.get("/api/listings?category=fruits")
        check("filter by category", r.json()["total"] == 1)

        r = await c.get("/api/listings?region=bukhara")
        check("filter by region (sold excluded)", r.json()["total"] == 0)

        r = await c.get("/api/listings?min_price=10000")
        check("filter by min price", r.json()["total"] == 1)

        r = await c.get("/api/listings?sort=price_asc")
        prices = [i["price"] for i in r.json()["items"]]
        check("sort by cheapest first", prices == sorted(prices), str(prices))

        r = await c.get("/api/listings?include_sold=true")
        check("include_sold shows everything", r.json()["total"] == 3)

        r = await c.get("/api/listings?per_page=1")
        check("pagination", r.json()["pages"] == 2 and len(r.json()["items"]) == 1)

        listing_id = first["id"]
        r = await c.get(f"/api/listings/{listing_id}")
        detail = r.json()
        check("detail includes seller", detail["seller"]["full_name"] == "Ali Aka")
        check("detail exposes contact", detail["phone"] == "+998901234567")

        r = await c.get(f"/api/listings/{listing_id}")
        check("view counter increments", r.json()["views"] == 2, str(r.json()["views"]))

        r = await c.post(f"/api/listings/{listing_id}/contact?channel=call")
        cj = r.json()
        check("contact returns tel: link", cj["tel_link"] == "tel:+998901234567")
        check("contact returns telegram link",
              cj["telegram_link"] == "https://t.me/dehqon_ali")

        async with session_factory() as s:
            from sqlalchemy import func, select
            n = (await s.execute(select(func.count()).select_from(ContactEvent))).scalar_one()
        check("contact event recorded for analytics", n == 1)

        r = await c.get("/api/listings/999999")
        check("missing listing -> 404", r.status_code == 404)

        r = await c.get("/api/stats")
        st = r.json()
        check("public stats", st["active_listings"] == 2 and st["sellers"] == 2)

        # ----------------------------------------------------------- auth ---
        r = await c.get("/api/my/listings")
        check("seller endpoints require auth", r.status_code == 401)

        r = await c.post("/api/auth/start")
        start = r.json()
        check("login deep link built",
              start["deep_link"] ==
              f"https://t.me/DehqonBozoriTestBot?start=login_{start['code']}")

        r = await c.get(f"/api/auth/poll?code={start['code']}")
        check("poll pending before bot approval", r.json()["status"] == "pending")

        # Simulate the BOT approving the code (what handlers/web.py does).
        async with session_factory() as s:
            row = await s.get(AuthCode, start["code"])
            row.approved = True
            row.user_id = 555001
            await s.commit()

        r = await c.get(f"/api/auth/poll?code={start['code']}")
        auth = r.json()
        check("BOT approval logs user into WEBSITE",
              auth["status"] == "ok" and bool(auth["token"]))
        token = auth["token"]
        H = {"Authorization": f"Bearer {token}"}

        r = await c.get(f"/api/auth/poll?code={start['code']}")
        check("login code is single-use", r.json()["status"] == "expired")

        r = await c.get("/api/auth/me", headers=H)
        check("session identifies the Telegram account",
              r.json()["user"]["id"] == 555001)
        check("non-admin flagged correctly", r.json()["is_admin"] is False)

        r = await c.get("/api/auth/me", headers={"Authorization": "Bearer nonsense"})
        check("bad token rejected", r.status_code == 401)

        # -------------------------------------------------- seller (web) ---
        r = await c.post("/api/my/upload", headers=H,
                         files={"file": ("p.png", TINY_PNG, "image/png")})
        photo_url = r.json()["photo_url"]
        check("photo upload accepted", photo_url.startswith("/media/uploads/"))

        r = await c.post("/api/my/upload", headers=H,
                         files={"file": ("x.exe", b"MZ", "application/x-msdownload")})
        check("non-image upload rejected", r.status_code == 422)

        r = await c.post("/api/my/listings", headers=H, json={
            "title": "Saytdan qo'shilgan asal", "category": "honey", "price": 90000,
            "unit": "liter", "region": "samarkand", "district": "Payariq",
            "quantity": "40 litr", "phone": "+998911112233",
            "telegram_username": "@dehqon_ali", "whatsapp": "+998911112233",
            "harvest_date": "2026-07-20", "photo_url": photo_url,
        })
        check("website can create a listing", r.status_code == 201, r.text[:120])
        web_listing = r.json()
        check("web listing tagged source=web", web_listing["source"] == "web")
        check("@ stripped from telegram username",
              web_listing["telegram_username"] == "dehqon_ali")
        check("harvest date stored", web_listing["harvest_date"] == "2026-07-20")

        # >>> the core promise, in the other direction <<<
        async with session_factory() as s:
            rows, total = await query_listings(s, search="asal", limit=10)
        check("WEBSITE listing found by BOT's own query layer",
              total == 1 and rows[0].title == "Saytdan qo'shilgan asal")

        async with session_factory() as s:
            row = await s.get(Listing, web_listing["id"])
        try:
            check("bot can render the web listing's photo",
                  listing_photo(row) is not None)
        except ModuleNotFoundError:  # aiogram not installed in this environment
            from app.api.media import local_path_for
            check("bot can resolve the web listing's photo on disk",
                  local_path_for(row.photo_url) is not None)

        r = await c.get(f"/api/photo/{web_listing['id']}")
        check("photo served over HTTP", r.status_code == 200 and len(r.content) > 0)

        r = await c.get("/api/my/listings", headers=H)
        titles = [i["title"] for i in r.json()]
        check("bot-created and web-created listings share one inbox",
              "Yangi pomidor" in titles and "Saytdan qo'shilgan asal" in titles,
              str(titles))

        r = await c.patch(f"/api/my/listings/{web_listing['id']}", headers=H,
                          json={"status": "sold", "price": 95000})
        check("seller can edit price and mark sold",
              r.json()["status"] == "sold" and r.json()["price"] == 95000)

        r = await c.patch(f"/api/my/listings/{web_listing['id']}", headers=H,
                          json={"status": "banana"})
        check("invalid status rejected", r.status_code == 422)

        # A second seller must not be able to touch someone else's listing.
        async with session_factory() as s:
            s.add(User(id=555002, full_name="Boshqa odam", language="uz"))
            code = AuthCode.new()
            code.approved, code.user_id = True, 555002
            s.add(code)
            await s.commit()
            other_code = code.code
        other = (await c.get(f"/api/auth/poll?code={other_code}")).json()["token"]
        r = await c.delete(f"/api/my/listings/{web_listing['id']}",
                           headers={"Authorization": f"Bearer {other}"})
        check("sellers cannot delete each other's listings", r.status_code == 403)

        # ---------------------------------------------------------- admin ---
        r = await c.get("/api/admin/dashboard", headers=H)
        check("non-admin blocked from admin API", r.status_code == 403)

        async with session_factory() as s:
            code = AuthCode.new()
            code.approved, code.user_id = True, 777
            s.add(code)
            await s.commit()
            admin_code = code.code
        adm = (await c.get(f"/api/auth/poll?code={admin_code}")).json()
        check("admin recognised from ADMIN_IDS", adm["is_admin"] is True)
        AH = {"Authorization": f"Bearer {adm['token']}"}

        r = await c.post("/api/admin/listings?lang=uz", headers=AH, json={
            "seller_name": "Telefon qilgan dehqon", "seller_phone": "+998935556677",
            "title": "Qovun", "category": "melons", "price": 6000, "unit": "kg",
            "region": "samarkand", "district": "Ishtixon",
        })
        check("admin posts on behalf of a caller", r.status_code == 201, r.text[:120])
        offline = r.json()
        check("offline seller gets a safe synthetic id", offline["seller"]["id"] < 0,
              str(offline["seller"]["id"]))
        check("caller's phone attached to listing",
              offline["phone"] == "+998935556677")

        r = await c.post("/api/admin/listings", headers=AH, json={
            "seller_name": "Telefon qilgan dehqon", "seller_phone": "+998935556677",
            "title": "Tarvuz", "category": "melons", "price": 4000,
            "region": "samarkand",
        })
        check("repeat caller reuses the same seller record",
              r.json()["seller"]["id"] == offline["seller"]["id"])

        r = await c.get("/api/admin/dashboard", headers=AH)
        d = r.json()
        check("dashboard breaks down by source",
              {s["key"] for s in d["by_source"]} == {"bot", "web", "admin"},
              str(d["by_source"]))

        r = await c.get("/api/admin/listings", headers=AH)
        check("admin sees every listing including sold", r.json()["total"] == 6,
              str(r.json()["total"]))

        r = await c.delete(f"/api/admin/listings/{offline['id']}", headers=AH)
        check("admin can delete any listing", r.status_code == 204)

        r = await c.post("/api/my/listings", headers=H, json={
            "title": "x", "category": "vegetables", "price": 100, "region": "samarkand",
        })
        check("too-short title rejected", r.status_code == 422)

        r = await c.post("/api/my/listings", headers=H, json={
            "title": "Noto'g'ri kategoriya", "category": "spaceships",
            "price": 100, "region": "samarkand",
        })
        check("unknown category rejected", r.status_code == 422)

        r = await c.post("/api/my/listings", headers=H, json={
            "title": "Manfiy narx", "category": "vegetables",
            "price": -5, "region": "samarkand",
        })
        check("negative price rejected", r.status_code == 422)

        # ----------------------------------------------------------- site ---
        for path in ("/", "/sell", "/my", "/admin", "/app.js", "/styles.css",
                     "/manifest.webmanifest", "/sw.js", "/icon.svg"):
            r = await c.get(path)
            check(f"page serves: {path}", r.status_code == 200)
        r = await c.get(f"/e/{listing_id}")
        check("page serves: /e/<id>", r.status_code == 200)

        # ----------------------------------- public REST surface (no /api) ---
        r = await c.get("/health")
        check("GET /health for Render", r.status_code == 200
              and r.json()["status"] == "ok")

        r = await c.get("/listings")
        check("GET /listings without prefix", r.status_code == 200
              and r.json()["total"] >= 1)

        r = await c.get(f"/listings/{listing_id}")
        check("GET /listings/<id> without prefix", r.status_code == 200)

        r = await c.post("/contact-events",
                         json={"listing_id": listing_id, "channel": "whatsapp"})
        check("POST /contact-events", r.status_code == 201)

        r = await c.post("/contact-events",
                         json={"listing_id": listing_id, "channel": "carrier-pigeon"})
        check("POST /contact-events rejects unknown channel", r.status_code == 422)

        r = await c.post("/contact-events", json={"listing_id": 999999, "channel": "call"})
        check("POST /contact-events rejects unknown listing", r.status_code == 404)

        # --- the machine-to-machine endpoints must fail closed --------------
        r = await c.post("/sellers", json={"phone": "+998900000001"})
        check("POST /sellers blocked when ADMIN_API_TOKEN unset",
              r.status_code == 503, str(r.status_code))

        r = await c.patch(f"/listings/{listing_id}/sold", json={"is_sold_out": True})
        check("PATCH /sold blocked when ADMIN_API_TOKEN unset", r.status_code == 503)

        settings.admin_api_token = "s3cret-token"

        r = await c.post("/sellers", json={"phone": "+998900000001"})
        check("POST /sellers rejects a missing token", r.status_code == 401)

        r = await c.post("/sellers", headers={"X-Admin-Token": "wrong"},
                         json={"phone": "+998900000001"})
        check("POST /sellers rejects a wrong token", r.status_code == 401)

        AT = {"X-Admin-Token": "s3cret-token"}
        r = await c.post("/sellers", headers=AT, json={
            "phone": "998 90 000 00 01", "full_name": "Yangi dehqon",
            "village": "Kattaqo'rg'on", "region": "samarkand",
        })
        check("POST /sellers creates a grower", r.status_code == 201
              and r.json()["created"] is True, r.text[:120])
        check("phone normalised to +998…", r.json()["phone"] == "+998900000001")
        new_seller_id = r.json()["id"]
        check("registered seller gets a safe synthetic id", new_seller_id < 0)

        r = await c.post("/sellers", headers=AT, json={"phone": "+998900000001"})
        check("POST /sellers is idempotent on phone",
              r.status_code == 201 and r.json()["created"] is False
              and r.json()["id"] == new_seller_id)

        r = await c.post("/sellers", headers=AT,
                         json={"phone": "+998900000002", "telegram_chat_id": 999123})
        check("seller registered with a Telegram id keeps it as the key",
              r.json()["id"] == 999123)

        r = await c.post("/listings", headers=AT, json={
            "seller_phone": "+998900000001", "product_name": "Sabzi",
            "category": "vegetables", "price_per_kg": 5500, "quantity_kg": 300,
            "region": "samarkand", "district": "Kattaqo'rg'on",
            "harvest_date": "2026-07-25",
        })
        check("POST /listings creates in frontend vocabulary", r.status_code == 201,
              r.text[:140])
        api_listing = r.json()
        check("quantity_kg stored as a readable quantity",
              api_listing["quantity"] == "300 kg", str(api_listing.get("quantity")))
        check("seller matched by phone, not duplicated",
              api_listing["seller"]["id"] == new_seller_id)

        r = await c.post("/listings", headers=AT, json={
            "seller_phone": "+998900000001", "product_name": "Kosmik qovun",
            "category": "spaceships", "price_per_kg": 1, "region": "samarkand",
        })
        check("POST /listings rejects an unknown category", r.status_code == 422)

        r = await c.patch(f"/listings/{api_listing['id']}/sold", headers=AT,
                          json={"is_sold_out": True})
        check("PATCH /listings/<id>/sold marks sold",
              r.status_code == 200 and r.json()["is_sold_out"] is True)

        r = await c.get(f"/api/listings/{api_listing['id']}")
        check("sold listing reflected in the read model",
              r.json()["status"] == "sold")

        r = await c.patch(f"/listings/{api_listing['id']}/sold", headers=AT,
                          json={"is_sold_out": False})
        check("PATCH /sold can reactivate", r.json()["is_sold_out"] is False)

        r = await c.patch("/listings/999999/sold", headers=AT, json={})
        check("PATCH /sold on a missing listing -> 404", r.status_code == 404)

        settings.admin_api_token = ""

        # --------------------------------------------------------- logout ---
        r = await c.post("/api/auth/logout", headers=H)
        check("logout works", r.status_code == 200)
        r = await c.get("/api/auth/me", headers=H)
        check("token dead after logout", r.status_code == 401)

    print("\n" + "=" * 62)
    print(f"  {len(PASS)} passed, {len(FAIL)} failed")
    if FAIL:
        print("  failed: " + ", ".join(FAIL))
    print("=" * 62)
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
