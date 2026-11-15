/* 어항 크게 보기 — 금붕생이네 집 (FISHBOWL_VIEW_PLAN.md, 그림 assets/briefs/FISHBOWL_VIEW_SPRITE_PLAN.md, tasks/fishbowl-view-1.md)
   어항을 누르면 둥근 어항 속이 화면 가득 펼쳐진다. 금붕생이는 한 마리 — 방 어항의 상태(fish.js F)를 읽어 크게 그릴 뿐, 낚시 흐름은 바꾸지 않는다.
   층(뒤 → 앞): 뒤판 → 유리 밖 강고양이 씨 비침(물 뒤로, 반투명·물빛·일렁임) → 물풀 → 살림·보물상자 → 바늘·줄 → 금붕생이·거품·붕어빵 → 앞판 → 어둠
   - 좌표는 크게 보기 그림 픽셀(1536×1536, 어항 원 가운데 768,768 · 지름 1480). 방 어항 물 타원 → 크게 보기 물 사각으로 옮긴다(toV)
   - 꾸밈(살림 앞에 머물기·밤에 조개 침대에서 쉬기)은 이 화면에서만 — 방의 금붕어 자리·모드는 그대로
   - 방은 뒤에서 계속 흐른다. 만득 씨가 와도 닫지 않는다. 그림(뒤판·앞판·헤엄)을 아직 못 받았으면 열지 않는다(누르면 지금처럼 뻐끔만)
   이 파일은 덩어리 밖 모듈만 가져온다(구조 검사). 방 쪽 도구는 main.js가 넣어 준다(initFishView) */
import { tr } from './i18n.js';
import { calDay, isNight, now } from './time.js';
import { RM, clamp, gcEvent, hash, lerp, rnd } from './util.js';
import { cat, world } from './world.js';

let D = null; // { O, ROOM, img, imageReady, fish } — fish: plays.js의 어항 놀이 물건 (debug.fishState)
const el = document.getElementById('fbv');

/* ───── 자리 (크게 보기 그림 픽셀). 그림을 바꾸면 여기만 다시 잰다 ───── */
const SZ = 1536;
const BOWL = { water: [0.5, 0.41, 0.36, 0.18], chest: [0.68, 0.56], hook: [0.4475, 0.44] }; // 방 어항 그림 안 자리 (fish.js BOWL과 같게)
const WATER = { x: 768, y: 790, rx: 330, ry: 330, top: 362, floor: 1232 }; // 방 물 타원 → 이 사각(가운데·반폭), 수면 아래 끝·자갈 윗면
const CLIP = { x: 768, y: 768, r: 712 }; // 어항 안쪽 원 (속 그림이 유리 밖으로 안 나가게)
const GY = 1240; // 살림 바닥선 (자갈 윗면에 살짝 묻힘)
const HOME_K = 0.666, CHEST_K = 1.057, FISH_K = 0.867, SLEEP_K = 0.75, BOONG_W = 150; // 그림 → 화면 배율 (침대 0.18·상자 0.2·금붕어 0.15 × 지름)
const PROPS = [ // 그리는 순서 = 앞뒤. [그림, 바닥 가운데 x, 바닥 y, 배율, 기준점(그림 픽셀)]
  ['home_sign', 450, GY + 2, HOME_K, [256, 461]],
  ['home_bed', 600, GY, HOME_K, [256, 461]],
  ['home_chair', 768, GY + 10, HOME_K, [256, 461]],
];
const CHEST = { x: 985, y: GY, mouth: [760, 1050] }; // 상자 바닥 가운데, 붕어빵을 꺼낼 때 금붕생이가 오는 자리
const BED = [600, GY - 70]; // 자는 금붕생이 (fish_sleep_1 배 아래 = 그림 256,318)
const SPOTS = [[450, 1100], [610, 1085], [768, 1120], [870, 1060]]; // 살림 앞에 머무는 자리
const WEEDS = [[392, 360, 0], [432, 300, 1.7], [1138, 330, 3.1], [1178, 260, 4.4]]; // 물풀 [x, 키, 위상]
const SWIM_MAX = 260; // 화면에 그리는 금붕생이가 따라가는 최대 속도(픽셀/초) — 상자 쪽 당김·살림 앞 머물기가 켜지고 꺼질 때 순간이동하지 않게
const REFLECT = { a: 0.55, tint: 'rgba(140,200,244,.38)', y: -30, wob: 8 }; // 비침: 불투명도·물빛·위치·일렁임 (사람 검수에서 조정)

