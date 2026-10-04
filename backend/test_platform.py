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
# TEST_DATABASE_URL runs the same checks against a real Postgres (CI does) —
# SQLite forgives things Postgres does not, and production is Postgres.
# The database it points at is WIPED: use a throwaway one.
_TEST_PG = os.environ.get("TEST_DATABASE_URL", "")
os.environ["DATABASE_URL"] = _TEST_PG or f"sqlite+aiosqlite:///{_TMP_DB}"
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

    if _TEST_PG:
        from app.db.database import Base, engine

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
    await init_db()
    print(f"database: {settings.database_url.split('://', 1)[0]}")

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
        # The storefront is the Next.js app on Vercel. The archived vanilla-JS
        # PWA in backend/web/ is off by default (SERVE_LEGACY_WEB=false), so
        # this service must answer `/` with a signpost, not a stale website.
        r = await c.get("/")
        check("/ is an API signpost, not the archived site",
              r.status_code == 200 and r.json().get("docs") == "/api/docs")
        for path in ("/sell", "/my", "/admin", "/app.js", "/sw.js",
                     f"/e/{listing_id}"):
            r = await c.get(path)
            check(f"archived page not served: {path}", r.status_code == 404)

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

        # ======================================================================
        #  Round two: what the mobile app and the upgraded website rely on
        # ======================================================================
        from app.api import notify, ratelimit

        ratelimit.reset()
        sent: list[tuple[int, str]] = []
        real_send = notify.send_background
        notify.send_background = lambda chat_id, text: sent.append((chat_id, text))

        # ----------------------------------------------------- meta & facets
        m = (await c.get("/api/meta")).json()
        check("meta ships districts for all 14 regions", len(m["districts"]) == 14)
        check("Ko'kdala (the 175th district) is in Kashkadarya",
              any(d["key"] == "kokdala" for d in m["districts"]["kashkadarya"]))
        check("meta names the storefront", m["site_url"].startswith("http"))

        f = (await c.get("/api/facets")).json()
        active_total = (await c.get("/api/listings")).json()["total"]
        check("facets total matches the active feed", f["total"] == active_total,
              f"{f['total']} vs {active_total}")
        check("facets count per category", f["categories"].get("fruits") == 1,
              str(f["categories"]))
        check("facets count per region", f["regions"].get("samarkand", 0) >= 2)
        f = (await c.get("/api/facets?region=bukhara")).json()
        check("district facets scoped to the chosen region", f["districts"] == {},
              str(f["districts"]))

        # --------------------------------------------------------- ids filter
        all_ids = [i["id"] for i in (await c.get("/api/listings?include_sold=true&per_page=100")).json()["items"]]
        some = all_ids[:2]
        r = await c.get(f"/api/listings?ids={some[0]},{some[1]},junk,{some[0]}&include_sold=true")
        check("ids= returns exactly the saved listings",
              sorted(i["id"] for i in r.json()["items"]) == sorted(some), r.text[:120])
        r = await c.get("/api/listings?ids=")
        check("empty ids= returns nothing, not everything", r.json()["total"] == 0)

        # ------------------------------------------------------------ similar
        uzum = next(i for i in (await c.get("/api/listings?q=uzum")).json()["items"])
        r = await c.get(f"/api/listings/{listing_id}/similar")
        check("similar listings endpoint", r.status_code == 200
              and all(i["id"] != listing_id for i in r.json()))
        r = await c.get(f"/api/listings/{uzum['id']}/similar")
        check("similar = same category only",
              all(i["category"] == "fruits" for i in r.json()))
        check("similar on missing listing -> 404",
              (await c.get("/api/listings/999999/similar")).status_code == 404)

        # ----------------------------------------------------- seller profile
        r = await c.get("/api/sellers/555001")
        sp = r.json()
        check("public seller profile", r.status_code == 200
              and sp["full_name"] == "Ali Aka" and sp["region_label"] == "Samarqand")
        check("seller profile counts listings",
              sp["total_listings"] >= sp["active_listings"] >= 1, str(sp))
        check("unknown seller -> 404", (await c.get("/api/sellers/123")).status_code == 404)
        r = await c.get("/api/listings?seller_id=555001")
        check("a seller's listings via seller_id", r.json()["total"] == sp["active_listings"])

        # -------------------------------------------- contact notify throttle
        sent.clear()
        for _ in range(3):
            await c.post(f"/api/listings/{listing_id}/contact?channel=call&source=app")
        to_seller = [x for x in sent if x[0] == 555001]
        check("seller pinged once, not once per tap", len(to_seller) == 1, str(len(to_seller)))
        async with session_factory() as s:
            from sqlalchemy import func, select
            n_app = (await s.execute(
                select(func.count()).select_from(ContactEvent).where(ContactEvent.source == "app")
            )).scalar_one()
        check("every tap still counted, tagged source=app", n_app == 3, str(n_app))
        check("notification escapes HTML in titles",
              "&lt;" in notify.contact_message("Olma <1-nav>", "call"))

        # ------------------------------------------------------------ reports
        r = await c.post(f"/api/listings/{listing_id}/report",
                         json={"reason": "fraud", "note": "Narx <yolg'on>"})
        check("buyer can report a listing anonymously", r.status_code == 201, r.text[:100])
        check("admins get a Telegram note about the report",
              any(chat == 777 and "Shikoyat" in text for chat, text in sent))
        r = await c.post(f"/api/listings/{listing_id}/report", json={"reason": "aliens"})
        check("unknown report reason rejected", r.status_code == 422)
        r = await c.post("/api/listings/999999/report", json={"reason": "spam"})
        check("report on missing listing -> 404", r.status_code == 404)
        codes = [
            (await c.post(f"/api/listings/{listing_id}/report", json={"reason": "spam"})).status_code
            for _ in range(5)
        ]
        check("report endpoint is rate limited", 429 in codes, str(codes))

        check("non-admin cannot read reports",
              (await c.get("/api/admin/reports", headers=H)).status_code == 403)
        reports = (await c.get("/api/admin/reports", headers=AH)).json()
        check("admin sees open reports with the listing title",
              len(reports) >= 1 and reports[-1]["listing_title"], str(reports[:1]))
        d = (await c.get("/api/admin/dashboard", headers=AH)).json()
        check("dashboard counts open reports", d["totals"]["open_reports"] == len(reports))
        r = await c.patch(f"/api/admin/reports/{reports[0]['id']}", headers=AH,
                          json={"status": "resolved"})
        check("admin resolves a report", r.json()["status"] == "resolved")
        left = (await c.get("/api/admin/reports", headers=AH)).json()
        check("resolved report leaves the open queue", len(left) == len(reports) - 1)

        # ---------------------------------------------------------- favorites
        check("favorites need a session", (await c.get("/api/my/favorites")).status_code == 401)
        r = await c.put(f"/api/my/favorites/{listing_id}", headers=H)
        check("add favorite", r.status_code == 204)
        r = await c.put(f"/api/my/favorites/{listing_id}", headers=H)
        check("adding twice is harmless", r.status_code == 204)
        check("favorite ids", (await c.get("/api/my/favorites/ids", headers=H)).json() == [listing_id])
        async with session_factory() as s:
            from app.db.queries import get_user_favorites
            bot_view = await get_user_favorites(s, 555001)
        check("web/app favorite visible to the BOT's ⭐ list",
              [l.id for l in bot_view] == [listing_id])
        # Any other listing will do — saved on the device while signed out.
        device_fav = next(i for i in all_ids if i != listing_id)
        r = await c.post("/api/my/favorites/sync", headers=H,
                         json={"ids": [device_fav, 999999, listing_id]})
        check("sync merges device favorites, skips unknown ids",
              sorted(r.json()) == sorted({listing_id, device_fav}), r.text)
        favs = (await c.get("/api/my/favorites", headers=H)).json()
        check("favorites list returns full listings", len(favs) == 2 and favs[0]["title"])
        r = await c.delete(f"/api/my/favorites/{device_fav}", headers=H)
        check("remove favorite", r.status_code == 204
              and (await c.get("/api/my/favorites/ids", headers=H)).json() == [listing_id])
        check("favoriting a missing listing -> 404",
              (await c.put("/api/my/favorites/999999", headers=H)).status_code == 404)

        # ------------------------------------------------- full listing edit
        r = await c.post("/api/my/listings", headers=H, json={
            "title": "Tahrir uchun", "category": "vegetables", "price": 5000,
            "unit": "kg", "region": "samarkand", "district": "urgut",
        })
        edit_id = r.json()["id"]
        r = await c.patch(f"/api/my/listings/{edit_id}", headers=H, json={
            "category": "honey", "unit": "liter", "quantity": "20 litr",
            "harvest_date": "2026-08-01", "title": None,
        })
        e = r.json()
        check("seller can change category, unit, quantity, harvest date",
              r.status_code == 200 and e["category"] == "honey" and e["unit"] == "liter"
              and e["quantity"] == "20 litr" and e["harvest_date"] == "2026-08-01",
              r.text[:160])
        check("null on a required field is ignored, not stored", e["title"] == "Tahrir uchun")
        r = await c.patch(f"/api/my/listings/{edit_id}", headers=H, json={"region": "fergana"})
        check("changing region drops a district from the old region",
              r.json()["region"] == "fergana" and r.json()["district"] is None, r.text[:160])
        r = await c.patch(f"/api/my/listings/{edit_id}", headers=H, json={"district": "urgut"})
        check("district from another region rejected", r.status_code == 422)
        r = await c.patch(f"/api/my/listings/{edit_id}", headers=H, json={"category": "rockets"})
        check("unknown category rejected on edit", r.status_code == 422)
        r = await c.patch(f"/api/my/listings/{edit_id}", headers=H,
                          json={"photo_url": photo_url})
        check("new web photo replaces the old one", r.json()["photo"] == photo_url)
        for bad in ("https://evil.example/x.jpg", "/media/uploads/../../app.db"):
            r = await c.patch(f"/api/my/listings/{edit_id}", headers=H, json={"photo_url": bad})
            check(f"foreign photo_url rejected: {bad[:24]}", r.status_code == 422)
        r = await c.post("/api/my/listings", headers=H, json={
            "title": "Begona rasm", "category": "fruits", "price": 1000,
            "region": "samarkand", "photo_url": "https://evil.example/x.jpg",
        })
        check("foreign photo_url rejected on create", r.status_code == 422)

        mine = (await c.get("/api/my/listings", headers=H)).json()
        pomidor = next(i for i in mine if i["id"] == listing_id)
        check("seller sees how many buyers reached out",
              isinstance(pomidor["contacts_count"], int) and pomidor["contacts_count"] >= 3,
              str(pomidor.get("contacts_count")))
        public = (await c.get(f"/api/listings/{listing_id}")).json()
        check("contact counts stay private on the public read", public["contacts_count"] is None)

        # ----------------------------------------------------------- profile
        r = await c.patch("/api/auth/me", headers=H, json={"region": "atlantis"})
        check("profile rejects an unknown region", r.status_code == 422)
        r = await c.patch("/api/auth/me", headers=H, json={"phone": "90 123 45 67"})
        check("profile phone normalised to +998",
              r.json()["user"]["phone"] == "+998901234567", r.text[:120])

        # -------------------------------------------------- auth rate limit
        ratelimit.reset()
        codes = [(await c.post("/api/auth/start")).status_code for _ in range(21)]
        check("auth/start is rate limited", codes[-1] == 429 and codes[0] == 200, str(codes[-3:]))
        ratelimit.reset()

        # ======================================================================
        #  Round three: fixes from the adversarial review
        # ======================================================================
        ratelimit.reset()

        # --- login can no longer be hijacked by sending someone the link ---
        from types import SimpleNamespace

        from app.bot.handlers import web as web_bot

        class FakeMessage:
            def __init__(self, user):
                self.from_user = user
                self.sent: list[tuple[str, object]] = []

            async def answer(self, text, reply_markup=None, **_):
                self.sent.append((text, reply_markup))

            async def edit_text(self, text, **_):
                self.sent.append((text, None))

        class FakeCallback:
            def __init__(self, user, data):
                self.from_user, self.data = user, data
                self.message = FakeMessage(user)

            async def answer(self, *_, **__):
                return None

        class FakeState:
            async def clear(self):
                return None

        victim = SimpleNamespace(id=555004, username="victim", full_name="Qurbon", first_name="Qurbon")

        start = (await c.post("/api/auth/start")).json()
        check("login start returns a two-digit match code",
              start["match_code"].isdigit() and len(start["match_code"]) == 2, str(start))

        async def open_link(code: str) -> FakeMessage:
            msg = FakeMessage(victim)
            async with session_factory() as bs:
                await web_bot.web_login(
                    msg, SimpleNamespace(args=f"login_{code}"), bs, FakeState()
                )
            return msg

        async def tap(code: str, choice: str) -> FakeCallback:
            cb = FakeCallback(victim, f"wlogin:{code}:{choice}")
            async with session_factory() as bs:
                await web_bot.web_login_choice(cb, bs)
            return cb

        msg = await open_link(start["code"])
        text, kb = msg.sent[-1]
        buttons = [b.callback_data.rsplit(":", 1)[1] for row in kb.inline_keyboard for b in row]
        check("opening the link alone approves nothing",
              (await c.get(f"/api/auth/poll?code={start['code']}")).json()["status"] == "pending")
        check("bot offers the right number among two decoys plus 'not me'",
              start["match_code"] in buttons and len(set(buttons) - {"no"}) == 3 and "no" in buttons,
              str(buttons))

        wrong = next(b for b in buttons if b not in ("no", start["match_code"]))
        cb = await tap(start["code"], wrong)
        check("a wrong number refuses the login", "bekor" in cb.message.sent[-1][0].lower())
        await tap(start["code"], start["match_code"])
        check("a burned code cannot be approved afterwards, and the screen hears why",
              (await c.get(f"/api/auth/poll?code={start['code']}")).json()["status"] == "refused")

        start = (await c.post("/api/auth/start")).json()
        await open_link(start["code"])
        await tap(start["code"], "no")
        check("'not me' kills the code",
              (await c.get(f"/api/auth/poll?code={start['code']}")).json()["status"] == "refused")

        start = (await c.post("/api/auth/start")).json()
        await open_link(start["code"])
        cb = await tap(start["code"], start["match_code"])
        polled = (await c.get(f"/api/auth/poll?code={start['code']}")).json()
        check("the right number logs the person in",
              polled["status"] == "ok" and polled["user"]["id"] == 555004, str(polled))

        # --- rate limit keys on the proxy-appended address, not the client's ---
        ratelimit.reset()
        codes = []
        for i in range(21):
            r = await c.post("/api/auth/start",
                             headers={"X-Forwarded-For": f"10.0.0.{i}, 203.0.113.7"})
            codes.append(r.status_code)
        check("spoofed X-Forwarded-For entries do not reset the rate limit",
              codes[-1] == 429, str(codes[-3:]))
        ratelimit.reset()

        # --- seller pages only for sellers ---
        r = await c.get("/api/sellers/777")
        check("a user with no listings (the admin) has no public page", r.status_code == 404)
        r = await c.get("/api/sellers/555004")
        check("a buyer who signed in has no public page", r.status_code == 404)

        # --- ids that do not fit Postgres INTEGER are not a 500 ---
        r = await c.get(f"/api/listings?ids={listing_id},99999999999&include_sold=true")
        check("oversized id in ?ids= is ignored", r.status_code == 200
              and [i["id"] for i in r.json()["items"]] == [listing_id], r.text[:100])
        check("oversized listing id in the path -> 422",
              (await c.get("/api/listings/3000000000")).status_code == 422)
        check("oversized favourite id -> 422",
              (await c.put("/api/my/favorites/3000000000", headers=H)).status_code == 422)
        r = await c.post("/api/my/favorites/sync", headers=H, json={"ids": [3000000000, listing_id]})
        check("favourite sync skips oversized ids", r.status_code == 200 and listing_id in r.json())

        # --- whitespace is not a title ---
        r = await c.post("/api/my/listings", headers=H, json={
            "title": "   ", "category": "fruits", "price": 1000, "region": "samarkand"})
        check("whitespace-only title rejected", r.status_code == 422)
        r = await c.patch(f"/api/my/listings/{edit_id}", headers=H, json={"title": " a "})
        check("one-letter title after stripping rejected", r.status_code == 422)

        # --- a replaced photo gets a new URL (the old one is cached a week) ---
        async with session_factory() as s:
            row = await s.get(Listing, listing_id)
            row.photo_file_id = "AgACfirst"
            await s.commit()
        first_url = (await c.get(f"/api/listings/{listing_id}?count_view=false")).json()["photo"]
        async with session_factory() as s:
            row = await s.get(Listing, listing_id)
            row.photo_file_id = "AgACsecond"
            await s.commit()
        second_url = (await c.get(f"/api/listings/{listing_id}?count_view=false")).json()["photo"]
        check("photo URL is versioned and changes with the photo",
              "?v=" in first_url and first_url != second_url, f"{first_url} {second_url}")
        async with session_factory() as s:
            row = await s.get(Listing, listing_id)
            row.photo_file_id = None
            await s.commit()

        # --- stored phones are normalised, so returning growers are matched ---
        async with session_factory() as s:
            s.add(User(id=-9001, full_name="Eski yozuv", phone="+905556677", language="uz"))
            await s.commit()
        await init_db()
        async with session_factory() as s:
            old = await s.get(User, -9001)
            check("legacy '+9 digits' phone rewritten to +998 on start-up",
                  old.phone == "+998905556677", old.phone)
            from app.db.queries import get_or_create_offline_seller as offline

            again = await offline(s, "Eski yozuv", "90 555 66 77")
            check("the same grower typed again is matched, not duplicated", again.id == -9001)

        # --- a listing phone typed without +998 is stored canonical and dials Uzbekistan ---
        r = await c.patch(f"/api/my/listings/{listing_id}", headers=H,
                          json={"phone": "90 765 43 21", "whatsapp": "(90) 765-43-21"})
        body = r.json()
        check("listing phone typed as '90 765 43 21' stored as +998…",
              r.status_code == 200 and body.get("phone") == "+998907654321", body.get("phone"))
        r = await c.post(f"/api/listings/{listing_id}/contact?channel=call")
        cj = r.json()
        check("contact links dial +998, not +90 (Turkey)",
              cj.get("tel_link") == "tel:+998907654321"
              and cj.get("whatsapp_link") == "https://wa.me/998907654321", str(cj))
        async with session_factory() as s:
            row = await s.get(Listing, listing_id)
            row.phone, row.whatsapp = "+907654321", "90 765 43 21"
            await s.commit()
        await init_db()
        async with session_factory() as s:
            row = await s.get(Listing, listing_id)
            check("legacy listing phone and WhatsApp rewritten on start-up",
                  (row.phone, row.whatsapp) == ("+998907654321", "+998907654321"),
                  f"{row.phone} {row.whatsapp}")

        notify.send_background = real_send

        # --------------------------------------------------------- logout ---
        # Two devices for the same person: signing out of one keeps the other.
        async with session_factory() as s:
            code = AuthCode.new()
            code.approved, code.user_id = True, 555001
            s.add(code)
            await s.commit()
            phone_code = code.code
        PH = {"Authorization": f"Bearer {(await c.get(f'/api/auth/poll?code={phone_code}')).json()['token']}"}

        r = await c.post("/api/auth/logout", headers=H)
        check("logout works", r.status_code == 200)
        r = await c.get("/api/auth/me", headers=H)
        check("token dead after logout", r.status_code == 401)
        r = await c.get("/api/auth/me", headers=PH)
        check("logging out on the web keeps the phone app signed in", r.status_code == 200)
        await c.post("/api/auth/logout?everywhere=true", headers=PH)
        check("logout everywhere ends every session",
              (await c.get("/api/auth/me", headers=PH)).status_code == 401)

    from app.api import notify as _notify
    await _notify.close_bot()

    print("\n" + "=" * 62)
    print(f"  {len(PASS)} passed, {len(FAIL)} failed")
    if FAIL:
        print("  failed: " + ", ".join(FAIL))
    print("=" * 62)
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
