/* 시간: 방 시계, 지역·계절·해 뜨고 지는 시각, 시간대(자연 시간), 만득 씨 생활 시간표, "하루" 세 가지, 달력(기간·순간·명절),
   비·눈, 상자 있는 날, 기념일, 햇빛 조각, 하늘색과 어둠, 달 모양. 기준은 TIME_BASE_PLAN.md.
   규칙: 이 파일과 calendar.js 밖에서는 getMonth·getDate·getDay·getHours·hourOf를 직접 쓰지 않는다 (tools/check_time.mjs) */
import { CAL } from './calendar.js';
import { clamp, hash, lerp, lerpCol, store } from './util.js';
/* ───────── 시간 ───────── */
/* 시계는 둘이다 (CLOCK_PLAN.md)
   - 방 시계 now(): "몇 시인가". 매번 기기 시계를 읽는다 = 기기 시계 + offset. 평소 offset은 0
   - 애니메이션 시계: advanceClock()이 돌려주는 real(초, 한 장면 최대 0.1). "얼마나 움직였나"에 쓴다.
     화면이 꺼졌다 켜져도 동작이 한꺼번에 튀지 않게 제한을 둔다 */
export let speed = 1, lastReal = performance.now();
let offset = 0; // 방 시계 - 기기 시계 (ms). 미리보기 도구로 시각을 옮기거나 빨리 감을 때만 0이 아니다
export const now = () => new Date(Date.now() + offset);
// 실제로 흐른 시간(초, 최대 0.1)을 돌려준다. 빨리 감기 중이면 방 시계를 그만큼 더 앞으로
export function advanceClock(tNow) {
  const real = Math.min(0.1, Math.max(0, (tNow - lastReal) / 1000));
  lastReal = tNow;
  if (speed !== 1)
    offset += real * 1000 * (speed - 1); // 기기 시계가 이미 1배로 흐르니 나머지만
  return real;
}
export function resetClock(tNow) {
  lastReal = tNow;
}
/* 시간 점프 감지: 매 장면, 방 시계가 기대(real × speed)보다 JUMP_MS 넘게 어긋났거나
   시간대 오프셋(서머타임)이 바뀌었으면 직전 방 시각을 돌려준다. 아니면 null */
const JUMP_MS = 5000;
let lastMs = null, lastTz = null;
export function clockJump(real) {
  const d = now(), ms = d.getTime(), tz = d.getTimezoneOffset();
  let prev = null;
  if (lastMs !== null && (Math.abs(ms - lastMs - real * 1000 * speed) > JUMP_MS || tz !== lastTz))
    prev = new Date(lastMs);
  lastMs = ms;
  lastTz = tz;
  return prev;
}
// 지금 방 시각을 "본 것"으로 적어 둔다 (다음 장면에서 점프로 잡지 않게)
export function markClock() {
  const d = now();
  lastMs = d.getTime();
  lastTz = d.getTimezoneOffset();
}
// 미리보기 도구
export function setSpeed(v) {
  speed = v;
}
// 방 시계를 ms로 옮긴다. 이후에도 실제 시각과 같은 속도로 흐른다. 점프 정리는 부르는 쪽에서 (jump.js timeJumped)
export function setSimMs(ms) {
  offset = ms - Date.now();
  markClock();
}
// 실제 시각으로 돌아오기
export function resetSim() {
  offset = 0;
  speed = 1;
  markClock();
}
/* ───────── 지역 (TIME_BASE_PLAN.md 3·4장) ─────────
   계절은 방문자 지역(남반구 시간대면 뒤집음), 달은 한국(고양시) 하늘, 명절은 한국 달력 */
export const REGION = {
  season: 'local',   // 'local' = 방문자 시간대의 반구, 'korea' = 한국 고정
  moon: 'korea',     // 'korea' = 차오르는 달 오른쪽이 빛남, 'local' = 방문자 반구
  holidays: 'korea'
};
const TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  }
  catch (e) {
    return '';
  }
})();
// 기기 시간대가 남반구인가. REGION을 거쳐서만 쓴다 (season, MOON_SOUTH, seasonSouth)
const SOUTH = /^(Australia|Antarctica|Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Noumea)|America\/(Argentina|Santiago|Sao_Paulo|Montevideo|Asuncion|La_Paz|Lima)|Africa\/(Johannesburg|Maputo|Harare|Windhoek|Gaborone|Lusaka)|Indian\/(Mauritius|Reunion))/.test(TZ);
export const seasonSouth = () => REGION.season === 'local' && SOUTH;
export const hourOf = d => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
export const dayKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
export const dayNum = d => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
export let seasonOverride = null, holidayOverride = null;
export function season(d) {
  if (seasonOverride)
    return seasonOverride;
  const m = d.getMonth();
  let s = m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
  if (seasonSouth())
    s = { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' }[s];
  return s;
}
// 계절 이름은 i18n.js의 season
/* ───────── 한 해 위치·풍경 날짜 (WINDOW_PLAN_3.md 4장) ─────────
   yearPos: 그해 1월 1일 0 → 12월 31일 (1 − 하루). 남반구면 반년(0.5)을 민다 → "풍경 날짜"는 언제나 한국 달력처럼 읽는다.
   풍경(산 섞기·낙엽·철새·눈 모자…)과 해 시각이 이것을 쓴다. 날짜 단위라 하루 안에서는 바뀌지 않는다.
   덮어쓰기: 미리보기 "풍경 날짜"(sceneryOverride, 0~1)가 먼저, 그다음 계절 버튼(seasonOverride → 대표 날짜) */
const leapYear = y => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const MD_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]; // 평년 각 달 1일의 날 번호
// 'MM-DD' → 풍경 위치(평년 365일 기준 0~1)
export const posOf = md => {
  const [m, dd] = md.split('-').map(Number);
  return (MD_START[m - 1] + dd - 1) / 365;
};
// 풍경 위치 → 'MM-DD' (미리보기 한 줄)
export function mdOfPos(p) {
  const n = Math.floor((((p % 1) + 1) % 1) * 365 + 1e-6);
  let m = 11;
  while (MD_START[m] > n)
    m--;
  return String(m + 1).padStart(2, '0') + '-' + String(n - MD_START[m] + 1).padStart(2, '0');
}
// 계절 버튼의 대표 날짜 (풍경 날짜. 가을은 단풍 절정)
export const SEASON_DATE = { spring: '04-15', summer: '07-15', autumn: '11-01', winter: '01-15' };
export let sceneryOverride = null; // 미리보기 "풍경 날짜" (0~1) 또는 null
export function yearPos(d) {
  if (sceneryOverride !== null)
    return sceneryOverride;
  if (seasonOverride)
    return posOf(SEASON_DATE[seasonOverride]);
  const y = d.getFullYear(), n = Math.round((Date.UTC(y, d.getMonth(), d.getDate()) - Date.UTC(y, 0, 1)) / 864e5);
  const p = n / (leapYear(y) ? 366 : 365);
  return seasonSouth() ? (p + 0.5) % 1 : p;
}
// 풍경 날짜 'MM-DD' (남반구는 반년 민 값)
export const sceneryDate = d => mdOfPos(yearPos(d));
// 위치 p가 범위 { from, to }('MM-DD', 양끝 포함, 해를 넘겨도 됨) 안인가. 안이면 0~1 진행도, 밖이면 -1
function rangeProgress(r, p) {
  const a = posOf(r.from), b = posOf(r.to) + 1 / 365, len = ((b - a) % 1 + 1) % 1 || 1, x = ((p - a) % 1 + 1) % 1;
  return x < len ? x / len : -1;
}
// 그 풍경 날짜 범위 안인가 (calendar.js CAL.scenery의 이름). 다른 파일은 getMonth 대신 이것만 쓴다
export const sceneryOn = (name, d) => !!CAL.scenery[name] && rangeProgress(CAL.scenery[name], yearPos(d)) >= 0;
// 범위 안 진행도 0~1 (밖이면 -1)
export const sceneryProgress = (name, d) => CAL.scenery[name] ? rangeProgress(CAL.scenery[name], yearPos(d)) : -1;
/* 해 뜨고 지는 시각: 동지(7.2, 17.2) ↔ 하지(5.5, 20.0)를 코사인 곡선으로 (TIME_BASE_PLAN.md 12장 숙제, WINDOW_PLAN_3.md 4-3).
   춘분·추분 무렵은 예전 봄·가을 값(6.3, 18.6)과 거의 같다. 하루 변화는 최대 1.5분 */
