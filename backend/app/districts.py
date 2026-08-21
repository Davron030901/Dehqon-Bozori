"""O'zbekiston tumanlari va shaharlari — viloyatlar bo'yicha.

Manba: O'zbekiston Respublikasi Davlat statistika qo'mitasining ma'muriy-hududiy
bo'linish klassifikatori (SOATO/MHOBT) asosidagi ochiq ma'lumotlar, 2026-yil
holatiga ko'ra 175 ta tuman.

Kalitlar — barqaror inglizcha slug'lar; bazaga aynan shular yoziladi, shuning
uchun ko'rsatiladigan nomni istalgan vaqtda o'zgartirish mumkin, ma'lumot esa
joyida qoladi. Bu `catalog.py` dagi CATEGORIES va REGIONS bilan bir xil qoida.

`type` maydoni ikki qiymat oladi:
  * "city"     — viloyat markazi yoki viloyatga bo'ysunuvchi shahar
  * "district" — tuman

Shaharlar ro'yxatning boshida turadi, chunki dehqonlarning aksariyati o'z
mahsulotini eng yaqin shahar bozoriga olib chiqadi va ro'yxatdan birinchi
navbatda o'shani qidiradi.

TIL HAQIDA: joy nomlari faqat o'zbekcha (lotin) berilgan. Ularning ruscha
shakllari uchun ishonchli yagona manba yo'q va 175 ta nomni taxminan
tarjima qilish — ruscha so'zlashuvchi savdogarga noto'g'ri nom ko'rsatishdan
boshqa narsa emas. Joy nomlari ikkala tilda ham shu ko'rinishda beriladi.
"""
from __future__ import annotations

