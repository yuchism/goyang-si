/* 놀이가 저절로 시작해도 되는지: 시작 가능 시각은 time.js ROUTINE.play(이웃 배려, 생활 시간), 간격은 이 표 (CAT_PLAY_PLAN.md 7장)
   보는 사람이 직접 시작하는 것(레이저 포인터 누르기, 미리보기 버튼)은 이 표를 거치지 않는다.
   공통 규칙: 만득 씨가 있을 때·생일 파티 중·처음 연 뒤 나중 묶음 그림을 다 받기 전(LOAD_PLAN.md 4-1)에는 시작하지 않는다.
   간격은 방 시각 기준이고 그 기기에 저장한다 (새로고침해도 이어진다). 시계가 뒤로 갔으면 다시 할 수 있다 */
import { assetsWarm } from './assets.js';
import { ROUTINE, inWindow } from './time.js';
import { store } from './util.js';
import { world } from './world.js';

export const GATES = {
  //       간격(시간). 시작 가능 시각은 ROUTINE.play[이름]
  fish:  { gap: 4 }, // 어항 낚시 (fish.js) 8~21시
  yarn:  { gap: 3 }, // 실뭉치 굴러오기 (yarn.js) 8~22시
  wheel: { gap: 4 }, // 쳇바퀴 (wheel.js) 9~20시
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
  if (!g || world.manduk || world.party || !assetsWarm())
    return false;
  const t = d.getTime(), at = +L()[id] || 0;
  return inWindow(ROUTINE.play[id], d) && (t - at > g.gap * 3600e3 || t < at);
}
// 시작했다고 적는다 (방 시각)
export function gateMark(id, d) {
  L()[id] = d.getTime();
  store.set(KEY, L());
}
