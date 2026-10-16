// 시간 기준 검사: 배포 전에  node tools/check_time.mjs   (TIME_BASE_PLAN.md 9장)
// 하나라도 실패하면 이유를 출력하고 실패(종료 코드 1)로 끝난다. 경고(⚠)는 실패가 아니다.
//   1. 규칙: 시간 모듈(time.js·calendar.js) 밖에서 getMonth·getDate·getDay·getHours·hourOf와
//      시각 숫자 비교(h >= 19, hour < 6, hr > 21.5 …)를 쓰지 않는다. 허용 목록(아래 ALLOW)과 줄 끝 `// time-ok`는 건너뛴다.
//      TV는 holiday()를 쓰지 않는다(달력 onDate만)
//   2~6은 시드니·서울 두 시간대로 프로세스를 따로 띄워 돌린다 (남반구 판단 SOUTH는 모듈을 불러올 때 정해지므로)
//   2. calendar.js: 다른 모듈을 불러오지 않고, 설날·추석 표가 올해 + 2년까지 있다 (없으면 경고)
//   3. 2026~2028년 모든 날 시간대 표(DAYPARTS)가 빈틈·겹침 없이 24시간을 채우고, 하루 차이로 해 시각이 3분 넘게 바뀌지 않는다(해 시각은 날짜별로 이어짐, WINDOW_PLAN_3.md 4-3).
//      풍경 날짜: 남반구는 반년 밀림, 한 날짜엔 두 계절만 섞임, 비 공통 함수(rainNow = rainSpan)
//   4. "하루" 세 가지·순간·할로윈 끝·방송일 하나에 편성 하나 같은 약속 몇 가지
//   5. schedule.json이 참조하는 기간 이름이 모두 calendar.js에 있다
//   6. 회귀: tools/time_baseline.json.gz(바꾸기 전 코드로 뽑은 2026~2030년 모든 날의 표본)와 지금 결과가 같다.
//      명절·계절·방송일·스탠드·만득 씨 집/잠·하루 일정·방문 시각·TV 기간. 허용 차이는 9장 목록뿐:
//        - 11/1 동틀 녘 끝 이후는 할로윈 아님, 방송일 11/1은 TV 할로윈 기간 아님
//        - 평일 18:30~18:36 만득 씨 아직 집에 안 옴
//        - 서머타임이 시작된 다음 날 0~1시의 방송일 (예전 "24시간 빼기"가 이틀 전 날짜를 내던 것을 바로잡음)
// 옵션: --write-baseline  (지금 결과를 회귀 기준으로 저장. 기준을 일부러 바꿨을 때만)
import { spawnSync } from 'child_process';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync, gzipSync } from 'zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(ROOT, 'web'), JS = join(WEB, 'js');
const BASE = join(ROOT, 'tools/time_baseline.json.gz');
const TZS = ['Australia/Sydney', 'Asia/Seoul'];
const FIRST = new Date(2025, 2, 7, 10).getTime(); // 기념일이 표본에 들어가게 정해 둔 "처음 온 날" (기준과 같게)
const args = process.argv.slice(2);

