// TV 검사: 배포 전에 노트북에서  node tools/check_tv.mjs
// 하나라도 실패하면 이유를 출력하고 실패(종료 코드 1)로 끝난다. TV_STABILITY_PLAN.md 6장
//   1. programs.json의 모든 그림이 web/r/tv/에 있다
//   2. 이름·자막·화면 장식 번역 키가 한국어·영어 모두 있다 (+ 프로그램 검사 전부: 길이, 간격, 반응 이름…)
//   3. 편성표가 하루 05:10~00:55를 빈틈·겹침 없이 채운다
//   4. 편성표 후보에 있는 프로그램이 모두 programs.json에 있다
//   5. 앞으로 400일: 모든 날 편성이 만들어지고, 모든 칸의 사건 만들기가 끝나며, 오류가 없다 (할로윈·크리스마스 포함)
//   6. 회귀 확인: tools/tv_baseline.json.gz(바꾸기 전 코드로 뽑은 결과)와 지금 결과가 같다
// 옵션: --programs 다른/programs.json  (고장 낸 표를 시험할 때)   --no-baseline  (회귀 확인 건너뛰기)
import './node_env.mjs';
import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(ROOT, 'web');
const args = process.argv.slice(2);
const progPath = args.includes('--programs') ? resolve(args[args.indexOf('--programs') + 1]) : join(WEB, 'r/tv/programs.json');
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

let raw = null;
section('programs.json 읽기', () => {
  raw = JSON.parse(readFileSync(progPath, 'utf8'));
});
raw = raw || {};

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
    [...(p.events || []), ...(p.end ? [p.end] : [])].forEach(e => e && e.cap && keys.add(e.cap));
    (Array.isArray(p.overlay) ? p.overlay : p.overlay ? [p.overlay] : []).forEach(o => o && keys.add(o.text || o.teams));
  }
  for (const k of ['tvTuning', 'tvAdjusting', 'tvgAdjust', 'tvFirstRun', 'tvRerun', 'tvMorning', 'tvLate', 'tvLive', 'tvHorrorSpecial'])
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
    if (!p || typeof p !== 'object')
      continue;
    const frames = new Set([...(p.loop || []).map(x => x && x[0]), ...[...(p.events || []), ...(p.end ? [p.end] : [])].flatMap(e => (e && e.frames) || [])]);
    for (const f of frames)
      if (typeof f === 'string' && !existsSync(join(WEB, 'r/tv', f + '.webp')))
        fail(`${id}: 그림 web/r/tv/${f}.webp 없음`);
  }
  const meta = JSON.parse(readFileSync(join(WEB, 'r/tv/meta.json'), 'utf8'));
  for (const f of [meta.body.file, ...Object.values(meta.baseScreens).flat()])
    if (!existsSync(join(WEB, 'r/tv', f)))
      fail(`기본 화면 그림 web/r/tv/${f} 없음`);
});

// 3·4. 편성표
section('편성표 빈틈·겹침', () => {
  const G = [...core.TV_GRID].sort((a, b) => a[0] - b[0]);
  const eq = (a, b) => Math.abs(a - b) < 1e-6;
  if (!eq(G[0][0], core.TV_PROG0))
    fail(`첫 칸이 ${core.fmtH(G[0][0])}에 시작 (05:10이어야 함)`);
  if (!eq(G[G.length - 1][1], core.TV_PROG1))
    fail(`마지막 칸이 ${core.fmtH(G[G.length - 1][1])}에 끝남 (00:55여야 함)`);
  for (let i = 1; i < G.length; i++)
    if (!eq(G[i - 1][1], G[i][0]))
      fail(`${core.fmtH(G[i - 1][1])}과 ${core.fmtH(G[i][0])} 사이 ${G[i - 1][1] < G[i][0] ? '빈틈' : '겹침'}`);
  G.forEach(([a, b, len]) => {
    if (!(b > a) || !(len > 0))
      fail(`편성 칸 ${core.fmtH(a)}–${core.fmtH(b)}: 길이가 이상함`);
  });
});
section('편성표 후보 = programs.json', () => {
  const need = new Set(core.TV_GRID.flatMap(g => g[3]).flatMap(p => p === 'sports' ? ['baseball', 'football'] : [p]));
  need.add('horror'); // 할로윈 특집
  for (const p of need)
    if (!raw[p])
      fail(`편성표 후보 ${p}가 programs.json에 없음`);
    else if (!core.TVP[p])
      fail(`편성표 후보 ${p}가 검사에서 빠짐 (위 오류 참고)`);
});

// 5. 400일 돌리기
section('앞으로 400일', () => {
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
      if (j && Math.abs(list[j - 1].e - sg.s) > 1e-6)
        fail(`${bd.toDateString()} ${core.fmtH(sg.s)}: 앞 칸과 이어지지 않음`);
      if (sg.p == null) {
        fail(`${bd.toDateString()} ${core.fmtH(sg.s)}: 틀 프로그램이 없어 화면 조정`);
        continue;
      }
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

// 6. 회귀 확인
const api = {
  tvSegs: core.tvSegs, tvState: core.tvState, setLang, events: sg => sg.evs || [],
  evId: x => x.e.id, evCap: x => x.e.cap || null, evDur: x => x.e.dur, frame: st => core.tvFrameName(st)
};
if (!args.includes('--no-baseline'))
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
