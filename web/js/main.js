/* 시작점: 하루 일정, 매 프레임 진행(frame)과 그리기(render), 처음 시작 */
import { play } from './anim.js';
import { drawPumpkinGlow, pumpkinNight } from './halloween.js';
import { eventsRoom, eventsShadow, eventsTick, trafficLine } from './events.js';
import { SRC, loadImages, loadMeta } from './assets.js';
import { CAKE, bannerText, birthdayMode, drawCakeGlow, drawPartyLights, drawPartyMouse, tickParty } from './birthday.js';
import { calmDown, catBrain, cupTick, sunbeamTick } from './cat.js';
import { exposeDebug } from './debug.js';
import { duetTick } from './duet.js';
import { drawCup, drawObj, drawProp, drawRoom, drawSunbeam } from './draw.js';
import { drawManduk, startVisit, updateManduk, visitTick } from './manduk.js';
import { mouseTick, resetMouseTimer } from './mouse.js';
import { OBJ, P, S, depthOf, initObjects, objView, present } from './objects.js';
import { drawBookTag, drawBooks, initShelf } from './shelf.js';
import { Snd } from './sound.js';
import { drawActor, drawBubble, drawCaptions } from './sprites.js';
import { H, W, cam, ctx, fit, updateCam, view } from './stage.js';
import { bub, go, hold, ownLayer, run, tickActor } from './steps.js';
import { advanceClock, calDay, darkness, inWindow, lampShouldBeOn, mandukAsleep, mandukHome, markClock, moonName, moonPhase, now, passedEvents, rainNow, resetClock, routineOf, season, snowing, speed, timeInfo } from './time.js';
import { drawJumpFade, initJump, jumpTick, newDay, settleCat } from './jump.js';
import { frameTick } from './frame.js';
import { playsLayers, playsLight, playsOverlay, playsTick } from './plays.js';
import { loadPrograms, tvOn, tvTick } from './tv.js';
import { loadWindows } from './weather.js';
import { tvBig } from './tv-guide.js';
import { drawTVNight, drawTvBuf, tvBuf } from './tv-screen.js';
import { devOpen, initUI } from './ui.js';
import { pick, rnd } from './util.js';
import { applyDom, tr } from './i18n.js';
import { drawOddBook, drawOddGlow, initInstall, portraitHint } from './install.js';
import { caption, cat, mouse, say, tickTimers, world } from './world.js';
/* ───────── 상태 표시 ───────── */
function statusText(d) {
  const h = d.getHours(), mi = String(d.getMinutes()).padStart(2, '0');
  const ap = tr(h < 12 ? 'am' : 'pm'), hh = ((h + 11) % 12) + 1;
  const parts = [tr('clock', { dow: tr('dow')[d.getDay()], ap, h: hh, m: mi }), tr('season')[season(d)], rainNow(d) ? tr('rain') : ''];
  if (mandukAsleep(d))
    parts.push(tr('stAsleep'));
  else if (!mandukHome(d))
    parts.push(tr('stWork'));
  else
    parts.push(tr('stHome'));
  return parts.filter(Boolean).join(' · ');
}
/* ───────── 일정 ───────── */
function scheduled(d) {
  const k = calDay(d);
  if (world.dayKey !== k)
    newDay(k);
  // 지난 일정(time.js passedEvents): 정해진 시각부터 ROUTINE.DUE_WINDOW 안에 처음 보면(due) 장면을 일으키고, 그보다 늦으면(late) "지났음"만 표시
  // (시간이 건너뛰었을 때의 결과 적용은 jump.js timeJumped가 먼저 해 둔다)
  for (const ev of passedEvents(d)) {
    if (world.doneToday[ev.name])
      continue;
    world.doneToday[ev.name] = true;
    if (ev.state === 'due')
      EVENT[ev.name]();
  }
}
// 일정 이름(time.js dayEvents)별 장면
const EVENT = {
  wait: () => {
    if (!world.manduk)
      run(cat, [
        go(S('door.wait')[0], S('door.wait')[1], 60),
        hold(0.5, 'stand', false, 1),
        bub('🐟❓', 4),
        play('wait', 40, () => !!world.manduk),
        bub('🐟❗❗', 4),
        play('wait', 400, () => !!world.manduk)
      ], 'wait');
  },
  feed: () => startVisit('feed'),
  leave: () => caption(tr('capLeave'), 3.5),
  ret: () => startVisit('ret'),
  lampOn: () => {
    world.lampOn = true;
  },
  lights: () => startVisit('lights'),
  anniv: () => startVisit('anniv')
};
/* ───────── 메인 루프 ───────── */
let ambT = 0;
resetMouseTimer(); // 쥐야쥐 첫 등장 확인까지 (mouse.js). 예전 자리 그대로 여기서 정한다
function frame(tNow) {
  const real = advanceClock(tNow);
  const bf = speed === 1 ? 1 : speed === 60 ? 4 : 12;
  const dt = real * bf;
  tickTimers(dt); // 방 시간 타이머 (world.js after)
  world.t += real;
  jumpTick(real); // 시간 점프면 방을 그 시각에 맞춘다. 일정보다 먼저
  const d = now();
  scheduled(d);
  world.dark = darkness(d);
  const home = mandukHome(d), asleep = mandukAsleep(d);
  // 방의 반사 행동 (순서가 곧 진행 순서)
  visitTick(d, dt); // 소음 게이지와 만득 씨 방문 (manduk.js)
  mouseTick(d, dt); // 쥐야쥐 등장과 뇌 (mouse.js)
  duetTick(dt); // 같이 낮잠 → 화들짝, 자는 고양이 앞 지나가기, 서로 의식하기 (duet.js)
  sunbeamTick(d, dt); // 낮잠 자다 햇빛 따라가기 (cat.js)
  eventsTick(d, real, bf); // 가끔 생기는 일: 나비, UFO, 산타, 마녀, 박쥐, 커튼 유령 (events.js)
  tvTick(d);
  frameTick(d, real);
  cupTick(dt); // 떨어지는 컵 (cat.js)
  // 뇌
  if (!cat.steps.length && !cat.cur && !world.manduk)
    catBrain(d);
  tickActor(cat, dt);
  tickActor(mouse, dt);
  if (cat.moving) {
    cat.stepT -= dt;
    if (cat.stepT <= 0) {
      cat.stepT = 0.42 * rnd(0.8, 1.2);
      Snd.bell(0.8);
    }
  }
  updateManduk(real);
  if (world.paw) {
    world.paw.t += real;
    if (world.paw.t > 2.5)
      world.paw = null;
  }
  // 소리 환경
  ambT -= real;
  if (ambT <= 0) {
    ambT = 0.5;
    const tv = home && !asleep && inWindow(routineOf(d).tvSound, d) && !world.manduk; // 주말 만득 씨 TV 소리 (time.js ROUTINE)
    Snd.setAmb(rainNow(d) && !snowing(d), tv || tvOn(), world.dark > 0.5);
    if (tv && Math.random() < 0.012)
      caption(pick(tr('capAmbient')), 3);
  }
  calmDown(real); // 건드림 짜증 회복
  playsTick(dt, real); // 놀이: 레이저·어항·실뭉치·쳇바퀴 (plays.js)
  render(d, real);
  document.getElementById('status').textContent = statusText(d);
  if (devOpen) {
    document.getElementById('hourv').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const m = moonPhase(d); // 달 모양 확인용: "10/19 · 달: 상현 52%"
    document.getElementById('moonv').textContent = tr('devMoon', { md: (d.getMonth() + 1) + '/' + d.getDate(), name: tr('moonName')[moonName(m)], pct: Math.round(m.lit * 100) });
    const ti = timeInfo(d); // 시간 기준 확인용 한 줄 (TIME_BASE_PLAN.md 9장)
    document.getElementById('timev').textContent = tr('devTime', { season: tr('season')[ti.season] + (ti.south ? tr('devSouth') : ''), part: tr('daypart')[ti.part],
      cal: ti.cal, bd: ti.bday, night: ti.night || '–', periods: ti.periods.join(', ') || '–' });
    document.getElementById('winv').textContent = trafficLine(tr); // 창밖 교통정리 (events.js, WINDOW_PLAN.md 11장)
  }
  requestAnimationFrame(frame);
}
function render(d, real) {
  world.renderDt = real;
  tickParty(real);
  if (world.tv.st)
    drawTvBuf(world.tv.st);
  updateCam(real);
  const { s, dpr } = view;
  ctx.setTransform(s * dpr, 0, 0, s * dpr, -cam.x * s * dpr, 0);
  ctx.clearRect(cam.x, 0, W, H);
  drawRoom(d);
  drawBooks(real);
  drawOddBook(real);
  drawSunbeam(d);
  drawPartyMouse();
  // 소품과 캐릭터를 바닥에 닿는 위치 순서로 그린다 (뒤에 있으면 가려짐)
  const L = OBJ.filter(o => o.layer === 'floor' && present(o)).map(o => [depthOf(objView(o)), () => drawObj(o, d)]);
  if (birthdayMode)
    L.push([598, () => {
        drawProp('birthday_cake', CAKE.x, CAKE.y, CAKE.w);
        drawCakeGlow();
      }]);
  const c = world.cup;
  if (ownLayer(cat))
    L.push([cat.inBox ? P.box.y : cat.y, () => drawActor(cat)]);
  if (ownLayer(mouse))
    L.push([mouse.y, () => drawActor(mouse)]);
  L.push(...playsLayers()); // 쳇바퀴 안의 고양이·쥐야쥐는 쳇바퀴가 같이 그린다 (steps.js SPOTS layer)
  L.sort((a, b) => a[0] - b[0]).forEach(e => e[1]());
  if (c.state === 'falling')
    drawCup(c.x, c.fy, c.fall * 4);
  playsOverlay();
  eventsRoom(); // 나비
  drawManduk('legs');
  // 어둠과 램프
  const dk = world.dark;
  if (dk > 0) {
    ctx.fillStyle = `rgba(16,20,46,${world.lampOn ? dk * 0.6 : dk + (pumpkinNight() ? dk * 0.2 : 0)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (world.lampOn && dk > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(P.lamp.x, P.lamp.y - 60, 10, P.lamp.x, P.lamp.y, 520);
    g.addColorStop(0, `rgba(255,200,120,${0.35 * dk})`);
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  drawTVNight(dk);
  drawPumpkinGlow(dk);
  drawOddGlow(dk);
  eventsShadow(dk); // 커튼 그림자
  playsLight();
  drawPartyLights(dk);
  drawManduk('say');
  drawBubble(cat);
  drawBubble(mouse);
  if (world.paw) {
    const p = world.paw, k = p.t / 2.5;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#fffaf0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20 + k * 60, 0, 7);
    ctx.stroke();
    ctx.restore();
  }
  drawCaptions(real);
  drawBookTag();
  drawJumpFade(real, W, H);
  if (tvBig)
    tvBig.drawImage(tvBuf, 0, 0);
}
/* ───────── 시작 ───────── */
applyDom();
bannerText();
initShelf();
initUI();
initInstall();
initJump();
exposeDebug();
// 사물 목록과 그림 정보를 읽은 뒤 그림을 불러오고 시작
Promise.all([fetch('objects.json', { cache: 'no-store' }).then(r => r.json()).then(initObjects), loadMeta(), loadPrograms(), loadWindows()])
  .catch(e => console.error('고양.시를 여는 데 필요한 파일을 읽지 못했어요', e))
  .finally(loadImages);
export function start() {
  fit();
  const d = now();
  world.dayKey = calDay(d);
  world.lampOn = lampShouldBeOn(d);
  settleCat(d);
  requestAnimationFrame(t => {
    resetClock(t);
    markClock();
    frame(t);
    portraitHint();
  });
}
/* ───────── 오프라인 캐시 (sw.js, MOBILE_PLAN.md 4-2) ─────────
   실패해도 조용히 넘어간다. 이미 받은 파일(지금 보이는 방)도 담아 두라고 알려 준다 (이미 담긴 것은 건너뜀) */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(reg => {
    const urls = [location.href, ...performance.getEntriesByType('resource').map(e => e.name), ...Object.values(SRC).map(u => new URL(u, location.href).href)];
    reg.active && reg.active.postMessage({ type: 'warm', urls: [...new Set(urls)] });
  }).catch(() => { });
}
