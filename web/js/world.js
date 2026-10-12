/* 세상 상태와 배우(강고양이 씨, 쥐야쥐), 말풍선, 자막 */
import { store } from './util.js';
/* ───────── 월드 상태 ───────── */
export const world = {
  cup: { state: 'table', x: 560, y: 546, fall: 0, fy: 0 }, bowlFull: false, treat: false,
  lampOn: false, laptop: store.get('laptop', ''), noise: 0, manduk: null, visitsToday: 0, lastVisit: -1e9,
  doneToday: {}, dayKey: '', bfly: null, bird: null, lastTouch: performance.now(), captions: [], t: 0, mouseCool: 0,
  tv: { st: null, frame: 'screen_off', avg: null, flick: 0 }
};
/* ───────── 배우 ───────── */
function mkActor(kind, x, y) {
  return { kind, x, y, face: -1, pose: kind === 'cat' ? 'loaf' : 'walk', closed: false, steps: [], cur: null, moving: false, bub: null, phase: Math.random() * 9, tag: '', hidden: kind === 'mouse', bobT: 0, stepT: 0, rock: 0, state: '', dp: kind === 'cat' ? 'loaf' : 'walk', tr: null, walkPh: 0 };
}
export const cat = mkActor('cat', 600, 690), mouse = mkActor('mouse', 819, 588); // 처음엔 쥐구멍 안 (숨어 있음)
/* ───────── 말풍선 ───────── */
export function say(a, t, sec = 4) {
  a.bub = { t, life: sec, max: sec };
}
export function caption(t, sec) {
  world.captions.push({ t, life: sec, max: sec });
}
