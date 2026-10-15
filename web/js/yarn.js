/* 실뭉치: 빨간 실뭉치가 왼쪽 화면 밖에서 굴러 들어오고, 강고양이 씨가 툭툭 치며 쫓다가 가끔 껴안고 뒷발로 차고,
   한참 뒤 실이 팽팽해지며 실뭉치가 화면 밖으로 끌려 나간다. 누가 당기는지는 모른다. CAT_PLAY_PLAN.md 5-4, YARN_SPRITE_PLAN.md
   보는 사람이 실뭉치를 누르면 톡 굴러가고, 고양이가 깨어 있으면 쫓아온다 */
import { play } from './anim.js';
import { FRAMES, FSC, imageReady, img } from './assets.js';
import { tvFree } from './behave.js';
import { Snd } from './sound.js';
import { DEPTH, ctx } from './stage.js';
import { bub, fn, go, hold, routeTo, run, stepToward } from './steps.js';
import { hourOf, now } from './time.js';
import { RM, clamp, rnd } from './util.js';
import { cat, mouse, say, world } from './world.js';

const R = 22; // 방에서 실뭉치 반지름
const FRICTION = 1.7; // 굴러가다 서는 빠르기
const GAP = 3 * 3600e3; // 방 시각으로 3시간에 한 번까지
const OUT_X = -60; // 화면 밖 (실 끝이 있는 곳)
/* 상태: null(없음) | 'in'(굴러 들어오는 중) | 'idle' | 'held'(고양이가 껴안음) | 'pull'(끌려 나가는 중) */
const Y = { state: null, x: 0, y: 0, vx: 0, vy: 0, rot: 0, ay: 690, t: 0, life: 0 };
let lastYarn = -1e18;
export const yarnState = () => Y; // 점검용

/* ───── 나타나기·끌려가기 ───── */
// stopX: 대략 멈출 곳 (굴러 들어올 때 처음 속도를 거기에 맞춘다)
export function yarnIn(stopX) {
  if (Y.state)
    return false;
  const y = rnd(655, 722), sx = stopX != null ? stopX : rnd(260, 520);
  Object.assign(Y, { state: 'in', x: OUT_X + 10, y, vx: (sx - OUT_X) * FRICTION, vy: 0, rot: 0, ay: y + rnd(-15, 15), t: 0, life: rnd(70, 110) });
  lastYarn = now().getTime();
  Snd.thump(0.15, 260);
  // 고양이: 자고 있으면 그대로, 한가하면 알아채고 놀러 온다
  setTimeout(() => {
    if (Y.state && !world.manduk && !cat.closed && tvFree(cat) && cat.tag !== 'yarn')
      yarnB();
  }, 1200);
  return true;
}
function pullOut() {
  if (Y.state && Y.state !== 'pull') {
    Y.state = 'pull';
    Y.t = 0;
  }
}
export function yarnReset() { // 시간 점프 (jump.js)
  Y.state = null;
}

