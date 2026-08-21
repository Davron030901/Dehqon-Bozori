"""Internationalisation.\n\nTEXTS holds every user-facing string in Uzbek (uz) and Russian (ru).\nBTN holds the reply-keyboard button labels (matched by text in handlers).\nUse t(key, lang, **kwargs) to fetch and format a string.\n"""
from __future__ import annotations

TEXTS: dict[str, dict[str, str]] = {
    "uz": {
        # --- onboarding / common ---
        "choose_language": "🌐 Tilni tanlang / Выберите язык:",
        "language_set": "✅ Til o'rnatildi: O'zbekcha.",
        "main_menu_hint": "Asosiy menyu. Quyidagi tugmalardan birini tanlang 👇",
        "welcome_back": "Assalomu alaykum, {name}! 🌾\nDehqon Bozori — qishloq mahsulotlari bozoriga xush kelibsiz.",
        "help_text": (
            "🌾 <b>Dehqon Bozori</b> — qishloq mahsulotlarini sotuvchi va xaridorni bog'lovchi bot.\n\n"
            "➕ <b>E'lon berish</b> — mahsulotingizni soting (nomi, narxi, hududi, rasmi).\n"
            "🛒 <b>Xarid qilish</b> — kategoriya va hudud bo'yicha e'lonlarni ko'ring.\n"
            "🔍 <b>Qidirish</b> — nom bo'yicha qidiring.\n"
            "⭐ <b>Saralangan</b> — yoqqan e'lonlarni saqlang.\n"
            "📋 <b>E'lonlarim</b> — o'z e'lonlaringizni boshqaring.\n"
            "👤 <b>Profil</b> — til va telefon raqamingizni o'zgartiring.\n\n"
            "Buyruqlar: /start /help /cancel"
        ),
        "cancelled": "❌ Bekor qilindi.",
        "nothing_to_cancel": "Bekor qiladigan amal yo'q.",
        "unknown": "Tushunmadim. Iltimos, menyudan tanlang 👇",

        # --- website bridge ---
        "web_login_ok": (
            "✅ <b>Saytga kirdingiz!</b>\n\n"
            "Brauzerga qayting — sahifa o'zi ochiladi. "
            "Endi e'lonlaringizni saytdan ham qo'sha olasiz."
        ),
        "web_login_expired": (
            "⏰ Bu kirish havolasi eskirgan.\n\n"
            "Saytda «Telegram orqali kirish» tugmasini qaytadan bosing."
        ),
        "web_site_intro": (
            "🌐 <b>Dehqon Bozori sayti</b>\n\n"
            "Xaridorlar ro'yxatdan o'tmasdan e'lonlarni ko'radi va to'g'ridan-to'g'ri "
            "siz bilan bog'lanadi.\n\n{url}"
        ),
        "web_open_site": "🌐 Saytni ochish",
        "web_contact_alert": "🔔 Saytdan xaridor bog'lanmoqchi!",

        # --- selling ---
        "sell_choose_category": "🗂 Mahsulot kategoriyasini tanlang:",
        "sell_enter_title": "✏️ Mahsulot nomini yozing (masalan: <i>Yangi pomidor</i>):",
        "err_title": "Iltimos, nomni 2–100 belgida yozing.",
        "sell_enter_price": "💰 Narxni yozing (faqat raqam, masalan: <i>8000</i>):",
        "err_price": "Iltimos, narxni faqat raqam bilan yozing (masalan: 8000).",
        "sell_choose_unit": "⚖️ O'lchov birligini tanlang:",
        "sell_enter_quantity": "📦 Mavjud miqdorni yozing (masalan: <i>500 kg</i>) yoki o'tkazib yuboring:",
        "sell_choose_region": "📍 Hududni tanlang:",
        "sell_enter_district": "🏘 Tuman/qishloqni yozing yoki o'tkazib yuboring:",
        "sell_choose_district": (
            "🏘 <b>{region}</b> — tuman yoki shaharni tanlang:\n\n"
            "<i>🏙 belgisi — shahar. Xaridorlar aynan shu bo'yicha qidiradi.</i>"
        ),
        "ik_skip_district": "⏭ Ko'rsatmayman",
        "sell_enter_description": "📝 Qo'shimcha izoh yozing yoki o'tkazib yuboring:",
        "sell_send_photo": "📷 Mahsulot rasmini yuboring yoki o'tkazib yuboring:",
        "err_need_photo": "Iltimos, rasm yuboring yoki «O'tkazib yuborish» tugmasini bosing.",
        "sell_enter_phone": "📞 Aloqa uchun telefon raqamingizni yuboring (tugma orqali) yoki yozing:",
        "err_phone": "Telefon raqami noto'g'ri. Masalan: +998901234567",
        "sell_preview_title": "👀 <b>E'lon ko'rinishi:</b>",
        "sell_confirm_q": "Hammasi to'g'rimi? E'lonni joylashtiramizmi?",
        "sell_created": "✅ E'lon joylashtirildi! (№{id})\nXaridorlar tez orada bog'lanishi mumkin.",
        "err_listing_save": "❌ Xatolik yuz berdi. E'lon saqlanmadi. Qaytadan urinib ko'ring.",
        "sell_use_saved_region": "📍 Saqlangan hududingiz: <b>{region}</b>\nShu hudud uchun e'lon berasizmi?",

        # --- buying ---
        "buy_choose_category": "🛒 Qaysi kategoriyani ko'rmoqchisiz?",
        "buy_choose_region": "📍 Qaysi hudud bo'yicha qidiramiz?",
        "results_header": "🛒 <b>Natijalar</b>\n{category} · {region}\nTopildi: {count} ta — {page}/{pages}-sahifa",
        "results_search_header": "🔍 <b>«{q}» bo'yicha natijalar</b>\nTopildi: {count} ta — {page}/{pages}-sahifa",
        "no_results": "😔 Hech narsa topilmadi. Boshqa kategoriya yoki hududni sinab ko'ring.",
        "listing_gone": "Bu e'lon endi mavjud emas.",
        "search_prompt": "🔍 Nimani qidiramiz? Mahsulot nomini yozing:",
        "err_search": "Iltimos, kamida 2 ta belgi yozing.",
        "search_results_for": "🔍 «{q}» bo'yicha natijalar:",

        # --- contact ---
        "contact_title": "📇 <b>Sotuvchi bilan bog'lanish:</b>",
        "contact_phone": "📞 Telefon: <b>{phone}</b>",
        "contact_tg": "💬 Telegram: @{username}",
        "contact_none": "Sotuvchi aloqa ma'lumotlarini ko'rsatmagan.",
        "seller_notify": "🔔 Sizning e'loningizga qiziqish bildirildi!\n«{title}»\nXaridor: {buyer}",

        # --- favorites ---
        "fav_added": "⭐ Saralanganlarga qo'shildi.",
        "fav_removed": "Saralanganlardan olib tashlandi.",
        "favorites_header": "⭐ <b>Saralangan e'lonlar</b> ({count} ta):",
        "no_favorites": "Sizda hali saralangan e'lonlar yo'q.",

        # --- my listings ---
        "my_listings_header": "📋 <b>Mening e'lonlarim</b> ({count} ta):",
        "no_my_listings": "Sizda hali e'lonlar yo'q. «➕ E'lon berish» orqali qo'shing.",
        "listing_marked_sold": "✅ E'lon «sotilgan» deb belgilandi.",
        "listing_marked_active": "♻️ E'lon qayta faollashtirildi.",
        "editprice_prompt": "💰 Yangi narxni yozing (faqat raqam):",
        "editprice_done": "✅ Narx yangilandi: {price}",
        "del_confirm_q": "🗑 Bu e'lonni o'chirishni tasdiqlaysizmi?",
        "del_done": "🗑 E'lon o'chirildi.",
        "not_your_listing": "Bu sizning e'loningiz emas.",

        # --- profile ---
        "profile_header": (
            "👤 <b>Profil</b>\n\n"
            "Ism: {name}\n"
            "Telegram: {username}\n"
            "Telefon: {phone}\n"
            "📍 Manzil: {location}\n"
            "Til: {lang_name}\n\n"
            "📋 E'lonlar: {listings} ta\n"
            "⭐ Saralangan: {favs} ta"
        ),
        "update_phone_prompt": "📞 Yangi telefon raqamingizni yuboring yoki yozing:",
        "phone_updated": "✅ Telefon raqami yangilandi.",
        "set_location_region_prompt": "📍 Hududingizni tanlang (keyingi e'lonlarda avtomatik ishlatiladi):",
        "set_location_village_prompt": "🏘 Qishloq/tumanni yozing yoki o'tkazib yuboring:",
        "location_saved": "✅ Manzilingiz saqlandi: <b>{location}</b>",
        "lang_name": "O'zbekcha",
        "not_set": "ko'rsatilmagan",

        # --- admin ---
        "not_admin": "Bu buyruq faqat administratorlar uchun.",
        "stats_text": (
            "📊 <b>Statistika</b>\n\n"
            "👥 Foydalanuvchilar: {users}\n"
            "🟢 Faol e'lonlar: {active}\n"
            "📦 Jami e'lonlar: {total}\n"
            "⭐ Saralanganlar: {favs}"
        ),
        "admin_menu": (
            "🛠 <b>Admin panel</b>\n\n"
            "Telefon qilgan dehqon uchun e'lonni shu yerdan qo'shing — "
            "u botga kirmasa ham e'loni saytda chiqadi."
        ),
        "ik_admin_add": "➕ Dehqon uchun e'lon qo'shish",
        "ik_admin_recent": "📋 Oxirgi e'lonlar",
        "ik_admin_stats": "📊 Statistika",
        "admin_ask_seller_phone": (
            "📞 <b>Dehqonning telefon raqami</b>\n\n"
            "Raqam — bu shaxsning kim ekanligi. Shu raqam bo'yicha eski "
            "sotuvchi topiladi yoki yangisi ochiladi.\n\n"
            "Masalan: <i>+998901234567</i>"
        ),
        "admin_seller_found": "✅ Topildi: <b>{name}</b> (avvalgi e'lonlari: {count} ta)",
        "admin_seller_new": "🆕 Yangi sotuvchi ochiladi.",
        "admin_ask_seller_name": "👤 Dehqonning ismini yozing yoki o'tkazib yuboring:",
        "admin_preview_title": "👀 <b>E'lon ko'rinishi</b> (sotuvchi: {seller})",
        "admin_created": (
            "✅ E'lon qo'shildi! (№{id})\n"
            "Sotuvchi: <b>{seller}</b> · {phone}\n\n"
            "E'lon saytda va botda darhol ko'rinadi."
        ),
        "admin_no_listings": "Hali hech qanday e'lon yo'q.",
        "admin_recent_header": "📋 <b>Oxirgi {count} ta e'lon</b>\nBoshqarish uchun birini tanlang:",
        "admin_deleted": "🗑 E'lon o'chirildi.",
        "admin_listing_gone": "Bu e'lon topilmadi.",

        # --- listing card ---
        "card_price": "💰 Narxi: <b>{price}</b> / {unit}",
        "card_qty": "📦 Mavjud: {qty}",
        "card_region": "📍 Manzil: {region}",
        "card_phone": "📞 Telefon: {phone}",
        "card_tg": "💬 Telegram: @{username}",
        "badge_sold": "🔴 <b>SOTILGAN</b>",

        # --- inline button labels ---
        "all_categories": "🗂 Barcha kategoriyalar",
        "all_regions": "🌍 Barcha hududlar",
        "ik_post": "✅ Joylashtirish",
        "ik_cancel": "❌ Bekor qilish",
        "ik_contact": "📞 Bog'lanish",
        "ik_fav": "⭐ Saqlash",
        "ik_unfav": "✅ Saqlangan (olib tashlash)",
        "ik_sold": "💤 Sotildi deb belgilash",
        "ik_activate": "♻️ Qayta faollashtirish",
        "ik_editprice": "✏️ Narxni o'zgartirish",
        "ik_delete": "🗑 O'chirish",
        "ik_yes": "✅ Ha",
        "ik_no": "↩️ Yo'q",
        "ik_write": "💬 Yozish",
        "ik_change_lang": "🌐 Tilni o'zgartirish",
        "ik_update_phone": "📞 Telefonni yangilash",
        "ik_set_location": "📍 Manzilni belgilash",
        "ik_use_saved_region": "✅ Ha, {region}",
        "ik_change_region": "🗺 Boshqa hudud tanlash",
        "ik_change_filter": "🔁 Boshqa kategoriya",
    },
    "ru": {
        "choose_language": "🌐 Tilni tanlang / Выберите язык:",
        "language_set": "✅ Язык установлен: Русский.",
        "main_menu_hint": "Главное меню. Выберите одну из кнопок ниже 👇",
        "welcome_back": "Здравствуйте, {name}! 🌾\nDehqon Bozori — добро пожаловать на рынок сельхозпродукции.",
        "help_text": (
            "🌾 <b>Dehqon Bozori</b> — бот, связывающий продавцов и покупателей сельхозпродукции.\n\n"
            "➕ <b>Разместить</b> — продайте продукт (название, цена, регион, фото).\n"
            "🛒 <b>Купить</b> — смотрите объявления по категориям и регионам.\n"
            "🔍 <b>Поиск</b> — ищите по названию.\n"
            "⭐ <b>Избранное</b> — сохраняйте понравившиеся объявления.\n"
            "📋 <b>Мои объявления</b> — управляйте своими объявлениями.\n"
            "👤 <b>Профиль</b> — смените язык и номер телефона.\n\n"
            "Команды: /start /help /cancel"
        ),
        "cancelled": "❌ Отменено.",
        "nothing_to_cancel": "Нечего отменять.",
        "unknown": "Не понял. Выберите пункт меню 👇",

        # --- website bridge ---
        "web_login_ok": (
            "✅ <b>Вы вошли на сайт!</b>\n\n"
            "Вернитесь в браузер — страница откроется сама. "
            "Теперь можно добавлять объявления и с сайта."
        ),
        "web_login_expired": (
            "⏰ Ссылка для входа устарела.\n\n"
            "Нажмите «Войти через Telegram» на сайте ещё раз."
        ),
        "web_site_intro": (
            "🌐 <b>Сайт Dehqon Bozori</b>\n\n"
            "Покупатели смотрят объявления без регистрации и связываются с вами напрямую.\n\n{url}"
        ),
        "web_open_site": "🌐 Открыть сайт",
        "web_contact_alert": "🔔 Покупатель с сайта хочет связаться!",

        "sell_choose_category": "🗂 Выберите категорию продукта:",
        "sell_enter_title": "✏️ Напишите название продукта (например: <i>Свежие помидоры</i>):",
        "err_title": "Пожалуйста, укажите название от 2 до 100 символов.",
        "sell_enter_price": "💰 Укажите цену (только число, например: <i>8000</i>):",
        "err_price": "Пожалуйста, укажите цену числом (например: 8000).",
        "sell_choose_unit": "⚖️ Выберите единицу измерения:",
        "sell_enter_quantity": "📦 Укажите доступное количество (например: <i>500 кг</i>) или пропустите:",
        "sell_choose_region": "📍 Выберите регион:",
        "sell_enter_district": "🏘 Укажите район/село или пропустите:",
        "sell_choose_district": (
            "🏘 <b>{region}</b> — выберите район или город:\n\n"
            "<i>🏙 — город. Покупатели ищут именно по нему.</i>"
        ),
        "ik_skip_district": "⏭ Не указывать",
        "sell_enter_description": "📝 Добавьте описание или пропустите:",
        "sell_send_photo": "📷 Отправьте фото продукта или пропустите:",
        "err_need_photo": "Пожалуйста, отправьте фото или нажмите «Пропустить».",
        "sell_enter_phone": "📞 Отправьте контактный номер (кнопкой) или напишите его:",
        "err_phone": "Неверный номер. Например: +998901234567",
        "sell_preview_title": "👀 <b>Предпросмотр объявления:</b>",
        "sell_confirm_q": "Всё верно? Публикуем объявление?",
        "sell_created": "✅ Объявление опубликовано! (№{id})\nПокупатели скоро смогут связаться с вами.",
        "err_listing_save": "❌ Произошла ошибка. Объявление не сохранено. Попробуйте ещё раз.",
        "sell_use_saved_region": "📍 Ваш сохранённый регион: <b>{region}</b>\nРазместить объявление из этого региона?",

        "buy_choose_category": "🛒 Какую категорию показать?",
        "buy_choose_region": "📍 По какому региону искать?",
        "results_header": "🛒 <b>Результаты</b>\n{category} · {region}\nНайдено: {count} — стр. {page}/{pages}",
        "results_search_header": "🔍 <b>Результаты по «{q}»</b>\nНайдено: {count} — стр. {page}/{pages}",
        "no_results": "😔 Ничего не найдено. Попробуйте другую категорию или регион.",
        "listing_gone": "Это объявление больше недоступно.",
        "search_prompt": "🔍 Что ищем? Напишите название продукта:",
        "err_search": "Пожалуйста, введите минимум 2 символа.",
        "search_results_for": "🔍 Результаты по «{q}»:",

        "contact_title": "📇 <b>Связаться с продавцом:</b>",
        "contact_phone": "📞 Телефон: <b>{phone}</b>",
        "contact_tg": "💬 Telegram: @{username}",
        "contact_none": "Продавец не указал контактные данные.",
        "seller_notify": "🔔 Вашим объявлением заинтересовались!\n«{title}»\nПокупатель: {buyer}",

        "fav_added": "⭐ Добавлено в избранное.",
        "fav_removed": "Удалено из избранного.",
        "favorites_header": "⭐ <b>Избранные объявления</b> ({count}):",
        "no_favorites": "У вас пока нет избранных объявлений.",

        "my_listings_header": "📋 <b>Мои объявления</b> ({count}):",
        "no_my_listings": "У вас пока нет объявлений. Добавьте через «➕ Разместить».",
        "listing_marked_sold": "✅ Объявление помечено как «продано».",
        "listing_marked_active": "♻️ Объявление снова активно.",
        "editprice_prompt": "💰 Укажите новую цену (только число):",
        "editprice_done": "✅ Цена обновлена: {price}",
        "del_confirm_q": "🗑 Подтвердите удаление этого объявления?",
        "del_done": "🗑 Объявление удалено.",
        "not_your_listing": "Это не ваше объявление.",

        "profile_header": (
            "👤 <b>Профиль</b>\n\n"
            "Имя: {name}\n"
            "Telegram: {username}\n"
            "Телефон: {phone}\n"
            "📍 Адрес: {location}\n"
            "Язык: {lang_name}\n\n"
            "📋 Объявлений: {listings}\n"
            "⭐ В избранном: {favs}"
        ),
        "update_phone_prompt": "📞 Отправьте новый номер телефона или напишите его:",
        "phone_updated": "✅ Номер телефона обновлён.",
        "set_location_region_prompt": "📍 Выберите ваш регион (будет использоваться автоматически):",
        "set_location_village_prompt": "🏘 Укажите район/село или пропустите:",
        "location_saved": "✅ Адрес сохранён: <b>{location}</b>",
        "lang_name": "Русский",
        "not_set": "не указано",

        "not_admin": "Эта команда только для администраторов.",
        "stats_text": (
            "📊 <b>Статистика</b>\n\n"
            "👥 Пользователей: {users}\n"
            "🟢 Активных объявлений: {active}\n"
            "📦 Всего объявлений: {total}\n"
            "⭐ В избранном: {favs}"
        ),
        "admin_menu": (
            "🛠 <b>Админ-панель</b>\n\n"
            "Разместите объявление за фермера, который позвонил вам — "
            "оно появится на сайте, даже если он не заходил в бота."
        ),
        "ik_admin_add": "➕ Объявление за фермера",
        "ik_admin_recent": "📋 Последние объявления",
        "ik_admin_stats": "📊 Статистика",
        "admin_ask_seller_phone": (
            "📞 <b>Номер телефона фермера</b>\n\n"
            "Номер — это личность продавца. По нему найдётся существующий "
            "продавец или создастся новый.\n\n"
            "Например: <i>+998901234567</i>"
        ),
        "admin_seller_found": "✅ Найден: <b>{name}</b> (объявлений: {count})",
        "admin_seller_new": "🆕 Будет создан новый продавец.",
        "admin_ask_seller_name": "👤 Напишите имя фермера или пропустите:",
        "admin_preview_title": "👀 <b>Предпросмотр</b> (продавец: {seller})",
        "admin_created": (
            "✅ Объявление добавлено! (№{id})\n"
            "Продавец: <b>{seller}</b> · {phone}\n\n"
            "Оно сразу видно на сайте и в боте."
        ),
        "admin_no_listings": "Объявлений пока нет.",
        "admin_recent_header": "📋 <b>Последние {count} объявлений</b>\nВыберите для управления:",
        "admin_deleted": "🗑 Объявление удалено.",
        "admin_listing_gone": "Объявление не найдено.",

        "card_price": "💰 Цена: <b>{price}</b> / {unit}",
        "card_qty": "📦 В наличии: {qty}",
        "card_region": "📍 Адрес: {region}",
        "card_phone": "📞 Телефон: {phone}",
        "card_tg": "💬 Telegram: @{username}",
        "badge_sold": "🔴 <b>ПРОДАНО</b>",

        "all_categories": "🗂 Все категории",
        "all_regions": "🌍 Все регионы",
        "ik_post": "✅ Опубликовать",
        "ik_cancel": "❌ Отмена",
        "ik_contact": "📞 Связаться",
        "ik_fav": "⭐ Сохранить",
        "ik_unfav": "✅ В избранном (убрать)",
        "ik_sold": "💤 Пометить проданным",
        "ik_activate": "♻️ Снова активно",
        "ik_editprice": "✏️ Изменить цену",
        "ik_delete": "🗑 Удалить",
        "ik_yes": "✅ Да",
        "ik_no": "↩️ Нет",
        "ik_write": "💬 Написать",
        "ik_change_lang": "🌐 Сменить язык",
        "ik_update_phone": "📞 Обновить телефон",
        "ik_set_location": "📍 Указать адрес",
        "ik_use_saved_region": "✅ Да, {region}",
        "ik_change_region": "🗺 Выбрать другой регион",
        "ik_change_filter": "🔁 Другая категория",
    },
}

