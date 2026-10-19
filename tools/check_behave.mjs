// 행동 검사 (STABILITY_PLAN.md 4장). 배포 전 `node tools/check_behave.mjs` (서버를 따로 띄울 필요 없음)
// 강고양이 씨·쥐야쥐의 뇌를 빨리 감기 + 무작위 조작으로 오래 돌려서, 오류·루프 멈춤·이름표 빠짐·바닥 밖으로 나감·풀리지 않는 쥐야쥐 상태를 찾는다.
// 2026-10-16 상자 숨바꼭질 버그(닫힌 상자 날 S('box.check')가 null)를 잡은 방식을 정식 도구로 만든 것.
//
//   node tools/check_behave.mjs             긴 묶음: 시나리오 9개 × 시드니·서울 × 한국어·영어 (손으로, 수십 분)
//   node tools/check_behave.mjs --quick     짧은 묶음: 시나리오 9개를 한 번씩 (배포용, 몇 분)
//   옵션: --only 이름[,이름]  --seed 숫자(기본 1)  --tz Asia/Seoul  --lang ko  --static(정적 검사만)
//   실패하면 시나리오·시드·시각을 출력한다. 같은 옵션으로 다시 돌리면 똑같이 재현된다
//
// 재현: 시계·Math.random·setTimeout·requestAnimationFrame을 고정한다 (visual_check.js와 같은 방식).
//       __warp(ms)는 화면 꺼짐 흉내: 장면 없이 시계만 건너뛴다 (방은 다음 장면에 시간 점프로 따라잡는다, jump.js)
// 그림: web을 이 도구가 직접 띄우고, 없는 그림은 meta.json 크기의 투명 그림으로 대신 준다 (로직 검사용)
// 실패 조건: 오류 한 건이라도(칸막이 guard.js가 잡은 것 포함 — __goyang.errors), 루프 멈춤, BEHAVIOR에 없는 이름표,
//            배우가 걷는 바닥(WALK) 밖(바닥이 아닌 자리·점프·숨은 쥐야쥐·숨는 곳 입구·쳇바퀴 밀고 들어오기는 뺌), 쥐야쥐 state가 (배우 시간으로) 10분 넘게 그대로
// 정적 검사: 코드의 S('물건.자리')가 그 물건의 모든 상태와 창 없는 장면에서도 있는지, 사라질 수 있는 자리를 확인 없이 [0]으로 쓰는지
import { createServer } from 'http';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { deflateSync } from 'zlib';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), WEB = join(ROOT, 'web'), JS = join(WEB, 'js');
const args = process.argv.slice(2), arg = k => args.includes(k) ? args[args.indexOf(k) + 1] : null;
const QUICK = args.includes('--quick'), SEED = +(arg('--seed') || 1), ONLY = arg('--only') ? arg('--only').split(',') : null;
const fails = [], notes = [];
const fail = m => fails.push(m);
const read = p => JSON.parse(readFileSync(p, 'utf8'));

