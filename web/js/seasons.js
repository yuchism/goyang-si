/* 계절 손님 (WINDOW_PLAN_3.md 7~9장): 낙엽, 철새 V자 무리, 벚꽃잎, 잠자리, 첫눈 날, 난간에 쌓인 눈, 유리 성에.
   "언제·얼마나"는 time.js가 날짜 씨앗·시각으로 정한다(leafSlots·geeseSlots·dragonflySlots·blossomAt·firstSnowNow·railSnowAt·frostAt) → 새로 고침해도 같다.
   그리는 층: 날리는 낙엽·벚꽃잎·철새는 창밖 sky 자리(난간 뒤). 난간에 앉을 낙엽(내려오기 시작할 때부터)·잠자리·난간 눈·성에는 베란다 층(난간 앞, 창틀 다시 덮기).
   난간 자리: 새·검은 고양이(world.guest)가 있는 곳엔 낙엽·잠자리가 앉지 않고, 새가 오면 그 자리 낙엽은 날아간다.
   사건 물건 모양은 events.js 맨 위 설명 */
import { play } from './anim.js';
import { IMG, imageReady } from './assets.js';
import { winFree } from './behave.js';
import { canStart } from './events.js';
import { partyLevel } from './birthday.js';
import { tr } from './i18n.js';
import { P, S } from './objects.js';
import { BGK, W, ctx } from './stage.js';
import { fn, go, hold, run } from './steps.js';
import { dragonflySlots, firstSnowNow, frostAt, geeseSlots, leafSlots, blossomAt, now, railSnowAt, setDustOverride, setOverride, setWinterOverride, slotDue } from './time.js';
import { RM, clamp, hash, lerp, onScene, pick, rnd } from './util.js';
import { WIN, skyAt, skyRnd, wy } from './win.js';
import { caption, cat, say, world } from './world.js';

let PERCH_Y; // 난간 윗단 윗면 (장면의 window.json railing.y, veranda.js와 같음)
onScene(() => {
  if (WIN.rect)
    PERCH_Y = wy(WIN.railing.y);
});
const glassX = u => lerp(P.window.x + WIN.railing.glass[0], P.window.x + P.window.w - WIN.railing.glass[1], u); // 커튼에 너무 가리지 않는 범위
// 난간의 그 자리(x)에 새·검은 고양이가 있나
function railBusy(x) {
  const g = world.guest;
  if (!g || g.phase === 'out' || g.phase === 'gone')
    return false;
  const gx = g.x + (g.pair ? 18 : 0);
  return Math.abs(gx - x) < (g.kind === 'blackcat' ? 70 : 55);
}
const catFree = () => !world.manduk && !cat.inBox && !cat.dance && !cat.typing && !cat.closed && winFree(cat);
// 강고양이 씨: 창가로 가서 한동안 바라본다 (낙엽·첫눈)
function watchWindow(tag, sec, words) {
  const ws = S('window.watch'), at = cat.tag === 'window';
  run(cat, [
    ...(at ? [] : [go(ws[0] + rnd(-30, 30), ws[1], 70), hold(0.5, 'stand', false, -1)]),
    fn(a => words && say(a, words, 3.5)),
    play('window', sec),
    hold(rnd(4, 8), 'loaf', false, -1)
  ], tag);
}

/* ───────── 낙엽 (7장) ─────────
   바람 한 번(leafSlots)에 잎 3~6장이 창밖을 가로질러 떨어진다. 그중 0~2장은 난간에 내려앉았다가 잠시 뒤 다시 날아간다 */
