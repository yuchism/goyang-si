/* 강고양이 씨 TV · 방송: 프로그램 표 불러오기, 그림 미리 받기, 매 프레임 tvTick, 오류 격리.
   계산(편성표·사건·지금 상태)은 tv-core.js, 프로그램 내용은 r/tv/programs.json, 방송국 틀(시간대·기간·마감 뉴스·낮잠 정파·개편)은 r/tv/schedule.json.
   자세한 내용은 TV_CHANNEL_PLAN.md, TV_STABILITY_PLAN.md, TV_SCHEDULE_PLAN.md
   화면은 320×240 버퍼(tvBuf)에 그린 뒤 본체 그림의 구멍(r/tv/meta.json의 screenTL~screenBR)에 덮어 그린다. */
import { imageReady, img, lazyFailed, loadLazy } from './assets.js';
import { tr } from './i18n.js';
import { O } from './objects.js';
import { Snd } from './sound.js';
import { rainNow } from './time.js';
import { checkReacts, tvEventFired, tvReactBeep, tvReactPower } from './tv-cat.js';
import { TVP, TV_PROBLEMS, TV_WARNINGS, progState, programFrames, setPrograms, setSchedule, tvBday, tvFrameName, tvH, tvSegs, tvState } from './tv-core.js';
import { clamp, hash, lerp } from './util.js';
import { caption, world } from './world.js';
export { TVP, fmtH, tvBday, tvDay, tvH, tvNaps, tvPrime, tvSegs, tvState } from './tv-core.js';

/* ───────── 프로그램 표 ───────── */
// 시작할 때 한 번. 실패하거나 문제가 있어도 방은 연다 (문제 있는 프로그램만 편성에서 빠진다)
async function getJson(path, what) {
  try {
    const r = await fetch(path, { cache: 'no-store' });
    if (!r.ok)
      throw new Error(path + ' ' + r.status);
    return await r.json();
  }
  catch (e) {
    console.error(`TV: ${what}를 읽지 못했어요. 모든 칸이 화면 조정으로 나와요`, e);
    return null;
  }
}
export async function loadPrograms() {
  const [raw, sched] = await Promise.all([getJson('r/tv/programs.json', '프로그램 표'), getJson('r/tv/schedule.json', '방송국 틀')]);
  checkReacts();
  setSchedule(sched); // 방송국 틀 먼저 (프로그램의 방영 조건이 시간대·기간 이름을 쓴다)
  const { problems, warnings } = setPrograms(raw || {});
  problems.forEach(p => console.warn(`TV: 문제 있는 프로그램 ${p.id} → 편성에서 뺌\n  ` + p.errors.join('\n  ')));
  warnings.forEach(w => console.warn('TV: ' + w));
  window.dispatchEvent(new Event('tvprograms')); // 미리보기 도구가 목록·문제 수를 다시 그린다
}
export const tvProblems = () => ({ problems: TV_PROBLEMS, warnings: TV_WARNINGS });

/* ───────── 그림은 필요할 때 받기 ───────── */
// 처음엔 본체와 기본 화면만 받는다(assets.js). 프로그램 그림은 지금 칸·다음 칸 것을 매분 미리 받는다
export function tvNeed(id) {
  for (const f of programFrames(id))
    loadLazy('r_tv/' + f, 'r/tv/' + f + '.webp');
}
function prefetch(d) {
  const H = tvH(d), segs = tvSegs(tvBday(d)).filter(s => s.e > H).slice(0, 2);
  segs.forEach(s => s.p && tvNeed(s.p));
}
export const tvFrameReady = n => imageReady(img('tv/' + n));

