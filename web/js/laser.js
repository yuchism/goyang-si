/* 레이저 놀이: 보는 사람이 탁자 위 레이저 포인터를 누르면 잠깐(40초) 빨간 점을 움직여 강고양이 씨와 논다.
   컴퓨터는 점이 마우스를 따라가고, 폰은 누르고 끄는 곳으로 간다. 고양이는 쫓다가 덮치고, 앞발 밑을 확인하면 없다.
   한참 놀면 지쳐서 한동안(3분) 점을 봐도 무시한다. CAT_PLAY_PLAN.md 5-1
   그림: anim.js CLIP의 wiggle·pounce·pawcheck·wallreach (LASER_SPRITE_PLAN.md) */
import { play } from './anim.js';
import { inked, rr } from './draw.js';
import { tr } from './i18n.js';
import { mouseHide } from './mouse.js';
import { A, O, PL, ay } from './objects.js';
import { ctx, cv, walkX, walkY } from './stage.js';
import { fn, go, hold, routeTo, run, stepToward } from './steps.js';
import { RM, clamp, rnd } from './util.js';
import { caption, cat, mouse, say, world } from './world.js';

export const LASER = {
  dur: 40, // 한 번 켜는 시간 (초, 실제 시간)
  fade: 5, // 끝나기 전 깜빡이는 시간
  rest: 180, // 논 뒤 무시하는 시간
  engage: 40, // 고양이가 쫓는 시간. 10분 안에 또 하면 10초씩 줄어든다 (최소 12초)
};
let L = null, restUntil = -1e9, lastEnd = -1e9, streak = 0;
export const laserOn = () => !!L;
const wallY = () => PL('laser.wall').y; // 점이 이보다 위(y)면 벽·창에 있는 것 (장면의 laser.wall)
export const laserState = () => L; // 점검용

/* ───── 포인터 (탁자 위, objects.json의 laser) ───── */
export function penAt(x, y) {
  const p = O.laser && O.laser.pos;
  return !!p && Math.abs(x - p.x) < p.w / 2 + 14 && y > p.y - 28 && y < p.y + 10;
}
// objects.json look "code:laser" (draw.js CODE가 부른다)
export function drawLaserPen(v) {
  const { x, y, w } = v.pos, h = w * 0.24;
  ctx.save();
  ctx.translate(x, y - h / 2 - 1);
  ctx.rotate(-0.1);
  rr(-w / 2, -h / 2, w, h, h / 2);
  inked('#59606c', 3);
  ctx.beginPath(); // 끝 (빛이 나오는 쪽)
  ctx.rect(w / 2 - w * 0.18, -h / 2 + 1.5, w * 0.16, h - 3);
  ctx.fillStyle = '#c9ced6';
  ctx.fill();
  ctx.beginPath(); // 단추
  ctx.arc(-w * 0.08, -h / 2 + 0.5, h * 0.26, 0, 7);
  ctx.fillStyle = L ? '#ff4a3a' : '#b0473c';
  ctx.fill();
  if (L) {
    const g = ctx.createRadialGradient(w / 2, 0, 1, w / 2, 0, 14);
    g.addColorStop(0, 'rgba(255,60,50,.8)');
    g.addColorStop(1, 'rgba(255,60,50,0)');
    ctx.fillStyle = g;
    ctx.fillRect(w / 2 - 14, -14, 28, 28);
  }
  ctx.restore();
}