const SUN_WINTER = [7.2, 17.2], SUN_SUMMER = [5.5, 20], WINTER_SOLSTICE = posOf('12-21');
export function sunTimes(d) {
  const k = (1 + Math.cos(2 * Math.PI * (yearPos(d) - WINTER_SOLSTICE))) / 2; // 동지 1 → 하지 0
  return [lerp(SUN_SUMMER[0], SUN_WINTER[0], k), lerp(SUN_SUMMER[1], SUN_WINTER[1], k)];
}
/* ───────── 시간대 (자연 시간, TIME_BASE_PLAN.md 5장) ─────────
   그날의 해 뜨는 시각 r, 지는 시각 s(sunTimes)로 나눈다. 경계 숫자는 이 표에서만 고친다.
   [이름, 기준('r' 해 뜸 · 's' 해 짐 · 0 시계), 기준에서 몇 시간]. 시작 순서대로, 다음 칸의 시작이 이 칸의 끝 */
export const DAYPARTS = [
  ['late', 0, 0],          // 한밤      0 ~ r − 1
  ['dawn', 'r', -1],       // 새벽(동틀 녘) r − 1 ~ r + 0.5
  ['morning', 'r', 0.5],   // 아침      r + 0.5 ~ 11
  ['day', 0, 11],          // 낮        11 ~ s − 1.5
  ['dusk', 's', -1.5],     // 해질녘    s − 1.5 ~ s + 0.5
  ['evening', 's', 0.5],   // 저녁      s + 0.5 ~ 22
  ['night', 0, 22]         // 밤        22 ~ 24
];
// 그날 시간대마다 시작 시각 [[이름, 시작], ...]
export function daypartStarts(d) {
  const [r, s] = sunTimes(d);
  return DAYPARTS.map(([n, base, k]) => [n, (base === 'r' ? r : base === 's' ? s : 0) + k]);
}
export function daypart(d) {
  const h = hourOf(d), st = daypartStarts(d);
  let cur = st[0][0];
  for (const [n, a] of st)
    if (h >= a)
      cur = n;
  return cur;
}
const NIGHT_PARTS = ['evening', 'night', 'late'];
// 밤: 해 진 뒤 30분 ~ 동틀 녘 시작. 창밖 밤 이벤트의 공통 기준
export const isNight = d => NIGHT_PARTS.includes(daypart(d));
export const inParts = (d, ...names) => names.includes(daypart(d));
/* ───────── 해 기준 오프셋 (값은 그림 효과마다 따로, DAYPARTS와 별개) ───────── */
// 할로윈 호박 불: 해 질 무렵부터 다음 날 아침까지 (만득 씨가 끄지 않음)
export function pumpkinLit(d) {
  const h = hourOf(d), [r, s] = sunTimes(d);
  return h >= s - 0.3 || h < r + 0.3;
}
// 박쥐·커튼 유령: 해 진 뒤 18분 ~ 동틀 녘 시작(r − 1)
export function batTime(d) {
  const h = hourOf(d), [r, s] = sunTimes(d);
  return h >= s + 0.3 || h < r - 1;
}
// 나비: 해 뜬 뒤 1시간 ~ 해 지기 1시간 전
export function butterflyTime(d) {
  const h = hourOf(d), [r, s] = sunTimes(d);
  return h > r + 1 && h < s - 1;
}
// 창밖 낮/밤 그림 (해가 떠 있나)
export function sunUp(d) {
  const h = hourOf(d), [r, s] = sunTimes(d);
  return h > r && h < s;
}
// 해가 하늘을 얼마나 지났나 (해 뜰 때 0 → 질 때 1). 해 그리기
export function sunArc(d) {
  const [r, s] = sunTimes(d);
  return (hourOf(d) - r) / (s - r);
}
/* 해·달이 창밖 오른쪽에 떠 있는 정도 0~1 (WINDOW_PLAN_3.md 17장 회의: 창이 360도가 아니니 해가 하늘을 가로지르지 않는다).
   해: 해 뜬 뒤 1시간 15분에 걸쳐 오른쪽 아래(능선 뒤)에서 올라와 하루 종일 오른쪽 위에 있다가, 해 지기 전 1시간 15분에 걸쳐 내려간다. 해가 없으면 -1
   달: 해 진 뒤 30분부터 같은 길로 올라와 밤새 있다가, 동틀 녘(해 뜨기 1시간 전)이 시작되기 30분 전까지 내려간다. 모양만 실제 날짜(moonPhase) */
export const LIFT_HOURS = 1.25;
const liftOf = (h, a, b) => h <= a || h >= b ? -1 : Math.min(1, (h - a) / LIFT_HOURS, (b - h) / LIFT_HOURS);
export function sunLift(d) {
  const [r, s] = sunTimes(d);
  return liftOf(hourOf(d), r, s);
}
export function moonLift(d) {
  const h = hourOf(d), [r, s] = sunTimes(d), [r1] = sunTimes(noonOf(d, 1)), [, s0] = sunTimes(noonOf(d, -1));
  return h >= s ? liftOf(h, s + 0.5, 24 + r1 - 1.5) : liftOf(h + 24, s0 + 0.5, 24 + r - 1.5);
}
// 창밖 새벽·노을 빛이 비치는 때: 해 뜨기 1시간 전 ~ 뜬 뒤 1시간 반, 지기 1시간 반 전 ~ 진 뒤 1시간
export function twilightGlow(d) {
  const h = hourOf(d), [r, s] = sunTimes(d);
  return (h > r - 1 && h < r + 1.5) || (h > s - 1.5 && h < s + 1);
}
// 강고양이 씨 자리 잡기(처음 열 때·점프)에서 밤잠 자리로 가는 때: 해 진 뒤 1시간 ~ 해 뜰 때
export function settleNight(d) {
  const h = hourOf(d), [r, s] = sunTimes(d);
  return h >= s + 1 || h < r;
}
export const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
/* ───────── 생활 시간표 (만득 씨, TIME_BASE_PLAN.md 6장) ─────────
   시각은 시간 단위 (7.4 = 7:24). 만득 씨 집·잠·일정·방문 결과·액자·주말 TV 소리·놀이 제한이 모두 여기서 읽는다 */
