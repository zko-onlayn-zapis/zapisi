/* ЗКО Онлайн-записи v1.2.1 — кэш оболочки; запросы к облачному шлюзу НИКОГДА не кэшируются */
const CACHE = 'zko-online-zapisi-v1.2.1';
const SHELL = ['./', './index.html', './style.css', './app.js', './demo.js', './config.json', './manifest.webmanifest', './novosti.txt', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('zko-online-zapisi-') || k.startsWith('zapisi-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(x => x || caches.match('./index.html'))));
});
