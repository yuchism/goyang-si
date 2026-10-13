/* 시간: 방 시계, 계절·해 뜨고 지는 시각, 비·눈, 상자 있는 날, 기념일, 명절, 햇빛 조각, 하늘색과 어둠 */
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
const TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  }
  catch (e) {
    return '';
  }
})();
const SOUTH = /^(Australia|Antarctica|Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Noumea)|America\/(Argentina|Santiago|Sao_Paulo|Montevideo|Asuncion|La_Paz|Lima)|Africa\/(Johannesburg|Maputo|Harare|Windhoek|Gaborone|Lusaka)|Indian\/(Mauritius|Reunion))/.test(TZ);
export const hourOf = d => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
export const dayKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
export const dayNum = d => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
export let seasonOverride = null, holidayOverride = null;
export function season(d) {
  if (seasonOverride)
    return seasonOverride;
  const m = d.getMonth();
  let s = m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
  if (SOUTH)
    s = { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' }[s];
  return s;
}
// 계절 이름은 i18n.js의 season
// 할로윈 호박 불: 해 질 무렵부터 다음 날 아침까지 (만득 씨가 끄지 않음)
export function pumpkinLit(d) {
  const h = hourOf(d), [r, s] = sunTimes(d);
  return h >= s - 0.3 || h < r + 0.3;
}
export function sunTimes(d) {
  const s = season(d);
  return s === 'summer' ? [5.5, 20] : s === 'winter' ? [7.2, 17.2] : [6.3, 18.6];
}
export const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
// 만득 씨가 정해진 시각에 오는 방문 (시각, 시간 단위). main.js 일정과 액자 바로잡기(frame.js)가 함께 쓴다
export function visitHours(d) {
  const we = isWeekend(d), v = { feed: we ? 9 : 7.4, lights: 23 };
  if (!we)
    v.ret = 18.6;
  if (isAnniversary(d))
    v.anniv = we ? 15 : 19.2;
  return v;
}
// 하루 일정 (이름, 시각). main.js scheduled()가 차례로 일으키고, 점프하면 jump.js가 지난 것을 "한 일"로 표시한다
export function dayEvents(d) {
  const vh = visitHours(d), ev = [['wait', vh.feed - 0.25], ['feed', vh.feed]];
  if (vh.ret)
    ev.push(['leave', 8.5], ['ret', vh.ret]);
  ev.push(['lampOn', sunTimes(d)[1] - 0.3], ['lights', vh.lights]);
  if (vh.anniv)
    ev.push(['anniv', vh.anniv]);
  return ev;
}
// a(ms) 뒤부터 b(ms)까지 지나간 정해진 방문 이름들 (visitHours의 이름, 지난 순서대로)
export function visitsBetween(a, b) {
  const out = [];
  if (!(b > a))
    return out;
  const day = new Date(a);
  day.setHours(0, 0, 0, 0);
  for (let i = 0; i < 400 && day.getTime() <= b; i++) {
    const vh = visitHours(day), list = [];
    for (const k in vh) {
      const h = vh[k], t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(h), Math.round((h % 1) * 60)).getTime();
      if (t > a && t <= b)
        list.push([t, k]);
    }
    list.sort((p, q) => p[0] - q[0]).forEach(p => out.push(p[1]));
    day.setDate(day.getDate() + 1);
  }
  return out;
}
export function mandukHome(d) {
  const h = hourOf(d);
  return isWeekend(d) || h < 8.5 || h >= 18.5;
}
export const mandukAsleep = d => {
  const h = hourOf(d);
  return h >= 23 || h < 7;
};
let rainOverride = null;
export function rainNow(d) {
  if (rainOverride !== null)
    return rainOverride;
  const k = dayKey(d), r = hash('rain' + k);
  let p = season(d) === 'summer' ? 0.28 : 0.2;
  if (r > p)
    return false;
  const st = 6 + hash('rs' + k) * 10, len = 2 + hash('rl' + k) * 7, h = hourOf(d);
  return h >= st && h < st + len;
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
export function holiday(d) {
  if (holidayOverride)
    return holidayOverride;
  const m = d.getMonth() + 1, dt = d.getDate(), y = d.getFullYear();
  if (m === 10 && dt >= 24 || m === 11 && dt === 1)
    return 'halloween';
  if (m === 12 && dt >= 14 && dt <= 26)
    return 'christmas';
  const seol = { 2026: '2-17', 2027: '2-6', 2028: '1-26', 2029: '2-13', 2030: '2-3' }[y];
  if (seol) {
    const [sm, sd] = seol.split('-').map(Number);
    const t = new Date(y, sm - 1, sd);
    const diff = (d - t) / 86400000;
    if (diff >= -1 && diff < 2)
      return 'seollal';
  }
  if (m === 1 && dt === 1)
    return 'newyear';
  return null;
}
/* ───────── 햇빛 조각 ───────── */
export function sunbeam(d) {
  const [r, s] = sunTimes(d), h = hourOf(d);
  if (h < r + 0.6 || h > s - 0.4)
    return null;
  const t = (h - (r + 0.6)) / ((s - 0.4) - (r + 0.6));
  const cx = lerp(1010, 250, t);
  let k = Math.sin(Math.PI * t);
  k = Math.pow(k, 0.6);
  if (rainNow(d))
    k *= 0.12;
  const sk = lerp(-120, 120, t);
  return { cx, k, sk, cy: 672 };
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
// 창밖은 한국(고양시) 하늘: 차오르는 달은 오른쪽이 빛난다. 남반구처럼 보이게 하려면 true
export const MOON_SOUTH = false;
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
