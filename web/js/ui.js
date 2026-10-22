/* 입력과 버튼: 누르기, 쪽지·노트북 창, 책 창(설명책·고양이책·설정책: 소리·켜 두기·전체 화면), 미리보기 도구 */
import { assetsWarm, imageReady, img } from './assets.js';
import { LANG, setLang, tObj, tr } from './i18n.js';
import { knockB, petCat, secretB } from './cat.js';
import { startVisit, todaysNote } from './manduk.js';
import { mouseHide, spawnMouse } from './mouse.js';
import { O, OBJ, objView, present, zOf } from './objects.js';
import { eventsDev } from './events.js';
import { bookAt, closeShelf, onShelf, openShelf, shelfUI } from './shelf.js';
import { Snd } from './sound.js';
import { DEPTH, H, W, cam, cv, fit, view } from './stage.js';
import { boxToday, holidayOverride, mandukAsleep, mandukHome, now, rainNow, resetSim, seasonOverride, setOverride, setSimMs, setSpeed } from './time.js';
import { timeJumped } from './jump.js';
import { closeTvGuide, openTvGuide } from './tv-guide.js';
import { initTvDev } from './tv-dev.js';
import { bannerText } from './birthday.js';
import { $, esc, store } from './util.js';
import { flipFrame } from './frame.js';
import { toggleLaser } from './laser.js';
import { tapBowl } from './fish.js';
import { playsDev, playsDrag, playsPress } from './plays.js';
import { actorLift } from './steps.js';
import { STANDALONE, closeOdd, oddAt, openOdd, toggleOdd } from './install.js';
import { pawsHTML } from './catbook.js';
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
  y += actorLift(a); // TV 위, 쳇바퀴 안… (steps.js SPOTS)
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
  laser: () => assetsWarm() && toggleLaser(), // 누르기 판정은 위 penAt (코드 그림). 놀이 그림(나중 묶음)을 다 받기 전에는 시작하지 않는다 (LOAD_PLAN.md 4-1)
  fishbowl: () => tapBowl(), // 누르기 판정은 위 fishAt (코드 그림)
  screen: () => {
    scrEl.textContent = world.laptop ? world.laptop.split('\n').slice(-8).join('\n') : tr('blankScreen');
    scrEl.hidden = false;
    scrEl.focus();
  },
};
export let devOpen = false, wake = null;
/* 화면 꺼짐 방지 (MOBILE_PLAN.md 5장)
   켜는 경우: 「켜 두기」를 켰을 때(기기·충전 상태와 상관없이), 전체 화면일 때.
   소리는 이제 기본으로 켜져 있어서(14장) 소리만으로는 켜 두지 않는다. 안 그러면 모든 방문자의 화면이 안 꺼진다 */
let keepAwake = store.get('awake', false);
const wantAwake = () => keepAwake || !!document.fullscreenElement;
/* 소리 (MOBILE_PLAN.md 14장): 기본 켜짐. 브라우저는 누르기 전엔 소리를 막으므로 첫 터치 때 조용히 연다.
   설정 책에서 끄면 기억한다 (기록이 안 되는 브라우저에서는 그 페이지에서만) */
let soundWant = store.get('sound', true);
// 설정 책에 보이는 소리 상태: 소리를 한 번이라도 열었으면 실제 상태(생일 파티가 켰을 수도), 아니면 고른 값
const soundShown = () => Snd.ac ? Snd.on : soundWant;
function setSound(on) {
  soundWant = on;
  store.set('sound', on);
  if (on !== Snd.on)
    Snd.toggle();
  if (Snd.on)
    Snd.bell();
}
function soundUnlock() {
  const UNLOCK = ['pointerdown', 'touchend', 'click', 'keydown'];
  const go = () => {
    if (!soundWant) // 껐으면 열지 않는다. 다시 켜는 건 설정 책에서 (그것도 누르기라 바로 열린다)
      return;
    if (!Snd.on)
      Snd.toggle();
    else if (Snd.ac && Snd.ac.state !== 'running')
      Snd.ac.resume();
    if (Snd.ac && Snd.ac.state === 'running')
      UNLOCK.forEach(t => document.removeEventListener(t, go, true));
  };
  UNLOCK.forEach(t => document.addEventListener(t, go, true));
}
const canAwake = () => !!navigator.wakeLock;
const canFull = () => !STANDALONE && !!document.documentElement.requestFullscreen; // 홈 화면 앱(이미 주소창 없음)·아이폰 사파리(전체 화면 없음)는 숨김
/* 책 창: 설명책·고양이책·설정책은 이상한 책(「이 방을 데려가는 법」)과 같은 오래된 책 페이지 창으로 열린다
   (BOOKSHELF_PLAN.md 3장, MOBILE_PLAN.md 14장). 어떤 책인지는 objects.json 책의 about / cat / settings */