// ───────── 1. 규칙 (시간대와 상관없음) ─────────
const TIME_MODULES = ['time.js', 'calendar.js'];
// 허용 목록: 화면 표시용 시계 문자열, 미리보기 도구, TV 편성 내부(요일·시즌·편성 칸은 방송 시간)
const ALLOW = [
  { file: 'ui.js', why: '미리보기 도구' },
  { file: 'tv-dev.js', why: '미리보기 도구 (TV 칸)' },
  { file: 'tv-core.js', why: 'TV 편성 내부 (방송 시간: 요일·시즌·편성 칸. 날짜 기간은 달력)' },
  { file: 'main.js', line: /d\.getHours\(\), mi =|tr\(h < 12 \? 'am'|tr\('dow'\)\[d\.getDay\(\)\]/, why: '상단 시계 문자열' },
  { file: 'main.js', line: /getElementById\('(hourv|moonv)'\)/, why: '미리보기 도구 표시' },
];
const RULES = [
  [/\b(getMonth|getDate|getDay|getHours)\s*\(/, '날짜·시각을 직접 읽음'],
  [/\bhourOf\b/, 'hourOf를 직접 씀'],
  [/\b(h|hr|hour|hh)\s*(<=|>=|<|>|===|==|!==|!=)\s*\d/, '시각 숫자 비교'],
  [/\d\s*(<=|>=|<|>)\s*(h|hr|hour|hh)\b/, '시각 숫자 비교'],
];
function scanRules() {
  const fails = [], allowed = {};
  for (const f of readdirSync(JS).filter(x => x.endsWith('.js')).sort()) {
    if (TIME_MODULES.includes(f))
      continue;
    const lines = readFileSync(join(JS, f), 'utf8').split('\n');
    let inBlock = false;
    lines.forEach((raw, i) => {
      let line = raw;
      if (inBlock) {
        if (!line.includes('*/'))
          return;
        line = line.slice(line.indexOf('*/') + 2);
        inBlock = false;
      }
      if (/^\s*\/\*/.test(line) && !line.includes('*/')) {
        inBlock = true;
        return;
      }
      if (/\/\/\s*time-ok\b/.test(raw))
        return;
      const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
      for (const [re, why] of RULES) {
        if (!re.test(code))
          continue;
        const a = ALLOW.find(x => x.file === f && (!x.line || x.line.test(code)));
        if (a)
          allowed[a.why] = (allowed[a.why] || 0) + 1;
        else
          fails.push(`${f}:${i + 1} ${why}: ${raw.trim().slice(0, 120)}`);
        break;
      }
      if (/^tv-/.test(f) && /(^|[^.\w])holiday\(/.test(code))
        fails.push(`${f}:${i + 1} TV는 holiday()를 쓰지 않는다 (onDate): ${raw.trim().slice(0, 120)}`);
    });
  }
  return { fails, notes: ['허용 목록에서 건너뛴 줄: ' + (Object.entries(allowed).map(([k, v]) => `${k} ${v}`).join(' · ') || '없음')] };
}

// ───────── 2~6. 시간대마다 (자식 프로세스) ─────────
async function child() {
  process.env.TV_TZ = process.env.TV_TZ || 'Asia/Seoul';
  await import('./node_env.mjs');
  localStorage.setItem('goyang.first', JSON.stringify(FIRST));
  const time = await import(join(JS, 'time.js'));
  const { CAL } = await import(join(JS, 'calendar.js'));
  const core = await import(join(JS, 'tv-core.js'));
  const { sampleTime } = await import(join(ROOT, 'tools/time_sample.mjs'));
  const sched = JSON.parse(readFileSync(join(WEB, 'r/tv/schedule.json'), 'utf8'));
  const fails = [], warns = [], notes = [], out = { tz: process.env.TZ, fails, warns, notes };
  core.setSchedule(sched).forEach(w => fails.push('schedule.json: ' + w));
  const fail = m => fails.push(m), eq = (a, b, m) => {
    if (a !== b)
      fail(`${m}: ${JSON.stringify(a)} (기대 ${JSON.stringify(b)})`);
  };
  const T = (y, mo, d, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi);
  const hm = h => {
    const m = Math.round(h * 60);
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };

  // 지역: 이 기기에서 계절·밤 시작·달
  const oct = T(2026, 10, 15), st = Object.fromEntries(time.daypartStarts(oct));
  notes.push(`지역: 10월 = ${time.season(oct)}${time.seasonSouth() ? '(남반구)' : ''} · 해 ${hm(time.sunTimes(oct)[0])}~${hm(time.sunTimes(oct)[1])} · 밤 시작(isNight) ${hm(st.evening)} · 차오르는 달 ${time.MOON_SOUTH ? '왼쪽' : '오른쪽'}이 빛남`);
  if (time.MOON_SOUTH !== false && time.REGION.moon === 'korea')
    fail('달은 한국 기준인데 MOON_SOUTH가 false가 아님');

  // 2. calendar.js
  const calSrc = readFileSync(join(JS, 'calendar.js'), 'utf8');
  if (/^\s*import\s/m.test(calSrc))
    fail('calendar.js가 다른 모듈을 불러옴 (데이터만 두기로 함)');
  const y0 = new Date().getFullYear();
  for (const n of ['seollal', 'chuseok']) {
    const p = CAL.periods[n];
    if (!p || !p.dates)
      fail(`calendar.js: ${n} 표가 없음`);
    else
      for (let y = y0; y <= y0 + 2; y++)
        if (!p.dates[y])
          warns.push(`calendar.js: ${n} ${y}년 날짜가 없음 (올해 + 2년까지 채워 두기)`);
  }
  for (const [n, p] of Object.entries(CAL.periods))
    if (!(p.date || (p.from && p.to) || p.dates))
      fail(`calendar.js 기간 ${n}: date · from/to · dates 중 하나가 있어야 함`);

  // 3. 시간대 표 (WINDOW_PLAN_3.md 4-3: 해 시각이 날짜별로 이어짐). 2026~2028년 모든 날
  //    빈틈·겹침 없이 24시간, 하루 차이로 해 시각이 3분 넘게 바뀌지 않음
  {
    let bad = 0, maxStep = 0, prev = null;
    for (let i = 0; i < 365 * 3 + 1; i++) {
      const d = T(2026, 1, 1 + i), sts = time.daypartStarts(d), sun = time.sunTimes(d);
      const ok = sts[0][1] === 0 && sts.every((x, k) => k === 0 || x[1] > sts[k - 1][1]) && sts[sts.length - 1][1] < 24;
      if (!ok && bad++ < 3)
        fail(`${time.dayKey(d)}: 시간대 표에 빈틈·겹침 (${sts.map(([n, a]) => n + ' ' + hm(a)).join(' · ')})`);
      if (prev)
        maxStep = Math.max(maxStep, Math.abs(sun[0] - prev[0]) * 60, Math.abs(sun[1] - prev[1]) * 60);
      prev = sun;
    }
    if (maxStep > 3)
      fail(`하루 차이로 해 시각이 ${maxStep.toFixed(1)}분 바뀜 (3분 넘음)`);
    notes.push(`해 시각: 하루 변화 최대 ${maxStep.toFixed(2)}분`);
    // 하루 안 시간대가 표대로 (대표 날짜 하루씩)
    for (const s of ['spring', 'summer', 'autumn', 'winter']) {
      time.setOverride('season', s);
      const sts = time.daypartStarts(oct);
      for (let m = 0; m < 1440; m++) {
        const d = T(2026, 10, 15, 0, m), p = time.daypart(d), at = sts.filter(x => x[1] <= m / 60 + 1e-9).pop();
        if (!at || at[0] !== p) {
          fail(`${s} ${hm(m / 60)}: 시간대 ${p}가 표와 다름`);
          break;
        }
      }
      notes.push(`${s}(풍경 ${time.SEASON_DATE[s]}): ` + sts.map(([n, a], i) => `${n} ${hm(a)}~${hm(i + 1 < sts.length ? sts[i + 1][1] : 24)}`).join(' · '));
    }
    time.setOverride('season', null);
  }
  // 3-1. 풍경 날짜 (WINDOW_PLAN_3.md 4장): 남반구는 반년 밀림, 한 날짜엔 두 계절만, 범위 이름이 calendar.js에 있음
  {
    const md = time.sceneryDate(T(2026, 10, 13)), want = time.seasonSouth() ? '04-13' : '10-13';
    if (Math.abs(time.posOf(md) - time.posOf(want)) > 2 / 365)
      fail(`풍경 날짜 10/13 = ${md} (기대 ${want} 언저리${time.seasonSouth() ? ', 남반구 반년 밀림' : ''})`);
    const seasons = new Set(['spring', 'summer', 'autumn', 'winter']);
    for (let i = 0; i < 366; i++) {
      const d = T(2028, 1, 1 + i), sc = time.sceneryAt(d), live = sc.mix.filter(([, k]) => k > 0);
      if (live.length > 2 || Math.abs(sc.mix[0][1] + sc.mix[1][1] - 1) > 1e-9 || !sc.mix.every(([n]) => seasons.has(n))) {
        fail(`${time.dayKey(d)}: 산 섞기가 이상함 ${JSON.stringify(sc.mix)}`);
        break;
      }
    }
    for (const n of ['autumnSky', 'leaves', 'geeseSouth', 'geeseNorth', 'snowCapMelt', 'blossom', 'dust', 'monsoon', 'dragonfly', 'tropicalNight'])
      if (!CAL.scenery || !CAL.scenery[n] || !CAL.scenery[n].from || !CAL.scenery[n].to)
        fail(`calendar.js scenery.${n}가 없음`);
    const fs = time.firstSnow(T(2027, 1, 20));
    notes.push(`풍경: 10/13 = ${md} · 첫눈(2027-1-20이 속한 겨울) ${fs ? time.dayKey(fs.day) : '없음'}`);
    // 비 공통 함수: rainNow와 rainSpan이 같은 비를 말한다
    for (let i = 0; i < 365; i += 3) {
      const day = T(2026, 1, 1 + i), sp = time.rainSpan(day);
      for (let h = 0; h < 24; h += 0.5) {
        const t = T(2026, 1, 1 + i, Math.floor(h), (h % 1) * 60), inSpan = !!sp && t.getTime() >= sp.start && t.getTime() < sp.end;
        if (inSpan !== time.rainNow(t)) {
          fail(`${time.dayKey(day)} ${hm(h)}: rainNow와 rainSpan이 다름`);
          i = 999;
          break;
        }
      }
    }
  }

  // 4. 약속 몇 가지 (봄·가을 해: 06:18 / 18:36 기준 날짜가 아니어도 되는 것들)
  const k = d => d && time.dayKey(d);
  eq(k(time.broadcastDay(T(2026, 11, 1, 5, 0))), '2026-11-1', '방송일 11/1 05:00');
  eq(k(time.broadcastDay(T(2026, 11, 1, 7, 0))), '2026-11-1', '방송일 11/1 07:00');
  eq(k(time.broadcastDay(T(2026, 11, 2, 2, 0))), '2026-11-1', '방송일 11/2 02:00');
  eq(time.broadcastDay(T(2026, 11, 2, 2, 0)).getHours(), 12, '방송일은 정오의 Date');
  eq(k(time.broadcastDay(T(2026, 10, 5, 0, 30))), '2026-10-4', '서머타임 다음 날 0:30의 방송일 (시드니 10/4 시작)');
  eq(time.nightOf(T(2026, 10, 31, 21)), '2026-10-31', '하룻밤 10/31 21:00');
  eq(time.nightOf(T(2026, 11, 1, 3)), '2026-10-31', '하룻밤 11/1 03:00');
  eq(time.nightOf(T(2026, 11, 1, 10)), null, '하룻밤 11/1 10:00 (아침·낮은 null)');
  eq(time.calDay(T(2026, 1, 5, 9)), '2026-1-5', '달력 날 키 형식 (0을 채우지 않음)');
  eq(time.momentNow('halloweenNight', T(2026, 10, 31, 20, 59)), false, '10/31 20:59 마녀 순간');
  eq(time.momentNow('halloweenNight', T(2026, 10, 31, 21, 0)), true, '10/31 21:00 마녀 순간');
  eq(time.momentNow('halloweenNight', T(2026, 11, 1, 2, 0)), true, '11/1 02:00 마녀 순간 (자정을 넘은 그 밤)');
  eq(time.momentNow('halloweenNight', T(2026, 11, 1, 11, 0)), false, '11/1 11:00 마녀 순간');
  eq(time.momentNow('christmasEveNight', T(2026, 12, 25, 1, 0)), true, '12/25 01:00 산타 순간');
  eq(time.holiday(T(2026, 10, 24, 0, 30)), 'halloween', '할로윈 시작 10/24 00:30');
  eq(time.holiday(T(2026, 11, 1, 3)), 'halloween', '11/1 03:00 할로윈 (그 밤이 끝나기 전)');
  eq(time.holiday(T(2026, 11, 1, 12)), null, '11/1 12:00 할로윈 끝');
  eq(time.holiday(T(2026, 10, 23, 23)), null, '10/23 23:00 할로윈 전');
  eq(time.holiday(T(2027, 2, 5)), 'seollal', '설날 전날 2027-2-5');
  eq(time.holiday(T(2027, 2, 8)), null, '설날 다음다음 날 2027-2-8');
  eq(core.periodOn('할로윈', time.broadcastDay(T(2026, 11, 1, 3))), true, 'TV: 11/1 03:00은 방송일 10/31 → 할로윈 특집');
  eq(core.periodOn('할로윈', time.broadcastDay(T(2026, 11, 1, 6))), false, 'TV: 방송일 11/1은 할로윈 아님');
  eq(core.periodOn('추석', T(2028, 10, 2)), true, 'TV: 추석 2028-10-2');
  eq(core.periodOn('크리스마스', T(2026, 12, 14)), false, 'TV: 크리스마스 특집은 이브·당일만');
  time.setOverride('holiday', 'halloween');
  eq(core.periodOn('할로윈', T(2026, 3, 3)), true, '미리보기 할로윈 켜기 → TV 공포 특집도');
  eq(core.periodOn('설날', T(2027, 2, 6)), false, '미리보기 할로윈 켜기 → 설날 기간 아님');
  time.setOverride('holiday', null);
  // 하루 일정: 지난 것만, 상태와 함께
  time.setOverride('season', 'winter'); // 해 지는 시각이 날마다 다르므로 겨울 대표 날짜(해 17:20)로 본다
  const pe = time.passedEvents(T(2026, 10, 13, 18, 50)).map(e => e.name + ':' + e.state).join(' ');
  time.setOverride('season', null);
  eq(pe, 'wait:late feed:late leave:late ret:due lampOn:late', '평일 18:50 지난 일정 (겨울)');
  eq(time.mandukHome(T(2026, 10, 13, 18, 33)), false, '평일 18:33 만득 씨 아직 안 옴 (귀가 18:36)');
  eq(time.mandukHome(T(2026, 10, 13, 18, 36)), true, '평일 18:36 귀가');
  eq(time.inWindow(time.routineOf(T(2026, 10, 17, 14)).tvSound, T(2026, 10, 17, 14)), true, '토요일 14시 만득 씨 TV 소리');
  eq(time.inWindow(time.routineOf(T(2026, 10, 13, 14)).tvSound, T(2026, 10, 13, 14)), false, '평일엔 TV 소리 없음');
  for (const s of ['spring', 'summer', 'winter']) { // 밤 시작: 대표 날짜(계절 버튼)의 해 진 뒤 30분 (WINDOW_PLAN_3.md 4-3)
    time.setOverride('season', s);
    const ns = Object.fromEntries(time.daypartStarts(oct)).evening;
    eq(hm(ns), hm(time.sunTimes(oct)[1] + 0.5), `${s} 밤(UFO·마녀·산타) 시작 = 해 진 뒤 30분`);
    eq(time.isNight(T(2026, 10, 15, 0, Math.ceil(ns * 60 - 1e-9) - 1)), false, `${s} 밤 시작 1분 전`);
    eq(time.isNight(T(2026, 10, 15, 0, Math.ceil(ns * 60 - 1e-9))), true, `${s} 밤 시작`);
  }
  time.setOverride('season', null);

  // 5. schedule.json → calendar.js
  for (const [n, v] of Object.entries(sched.periods || {})) {
    if (n.startsWith('_'))
      continue;
    const name = v && (v.period || v.holiday);
    if (!name)
      fail(`schedule.json 기간 ${n}: "period"가 없음 (날짜는 calendar.js에)`);
    else if (!CAL.periods[name])
      fail(`schedule.json 기간 ${n}: calendar.js에 ${name}이 없음`);
  }

  // 6. 회귀
  const now = sampleTime({ time, core });
  out.data = now;
  if (args.includes('--write-baseline'))
    return out;
  const base = JSON.parse(gunzipSync(readFileSync(BASE)).toString('utf8')).data[process.env.TZ];
  if (!base) {
    fail(`회귀 기준에 ${process.env.TZ} 시간대가 없음`);
    return out;
  }
  const allowed = {}, ok = m => allowed[m] = (allowed[m] || 0) + 1;
  let shown = 0, diff = 0, total = 0;
  const show = m => {
    diff++;
    if (shown++ < 15)
      fail(m);
  };
  const FIELDS = ['분', '명절', '계절', '방송일', '스탠드', '만득 집', '만득 잠'];
  base.forEach((bd, i) => {
    const nd = now[i];
    if (!nd || nd.day !== bd.day)
      return show(`${bd.day}: 날짜 목록이 다름`);
    const [y, mo, dd] = bd.day.split('-').map(Number), we = [0, 6].includes(new Date(y, mo - 1, dd).getDay());
    for (const f of ['ev', 'vh']) {
      total++;
      if (bd[f] !== nd[f])
        show(`${bd.day} ${f === 'ev' ? '하루 일정' : '방문 시각'}: 기준 ${bd[f]} / 지금 ${nd[f]}`);
    }
    total++;
    if (bd.tv !== nd.tv) {
      if (mo === 11 && dd === 1 && bd.tv.split(',').filter(x => x !== '할로윈').join(',') === nd.tv)
        ok('방송일 11/1 TV 할로윈 아님');
      else
        show(`${bd.day} TV 기간: 기준 ${bd.tv || '-'} / 지금 ${nd.tv || '-'}`);
    }
    bd.s.forEach((row, j) => {
      total++;
      const nrow = nd.s[j];
      if (row === nrow)
        return;
      const a = row.split('|'), b = (nrow || '').split('|'), m = +a[0];
      const t = new Date(y, mo - 1, dd, 0, m), why = [];
      for (let c = 1; c < FIELDS.length; c++) {
        if (a[c] === b[c])
          continue;
        if (c === 1 && a[c] === 'halloween' && b[c] === '-' && mo === 11 && dd === 1 && time.nightOf(t) !== `${y}-10-31`)
          why.push(['11/1 동틀 녘 끝 이후 할로윈 아님']);
        else if (c === 5 && !we && m >= 18 * 60 + 30 && m < 18 * 60 + 36 && a[c] === '1' && b[c] === '0')
          why.push(['평일 18:30~18:36 만득 씨 아직 안 옴']);
        else if (c === 3 && m < 5 * 60 && b[c] === time.dayKey(new Date(y, mo - 1, dd - 1, 12)))
          why.push(['서머타임 다음 날 새벽의 방송일 바로잡음']);
        else
          why.push([null, `${FIELDS[c]} 기준 ${a[c]} / 지금 ${b[c]}`]);
      }
      const bad = why.filter(w => !w[0]);
      if (bad.length)
        show(`${bd.day} ${hm(m / 60)}: ` + bad.map(w => w[1]).join(', '));
      else
        why.forEach(w => ok(w[0]));
    });
  });
  if (diff > shown)
    fail(`… 다른 곳이 모두 ${diff}군데`);
  notes.push(`회귀: ${total}개 비교 (2026~2030년). 허용한 차이: ` + (Object.entries(allowed).map(([k, v]) => `${k} ${v}`).join(' · ') || '없음'));
  return out;
}

if (args.includes('--child')) {
  const out = await child().catch(e => ({ tz: process.env.TZ, fails: [`검사 중 오류 ${e && e.stack || e}`], warns: [], notes: [] }));
  if (!args.includes('--write-baseline'))
    delete out.data;
  process.stdout.write('\n@@RESULT@@' + JSON.stringify(out));
}
else {
  let failed = 0;
  const report = (title, r) => {
    console.log(`${r.fails.length ? '✗' : '✓'} ${title}${r.fails.length ? ` (${r.fails.length}건)` : ''}`);
    (r.notes || []).forEach(n => console.log('    ' + n));
    (r.warns || []).forEach(w => console.log('  ⚠ ' + w));
    r.fails.forEach(f => console.log('  - ' + f));
    failed += r.fails.length;
  };
  report('규칙: 시간 모듈 밖에서 날짜·시각을 직접 보지 않음', scanRules());
  const data = {};
  for (const tz of TZS) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--child', ...args], { env: { ...process.env, TV_TZ: tz }, encoding: 'utf8', maxBuffer: 1 << 28 });
    const txt = r.stdout || '', at = txt.lastIndexOf('@@RESULT@@');
    const res = at < 0 ? { fails: [`자식 프로세스 실패: ${(r.stderr || txt).slice(0, 800)}`], notes: [], warns: [] } : JSON.parse(txt.slice(at + 10));
    if (res.data)
      data[tz] = res.data;
    delete res.data;
    report(`${tz}: 달력·시간대 표·약속·회귀`, res);
  }
  if (args.includes('--write-baseline') && Object.keys(data).length === TZS.length) {
    writeFileSync(BASE, gzipSync(JSON.stringify({ made: new Date().toISOString(), first: '2025-03-07', data })));
    console.log('회귀 기준을 새로 저장: tools/time_baseline.json.gz');
  }
  console.log(failed ? `\n실패 ${failed}건` : '\n모두 통과');
  process.exit(failed ? 1 : 0);
}
