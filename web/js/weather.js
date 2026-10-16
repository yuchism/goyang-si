/* 창밖 날씨와 하늘 (WINDOW_PLAN.md 6·7장): 건너편 창 불빛, 천둥번개, 무지개, 비행기.
   "언제"는 모두 time.js가 날짜 씨앗으로 정한다(aptLightsAt·thunderNow·flashSince·rainbowAt·planeSlots). 여기서는 그리기와 진행만 한다.
   사건 물건 넷을 events.js 목록에 싣는다 */
import { skyAt, skyRnd } from './win.js';
import { play } from './anim.js';
import { canStart, TRAFFIC } from './events.js';
import { occluded } from './glass.js';
import { tr } from './i18n.js';
import { timeJumped } from './jump.js';
import { mouseHide } from './mouse.js';
import { O, P, S, present } from './objects.js';
import { H, W, ctx } from './stage.js';
import { bub, fn, go, hold, run } from './steps.js';
import { aptLightsAt, boxToday, flashSince, isNight, nextAtHour, now, planeSlots, rainNow, rainbowAt, rainbowSide, setOverride, setSimMs, setWindowOverride, slotDue, thunderNow } from './time.js';
import { winFree } from './behave.js';
import { RM, clamp, hash, rnd } from './util.js';
import { after, caption, cat, mouse, say, world } from './world.js';

/* ───────── 건너편 창 불빛 (6장) ─────────
   r/apt_windows.json(tools/map_windows.py가 밤 그림에서 찾은 창 사각형)의 창마다 켜짐·꺼짐을 그림 위에 덮어 그린다.
   밤 그림과 같은 밤 비율로. 낮에는 그리지 않는다 */
let WIN = null, winLoad = false;
// 처음 시작할 때 다른 표(objects.json·meta.json)와 같이 읽는다 (main.js). 실패하면 그릴 때 다시 시도
export function loadWindows() {
  if (WIN || winLoad)
    return Promise.resolve();
  winLoad = true;
  return fetch('r/apt_windows.json').then(r => r.json()).then(j => {
    WIN = j;
  }).catch(() => {
    winLoad = false;
  });
}
function drawLights(w, g) {
  if (g.night <= 0.02)
    return;
  loadWindows();
  if (!WIN)
    return;
  const st = aptLightsAt(g.d, WIN.windows.length);
  if (!st)
    return; // 아침·낮
  const sx = g.aw / WIN.size[0], sy = g.ah / WIN.size[1];
  const [lr, lg, lb] = WIN.lit, [dr, dg, db] = WIN.dark;
  ctx.save();
  ctx.globalAlpha = g.night;
  WIN.windows.forEach(([x, y, ww, hh, was], i) => {
    const rx = g.ax + x * sx, ry = g.ay + y * sy, rw = ww * sx, rh = hh * sy;
    if (rx + rw < w.x || rx > w.x + w.w)
      return; // 안 보이는 창
    const s = st[i], grow = was ? 1.6 : 0.6; // 원래 켜져 있던 창은 번진 빛까지 덮는다
    if (s === 0) {
      ctx.fillStyle = `rgb(${dr},${dg},${db})`;
      ctx.fillRect(rx - grow, ry - grow, rw + grow * 2, rh + grow * 2);
      return;
    }
    let c = `rgb(${lr},${lg},${lb})`;
    if (s === 2) { // TV처럼 푸르스름하게 깜빡임
      const k = RM ? 0.8 : 0.65 + 0.35 * hash('tvw' + i + Math.floor(world.t * 2.2));
      c = `rgb(${Math.round(120 * k)},${Math.round(160 * k)},${Math.round(225 * k)})`;
    }
    ctx.fillStyle = c;
    ctx.fillRect(rx - 0.4, ry - 0.4, rw + 0.8, rh + 0.8);
    ctx.globalAlpha = g.night * 0.22; // 둘레로 번지는 빛
    ctx.fillRect(rx - 1.6, ry - 1.6, rw + 3.2, rh + 3.2);
    ctx.globalAlpha = g.night;
  });
  ctx.restore();
}
export const lightsEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'lights',
  cls: 'bg',
  apt: drawLights,
  dev: [{ btn: 'dLights', go: lightsPreview }],
};
// 미리보기: 창 불빛 시각을 차례로 (해 진 뒤 → 저녁 → 22시 → 자정 → 새벽 2시 → 동틀 녘)
const LIGHT_HOURS = [19.5, 21, 22.5, 0, 2, 5.5];
let lightIdx = -1;
function lightsPreview() {
  lightIdx = (lightIdx + 1) % LIGHT_HOURS.length;
  const prev = now();
  setSimMs(nextAtHour(prev, LIGHT_HOURS[lightIdx]));
  timeJumped(prev, now(), false);
}

