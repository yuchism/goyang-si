/* 정각 종 · 정각 손님 (HOURLY_CHIME_PLAN.md): 매시 정각, 창밖 먼 곳에서 종이 울린다(차임 + 시각만큼 타종).
   종이 울리는 동안 손님 하나가 "뿅" 나타나 살랑살랑 춤추다가, 마지막 종 여운이 끝날 때 "뿅" 사라진다. 왜 왔는지는 아무도 모른다.
   - 불 끈 뒤(nightDark): 종만 작게. 손님 없음. 예외: 할로윈 자정(마녀·외계인·호박머리, 어둠 속에서 눈·입이 빛남)
   - 생일 파티 중: 그 시각 종은 건너뜀 / 만득 씨가 있으면 손님 없음(오면 즉시 뿅) / 시간 점프·페이지를 연 뒤 처음 맞는 정각 전: 안 울림
   - 누가 오나는 시각으로 정한다(날짜 씨앗): 새로 고침해도, 누가 봐도 그 시각엔 같은 손님. 바로 전 시각 손님은 피한다
   - 손님 그림은 다음 정각 손님 것만 미리 받는다(loadLazy) */
import { IMG, imageReady, loadLazy } from './assets.js';
import { GUESTS, drawGuest, drawGuestSheet, drawPuffs, guestSrc, puff } from './guests.js';
import { tr } from './i18n.js';
import { PL } from './objects.js';
import { CHIME, Snd, chimePlan } from './sound.js';
import { ctx } from './stage.js';
import { halloweenMidnight, hourStart, nightDark, now, strikesOf } from './time.js';
import { RM, clamp, hash } from './util.js';
import { caption, cat, world } from './world.js';

const FLIP_CHANCE = 0.15; // 정각 손님이 반대 방향으로 출 확률
const GLOW = { witch: true, pumpkinhead: true }; // 할로윈 자정 어둠 속에서 눈·입이 빛나는 손님 (밝은 노랑 픽셀, halloween.js 호박과 같은 기준)
const C = { key: null, jumps: 0, run: null, fetched: null };

/* ───────── 누가 오나 (날짜 씨앗) ───────── */
const pool = hw => GUESTS.filter(g => hw ? g.halloween || g.rare : !g.rare && !g.owner && !g.halloween);
// 그 시각(ms, 0분)의 손님. 그림이 준비됐는지와 무관하게 정해진다
export function chimeGuestFor(ms, hw) {
  const list = pool(hw);
  if (!list.length)
    return null;
  const at = m => Math.floor(hash('chime' + m) * list.length) % list.length;
  let i = at(ms);
  if (!hw && list.length > 1 && i === at(ms - 3600e3)) // 바로 전 시각과 같으면 다음 손님
    i = (i + 1) % list.length;
  return list[i];
}
// 손님이 나올 수 있는 시각인가 (종은 따로)
const guestHour = d => halloweenMidnight(d) || !nightDark(d);
// 다음 정각 손님 그림을 미리 받는다 (한 시간에 한 장)
function prefetch(d) {
  const next = C.key + 3600e3;
  if (C.fetched === next)
    return;
  C.fetched = next;
  const nd = new Date(next);
  if (!guestHour(nd))
    return;
  const g = chimeGuestFor(next, halloweenMidnight(nd));
  if (g && !IMG['f_guest_' + g.id])
    loadLazy('f_guest_' + g.id, guestSrc(g.id));
}

