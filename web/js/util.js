/* 자잘한 도구: 난수, 범위, 해시, 저장소, 손글씨 글꼴, 색 섞기 */
// 손글씨 글꼴: 한국어는 Gaegu, 영어는 Patrick Hand를 앞에 둔다 (캔버스 글자는 그릴 때마다 HAND를 읽는다)
export let HAND = '"Gaegu","Nanum Pen Script",cursive';
export function setHandFont(lang) {
  HAND = lang === 'en' ? '"Patrick Hand","Gaegu",cursive' : '"Gaegu","Nanum Pen Script",cursive';
  if (document.fonts)
    document.fonts.load('700 30px ' + (lang === 'en' ? '"Patrick Hand"' : 'Gaegu')).catch(() => { });
}
export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const store = { get(k, d) {
    try {
      const v = localStorage.getItem('goyang.' + k);
      return v == null ? d : JSON.parse(v);
    }
    catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('goyang.' + k, JSON.stringify(v));
    }
    catch (e) { }
  } };
// 기록(localStorage)이 실제로 되는 브라우저인지 (사생활 보호 모드 등에서는 안 될 수 있다)
let _sok = null;
export function storageOK() {
  if (_sok === null) {
    try {
      localStorage.setItem('goyang.__t', '1');
      _sok = localStorage.getItem('goyang.__t') === '1';
      localStorage.removeItem('goyang.__t');
    }
    catch (e) {
      _sok = false;
    }
  }
  return _sok;
}
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
/* ───────── 그리기 ───────── */
export const INK = '#1d1612';
export function lerpCol(a, b, t) {
  const pa = a.match(/\w\w/g).map(x => parseInt(x, 16)), pb = b.match(/\w\w/g).map(x => parseInt(x, 16));
  return 'rgb(' + pa.map((v, i) => Math.round(lerp(v, pb[i], t))).join(',') + ')';
}
/* ───────── 배우 그리기 ───────── */
export const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/* ───────── 버튼 ───────── */
export const $ = id => document.getElementById(id);
// GoatCounter 이벤트: count.js가 늦게 오면 잠깐 기다렸다가 보낸다. 이름 같은 개인 정보는 넣지 않는다
export function gcEvent(path, title) {
  let tries = 0;
  const send = () => {
    const gc = window.goatcounter;
    if (gc && gc.count) {
      try {
        gc.count({ path, title: title || path, event: true });
      }
      catch (e) { }
      return;
    }
    if (++tries <= 40)
      setTimeout(send, 500);
  };
  send();
}
// 글자 수 자르기: 이모지가 반으로 잘리지 않게 코드 포인트 단위로
export const cutChars = (s, n) => Array.from(String(s || '')).slice(0, n).join('');
// 장면을 읽은 뒤 할 일 (장면 값으로 모듈 안 숫자를 채울 때). 모듈이 서로 부르는 순서와 상관없게 여기(가져오는 것 없음)에 둔다
const SCENE_HOOKS = [];
export const onScene = fn => SCENE_HOOKS.push(fn);
export const runSceneHooks = () => SCENE_HOOKS.forEach(fn => fn());
