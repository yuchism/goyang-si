// 노드에서 브라우저 모듈(i18n.js, time.js, util.js, tv-core.js)을 불러오기 위한 최소 흉내.
// 화면 없이 계산만 할 때 쓴다 (check_tv.mjs, 회귀 기준 뽑기). 시간대는 서울로 고정한다(서머타임 없음 → 결과가 늘 같다)
process.env.TZ = process.env.TV_TZ || 'Asia/Seoul';
const mem = {};
const el = () => ({ setAttribute() { }, style: {}, dataset: {}, classList: { toggle() { } } });
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.matchMedia = () => ({ matches: false, addEventListener() { } });
if (!globalThis.navigator || !globalThis.navigator.languages)
  Object.defineProperty(globalThis, 'navigator', { value: { languages: [process.env.TV_LANG === 'en' ? 'en-AU' : 'ko-KR'], language: 'ko-KR' }, configurable: true });
globalThis.document = { documentElement: el(), querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ getContext: () => null }) };
globalThis.window = globalThis;
if (!globalThis.Event)
  globalThis.Event = class { constructor(t) { this.type = t; } };
globalThis.dispatchEvent = () => true;
