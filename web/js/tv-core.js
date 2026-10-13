/* 강고양이 씨 TV · 방송 계산: 프로그램 표(r/tv/programs.json) 검사, 편성표, 사건, 지금 상태.
   화면·소리·고양이와 상관없는 계산만 둔다. 그래서 노드에서도 돌릴 수 있다 (tools/check_tv.mjs).
   방송은 실제 시계를 따른다. 같은 날 같은 시각이면 누가 열어도 같은 프로그램, 같은 장면이 나온다.
   05:00 탁 켜짐 → 화면조정 → 05:05 해 뜨는 오프닝 → 05:10부터 편성표 → 00:55 마침 인사 → 01:00 화면조정 → 01:02 꺼짐.
   낮잠 정파(r/tv/schedule.json의 nap, 하루 여러 번 가능): 마침 인사 5분 → 화면조정 2분 → 꺼짐 → 끝 5분 전 켜짐·화면조정 → 방송 다시.
   코드는 프로그램 이름을 보지 않고 성질(overlay, watch, 사건의 react·score·sfx)을 본다. TV_STABILITY_PLAN.md
   편성은 프로그램이 든 길이(runtime)·방영 조건(special·first·live·rerun·air)과 방송국 틀(schedule.json)로 짠다. TV_SCHEDULE_PLAN.md */
import { STR, tr } from './i18n.js';
import { dayKey, holiday, hourOf } from './time.js';
import { clamp, hash } from './util.js';

