// 구조 검사: 배포 전에  node tools/check_structure.mjs   (tasks/structure-guard.md)
// 지금보다 나빠지면 실패(종료 코드 1)로 끝난다. 기준은 tools/structure_baseline.json
//   1. 크기 톱니바퀴: web/js/*.js 한 파일은 500줄까지. 이미 넘은 파일은 기준의 줄 수보다 커지면 실패
//   2. 엉킴 톱니바퀴: `./x.js` 가져오기로 서로 돌고 도는 가장 큰 덩어리(SCC)의 파일 수와
//      그 안의 가져오기 수(파일→파일, 같은 짝은 한 번)가 기준보다 늘면 실패. 새로 들어온 파일·가져오기를 이름으로 보여 준다
// 줄었으면 알려 준다 → --write 로 기준을 낮춘다.
// 옵션: --write  (지금 상태를 기준으로 저장. 늘어난 게 있으면 거부)
//       --write --force  (늘어난 채로 덮기. 덮은 이유를 지시서 메모에 적는다)
//       --verbose  (새로 들어온 파일로 가는 가져오기도 하나하나 보이기)
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'web/js');
const BASE = join(ROOT, 'tools/structure_baseline.json');
const MAX_LINES = 500;
const args = process.argv.slice(2);
const WRITE = args.includes('--write'), FORCE = args.includes('--force'), VERBOSE = args.includes('--verbose');

// ── 읽기: 줄 수와 가져오기
const files = readdirSync(JS).filter(f => f.endsWith('.js')).sort();
const lines = {}, deps = {};
const IMPORT = /(?:\bfrom|\bimport)\s*\(?\s*['"]\.\/([^'"/]+\.js)['"]/g;
for (const f of files) {
  const src = readFileSync(join(JS, f), 'utf8');
  lines[f] = src === '' ? 0 : src.split('\n').length - (src.endsWith('\n') ? 1 : 0);
  deps[f] = [...new Set([...src.matchAll(IMPORT)].map(m => m[1]))].filter(d => files.includes(d)).sort();
}

// ── 가장 큰 덩어리 (타잔 SCC)
function biggestTangle() {
  let idx = 0, best = [];
  const index = {}, low = {}, onStack = new Set(), stack = [];
  const visit = v => {
    index[v] = low[v] = idx++; stack.push(v); onStack.add(v);
    for (const w of deps[v]) {
      if (index[w] === undefined) { visit(w); low[v] = Math.min(low[v], low[w]); }
      else if (onStack.has(w)) low[v] = Math.min(low[v], index[w]);
    }
    if (low[v] === index[v]) {
      const comp = [];
      let w;
      do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > best.length) best = comp;
    }
  };
  for (const f of files) if (index[f] === undefined) visit(f);
  if (best.length < 2) return { files: [], imports: [] };
  const inside = new Set(best);
  const imports = [];
  for (const f of best) for (const d of deps[f]) if (inside.has(d)) imports.push(`${f} → ${d}`);
  return { files: best.sort(), imports: imports.sort() };
}

const big = Object.fromEntries(files.filter(f => lines[f] > MAX_LINES).map(f => [f, lines[f]]));
const tangle = biggestTangle();
const now = { maxLines: MAX_LINES, bigFiles: big, tangle };

console.log(`파일 ${files.length} · ${MAX_LINES}줄 넘는 파일 ${Object.keys(big).length} · 엉킨 덩어리 ${tangle.files.length}개 파일 / 가져오기 ${tangle.imports.length}`);

if (!existsSync(BASE)) {
  if (!WRITE) { console.log(`✗ 기준 파일이 없습니다: tools/structure_baseline.json  →  node tools/check_structure.mjs --write`); process.exit(1); }
  writeFileSync(BASE, JSON.stringify(now, null, 2) + '\n');
  console.log('기준을 새로 저장했습니다: tools/structure_baseline.json');
  process.exit(0);
}
const base = JSON.parse(readFileSync(BASE, 'utf8'));
const fails = [], shrinks = [], notes = [];