/* ───────── 1. 정적 검사: 사라질 수 있는 자리 ───────── */
function staticCheck() {
  const room = read(join(WEB, 'scenes/room/objects.json'));
  const O = Object.fromEntries(room.objects.map(o => [o.id, o]));
  // 자리가 사라지는 경우: 상태가 spots를 덮는데 그 자리가 없음 / 창 없는 장면에서 빠지는 물건 (check_scene.mjs 시험 장면)
  const NO_WINDOW = ['window', 'curtain_l', 'curtain_r'];
  const gone = name => {
    const [id, k] = name.split('.'), o = O[id], why = [];
    if (!o)
      return ['방 장면에 없는 물건'];
    for (const [sn, s] of Object.entries(o.states || {}))
      if (s.spots && !s.spots[k])
        why.push(`상태 ${sn}`);
    if (NO_WINDOW.includes(id))
      why.push('창 없는 장면');
    return why;
  };
  // 부르는 쪽이 이미 확인해서 괜찮은 곳: "파일:함수:자리" → 이유. 새로 확인 없이 쓰려면 여기에 이유와 함께 적는다 (일부러 적게)
  const SAFE = {
    'cat.js:windowB:window.watch': 'catBrain이 has(window)일 때만 고른다',
    'cat.js:knockB:cup.push': 'catBrain은 컵이 탁자에 있을 때만, 미리보기 버튼은 컵을 탁자에 올린 뒤 부른다',
    'steps.js:*:box.enter': 'SPOTS box.exit: 상자 안(inBox)이면 상자 상태가 occupied라 자리가 있다',
    'seasons.js:*:window.watch': "사건의 needs(railing)가 창 있는 장면에서만 살린다",
    'veranda.js:*:window.watch': "사건의 needs(railing)가 창 있는 장면에서만 살린다",
  };
  const uses = [], dyn = [];
  for (const f of readdirSync(JS).filter(f => f.endsWith('.js'))) {
    const lines = readFileSync(join(JS, f), 'utf8').split('\n');
    let fnName = '';
    lines.forEach((l, i) => {
      const fm = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(?:export\s+)?const\s+(\w+)\s*=.*=>|^\s+(\w+)\s*\([^)]*\)\s*\{\s*$/.exec(l);
      if (fm && !/^(if|for|while|switch|catch|else|do|try)$/.test(fm[1] || fm[2] || fm[3]))
        fnName = fm[1] || fm[2] || fm[3];
      const seen = new Set();
      for (const m of l.matchAll(/\bS\('(\w+\.\w+)'\)(\[)?/g)) {
        if (seen.has(m[1]))
          continue;
        seen.add(m[1]);
        uses.push({ f, fn: fnName, line: i + 1, name: m[1], direct: !!m[2], text: l.trim(), before: lines.slice(Math.max(0, i - 12), i + 1).join(' '), next: lines.slice(i + 1, i + 4).join(' ') });
      }
      for (const m of l.matchAll(/\bS\(([^')][^)]*)\)/g))
        if (!/^name$/.test(m[1]))
          dyn.push(`${f}:${i + 1} S(${m[1]})`);
    });
  }
  const risky = {};
  for (const u of uses) {
    const why = gone(u.name);
    if (!why.length)
      continue;
    risky[u.name] = why;
    const obj = u.name.split('.')[0], safe = SAFE[`${u.f}:${u.fn}:${u.name}`] || SAFE[`${u.f}:*:${u.name}`];
    let checked = new RegExp(`has\\('${obj}'\\)`).test(u.before); // 바로 위(12줄)에서 그 물건이 있는지 본다
    if (!u.direct) { // 변수에 받았으면 그 변수를 확인하는지
      const vm = new RegExp(`(\\w+)\\s*=\\s*S\\('${u.name.replace('.', '\\.')}'\\)`).exec(u.text), vn = vm && vm[1];
      checked = checked || !!vn && new RegExp(`!\\s*${vn}\\b|\\b${vn}\\s*&&|&&\\s*${vn}\\b|\\b${vn}\\s*\\?|\\|\\|\\s*!${vn}\\b`).test(u.text + ' ' + u.next);
    }
    const where = `${u.f}:${u.line} ${u.fn || '?'}() S('${u.name}')${u.direct ? '[…]' : ''}`;
    if (safe)
      notes.push(`정적: ${where} — 괜찮음(${safe})`);
    else if (!checked)
      fail(`정적: ${where}을 확인 없이 씀 — 이 자리는 ${why.join('·')}에서 없다. null 확인을 하거나, 부르는 쪽이 확인한다면 check_behave.mjs SAFE에 이유와 함께 적는다`);
  }
  notes.push('사라질 수 있는 자리: ' + Object.entries(risky).map(([n, w]) => `${n}(${w.join('·')})`).join(', '));
  if (dyn.length)
    notes.push('이름을 조합하는 S() (글자 찾기로 못 잡음, 손으로 확인): ' + dyn.join(' · '));
}

/* ───────── 2. 서버: web + 없는 그림은 대체 그림 ───────── */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++)
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return b => {
    let c = 0xffffffff;
    for (const x of b)
      c = t[(c ^ x) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();
function png(w, h) { // 투명 RGBA
  const chunk = (type, data) => {
    const len = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    crc.writeUInt32BE(CRC(td));
    return Buffer.concat([len, td, crc]);
  };
  const ih = Buffer.alloc(13);
  ih.writeUInt32BE(w, 0);
  ih.writeUInt32BE(h, 4);
  ih[8] = 8;
  ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(Buffer.alloc((w * 4 + 1) * h))), chunk('IEND', Buffer.alloc(0))]);
}
const SIZES = {};
for (const [dir, file] of [['f', 'f/meta.json'], ['r', 'r/meta.json']])
  if (existsSync(join(WEB, file)))
    for (const [k, v] of Object.entries(read(join(WEB, file))))
      if (Array.isArray(v))
        SIZES[`${dir}/${k}`] = [v[0], v[1]];
let fakeImgs = 0;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
function serve() {
  const srv = createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname), p = normalize(join(WEB, u === '/' ? 'index.html' : u));
    if (!p.startsWith(WEB)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(p) && statSync(p).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' }).end(readFileSync(p));
      return;
    }
    if (/\.(webp|png)$/.test(p)) { // 그림이 없으면 meta.json 크기의 투명 그림
      const key = u.replace(/^\//, '').replace(/\.(webp|png)$/, ''), sz = SIZES[key] || [8, 8];
      fakeImgs++;
      res.writeHead(200, { 'Content-Type': 'image/png' }).end(png(Math.max(1, sz[0] | 0), Math.max(1, sz[1] | 0)));
      return;
    }
    res.writeHead(404).end();
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

/* ───────── 3. 브라우저 속 고정 시계·난수 (visual_check.js INIT + __warp) ───────── */
const INIT = (T0, seed) => `(()=>{let t=0;const T0=${T0};const RD=Date;
class FD extends RD{constructor(...a){if(a.length===0)super(T0+t);else super(...a)}static now(){return T0+t}}window.Date=FD;
performance.now=()=>t;let q=[];window.requestAnimationFrame=cb=>{q.push(cb);return q.length};
let timers=[],tid=1;window.setTimeout=(f,ms=0,...a)=>{timers.push({id:tid,at:t+(+ms||0),f,a});return tid++};window.clearTimeout=id=>{timers=timers.filter(x=>x.id!==id)};
let seed=${seed >>> 0};Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const fire=()=>{const due=timers.filter(x=>x.at<=t).sort((a,b)=>a.at-b.at);timers=timers.filter(x=>x.at>t);due.forEach(x=>x.f(...x.a))};
window.__step=(n,dt=1000/30)=>{for(let i=0;i<n;i++){t+=dt;fire();const cbs=q;q=[];cbs.forEach(cb=>cb(t))}};
window.__warp=ms=>{t+=ms;fire()};
window.__ready=()=>q.length>0;window.__queued=()=>q.length;})();`;
// 그 시간대에서 y-m-d h시가 되는 UTC ms
function localMs(tz, y, mo, d, h) {
  let g = Date.UTC(y, mo - 1, d, h);
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(g)).map(x => [x.type, x.value]));
    const as = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    g += Date.UTC(y, mo - 1, d, h) - as;
  }
  return g;
}
// 노드 쪽 난수 (조작 고르기). 시드가 같으면 같은 순서
const rng = s => () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;

/* ───────── 4. 시나리오 ───────── */
// 상자: 날짜(그 지역 자정 기준 날 수) % 9 → 0 닫힌 상자, 1·2 열린 상자, 3~8 없음 (time.js boxToday·boxOpen)
const SCEN = [
  { n: '상자 없는 날', d: [2026, 10, 22, 9] },
  { n: '닫힌 상자 날', d: [2026, 10, 19, 9] },
  { n: '열린 상자 날', d: [2026, 10, 20, 9] },
  { n: '비', d: [2026, 10, 23, 13], setup: g => g.setOverride('rain', true) },
  { n: '할로윈 밤', d: [2026, 10, 31, 20] },
  { n: '크리스마스', d: [2026, 12, 24, 19] },
  { n: '생일', d: [2026, 10, 24, 20], q: '&birthday=%EB%A7%8C%EB%93%9D', click: 'birthday' },
  { n: '새벽·방송 마침', d: [2026, 10, 25, 0] },
  { n: '여름(남반구 1월)', d: [2027, 1, 15, 14] },
];
const COMBOS = QUICK ? null : [['Australia/Sydney', 'ko'], ['Australia/Sydney', 'en'], ['Asia/Seoul', 'ko'], ['Asia/Seoul', 'en']];
const PLAN = QUICK ? { days: 1, hours: 1, acts: 15, actSteps: 240 } : { days: 3, hours: 4, acts: 40, actSteps: 300 };

async function runOne(browser, base, sc, tz, lang, seed) {
  const tag = `${sc.n} (${tz.split('/')[1]}·${lang}, 시드 ${seed})`;
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, timezoneId: tz, locale: lang === 'en' ? 'en-AU' : 'ko-KR' });
  const p = await ctx.newPage(), errs = [], tagsSeen = new Set();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !/Failed to load resource/.test(t))
      errs.push(t.split('\n')[0].slice(0, 200));
    if (m.type() === 'warning' && /행동 성격표에 없는 이름표/.test(t))
      errs.push('이름표: ' + t.slice(0, 120));
  });
  await p.route(/goatcounter|zgo\.at|fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.addInitScript(INIT(localMs(tz, ...sc.d), seed));
  await p.goto(`${base}/index.html?dev=1${sc.q || ''}`);
  for (let i = 0; i < 150 && !(await p.evaluate(() => !!(window.__ready && window.__ready() && window.__goyang))); i++)
    await new Promise(r => setTimeout(r, 200));
  // 그림을 다 받은 뒤 시작 (받는 속도에 따라 결과가 달라지지 않게)
  await p.evaluate(() => {
    const g = __goyang;
    if (g.tvNeed)
      Object.keys(g.TVP).forEach(g.tvNeed);
  });
  for (let i = 0; i < 100 && await p.evaluate(() => __goyang.lazyPending && __goyang.lazyPending() > 0); i++)
    await new Promise(r => setTimeout(r, 100));
  await p.evaluate(async () => {
    window.__stage = await import('./js/stage.js');
    window.__steps = await import('./js/steps.js');
  });
  if (sc.setup)
    await p.evaluate(`(${sc.setup})(__goyang)`);
  if (sc.click)
    await p.evaluate(id => document.getElementById(id) && document.getElementById(id).click(), sc.click);
  await p.evaluate(() => __step(1));
  const R = rng(seed * 7919 + 13);
  const counts = {};
  let steps = 0, stuck = null, lastT = -1, bad = 0, bf = 1, act = 0, lastErr = 0; // act: 배우 시간(초). 행동 길이는 방 시계가 아니라 이것으로 흐른다 (main.js dt = real × bf)
  const problem = (m, where) => {
    if (bad++ < 3)
      fail(`${tag}: ${m} — ${where}`);
  };
  // 매 묶음마다 상태 보기
  const look = async where => {
    const s = await p.evaluate(() => {
      const g = __goyang, W = __stage.WALK, inSpot = __steps.inSpot, c = g.cat, m = g.mouse, d = g.now();
      // 바닥 밖이어도 괜찮은 곳: 숨는 곳의 드나드는 자리(쥐구멍 입구는 바닥보다 조금 위), 쳇바퀴를 밀고 화면 밖에서 들어오는 고양이
      const doors = g.O ? Object.values(g.O).filter(o => o.kind === 'hideout').flatMap(o => [o.spots && o.spots.out, o.spots && o.spots.hide]).filter(Boolean) : [];
      const off = a => {
        if (a.hidden || a.peek || inSpot(a) || a.jump || a.hop || a.inBox)
          return null;
        if (doors.some(s => Math.abs(s[0] - a.x) < 3 && Math.abs(s[1] - a.y) < 3))
          return null;
        if (a.kind === 'cat' && a.tag === 'wheel' && a.x > W.x1)
          return null;
        const pad = 2;
        return a.x < W.x0 - pad || a.x > W.x1 + pad || a.y < W.y0 - pad || a.y > W.y1 + pad ? `${a.kind} (${a.x.toFixed(0)}, ${a.y.toFixed(0)}) 이름표 ${a.tag}` : null;
      };
      return { t: g.world.t, q: __queued(), ms: d.getTime(), at: d.toString().slice(0, 21), err: g.errors.total, errBy: Object.keys(g.errors.by), cat: c.tag, ms2: m.state, mh: m.hidden, off: [off(c), off(m)].filter(Boolean), man: !!g.world.manduk };
    });
    if (s.cat)
      counts[s.cat] = (counts[s.cat] || 0) + 1;
    tagsSeen.add(s.cat);
    if (!(s.t > lastT) || s.q < 1)
      problem('루프가 멈춤 (world.t가 오르지 않거나 다음 장면 요청이 없음)', `${s.at} ${where}`);
    lastT = s.t;
    if (s.err > lastErr) // 새로 생긴 오류만
      problem(`칸막이가 잡은 오류 ${s.err - lastErr}건 (${s.errBy.join(', ')})`, `${s.at} ${where}`);
    lastErr = s.err;
    if (s.off.length && !s.man)
      problem('걷는 바닥 밖: ' + s.off.join(' / '), `${s.at} ${where}`);
    if (!s.mh && s.ms2) {
      if (!stuck || stuck.v !== s.ms2)
        stuck = { v: s.ms2, since: act };
      else if (act - stuck.since > 600) {
        problem(`쥐야쥐 state '${s.ms2}'가 (배우 시간으로) 10분 넘게 그대로`, `${s.at} ${where}`);
        stuck.since = act;
      }
    }
    else
      stuck = null;
    if (errs.length) {
      problem('오류: ' + errs.splice(0).slice(0, 2).join(' / '), `${s.at} ${where}`);
    }
  };
  const run = async (n, where) => {
    for (let i = 0; i < n; i += 60) {
      const k = Math.min(60, n - i);
      await p.evaluate(k => __step(k), k);
      steps += k;
      act += k / 30 * bf;
      await look(where);
    }
  };
  // 1분 = 하루로 며칠
  await p.evaluate(() => document.getElementById('sp1440').click());
  bf = 12;
  await run(PLAN.days * 1800, '1분=하루');
  // 1분 = 1시간으로 몇 시간
  await p.evaluate(() => document.getElementById('sp60').click());
  bf = 4;
  await run(PLAN.hours * 1800, '1분=1시간');
  // 실시간 + 무작위 조작
  await p.evaluate(() => document.getElementById('sp1').click());
  bf = 1;
  const btns = await p.evaluate(() => [...document.querySelectorAll('#dev button[id]')].map(b => b.id).filter(id => !/^(sp1|sp60|sp1440|dBoom|bDev)$/.test(id)));
  const acted = {};
  for (let i = 0; i < PLAN.acts; i++) {
    const r = R(), what = r < 0.45 ? 'btn' : r < 0.6 ? 'pet' : r < 0.8 ? 'tap' : r < 0.9 ? 'warp' : 'hour';
    let desc = what;
    if (what === 'btn') {
      const id = btns[Math.floor(R() * btns.length)];
      desc = 'btn ' + id;
      await p.evaluate(id => document.getElementById(id).click(), id);
    }
    else if (what === 'pet')
      await p.evaluate(() => __goyang.petCat());
    else if (what === 'tap') {
      const box = await p.locator('#cv').boundingBox(), x = box.x + R() * box.width, y = box.y + R() * box.height;
      desc = `tap ${x.toFixed(0)},${y.toFixed(0)}`;
      await p.mouse.click(x, y);
    }
    else if (what === 'warp') {
      const ms = Math.floor(R() * 14 * 3600e3);
      desc = `warp ${(ms / 3600e3).toFixed(1)}h`;
      await p.evaluate(ms => __warp(ms), ms);
    }
    else {
      const h = Math.floor(R() * 96) / 4;
      desc = `hour ${h}`;
      await p.evaluate(h => {
        const e = document.getElementById('hour');
        e.step = 'any';
        e.value = h;
        e.dispatchEvent(new Event('input'));
      }, h);
    }
    acted[what] = (acted[what] || 0) + 1;
    await run(Math.floor(PLAN.actSteps * (0.5 + R())), `무작위 ${i + 1}번째 뒤 (${desc})`);
  }
  await ctx.close();
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k || '(없음)'} ${v}`).join(' · ');
  console.log(`${bad ? '✗' : '✓'} ${tag}: ${PLAN.days}일 빨리 감기 · ${PLAN.hours}시간 60배 · 무작위 ${PLAN.acts}번 — ${bad ? `문제 ${bad}건` : '오류 0'}, 이름표 ${tagsSeen.size}가지 (${top})`);
}

(async () => {
  staticCheck();
  console.log(`${fails.length ? '✗' : '✓'} 정적 검사 (사라질 수 있는 자리)`);
  if (!args.includes('--static')) {
    let pw = null;
    for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright'])
      try {
        pw = require(p);
        break;
      }
      catch (e) { }
    if (!pw) {
      console.log('\nplaywright가 없어요. 이 폴더(고양시)에서 한 번만:\n  npm install\n  npx playwright install chromium\n(정적 검사만 하려면 --static)');
      process.exit(2);
    }
    let browser;
    try {
      browser = await pw.chromium.launch();
    }
    catch (e) {
      console.log('\n브라우저(Chromium)를 띄우지 못했어요. 이 폴더에서 한 번만:\n  npx playwright install chromium\n' + String(e.message || e).split('\n')[0]);
      process.exit(2);
    }
    const srv = await serve(), base = `http://127.0.0.1:${srv.address().port}`;
    try {
      for (const [i, sc] of SCEN.entries()) { // 시드는 시나리오 순번으로 정한다 (--only로 골라도 같은 시드)
        if (ONLY && !ONLY.includes(sc.n))
          continue;
        const combos = arg('--tz') || arg('--lang') ? [[arg('--tz') || 'Asia/Seoul', arg('--lang') || 'ko']] : COMBOS || [[i % 2 ? 'Asia/Seoul' : 'Australia/Sydney', i % 4 < 2 ? 'ko' : 'en']];
        for (const [tz, lang] of combos)
          await runOne(browser, base, sc, tz, lang, SEED + i);
      }
    }
    finally {
      await browser.close();
      srv.close();
    }
    if (fakeImgs)
      notes.push(`없는 그림 ${fakeImgs}개를 대체 그림으로`);
  }
  notes.forEach(n => console.log('  ' + n));
  if (fails.length) {
    console.log(`\n실패 ${fails.length}건:`);
    fails.forEach(f => console.log('  - ' + f));
    process.exit(1);
  }
  console.log('\n모두 통과');
})();
