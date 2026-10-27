/* 할로윈 덧붙이 (2026-10-27): 산 너머 마녀의 집, 천장 거미, 구석 거미줄. halloween.js(호박·박쥐·마녀·커튼 유령)에서 떼어 냈다.
   사건 셋을 events.js 목록에 싣는다 (towerEvent · webEvent · spiderEvent). 모두 할로윈 기간에만 */
import { assetsWarm } from './assets.js';
import { drawBat, witchOut, zig } from './halloween.js';
import { PL } from './objects.js';
import { ctx } from './stage.js';
import { isHalloween, isNight, now } from './time.js';
import { INK, RM, clamp, rnd } from './util.js';
import { WIN, wy } from './win.js';
import { cat, say, world } from './world.js';

/* ───────── 산 너머 마녀의 집 (tasks/halloween-witch-tower.md) ─────────
   할로윈 기간에만, 먼 산 너머로 가늘고 구불구불한 바위 봉우리가 솟아 있고 그 꼭대기에 작은 마녀의 집이 얹혀 있다.
   낮엔 먼 산처럼 뿌옇게, 밤엔 시커멓게. 집의 창 하나에 촛불(해 질 무렵부터). 마녀가 창밖을 날아가는 동안엔 창 불이 꺼진다(집을 비움).
   밤엔 작은 박쥐 두 마리가 집 둘레를 맴돈다. 정체는 설명하지 않는다.
   산 판보다 먼저 그려(skyBack) 봉우리 밑동이 능선에 가려진다. 자리·크기는 window.json witchTower (창 안 좌표), 모양 비율은 아래 표 */