/* ───── 상태 ───── */
// 처음 기다림은 main.js가 뽑는다 (rollFishView — 모듈 읽는 순서와 상관없게)
export const rollFishView = () => {
  S.visitT = rnd(12, 25);
  S.pawT = rnd(15, 30);
};
const S = { open: false, openAt: 0, t: 0, dx: null, dy: null, vx: 0, sleepK: 0, visit: null, visitT: 0, visitK: 0, ref: null, refK: 0, blinkT: 2, blink: 0, pawT: 0, paw: 0, zz: [] };
let cv = null, cx = null, side = 0;
const tinted = {}; // 비침 그림에 물빛을 입힌 캔버스 (그림마다 한 번)

export const initFishView = deps => {
  D = deps;
  if (!el)
    return;
  el.innerHTML = '<div class="fbvbox"><canvas></canvas><button class="x" type="button">×</button></div>';
  cv = el.querySelector('canvas');
  cx = cv.getContext('2d');
  label();
  el.addEventListener('click', e => {
    if (performance.now() - S.openAt < 450) // 손가락 탭으로 열면 뒤따르는 click이 방금 연 둘레에 떨어진다 — 그건 닫기가 아님
      return;
    if (e.target === el || e.target.closest('.x'))
      closeFishView();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && S.open)
      closeFishView();
  });
  window.addEventListener('langchange', label);
  window.addEventListener('resize', () => S.open && fit());
  const a = document.getElementById('aBowl'); // 화면 읽기 버튼
  if (a)
    a.onclick = () => openFishView();
};
function label() {
  el.setAttribute('aria-label', tr('fbvDlg'));
  el.querySelector('.x').setAttribute('aria-label', tr('fbvClose'));
}
const fishState = () => D && D.fish && D.fish.debug && D.fish.debug.fishState();
const im = k => D.img(k);
const ok = k => D.imageReady(im(k));
// 열 수 있나: 장면에 어항이 있고 뒤판·앞판·헤엄 그림을 받았을 때
export const fishViewReady = () => !!(D && el && D.O.fishbowl && D.ROOM.fishbowl_back && ['fbv_back', 'fbv_front', 'fbv_fish_swim_1'].every(ok));
export const fishViewOpen = () => S.open;

// 방에서 어항을 누름 (ui.js tapAt). 열었으면 true — 못 열면 놀이(fish.js press)가 지금처럼 뻐끔만.
// 크게 보기에서는 뻐끔(정면 뽀뽀 얼굴)을 하지 않는다 — 헤엄치던 금붕생이가 튀어 보여서 (주인 2026-11-16)
export function fishViewTap(x, y) {
  const b = fishViewReady() && bowlBox();
  if (!b || x < b.x0 || x > b.x0 + b.w || y < b.y0 || y > b.y0 + b.h)
    return false;
  show();
  return true;
}
export function openFishView() {
  if (!fishViewReady())
    return false;
  show();
  return true;
}
function show() {
  if (S.open)
    return;
  Object.assign(S, { open: true, openAt: performance.now(), t: 0, dx: null, dy: null, vx: 0, visit: null, lastVisit: null, visitK: 0, refK: 0, ref: null, zz: [] });
  const f = fishState();
  S.sleepK = f && sleepy(f.F) ? 1 : 0;
  el.hidden = false;
  fit();
  el.classList.toggle('grow', !RM);
  el.querySelector('.x').focus({ preventScroll: true });
  gcEvent('fishbowl-view', '어항 크게 보기');
}
export function closeFishView() {
  if (!S.open)
    return;
  S.open = false;
  el.hidden = true;
  el.classList.remove('grow');
}
function fit() {
  side = Math.floor(Math.min(680, innerWidth * 0.94, innerHeight * 0.88));
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = cv.height = Math.round(side * dpr);
  cv.style.width = cv.style.height = side + 'px';
}

