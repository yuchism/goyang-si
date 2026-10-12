/* 강고양이 씨 TV · 방송: 고양.방송 편성표, 프로그램과 사건, 지금 상태(tvTick) */
import { imageReady, img } from './assets.js';
import { O } from './objects.js';
import { Snd } from './sound.js';
import { dayKey, hourOf, isWeekend, rainNow, simMs } from './time.js';
import { tvEventFired, tvReactBeep, tvReactPower } from './tv-cat.js';
import { clamp, hash, lerp } from './util.js';
import { caption, world } from './world.js';
/* ───────── 강고양이 씨 TV: 고양.방송 ─────────
  방송은 실제 시계를 따른다. 같은 날 같은 시각이면 누가 열어도 같은 프로그램, 같은 장면이 나온다.
  05:00 탁 켜짐 → 화면조정 → 05:05 해 뜨는 오프닝 → 05:10부터 편성표 → 00:55 마침 인사 → 01:00 화면조정 → 01:02 꺼짐.
  화면은 320×240 버퍼(tvBuf)에 그린 뒤 본체 그림의 구멍(r/tv/meta.json의 screenTL~screenBR)에 덮어 그린다. 자세한 내용은 TV_CHANNEL_PLAN.md */
// 프로그램: loop는 평소 장면(초 → 그림), ev는 사건(size 1 작음 · 2 중간 · 3 큼), gap은 사건 사이 간격(초)
export const TVP = {
  news: { name: '고양 뉴스', loop: t => t % 4.6 < 0.2 ? 'tv_news_2of3' : 'tv_news_1of3',
    ev: [{ id: 'breaking', w: 1, size: 3, dur: 6, f: ['tv_news_3of3'], cap: '속보: 츄르 가격 인상', once: 1 }], gap: [240, 600],
    ticker: ['오늘의 날씨: 낮잠 자기 좋음', '츄르 시세 소폭 상승', '창밖 새 관측 3마리', '택배 상자 품귀 현상 계속', '해 드는 자리 만석', '쥐 목격담 또 나와… 당국은 부인'] },
  drama: { name: '드라마 「창가에서」', loop: t => t % 7 < 4.2 ? 'tv_drama_1of5' : 'tv_drama_2of5',
    ev: [{ id: 'turn', w: 3, size: 2, dur: 4, f: ['tv_drama_3of5'], cap: '…흥.' }, { id: 'nose', w: 1, size: 3, dur: 6, f: ['tv_drama_4of5'], cap: '…냥.' }],
    end: { id: 'next', size: 1, dur: 25, f: ['tv_drama_5of5'], cap: '다음 이 시간에' }, gap: [150, 420],
    subs: ['…냥.', '…냐앙.', '(창밖을 본다)', '그때 그 상자, 기억해?', '…츄르 때문이야?', '(꼬리를 탁 친다)'] },
  baseball: { name: '고양이 프로야구', loop: t => t % 3.8 < 2.3 ? 'tv_baseball_1of5' : 'tv_baseball_2of5', sport: 1, teams: ['냥', '묘'],
    ev: [{ id: 'chase', w: 3, size: 2, dur: 4.4, f: ['tv_baseball_3of5', 'tv_baseball_4of5'], cap: '공 대신 공을 쫓아갑니다' }, { id: 'homerun', w: 0.6, size: 3, dur: 5, f: ['tv_baseball_5of5'], cap: '홈런!', score: 1 }], gap: [90, 300] },
  football: { name: '고양이 축구', loop: t => Math.floor(t / 3.4) % 2 ? 'tv_football_2of4' : 'tv_football_1of4', sport: 1, teams: ['털', '실'],
    ev: [{ id: 'box', w: 2, size: 2, dur: 5, f: ['tv_football_3of4'], cap: '경기 중단: 상자 발견' }, { id: 'goal', w: 0.8, size: 3, dur: 5, f: ['tv_football_4of4'], cap: '골!', score: 1 }], gap: [100, 320] },
  actress: { name: '연예가 고양통신', loop: t => Math.floor(t / 0.75) % 2 ? 'tv_actress_2of4' : 'tv_actress_1of4',
    ev: [{ id: 'groom', w: 2, size: 1, dur: 4, f: ['tv_actress_3of4'], cap: '우아하게 그루밍 중' }, { id: 'flash', w: 1.3, size: 3, dur: 4, f: ['tv_actress_4of4'], cap: '찰칵!' }], gap: [150, 400] },
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
    return p.name + (sg.s >= 21 && sg.s < 22 ? ' (본방)' : ' (재)');
  if (sg.p === 'news')
    return sg.s < 9 ? '아침 ' + p.name : sg.s >= 23.5 ? '마감 ' + p.name : p.name;
  if (p.sport)
    return p.name + (sg.s >= 18 && sg.s < 21 ? ' 중계' : ' (재)');
  return p.name;
}
const tvDays = {};
export function tvSegs(bd) {
  const k = dayKey(bd);
  if (tvDays[k])
    return tvDays[k];
  const we = isWeekend(bd), out = [];
  for (const [b0, b1, len, c] of TV_GRID) {
    for (let s = b0; s < b1 - 1e-6;) {
      const e = Math.min(b1, (Math.floor(s / len + 1e-6) + 1) * len);
      let p = c[Math.floor(hash('tv' + k + ':' + s.toFixed(3)) * c.length)];
      if (p === 'sports')
        p = we ? 'football' : 'baseball';
      const l = out[out.length - 1];
      if (l && l.p === p && Math.abs(l.e - s) < 1e-6 && !(s === 18 || s === 21 || s === 22))
        l.e = e;
      else
        out.push({ p, s, e });
      s = e;
    }
  }
  out.forEach(sg => sg.title = tvTitle(sg));
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
    else if (rainNow(d) && hash('tvn' + Math.floor(simMs / 60000)) < 0.12 && (simMs / 1000) % 60 < 1.6)
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
    caption('…탁.', 2);
    tvReactPower();
  }
  if (pv.mode !== 'off' && st.mode === 'off') {
    Snd.tvClick(false);
  }
  if (st.mode === 'testcard' && pv.mode === 'signoff') {
    Snd.tvBeep(2.5);
    caption('…삐—…', 3);
    tvReactBeep();
  }
  if (st.mode === 'prog' && (pv.mode !== 'prog' || pv.sg !== st.sg))
    T.osd = world.t;
  if (st.key && st.key !== pv.key)
    tvEventFired(st.ev.e);
}
