// TV 검사: 배포 전에 노트북에서  node tools/check_tv.mjs
// 하나라도 실패하면 이유를 출력하고 실패(종료 코드 1)로 끝난다. TV_STABILITY_PLAN.md 6장
//   1. programs.json의 모든 그림이 web/r/tv/에 있다
//   2. 이름·자막·화면 장식 번역 키가 한국어·영어 모두 있다 (+ 프로그램 검사 전부: 길이, 간격, 반응 이름…)
//   3. 방송국 틀(schedule.json)에 문제가 없다
//   4. 편성 규칙 400일 (TV_SCHEDULE_PLAN.md 6장): 05:10~00:55(낮잠 정파 빼고) 빈틈·겹침·화면 조정 없음, 같은 프로그램 연달아 없음,
//      하루 상한(maxPerDay), 생중계 앞 같은 종목 재방 없음, 한 편 길이 = runtime(재방은 rerunRuntime, flex만 짧게),
//      할로윈 특집, 조건 충돌 없음, 같은 시즌의 같은 요일은 매주 같은 편성, 드라마 회차가 하나씩 오름. 프로그램별 하루 시간도 출력
//      새 프로그램(영화·음악방송·누아르)이 제 시각에 나오고, 모든 프로그램이 400일 안에 한 번 이상 편성된다
//   5. 가짜 프로그램(tools/tv_fake_programs.json: 크리스마스 특집·짧은 프로 하나 더)을 더해도 4가 통과하고, 특집이 제 시각에 나온다
//   6. 앞으로 400일: 모든 칸의 사건 만들기가 끝나며, 오류가 없다 (할로윈·크리스마스 포함)
//   7. 회귀 확인: tools/tv_baseline.json.gz와 지금 결과가 같다 (편성을 일부러 바꿨으면 --write-baseline으로 새로 뽑는다)
// 옵션: --programs 다른/programs.json  (고장 낸 표를 시험할 때)   --schedule 다른/schedule.json   --no-baseline  (회귀 확인 건너뛰기)
//       --write-baseline  (지금 결과를 회귀 기준으로 저장)
import './node_env.mjs';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync, gzipSync } from 'zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(ROOT, 'web');
const args = process.argv.slice(2);
const progPath = args.includes('--programs') ? resolve(args[args.indexOf('--programs') + 1]) : join(WEB, 'r/tv/programs.json');
const schedPath = args.includes('--schedule') ? resolve(args[args.indexOf('--schedule') + 1]) : join(WEB, 'r/tv/schedule.json');
const { STR, setLang } = await import(join(WEB, 'js/i18n.js'));
const core = await import(join(WEB, 'js/tv-core.js'));
const { sampleAll } = await import(join(ROOT, 'tools/tv_sample.mjs'));

const fails = [], notes = [];
const fail = m => fails.push(m);
const section = (n, f) => {
  const before = fails.length;
  try {
    f();
  }
  catch (e) {
    fail(`${n}: 검사 중 오류 ${e && e.stack || e}`);
  }
  console.log(`${fails.length === before ? '✓' : '✗'} ${n}${fails.length === before ? '' : ` (${fails.length - before}건)`}`);
};

let raw = null, sched = null;
section('programs.json·schedule.json 읽기', () => {
  raw = JSON.parse(readFileSync(progPath, 'utf8'));
  sched = JSON.parse(readFileSync(schedPath, 'utf8'));
});
raw = raw || {};
// 3. 방송국 틀 (프로그램보다 먼저: 방영 조건이 시간대·기간 이름을 쓴다)
section('방송국 틀 (schedule.json)', () => {
  core.setSchedule(sched).forEach(w => fail(w));
  if (!core.SCHED.naps.length)
    notes.push('낮잠 정파 없음');
});

