/* 오프라인 캐시 (MOBILE_PLAN.md 4-2)
   가장 중요한 원칙: 새 버전을 올렸는데 예전 화면이 계속 보이면 안 된다.
   - 코드·데이터(html, js, css, json, manifest): 네트워크 먼저. 실패할 때만 캐시 (오프라인에서도 방이 열리게)
   - 그림(f/, r/, 아이콘): 캐시 먼저. 캐시 이름에 배포 버전이 붙어 있어서 새 버전이 되면 다시 받는다
   - Google Fonts: 한 번 받으면 캐시
   - GoatCounter 등 그 밖의 바깥 주소: 손대지 않음(네트워크만)
   __VERSION__은 배포 때 pages.yml이 커밋 해시로 바꾼다. 바뀌지 않았으면(로컬 개발) 그림도 네트워크 먼저.
   새 서비스 워커는 skipWaiting 없이, 다음에 열 때 적용된다 (켜 둔 화면이 갑자기 바뀌지 않게). */
const VERSION = '__VERSION__';
const DEV = VERSION.startsWith('__');
const PAGES = 'goyang-pages';
const IMAGES = 'goyang-img-' + VERSION;
const FONTS = 'goyang-fonts';
const KEEP = [PAGES, IMAGES, FONTS];

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
    const hit = await cache.match(stripKey(req, url)) || (req.mode === 'navigate' && await cache.match(new URL('./', self.registration.scope).href));
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
  if (isImage(url) && !DEV)
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
