/* 쳇바퀴: 강고양이 씨가 오른쪽 화면 밖(문 쪽)으로 나갔다가 쳇바퀴를 머리로 밀며 방을 가로질러 들어오고, 어항 앞에 세워 올라타 달린다.
   내려와서 다른 데로 가면 쳇바퀴는 혼자 스윽 왼쪽 화면 밖으로 굴러 나간다. 누가 가져가는지는 모른다.
   낮에만. 소리가 나도 만득 씨는 오지 않는다. CAT_PLAY_PLAN.md 5-3, WHEEL_SPRITE_PLAN.md
   그리기 순서: 뒤판 → 디딤판 줄무늬(돌아감) → 바퀴 안 고양이·쥐야쥐 → 앞판 */
import { play } from './anim.js';
import { FRAMES, FSC, ROOM, imageReady, img } from './assets.js';
import { tr } from './i18n.js';
import { drawActor } from './sprites.js';
import { Snd } from './sound.js';
import { DEPTH, ctx } from './stage.js';
import { SPOTS, bub, fn, go, hold, run, stepToward } from './steps.js';
import { hourOf, now } from './time.js';
import { RM, clamp, lerp, rnd } from './util.js';
import { caption, cat, mouse, say, world } from './world.js';

// 쳇바퀴 그림 안의 자리 (그림 폭·높이에 대한 비율). 그림을 바꾸면 여기만 다시 잰다
const G = { center: [0.5009, 0.472], rIn: [0.381, 0.367], rBand: [0.433, 0.421], track: 0.839 };
const WIDTH = 300, HOME_X = 210, FLOOR_Y = 708; // 방에서 폭, 세워 두는 곳, 바닥 깊이
const OUT = -WIDTH / 2 - 30, IN_X = 1200 + WIDTH / 2 + 20; // 나가는 곳(왼쪽 화면 밖), 들어오는 곳(오른쪽 화면 밖)
const RING = WIDTH * 0.39; // 고양이 머리 높이에서 바퀴 테두리까지 (바퀴 가운데로부터)
const GAP = 4 * 3600e3; // 방 시각으로 4시간에 한 번까지
/* 상태: null | 'push'(밀려 들어오는 중) | 'stand'(세워 둠) | 'leave'(혼자 나가는 중) */
const W = { state: null, x: OUT, spin: 0, leaveT: 0, rider: null };
let lastWheel = -1e18, spotAdded = false;
export const wheelState = () => W; // 점검용

/* ───── 좌표 ───── */
const H = () => {
  const m = ROOM.wheel_back;
  return m ? WIDTH * m[1] / m[0] : WIDTH;
};
const at = (fx, fy) => [W.x - WIDTH / 2 + fx * WIDTH, FLOOR_Y - H() + fy * H()];
export const wheelLift = () => H() * (1 - G.track); // 바퀴 안 바닥이 방바닥보다 높은 만큼
// 밀기 그림의 머리 끝 (방 좌표, 고양이 발에서 앞쪽으로)
function headReach() {
  const m = FRAMES.cat_push_1;
  return m ? (m[2] - 6) * FSC * DEPTH(FLOOR_Y) : 150;
}

/* ───── 들어가 있는 자리 (steps.js SPOTS): 다른 행동이 시작되면 바퀴 오른쪽 바닥으로 내려놓는다 ───── */
function addSpot() {
  if (spotAdded)
    return;
  spotAdded = true;
  SPOTS.push({ id: 'wheel', on: a => a.inWheel, exit(a) {
      a.inWheel = false;
      a.x = W.x + WIDTH * 0.5 + 20;
      a.y = FLOOR_Y + 4;
      if (a.kind === 'cat') {
        a.dp = a.pose = 'stand';
        a.tr = null;
        leaveSoon(1.5);
      }
    } });
}
function leaveSoon(sec) {
  if (W.state === 'stand' || W.state === 'push') {
    W.state = 'stand';
    W.leaveT = sec;
  }
}