// ── 1. 크기
for (const f of files) {
  const limit = base.bigFiles[f] ?? MAX_LINES;
  if (lines[f] > limit) {
    fails.push(base.bigFiles[f] ? `${f}: ${lines[f]}줄 — 기준 ${limit}줄보다 ${lines[f] - limit}줄 늘었습니다 (이미 ${MAX_LINES}줄 넘은 파일은 더 키우지 않습니다)`
                                : `${f}: ${lines[f]}줄 — ${MAX_LINES}줄을 넘었습니다`);
  }
}
for (const [f, n] of Object.entries(base.bigFiles)) {
  if (!(f in lines)) shrinks.push(`${f}: 없어졌습니다 (기준 ${n}줄)`);
  else if (lines[f] < n) shrinks.push(`${f}: ${n} → ${lines[f]}줄${lines[f] <= MAX_LINES ? ` (${MAX_LINES}줄 안으로 들어왔습니다)` : ''}`);
}

// ── 2. 엉킴
const bf = new Set(base.tangle.files), bi = new Set(base.tangle.imports);
const newFiles = tangle.files.filter(f => !bf.has(f));
const newImports = tangle.imports.filter(e => !bi.has(e));
const goneFiles = base.tangle.files.filter(f => !tangle.files.includes(f));
const goneImports = base.tangle.imports.filter(e => !tangle.imports.includes(e));
const grewFiles = tangle.files.length > base.tangle.files.length;
const grewImports = tangle.imports.length > base.tangle.imports.length;
if (grewFiles) fails.push(`엉킨 덩어리 파일 ${base.tangle.files.length} → ${tangle.files.length}개로 늘었습니다`);
if (grewImports) fails.push(`엉킨 덩어리 안 가져오기 ${base.tangle.imports.length} → ${tangle.imports.length}개로 늘었습니다`);
const into = grewFiles || grewImports ? fails : notes;
if (newFiles.length) into.push(`덩어리에 새로 들어온 파일: ${newFiles.join(', ')}`);
// 원래 있던 파일로 가는 새 가져오기는 이름 그대로(고리를 닫은 것이 여기 있다), 새로 들어온 파일로 가는 것은 파일별 개수만
const nf = new Set(newFiles), target = e => e.split(' → ')[1];
const closing = newImports.filter(e => !nf.has(target(e)));
const intoNew = newFiles.map(f => [f, newImports.filter(e => target(e) === f).length]).filter(([, n]) => n);
if (closing.length) into.push(`덩어리 안 새 가져오기 (고리를 닫은 것):\n${closing.map(e => `      ${e}`).join('\n')}`);
if (intoNew.length) into.push(`새로 들어온 파일을 가져오는 곳: ${intoNew.map(([f, n]) => `${f} ${n}곳`).join(', ')}${VERBOSE ? '\n' + newImports.filter(e => nf.has(target(e))).map(e => `      ${e}`).join('\n') : '  (전부 보기: --verbose)'}`);
if (tangle.files.length < base.tangle.files.length) shrinks.push(`엉킨 덩어리 파일 ${base.tangle.files.length} → ${tangle.files.length}개 (빠진 파일: ${goneFiles.join(', ')})`);
if (tangle.imports.length < base.tangle.imports.length) shrinks.push(`엉킨 덩어리 안 가져오기 ${base.tangle.imports.length} → ${tangle.imports.length}개 (빠진 것: ${goneImports.join(', ')})`);

// ── 출력
for (const s of fails) console.log(`✗ ${s}`);
for (const s of notes) console.log(`⚠ ${s}`);
for (const s of shrinks) console.log(`↓ ${s}`);

if (WRITE) {
  if (fails.length && !FORCE) {
    console.log('✗ 늘어난 것이 있어 기준을 덮지 않았습니다. 꼭 덮어야 하면 --write --force, 그리고 이유를 지시서 메모에 적습니다');
    process.exit(1);
  }
  writeFileSync(BASE, JSON.stringify(now, null, 2) + '\n');
  console.log(fails.length ? '⚠ 늘어난 채로 기준을 덮었습니다 — 덮은 이유를 지시서 메모에 적습니다' : '기준을 지금 상태로 저장했습니다: tools/structure_baseline.json');
  process.exit(0);
}
if (shrinks.length && !fails.length) console.log('줄었습니다 👍  기준을 낮추려면: node tools/check_structure.mjs --write');
if (fails.length) { console.log('구조 검사 실패 — 지금보다 나빠졌습니다 (tasks/structure-guard.md)'); process.exit(1); }
console.log('구조 검사 통과');
