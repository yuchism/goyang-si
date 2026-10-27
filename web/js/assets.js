/* 그림: 캐릭터 프레임(f/)과 방 소품(r/), TV(r/tv/)를 읽는다.
   크기와 기준점은 각 폴더의 meta.json 한 곳에만 적는다 (tools/build_meta.py가 새 그림을 찾아 채운다).
   f/meta.json   : 캐릭터 프레임. [폭, 높이, 발 기준점 x, y]. 모두 왼쪽을 보는 그림
   r/meta.json   : 방 배경과 소품. [폭, 높이]
   r/tv/meta.json: TV 본체(화면 구멍 위치)와 기본 화면 그림. 프로그램 그림은 r/tv/programs.json에서, 필요할 때 받는다(loadLazy, tv.js)
   처음 열 때 (LOAD_PLAN.md): 그림을 두 묶음으로 나눈다. 시작 묶음(방이 열린 순간 보일 수 있는 것)만 기다렸다가 방을 열고,
   나머지(나중 묶음)는 열자마자 이어서 전부 받는다(오프라인에서도 다 있게). 다 받으면 assetsWarm()이 true.
   그 전에는 나중 묶음 그림을 쓰는 행동·사건·놀이를 고르지 않는다(cat.js catBrain, events.js canStart, gate.js gateOk 등) */
import { start } from './main.js';
import { birthdayMode } from './birthday.js';
import { GUESTS, guestLoads, guestSrc } from './guests.js';

export const FRAMES = {};
export const ROOM = {};
export const TV_META = {};
export const SRC = {};
export const IMG = {};
export const FSC = 0.42, MSC = 0.417; // 프레임 픽셀 → 방 크기
// meta.json 밖의 큰 시트 (생일 춤, 케이크). 픽셀 크기는 원본 PNG 그대로 (춤 시트는 birthday.js DANCE_CELLS 좌표를 쓴다)
// sheet/는 build_meta.py가 보지 않는 폴더 (f/·r/에 두면 "meta.json에 없는 그림"으로 걸린다). LOAD_PLAN.md 5장
const EXTRA_SRC = {
  f_birthday_dance: 'sheet/cat-birthday-dance-sheet-v1.webp',
  r_birthday_cake: 'sheet/birthday-cake-v1.webp',
};
export function img(k) {
  return IMG['r_' + k];
}
export function imageReady(im) {
  return !!(im && im.complete && im.naturalWidth > 0 && im.naturalHeight > 0);
}
// no-cache: 서버에 확인은 하되 바뀌지 않았으면 다시 받지 않는다 (배포 직후 예전 meta가 섞이지 않는 것은 no-store와 같다)
const getJSON = url => fetch(url, { cache: 'no-cache' }).then(r => {
  if (!r.ok)
    throw new Error(url + ' ' + r.status);
  return r.json();
});
// meta.json 세 개를 읽고 불러올 그림 목록(SRC)을 만든다
export async function loadMeta() {
  const [f, r, tv] = await Promise.all([getJSON('f/meta.json'), getJSON('r/meta.json'), getJSON('r/tv/meta.json')]);
  Object.assign(FRAMES, f);
  Object.assign(ROOM, r);
  Object.assign(TV_META, tv);
  Object.keys(FRAMES).forEach(k => SRC['f_' + k] = 'f/' + k + '.webp');
  Object.keys(ROOM).forEach(k => SRC['r_' + k] = 'r/' + k + '.webp');
  const tvFiles = [tv.body.file, ...Object.values(tv.baseScreens).flat()]; // 시작 묶음의 TV 그림은 본체와 기본 화면만
  tvFiles.forEach(file => SRC['r_tv/' + file.replace(/\.webp$/, '')] = 'r/tv/' + file);
  Object.assign(SRC, EXTRA_SRC);
  if (birthdayMode) // 생일 깜짝 손님 춤 시트: 생일 링크로 들어왔을 때만 받는다(나중 묶음). 생일이 아닌 방문엔 안 받는다 (BIRTHDAY_GUESTS_PLAN.md 5장)
    GUESTS.filter(guestLoads).forEach(g => SRC['f_guest_' + g.id] = guestSrc(g.id)); // 할로윈 손님은 페이지를 열 때 할로윈 기간일 때만 (HOURLY_CHIME_PLAN.md 6-1)
}
try {
  document.fonts && document.fonts.load('700 30px Gaegu');
}
catch (e) { }

/* ───────── 두 묶음 (LOAD_PLAN.md 3장) ─────────
   여기 한 곳에만 적는다. 이름 앞부분 규칙 + 예외. 새 그림은 따로 적지 않으면 시작 묶음(방 소품)이나 나중 묶음(고양이 프레임)에 들어간다
   - 고양이: 기본 동작과 건드렸을 때의 반응, 다 받기 전에도 고르는 행동(낮잠·식빵·그루밍·돌아다니기·구르기·창밖·쥐야쥐와 놀기)에 나오는 것
   - 쥐야쥐: 생일 박수 말고 전부
   - 방: 아래 LATER_ROOM이 아닌 것 전부 (TV 본체·기본 화면 포함)
   - 생일 그림(춤 시트·케이크·cat_bday_*·mouse_bday_*): 생일 링크로 들어왔을 때만 시작 묶음 (파티를 누르면 바로 나와야 하므로)
   - 생일 깜짝 손님 시트(f_guest_*): 생일 링크로 들어왔을 때만 받고, 나중 묶음 */