const LEAF_COL = ['#d9482b', '#ec8a2f', '#f2c335', '#c9632a'];
const leafDone = new Set();
function spawnGust(slot) {
  const w = P.window, dir = slot.dir, n = RM ? Math.min(3, slot.n) : slot.n, L = world.leaves || (world.leaves = []);
  for (let i = 0; i < n; i++)
    L.push({ mode: 'fall', x: dir > 0 ? w.x - 20 - rnd(0, 160) : w.x + w.w + 20 + rnd(0, 160), y: skyRnd('leaves'), vx: dir * rnd(42, 78), vy: rnd(14, 28),
      rot: rnd(0, 6), vr: rnd(-3, 3), shape: Math.floor(rnd(0, 3)), col: pick(LEAF_COL), size: rnd(6, 10), ph: rnd(0, 9), t: 0, dir });
  for (let i = 0; i < slot.land; i++) {
    const tx = glassX(Math.random());
    if (railBusy(tx))
      continue;
    // 난간에 앉을 잎: 내려오기 시작할 때부터 베란다 층에 그린다 (층을 바꾸는 순간 튀지 않게)
    L.push({ mode: 'land', sx: tx - dir * rnd(110, 190), sy: skyRnd('leafLand'), tx, x: 0, y: 0, rot: rnd(0, 6), vr: rnd(-2, 2), shape: Math.floor(rnd(0, 3)), col: pick(LEAF_COL), size: rnd(7, 10),
      ph: rnd(0, 9), t: -rnd(1, 4), dur: rnd(5, 7), sit: rnd(6, 14), dir });
  }
  if (catFree() && Math.random() < 0.45)
    watchWindow('leaves', rnd(10, 18), '🍂');
  else if (cat.tag === 'window' && !cat.closed)
    say(cat, '🍂👀', 3);
}
export function startLeaves(dir = -1) {
  spawnGust({ dir, n: 5, land: 2 });
}
function leavesTick(d, real) {
  const L = world.leaves;
  if (L && L.length) {
    const w = P.window;
    for (const f of L) {
      f.t += real;
      f.rot += f.vr * real;
      if (f.mode === 'fall' || f.mode === 'lift') {
        if (f.mode === 'lift')
          f.vy += 20 * real; // 다시 떨어지기 시작
        f.x += (f.vx + Math.sin(f.t * 1.7 + f.ph) * 22) * real;
        f.y += f.vy * real;
        f.gone = f.y > w.y + w.h + 20 || (f.vx > 0 ? f.x > w.x + w.w + 40 : f.x < w.x - 40) && f.t > 2;
      }
      else if (f.mode === 'land') {
        if (f.t < 0)
          continue;
        const s = clamp(f.t / f.dur, 0, 1), e = s * s * (3 - 2 * s), sway = Math.sin(f.t * 2.2 + f.ph) * 16 * (1 - e);
        f.x = lerp(f.sx, f.tx, e) + sway;
        f.y = lerp(f.sy, PERCH_Y - 1.5, e);
        if (s >= 1)
          Object.assign(f, { mode: 'sit', t: 0, vr: 0 });
      }
      else if (f.mode === 'sit') {
        f.rot += (Math.round(f.rot / Math.PI) * Math.PI - f.rot) * Math.min(1, real * 4); // 납작하게 눕는다
        if (f.t > f.sit || railBusy(f.x)) // 시간이 됐거나 새·검은 고양이가 오면 다시 날아간다
          Object.assign(f, { mode: 'lift', t: 0, vx: f.dir * rnd(50, 80), vy: -rnd(18, 30), vr: rnd(-3, 3) });
      }
    }
    world.leaves = L.filter(f => !f.gone);
  }
  const due = slotDue(leafSlots(d), d, 0);
  if (due && !leafDone.has(due.slot.id)) {
    leafDone.add(due.slot.id);
    if (due.late < 4) // 새로 고침·점프 직후 한참 지난 바람은 건너뛴다 (잎은 몇 초면 지나간다)
      spawnGust(due.slot);
  }
}
function drawLeaf(f) {
  const s = f.size;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rot);
  if (f.mode !== 'sit')
    ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.cos(f.t * 2.6 + f.ph))); // 빙글빙글
  else
    ctx.scale(1, 0.45);
  ctx.fillStyle = f.col;
  ctx.beginPath();
  if (f.shape === 0) { // 단풍잎: 다섯 갈래
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  }
  else if (f.shape === 1) { // 갸름한 잎
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.8, 0, 0, s);
    ctx.quadraticCurveTo(-s * 0.8, 0, 0, -s);
  }
  else { // 은행잎: 부채
    ctx.moveTo(0, s * 0.7);
    ctx.arc(0, s * 0.7, s * 1.1, -Math.PI * 0.82, -Math.PI * 0.18);
    ctx.closePath();
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,40,20,.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.6);
  ctx.lineTo(0, s * 0.7);
  ctx.stroke();
  ctx.restore();
}
export const leavesEvent = {
  needs: ['window', 'railing'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'leaves',
  cls: 'bg',
  tick: (d, real) => leavesTick(d, real),
  sky: () => (world.leaves || []).forEach(f => (f.mode === 'fall') && drawLeaf(f)),
  veranda() {
    let box = null;
    for (const f of world.leaves || []) {
      if (f.mode === 'fall' || (f.mode === 'land' && f.t < 0))
        continue;
      drawLeaf(f);
      const b = [f.x - 14, f.y - 14, f.x + 14, f.y + 14];
      box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b;
    }
    return box;
  },
  reset() {
    world.leaves = [];
    leafDone.clear();
  },
  dev: [{ btn: 'dLeaves', go: () => startLeaves(pick([-1, 1])) }],
  debug: { startLeaves },
};

/* ───────── 철새 V자 무리 (7장) ─────────
   가을엔 북 → 남(오른쪽 → 왼쪽), 봄엔 반대. 하늘 높이 작은 V자 무리가 천천히 지나간다. 하늘의 큰 것(교통정리 sky) */
const geeseDone = new Set();
export function startGeese(slot) {
  world.geese = Object.assign({ t: 0, dur: 40, dir: -1, n: 11, y: wy(90) }, slot || {}, { t: 0 }, slot && slot.yk != null ? { y: skyAt('geese', slot.yk) } : {}); // 높이: 시간표는 비율 yk만, 실제 높이는 하늘 띠 geese
  if (catFree() && Math.random() < 0.6)
    run(cat, [hold(4, cat.dp === 'loaf' ? 'loaf' : 'stand'), fn(a => say(a, '👀', 3)), play('lookup', 6), hold(3, 'stand')], 'geese');
}
function geeseTick(d, real) {
  const g = world.geese;
  if (g) {
    g.t += real;
    if (g.t >= g.dur)
      world.geese = null;
    return;
  }
  const due = slotDue(geeseSlots(d), d, 5 * 60);
  if (!due || geeseDone.has(due.slot.id) || !canStart('sky'))
    return;
  geeseDone.add(due.slot.id);
  startGeese(due.slot);
}
function drawGeese(w) {
  const g = world.geese;
  if (!g)
    return;
  const k = g.t / g.dur, span = w.w + 220, x0 = g.dir > 0 ? w.x - 110 + k * span : w.x + w.w + 110 - k * span, y0 = g.y + Math.sin(k * Math.PI * 2) * 4;
  ctx.save();
  ctx.strokeStyle = 'rgba(52,56,72,.78)';
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  for (let i = 0; i < g.n; i++) {
    const rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1, bx = x0 - g.dir * rank * 10, by = y0 + side * rank * 5 + (i ? Math.sin(world.t * 0.7 + i) * 0.8 : 0);
    const f = RM ? 1 : Math.sin(world.t * 7 + i * 0.9) * 2.2; // 날갯짓 (V 모양 날개를 위아래로)
    ctx.beginPath();
    ctx.moveTo(bx - 4.5, by - 1 - f);
    ctx.quadraticCurveTo(bx - 1.5, by - 1, bx, by + 0.6);
    ctx.quadraticCurveTo(bx + 1.5, by - 1, bx + 4.5, by - 1 - f);
    ctx.stroke();
  }
  ctx.restore();
}
export const geeseEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'geese',
  cls: 'sky',
  active: () => !!world.geese,
  tick: (d, real) => geeseTick(d, real),
  sky: drawGeese,
  reset() {
    world.geese = null;
    geeseDone.clear();
  },
  dev: [{ btn: 'dGeese', go: () => {
      devGeese = -devGeese;
      startGeese({ dir: devGeese, n: 11, y: wy(90), dur: 36 });
    } }],
  debug: { startGeese },
};
let devGeese = 1;

