/* 가끔 생기는 일 목록: 나비, UFO, 산타 썰매, 할로윈(마녀·박쥐·커튼 유령 그림자). 놀이 목록(plays.js)과 같은 방식
   사건 하나는 자기 파일(outside.js, halloween.js)에 아래 모양의 물건 하나를 내놓고, 여기 목록에 한 줄 더하면 끝이다.
   main.js(매 장면·그리기), outside.js(창밖), jump.js(시간 점프), ui.js(미리보기 버튼), debug.js는 이 목록을 돌기만 한다.

   { id,
     tick(d, real, bf)  매 장면. 생길지 정하고 진행한다. real: 실제 시간(초), bf: 미리보기 배속에 따른 빠르기
     sky(w)             창밖 하늘에 (창 영역 w 안에서, 해·달·구름 다음)
     room()             방 안 캐릭터 위에 (어둠 아래)
     shadow(dk)         어둠 위에 (커튼 그림자처럼 밤에 비치는 것)
     reset()            시간 점프: 지나가던 것은 이미 지나갔다
     dev: [{ btn, go }] 미리보기 버튼 (index.html의 id)
     debug: { … }       window.__goyang에 더할 것 } */
import { batsEvent, ghostEvent, witchEvent } from './halloween.js';
import { butterflyEvent, santaEvent, ufoEvent } from './outside.js';

// 순서 = 매 장면 진행 순서(확률을 뽑는 순서)이자 그리는 순서. 처음 쓸 때 만든다 (파일들이 서로 불러오므로)
let list = null;
export const events = () => list || (list = [butterflyEvent, ufoEvent, santaEvent, witchEvent, batsEvent, ghostEvent]);

const each = (k, ...args) => {
  for (const e of events())
    if (e[k])
      e[k](...args);
};
export const eventsTick = (d, real, bf) => each('tick', d, real, bf);
export const eventsSky = w => each('sky', w);
export const eventsRoom = () => each('room');
export const eventsShadow = dk => each('shadow', dk);
export const eventsReset = () => each('reset');
export function eventsDev($) {
  for (const e of events())
    for (const b of e.dev || [])
      $(b.btn).onclick = b.go;
}
export const eventsDebug = () => Object.assign({}, ...events().map(e => e.debug || {}));
