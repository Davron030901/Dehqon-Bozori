"""Static reference data for the marketplace.

Categories, regions and units, each with Uzbek (uz) and Russian (ru) labels.
Keys are stable English slugs and are what gets stored in the database, so the
display language can change without touching any rows.
"""
from __future__ import annotations

# slug -> {uz, ru, emoji}
CATEGORIES: dict[str, dict[str, str]] = {
    "vegetables": {"uz": "Sabzavotlar", "ru": "Овощи", "emoji": "🥕"},
    "fruits": {"uz": "Mevalar", "ru": "Фрукты", "emoji": "🍎"},
    "melons": {"uz": "Poliz mahsulotlari", "ru": "Бахчевые", "emoji": "🍉"},
    "greens": {"uz": "Ko'katlar", "ru": "Зелень", "emoji": "🌿"},
    "grains": {"uz": "Don va dukkaklilar", "ru": "Зерно и крупы", "emoji": "🌾"},
    "dried": {"uz": "Quruq meva va yong'oq", "ru": "Сухофрукты и орехи", "emoji": "🥜"},
    "dairy": {"uz": "Sut mahsulotlari", "ru": "Молочные продукты", "emoji": "🥛"},
    "meat": {"uz": "Go'sht va parranda", "ru": "Мясо и птица", "emoji": "🍖"},
    "honey": {"uz": "Asal va asalarichilik", "ru": "Мёд и пчеловодство", "emoji": "🍯"},
    "seedlings": {"uz": "Urug' va ko'chat", "ru": "Семена и саженцы", "emoji": "🌱"},
    "other": {"uz": "Boshqa", "ru": "Прочее", "emoji": "📦"},
}

# slug -> {uz, ru}  (14 administrative regions of Uzbekistan)
REGIONS: dict[str, dict[str, str]] = {
    "andijan": {"uz": "Andijon", "ru": "Андижан"},
    "bukhara": {"uz": "Buxoro", "ru": "Бухара"},
    "fergana": {"uz": "Farg'ona", "ru": "Фергана"},
    "jizzakh": {"uz": "Jizzax", "ru": "Джизак"},
    "kashkadarya": {"uz": "Qashqadaryo", "ru": "Кашкадарья"},
    "navoiy": {"uz": "Navoiy", "ru": "Навои"},
    "namangan": {"uz": "Namangan", "ru": "Наманган"},
    "samarkand": {"uz": "Samarqand", "ru": "Самарканд"},
    "surkhandarya": {"uz": "Surxondaryo", "ru": "Сурхандарья"},
    "syrdarya": {"uz": "Sirdaryo", "ru": "Сырдарья"},
    "tashkent_region": {"uz": "Toshkent viloyati", "ru": "Ташкентская область"},
    "tashkent_city": {"uz": "Toshkent shahri", "ru": "город Ташкент"},
    "khorezm": {"uz": "Xorazm", "ru": "Хорезм"},
    "karakalpakstan": {"uz": "Qoraqalpog'iston", "ru": "Каракалпакстан"},
}

# slug -> {uz, ru}
UNITS: dict[str, dict[str, str]] = {
    "kg": {"uz": "kg", "ru": "кг"},
    "ton": {"uz": "tonna", "ru": "тонна"},
    "piece": {"uz": "dona", "ru": "шт"},
    "bunch": {"uz": "bog'", "ru": "пучок"},
    "sack": {"uz": "qop", "ru": "мешок"},
    "box": {"uz": "yashik", "ru": "ящик"},
    "liter": {"uz": "litr", "ru": "литр"},
}


def _pick(mapping: dict[str, dict[str, str]], key: str, lang: str) -> str:
    item = mapping.get(key)
    if not item:
        return key
    return item.get(lang) or item.get("uz") or key


def category_label(key: str, lang: str, with_emoji: bool = True) -> str:
    item = CATEGORIES.get(key)
    if not item:
        return key
    text = item.get(lang) or item["uz"]
    return f'{item["emoji"]} {text}' if with_emoji else text


def region_label(key: str, lang: str) -> str:
    return _pick(REGIONS, key, lang)


def unit_label(key: str, lang: str) -> str:
    return _pick(UNITS, key, lang)