/* ───── 매 장면 (main.js) ───── */
export function yarnTick(dt) {
  const d = now();
  if (!Y.state) {
    const h = hourOf(d);
    if (h >= 8 && h < 22 && !world.manduk && !world.party && d.getTime() - lastYarn > GAP && Math.random() < dt / 1200)
      yarnIn();
    return;
  }
  Y.t += dt;
  if (world.manduk && Y.state !== 'pull')
    pullOut(); // 만득 씨가 오면 스르륵 사라진다
  if (cat.tag !== 'yarn' && Y.state === 'held') { // 껴안고 있다가 끊기면 옆에 다시 놓는다
    Y.state = 'idle';
    Y.x = clamp(cat.x - 70, 40, 1150);
    Y.y = clamp(cat.y + 4, 600, 738);
  }
  if (Y.state === 'held')
    return;
  if (Y.state === 'pull') { // 실이 팽팽해지고 점점 빠르게 왼쪽으로
    Y.vx = Math.max(-300, Y.vx - dt * 420);
    Y.vy += (Y.ay - Y.y) * dt * 2;
  }
  else {
    const k = Math.exp(-FRICTION * dt);
    Y.vx *= k;
    Y.vy *= k;
    if (Math.abs(Y.vx) < 4 && Math.abs(Y.vy) < 4) {
      Y.vx = Y.vy = 0;
      if (Y.state === 'in')
        Y.state = 'idle';
    }
    // 아무도 안 놀면(또는 놀 만큼 놀았으면) 끌려 나간다
    if (Y.t > Y.life && cat.tag !== 'yarn')
      pullOut();
  }
  Y.x += Y.vx * dt;
  Y.y += Y.vy * dt;
  if (Y.state !== 'pull' && Y.state !== 'in') { // 방 안에서는 벽에 맞고 조금 튄다
    if (Y.x < 40 || Y.x > 1150) {
      Y.x = clamp(Y.x, 40, 1150);
      Y.vx *= -0.5;
    }
  }
  if (Y.y < 600 || Y.y > 738) {
    Y.y = clamp(Y.y, 600, 738);
    Y.vy *= -0.5;
  }
  Y.rot += Y.vx * dt / R;
  if (Y.state === 'pull' && Y.x < OUT_X)
    Y.state = null;
  if (Y.state === 'idle' || Y.state === 'in')
    mouseNudge(dt);
}
// 쥐야쥐: 고양이가 안 놀고 있을 때 가끔 실뭉치를 코로 밀어 본다
function mouseNudge(dt) {
  if (mouse.hidden || mouse.peek || mouse.state || world.manduk || cat.tag === 'yarn' || Y.vx || Math.random() > dt / 25)
    return;
  const side = mouse.x < Y.x ? -1 : 1;
  mouse.state = 'yarn';
  run(mouse, [
    go(Y.x + side * (R + 14), clamp(Y.y + 2, 600, 738), 80),
    fn(a => {
      a.face = -side;
      push(-side, rnd(60, 110));
    }),
    hold(1.2, 'walk'),
    bub('😜', 2),
    hold(rnd(2, 4), 'walk'),
    fn(a => {
      a.state = '';
    })
  ], 'yarn');
}
function push(dir, power) {
  if (!Y.state || Y.state === 'pull')
    return;
  if (Y.state === 'held' || Y.state === 'in')
    Y.state = 'idle';
  Y.vx = dir * power;
  Y.vy = rnd(-40, 40);
  Snd.thump(0.2, 700);
}

/* ───── 강고양이 씨 ───── */
// 앞발 휘두르는 그림의 앞발 끝까지 거리 (방 좌표)
function reach(y) {
  const m = FRAMES.cat_bat_2;
  return m ? (m[2] - 40) * FSC * DEPTH(y) + R * 0.4 : 140;
}
function chase() {
  let cur = null, hits = 0, hugged = false;
  const q = [], n = 3 + Math.floor(Math.random() * 4);
  return {
    init(a) {
      a.moving = false;
    },
    tick(a, dt) {
      if (!cur && q.length) {
        cur = q.shift();
        cur.init(a);
      }
      if (cur) {
        if (cur.tick(a, dt))
          cur = null;
        return false;
      }
      if (!Y.state || Y.state === 'pull') {
        a.moving = false;
        return true;
      }
      if (hits >= n) { // 놀 만큼 놀았다 → 끌려 나간다
        pullOut();
        a.moving = false;
        return true;
      }
      const side = a.x >= Y.x ? 1 : -1, ty = clamp(Y.y + 2, 600, 738), tx = clamp(Y.x + side * reach(ty), 40, 1160);
      const d = Math.hypot(tx - a.x, ty - a.y), rolling = Math.abs(Y.vx) > 25;
      if (d > 12) {
        if (a.tr || a.dp !== 'stand') { // 일어나는 동작이 끝나야 걷는다
          a.pose = 'stand';
          a.closed = false;
          a.moving = false;
          return false;
        }
        const r = routeTo(a, tx, ty, false);
        stepToward(a, r[0][0], r[0][1], d > 200 || rolling ? 190 : 80, dt);
        return false;
      }
      a.moving = false;
      a.face = -side;
      if (rolling)
        return false;
      // 두 번쯤 친 뒤 가끔: 벌러덩 껴안고 뒷발 차기
      if (!hugged && hits >= 2 && Math.random() < 0.4) {
        hugged = true;
        q.push(fn(c => {
          Y.state = 'held';
          Y.vx = Y.vy = 0;
          say(c, '❤️', 2);
        }), play('hugkick', rnd(3, 6)), fn(c => {
          Y.state = 'idle';
          Y.x = clamp(c.x + c.face * 75, 40, 1150);
          Y.y = clamp(c.y + 3, 600, 738);
          push(c.face, rnd(70, 120));
        }));
        return false;
      }
      hits++;
      q.push(play('bat1', rnd(0.4, 0.8)), fn(c => push(c.face, rnd(170, 290))), play('bat2'));
      return false;
    }
  };
}
// 화면 왼쪽 끝으로 (출발할 때의 높이 그대로)
const goEdge = () => {
  let g;
  return { init(a) {
      g = go(80, a.y, 200);
      g.init(a);
    }, tick: (a, dt) => g.tick(a, dt) };
};
export function yarnB() {
  if (!Y.state || Y.state === 'pull')
    return;
  run(cat, [
    fn(a => {
      a.face = Y.x > a.x ? 1 : -1;
      say(a, '👀', 2);
    }),
    hold(0.6, 'stand'),
    chase(),
    // 끌려 나가는 실뭉치를 쫓아 화면 끝까지
    goEdge(),
    hold(0.6, 'stand', false, -1),
    bub('❓', 3),
    play('lookup', 2.4),
    hold(1, 'stand'),
    play('groom', rnd(4, 7)),
    hold(rnd(10, 20), 'loaf')
  ], 'yarn');
}

