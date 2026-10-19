/* 오류 뒤 되돌리기 (STABILITY_PLAN.md 3-1). 배우만이 아니라 같이 하던 것까지 되돌린다.
   - 배우: run(a, [], '')로 하던 행동을 버리고 바닥으로 (TV 위·뒤·상자 안·쳇바퀴는 steps.js SPOTS의 exit)
   - 쥐야쥐: state도 푼다 ('duet'으로 남으면 catBrain이 다시는 둘이 놀기를 고르지 않는다). 숨어 있었으면 그 자리 그대로
   - 둘이 같이 하던 행동이면 둘 다
   - 놀이가 배우를 붙잡고 있으면(이름표가 놀이 것이거나 쳇바퀴 안) 그 놀이도 abort
   다음 장면에 뇌가 새 행동을 고른다 */
import { livePlays } from './plays.js';
import { run } from './steps.js';
import { now } from './time.js';
import { cat, mouse } from './world.js';

// 둘이 놀기(duet.js)의 이름표
const DUET_TAGS = ['greet', 'chase', 'stalk', 'stalked', 'boxhide', 'tease'];
// 놀이의 이름표 → 놀이 id (plays.js)
const PLAY_TAGS = { laser: 'laser', penstare: 'laser', fish: 'fish', bowlwatch: 'fish', crumb: 'fish', wheel: 'wheel', yarn: 'yarn' };
const heldBy = a => {
  const ids = new Set();
  if (PLAY_TAGS[a.tag])
    ids.add(PLAY_TAGS[a.tag]);
  if (a.inWheel || a.hop)
    ids.add('wheel');
  return ids;
};
const inDuet = () => mouse.state === 'duet' || mouse.state === 'nap' || DUET_TAGS.includes(cat.tag) || DUET_TAGS.includes(mouse.tag);

// 놀이 하나를 조용히 끝낸다. abort가 없으면 reset(지금, 지금) (시간 점프용 reset을 "0초 건너뛰기"로)
export function abortPlay(p) {
  if (p.abort)
    p.abort();
  else if (p.reset) {
    const t = now().getTime();
    p.reset(t, t);
  }
}
// 사건 하나를 조용히 끝낸다. 사건의 reset()은 "지나가던 것은 이미 지나갔다"
export function abortEvent(e) {
  if (e.abort)
    e.abort();
  else if (e.reset)
    e.reset();
}
function clearActor(a) {
  run(a, [], '');
  a.dance = null;
  a.rock = 0;
  a.react = null;
  if (a.kind === 'mouse')
    a.state = '';
}
// 배우 하나 (와 같이 하던 상대, 붙잡고 있던 놀이)를 되돌린다
export function resetActor(a) {
  const plays = heldBy(a), both = inDuet();
  for (const p of livePlays())
    if (plays.has(p.id))
      abortPlay(p);
  clearActor(a);
  if (both)
    clearActor(a === cat ? mouse : cat);
}
// 놀이에서 오류: 그 놀이를 끝내고, 그 놀이가 붙잡고 있던 배우를 되돌린다
export function resetPlay(p) {
  abortPlay(p);
  for (const a of [cat, mouse])
    if (heldBy(a).has(p.id))
      clearActor(a);
}
// 둘이 같이 하는 일(duet.js duetTick)에서 오류: 둘 다
export function resetDuet() {
  clearActor(cat);
  clearActor(mouse);
}
