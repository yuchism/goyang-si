// 시간 기준 회귀 표본 (TIME_BASE_PLAN.md 10장 1단계): 날짜 × 하루 여러 시각의
// 명절·계절·방송일·스탠드·만득 씨 집/잠, 그날 일정·방문 시각, TV 기간을 뽑는다.
// check_time.mjs가 지금 코드로 다시 뽑아 tools/time_baseline.json.gz와 비교한다.
// 바꾸기 전 코드(함수 이름이 다름)에서도 돌도록, 새 함수가 없으면 예전 계산을 쓴다.
// api: { time, core }  (time.js, tv-core.js 모듈)
export const Y0 = 2026, Y1 = 2030;
// 하루 표본 시각(분): 00:03부터 12분마다 + 귀가 경계(18:29~18:37) + 방송일 경계(4:59, 5:00)
export const MINUTES = (() => {
  const s = new Set();
  for (let m = 3; m < 1440; m += 12)
    s.add(m);
  [18 * 60 + 29, 18 * 60 + 31, 18 * 60 + 35, 18 * 60 + 37, 4 * 60 + 59, 5 * 60, 0, 60 + 30].forEach(m => s.add(m));
  return [...s].sort((a, b) => a - b);
})();
export function sampleTime({ time, core }) {
  const { dayKey, holiday, season, hourOf, sunTimes, mandukHome, mandukAsleep, dayEvents, visitHours } = time;
  const bdKey = time.broadcastDay ? d => dayKey(time.broadcastDay(d)) : d => dayKey(core.tvBday(d));
  const lamp = time.lampShouldBeOn || (d => hourOf(d) >= sunTimes(d)[1] - 0.3 && hourOf(d) < 23);
  const periods = Object.keys(core.SCHED.periods);
  const days = [];
  for (let y = Y0; y <= Y1; y++)
    for (let d = new Date(y, 0, 1, 12); d.getFullYear() === y; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12)) {
      const row = { day: dayKey(d), ev: dayEvents(d).map(([n, h]) => n + '@' + Math.round(h * 60)).join(' '), vh: JSON.stringify(visitHours(d)),
        tv: periods.filter(n => core.periodOn(n, d)).join(','), s: [] };
      for (const m of MINUTES) {
        const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, m);
        if (t.getHours() * 60 + t.getMinutes() !== m)
          continue; // 서머타임으로 없는 시각
        row.s.push([m, holiday(t) || '-', season(t), bdKey(t), lamp(t) ? 1 : 0, mandukHome(t) ? 1 : 0, mandukAsleep(t) ? 1 : 0].join('|'));
      }
      days.push(row);
    }
  return days;
}
