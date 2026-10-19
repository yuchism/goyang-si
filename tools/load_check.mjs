// 처음 열 때 기다리는 양 재기 (LOAD_PLAN.md 8장 1~2). web 폴더를 서버로 띄운 뒤:
//   node tools/load_check.mjs [포트=8000] [주소 꼬리, 예: '?birthday=만득']
// 느린 4G 흉내(지연 150ms, 받기 1.6Mbps)로 처음 방문(캐시 없음)을 연다. 서비스 워커는 막는다
// (느린 망 흉내가 SW가 직접 받는 요청에는 걸리지 않을 수 있어서. 오프라인은 따로 본다).
// 기록: 첫 장면까지 걸린 시간(상태 줄이 채워진 때), 그때까지 받은 바이트·요청 수, 그림을 다 받을 때까지 걸린 시간.
// 로컬 서버(HTTP/1.1, 연결 6개)라 실제 GitHub Pages(HTTP/2)와 절대 시간은 다르다. 바꾸기 전후 비교용
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright'])
  try {
    pw = require(p);
    break;
  }
  catch (e) { }
const port = process.argv[2] || 8000, tail = process.argv[3] || '';
const KBPS = 1600, LATENCY = 150;
const b = await pw.chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Seoul', locale: 'ko-KR' });
const p = await ctx.newPage();
await p.route(/goatcounter|zgo\.at|fonts\.(googleapis|gstatic)/, r => r.abort());
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: LATENCY, downloadThroughput: KBPS * 1000 / 8, uploadThroughput: 750 * 1000 / 8 });
const done = []; // [시각(ms), 바이트, 주소]
const urls = new Map();
cdp.on('Network.requestWillBeSent', e => urls.set(e.requestId, e.request.url));
cdp.on('Network.loadingFinished', e => done.push([Date.now(), e.encodedDataLength, urls.get(e.requestId) || '']));
const t0 = Date.now();
await p.goto(`http://localhost:${port}/index.html${tail}`, { waitUntil: 'commit' });
await p.waitForFunction(() => { const s = document.getElementById('status'); return s && s.textContent !== '…'; }, null, { polling: 20, timeout: 600000 });
const tStart = Date.now();
const before = done.filter(d => d[0] <= tStart);
const isImg = u => /\.(webp|png|jpe?g)(\?|$)/.test(u);
// 그림을 다 받을 때까지: 새 코드는 assetsWarm(), 예전 코드는 시작이 곧 다 받음
await p.waitForFunction(() => !window.__goyang || !window.__goyang.assetsWarm || window.__goyang.assetsWarm(), null, { polling: 50, timeout: 600000 });
const tWarm = Date.now();
await new Promise(r => setTimeout(r, 300));
const sum = a => a.reduce((s, d) => s + d[1], 0);
const mb = n => (n / 1e6).toFixed(2) + 'MB';
const all = done;
console.log(JSON.stringify({
  firstScene_s: +((tStart - t0) / 1000).toFixed(1),
  beforeStart: { bytes: mb(sum(before)), requests: before.length, images: before.filter(d => isImg(d[2])).length },
  allImages_s: +((tWarm - t0) / 1000).toFixed(1),
  total: { bytes: mb(sum(all)), requests: all.length },
}));
await b.close();
