/* 강고양이 씨 TV · 방송 계산: 프로그램 표(r/tv/programs.json) 검사, 편성표, 사건, 지금 상태.
   화면·소리·고양이와 상관없는 계산만 둔다. 그래서 노드에서도 돌릴 수 있다 (tools/check_tv.mjs).
   방송은 실제 시계를 따른다. 같은 날 같은 시각이면 누가 열어도 같은 프로그램, 같은 장면이 나온다.
   05:00 탁 켜짐 → 화면조정 → 05:05 해 뜨는 오프닝 → 05:10부터 편성표 → 00:55 마침 인사 → 01:00 화면조정 → 01:02 꺼짐.
   코드는 프로그램 이름을 보지 않고 성질(overlay, watch, titleKind, 사건의 react·score·sfx)을 본다. TV_STABILITY_PLAN.md */
import { STR, tr } from './i18n.js';
import { dayKey, holiday, hourOf, isWeekend } from './time.js';
import { clamp, hash } from './util.js';

/* ───────── 프로그램 표 ───────── */
// 강고양이 씨 반응 이름. 실제 동작은 tv-cat.js의 REACT가 한다(이 목록과 같은 이름이어야 한다)
export const TV_REACT_NAMES = ['sulk', 'startle', 'heart', 'peekBehind', 'mimic:groom', 'mimic:stretch', 'pawScreen', 'pounce', 'doze'];
export const TV_OVERLAYS = ['ticker', 'subs', 'scoreboard'];
export const TV_WATCH = ['normal', 'long', 'track', 'bored'];
export const TV_TITLE_KINDS = ['news', 'drama', 'sport', 'special', 'plain'];
export const TV_SFX = ['homerun', 'cheer', 'click'];
export const EV_MAX = 500; // 한 칸에 사건을 만드는 반복의 최대 횟수 (끝나지 않는 반복 방지)

// 검사를 통과한 프로그램만 여기에 들어간다. 키는 프로그램 id
export const TVP = {};
// 검사 결과: [{ id, errors: [...] }] (편성에서 빠진 프로그램), 경고: ['...'] (프로그램은 그대로 나옴)
export const TV_PROBLEMS = [];
export const TV_WARNINGS = [];

const isNum = v => typeof v === 'number' && isFinite(v);
const isStr = v => typeof v === 'string' && v.length > 0;
const hasKey = k => isStr(k) && !!STR[k];