/* ───── 강고양이 씨 ───── */
export function wheelOk(d) {
  const h = hourOf(d);
  return !W.state && !world.manduk && h >= 9 && h < 20 && d.getTime() - lastWheel > GAP;
}
// 화면 밖으로 걸어 나가기 (go는 방 안으로만 다니므로 따로)
const walkOff = () => ({ init(a) {
    a.closed = false;
  }, tick(a, dt) {
    if (a.tr || a.dp !== 'stand') {
      a.pose = 'stand';
      a.moving = false;
      return false;
    }
    if (stepToward(a, IN_X + 160, 708, 70, dt)) {
      a.moving = false;
      return true;
    }
    return false;
  } });
// 쳇바퀴를 머리로 밀며 들어오기
const pushIn = () => {
  const p = play('push', 99);
  return { init(a) {
      W.state = 'push';
      W.x = IN_X;
      a.face = -1;
      a.y = FLOOR_Y - 2;
      a.x = W.x + RING + headReach();
      p.init(a);
    }, tick(a, dt) {
      p.tick(a, dt);
      if (!a.act || a.act.t < 0)
        return false;
      W.x = Math.max(HOME_X, W.x - dt * 85);
      W.spin -= dt * 85 / (WIDTH * 0.45);
      a.x = W.x + RING + headReach(); // 머리가 바퀴 테두리에 닿게
      if (Math.random() < dt * 1.5)
        Snd.thump(0.12, 180);
      if (W.x <= HOME_X) {
        a.act = null;
        W.state = 'stand';
        return true;
      }
      return false;
    } };
};
// 폴짝: 바닥 ↔ 바퀴 안 (레이저 덮치기의 공중 그림을 빌려 쓴다)
const hop = into => {
  let x0, x1, t = 0;
  const D = 0.5;
  return { init(a) {
      x0 = a.x;
      x1 = into ? W.x : W.x + WIDTH * 0.5 + 20;
      a.face = x1 >= x0 ? 1 : -1;
      a.dp = a.pose = 'stand';
      a.tr = null;
      a.inWheel = false;
      a.hop = 0.001;
    }, tick(a, dt) {
      t += dt;
      const k = Math.min(1, t / D), base = into ? wheelLift() * k : wheelLift() * (1 - k);
      a.x = lerp(x0, x1, k);
      a.hop = base + Math.sin(Math.PI * k) * 40;
      a.hopF = k < 0.85 ? 'pounce_1' : 'stand';
      if (k >= 1) {
        a.hop = 0;
        a.hopF = null;
        a.inWheel = into;
        a.x = x1;
        Snd.thump(0.3, 300);
        return true;
      }
      return false;
    } };
};
// 바퀴 안에서 제자리걸음·달리기. 바퀴가 그 속도로 돈다
const spinRun = (sec, sp) => {
  let t = 0;
  return { init(a) {
      a.face = 1;
      a.pose = a.dp = 'stand';
    }, tick(a, dt) {
      t += dt;
      a.moving = true;
      a.fast = sp >= 140;
      a.walkPh += dt * sp * 0.075;
      W.spin -= dt * sp / (WIDTH * G.rIn[0]);
      if (t >= sec) {
        a.moving = false;
        return true;
      }
      return false;
    } };
};
export function wheelB() {
  addSpot();
  lastWheel = now().getTime();
  run(cat, [
    walkOff(),
    hold(rnd(1.5, 3), 'stand'), // 화면 밖에서 잠깐 (뭔가 가지러 갔다)
    pushIn(),
    hold(0.6, 'stand', false, -1),
    go(HOME_X + WIDTH * 0.62, FLOOR_Y - 2, 60), // 바퀴 오른쪽 옆으로 한 걸음 물러서서
    hold(0.5, 'stand', false, -1),
    bub('😤', 2),
    hop(true),
    spinRun(rnd(3, 5), 60),
    fn(() => caption(tr('capWheel'), 3)),
    spinRun(rnd(10, 20), 230),
    spinRun(rnd(2, 3), 60),
    hop(false),
    fn(a => {
      say(a, '😼', 3);
      leaveSoon(rnd(3, 5)); // 돌아서 걸어가는 사이 혼자 나간다
    }),
    go(rnd(480, 720), rnd(660, 720), 60),
    hold(rnd(15, 30), 'loaf')
  ], 'wheel');
}

