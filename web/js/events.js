/* 가끔 생기는 일 목록과 창밖 교통정리.
   목록: 나비, UFO, 산타 썰매, 할로윈(마녀·박쥐·커튼 유령 그림자), 창밖 풍경(건너편 창 불빛·천둥번개·무지개·비행기, 난간의 새·작은 검은 고양이), 불꽃놀이.
   놀이 목록(plays.js)과 같은 방식: 사건 하나는 자기 파일(outside.js, halloween.js, weather.js, veranda.js)에 아래 모양의 물건 하나를 내놓고,
   여기 목록에 한 줄 더하면 끝이다. main.js(매 장면·그리기), outside.js·draw.js(창밖), jump.js(시간 점프), ui.js(미리보기 버튼), debug.js는 이 목록을 돌기만 한다.

   { id,
     cls                교통정리 등급 (아래 TRAFFIC 설명). 없으면 'bg'
     active()           지금 창밖(커튼)에 나와 있나. 교통정리가 본다
     tick(d, real, bf)  매 장면. 생길지 정하고 진행한다. real: 실제 시간(초), bf: 미리보기 배속에 따른 빠르기
     skyBack(w)         창밖: 건너편 아파트 그림 다음, 아파트 마스크(건물만) 전. 무언가 그렸으면 true (그때만 마스크를 다시 덮는다)
     apt(w, g)          창밖: 아파트 마스크 바로 다음 (건너편 창 불빛). g: 아파트 그림 위치·밤 비율
     sky(w)             창밖 하늘에 (창 영역 w 안에서, 해·달·구름 다음)
     veranda(w)         베란다 층: 방 배경(난간 포함) 다음, 창틀을 다시 덮기 전. 난간에 앉은 새, 작은 검은 고양이. 그렸으면 그 범위 [x0, y0, x1, y1]
     room()             방 안 캐릭터 위에 (어둠 아래)
     shadow(dk)         어둠 위에 (커튼 그림자, 밤에 빛나는 점: 검은 고양이 눈·비행기 불빛, 번개 흰 빛)
     reset()            시간 점프: 지나가던 것은 이미 지나갔다
     dev: [{ btn, go }] 미리보기 버튼 (index.html의 id)
     debug: { … }       window.__goyang에 더할 것 } */
import { batsEvent, ghostEvent, towerEvent, witchEvent } from './halloween.js';
import { butterflyEvent, santaEvent, ufoEvent } from './outside.js';
import { lightsEvent, planeEvent, rainbowEvent, thunderEvent } from './weather.js';
import { birdEvent, blackcatEvent } from './veranda.js';
import { fireworksEvent } from './fireworks.js';
import { blossomEvent, dragonflyEvent, dustEvent, firstSnowEvent, frostEvent, geeseEvent, leavesEvent, railSnowEvent } from './seasons.js';
import { now, thunderNow } from './time.js';
import { world } from './world.js';
import { has } from './objects.js';
import { onScene } from './util.js';
import { guard } from './guard.js';
import { abortEvent } from './recover.js';
import { assetsWarm } from './assets.js';

// 순서 = 매 장면 진행 순서(확률을 뽑는 순서)이자 그리는 순서. 처음 쓸 때 만든다 (파일들이 서로 불러오므로)
let list = null;
// 3차 계절 손님(seasons.js): 철새는 하늘의 큰 것, 벚꽃잎·낙엽은 하늘에, 난간 눈은 새 아래, 잠자리는 손님 위, 성에는 베란다 층 맨 끝(유리)
// 불꽃놀이(fireworks.js)는 맨 끝: 앞 사건들의 확률 뽑는 순서를 바꾸지 않게. 하늘의 큰 것이라 공연 중엔 다른 큰 것이 시작하지 않는다
export const events = () => list || (list = [butterflyEvent, ufoEvent, santaEvent, witchEvent, batsEvent, ghostEvent, lightsEvent, thunderEvent, rainbowEvent, planeEvent, geeseEvent, blossomEvent, leavesEvent, railSnowEvent, birdEvent, blackcatEvent, dragonflyEvent, firstSnowEvent, dustEvent, frostEvent, fireworksEvent, towerEvent]);