function normReact(r, where, warn) {
  if (r == null)
    return null;
  const o = typeof r === 'string' ? { type: r } : (r && typeof r === 'object' ? { ...r } : null);
  if (!o || !TV_REACT_NAMES.includes(o.type)) {
    warn(`${where}: 모르는 반응 ${JSON.stringify(r)} → 무시 (사건은 그대로 나옴)`);
    return null;
  }
  if (o.p != null && !(isNum(o.p) && o.p >= 0 && o.p <= 1)) {
    warn(`${where}: 반응 확률 p는 0~1 → 무시`);
    return null;
  }
  o.replace = !!o.replace;
  return o;
}
function normEvent(raw, where, err, warn) {
  if (!raw || typeof raw !== 'object')
    return err(`${where}: 사건이 객체가 아님`);
  const e = raw, bad = m => err(`${where}(${e.id || '?'}): ${m}`);
  if (!isStr(e.id))
    return bad('id가 없음');
  if (!(isNum(e.dur) && e.dur > 0))
    return bad('dur는 0보다 커야 함');
  if (![1, 2, 3].includes(e.size))
    return bad('size는 1·2·3');
  if (!Array.isArray(e.frames) || !e.frames.length || !e.frames.every(isStr))
    return bad('frames는 그림 이름(문자열) 1개 이상');
  if (e.cap != null && !hasKey(e.cap))
    return bad(`자막 번역 키 ${e.cap}가 번역 표(i18n.js)에 없음`);
  if (e.sfx != null && !TV_SFX.includes(e.sfx))
    warn(`${where}(${e.id}): 모르는 소리 ${e.sfx} → 소리 없음`);
  const capKey = e.cap || null;
  return {
    id: e.id, w: e.w, size: e.size, dur: e.dur, f: e.frames.slice(), once: !!e.once, score: !!e.score,
    sfx: TV_SFX.includes(e.sfx) ? e.sfx : null, react: normReact(e.react, `${where}(${e.id})`, warn), capKey,
    get cap() { return capKey ? tr(capKey) : null; }
  };
}
// 프로그램 하나 검사. 문제가 있으면 errors에 이유를 쌓고 null
export function checkProgram(id, raw, errors = [], warnings = []) {
  const err = m => {
    errors.push(m);
    return null;
  };
  const warn = m => warnings.push(m);
  if (!raw || typeof raw !== 'object')
    return err(`${id}: 프로그램이 객체가 아님`);
  if (!hasKey(raw.name))
    err(`${id}: 이름 번역 키 ${raw.name}가 번역 표에 없음`);
  if (!Array.isArray(raw.loop) || !raw.loop.length || !raw.loop.every(x => Array.isArray(x) && isStr(x[0]) && isNum(x[1]) && x[1] > 0))
    err(`${id}: loop는 [그림, 초(>0)] 1개 이상`);
  if (!Array.isArray(raw.gap) || raw.gap.length !== 2 || !raw.gap.every(isNum) || raw.gap[0] < 10 || raw.gap[1] < raw.gap[0])
    err(`${id}: gap은 [최소(10초 이상), 최대(최소 이상)]`);
  const evRaw = raw.events == null ? [] : raw.events;
  if (!Array.isArray(evRaw))
    err(`${id}: events는 목록`);
  const ev = (Array.isArray(evRaw) ? evRaw : []).map((e, i) => {
    const x = normEvent(e, `${id}.events[${i}]`, err, warn);
    if (x && !(isNum(x.w) && x.w >= 0))
      return err(`${id}.events[${i}](${x.id}): w는 0 이상`);
    return x;
  });
  const end = raw.end == null ? null : normEvent({ w: 0, ...raw.end }, `${id}.end`, err, warn);
  let overlay = raw.overlay == null ? [] : Array.isArray(raw.overlay) ? raw.overlay : [raw.overlay];
  overlay = overlay.map((o, i) => {
    if (!o || !TV_OVERLAYS.includes(o.type))
      return err(`${id}.overlay[${i}]: type은 ${TV_OVERLAYS.join('·')}`);
    if (o.type === 'scoreboard') {
      if (!hasKey(o.teams) || !Array.isArray(STR[o.teams].ko) || STR[o.teams].ko.length < 2)
        return err(`${id}.overlay: 점수판 teams 키 ${o.teams}가 번역 표에 없거나 팀이 둘이 아님`);
    }
    else if (!hasKey(o.text) || !Array.isArray(STR[o.text].ko) || !STR[o.text].ko.length)
      return err(`${id}.overlay: ${o.type} text 키 ${o.text}가 번역 표에 없거나 목록이 아님`);
    const key = o.type === 'scoreboard' ? o.teams : o.text;
    return { type: o.type, key, get list() { return tr(key); } };
  });
  const watch = raw.watch == null ? 'normal' : raw.watch;
  if (!TV_WATCH.includes(watch))
    err(`${id}: watch는 ${TV_WATCH.join('·')}`);
  const titleKind = raw.titleKind == null ? 'plain' : raw.titleKind;
  if (!TV_TITLE_KINDS.includes(titleKind))
    err(`${id}: titleKind는 ${TV_TITLE_KINDS.join('·')}`);
  if (errors.length)
    return null;
  const nameKey = raw.name, loop = raw.loop.map(([f, s]) => [f, s]);
  const P = {
    id, nameKey, get name() { return tr(nameKey); }, loop, loopT: Math.round(loop.reduce((a, x) => a + x[1], 0) * 1e9) / 1e9, // 0.2 + 4.4가 4.6000000000000005가 되지 않게
    ev, end, gap: raw.gap.slice(), overlay, watch, titleKind
  };
  P.frames = [...new Set([...loop.map(x => x[0]), ...ev.flatMap(e => e.f), ...(end ? end.f : [])])];
  P.ovl = t => overlay.find(o => o.type === t) || null;
  return P;
}
// programs.json 전체를 읽어 TVP를 채운다. 문제가 있는 프로그램은 빼고 경고
export function setPrograms(raw) {
  for (const k in TVP)
    delete TVP[k];
  TV_PROBLEMS.length = 0;
  TV_WARNINGS.length = 0;
  for (const k in tvDays)
    delete tvDays[k];
  if (!raw || typeof raw !== 'object')
    raw = {};
  for (const [id, p] of Object.entries(raw)) {
    const errors = [], warnings = [];
    const P = checkProgram(id, p, errors, warnings);
    TV_WARNINGS.push(...warnings);
    if (P)
      TVP[id] = P;
    else
      TV_PROBLEMS.push({ id, errors });
  }
  return { problems: TV_PROBLEMS, warnings: TV_WARNINGS };
}