/* ───── 보는 사람이 실뭉치를 누름 ───── */
export function yarnAt(x, y) {
  if (!Y.state || Y.state === 'held' || Y.state === 'pull')
    return false;
  const r = R * DEPTH(Y.y);
  return Math.hypot(x - Y.x, y - (Y.y - r)) < r + 12;
}
export function tapYarn(x) {
  push(x < Y.x ? 1 : -1, rnd(200, 280));
  Y.t = Math.min(Y.t, Y.life - 20); // 누르면 조금 더 머문다
  if (!cat.closed && !world.manduk && cat.tag !== 'yarn' && tvFree(cat))
    setTimeout(() => {
      if (Y.state && cat.tag !== 'yarn' && !cat.closed)
        yarnB();
    }, 400);
}

/* ───── 그리기: 앞뒤 정렬에 끼운다 (main.js render) ───── */
export function yarnLayers() {
  if (!Y.state || Y.state === 'held')
    return [];
  return [[Y.y, drawYarn]];
}
function drawYarn() {
  const dp = DEPTH(Y.y), r = R * dp, cy = Y.y - r;
  // 실 한 가닥: 실뭉치에서 왼쪽 화면 밖까지. 바닥에 늘어져 있다가 끌려갈 때는 팽팽하게
  ctx.save();
  ctx.strokeStyle = '#8e2f2a';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(Y.x - r * 0.7, Y.y - 3);
  if (Y.state === 'pull')
    ctx.lineTo(OUT_X - 40, Y.ay);
  else {
    const mx = (Y.x + OUT_X) / 2, sag = RM ? 0 : Math.sin(Y.t * 0.7) * 3;
    ctx.bezierCurveTo(mx + 40, Y.y + 10 + sag, mx - 40, Y.ay + 14, OUT_X - 40, Y.ay);
  }
  ctx.stroke();
  // 그림자
  ctx.beginPath();
  ctx.ellipse(Y.x, Y.y + 1, r * 0.9, 4 * dp, 0, 0, 7);
  ctx.fillStyle = 'rgba(50,30,15,.2)';
  ctx.fill();
  ctx.restore();
  const k = Math.floor(Math.abs(Y.rot) / (Math.PI / 2)) % 2, im = img(k ? 'yarn_2' : 'yarn');
  if (!imageReady(im))
    return;
  ctx.save();
  ctx.translate(Y.x, cy);
  ctx.rotate(Y.rot);
  ctx.drawImage(im, -r, -r, r * 2, r * 2 * im.height / im.width);
  ctx.restore();
}