const bookEl = document.getElementById('bookp');
function settingsHTML() {
  const row = (k, label, on, tip) => `<button class="set" type="button" data-set="${k}" aria-pressed="${on}"><span class="sl">${esc(label)}</span><span class="sv">${esc(tr(on ? 'setOn' : 'setOff'))}</span></button>` +
    (tip ? `<small class="stip">${esc(tip)}</small>` : '');
  return '<div class="sets">' + row('sound', tr('setSound'), soundShown()) +
    (canAwake() ? row('awake', tr('bAwake'), keepAwake, tr('bAwakeTip')) : '') +
    (canFull() ? row('full', tr('bFull'), !!document.fullscreenElement) : '') + '</div>';
}
const bookById = id => ((O.bookshelf && O.bookshelf.books) || []).find(b => b.id === id);
export const isPageBook = b => !!b && !!(b.about || b.cat || b.settings);
function bookBody(b) {
  if (b.settings)
    return `<p class="intro">${esc(tObj(b, 'desc') || '')}</p>` + settingsHTML();
  if (b.about) // 설명책: 문단마다 줄바꿈 그대로 (i18n.js aboutBook)
    return '<div class="about">' + tr('aboutBook').map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('') + '</div>';
  return pawsHTML(b.id); // 고양이책: 발자국만
}
function renderBook() {
  const b = bookById(shelfUI.book);
  if (!b)
    return;
  bookEl.className = 'oddp bookp' + (b.cat ? ' cat' : b.about ? ' about' : ' settings');
  bookEl.setAttribute('aria-label', tObj(b, 'title') || '');
  bookEl.innerHTML = `<button class="x" type="button" aria-label="${esc(tr('bookClose'))}">×</button>` +
    `<h2>${esc(tObj(b, 'title') || '')}</h2>` + bookBody(b) +
    `<button class="back" type="button">${esc(tr('setBack'))}</button>`;
}
export function openBook(id) {
  const b = bookById(id);
  if (!isPageBook(b))
    return;
  noteEl.hidden = true;
  scrEl.hidden = true;
  closeTvGuide();
  closeOdd();
  shelfUI.book = b.id;
  shelfUI.pull = b.id; // 방 책장의 그 책이 살짝 빠져나온다
  renderBook();
  bookEl.hidden = false;
  bookEl.scrollTop = 0;
  const f = bookEl.querySelector('.set');
  (f || bookEl).focus({ preventScroll: true });
}
export function closeBook() {
  if (!shelfUI.book)
    return;
  shelfUI.book = null;
  shelfUI.pull = null;
  bookEl.hidden = true;
}
// 설정이 바뀌거나 언어가 바뀌면 펼친 쪽을 다시 채운다 (누른 줄에 초점 유지)
function refreshBook() {
  if (!shelfUI.book)
    return;
  const k = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.set;
  renderBook();
  const f = k && bookEl.querySelector(`.set[data-set="${k}"]`);
  f && f.focus({ preventScroll: true });
}
async function settingsClick(k) {
  if (k === 'sound')
    setSound(!soundShown());
  else if (k === 'awake') {
    keepAwake = !keepAwake;
    store.set('awake', keepAwake);
    wakeLock();
  }
  else if (k === 'full') {
    try {
      if (document.fullscreenElement)
        await document.exitFullscreen();
      else
        await document.documentElement.requestFullscreen();
    }
    catch (e) { }
  }
  refreshBook();
}
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
const SEASONS = [null, 'spring', 'summer', 'autumn', 'winter'];
// 입력과 버튼 연결
export function initUI() {
  // 언어: KO / EN 버튼. 바꾸면 열려 있는 창도 다시 채운다
  $('bLang').onclick = () => setLang(LANG === 'ko' ? 'en' : 'ko');
  window.addEventListener('langchange', () => {
    $('bShelf').title = tr('bShelf');
    refreshBook();
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
    closeBook();
    closeTvGuide();
    closeOdd();
    // 놀이(plays.js)가 먼저 본다: 레이저 놀이 중이면 점만 움직이고, 실뭉치는 고양이 앞발 밑에 있을 때가 많아 고양이보다 먼저
    if (playsPress(x, y, 'first') || playsPress(x, y, 'before'))
      return;
    if (hitActor(mouse, x, y)) {
      say(mouse, '‼️', 1.5);
      mouseHide(true);
      return;
    }
    if (hitActor(cat, x, y)) {
      petCat();
      return;
    }
    if (playsPress(x, y, 'after')) // 어항처럼 코드로 그리는 놀이 물건 (아래 일반 판정 대신)
      return;
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
  // 누른 채 움직이기 (레이저 점)
  cv.addEventListener('pointermove', e => playsDrag(...toStage(e), e));
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
  // 켜 두기·전체 화면·소리 버튼은 설정 책 안으로 옮겼다 (MOBILE_PLAN.md 14장, settingsHTML)
  if (canAwake() && keepAwake)
    wakeLock();
  document.addEventListener('fullscreenchange', () => {
    wakeLock();
    refreshBook();
  });
  bookEl.addEventListener('click', e => {
    const st = e.target.closest('.set');
    if (st)
      settingsClick(st.dataset.set);
    else if (e.target.closest('.x'))
      closeBook();
    else if (e.target.closest('.back')) {
      closeBook();
      openShelf(null);
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && shelfUI.book)
      closeBook();
  });
  soundUnlock();
  $('bShelf').title = tr('bShelf');
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
  // 풍경 날짜 (WINDOW_PLAN_3.md 4-5): 풍경과 해 시각만 그 날짜로 (남반구도 한국 달력처럼 읽음). 계절 버튼보다 먼저
  $('scenery').oninput = e => setOverride('scenery', +e.target.value / 365);
  $('sceneryReal').onclick = () => setOverride('scenery', null);
  $('dSeason').onclick = () => {
    setOverride('season', SEASONS[(SEASONS.indexOf(seasonOverride) + 1) % SEASONS.length]);
    caption(seasonOverride ? tr('devSeason', { season: tr('season')[seasonOverride] }) : tr('devRealSeason'), 2.5);
  };
  $('dXmas').onclick = () => {
    setOverride('holiday', holidayOverride === 'christmas' ? null : 'christmas');
    caption(holidayOverride ? tr('devXmas') : tr('devRealDate'), 2.5);
  };
  $('dOdd').onclick = () => caption(toggleOdd() ? '📕✨' : '📕…', 2);
  // 할로윈: 휴일 강제와 마녀·박쥐·유령 바로 부르기
  $('dHw').onclick = () => {
    setOverride('holiday', holidayOverride === 'halloween' ? null : 'halloween');
    caption(holidayOverride ? tr('devHw') : tr('devRealDate'), 2.5);
  };
  eventsDev($); // 나비·UFO·산타·마녀·박쥐·유령 버튼 (events.js)
  initTvDev(jumpTo); // TV 칸: 틀어 보기, 사건 고르기(예전 "TV 사건" 버튼 포함), 7일 편성표, 특집 날짜 (tv-dev.js)
  playsDev($); // 놀이 버튼: 레이저·쳇바퀴·실뭉치·낚시 (plays.js)
  $('dKnock').onclick = () => {
    if (world.manduk)
      return;
    world.cup.state = 'table';
    knockB();
  };
}
