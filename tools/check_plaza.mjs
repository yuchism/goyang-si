// 광장 페이지 맨손 검사 (tasks/xmas-plaza-code.md 「광장 페이지」): 브라우저 없이 web/plaza/plaza.js를 가짜 화면(DOM·캔버스 흉내)으로 돌려
// 실행 오류·NaN 좌표·잘못된 색이 없는지만 본다. 화면이 예쁜지는 사람 확인.
//   node tools/check_plaza.mjs ['?dev=1&night=1&probe=1'] [--rm]
//   --rm: 동작 줄이기. 프레임은 50ms씩 600장(30초), ?speed=와 함께 쓰면 방 시계도 빨리 (?t=19:40&speed=120 → 1시간)
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const WEB = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'web');
const QS = process.argv.slice(2).find(a => a.startsWith('?')) || '?dev=1';
const calls = { drawImage: 0, arc: 0 };
const finite = (what, vs) => vs.forEach(v => {
  if (typeof v === 'number' && !Number.isFinite(v))
    throw new Error(what + ': 숫자가 아님');
});
const ctx2d = new Proxy({}, {
  get: (o, k) => {
    if (k === 'createRadialGradient' || k === 'createLinearGradient')
      return (...a) => (finite(k, a), { addColorStop(p, c) {
        if (typeof c !== 'string' || !/^(#[0-9a-f]{6}([0-9a-f]{2})?|rgba?\(.*\))$/i.test(c))
          throw new Error('잘못된 색 ' + c);
      } });
    if (k in o)
      return o[k];
    return (...a) => {
      if (k in calls)
        calls[k]++;
      finite(k, a.filter(v => typeof v === 'number'));
    };
  },
  set: (o, k, v) => {
    if (k === 'globalAlpha')
      finite(k, [v]);
    o[k] = v;
    return true;
  },
});
const mk = tag => {
  const n = { tag, className: '', style: {}, children: [], classList: { add() { }, toggle() { }, contains: () => false }, setAttribute() { },
    append(...c) { n.children.push(...c); }, getContext: () => ctx2d, scrollLeft: 0, clientWidth: 400, scrollWidth: 2000,
    addEventListener() { }, removeAttribute() { } };
  return n;
};
// 그림 (손님·소품·펠리컨 …): 받기 전 상태로 — complete 거짓이라 그리기는 건너뜀
globalThis.Image = class { constructor() { this.complete = false; this.naturalWidth = 0; } addEventListener() { } };
globalThis.window = globalThis;
globalThis.document = { body: mk('body'), documentElement: {}, createElement: mk, getElementById: () => null, fonts: { load: () => Promise.resolve() }, addEventListener() { }, hidden: false };
globalThis.matchMedia = () => ({ matches: process.argv.includes('--rm') });
const ls = {};
globalThis.localStorage = { getItem: k => ls[k] ?? null, setItem: (k, v) => (ls[k] = String(v)) };
Object.defineProperty(globalThis, 'navigator', { value: { languages: ['ko-KR'] }, configurable: true });
globalThis.location = { href: 'http://localhost/plaza/' + QS, search: QS, protocol: 'http:' };
globalThis.innerWidth = 1400;
globalThis.innerHeight = 887;
globalThis.addEventListener = () => { };
let rafs = [];
globalThis.requestAnimationFrame = f => rafs.push(f);
globalThis.fetch = async u => {
  const p = u.startsWith('../') ? join(WEB, u.slice(3)) : join(WEB, 'plaza', u);
  return { ok: true, json: async () => JSON.parse(readFileSync(p, 'utf8')) };
};
const errors = [];
process.on('uncaughtException', e => errors.push(e));
process.on('unhandledRejection', e => errors.push(e));
// 불러오기(문법 오류 등)가 실패하면 바로 실패로 — 예전엔 uncaughtException이 삼켜서 말없이 0으로 끝났다 (2026-11-17)
try {
  await import(pathToFileURL(join(WEB, 'plaza/plaza.js')).href);
}
catch (e) {
  console.log('✗', e.stack || e);
  console.log('광장 검사 실패 (불러오기)');
  process.exit(1);
}
await new Promise(r => setTimeout(r, 50));
let t = performance.now();
for (let i = 0; i < 600; i++) {
  t += 50;
  const q = rafs;
  rafs = [];
  for (const f of q) {
    try {
      f(t);
    }
    catch (e) {
      errors.push(e);
    }
  }
  if (errors.length)
    break;
}
const time = await import(pathToFileURL(join(WEB, 'js/time.js')).href);
const pc = document.body.children.find(c => c.tag === 'main')?.children[0].children[0];
const night = pc && pc.children.find(c => c.className === 'pic night');
console.log(`${QS}${process.argv.includes('--rm') ? ' (동작 줄이기)' : ''}: 방 시각 ${time.now().toString().slice(0, 24)} · 밤 그림 ${night ? (+night.style.opacity).toFixed(2) : '없음'} · 불빛 그림 ${calls.drawImage} · 눈·김 ${calls.arc} · 시험 캐릭터 ${pc ? pc.children.filter(c => c.className === 'probe').length : 0}`);
if (!pc)
  errors.push(new Error('장면을 못 만듦'));
for (const e of errors)
  console.log('✗', e.stack || e);
console.log(errors.length ? '광장 검사 실패' : '광장 검사 통과');
process.exit(errors.length ? 1 : 0);