/* ───── 쥐야쥐: 쳇바퀴가 떠나기 직전 올라타 열심히 달리는데 거의 안 돈다. 그대로 실려 나간다 ───── */
function mouseRide() {
  if (mouse.hidden || mouse.peek || mouse.state || world.manduk || Math.random() > 0.5)
    return false;
  mouse.state = 'wheel';
  run(mouse, [
    go(W.x + WIDTH * 0.5 + 10, FLOOR_Y + 4, 150),
    fn(a => {
      a.inWheel = true;
      a.x = W.x;
      a.y = FLOOR_Y + 1;
      a.face = 1;
      W.rider = a;
      say(a, '💪', 2);
    }),
    { init() { }, tick: (a, dt) => { // 열심히 달린다 (바퀴는 거의 안 돈다)
        a.moving = true;
        a.walkPh += dt * 230 * 0.075;
        a.x = W.x;
        W.spin -= dt * 0.08;
        return !W.state;
      } },
    fn(a => { // 화면 밖으로 실려 나갔다 → 쥐구멍으로
      a.inWheel = false;
      a.moving = false;
      a.hidden = true;
      a.state = '';
      a.where = 'hole';
      W.rider = null;
    })
  ], 'wheel');
  return true;
}

/* ───── 매 장면 (main.js) ───── */
export function wheelTick(dt) {
  if (!W.state)
    return;
  addSpot();
  if (world.manduk && W.state === 'stand' && !cat.inWheel)
    leaveSoon(0.5);
  if (W.state === 'push' && cat.tag !== 'wheel') // 밀고 들어오다 끊겼다
    leaveSoon(1);
  if (W.state === 'stand' && W.leaveT > 0 && (W.leaveT -= dt) <= 0) {
    if (cat.inWheel)
      W.leaveT = 1;
    else {
      W.state = 'leave';
      mouseRide();
    }
  }
  if (W.state === 'leave') {
    const sp = W.rider && W.leaveT > -1.5 ? 0 : 70; // 쥐야쥐가 올라타면 잠깐 기다렸다가
    W.leaveT -= dt;
    W.x -= dt * sp;
    W.spin += dt * sp / (WIDTH * 0.45);
    if (W.x < OUT - 10) {
      W.state = null;
      W.x = OUT;
    }
  }
}
export function wheelReset() { // 시간 점프 (jump.js)
  W.state = null;
  if (cat.inWheel)
    cat.inWheel = false;
  if (mouse.inWheel)
    mouse.inWheel = false;
  W.rider = null;
}

/* ───── 그리기 ───── */
export function wheelLayers() {
  return W.state ? [[FLOOR_Y, drawWheel]] : [];
}
function drawWheel() {
  const h = H(), bob = (W.state === 'push' || W.state === 'leave') && !RM ? Math.abs(Math.sin(W.spin * 3)) * 1.5 : 0;
  ctx.save();
  ctx.translate(0, -bob);
  // 그림자
  ctx.beginPath();
  ctx.ellipse(W.x, FLOOR_Y + 2, WIDTH * 0.42, 9, 0, 0, 7);
  ctx.fillStyle = 'rgba(50,30,15,.18)';
  ctx.fill();
  drawImg('wheel_back');
  // 디딤판 줄무늬: 안쪽 띠를 따라 돈다
  const [cx, cy] = at(G.center[0], G.center[1]), rx0 = G.rIn[0] * WIDTH, ry0 = G.rIn[1] * h, rx1 = G.rBand[0] * WIDTH, ry1 = G.rBand[1] * h;
  ctx.strokeStyle = 'rgba(90,70,55,.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 28; i++) {
    const q = W.spin + i * Math.PI * 2 / 28, c = Math.cos(q), s = Math.sin(q);
    ctx.moveTo(cx + c * (rx0 + 2), cy + s * (ry0 + 2));
    ctx.lineTo(cx + c * (rx1 - 3), cy + s * (ry1 - 3));
  }
  ctx.stroke();
  ctx.restore();
  // 바퀴 안의 배우들
  if (mouse.inWheel)
    drawActor(mouse);
  if (cat.inWheel || cat.hop)
    drawActor(cat);
  ctx.save();
  ctx.translate(0, -bob);
  drawImg('wheel_front');
  ctx.restore();
}
function drawImg(k) {
  const im = img(k);
  if (!imageReady(im))
    return;
  ctx.drawImage(im, W.x - WIDTH / 2, FLOOR_Y - H(), WIDTH, H());
}
