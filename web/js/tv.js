/* 강고양이 씨 TV · 방송: 고양.방송 편성표, 프로그램과 사건, 지금 상태(tvTick) */
import { imageReady, img } from './assets.js';
import { tr } from './i18n.js';
import { O } from './objects.js';
import { Snd } from './sound.js';
import { dayKey, holiday, hourOf, isWeekend, rainNow } from './time.js';
import { tvEventFired, tvReactBeep, tvReactPower } from './tv-cat.js';
import { clamp, hash, lerp } from './util.js';
import { caption, world } from './world.js';
/* ───────── 강고양이 씨 TV: 고양.방송 ─────────
  방송은 실제 시계를 따른다. 같은 날 같은 시각이면 누가 열어도 같은 프로그램, 같은 장면이 나온다.
  05:00 탁 켜짐 → 화면조정 → 05:05 해 뜨는 오프닝 → 05:10부터 편성표 → 00:55 마침 인사 → 01:00 화면조정 → 01:02 꺼짐.
  화면은 320×240 버퍼(tvBuf)에 그린 뒤 본체 그림의 구멍(r/tv/meta.json의 screenTL~screenBR)에 덮어 그린다. 자세한 내용은 TV_CHANNEL_PLAN.md */
// 프로그램: loop는 평소 장면(초 → 그림), ev는 사건(size 1 작음 · 2 중간 · 3 큼), gap은 사건 사이 간격(초)
export const TVP = {
  news: { get name() { return tr('tvNews'); }, loop: t => t % 4.6 < 0.2 ? 'tv_news_2of3' : 'tv_news_1of3',
    ev: [{ id: 'breaking', w: 1, size: 3, dur: 6, f: ['tv_news_3of3'], get cap() { return tr('tvBreaking'); }, once: 1 }], gap: [240, 600],
    get ticker() { return tr('tvTicker'); } },
  drama: { get name() { return tr('tvDrama'); }, loop: t => t % 7 < 4.2 ? 'tv_drama_1of5' : 'tv_drama_2of5',
    ev: [{ id: 'turn', w: 3, size: 2, dur: 4, f: ['tv_drama_3of5'], get cap() { return tr('tvDramaTurn'); } }, { id: 'nose', w: 1, size: 3, dur: 6, f: ['tv_drama_4of5'], get cap() { return tr('tvDramaNose'); } }],
    end: { id: 'next', size: 1, dur: 25, f: ['tv_drama_5of5'], get cap() { return tr('tvDramaNext'); } }, gap: [150, 420],
    get subs() { return tr('tvDramaSubs'); } },
  baseball: { get name() { return tr('tvBaseball'); }, loop: t => t % 3.8 < 2.3 ? 'tv_baseball_1of5' : 'tv_baseball_2of5', sport: 1, get teams() { return tr('tvBaseballTeams'); },
    ev: [{ id: 'chase', w: 3, size: 2, dur: 4.4, f: ['tv_baseball_3of5', 'tv_baseball_4of5'], get cap() { return tr('tvBaseballChase'); } }, { id: 'homerun', w: 0.6, size: 3, dur: 5, f: ['tv_baseball_5of5'], get cap() { return tr('tvHomerun'); }, score: 1 }], gap: [90, 300] },
  football: { get name() { return tr('tvSoccer'); }, loop: t => Math.floor(t / 3.4) % 2 ? 'tv_football_2of4' : 'tv_football_1of4', sport: 1, get teams() { return tr('tvSoccerTeams'); },
    ev: [{ id: 'box', w: 2, size: 2, dur: 5, f: ['tv_football_3of4'], get cap() { return tr('tvSoccerBox'); } }, { id: 'goal', w: 0.8, size: 3, dur: 5, f: ['tv_football_4of4'], get cap() { return tr('tvGoal'); }, score: 1 }], gap: [100, 320] },
  actress: { get name() { return tr('tvActress'); }, loop: t => Math.floor(t / 0.75) % 2 ? 'tv_actress_2of4' : 'tv_actress_1of4',
    ev: [{ id: 'groom', w: 2, size: 1, dur: 4, f: ['tv_actress_3of4'], get cap() { return tr('tvGroom'); } }, { id: 'flash', w: 1.3, size: 3, dur: 4, f: ['tv_actress_4of4'], get cap() { return tr('tvFlash'); } }], gap: [150, 400] },
  // 할로윈 특집(할로윈 기간 22~24시만): 어두운 복도를 촛불 들고 걷는 고양이, 가끔 뒤돌아봄. 큰 사건은 뒤에 놓인 오이
  horror: { get name() { return tr('tvHorror'); }, loop: t => t % 9 > 7.4 ? 'tv_horror_2of3' : 'tv_horror_1of3',
    ev: [{ id: 'creak', w: 2, size: 1, dur: 4, f: ['tv_horror_2of3'], get cap() { return tr('tvCreak'); } }, { id: 'cucumber', w: 1, size: 3, dur: 5, f: ['tv_horror_3of3'], get cap() { return tr('tvCucumber'); } }], gap: [120, 360] },
};
// 편성표: [시작, 끝, 한 칸(시간), 후보]. 24시가 넘는 시각은 같은 방송일의 새벽. sports는 평일 야구, 주말 축구
const TV_GRID = [[5 + 10 / 60, 9, 0.5, ['news', 'news', 'drama']], [9, 12, 0.5, ['actress', 'news', 'drama']], [12, 18, 1, ['drama', 'football', 'actress', 'baseball']],
  [18, 21, 3, ['sports']], [21, 22, 1, ['drama']], [22, 23.5, 0.5, ['actress', 'drama', 'football']], [23.5, 24, 0.5, ['news']], [24, 24 + 55 / 60, 0.5, ['drama', 'actress', 'football']]];