/* ───────── 프로그램 표 ───────── */
// 강고양이 씨 반응 이름. 실제 동작은 tv-cat.js의 REACT가 한다(이 목록과 같은 이름이어야 한다)
export const TV_REACT_NAMES = ['sulk', 'startle', 'heart', 'peekBehind', 'mimic:groom', 'mimic:stretch', 'pawScreen', 'pounce', 'doze'];
export const TV_OVERLAYS = ['ticker', 'subs', 'scoreboard', 'shop'];
export const TV_WATCH = ['normal', 'long', 'track', 'bored'];
// 방영 종류: 특집·본방·생중계·재방·그냥. 프로그램은 종류마다 조건 목록을 든다 ("first": [["평일", "21:00"]])
export const TV_KINDS = ['special', 'first', 'live', 'rerun', 'air'];
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
  const loopOK = l => Array.isArray(l) && l.length && l.every(x => Array.isArray(x) && isStr(x[0]) && isNum(x[1]) && x[1] > 0);
  if (raw.segments == null ? !loopOK(raw.loop) : raw.loop != null && !loopOK(raw.loop))
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
    if (o.type === 'shop') { // 홈쇼핑 띠: 상품 이름·가격(구간의 shop 키) + 전화번호(phone 키)
      if (!hasKey(o.phone))
        return err(`${id}.overlay: shop phone 키 ${o.phone}가 번역 표에 없음`);
      return { type: 'shop', key: o.phone, get list() { return tr(o.phone); } };
    }
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
  // 편성 정보 (TV_SCHEDULE_PLAN.md 4-1·4-2). 조건 토큰은 방송국 틀(schedule.json)을 알아야 해서 compileSlots에서
  const mins = v => Number.isInteger(v) && v > 0 && v <= 600;
  const hasSlots = TV_KINDS.some(k => raw[k] != null);
  if (raw.runtime != null ? !mins(raw.runtime) : hasSlots)
    err(`${id}: runtime(방송 한 편 길이, 분)은 1~600 정수${hasSlots && raw.runtime == null ? ' — 방영 조건이 있으면 꼭 필요' : ''}`);
  if (raw.rerunRuntime != null && !mins(raw.rerunRuntime))
    err(`${id}: rerunRuntime은 1~600 정수`);
  for (const k of ['flex', 'short'])
    if (raw[k] != null && typeof raw[k] !== 'boolean')
      err(`${id}: ${k}는 true·false`);
  const mx = raw.maxPerDay;
  if (mx != null && !(isNum(mx) && mx >= 0) && !(mx && typeof mx === 'object' && Object.entries(mx).every(([k, v]) => WD[k] && isNum(v) && v >= 0)))
    err(`${id}: maxPerDay는 분(숫자) 또는 { "평일": 분, "주말": 분 }`);
  let episodes = null;
  if (raw.episodes != null) {
    const e = raw.episodes, m = e && /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.from || '');
    if (!m || (e.season != null && !(Number.isInteger(e.season) && e.season >= 1)))
      err(`${id}: episodes는 { "from": "YYYY-MM-DD", "season": 숫자(없어도 됨) }`);
    else
      episodes = { from: new Date(+m[1], +m[2] - 1, +m[3], 12), season: e.season > 1 ? e.season : null };
  }
  for (const k of TV_KINDS)
    if (raw[k] != null && !Array.isArray(raw[k]))
      err(`${id}: ${k}는 조건 목록 (예: [["평일", "21:00"]])`);
  // 구간 (홈쇼핑 상품처럼 min분마다 장면 묶음이 바뀜). 순서는 요일마다 다르다 (segOrder)
  let segs = null;
  if (raw.segments != null) {
    const S = raw.segments;
    if (!S || !(Number.isInteger(S.min) && S.min > 0) || !Array.isArray(S.list) || !S.list.length)
      err(`${id}: segments는 { "min": 분, "list": [{ "id", "loop", "shop", "end" }…] }`);
    else
      segs = { min: S.min, list: S.list.map((x, i) => {
        const w = `${id}.segments.list[${i}]`;
        if (!x || !isStr(x.id) || !loopOK(x.loop))
          return err(`${w}: { "id": 이름, "loop": [[그림, 초]…] }`);
        if (x.shop != null && (!hasKey(x.shop) || !Array.isArray(STR[x.shop].ko) || STR[x.shop].ko.length < 2))
          return err(`${w}: shop 키 ${x.shop}가 번역 표에 없거나 [이름, 가격]이 아님`);
        const end = x.end == null ? null : normEvent({ w: 0, ...x.end }, `${w}.end`, err, warn), loop = x.loop.map(([f, s]) => [f, s]);
        return { id: x.id, loop, loopT: Math.round(loop.reduce((a, y) => a + y[1], 0) * 1e9) / 1e9, shopKey: x.shop || null, get shop() { return x.shop ? tr(x.shop) : null; }, end };
      }) };
  }
  if (errors.length)
    return null;
  const nameKey = raw.name, loop = (raw.loop || raw.segments.list[0].loop).map(([f, s]) => [f, s]);
  const P = {
    id, nameKey, get name() { return tr(nameKey); }, loop, loopT: Math.round(loop.reduce((a, x) => a + x[1], 0) * 1e9) / 1e9, // 0.2 + 4.4가 4.6000000000000005가 되지 않게
    ev, end, gap: raw.gap.slice(), overlay, watch,
    runtime: raw.runtime || 0, rerunRuntime: raw.rerunRuntime || 0, flex: !!raw.flex, short: !!raw.short, maxPerDay: mx == null ? null : mx, episodes, slots: [], raw, segs
  };
  P.frames = [...new Set([...loop.map(x => x[0]), ...ev.flatMap(e => e.f), ...(end ? end.f : []),
    ...(segs ? segs.list.flatMap(g => [...g.loop.map(x => x[0]), ...(g.end ? g.end.f : [])]) : [])])].filter(f => f !== '@'); // '@' = 지금 장면 그대로
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
  for (const k in epCache)
    delete epCache[k];
  for (const k in fixedDays)
    delete fixedDays[k];
  for (const k in segOrders)
    delete segOrders[k];
  if (!raw || typeof raw !== 'object')
    raw = {};
  RAWP = raw;
  for (const [id, p] of Object.entries(raw)) {
    if (id.startsWith('_')) // "_"로 시작하는 키는 메모
      continue;
    const errors = [], warnings = [];
    const P = checkProgram(id, p, errors, warnings);
    if (P)
      compileSlots(P, m => warnings.push(m));
    TV_WARNINGS.push(...warnings);
    if (P)
      TVP[id] = P;
    else
      TV_PROBLEMS.push({ id, errors });
  }
  for (const x of SCHED.station)
    if (!TVP[x.p])
      TV_WARNINGS.push(`schedule.json: 방송국 칸 ${fmtM(x.at)}의 프로그램 ${x.p}가 없음 → 그 칸은 다른 프로그램으로`);
  TV_WARNINGS.push(...TV_SCHED_WARN);
  return { problems: TV_PROBLEMS, warnings: TV_WARNINGS };
}
let RAWP = null;
// 방영 조건 → [{ kind, c }] (종류 순서, 그 안에서 적힌 순서). 모르는 토큰이 있는 조건은 경고하고 뺀다 (프로그램은 그대로)
function compileSlots(P, warn) {
  P.slots = [];
  for (const kind of TV_KINDS)
    (P.raw[kind] || []).forEach((c, i) => {
      const o = compileCond(c, `${P.id}.${kind}[${i}]`, warn);
      if (o)
        P.slots.push({ kind, c: o });
    });
  if (P.slots.some(x => x.kind === 'first' && x.c.at == null))
    warn(`${P.id}: 본방(first) 조건에 시각이 없음 → 회차를 셀 수 없음`);
  if (P.short && P.slots.some(x => x.c.at != null))
    warn(`${P.id}: 짧은 프로(short)는 시각 고정 조건을 쓰지 않음 → 틈 메우기에만 나옴`);
}

