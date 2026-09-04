// ============================================================
// TSG Ear Trainer — Service Worker（オフライン対応）
// ============================================================
// 方針：ページ本体(index.html)は「ネット優先（4秒タイムアウト）→保存版」＝
//       オンライン時は常に最新、電波が無い時だけ保存版で起動。
//       画像は「保存版優先＋裏で更新」、外部（Google Fonts）は「保存版優先」。
// ※ ピアノ音源は index.html 内に base64 で埋め込まれているため、本体1ファイルの
//    保存だけでオフラインでも音が鳴る（別ファイルの音源は無い）。
// CACHE の版名を上げるべき時：アイコン等「index.html以外のファイル」を追加・削除した時。
// ============================================================
const CACHE = 'tsg-ear-v1';

const CORE = [
  './',
  './index.html',
  './manifest.json',
  './images/apple-touch-icon-180.png',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/icon-192-maskable.png',
  './images/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => k.startsWith('tsg-ear-') && k !== CACHE)
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  const isPage = req.mode === 'navigate' ||
    (sameOrigin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')));
  if (isPage) { event.respondWith(networkFirstPage(req)); return; }

  if (sameOrigin) { event.respondWith(staleWhileRevalidate(req)); return; }

  event.respondWith(cacheFirst(req));
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function networkFirstPage(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await withTimeout(fetch(req), 4000);
    if (res && res.ok) cache.put('./index.html', res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match('./index.html');
    if (cached) return cached;
    throw e;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const refresh = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  if (cached) { refresh.catch(() => {}); return cached; }
  const res = await refresh;
  if (res) return res;
  throw new Error('offline and not cached: ' + req.url);
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
  return res;
}
