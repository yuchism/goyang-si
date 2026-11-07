/* 오프라인 캐시 (MOBILE_PLAN.md 4-2)
   가장 중요한 원칙: 새 버전을 올렸는데 예전 화면이 계속 보이면 안 된다.
   - 코드·데이터(html, js, css, json, manifest): 네트워크 먼저. 실패할 때만 캐시 (오프라인에서도 방이 열리게)
   - 그림(f/, r/, 아이콘): 캐시 먼저. 캐시 이름에 배포 버전이 붙어 있어서 새 버전이 되면 다시 받는다
   - Google Fonts: 한 번 받으면 캐시
   - 만화방(manhwa/): 페이지·episodes.json은 위처럼 네트워크 먼저. 그림은 본 것만 따로(MANHWA) 담고, MANHWA_MAX장이 넘으면
     먼저 담은 것부터 지운다. 그림 주소에 ?v=(회차 그림 지문)가 붙어 있어 다시 만들면 새로 받는다. 'warm'(방 시작 묶음)에는 넣지 않는다
   - 쥐구멍 기지(base/): 페이지·scene.json·demo.json은 네트워크 먼저. 그림은 본 것만 따로(BASE) 담는다. 'warm'에는 넣지 않는다.
     상태 JSON(goyang-status, 바깥 주소)은 담지 않는다 — 늘 새로 (아래 바깥 주소 규칙)
   - GoatCounter 등 그 밖의 바깥 주소: 손대지 않음(네트워크만)
   __VERSION__은 배포 때 pages.yml이 커밋 해시로 바꾼다. 바뀌지 않았으면(로컬 개발) 그림도 네트워크 먼저.
   새 서비스 워커는 skipWaiting 없이, 다음에 열 때 적용된다 (켜 둔 화면이 갑자기 바뀌지 않게). */
const VERSION = '__VERSION__';
const DEV = VERSION.startsWith('__');
const PAGES = 'goyang-pages';
const IMAGES = 'goyang-img-' + VERSION;
const FONTS = 'goyang-fonts';
const MANHWA = 'goyang-manhwa';
const MANHWA_MAX = 120; // 조각 수 (한 장 약 0.2MB → 약 25MB, 4~5화)
const BASE = 'goyang-base';
const KEEP = [PAGES, IMAGES, FONTS, MANHWA, BASE];

self.addEventListener('install', () => { /* 미리 받지 않는다(데이터 절약). 첫 방문에 본 것만 'warm'으로 담는다 */ });

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys())
      if (k.startsWith('goyang-') && !KEEP.includes(k))
        await caches.delete(k);
    await self.clients.claim();
  })());
});

const isImage = url => /\.(webp|png|jpe?g|gif|ico|svg)$/i.test(url.pathname);
const isManhwa = url => url.pathname.startsWith(new URL('manhwa/', self.registration.scope).pathname);
const isBase = url => url.pathname.startsWith(new URL('base/', self.registration.scope).pathname);
const isFont = url => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

// 리디렉트된 응답은 사파리가 페이지로 쓰지 못하므로 새 응답으로 감싼다
async function clean(res) {
  if (!res.redirected)
    return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

async function networkFirst(req, url) {
  const cache = await caches.open(PAGES);
  try {
    // no-cache: 브라우저 HTTP 캐시도 서버에 다시 확인하게 (배포 직후 예전 코드가 섞이지 않게)
    const res = await clean(await fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }));
    if (res.ok)
      cache.put(stripKey(req, url), res.clone());
    return res;
  }
  catch (err) {
    // 만화방·기지 페이지는 방으로 대신하지 않는다
    const hit = await cache.match(stripKey(req, url)) || (req.mode === 'navigate' && !isManhwa(url) && !isBase(url) && await cache.match(new URL('./', self.registration.scope).href));
    if (hit)
      return hit;
    throw err;
  }
}

// 페이지 주소의 ?src=home, ?birthday=… 같은 꼬리는 캐시 열쇠에서 뺀다 (같은 index.html)
function stripKey(req, url) {
  if (req.mode !== 'navigate' && !/\/(index\.html)?$/.test(url.pathname))
    return url.href;
  return url.origin + url.pathname;
}

async function cacheFirst(name, req) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit)
    return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque')
    cache.put(req, res.clone());
  return res;
}

// 만화방 그림: 본 것만 담고, 넘치면 먼저 담은 것부터 지운다
async function manhwaImage(req) {
  const cache = await caches.open(MANHWA);
  const hit = await cache.match(req);
  if (hit)
    return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    const keys = await cache.keys();
    for (const k of keys.slice(0, Math.max(0, keys.length - MANHWA_MAX)))
      await cache.delete(k);
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET')
    return;
  const url = new URL(req.url);
  if (isFont(url)) {
    e.respondWith(cacheFirst(FONTS, req));
    return;
  }
  if (url.origin !== self.location.origin)
    return; // GoatCounter 등: 네트워크만
  if (url.pathname.endsWith('/sw.js'))
    return;
  if (isImage(url) && isManhwa(url))
    e.respondWith(manhwaImage(req));
  else if (isImage(url) && isBase(url))
    e.respondWith(cacheFirst(BASE, req)); // 주소에 ?v=(scene.json v)가 붙어 있어 바꾸면 새로 받는다
  else if (isImage(url) && !DEV)
    e.respondWith(cacheFirst(IMAGES, req));
  else
    e.respondWith(networkFirst(req, url));
});

// 첫 방문: 서비스 워커가 생기기 전에 이미 받은 파일(지금 보이는 방)을 담아 둔다.
// 대부분 브라우저 캐시에 있어서 다시 내려받지 않는다.
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type !== 'warm' || !Array.isArray(d.urls))
    return;
  e.waitUntil((async () => {
    for (const u of d.urls.slice(0, 600)) {
      try {
        const url = new URL(u, self.registration.scope);
        let name = null;
        if (isFont(url))
          name = FONTS;
        else if (isManhwa(url) || isBase(url))
          continue; // 만화방·기지는 방 시작 묶음에 넣지 않는다
        else if (url.origin === self.location.origin && !url.pathname.endsWith('/sw.js'))
          name = isImage(url) && !DEV ? IMAGES : PAGES;
        if (!name)
          continue;
        const cache = await caches.open(name);
        const key = name === PAGES ? stripKey({ mode: '' }, url) : url.href;
        if (await cache.match(key))
          continue;
        // 글꼴 파일(gstatic)은 페이지가 cors로 요청하므로 cors로, 글꼴 CSS는 no-cors로 받아야 나중에 그대로 쓸 수 있다
        const opt = url.origin === self.location.origin ? { credentials: 'same-origin' } : url.hostname === 'fonts.gstatic.com' ? { mode: 'cors' } : { mode: 'no-cors' };
        const res = await fetch(url.href, opt);
        if (res.ok || res.type === 'opaque')
          await cache.put(key, await clean(res));
      }
      catch (err) { /* 하나 실패해도 계속 */ }
    }
  })());
});