// 2. 프로그램 검사 (불러올 때와 같은 검사) + 번역 한국어·영어 둘 다
section('프로그램 검사·번역', () => {
  const { problems, warnings } = core.setPrograms(raw);
  problems.forEach(p => p.errors.forEach(e => fail(e)));
  warnings.forEach(w => fail('경고: ' + w));
  const keys = new Set();
  for (const p of Object.values(raw)) {
    if (!p || typeof p !== 'object')
      continue;
    keys.add(p.name);
    for (const k of core.TV_KINDS)
      (Array.isArray(p[k]) ? p[k] : []).forEach(c => c && c.title && keys.add(c.title));
    [...(p.events || []), ...(p.end ? [p.end] : [])].forEach(e => e && e.cap && keys.add(e.cap));
    (Array.isArray(p.overlay) ? p.overlay : p.overlay ? [p.overlay] : []).forEach(o => o && keys.add(o.text || o.teams || o.phone));
    ((p.segments && p.segments.list) || []).forEach(g => {
      if (g && g.shop)
        keys.add(g.shop);
      if (g && g.end && g.end.cap)
        keys.add(g.end.cap);
    });
  }
  for (const k of ['tvTuning', 'tvAdjusting', 'tvgAdjust', 'tvFirstRun', 'tvRerun', 'tvLive', 'tvHighlight', 'tvSpecial', 'tvEp', 'tvSeasonEp', 'tvNapSignoff', 'tvgNap', 'tvgNapOff',
    ...core.SCHED.station.map(x => x.title).filter(Boolean), ...Object.values(core.SCHED.periods).map(x => x.title).filter(Boolean)])
    keys.add(k);
  for (const k of keys) {
    if (!k || !STR[k]) {
      fail(`번역 키 ${k}가 i18n.js에 없음`);
      continue;
    }
    for (const l of ['ko', 'en'])
      if (STR[k][l] == null || (Array.isArray(STR[k][l]) ? !STR[k][l].length : STR[k][l] === ''))
        fail(`번역 키 ${k}의 ${l}이 비어 있음`);
    if (Array.isArray(STR[k].ko) !== Array.isArray(STR[k].en))
      fail(`번역 키 ${k}: 한국어·영어 하나는 목록, 하나는 글자`);
  }
});

// 1. 그림 파일
section('그림 파일', () => {
  for (const [id, p] of Object.entries(raw)) {
    if (!p || typeof p !== 'object' || id.startsWith('_'))
      continue;
    const segs = (p.segments && p.segments.list) || [];
    const frames = new Set([...(p.loop || []).map(x => x && x[0]), ...[...(p.events || []), ...(p.end ? [p.end] : []), ...segs.map(g => g && g.end).filter(Boolean)].flatMap(e => (e && e.frames) || []),
      ...segs.flatMap(g => ((g && g.loop) || []).map(x => x && x[0]))]);
    frames.delete('@'); // '@' = 자막만, 지금 장면 그대로
    for (const f of frames)
      if (typeof f === 'string' && !existsSync(join(WEB, 'r/tv', f + '.webp')))
        fail(`${id}: 그림 web/r/tv/${f}.webp 없음`);
  }
  const meta = JSON.parse(readFileSync(join(WEB, 'r/tv/meta.json'), 'utf8'));
  for (const f of [meta.body.file, ...Object.values(meta.baseScreens).flat()])
    if (!existsSync(join(WEB, 'r/tv', f)))
      fail(`기본 화면 그림 web/r/tv/${f} 없음`);
});

