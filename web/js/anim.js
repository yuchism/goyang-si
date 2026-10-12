/* 동작 그림: 자세 전환, 동작 클립(play), 지금 보여줄 프레임 고르기 */
import { tvWatchFrame } from './tv-cat.js';
import { RM } from './util.js';
import { world } from './world.js';
/* ───────── 애니메이션 목록 ─────────
  직접 그린 프레임이 생기면 각 동작의 배열에 이미지 이름을 넣는다.
  비어 있는 동작은 지금 그림을 잘라 움직이는 임시 동작으로 대신한다.
  루프: stand, walk, loaf, sleep, belly / 연결: lie_down, stretch_up, roll_over, roll_back */
// 포즈 사이의 연결: 서기 ⇄ 식빵 ⇄ 배 보이기. 서기에서 배 보이기는 식빵을 거쳐 간다
export const EDGE = { 'stand>loaf': ['lie', 0.75], 'loaf>stand': ['rise', 1.35], 'loaf>roll': ['rollover', 0.85], 'roll>loaf': ['rollback', 0.85] };
export const nextHop = (f, t) => f === t ? null : (f === 'stand' || f === 'roll') ? 'loaf' : t;
const SEQ = { lie: [['sit_1', 0.28], ['sit_2', 0.32]], rise: [['stretch', 1.0], ['sit_1', 0.3]], riseYawn: [['yawn', 1.1], ['stretch', 0.9], ['sit_1', 0.3]],
  rollover: [['roll_1', 0.22], ['roll_2', 0.22], ['roll_3', 0.26]], rollback: [['roll_3', 0.22], ['roll_2', 0.22], ['roll_1', 0.26]] };
const seqDur = k => SEQ[k].reduce((t, f) => t + f[1], 0);
EDGE['stand>loaf'] = ['lie', seqDur('lie')];
EDGE['loaf>stand'] = ['rise', seqDur('rise')];
EDGE['loaf>roll'] = ['rollover', seqDur('rollover')];
EDGE['roll>loaf'] = ['rollback', seqDur('rollback')];
function seqFrame(name, t) {
  let acc = 0;
  for (const [f, d] of SEQ[name]) {
    acc += d;
    if (t < acc)
      return f;
  }
  return SEQ[name][SEQ[name].length - 1][0];
}
// 동작 클립: 프레임 순서, 초당 장수, 반복 여부, 기본 자세
const rng = (k, n) => Array.from({ length: n }, (_, i) => k + '_' + (i + 1));
const CLIP = {
  run: { f: rng('run', 6), fps: 11, loop: 1 },
  paw: { f: rng('paw', 6), fps: 7, base: 'stand' },
  type: { f: rng('type', 6), fps: 8, loop: 1, base: 'sit' },
  eat: { f: ['eat_1', 'eat_2', 'eat_3', 'eat_2', 'eat_3', 'eat_4'], fps: 4, loop: 1, base: 'stand' },
  screen: { f: ['screen_1', 'screen_2', 'screen_3', 'screen_4', 'screen_4', 'screen_4', 'screen_5'], fps: 4, base: 'sit' },
  startle: { f: rng('startle', 4), fps: 12, base: 'stand' },
  lookup: { f: rng('lookup', 3), fps: 3, base: 'stand' },
  window: { f: ['window_1', 'window_1', 'window_2', 'window_1', 'window_3'], fps: 0.5, loop: 1, base: 'sit' },
  wait: { f: ['wait_1', 'wait_2'], fps: 0.9, loop: 1, base: 'sit' },
  sulk: { f: ['sulk_1', 'sulk_2'], fps: 0.6, loop: 1, base: 'loaf' },
  bsleep: { f: ['bsleep_1', 'bsleep_2', 'bsleep_3', 'bsleep_2'], fps: 0.9, loop: 1, base: 'roll' },
  box: { f: ['box_1', 'box_1', 'box_2', 'box_2', 'box_2', 'box_3', 'box_2', 'box_2', 'box_1'], fps: 0.45, loop: 1, base: 'loaf' },
  hatOn: { f: ['bday_hat_on_1', 'bday_hat_on_2', 'bday_hat_on_2'], fps: 3, base: 'stand' },
  tada: { f: ['bday_tada'], fps: 0.55, base: 'stand' }, bow: { f: ['bday_bow'], fps: 0.55, base: 'stand' },
  hatloaf: { f: ['bday_hat_loaf'], fps: 0.2, loop: 1, base: 'loaf' },
  tvwatch: { f: ['tv_watch_back_1of2'], fps: 1, loop: 1, base: 'stand', fn: () => tvWatchFrame() },
  tvtop: { f: ['tv_top_sleep_1of2', 'tv_top_sleep_2of2'], fps: 0.32, loop: 1, base: 'loaf' },
  tvpeek: { f: ['tv_behind_peek_1of2', 'tv_behind_peek_1of2', 'tv_behind_peek_2of2'], fps: 0.9, loop: 1, base: 'stand' },
  groom: { f: ['groom_1', 'groom_2', 'groom_3', 'groom_4', 'groom_3', 'groom_4', 'groom_3', 'groom_4', 'groom_2', 'groom_1', 'groom_1'], fps: 6, loop: 1, base: 'sit' },
};
const BRIDGE = 0.3;
// 클립 재생 단계. sec를 주지 않으면 한 번만 재생. until이 있으면 조건이 될 때까지
export const play = (c, sec, until) => ({ init(a) {
    const C = CLIP[c];
    a.pose = C.base === 'roll' ? 'roll' : C.base === 'loaf' ? 'loaf' : 'stand';
    a.closed = false;
    a.moving = false;
    const once = C.f.length / C.fps;
    a.act = { c, t: -1, dur: (sec || once) + (C.base === 'sit' ? BRIDGE * 2 : 0), until };
  },
  tick(a, dt) {
    const A = a.act;
    if (!A)
      return true;
    if (A.t < 0) {
      if (a.tr || a.dp !== a.pose)
        return false;
      A.t = 0;
    }
    A.t += dt;
    if (A.until && A.until() && A.t < A.dur - BRIDGE)
      A.t = A.dur - BRIDGE;
    if (A.t >= A.dur) {
      a.act = null;
      return true;
    }
    return false;
  } });