export const ROUTINE = {
  DUE_WINDOW: 0.35, // 일정 시각부터 이만큼 안에 처음 보면 장면을 일으키고, 늦으면 "지났음"만
  LAMP_BEFORE: 0.3, // 스탠드: 해 지기 18분 전에 켠다
  weekday: { wake: 7, feed: 7.4, leave: 8.5, ret: 18.6, lights: 23, sleep: 23, anniv: 19.2 },
  weekend: { wake: 7, feed: 9, lights: 23, sleep: 23, anniv: 15, tvSound: [10, 22] },
  // 놀이가 저절로 시작해도 되는 시각 (이웃 배려). 간격은 gate.js
  play: { fish: [8, 21], yarn: [8, 22], wheel: [9, 20] }
};
export const routineOf = d => isWeekend(d) ? ROUTINE.weekend : ROUTINE.weekday;
// 시각 h가 [시작, 끝) 안인가
export function inWindow(win, d) {
  const h = hourOf(d);
  return !!win && h >= win[0] && h < win[1];
}
// 만득 씨가 정해진 시각에 오는 방문 (시각, 시간 단위). 지나간 방문(visitsBetween)과 액자 바로잡기(frame.js)가 함께 쓴다
export function visitHours(d) {
  const r = routineOf(d), v = { feed: r.feed, lights: r.lights };
  if (r.ret != null)
    v.ret = r.ret;
  if (isAnniversary(d))
    v.anniv = r.anniv;
  return v;
}
// 하루 일정 (이름, 시각). main.js scheduled()와 jump.js가 passedEvents로 본다
export function dayEvents(d) {
  const r = routineOf(d), vh = visitHours(d), ev = [['wait', vh.feed - 0.25], ['feed', vh.feed]];
  if (r.leave != null)
    ev.push(['leave', r.leave]);
  if (vh.ret != null)
    ev.push(['ret', vh.ret]);
  ev.push(['lampOn', sunTimes(d)[1] - ROUTINE.LAMP_BEFORE], ['lights', vh.lights]);
  if (vh.anniv)
    ev.push(['anniv', vh.anniv]);
  return ev;
}
// 오늘 일정 중 지금까지 지난 것: [{ name, at, state }]. state 'due' = 장면을 일으킬 때, 'late' = 지났음 표시만
export function passedEvents(d) {
  const h = hourOf(d);
  return dayEvents(d).filter(([, at]) => h >= at).map(([name, at]) => ({ name, at, state: h < at + ROUTINE.DUE_WINDOW ? 'due' : 'late' }));
}
// 스탠드: 해 지기 18분 전 ~ 불 끄기. 처음 열 때·점프 정리·일정이 모두 이것
export function lampShouldBeOn(d) {
  const h = hourOf(d);
  return h >= sunTimes(d)[1] - ROUTINE.LAMP_BEFORE && h < routineOf(d).lights;
}
export function mandukHome(d) {
  const r = routineOf(d), h = hourOf(d);
  return r.leave == null || h < r.leave || h >= r.ret;
}
export const mandukAsleep = d => {
  const r = routineOf(d), h = hourOf(d);
  return h >= r.sleep || h < r.wake;
};
// 강고양이 씨가 어두운 방에 있는 때: 불 끈 뒤(lights) ~ 해 뜰 때 (생활 시간 + 자연 시간). 스탠드 꺼짐은 부르는 쪽(cat.js)이 본다
export function nightDark(d) {
  const h = hourOf(d);
  return h >= routineOf(d).lights || h < sunTimes(d)[0];
}
// 강고양이 씨 비밀 타자 잦은 때: 만득 씨 잠든 뒤 ~ 일어나기 2시간 전
export function secretTime(d) {
  const r = routineOf(d), h = hourOf(d);
  return h >= r.sleep || h < r.wake - 2;
}
/* ───────── "하루" 세 가지 (TIME_BASE_PLAN.md 7장) ─────────
   키 형식은 dayKey 그대로 (0을 채우지 않음: 2026-1-5). 비·이상한 책·TV 씨앗·저장된 기록이 이 문자열을 쓴다 */