# region slug -> [{key, uz, type}]
DISTRICTS: dict[str, list[dict[str, str]]] = {
    # ---------------------------------------------------------------- 1 ----
    "karakalpakstan": [
        {"key": "nukus_city", "uz": "Nukus shahri", "type": "city"},
        {"key": "amudaryo", "uz": "Amudaryo", "type": "district"},
        {"key": "beruniy", "uz": "Beruniy", "type": "district"},
        {"key": "bozatov", "uz": "Bo'zatov", "type": "district"},
        {"key": "chimboy", "uz": "Chimboy", "type": "district"},
        {"key": "ellikqala", "uz": "Ellikqal'a", "type": "district"},
        {"key": "kegeyli", "uz": "Kegeyli", "type": "district"},
        {"key": "moynoq", "uz": "Mo'ynoq", "type": "district"},
        {"key": "nukus_district", "uz": "Nukus tumani", "type": "district"},
        {"key": "qanlikol", "uz": "Qanliko'l", "type": "district"},
        {"key": "qongirot", "uz": "Qo'ng'irot", "type": "district"},
        {"key": "qoraozak", "uz": "Qorao'zak", "type": "district"},
        {"key": "shumanay", "uz": "Shumanay", "type": "district"},
        {"key": "taxiatosh", "uz": "Taxiatosh", "type": "district"},
        {"key": "taxtakopir", "uz": "Taxtako'pir", "type": "district"},
        {"key": "tortkol", "uz": "To'rtko'l", "type": "district"},
        {"key": "xojayli", "uz": "Xo'jayli", "type": "district"},
    ],
    # ---------------------------------------------------------------- 2 ----
    "khorezm": [
        {"key": "urganch_city", "uz": "Urganch shahri", "type": "city"},
        {"key": "xiva_city", "uz": "Xiva shahri", "type": "city"},
        {"key": "bogot", "uz": "Bog'ot", "type": "district"},
        {"key": "gurlan", "uz": "Gurlan", "type": "district"},
        {"key": "hazorasp", "uz": "Hazorasp", "type": "district"},
        {"key": "khiva_district", "uz": "Xiva tumani", "type": "district"},
        {"key": "qoshkopir", "uz": "Qo'shko'pir", "type": "district"},
        {"key": "shovot", "uz": "Shovot", "type": "district"},
        {"key": "tuproqqala", "uz": "Tuproqqal'a", "type": "district"},
        {"key": "urganch_district", "uz": "Urganch tumani", "type": "district"},
        {"key": "xonqa", "uz": "Xonqa", "type": "district"},
        {"key": "yangiariq", "uz": "Yangiariq", "type": "district"},
        {"key": "yangibozor_kh", "uz": "Yangibozor", "type": "district"},
    ],
    # ---------------------------------------------------------------- 3 ----
    "navoiy": [
        {"key": "navoiy_city", "uz": "Navoiy shahri", "type": "city"},
        {"key": "zarafshon_city", "uz": "Zarafshon shahri", "type": "city"},
        {"key": "gozgon_city", "uz": "G'ozg'on shahri", "type": "city"},
        {"key": "karmana", "uz": "Karmana", "type": "district"},
        {"key": "konimex", "uz": "Konimex", "type": "district"},
        {"key": "navbahor", "uz": "Navbahor", "type": "district"},
        {"key": "nurota", "uz": "Nurota", "type": "district"},
        {"key": "qiziltepa", "uz": "Qiziltepa", "type": "district"},
        {"key": "tomdi", "uz": "Tomdi", "type": "district"},
        {"key": "uchquduq", "uz": "Uchquduq", "type": "district"},
        {"key": "xatirchi", "uz": "Xatirchi", "type": "district"},
    ],
    # ---------------------------------------------------------------- 4 ----
    "bukhara": [
        {"key": "bukhara_city", "uz": "Buxoro shahri", "type": "city"},
        {"key": "kogon_city", "uz": "Kogon shahri", "type": "city"},
        {"key": "bukhara_district", "uz": "Buxoro tumani", "type": "district"},
        {"key": "gijduvon", "uz": "G'ijduvon", "type": "district"},
        {"key": "jondor", "uz": "Jondor", "type": "district"},
        {"key": "kogon_district", "uz": "Kogon tumani", "type": "district"},
        {"key": "olot", "uz": "Olot", "type": "district"},
        {"key": "peshku", "uz": "Peshku", "type": "district"},
        {"key": "qorakol", "uz": "Qorako'l", "type": "district"},
        {"key": "qorovulbozor", "uz": "Qorovulbozor", "type": "district"},
        {"key": "romitan", "uz": "Romitan", "type": "district"},
        {"key": "shofirkon", "uz": "Shofirkon", "type": "district"},
        {"key": "vobkent", "uz": "Vobkent", "type": "district"},
    ],
    # ---------------------------------------------------------------- 5 ----
    "samarkand": [
        {"key": "samarkand_city", "uz": "Samarqand shahri", "type": "city"},
        {"key": "kattaqorgon_city", "uz": "Kattaqo'rg'on shahri", "type": "city"},
        {"key": "bulungur", "uz": "Bulung'ur", "type": "district"},
        {"key": "ishtixon", "uz": "Ishtixon", "type": "district"},
        {"key": "jomboy", "uz": "Jomboy", "type": "district"},
        {"key": "kattaqorgon_district", "uz": "Kattaqo'rg'on tumani", "type": "district"},
        {"key": "narpay", "uz": "Narpay", "type": "district"},
        {"key": "nurobod", "uz": "Nurobod", "type": "district"},
        {"key": "oqdaryo", "uz": "Oqdaryo", "type": "district"},
        {"key": "pastdargom", "uz": "Pastdarg'om", "type": "district"},
        {"key": "paxtachi", "uz": "Paxtachi", "type": "district"},
        {"key": "payariq", "uz": "Payariq", "type": "district"},
        {"key": "qoshrabot", "uz": "Qo'shrabot", "type": "district"},
        {"key": "samarkand_district", "uz": "Samarqand tumani", "type": "district"},
        {"key": "toyloq", "uz": "Toyloq", "type": "district"},
        {"key": "urgut", "uz": "Urgut", "type": "district"},
    ],
    # ---------------------------------------------------------------- 6 ----
    "kashkadarya": [
        {"key": "qarshi_city", "uz": "Qarshi shahri", "type": "city"},
        {"key": "shahrisabz_city", "uz": "Shahrisabz shahri", "type": "city"},
        {"key": "chiroqchi", "uz": "Chiroqchi", "type": "district"},
        {"key": "dehqonobod", "uz": "Dehqonobod", "type": "district"},
        {"key": "guzor", "uz": "G'uzor", "type": "district"},
        {"key": "kasbi", "uz": "Kasbi", "type": "district"},
        {"key": "kitob", "uz": "Kitob", "type": "district"},
        {"key": "koson", "uz": "Koson", "type": "district"},
        {"key": "mirishkor", "uz": "Mirishkor", "type": "district"},
        {"key": "muborak", "uz": "Muborak", "type": "district"},
        {"key": "nishon", "uz": "Nishon", "type": "district"},
        {"key": "qamashi", "uz": "Qamashi", "type": "district"},
        {"key": "qarshi_district", "uz": "Qarshi tumani", "type": "district"},
        {"key": "shahrisabz_district", "uz": "Shahrisabz tumani", "type": "district"},
        {"key": "yakkabog", "uz": "Yakkabog'", "type": "district"},
    ],
    # ---------------------------------------------------------------- 7 ----
    "surkhandarya": [
        {"key": "termiz_city", "uz": "Termiz shahri", "type": "city"},
        {"key": "angor", "uz": "Angor", "type": "district"},
        {"key": "bandixon", "uz": "Bandixon", "type": "district"},
        {"key": "boysun", "uz": "Boysun", "type": "district"},
        {"key": "denov", "uz": "Denov", "type": "district"},
        {"key": "jarqorgon", "uz": "Jarqo'rg'on", "type": "district"},
        {"key": "muzrabot", "uz": "Muzrabot", "type": "district"},
        {"key": "oltinsoy", "uz": "Oltinsoy", "type": "district"},
        {"key": "qiziriq", "uz": "Qiziriq", "type": "district"},
        {"key": "qumqorgon", "uz": "Qumqo'rg'on", "type": "district"},
        {"key": "sariosiyo", "uz": "Sariosiyo", "type": "district"},
        {"key": "sherobod", "uz": "Sherobod", "type": "district"},
        {"key": "shorchi", "uz": "Sho'rchi", "type": "district"},
        {"key": "termiz_district", "uz": "Termiz tumani", "type": "district"},
        {"key": "uzun", "uz": "Uzun", "type": "district"},
    ],
    # ---------------------------------------------------------------- 8 ----
    "jizzakh": [
        {"key": "jizzakh_city", "uz": "Jizzax shahri", "type": "city"},
        {"key": "arnasoy", "uz": "Arnasoy", "type": "district"},
        {"key": "baxmal", "uz": "Baxmal", "type": "district"},
        {"key": "dostlik", "uz": "Do'stlik", "type": "district"},
        {"key": "forish", "uz": "Forish", "type": "district"},
        {"key": "gallaorol", "uz": "G'allaorol", "type": "district"},
        {"key": "mirzachol", "uz": "Mirzacho'l", "type": "district"},
        {"key": "paxtakor", "uz": "Paxtakor", "type": "district"},
        {"key": "sharof_rashidov", "uz": "Sharof Rashidov", "type": "district"},
        {"key": "yangiobod", "uz": "Yangiobod", "type": "district"},
        {"key": "zafarobod", "uz": "Zafarobod", "type": "district"},
        {"key": "zarbdor", "uz": "Zarbdor", "type": "district"},
        {"key": "zomin", "uz": "Zomin", "type": "district"},
    ],
    # ---------------------------------------------------------------- 9 ----
    "syrdarya": [
        {"key": "guliston_city", "uz": "Guliston shahri", "type": "city"},
        {"key": "shirin_city", "uz": "Shirin shahri", "type": "city"},
        {"key": "yangiyer_city", "uz": "Yangiyer shahri", "type": "city"},
        {"key": "boyovut", "uz": "Boyovut", "type": "district"},
        {"key": "guliston_district", "uz": "Guliston tumani", "type": "district"},
        {"key": "mirzaobod", "uz": "Mirzaobod", "type": "district"},
        {"key": "oqoltin", "uz": "Oqoltin", "type": "district"},
        {"key": "sardoba", "uz": "Sardoba", "type": "district"},
        {"key": "sayxunobod", "uz": "Sayxunobod", "type": "district"},
        {"key": "syrdarya_district", "uz": "Sirdaryo tumani", "type": "district"},
        {"key": "xovos", "uz": "Xovos", "type": "district"},
    ],
    # --------------------------------------------------------------- 10 ----
    "tashkent_region": [
        {"key": "nurafshon_city", "uz": "Nurafshon shahri", "type": "city"},
        {"key": "angren_city", "uz": "Angren shahri", "type": "city"},
        {"key": "bekobod_city", "uz": "Bekobod shahri", "type": "city"},
        {"key": "chirchiq_city", "uz": "Chirchiq shahri", "type": "city"},
        {"key": "olmaliq_city", "uz": "Olmaliq shahri", "type": "city"},
        {"key": "ohangaron_city", "uz": "Ohangaron shahri", "type": "city"},
        {"key": "yangiyol_city", "uz": "Yangiyo'l shahri", "type": "city"},
        {"key": "bekobod_district", "uz": "Bekobod tumani", "type": "district"},
        {"key": "boka", "uz": "Bo'ka", "type": "district"},
        {"key": "bostonliq", "uz": "Bo'stonliq", "type": "district"},
        {"key": "chinoz", "uz": "Chinoz", "type": "district"},
        {"key": "ohangaron_district", "uz": "Ohangaron tumani", "type": "district"},
        {"key": "oqqorgon", "uz": "Oqqo'rg'on", "type": "district"},
        {"key": "ortachirchiq", "uz": "O'rtachirchiq", "type": "district"},
        {"key": "parkent", "uz": "Parkent", "type": "district"},
        {"key": "piskent", "uz": "Piskent", "type": "district"},
        {"key": "qibray", "uz": "Qibray", "type": "district"},
        {"key": "quyichirchiq", "uz": "Quyichirchiq", "type": "district"},
        {"key": "tashkent_district", "uz": "Toshkent tumani", "type": "district"},
        {"key": "yangiyol_district", "uz": "Yangiyo'l tumani", "type": "district"},
        {"key": "yuqorichirchiq", "uz": "Yuqorichirchiq", "type": "district"},
        {"key": "zangiota", "uz": "Zangiota", "type": "district"},
    ],
    # --------------------------------------------------------------- 11 ----
    "namangan": [
        {"key": "namangan_city", "uz": "Namangan shahri", "type": "city"},
        {"key": "chortoq", "uz": "Chortoq", "type": "district"},
        {"key": "chust", "uz": "Chust", "type": "district"},
        {"key": "kosonsoy", "uz": "Kosonsoy", "type": "district"},
        {"key": "mingbuloq", "uz": "Mingbuloq", "type": "district"},
        {"key": "namangan_district", "uz": "Namangan tumani", "type": "district"},
        {"key": "norin", "uz": "Norin", "type": "district"},
        {"key": "pop", "uz": "Pop", "type": "district"},
        {"key": "toraqorgon", "uz": "To'raqo'rg'on", "type": "district"},
        {"key": "uchqorgon", "uz": "Uchqo'rg'on", "type": "district"},
        {"key": "uychi", "uz": "Uychi", "type": "district"},
        {"key": "yangiqorgon", "uz": "Yangiqo'rg'on", "type": "district"},
    ],
    # --------------------------------------------------------------- 12 ----
    "fergana": [
        {"key": "fergana_city", "uz": "Farg'ona shahri", "type": "city"},
        {"key": "margilon_city", "uz": "Marg'ilon shahri", "type": "city"},
        {"key": "qoqon_city", "uz": "Qo'qon shahri", "type": "city"},
        {"key": "quvasoy_city", "uz": "Quvasoy shahri", "type": "city"},
        {"key": "bagdod", "uz": "Bag'dod", "type": "district"},
        {"key": "beshariq", "uz": "Beshariq", "type": "district"},
        {"key": "buvayda", "uz": "Buvayda", "type": "district"},
        {"key": "dangara", "uz": "Dang'ara", "type": "district"},
        {"key": "fergana_district", "uz": "Farg'ona tumani", "type": "district"},
        {"key": "furqat", "uz": "Furqat", "type": "district"},
        {"key": "oltiariq", "uz": "Oltiariq", "type": "district"},
        {"key": "qoshtepa", "uz": "Qo'shtepa", "type": "district"},
        {"key": "quva", "uz": "Quva", "type": "district"},
        {"key": "rishton", "uz": "Rishton", "type": "district"},
        {"key": "sox", "uz": "So'x", "type": "district"},
        {"key": "toshloq", "uz": "Toshloq", "type": "district"},
        {"key": "uchkoprik", "uz": "Uchko'prik", "type": "district"},
        {"key": "uzbekistan_district", "uz": "O'zbekiston tumani", "type": "district"},
        {"key": "yozyovon", "uz": "Yozyovon", "type": "district"},
    ],
    # --------------------------------------------------------------- 13 ----
    "andijan": [
        {"key": "andijan_city", "uz": "Andijon shahri", "type": "city"},
        {"key": "xonobod_city", "uz": "Xonobod shahri", "type": "city"},
        {"key": "andijan_district", "uz": "Andijon tumani", "type": "district"},
        {"key": "asaka", "uz": "Asaka", "type": "district"},
        {"key": "baliqchi", "uz": "Baliqchi", "type": "district"},
        {"key": "boston", "uz": "Bo'ston", "type": "district"},
        {"key": "buloqboshi", "uz": "Buloqboshi", "type": "district"},
        {"key": "izboskan", "uz": "Izboskan", "type": "district"},
        {"key": "jalaquduq", "uz": "Jalaquduq", "type": "district"},
        {"key": "marhamat", "uz": "Marhamat", "type": "district"},
        {"key": "oltinkol", "uz": "Oltinko'l", "type": "district"},
        {"key": "paxtaobod", "uz": "Paxtaobod", "type": "district"},
        {"key": "qorgontepa", "uz": "Qo'rg'ontepa", "type": "district"},
        {"key": "shahrixon", "uz": "Shahrixon", "type": "district"},
        {"key": "ulugnor", "uz": "Ulug'nor", "type": "district"},
        {"key": "xojaobod", "uz": "Xo'jaobod", "type": "district"},
    ],
    # --------------------------------------------------------------- 14 ----
    # Toshkent shahri — bu yerda "tuman" deganda shahar rayonlari tushuniladi.
    "tashkent_city": [
        {"key": "bektemir", "uz": "Bektemir", "type": "district"},
        {"key": "chilonzor", "uz": "Chilonzor", "type": "district"},
        {"key": "mirobod", "uz": "Mirobod", "type": "district"},
        {"key": "mirzo_ulugbek", "uz": "Mirzo Ulug'bek", "type": "district"},
        {"key": "olmazor", "uz": "Olmazor", "type": "district"},
        {"key": "sergeli", "uz": "Sergeli", "type": "district"},
        {"key": "shayxontohur", "uz": "Shayxontohur", "type": "district"},
        {"key": "uchtepa", "uz": "Uchtepa", "type": "district"},
        {"key": "yakkasaroy", "uz": "Yakkasaroy", "type": "district"},
        {"key": "yangihayot", "uz": "Yangihayot", "type": "district"},
        {"key": "yashnobod", "uz": "Yashnobod", "type": "district"},
        {"key": "yunusobod", "uz": "Yunusobod", "type": "district"},
    ],
}