/* ───── 켜고 끄기 ───── */
export function toggleLaser() {
  if (L)
    endLaser();
  else
    startLaser();
}
export function startLaser() {
  if (world.manduk) { // 만득 씨 앞에서는 안 켜진다
    caption(tr('capLaserManduk'), 3);
    return false;
  }
  if (world.party || cat.tag === 'birthday')
    return false;
  if (world.t - lastEnd < 600)
    streak++;
  else
    streak = 0;
  const p = O.laser.pos;
  L = { t: 0, x: p.x, y: PL('laser.start').y, still: 0, eng: Math.max(12, LASER.engage - streak * 10), played: false };
  cv.style.cursor = 'none';
  cv.style.touchAction = 'none';
  if (world.t < restUntil) { // 지쳤다: 힐끗 보고 무시
    if (!cat.closed)
      say(cat, '👀… 😑', 3);
    return true;
  }
  const asleep = cat.closed;
  run(cat, [...(asleep ? [hold(rnd(0.8, 1.4), 'loaf'), fn(a => say(a, '❗', 1.5))] : [fn(a => say(a, '‼️', 1.6))]),
    chase(),
    fn(a => say(a, '😮‍💨', 3)),
    hold(rnd(20, 40), 'loaf')
  ], 'laser');
  L.played = true;
  return true;
}
export function endLaser() {
  if (!L)
    return;
  if (L.played)
    restUntil = world.t + LASER.rest;
  lastEnd = world.t;
  L = null;
  cv.style.cursor = '';
  cv.style.touchAction = '';
}
// 보는 사람의 손가락·마우스 (ui.js)
export function moveDot(x, y) {
  if (!L)
    return;
  x = clamp(x, 0, 1200);
  y = clamp(y, 0, 760);
  if (Math.hypot(x - L.x, y - L.y) > 3)
    L.still = 0;
  L.x = x;
  L.y = y;
}
// 매 장면 (main.js frame, 실제 시간)
export function laserTick(real) {
  if (!L)
    return;
  L.t += real;
  L.still += real;
  if (world.manduk || L.t >= LASER.dur) {
    endLaser();
    return;
  }
  // 쥐야쥐는 점이 가까이 오면 놀라서 구멍으로
  if (!mouse.hidden && !mouse.peek && mouse.state !== 'flee' && Math.hypot(L.x - mouse.x, L.y - mouse.y) < 70) {
    say(mouse, '‼️', 1.5);
    mouseHide(true);
  }
}
// 점: 어둠 위에 그린다 (밤에도 잘 보이게)
export function drawLaserDot() {
  if (!L)
    return;
  const left = LASER.dur - L.t;
  let al = 1;
  if (left < LASER.fade)
    al = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(L.t * 9)) * (left / LASER.fade);
  const j = RM ? 0 : 0.7, x = L.x + Math.sin(L.t * 37) * j, y = L.y + Math.cos(L.t * 29) * j;
  ctx.save();
  ctx.globalAlpha = al;
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 1, x, y, 18);
  g.addColorStop(0, 'rgba(255,50,40,.55)');
  g.addColorStop(1, 'rgba(255,50,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 18, y - 18, 36, 36);
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, 7);
  ctx.fillStyle = '#ff2a22';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 1, y - 1, 1.6, 0, 7);
  ctx.fillStyle = 'rgba(255,235,225,.9)';
  ctx.fill();
  ctx.restore();
}

/* ───── 강고양이 씨: 쫓기 ─────
   한 단계 안에서 작은 순서를 돈다: 알아챔 → (멀면) 엉덩이 씰룩 → 달려감 → 점이 멈추면 덮치기 → 앞발 밑 확인 → 다시.
   점이 벽에 있으면 그 아래에서 벽 짚고 올려다보기. 놀 시간(eng)이 끝나거나 점이 꺼지면 끝 */
