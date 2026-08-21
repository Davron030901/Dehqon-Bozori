"""Seed the database with demo data.

Creates one demo seller per region and inserts 10 products for every category
(11 categories x 10 = 110 active listings), spread across all 14 regions
(Karakalpakstan included).

Run:  python seed.py
Re-runnable: it removes its own previous demo data first (demo sellers use
negative ids, so real users are never touched).
"""
from __future__ import annotations

import asyncio
import random

from sqlalchemy import delete, select

from app.catalog import REGIONS
from app.config import settings
from app.db.database import Favorite, Listing, User, init_db, session_factory

random.seed(2026)  # reproducible output

# Demo sellers get negative ids so they can never collide with real Telegram ids.
DEMO_ID_BASE = -1000

# (title, unit_slug, price, quantity_text)  — 10 per category.
PRODUCTS: dict[str, list[tuple[str, str, int, str]]] = {
    "vegetables": [
        ("Pomidor", "kg", 9000, "500 kg"),
        ("Bodring", "kg", 8000, "400 kg"),
        ("Kartoshka", "kg", 5500, "2 tonna"),
        ("Sabzi", "kg", 5000, "800 kg"),
        ("Piyoz", "kg", 4500, "1.5 tonna"),
        ("Bulg'or qalampiri", "kg", 12000, "300 kg"),
        ("Baqlajon", "kg", 9000, "250 kg"),
        ("Oq karam", "kg", 4000, "1 tonna"),
        ("Turp", "kg", 5000, "200 kg"),
        ("Lavlagi", "kg", 4500, "300 kg"),
    ],
    "fruits": [
        ("Olma", "kg", 12000, "1 tonna"),
        ("Nok", "kg", 18000, "400 kg"),
        ("Shaftoli", "kg", 20000, "500 kg"),
        ("O'rik", "kg", 16000, "300 kg"),
        ("Gilos", "kg", 35000, "200 kg"),
        ("Olcha", "kg", 22000, "150 kg"),
        ("Uzum", "kg", 15000, "800 kg"),
        ("Anor", "kg", 18000, "600 kg"),
        ("Xurmo", "kg", 17000, "400 kg"),
        ("Behi", "kg", 13000, "200 kg"),
    ],
    "melons": [
        ("Tarvuz", "kg", 4000, "3 tonna"),
        ("Qovun (Mirzacho'l)", "kg", 6000, "2 tonna"),
        ("Qovun (Gulobi)", "kg", 7000, "1 tonna"),
        ("Handalak", "piece", 15000, "500 dona"),
        ("Oshqovoq", "kg", 5000, "800 kg"),
        ("Asal qovun", "kg", 8000, "600 kg"),
        ("Urug'siz tarvuz", "kg", 5000, "1 tonna"),
        ("Qiziltepa qovuni", "kg", 9000, "400 kg"),
        ("Bekzodi qovun", "piece", 25000, "300 dona"),
        ("Beshqapa qovuni", "kg", 8500, "500 kg"),
    ],
    "greens": [
        ("Ko'k piyoz", "bunch", 3000, "200 bog'"),
        ("Rayhon", "bunch", 2500, "150 bog'"),
        ("Kashnich", "bunch", 2500, "150 bog'"),
        ("Shivit", "bunch", 2500, "150 bog'"),
        ("Petrushka", "bunch", 2500, "150 bog'"),
        ("Yalpiz", "bunch", 3000, "100 bog'"),
        ("Ismaloq", "kg", 8000, "100 kg"),
        ("Salat bargi", "kg", 10000, "80 kg"),
        ("Selderey", "bunch", 3500, "100 bog'"),
        ("Ko'k jambil", "bunch", 3000, "80 bog'"),
    ],
    "grains": [
        ("Bug'doy", "kg", 4500, "10 tonna"),
        ("Guruch (lazer)", "kg", 16000, "3 tonna"),
        ("Makkajo'xori", "kg", 4000, "5 tonna"),
        ("Arpa", "kg", 3500, "8 tonna"),
        ("Loviya", "kg", 18000, "1 tonna"),
        ("No'xat", "kg", 15000, "800 kg"),
        ("Mosh", "kg", 22000, "500 kg"),
        ("Yasmiq", "kg", 14000, "400 kg"),
        ("Tariq", "kg", 6000, "1 tonna"),
        ("Suli", "kg", 5000, "2 tonna"),
    ],
    "dried": [
        ("Mayiz", "kg", 35000, "500 kg"),
        ("O'rik qoqi (turshak)", "kg", 45000, "300 kg"),
        ("Bodom", "kg", 90000, "200 kg"),
        ("Yong'oq", "kg", 65000, "300 kg"),
        ("Pista", "kg", 130000, "150 kg"),
        ("Yeryong'oq", "kg", 30000, "400 kg"),
        ("Anjir qoqi", "kg", 55000, "100 kg"),
        ("Quruq xurmo", "kg", 40000, "200 kg"),
        ("Findiq", "kg", 85000, "100 kg"),
        ("Kunjut", "kg", 28000, "150 kg"),
    ],
    "dairy": [
        ("Sut", "liter", 8000, "200 litr"),
        ("Qatiq", "liter", 12000, "100 litr"),
        ("Suzma", "kg", 25000, "80 kg"),
        ("Qaymoq", "kg", 40000, "50 kg"),
        ("Pishloq", "kg", 55000, "100 kg"),
        ("Sariyog'", "kg", 80000, "60 kg"),
        ("Ayron", "liter", 7000, "150 litr"),
        ("Kefir", "liter", 11000, "100 litr"),
        ("Qurt", "kg", 35000, "50 kg"),
        ("Tvorog", "kg", 28000, "80 kg"),
    ],
    "meat": [
        ("Mol go'shti", "kg", 85000, "300 kg"),
        ("Qo'y go'shti", "kg", 100000, "200 kg"),
        ("Tovuq go'shti", "kg", 38000, "500 kg"),
        ("Echki go'shti", "kg", 90000, "100 kg"),
        ("Qazi (ot go'shti)", "kg", 150000, "80 kg"),
        ("Quyon go'shti", "kg", 60000, "100 kg"),
        ("Kurka go'shti", "kg", 55000, "150 kg"),
        ("Tovuq tuxumi", "piece", 1200, "5000 dona"),
        ("Bedana tuxumi", "piece", 1500, "3000 dona"),
        ("O'rdak go'shti", "kg", 50000, "100 kg"),
    ],
    "honey": [
        ("Tog' asali", "kg", 95000, "200 kg"),
        ("Oq asal", "kg", 110000, "100 kg"),
        ("Yantoq asali", "kg", 90000, "150 kg"),
        ("Esparset asali", "kg", 100000, "120 kg"),
        ("Kungaboqar asali", "kg", 70000, "300 kg"),
        ("Akatsiya asali", "kg", 120000, "100 kg"),
        ("Asalari mumi", "kg", 60000, "50 kg"),
        ("Perga (asalari noni)", "kg", 200000, "30 kg"),
        ("Propolis", "kg", 250000, "20 kg"),
        ("Gul changi", "kg", 150000, "40 kg"),
    ],
    "seedlings": [
        ("Pomidor ko'chati", "piece", 1500, "5000 dona"),
        ("Olma ko'chati", "piece", 20000, "1000 dona"),
        ("Uzum ko'chati", "piece", 15000, "800 dona"),
        ("Bodom ko'chati", "piece", 25000, "500 dona"),
        ("O'rik ko'chati", "piece", 18000, "600 dona"),
        ("Sabzavot urug'i (to'plam)", "piece", 8000, "1000 dona"),
        ("Atirgul ko'chati", "piece", 12000, "700 dona"),
        ("Yong'oq ko'chati", "piece", 30000, "400 dona"),
        ("Anor ko'chati", "piece", 22000, "500 dona"),
        ("Gul ko'chati", "piece", 7000, "1000 dona"),
    ],
    "other": [
        ("Uy murabbosi", "liter", 35000, "100 litr"),
        ("Tomat pastasi", "kg", 25000, "200 kg"),
        ("Qovurma go'sht", "kg", 120000, "50 kg"),
        ("Uzum sirkasi", "liter", 15000, "150 litr"),
        ("Paxta moyi", "liter", 22000, "500 litr"),
        ("Bug'doy uni", "kg", 6000, "2 tonna"),
        ("Quritilgan ko'katlar", "kg", 40000, "50 kg"),
        ("Tabiiy meva sharbati", "liter", 18000, "200 litr"),
        ("Qovun qoqi", "kg", 50000, "80 kg"),
        ("Yong'oq-mayiz aralashmasi", "kg", 70000, "100 kg"),
    ],
}