// 4·5. 편성 규칙 (TV_SCHEDULE_PLAN.md 6장)
const D0 = new Date(2026, 9, 13, 12), DAYS = 400;
const dayAt = i => new Date(D0.getFullYear(), D0.getMonth(), D0.getDate() + i, 12);
const WDN = '일월화수목금토';
const dname = bd => `${bd.getFullYear()}-${bd.getMonth() + 1}-${bd.getDate()}(${WDN[bd.getDay()]})`;
const fm = m => core.fmtH(m / 60), M = h => Math.round(h * 60);
const anyPeriod = bd => Object.keys(core.SCHED.periods).some(n => core.periodOn(n, bd));
function checkRules(tag) {
  const on = M(core.TV_PROG0), off = M(core.TV_PROG1), week = {}, lastEp = {}, tot = {}, max = {};
  let shown = 0, extra = 0;
  const bad = m => {
    if (shown++ < 25)
      fail(tag + m);
    else
      extra++;
  };
  for (let i = 0; i < DAYS; i++) {
    const bd = dayAt(i), day = core.tvDay(bd), segs = day.segs, ds = dname(bd);
    day.conflicts.forEach(c => bad(`${ds}: ${c}`));
    // 05:10~00:55 (낮잠 정파 빼고) 빈틈·겹침 없이
    const wins = [];
    let w0 = on;
    for (const n of day.naps) {
      wins.push([w0, n.a]);
      w0 = n.b;
    }
    wins.push([w0, off]);
    let k = 0;
    for (const [a, b] of wins) {
      let t = a;
      while (k < segs.length && M(segs[k].s) < b) {
        if (M(segs[k].s) !== t)
          bad(`${ds} ${fm(t)}: ${M(segs[k].s) > t ? '빈틈' : '겹침'}`);
        t = M(segs[k].e);
        k++;
      }
      if (t !== b)
        bad(`${ds}: ${fm(Math.min(t, b))}–${fm(Math.max(t, b))} ${t < b ? '빈틈' : '넘침'}`);
    }
    if (k !== segs.length)
      bad(`${ds}: 방송 시간 밖(또는 낮잠 정파 안)에 칸이 있음`);
    const used = {}, today = {};
    segs.forEach((sg, j) => {
      const P = core.TVP[sg.p], len = M(sg.e) - M(sg.s), at = `${ds} ${core.fmtH(sg.s)}`;
      if (!P)
        return bad(`${at}: 화면 조정 (채울 프로그램 없음)`);
      if (j && segs[j - 1].p === sg.p && M(segs[j - 1].e) === M(sg.s))
        bad(`${at}: ${sg.p} 연달아`);
      const want = core.tvRunFor(P, sg.kind);
      if (sg.flex ? !(len > 0 && len <= P.runtime) : !sg.station && len !== want)
        bad(`${at}: ${sg.p} 길이 ${len}분 (${sg.flex ? 'flex는 runtime 이하' : want + '분이어야 함'})`);
      if (!sg.fixed && !sg.flex && !sg.short)
        used[sg.p] = (used[sg.p] || 0) + len;
      if (sg.kind === 'rerun' && segs.some(l => l.p === sg.p && l.kind === 'live' && M(l.s) >= M(sg.e) && M(l.s) - M(sg.e) < core.SCHED.liveGuard))
        bad(`${at}: ${sg.p} 재방이 생중계 앞 ${core.SCHED.liveGuard}분 안`);
      today[sg.p] = (today[sg.p] || 0) + len;
      if (P.episodes && sg.kind === 'first' && sg.ep != null) {
        if (lastEp[sg.p] != null && sg.ep !== lastEp[sg.p] + 1)
          bad(`${at}: ${sg.p} 본방 회차 ${lastEp[sg.p]} → ${sg.ep}`);
        lastEp[sg.p] = sg.ep;
      }
    });
    for (const [p, m] of Object.entries(used))
      if (m > core.tvCap(core.TVP[p], bd))
        bad(`${ds}: ${p} 하루 ${m}분 > 상한 ${core.tvCap(core.TVP[p], bd)}분`);
    for (const [p, m] of Object.entries(today)) {
      tot[p] = (tot[p] || 0) + m;
      max[p] = Math.max(max[p] || 0, m);
    }
    if (core.TVP.horror && core.periodOn('할로윈', bd) && !segs.some(s => s.p === 'horror' && s.kind === 'special' && M(s.s) === 22 * 60 && M(s.e) === 24 * 60))
      bad(`${ds}: 할로윈인데 22~24시 공포 특집이 없음`);
    // 같은 시즌의 같은 요일 = 같은 편성 (기간이 걸린 날은 빼고)
    if (!anyPeriod(bd)) {
      const key = (day.season ? day.season.toDateString() : '-') + ':' + bd.getDay(), sig = JSON.stringify(segs.map(s => [s.p, M(s.s), M(s.e), s.kind]));
      if (week[key] && week[key].sig !== sig)
        bad(`${ds}: 같은 시즌 같은 요일인 ${week[key].ds}과 편성이 다름`);
      else if (!week[key])
        week[key] = { sig, ds };
    }
  }
  if (extra)
    fail(`${tag}… 그 밖에 ${extra}건`);
  const ord = Object.keys(tot).sort((a, b) => tot[b] - tot[a]);
  notes.push(`${tag}프로그램별 하루 평균/최대: ` + ord.map(p => `${p} ${(tot[p] / DAYS / 60).toFixed(1)}/${(max[p] / 60).toFixed(1)}h`).join(' · '));
}
section('편성 규칙 400일', () => checkRules(''));
// 새 프로그램이 제 시각에 나오는지 (TV_SCHEDULE_PLAN.md 4-8). 기간이 걸린 날은 특집이 먼저라 뺀다
section('새 프로그램 편성 (영화·음악방송·누아르·짧은 프로)', () => {
  const expect = (bd, id, h, len) => {
    if (!core.TVP[id])
      return;
    const s = core.tvSegs(bd).find(x => x.p === id && M(x.s) === h * 60);
    if (!s || M(s.e) - M(s.s) !== len)
      fail(`${dname(bd)}: ${id}가 ${core.fmtH(h)}에 ${len}분으로 나오지 않음`);
  };
  const cnt = {};
  for (let i = 0; i < DAYS; i++) {
    const bd = dayAt(i), wd = bd.getDay();
    core.tvSegs(bd).forEach(s => {
      cnt[s.p] = (cnt[s.p] || 0) + 1;
      if (s.short)
        cnt._short = (cnt._short || 0) + 1;
    });
    if (anyPeriod(bd))
      continue;
    if (wd === 6)
      expect(bd, 'hero', 21, 120);
    if (wd === 0)
      expect(bd, 'scifi', 21, 120);
    if (wd === 5)
      expect(bd, 'music', 16, 60);
    if (wd === 5 || wd === 6)
      expect(bd, 'noir', 24, 55);
    expect(bd, 'homeshop', 14.5, 60);
  }
  // 구간이 있는 프로그램(홈쇼핑): 요일 7가지 순서가 서로 다른지
  for (const P of Object.values(core.TVP).filter(P => P.segs)) {
    const ords = [0, 1, 2, 3, 4, 5, 6].map(wd => core.segOrder(P, wd).map(i => P.segs.list[i].id).join('→'));
    if (new Set(ords).size !== 7)
      fail(`${P.id}: 요일별 구간 순서가 겹침 (${ords.join(' / ')})`);
    notes.push(`${P.id} 요일별 순서: ` + ords.map((o, wd) => '일월화수목금토'[wd] + ' ' + o).join(' · '));
  }
  for (const id of Object.keys(core.TVP))
    if (!cnt[id] && id !== 'horror')
      fail(`${id}: 400일 동안 한 번도 편성되지 않음`);
  notes.push('400일 편성 횟수: ' + Object.entries(cnt).filter(([k]) => k !== '_short').sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ') + ` (짧은 프로 합 ${cnt._short || 0})`);
});
section('가짜 프로그램으로 편성 시험 (tools/tv_fake_programs.json: 크리스마스 특집·짧은 프로 하나 더)', () => {
  const fake = JSON.parse(readFileSync(join(ROOT, 'tools/tv_fake_programs.json'), 'utf8')), added = [];
  for (const [id, p] of Object.entries(fake))
    if (!id.startsWith('_') && p && p.name && !STR[p.name]) {
      STR[p.name] = { ko: id, en: id };
      added.push(p.name);
    }
  try {
    const { problems, warnings } = core.setPrograms({ ...raw, ...fake });
    problems.forEach(p => fail(`가짜 표 ${p.id}: ${p.errors.join(' / ')}`));
    warnings.forEach(w => fail('가짜 표 경고: ' + w));
    checkRules('[가짜] ');
    for (let i = 0; i < DAYS; i++) {
      const bd = dayAt(i);
      if (core.periodOn('크리스마스', bd)) {
        const x = core.tvSegs(bd).find(s => s.p === 'fake_xmas');
        if (!x || M(x.s) !== 21 * 60 || M(x.e) !== 23 * 60 || x.kind !== 'special')
          fail(`[가짜] ${dname(bd)}: 크리스마스 특집이 21:00에 120분으로 나오지 않음`);
      }
    }
  }
  finally {
    core.setPrograms(raw);
    added.forEach(k => delete STR[k]);
  }
});

// 6. 400일 돌리기 (사건)
section('앞으로 400일 (사건)', () => {
  const t0 = new Date(2026, 9, 13, 12);
  let segs = 0, evs = 0, maxEv = 0;
  for (let i = 0; i < 400; i++) {
    const bd = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + i, 12);
    const list = core.tvSegs(bd);
    if (!list.length) {
      fail(`${bd.toDateString()}: 편성이 비어 있음`);
      continue;
    }
    for (let j = 0; j < list.length; j++) {
      const sg = list[j];
      if (sg.p == null)
        continue; // 편성 규칙 검사에서 이미 실패로 셈
      const ev = core.tvEvents(sg, 'chk' + i);
      if (ev.length >= core.EV_MAX)
        fail(`${bd.toDateString()} ${core.fmtH(sg.s)} ${sg.p}: 사건이 최대 횟수(${core.EV_MAX})에 닿음`);
      segs++;
      evs += ev.length;
      maxEv = Math.max(maxEv, ev.length);
      void sg.title;
    }
    for (let h = 5; h < 25.5; h += 0.25) {
      const st = core.tvState(new Date(bd.getFullYear(), bd.getMonth(), bd.getDate(), 0, 0, Math.round(h * 3600)));
      core.tvFrameName(st);
    }
  }
  notes.push(`400일: 칸 ${segs}개, 사건 ${evs}개 (한 칸 최대 ${maxEv}개)`);
});