function clipFrame(a) {
  const A = a.act, C = CLIP[A.c];
  let t = Math.max(0, A.t);
  if (C.base === 'sit') {
    if (t < BRIDGE || t > A.dur - BRIDGE)
      return 'sit_1';
    t -= BRIDGE;
  }
  if (C.fn)
    return C.fn(a, t);
  let i = Math.floor(t * C.fps);
  i = C.loop ? i % C.f.length : Math.min(i, C.f.length - 1);
  return C.f[i];
}
export function catFrame(a) {
  if (a.jump)
    return a.jump.f;
  if (a.act && a.act.t >= 0)
    return clipFrame(a);
  if (a.react && a.react.t > 0 && !a.tr && a.dp === 'loaf')
    return a.react.f;
  if (a.tr) {
    const nm = a.tr.name === 'rise' && a.yawn ? 'riseYawn' : a.tr.name;
    return seqFrame(nm, a.tr.t * seqDur(nm) / a.tr.dur);
  }
  const T = world.t + a.phase;
  if (a.dp === 'stand') {
    if (a.moving && !RM) {
      if (a.fast)
        return 'run_' + (Math.floor(a.walkPh * 0.9) % 6 + 1);
      const cyc = ['walk_1', 'walk_2', 'walk_3', 'walk_2'];
      return cyc[Math.floor(a.walkPh * 1.25) % 4];
    }
    return 'stand';
  }
  if (a.dp === 'roll')
    return Math.floor(T / (a.rock ? 0.55 : 1.6)) % 2 ? 'belly_2' : 'belly_1';
  if (a.closed)
    return Math.floor(T / 2.6) % 2 ? 'sleep_2' : 'sleep_1';
  return (Math.floor(T / 5) % 4 === 3) ? 'loaf_2' : 'loaf_1';
}
export function mouseFrame(a) {
  if (a.peek)
    return 'peek_1';
  if (a.react && a.react.t > 0)
    return 'startle_1';
  if (a.moving)
    return 'trot_' + (Math.floor(a.walkPh * 1.4) % 3 + 1);
  if (a.closed)
    return 'sleep_' + (Math.floor((world.t + a.phase) / 1.4) % 2 + 1);
  if (a.tag === 'bfly' || a.state === 'rain' || a.state === 'laptop')
    return 'watch_1';
  return 'idle_1';
}
