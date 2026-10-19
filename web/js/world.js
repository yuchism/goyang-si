/* 세상 상태와 배우(강고양이 씨, 쥐야쥐), 말풍선, 자막 */
import { reportError } from './guard.js';
import { store } from './util.js';
/* ───────── 월드 상태 ───────── */
export const world = {
  cup: { state: 'table', x: 560, y: 546, fall: 0, fy: 0 }, bowlFull: false, treat: false,
  lampOn: false, laptop: store.get('laptop', ''), noise: 0, manduk: null, visitsToday: 0, lastVisit: -1e9,
  doneToday: {}, dayKey: '', bfly: null, bird: null, lastTouch: performance.now(), captions: [], t: 0, mouseCool: 0, jumpFade: null,
  tv: { st: null, frame: 'screen_off', avg: null, flick: 0 }
};
/* ───────── 배우 ───────── */
// half: 몸 반폭. 걷는 바닥 가로 끝에서 이만큼 안쪽까지만 간다 (stage.js walkX)
function mkActor(kind, x, y) {
  return { kind, x, y, face: -1, pose: kind === 'cat' ? 'loaf' : 'walk', closed: false, steps: [], cur: null, moving: false, bub: null, phase: Math.random() * 9, tag: '', half: 20, hidden: kind === 'mouse', bobT: 0, stepT: 0, rock: 0, state: '', dp: kind === 'cat' ? 'loaf' : 'walk', tr: null, walkPh: 0 };
}
export const cat = mkActor('cat', 0, 0), mouse = mkActor('mouse', 0, 0); // 처음 자리는 장면의 start.cat·start.mouse (objects.js가 넣는다). 쥐야쥐는 처음엔 쥐구멍 안 (숨어 있음)
/* ───────── 말풍선 ───────── */
export function say(a, t, sec = 4) {
  a.bub = { t, life: sec, max: sec };
}
export function caption(t, sec) {
  world.captions.push({ t, life: sec, max: sec });
}

/* ───────── 방 시간 타이머 ─────────
   행동 순서를 "몇 초 뒤에"로 잇는 곳은 setTimeout 대신 after(할 일, 초)를 쓴다. 방 시간(미리보기 배속 포함)으로 재고,
   화면이 멈추면(탭을 떠나면) 같이 멈춘다. main.js frame이 매 장면 맨 앞에서 tickTimers를 부른다 */
const timers = [];
let clock = 0;
export function after(f, sec) { // setTimeout과 같은 순서 (단, 초)
  timers.push({ at: clock + sec, f });
}
export function tickTimers(dt) {
  clock += dt;
  if (!timers.length)
    return;
  const due = timers.filter(x => x.at <= clock);
  if (!due.length)
    return;
  for (let i = timers.length - 1; i >= 0; i--)
    if (due.includes(timers[i]))
      timers.splice(i, 1);
  due.sort((a, b) => a.at - b.at).forEach(x => { // 먼저 정한 것부터 (같으면 넣은 순서)
    try { // 하나가 오류를 내도 같은 순간의 나머지는 부른다 (STABILITY_PLAN.md 2장 6번)
      x.f();
    }
    catch (e) {
      reportError('걸어 둔 일(after)', e);
    }
  });
}