/* ───────── 오류 격리 ───────── */
// TV 계산이나 화면 그리기에서 오류가 나면 그 칸이 끝날 때까지 "잠시 화면 조정 중입니다". 방은 계속 돈다
const logged = new Set();
export function tvBreak(d, err, where) {
  const T = world.tv, ms = d.getTime();
  let until = null;
  try {
    const st = tvState(d);
    if (st.sg)
      until = ms + (st.sg.e - tvH(d)) * 3600000;
  }
  catch (e) { }
  if (!(until > ms)) // 칸을 모르면 다음 30분 경계까지
    until = (Math.floor(ms / 1800000) + 1) * 1800000;
  until = Math.round(until / 60000) * 60000; // 칸 경계는 분 단위 (로그를 한 번만 남기는 열쇠로도 쓴다)
  T.broken = { from: ms, until };
  T.force = null;
  T.preview = null;
  const k = where + ':' + until;
  if (!logged.has(k)) { // 매 장면 쏟아지지 않게 한 번만
    logged.add(k);
    console.error(`TV: ${where}에서 오류 → ${new Date(until).toLocaleTimeString()}까지 화면 조정`, err);
  }
}
const isBroken = d => {
  const b = world.tv.broken, ms = d.getTime();
  if (b && (ms >= b.until || ms < b.from - 1000)) // 다음 칸이 되었거나 미리보기로 시각을 되돌렸으면 다시 시도
    world.tv.broken = null;
  return !!world.tv.broken;
};

export const tvOn = () => !!(O.tv && world.tv.st && world.tv.st.mode !== 'off');
export const tvCold = () => {
  const st = world.tv.st;
  return !st || st.mode === 'off' && st.tOff > 150;
}; // 꺼지고 조금 지나면 식는다
// TV 불빛 색: 지금 그림의 평균색을 조금 밝게
const tvAvgC = {};
function tvAvg(n) {
  if (tvAvgC[n])
    return tvAvgC[n];
  const im = img('tv/' + n);
  if (!imageReady(im))
    return null;
  try {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 6;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0, 8, 6);
    const a = x.getImageData(0, 0, 8, 6).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < a.length; i += 4) {
      r += a[i];
      g += a[i + 1];
      b += a[i + 2];
    }
    const n4 = a.length / 4;
    return tvAvgC[n] = [r / n4, g / n4, b / n4].map(v => Math.round(lerp(v, 255, 0.35)));
  }
  catch (e) {
    return tvAvgC[n] = [190, 200, 225];
  }
}

/* ───────── 미리보기 도구: 이 기기에서만 ───────── */
const PREVIEW_SEC = 180;
// 지금 시각에 프로그램 하나를 몇 분 틀어 본다. 편성은 그대로 (다른 방문자와 상관없음)
export function tvPreview(id, d) {
  if (!TVP[id])
    return false;
  const H = tvH(d), sg = { p: id, s: H, e: H + PREVIEW_SEC / 3600 };
  Object.defineProperty(sg, 'title', { get: () => '▶ ' + TVP[id].name });
  world.tv.preview = { sg, t0: world.t, k: 'preview' + world.t.toFixed(2) };
  world.tv.force = null;
  tvNeed(id);
  return true;
}
// 지금 프로그램의 사건 하나를 바로 일으킨다 (id 없으면 큰 사건 중 하나)
export function tvForce(id, pickFn) {
  const st = world.tv.st;
  if (!st || st.mode !== 'prog')
    return false;
  const P = TVP[st.p], all = [...P.ev, ...(P.end ? [P.end] : [])];
  let e = all.find(x => x.id === id);
  if (!e) {
    const big = P.ev.filter(x => x.size >= 2);
    e = pickFn(big.length ? big : P.ev.length ? P.ev : all);
  }
  if (!e)
    return false;
  world.tv.force = { p: st.p, e, t0: world.t };
  return true;
}

