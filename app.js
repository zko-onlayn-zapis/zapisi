/* ЗКО Онлайн-записи v1.2.2 — клиентская часть (PWA). Секретов в файле нет; адрес шлюза берётся из config.json. */
(function () {
'use strict';
var CFG = {}, TOKEN = '', APP = document.getElementById('app'), TIMER = null, VERSION = 'v1.2.2', DEMO = false, MEM = {};
var ERR = {
  auth_required: 'Нужно войти.', pin_required: 'Введите ПИН-код.', not_master: 'Этот номер не зарегистрирован как мастер.', blocked: 'Кабинет заблокирован администратором.',
  bad_code: 'Неверный код.', code_dead: 'Код сгорел после 3 ошибок. Получите новый.', code_expired: 'Код устарел. Получите новый.', code_not_sent: 'Сначала откройте бота и поделитесь номером.',
  bad_pin: 'Неверный ПИН-код.', pin_locked: 'Слишком много ошибок. Подождите 15 минут.', bad_pin_format: 'ПИН — ровно 4 цифры.', bad_name: 'Введите имя (от 2 букв).', bad_slug: 'Адрес: 3–30 символов, латиница, цифры и «_». Это слово занято системой или не подходит.',
  slug_taken: 'Такой адрес уже занят.', already_master: 'Вы уже зарегистрированы как мастер.', no_master: 'Мастер не найден.', slot_taken: 'Это время уже занято. Выберите другое.', self_booking: 'Нельзя записаться к самому себе.',
  cloud_ban: 'Запись недоступна: номер заблокирован платформой.', master_ban: 'Мастер не принимает запись с этого номера.', bad_services: 'Выбранные услуги недоступны.', too_many: 'Слишком много активных записей или запросов. Подождите.',
  overlap: 'У вас уже есть запись на это время.', no_booking: 'Запись не найдена.', forbidden: 'Недостаточно прав.', bad_status: 'Так отметить нельзя.', not_yet: 'Визит ещё не начался.', not_done: 'Оценить можно после завершённого визита.',
  bad_card: 'Номер карточки: от 2 до 40 символов (буквы, цифры, дефис).', card_taken: 'Эта карточка уже привязана к другому мастеру.', bad_stars: 'Поставьте от 1 до 5 звёзд.', limit_free: 'Бесплатный старт: до 3 услуг. Подключите VIP Light или VIP Premium, чтобы добавить больше.', day_limit: 'У мастера на этот день набрано максимум онлайн-записей. Выберите другой день.', need_addr: 'Укажите адрес, куда приехать (улица и дом).', no_card: 'VIP доступен только мастерам с карточкой в Картотеке ЗКО. Привяжите карточку в профиле.', bad_category: 'Выберите категорию из списка.', bad_mode: 'Выберите формат приёма.', bad_title: 'Введите название услуги.', bad_price: 'Цена указана неверно.', bad_minutes: 'Длительность: от 30 минут, шаг 30.',
  no_service: 'Услуга не найдена.', bad_schedule: 'Проверьте часы: конец позже начала, перерыв внутри рабочего времени.', bad_date: 'Неверная дата.', no_history: 'В чёрный список можно добавить только того, кто записывался к вам.', bad_phone: 'Неверный номер.',
  bot_not_set: 'Сервис ещё не настроен (нет бота).', busy: 'Сервер занят, повторите через минуту.', bad_key: 'Ошибка сеанса, обновите страницу.', server_error: 'Ошибка сервера. Повторите позже.', net: 'Нет связи. Проверьте интернет.', no_gateway: 'Сервис ещё не подключён (не указан адрес шлюза в config.json).'
};
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function ls(k, v) { if (DEMO && k !== 'zk_theme') { if (v === undefined) return MEM[k] === undefined ? null : MEM[k]; if (v === null) delete MEM[k]; else MEM[k] = String(v); return null; } try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
function toast(t) { var el = document.getElementById('toast'); el.textContent = t; el.className = 'show'; clearTimeout(toast.t); toast.t = setTimeout(function () { el.className = ''; }, 3200); }
function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸'; }
function dur(m) { var h = Math.floor(m / 60), r = m % 60; return (h ? h + ' ч' : '') + (h && r ? ' ' : '') + (r ? r + ' мин' : ''); }
function stars(n) { n = Math.round(n); return '<span class="stars">' + '★'.repeat(n) + '☆'.repeat(5 - n) + '</span>'; }
function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
/* config.json — русские ключи (старые английские тоже принимаются) */
function normCfg(c) {
  var m = { 'адресКартотеки': 'cartUrl', 'версия': 'version', 'среда': 'env', 'адресШлюза': 'gatewayUrl', 'имяБота': 'botUsername', 'адресСайта': 'siteUrl', 'ватсапАдмина': 'adminWhatsApp' };
  Object.keys(m).forEach(function (k) { if (c[k] !== undefined && c[k] !== '') c[m[k]] = c[k]; });
  if (c.env === 'тест') c.env = 'test';
  return c;
}
function tzH() { var v = parseFloat(CFG && CFG['часовойПояс']); return isNaN(v) ? 5 : v; }
function zkoToday() { var d = new Date(Date.now() + tzH() * 3600000); return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2); }
function addDay(s, n) { var p = s.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2); }
function ruDate(s) { var p = s.split('-'), dn = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); return dn[d.getUTCDay()] + ', ' + p[2] + '.' + p[1] + '.' + p[0]; }
function rndKey() { var a = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.floor(Math.random() * 256); }); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
function api(action, data) {
  var body = Object.assign({ action: action }, data || {}); if (TOKEN && body.token === undefined) body.token = TOKEN;
  var done = function (j) { if (!j.ok) { if (j.error === 'auth_required' && TOKEN && !DEMO) { setToken(''); } var er = new Error(j.error || 'server_error'); er.data = j; throw er; } return j; };
  /* ДЕМО: запрос выполняется в самой странице (demo.js), в сеть не уходит НИЧЕГО */
  if (DEMO) return window.ZKDemo.call(body).then(done);
  if (!CFG.gatewayUrl) return Promise.reject(new Error('no_gateway'));
  return fetch(CFG.gatewayUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); }, function () { throw new Error('net'); }).then(done);
}
function errText(e) { var c = e && e.message; if (c === 'cloud_ban' && e.data && e.data.ban) return 'Запись закрыта' + (e.data.ban.until ? ' до ' + dmy(e.data.ban.until) : '') + '. Причина: ' + e.data.ban.reason + '.'; return ERR[c] || ('Ошибка: ' + c); }
function setToken(t) { TOKEN = t || ''; if (!DEMO) ls('zk_token', t || null); }
function view(html) { stopTimer(); APP.innerHTML = html; window.scrollTo(0, 0); }
function stopTimer() { if (TIMER) { clearInterval(TIMER); TIMER = null; } }
function $(s, r) { return (r || APP).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || APP).querySelectorAll(s)); }
function go(h) { location.hash = h; }
function load(fn) { APP.insertAdjacentHTML('beforeend', '<p class="muted center" id="ld">…</p>'); return fn().then(function (x) { var l = $('#ld'); if (l) l.remove(); return x; }, function (e) { var l = $('#ld'); if (l) l.remove(); toast(errText(e)); throw e; }); }