/* ───────── 방송국 틀 (r/tv/schedule.json) ───────── */
// 조건 토큰: 요일(월~일·평일·주말·매일) · 시간대(schedule.json dayparts) · 기간(periods) · 시각("21:00")
// 같은 종류끼리는 "또는", 다른 종류끼리는 "그리고". 시각이 있으면 "그 시각에 반드시", 없으면 "그 조건이면 나올 수 있다"
const WD = { 일: [0], 월: [1], 화: [2], 수: [3], 목: [4], 금: [5], 토: [6], 평일: [1, 2, 3, 4, 5], 주말: [0, 6], 매일: [0, 1, 2, 3, 4, 5, 6] };
export const TV_ON = 5, TV_PROG0 = 5 + 10 / 60, TV_PROG1 = 24 + 55 / 60; // 켜짐, 첫 칸, 마침 인사
export const SCHED = { ok: false, parts: {}, periods: {}, station: [], naps: [], seasons: { months: [3, 6, 9, 12], wd: 1 }, shortMax: 20, flexMin: 15, liveGuard: 120 };
export const TV_SCHED_WARN = [];
const hm = v => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(typeof v === 'string' ? v : '');
  return m && +m[2] < 60 ? +m[1] * 60 + +m[2] : NaN;
}; // "21:00" → 분. 방송일 기준이라 "24:30"(밤 12시 반)도 된다
const fmtM = m => fmtH(m / 60);
function compileCond(c, where, warn) {
  let toks = c, title = null;
  if (c && !Array.isArray(c) && typeof c === 'object') {
    toks = c.when;
    title = c.title == null ? null : c.title;
  }
  if (!Array.isArray(toks) || !toks.length || !toks.every(isStr)) {
    warn(`${where}: 조건은 토큰 목록 (예: ["평일", "21:00"]) → 무시`);
    return null;
  }
  const o = { days: null, parts: null, periods: null, at: null, title: null, src: toks.join(' ') };
  for (const t of toks) {
    if (WD[t])
      o.days = [...new Set([...(o.days || []), ...WD[t]])];
    else if (SCHED.parts[t])
      (o.parts = o.parts || []).push(SCHED.parts[t]);
    else if (SCHED.periods[t])
      (o.periods = o.periods || []).push(t);
    else if (!isNaN(hm(t))) {
      if (o.at != null) {
        warn(`${where}: 시각이 둘 (${o.src}) → 무시`);
        return null;
      }
      o.at = hm(t);
    }
    else {
      warn(`${where}: 모르는 토큰 "${t}" → 이 조건 무시`);
      return null;
    }
  }
  if (title != null) {
    if (hasKey(title))
      o.title = title;
    else
      warn(`${where}: 제목 틀 번역 키 ${title}가 번역 표에 없음 → 기본 제목`);
  }
  return o;
}
// schedule.json 전체를 읽어 SCHED를 채운다. 읽지 못하면 시간대·기간을 모르므로 모든 칸이 화면 조정으로 나온다(방은 그대로)
export function setSchedule(raw) {
  TV_SCHED_WARN.length = 0;
  for (const k in tvDays)
    delete tvDays[k];
  for (const k in fixedDays)
    delete fixedDays[k];
  const w = m => TV_SCHED_WARN.push('schedule.json: ' + m);
  if (!raw || typeof raw !== 'object') {
    w('읽지 못함 → 모든 칸 화면 조정');
    raw = {};
  }
  SCHED.ok = !!raw.dayparts;
  SCHED.parts = {};
  for (const [n, v] of Object.entries(raw.dayparts || {})) {
    const a = hm(v && v[0]), b = hm(v && v[1]);
    if (WD[n] || !(a < b))
      w(`시간대 ${n}: ["시작", "끝"] (끝이 더 늦게), 요일 이름은 못 씀`);
    else
      SCHED.parts[n] = { n, a, b };
  }
  SCHED.periods = {};
  for (const [n, v] of Object.entries(raw.periods || {})) {
    const md = x => {
      const m = /^(\d{2})-(\d{2})$/.exec(x || '');
      return m ? +m[1] * 100 + +m[2] : NaN;
    };
    let p = null;
    if (v && isStr(v.holiday))
      p = { holiday: v.holiday };
    else if (v && !isNaN(md(v.from)) && !isNaN(md(v.to)))
      p = { from: md(v.from), to: md(v.to) };
    else if (v && Array.isArray(v.dates) && v.dates.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x)))
      p = { dates: new Set(v.dates) };
    if (!p || WD[n] || SCHED.parts[n]) {
      w(`기간 ${n}: { "holiday" } · { "from": "MM-DD", "to": "MM-DD" } · { "dates": ["YYYY-MM-DD"…] } 중 하나`);
      continue;
    }
    p.title = null;
    if (v.title != null) {
      if (hasKey(v.title))
        p.title = v.title;
      else
        w(`기간 ${n}: 제목 틀 번역 키 ${v.title}가 번역 표에 없음`);
    }
    SCHED.periods[n] = p;
  }
  SCHED.station = (raw.station || []).filter((x, i) => {
    const ok = x && !isNaN(hm(x.at)) && Number.isInteger(x.min) && x.min > 0 && isStr(x.p) && (x.title == null || hasKey(x.title));
    if (!ok)
      w(`station[${i}]: { "at": "23:30", "min": 30, "p": 프로그램, "title": 번역 키 }`);
    return ok;
  }).map(x => ({ at: hm(x.at), min: x.min, p: x.p, title: x.title || null }));
  SCHED.naps = [];
  (Array.isArray(raw.nap) ? raw.nap : raw.nap ? [raw.nap] : []).forEach((n, i) => { // 낮잠 정파: 하나 또는 목록
    const a = hm(n && n.from), b = hm(n && n.to), c = compileCond((n && n.when) || ['매일'], `nap[${i}].when`, w);
    const ads = !n || n.adsBefore == null ? 0 : n.adsBefore;
    if (!(a + 7 < b - 5) || !c || !(Number.isInteger(ads) && ads >= 0 && ads <= 60) || SCHED.naps.some(x => a < x.b + 10 && b > x.a - 10))
      w(`nap[${i}]: { "when": [요일…], "from": "13:55", "to": "14:30", "adsBefore": 20 } (from+7분 < to-5분, adsBefore 0~60분, 다른 정파와 10분 넘게 떨어지게)`);
    else
      SCHED.naps.push({ a, b, c, ads });
  });
  SCHED.naps.sort((x, y) => x.a - y.a);
  const se = raw.seasons || {};
  SCHED.seasons = { months: [3, 6, 9, 12], wd: 1 };
  if (raw.seasons) {
    if (Array.isArray(se.months) && se.months.length && se.months.every(m => Number.isInteger(m) && m >= 1 && m <= 12) && WD[se.weekday] && WD[se.weekday].length === 1)
      SCHED.seasons = { months: se.months.slice().sort((a, b) => a - b), wd: WD[se.weekday][0] };
    else
      w('seasons: { "months": [3, 6, 9, 12], "weekday": "월" } → 기본값');
  }
  SCHED.shortMax = isNum(raw.shortMax) && raw.shortMax >= 0 ? raw.shortMax : 20;
  SCHED.flexMin = isNum(raw.flexMin) && raw.flexMin >= 0 ? raw.flexMin : 15;
  SCHED.liveGuard = isNum(raw.liveGuard) && raw.liveGuard >= 0 ? raw.liveGuard : 120;
  if (RAWP) // 프로그램을 먼저 읽었으면 조건을 다시 읽는다
    setPrograms(RAWP);
  return TV_SCHED_WARN;
}
const dayOK = (c, bd) => (!c.days || c.days.includes(bd.getDay())) && (!c.periods || c.periods.some(n => periodOn(n, bd)));
const partOK = (c, m) => !c.parts || c.parts.some(p => m >= p.a && m < p.b);
export function periodOn(n, bd) {
  const p = SCHED.periods[n];
  if (!p)
    return false;
  if (p.holiday)
    return holiday(bd) === p.holiday;
  if (p.dates)
    return p.dates.has(`${bd.getFullYear()}-${String(bd.getMonth() + 1).padStart(2, '0')}-${String(bd.getDate()).padStart(2, '0')}`);
  const md = (bd.getMonth() + 1) * 100 + bd.getDate();
  return p.from <= p.to ? md >= p.from && md <= p.to : md >= p.from || md <= p.to;
}
// 개편: 지금 시즌이 시작한 날 (months 달의 첫 weekday). 시즌 동안 같은 요일이면 같은 편성
export function tvSeasonStart(bd) {
  const d0 = new Date(bd.getFullYear(), bd.getMonth(), bd.getDate(), 12);
  let best = null;
  for (const y of [d0.getFullYear() - 1, d0.getFullYear()])
    for (const m of SCHED.seasons.months) {
      const s = new Date(y, m - 1, 1, 12);
      while (s.getDay() !== SCHED.seasons.wd)
        s.setDate(s.getDate() + 1);
      if (s <= d0 && (!best || s > best))
        best = s;
    }
  return best;
}

