// 장면 검사 (SCENE_PLAN.md 7장). 배포 전 `node tools/check_scene.mjs` (web 폴더를 서버로 띄운 뒤: 포트는 첫 인자, 기본 8000)
//   1. 장면 파일: stage.json의 bgWidth가 r/meta.json의 bg 폭과 같다
//   2. 코드가 이름으로 부르는 자리(A·PATH·PL·S·skyRnd·skyAt)와 기능의 needs가 방 장면에 모두 있다 (오타로 기능이 조용히 꺼지지 않게)
//   3. 창 없는 시험 장면(방에서 창·커튼을 뺀 것)을 띄워 미리보기 버튼을 모두 눌러도 오류가 없고, 창에 딸린 일이 하나도 생기지 않는다
// 시험 장면은 web에 두지 않는다(사이트에 안 올라가게). 이 검사가 방 장면에서 만들어 브라우저 요청을 가로채 준다
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), WEB = join(ROOT, 'web'), JS = join(WEB, 'js');
const port = process.argv[2] || 8000;
const fails = [];
const fail = m => fails.push(m);
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const SKIP = ['scenery.js', 'seasons.js']; // 되돌린 3차 창밖이 남긴 파일 (아무도 부르지 않음)

// 1. 장면 파일
const meta = read(join(WEB, 'r/meta.json'));
for (const name of readdirSync(join(WEB, 'scenes'))) {
  const dir = join(WEB, 'scenes', name);
  const st = read(join(dir, 'stage.json'));
  if (!meta.bg || st.bgWidth !== meta.bg[0])
    fail(`${name}/stage.json bgWidth ${st.bgWidth} ≠ r/meta.json bg 폭 ${meta.bg && meta.bg[0]}`);
  read(join(dir, 'objects.json'));
  if (existsSync(join(dir, 'window.json')))
    read(join(dir, 'window.json'));
}

// 2. 이름으로 부르는 자리
const room = read(join(WEB, 'scenes/room/objects.json')), win = read(join(WEB, 'scenes/room/window.json'));
const O = Object.fromEntries(room.objects.map(o => [o.id, o]));
const spotOk = n => {
  const [id, k] = n.split('.'), o = O[id];
  return !!o && (!!(o.spots && o.spots[k]) || Object.values(o.states || {}).some(s => s.spots && s.spots[k]));
};
const placeOk = n => n === 'window' || n === 'railing' && !!win.railing || n === 'curtain' && !!win.curtain || !!(O[n] || room.places[n] || room.areas[n] || room.paths[n]);
const KINDS = [
  [/\bA\('([\w.]+)'\)/g, n => !!room.areas[n], 'areas'],
  [/\bPATH\('([\w.]+)'\)/g, n => !!room.paths[n], 'paths'],
  [/\bPL\('([\w.]+)'\)/g, n => !!room.places[n], 'places'],
  [/\bS\('([\w]+\.[\w]+)'\)/g, spotOk, '사물 spots'],
  [/\bsky(?:Rnd|At)\('(\w+)'/g, n => !!win.sky[n], 'window.json sky'],
  [/(?<![.\w])has\('([\w.]+)'\)/g, placeOk, '장소'],
  [/\bplayOk\('(\w+)'\)/g, n => ['laser', 'fish', 'yarn', 'wheel'].includes(n), '놀이'],
];
let used = 0;
for (const f of readdirSync(JS).filter(f => f.endsWith('.js') && !SKIP.includes(f))) {
  const src = readFileSync(join(JS, f), 'utf8');
  for (const [re, ok, what] of KINDS)
    for (const m of src.matchAll(re)) {
      used++;
      if (!ok(m[1]))
        fail(`${f}: ${m[0]} — 방 장면 ${what}에 없음`);
    }
  for (const m of src.matchAll(/needs: \[([^\]]*)\]/g))
    for (const n of m[1].split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean)) {
      used++;
      if (!placeOk(n))
        fail(`${f}: needs '${n}' — 방 장면에 없음`);
    }
}

