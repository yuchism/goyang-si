/* 점검용: 자동 점검과 개발자 도구에서 쓰도록 window.__goyang에 내보낸다 */
import { play } from './anim.js';
import { boxB, groomB, knockB, pawB, petCat, rollB, secretB, windowB } from './cat.js';
import { boxHideS, chaseS, duetB, greetS, napNextTo, stalkS } from './duet.js';
import { startVisit } from './manduk.js';
import { spawnMouse } from './mouse.js';
import { O } from './objects.js';
import { spawnButterfly, startUFO } from './outside.js';
import { bub, fn, go, hold, run } from './steps.js';
import { moonPhase, now, setOverride } from './time.js';
import { tvSegs, tvState } from './tv.js';
import { openTvGuide, tvPeekB, tvRush, tvTopB, tvTopBlockedB, tvWatchB } from './tv-cat.js';
import { cat, mouse, say, world } from './world.js';
// window.__goyang 내보내기
export function exposeDebug() {
  // 확인용 (화면에는 영향 없음)
  window.__goyang = { tvState, tvSegs, tvWatchB, tvTopB, tvTopBlockedB, tvPeekB, tvRush, openTvGuide, O, startUFO, greetS, chaseS, stalkS, boxHideS, napNextTo, duetB, cat, mouse, world, run, play, hold, go, fn, bub, say, startVisit, spawnMouse, spawnButterfly, groomB, boxB, rollB, windowB, pawB, secretB, knockB, petCat, now, setOverride, moonPhase };
}