const noonOf = (d, k = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + k, 12);
// 달력 날: 자정 ~ 자정
export const calDay = d => dayKey(d);
// 방송일: 새벽 5시 ~ 다음 날 새벽 5시. 그 방송일 정오의 Date (방송일 하나에 판정 하나). 달력에서 하루 빼기라 서머타임에도 맞다
export const BROADCAST_START = 5;
export const broadcastDay = d => noonOf(d, hourOf(d) < BROADCAST_START ? -1 : 0);
// 하룻밤: 해질녘 시작(s − 1.5) ~ 다음 날 동틀 녘 끝(r + 0.5). 그 밤이 시작한 날의 정오 Date, 아침·낮이면 null
function nightStart(d) {
  const p = daypart(d);
  return p === 'morning' || p === 'day' ? null : noonOf(d, p === 'late' || p === 'dawn' ? -1 : 0);
}
// 하룻밤 키 (10/31 밤의 새벽 3시 → '2026-10-31'). 아침·낮에는 null
export const nightOf = d => {
  const n = nightStart(d);
  return n ? dayKey(n) : null;
};
// a(ms)가 든 날부터 b(ms)가 든 날까지 날마다 fn(그날 0시 Date). fn이 true를 돌려주면 멈추고 true
export function forEachDay(a, b, fn) {
  const day = new Date(a);
  day.setHours(0, 0, 0, 0);
  for (let i = 0; i < 400 && day.getTime() <= b; i++) {
    if (fn(new Date(day)) === true)
      return true;
    day.setDate(day.getDate() + 1);
  }
  return false;
}
// 그날(day) h시(시간 단위)의 ms
export const atHour = (day, h) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(h), Math.round((h % 1) * 60)).getTime();
// a(ms) 뒤부터 b(ms)까지 지나간 정해진 방문 이름들 (visitHours의 이름, 지난 순서대로)
export function visitsBetween(a, b) {
  const out = [];
  if (!(b > a))
    return out;
  forEachDay(a, b, day => {
    const vh = visitHours(day), list = [];
    for (const k in vh) {
      const t = atHour(day, vh[k]);
      if (t > a && t <= b)
        list.push([t, k]);
    }
    list.sort((p, q) => p[0] - q[0]).forEach(p => out.push(p[1]));
  });
  return out;
}
/* ───────── 달력: 기간·순간 (calendar.js의 CAL, TIME_BASE_PLAN.md 8장) ───────── */
const mdOf = s => {
  const [m, d] = s.split('-').map(Number);
  return m * 100 + d;
};
const dayN = (y, m, d) => Date.UTC(y, m, d) / 864e5; // 날짜 번호 (서머타임과 상관없이)
// 그 날짜(시각은 보지 않음)가 기간 p 안인가
function dateIn(p, day) {
  const y = day.getFullYear(), m = day.getMonth(), dd = day.getDate(), x = (m + 1) * 100 + dd;
  if (p.date)
    return x === mdOf(p.date);
  if (p.from) {
    const a = mdOf(p.from), b = mdOf(p.to);
    return a <= b ? x >= a && x <= b : x >= a || x <= b;
  }
  if (p.dates) {
    const n = dayN(y, m, dd);
    for (const yy of [y - 1, y, y + 1]) {
      const s = p.dates[yy];
      if (!s)
        continue;
      const [sm, sd] = s.split('-').map(Number), t = dayN(yy, sm - 1, sd);
      if (n >= t - (p.before || 0) && n <= t + (p.after || 0))
        return true;
    }
  }
  return false;
}
// 방·창밖: 지금 기간 안인가 (through: 'night'이면 마지막 날 밤이 끝날 때까지)
export function inPeriod(name, d) {
  const p = CAL.periods[name];
  if (!p)
    return false;
  if (dateIn(p, d))
    return true;
  if (p.through === 'night') {
    const n = nightStart(d);
    return !!n && dateIn(p, n);
  }
  return false;
}
// TV: 그 날짜가 기간의 from~to 안인가만 본다 (through와 시각 무시). 방송일 정오(broadcastDay)를 넘긴다
export const onDate = (name, d) => !!CAL.periods[name] && dateIn(CAL.periods[name], d);
// 지금 켜진 기간 이름들
export const periodsAt = d => Object.keys(CAL.periods).filter(n => inPeriod(n, d));
// 특별한 순간: date의 from 시각부터 (night: true면 그 밤이 끝날 때까지)
export function momentNow(name, d) {
  const mo = CAL.moments[name];
  if (!mo)
    return false;
  const [hh, mi] = mo.from.split(':').map(Number), want = mdOf(mo.date), md = x => (x.getMonth() + 1) * 100 + x.getDate();
  if (md(d) === want && hourOf(d) >= hh + mi / 60)
    return true;
  if (!mo.night)
    return false;
  const n = nightStart(d);
  return !!n && md(n) === want && dayKey(n) !== dayKey(d); // 자정을 넘긴 그 밤
}
// 명절: 이 넷만, 이 순서로 (방·창밖 전용. TV는 onDate). 미리보기 도구의 holidayOverride가 먼저
export const HOLIDAYS = ['halloween', 'christmas', 'seollal', 'newyear'];
export function holiday(d) {
  if (holidayOverride)
    return holidayOverride;
  return HOLIDAYS.find(n => inPeriod(n, d)) || null;
}
// 미리보기 도구 한 줄: "지금: 계절 · 시간대 · 달력 날 · 방송일 · 하룻밤 · 켜진 기간"
export function timeInfo(d) {
  return { season: season(d), south: seasonSouth(), part: daypart(d), cal: calDay(d), bday: dayKey(broadcastDay(d)), night: nightOf(d), periods: periodsAt(d) };
}
/* ───────── 풍경 (WINDOW_PLAN_3.md 4-2) ─────────
   sceneryAt(d): 그날 풍경. { md, mix: [[계절, 비율], [계절, 비율]], dir: 'up'|'down', snowCap, dust, skyTint }
   - mix: 산 그림 두 장을 섞는 비율 (한 날짜엔 두 계절만). dir: 물드는 방향(봄·여름으로 갈 땐 아래에서 위로 'up', 가을·겨울로 갈 땐 꼭대기에서 아래로 'down')
   - snowCap: 먼 산 눈 모자 0~1 (첫눈 날부터 사흘에 걸쳐 1, snowCapMelt 동안 녹음)
   - dust: 미세먼지 낀 날인가 (dust 철의 약 15%, 날짜 씨앗)
   - skyTint: 가을 하늘 0~1 (autumnSky 범위 가운데가 가장 진함)
   날짜 단위로 계산해 캐시한다 (덮어쓰기 상태도 키에 넣음) */
const smooth = x => x * x * (3 - 2 * x);
function mountainMix(p) {
  const K = CAL.scenery.mountain, n = K.length;
  for (let i = 0; i < n; i++) {
    const [a, sa] = K[i], [b, sb] = K[(i + 1) % n], pa = posOf(a), len = ((posOf(b) - pa) % 1 + 1) % 1, x = ((p - pa) % 1 + 1) % 1;
    if (x < len || (len === 0 && x === 0)) {
      if (sa === sb)
        return { mix: [[sa, 1], [sb, 0]], dir: 'down' };
      const k = smooth(x / len);
      return { mix: [[sa, 1 - k], [sb, k]], dir: sb === 'spring' || sb === 'summer' ? 'up' : 'down' };
    }
  }
  return { mix: [[K[0][1], 1], [K[0][1], 0]], dir: 'down' };
}
let sceneCache = { key: '', v: null };
export function sceneryAt(d) {
  const key = dayKey(d) + '|' + sceneryOverride + '|' + seasonOverride + '|' + snowCapOverride + '|' + dustOverride;
  if (sceneCache.key === key)
    return sceneCache.v;
  const p = yearPos(d), { mix, dir } = mountainMix(p), sky = rangeProgress(CAL.scenery.autumnSky, p);
  const v = { md: mdOfPos(p), mix, dir, snowCap: snowCapAt(d), dust: dustDay(d), skyTint: sky >= 0 ? Math.sin(Math.PI * sky) : 0 };
  sceneCache = { key, v };
  return v;
}
// 미세먼지 낀 날: dust 철(풍경 날짜)의 약 15%. 비 오는 날은 씻겨서 없음. 미리보기 「미세먼지」는 dustOverride
let dustOverride = null;
export const setDustOverride = v => {
  dustOverride = v;
};
export const dustDay = d => dustOverride !== null ? dustOverride : sceneryOn('dust', d) && !rainPlan(d) && hash('dust' + dayKey(d)) < 0.15;
/* ───────── 겨울: 첫눈·눈 모자·난간 눈·성에 (WINDOW_PLAN_3.md 8장) ─────────
   모두 시각의 함수 (저장 없음, 누구에게나 같음). 눈 = 겨울(season, 덮어쓰기 없이)의 비 */
