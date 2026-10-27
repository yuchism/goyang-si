/* 시작점: 하루 일정, 매 프레임 진행(frame)과 그리기(render), 처음 시작 */
import { play } from './anim.js';
import { drawPumpkinGlow, pumpkinNight } from './halloween.js';
import { eventsRoom, eventsShadow, eventsTick, trafficLine } from './events.js';
import { SRC, loadImages, loadMeta, onWarm } from './assets.js';
import { CAKE, bannerText, birthdayMode, danceCell, drawCakeGlow, drawDisco, drawDiscoLights, drawPartyLights, drawPartyMouse, tickParty } from './birthday.js';
import { drawPuffs, guestLayers } from './guests.js';
import { chimeLayers, chimeTick, drawChimeGlow, drawChimePuffs } from './chime.js';
import { calmDown, catBrain, cupTick, sunbeamTick } from './cat.js';
import { exposeDebug } from './debug.js';
import { ERRORS, guard, guardDraw, reportError } from './guard.js';
import { resetActor, resetDuet } from './recover.js';
import { duetTick } from './duet.js';
import { drawCup, drawObj, drawProp, drawRoom, drawSunbeam } from './draw.js';
import { drawManduk, startVisit, updateManduk, visitTick } from './manduk.js';
import { mouseTick, resetMouseTimer } from './mouse.js';
import { OBJ, P, S, depthOf, objView, present } from './objects.js';
import { loadScene } from './scene.js';
import { drawBookTag, drawBooks, initShelf } from './shelf.js';
import { Snd } from './sound.js';
import { drawActor, drawBubble, drawCaptions } from './sprites.js';
import { H, W, cam, ctx, fit, roomDark, updateCam, view } from './stage.js';
import { windowLight } from './win.js';
import { bub, fn, go, hold, ownLayer, run, tickActor } from './steps.js';
import { advanceClock, calDay, sceneryAt, sunTimes, yearPos, inWindow, lampShouldBeOn, mandukAsleep, mandukHome, markClock, moonName, moonPhase, now, passedEvents, rainNow, resetClock, routineOf, season, snowing, speed, timeInfo } from './time.js';
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
import { drawOddBook, drawOddGlow, initInstall } from './install.js';
import { after, caption, cat, mouse, say, tickTimers, world } from './world.js';
/* ───────── 상태 표시 ───────── */
// 시간 단위 → 'H:MM' (미리보기 한 줄)
const clockOf = h => {
  const m = Math.round(h * 60);
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
};
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
// 오류 칸막이 (STABILITY_PLAN.md 3장, guard.js): 어떤 칸에서 오류가 나도 다음 장면은 돈다. 부르는 순서·횟수는 그대로
const cut = (name, fn, recover) => guard(name, fn, recover);
const draw = (name, fn) => guardDraw(ctx, name, fn);
function frame(tNow) {
  try {
    step(tNow);
  }
  catch (e) {
    reportError('매 장면', e);
  }
  finally {
    requestAnimationFrame(frame);
  }
}
function step(tNow) {
  const real = advanceClock(tNow);
  const bf = speed === 1 ? 1 : speed === 60 ? 4 : 12;
  const dt = real * bf;
  tickTimers(dt); // 방 시간 타이머 (world.js after)
  world.t += real;
  cut('시간 점프', () => jumpTick(real)); // 시간 점프면 방을 그 시각에 맞춘다. 일정보다 먼저
  const d = now();
  cut('일정', () => scheduled(d));
  // 밝기 (SCENE_PLAN.md 6장): 하늘에 그리는 것은 바깥 어둠, 방은 방 자체 밝기 + 창이 주는 빛
  cut('밝기', () => {
    const wl = windowLight(d);
    world.skyDark = wl.dark;
    world.dark = roomDark(wl);
  });
  const home = mandukHome(d), asleep = mandukAsleep(d);
  // 방의 반사 행동 (순서가 곧 진행 순서)
  cut('만득 씨 방문', () => visitTick(d, dt)); // 소음 게이지와 만득 씨 방문 (manduk.js)
  cut('쥐야쥐', () => mouseTick(d, dt), () => resetActor(mouse)); // 쥐야쥐 등장과 뇌 (mouse.js)
  cut('둘이 함께', () => duetTick(dt), resetDuet); // 같이 낮잠 → 화들짝, 자는 고양이 앞 지나가기, 서로 의식하기 (duet.js)
  cut('햇빛 따라가기', () => sunbeamTick(d, dt), () => resetActor(cat)); // 낮잠 자다 햇빛 따라가기 (cat.js)
  cut('정각 종', () => chimeTick(d, real)); // 정각 종·정각 손님 (chime.js, HOURLY_CHIME_PLAN.md)
  eventsTick(d, real, bf); // 가끔 생기는 일: 나비, UFO, 산타, 마녀, 박쥐, 커튼 유령 (events.js, 사건마다 칸막이)
  tvTick(d); // TV는 tv.js가 따로 격리 (tvBreak)
  cut('액자', () => frameTick(d, real));
  cut('컵', () => cupTick(dt)); // 떨어지는 컵 (cat.js)
  // 뇌
  if (!cat.steps.length && !cat.cur && !world.manduk)
    cut('강고양이 씨 뇌', () => catBrain(d), () => resetActor(cat));
  cut('강고양이 씨', () => tickActor(cat, dt), () => resetActor(cat));
  cut('쥐야쥐 행동', () => tickActor(mouse, dt), () => resetActor(mouse));
  if (cat.moving) {
    cat.stepT -= dt;
    if (cat.stepT <= 0) {
      cat.stepT = 0.42 * rnd(0.8, 1.2);
      Snd.bell(0.8);
    }
  }
  cut('만득 씨', () => updateManduk(real));
  if (world.paw) {
    world.paw.t += real;
    if (world.paw.t > 2.5)
      world.paw = null;
  }
  // 소리 환경
  ambT -= real;
  if (ambT <= 0) {
    ambT = 0.5;
    cut('소리 환경', () => {
      const tv = home && !asleep && inWindow(routineOf(d).tvSound, d) && !world.manduk; // 주말 만득 씨 TV 소리 (time.js ROUTINE)
      Snd.setAmb(rainNow(d) && !snowing(d), tv || tvOn(), world.dark > 0.5);
      if (tv && Math.random() < 0.012)
        caption(pick(tr('capAmbient')), 3);
    });
  }
  cut('짜증 회복', () => calmDown(real)); // 건드림 짜증 회복
  playsTick(dt, real); // 놀이: 레이저·어항·실뭉치·쳇바퀴 (plays.js, 놀이마다 칸막이)
  render(d, real);
  cut('상태 줄', () => statusLine(d));
}
function statusLine(d) {
  document.getElementById('status').textContent = statusText(d);
  if (devErrs)
    devErrLine();
  if (devOpen) {
    document.getElementById('hourv').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const m = moonPhase(d); // 달 모양 확인용: "10/19 · 달: 상현 52%"
    document.getElementById('moonv').textContent = tr('devMoon', { md: (d.getMonth() + 1) + '/' + d.getDate(), name: tr('moonName')[moonName(m)], pct: Math.round(m.lit * 100) });
    const ti = timeInfo(d); // 시간 기준 확인용 한 줄 (TIME_BASE_PLAN.md 9장)
    document.getElementById('timev').textContent = tr('devTime', { season: tr('season')[ti.season] + (ti.south ? tr('devSouth') : ''), part: tr('daypart')[ti.part],
      cal: ti.cal, bd: ti.bday, night: ti.night || '–', periods: ti.periods.join(', ') || '–' });
    const sc = sceneryAt(d), [sr, ss] = sunTimes(d), pct = k => Math.round(k * 100); // 풍경 한 줄 (WINDOW_PLAN_3.md 4-5)
    document.getElementById('scenev').textContent = tr('devSceneLine', { md: sc.md, mix: sc.mix.filter(([, k]) => k > 0.005).map(([n, k]) => tr('season')[n] + ' ' + pct(k) + '%').join(' + ') + (sc.mix[1][1] > 0.005 && sc.mix[1][1] < 0.995 ? (sc.dir === 'up' ? '(↑)' : '(↓)') : ''),
      cap: pct(sc.snowCap) + '%', rise: clockOf(sr), set: clockOf(ss), extra: sc.dust ? tr('devDust') : '' });
    const sl = document.getElementById('scenery');
    if (document.activeElement !== sl)
      sl.value = Math.round(yearPos(d) * 365);
    document.getElementById('winv').textContent = trafficLine(tr); // 창밖 교통정리 (events.js, WINDOW_PLAN.md 11장)
  }
}
function render(d, real) {
  world.renderDt = real;
  cut('생일 파티', () => tickParty(real));
  if (world.tv.st)
    drawTvBuf(world.tv.st); // TV 화면 버퍼는 tv-screen.js가 따로 격리
  cut('카메라', () => updateCam(real));
  const { s, dpr } = view;
  ctx.setTransform(s * dpr, 0, 0, s * dpr, -cam.x * s * dpr, 0);
  ctx.clearRect(cam.x, 0, W, H);
  // 그리기 칸마다 칸막이 (guard.js guardDraw: 항상 save/restore, 실패한 것만 안 그려진다)
  draw('방', () => drawRoom(d));
  draw('책장', () => drawBooks(real));
  draw('이상한 책', () => drawOddBook(real));
  draw('햇빛 조각', () => drawSunbeam(d));
  draw('생일 쥐야쥐', () => drawPartyMouse());
  // 소품과 캐릭터를 바닥에 닿는 위치 순서로 그린다 (뒤에 있으면 가려짐)
  const L = cut('바닥 순서', () => OBJ.filter(o => o.layer === 'floor' && present(o)).map(o => [depthOf(objView(o)), () => drawObj(o, d), '물건 ' + o.id])) || [];
  if (birthdayMode)
    L.push([CAKE.depth, () => {
        drawProp('birthday_cake', CAKE.x, CAKE.y, CAKE.w);
        drawCakeGlow();
      }, '케이크']);
  const c = world.cup;
  if (ownLayer(cat))
    L.push([cat.inBox ? P.box.y : cat.y, () => drawActor(cat), '강고양이 씨 그리기']);
  if (ownLayer(mouse))
    L.push([mouse.y, () => drawActor(mouse), '쥐야쥐 그리기']);
  if (world.party)
    L.push(...(cut('생일 손님 순서', () => guestLayers(danceCell(cat))) || [])); // 생일 깜짝 손님 (guests.js)
  L.push(...(cut('정각 손님 순서', () => chimeLayers()) || [])); // 정각 손님 (chime.js)
  L.push(...playsLayers()); // 쳇바퀴 안의 고양이·쥐야쥐는 쳇바퀴가 같이 그린다 (steps.js SPOTS layer)
  L.sort((a, b) => a[0] - b[0]).forEach(e => draw(e[2] || '놀이 그리기', e[1]));
  if (c.state === 'falling')
    draw('떨어지는 컵', () => drawCup(c.x, c.fy, c.fall * 4));
  draw('놀이 위층', () => playsOverlay());
  draw('방 안 사건', () => eventsRoom()); // 나비
  // 어둠과 램프
  const dk = world.dark;
  if (dk > 0)
    draw('어둠', () => {
      ctx.fillStyle = `rgba(16,20,46,${world.lampOn ? dk * 0.6 : dk + (pumpkinNight() ? dk * 0.2 : 0)})`;
      ctx.fillRect(0, 0, W, H);
    });
  if (world.lampOn && dk > 0.05)
    draw('램프', () => {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(P.lamp.x, P.lamp.y - 60, 10, P.lamp.x, P.lamp.y, 520);
      g.addColorStop(0, `rgba(255,200,120,${0.35 * dk})`);
      g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });
  draw('TV 밤 불빛', () => drawTVNight(dk)); // 안에서도 tvBreak로 격리
  draw('호박 불빛', () => drawPumpkinGlow(dk));
  draw('정각 손님 불빛', () => drawChimeGlow(dk)); // 할로윈 자정 손님 (chime.js)
  draw('이상한 책 불빛', () => drawOddGlow(dk));
  draw('그림자 사건', () => eventsShadow(dk)); // 커튼 그림자
  draw('놀이 불빛', () => playsLight());
  draw('파티 불빛', () => drawPartyLights(dk));
  if (world.party) {
    draw('디스코 빛', () => drawDiscoLights(dk));
    draw('디스코볼', () => drawDisco(dk));
    draw('손님 짠', () => drawPuffs());
  }
  draw('정각 손님 짠', () => drawChimePuffs());
  draw('만득 씨 그리기', () => drawManduk());
  draw('말풍선', () => {
    drawBubble(cat);
    drawBubble(mouse);
  });
  if (world.paw)
    draw('쓰다듬기', () => {
      const p = world.paw, k = p.t / 2.5;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#fffaf0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20 + k * 60, 0, 7);
      ctx.stroke();
    });
  draw('자막', () => drawCaptions(real));
  draw('책 이름표', () => drawBookTag());
  draw('점프 어둠', () => drawJumpFade(real, W, H));
  if (world.boomDraw) // 미리보기 "일부러 오류": 그리기 도중 save만 하고 끊긴 경우
    draw('일부러 오류 (그리기)', () => {
      world.boomDraw = false;
      ctx.save();
      ctx.globalAlpha = 0.1;
      throw new Error('일부러 낸 오류: 그리기');
    });
  if (tvBig)
    cut('편성표 창 TV', () => tvBig.drawImage(tvBuf, 0, 0));
}
// 미리보기(?dev=1로 연 페이지)에서만: "오류 n건"과 "일부러 오류" 버튼 (STABILITY_PLAN.md 3장).
// index.html에 두지 않고 이때만 만든다 (미리보기 도구 줄이 늘면 화면 점검의 무대 크기가 바뀌므로)
let devErrs = null, errShown = -1;
if (typeof location !== 'undefined' && /[?&]dev=1/.test(location.search) && document.getElementById('dev')) {
  devErrs = document.createElement('div');
  devErrs.className = 'grp';
  devErrs.innerHTML = '<span id="errv"></span><button id="dBoom"></button>';
  document.getElementById('dev').appendChild(devErrs);
  document.getElementById('dBoom').textContent = tr('dBoom');
}
function devErrLine() {
  if (ERRORS.total === errShown)
    return;
  errShown = ERRORS.total;
  document.getElementById('errv').textContent = tr('devErrors', { n: ERRORS.total });
}
// 강고양이 씨 행동 · 걸어 둔 일 · 그리기 세 곳에 오류를 하나씩 낸다. 방이 계속 도는지 본다
function boom() {
  const err = where => () => {
    throw new Error('일부러 낸 오류: ' + where);
  };
  run(cat, [hold(0.5, 'stand'), fn(err('강고양이 씨 행동'))], '');
  after(err('걸어 둔 일'), 1);
  world.boomDraw = true;
}
if (devErrs)
  document.getElementById('dBoom').onclick = boom;
