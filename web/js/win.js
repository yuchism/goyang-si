/* 창 (SCENE_PLAN.md 4장): 장면의 window.json
   - 방 좌표에는 창의 자리 rect만 있다. 창 안은 독립 좌표: 창 왼쪽 위가 (0, 0), 단위는 방과 같다
   - 창 안 → 방: toRoom(x, y). 하늘 높이 띠: skyRnd('ufo')는 그 띠 안 무작위 높이를 방 y로
   - 창이 없는 장면이면 WIN.rect가 null (그 기능들은 쉰다: 7단계) */
import { darkness, setSunbeamPath } from './time.js';
import { rnd } from './util.js';
export const WIN = { rect: null, sky: {}, sunbeam: null }; // 그 밖의 창 값(sun, moon, clouds, landscape, railing, curtain…)도 window.json 그대로 들어온다
export function applyWindow(data) {
  if (!data) {
    WIN.rect = null;
    setSunbeamPath(null);
    return;
  }
  const [x, y, w, h] = data.rect;
  WIN.rect = { x, y, w, h };
  Object.assign(WIN, data, { rect: WIN.rect });
  WIN.sky = data.sky || {};
  WIN.sunbeam = data.sunbeam || null;
  setSunbeamPath(WIN.sunbeam);
}
export const hasWindow = () => !!WIN.rect;
export const toRoom = (x, y) => [WIN.rect.x + x, WIN.rect.y + y];
// 하늘 띠: 창 안 높이 [위, 아래] → 방 y. k(0~1)를 주면 그 비율, 없으면 무작위
export const skyAt = (band, k) => {
  const b = WIN.sky[band];
  return WIN.rect.y + b[0] + k * (b[1] - b[0]);
};
export const skyRnd = band => {
  const b = WIN.sky[band];
  return WIN.rect.y + rnd(b[0], b[1]);
};
// 창 안 높이 → 방 y
export const wy = v => WIN.rect.y + v;
// 창이 주는 빛 (SCENE_PLAN.md 6장): 바깥 어둠(시각·비)과 창이 빛을 들이는 정도(가중치). 창이 없으면 가중치 0
// 가중치는 지금 창이 있으면 1. 커튼을 치거나 유리가 작아지면 줄어든다(나중에)
export function windowLight(d) {
  return { dark: darkness(d), weight: WIN.rect ? 1 : 0 };
}