/* ───────── 편성표 ───────── */
export const tvH = d => {
  const h = hourOf(d);
  return h < 5 ? h + 24 : h;
}; // 방송일 기준 시각 (새벽 1시 = 25)
export const tvBday = d => hourOf(d) < 5 ? new Date(d.getTime() - 86400000) : d; // 새벽은 전날 방송일
export const fmtH = h => {
  const m = Math.round(h * 60) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
// 제목: 칸이 어떤 조건으로 나왔는지(kind)와 조건·방송국 칸·기간이 정한 틀(titleKey). 시각 규칙은 없다
export function tvTitle(sg) {
  const P = TVP[sg.p];
  if (!P)
    return tr('tvgAdjust');
  let name = P.name;
  if (sg.ep)
    name = P.episodes && P.episodes.season ? tr('tvSeasonEp', { name, season: P.episodes.season, ep: sg.ep }) : tr('tvEp', { name, ep: sg.ep });
  if (sg.titleKey)
    return tr(sg.titleKey, { name });
  switch (sg.kind) {
    case 'first': return tr('tvFirstRun', { name });
    case 'live': return tr('tvLive', { name });
    case 'rerun': return tr(P.rerunRuntime && P.rerunRuntime !== P.runtime ? 'tvHighlight' : 'tvRerun', { name });
    case 'special': return tr('tvSpecial', { name });
    default: return name;
  }
}
// 본방: 강고양이 씨가 TV 앞에 더 자주 간다
export const tvPrime = sg => !!(sg && TVP[sg.p] && sg.kind === 'first');
export const tvRunFor = (P, kind) => kind === 'rerun' && P.rerunRuntime ? P.rerunRuntime : P.runtime;
export const tvCap = (P, bd) => {
  const m = P.maxPerDay;
  if (m == null)
    return Infinity;
  if (isNum(m))
    return m;
  const k = Object.keys(m).find(x => WD[x].includes(bd.getDay()));
  return k ? m[k] : Infinity;
};
// 하루 편성 (minutes는 방송일 0시부터 분). 정해진 난수의 씨앗은 날짜가 아니라 "시즌 + 요일" → 시즌 동안 매주 같다
const tvDays = {}, fixedDays = {};
// 그날의 고정 칸(낮잠 정파·특집·시각 고정·방송국 칸). 채우기 전 단계라 가볍다 (회차 세기도 이것을 쓴다)
function fixedOf(bd) {
  const key = dayKey(bd) + ':' + (holiday(bd) || '');
  if (fixedDays[key])
    return fixedDays[key];
  if (Object.keys(fixedDays).length > 3000)
    for (const k in fixedDays)
      delete fixedDays[k];
  const on = Math.round(TV_PROG0 * 60), off = Math.round(TV_PROG1 * 60), progs = Object.values(TVP), conflicts = [];
  // 1. 낮잠 정파
  const naps = SCHED.naps.filter(n => dayOK(n.c, bd) && n.a > on && n.b < off).map(n => ({ a: n.a, b: n.b, ads: n.ads }));
  const wins = [];
  let w0 = on;
  for (const n of naps) {
    wins.push([w0, n.a]);
    w0 = n.b;
  }
  wins.push([w0, off]);
  const inWin = (s, e) => wins.some(([a, b]) => s >= a && e <= b);
  // 2. 고정 칸: 기간(특집) > 시각 고정(방송국 칸 포함) > 자유 편성. 같은 등급끼리 겹치면 먼저 적힌 쪽
  const want = [];
  SCHED.station.forEach(x => TVP[x.p] && want.push({ p: x.p, s: x.at, e: x.at + x.min, kind: 'air', titleKey: x.title, prio: 1, station: true, why: `방송국 칸 ${fmtM(x.at)} ${x.p}` }));
  for (const P of progs)
    for (const sl of P.slots)
      if (sl.c.at != null && dayOK(sl.c, bd)) {
        const per = sl.c.periods && sl.c.periods.find(n => periodOn(n, bd));
        want.push({ p: P.id, s: sl.c.at, e: sl.c.at + tvRunFor(P, sl.kind), kind: sl.kind, titleKey: sl.c.title || (per && SCHED.periods[per].title) || null,
          prio: sl.c.periods ? 2 : 1, why: `${P.id}.${sl.kind} [${sl.c.src}]` });
      }
  want.sort((x, y) => y.prio - x.prio);
  const fixed = [];
  for (const c of want) {
    if (!inWin(c.s, c.e)) {
      conflicts.push(`${c.why}: ${naps.some(n => c.s < n.b && c.e > n.a) ? '낮잠 정파와 겹침' : '방송 시간 밖'} → 뺌`);
      continue;
    }
    const hit = fixed.find(f => c.s < f.e && c.e > f.s);
    if (hit) {
      if (hit.prio === c.prio)
        conflicts.push(`${c.why}: 같은 등급인 ${hit.why}와 겹침 → 뺌`);
      continue;
    }
    fixed.push(c);
  }
  fixed.sort((a, b) => a.s - b.s);
  return fixedDays[key] = { naps, wins, fixed, conflicts };
}
function buildDay(bd) {
  const ss = tvSeasonStart(bd), seed = 'tvw' + (ss ? dayKey(ss) : '-') + ':' + bd.getDay(), hv = k => hash(seed + ':' + k);
  const progs = Object.values(TVP), fx = fixedOf(bd), { naps, wins, fixed } = fx, conflicts = fx.conflicts.slice();
  // 3. 남은 시간 채우기
  const used = {}, lives = fixed.filter(f => f.kind === 'live');
  const slotAt = (P, t) => P.slots.find(sl => sl.c.at == null && dayOK(sl.c, bd) && partOK(sl.c, t));
  // 정규 길이로 들어갈 수 있는 프로그램 (같은 프로그램 연달아 금지, 하루 상한, 생중계 앞 같은 종목 재방 금지)
  const shortRuns = [...new Set(progs.filter(P => P.short).map(P => P.runtime))];
  const shortFits = r => {
    if (r <= 0 || r >= SCHED.flexMin)
      return true;
    const ok = [true]; // 짧은 프로 길이들로 r분을 딱 만들 수 있나
    for (let m = 1; m <= r; m++)
      ok[m] = shortRuns.some(x => x <= m && ok[m - x]);
    return !!ok[r];
  };
  const fullOpts = (t, R, prev, next, end) => {
    const res = [];
    for (const P of progs) {
      if (P.short || P.id === prev)
        continue;
      const sl = slotAt(P, t);
      if (!sl)
        continue;
      const d = tvRunFor(P, sl.kind);
      if (d > R || (t + d === end && P.id === next) || (used[P.id] || 0) + d > tvCap(P, bd))
        continue;
      if (!shortFits(end - (t + d))) // 뒤에 flex(flexMin분 이상)로도 짧은 프로로도 못 채울 자투리를 남기지 않는다
        continue;
      if (sl.kind === 'rerun' && lives.some(l => l.p === P.id && l.s >= t + d && l.s - (t + d) < SCHED.liveGuard))
        continue;
      res.push({ p: P.id, d, kind: sl.kind, titleKey: sl.c.title, r: hv(P.id + '@' + t) });
    }
    return res.sort((x, y) => x.r - y.r);
  };
  // 틈 [t, t+L): 짧은 프로(합 shortMax까지, 정시 바로 앞) + flex 프로그램을 틈 길이로 줄여서. 안 되면 짧은 프로만으로. 그래도 안 되면 null
  const shortsChain = (t, cap, last, k) => {
    const out = [];
    let sum = 0, prev = last;
    for (let i = 0; i < 40; i++) {
      const seen = id => out.some(x => x.p === id) ? 1 : 0; // 한 블록 안에서는 아직 안 나온 짧은 프로부터
      const c = progs.filter(P => P.short && P.id !== prev && sum + P.runtime <= cap && slotAt(P, t + sum))
        .sort((x, y) => seen(x.id) - seen(y.id) || hv(x.id + '#' + k + t + ':' + i) - hv(y.id + '#' + k + t + ':' + i));
      if (!c.length)
        break;
      const sl = slotAt(c[0], t + sum);
      out.push({ p: c[0].id, s: t + sum, e: t + sum + c[0].runtime, kind: sl.kind, titleKey: sl.c.title, short: true });
      sum += c[0].runtime;
      prev = c[0].id;
    }
    return { out, sum };
  };
  const gapPieces = (t, L, prev, next) => {
    const sh = shortsChain(t, noShorts.has(t + L) ? 0 : Math.min(L, SCHED.shortMax), null, 'a').out, sums = [0];
    sh.forEach(x => sums.push(sums[sums.length - 1] + (x.e - x.s)));
    const flexFor = (F, nShort) => progs.filter(P => P.flex && !P.short && P.id !== prev && !(nShort === 0 && P.id === next) && P.runtime >= F && slotAt(P, t))
      .sort((x, y) => hv(x.id + '~' + t) - hv(y.id + '~' + t))[0];
    const withFlex = (n, fx) => {
      const F = L - sums[n], sl = slotAt(fx, t);
      return [{ p: fx.id, s: t, e: t + F, kind: sl.kind, titleKey: sl.c.title, flex: true }, ...sh.slice(0, n).map(x => ({ ...x, s: x.s + F, e: x.e + F }))];
    };
    // 짧은 프로를 많이 쓰는 쪽부터. flex 조각은 flexMin분 이상만 (5분짜리 뉴스 같은 것은 안 만든다)
    for (let n = sh.length; n >= 0; n--) {
      const F = L - sums[n];
      if (F === 0)
        return sh.slice(0, n);
      const fx = F >= SCHED.flexMin && flexFor(F, n);
      if (fx)
        return withFlex(n, fx);
    }
    const all = shortsChain(t, L, prev, 'b'); // 짧은 프로만으로 딱 맞게
    if (all.sum === L)
      return all.out;
    for (let n = sh.length; n >= 0; n--) { // 마지막 수단: 짧은 flex 조각도 허용
      const fx = flexFor(L - sums[n], n);
      if (fx)
        return withFlex(n, fx);
    }
    return null;
  };
  const fillGap = (a, b, prev0, next) => {
    let budget = 3000;
    const go = (t, prev) => {
      if (t >= b)
        return [];
      if (--budget < 0)
        return null;
      const R = b - t, nh = Math.ceil(t / 60) * 60;
      if (nh > t && nh < b) { // 정시가 아니면 다음 정시까지 틈 메우기
        const g = gapPieces(t, nh - t, prev, null), rest = g && go(nh, g.length ? g[g.length - 1].p : prev);
        return rest ? [...g, ...rest] : null;
      }
      for (const o of fullOpts(t, R, prev, next, b)) {
        used[o.p] = (used[o.p] || 0) + o.d;
        const rest = go(t + o.d, o.p);
        if (rest)
          return [{ p: o.p, s: t, e: t + o.d, kind: o.kind, titleKey: o.titleKey }, ...rest];
        used[o.p] -= o.d;
      }
      const L = Math.min(R, 60), g = gapPieces(t, L, prev, t + L >= b ? next : null), rest = g && go(t + L, g.length ? g[g.length - 1].p : prev);
      return rest ? [...g, ...rest] : null;
    };
    const res = go(a, prev0);
    if (!res)
      conflicts.push(`${fmtM(a)}–${fmtM(b)}: 채울 프로그램이 없음 → 화면 조정`);
    return res || [{ p: null, s: a, e: b, kind: 'air' }];
  };
  const pieces = [...fixed];
  // 정파 직전 광고 블록 (nap.adsBefore분): 짧은 프로만으로 딱 맞게. 그 앞 구간은 짧은 프로를 더 붙이지 않는다
  const noShorts = new Set();
  const win = wins.map(w => w.slice());
  naps.forEach((n, i) => {
    if (!n.ads)
      return;
    const a0 = n.a - n.ads, ch = shortsChain(a0, n.ads, null, 'n' + i);
    if (ch.sum === n.ads && !fixed.some(f => f.s < n.a && f.e > a0) && a0 > win[i][0]) {
      pieces.push(...ch.out);
      win[i][1] = a0;
      noShorts.add(a0);
    }
  });
  for (const [a, b] of win) {
    let t = a, prev = null;
    for (const f of [...fixed.filter(f => f.s >= a && f.e <= b), null]) {
      const end = f ? f.s : b;
      if (end > t)
        pieces.push(...fillGap(t, end, prev, f ? f.p : null));
      if (f) {
        prev = f.p;
        t = f.e;
      }
    }
  }
  pieces.sort((x, y) => x.s - y.s);
  const segs = pieces.map(x => ({ p: x.p, s: x.s / 60, e: x.e / 60, kind: x.kind, titleKey: x.titleKey || null, fixed: !!x.prio, station: !!x.station, flex: !!x.flex, short: !!x.short }));
  segs.forEach(sg => sg.wd = bd.getDay()); // 요일 (홈쇼핑 상품 순서 등)
  return { segs, naps, conflicts, season: ss };
}
/* 드라마 회차 (TV_SCHEDULE_PLAN.md 4-6): episodes.from부터 센 본방 순번. 낮 재방은 직전 본방 회차,
   본방이 없는 날(주말)은 그 주 회차를 차례로 몰아보기. 날짜로 계산하므로 누구에게나 같다 */
const epCache = {};
const firstSlot = (P, bd) => fixedOf(bd).fixed.find(f => f.p === P.id && f.kind === 'first'); // 그날 실제로 나간 본방 (특집에 밀린 날은 없음)
function epUpTo(P, bd) { // from ~ bd(포함) 사이 본방 수
  const k = P.id + ':' + dayKey(bd);
  if (epCache[k] != null)
    return epCache[k];
  const f = P.episodes.from, d = new Date(f);
  let n = 0;
  while (d <= bd || dayKey(d) === dayKey(bd)) {
    if (firstSlot(P, d))
      n++;
    if (dayKey(d) === dayKey(bd))
      break;
    d.setDate(d.getDate() + 1);
  }
  return epCache[k] = n;
}
const dayBefore = (bd, n = 1) => new Date(bd.getFullYear(), bd.getMonth(), bd.getDate() - n, 12);
function assignEpisodes(bd, segs) {
  for (const P of Object.values(TVP)) {
    if (!P.episodes || !segs.some(s => s.p === P.id))
      continue;
    const day0 = new Date(bd.getFullYear(), bd.getMonth(), bd.getDate(), 12);
    if (day0 < P.episodes.from)
      continue;
    const fs = firstSlot(P, day0);
    if (fs) {
      const today = epUpTo(P, day0), before = epUpTo(P, dayBefore(day0));
      segs.filter(s => s.p === P.id).forEach(s => {
        s.ep = s.kind === 'first' || s.s * 60 >= fs.s ? today : before;
      });
      continue;
    }
    // 본방이 없는 날: 지난 본방 날까지 거슬러 가며 이 몰아보기에서 몇 번째 재방인지 센다
    let k = 0, back = 1, last = null;
    for (; back <= 14; back++) {
      const d = dayBefore(day0, back);
      if (d < P.episodes.from)
        break;
      if (firstSlot(P, d)) {
        last = d;
        break;
      }
      k += tvSegs(d).filter(s => s.p === P.id && s.kind === 'rerun').length;
    }
    if (!last)
      continue;
    const lastEp = epUpTo(P, last);
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const d = dayBefore(last, i);
      if (d >= P.episodes.from && firstSlot(P, d))
        n++;
    }
    segs.filter(s => s.p === P.id && s.kind === 'rerun').forEach(s => {
      s.ep = lastEp - n + 1 + (k++ % n);
    });
  }
}
// 하루 편성: { segs, nap, conflicts, season }. 같은 방송일이면 누구에게나 같다
export function tvDay(bd) {
  const k = dayKey(bd) + ':' + (holiday(bd) || '');
  if (tvDays[k])
    return tvDays[k];
  if (Object.keys(tvDays).length > 20)
    for (const kk in tvDays)
      delete tvDays[kk];
  const day = tvDays[k] = buildDay(bd);
  assignEpisodes(bd, day.segs);
  day.segs.forEach(sg => Object.defineProperty(sg, 'title', { get: () => tvTitle(sg) })); // 언어를 바꾸면 바로 따라가도록 그때그때 만든다
  return day;
}
export const tvSegs = bd => tvDay(bd).segs;
export const tvNaps = bd => tvDay(bd).naps;
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
  if (P.segs) { // 구간 끝 장면 (등산 정상 같은 것)
    const L = P.segs.min * 60;
    for (let i = 0; (i + 1) * L <= dur + 1e-6; i++) {
      const g = segAt(P, sg, i * L + 1).g;
      if (g.end && g.end.dur < L)
        ev.push({ at: (i + 1) * L - g.end.dur, e: g.end });
    }
  }
  if (P.end && dur - P.end.dur > 0)
    ev.push({ at: dur - P.end.dur, e: P.end });
  return sg.evs = ev;
}
// 구간 순서: 요일마다 다르게 (일주일 7가지가 서로 다르게), 정해진 난수라 매주 같은 요일엔 같은 순서
const segOrders = {};
export function segOrder(P, wd) {
  if (!segOrders[P.id]) {
    const n = P.segs.list.length, seen = new Set(), out = [];
    for (let d = 0; d < 7; d++) {
      let ord, tries = 0;
      do {
        ord = [...Array(n).keys()].map(i => [hash(P.id + ':ord:' + d + ':' + tries + ':' + i), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
        tries++;
      } while (seen.has(ord.join()) && tries < 60);
      seen.add(ord.join());
      out.push(ord);
    }
    segOrders[P.id] = out;
  }
  return segOrders[P.id][((wd == null ? 1 : wd) % 7 + 7) % 7];
}
// 칸 안 tIn초에 나오는 구간: { g: 구간, i: 몇 번째, t: 구간 시작부터 초 }
export function segAt(P, sg, tIn) {
  const L = P.segs.min * 60, i = Math.max(0, Math.floor(tIn / L)), ord = segOrder(P, sg.wd);
  return { g: P.segs.list[ord[i % ord.length]], i, t: tIn - i * L };
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
  const day = tvDay(bd), Hm = H * 60, nap = day.naps.find(n => Hm >= n.a && Hm < n.b);
  if (nap) { // 낮잠 정파: 마침 인사 5분 → 화면조정 2분 → 꺼짐 → 5분 전 켜짐·화면조정
    const since = m => (Hm - m) * 60;
    if (Hm < nap.a + 5)
      return { mode: 'signoff', nap: true, napTo: nap.b };
    if (Hm < nap.a + 7)
      return { mode: 'testcard', beep: since(nap.a + 5), nap: true, napTo: nap.b };
    if (Hm < nap.b - 5)
      return { mode: 'off', tOff: since(nap.a + 7), nap: true, napTo: nap.b };
    return { mode: 'testcard', tOn: since(nap.b - 5), nap: true, napTo: nap.b };
  }
  const sg = day.segs.find(s => H >= s.s && H < s.e);
  if (!sg)
    return { mode: 'signoff' };
  if (!TVP[sg.p])
    return { mode: 'adjust', sg }; // 이 칸에 틀 수 있는 프로그램이 없다
  return progState(sg, sec(sg.s), k);
}
// 평소 장면: [그림, 초]를 차례로 반복
export function loopFrame(P, t) { // P: 프로그램 또는 구간 (loop·loopT)
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
    const P = TVP[st.p];
    if (st.ev) {
      const e = st.ev.e, u = clamp((st.tIn - st.ev.at) / e.dur, 0, 0.999), f = e.f[Math.floor(u * e.f.length)];
      if (f !== '@') // '@' = 자막만, 장면은 그대로
        return f;
    }
    if (P.segs) {
      const s = segAt(P, st.sg, st.tIn);
      return loopFrame(s.g, s.t);
    }
    return loopFrame(P, st.tIn);
  }
  return { testcard: 'screen_testcard', adjust: 'screen_testcard', signoff: 'screen_signoff', opening: 'screen_sunrise_1of2' }[st.mode] || 'screen_off';
}
// 프로그램 그림 목록 (미리 받기, 검사 스크립트)
export const programFrames = id => TVP[id] ? TVP[id].frames : [];
