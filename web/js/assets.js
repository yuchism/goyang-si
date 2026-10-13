/* 그림: 캐릭터 프레임(f/)과 방 소품(r/), TV(r/tv/)를 읽는다.
   크기와 기준점은 각 폴더의 meta.json 한 곳에만 적는다 (tools/build_meta.py가 새 그림을 찾아 채운다).
   f/meta.json   : 캐릭터 프레임. [폭, 높이, 발 기준점 x, y]. 모두 왼쪽을 보는 그림
   r/meta.json   : 방 배경과 소품. [폭, 높이]
   r/tv/meta.json: TV 본체(화면 구멍 위치)와 기본 화면 그림. 프로그램 그림은 r/tv/programs.json에서, 필요할 때 받는다(loadLazy, tv.js) */
import { start } from './main.js';

export const FRAMES = {};
export const ROOM = {};
export const TV_META = {};
export const SRC = {};
export const IMG = {};
export const FSC = 0.42, MSC = 0.417; // 프레임 픽셀 → 방 크기
// webp가 아닌 그림 (원본 그대로 쓰는 큰 시트)
const EXTRA_SRC = {
  f_birthday_dance: 'f/cat-birthday-dance-sheet-v1.png',
  r_birthday_cake: 'r/birthday-cake-v1.png',
};
export function img(k) {
  return IMG['r_' + k];
}
export function imageReady(im) {
  return !!(im && im.complete && im.naturalWidth > 0 && im.naturalHeight > 0);
}
const getJSON = url => fetch(url, { cache: 'no-store' }).then(r => {
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
  const tvFiles = [tv.body.file, ...Object.values(tv.baseScreens).flat()]; // 시작을 기다리게 하는 TV 그림은 본체와 기본 화면만
  tvFiles.forEach(file => SRC['r_tv/' + file.replace(/\.webp$/, '')] = 'r/tv/' + file);
  Object.assign(SRC, EXTRA_SRC);
}
try {
  document.fonts && document.fonts.load('700 30px Gaegu');
}
catch (e) { }
// 그림을 모두 읽으면(실패한 것도 포함) 시작
export function loadImages() {
  const names = Object.keys(SRC);
  let loaded = 0;
  names.forEach(k => {
    const im = new Image();
    const done = () => {
      if (++loaded === names.length)
        start();
    };
    im.onload = done;
    im.onerror = done;
    im.src = SRC[k];
    IMG[k] = im;
  });
}
// 시작을 기다리게 하지 않는 그림 (TV 프로그램 그림): 처음 부를 때 받기 시작한다. 실패하면 조금 뒤 다시 부를 수 있게 지운다
const lazyBusy = new Set(), lazyBad = new Set();
export function loadLazy(k, src) {
  if (IMG[k])
    return IMG[k];
  const im = new Image();
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
export const lazyPending = () => lazyBusy.size; // 점검용: 아직 받는 중인 그림 수
export const lazyFailed = k => lazyBad.has(k); // 받지 못한 그림 (없는 파일 등)