// 이 장면에서 생길 수 있는 일: needs의 장소가 모두 있는 것만 (SCENE_PLAN.md 7장). 장면을 읽으면 다시 고른다
const ok = e => !e.needs || e.needs.every(has);
let live = null;
onScene(() => live = null);
const liveEvents = () => live || (live = events().filter(ok));
// 사건 하나의 오류가 다른 사건을 막지 않게 (STABILITY_PLAN.md 3장). 오류 난 사건은 조용히 끝낸다 (recover.js abortEvent)
const one = (e, k, f) => guard(`사건 ${e.id}.${k}`, f, () => abortEvent(e));
const each = (k, ...args) => {
  for (const e of liveEvents())
    if (e[k])
      one(e, k, () => e[k](...args));
};

/* ───────── 창밖 교통정리 (WINDOW_PLAN.md 4장) ─────────
   cls       무엇                                   규칙
   sky       UFO, 산타, 마녀(+커튼 마녀 그림자), 비행기, 철새 무리, 불꽃놀이 공연  한 번에 하나. 끝나고 rest초 쉬었다가 다음. 한 시간 hour번까지. 천둥 치는 동안엔 안 나옴
   skySmall  박쥐 무리                               큰 것이 있으면 안 나옴 (마녀가 시작하면 비켜 사라지는 것은 halloween.js)
   curtain   커튼 유령, 커튼 마녀 그림자               커튼 자리(world.curtainShadow) 하나를 같이 쓴다
   veranda   비둘기·까치, 작은 검은 고양이             한 번에 하나(까치 짝은 한 손님). 큰 것과는 겹쳐도 됨. 천둥 치는 동안엔 안 나옴
   weather   천둥번개, 무지개                         날씨 규칙(time.js rainNow·rainSpan)대로
   bg        나비, 건너편 창 불빛, 멀리 나는 새, 낙엽·벚꽃잎·잠자리·난간 눈·성에  항상 겹쳐도 됨 (낙엽·잠자리는 손님이 앉은 난간 자리를 피함, seasons.js)
   예외(opt): special — 특별한 순간(이브 밤 산타, 10/31 밤 마녀). 쉼·한 시간 상한·천둥을 무시하고 진행 중인 큰 것만 기다린다
              noRest  — UFO 노트북 개그(노트북을 친 직후). 쉼만 무시
   미리보기 버튼은 교통정리를 묻지 않고 바로 띄운다 (각 사건의 dev) */