/* ───────── 천둥번개 (7-1) ─────────
   번쩍임 시각은 time.js(flashSince). 깜빡임 안전장치: 실제 시간 2초에 한 번까지, 지난 장면 뒤 지나간 번쩍임은 하나만, 시간 점프 직후엔 몰아 터뜨리지 않음.
   창밖 하늘이 하얗게(skyBack: 아파트 마스크 뒤라 건물이 실루엣으로 뜬다, 비 덮개는 outside.js가 world.flash만큼 걷어 낸다)
   → 방 전체에 아주 짧고 약한 흰 빛(shadow: 어둠 뒤). world.flash(0~1)는 TV 지직(tv.js)도 본다 */
const TH = { last: null, lastReal: -1e9, f: null, react: -1e9 };
const FLASH_GAP = 2; // 실제 초
function flashLevel(f) { // 0.1~0.2초 번쩍, 큰 번개는 한 번 더
  const t = f.t;
  let v = t < 0.11 ? 1 : t < 0.19 ? 0.3 : (f.big && t < 0.29) ? 0.8 : Math.max(0, 0.3 * (1 - (t - (f.big ? 0.29 : 0.19)) / 0.25));
  return v * (RM ? 0.25 : 1); // 움직임 줄이기: 아주 약하게
}
function startFlash(big) {
  TH.lastReal = world.t;
  TH.f = { t: 0, big };
  after(() => caption(tr('capThunder'), 3), rnd(2, 6));
  thunderReact(big);
}
function thunderTick(d, real) {
  if (TH.f) {
    TH.f.t += real;
    world.flash = flashLevel(TH.f);
    if (TH.f.t > 0.6) {
      TH.f = null;
      world.flash = 0;
    }
  }
  const t = d.getTime();
  if (TH.last == null || !thunderNow(d)) {
    TH.last = t;
    return;
  }
  const f = flashSince(TH.last, d);
  TH.last = t;
  if (f && world.t - TH.lastReal >= FLASH_GAP)
    startFlash(f.big);
}
// 강고양이 씨: 깨어 있으면 깜짝 → 상자 있는 날은 상자로, 없으면 식빵 자세로 납작. 자고 있으면 큰 번개에만 귀 쫑긋. 쥐야쥐는 숨는다
function thunderReact(big) {
  if (!mouse.hidden && !mouse.peek)
    mouseHide(true);
  if (world.manduk || cat.inBox || cat.dance)
    return;
  if (cat.closed) {
    if (big && cat.dp === 'loaf' && !cat.act && !cat.moving)
      cat.react = { f: 'tv_ear_turn', t: 1.5 };
    return;
  }
  if (world.t - TH.react < 90 || !winFree(cat))
    return; // 번쩍일 때마다 놀라지는 않는다 (실제 1분 반에 한 번)
  TH.react = world.t;
  const e = S('box.enter'), i = S('box.inside'), box = boxToday(now()) && present(O.box) && e && i;
  run(cat, [
    play('startle'),
    bub('‼️', 1.6),
    ...(box ? [
      go(e[0], e[1], 120),
      hold(0.4, 'stand', false, -1),
      fn(a => {
        a.inBox = true;
        a.x = i[0];
        a.y = i[1];
      }),
      play('box', rnd(40, 90)),
      fn(a => {
        a.inBox = false;
        a.x = e[0];
        a.y = e[1] + 6;
      }),
    ] : [hold(rnd(20, 40), 'loaf')]),
  ], 'thunder');
}
function drawFlashSky(w) {
  const f = world.flash || 0;
  if (f <= 0)
    return false;
  ctx.fillStyle = `rgba(236,240,255,${0.85 * f})`;
  ctx.fillRect(w.x, w.y, w.w, w.h);
  return true;
}
function drawFlashRoom() {
  const f = world.flash || 0;
  if (f <= 0)
    return;
  ctx.fillStyle = `rgba(235,240,255,${0.16 * f})`;
  ctx.fillRect(-W, 0, W * 3, H);
}
export const thunderEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'thunder',
  cls: 'weather',
  tick: (d, real) => thunderTick(d, real),
  skyBack: drawFlashSky,
  shadow: drawFlashRoom,
  reset() {
    TH.last = null; // 점프 이후 시각부터 센다
    TH.f = null;
    world.flash = 0;
  },
  dev: [{ btn: 'dThunder', go: () => {
      const on = !thunderNow(now());
      setOverride('rain', on ? true : null);
      setWindowOverride('thunder', on ? true : null);
      caption(tr(on ? 'devThunderOn' : 'devThunderOff'), 2.5);
      if (on)
        startFlash(true);
    } }],
  debug: { startFlash },
};

