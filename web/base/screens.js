/* 상황판 네 화면의 글자 (tasks/base-1-hall.md) — 지금 / 이번 주 / 누적 기록 / 최근 끝낸 일
   상태(status.js clean 결과)를 줄 목록으로 바꾼다. 줄 = { l: 왼쪽 줄 판, r: 오른쪽 줄 판 } 또는 { l, n: 숫자 칸, u: 단위 }.
   긴 글자는 판에서 …로 잘리고(base.css), 숫자는 칸 수(digits)에 맞게 자른다. 넘치는 줄은 쪽을 나눈다.
   날짜는 공장(한국) 날짜: JSON day("YYYY-MM-DD")와 한국 오늘을 비교한다 */
import { chars } from './status.js';

export const STR = {
  title: { ko: '쥐구멍 기지', en: 'Mousehole Base' },
  home: { ko: '고양.시 거실로', en: 'Back to the living room' },
  board: { ko: '상황판 — 누르면 다음 화면', en: 'Status board — tap for next screen' },
  practice: { ko: '연습 화면', en: 'Practice board' },
  last: { ko: '마지막 소식: ', en: 'Last update: ' },
  vent: { ko: { hmm: '음…', look: '어디 보자…', good: '음… 좋아' }, en: { hmm: 'Hmm…', look: 'Let’s see…', good: 'Hmm… good' } }, // 만득 씨 환기구 말풍선 (family.js)
  screens: {
    ko: { now: '지금', week: '이번 주', total: '누적 기록', recent: '최근 끝낸 일' },
    en: { now: 'NOW', week: 'THIS WEEK', total: 'ALL-TIME', recent: 'RECENTLY DONE' },
  },
  stage: {
    ko: { approval: '확정 대기', ready: '시작 전', relay: '지시서 왕복', implement: '구현', checks: '검사', image: '그림', image_check: '그림 검수', review: '검수', question: '질문', human_review: '사람 검수', deploy: '배포', blocked: '막힘', limit: '한도 대기' },
    en: { approval: 'Awaiting OK', ready: 'Ready', relay: 'Brief relay', implement: 'Building', checks: 'Checking', image: 'Drawing', image_check: 'Art check', review: 'Review', question: 'Question', human_review: 'Owner review', deploy: 'Deploying', blocked: 'Blocked', limit: 'Rate limit' },
  },
  round: { ko: '왕복 ', en: 'Relay ' },
  secret: { ko: '비밀 작업 🐾', en: 'Secret work 🐾' },
  idle: { ko: '모두 쉬는 중 🐾', en: 'All quiet 🐾' },
  none: { ko: '아직 없음', en: 'None yet' },
  week: {
    ko: [['week', '이번 주 완료', '건'], ['month', '이번 달 완료', '건'], ['noBlockDays', '무장애', '일']],
    en: [['week', 'Done this week', ''], ['month', 'Done this month', ''], ['noBlockDays', 'No-block streak', 'd']],
  },
  factory: { ko: ['기지 상태', '정상', '막힘', '한도 대기'], en: ['Base', 'OK', 'Blocked', 'Rate limit'] },
  roles: {
    ko: [['implement', '당번 구현'], ['review', '당번 검수'], ['image', '당번 그림']],
    en: [['implement', 'Duty: build'], ['review', 'Duty: review'], ['image', 'Duty: art']],
  },
  busy: { ko: ['일하는 중', '쉬는 중'], en: ['WORKING', 'idle'] },
  total: {
    ko: [['done', '완료', '건'], ['noBlockDays', '무장애', '일'], ['deploys', '까치 출동', '번'], ['images', '그림', '장'], ['redraws', '다시 그림', '장'], ['firstPassPct', '한 방 통과', '%'], ['relayAvg', '지시서 왕복 평균', '번'], ['rejected', '어명 반려', '번'], ['avgDays', '평균 걸린 날', '일']],
    en: [['done', 'Done', ''], ['noBlockDays', 'No-block streak', 'd'], ['deploys', 'Magpie runs', ''], ['images', 'Pictures', ''], ['redraws', 'Redraws', ''], ['firstPassPct', 'First-try pass', '%'], ['relayAvg', 'Brief relays avg', ''], ['rejected', 'Royal rejections', ''], ['avgDays', 'Avg days taken', 'd']],
  },
  ago: { ko: ['오늘', '어제', '일 전'], en: ['today', 'yesterday', ' days ago'] },
  agoShort: { ko: ['오늘', '어제', '일 전'], en: ['today', 'yday', 'd ago'] },
};
const ONE_DECIMAL = ['relayAvg', 'avgDays'];
export const SCREENS = ['now', 'week', 'total', 'recent'];