/* ───── 방 어항 → 크게 보기 ───── */
function bowlBox() {
  const p = D.O.fishbowl && D.O.fishbowl.pos, m = D.ROOM.fishbowl_back;
  if (!p || !m)
    return null;
  const h = p.w * m[1] / m[0];
  return { x0: p.x - p.w / 2, y0: p.y - h, w: p.w, h };
}
const at = (b, fx, fy) => [b.x0 + fx * b.w, b.y0 + fy * b.h];
function toV(b, x, y) {
  const [cx0, cy0] = at(b, BOWL.water[0], BOWL.water[1]);
  return [WATER.x + (x - cx0) / (BOWL.water[2] * b.w) * WATER.rx, WATER.y + (y - cy0) / (BOWL.water[3] * b.h) * WATER.ry];
}
const kV = b => WATER.rx / (BOWL.water[2] * b.w); // 방 길이 → 크게 보기 길이
// 밤에 조개 침대에서 쉬어도 되나: 그냥 헤엄칠 때만 (낚시·인사·고양이와 마주 보기 중엔 깨어 있음)
const sleepy = F => isNight(now()) && F.mode === 'swim' && !F.rod && !F.help && cat.tag !== 'bowlwatch';

/* ───── 매 장면 (main.js) ───── */
export function fishViewTick(real) {
  if (!S.open || !D)
    return;
  const st = fishState(), b = bowlBox();
  if (!st || !b)
    return;
  S.t += real;
  S.dt = real;
  const F = st.F;
  // 밤 잠: 천천히 바뀐다
  S.sleepK = clamp(S.sleepK + (sleepy(F) ? 1 : -1) * real / 0.9, 0, 1);
  // 살림 앞에 머물기 (낮, 그냥 헤엄칠 때만)
  const free = F.mode === 'swim' && cat.tag !== 'bowlwatch' && S.sleepK < 0.01;
  if (S.visit) {
    S.visitK = clamp(S.visitK + real / 1.6, 0, 1);
    if ((S.visit.t -= real) <= 0 || !free)
      S.visit = null;
  }
  else {
    S.visitK = clamp(S.visitK - real / 1.6, 0, 1);
    if (free && (S.visitT -= real) <= 0) {
      S.visit = { p: SPOTS[Math.floor(Math.random() * SPOTS.length)], t: rnd(5, 9) };
      S.visitT = rnd(15, 30);
    }
  }
  catGlass(real, b);
  S.zz = S.zz.filter(z => (z.t += real) < 2.4);
  if (S.sleepK > 0.9 && Math.random() < real / 1.4)
    S.zz.push({ t: 0, x: BED[0] - 90 + rnd(-6, 6), y: BED[1] - 40, r: rnd(7, 12) });
  draw(st, b);
}
// 유리 밖 강고양이 씨: 어항 근처면 들여다보기(가끔 깜빡·앞발), 밤 어항 구경이면 코 대기, 낚시하며 졸면 눈 감음
function catGlass(real, b) {
  const near = !cat.closed && Math.hypot(cat.x - b.x0 - b.w / 2, cat.y - D.O.fishbowl.pos.y) < 260;
  let want = null;
  if (cat.tag === 'bowlwatch' && !cat.moving && near)
    want = 'cat_glass_nose';
  else if (near && !cat.moving) {
    const doze = cat.tag === 'fish' && cat.act && cat.act.c === 'fishdoze';
    if ((S.blinkT -= real) <= 0) {
      S.blink = 0.18;
      S.blinkT = rnd(2.5, 6);
    }
    S.blink = Math.max(0, S.blink - real);
    if (cat.tag !== 'fish' && (S.pawT -= real) <= 0) {
      S.paw = 2.6;
      S.pawT = rnd(20, 40);
    }
    S.paw = Math.max(0, S.paw - real);
    want = doze || S.blink > 0 ? 'cat_glass_blink' : S.paw > 0 ? 'cat_glass_paw' : 'cat_glass_look';
  }
  if (want && !ok(want))
    want = ok('cat_glass_look') ? 'cat_glass_look' : null;
  if (want)
    S.ref = want;
  S.refK = clamp(S.refK + (want ? 1 : -1) * real / 0.7, 0, 1);
}

