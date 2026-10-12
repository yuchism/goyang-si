/* 무대: 캔버스, 화면 맞추기, 카메라, 깊이(앞뒤) 비율 */
import { P } from './objects.js';
import { shelfUI } from './shelf.js';
import { HOLE } from './sprites.js';
import { clamp } from './util.js';
import { cat, mouse, world } from './world.js';
/* ───────── 무대 ───────── */
export const W = 1200, H = 760, FLOOR = 500; // 카메라: 고양이 눈높이. 바닥에서 90cm 정도까지만 보인다
export const cv = document.getElementById('cv');
export let ctx = cv.getContext('2d');
// 다른 캔버스에 잠깐 그리기 (TV 화면 앞 캐릭터를 따로 그려 어둠을 씌울 때)
export function withCtx(c, draw) {
  const o = ctx;
  ctx = c;
  try {
    draw();
  }
  finally {
    ctx = o;
  }
}
const wrap = document.getElementById('wrap');
export let view = { s: 1, dpr: 1 };
// 화면 맞추기: 넓은 화면은 방 전체를, 좁은 화면(세로 폰)은 방 높이를 채우고 일부만 보여주며 카메라가 따라간다
const MIN_VIEW_W = 560; // 좁은 화면에서도 최소한 이만큼의 방 폭은 보이게
export function fit() {
  const r = wrap.getBoundingClientRect();
  const full = Math.min(r.width / W, r.height / H), crop = Math.min(r.height / H, r.width / MIN_VIEW_W);
  const s = Math.max(full, crop), vw = Math.min(W, r.width / s);
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.style.width = Math.floor(vw * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
  cv.width = Math.floor(vw * s * dpr);
  cv.height = Math.floor(H * s * dpr);
  view = { s, dpr, vw };
  cam.x = clamp(cam.x, 0, W - vw);
  const bd = document.getElementById('birthday');
  if (bd)
    bd.style.top = Math.round(Math.max(0, (r.height - H * s) / 2) + H * s * 0.035) + 'px'; // 생일 배너는 방 위쪽에 붙임
}
export const cam = { x: 0 };
// 카메라가 볼 곳: 만득 씨가 오면 문, UFO·산타는 창, 둘이 함께면 둘 사이, 평소엔 강고양이 씨
function camTarget() {
  if (shelfUI.open)
    return 692;
  if (world.manduk && world.manduk.phase !== 'steps')
    return 1080;
  if (world.ufo || world.santa)
    return 300;
  if (!mouse.hidden && !mouse.peek && Math.abs(mouse.x - cat.x) < view.vw * 0.8)
    return (cat.x + mouse.x) / 2;
  if (mouse.peek)
    return (cat.x + HOLE.cx) / 2;
  return cat.inBox ? P.box.x : cat.x;
}
export function updateCam(dt) {
  const vw = view.vw || W;
  if (vw >= W) {
    cam.x = 0;
    return;
  }
  const tx = clamp(camTarget() - vw / 2, 0, W - vw), d = tx - cam.x;
  if (Math.abs(d) > vw * 0.12 || cam.moving) {
    cam.moving = Math.abs(d) > 4;
    cam.x += d * Math.min(1, dt * 1.2);
  }
}
new ResizeObserver(fit).observe(wrap);
/* ───────── 사물 ─────────
  모든 물건은 objects.json 한 곳에 적는다. 이 코드는 그 목록을 읽어서
  그리기(layer, look, depth) · 길찾기(body) · 행동 자리(spots) · 터치(touch)에 쓴다.
  상태(states)에 따라 모습·자리·분류가 바뀔 수 있다. */
export const BGK = 1200 / 1561;
export const DEPTH = y => 0.88 + 0.12 * clamp((y - 588) / 150, 0, 1);