# --------------------------------------------------------------------------- #
#  Qidiruv uchun tekis indeks
# --------------------------------------------------------------------------- #
# Tuman kalitidan viloyat kalitiga. E'lon saqlanganda tuman qaysi viloyatga
# tegishli ekanini tekshirish uchun — bu bo'lmasa "Urgut" ni "Xorazm" ga
# biriktirib yuborish mumkin va hech kim sezmaydi.
DISTRICT_TO_REGION: dict[str, str] = {
    item["key"]: region
    for region, items in DISTRICTS.items()
    for item in items
}

# Kalitdan ko'rsatiladigan nomga.
DISTRICT_NAMES: dict[str, str] = {
    item["key"]: item["uz"]
    for items in DISTRICTS.values()
    for item in items
}


def districts_of(region: str) -> list[dict[str, str]]:
    """Viloyatning tuman va shaharlari. Noma'lum viloyat uchun bo'sh ro'yxat."""
    return DISTRICTS.get(region, [])


def district_label(key: str | None, fallback: str | None = None) -> str:
    """Kalitni nomga aylantiradi.

    `fallback` — bazadagi eski erkin matnli qiymatlar uchun: tuman tanlash
    ro'yxati kiritilgunga qadar sotuvchilar tumanni qo'lda yozgan, va o'sha
    e'lonlar hali ham to'g'ri ko'rinishi kerak.
    """
    if not key:
        return fallback or ""
    return DISTRICT_NAMES.get(key) or fallback or key


def is_valid_district(key: str, region: str | None = None) -> bool:
    """Tuman mavjudmi, va berilgan viloyatga tegishlimi."""
    actual = DISTRICT_TO_REGION.get(key)
    if actual is None:
        return False
    return region is None or actual == region


def district_count() -> int:
    return len(DISTRICT_NAMES)
