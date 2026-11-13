/* ЗКО Онлайн-записи v1.2.0 — клиентская часть (PWA). Секретов в файле нет; адрес шлюза берётся из config.json. */
(function () {
'use strict';
var CFG = {}, TOKEN = '', APP = document.getElementById('app'), TIMER = null, VERSION = 'v1.2.0';
var ERR = {
  auth_required: 'Нужно войти.', pin_required: 'Введите ПИН-код.', not_master: 'Этот номер не зарегистрирован как мастер.', blocked: 'Кабинет заблокирован администратором.',
  bad_code: 'Неверный код.', code_dead: 'Код сгорел после 3 ошибок. Получите новый.', code_expired: 'Код устарел. Получите новый.', code_not_sent: 'Сначала откройте бота и поделитесь номером.',
  bad_pin: 'Неверный ПИН-код.', pin_locked: 'Слишком много ошибок. Подождите 15 минут.', bad_pin_format: 'ПИН — ровно 4 цифры.', bad_name: 'Введите имя (от 2 букв).', bad_slug: 'Адрес: 3–30 символов, латиница, цифры и «_». Это слово занято системой или не подходит.',
  slug_taken: 'Такой адрес уже занят.', already_master: 'Вы уже зарегистрированы как мастер.', no_master: 'Мастер не найден.', slot_taken: 'Это время уже занято. Выберите другое.', self_booking: 'Нельзя записаться к самому себе.',
  cloud_ban: 'Запись недоступна: номер заблокирован платформой.', master_ban: 'Мастер не принимает запись с этого номера.', bad_services: 'Выбранные услуги недоступны.', too_many: 'Слишком много активных записей или запросов. Подождите.',
  overlap: 'У вас уже есть запись на это время.', no_booking: 'Запись не найдена.', forbidden: 'Недостаточно прав.', bad_status: 'Так отметить нельзя.', not_yet: 'Визит ещё не начался.', not_done: 'Оценить можно после завершённого визита.',
  bad_stars: 'Поставьте от 1 до 5 звёзд.', limit_free: 'Бесплатный тариф: до 5 услуг. Подключите VIP, чтобы добавить больше.', bad_title: 'Введите название услуги.', bad_price: 'Цена указана неверно.', bad_minutes: 'Длительность: от 30 минут, шаг 30.',
  no_service: 'Услуга не найдена.', bad_schedule: 'Проверьте часы: конец позже начала, перерыв внутри рабочего времени.', bad_date: 'Неверная дата.', no_history: 'В чёрный список можно добавить только того, кто записывался к вам.', bad_phone: 'Неверный номер.',
  bot_not_set: 'Сервис ещё не настроен (нет бота).', busy: 'Сервер занят, повторите через минуту.', bad_key: 'Ошибка сеанса, обновите страницу.', server_error: 'Ошибка сервера. Повторите позже.', net: 'Нет связи. Проверьте интернет.', no_gateway: 'Сервис ещё не подключён (не указан адрес шлюза в config.json).'
};
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
function toast(t) { var el = document.getElementById('toast'); el.textContent = t; el.className = 'show'; clearTimeout(toast.t); toast.t = setTimeout(function () { el.className = ''; }, 3200); }
function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸'; }
function dur(m) { var h = Math.floor(m / 60), r = m % 60; return (h ? h + ' ч' : '') + (h && r ? ' ' : '') + (r ? r + ' мин' : ''); }
function stars(n) { n = Math.round(n); return '<span class="stars">' + '★'.repeat(n) + '☆'.repeat(5 - n) + '</span>'; }
function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
/* config.json — русские ключи (старые английские тоже принимаются) */
function normCfg(c) {
  var m = { 'версия': 'version', 'среда': 'env', 'адресШлюза': 'gatewayUrl', 'имяБота': 'botUsername', 'адресСайта': 'siteUrl', 'ватсапАдмина': 'adminWhatsApp' };
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
  if (!CFG.gatewayUrl) return Promise.reject(new Error('no_gateway'));
  var body = Object.assign({ action: action }, data || {}); if (TOKEN && body.token === undefined) body.token = TOKEN;
  return fetch(CFG.gatewayUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); }, function () { throw new Error('net'); })
    .then(function (j) { if (!j.ok) { if (j.error === 'auth_required' && TOKEN) { setToken(''); } throw new Error(j.error || 'server_error'); } return j; });
}
function errText(e) { var c = e && e.message; return ERR[c] || ('Ошибка: ' + c); }
function setToken(t) { TOKEN = t || ''; ls('zk_token', t || null); }
function view(html) { stopTimer(); APP.innerHTML = html; window.scrollTo(0, 0); }
function stopTimer() { if (TIMER) { clearInterval(TIMER); TIMER = null; } }
function $(s, r) { return (r || APP).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || APP).querySelectorAll(s)); }
function go(h) { location.hash = h; }
function load(fn) { APP.insertAdjacentHTML('beforeend', '<p class="muted center" id="ld">…</p>'); return fn().then(function (x) { var l = $('#ld'); if (l) l.remove(); return x; }, function (e) { var l = $('#ld'); if (l) l.remove(); toast(errText(e)); throw e; }); }

