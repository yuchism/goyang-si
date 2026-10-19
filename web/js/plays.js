/* 놀이 목록: 레이저 · 어항 낚시 · 실뭉치 · 쳇바퀴. CAT_PLAY_PLAN.md
   놀이 하나는 자기 파일 끝에 아래 모양의 물건 하나를 내놓고, 여기 목록에 한 줄 더하면 끝이다.
   main.js(매 장면·그리기), ui.js(누르기·미리보기 버튼), jump.js(시간 점프), debug.js(점검용)는 이 목록을 돌기만 한다.

   { id,
     tick(dt, real)     매 장면. dt: 방 시간(초), real: 실제 시간(초)
     layers()           바닥 물건·캐릭터와 앞뒤로 정렬해 그릴 것 [[깊이 y, 그리기], …]
     overlay()          캐릭터 위에 (어둠 아래)
     light()            어둠 위에
     press(x, y, when)  누르기. when: 'first'(무엇보다 먼저) | 'before'(쥐야쥐·고양이보다 먼저) | 'after'(그다음, 물건보다 먼저).
                        이 놀이가 받았으면 true
     drag(x, y, e)      누른 채 움직이기
     reset(a, b)        시간 점프 (a → b, 방 시각 ms). 장면 없이 결과만
     dev: { btn, go }   미리보기 버튼 (index.html의 id)
     debug: { … }       window.__goyang에 더할 것 }
   언제 저절로 시작하는지(시간대·간격)는 gate.js, 고양이가 고르는 비율은 cat.js catBrain, 끼어들기 규칙은 behave.js */
import { fishPlay } from './fish.js';
import { laserPlay } from './laser.js';
import { wheelPlay } from './wheel.js';
import { yarnPlay } from './yarn.js';
import { guard } from './guard.js';
import { has } from './objects.js';
import { resetPlay } from './recover.js';
import { onScene } from './util.js';

// 순서 = 매 장면 진행 순서이자 같은 단계에서 누르기를 보는 순서.
// 처음 쓸 때 만든다 (놀이 파일들이 서로·이 파일을 돌고 돌아 불러오므로, 불러오는 도중에는 아직 없을 수 있다)
let list = null;
export const plays = () => list || (list = [laserPlay, fishPlay, yarnPlay, wheelPlay]);

// 이 장면에서 할 수 있는 놀이: needs의 장소가 모두 있는 것만 (SCENE_PLAN.md 7장)
const ok = p => !p.needs || p.needs.every(has);
let live = null;
onScene(() => live = null);
export const livePlays = () => live || (live = plays().filter(ok));
export const playOk = id => livePlays().some(p => p.id === id);
// 놀이 하나의 오류가 다른 놀이를 막지 않게 (STABILITY_PLAN.md 3장). 오류 난 놀이는 끝내고 붙잡고 있던 배우를 되돌린다 (recover.js)
const each = (k, ...args) => {
  for (const p of livePlays())
    if (p[k])
      guard(`놀이 ${p.id}.${k}`, () => p[k](...args), () => resetPlay(p));
};
export const playsTick = (dt, real) => each('tick', dt, real);
export const playsLayers = () => livePlays().flatMap(p => p.layers ? guard(`놀이 ${p.id}.layers`, () => p.layers(), () => resetPlay(p)) || [] : []);
export const playsOverlay = () => each('overlay');
export const playsLight = () => each('light');
export const playsDrag = (x, y, e) => each('drag', x, y, e);
export const playsReset = (a, b) => each('reset', a, b);
export const playsPress = (x, y, when) => livePlays().some(p => p.press && p.press(x, y, when));
export function playsDev($) {
  for (const p of plays())
    if (p.dev)
      $(p.dev.btn).onclick = () => ok(p) && p.dev.go(); // 이 장면에 없는 놀이는 미리보기로도 안 띄운다
}
export const playsDebug = () => Object.assign({}, ...plays().map(p => p.debug || {}));
