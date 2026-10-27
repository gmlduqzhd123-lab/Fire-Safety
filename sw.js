// 화재 탈출 넘버원 오프라인 캐시 — 같은 주소의 다른 엽쌤 앱과 캐시 저장소를 같이 쓰므로 내 접두어 캐시만 지운다
const CACHE = 'fire-safety-v28';
const CACHE_PREFIX = 'fire-safety-v';
const CORE = [
  './',
  './index.html',
  './style.css',
  './sound.js',
  './stages.js',
  './editor.js',
  './tactical-3d.js',
  './game.js',
  './bgm.mp3',
  './manifest.webmanifest',
  './ys-install.js',
  './ys-qr.js',
  './qr.svg',
  './og-image.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => fetch(u, { cache: 'no-cache' }).then(r => r.ok ? c.put(u, r) : undefined)))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
