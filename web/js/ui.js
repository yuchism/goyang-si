/* 입력과 버튼: 누르기, 쪽지·노트북 창, 소리·전체 화면, 미리보기 도구 */
import { imageReady, img } from './assets.js';
import { startBats, startGhost, startWitch } from './halloween.js';
import { LANG, setLang, tr } from './i18n.js';
import { knockB, petCat, secretB } from './cat.js';
import { startVisit, todaysNote } from './manduk.js';
import { mouseHide, spawnMouse } from './mouse.js';
import { OBJ, objView, present, topOf, zOf } from './objects.js';
import { spawnButterfly, startSanta, startUFO } from './outside.js';
import { bookAt, closeShelf, onShelf, openShelf } from './shelf.js';
import { Snd } from './sound.js';
import { DEPTH, H, W, cam, cv, fit, view } from './stage.js';
import { boxToday, holidayOverride, mandukAsleep, mandukHome, now, rainNow, resetSim, seasonOverride, setOverride, setSimMs, setSpeed } from './time.js';
import { timeJumped } from './jump.js';
import { closeTvGuide, openTvGuide } from './tv-guide.js';
import { initTvDev } from './tv-dev.js';
import { bannerText } from './birthday.js';
import { $, esc, store } from './util.js';
import { flipFrame } from './frame.js';
import { endLaser, laserOn, moveDot, penAt, startLaser, toggleLaser } from './laser.js';
import { fishAt, fishB, tapBowl } from './fish.js';
import { STANDALONE, closeOdd, oddAt, openOdd, toggleOdd } from './install.js';
import { caption, cat, mouse, say, world } from './world.js';
/* ───────── 입력 ───────── */
export function toStage(e) {
  const r = cv.getBoundingClientRect();
  return [cam.x + (e.clientX - r.left) / r.width * (view.vw || W), (e.clientY - r.top) / r.height * H];
}
function hitActor(a, x, y) {
  if (a.kind === 'mouse' && (a.hidden || a.peek))
    return false;
  const dp = DEPTH(a.y);
  if (a.onTV)
    y += topOf('tv');
  const w = (a.kind === 'cat' ? 115 : 66) * dp, h = (a.kind === 'cat' ? 165 : 50) * dp;
  return x > a.x - w && x < a.x + w && y > a.y - h && y < a.y + 8;
}
export const noteEl = document.getElementById('note'), scrEl = document.getElementById('screen');
// 보는 사람이 물건을 눌렀을 때 (objects.json의 touch)
const TOUCH = {
  note: () => {
    noteEl.innerHTML = esc(todaysNote(now())).replace(/\n/g, '<br>') + `<small>${esc(tr('noteSign'))}</small>`;
    noteEl.hidden = false;
    noteEl.focus();
  },
  tv: () => openTvGuide(),
  frame: () => flipFrame(),
  laser: () => toggleLaser(), // 누르기 판정은 위 penAt (코드 그림)
  fishbowl: () => tapBowl(), // 누르기 판정은 위 fishAt (코드 그림)
  screen: () => {
    scrEl.textContent = world.laptop ? world.laptop.split('\n').slice(-8).join('\n') : tr('blankScreen');
    scrEl.hidden = false;
    scrEl.focus();
  },
};
export let devOpen = false, wake = null;
/* 화면 꺼짐 방지 (MOBILE_PLAN.md 5장)
   켜는 경우: 「켜 두기」를 켰을 때(기기·충전 상태와 상관없이), 소리를 켰을 때, 전체 화면일 때 */