/* ───────── 무지개 (7-2) ─────────
   밝기는 시각의 함수(time.js rainbowAt). 해 반대쪽 하늘에 일곱 색 반투명 호. skyBack 자리라 건너편 아파트 뒤로 들어간다 */
const RAINBOW = ['255,90,80', '255,160,70', '255,225,90', '120,210,110', '90,170,235', '90,110,220', '160,100,210'];
function drawRainbow(w) {
  const d = now(), a = rainbowAt(d);
  if (a <= 0)
    return false;
  const side = rainbowSide(d), cx = w.x + w.w * (0.5 + 0.28 * side), cy = w.y + w.h + 60, R = 330, bw = 7;
  ctx.save();
  ctx.lineWidth = bw + 0.6;
  RAINBOW.forEach((c, i) => {
    ctx.strokeStyle = `rgba(${c},${0.32 * a})`;
    ctx.beginPath();
    ctx.arc(cx, cy, R - i * bw, Math.PI, 2 * Math.PI);
    ctx.stroke();
  });
  ctx.restore();
  return true;
}
let rainbowSeen = null;
function rainbowTick(d) {
  const a = rainbowAt(d);
  if (a < 0.6 || rainbowSeen === Math.floor(d.getTime() / 3600000))
    return;
  // 창가에서 구경 중이면 가끔 올려다본다 (무지개 한 번에 한 번)
  if (cat.tag === 'window' && !cat.closed && Math.random() < 0.01) {
    rainbowSeen = Math.floor(d.getTime() / 3600000);
    run(cat, [play('lookup', 4), bub('✨', 3), play('window', rnd(10, 20)), hold(rnd(6, 12), 'loaf', false, -1)], 'window');
  }
}
export const rainbowEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'rainbow',
  cls: 'weather',
  tick: d => rainbowTick(d),
  skyBack: drawRainbow,
  dev: [{ btn: 'dRainbow', go: () => {
      setOverride('rain', false);
      setWindowOverride('rainbow', now().getTime() - 4.5 * 60000); // 거의 다 나타난 무지개부터
    } }],
};

/* ───────── 비행기 (7-3) ─────────
   하루 2~4번, 시각은 time.js planeSlots. 낮: 아주 작은 비행기가 하늘 높이 천천히 지나가고 비행기구름이 남아 퍼지며 사라진다.
   밤: 어둠 속에 은은한 비행기 모습과 빨간 불빛(늘 켜짐)·흰 불빛(짧게 번쩍)이 지나간다(불빛은 어둠 뒤에 그리고 가려지면 안 그림). 비 오는 날 낮에는 없다(구름 위). 하늘의 큰 것 */
