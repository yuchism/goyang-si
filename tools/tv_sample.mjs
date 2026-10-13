// TV 회귀 확인용 표본: 날짜 × 하루 여러 시각의 모드·프로그램·제목·장면 그림·사건·자막·점수를 뽑는다.
// 바꾸기 전 코드로 뽑은 것이 tools/tv_baseline.json, check_tv.mjs가 지금 코드로 다시 뽑아 비교한다.
// api: { tvSegs(bd), tvState(d), frame(st), evId(ev), evCap(ev), setLang(l) }
export const BASE_DAYS = (() => {
  const out = [];
  for (let i = 0; i < 30; i++)
    out.push([2026, 9, 13 + i]); // 2026-10-13부터 30일 (할로윈 주간 포함). 월은 0부터
  out.push([2026, 11, 24], [2026, 11, 25], [2027, 0, 1], [2027, 1, 6], [2027, 1, 7]); // 크리스마스 이브·당일, 새해, 설날
  return out;
})();
const r3 = v => Math.round(v * 1000) / 1000;
export function sampleDay(api, [y, m, dd]) {
  const bd = new Date(y, m, dd, 12), segs = api.tvSegs(bd);
  const day = { day: `${bd.getFullYear()}-${bd.getMonth() + 1}-${bd.getDate()}`, segs: [], samples: [] };
  const at = H => new Date(new Date(y, m, dd).getTime() + Math.round(H * 3600 * 1000));
  const rec = (H, why) => {
    const st = api.tvState(at(H));
    const row = [r3(H), st.mode];
    if (st.mode === 'prog')
      row.push(st.p, st.sg.title, api.frame(st), st.ev ? api.evId(st.ev) : null, st.ev ? api.evCap(st.ev) : null, st.score.join(':'), st.key);
    else
      row.push(api.frame(st));
    if (why)
      row.push(why);
    day.samples.push(row);
  };
  // 하루 내내: 4:59부터 다음 날 1:05까지 약 7분 13초마다 (매번 장면 위치가 달라지게)
  for (let H = 4 + 59 / 60; H < 25 + 5 / 60; H += 433 / 3600)
    rec(H);
  // 칸마다: 시작 직후, 끝 직전, 그리고 모든 사건의 처음·가운데·끝 무렵
  for (const sg of segs) {
    rec(sg.s + 2 / 3600);
    rec(sg.e - 2 / 3600);
    api.tvState(at(sg.s + 1 / 3600)); // 사건 목록 만들기
    const evs = api.events(sg);
    day.segs.push([sg.p, r3(sg.s), r3(sg.e), sg.title, evs.map(x => [r3(x.at), api.evId(x), api.evCap(x)])]);
    for (const x of evs) {
      const d = api.evDur(x);
      for (const k of [0.05, 0.5, 0.95])
        rec(sg.s + (x.at + d * k) / 3600, 'ev');
    }
  }
  return day;
}
export function sampleAll(api) {
  const out = {};
  for (const lang of ['ko', 'en']) {
    api.setLang(lang);
    out[lang] = BASE_DAYS.map(d => sampleDay(api, d));
  }
  api.setLang('ko');
  return out;
}