/* ───────── 벚꽃잎 (9장) ─────────
   산벚꽃 무렵(blossom) 맑은 날 낮에 분홍 꽃잎이 바람에 날린다. 생일 꽃잎(birthday.js)이 날리는 동안엔 그것만 */
const BLOSSOM_COL = ['#ffc2d1', '#ffa9c0', '#ffe3ea', '#f797b4'];
let blossomOverride = 0;
function drawBlossom(w) {
  const lv = Math.max(blossomOverride, blossomAt(now()));
  if (lv <= 0 || partyLevel() > 0)
    return;
  const t = world.t, n = Math.round((RM ? 10 : 26) * lv);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const sp = 14 + hash('bv' + i) * 18, sz = 4.2 + hash('bs' + i) * 2.6, y = w.y + (((i * 0.381966) % 1) * (w.h + 30) + t * sp) % (w.h + 30) - 15;
    const x = w.x + ((((i * 0.618034) % 1) * w.w + Math.sin(t * 0.9 + i * 1.7) * 26 - t * 16) % w.w + w.w) % w.w, flip = Math.cos(t * (2 + hash('bf' + i) * 2) + i);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * (1 + hash('br' + i)) + i);
    ctx.scale(1, 0.35 + 0.65 * Math.abs(flip));
    ctx.fillStyle = BLOSSOM_COL[i % BLOSSOM_COL.length];
    ctx.beginPath();
    ctx.moveTo(0, -sz);
    ctx.quadraticCurveTo(sz * 0.95, -sz * 0.1, 0, sz);
    ctx.quadraticCurveTo(-sz * 0.95, -sz * 0.1, 0, -sz);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
