/* 시작점: 하루 일정, 매 프레임 진행(frame)과 그리기(render), 처음 시작 */
import { play } from './anim.js';
import { drawCurtainShadow, drawPumpkinGlow, maybeBats, maybeGhost, maybeWitch, pumpkinNight } from './halloween.js';
import { SRC, loadImages, loadMeta } from './assets.js';
import { CAKE, bannerText, birthdayMode, drawCakeGlow, drawPartyLights, drawPartyMouse, tickParty } from './birthday.js';
import { calmDown, catBrain } from './cat.js';
import { exposeDebug } from './debug.js';
import { drawCup, drawObj, drawProp, drawRoom, drawSunbeam } from './draw.js';
import { drawManduk, startVisit, updateManduk } from './manduk.js';
import { MOUSE_RUN, mouseBrain, spawnMouse } from './mouse.js';
import { OBJ, P, S, depthOf, initObjects, objView, present } from './objects.js';
import { drawButterfly, maybeSanta, maybeUFO, spawnButterfly, updateButterfly } from './outside.js';
import { drawBookTag, drawBooks, initShelf } from './shelf.js';
import { Snd } from './sound.js';
import { drawActor, drawBubble, drawCaptions } from './sprites.js';
import { H, W, cam, ctx, fit, updateCam, view } from './stage.js';
import { bub, fn, go, hold, run, tickActor } from './steps.js';
import { advanceClock, darkness, dayKey, hourOf, inBeam, isAnniversary, isWeekend, mandukAsleep, mandukHome, now, rainNow, resetClock, season, snowing, speed, sunTimes, sunbeam } from './time.js';
import { tvOn, tvTick } from './tv.js';
import { tvBig } from './tv-cat.js';
import { drawTVNight, drawTvBuf, tvBuf } from './tv-screen.js';
import { devOpen, initUI } from './ui.js';
import { pick, rnd } from './util.js';
import { applyDom, tr } from './i18n.js';
import { drawOddBook, drawOddGlow, initInstall, portraitHint } from './install.js';
import { caption, cat, mouse, say, world } from './world.js';
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
  const k = dayKey(d);
  if (world.dayKey !== k) {
    world.dayKey = k;
    world.doneToday = {};
    world.visitsToday = 0;
    world.notes.cleared = false;
    world.treat = false;
  }
  const h = hourOf(d), we = isWeekend(d);
  const at = (name, hr, fnc) => {
    if (world.doneToday[name])
      return;
    if (h >= hr && h < hr + 0.35) {
      world.doneToday[name] = true;
      fnc();
    }
    else if (h >= hr + 0.35)
      world.doneToday[name] = true;
  };
  const fh = we ? 9 : 7.4;
  at('wait', fh - 0.25, () => {
    if (!world.manduk)
      run(cat, [
        go(S('door.wait')[0], S('door.wait')[1], 60),
        hold(0.5, 'stand', false, 1),
        bub('🐟❓', 4),
        play('wait', 40, () => !!world.manduk),
        bub('🐟❗❗', 4),
        play('wait', 400, () => !!world.manduk)
      ], 'wait');
  });
  at('feed', fh, () => startVisit('feed'));
  if (!we) {
    at('leave', 8.5, () => caption(tr('capLeave'), 3.5));
    at('ret', 18.6, () => startVisit('ret'));
  }
  at('lampOn', sunTimes(d)[1] - 0.3, () => {
    world.lampOn = true;
  });
  at('lights', 23, () => startVisit('lights'));
  if (isAnniversary(d))
    at('anniv', we ? 15 : 19.2, () => startVisit('anniv'));
}
/* ───────── 메인 루프 ───────── */
let mouseT = rnd(10, 25), ambT = 0;
function frame(tNow) {
  const real = advanceClock(tNow);
  const bf = speed === 1 ? 1 : speed === 60 ? 4 : 12;
  const dt = real * bf;
  world.t += real;
  const d = now();
  scheduled(d);
  world.dark = darkness(d);
  // 소음 게이지와 방문
  world.noise = Math.max(0, world.noise - dt * 0.02);
  const home = mandukHome(d), asleep = mandukAsleep(d);
  if (home && !world.manduk && world.visitsToday < 8 && world.t - world.lastVisit > 60) {
    if (world.noise > (asleep ? 1.25 : 0.8)) {
      world.noise = 0;
      startVisit(asleep ? 'night' : 'noise');
    }
    else if (!asleep && isWeekend(d) && Math.random() < dt / 900)
      startVisit('check');
  }
  if (!home)
    world.noise = Math.max(0, world.noise - dt * 0.05);
  // 쥐야쥐 등장
  world.mouseCool = Math.max(0, world.mouseCool - dt);
  mouseT -= dt;
  if (mouseT <= 0) {
    mouseT = rnd(25, 45);
    if (mouse.hidden && !world.manduk && world.mouseCool <= 0) {
      const h = hourOf(d);
      let p = 0.05;
      if (!home)
        p = 0.45;
      else if (asleep)
        p = 0.22;
      else if (isWeekend(d))
        p = 0.06;
      else
        p = 0.12;
      if (rainNow(d))
        p += 0.2;
      if (Math.random() < p)
        spawnMouse(d);
    }
  }
  if (!mouse.hidden) {
    mouse.outFor -= dt;
    if (!mouse.steps.length && !mouse.cur)
      mouseBrain(d);
  }
  // 같이 낮잠 → 뒤척임 → 화들짝
  if (!mouse.hidden && mouse.state === 'nap' && mouse.closed && cat.tag === 'nap' && cat.closed && Math.abs(cat.x - mouse.x) < 190) {
    mouse.napTogether = (mouse.napTogether || 0) + dt;
    if (mouse.napTogether > rnd(40, 90)) {
      mouse.napTogether = 0;
      const keep = cat.steps;
      cat.pose = 'roll';
      cat.rock = 1;
      setTimeout(() => {
        cat.rock = 0;
        cat.pose = 'loaf';
      }, 2600);
      mouse.state = 'flee';
      say(mouse, '‼️', 2);
      run(mouse, [
        hold(0.5, 'walk'),
        go(S('hole.out')[0], S('hole.out')[1], MOUSE_RUN),
        fn(a => {
          a.hidden = true;
          a.state = '';
          a.where = 'hole';
        })
      ], 'flee');
    }
  }
  // 자는 강고양이 씨 앞을 지나가는 쥐야쥐
  if (!mouse.hidden && cat.closed && cat.tag === 'nap' && mouse.state !== 'nap' && Math.abs(cat.x - mouse.x) < 120 && !cat.peeked) {
    cat.peeked = true;
    const rest = cat.steps, cur = cat.cur;
    run(cat, [
      hold(2.5, 'loaf', false),
      bub('🐭 … 🙄', 3),
      hold(1, 'loaf', true),
      hold(rnd(40, 90), 'loaf', true)
    ], 'nap');
    setTimeout(() => cat.peeked = false, 60000);
  }
  // 서로 의식하기
  if (!mouse.hidden && !mouse.peek && !world.manduk) {
    const dd = Math.hypot(cat.x - mouse.x, cat.y - mouse.y);
    if (dd < 420 && !cat.moving && !cat.act && !cat.tr && !cat.closed && !cat.inBox && !cat.onTV && !cat.tvPeek && cat.tag !== 'window')
      cat.face = mouse.x > cat.x ? 1 : -1;
    if (dd < 300 && !mouse.moving && !mouse.closed && mouse.state !== 'flee')
      mouse.face = cat.x > mouse.x ? 1 : -1;
    if (dd < 420 && !cat.duetT)
      cat.duetT = world.t;
  }
  else
    cat.duetT = 0;
  // 햇빛 따라가기
  const b = sunbeam(d);
  if (cat.tag === 'nap' && cat.closed && b && b.k > 0.4 && !inBeam(b, cat.x) && Math.abs(cat.x - b.cx) < 300 && Math.random() < dt / 20) {
    run(cat, [
      hold(0.8, 'loaf'),
      bub('☀️➡️ 😑', 3.5),
      hold(2, 'loaf'),
      go(b.cx + rnd(-30, 30), cat.y, 40),
      hold(1, 'loaf'),
      hold(rnd(60, 160), 'loaf', true)
    ], 'nap');
  }
  // 나비
  const ss = season(d), hr = hourOf(d), [sr, sset] = sunTimes(d);
  if (!world.bfly && !world.manduk && hr > sr + 1 && hr < sset - 1 && !rainNow(d) && (ss === 'spring' || ss === 'summer') && Math.random() < dt / (ss === 'summer' ? 420 : 700))
    spawnButterfly();
  updateButterfly(real * Math.min(bf, 3));
  maybeUFO(d, real);
  maybeSanta(d, real);
  maybeWitch(d, real);
  maybeBats(d, real);
  maybeGhost(d, real);
  tvTick(d);
  // 컵
  const c = world.cup;
  if (c.state === 'falling') {
    c.fall += dt * 1.6;
    c.fy = c.y + c.fall * c.fall * 90;
    c.x += dt * 40;
    if (c.fy >= 640) {
      c.fy = 640;
      c.state = 'floor';
      Snd.clink();
    }
  }
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
    const tv = home && !asleep && isWeekend(d) && hr > 10 && hr < 22 && !world.manduk;
    Snd.setAmb(rainNow(d) && !snowing(d), tv || tvOn(), world.dark > 0.5);
    if (tv && Math.random() < 0.012)
      caption(pick(tr('capAmbient')), 3);
  }
  calmDown(real); // 건드림 짜증 회복
  render(d, real);
  document.getElementById('status').textContent = statusText(d);
  if (devOpen)
    document.getElementById('hourv').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
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
  L.push([cat.inBox ? P.box.y : cat.y, () => drawActor(cat)]);
  L.push([mouse.y, () => drawActor(mouse)]);
  L.sort((a, b) => a[0] - b[0]).forEach(e => e[1]());
  if (c.state === 'falling')
    drawCup(c.x, c.fy, c.fall * 4);
  drawButterfly();
  drawManduk('legs');
  // 어둠과 램프
  const dk = world.dark;
  if (dk > 0) {
    ctx.fillStyle = `rgba(16,20,46,${world.lampOn ? dk * 0.6 : dk + (pumpkinNight() ? dk * 0.2 : 0)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(P.window.x, 0, P.window.w, P.window.h);
    ctx.clip();
    ctx.fillStyle = `rgba(16,20,46,${-dk * 0.5})`;
    ctx.restore();
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
  drawCurtainShadow(dk);
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
  if (tvBig)
    tvBig.drawImage(tvBuf, 0, 0);
}
/* ───────── 시작 ───────── */
applyDom();
bannerText();
initShelf();
initUI();
initInstall();
exposeDebug();
// 사물 목록과 그림 정보를 읽은 뒤 그림을 불러오고 시작
Promise.all([fetch('objects.json', { cache: 'no-store' }).then(r => r.json()).then(initObjects), loadMeta()])
  .catch(e => console.error('고양.시를 여는 데 필요한 파일을 읽지 못했어요', e))
  .finally(loadImages);
export function start() {
  fit();
  const d = now();
  world.dayKey = dayKey(d);
  const h = hourOf(d);
  world.lampOn = h >= sunTimes(d)[1] - 0.3 && h < 23;
  const b = sunbeam(d);
  if (b && b.k > 0.4) {
    cat.x = b.cx;
    cat.y = 684;
    run(cat, [hold(rnd(30, 90), 'loaf', true)], 'nap');
    cat.closed = true;
  }
  else {
    cat.x = 560;
    cat.y = 690;
    run(cat, [hold(rnd(15, 30), 'loaf')], 'loaf');
  }
  cat.dp = cat.pose = 'loaf';
  requestAnimationFrame(t => {
    resetClock(t);
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