// 7. 회귀 확인
const api = {
  tvSegs: core.tvSegs, tvState: core.tvState, setLang, events: sg => sg.evs || [],
  evId: x => x.e.id, evCap: x => x.e.cap || null, evDur: x => x.e.dur, frame: st => core.tvFrameName(st)
};
if (args.includes('--write-baseline')) {
  const data = JSON.parse(JSON.stringify(sampleAll(api)));
  writeFileSync(join(ROOT, 'tools/tv_baseline.json.gz'), gzipSync(JSON.stringify({ tz: process.env.TZ, made: new Date().toISOString(), data })));
  notes.push('회귀 기준을 새로 저장: tools/tv_baseline.json.gz');
}
else if (!args.includes('--no-baseline'))
  section('회귀 확인 (바꾸기 전과 같은 방송)', () => {
    const base = JSON.parse(gunzipSync(readFileSync(join(ROOT, 'tools/tv_baseline.json.gz'))).toString('utf8'));
    if (base.tz !== process.env.TZ)
      fail(`기준은 ${base.tz} 시간대로 뽑았는데 지금은 ${process.env.TZ}`);
    const now = JSON.parse(JSON.stringify(sampleAll(api)));
    let shown = 0, diff = 0, total = 0;
    const show = m => {
      diff++;
      if (shown++ < 12)
        fail(m);
    };
    for (const lang of Object.keys(base.data)) {
      base.data[lang].forEach((bd, i) => {
        const nd = now[lang][i];
        if (!nd || nd.day !== bd.day)
          return show(`${lang} ${bd.day}: 날짜 목록이 다름`);
        bd.segs.forEach((s, j) => {
          total++;
          if (JSON.stringify(s) !== JSON.stringify(nd.segs[j]))
            show(`${lang} ${bd.day} 칸 ${j}: 기준 ${JSON.stringify(s).slice(0, 160)}\n      지금 ${JSON.stringify(nd.segs[j]).slice(0, 160)}`);
        });
        if (nd.segs.length !== bd.segs.length)
          show(`${lang} ${bd.day}: 칸 수 ${bd.segs.length} → ${nd.segs.length}`);
        bd.samples.forEach((s, j) => {
          total++;
          if (JSON.stringify(s) !== JSON.stringify(nd.samples[j]))
            show(`${lang} ${bd.day} 표본 ${j}: 기준 ${JSON.stringify(s)}\n      지금 ${JSON.stringify(nd.samples[j])}`);
        });
      });
    }
    if (diff > shown)
      fail(`… 다른 곳이 모두 ${diff}군데`);
    notes.push(`회귀 확인: ${total}개 비교 (${Object.keys(base.data).join('·')})`);
  });

notes.forEach(n => console.log('  ' + n));
if (fails.length) {
  console.log(`\n실패 ${fails.length}건:`);
  fails.forEach(f => console.log('  - ' + f));
  process.exit(1);
}
console.log('\n모두 통과');