export const TRAFFIC = {
  rest: 8 * 60, // 초(방 시각): 하늘의 큰 것이 끝나고 다음까지
  hour: 3, // 하늘의 큰 것: 한 시간(방 시각)에 이만큼까지
  wait: { plane: 5 * 60, bird: 5 * 60, blackcat: 10 * 60 }, // 초: 날짜로 정해진 시각에 막혀 있으면 이만큼 기다렸다가 그래도 막히면 그 회차는 건너뛴다
};
const T = { clock: 0, skyEnd: -1e9, starts: [], was: {} }; // clock: 방 시각(초, 이 화면을 연 뒤). starts: 하늘의 큰 것 시작 시각들
const busy = cls => liveEvents().some(e => e.cls === cls && e.active && e.active());
export function canStart(cls, opt = {}) {
  if (!assetsWarm()) // 처음 연 뒤 사건 그림(나중 묶음)을 다 받기 전에는 아무것도 시작하지 않는다 (LOAD_PLAN.md 4-1)
    return false;
  if (cls === 'sky') {
    if (busy('sky'))
      return false;
    if (opt.special)
      return true;
    if (thunderNow(now()))
      return false;
    if (!opt.noRest && T.clock - T.skyEnd < TRAFFIC.rest)
      return false;
    return T.starts.filter(t => T.clock - t < 3600).length < TRAFFIC.hour;
  }
  if (cls === 'skySmall')
    return !busy('sky');
  if (cls === 'curtain')
    return !busy('curtain');
  if (cls === 'veranda')
    return !busy('veranda') && !thunderNow(now());
  return true;
}
// 다음 큰 것까지 남은 쉼(초). 미리보기 한 줄
export const skyRestLeft = () => Math.max(0, TRAFFIC.rest - (T.clock - T.skyEnd));
// 매 장면: 사건마다 나와 있는지 보고 시작·끝을 기록한다 (각 사건은 시작·끝을 따로 알릴 필요가 없다)
function traffic(dt) {
  T.clock += dt;
  let sky = false;
  for (const e of liveEvents()) {
    if (!e.active)
      continue;
    const on = !!e.active();
    if (e.cls === 'sky') {
      if (on && !T.was[e.id])
        T.starts.push(T.clock);
      sky = sky || on;
    }
    T.was[e.id] = on;
  }
  if (T.wasSky && !sky)
    T.skyEnd = T.clock;
  T.wasSky = sky;
  T.starts = T.starts.filter(t => T.clock - t < 3600);
}
export const eventsTick = (d, real, bf) => {
  each('tick', d, real, bf);
  guard('창밖 교통정리', () => traffic(real * bf));
  world.winResume = false; // 처음 연 뒤·점프 직후 한 장면만 "이어서 보여 주기" (veranda.js, weather.js)
};
export const eventsSkyBack = w => {
  let any = false;
  for (const e of liveEvents())
    if (e.skyBack && one(e, 'skyBack', () => e.skyBack(w)))
      any = true;
  return any;
};
export const eventsApt = (w, g) => each('apt', w, g);
export const eventsSky = w => each('sky', w);
export const eventsVeranda = w => { // 그린 곳 [x0, y0, x1, y1] 목록 (draw.js가 그 자리만 창틀을 다시 덮는다)
  const out = [];
  for (const e of liveEvents())
    if (e.veranda) {
      const b = one(e, 'veranda', () => e.veranda(w));
      if (b)
        out.push(b);
    }
  return out;
};
export const eventsRoom = () => each('room');
export const eventsShadow = dk => each('shadow', dk);
export const eventsReset = () => {
  each('reset');
  world.winResume = true; // 날짜로 정해진 것(새·검은 고양이·비행기)은 새 시각에 있어야 할 모습으로 이어서 (veranda.js, weather.js)
};
export function eventsDev($) {
  for (const e of events())
    for (const b of e.dev || [])
      $(b.btn).onclick = () => ok(e) && b.go(); // 이 장면에 없는 일은 미리보기로도 안 띄운다
}
export const eventsDebug = () => Object.assign({ canStart, TRAFFIC }, ...events().map(e => e.debug || {}));
// 미리보기 한 줄: "하늘: 비어 있음 · 베란다: 비둘기 · 다음 큰 것까지 3분 · 오늘 밤 검은 고양이: 21:40(빼꼼)"
export function trafficLine(tr) {
  const sky = liveEvents().filter(e => e.cls === 'sky' && e.active && e.active()).map(e => tr('wt_' + e.id));
  const ver = world.guest ? tr('wt_' + world.guest.kind) : '';
  const parts = [tr('wtSky', { v: sky.join(', ') || tr('wtEmpty') }), tr('wtVeranda', { v: ver || tr('wtEmpty') })];
  const left = skyRestLeft();
  if (left > 0)
    parts.push(tr('wtNext', { m: Math.ceil(left / 60) }));
  for (const e of liveEvents())
    if (e.note)
      parts.push(e.note(tr));
  return parts.filter(Boolean).join(' · ');
}
