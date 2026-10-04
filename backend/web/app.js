/* Dehqon Bozori — shared frontend runtime.
   Plain ES modules-free JavaScript so it runs on old Android WebViews.
   Everything talks to the same FastAPI backend the Telegram bot writes to. */

(function () {
  'use strict';

  // ----------------------------------------------------------------- i18n --
  var I18N = {
    uz: {
      tagline: 'Dehqondan to‘g‘ridan-to‘g‘ri xaridorga',
      hero_h1: 'Vositachisiz. To‘g‘ridan-to‘g‘ri dehqondan.',
      hero_p: 'Qishloq oilalari o‘z hosilini shu yerda e‘lon qiladi. Xaridor — bozor savdogari, do‘kon yoki oshxona — ro‘yxatdan o‘tmasdan sotuvchiga to‘g‘ridan-to‘g‘ri qo‘ng‘iroq qiladi.',
      stat_listings: 'faol e‘lon',
      stat_sellers: 'dehqon',
      stat_regions: 'hudud',
      search_ph: 'Mahsulot qidiring: pomidor, uzum, asal…',
      search: 'Qidirish',
      all: 'Barchasi',
      all_regions: 'Barcha hududlar',
      sort_new: 'Eng yangi',
      sort_price_asc: 'Arzon narx',
      sort_price_desc: 'Qimmat narx',
      sort_popular: 'Ommabop',
      price_from: 'dan',
      price_to: 'gacha',
      reset: 'Tozalash',
      found: '{n} ta e‘lon topildi',
      nothing: 'Hech narsa topilmadi',
      nothing_p: 'Filtrlarni o‘zgartirib ko‘ring yoki birinchi bo‘lib e‘lon bering.',
      today: 'Bugun',
      sold: 'Sotilgan',
      per: 'uchun',
      sell_cta: 'E‘lon berish',
      my_listings: 'E‘lonlarim',
      admin: 'Admin',
      login: 'Kirish',
      logout: 'Chiqish',
      back: 'Orqaga',
      home: 'Bosh sahifa',
      loading: 'Yuklanmoqda…',
      not_found: 'E‘lon topilmadi',
      contact_title: 'Sotuvchi bilan bog‘laning',
      call: 'Qo‘ng‘iroq qilish',
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
      no_contact: 'Sotuvchi aloqa ma‘lumotini qoldirmagan.',
      contact_note: 'Narx va yetkazib berishni sotuvchi bilan to‘g‘ridan-to‘g‘ri kelishasiz. Dehqon Bozori vositachilik qilmaydi va haq olmaydi.',
      seller: 'Sotuvchi',
      region: 'Hudud',
      district: 'Tuman / qishloq',
      quantity: 'Mavjud miqdor',
      category: 'Kategoriya',
      harvest: 'Yig‘im sanasi',
      posted: 'Joylandi',
      views: 'ko‘rildi',
      similar: 'O‘xshash e‘lonlar',
      login_title: 'Telegram orqali kirish',
      login_p: 'Parol yo‘q, SMS yo‘q. Tugmani bosing — botda tasdiqlaysiz va shu yerga qaytasiz.',
      login_btn: 'Telegram orqali kirish',
      login_wait: 'Telegramda tasdiqlashni kutmoqdamiz…',
      login_expired: 'Muddat tugadi. Qaytadan urinib ko‘ring.',
      login_match: 'Avval shu raqamni eslab qoling — bot uni tanlashni so‘raydi:',
      login_open: 'Telegram’ni ochish',
      login_refused: 'Kirish rad etildi: botda boshqa raqam tanlandi. Qaytadan urinib ko‘ring.',
      login_ok: 'Xush kelibsiz!',
      form_title: 'Yangi e‘lon',
      form_p: 'Rasm qo‘shsangiz, xaridorlar 3 barobar ko‘p bog‘lanadi.',
      f_photo: 'Mahsulot rasmi',
      f_photo_hint: 'Bosing yoki rasmni tashlang (ixtiyoriy)',
      f_title: 'Mahsulot nomi',
      f_category: 'Kategoriya',
      f_price: 'Narx',
      f_unit: 'O‘lchov birligi',
      f_quantity: 'Mavjud miqdor',
      f_region: 'Hudud',
      f_district: 'Tuman / qishloq',
      f_harvest: 'Yig‘im sanasi',
      f_desc: 'Qo‘shimcha izoh',
      f_phone: 'Telefon raqam',
      f_tg: 'Telegram username',
      f_wa: 'WhatsApp raqam',
      f_contacts: 'Aloqa (kamida bittasi)',
      publish: 'E‘lonni joylash',
      saving: 'Saqlanmoqda…',
      published: 'E‘lon joylandi! 🌿',
      err_contact: 'Kamida bitta aloqa usulini kiriting.',
      err_generic: 'Xatolik yuz berdi. Qaytadan urining.',
      my_title: 'Mening e‘lonlarim',
      my_empty: 'Sizda hali e‘lon yo‘q.',
      mark_sold: 'Sotildi deb belgilash',
      mark_active: 'Qayta faollashtirish',
      delete: 'O‘chirish',
      confirm_delete: 'Bu e‘lonni o‘chirasizmi?',
      saved: 'Saqlandi',
      deleted: 'O‘chirildi',
      admin_title: 'Admin panel',
      admin_add: 'Sotuvchi nomidan e‘lon qo‘shish',
      seller_name: 'Sotuvchining ismi',
      seller_phone: 'Sotuvchining telefoni',
      all_listings: 'Barcha e‘lonlar',
      no_access: 'Sizda admin huquqi yo‘q.',
      source: 'Manba',
      footer: 'Dehqon Bozori — Samarqand viloyati qishloqlaridan boshlandi.',
      open_bot: 'Telegram botni ochish'
    },
    ru: {
      tagline: 'Напрямую от фермера к покупателю',
      hero_h1: 'Без посредников. Напрямую от фермера.',
      hero_p: 'Сельские семьи сами размещают урожай. Покупатель — торговец, магазин или кафе — звонит напрямую, без регистрации.',
      stat_listings: 'активных',
      stat_sellers: 'фермеров',
      stat_regions: 'регионов',
      search_ph: 'Поиск: помидоры, виноград, мёд…',
      search: 'Найти',
      all: 'Все',
      all_regions: 'Все регионы',
      sort_new: 'Сначала новые',
      sort_price_asc: 'Сначала дешёвые',
      sort_price_desc: 'Сначала дорогие',
      sort_popular: 'Популярные',
      price_from: 'от',
      price_to: 'до',
      reset: 'Сброс',
      found: 'Найдено: {n}',
      nothing: 'Ничего не найдено',
      nothing_p: 'Измените фильтры или разместите объявление первым.',
      today: 'Сегодня',
      sold: 'Продано',
      per: 'за',
      sell_cta: 'Разместить',
      my_listings: 'Мои объявления',
      admin: 'Админ',
      login: 'Войти',
      logout: 'Выйти',
      back: 'Назад',
      home: 'Главная',
      loading: 'Загрузка…',
      not_found: 'Объявление не найдено',
      contact_title: 'Связаться с продавцом',
      call: 'Позвонить',
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
      no_contact: 'Продавец не оставил контактов.',
      contact_note: 'Цену и доставку вы обсуждаете напрямую. Dehqon Bozori не посредничает и не берёт комиссию.',
      seller: 'Продавец',
      region: 'Регион',
      district: 'Район / село',
      quantity: 'В наличии',
      category: 'Категория',
      harvest: 'Дата сбора',
      posted: 'Размещено',
      views: 'просмотров',
      similar: 'Похожие объявления',
      login_title: 'Вход через Telegram',
      login_p: 'Без пароля и SMS. Нажмите кнопку, подтвердите в боте и вернитесь сюда.',
      login_btn: 'Войти через Telegram',
      login_wait: 'Ждём подтверждения в Telegram…',
      login_expired: 'Срок истёк. Попробуйте ещё раз.',
      login_match: 'Сначала запомните это число — бот попросит его выбрать:',
      login_open: 'Открыть Telegram',
      login_refused: 'Вход отклонён: в боте выбрано другое число. Попробуйте ещё раз.',
      login_ok: 'Добро пожаловать!',
      form_title: 'Новое объявление',
      form_p: 'С фото покупатели откликаются в 3 раза чаще.',
      f_photo: 'Фото товара',
      f_photo_hint: 'Нажмите или перетащите фото (необязательно)',
      f_title: 'Название товара',
      f_category: 'Категория',
      f_price: 'Цена',
      f_unit: 'Единица',
      f_quantity: 'В наличии',
      f_region: 'Регион',
      f_district: 'Район / село',
      f_harvest: 'Дата сбора',
      f_desc: 'Описание',
      f_phone: 'Телефон',
      f_tg: 'Telegram username',
      f_wa: 'Номер WhatsApp',
      f_contacts: 'Контакты (хотя бы один)',
      publish: 'Опубликовать',
      saving: 'Сохранение…',
      published: 'Опубликовано! 🌿',
      err_contact: 'Укажите хотя бы один контакт.',
      err_generic: 'Ошибка. Попробуйте ещё раз.',
      my_title: 'Мои объявления',
      my_empty: 'У вас пока нет объявлений.',
      mark_sold: 'Отметить проданным',
      mark_active: 'Вернуть в продажу',
      delete: 'Удалить',
      confirm_delete: 'Удалить это объявление?',
      saved: 'Сохранено',
      deleted: 'Удалено',
      admin_title: 'Панель админа',
      admin_add: 'Добавить от имени продавца',
      seller_name: 'Имя продавца',
      seller_phone: 'Телефон продавца',
      all_listings: 'Все объявления',
      no_access: 'Нет прав администратора.',
      source: 'Источник',
      footer: 'Dehqon Bozori — началось в сёлах Самаркандской области.',
      open_bot: 'Открыть Telegram-бота'
    }
  };

  var store = {
    get: function (k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  var lang = store.get('db_lang', (navigator.language || 'uz').indexOf('ru') === 0 ? 'ru' : 'uz');

  function t(key, vars) {
    var s = (I18N[lang] && I18N[lang][key]) || I18N.uz[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.replace('{' + k + '}', vars[k]);
      });
    }
    return s;
  }

  function setLang(next) {
    lang = next;
    store.set('db_lang', next);
    document.documentElement.lang = next;
    location.reload();
  }

  // ------------------------------------------------------------------ api --
  function token() { return store.get('db_token', ''); }

  function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    if (!(opts.body instanceof FormData) && opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    var tk = token();
    if (tk) headers['Authorization'] = 'Bearer ' + tk;

    return fetch('/api' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body
    }).then(function (res) {
      if (res.status === 401) { store.del('db_token'); }
      if (res.status === 204) return null;
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var msg = data && data.detail;
          if (Array.isArray(msg)) msg = msg.map(function (d) { return d.msg; }).join(', ');
          throw new Error(msg || t('err_generic'));
        }
        return data;
      });
    });
  }

  // --------------------------------------------------------------- helpers --
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var toastTimer;
  function toast(msg) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var node = el('div', { class: 'toast', text: msg });
    document.body.appendChild(node);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.remove(); }, 2600);
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  function label(item) { return (item && (item[lang] || item.uz)) || ''; }

  // Cached reference data — one request per session, shared by every page.
  var metaPromise = null;
  function meta() {
    if (!metaPromise) metaPromise = api('/meta');
    return metaPromise;
  }

  // ---------------------------------------------------------------- header --
  function renderHeader(active) {
    var bar = document.getElementById('topbar');
    if (!bar) return;
    var authed = !!token();
    var isAdmin = store.get('db_admin', '') === '1';

    var nav = [
      el('a', { class: 'icon-btn' + (active === 'sell' ? ' active' : ''), href: '/sell' },
        [document.createTextNode('➕ ' + t('sell_cta'))])
    ];
    if (authed) {
      nav.push(el('a', { class: 'icon-btn', href: '/my' }, [document.createTextNode('📋')]));
      if (isAdmin) nav.push(el('a', { class: 'icon-btn', href: '/admin' }, [document.createTextNode('⚙️')]));
    }

    bar.appendChild(el('div', { class: 'topbar-inner' }, [
      el('a', { class: 'brand', href: '/' }, [
        el('span', { class: 'leaf', text: '🌿' }),
        el('span', { text: 'Dehqon Bozori' })
      ]),
      el('div', { class: 'grow' }),
      el('div', { class: 'lang-switch' }, [
        el('button', { type: 'button', 'aria-pressed': String(lang === 'uz'), text: 'UZ',
          onclick: function () { if (lang !== 'uz') setLang('uz'); } }),
        el('button', { type: 'button', 'aria-pressed': String(lang === 'ru'), text: 'RU',
          onclick: function () { if (lang !== 'ru') setLang('ru'); } })
      ])
    ].concat(nav)));
  }

  function renderFooter() {
    var f = document.getElementById('footer');
    if (!f) return;
    meta().then(function (m) {
      var links = [el('span', { text: t('footer') })];
      if (m && m.bot_username) {
        links.push(el('a', { href: 'https://t.me/' + m.bot_username, target: '_blank', rel: 'noopener',
          text: '✈️ ' + t('open_bot') }));
      }
      f.appendChild(el('div', { class: 'wrap' }, links));
    });
  }

  // ------------------------------------------------------------ card view --
  function listingCard(item) {
    var thumbKids = [];
    if (item.is_new_today && item.status === 'active') {
      thumbKids.push(el('span', { class: 'badge', text: t('today') }));
    }
    if (item.status === 'sold') {
      thumbKids.push(el('span', { class: 'badge sold', text: t('sold') }));
    }
    if (item.photo) {
      thumbKids.push(el('img', { src: item.photo, alt: item.title, loading: 'lazy', decoding: 'async' }));
    } else {
      thumbKids.push(document.createTextNode(item.category_emoji || '📦'));
    }

    var place = item.region_label + (item.district ? ', ' + item.district : '');
    var chans = [];
    if (item.phone) chans.push('📞');
    if (item.telegram_username) chans.push('✈️');
    if (item.whatsapp) chans.push('🟢');

    return el('a', { class: 'card', href: '/e/' + item.id }, [
      el('div', { class: 'thumb' }, thumbKids),
      el('div', { class: 'body' }, [
        el('h3', { text: item.title }),
        el('div', { class: 'price', text: item.price_display + ' / ' + item.unit_label }),
        el('div', { class: 'place', text: '📍 ' + place }),
        chans.length ? el('div', { class: 'chan', text: chans.join(' ') }) : null
      ])
    ]);
  }

  function skeletons(host, n) {
    host.innerHTML = '';
    for (var i = 0; i < n; i++) host.appendChild(el('div', { class: 'skel' }));
  }

  function emptyState(host, title, body) {
    host.innerHTML = '';
    host.appendChild(el('div', { class: 'empty', style: 'grid-column:1/-1' }, [
      el('div', { class: 'big', text: '🌾' }),
      el('div', { style: 'font-weight:700;color:var(--ink)', text: title }),
      body ? el('div', { text: body }) : null
    ]));
  }

  // ------------------------------------------------------------------ auth --
  var pollTimer = null;

  /** Kick off Telegram login; calls done(user) once approved in the bot. */
  function startLogin(statusHost, done) {
    api('/auth/start', { method: 'POST' }).then(function (res) {
      if (!res.deep_link) {
        statusHost.className = 'notice err';
        statusHost.textContent = 'BOT_USERNAME .env faylida ko‘rsatilmagan.';
        return;
      }
      // The number first, Telegram second: the bot asks for this number, and
      // opening Telegram straight away would hide it before it was read.
      statusHost.className = 'notice warn';
      statusHost.textContent = '';
      statusHost.appendChild(el('p', { text: t('login_match') }));
      statusHost.appendChild(el('p', { class: 'match-code', text: res.match_code || '' }));
      statusHost.appendChild(el('a', { class: 'btn block', href: res.deep_link, target: '_blank',
        rel: 'noopener', text: '✈️ ' + t('login_open') }));
      statusHost.appendChild(el('p', { text: t('login_wait') }));

      var stop = Date.now() + 10 * 60 * 1000;
      clearInterval(pollTimer);
      pollTimer = setInterval(function () {
        if (Date.now() > stop) {
          clearInterval(pollTimer);
          statusHost.className = 'notice err';
          statusHost.textContent = t('login_expired');
          return;
        }
        api('/auth/poll?code=' + encodeURIComponent(res.code)).then(function (p) {
          if (p.status === 'ok') {
            clearInterval(pollTimer);
            store.set('db_token', p.token);
            store.set('db_admin', p.is_admin ? '1' : '0');
            statusHost.className = 'notice ok';
            statusHost.textContent = t('login_ok');
            done(p.user);
          } else if (p.status === 'expired' || p.status === 'refused') {
            clearInterval(pollTimer);
            statusHost.className = 'notice err';
            statusHost.textContent = t(p.status === 'refused' ? 'login_refused' : 'login_expired');
          }
        }).catch(function () {});
      }, 1800);
    }).catch(function (e) {
      statusHost.className = 'notice err';
      statusHost.textContent = e.message;
    });
  }

  function loginPanel(onDone) {
    var status = el('div', { class: 'hidden' });
    var btn = el('button', { class: 'btn block', type: 'button', text: '✈️ ' + t('login_btn'),
      onclick: function () { status.classList.remove('hidden'); startLogin(status, onDone); } });
    return el('div', { class: 'panel' }, [
      el('h2', { text: t('login_title') }),
      el('p', { class: 'muted', style: 'margin:6px 0 14px;font-size:14.5px', text: t('login_p') }),
      btn,
      status
    ]);
  }

  function logout() {
    api('/auth/logout', { method: 'POST' }).catch(function () {});
    store.del('db_token');
    store.del('db_admin');
    location.href = '/';
  }

  /** Resolve with the signed-in user, or null. Never rejects. */
  function whoami() {
    if (!token()) return Promise.resolve(null);
    return api('/auth/me').then(function (me) {
      store.set('db_admin', me.is_admin ? '1' : '0');
      return me;
    }).catch(function () { return null; });
  }

  // ------------------------------------------------------------- selects ---
  function fillSelect(select, items, opts) {
    opts = opts || {};
    select.innerHTML = '';
    if (opts.placeholder) {
      select.appendChild(el('option', { value: '', text: opts.placeholder }));
    }
    items.forEach(function (item) {
      select.appendChild(el('option', {
        value: item.key,
        text: (item.emoji ? item.emoji + ' ' : '') + label(item)
      }));
    });
    if (opts.value) select.value = opts.value;
  }

  window.DB = {
    t: t, lang: function () { return lang; }, setLang: setLang,
    api: api, meta: meta, el: el, esc: esc, toast: toast, fmtDate: fmtDate,
    label: label, store: store, token: token,
    renderHeader: renderHeader, renderFooter: renderFooter,
    listingCard: listingCard, skeletons: skeletons, emptyState: emptyState,
    loginPanel: loginPanel, whoami: whoami, logout: logout, fillSelect: fillSelect
  };

  document.documentElement.lang = lang;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
})();