const realWinter = d => {
  const o = seasonOverride;
  seasonOverride = null;
  try {
    return season(d) === 'winter';
  }
  finally {
    seasonOverride = o;
  }
};
// 이번 겨울의 시작 날(정오 Date): 북반구 12월 1일, 남반구 6월 1일 (season()과 같은 달 경계). 1~2월이면 전년 12월
function winterStart(d) {
  const m0 = seasonSouth() ? 5 : 11, y = d.getFullYear();
  return new Date(d.getMonth() >= m0 ? y : y - 1, m0, 1, 12);
}
// 그 겨울의 첫눈: { day: 정오 Date, start: ms } 또는 null (겨울 석 달 안에 눈이 없으면)
const firstSnowCache = {};
export function firstSnow(d) {
  const w = winterStart(d), k = dayKey(w);
  if (firstSnowCache[k] !== undefined)
    return firstSnowCache[k];
  let v = null;
  for (let i = 0; i < 92 && !v; i++) {
    const day = noonOf(w, i);
    if (!realWinter(day))
      break;
    const sp = rainSpan(day);
    if (sp)
      v = { day, start: sp.start };
  }
  return firstSnowCache[k] = v;
}
// 오늘이 그 겨울 첫눈 날이고 지금 눈이 오는 중인가 (강고양이 씨 반응)
export function firstSnowNow(d) {
  if (firstSnowOverride)
    return snowing(d);
  const f = firstSnow(d);
  return !!f && dayKey(f.day) === dayKey(d) && snowing(d);
}
let firstSnowOverride = false, snowCapOverride = null, railSnowOverride = null, frostOverride = null;
export function setWinterOverride(kind, v) {
  if (kind === 'firstSnow')
    firstSnowOverride = v;
  else if (kind === 'snowCap')
    snowCapOverride = v;
  else if (kind === 'railSnow')
    railSnowOverride = v;
  else if (kind === 'frost')
    frostOverride = v;
}
// 먼 산 눈 모자 0~1: 첫눈 시각부터 사흘에 걸쳐 1. 풍경 날짜 snowCapMelt 동안 1 → 0, 그 뒤 다음 겨울(풍경 12-01)까지 0
export function snowCapAt(d) {
  if (snowCapOverride !== null)
    return snowCapOverride;
  const p = yearPos(d), melt = rangeProgress(CAL.scenery.snowCapMelt, p);
  if (rangeProgress({ from: CAL.scenery.snowCapMelt.to, to: '11-30' }, p) >= 0 && melt < 0)
    return 0;
  if (sceneryOverride !== null || seasonOverride) // 미리보기로 날짜를 옮겼으면 첫눈 계산 대신 풍경 날짜만 본다
    return melt >= 0 ? 1 - melt : 1;
  const f = firstSnow(d);
  if (!f)
    return 0;
  const k = clamp((d.getTime() - f.start) / (3 * 86400000), 0, 1);
  return melt >= 0 ? k * (1 - melt) : k;
}
// 난간에 쌓인 눈 0~1: 눈 오는 동안 3시간에 걸쳐 1까지, 그친 뒤 12시간에 걸쳐 녹음. 오늘·어제 눈을 본다 (자정을 넘어도 이어지게)
export function railSnowAt(d) {
  if (railSnowOverride !== null)
    return railSnowOverride;
  const t = d.getTime(), H = 3600000;
  let v = 0;
  for (const k of [-1, 0]) {
    const day = noonOf(d, k);
    if (!realWinter(day))
      continue;
    const sp = rainSpan(day);
    if (!sp || t < sp.start)
      continue;
    const top = clamp((Math.min(t, sp.end) - sp.start) / (3 * H), 0, 1);
    v = Math.max(v, t <= sp.end ? top : top * clamp(1 - (t - sp.end) / (12 * H), 0, 1));
  }
  return v;
}
// 유리 성에 0~1: 겨울 맑은 날(그날 비·눈 없음) 해 뜨기 1시간 반 전부터 짙고, 해 뜬 뒤 ~ 오전 10시에 걸쳐 사라짐
export function frostAt(d) {
  if (frostOverride !== null)
    return frostOverride;
  const rp = rainPlan(d);
  if (!realWinter(d) || (rp && rp.st < 10)) // 아침에 눈·비가 오는 날은 없음
    return 0;
  const h = hourOf(d), [r] = sunTimes(d);
  if (h < r - 1.5 || h >= 10)
    return 0;
  return h < r - 1 ? (h - (r - 1.5)) / 0.5 : h < r ? 1 : 1 - (h - r) / (10 - r);
}
let rainOverride = null;
/* 그날(calDay) 비 계획: { st, len } (시작 시각·길이, 시간 단위) 또는 null.
   rainNow·rainSpan(그리고 무지개·천둥·첫눈·장마)이 모두 이것만 본다 — 한쪽만 바뀌어 어긋나지 않게 (WINDOW_PLAN_3.md 4-4) */
export function rainPlan(d) {
  const k = dayKey(d), monsoon = sceneryOn('monsoon', d); // 장마(풍경 날짜): 비 오는 날이 잦고 길게 (WINDOW_PLAN_3.md 9장). 그 밖의 날은 예전과 같은 씨앗·같은 결과
  if (hash('rain' + k) > (monsoon ? 0.55 : season(d) === 'summer' ? 0.28 : 0.2))
    return null;
  return { st: 6 + hash('rs' + k) * 10, len: monsoon ? 4 + hash('rl' + k) * 10 : 2 + hash('rl' + k) * 7 };
}
export function rainNow(d) {
  if (rainOverride !== null)
    return rainOverride;
  const p = rainPlan(d), h = hourOf(d);
  return !!p && h >= p.st && h < p.st + p.len;
}
let boxOverride = null;
export function setOverride(kind, v) {
  if (kind === 'rain')
    rainOverride = v;
  else if (kind === 'box')
    boxOverride = v;
  else if (kind === 'season')
    seasonOverride = v;
  else if (kind === 'holiday')
    holidayOverride = v;
  else if (kind === 'scenery')
    sceneryOverride = v;
}
export const boxToday = d => boxOverride !== null ? boxOverride : ((dayNum(d) % 9) < 3);
function firstVisit() {
  let f = store.get('first', null);
  if (!f) {
    f = Date.now();
    store.set('first', f);
  }
  return new Date(f);
}
export const FIRST = firstVisit();
export function isAnniversary(d) {
  return d.getMonth() === FIRST.getMonth() && d.getDate() === FIRST.getDate() && d.getFullYear() > FIRST.getFullYear();
}
export const snowing = d => rainNow(d) && season(d) === 'winter';
export const wx = () => snowing(now()) ? '❄️' : '🌧️';
/* ───────── 햇빛 조각 ───────── */
// 햇빛이 방바닥에 닿는 길: 장면의 window.json sunbeam (win.js가 넣는다). 창이 없으면 null → 햇빛 조각 없음
let BEAM = null;
export const setSunbeamPath = p => BEAM = p;
export function sunbeam(d) {
  if (!BEAM)
    return null;
  const [r, s] = sunTimes(d), h = hourOf(d);
  if (h < r + 0.6 || h > s - 0.4)
    return null;
  const t = (h - (r + 0.6)) / ((s - 0.4) - (r + 0.6));
  const cx = lerp(BEAM.x[0], BEAM.x[1], t);
  let k = Math.sin(Math.PI * t);
  k = Math.pow(k, 0.6);
  if (rainNow(d))
    k *= 0.12;
  const sk = lerp(-120, 120, t);
  return { cx, k, sk, cy: BEAM.y };
}
export const inBeam = (b, x) => b && b.k > 0.25 && Math.abs(x - b.cx) < 110;
export function skyAt(d) {
  const [r, s] = sunTimes(d), h = hourOf(d);
  const K = [[0, '0d1530', '1b2546'], [r - 1, '121c3a', '2a3359'], [r, '5c6aa8', 'f2a27a'], [r + 1.2, '7fb3e0', 'cfe3ee'], [(r + s) / 2, '6fb0e6', 'cde6f4'], [s - 1.2, '7aa9d8', 'f3d3a8'], [s, '544a8a', 'f08a5d'], [s + 1, '1c2244', '3a3560'], [24, '0d1530', '1b2546']];
  for (let i = 0; i < K.length - 1; i++) {
    if (h >= K[i][0] && h < K[i + 1][0]) {
      const t = (h - K[i][0]) / (K[i + 1][0] - K[i][0]);
      return [lerpCol(K[i][1], K[i + 1][1], t), lerpCol(K[i][2], K[i + 1][2], t)];
    }
  }
  return ['#0d1530', '#1b2546'];
}
export function darkness(d) {
  const [r, s] = sunTimes(d), h = hourOf(d);
  let k;
  if (h < r - 0.5 || h > s + 1)
    k = 0.62;
  else if (h < r + 0.8)
    k = lerp(0.62, 0, clamp((h - (r - 0.5)) / 1.3, 0, 1));
  else if (h > s - 0.8)
    k = lerp(0, 0.62, clamp((h - (s - 0.8)) / 1.8, 0, 1));
  else
    k = 0;
  if (rainNow(d))
    k = Math.max(k, 0.18);
  return k;
}
/* ───────── 달 모양 (MOON_PLAN.md) ───────── */
// 기준 삭(새 달) 2000-01-06 18:14 UTC, 삭망월 29.530588853일. 오차 반나절 안팎
// 시각(UTC)으로만 계산하니 같은 순간엔 누구에게나 같은 달. 미리보기 도구로 시계를 옮기면 같이 바뀐다
const SYNODIC = 29.530588853, NEW_MOON0 = Date.UTC(2000, 0, 6, 18, 14);
// 창밖 달: REGION.moon이 'korea'면 한국(고양시) 하늘 = 차오르는 달은 오른쪽이 빛난다. 'local'이면 방문자 반구
export const MOON_SOUTH = REGION.moon === 'local' ? SOUTH : false;
export function moonPhase(d) {
  const age = (((d.getTime() - NEW_MOON0) / 86400000) % SYNODIC + SYNODIC) % SYNODIC;
  const k = age / SYNODIC;
  return { age, k, lit: (1 - Math.cos(2 * Math.PI * k)) / 2, waxing: k < 0.5 };
}
// 이름 (i18n.js의 moonName 키): new, crescent, first, waxgib, full, wangib, last, wancres
export function moonName(m) {
  const { k, lit } = m;
  if (lit < 0.03)
    return 'new';
  if (Math.abs(k - 0.5) < 0.034)
    return 'full'; // 보름 앞뒤 하루
  if (Math.abs(k - 0.25) < 0.034)
    return 'first';
  if (Math.abs(k - 0.75) < 0.034)
    return 'last';
  return k < 0.25 ? 'crescent' : k < 0.5 ? 'waxgib' : k < 0.75 ? 'wangib' : 'wancres';
}
export function boxOpen(d) {
  return (dayNum(d) % 9) > 0 || boxOverride !== null;
}
/* ───────── 창밖 일정 (WINDOW_PLAN.md) ─────────
   "언제 나오나"는 날짜 씨앗(해시)으로 정한다. 누구에게나, 새로 고침해도 같다. 결과는 모두 방 시각(ms).
   실행 중에 겹치는 것만 events.js 교통정리가 푼다 */