export const tvH = d => {
  const h = hourOf(d);
  return h < 5 ? h + 24 : h;
}; // 방송일 기준 시각 (새벽 1시 = 25)
export const tvBday = d => hourOf(d) < 5 ? new Date(d.getTime() - 86400000) : d; // 새벽은 전날 방송일
export const fmtH = h => {
  const m = Math.round(h * 60) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
function tvTitle(sg) {
  const p = TVP[sg.p];
  if (sg.p === 'drama')
    return tr(sg.s >= 21 && sg.s < 22 ? 'tvFirstRun' : 'tvRerun', { name: p.name });
  if (sg.p === 'news')
    return sg.s < 9 ? tr('tvMorning', { name: p.name }) : sg.s >= 23.5 ? tr('tvLate', { name: p.name }) : p.name;
  if (p.sport)
    return tr(sg.s >= 18 && sg.s < 21 ? 'tvLive' : 'tvRerun', { name: p.name });
  if (sg.p === 'horror')
    return tr('tvHorrorSpecial', { name: p.name });
  return p.name;
}
const tvDays = {};
export function tvSegs(bd) {
  const hw = holiday(bd) === 'halloween', dk = dayKey(bd), k = dk + (hw ? ':hw' : '');
  if (tvDays[k])
    return tvDays[k];
  const we = isWeekend(bd), out = [];
  for (const [b0, b1, len, c] of TV_GRID) {
    for (let s = b0; s < b1 - 1e-6;) {
      const e = Math.min(b1, (Math.floor(s / len + 1e-6) + 1) * len);
      let p = c[Math.floor(hash('tv' + dk + ':' + s.toFixed(3)) * c.length)];
      if (p === 'sports')
        p = we ? 'football' : 'baseball';
      if (hw && s >= 22 - 1e-6 && s < 24 - 1e-6)
        p = 'horror'; // 할로윈 특집: 22~24시 한 칸
      const l = out[out.length - 1];
      if (l && l.p === p && Math.abs(l.e - s) < 1e-6 && !(s === 18 || s === 21 || s === 22))
        l.e = e;
      else
        out.push({ p, s, e });
      s = e;
    }
  }
  out.forEach(sg => Object.defineProperty(sg, 'title', { get: () => tvTitle(sg) })); // 언어를 바꾸면 바로 따라가도록 그때그때 만든다
  if (Object.keys(tvDays).length > 3)
    for (const kk in tvDays)
      delete tvDays[kk];
  return tvDays[k] = out;
}
// 프로그램 안의 사건: 날짜와 시작 시각으로 정해지므로 누구에게나 같다
function tvEvents(sg, k) {
  if (sg.evs)
    return sg.evs;
  const P = TVP[sg.p], dur = (sg.e - sg.s) * 3600, ev = [], seed = k + '@' + sg.s.toFixed(3), tot = P.ev.reduce((a, e) => a + e.w, 0), once = {};
  let t = 40 + hash(seed + 'a') * 90, i = 0;
  while (t < dur - (P.end ? P.end.dur + 30 : 30)) {
    let r = hash(seed + 'e' + i) * tot, e = P.ev[0];
    for (const x of P.ev) {
      if ((r -= x.w) <= 0) {
        e = x;
        break;
      }
    }
    if (!(e.once && once[e.id])) {
      ev.push({ at: t, e });
      if (e.once)
        once[e.id] = 1;
    }
    t += e.dur + P.gap[0] + hash(seed + 'g' + i) * (P.gap[1] - P.gap[0]);
    i++;
  }
  if (P.end)
    ev.push({ at: dur - P.end.dur, e: P.end });
  return sg.evs = ev;
}
export function tvState(d) {
  const H = tvH(d), bd = tvBday(d), k = dayKey(bd), sec = x => (H - x) * 3600;
  if (H >= 25 + 2 / 60)
    return { mode: 'off', tOff: sec(25 + 2 / 60) };
  if (H < 5 + 5 / 60)
    return { mode: 'testcard', tOn: sec(5) };
  if (H < 5 + 10 / 60)
    return { mode: 'opening', k: sec(5 + 5 / 60) / 300 };
  if (H >= 25)
    return { mode: 'testcard', beep: sec(25) };
  if (H >= 24 + 55 / 60)
    return { mode: 'signoff' };
  const sg = tvSegs(bd).find(s => H >= s.s && H < s.e);
  if (!sg)
    return { mode: 'signoff' };
  const tIn = sec(sg.s), evs = tvEvents(sg, k), score = [0, 0];
  let cur = null;
  for (const x of evs) {
    if (tIn >= x.at && tIn < x.at + x.e.dur)
      cur = x;
    if (x.e.score && tIn >= x.at + 1.5)
      score[hash(k + x.at) < 0.5 ? 0 : 1]++;
  }
  return { mode: 'prog', sg, p: sg.p, tIn, ev: cur, key: cur ? k + '@' + sg.s.toFixed(3) + ':' + cur.at.toFixed(1) : null, score };
}
export const tvOn = () => !!(O.tv && world.tv.st && world.tv.st.mode !== 'off');
export const tvCold = () => {
  const st = world.tv.st;
  return !st || st.mode === 'off' && st.tOff > 150;
}; // 꺼지고 조금 지나면 식는다
function tvFrameName(st) {
  if (st.mode === 'prog') {
    if (st.ev) {
      const e = st.ev.e, u = clamp((st.tIn - st.ev.at) / e.dur, 0, 0.999);
      return e.f[Math.floor(u * e.f.length)];
    }
    return TVP[st.p].loop(st.tIn);
  }
  return { testcard: 'screen_testcard', signoff: 'screen_signoff', opening: 'screen_sunrise_1of2' }[st.mode] || 'screen_off';
}
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
// 매 프레임: 방송 상태를 계산하고, 전원·화면조정·사건이 바뀌는 순간을 알린다
export function tvTick(d) {
  const T = world.tv;
  if (!O.tv)
    return;
  let st = tvState(d);
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
    else if (rainNow(d) && hash('tvn' + Math.floor(d.getTime() / 60000)) < 0.12 && (d.getTime() / 1000) % 60 < 1.6)
      st.noise = 0.45;
  }
  const pv = T.st;
  T.st = st;
  T.frame = tvFrameName(st);
  const avg = tvAvg(T.frame);
  if (avg) {
    if (st.mode === 'opening') {
      const b = tvAvg('screen_sunrise_2of2') || avg, k = clamp(st.k, 0, 1);
      T.avg = avg.map((v, i) => Math.round(lerp(v, b[i], k)));
    }
    else
      T.avg = avg;
  }
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
  if (st.key && st.key !== pv.key)
    tvEventFired(st.ev.e);
}
