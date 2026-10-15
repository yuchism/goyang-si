/* 놀이가 저절로 시작해도 되는지: 시간대와 간격을 한 표에 둔다 (CAT_PLAY_PLAN.md 7장)
   보는 사람이 직접 시작하는 것(레이저 포인터 누르기, 미리보기 버튼)은 이 표를 거치지 않는다.
   공통 규칙: 만득 씨가 있을 때·생일 파티 중에는 시작하지 않는다.
   간격은 방 시각 기준이고 그 기기에 저장한다 (새로고침해도 이어진다). 시계가 뒤로 갔으면 다시 할 수 있다 */
import { hourOf } from './time.js';
import { store } from './util.js';
import { world } from './world.js';

export const GATES = {
  //       시작 가능 시각(방 시각)   간격(시간)
  fish:  { from: 8, to: 21, gap: 4 }, // 어항 낚시 (fish.js)
  yarn:  { from: 8, to: 22, gap: 3 }, // 실뭉치 굴러오기 (yarn.js)
  wheel: { from: 9, to: 20, gap: 4 }, // 쳇바퀴 (wheel.js)
};
const KEY = 'playLast';
let last = null;
const L = () => {
  if (!last) {
    const v = store.get(KEY, null);
    last = v && typeof v === 'object' ? v : {};
  }
  return last;
};

// 지금(d, 방 시각) 시작해도 되나
export function gateOk(id, d) {
  const g = GATES[id];
  if (!g || world.manduk || world.party)
    return false;
  const h = hourOf(d), t = d.getTime(), at = +L()[id] || 0;
  return h >= g.from && h < g.to && (t - at > g.gap * 3600e3 || t < at);
}
// 시작했다고 적는다 (방 시각)
export function gateMark(id, d) {
  L()[id] = d.getTime();
  store.set(KEY, L());
}