/* ───────── 시작 ───────── */
applyDom();
bannerText();
initShelf();
initUI();
initInstall();
initJump();
exposeDebug();
// 장면(사물 목록)과 그림 정보를 읽은 뒤 그림을 불러오고 시작
// 모두 끝난 뒤에 판단한다 (STABILITY_PLAN.md 6장). 장면·그림 목록(meta.json)이 없으면 방을 열 수 없으니 안내를 띄운다.
// TV 표·창밖 불빛(loadPrograms·loadWindows)은 스스로 실패를 삼키고, 없어도 방은 연다
Promise.allSettled([loadScene(), loadMeta(), loadPrograms(), loadWindows()]).then(([scene, meta]) => {
  const bad = [['장면', scene], ['그림 목록(meta.json)', meta]].filter(([, r]) => r.status === 'rejected');
  if (bad.length) {
    bad.forEach(([what, r]) => console.error(`고양.시를 여는 데 필요한 ${what}을 읽지 못했어요`, r.reason));
    startFailed();
    return;
  }
  loadImages();
});
export function start() {
  try {
    fit();
    const d = now();
    world.dayKey = calDay(d);
    world.lampOn = lampShouldBeOn(d);
    settleCat(d);
  }
  catch (e) {
    reportError('시작', e);
    startFailed();
    return;
  }
  requestAnimationFrame(t => {
    resetClock(t);
    markClock();
    frame(t); // 매 장면은 칸막이 안 (guard.js)
  });
}
// 방을 열지 못했을 때: 짧은 안내와 "다시 열기" (STABILITY_PLAN.md 6장). 한 번만 띄운다
function startFailed() {
  if (document.getElementById('startFail'))
    return;
  const box = document.createElement('div');
  box.id = 'startFail';
  box.setAttribute('role', 'alert');
  box.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#1d1a24;color:#fff3dc;font:600 18px/1.5 system-ui,sans-serif;text-align:center;padding:24px;z-index:99';
  const msg = document.createElement('div');
  msg.textContent = tr('startFail');
  const btn = document.createElement('button');
  btn.textContent = tr('startRetry');
  btn.style.cssText = 'font:inherit;padding:10px 22px;border-radius:999px;border:1px solid #fff3dc66;background:#2e2838;color:inherit;cursor:pointer';
  btn.onclick = () => location.reload();
  box.append(msg, btn);
  document.body.appendChild(box);
}
/* ───────── 오프라인 캐시 (sw.js, MOBILE_PLAN.md 4-2) ─────────
   실패해도 조용히 넘어간다. 이미 받은 파일(지금 보이는 방)도 담아 두라고 알려 준다 (이미 담긴 것은 건너뜀)
   알리는 때: 그림을 나중 묶음까지 다 받은 뒤 (assets.js onWarm, LOAD_PLAN.md 1-1). 그 전에 알리면 그림 목록(SRC)이 아직 비어 있거나,
   서비스 워커가 나중 묶음을 따로 받기 시작해 첫 장면에 필요한 그림과 대역폭을 다툰다. 다 받은 뒤라 대부분 브라우저 캐시에서 나온다 */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const ready = navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready);
  onWarm(() => ready.then(reg => {
    const urls = [location.href, ...performance.getEntriesByType('resource').map(e => e.name), ...Object.values(SRC).map(u => new URL(u, location.href).href)];
    reg.active && reg.active.postMessage({ type: 'warm', urls: [...new Set(urls)] });
  }).catch(() => { }));
  ready.catch(() => { });
}