const TOWER = {
  ink: '27,20,44', day: '146,146,176', rim: 'rgba(206,196,255,.16)', light: '255,200,105', // ink: 밤 실루엣, day: 낮(먼 산 연무색)
  fade: 0.8, // 창 불이 다 꺼지거나 켜지는 데 걸리는 초
  bats: 2,
  // 봉우리: 굵기 = 밑동 폭 × (top + (1 − top) × (1 − t)^pow), 꼭대기 lipFrom 위로 lip만큼 넓은 턱. 구불거림은 sin(t × π × waves)
  spire: { top: 0.13, pow: 2.6, lipFrom: 0.9, lip: 0.22, waves: 1.15, steps: 40 },
  house: { h: 0.7, tilt: -0.08 }, // 집 높이(폭 대비), 기울기(라디안)
};
let towerLit = 1; // 창 불빛 (마녀가 나가면 서서히 꺼지고 돌아오면 켜진다). 진행은 towerTick, 그리기는 읽기만
function towerTick(d, real) {
  towerLit = clamp(towerLit + (witchOut() ? -1 : 1) * real / TOWER.fade, 0, 1);
}
// 봉우리 모양 (창 안 설정 T, 창 w): 가운데 선 cx(t)·높이 cy(t)·반폭 half(t), t 0(밑동) ~ 1(꼭대기)
function spireOf(T, w) {
  const S = TOWER.spire, x0 = w.x + T.x, base = wy(T.base), h = T.h, bw = T.w / 2, sway = T.sway * h;
  return {
    cx: t => x0 + sway * Math.sin(t * Math.PI * S.waves) * t,
    cy: t => base - t * h,
    half: t => bw * (S.top + (1 - S.top) * Math.pow(1 - t, S.pow)) + (t > S.lipFrom ? bw * S.lip * (t - S.lipFrom) / (1 - S.lipFrom) : 0),
  };
}
const rough = (t, k) => Math.sin(t * 23 + k) * 0.6 + Math.sin(t * 57 + k * 2) * 0.35; // 바위 결 (px)
function drawSpire(sp) {
  const N = TOWER.spire.steps;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    ctx[i ? 'lineTo' : 'moveTo'](sp.cx(t) - sp.half(t) + rough(t, 1), sp.cy(t));
  }
  for (let i = N; i >= 0; i--) {
    const t = i / N;
    ctx.lineTo(sp.cx(t) + sp.half(t) + rough(t, 4), sp.cy(t));
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
// 집: 비뚤게 기운 상자 + 높고 끝이 꺾인 뾰족 지붕 + 굴뚝 (집 바닥 가운데 기준, hw: 반폭, hh: 높이)
function drawHouse(hw, hh) {
  ctx.beginPath(); // 벽
  ctx.moveTo(-hw, 0);
  ctx.lineTo(-hw * 0.9, -hh);
  ctx.lineTo(hw * 0.95, -hh * 1.05);
  ctx.lineTo(hw, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(hw * 0.35, -hh * 1.9, hw * 0.28, hh * 0.9); // 굴뚝
  ctx.beginPath(); // 지붕: 처마가 조금 나오고, 끝이 옆으로 휘어 꺾인다
  ctx.moveTo(-hw * 1.35, -hh * 0.92);
  ctx.quadraticCurveTo(-hw * 0.2, -hh * 1.6, -hw * 0.05, -hh * 2.6);
  ctx.quadraticCurveTo(hw * 0.2, -hh * 3.2, hw * 1.1, -hh * 3.05); // 꺾인 끝
  ctx.quadraticCurveTo(hw * 0.35, -hh * 2.7, hw * 0.45, -hh * 1.9);
  ctx.quadraticCurveTo(hw * 0.7, -hh * 1.25, hw * 1.35, -hh * 1.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
// 창 하나: 촛불처럼 일렁인다. 할로윈 자정 손님이 와 있으면 조금 더 밝게 (chime.js world.chimeGlow). size: 집 폭
function drawHouseLight(hw, hh, size, lit) {
  if (lit <= 0.01)
    return;
  const wx = -hw * 0.15, wyy = -hh * 0.5, ww = Math.max(1.4, hw * 0.24), wh = ww * 1.6;
  const f = (RM ? 1 : 0.85 + 0.1 * Math.sin(world.t * 3.1) + 0.05 * Math.sin(world.t * 7.7)) * lit * (world.chimeGlow ? 1.4 : 1);
  const g = ctx.createRadialGradient(wx, wyy, 0, wx, wyy, size * 1.6);
  g.addColorStop(0, `rgba(${TOWER.light},${0.3 * f})`);
  g.addColorStop(1, `rgba(${TOWER.light},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(wx - size * 1.6, wyy - size * 1.6, size * 3.2, size * 3.2);
  ctx.fillStyle = `rgba(${TOWER.light},${Math.min(1, f)})`;
  ctx.fillRect(wx - ww, wyy - wh / 2, ww * 2, wh);
}
// 집 둘레를 맴도는 작은 박쥐들 (뒤로 갈 땐 작고 옅게)
function drawTowerBats(hx, hy, hh, size, a) {
  for (let i = 0; i < TOWER.bats; i++) {
    const u = world.t * (RM ? 0 : 0.45) + i * (Math.PI * 2 / TOWER.bats), bx = hx + Math.cos(u) * size * 2.2, by = hy - hh * 2 + Math.sin(u) * size * 0.6 + zig(world.t * 1.7 + i) * 2;
    drawBat(bx, by, 0.18 + 0.05 * Math.sin(u), world.t * 10 + i * 1.3, a * (0.55 + 0.35 * Math.sin(u)));
  }
}
function drawWitchTower(w) {
  const T = WIN.witchTower;
  if (!T || !isHalloween(now()))
    return false;
  const a = clamp(((world.skyDark || 0) - 0.2) / 0.5, 0, 1); // 밤 정도: 낮엔 먼 산처럼 뿌옇게(0), 어두워질수록 시커멓게(1)
  const ink = TOWER.day.split(',').map((v, i) => Math.round(+v + (TOWER.ink.split(',')[i] - v) * a)).join(',');
  const sp = spireOf(T, w), hx = sp.cx(1), hy = sp.cy(1) + 1, hw = T.house / 2, hh = T.house * TOWER.house.h;
  ctx.save();
  ctx.fillStyle = `rgb(${ink})`;
  ctx.strokeStyle = a > 0.5 ? TOWER.rim : `rgba(${ink},0)`; // 밤엔 달빛 테두리 아주 옅게
  ctx.lineWidth = 1;
  drawSpire(sp);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(TOWER.house.tilt);
  drawHouse(hw, hh);
  drawHouseLight(hw, hh, T.house, towerLit * clamp((a - 0.5) / 0.3, 0, 1)); // 창 불은 해 질 무렵부터
  ctx.restore();
  ctx.restore();
  if (a > 0.5) // 박쥐는 밤에만
    drawTowerBats(hx, hy, hh, T.house, a);
  return true;
}
export const towerEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'witchTower',
  tick: (d, real) => towerTick(d, real),
  skyBack: drawWitchTower,
};

/* ───────── 구석 거미줄 (tasks/halloween-room-extras.md 1장) ─────────
   할로윈 기간 내내(낮·밤) 천장 구석에. 자리는 objects.json halloween.web (구석 x·y, 크기 r, 방향 dir: 1이면 오른쪽 아래로 펼침) */
function drawSpiderWeb() {
  const wb = PL('halloween.web');
  if (!wb || !isHalloween(now()))
    return;
  const { x, y, r } = wb, dir = wb.dir || 1;
  ctx.save();
  ctx.strokeStyle = 'rgba(245,240,230,.55)';
  ctx.lineWidth = 1;
  const A = [0, 0.28, 0.55, 0.8, 1].map(k => k * Math.PI / 2); // 구석에서 부채꼴로
  const pt = (k, rr) => [x + dir * Math.cos(A[k]) * rr, y + Math.sin(A[k]) * rr];
  A.forEach((_, k) => {
    const [ex, ey] = pt(k, r);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  });
  for (const f of [0.3, 0.55, 0.8]) { // 처진 가로줄
    ctx.beginPath();
    for (let k = 0; k < A.length; k++) {
      const [px, py] = pt(k, r * f);
      if (!k)
        ctx.moveTo(px, py);
      else {
        const [qx, qy] = pt(k - 1, r * f), mx = (px + qx) / 2 - dir * r * 0.04, my = (py + qy) / 2 - r * 0.04;
        ctx.quadraticCurveTo(mx + (x - mx) * 0.12, my + (y - my) * 0.12, px, py);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}
export const webEvent = {
  needs: ['halloween.web'], // 장면에 이 자리가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'spiderWeb',
  room: drawSpiderWeb,
};

/* ───────── 천장 거미 (tasks/halloween-room-extras.md 1장) ─────────
   할로윈 기간 밤에 가끔 벽 위 천장에서 작은 거미가 실을 타고 내려와 대롱대롱하다 올라간다.
   자리는 objects.json halloween.spider (x, 천장 top, 가장 낮은 곳 low) */
const SPIDER = { every: 900, down: 5, hang: [7, 14], up: 3.5 }; // 평균 몇 초에 한 번, 내려오기·대롱대롱·올라가기(초)
export function startSpider() {
  const sp = PL('halloween.spider');
  if (world.spider || !sp)
    return;
  world.spider = { t: 0, hang: rnd(SPIDER.hang[0], SPIDER.hang[1]), low: rnd(0.75, 1), seen: false };
}
function spiderTick(d, real, bf) {
  const s = world.spider;
  if (!s) { // 확률은 미리보기 배속을 따른다(다른 사건처럼), 움직임은 3배까지만 (나비와 같음)
    if (isHalloween(d) && isNight(d) && !world.manduk && assetsWarm() && Math.random() < real * bf / SPIDER.every)
      startSpider();
    return;
  }
  if (world.manduk && s.t < SPIDER.down + s.hang) // 만득 씨가 오면 바로 올라간다
    s.t = SPIDER.down + s.hang;
  s.t += real * Math.min(bf, 3);
  if (!s.seen && s.t > SPIDER.down && !cat.closed && !cat.bub && !world.manduk) {
    s.seen = true;
    say(cat, '👀', 3);
  }
  if (s.t > SPIDER.down + s.hang + SPIDER.up)
    world.spider = null;
}
function drawSpider() {
  const s = world.spider, sp = PL('halloween.spider');
  if (!s || !sp)
    return;
  const { down, up } = SPIDER, t = s.t;
  const k = t < down ? t / down : t < down + s.hang ? 1 : 1 - (t - down - s.hang) / up; // 내려온 정도
  const ease2 = u => u * u * (3 - 2 * u), y = sp.top + (sp.low - sp.top) * s.low * ease2(clamp(k, 0, 1));
  const sw = RM ? 0 : Math.sin(world.t * 1.6) * 3 * (t > down ? 1 : k), x = sp.x + sw, bob = RM ? 0 : Math.sin(world.t * 4.3) * 0.6;
  ctx.save();
  ctx.strokeStyle = 'rgba(240,236,228,.6)'; // 실
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(sp.x, sp.top);
  ctx.lineTo(x, y - 4);
  ctx.stroke();
  ctx.strokeStyle = INK; // 다리 여덟
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++)
    for (const sd of [-1, 1]) {
      const a0 = -0.9 + i * 0.55 + (RM ? 0 : Math.sin(world.t * 6 + i) * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, y + bob);
      ctx.quadraticCurveTo(x + sd * 6 * Math.cos(a0), y + bob - 4 + 7 * Math.sin(a0) - 3, x + sd * 9 * Math.cos(a0 * 0.8), y + bob + 7 * Math.sin(a0) + 2);
      ctx.stroke();
    }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(x, y + 3 + bob, 4.6, 5.4, 0, 0, 7); // 배
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - 3 + bob, 2.8, 0, 7); // 머리
  ctx.fill();
  ctx.restore();
}
export const spiderEvent = {
  needs: ['halloween.spider'], // 장면에 이 자리가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'spider',
  tick: (d, real, bf) => spiderTick(d, real, bf),
  room: drawSpider,
  reset() {
    world.spider = null;
  },
  debug: { startSpider },
};