# Reply-keyboard button labels. Handlers match incoming text against these.
BTN: dict[str, dict[str, str]] = {
    "sell": {"uz": "➕ E'lon berish", "ru": "➕ Разместить"},
    "buy": {"uz": "🛒 Xarid qilish", "ru": "🛒 Купить"},
    "search": {"uz": "🔍 Qidirish", "ru": "🔍 Поиск"},
    "favorites": {"uz": "⭐ Saralangan", "ru": "⭐ Избранное"},
    "my_listings": {"uz": "📋 E'lonlarim", "ru": "📋 Мои объявления"},
    "profile": {"uz": "👤 Profil", "ru": "👤 Профиль"},
    "website": {"uz": "🌐 Sayt", "ru": "🌐 Сайт"},
    "help": {"uz": "ℹ️ Yordam", "ru": "ℹ️ Помощь"},
    "cancel": {"uz": "❌ Bekor qilish", "ru": "❌ Отмена"},
    "skip": {"uz": "⏭ O'tkazib yuborish", "ru": "⏭ Пропустить"},
    "share_phone": {"uz": "📱 Raqamni yuborish", "ru": "📱 Отправить номер"},
}


def t(key: str, lang: str = "uz", **kwargs) -> str:
    """Return a localised string, formatted with kwargs when provided."""
    if lang not in TEXTS:
        lang = "uz"
    template = TEXTS[lang].get(key) or TEXTS["uz"].get(key, key)
    if kwargs:
        try:
            return template.format(**kwargs)
        except (KeyError, IndexError, ValueError):
            return template
    return template


def btn_texts(name: str) -> set[str]:
    """All localised variants of a reply button, for F.text.in_(...) filters."""
    return set(BTN[name].values())