/* ───────── 매 프레임 ───────── */
// 방송 상태를 계산하고, 전원·화면조정·사건이 바뀌는 순간을 알린다. 여기서 오류가 나도 방은 멈추지 않는다
export function tvTick(d) {
  if (!O.tv)
    return;
  try {
    tick(d);
  }
  catch (e) {
    tvBreak(d, e, 'tvTick');
    world.tv.st = { mode: 'adjust', broken: true };
    world.tv.frame = 'screen_testcard';
  }
}
function tick(d) {
  const T = world.tv;
  const minute = Math.floor(d.getTime() / 60000);
  if (T.preMin !== minute) {
    T.preMin = minute;
    prefetch(d);
  }
  let st;
  if (isBroken(d))
    st = { mode: 'adjust', broken: true };
  else {
    st = tvState(d);
    const pv = T.preview;
    if (pv) {
      const tIn = world.t - pv.t0;
      if (tIn < PREVIEW_SEC && TVP[pv.sg.p] && st.mode !== 'off')
        st = progState(pv.sg, tIn, pv.k);
      else
        T.preview = null;
    }
  }
  if (T.force && st.mode === 'prog') {
    const f = T.force;
    if (f.p === st.p && world.t - f.t0 < f.e.dur) {
      st.ev = { at: st.tIn - (world.t - f.t0), e: f.e };
      st.key = 'force' + f.t0;
    }
    else
      T.force = null;
  }
  if (st.mode !== 'off' && st.mode !== 'signoff') {
    if (world.ufo)
      st.noise = 0.55;
    else if (world.flash > 0.05) // 번개가 번쩍일 때 잠깐 지직 (weather.js)
      st.noise = 0.5;
    else if (rainNow(d) && hash('tvn' + Math.floor(d.getTime() / 60000)) < 0.12 && (d.getTime() / 1000) % 60 < 1.6)
      st.noise = 0.45;
  }
  const pv = T.st;
  T.st = st;
  T.frame = tvFrameName(st);
  // 프로그램 그림을 아직 못 받았으면 "수신 중" (사건 시각·고양이 반응은 그대로 진행)
  // 그림 파일이 없는 프로그램: 그 칸 내내 "화면 조정 중" (그림이 있는 장면과 번갈아 깜빡이지 않게)
  st.missing = st.mode === 'prog' && programFrames(st.p).some(f => lazyFailed('r_tv/' + f));
  st.tuning = st.mode === 'prog' && !st.missing && !tvFrameReady(T.frame);
  if (st.tuning)
    tvNeed(st.p);
  const avg = st.tuning || st.missing ? null : tvAvg(T.frame);
  if (avg) {
    if (st.mode === 'opening') {
      const b = tvAvg('screen_sunrise_2of2') || avg, k = clamp(st.k, 0, 1);
      T.avg = avg.map((v, i) => Math.round(lerp(v, b[i], k)));
    }
    else
      T.avg = avg;
  }
  else if (st.tuning || st.missing)
    T.avg = null; // 그림이 없으면 기본 푸른빛 (tv-screen.js)
  T.flick = 0.5 + 0.5 * Math.sin(world.t * 9.1) * Math.sin(world.t * 2.3 + 1) + (world.t - (T.flash || -9) < 0.35 ? 0.6 : 0);
  if (!pv)
    return; // 처음 한 번은 알리지 않음
  if (pv.mode === 'off' && st.mode !== 'off') {
    Snd.tvClick(true);
    caption(tr('capTvOn'), 2);
    tvReactPower();
  }
  if (pv.mode !== 'off' && st.mode === 'off') {
    Snd.tvClick(false);
  }
  if (st.mode === 'testcard' && pv.mode === 'signoff') {
    Snd.tvBeep(2.5);
    caption(tr('capBeep'), 3);
    tvReactBeep();
  }
  if (st.mode === 'prog' && (pv.mode !== 'prog' || pv.sg !== st.sg))
    T.osd = world.t;
  if (st.key && st.key !== pv.key) {
    try { // 고양이 반응에서 난 오류가 방송을 멈추지 않게
      tvEventFired(st.ev.e);
    }
    catch (e) {
      const k = 'react:' + st.ev.e.id;
      if (!logged.has(k)) {
        logged.add(k);
        console.error('TV: 강고양이 씨 반응 오류', st.ev.e.id, e);
      }
    }
  }
}