const START_CAT = /^(loaf|sleep|sit|roll|belly|bsleep|groom|window|startle|sulk|run|lookup)_\d$|^(stand|stretch|yawn)$|^walk_(contact|pass_after)_/;
// 방 그림 중 나중 묶음: 하늘·이벤트(선풍기·창밖 새 빼고), 액자 사진, 아파트 창 마스크, 어항 물고기의 다른 자세·붕어빵·낚싯대, 실뭉치, 쳇바퀴
const LATER_ROOM = /^fx\/(?!fan_|bird_)|^frame_family_|_mask$|^fish_(?!swim_)|^(boong|rod|yarn|yarn_2|wheel_back|wheel_front)$/;
const BDAY = /^f_(cat|mouse)_bday_|^f_birthday_dance$|^r_birthday_cake$/;
export function inStartSet(k) {
  if (k.startsWith('f_guest_')) // 손님은 춤이 시작된 뒤에야 나오므로 나중 묶음으로 (그때까지 못 받은 손님은 그 파티에 안 나온다)
    return false;
  if (BDAY.test(k))
    return birthdayMode;
  if (k.startsWith('f_cat_'))
    return START_CAT.test(k.slice(6));
  if (k.startsWith('f_mouse_'))
    return true;
  if (k.startsWith('r_tv/'))
    return true;
  if (k.startsWith('r_'))
    return !LATER_ROOM.test(k.slice(2));
  return true;
}

/* ───────── 받기 ───────── */
let warm = false, laterLeft = 0;
const warmFns = [];
export const assetsWarm = () => warm; // 나중 묶음까지 다 받았나 (실패한 것도 "끝남")
// 다 받으면 한 번 부른다 (이미 다 받았으면 바로)
export function onWarm(fn) {
  if (warm)
    fn();
  else
    warmFns.push(fn);
}
function warmed() {
  warm = true;
  warmFns.splice(0).forEach(fn => {
    try {
      fn();
    }
    catch (e) {
      console.error(e);
    }
  });
}
function load(k, done, low) {
  const im = new Image();
  if (low)
    im.fetchPriority = 'low'; // 첫 장면에서 요청되는 산(scenery.js)·TV 그림(loadLazy)이 먼저 오게
  im.onload = done;
  im.onerror = done;
  im.src = SRC[k];
  IMG[k] = im;
}
// 시작 묶음을 모두 읽으면(실패한 것도 포함) 시작하고, 이어서 나중 묶음을 받는다
export function loadImages() {
  const names = Object.keys(SRC), first = names.filter(inStartSet), later = names.filter(k => !inStartSet(k));
  laterLeft = later.length; // 처음부터 lazyPending()에 센다 (점검 도구가 다 받을 때까지 기다리게)
  const loadLater = () => {
    if (!later.length) {
      warmed();
      return;
    }
    later.forEach(k => load(k, () => {
      if (--laterLeft === 0)
        warmed();
    }, true));
  };
  if (!first.length) { // 받을 그림이 하나도 없어도 끝나게 (STABILITY_PLAN.md 6장)
    start();
    loadLater();
    return;
  }
  let loaded = 0;
  first.forEach(k => load(k, () => {
    if (++loaded === first.length) {
      start(); // 첫 장면을 요청한다 (requestAnimationFrame)
      loadLater(); // 바로 이어서 요청. 우선순위가 낮아 첫 장면에 필요한 것을 막지 않는다
    }
  }));
}
// 시작을 기다리게 하지 않는 그림 (TV 프로그램 그림, 창밖 산): 처음 부를 때 받기 시작한다. 실패하면 조금 뒤 다시 부를 수 있게 지운다
const lazyBusy = new Set(), lazyBad = new Set();
export function loadLazy(k, src) {
  if (IMG[k])
    return IMG[k];
  const im = new Image();
  im.fetchPriority = 'high'; // 지금 화면에 쓰려고 부르는 것: 나중 묶음(낮음)보다 먼저
  lazyBusy.add(k);
  im.onload = () => {
    lazyBusy.delete(k);
    lazyBad.delete(k);
  };
  im.onerror = () => {
    lazyBusy.delete(k);
    lazyBad.add(k);
    setTimeout(() => {
      if (IMG[k] === im)
        delete IMG[k];
    }, 60000);
  };
  im.src = src;
  IMG[k] = im;
  SRC[k] = src;
  return im;
}
export const lazyPending = () => lazyBusy.size + laterLeft; // 점검용: 아직 받는 중인 그림 수 (나중 묶음 포함)
export const lazyFailed = k => lazyBad.has(k); // 받지 못한 그림 (없는 파일 등)
