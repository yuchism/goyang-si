/* 자잘한 도구: 난수, 범위, 해시, 저장소, 손글씨 글꼴, 색 섞기 */
export const HAND = '"Gaegu","Nanum Pen Script",cursive';
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