// 공장 날짜(한국, 서머타임 없음)의 날 번호
const DAY_MS = 86400000, KST_MS = 9 * 3600000;
const kstDayNum = ms => Math.floor((ms + KST_MS) / DAY_MS);
const dayNumOf = s => Math.floor(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / DAY_MS);
export const daysAgo = (day, nowMs) => Math.max(0, kstDayNum(nowMs) - dayNumOf(day));
export function agoText(lang, n, short) {
  const a = STR[short ? 'agoShort' : 'ago'][lang];
  return n === 0 ? a[0] : n === 1 ? a[1] : n + a[2];
}

// 칸 맞추기: 넘치면 마지막 칸을 …로
export function fit(s, n) {
  const c = chars(s);
  if (c.length <= n)
    return c;
  return n <= 0 ? [] : c.slice(0, n - 1).concat('…');
}
const line = (l, r) => ({ l: l || '', r: r || '' });
const num = (k, label, v, unit, digits) =>
  ({ l: label, n: v == null ? '—' : fit(ONE_DECIMAL.includes(k) ? v.toFixed(1) : String(Math.round(v)), digits).join(''), u: v == null ? '' : unit });

// 한 화면의 몸통 줄들. 지금 화면은 공항처럼 왼쪽 제목·오른쪽 단계
function body(name, data, lang, digits) {
  const T = k => STR[k][lang];
  if (name === 'now') {
    if (!data.tasks.length)
      return [line(T('idle'))];
    return data.tasks.map(t => line(t.title || T('secret'), t.stage === 'relay' && t.round ? T('round') + t.round : T('stage')[t.stage]));
  }
  if (name === 'week') {
    const f = T('factory'), b = T('busy');
    return T('week').map(([k, label, unit]) => num(k, label, data.stats[k], unit, digits))
      .concat([line(f[0], data.factory.blocked ? f[2] : data.factory.limit ? f[3] : f[1])])
      .concat(T('roles').map(([k, label]) => line(label, b[data.roles[k] === 'busy' ? 0 : 1])));
  }
  if (name === 'total')
    return T('total').map(([k, label, unit]) => num(k, label, data.stats[k], unit, digits));
  // recent
  if (!data.recent.length)
    return [line(T('none'))];
  const nowMs = Date.now();
  return data.recent.map(r => line(r.title || T('secret'), agoText(lang, daysAgo(r.day, nowMs), true)));
}

// 모든 쪽: [{ screen, lines: [줄 × rows] }]. 첫 줄은 화면 이름(+ 쪽 번호)
export function pages(data, lang, rows, digits) {
  const out = [];
  for (const name of SCREENS) {
    const lines = body(name, data, lang, digits);
    const per = Math.max(1, rows - 1), n = Math.ceil(lines.length / per);
    for (let p = 0; p < n; p++) {
      const head = line(STR.screens[lang][name], n > 1 ? (p + 1) + '/' + n : '');
      const part = lines.slice(p * per, (p + 1) * per);
      while (part.length < per)
        part.push(line());
      out.push({ screen: name, lines: [head, ...part] });
    }
  }
  return out;
}