/* ---------- вход через Телеграм-бота (общий блок) ---------- */
function loginBlock(onDone, opts) {
  opts = opts || {};
  var box = document.createElement('div'); box.className = 'card';
  box.innerHTML = '<b>' + esc(opts.title || 'Вход по номеру телефона') + '</b><p class="muted small">Нажмите кнопку — откроется наш Телеграм-бот. Поделитесь номером, бот сразу пришлёт 4 цифры. Вернитесь сюда и введите их.</p><button class="btn" id="lgGet">✈️ Получить код в Телеграм</button><div id="lgCode" hidden><input class="code" id="lgIn" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="one-time-code"><button class="btn ok" id="lgOk">Подтвердить код</button><p class="muted small center">Бот не ответил? Откройте его ещё раз и нажмите «Старт».</p></div><div id="lgErr"></div>';
  var req = '';
  function err(t) { box.querySelector('#lgErr').innerHTML = t ? '<div class="err">' + esc(t) + '</div>' : ''; }
  box.querySelector('#lgGet').onclick = function () {
    err(''); api('authStart', { token: '' }).then(function (j) {
      req = j.req; box.querySelector('#lgCode').hidden = false; window.open(j.link, '_blank'); box.querySelector('#lgIn').focus();
      box.querySelector('#lgGet').textContent = '✈️ Открыть бота ещё раз'; box.querySelector('#lgGet').onclick = function () { window.open(j.link, '_blank'); };
    }).catch(function (e) { err(errText(e)); });
  };
  box.querySelector('#lgOk').onclick = function () {
    var c = box.querySelector('#lgIn').value.replace(/\D/g, ''); if (c.length !== 4) { err('Введите 4 цифры.'); return; }
    api('authVerify', { req: req, code: c, token: '' }).then(function (j) { setToken(j.token); onDone(j); }).catch(function (e) { err(errText(e)); });
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
function home() {
  view('<h1>Онлайн-запись к мастерам ЗКО</h1><p class="muted">Выберите время — мастер получит уведомление в Телеграме.</p><button class="btn" id="hMy">📋 Мои записи</button><button class="btn sec" id="hNews">✨ Что нового в версии</button><div class="card"><b>Как записаться?</b><p class="muted small">Откройте ссылку, которую вам прислал мастер, или карточку мастера в «Картотеке ЗКО». Выберите услуги и время, подтвердите номер кодом из Телеграма — и запись готова.</p></div><p class="muted small center" id="hVer">' + VERSION + ' · Проект разработан: v9o9v9a9n</p>');
  $('#hMy').onclick = function () { go('#/my'); };
  $('#hNews').onclick = function () { whatsNew(true); };
  /* вход для мастеров скрыт от посетителей: пять быстрых касаний по строке версии (или прямая ссылка …/#/cab) */
  var taps = 0, tt = 0;
  $('#hVer').onclick = function () { var n = Date.now(); taps = (n - tt < 1500) ? taps + 1 : 1; tt = n; if (taps >= 5) { taps = 0; go('#/cab'); } };
}

/* ---------- страница мастера для клиента ---------- */
var P = null;
var EM = ['✂️', '💅', '💇', '🧖', '💆', '🎨', '👁️', '🧴', '💈', '🌿'];
function masterPage(slug, tel, pre) {
  P = { slug: slug || '', pre: pre || [], sel: {}, cat: null, date: zkoToday(), key: ls('zk_hold') || (function () { var k = rndKey(); ls('zk_hold', k); return k; })(), slot: null, exp: 0 };
  view('<p class="muted center">Загрузка…</p>');
  api('master', slug ? { slug: slug, token: '' } : { tel: tel, token: '' }).then(function (j) { P.d = j; P.slug = j.master.slug; P.pre.forEach(function (id) { if (j.services.some(function (x) { return String(x.id) === id; })) P.sel[id] = 1; }); renderMaster(); }).catch(function (e) { view('<div class="err">' + esc(errText(e)) + '</div><button class="btn sec" onclick="location.hash=\'#/\'">На главную</button>'); });
}
function cats() { var m = {}, o = []; P.d.services.forEach(function (s) { if (!m[s.category]) { m[s.category] = []; o.push(s.category); } m[s.category].push(s); }); return { map: m, order: o }; }
function sumSel() { var n = 0, t = 0, m = 0; P.d.services.forEach(function (s) { if (P.sel[s.id]) { n++; t += s.price; m += s.minutes; } }); return { n: n, t: t, m: m }; }
function renderMaster() {
  var d = P.d, c = cats(), r = d.rating, s = sumSel();
  var h = '<div class="card"><h1>' + esc(d.master.name) + (d.master.vip ? ' <span class="badge vip">VIP</span>' : '') + '</h1>' + (r.count ? '<div>' + stars(r.avg) + ' <b>' + r.avg + '</b> <span class="muted">· оценок: ' + r.count + '</span></div>' : '<div class="muted small">Оценок пока нет</div>') + (d.master.about ? '<p class="muted">' + esc(d.master.about) + '</p>' : '') + '<button class="btn sec sm" id="mRev">⭐ Отзывы</button></div>';
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
  $('#bk').onclick = function () { api('unhold', { key: P.key, token: '' }).catch(function () {}); timePage(); };
  function tick() {
    var left = Math.max(0, Math.round((P.exp - Date.now()) / 1000)), el = $('#tm'); if (!el) return;
    el.textContent = '🔒 Время удержано для вас: ' + Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2); el.className = 'timer' + (left < 60 ? ' low' : '');
    if (left <= 0) { stopTimer(); toast('Время удержания вышло. Выберите слот заново.'); timePage(); }
  }
  tick(); TIMER = setInterval(tick, 1000);
  function doBook() {
    var nm = ($('#cName').value || '').trim(); if (nm.length < 2) { $('#cErr').innerHTML = '<div class="err">Введите имя.</div>'; return; } ls('zk_name', nm);
    api('book', { slug: P.slug, date: P.date, start: P.slot, serviceIds: selIds(), name: nm, holdKey: P.key }).then(function (j) { done(j.booking); })
      .catch(function (e) { $('#cErr').innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; if (e.message === 'slot_taken') setTimeout(timePage, 1500); });
  }
  var a = $('#cAuth');
  if (TOKEN) { a.innerHTML = '<button class="btn ok" id="cBook">✅ Записаться</button>'; $('#cBook').onclick = doBook; }
  else { a.appendChild(loginBlock(function () { doBook(); }, { title: 'Подтвердите номер телефона' })); }
}
function done(b) {
  view('<div class="card center"><div style="font-size:48px">✅</div><h1>Вы записаны!</h1><p>' + esc(b.master) + '<br>📅 ' + ruDate(b.date) + ' в <b>' + esc(b.start) + '</b><br>' + esc(b.services) + '<br>' + money(b.total) + '</p><p class="muted small">Подтверждение и напоминание придут в Телеграм.</p></div><button class="btn" id="dMy">📋 Мои записи</button><button class="btn sec" id="dHome">На главную</button>');
  $('#dMy').onclick = function () { go('#/my'); }; $('#dHome').onclick = function () { go('#/'); };
}

/* ---------- мои записи ---------- */
function myPage() {
  if (!TOKEN) { view('<h1>Мои записи</h1>'); APP.appendChild(loginBlock(myPage)); return; }
  view('<h1>Мои записи</h1><p class="muted center">Загрузка…</p>');
  api('myBookings').then(function (j) {
    var stl = { booked: ['Запись активна', 'ok'], done: ['Визит состоялся', ''], noshow: ['Не пришёл', 'red'], cancelled: ['Отменена', 'red'] };
    view('<h1>Мои записи</h1>' + (j.bookings.length ? j.bookings.map(function (b) { var st = stl[b.status] || [b.status, '']; return '<div class="card"><b>' + esc(b.master) + '</b> <span class="badge ' + st[1] + '">' + st[0] + '</span><br>📅 ' + ruDate(b.date) + ' в ' + esc(b.start) + '<br>💈 ' + esc(b.services) + ' · ' + money(b.total) + '<div>' + (b.status === 'booked' ? '<button class="btn sec sm" data-c="' + b.id + '">❌ Отменить</button>' : '') + (b.canRate ? '<button class="btn sm" data-r="' + b.id + '">⭐ Оценить</button>' : '') + (b.slug ? '<a class="btn sec sm" href="?m=' + esc(b.slug) + '">Записаться снова</a>' : '') + '</div></div>'; }).join('') : '<div class="card muted">Записей пока нет.</div>') + '<button class="btn sec" id="myOut">Выйти</button>');
    $$('[data-c]').forEach(function (b) { b.onclick = function () { if (confirm('Отменить запись?')) api('cancelBooking', { id: b.getAttribute('data-c') }).then(function () { toast('Запись отменена'); myPage(); }).catch(function (e) { toast(errText(e)); }); }; });
    $$('[data-r]').forEach(function (b) { b.onclick = function () { ratePage(b.getAttribute('data-r')); }; });
    $('#myOut').onclick = function () { api('logout').catch(function () {}); setToken(''); go('#/'); route(); };
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
  if (!TOKEN) { view('<h1>Кабинет мастера</h1><p class="muted">Вход по номеру телефона. Новый мастер регистрируется после подтверждения номера.</p>'); APP.appendChild(loginBlock(function () { cabEntry(); })); return; }
  api('me').then(function (j) {
    if (!j.isMaster) return regPage();
    if (j.needPin) return pinPage();
    CAB = j; cab(ls('zk_tab') || 'rec');
  }).catch(function (e) { if (e.message === 'auth_required') cabEntry(); else view('<div class="err">' + esc(errText(e)) + '</div>'); });
}
function regPage() {
  view('<h1>Регистрация мастера</h1><div class="card"><label>Ваше имя или название</label><input id="rn" maxlength="60" placeholder="Анара · Красота"><label>Адрес вашей страницы (латиницей)</label><input id="rs" maxlength="30" placeholder="anara_beauty" autocapitalize="none"><label>О себе (по желанию)</label><textarea id="ra" rows="3" maxlength="400"></textarea><label>Придумайте ПИН-код (4 цифры)</label><input id="rp" inputmode="numeric" maxlength="4" type="password" placeholder="••••"><p class="muted small">ПИН защищает кабинет на новом устройстве. Хранится только в зашифрованном виде.</p><button class="btn ok" id="rOk">Создать кабинет</button><div id="rE"></div></div><p class="muted small center">Бесплатный тариф: до 5 услуг. VIP — безлимит и кнопка записи в Картотеке.</p>');
  $('#rOk').onclick = function () { api('masterRegister', { name: $('#rn').value, slug: $('#rs').value.trim().toLowerCase(), about: $('#ra').value, pin: $('#rp').value }).then(function () { toast('Кабинет создан!'); cabEntry(); }).catch(function (e) { $('#rE').innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; }); };
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
var TABS = [['rec', '📋 Записи'], ['svc', '💈 Услуги'], ['wk', '🕒 График'], ['cl', '🚫 Клиенты'], ['rv', '⭐ Отзывы'], ['bal', '💳 Баланс']];
function cab(tab) {
  ls('zk_tab', tab);
  var m = CAB.master, link = (CFG.siteUrl || (location.origin + location.pathname.replace(/index\.html$/, ''))) + '?m=' + m.slug;
  view('<div class="card"><b>' + esc(m.name) + '</b> ' + (CAB.sub.tariff ? '<span class="badge vip">VIP</span>' : '<span class="badge">Бесплатный</span>') + '<div class="muted small">Ваша ссылка для клиентов:</div><input readonly id="lnk" value="' + esc(link) + '" onclick="this.select()"><button class="btn sec sm" id="cp">📋 Копировать ссылку</button><button class="btn sec sm" id="cNews">✨ Что нового в версии</button><button class="btn sec sm" id="cOut">Выйти</button></div><div class="tabs">' + TABS.map(function (t) { return '<button class="tab' + (t[0] === tab ? ' on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '<button class="tab' + (tab === 'pf' ? ' on' : '') + '" data-t="pf">⚙️ Профиль</button></div><div id="tb"></div>');
  $$('.tab').forEach(function (b) { b.onclick = function () { cab(b.getAttribute('data-t')); }; });
  $('#cp').onclick = function () { try { navigator.clipboard.writeText(link); toast('Ссылка скопирована'); } catch (e) { $('#lnk').select(); } };
  $('#cNews').onclick = function () { whatsNew(true); };
  $('#cOut').onclick = function () { api('logout').catch(function () {}); setToken(''); go('#/'); route(); };
  ({ rec: tRec, svc: tSvc, wk: tWk, cl: tCl, rv: tRv, bal: tBal, pf: tPf })[tab]($('#tb'));
}
function refreshCab(tab) { api('me').then(function (j) { CAB = j; cab(tab); }).catch(function (e) { toast(errText(e)); if (e.message === 'pin_required' || e.message === 'auth_required') cabEntry(); }); }
function tRec(el) {
  var from = zkoToday(), to = addDay(from, 14);
  el.innerHTML = '<p class="muted center">Загрузка…</p>';
  api('masterBookings', { from: from, to: to }).then(function (j) {
    var stl = { booked: ['Ожидается', ''], done: ['Состоялся', 'ok'], noshow: ['Не пришёл', 'red'], cancelled: ['Отменена', 'red'] };
    el.innerHTML = '<h2>Записи на 14 дней</h2>' + (j.bookings.length ? j.bookings.map(function (b) { var st = stl[b.status] || [b.status, '']; return '<div class="card"><b>' + ruDate(b.date) + ' · ' + esc(b.start) + '</b> <span class="badge ' + st[1] + '">' + st[0] + '</span><br>👤 ' + esc(b.name) + ' · +' + esc(b.client) + '<br>💈 ' + esc(b.services) + ' · ' + money(b.total) + '<div>' + (b.status === 'booked' ? '<button class="btn ok sm" data-s="done" data-i="' + b.id + '">✔ Визит завершён</button><button class="btn sec sm" data-s="noshow" data-i="' + b.id + '">✖ Не пришёл</button><button class="btn red sm" data-s="cancelled" data-i="' + b.id + '">❌ Отменить</button>' : '') + (b.status === 'noshow' || b.status === 'done' ? '<button class="btn sec sm" data-bl="' + b.id + '">🚫 В чёрный список</button>' : '') + '</div></div>'; }).join('') : '<div class="card muted">Записей пока нет.</div>');
    $$('[data-s]', el).forEach(function (b) { b.onclick = function () { var s = b.getAttribute('data-s'); if (s === 'cancelled' && !confirm('Отменить запись? Клиент получит уведомление.')) return; api('bookingMark', { id: b.getAttribute('data-i'), status: s }).then(function () { toast('Готово'); tRec(el); }).catch(function (e) { toast(errText(e)); }); }; });
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
  var s = CAB.sub, wa = (CFG.adminWhatsApp || '').replace(/\D/g, '');
  var msg = encodeURIComponent('Здравствуйте! Хочу продлить VIP-тариф в «ЗКО Онлайн-записи». Мастер: ' + CAB.master.slug + ', телефон +' + CAB.phone);
  el.innerHTML = '<h2>Мой баланс и подписка</h2><div class="card"><div>Статус: ' + (s.tariff ? '<span class="badge vip">VIP активен</span>' : '<span class="badge">Бесплатный</span>') + '</div>' + (s.tariff ? '<p>Действует до <b>' + s.until.split('-').reverse().join('.') + '</b> (осталось ' + s.daysLeft + ' дн.)</p>' : (s.expired ? '<p class="muted">Срок VIP закончился ' + s.until.split('-').reverse().join('.') + '. Кнопка записи в Картотеке отключена.</p>' : '<p class="muted">Лимит: до 5 услуг. Кнопки записи в Картотеке нет.</p>')) + '</div><div class="card"><b>VIP даёт:</b><br>✔ безлимит услуг<br>✔ бирюзовую кнопку «📅 Записаться на время» в Картотеке<br><p class="muted small">Подписка квартальная: 3 или 6 месяцев вперёд, оплата через Kaspi. После оплаты администратор продлевает срок, вы получите уведомление в Телеграм.</p></div>' + (wa ? '<a class="btn ok" target="_blank" rel="noopener" href="https://wa.me/' + wa + '?text=' + msg + '">💬 Написать администратору</a>' : '<p class="muted small center">Контакт администратора пока не указан.</p>');
}
function tPf(el) {
  el.innerHTML = '<h2>Профиль</h2><div class="card"><label>Имя / название</label><input id="pn" maxlength="60" value="' + esc(CAB.master.name) + '"><label>О себе</label><textarea id="pa" rows="3" maxlength="400">' + esc(CAB.master.about) + '</textarea><button class="btn ok" id="pSave">Сохранить</button></div><div class="card"><b>Сменить ПИН-код</b><label>Старый ПИН</label><input id="po" inputmode="numeric" maxlength="4" type="password"><label>Новый ПИН</label><input id="pw" inputmode="numeric" maxlength="4" type="password"><button class="btn sec" id="pPin">Сменить ПИН</button></div><div id="pE"></div>';
  $('#pSave', el).onclick = function () { api('profileSave', { name: $('#pn').value, about: $('#pa').value }).then(function () { toast('Сохранено'); refreshCab('pf'); }).catch(function (e) { $('#pE', el).innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; }); };
  $('#pPin', el).onclick = function () { api('pinChange', { oldPin: $('#po').value, newPin: $('#pw').value }).then(function () { toast('ПИН изменён'); }).catch(function (e) { $('#pE', el).innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; }); };
}

/* ---------- маршрутизация ---------- */
function route() {
  var q = new URLSearchParams(location.search), h = location.hash || '#/';
  if (h === '#/my') return myPage();
  if (h === '#/cab') return cabEntry();
  /* мост с Картотекой: ?m=<имя-ссылка мастера> или ?tel=<телефон мастера из карточки>, по желанию &u=<номера услуг через запятую> */
  var m = (q.get('m') || '').toLowerCase(), tel = (q.get('tel') || q.get('phone') || q.get('t') || '').replace(/[^\d+]/g, '');
  var pre = (q.get('u') || '').split(',').map(function (x) { return x.replace(/[^A-Za-z0-9]/g, ''); }).filter(Boolean).slice(0, 10);
  if (m && /^[a-z0-9_]{3,30}$/.test(m)) return masterPage(m, '', pre);
  if (tel && /^\+?\d{10,12}$/.test(tel)) return masterPage('', tel, pre);
  home(); whatsNew(false);
}
function init() {
  var th = ls('zk_theme'); if (th) document.documentElement.setAttribute('data-theme', th);
  document.getElementById('themeBtn').onclick = function () { var cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'), nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', nx); ls('zk_theme', nx); };
  TOKEN = ls('zk_token') || '';
  window.addEventListener('hashchange', route);
  fetch('config.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return {}; }).then(function (c) {
    CFG = normCfg(c || {}); if (CFG.env === 'test') document.getElementById('envtag').hidden = false;
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('service-worker.js').catch(function () {});
    route();
  });
}
init();
})();