let keepAwake = store.get('awake', false);
const wantAwake = () => keepAwake || Snd.on || !!document.fullscreenElement;
let asking = false;
async function wakeLock() {
  if (!navigator.wakeLock || document.visibilityState !== 'visible')
    return;
  if (!wantAwake()) {
    if (wake) {
      const w = wake;
      wake = null;
      try {
        await w.release();
      }
      catch (e) { }
    }
    return;
  }
  if (wake || asking)
    return;
  asking = true;
  try {
    const w = await navigator.wakeLock.request('screen');
    wake = w;
    w.addEventListener('release', () => {
      if (wake === w)
        wake = null;
    });
  }
  catch (e) { }
  asking = false;
}
function awakeLabel() {
  const b = $('bAwake');
  b.setAttribute('aria-pressed', keepAwake);
  b.title = tr('bAwakeTip');
}
const SEASONS = [null, 'spring', 'summer', 'autumn', 'winter'];
// 입력과 버튼 연결
export function initUI() {
  // 언어: KO / EN 버튼. 바꾸면 열려 있는 창도 다시 채운다
  $('bLang').onclick = () => setLang(LANG === 'ko' ? 'en' : 'ko');
  window.addEventListener('langchange', () => {
    $('bSound').textContent = tr(Snd.on ? 'soundOff' : 'soundOn');
    if (navigator.wakeLock)
      awakeLabel();
    if (!noteEl.hidden)
      TOUCH.note();
    if (!scrEl.hidden)
      TOUCH.screen();
    if (!$('tvg').hidden)
      openTvGuide(true);
    bannerText();
  });
  cv.addEventListener('pointerdown', e => {
    const [x, y] = toStage(e);
    world.lastTouch = performance.now();
    noteEl.hidden = true;
    scrEl.hidden = true;
    closeShelf();
    closeTvGuide();
    closeOdd();
    // 레이저 놀이 중에는 방을 눌러도 점만 움직인다. 포인터를 다시 누르면 끝
    if (laserOn()) {
      if (penAt(x, y))
        endLaser();
      else
        moveDot(x, y);
      return;
    }
    if (penAt(x, y)) {
      startLaser();
      return;
    }
    if (hitActor(mouse, x, y)) {
      say(mouse, '‼️', 1.5);
      mouseHide(true);
      return;
    }
    if (hitActor(cat, x, y)) {
      petCat();
      return;
    }
    if (fishAt(x, y)) { // 어항: 금붕어가 유리 쪽으로 와서 뻐끔 (코드 그림이라 아래 일반 판정 대신)
      tapBowl();
      return;
    }
    if (oddAt(x, y)) {
      openOdd();
      return;
    }
    if (onShelf(x, y)) {
      const b = bookAt(x, y);
      openShelf(b && b.id);
      return;
    }
    // 누르는 범위는 그림보다 사방 6(hitPad로 바꿈). 범위가 겹치면 그림에 더 가까운 물건 (같으면 목록 앞쪽)
    let hit = null, hitD = Infinity;
    for (const o of OBJ) {
      if (!o.touch || !present(o))
        continue;
      const v = objView(o);
      let im = img(v.look);
      if (!imageReady(im) && v.photos)
        im = img(v.photos[0]);
      if (!v.pos || !imageReady(im))
        continue;
      const w = v.pos.w, h = w * im.height / im.width, by = v.pos.y - zOf(o), pad = v.hitPad != null ? v.hitPad : 6;
      const x0 = v.pos.x - w / 2, x1 = v.pos.x + w / 2, y0 = by - h;
      if (x > x0 - pad && x < x1 + pad && y > y0 - pad && y < by + pad) {
        const dd = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - by));
        if (dd < hitD) {
          hitD = dd;
          hit = o;
        }
      }
    }
    if (hit) {
      TOUCH[hit.touch]();
      return;
    }
  });
  // 레이저 점: 컴퓨터는 마우스를 따라가고, 폰은 누른 채 끄는 곳으로
  cv.addEventListener('pointermove', e => {
    if (laserOn() && (e.pointerType === 'mouse' || e.buttons))
      moveDot(...toStage(e));
  });
  noteEl.addEventListener('click', () => noteEl.hidden = true);
  scrEl.addEventListener('click', () => scrEl.hidden = true);
  document.getElementById('aCat').onclick = () => petCat();
  document.getElementById('aMouse').onclick = () => {
    if (!mouse.hidden && !mouse.peek) {
      say(mouse, '‼️', 1.5);
      mouseHide(true);
    }
  };
  document.getElementById('aNote').onclick = TOUCH.note;
  document.getElementById('aScreen').onclick = TOUCH.screen;
  document.getElementById('aTv').onclick = TOUCH.tv;
  document.getElementById('aFrame').onclick = TOUCH.frame;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible')
      wakeLock(); // 다른 앱에 다녀오면 풀려 있으니 다시 요청 (켜 둘 이유가 있을 때만)
  });
  // 켜 두기 버튼: 화면 꺼짐 방지를 못 하는 브라우저에서는 숨긴다
  if (!navigator.wakeLock)
    $('bAwake').hidden = true;
  else {
    awakeLabel();
    $('bAwake').onclick = () => {
      keepAwake = !keepAwake;
      store.set('awake', keepAwake);
      awakeLabel();
      wakeLock();
    };
    if (keepAwake)
      wakeLock();
  }
  document.addEventListener('fullscreenchange', () => wakeLock());
  // 전체 화면 버튼: 홈 화면 앱(이미 주소창 없음)이거나 전체 화면을 못 하는 브라우저(아이폰 사파리)면 숨김
  if (STANDALONE || !document.documentElement.requestFullscreen)
    $('bFull').hidden = true;
  $('bSound').onclick = () => {
    const on = Snd.toggle();
    $('bSound').setAttribute('aria-pressed', on);
    $('bSound').textContent = tr(on ? 'soundOff' : 'soundOn');
    wakeLock();
    if (on)
      Snd.bell();
  };
  $('bFull').onclick = async () => {
    try {
      if (document.fullscreenElement)
        await document.exitFullscreen();
      else {
        await document.documentElement.requestFullscreen();
        wakeLock();
      }
    }
    catch (e) { }
  };
  $('bDev').onclick = () => {
    devOpen = !devOpen;
    $('dev').hidden = !devOpen;
    $('bDev').setAttribute('aria-pressed', devOpen);
    store.set('dev', devOpen);
    requestAnimationFrame(fit);
  };
  // 미리보기 도구는 방문자에게 숨긴다. ?dev=1로 열면 켜지고 그 기기에서 기억, ?dev=0으로 끈다 (MOBILE_PLAN.md 13장)
  // 기록이 안 되는 브라우저에서는 ?dev=1로 연 그 페이지에서만 켜진다
  let devAllowed = store.get('devTools', false);
  const devQ = new URLSearchParams(location.search).get('dev');
  if (devQ === '1') {
    devAllowed = true;
    store.set('devTools', true);
  }
  else if (devQ === '0') {
    devAllowed = false;
    store.set('devTools', false);
    store.set('dev', false);
  }
  $('bDev').hidden = !devAllowed;
  if (devAllowed && store.get('dev', false)) {
    devOpen = true;
    $('dev').hidden = false;
    $('bDev').setAttribute('aria-pressed', 'true');
  }
  const speedBtns = v => [['sp1', 1], ['sp60', 60], ['sp1440', 1440]].forEach(([i, x]) => $(i).setAttribute('aria-pressed', x === v));
  [['sp1', 1], ['sp60', 60], ['sp1440', 1440]].forEach(([id, v]) => $(id).onclick = () => {
    setSpeed(v);
    speedBtns(v);
  });
  // 시각 옮기기는 모두 시간 점프로 처리한다 (jump.js, CLOCK_PLAN.md 8장). fx: 어두워졌다 밝아지는 연출
  const jumpTo = (ms, fx = false) => {
    const prev = now();
    setSimMs(ms);
    timeJumped(prev, now(), fx);
  };
  $('hour').oninput = e => {
    const target = now(), hv = +e.target.value;
    target.setHours(Math.floor(hv), Math.round((hv % 1) * 60), 0, 0);
    jumpTo(target.getTime()); // 슬라이더는 연달아 옮기니 연출 없이
  };
  $('dayNext').onclick = () => jumpTo(now().getTime() + 86400000);
  $('devJump').onclick = () => jumpTo(now().getTime() + 3600000, true); // 화면을 끄고 1시간 뒤 켠 것처럼
  $('devNow').onclick = () => { // 실제 시각, 실시간으로
    const prev = now();
    resetSim();
    speedBtns(1);
    timeJumped(prev, now(), false);
  };
  $('dMouse').onclick = () => {
    world.mouseCool = 0;
    mouse.where = 'hole';
    spawnMouse(now(), true);
  };
  $('dBfly').onclick = () => spawnButterfly();
  $('dMan').onclick = () => {
    if (!mandukHome(now())) {
      caption(tr('devAtWork'), 3);
      return;
    }
    startVisit(world.cup.state === 'floor' ? 'noise' : mandukAsleep(now()) ? 'night' : 'check');
  };
  $('dRain').onclick = () => {
    setOverride('rain', !rainNow(now()));
  };
  $('dBox').onclick = () => {
    setOverride('box', !boxToday(now()));
  };
  $('dSecret').onclick = () => {
    if (world.manduk)
      return;
    secretB();
  };
  $('dSeason').onclick = () => {
    setOverride('season', SEASONS[(SEASONS.indexOf(seasonOverride) + 1) % SEASONS.length]);
    caption(seasonOverride ? tr('devSeason', { season: tr('season')[seasonOverride] }) : tr('devRealSeason'), 2.5);
  };
  $('dXmas').onclick = () => {
    setOverride('holiday', holidayOverride === 'christmas' ? null : 'christmas');
    caption(holidayOverride ? tr('devXmas') : tr('devRealDate'), 2.5);
  };
  $('dSanta').onclick = () => startSanta();
  $('dOdd').onclick = () => caption(toggleOdd() ? '📕✨' : '📕…', 2);
  // 할로윈: 휴일 강제와 마녀·박쥐·유령 바로 부르기
  $('dHw').onclick = () => {
    setOverride('holiday', holidayOverride === 'halloween' ? null : 'halloween');
    caption(holidayOverride ? tr('devHw') : tr('devRealDate'), 2.5);
  };
  $('dWitch').onclick = () => startWitch(Math.random() < 0.5);
  $('dBat').onclick = () => startBats();
  $('dGhost').onclick = () => startGhost();
  $('dUfo').onclick = () => {
    if (world.manduk) {
      caption(tr('devNoUfo'), 3);
      return;
    }
    startUFO();
  };
  initTvDev(jumpTo); // TV 칸: 틀어 보기, 사건 고르기(예전 "TV 사건" 버튼 포함), 7일 편성표, 특집 날짜 (tv-dev.js)
  $('dLaser').onclick = () => toggleLaser();
  $('dFish').onclick = () => {
    if (!world.manduk)
      fishB();
  };
  $('dKnock').onclick = () => {
    if (world.manduk)
      return;
    world.cup.state = 'table';
    knockB();
  };
}