/* ---------- v1.2.2: тарифы, категории, подсказки, навигация, статистика ---------- */
var CART = 'https://zko-spravochnik.github.io/cartoteka/';
function cartUrl() { return CFG.cartUrl || CART; }
function dmy(x) { return String(x || '').split('-').reverse().join('.'); }
var CATS = [['beauty', '✂️ Парикмахеры и красота'], ['massage', '💆‍♂️ Массаж, бани и сауны'], ['auto', '🚗 Автосервис и шиномонтаж'], ['health', '🦷 Стоматология и здоровье'], ['septic', '🚛 Септик и спецтехника'], ['home', '🔧 Мастера на дом и ремонт'], ['photo', '📸 Фото, видео и праздники'], ['edu', '🎓 Репетиторы и обучение'], ['other', '📦 Другие услуги']];
var MODEL = { home: 'Приём у мастера', visit: 'Выезд на дом', both: 'У мастера или выезд на дом' };
function catLabel(k) { for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === k) return CATS[i][1]; return ''; }
function catOptions(sel, blank) { return (blank ? '<option value="">' + blank + '</option>' : '') + CATS.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === sel ? ' selected' : '') + '>' + c[1] + '</option>'; }).join(''); }
function tgNotice() { return '<div class="notice">⚠️ <b>Обязательное условие для записи и работы:</b> установленный Telegram на телефоне, привязанный именно к тому номеру, который вы указываете на сайте (туда приходят бесплатные коды входа, заявки и напоминания).</div>'; }
function tierBadge(t) { return t === 'premium' ? '<span class="badge gold">👑 VIP Premium</span>' : (t === 'light' ? '<span class="badge teal">💎 VIP Light</span>' : ''); }
function subBadge(s) { return s.level === 'premium' ? '<span class="badge gold">👑 VIP Premium</span>' : (s.level === 'light' ? '<span class="badge teal">💎 VIP Light</span>' : (s.paused ? '<span class="badge">⏸ Light на паузе</span>' : '<span class="badge">Бесплатный старт</span>')); }
function masterMeta(m) { var a = [catLabel(m.category), m.village ? '📍 с. ' + m.village : '', MODEL[m.mode] || '', (m.address && m.mode !== 'visit') ? 'адрес: ' + m.address : ''].filter(Boolean); return a.length ? '<div class="muted small">' + a.map(esc).join(' · ') + '</div>' : ''; }
function modal(title, body) {
  var old = document.getElementById('mdBox'); if (old) old.remove();
  var box = document.createElement('div'); box.id = 'mdBox'; box.className = 'wn-back';
  box.innerHTML = '<div class="wn-card" role="dialog" aria-modal="true"><h2>' + esc(title) + '</h2>' + body + '<button class="btn" id="mdOk">[ Понятно, закрыть ]</button></div>';
  document.body.appendChild(box); document.getElementById('mdOk').onclick = function () { box.remove(); }; box.onclick = function (e) { if (e.target === box) box.remove(); };
}
function copyText(t, ok) { try { navigator.clipboard.writeText(t).then(function () { toast(ok || 'Скопировано'); }, function () { toast('Не удалось скопировать — выделите текст вручную'); }); } catch (e) { toast('Не удалось скопировать — выделите текст вручную'); } }
function navShow(on, act) { var n = document.getElementById('nav'); if (!n) return; n.hidden = !on; document.body.classList.toggle('hasnav', !!on); $$('button', n).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-n') === act); }); }
function navGo(h) { if ((location.hash || '#/') === h) route(); else go(h); }
function devId() { var d = ls('zk_dev'); if (!d || d.length < 8) { d = rndKey().slice(0, 24); ls('zk_dev', d); } return d; }
function ping(kind) { if (DEMO || ls('zk_owner') === '1' || !CFG.gatewayUrl) return; api('statPing', { dev: devId(), kind: kind }).catch(function () {}); }
var DEFERRED = null;

/* ---------- согласие на обработку данных и «Условия и политика конфиденциальности» ---------- */
var POLICY = [
  ['Что это за сервис', 'ЗКО Онлайн-записи — сайт, где можно записаться к мастеру на удобное время. Услугу оказывает сам мастер, сервис только соединяет вас и помогает не перепутать время. Оплата — между вами и мастером на месте.'],
  ['Какие данные мы получаем', 'Клиент: номер телефона, имя, которое вы сами вводите, ваши записи (дата, время, услуги, сумма) и оценки. Мастер: имя или название, адрес личной страницы, описание, услуги, график. Для входа через Телеграм бот видит ваш номер и ваш номер аккаунта в Телеграме. ПИН-код мы не храним: сохраняется только его зашифрованный отпечаток.'],
  ['Зачем нужны эти данные', 'Чтобы записать вас и показать мастеру, кто придёт; прислать код входа, подтверждение и напоминание; показать оценки; защитить сервис от злоупотреблений (ложные записи, спам, оскорбления). Ни для чего другого данные не используются.'],
  ['Кто их видит', 'Мастер видит имя и номер телефона тех, кто записался именно к нему. Клиенты видят только публичную страницу мастера: имя, услуги, цены, свободное время, оценки. Администратор сервиса видит данные для поддержки и борьбы с нарушителями. Мы не продаём данные и не передаём их рекламным компаниям.'],
  ['Где хранятся', 'Данные лежат в закрытой Google-таблице сервиса. Для работы используются Телеграм (доставка кодов и уведомлений), Google (хранение) и GitHub Pages (показ сайта). Эти площадки работают по своим правилам.'],
  ['Сколько хранятся', 'Пока вы пользуетесь сервисом. По вашей просьбе данные удаляются в течение 30 дней. Исключение — запись в списке заблокированных: она нужна, чтобы нарушитель не вернулся под тем же номером.'],
  ['Ваши права', 'Вы можете в любой момент отозвать согласие, узнать, какие данные о вас хранятся, исправить или удалить их. Для этого напишите администратору сервиса (контакты — в карточке или у мастера, который вам дал ссылку). После отзыва согласия запись и вход по этому номеру станут недоступны.'],
  ['Правила пользования', 'Записывайтесь только на себя и только с настоящим номером. Не можете прийти — отмените запись заранее. Мастер указывает честные цены и вовремя отмечает визиты. Нельзя спамить, оскорблять, оставлять заведомо ложные оценки. За нарушения номер и страницу могут заблокировать.'],
  ['Безопасность', 'Код из Телеграма и ПИН-код никому не сообщайте — ни мастеру, ни «сотруднику сервиса». Мы никогда не просим их.'],
  ['Память устройства', 'Чтобы вам не вводить код каждый раз, сайт запоминает вход и выбранную тему на вашем телефоне. Выход из кабинета стирает вход.'],
  ['Изменения', 'Если правила изменятся, новая версия появится здесь. Продолжая пользоваться сервисом, вы соглашаетесь с актуальной версией.']
];
function consentHtml() { return '<label class="consent"><input type="checkbox" class="cons" checked><span>Нажимая кнопку, я даю согласие на обработку номера телефона для записи и связи с мастером. <a href="#" class="polLink">Условия и политика конфиденциальности</a></span></label>'; }
function policyOpen() {
  if (document.getElementById('polBox')) return;
  var box = document.createElement('div'); box.id = 'polBox'; box.className = 'wn-back';
  box.innerHTML = '<div class="wn-card" role="dialog" aria-modal="true"><h2>Условия и политика конфиденциальности</h2>' + POLICY.map(function (x, i) { return '<h3>' + (i + 1) + '. ' + esc(x[0]) + '</h3><p>' + esc(x[1]) + '</p>'; }).join('') + '<button class="btn" id="polOk">[ Понятно, закрыть ]</button></div>';
  document.body.appendChild(box);
  document.getElementById('polOk').onclick = function () { box.remove(); };
  box.onclick = function (e) { if (e.target === box) box.remove(); };
}
function consentBind(root) {
  $$('.polLink', root).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); policyOpen(); }; });
}
function consentOn(root) { var c = $('.cons', root); return !c || c.checked; }
var CONSENT_ERR = 'Поставьте галочку согласия на обработку номера телефона.';

/* ---------- вход через Телеграм-бота (общий блок) ---------- */
function loginBlock(onDone, opts) {
  opts = opts || {};
  var box = document.createElement('div'); box.className = 'card';
  box.innerHTML = (opts.noBack ? '' : '<button class="back" id="lgBack">⬅️ Назад на главную</button>') + tgNotice() + '<b>' + esc(opts.title || 'Вход по номеру телефона') + '</b><p class="muted small">Нажмите кнопку — откроется наш Телеграм-бот. Поделитесь номером, бот сразу пришлёт 4 цифры. Вернитесь сюда и введите их.</p>' + consentHtml() + '<button class="btn" id="lgGet">✈️ Получить код в Телеграм</button><div id="lgCode" hidden><input class="code" id="lgIn" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="one-time-code"><button class="btn ok" id="lgOk">Подтвердить код</button><p class="muted small center">Бот не ответил? Откройте его ещё раз и нажмите «Старт».</p></div><div id="lgErr"></div>';
  var req = ''; consentBind(box); var lb = box.querySelector('#lgBack'); if (lb) lb.onclick = function () { go('#/'); route(); };
  function err(t) { box.querySelector('#lgErr').innerHTML = t ? '<div class="err">' + esc(t) + '</div>' : ''; }
  box.querySelector('#lgGet').onclick = function () {
    err(''); if (!consentOn(box)) { err(CONSENT_ERR); return; } api('authStart', { token: '' }).then(function (j) {
      req = j.req; box.querySelector('#lgCode').hidden = false; window.open(j.link, '_blank'); box.querySelector('#lgIn').focus();
      box.querySelector('#lgGet').textContent = '✈️ Открыть бота ещё раз'; box.querySelector('#lgGet').onclick = function () { window.open(j.link, '_blank'); };
    }).catch(function (e) { err(errText(e)); });
  };
  box.querySelector('#lgOk').onclick = function () {
    var c = box.querySelector('#lgIn').value.replace(/\D/g, ''); if (c.length !== 4) { err('Введите 4 цифры.'); return; }
    api('authVerify', { req: req, code: c, token: '' }).then(function (j) { setToken(j.token); if (j.isOwner) ls('zk_owner', '1'); onDone(j); }).catch(function (e) { err(errText(e)); });
  };
  return box;
}