const hop = (tx, ty) => {
  const p = play('pounce');
  let x0, y0;
  return { init(a) {
      p.init(a);
      x0 = a.x;
      y0 = a.y;
      a.face = tx > a.x ? 1 : tx < a.x ? -1 : a.face;
    }, tick(a, dt) {
      const done = p.tick(a, dt);
      if (a.act && a.act.t >= 0) {
        const k = Math.min(1, a.act.t / (a.act.dur * 0.6)); // 앞 60% 동안 날아가서 착지
        a.x = x0 + (tx - x0) * k;
        a.y = y0 + (ty - y0) * k;
      }
      return done;
    } };
};
const once = f => fn(f);
function chase() {
  let q = [], cur = null, ph = 'notice', t = 0, gx = 0, gy = 0, spot = null, n = 0;
  const push = (...s) => q.push(...s);
  return {
    init(a) {
      a.moving = false;
      gx = a.x;
      gy = a.y;
    },
    tick(a, dt) {
      if (!L || L.t > L.eng) {
        a.act = null;
        a.moving = false;
        return true;
      }
      t += dt;
      // 하던 작은 동작 마저 하기
      if (!cur && q.length) {
        cur = q.shift();
        cur.init(a);
      }
      if (cur) {
        if (cur.tick(a, dt))
          cur = null;
        return false;
      }
      const onWall = L.y < wallY(), tx = walkX(L.x, cat.half), ty = onWall ? PL('laser.wallLook').y : walkY(L.y);
      // 반 박자 늦게 따라간다
      const k = Math.min(1, dt * 5);
      gx += (tx - gx) * k;
      gy += (ty - gy) * k;
      const d = Math.hypot(tx - a.x, ty - a.y);
      if (ph === 'notice') {
        a.pose = 'stand';
        a.face = tx > a.x ? 1 : -1;
        if (t > 0.5) {
          ph = 'chase';
          if (d > 260)
            push(play('wiggle', rnd(0.8, 1.4)));
        }
        return false;
      }
      // 덮칠 만큼 가깝고 점이 멈춰 있다
      if (!onWall && d < 170 && L.still > 0.55) {
        const same = spot && Math.hypot(tx - spot[0], ty - spot[1]) < 30;
        if (!same)
          n = 0;
        if (n < 2) { // 같은 자리에서는 두 번까지만. 그 뒤엔 앉아서 노려본다
          n++;
          spot = [tx, ty];
          a.moving = false;
          push(hop(tx + (a.x < tx ? -34 : 34), ty), play('pawcheck', rnd(0.9, 1.3)),
            once(a => Math.random() < 0.6 && say(a, pick2(), 1.8)));
          return false;
        }
        a.moving = false;
        a.pose = 'stand';
        a.face = tx > a.x ? 1 : -1;
        return false;
      }
      if (d > 46) {
        if (a.tr || a.dp !== 'stand') { // 일어나는 동작이 끝나야 달린다
          a.pose = 'stand';
          a.closed = false;
          a.moving = false;
          return false;
        }
        const r = routeTo(a, gx, gy, false);
        stepToward(a, r[0][0], r[0][1], d > 220 ? 235 : 150, dt);
        return false;
      }
      a.moving = false;
      if (onWall) { // 벽 아래에서 짚고 올려다보기
        a.face = L.x > a.x ? 1 : -1;
        push(play('wallreach', 2.5, () => !L || L.y >= wallY()), once(a => Math.random() < 0.4 && say(a, '❓', 1.5)));
        return false;
      }
      a.pose = 'stand';
      a.face = tx > a.x ? 1 : tx < a.x ? -1 : a.face;
      return false;
    }
  };
}
const pick2 = () => Math.random() < 0.7 ? '❓' : '❓👀';

/* ───── 가끔: 탁자 위 포인터를 한참 노려본다 (또 놀고 싶어서). 지쳐 있을 때·놀이 중에는 안 한다 ───── */
export function penStareOk() {
  return !!O.laser && !L && world.t > restUntil && !world.manduk;
}
export function penStareB() {
  const p = O.laser.pos;
  run(cat, [
    go(p.x + rnd(30, 50), ay(A('laser.penStare')), 55),
    hold(0.4, 'stand', false, -1),
    fn(a => say(a, '👀', 3)),
    play('lookup', rnd(10, 18)), // 고개를 들고 포인터를 한참 올려다본다
    hold(rnd(4, 8), 'loaf', false, -1),
    fn(a => Math.random() < 0.5 && say(a, '😼', 2.5)),
    hold(rnd(8, 15), 'loaf', false, -1)
  ], 'penstare');
}

/* ───── 놀이 목록에 싣는 것 (plays.js) ───── */
export const laserPlay = {
  needs: ['laser', 'laser.wall'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'laser',
  tick: (dt, real) => laserTick(real), // 놀이 시간은 실제 시간
  light: drawLaserDot, // 어둠 위에 (빨간 점은 밤에도 보인다)
  press(x, y, when) { // 가장 먼저 본다. 켜져 있으면 방을 눌러도 점만 움직이고, 포인터를 다시 누르면 끝
    if (when !== 'first')
      return false;
    if (L) {
      if (penAt(x, y))
        endLaser();
      else
        moveDot(x, y);
      return true;
    }
    if (penAt(x, y)) {
      startLaser();
      return true;
    }
    return false;
  },
  drag(x, y, e) { // 컴퓨터는 마우스를 따라가고, 폰은 누른 채 끄는 곳으로
    if (L && (e.pointerType === 'mouse' || e.buttons))
      moveDot(x, y);
  },
  abort: () => endLaser(), // 오류 뒤 되돌리기 (STABILITY_PLAN.md 3-1, recover.js)
  dev: { btn: 'dLaser', go: () => toggleLaser() },
  debug: { startLaser, endLaser, moveDot, laserState, penStareB },
};