const HOUR = 3600000;
// 그날(day) h시의 ms. 24 이상이면 다음 날로 넘어간다 (벽시계 기준이라 서머타임에도 hourOf와 맞다)
const hourAt = (day, h) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, Math.round(h * HOUR)).getTime();
export const clockText = ms => {
  const d = new Date(ms);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
// 그날(calDay) 비가 오면 { start, end } (ms), 안 오면 null. rainNow와 같은 씨앗·계산이고 자정에서 끊긴다(rainNow도 자정에 날짜 키가 바뀌어 끊긴다).
// 미리보기의 비 켜기/끄기(rainOverride)와는 상관없다
export function rainSpan(d) {
  const p = rainPlan(d);
  return p && { start: hourAt(d, p.st), end: hourAt(d, Math.min(p.st + p.len, 24)) };
}
// 천둥번개: 비 오는 날 중 여름 35%, 그 밖 10%. 눈 오는 날은 없음. 미리보기 「천둥번개」는 thunderOverride
let thunderOverride = null;
export const thunderDay = d => !!rainSpan(d) && season(d) !== 'winter' && hash('thunder' + dayKey(d)) < (season(d) === 'summer' ? 0.35 : 0.1);
export function thunderNow(d) {
  if (!rainNow(d) || snowing(d))
    return false;
  if (thunderOverride !== null)
    return thunderOverride;
  const sp = rainSpan(d), t = d.getTime();
  return thunderDay(d) && !!sp && t >= sp.start && t < sp.end;
}
// 번쩍임 시각: 그날 0시부터 1~3분 간격으로 씨앗이 정한 시각들 [{ t, big }] (천둥 칠 때만 쓴다)
const flashCache = {};
function flashList(d) {
  const k = dayKey(d);
  if (flashCache.k === k)
    return flashCache.v;
  const v = [], end = hourAt(d, 24);
  let t = hourAt(d, 0);
  for (let i = 0; t < end; i++) {
    t += (60 + hash('fl' + k + i) * 120) * 1000;
    v.push({ t, big: hash('fb' + k + i) < 0.35 });
  }
  flashCache.k = k;
  flashCache.v = v;
  return v;
}
// a(ms) 뒤 ~ d까지 지나간 번쩍임 중 마지막 것 (여러 개가 지나갔어도 하나만). 없으면 null
export function flashSince(a, d) {
  const b = d.getTime();
  if (!(b > a))
    return null;
  let hit = null;
  for (const f of flashList(d))
    if (f.t > a && f.t <= b)
      hit = f;
    else if (f.t > b)
      break;
  return hit;
}
// 무지개 밝기 0~1: 비가 그친 시각(rainSpan end)이 해 지기 1시간 전보다 이르면 50%. 5분에 걸쳐 나타나 20~40분 동안 흐려진다.
// 시각의 함수라 새로 고침·시간 점프에도 정리가 필요 없다. 미리보기 버튼은 rainbowOverride(시작 시각)
let rainbowOverride = null;
export function rainbowAt(d) {
  const t = d.getTime(), k = dayKey(d);
  let end = rainbowOverride;
  if (end == null) {
    const sp = rainSpan(d);
    if (!sp || season(d) === 'winter' || hash('rainbow' + k) >= 0.5 || sp.end > hourAt(d, sunTimes(d)[1] - 1))
      return 0;
    end = sp.end;
  }
  if (rainNow(d))
    return 0;
  const m = (t - end) / 60000, fade = 20 + hash('rbd' + k) * 20;
  if (m < 0 || m > 5 + fade)
    return 0;
  const x = m < 5 ? m / 5 : 1 - (m - 5) / fade;
  return x * x * (3 - 2 * x);
}
// 무지개를 그릴 쪽: 해 반대쪽. 해는 늘 창 오른쪽에 있으므로 무지개는 늘 왼쪽 (WINDOW_PLAN_3.md 17장)
export const rainbowSide = () => -1;
// 비행기: 하루 2~4번 (calDay), 6시 ~ 23시 반. { id, at, dur(초), dir, y }
export function planeSlots(d) {
  const k = dayKey(d), n = 2 + Math.floor(hash('pn' + k) * 3), out = [];
  for (let i = 0; i < n; i++)
    out.push({ id: 'plane' + k + i, at: hourAt(d, 6 + hash('pt' + k + i) * 17.5), dur: 40 + hash('pd' + k + i) * 30, dir: hash('px' + k + i) < 0.5 ? 1 : -1, yk: hash('py' + k + i) }); // 높이: 하늘 띠 plane 안의 비율 (weather.js)
  return out;
}
// 난간의 새: 하루 4~8번 (calDay). 아침(해 뜬 뒤 30분 ~ 11시)과 늦은 오후(해 지기 3시간 전 ~ 1시간 전)에 잦다.
// { id, at, dur(초), kind: 'pigeon'|'magpie', pair, x(0~1), face }
export function birdSlots(d) {
  const k = dayKey(d), [r, s] = sunTimes(d), n = 4 + Math.floor(hash('bn' + k) * 5), out = [];
  for (let i = 0; i < n; i++) {
    const u = hash('bu' + k + i), v = hash('bt' + k + i);
    const h = u < 0.4 ? lerp(r + 0.5, Math.max(r + 1, 11), v) : u < 0.8 ? lerp(s - 3, s - 1, v) : lerp(r + 1, s - 1, v);
    const magpie = hash('bk' + k + i) < 0.45;
    out.push({ id: 'bird' + k + i, at: hourAt(d, h), dur: 20 + hash('bd' + k + i) * 40, kind: magpie ? 'magpie' : 'pigeon', pair: magpie && hash('bp' + k + i) < 0.35, x: hash('bx' + k + i), face: hash('bf' + k + i) < 0.5 ? -1 : 1 });
  }
  return out.sort((a, b) => a.at - b.at);
}
// 작은 검은 고양이: 하룻밤(nightOf)에 약 33% (3일에 1번 꼴), 해질녘 ~ 새벽 1시. { id, at, dur(초), mode: 'peek'|'walk', x(0~1), dir } 또는 null
export function blackcatSlot(d, tonight = false) { // tonight: 아침·낮이면 오늘 밤 것 (미리보기 한 줄)
  const day = nightStart(d) || (tonight ? noonOf(d, 0) : null);
  if (!day)
    return null;
  const k = dayKey(day);
  if (hash('blackcat' + k) >= 1 / 3)
    return null;
  const [, s] = sunTimes(day), u = hash('bcu' + k), v = hash('bct' + k);
  const h = u < 0.6 ? s - 1.5 + v * 4.5 : s + 3 + v * Math.max(0.5, 25 - (s + 3));
  const peek = hash('bcm' + k) < 0.5;
  return { id: 'blackcat' + k, at: hourAt(day, h), dur: peek ? 7 + hash('bcd' + k) * 6 : 32 + hash('bcd' + k) * 12, mode: peek ? 'peek' : 'walk', x: hash('bcx' + k), dir: hash('bcr' + k) < 0.5 ? -1 : 1 };
}
// 슬롯 목록에서 지금 할 것: 시작 시각 ~ 시작 + 기다림(wait, 초) 안에 든 것. 없으면 null
export function slotDue(slots, d, wait) {
  const t = d.getTime();
  for (const s of slots)
    if (s && t >= s.at && t < s.at + Math.max(wait, s.dur || 0) * 1000)
      return { slot: s, late: (t - s.at) / 1000 };
  return null;
}
// 건너편 창 불빛: 창 n개의 지금 상태 (0 꺼짐, 1 켜짐, 2 TV처럼 푸르스름). 아침·낮이면 null. 창마다 그 밤(nightOf)의 씨앗으로 켜고 끄는 시각이 정해진다.
// 해 진 뒤 하나둘 켜져 저녁엔 40~60%, 22시부터 하나둘 꺼져 새벽 2시엔 5~10%. 금·토 밤은 30분~1시간 늦게. 새벽엔 일찍 일어난 집 몇 개
let litCache = { key: '', v: null };
export function aptLightsAt(d, n) {
  const key = Math.floor(d.getTime() / 15000) + ':' + n;
  if (litCache.key === key)
    return litCache.v;
  const day = nightStart(d);
  if (!day) { // 아침·낮: 그리지 않는다 (낮 그림 그대로. 비 오는 낮에 밤 그림이 살짝 섞여도 그림 속 불빛 그대로)
    litCache = { key, v: null };
    return null;
  }
  const v = new Uint8Array(n);
  {
    const K = dayKey(day), [, s] = sunTimes(day), [r1] = sunTimes(noonOf(day, 1)), t = d.getTime();
    const weekend = day.getDay() === 5 || day.getDay() === 6, hot = sceneryOn('tropicalNight', day); // 열대야: 더 많이, 1시간 반쯤 늦게까지 (WINDOW_PLAN_3.md 9장)
    const tvs = [Math.floor(hash('atv1' + K) * n), hash('atv2' + K) < 0.5 ? Math.floor(hash('atv3' + K) * n) : -1];
    for (let i = 0; i < n; i++) {
      const e = 'w' + i + K;
      let on = false;
      if (hash('wl' + e) < (hot ? 0.68 : 0.55)) { // 이 밤에 불을 켜는 집
        const a = hourAt(day, s + 0.1 + hash('wa' + e) * 2.6);
        const owl = hash('wo' + e) < 0.16;
        const b = owl ? hourAt(day, 24 + r1 + 0.5) : hourAt(day, 22 + hash('wb' + e) * 4.2 + (weekend ? 0.5 + hash('ww' + e) * 0.5 : 0) + (hot ? 1 + hash('wh' + e) : 0));
        on = t >= a && t < b;
      }
      else if (hash('wd' + e) < 0.12) // 새벽에 일찍 일어난 집
        on = t >= hourAt(day, 24 + r1 - 1 + hash('wdt' + e) * 0.6) && t < hourAt(day, 24 + r1 + 0.5);
      v[i] = on ? (tvs.includes(i) ? 2 : 1) : 0;
    }
  }
  litCache = { key, v };
  return v;
}
/* ───────── 계절 손님 일정 (WINDOW_PLAN_3.md 7·9장) ─────────
   모두 날짜 씨앗(calDay) → 새로 고침해도 같다. 해 뜬 뒤 1시간 ~ 해 지기 1시간 전. 결과는 방 시각(ms) */
function daySlots(d, tag, n, mk) {
  const k = dayKey(d), [r, s] = sunTimes(d), out = [];
  for (let i = 0; i < n; i++)
    out.push(Object.assign({ id: tag + k + i, at: hourAt(d, lerp(r + 1, s - 1, hash(tag + 't' + k + i))) }, mk(k + i)));
  return out.sort((a, b) => a.at - b.at);
}
// 낙엽 바람: 단풍철(leaves) 맑은 날 하루 3~6번. { dur(초), dir(바람 방향 1 = 오른쪽으로), n(잎 수), land(난간에 앉을 잎 수) }
export function leafSlots(d) {
  if (!sceneryOn('leaves', d) || rainPlan(d))
    return [];
  return daySlots(d, 'leaf', 3 + Math.floor(hash('ln' + dayKey(d)) * 4), k => ({ dur: 14 + hash('ld' + k) * 10, dir: hash('lx' + k) < 0.6 ? -1 : 1, n: 3 + Math.floor(hash('lc' + k) * 4), land: hash('lv' + k) < 0.55 ? 1 + (hash('lw' + k) < 0.3 ? 1 : 0) : 0 }));
}
// 철새 V자 무리: 가을(geeseSouth) 오른쪽 → 왼쪽, 봄(geeseNorth) 왼쪽 → 오른쪽. 하루 0~2번. { dur, dir, n(마리), y }
export function geeseSlots(d) {
  const south = sceneryOn('geeseSouth', d), north = sceneryOn('geeseNorth', d);
  if (!south && !north)
    return [];
  const k0 = dayKey(d);
  return daySlots(d, 'geese', Math.floor(hash('gn' + k0) * 3), k => ({ dur: 34 + hash('gd' + k) * 14, dir: south ? -1 : 1, n: 7 + Math.floor(hash('gc' + k) * 9), yk: hash('gy' + k) })); // 높이: 하늘 띠 geese 안의 비율 (seasons.js)
}
// 잠자리: 늦여름~초가을(dragonfly) 맑은 날 하루 2~4번 난간 근처에. { dur, n(1~2) }
export function dragonflySlots(d) {
  if (!sceneryOn('dragonfly', d) || rainPlan(d))
    return [];
  return daySlots(d, 'dfly', 2 + Math.floor(hash('dn' + dayKey(d)) * 3), k => ({ dur: 40 + hash('dd' + k) * 50, n: hash('dc' + k) < 0.35 ? 2 : 1 }));
}
// 벚꽃잎: blossom 기간 맑은 날의 낮 (날의 70%). 지금 날리는 세기 0~1 (해 뜬 뒤·지기 전 30분에 걸쳐 오르고 내림)
export function blossomAt(d) {
  if (!sceneryOn('blossom', d) || rainNow(d) || hash('blos' + dayKey(d)) >= 0.7)
    return 0;
  const h = hourOf(d), [r, s] = sunTimes(d);
  return clamp(Math.min(h - (r + 1), s - 1 - h) / 0.5, 0, 1);
}
export function setWindowOverride(kind, v) {
  if (kind === 'thunder')
    thunderOverride = v;
  else if (kind === 'rainbow')
    rainbowOverride = v;
}
// 미리보기: d 다음에 오는 h시 (오늘 h시가 지났으면 내일 h시). ms
export function nextAtHour(d, h) {
  const t = hourAt(d, h);
  return t > d.getTime() ? t : hourAt(noonOf(d, 1), h);
}
/* ───────── 불꽃놀이 (FIREWORKS_PLAN.md) ─────────
   공연 시각은 달력(calendar.js CAL.fireworks)에서만. 지금 하늘에 걸린 공연 { id, kind, start, end, parts(ms 구간), year? } 또는 null.
   무지개처럼 시각의 함수라 새로 고침·시간 점프에도 정리가 필요 없다. 시작할 때나 지금 비가 오면 쉰다(비 덮개 뒤라 안 보이기도 함).
   불꽃축제 날은 그날 토요일 공연 대신. 생일 파티 끝 불꽃은 날짜가 아니라 파티가 부르므로 fireworks.js가 따로 든다 */
let fwOverride = null; // 미리보기: { kind, start(ms) } — 그 공연을 그 시각에 시작한 것처럼
export const setFireworksOverride = v => fwOverride = v;
const hmOf = s => {
  const [a, b] = s.split(':').map(Number);
  return a + b / 60;
};
// 그해 불꽃축제 날(정오 Date): 표에 있으면 그날, 없으면 10월 첫 토요일
export function festDay(y) {
  const s = CAL.fireworks.fest.dates[y];
  if (s) {
    const [m, dd] = s.split('-').map(Number);
    return new Date(y, m - 1, dd, 12);
  }
  const d = new Date(y, 9, 1, 12);
  while (d.getDay() !== 6)
    d.setDate(d.getDate() + 1);
  return d;
}
const fwPlan = (kind, start, year) => {
  const p = CAL.fireworks[kind], parts = p.parts.map(([a, b]) => [a * 60000, b * 60000]);
  return { kind, start, end: start + parts[parts.length - 1][1], parts, year, midnight: p.midnight != null ? p.midnight * 60000 : null };
};
// 그날(정오 Date) 시작하는 공연들
function fwPlansOn(day) {
  const F = CAL.fireworks, md = (day.getMonth() + 1) * 100 + day.getDate(), y = day.getFullYear(), out = [];
  const at = kind => atHour(day, hmOf(F[kind].from));
  if (dayKey(festDay(y)) === dayKey(day))
    out.push(fwPlan('fest', at('fest')));
  else if (day.getDay() === F.weekly.weekday)
    out.push(fwPlan('weekly', at('weekly')));
  if (md === mdOf(F.xmasEve.date))
    out.push(fwPlan('xmasEve', at('xmasEve')));
  if (md === mdOf(F.newyear.date))
    out.push(fwPlan('newyear', at('newyear'), y + 1));
  return out;
}
export function fireworksShow(d) {
  const t = d.getTime();
  if (fwOverride) {
    const s = fwPlan(fwOverride.kind, fwOverride.start, fwOverride.kind === 'newyear' ? d.getFullYear() + (d.getMonth() === 0 ? 0 : 1) : undefined);
    if (t >= s.start && t < s.end)
      return { id: 'dev' + s.kind + s.start, ...s };
    if (t >= s.end)
      fwOverride = null;
  }
  for (const k of [0, -1]) { // 자정을 넘는 공연(새해)은 어제 시작한 것
    const day = noonOf(d, k);
    for (const s of fwPlansOn(day))
      if (t >= s.start && t < s.end && !rainNow(new Date(s.start)) && !rainNow(d))
        return { id: s.kind + dayKey(day), ...s };
  }
  return null;
}
// 미리보기 한 줄: 다음 토요일 공연 시각 (ms)
export function nextWeeklyFireworks(d) {
  for (let k = 0; k < 8; k++) {
    const day = noonOf(d, k), s = fwPlansOn(day).find(x => x.kind === 'weekly' || x.kind === 'fest');
    if (s && s.end > d.getTime())
      return s.start;
  }
  return null;
}

/* ───────── 정각 종 (HOURLY_CHIME_PLAN.md 8장) ─────────
   벽시계 시간: 방 시각 그대로 매시 0분. 자연(해)·생활(만득 씨 일정)과 무관 */
// 지금이 든 시각의 0분 (ms). 이 값이 바뀌면 정각을 지난 것
export function hourStart(d) {
  const h = new Date(d.getTime());
  h.setMinutes(0, 0, 0);
  return h.getTime();
}
// 몇 번 치나: 12시간제 (0시·12시 = 12번, 13시 = 1번)
export const strikesOf = d => (d.getHours() % 12) || 12;
// 할로윈 자정 손님: 할로윈 기간의 자정(0시 대) 모두 → 10/24 0시 ~ 11/1 0시(10/31 밤의 자정), 아홉 번
export const halloweenMidnight = d => d.getHours() === 0 && inPeriod('halloween', d);