/* ───────── 편성표 ───────── */
// [시작, 끝, 한 칸(시간), 후보]. 24시가 넘는 시각은 같은 방송일의 새벽. 'sports'는 평일 야구, 주말 축구
// 편성 데이터화는 TV_SCHEDULE_PLAN.md에서. 할로윈 특집(22~24시 horror)도 아래 tvSegs에
export const TV_GRID = [[5 + 10 / 60, 9, 0.5, ['news', 'news', 'drama']], [9, 12, 0.5, ['actress', 'news', 'drama']], [12, 18, 1, ['drama', 'football', 'actress', 'baseball']],
  [18, 21, 3, ['sports']], [21, 22, 1, ['drama']], [22, 23.5, 0.5, ['actress', 'drama', 'football']], [23.5, 24, 0.5, ['news']], [24, 24 + 55 / 60, 0.5, ['drama', 'actress', 'football']]];
export const TV_ON = 5, TV_PROG0 = 5 + 10 / 60, TV_PROG1 = 24 + 55 / 60; // 켜짐, 첫 칸, 마침 인사
export const tvH = d => {
  const h = hourOf(d);
  return h < 5 ? h + 24 : h;
}; // 방송일 기준 시각 (새벽 1시 = 25)
export const tvBday = d => hourOf(d) < 5 ? new Date(d.getTime() - 86400000) : d; // 새벽은 전날 방송일
export const fmtH = h => {
  const m = Math.round(h * 60) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
// 제목 규칙 (titleKind). 규칙 자체 정리는 편성 개선(TV_SCHEDULE_PLAN.md) 때
export function tvTitle(sg) {
  const p = TVP[sg.p];
  if (!p)
    return tr('tvgAdjust');
  switch (p.titleKind) {
    case 'drama': return tr(sg.s >= 21 && sg.s < 22 ? 'tvFirstRun' : 'tvRerun', { name: p.name });
    case 'news': return sg.s < 9 ? tr('tvMorning', { name: p.name }) : sg.s >= 23.5 ? tr('tvLate', { name: p.name }) : p.name;
    case 'sport': return tr(sg.s >= 18 && sg.s < 21 ? 'tvLive' : 'tvRerun', { name: p.name });
    case 'special': return tr('tvHorrorSpecial', { name: p.name });
    default: return p.name;
  }
}
// 본방(드라마 21~22시): 강고양이 씨가 TV 앞에 더 자주 간다
export const tvPrime = sg => !!(sg && TVP[sg.p] && TVP[sg.p].titleKind === 'drama' && sg.s >= 21 && sg.s < 22);
const resolve = (p, we) => p === 'sports' ? (we ? 'football' : 'baseball') : p;
const tvDays = {};
export function tvSegs(bd) {
  const hw = holiday(bd) === 'halloween', dk = dayKey(bd), k = dk + (hw ? ':hw' : '');
  if (tvDays[k])
    return tvDays[k];
  const we = isWeekend(bd), out = [];
  for (const [b0, b1, len, c] of TV_GRID) {
    for (let s = b0; s < b1 - 1e-6;) {
      const e = Math.min(b1, (Math.floor(s / len + 1e-6) + 1) * len), hv = hash('tv' + dk + ':' + s.toFixed(3));
      let p = resolve(c[Math.floor(hv * c.length)], we);
      if (!TVP[p]) { // 문제가 있어 빠진 프로그램: 같은 시간대의 다른 후보로. 후보가 모두 없으면 화면 조정(p = null)
        const ok = c.map(x => resolve(x, we)).filter(x => TVP[x]);
        p = ok.length ? ok[Math.floor(hv * ok.length)] : null;
      }
      if (hw && s >= 22 - 1e-6 && s < 24 - 1e-6 && TVP.horror)
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
// 프로그램 안의 사건: 날짜와 시작 시각으로 정해지므로 누구에게나 같다. 사건이 없는 프로그램도 된다
export function tvEvents(sg, k) {
  if (sg.evs)
    return sg.evs;
  const P = TVP[sg.p], ev = [];
  if (!P)
    return sg.evs = ev;
  const dur = (sg.e - sg.s) * 3600, seed = k + '@' + sg.s.toFixed(3), list = P.ev, tot = list.reduce((a, e) => a + e.w, 0), once = {};
  let t = 40 + hash(seed + 'a') * 90, i = 0;
  if (list.length && tot > 0) {
    while (t < dur - (P.end ? P.end.dur + 30 : 30) && i < EV_MAX) {
      let r = hash(seed + 'e' + i) * tot, e = list[0];
      for (const x of list) {
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
  }
  if (P.end && dur - P.end.dur > 0)
    ev.push({ at: dur - P.end.dur, e: P.end });
  return sg.evs = ev;
}
// 한 칸 안의 상태 (tIn: 칸 시작부터 초, k: 방송일 키). 미리보기 도구의 "틀어 보기"도 이것을 쓴다
export function progState(sg, tIn, k) {
  const evs = tvEvents(sg, k), score = [0, 0];
  let cur = null;
  for (const x of evs) {
    if (tIn >= x.at && tIn < x.at + x.e.dur)
      cur = x;
    if (x.e.score && tIn >= x.at + 1.5)
      score[hash(k + x.at) < 0.5 ? 0 : 1]++;
  }
  return { mode: 'prog', sg, p: sg.p, tIn, ev: cur, key: cur ? k + '@' + sg.s.toFixed(3) + ':' + cur.at.toFixed(1) : null, score };
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
  if (!TVP[sg.p])
    return { mode: 'adjust', sg }; // 이 칸에 틀 수 있는 프로그램이 없다
  return progState(sg, sec(sg.s), k);
}
// 평소 장면: [그림, 초]를 차례로 반복
export function loopFrame(P, t) {
  let u = t % P.loopT;
  for (const [f, s] of P.loop) {
    if (u < s)
      return f;
    u -= s;
  }
  return P.loop[P.loop.length - 1][0];
}
// 지금 보여줄 화면 그림 이름 (r/tv/이름.webp)
export function tvFrameName(st) {
  if (st.mode === 'prog') {
    if (st.ev) {
      const e = st.ev.e, u = clamp((st.tIn - st.ev.at) / e.dur, 0, 0.999);
      return e.f[Math.floor(u * e.f.length)];
    }
    return loopFrame(TVP[st.p], st.tIn);
  }
  return { testcard: 'screen_testcard', adjust: 'screen_testcard', signoff: 'screen_signoff', opening: 'screen_sunrise_1of2' }[st.mode] || 'screen_off';
}
// 프로그램 그림 목록 (미리 받기, 검사 스크립트)
export const programFrames = id => TVP[id] ? TVP[id].frames : [];