DESCRIPTIONS = [
    "Yangi va tabiiy {title}. To'g'ridan-to'g'ri dehqondan.",
    "Sifatli {title}. Bog'imizdan terilgan, kimyoviy o'g'itsiz.",
    "Ekologik toza {title}. Optom va chakana sotiladi.",
    "Mahalliy yetishtirilgan {title}. Narx kelishilgan holda.",
    "Yangi hosil {title}. Yetkazib berish mavjud.",
]


async def seed() -> None:
    await init_db()
    region_slugs = list(REGIONS.keys())
    demo_ids = [DEMO_ID_BASE - (i + 1) for i in range(len(region_slugs))]
    # region slug -> (demo seller id, phone)
    seller_of_region: dict[str, tuple[int, str]] = {}

    async with session_factory() as s:
        # 1) Remove previous demo data (favorites -> listings -> users).
        old_ids = (
            await s.execute(select(Listing.id).where(Listing.seller_id.in_(demo_ids)))
        ).scalars().all()
        if old_ids:
            await s.execute(delete(Favorite).where(Favorite.listing_id.in_(old_ids)))
        await s.execute(delete(Listing).where(Listing.seller_id.in_(demo_ids)))
        await s.execute(delete(User).where(User.id.in_(demo_ids)))
        await s.commit()

        # 2) One demo seller per region.
        for i, slug in enumerate(region_slugs):
            uid = demo_ids[i]
            phone = f"+99890{1234500 + i:07d}"
            s.add(
                User(
                    id=uid,
                    username=f"dehqon_{slug}",
                    full_name=f"Dehqon — {REGIONS[slug]['uz']}",
                    phone=phone,
                    language="uz",
                )
            )
            seller_of_region[slug] = (uid, phone)
        await s.commit()

        # 3) Build a region assignment that covers every region.
        tiles = (len(PRODUCTS) * 10) // len(region_slugs) + 1
        region_pool = (region_slugs * tiles)[: len(PRODUCTS) * 10]
        random.shuffle(region_pool)

        # 4) Insert listings.
        idx = 0
        for category, items in PRODUCTS.items():
            for title, unit, price, qty in items:
                slug = region_pool[idx]
                seller_id, phone = seller_of_region[slug]
                s.add(
                    Listing(
                        seller_id=seller_id,
                        title=title,
                        category=category,
                        description=random.choice(DESCRIPTIONS).format(title=title.lower()),
                        price=price,
                        currency=settings.default_currency,
                        unit=unit,
                        quantity=qty,
                        region=slug,
                        district=None,
                        photo_file_id=None,
                        phone=phone,
                        status="active",
                    )
                )
                idx += 1
        await s.commit()

        # 5) Summary.
        total = (
            await s.execute(select(Listing.id).where(Listing.seller_id.in_(demo_ids)))
        ).scalars().all()
        print(f"✅ Demo sellers: {len(region_slugs)}")
        print(f"✅ Listings inserted: {len(total)} ({len(PRODUCTS)} categories x 10)")
        print(f"✅ Regions covered: {len(set(region_pool))}/{len(region_slugs)}")


if __name__ == "__main__":
    asyncio.run(seed())