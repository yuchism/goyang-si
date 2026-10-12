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
import { boxToday, dayKey, holidayOverride, hourOf, mandukAsleep, mandukHome, now, rainNow, seasonOverride, setOverride, setSimMs, setSpeed, simMs, sunTimes } from './time.js';
import { TVP } from './tv.js';
import { closeTvGuide, openTvGuide } from './tv-cat.js';
import { bannerText } from './birthday.js';
import { $, esc, pick, store } from './util.js';
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
  screen: () => {
    scrEl.textContent = world.laptop ? world.laptop.split('\n').slice(-8).join('\n') : tr('blankScreen');
    scrEl.hidden = false;
    scrEl.focus();
  },
};
export let devOpen = false, wake = null;
/* 화면 꺼짐 방지 (MOBILE_PLAN.md 5장)
   켜는 경우: 「켜 두기」를 켰을 때(충전 상태를 알 수 있는 브라우저에서는 충전 중일 때만), 소리를 켰을 때, 전체 화면일 때 */
let keepAwake = store.get('awake', false), battery = null;
const wantAwake = () => (keepAwake && (!battery || battery.charging)) || Snd.on || !!document.fullscreenElement;
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
  b.title = tr(battery ? 'bAwakeCharge' : 'bAwakeTip');
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
    if (hitActor(mouse, x, y)) {
      say(mouse, '‼️', 1.5);
      mouseHide(true);
      return;
    }
    if (hitActor(cat, x, y)) {
      petCat();
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
    for (const o of OBJ) {
      if (!o.touch || !present(o))
        continue;
      const v = objView(o), im = img(v.look);
      if (!v.pos || !imageReady(im))
        continue;
      const w = v.pos.w, h = w * im.height / im.width, by = v.pos.y - zOf(o);
      if (x > v.pos.x - w / 2 - 6 && x < v.pos.x + w / 2 + 6 && y > by - h - 6 && y < by + 6) {
        TOUCH[o.touch]();
        return;
      }
    }
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
    // 안드로이드 등 충전 상태를 알 수 있으면: 충전 중이면 켜고, 충전이 끝나면 풀어 준다
    if (navigator.getBattery)
      navigator.getBattery().then(b => {
        battery = b;
        awakeLabel();
        b.addEventListener('chargingchange', wakeLock);
        wakeLock();
      }).catch(() => { });
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
  if (store.get('dev', false)) {
    devOpen = true;
    $('dev').hidden = false;
    $('bDev').setAttribute('aria-pressed', 'true');
  }
  [['sp1', 1], ['sp60', 60], ['sp1440', 1440]].forEach(([id, v]) => $(id).onclick = () => {
    setSpeed(v);
    ['sp1', 'sp60', 'sp1440'].forEach(i => $(i).setAttribute('aria-pressed', i === id));
  });
  $('hour').oninput = e => {
    const d = now();
    const target = new Date(d);
    const hv = +e.target.value;
    target.setHours(Math.floor(hv), Math.round((hv % 1) * 60), 0, 0);
    setSimMs(target.getTime());
    // 건너뛴 일정은 실행하지 않음
    const h = hourOf(now());
    world.doneToday = {};
    world.dayKey = dayKey(now());
    world.lampOn = h >= sunTimes(now())[1] - 0.3 && h < 23;
    world.tv.st = null;
    world.tv.force = null;
    if (!world.manduk) {
      cat.steps = [];
      cat.cur = null;
    }
  };
  $('dayNext').onclick = () => {
    setSimMs(simMs + 86400000);
    world.dayKey = '';
    world.tv.st = null;
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
  $('dTv').onclick = () => {
    const st = world.tv.st;
    if (!st || st.mode !== 'prog') {
      caption(tr('devNoProg'), 3);
      return;
    }
    const P = TVP[st.p], big = P.ev.filter(e => e.size >= 2);
    world.tv.force = { p: st.p, e: pick(big.length ? big : P.ev), t0: world.t };
  };
  $('dKnock').onclick = () => {
    if (world.manduk)
      return;
    world.cup.state = 'table';
    knockB();
  };
}