const planeDone = new Set();
const PLANE = 2.2; // 비행기 크기 (처음 코드 그림 몸 길이 약 11px → 약 24px, 2026-10-16: 너무 작아서)
function startPlane(night, slot = null, late = 0) {
  if (world.plane)
    return;
  world.plane = { id: slot ? slot.id : 'dev' + world.t, t: late, dur: slot ? slot.dur : rnd(45, 65), dir: slot ? slot.dir : (Math.random() < 0.5 ? 1 : -1), y: slot ? skyAt('plane', slot.yk) : skyRnd('planeDev'), night, trail: [], seen: false };
}
const planeX = (w, p, t) => {
  const k = t / p.dur;
  return p.dir > 0 ? w.x - 30 + k * (w.w + 60) : w.x + w.w + 30 - k * (w.w + 60);
};
function planeTick(d, real) {
  const p = world.plane;
  if (p) {
    p.t += real;
    if (!p.seen && p.t > 6 && cat.tag === 'window' && !cat.closed) { // 창가에 있으면 고개만 따라간다
      p.seen = true;
      say(cat, '👀', 3);
    }
    if (p.t >= p.dur + (p.night ? 0 : 90)) // 낮에는 비행기구름이 사라질 때까지
      world.plane = null;
    return;
  }
  const due = slotDue(planeSlots(d), d, TRAFFIC.wait.plane);
  if (!due || planeDone.has(due.slot.id))
    return;
  const night = isNight(d);
  if (rainNow(d) && !night) {
    planeDone.add(due.slot.id); // 비 오는 날 낮에는 구름 위
    return;
  }
  if (!canStart('sky'))
    return;
  planeDone.add(due.slot.id);
  startPlane(night, due.slot, world.winResume !== false && due.late < due.slot.dur ? due.late : 0); // 새로 고침·점프 직후면 지나가던 자리에서 이어서
}
function drawPlaneSky(w) {
  const p = world.plane;
  if (!p)
    return;
  const t = Math.min(p.t, p.dur), x = planeX(w, p, t), y = p.y - (t / p.dur) * 6;
  // 비행기구름: 지나온 길. 오래된 부분일수록 넓게 퍼지고 옅어진다
  ctx.save();
  ctx.lineCap = 'round';
  const N = p.night ? 0 : 24; // 밤에는 비행기구름이 보이지 않는다
  for (let i = 0; i < N; i++) {
    const s0 = i / N, s1 = (i + 1) / N, ta = t * s0, tb = t * s1, age = p.t - (ta + tb) / 2;
    const al = clamp(0.5 * (1 - age / 80), 0, 0.5) * clamp(age / 1.5, 0, 1);
    if (al <= 0.01)
      continue;
    ctx.strokeStyle = `rgba(255,255,255,${al})`;
    ctx.lineWidth = (1.2 + age * 0.12) * PLANE * 0.7;
    ctx.beginPath();
    ctx.moveTo(planeX(w, p, ta) - p.dir * 6 * PLANE, p.y - (ta / p.dur) * 6);
    ctx.lineTo(planeX(w, p, tb) - p.dir * 6 * PLANE, p.y - (tb / p.dur) * 6);
    ctx.stroke();
  }
  if (p.t < p.dur) { // 작은 은색 비행기 (몸통·날개·꼬리날개). 밤에는 어둠에 덮여도 보이게 달빛 받은 밝은 회색으로 (불빛은 어둠 뒤 drawPlaneNight)
    ctx.translate(x, y);
    ctx.scale(p.dir * PLANE, PLANE);
    ctx.fillStyle = p.night ? 'rgba(205,212,232,.9)' : 'rgba(245,247,252,.95)';
    ctx.strokeStyle = p.night ? 'rgba(60,66,90,.7)' : 'rgba(90,100,120,.6)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5, 1.1, 0, 0, 7);
    ctx.moveTo(1, 0);
    ctx.lineTo(-2, 3);
    ctx.lineTo(-3, 3);
    ctx.lineTo(-1.5, 0);
    ctx.moveTo(-4, 0);
    ctx.lineTo(-5.5, -2.4);
    ctx.lineTo(-6, -2.4);
    ctx.lineTo(-5.5, 0);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
// 밤: 어둠 뒤에 불빛 두 점. 창틀·커튼·방 안 물건·캐릭터에 가려지면 그 점은 그리지 않는다 (glass.js)
function drawPlaneNight() {
  const p = world.plane;
  if (!p || !p.night || p.t >= p.dur)
    return;
  const w = P.window, x = planeX(w, p, p.t), y = p.y - (p.t / p.dur) * 6;
  // 빨간 등은 늘 켜져 있고(항법등, 살짝 숨 쉬듯), 흰 등은 짧게 번쩍 (밤에 비행기가 아예 안 보이는 순간이 없게)
  const lights = [[x - p.dir * 3 * PLANE, y, '255,70,60', true, RM ? 0.9 : 0.75 + 0.25 * Math.sin(world.t * 4)], [x + p.dir * 3 * PLANE, y - 0.5, '255,255,255', (world.t * 1.6) % 1 < 0.18, 1]];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [lx, ly, c, on, k] of lights) {
    if (!on && !RM || occluded(lx, ly))
      continue;
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 5);
    g.addColorStop(0, `rgba(${c},${0.95 * k})`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(lx - 5, ly - 5, 10, 10);
  }
  ctx.restore();
}
export const planeEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'plane',
  cls: 'sky',
  active: () => !!world.plane && world.plane.t < world.plane.dur, // 비행기구름만 남았으면 하늘은 비었다
  tick: (d, real) => planeTick(d, real),
  sky: drawPlaneSky,
  shadow: drawPlaneNight,
  reset() {
    world.plane = null;
    planeDone.clear();
  },
  dev: [{ btn: 'dPlane', go: () => {
      world.plane = null;
      startPlane(isNight(now()));
    } }],
  debug: { startPlane },
};