// 3. 창 없는 시험 장면
const { chromium } = (() => {
  try {
    return require('playwright');
  }
  catch (e) {
    return require('/opt/npm-tools/node_modules/playwright');
  }
})();
const INIT = `(()=>{let t=0;const T0=${Date.UTC(2026, 9, 13, 3, 0, 0)};const RD=Date;
class FD extends RD{constructor(...a){if(a.length===0)super(T0+t);else super(...a)}static now(){return T0+t}}window.Date=FD;
performance.now=()=>t;let q=[];window.requestAnimationFrame=cb=>{q.push(cb);return q.length};
let timers=[],tid=1;window.setTimeout=(f,ms=0,...a)=>{timers.push({id:tid,at:t+(+ms||0),f,a});return tid++};window.clearTimeout=id=>{timers=timers.filter(x=>x.id!==id)};
let seed=4242;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
window.__step=(n,dt=1000/30)=>{for(let i=0;i<n;i++){t+=dt;const due=timers.filter(x=>x.at<=t).sort((a,b)=>a.at-b.at);timers=timers.filter(x=>x.at>t);due.forEach(x=>x.f(...x.a));const cbs=q;q=[];cbs.forEach(cb=>cb(t))}};
window.__ready=()=>q.length>0;})();`;
const noWin = { ...room, objects: room.objects.filter(o => !['window', 'curtain_l', 'curtain_r'].includes(o.id)) };
const stage = readFileSync(join(WEB, 'scenes/room/stage.json'), 'utf8');
const TEST = { 'stage.json': stage, 'objects.json': JSON.stringify(noWin) }; // window.json 없음
// 창에 딸린 일 (생기면 안 됨)
const WINDOW_THINGS = ['bfly', 'ufo', 'santa', 'witch', 'bats', 'plane', 'guest', 'curtainShadow', 'bird', 'rainbow'];
const BUTTONS = ['dBfly', 'dUfo', 'dSanta', 'dWitch', 'dBat', 'dGhost', 'dBird', 'dBlackcat', 'dThunder', 'dRainbow', 'dPlane', 'dLights', 'dRain', 'dMouse', 'dBox', 'dKnock', 'dOdd', 'dLaser', 'dFish', 'dYarn', 'dWheel', 'dMan', 'dSecret', 'dHw', 'dXmas', 'dSeason'];
const b = await chromium.launch();
for (const hour of [14, 22]) {
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 }, timezoneId: 'Australia/Sydney', locale: 'ko-KR' });
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text()));
  await p.addInitScript(INIT);
  await p.route(/goatcounter|zgo\.at|fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.route(/\/scenes\/test-nowindow\//, r => {
    const f = r.request().url().split('/').pop().split('?')[0];
    return TEST[f] ? r.fulfill({ status: 200, contentType: 'application/json', body: TEST[f] }) : r.fulfill({ status: 404, body: '' });
  });
  await p.goto(`http://localhost:${port}/index.html?scene=test-nowindow`);
  for (let i = 0; i < 100 && !(await p.evaluate(() => !!(window.__ready && window.__ready()))); i++)
    await new Promise(r => setTimeout(r, 200));
  await p.evaluate(() => document.getElementById('bDev').click());
  await p.evaluate(h => {
    const e = document.getElementById('hour');
    e.step = 'any';
    e.value = h;
    e.dispatchEvent(new Event('input'));
  }, hour);
  const seen = new Set();
  try {
    await p.evaluate(() => __step(30));
    for (const id of BUTTONS) {
      await p.evaluate(id => {
        const e = document.getElementById(id);
        if (e)
          e.click();
      }, id);
      for (let i = 0; i < 6; i++) {
        await p.evaluate(() => __step(100));
        (await p.evaluate(keys => keys.filter(k => window.__goyang.world[k]), WINDOW_THINGS)).forEach(k => seen.add(k));
      }
    }
    await p.evaluate(() => __step(3000));
  }
  catch (e) { // 한 장면이 멈추면 그 뒤는 못 본다
    errs.push(e.message.split('\n').slice(0, 3).join(' | '));
  }
  errs.forEach(e => fail(`창 없는 장면 ${hour}시: 오류 ${e}`));
  seen.forEach(k => fail(`창 없는 장면 ${hour}시: 창에 딸린 일 world.${k}이 생김`));
  await ctx.close();
}
await b.close();
console.log(`장면 이름 ${used}곳 확인`);
if (fails.length) {
  fails.forEach(f => console.log('✗ ' + f));
  process.exit(1);
}
console.log('모두 통과');