/* ---------- главная ---------- */
/* ---------- окно «Что нового?» (текст — в файле novosti.txt, пункт = строка, свежее сверху) ---------- */
var NOVOSTI_BAD = /(https?:\/\/|github|token|токен|парол|пароль|секрет|\.(?:txt|json|js|gs|py|html|css)\b|\bapi\b|[{}<>`]|\bsheet|лист\s+«)/i;
function loadNovosti() {
  return fetch('novosti.txt?v=' + encodeURIComponent(VERSION), { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; })
   .then(function (t) { return t.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(function (x) { return x && x.charAt(0) !== '#' && !NOVOSTI_BAD.test(x); }).map(function (x) { return x.replace(/^[•\-*]\s*/, ''); }).slice(0, 30); });
}
function whatsNew(force) {
  if (DEMO) return;
  if (!force && ls('zk_whatsnew_ver') === VERSION) return;
  if (document.getElementById('wnBox')) return;
  loadNovosti().then(function (items) {
    if (!items.length) { if (force) toast('Список новостей пока недоступен'); else ls('zk_whatsnew_ver', VERSION); return; }
    var box = document.createElement('div'); box.id = 'wnBox'; box.className = 'wn-back';
    box.innerHTML = '<div class="wn-card" role="dialog" aria-modal="true"><h2>✨ Что нового</h2><ul>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><button class="btn" id="wnOk">[ Отлично, понятно! ]</button></div>';
    document.body.appendChild(box);
    document.getElementById('wnOk').onclick = function () { ls('zk_whatsnew_ver', VERSION); box.remove(); };
  });
}
var HS = { village: '', category: '' };
function home() {
  navShow(true, 'home');
  view('<h1>Онлайн-запись к мастерам ЗКО</h1><p class="muted">Выберите мастера и время — он получит уведомление в Телеграме.</p>' + tgNotice() + '<div class="btnrow"><button class="btn" id="hMy">📋 Мои записи</button><button class="btn sec" id="hCab">✂️ Кабинет мастера / Регистрация</button></div><div class="card"><b>Найти мастера</b><label>Село</label><select id="hVil"><option value="">Все сёла</option></select><label>Категория</label><select id="hCat">' + catOptions(HS.category, 'Все категории') + '</select></div><div id="hList"><p class="muted center">Загрузка мастеров…</p></div><button class="btn demo" id="hDemo">🎮 Попробовать демо (без регистрации)</button><div class="card"><b>Как записаться?</b><p class="muted small">Выберите мастера в списке выше, откройте ссылку, которую вам прислал мастер, или нажмите «Записаться онлайн» в карточке мастера в «Картотеке ЗКО». Отметьте услуги и время, подтвердите номер кодом из Телеграма — и запись готова.</p></div><button class="btn sec" id="hCart">📖 Вернуться в Картотеку ЗКО</button><p class="muted small center">' + VERSION + '</p>');
  $('#hMy').onclick = function () { go('#/my'); };
  $('#hCab').onclick = function () { go('#/cab'); };
  $('#hDemo').onclick = function () { enterDemo(); };
  $('#hCart').onclick = function () { window.open(cartUrl(), '_blank'); };
  function load() {
    api('masters', { village: HS.village, category: HS.category, token: '' }).then(function (j) {
      var sel = $('#hVil'); if (!sel) return;
      sel.innerHTML = '<option value="">Все сёла</option>' + j.villages.map(function (v) { return '<option' + (v === HS.village ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('');
      $('#hList').innerHTML = j.masters.length ? j.masters.map(function (m) { return '<button class="mcard' + (m.tier !== 'free' ? ' ' + m.tier : '') + '" data-s="' + esc(m.slug) + '"><b>' + esc(m.name) + '</b> ' + tierBadge(m.tier) + '<br><span class="muted small">' + esc([catLabel(m.category), m.village ? 'с. ' + m.village : '', MODEL[m.mode] || '', m.count ? '★ ' + m.rating + ' (' + m.count + ')' : ''].filter(Boolean).join(' · ')) + '</span></button>'; }).join('') : '<div class="card muted center">Мастеров по этим условиям пока нет.</div>';
      $$('.mcard').forEach(function (b) { b.onclick = function () { masterPage(b.getAttribute('data-s'), '', [], ''); }; });
    }).catch(function (e) { var l = $('#hList'); if (l) l.innerHTML = '<div class="card muted center small">' + (e.message === 'no_gateway' ? 'Список мастеров появится после подключения сервиса.' : esc(errText(e))) + '</div>'; });
  }
  $('#hVil').onchange = function () { HS.village = this.value; load(); };
  $('#hCat').onchange = function () { HS.category = this.value; load(); };
  load();
}
/* ---------- вкладка «Ещё» ---------- */
function morePage() {
  navShow(true, 'more');
  view('<h1>Ещё</h1><button class="btn sec" id="mAbout">ℹ️ О сервисе</button><button class="btn sec" id="mNews">✨ Что нового в версии</button><button class="btn sec" id="mShare">📲 Поделиться ссылкой</button><button class="btn sec" id="mPwa">📲 Установка приложения (PWA)</button><button class="btn sec" id="mRef">🔄 Обновить данные</button><a class="btn sec" target="_blank" rel="noopener" href="' + esc(cartUrl()) + '">📖 Перейти в Картотеку ЗКО</a><a class="btn" target="_blank" rel="noopener" href="' + esc(cartUrl()) + '">➕ Добавить себя в Картотеку ЗКО</a><div class="card" id="mStat"><b>📊 Статистика платформы</b><p class="muted center">Загрузка…</p></div>');
  $('#mAbout').onclick = function () { modal('ℹ️ О сервисе', '<p>«ЗКО Онлайн-записи» — бесплатный сервис записи к мастерам Западно-Казахстанской области. Клиент выбирает услугу и время, мастер сразу получает уведомление в Телеграме.</p><p>Мастера из «Картотеки ЗКО» могут подключить кнопку «Записаться онлайн» прямо в своей карточке.</p><p class="muted small">Версия ' + esc(VERSION) + '</p>'); };
  $('#mNews').onclick = function () { whatsNew(true); };
  $('#mShare').onclick = function () { var u = CFG.siteUrl || (location.origin + location.pathname.replace(/index\.html$/, '')); if (navigator.share) navigator.share({ title: 'ЗКО Онлайн-записи', text: 'Онлайн-запись к мастерам ЗКО', url: u }).catch(function () {}); else copyText(u, 'Ссылка скопирована'); };
  $('#mPwa').onclick = function () {
    if (DEFERRED) { DEFERRED.prompt(); DEFERRED.userChoice.then(function (r) { if (r && r.outcome === 'accepted') ping('pwa'); DEFERRED = null; }); return; }
    modal('📲 Установка приложения', '<p><b>Android (Chrome):</b> меню ⋮ → «Установить приложение» или «Добавить на главный экран».</p><p><b>iPhone (Safari):</b> кнопка «Поделиться» → «На экран Домой».</p><p class="muted small">Если приложение уже установлено, эта подсказка не нужна.</p>');
  };
  $('#mRef').onclick = function () {
    if (DEMO) { toast('В демо обновлять нечего'); return; }
    toast('Обновляю…'); var jobs = [];
    if (window.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.update().catch(function () {}); })); }));
    Promise.all(jobs).catch(function () {}).then(function () { location.reload(); });
  };
  api('statsPublic', { token: '' }).then(function (j) {
    var el = $('#mStat'); if (!el) return;
    el.innerHTML = '<b>📊 Статистика платформы</b><div class="row"><span>Уникальных устройств</span><b>' + j.devices + '</b></div><div class="row"><span>Установок на экран</span><b>' + j.installs + '</b></div><div class="row"><span>Просмотров сегодня</span><b>' + j.today + '</b></div><div class="row"><span>Просмотров за месяц</span><b>' + j.month + '</b></div><div class="row"><span>Просмотров всего</span><b>' + j.total + '</b></div><p class="muted small center">Данные анонимны: без IP и номеров. Визиты Владельца не учитываются.</p>';
  }).catch(function () { var el = $('#mStat'); if (el) el.innerHTML = '<b>📊 Статистика платформы</b><p class="muted small center">Появится после подключения сервиса.</p>'; });
}

/* ---------- ДЕМО-песочница: всё в памяти страницы, в Google Таблицу и Телеграм ничего не уходит ---------- */
function enterDemo(then) {
  var go1 = function () { DEMO = true; TOKEN = ''; window.ZKDemo.start(); showBar(); (then || demoHome)(); };
  if (window.ZKDemo) return go1();
  var sc = document.createElement('script'); sc.src = 'demo.js?v=' + encodeURIComponent(VERSION); sc.onload = go1; sc.onerror = function () { toast('Не удалось загрузить демо. Проверьте интернет.'); }; document.head.appendChild(sc);
}
function showBar() {
  var et = document.getElementById('envtag'); if (et) et.hidden = false;
  var b = document.getElementById('demoBar');
  if (!b) { b = document.createElement('div'); b.id = 'demoBar'; document.body.insertBefore(b, document.body.firstChild); document.body.classList.add('demo-on'); }
  b.innerHTML = '<b>🎮 ДЕМО-РЕЖИМ — данные не сохраняются</b><span><button id="dbRole">Сменить роль</button><button id="dbOut">Выйти из демо</button></span>';
  document.getElementById('dbRole').onclick = function () { TOKEN = ''; go('#/'); demoHome(); };
  var lg = document.getElementById('logo'); if (lg && !lg.getAttribute('data-d')) { lg.setAttribute('data-d', '1'); lg.addEventListener('click', function (e) { if (DEMO) { e.preventDefault(); TOKEN = ''; go('#/'); demoHome(); } }); }
  document.getElementById('dbOut').onclick = function () { location.href = location.pathname; };
}
function demoHome() {
  TOKEN = ''; stopTimer(); navShow(true, 'home');
  view('<h1>🎮 Демо-песочница</h1><p class="muted">Попробуйте сервис по-настоящему — без регистрации и кодов. Ничего не сохраняется: когда закроете вкладку или нажмёте «Выйти из демо», всё исчезнет.</p><div class="card"><b>Войти как тестовый Мастер</b><p class="muted small">Парикмахер-универсал Айгуль, с. Дарьинское. Добавляйте услуги, меняйте график, ставьте выходные, смотрите записи.</p><button class="btn ok" id="dM">💈 Я мастер</button></div><div class="card"><b>Войти как тестовый Клиент</b><p class="muted small">Запись к Айгуль: выберите услуги и время, отмените запись, поставьте оценку за прошлый визит.</p><button class="btn" id="dC">🙋 Я клиент</button></div><p class="muted small center">Если мастер и клиент пользуются одной демо-базой, запись клиента сразу видна в кабинете мастера — переключайтесь кнопкой «Сменить роль».</p>');
  $('#dM').onclick = function () { TOKEN = window.ZKDemo.token('master'); CAB = null; go('#/cab'); cabEntry(); };
  $('#dC').onclick = function () { TOKEN = window.ZKDemo.token('client'); go('#/'); masterPage(window.ZKDemo.slug, '', [], ''); };
}

/* ---------- страница мастера для клиента ---------- */
var P = null;
var EM = ['✂️', '💅', '💇', '🧖', '💆', '🎨', '👁️', '🧴', '💈', '🌿'];
function masterPage(slug, tel, pre, card) {
  navShow(false);
  P = { slug: slug || '', pre: pre || [], sel: {}, cat: null, date: zkoToday(), key: ls('zk_hold') || (function () { var k = rndKey(); ls('zk_hold', k); return k; })(), slot: null, exp: 0 };
  view('<p class="muted center">Загрузка…</p>');
  api('master', Object.assign({ token: '' }, slug ? { slug: slug } : {}, card ? { card: card } : {}, tel ? { tel: tel } : {})).then(function (j) { P.d = j; P.slug = j.master.slug; P.pre.forEach(function (id) { if (j.services.some(function (x) { return String(x.id) === id; })) P.sel[id] = 1; }); renderMaster(); }).catch(function (e) { view('<div class="err">' + esc(errText(e)) + '</div><button class="btn sec" onclick="location.hash=\'#/\'">На главную</button>'); });
}
function cats() { var m = {}, o = []; P.d.services.forEach(function (s) { if (!m[s.category]) { m[s.category] = []; o.push(s.category); } m[s.category].push(s); }); return { map: m, order: o }; }
function sumSel() { var n = 0, t = 0, m = 0; P.d.services.forEach(function (s) { if (P.sel[s.id]) { n++; t += s.price; m += s.minutes; } }); return { n: n, t: t, m: m }; }
function renderMaster() {
  var d = P.d, c = cats(), r = d.rating, s = sumSel();
  var h = '<div class="card"><h1>' + esc(d.master.name) + ' ' + tierBadge(d.master.tier) + '</h1>' + masterMeta(d.master) + (r.count ? '<div>' + stars(r.avg) + ' <b>' + r.avg + '</b> <span class="muted">· оценок: ' + r.count + '</span></div>' : '<div class="muted small">Оценок пока нет</div>') + (d.master.about ? '<p class="muted">' + esc(d.master.about) + '</p>' : '') + '<button class="btn sec sm" id="mRev">⭐ Отзывы</button></div>';
  if (!d.services.length) h += '<div class="card muted">У мастера пока нет услуг.</div>';
  else if (P.cat === null && c.order.length > 1) {
    h += '<h2>Выберите раздел</h2><div class="tiles">' + c.order.map(function (k, i) { var cnt = c.map[k].filter(function (x) { return P.sel[x.id]; }).length; return '<button class="tile' + (cnt ? ' on' : '') + '" data-c="' + esc(k) + '"><span class="em">' + EM[i % EM.length] + '</span>' + esc(k) + '<span class="n">' + c.map[k].length + ' усл.' + (cnt ? ' · выбрано ' + cnt : '') + '</span></button>'; }).join('') + '</div>';
  } else {
    var key = P.cat === null ? c.order[0] : P.cat;
    h += (c.order.length > 1 ? '<button class="back" id="mBack">⬅️ Назад к разделам</button>' : '') + '<h2>' + esc(key) + '</h2>' + c.map[key].map(function (x) { return '<button class="svc' + (P.sel[x.id] ? ' on' : '') + '" data-s="' + esc(x.id) + '"><span class="chk">' + (P.sel[x.id] ? '✓' : '') + '</span><span class="t">' + esc(x.title) + '<br><span class="m">' + dur(x.minutes) + '</span></span><span class="p">' + money(x.price) + '</span></button>'; }).join('');
  }
  h += '<div class="bar"><div class="in">' + (s.n ? '<div class="row"><b>Выбрано: ' + s.n + '</b><span style="text-align:right"><b>' + money(s.t) + '</b> · ' + dur(s.m) + '</span></div>' : '<div class="muted center small">Отметьте одну или несколько услуг</div>') + '<button class="btn" id="mNext"' + (s.n ? '' : ' disabled') + '>🕒 Выбрать время</button></div></div>';
  view(h);
  $$('.tile').forEach(function (b) { b.onclick = function () { P.cat = b.getAttribute('data-c'); renderMaster(); }; });
  $$('.svc').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-s'); if (P.sel[id]) delete P.sel[id]; else P.sel[id] = 1; var y = window.scrollY; renderMaster(); window.scrollTo(0, y); }; });
  var bk = $('#mBack'); if (bk) bk.onclick = function () { P.cat = null; renderMaster(); };
  $('#mNext').onclick = function () { P.date = zkoToday(); timePage(); };
  $('#mRev').onclick = reviewsPage;
}
function reviewsPage() {
  view('<button class="back" id="bk">⬅️ Назад</button><h2>Отзывы</h2><p class="muted center">Загрузка…</p>');
  $('#bk').onclick = renderMaster;
  api('reviews', { slug: P.slug, token: '' }).then(function (j) {
    view('<button class="back" id="bk">⬅️ Назад</button><h2>Отзывы · ' + (j.rating.count ? j.rating.avg + ' из 5' : 'пока нет') + '</h2>' + (j.reviews.length ? j.reviews.map(function (r) { return '<div class="card">' + stars(r.stars) + ' <b>' + esc(r.name) + '</b> <span class="muted small">' + esc(r.date) + '</span><p>' + esc(r.comment || '') + '</p></div>'; }).join('') : '<p class="muted">Отзывы появляются только после состоявшихся визитов.</p>'));
    $('#bk').onclick = renderMaster;
  });
}
function selIds() { return Object.keys(P.sel); }
function timePage() {
  var t = zkoToday(), tm = addDay(t, 1), s = sumSel();
  var h = '<button class="back" id="bk">⬅️ Назад к услугам</button><div class="card"><b>' + esc(P.d.master.name) + '</b><div class="muted small">' + s.n + ' усл. · ' + dur(s.m) + ' · ' + money(s.t) + '</div></div><h2>Дата</h2><div class="chips"><button class="chip' + (P.date === t ? ' on' : '') + '" data-d="' + t + '">Сегодня</button><button class="chip' + (P.date === tm ? ' on' : '') + '" data-d="' + tm + '">Завтра</button><button class="chip' + (P.date !== t && P.date !== tm ? ' on' : '') + '" id="dOther">📅 ' + (P.date !== t && P.date !== tm ? ruDate(P.date) : 'Другая дата') + '</button></div><input type="date" id="dPick" min="' + t + '" max="' + addDay(t, 30) + '" hidden><h2>' + ruDate(P.date) + '</h2><div id="sl"><p class="muted center">Загрузка…</p></div>';
  view(h);
  $('#bk').onclick = function () { api('unhold', { key: P.key, token: '' }).catch(function () {}); renderMaster(); };
  $$('.chip[data-d]').forEach(function (b) { b.onclick = function () { P.date = b.getAttribute('data-d'); timePage(); }; });
  $('#dOther').onclick = function () { var i = $('#dPick'); i.hidden = false; try { i.showPicker(); } catch (e) { i.focus(); } };
  $('#dPick').onchange = function () { if (this.value) { P.date = this.value; timePage(); } };
  api('slots', { slug: P.slug, date: P.date, minutes: s.m, key: P.key, token: '' }).then(function (j) {
    var el = $('#sl'); if (!el) return;
    el.innerHTML = j.slots.length ? '<div class="slots">' + j.slots.map(function (x) { return '<button class="slot" data-t="' + x + '">' + x + '</button>'; }).join('') + '</div>' : '<div class="card muted center">На этот день свободного времени нет. Выберите другую дату.</div>';
    $$('.slot').forEach(function (b) { b.onclick = function () { holdSlot(b.getAttribute('data-t')); }; });
  }).catch(function (e) { $('#sl').innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; });
}
function holdSlot(start) {
  api('hold', { slug: P.slug, date: P.date, start: start, serviceIds: selIds(), key: P.key, token: '' }).then(function (j) {
    P.slot = start; P.exp = Date.now() + j.seconds * 1000; confirmPage();
  }).catch(function (e) { toast(errText(e)); timePage(); });
}
function confirmPage() {
  var s = sumSel(), names = P.d.services.filter(function (x) { return P.sel[x.id]; }).map(function (x) { return x.title; }).join(', ');
  view('<button class="back" id="bk">⬅️ Другое время</button><div class="timer" id="tm"></div><div class="card"><b>' + esc(P.d.master.name) + '</b><br>📅 ' + ruDate(P.date) + ' в <b>' + P.slot + '</b><br>💈 ' + esc(names) + '<br>💰 ' + money(s.t) + ' · ' + dur(s.m) + '</div><label>Ваше имя</label><input id="cName" maxlength="50" placeholder="Как к вам обращаться" value="' + esc(ls('zk_name') || '') + '"><div id="cAuth"></div><div id="cErr"></div>');
  var mdl = P.d.master.mode, ph = '';
  if (mdl === 'visit') ph = '<p class="muted small">🚗 Мастер выезжает на дом.</p><label>Ваш адрес</label><input id="cAddr" maxlength="120" placeholder="Село, улица, дом">';
  else if (mdl === 'both') ph = '<label>Где принять?</label><select id="cPl"><option value="s">У мастера' + (P.d.master.address ? ' (' + esc(P.d.master.address) + ')' : '') + '</option><option value="c">Выезд ко мне</option></select><div id="cAW" hidden><label>Ваш адрес</label><input id="cAddr" maxlength="120" placeholder="Село, улица, дом"></div>';
  else if (P.d.master.address) ph = '<p class="muted small">📍 Адрес мастера: ' + esc(P.d.master.address) + '</p>';
  $('#cAuth').insertAdjacentHTML('beforebegin', ph);
  if ($('#cPl')) $('#cPl').onchange = function () { $('#cAW').hidden = this.value !== 'c'; };
  $('#bk').onclick = function () { api('unhold', { key: P.key, token: '' }).catch(function () {}); timePage(); };
  function tick() {
    var left = Math.max(0, Math.round((P.exp - Date.now()) / 1000)), el = $('#tm'); if (!el) return;
    el.textContent = '🔒 Время удержано для вас: ' + Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2); el.className = 'timer' + (left < 60 ? ' low' : '');
    if (left <= 0) { stopTimer(); toast('Время удержания вышло. Выберите слот заново.'); timePage(); }
  }
  tick(); TIMER = setInterval(tick, 1000);
  function doBook() {
    var nm = ($('#cName').value || '').trim(); if (nm.length < 2) { $('#cErr').innerHTML = '<div class="err">Введите имя.</div>'; return; } ls('zk_name', nm);
    api('book', { slug: P.slug, date: P.date, start: P.slot, serviceIds: selIds(), name: nm, holdKey: P.key, place: mdl === 'visit' ? 'c' : ($('#cPl') ? $('#cPl').value : 's'), addr: $('#cAddr') ? $('#cAddr').value : '' }).then(function (j) { done(j.booking); })
      .catch(function (e) { $('#cErr').innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; if (e.message === 'slot_taken') setTimeout(timePage, 1500); });
  }
  var a = $('#cAuth');
  if (TOKEN) { a.innerHTML = consentHtml() + '<button class="btn ok" id="cBook">✅ Записаться</button>'; consentBind(a); $('#cBook').onclick = function () { if (!consentOn(a)) { $('#cErr').innerHTML = '<div class="err">' + CONSENT_ERR + '</div>'; return; } doBook(); }; }
  else { a.appendChild(loginBlock(function () { doBook(); }, { title: 'Подтвердите номер телефона', noBack: true })); }
}
function done(b) {
  view('<div class="card center"><div style="font-size:48px">✅</div><h1>Вы записаны!</h1><p>' + esc(b.master) + '<br>📅 ' + ruDate(b.date) + ' в <b>' + esc(b.start) + '</b><br>' + '<br>' + esc(b.services) + '<br>' + money(b.total) + (b.place === 'c' ? '<br>🚗 Мастер приедет: ' + esc(b.addr) : (b.masterAddress ? '<br>📍 ' + esc(b.masterAddress) : '')) + '</p><p class="muted small">Подтверждение придёт в Телеграм' + (P && P.d && P.d.master.tier !== 'free' ? ', а за 2 часа до визита — напоминание.' : '.') + '</p></div><button class="btn" id="dMy">📋 Мои записи</button><button class="btn sec" id="dHome">На главную</button>');
  $('#dMy').onclick = function () { go('#/my'); }; $('#dHome').onclick = function () { go('#/'); };
}

/* ---------- мои записи ---------- */
function banHtml(j) {
  if (j.ban) return '<div class="err"><b>🚫 Запись закрыта' + (j.ban.until ? ' до ' + dmy(j.ban.until) : '') + '</b><br>Причина: ' + esc(j.ban.reason) + '.' + (j.ban.until ? '<br>Доступ вернётся автоматически в этот день.' : '') + '</div>';
  if (j.noshows > 0) return '<div class="notice">⚠️ Неявок: <b>' + j.noshows + ' из 3</b>. После третьей неявки запись закрывается на 14 дней. Если не можете прийти — отмените запись заранее.</div>';
  return '';
}
function myPage() {
  navShow(true, 'my');
  if (DEMO && !TOKEN) return demoHome();
  if (!TOKEN) { view('<h1>Мои записи</h1>'); APP.appendChild(loginBlock(myPage)); return; }
  view('<h1>Мои записи</h1><p class="muted center">Загрузка…</p>');
  api('myBookings').then(function (j) {
    var stl = { booked: ['Запись активна', 'ok'], done: ['Визит состоялся', ''], noshow: ['Не пришёл', 'red'], cancelled: ['Отменена', 'red'] };
    view('<h1>Мои записи</h1>' + banHtml(j) + (j.bookings.length ? j.bookings.map(function (b) { var st = stl[b.status] || [b.status, '']; return '<div class="card"><b>' + esc(b.master) + '</b> <span class="badge ' + st[1] + '">' + st[0] + '</span><br>📅 ' + ruDate(b.date) + ' в ' + esc(b.start) + '<br>💈 ' + esc(b.services) + ' · ' + money(b.total) + (b.place === 'c' ? '<br>🚗 Выезд: ' + esc(b.addr) : (b.masterAddress ? '<br>📍 ' + esc(b.masterAddress) : '')) + '<div>' + (b.status === 'booked' ? '<button class="btn sec sm" data-c="' + b.id + '">❌ Отменить</button>' : '') + (b.canRate ? '<button class="btn sm" data-r="' + b.id + '">⭐ Оценить</button>' : '') + (b.slug ? '<button class="btn sec sm" data-a="' + esc(b.slug) + '">🔄 Записаться снова</button>' : '') + '</div></div>'; }).join('') : '<div class="card muted">Записей пока нет.</div>') + '<button class="btn sec" id="myOut">Выйти</button>');
    $$('[data-c]').forEach(function (b) { b.onclick = function () { if (confirm('Отменить запись?')) api('cancelBooking', { id: b.getAttribute('data-c') }).then(function () { toast('Запись отменена'); myPage(); }).catch(function (e) { toast(errText(e)); }); }; });
    $$('[data-r]').forEach(function (b) { b.onclick = function () { ratePage(b.getAttribute('data-r')); }; });
    $$('[data-a]').forEach(function (b) { b.onclick = function () { masterPage(b.getAttribute('data-a'), '', [], ''); }; });
    $('#myOut').onclick = function () { if (DEMO) { TOKEN = ''; go('#/'); demoHome(); return; } api('logout').catch(function () {}); setToken(''); go('#/'); route(); };
  }).catch(function (e) { if (e.message === 'auth_required') myPage(); else view('<div class="err">' + esc(errText(e)) + '</div>'); });
}
function ratePage(id) {
  var st = 0;
  view('<button class="back" id="bk">⬅️ Назад</button><h1>Оцените визит</h1><div class="card center"><div id="rs" style="font-size:40px"></div></div><label>Комментарий (по желанию)</label><textarea id="rc" rows="3" maxlength="300"></textarea><p class="muted small">Одна оценка на одного мастера. Новая оценка заменяет прежнюю.</p><button class="btn ok" id="rOk">Отправить</button><div id="rE"></div>');
  function draw() { $('#rs').innerHTML = [1, 2, 3, 4, 5].map(function (i) { return '<span data-i="' + i + '" class="stars" style="cursor:pointer">' + (i <= st ? '★' : '☆') + '</span>'; }).join(''); $$('#rs span').forEach(function (s) { s.onclick = function () { st = +s.getAttribute('data-i'); draw(); }; }); }
  draw(); $('#bk').onclick = myPage;
  $('#rOk').onclick = function () { api('rate', { bookingId: id, stars: st, comment: $('#rc').value }).then(function () { toast('Спасибо за оценку!'); myPage(); }).catch(function (e) { $('#rE').innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; }); };
}

/* ---------- мастер: вход / регистрация / ПИН ---------- */
function cabEntry() {
  navShow(true, 'cab');
  if (DEMO && !TOKEN) return demoHome();
  if (!TOKEN) { view('<h1>Кабинет мастера</h1><p class="muted">Вход по номеру телефона. Новый мастер регистрируется после подтверждения номера.</p>'); APP.appendChild(loginBlock(function () { cabEntry(); })); return; }
  api('me').then(function (j) {
    if (!j.isMaster) return regPage();
    if (j.needPin) return pinPage();
    CAB = j; if (j.owner) ls('zk_owner', '1'); ping('master'); cab(ls('zk_tab') || 'rec');
  }).catch(function (e) { if (e.message === 'auth_required') cabEntry(); else view('<div class="err">' + esc(errText(e)) + '</div>'); });
}
function regPage() {
  view('<h1>Регистрация мастера</h1>' + tgNotice() + '<div class="card"><label>Ваше имя или название</label><input id="rn" maxlength="60" placeholder="Анара · Красота"><label>Адрес вашей страницы (латиницей)</label><input id="rs" maxlength="30" placeholder="anara_beauty" autocapitalize="none"><label>Категория</label><select id="rc">' + catOptions('', '— выберите —') + '</select><label>Село</label><input id="rv" maxlength="40" placeholder="например Дарьинское"><label>Формат приёма</label><select id="rm"><option value="home">Приём у себя (с адресом)</option><option value="visit">Выезд на дом</option><option value="both">Оба варианта</option></select><label>Ваш адрес (для приёма у себя)</label><input id="rd" maxlength="100" placeholder="ул. Центральная, 1"><label>О себе (по желанию)</label><textarea id="ra" rows="3" maxlength="400"></textarea><label>Придумайте ПИН-код (4 цифры)</label><input id="rp" inputmode="numeric" maxlength="4" type="password" placeholder="••••"><p class="muted small">ПИН защищает кабинет на новом устройстве. Запомните его: восстановить может только администратор.</p>' + consentHtml() + '<button class="btn ok" id="rOk">Создать кабинет</button><div id="rE"></div></div>');
  consentBind(APP);
  $('#rOk').onclick = function () { if (!consentOn(APP)) { $('#rE').innerHTML = '<div class="err">' + CONSENT_ERR + '</div>'; return; } api('masterRegister', { name: $('#rn').value, slug: $('#rs').value.trim().toLowerCase(), about: $('#ra').value, pin: $('#rp').value, category: $('#rc').value, village: $('#rv').value, mode: $('#rm').value, address: $('#rd').value }).then(function () { toast('Кабинет создан!'); cabEntry(); }).catch(function (e) { $('#rE').innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; }); };
}
function pinPage() {
  var v = '';
  view('<h1>Введите ПИН-код</h1><div class="dots" id="dt"></div><div class="pin">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map(function (k) { return '<button data-k="' + k + '">' + k + '</button>'; }).join('') + '</div><div id="pE"></div><button class="btn sec" id="pOut">Выйти</button>');
  function draw() { $('#dt').textContent = '●'.repeat(v.length) + '○'.repeat(4 - v.length); }
  draw();
  function submit() { api('pinLogin', { pin: v }).then(function () { cabEntry(); }).catch(function (e) { v = ''; draw(); $('#pE').innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; }); }
  $$('.pin button').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-k'); if (k === '⌫') v = v.slice(0, -1); else if (k === '✓') { if (v.length === 4) submit(); } else if (v.length < 4) { v += k; if (v.length === 4) { draw(); submit(); return; } } draw(); }; });
  $('#pOut').onclick = function () { api('logout').catch(function () {}); setToken(''); cabEntry(); };
}

/* ---------- кабинет мастера ---------- */
var CAB = null;
var TABS = [['rec', '📋 Записи'], ['svc', '💈 Услуги'], ['wk', '🕒 График'], ['cl', '🚫 Клиенты'], ['rv', '⭐ Отзывы'], ['bal', '💎 Тарифы']];
function cab(tab) {
  navShow(true, 'cab');
  ls('zk_tab', tab);
  var m = CAB.master, link = (CFG.siteUrl || (location.origin + location.pathname.replace(/index\.html$/, ''))) + '?m=' + m.slug; if (DEMO) link = 'В демо ссылка не создаётся';
  view('<div class="card"><b>' + esc(m.name) + '</b> ' + subBadge(CAB.sub) + '<div class="muted small">Ваша ссылка для клиентов:</div><input readonly id="lnk" value="' + esc(link) + '" onclick="this.select()"><button class="btn sec sm" id="cp">📋 Копировать ссылку</button><button class="btn sec sm" id="cNews">✨ Что нового в версии</button><button class="btn sec sm" id="cOut">Выйти</button></div><div class="tabs">' + TABS.map(function (t) { return '<button class="tab' + (t[0] === tab ? ' on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '<button class="tab' + (tab === 'pf' ? ' on' : '') + '" data-t="pf">⚙️ Профиль</button></div><div id="tb"></div>');
  $$('.tab').forEach(function (b) { b.onclick = function () { cab(b.getAttribute('data-t')); }; });
  $('#cp').onclick = function () { try { navigator.clipboard.writeText(link); toast('Ссылка скопирована'); } catch (e) { $('#lnk').select(); } };
  $('#cNews').onclick = function () { whatsNew(true); };
  $('#cOut').onclick = function () { if (DEMO) { TOKEN = ''; go('#/'); demoHome(); return; } api('logout').catch(function () {}); setToken(''); go('#/'); route(); };
  ({ rec: tRec, svc: tSvc, wk: tWk, cl: tCl, rv: tRv, bal: tBal, pf: tPf })[tab]($('#tb'));
}
function refreshCab(tab) { api('me').then(function (j) { CAB = j; cab(tab); }).catch(function (e) { toast(errText(e)); if (e.message === 'pin_required' || e.message === 'auth_required') cabEntry(); }); }
function tRec(el) {
  var from = zkoToday(), to = addDay(from, 14);
  el.innerHTML = '<p class="muted center">Загрузка…</p>';
  api('masterBookings', { from: from, to: to }).then(function (j) {
    var stl = { booked: ['Ожидается', ''], done: ['Состоялся', 'ok'], noshow: ['Не пришёл', 'red'], cancelled: ['Отменена', 'red'] };
    el.innerHTML = '<h2>Записи на 14 дней</h2>' + (j.bookings.length ? j.bookings.map(function (b) { var st = stl[b.status] || [b.status, '']; return '<div class="card"><b>' + ruDate(b.date) + ' · ' + esc(b.start) + '</b> <span class="badge ' + st[1] + '">' + st[0] + '</span><br>👤 ' + esc(b.name) + ' · +' + esc(b.client) + (b.place === 'c' ? '<br>🚗 Выезд: ' + esc(b.addr) : '') + '<br>💈 ' + esc(b.services) + ' · ' + money(b.total) + '<div>' + (b.status === 'booked' ? '<button class="btn ok sm" data-s="done" data-i="' + b.id + '">✔ Визит завершён</button><button class="btn sec sm" data-s="noshow" data-i="' + b.id + '">❌ Клиент не пришёл</button><button class="btn red sm" data-s="cancelled" data-i="' + b.id + '">❌ Отменить</button>' : '') + (b.status === 'noshow' || b.status === 'done' ? '<button class="btn sec sm" data-bl="' + b.id + '">🚫 В чёрный список</button>' : '') + '</div></div>'; }).join('') : '<div class="card muted">Записей пока нет.</div>');
    $$('[data-s]', el).forEach(function (b) { b.onclick = function () { var s = b.getAttribute('data-s'); if (s === 'cancelled' && !confirm('Отменить запись? Клиент получит уведомление.')) return; if (s === 'noshow' && !confirm('Отметить: клиент не пришёл? 100 ₸ с баланса не спишутся. После 3 неявок клиент получит бан на 14 дней.')) return; api('bookingMark', { id: b.getAttribute('data-i'), status: s }).then(function () { toast('Готово'); tRec(el); }).catch(function (e) { toast(errText(e)); }); }; });
    $$('[data-bl]', el).forEach(function (b) { b.onclick = function () { if (confirm('Добавить клиента в ваш чёрный список?')) api('blAdd', { bookingId: b.getAttribute('data-bl') }).then(function () { toast('Клиент в чёрном списке'); }).catch(function (e) { toast(errText(e)); }); }; });
  }).catch(function (e) { el.innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; });
}
function tSvc(el) {
  var act = CAB.services.filter(function (s) { return s.status !== 'off'; });
  el.innerHTML = '<h2>Мой прайс-лист</h2><div class="muted small">' + (CAB.sub.tariff ? 'VIP: услуг без ограничений (сейчас ' + CAB.services.length + ')' : 'Бесплатный тариф: ' + CAB.services.length + ' из ' + CAB.freeLimit + ' услуг') + '</div>' + CAB.services.map(function (s) { return '<div class="card"><b>' + esc(s.title) + '</b><br><span class="muted">' + esc(s.category) + ' · ' + dur(s.minutes) + '</span> · <b>' + money(s.price) + '</b><div><button class="btn sec sm" data-e="' + s.id + '">✏️ Изменить</button><button class="btn red sm" data-d="' + s.id + '">🗑</button></div></div>'; }).join('') + '<button class="btn" id="sAdd">➕ Добавить услугу</button><div id="sf"></div>';
  function form(s) {
    s = s || { title: '', category: '', price: '', minutes: 60 };
    var opts = ''; for (var m = 30; m <= 480; m += 30) opts += '<option value="' + m + '"' + (+s.minutes === m ? ' selected' : '') + '>' + dur(m) + '</option>';
    var cl = Array.from(new Set(CAB.services.map(function (x) { return x.category; })));
    $('#sf', el).innerHTML = '<div class="card"><h2>' + (s.id ? 'Изменить услугу' : 'Новая услуга') + '</h2><label>Раздел (категория)</label><input id="fc" list="cl" maxlength="40" value="' + esc(s.category) + '" placeholder="Например: Стрижки"><datalist id="cl">' + cl.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist><label>Название</label><input id="ft" maxlength="60" value="' + esc(s.title) + '"><label>Цена, ₸</label><input id="fp" inputmode="numeric" value="' + esc(s.price) + '"><label>Длительность</label><select id="fm">' + opts + '</select><button class="btn ok" id="fOk">Сохранить</button><div id="fE"></div></div>';
    $('#fOk', el).onclick = function () { api('serviceSave', { id: s.id || '', category: $('#fc').value, title: $('#ft').value, price: $('#fp').value, minutes: $('#fm').value }).then(function () { toast('Сохранено'); refreshCab('svc'); }).catch(function (e) { $('#fE', el).innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; }); };
  }
  $('#sAdd', el).onclick = function () { form(); };
  $$('[data-e]', el).forEach(function (b) { b.onclick = function () { form(CAB.services.filter(function (s) { return s.id === b.getAttribute('data-e'); })[0]); }; });
  $$('[data-d]', el).forEach(function (b) { b.onclick = function () { if (confirm('Удалить услугу?')) api('serviceDelete', { id: b.getAttribute('data-d') }).then(function () { refreshCab('svc'); }).catch(function (e) { toast(errText(e)); }); }; });
}
function timeOpts(sel, blank) { var o = blank ? '<option value="">—</option>' : ''; for (var m = 0; m < 1440; m += 30) { var v = ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); o += '<option' + (v === sel ? ' selected' : '') + '>' + v + '</option>'; } return o; }
function tWk(el) {
  var dn = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  el.innerHTML = '<h2>Рабочие часы</h2><p class="muted small">Шаг записи — 30 минут. Перерыв необязателен.</p>' + CAB.week.map(function (d, i) { return '<div class="card"><label style="display:flex;gap:8px;align-items:center;color:var(--tx);font-weight:700"><input type="checkbox" style="width:auto;margin:0" data-on="' + i + '"' + (d.on ? ' checked' : '') + '> ' + dn[i] + '</label><div class="tm"><div><label>С</label><select data-s="' + i + '">' + timeOpts(d.start, 1) + '</select></div><div><label>До</label><select data-e="' + i + '">' + timeOpts(d.end, 1) + '</select></div><div><label>Перерыв с</label><select data-bs="' + i + '">' + timeOpts(d.bs, 1) + '</select></div><div><label>Перерыв до</label><select data-be="' + i + '">' + timeOpts(d.be, 1) + '</select></div></div></div>'; }).join('') + '<button class="btn ok" id="wSave">💾 Сохранить график</button><div id="wE"></div><h2>Выходные даты</h2><div class="row"><input type="date" id="oDate" min="' + zkoToday() + '"><button class="btn sec sm" id="oAdd" style="flex:none">Сделать выходным</button></div>' + (CAB.offDays.length ? CAB.offDays.map(function (d) { return '<span class="badge red" style="margin:4px 4px 0 0">' + ruDate(d) + ' <a href="#" data-x="' + d + '" style="color:inherit">✕</a></span>'; }).join('') : '<p class="muted small">Исключений нет.</p>');
  $('#wSave', el).onclick = function () {
    var week = CAB.week.map(function (d, i) { return { d: i + 1, on: $('[data-on="' + i + '"]', el).checked, start: $('[data-s="' + i + '"]', el).value, end: $('[data-e="' + i + '"]', el).value, bs: $('[data-bs="' + i + '"]', el).value, be: $('[data-be="' + i + '"]', el).value }; });
    api('scheduleSave', { week: week }).then(function () { toast('График сохранён'); refreshCab('wk'); }).catch(function (e) { $('#wE', el).innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; });
  };
  $('#oAdd', el).onclick = function () { var v = $('#oDate', el).value; if (v) api('offDay', { date: v, off: true }).then(function () { refreshCab('wk'); }).catch(function (e) { toast(errText(e)); }); };
  $$('[data-x]', el).forEach(function (a) { a.onclick = function (ev) { ev.preventDefault(); api('offDay', { date: a.getAttribute('data-x'), off: false }).then(function () { refreshCab('wk'); }); }; });
}
function tCl(el) {
  el.innerHTML = '<h2>Мой чёрный список</h2><p class="muted small">Заблокированный клиент не сможет записаться к вам. Если один номер получит блокировки от 3 разных мастеров, он блокируется на всей платформе.</p><p class="muted center">Загрузка…</p>';
  api('blList').then(function (j) {
    el.innerHTML = '<h2>Мой чёрный список</h2><p class="muted small">Заблокированный клиент не сможет записаться к вам. Если один номер получит блокировки от 3 разных мастеров, он блокируется на всей платформе.</p>' + (j.list.length ? j.list.map(function (c) { return '<div class="card">👤 ' + esc(c.name || 'Клиент') + ' · +' + esc(c.phone) + '<div><button class="btn sec sm" data-u="' + esc(c.phone) + '">♻️ Убрать</button></div></div>'; }).join('') : '<div class="card muted">Список пуст. Добавить клиента можно во вкладке «Записи» (после визита или неявки).</div>');
    $$('[data-u]', el).forEach(function (b) { b.onclick = function () { api('blRemove', { phone: b.getAttribute('data-u') }).then(function () { tCl(el); }); }; });
  }).catch(function (e) { el.innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; });
}
function tRv(el) {
  el.innerHTML = '<p class="muted center">Загрузка…</p>';
  api('reviews', { slug: CAB.master.slug, token: '' }).then(function (j) {
    el.innerHTML = '<h2>Мой рейтинг: ' + (j.rating.count ? j.rating.avg + ' ★ (' + j.rating.count + ')' : 'пока нет') + '</h2>' + (j.reviews.length ? j.reviews.map(function (r) { return '<div class="card">' + stars(r.stars) + ' <b>' + esc(r.name) + '</b> <span class="muted small">' + esc(r.date) + '</span><p>' + esc(r.comment || '') + '</p></div>'; }).join('') : '<div class="card muted">Оценки приходят только после завершённых визитов. Отмечайте визиты кнопкой «✔ Визит завершён».</div>');
  });
}
function tBal(el) {
  var s = CAB.sub, k = CAB.kaspi || {}, ok = !s.needCard, pr = CAB.premium || [];
  var st = s.level === 'premium' ? '👑 VIP Premium ' + (s.forever ? 'навсегда' : 'до <b>' + dmy(s.until) + '</b> (осталось ' + s.daysLeft + ' дн.)') : (s.level === 'light' ? '💎 VIP Light · баланс <b>' + money(s.balance) + '</b>' : (s.paused ? '⏸ VIP Light на паузе · баланс ' + money(s.balance) + ' (нужно от 100 ₸)' : '🆓 Бесплатный старт'));
  var h = '<h2>Тарифы и пополнение</h2><div class="card"><b>Сейчас:</b> ' + st + '</div>';
  if (!ok) h += '<div class="notice">⚠️ <b>VIP Light и VIP Premium доступны только мастерам с карточкой в Картотеке ЗКО.</b> Добавьте себя в Картотеку и впишите номер карточки в «Профиле». На «Бесплатном старте» карточка не обязательна.</div><a class="btn" target="_blank" rel="noopener" href="' + esc(cartUrl()) + '">➕ Добавить себя в Картотеку ЗКО</a><button class="btn sec" id="bPf">⚙️ Открыть профиль</button>';
  h += '<div class="card"><b>🆓 Бесплатный старт</b> — 0 ₸ навсегда<br><span class="muted small">Без плашки · до 3 онлайн-записей в сутки · до 3 услуг · без кнопки в Картотеке · без авто-напоминаний клиенту за 2 часа</span></div>' +
    '<div class="card tier light"><b>💎 VIP Light</b> <span class="badge teal">бирюзовая плашка</span><br>Оплата по факту: <b>100 ₸ за каждый состоявшийся визит</b>. При отмене или неявке клиента 100 ₸ не списываются. Пополняйте баланс на любую сумму через Kaspi.<br><span class="muted small">Безлимит записей и услуг · кнопка в Картотеке · авто-напоминания клиенту за 2 часа. Если баланс меньше 100 ₸ — плашка и кнопка на паузе.</span></div>' +
    '<div class="card tier gold"><b>👑 VIP Premium</b> <span class="badge gold">золотая плашка</span><br>Подписка без списаний с баланса:<br>' + pr.map(function (x) { return '• ' + esc(x.label) + ' — <b>' + money(x.price) + '</b>'; }).join('<br>') + '<br><span class="muted small">Первые места в списке · безлимит записей и услуг · кнопка в Картотеке · авто-напоминания · приоритетная помощь Владельца в настройке.</span></div>';
  if (ok) {
    var cmt = 'VIP ' + CAB.master.name + ' +' + CAB.phone;
    h += '<div class="card" id="kaspi"><b>💳 Оплата через Kaspi</b><div class="row"><span>Номер Kaspi</span><b>' + esc(k.phone) + '</b></div><button class="btn sec sm" id="kNum">📋 Скопировать номер Kaspi</button><div class="row"><span>Получатель</span><b>' + esc(k.name) + '</b></div><button class="btn sec sm" id="kNm">📋 Скопировать имя получателя</button><label>Что оплачиваете</label><select id="kWhat"><option value="light">VIP Light — пополнение баланса</option>' + pr.map(function (x) { return '<option value="' + x.key + '">VIP Premium — ' + esc(x.label) + ' (' + money(x.price) + ')</option>'; }).join('') + '</select><div id="kAmW"><label>Сумма пополнения, ₸</label><input id="kAm" inputmode="numeric" value="1000"></div><label>Комментарий к переводу (вставьте при оплате)</label><input id="kCm" readonly value="' + esc(cmt) + '" onclick="this.select()"><button class="btn sec sm" id="kCp">📋 Скопировать комментарий</button><button class="btn ok" id="kSend">✅ Отправить чек Владельцу в Telegram</button><p class="muted small">Переведите деньги на Kaspi, затем нажмите кнопку: откроется чат с Владельцем с готовым текстом — прикрепите чек из Kaspi. После проверки Владелец зачислит оплату, а бот пришлёт вам уведомление.</p></div>';
  }
  if ((CAB.ledger || []).length) h += '<div class="card"><b>История баланса</b>' + CAB.ledger.map(function (x) { return '<div class="row"><span class="small">' + esc(String(x.date).slice(0, 16)) + ' · ' + esc(x.note) + '</span><b class="' + (x.delta < 0 ? 'neg' : 'pos') + '">' + (x.delta > 0 ? '+' : '') + x.delta + ' ₸</b></div>'; }).join('') + '</div>';
  h += '<p class="muted small">Указанные расценки могут обновляться по мере развития сервиса. Однако для всех уже оплаченных и активированных пакетов VIP Light и VIP Premium условия и стоимость фиксируются на весь оплаченный период (а для тарифа «Навсегда» — бессрочно) и изменению не подлежат.</p>';
  el.innerHTML = h;
  if ($('#bPf', el)) $('#bPf', el).onclick = function () { cab('pf'); };
  if (!ok) return;
  var amW = $('#kAmW', el), what = $('#kWhat', el);
  what.onchange = function () { amW.hidden = what.value !== 'light'; };
  $('#kNum', el).onclick = function () { copyText(k.phone, 'Номер Kaspi скопирован'); };
  $('#kNm', el).onclick = function () { copyText(k.name, 'Имя получателя скопировано'); };
  $('#kCp', el).onclick = function () { copyText($('#kCm', el).value, 'Комментарий скопирован'); };
  $('#kSend', el).onclick = function () {
    var w = what.value, amt = w === 'light' ? Math.max(0, parseInt($('#kAm', el).value, 10) || 0) : 0, label = w === 'light' ? 'пополнение VIP Light на ' + amt + ' ₸' : 'VIP Premium (' + (pr.filter(function (x) { return x.key === w; })[0] || {}).label + ')';
    var text = 'Здравствуйте! Оплатил(а) через Kaspi: ' + label + '. Мастер: ' + CAB.master.name + ' (' + CAB.master.slug + '), телефон +' + CAB.phone + '. Комментарий к переводу: ' + $('#kCm', el).value + '. Прикрепляю чек из Kaspi. Прошу зачислить.';
    if (DEMO) { toast('В демо ничего не отправляется'); return; }
    var u = k.tg ? 'https://t.me/' + encodeURIComponent(k.tg) + '?text=' + encodeURIComponent(text) : 'https://t.me/share/url?url=' + encodeURIComponent(CFG.siteUrl || location.href.split('#')[0]) + '&text=' + encodeURIComponent(text);
    window.open(u, '_blank');
    api('topupRequest', { amount: amt }).then(function () { toast('Владельцу отправлено уведомление. Пришлите чек в чат.'); }).catch(function (e) { toast(errText(e)); });
  };
}
function tPf(el) {
  var m = CAB.master;
  el.innerHTML = '<h2>Профиль</h2><div class="card"><label>Имя / название</label><input id="pn" maxlength="60" value="' + esc(m.name) + '"><label>О себе</label><textarea id="pa" rows="3" maxlength="400">' + esc(m.about) + '</textarea><label>Категория</label><select id="pcat">' + catOptions(m.category, '— не выбрана —') + '</select><label>Село</label><input id="pv" maxlength="40" placeholder="например Дарьинское" value="' + esc(m.village || '') + '"><label>Формат приёма</label><select id="pm"><option value="home"' + (m.mode === 'home' ? ' selected' : '') + '>Приём у себя (с адресом)</option><option value="visit"' + (m.mode === 'visit' ? ' selected' : '') + '>Выезд на дом</option><option value="both"' + (m.mode === 'both' ? ' selected' : '') + '>Оба варианта</option></select><label>Ваш адрес (для приёма у себя)</label><input id="pad" maxlength="100" placeholder="ул. Центральная, 1" value="' + esc(m.address || '') + '"><label>Номер карточки в Картотеке ЗКО</label><input id="pc" maxlength="40" placeholder="например daryinskoe-1101" value="' + esc(m.card || '') + '"><p class="muted small">Карточка нужна для VIP Light и VIP Premium (на «Бесплатном старте» не обязательна). Кнопка «Записаться онлайн» в справочнике откроет именно вашу страницу — даже если телефон в карточке записан иначе.</p>' + (m.card ? '' : '<a class="btn sec sm" target="_blank" rel="noopener" href="' + esc(cartUrl()) + '">➕ Добавить себя в Картотеку ЗКО</a>') + '<button class="btn ok" id="pSave">Сохранить</button></div><div class="card"><h3>Сменить ПИН-код</h3><hr class="sep"><label>Старый ПИН</label><input id="po" inputmode="numeric" maxlength="4" type="password"><label>Новый ПИН</label><input id="pw" inputmode="numeric" maxlength="4" type="password"><button class="btn sec" id="pPin">Сменить ПИН</button></div><div id="pE"></div>';
  $('#pSave', el).onclick = function () { api('profileSave', { name: $('#pn').value, about: $('#pa').value, category: $('#pcat').value, village: $('#pv').value, mode: $('#pm').value, address: $('#pad').value, card: $('#pc').value }).then(function () { toast('Сохранено'); refreshCab('pf'); }).catch(function (e) { $('#pE', el).innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; }); };
  $('#pPin', el).onclick = function () { api('pinChange', { oldPin: $('#po').value, newPin: $('#pw').value }).then(function () { toast('ПИН изменён'); }).catch(function (e) { $('#pE', el).innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; }); };
}

/* ---------- маршрутизация ---------- */
function route() {
  if (DEMO && (location.hash || '#/') === '#/') return demoHome();
  var q = new URLSearchParams(location.search), h = location.hash || '#/';
  if (h === '#/more') return morePage();
  if (h === '#/my') return myPage();
  if (h === '#/cab') return cabEntry();
  /* мост с Картотекой: ?m=<имя-ссылка мастера> или ?tel=<телефон мастера из карточки>, по желанию &u=<номера услуг через запятую> */
  var m = (q.get('m') || '').toLowerCase(), tel = (q.get('tel') || q.get('phone') || q.get('t') || '').replace(/[^\d+]/g, '');
  var pre = (q.get('u') || '').split(',').map(function (x) { return x.replace(/[^A-Za-z0-9]/g, ''); }).filter(Boolean).slice(0, 10);
  var card = (q.get('card') || '').trim();
  if (!/^[A-Za-z0-9а-яА-ЯёЁ_@.\-]{2,40}$/.test(card)) card = '';
  var telOk = tel && /^\+?\d{10,12}$/.test(tel) ? tel : '';
  if (m && /^[a-z0-9_]{3,30}$/.test(m)) return masterPage(m, telOk, pre, card);
  if (card) return masterPage('', telOk, pre, card);   /* ?card=<ID карточки из Картотеки>; телефон — запасной путь */
  if (tel && /^\+?\d{10,12}$/.test(tel)) return masterPage('', tel, pre);
  home(); whatsNew(false);
}
function init() {
  var th = ls('zk_theme'); if (th) document.documentElement.setAttribute('data-theme', th);
  document.getElementById('themeBtn').onclick = function () { var cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'), nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', nx); ls('zk_theme', nx); };
  TOKEN = ls('zk_token') || '';
  window.addEventListener('hashchange', route);
  fetch('config.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return {}; }).then(function (c) {
    CFG = normCfg(c || {});
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('service-worker.js').catch(function () {});
    route(); ping('visitor');
    try { if ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone) ping('pwa'); } catch (e) {}
  });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); DEFERRED = e; });
  window.addEventListener('appinstalled', function () { ping('pwa'); });
  var nv = document.getElementById('nav');
  if (nv) Array.prototype.forEach.call(nv.querySelectorAll('button'), function (b) { b.onclick = function () { var n = b.getAttribute('data-n'); if (n === 'home') { if (DEMO) { TOKEN = ''; navGo('#/'); demoHome(); } else navGo('#/'); } else navGo(n === 'my' ? '#/my' : (n === 'cab' ? '#/cab' : '#/more')); }; });
  var sw = document.getElementById('ownSw');
  if (sw) { sw.checked = ls('zk_owner') === '1'; sw.onchange = function () { if (sw.checked) { ls('zk_owner', '1'); if (CFG.gatewayUrl && !DEMO) api('statPing', { dev: devId(), kind: 'visitor', owner: true }).catch(function () {}); toast('Режим Владельца включён: ваши визиты не считаются'); } else { ls('zk_owner', null); toast('Режим Владельца выключен'); } }; }
}
init();
})();