/* ───────── 진행 ───────── */
// 자리: 장면의 chime.guest 후보 중 강고양이 씨와 away 이상 떨어진 곳에서 가장 가까운 곳(좁은 화면에서도 같이 보이게).
// 모두 가까우면 가장 먼 곳. 후보가 없으면 손님 없이 종만
function spotFor(g) {
  const pl = PL('chime.guest') || {}, spots = (pl.spots || []).filter(s => !s.small || g.size <= 0.8), away = pl.away || 190;
  if (!spots.length)
    return null;
  const dist = s => Math.hypot(s.x - cat.x, (s.y - cat.y) * 2);
  const far = spots.filter(s => dist(s) >= away).sort((a, b) => dist(a) - dist(b));
  return far[0] || spots.slice().sort((a, b) => dist(b) - dist(a))[0];
}
// 종을 울린다. force: 미리보기(지금 정각 종) — 분 확인 없이
export function startChime(d, force) {
  if (C.run || world.party) // 울리는 중이거나 생일 파티 중이면 건너뜀
    return false;
  const quiet = nightDark(d), hw = halloweenMidnight(d), plan = chimePlan(strikesOf(d));
  if (!Snd.chime(plan, quiet))
    caption(tr('capChime'), Math.min(plan.sec, 8)); // 소리가 꺼져 있으면 자막
  const run = { t: 0, sec: plan.sec, puffs: [], q: null, hw, force };
  const g = !RM && !world.manduk && guestHour(d) ? chimeGuestFor(hourStart(d), hw) : null;
  if (g && !imageReady(IMG['f_guest_' + g.id]))
    loadLazy('f_guest_' + g.id, guestSrc(g.id)); // 아직이면 받아 두고, 나올 때까지 오면 나온다
  const s = g && spotFor(g);
  if (s)
    run.q = { g, x: s.x, y: s.y, flip: hash('chimeflip' + hourStart(d)) < FLIP_CHANCE, shown: false, gone: false, t0: 0 };
  C.run = run;
  return true;
}
function leave(run) {
  const q = run.q;
  if (!q || q.gone)
    return;
  q.gone = true;
  if (q.shown)
    puff(q, run);
}
export function chimeTick(d, real) {
  const k = hourStart(d);
  if (C.key == null || world.jumps !== C.jumps) { // 처음 열었을 때·시간 점프: 지나친 정각은 울리지 않는다
    C.key = k;
    C.jumps = world.jumps;
  }
  else if (k !== C.key) {
    C.key = k;
    if (d.getTime() - k < 60e3) // 정각을 막 지났을 때만 (탭을 오래 떠났다 돌아온 경우 등은 울리지 않음) // time-ok
      startChime(d);
  }
  prefetch(d);
  const run = C.run;
  if (!run)
    return;
  run.t += real;
  const q = run.q;
  if (q && !q.gone) {
    if (world.manduk || world.party) // 만득 씨가 오면(또는 파티가 시작되면) 즉시 뿅
      leave(run);
    else if (!q.shown && run.t >= CHIME.guestAt && imageReady(IMG['f_guest_' + q.g.id])) {
      q.shown = true;
      q.t0 = run.t;
      puff(q, run);
    }
    else if (run.t >= run.sec)
      leave(run);
  }
  if (run.t >= run.sec + 1)
    C.run = null;
}

/* ───────── 그리기 ───────── */
const cellOf = run => Math.floor(run.t / CHIME.danceBeat) % 4;
const showing = () => C.run && C.run.q && C.run.q.shown && !C.run.q.gone ? C.run.q : null;
// 바닥 순서 목록에 넣을 것 (main.js render)
export function chimeLayers() {
  const q = showing();
  return q ? [[q.y, () => drawGuest(q, C.run, cellOf(C.run)), '정각 손님 ' + q.g.id]] : [];
}
export function drawChimePuffs() {
  if (C.run)
    drawPuffs(C.run);
}
// 빛 마스크: 밝은 노랑 픽셀만 노란 촛불빛으로 (halloween.js pumpkinMask와 같은 기준)
const masks = {};
function maskOf(id, im) {
  if (masks[id] !== undefined)
    return masks[id];
  try {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    const dd = x.getImageData(0, 0, c.width, c.height), p = dd.data;
    for (let i = 0; i < p.length; i += 4) {
      const on = p[i] > 220 && p[i + 1] > 150 && p[i + 2] < 150 && p[i + 3] > 200;
      p[i] = 255; p[i + 1] = 228; p[i + 2] = 105; p[i + 3] = on ? 255 : 0;
    }
    x.putImageData(dd, 0, 0);
    masks[id] = c;
  }
  catch (e) {
    masks[id] = false; // 픽셀을 못 읽으면 빛 없이
  }
  return masks[id];
}
// 어둠을 덮은 뒤에 부른다: 할로윈 자정 손님을 어둠 속에 어렴풋이, 눈·입은 촛불빛으로 깜빡이게
export function drawChimeGlow(dk) {
  const q = showing(), run = C.run;
  if (!q || !run.hw || dk < 0.04)
    return;
  const im = IMG['f_guest_' + q.g.id], cell = cellOf(run);
  if (!imageReady(im))
    return;
  const f = RM ? 1 : 1 + 0.08 * Math.sin(run.t * 2.3) + 0.05 * Math.sin(run.t * 5.9 + 1.3);
  ctx.save();
  ctx.globalAlpha = clamp(dk * 0.4, 0, 0.35); // 몸: 어렴풋이
  drawGuestSheet(q, run, cell, im);
  const mk = GLOW[q.g.id] && maskOf(q.g.id, im);
  if (mk) {
    ctx.globalAlpha = clamp(dk * 1.6 * f, 0, 0.9);
    drawGuestSheet(q, run, cell, mk);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(dk * 0.5 * f, 0, 0.3);
    drawGuestSheet(q, run, cell, mk);
  }
  ctx.restore();
}

/* ───────── 점검용 (debug.js) ───────── */
export const chimeDebug = () => ({
  chimeNow: () => startChime(now(), true), // 지금 시각으로 바로 종 (분 확인 없이)
  chimeState: () => C.run && { t: C.run.t, sec: C.run.sec, hw: C.run.hw, guest: C.run.q && C.run.q.g.id, shown: !!(C.run.q && C.run.q.shown), gone: !!(C.run.q && C.run.q.gone) },
  chimeGuestFor,
});