export const blossomEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'blossom',
  cls: 'bg',
  sky: drawBlossom,
  reset() { },
  dev: [{ btn: 'dBlossom', go: () => {
      blossomOverride = blossomOverride ? 0 : 1;
    } }],
};

/* ───────── 잠자리 (9장) ─────────
   늦여름~초가을 맑은 날 낮, 난간 근처에 고추잠자리 1~2마리가 멈췄다 휙 움직였다 한다. 가끔 난간에 앉는다 (베란다 층) */
const dflyDone = new Set();
export function startDragonflies(slot) {
  const w = P.window, n = slot ? slot.n : 2;
  world.dfly = { t: 0, dur: slot ? slot.dur : 60, flies: [] };
  for (let i = 0; i < n; i++) {
    const from = pick([-1, 1]);
    world.dfly.flies.push({ x: from > 0 ? w.x - 20 : w.x + w.w + 20, y: skyRnd('dragonfly'), tx: glassX(Math.random()), ty: skyRnd('dragonflyLand'), wait: 0, sit: false, face: -from, ph: rnd(0, 9) });
  }
}
function dflyTick(d, real) {
  const D = world.dfly;
  if (D) {
    D.t += real;
    const leaving = D.t > D.dur, w = P.window;
    for (const f of D.flies) {
      if (f.sit && railBusy(f.x)) { // 새·검은 고양이가 오면 날아오른다
        f.sit = false;
        f.wait = 0;
        f.ty = PERCH_Y - 60;
      }
      if (f.wait > 0) {
        f.wait -= real;
        continue;
      }
      const dx = f.tx - f.x, dy = f.ty - f.y, dist = Math.hypot(dx, dy), sp = 170 * real;
      if (dist > sp) {
        f.x += dx / dist * sp;
        f.y += dy / dist * sp;
        if (Math.abs(dx) > 2)
          f.face = dx > 0 ? 1 : -1;
        f.sit = false;
        continue;
      }
      f.x = f.tx;
      f.y = f.ty;
      if (leaving) {
        f.gone = true;
        continue;
      }
      f.sit = f.perch;
      f.wait = f.perch ? rnd(3, 6) : rnd(0.5, 2);
      // 다음 목표: 가끔 난간에 앉기(그 자리가 비어 있으면), 아니면 근처 아무 데나 휙
      const x = clamp(f.x + rnd(-120, 120), w.x + 40, w.x + w.w - 60);
      f.perch = Math.random() < 0.28 && !railBusy(x);
      f.tx = x;
      f.ty = f.perch ? PERCH_Y - 1 : wy(rnd(300, 372));
    }
    if (leaving)
      for (const f of D.flies)
        if (!f.leaving) {
          f.leaving = true;
          f.wait = 0;
          f.sit = false;
          f.tx = f.x + (f.x < w.x + w.w / 2 ? -1 : 1) * 400;
          f.ty = skyRnd('dragonflyUp');
        }
    D.flies = D.flies.filter(f => !f.gone && !(f.leaving && (f.x < w.x - 50 || f.x > w.x + w.w + 50)));
    if (!D.flies.length)
      world.dfly = null;
    return;
  }
  const due = slotDue(dragonflySlots(d), d, 0);
  if (due && !dflyDone.has(due.slot.id)) {
    dflyDone.add(due.slot.id);
    startDragonflies(due.slot);
  }
}
function drawDfly(f) {
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  const flap = f.sit || RM ? 0 : Math.sin(world.t * 60 + f.ph);
  // 날개 넷: 투명하게 (날 때는 파르르)
  ctx.fillStyle = 'rgba(232,242,255,.5)';
  ctx.strokeStyle = 'rgba(120,130,150,.45)';
  ctx.lineWidth = 0.5;
  for (const [ox, a] of [[1.5, -0.35], [-0.5, -0.2]])
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(ox, -0.5 + s * (1 + 0.4 * flap), 4.6, 1.3, s * (a + (f.sit ? 0.25 : 0)), 0, 7);
      ctx.fill();
      ctx.stroke();
    }
  // 몸: 가늘고 긴 빨간 몸 + 동그란 머리
  ctx.strokeStyle = '#c8452f';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(3, 0);
  ctx.lineTo(-7, 0.6);
  ctx.stroke();
  ctx.fillStyle = '#9b2f22';
  ctx.beginPath();
  ctx.arc(4, -0.1, 1.5, 0, 7);
  ctx.fill();
  ctx.restore();
}
export const dragonflyEvent = {
  needs: ['window', 'railing'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'dfly',
  cls: 'bg',
  tick: (d, real) => dflyTick(d, real),
  veranda() {
    const D = world.dfly;
    if (!D)
      return null;
    D.flies.forEach(drawDfly);
    const xs = D.flies.map(f => f.x), ys = D.flies.map(f => f.y);
    return [Math.min(...xs) - 12, Math.min(...ys) - 10, Math.max(...xs) + 12, Math.max(...ys) + 8];
  },
  reset() {
    world.dfly = null;
    dflyDone.clear();
  },
  dev: [{ btn: 'dDragonfly', go: () => startDragonflies(null) }],
  debug: { startDragonflies },
};

/* ───────── 첫눈 날 (8장) ─────────
   그 겨울 처음 눈이 오는 날(time.js firstSnowNow), 강고양이 씨가 깨어 있으면 창가로 가서 평소보다 오래 바라본다. 자막 "…첫눈…".
   저장하지 않고 페이지를 열 때마다 한 번까지 (첫눈 날 다시 들어온 사람도 볼 수 있게) */
function firstSnowTick(d) {
  if (world.firstSnowSeen || !firstSnowNow(d) || !catFree() || cat.tag === 'firstsnow')
    return;
  world.firstSnowSeen = true;
  caption(tr('capFirstSnow'), 4);
  watchWindow('firstsnow', rnd(45, 70), '❄️');
}
let devFirstSnow = false;
export const firstSnowEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'firstsnow',
  cls: 'bg',
  tick: d => firstSnowTick(d),
  reset() { },
  dev: [{ btn: 'dFirstSnow', go: () => {
      devFirstSnow = !devFirstSnow;
      setOverride('season', devFirstSnow ? 'winter' : null);
      setOverride('rain', devFirstSnow ? true : null);
      setWinterOverride('firstSnow', devFirstSnow);
      world.firstSnowSeen = false;
    } }],
};