/* ───── 그리기 ───── */
function draw(st, b) {
  const s = cv.width / SZ;
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.clearRect(0, 0, cv.width, cv.height);
  cx.setTransform(s, 0, 0, s, 0, 0);
  img('fbv_back', 0, 0, SZ);
  cx.save();
  cx.beginPath();
  cx.arc(CLIP.x, CLIP.y, CLIP.r, 0, 7);
  cx.clip();
  reflection();
  weeds();
  PROPS.forEach(([k, x, y, kk, a]) => prop(k, x, y, kk, a));
  prop(chestLook(st.F, b), CHEST.x, CHEST.y, CHEST_K, [256, 460]);
  line(st.F, b);
  fish(st.F, b);
  sleeper();
  bubbles(st.F, b);
  hooked(st, b);
  cx.restore();
  img('fbv_front', 0, 0, SZ);
  const dk = Math.min(0.85, world.dark || 0) * 0.6; // 방이 어두우면 어항 속도 (스탠드 불빛은 방 그리기 몫)
  if (dk > 0.01) {
    cx.save();
    cx.beginPath();
    cx.arc(CLIP.x, CLIP.y, CLIP.r + 30, 0, 7);
    cx.rect(470, 50, 600, 200);
    cx.fillStyle = `rgba(10,14,36,${dk.toFixed(3)})`;
    cx.fill('nonzero');
    cx.restore();
  }
}
function img(k, x, y, w) {
  const m = im(k);
  if (D.imageReady(m))
    cx.drawImage(m, x, y, w, w * m.height / m.width);
}
function prop(k, x, y, kk, a) {
  const m = im(k);
  if (!D.imageReady(m))
    return;
  cx.drawImage(m, x - a[0] * kk, y - a[1] * kk, m.width * kk, m.height * kk);
}
// 보물상자: 평소 닫힘, 정한 날(날짜 씨앗 — 저장하지 않음)은 살짝 열림, 붕어빵을 꺼낼 때 활짝
function chestLook(F, b) {
  const grab = F.mode === 'grab' || (F.mode === 'carry' && F.t < 0.8) || (F.mode === 'tochest' && nearChest(F, b) > 0.6);
  const k = grab ? 'chest_open' : hash('chest:' + calDay(now())) < 0.34 ? 'chest_peek' : 'chest_closed';
  return ok(k) ? k : 'chest_closed';
}
// 금붕생이가 방 어항의 상자 앞에 얼마나 가까운가 (0~1). 크게 보기에서는 상자 자리가 달라 그만큼 끌어당긴다
function nearChest(F, b) {
  if (!['tochest', 'grab', 'carry'].includes(F.mode))
    return 0;
  const [chx, chy] = at(b, BOWL.chest[0], BOWL.chest[1]);
  return clamp(1 - Math.hypot(F.x - (chx - 14), F.y - (chy - 4)) / 30, 0, 1);
}
function fishPos(F, b) {
  let [x, y] = toV(b, F.x, F.y);
  const nc = nearChest(F, b);
  if (nc > 0) {
    const [chx, chy] = at(b, BOWL.chest[0], BOWL.chest[1]), [mx, my] = toV(b, chx - 14, chy - 4);
    x += (CHEST.mouth[0] - mx) * nc;
    y += (CHEST.mouth[1] - my) * nc;
  }
  if (S.visitK > 0 && (S.visit || S.lastVisit)) {
    const p = (S.visit && S.visit.p) || S.lastVisit, e = S.visitK * S.visitK * (3 - 2 * S.visitK);
    x = lerp(x, p[0], e);
    y = lerp(y, p[1], e);
  }
  if (S.visit)
    S.lastVisit = S.visit.p;
  return [x, y];
}
function frameOf(F) {
  switch (F.mode) {
    case 'sigh':
      return 'fbv_fish_sigh_1';
    case 'carry':
      return F.hookItem || F.help === 'weed' ? 'fbv_fish_swim_1' : 'fbv_fish_carry_1';
    case 'hello':
      return 'fbv_fish_hello_1';
    default: {
      const fast = F.mode === 'tug' || F.mode === 'tohook' || F.mode === 'tochest';
      return Math.floor(F.ph * (fast ? 6 : 3.3)) % 2 ? 'fbv_fish_swim_2' : 'fbv_fish_swim_1';
    }
  }
}
function fish(F, b) {
  const a = 1 - S.sleepK;
  if (a <= 0.01)
    return;
  let k = frameOf(F);
  if (!ok(k))
    k = 'fbv_fish_swim_1';
  const m = im(k), [x, y] = follow(fishPos(F, b)), bob = RM ? 0 : Math.sin(F.ph * 2.2) * 8;
  const face = Math.abs(S.vx) > 40 && S.lag > 4 ? Math.sign(S.vx) : F.face; // 따라잡는 중이면 가는 쪽을 본다
  const w = m.width * FISH_K, h = m.height * FISH_K;
  cx.save();
  cx.globalAlpha = a;
  cx.translate(x, y + bob);
  if (face > 0 && k !== 'fbv_fish_hello_1')
    cx.scale(-1, 1);
  cx.drawImage(m, -w / 2, -h / 2, w, h);
  cx.restore();
  if (F.mode === 'carry' && F.help === 'weed')
    weed(x + face * w * 0.45, y + bob, 2.6);
}
// 그리는 자리가 목표(방 자리 + 꾸밈)를 최대 속도로 따라간다
function follow([tx, ty]) {
  const real = S.dt || 0;
  if (S.dx == null || RM && S.lag > 200) {
    [S.dx, S.dy] = [tx, ty];
    S.lag = 0;
    return [tx, ty];
  }
  const ex = tx - S.dx, ey = ty - S.dy, d = Math.hypot(ex, ey), st = Math.min(d, SWIM_MAX * real);
  const ox = S.dx;
  if (d > 0.01) {
    S.dx += ex / d * st;
    S.dy += ey / d * st;
  }
  S.vx = real > 0 ? (S.dx - ox) / real : 0;
  S.lag = d - st;
  S.fx = S.dx;
  S.fy = S.dy; // 점검용 (fishViewDebug)
  return [S.dx, S.dy];
}
// 조개 침대에서 쉬는 금붕생이와 작은 거품
function sleeper() {
  if (S.sleepK <= 0.01 || !ok('fish_sleep_1'))
    return;
  cx.save();
  cx.globalAlpha = S.sleepK;
  prop('fish_sleep_1', BED[0], BED[1] + (RM ? 0 : Math.sin(S.t * 0.8) * 3), SLEEP_K, [256, 318]);
  cx.restore();
  S.zz.forEach(z => ring(z.x + Math.sin(z.t * 3) * 6, z.y - z.t * 70, z.r, Math.min(1, (2.4 - z.t) * 1.5) * S.sleepK));
}
function ring(x, y, r, a) {
  cx.save();
  cx.globalAlpha = Math.max(0, a) * 0.85;
  cx.strokeStyle = '#ffffff';
  cx.lineWidth = 4;
  cx.beginPath();
  cx.arc(x, y, r, 0, 7);
  cx.stroke();
  cx.restore();
}
function bubbles(F, b) {
  const k = kV(b);
  F.bubbles.forEach(q => {
    if (q.t < 0)
      return;
    const [x, y] = toV(b, q.x, q.y);
    if (y > WATER.top)
      ring(x, y, q.r * k * 0.8, Math.min(1, (q.life - q.t) * 2));
  });
}
// 낚싯줄과 바늘: 위에서 내려온다 (고양이 낚싯대 끝은 화면 밖)
function hookAt(F, b) {
  const [hx, hy] = toV(b, ...at(b, BOWL.hook[0], BOWL.hook[1])), tug = F.mode === 'tug' && !RM;
  return [hx + (tug ? Math.sin(F.t * 23) * 10 : 0), lerp(-20, hy, F.line) + (tug ? Math.sin(F.t * 30) * 16 : 0)];
}
function line(F, b) {
  if (!F.rod)
    return;
  const [x, y] = hookAt(F, b);
  cx.save();
  cx.strokeStyle = 'rgba(250,250,245,.9)';
  cx.lineWidth = 4;
  cx.beginPath();
  cx.moveTo(x, -20);
  cx.lineTo(x, y);
  cx.stroke();
  cx.strokeStyle = '#8a8f99';
  cx.lineWidth = 7;
  cx.lineCap = 'round';
  cx.beginPath();
  cx.arc(x + 9, y + 18, 13, Math.PI * 0.1, Math.PI * 1.1);
  cx.stroke();
  cx.restore();
  if (F.hookItem === 'boong')
    boongAt(x + 8, y + 62, Math.sin(F.ph * 2) * 0.2 + 1.3);
  else if (F.hookItem === 'weed')
    weed(x + 9, y + 28, 2.6);
}
// 낚아챈 붕어빵이 위로 올라가는 동안 (방 붕어빵 자리를 따라)
function hooked(st, b) {
  const B = st.boong;
  if (!B || B.state !== 'up')
    return;
  const [x, y] = toV(b, B.x, B.y);
  if (y < -100)
    return;
  cx.save();
  cx.strokeStyle = 'rgba(250,250,245,.9)';
  cx.lineWidth = 4;
  cx.beginPath();
  cx.moveTo(x, -20);
  cx.lineTo(x, y - 40);
  cx.stroke();
  cx.restore();
  boongAt(x, y, B.rot);
}
function boongAt(x, y, rot) {
  const m = ok('fbv_boong') ? im('fbv_boong') : im('boong');
  if (!D.imageReady(m))
    return;
  const h = BOONG_W * m.height / m.width;
  cx.save();
  cx.translate(x, y);
  cx.rotate(rot);
  cx.drawImage(m, -BOONG_W / 2, -h / 2, BOONG_W, h);
  cx.restore();
}
function weed(x, y, k) {
  cx.save();
  cx.strokeStyle = '#4f8a3c';
  cx.lineWidth = 2 * k;
  cx.lineCap = 'round';
  cx.beginPath();
  cx.moveTo(x, y);
  for (let i = 1; i <= 4; i++)
    cx.lineTo(x + (i % 2 ? 3 : -3) * k, y + i * 3.5 * k);
  cx.stroke();
  cx.restore();
}
// 물풀: 자갈에서 올라와 살랑 — 끝이 가늘어지는 띠(외곽선 + 초록), 동작 줄이기면 가만히
function weeds() {
  WEEDS.forEach(([x, hgt, ph]) => {
    const sw = RM ? 0 : Math.sin(S.t * 0.9 + ph) * 0.12, L = [], R = [];
    for (let i = 0; i <= 10; i++) {
      const k = i / 10, px = x + Math.sin(k * 5 + ph) * 16 + sw * hgt * k * k, py = GY - hgt * k, w = (1 - k) * 15 + 4;
      const dx = Math.cos(k * 5 + ph) * 16 * 5 / hgt + sw * 2 * k, n = Math.hypot(1, dx);
      L.push([px - w / n, py - w * dx / n]);
      R.unshift([px + w / n, py + w * dx / n]);
    }
    cx.beginPath();
    [...L, ...R].forEach(([px, py], i) => (i ? cx.lineTo(px, py) : cx.moveTo(px, py)));
    cx.closePath();
    cx.fillStyle = '#5f9a46';
    cx.strokeStyle = '#2b2118';
    cx.lineWidth = 6;
    cx.lineJoin = 'round';
    cx.fill();
    cx.stroke();
  });
}
// 유리 밖 강고양이 씨: 물 뒤로 반투명, 물빛을 입히고 가로 띠마다 조금씩 일렁인다
function reflection() {
  if (S.refK <= 0.01 || !S.ref)
    return;
  const c = tint(S.ref);
  if (!c)
    return;
  cx.save();
  cx.beginPath();
  cx.rect(0, WATER.top, SZ, WATER.floor - WATER.top);
  cx.clip();
  cx.globalAlpha = S.refK * REFLECT.a;
  const band = 32, k = c.width / SZ;
  for (let y = 0; y < SZ; y += band) {
    const dx = RM ? 0 : Math.sin(S.t * 1.3 + y * 0.012) * REFLECT.wob;
    cx.drawImage(c, 0, y * k, c.width, band * k, dx, y + REFLECT.y, SZ, band);
  }
  cx.restore();
}
function tint(k) {
  if (tinted[k])
    return tinted[k];
  const m = im(k);
  if (!D.imageReady(m))
    return null;
  const c = document.createElement('canvas');
  c.width = c.height = 768;
  const g = c.getContext('2d');
  g.drawImage(m, 0, 0, 768, 768);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = REFLECT.tint;
  g.fillRect(0, 0, 768, 768);
  return tinted[k] = c;
}
export const fishViewDebug = () => ({ S, open: openFishView, close: closeFishView, ready: fishViewReady() });