/* ───────── 난간에 쌓인 눈 (8장) ─────────
   눈이 오는 동안 난간 윗단에 하얀 눈 띠가 조금씩 두꺼워지고(최대 5px), 그친 뒤 반나절에 걸쳐 녹는다 (time.js railSnowAt) */
function drawRailSnow(w) {
  const k = railSnowAt(now());
  if (k <= 0.01)
    return null;
  const th = 1.2 + 3.8 * k, x0 = w.x - 4, x1 = w.x + w.w + 4;
  ctx.save();
  ctx.fillStyle = 'rgba(120,135,165,.28)'; // 아래 옅은 그림자
  ctx.fillRect(x0, PERCH_Y + 0.5, x1 - x0, 1.6);
  ctx.fillStyle = '#f6f8fd';
  ctx.beginPath();
  ctx.moveTo(x0, PERCH_Y + 1);
  for (let x = x0; x <= x1; x += 7) // 둥글둥글한 윗면
    ctx.lineTo(x, PERCH_Y - th * (0.75 + 0.25 * hash('rs' + Math.round(x / 7))) - Math.sin(x * 0.21) * 0.5 * k);
  ctx.lineTo(x1, PERCH_Y + 1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return [x0, PERCH_Y - 8, x1, PERCH_Y + 3];
}
export const railSnowEvent = {
  needs: ['railing'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'railsnow',
  cls: 'bg',
  veranda: drawRailSnow,
  reset() { },
  dev: [{ btn: 'dRailSnow', go: () => {
      devRail = !devRail;
      setWinterOverride('railSnow', devRail ? 1 : null);
    } }],
};
let devRail = false;

/* ───────── 유리 성에 (8장) ─────────
   겨울 맑은 날 새벽·아침에 유리 모서리마다 하얀 성에, 오전 10시쯤까지 서서히 사라진다 (time.js frostAt).
   유리 칸(창틀 그림 window_frame의 투명한 곳)을 한 번 찾아, 칸마다 네 모서리에서 안쪽으로 옅어지는 얼음 결을 임시 캔버스에 그려 둔다.
   베란다 층 맨 끝에 그리고 창틀을 다시 덮으므로 유리에만 남는다 */
let frostPat = null;
function glassPanes(w) {
  const im = IMG.r_window_frame;
  if (!imageReady(im))
    return [[w.x, w.y, w.x + w.w, w.y + w.h]];
  let A;
  try {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0);
    A = x.getImageData(0, 0, c.width, c.height);
  }
  catch (e) {
    return [[w.x, w.y, w.x + w.w, w.y + w.h]];
  }
  const sx = im.naturalWidth / W, sy = 1 / BGK, clear = (x, y) => A.data[(Math.floor(y * sy) * A.width + Math.floor(x * sx)) * 4 + 3] < 40;
  // 가운데 높이(window.json glassScanY)에서 가로로 훑어 유리 칸의 좌우를 찾고, 칸마다 세로로 훑어 위아래를 찾는다
  const panes = [], scanY = wy(WIN.glassScanY);
  let x = w.x;
  while (x < w.x + w.w) {
    while (x < w.x + w.w && !clear(x, scanY))
      x++;
    const a = x;
    while (x < w.x + w.w && clear(x, scanY))
      x++;
    if (x - a > 30) {
      const cx = (a + x) / 2;
      let t = scanY, b = scanY;
      while (t > w.y && clear(cx, t - 1))
        t--;
      while (b < w.y + w.h && clear(cx, b + 1)) // 유리 아래 끝(창 아랫단)까지. 난간 자리도 창틀 그림에선 투명(난간은 베란다 쪽)
        b++;
      panes.push([a, t, x, b]);
    }
  }
  return panes.length ? panes : [[w.x, w.y, w.x + w.w, w.y + w.h]];
}
function buildFrost(w) {
  const K = 2, c = document.createElement('canvas');
  c.width = Math.ceil(w.w * K);
  c.height = Math.ceil(w.h * K);
  const x = c.getContext('2d');
  x.scale(K, K);
  x.translate(-w.x, -w.y);
  let seed = 0;
  const rr = () => hash('fr' + seed++);
  for (const [a, t, b, bot] of glassPanes(w))
    for (const [cx, cy, sx, sy] of [[a, t, 1, 1], [b, t, -1, 1], [a, bot, 1, -1], [b, bot, -1, -1]]) {
      const R = Math.min(70, (b - a) * 0.4);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, 'rgba(250,252,255,.62)');
      g.addColorStop(0.55, 'rgba(240,246,255,.22)');
      g.addColorStop(1, 'rgba(240,246,255,0)');
      x.fillStyle = g;
      x.fillRect(cx - R, cy - R, R * 2, R * 2);
      // 얼음 결: 모서리에서 안쪽으로 뻗는 가지
      x.strokeStyle = 'rgba(255,255,255,.55)';
      x.lineWidth = 0.7;
      x.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        let px = cx + sx * rr() * 10, py = cy + sy * rr() * 10, ang = Math.atan2(sy, sx) + (rr() - 0.5) * 1.3;
        const len = R * (0.5 + 0.5 * rr());
        x.beginPath();
        x.moveTo(px, py);
        for (let s = 0; s < len; s += 6) {
          ang += (rr() - 0.5) * 0.5;
          px += Math.cos(ang) * 6;
          py += Math.sin(ang) * 6;
          x.lineTo(px, py);
          if (rr() < 0.35) { // 잔가지
            const b2 = ang + (rr() < 0.5 ? 1 : -1) * 0.8, l2 = 3 + rr() * 6;
            x.moveTo(px, py);
            x.lineTo(px + Math.cos(b2) * l2, py + Math.sin(b2) * l2);
            x.moveTo(px, py);
          }
        }
        x.stroke();
      }
    }
  return c;
}
let frostDev = false;
function drawFrost(w) {
  const k = frostAt(now());
  if (k <= 0.01)
    return null;
  if (!frostPat || frostPat.w !== w.w || (!frostPat.real && imageReady(IMG.r_window_frame)))
    frostPat = { c: buildFrost(w), w: w.w, real: imageReady(IMG.r_window_frame) };
  ctx.save();
  ctx.globalAlpha = 0.9 * k;
  ctx.drawImage(frostPat.c, w.x, w.y, w.w, w.h);
  ctx.restore();
  return [w.x - 4, w.y, w.x + w.w + 4, w.y + w.h + 4];
}
export const frostEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'frost',
  cls: 'bg',
  veranda: drawFrost,
  reset() { },
  dev: [{ btn: 'dFrost', go: () => {
      frostDev = !frostDev;
      setWinterOverride('frost', frostDev ? 1 : null);
    } }],
};

/* ───────── 미세먼지 (9장): 그리는 건 outside.js(하늘)·scenery.js(연무). 여기는 미리보기 버튼만 ───────── */
let devDust = false;
export const dustEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'dust',
  cls: 'bg',
  reset() { },
  dev: [{ btn: 'dDust', go: () => {
      devDust = !devDust;
      setDustOverride(devDust ? true : null);
    } }],
};
