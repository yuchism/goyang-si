/* 무대: 캔버스, 화면 맞추기, 카메라, 깊이(앞뒤) 비율 */
import { P } from './objects.js';
import { shelfUI } from './shelf.js';
import { HOLE } from './sprites.js';
import { clamp } from './util.js';
import { cat, mouse, world } from './world.js';
/* ───────── 무대 ───────── */
// 무대 숫자는 장면의 stage.json에서 온다 (SCENE_PLAN.md 2장). 아래 값은 읽기 전 기본값(= 방)
export let W = 1200, H = 760, FLOOR = 500; // 카메라: 고양이 눈높이. 바닥에서 90cm 정도까지만 보인다
// 걷는 바닥: 길찾기(steps.js)가 이 안으로만 간다
export const WALK = { x0: 40, x1: 1160, y0: 592, y1: 740 };
// 걷는 바닥 안으로: 가로는 몸 반폭(half, 배우의 a.half)만큼 더 안쪽까지만 (SCENE_PLAN.md 3장)
export const walkX = (x, half = 0) => clamp(x, WALK.x0 + half, WALK.x1 - half);
export const walkY = y => clamp(y, WALK.y0, WALK.y1);
const CAM = { shelf: 692, door: 1080, window: 300, party: 430, partyMouse: 700 }; // party: 생일 파티(손님 무리·강고양이 씨·케이크), partyMouse: 노래 끝나고 쥐야쥐 박수 (BIRTHDAY_GUESTS_PLAN.md 7-1)
// 방 자체 밝기 (SCENE_PLAN.md 6장): base = 바깥 빛이 하나도 안 들어올 때 방 어둠 (0 밝음 ~ 1)
const ROOM_LIGHT = { base: 0 };
// 방 어둠 = 방 자체 어둠 × (1 − 창 가중치) + 창으로 들어오는 바깥 어둠 × 가중치. 스탠드·호박은 그리는 쪽(main.js)에서
export const roomDark = wl => ROOM_LIGHT.base * (1 - wl.weight) + wl.dark * wl.weight;
let MIN_VIEW_W = 560; // 좁은 화면에서도 최소한 이만큼의 방 폭은 보이게
let depthY0 = 588, depthY1 = 738, depthS0 = 0.88, depthS1 = 1;
export function applyStage(st) {
  [W, H] = st.size;
  FLOOR = st.floorLine;
  BGK = W / st.bgWidth;
  [depthY0, depthY1] = st.depth.y;
  [depthS0, depthS1] = st.depth.scale;
  [WALK.x0, WALK.x1] = st.walk.x;
  [WALK.y0, WALK.y1] = st.walk.y;
  MIN_VIEW_W = st.minViewW;
  Object.assign(CAM, st.camera);
  ROOM_LIGHT.base = st.light ? st.light.base : 0;
}
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
// 어둠 위에 다시 그릴 때: 그림을 따로 그려 같은 어둠을 씌운 뒤 붙인다 (box 근처만)
const tmpc = document.createElement('canvas'), tmx = tmpc.getContext('2d');
export function redrawDark(draw, a, box) {
  const m = ctx.getTransform();
  if (tmpc.width !== cv.width || tmpc.height !== cv.height) {
    tmpc.width = cv.width;
    tmpc.height = cv.height;
  }
  const bx = Math.max(0, Math.floor(m.a * box[0] + m.e) - 4), by = Math.max(0, Math.floor(m.d * box[1] + m.f) - 4), bw = Math.ceil(m.a * box[2]) + 8, bh = Math.ceil(m.d * box[3]) + 8;
  tmx.setTransform(1, 0, 0, 1, 0, 0);
  tmx.clearRect(bx, by, bw, bh);
  tmx.save();
  tmx.beginPath();
  tmx.rect(bx, by, bw, bh);
  tmx.clip();
  tmx.setTransform(m);
  try {
    withCtx(tmx, draw);
  }
  finally {
    tmx.restore();
  }
  tmx.setTransform(1, 0, 0, 1, 0, 0);
  tmx.globalCompositeOperation = 'source-atop';
  tmx.fillStyle = `rgba(16,20,46,${a})`;
  tmx.fillRect(bx, by, bw, bh);
  tmx.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(tmpc, bx, by, bw, bh, bx, by, bw, bh);
  ctx.restore();
}
// 빛나는 화면(TV·노트북) 앞에 선 것을 같은 어둠으로 다시 올린다 (NIGHT_SCREEN_FRONT_PLAN.md 3장)
// floor: main.js의 바닥 순서 목록 [깊이, 그리기, 이름, 배우?] (정렬된 것). depth보다 앞(깊이가 큰) 것만, 한 번에 그려 한 번 붙인다
export function redrawFront(floor, depth, a, box) {
  const front = (floor || []).filter(([y, , , ac]) => y > depth && !(ac && (ac.hidden || ac.peek || ac.tvPeek)));
  if (!front.length)
    return;
  redrawDark(() => {
    for (const e of front) {
      ctx.save();
      try {
        e[1]();
      }
      catch (err) {} // 같은 그리기는 바닥 순서에서 이미 칸막이(guard.js)가 잡아 알렸다
      finally {
        ctx.restore();
      }
    }
  }, a, box);
}
const wrap = document.getElementById('wrap');
export let view = { s: 1, dpr: 1 };
// 화면 맞추기: 넓은 화면은 방 전체를, 좁은 화면(세로 폰)은 방 높이를 채우고 일부만 보여주며 카메라가 따라간다
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
  if (shelfUI.open || shelfUI.oddOpen || shelfUI.book) // 책장 목록·이상한 책·책 창(설명책·고양이책·설정책)이 펼쳐져 있으면 책장을 본다
    return CAM.shelf;
  if (world.manduk && world.manduk.phase !== 'steps')
    return CAM.door;
  if (world.ufo || world.santa)
    return CAM.window;
  const pc = world.party && world.party.cam; // 생일 파티: 손님 무리 → 노래 끝나면 쥐야쥐 (birthday.js)
  if (pc)
    return pc === 'mouse' ? CAM.partyMouse : CAM.party;
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
  모든 물건은 장면의 objects.json 한 곳에 적는다. 이 코드는 그 목록을 읽어서
  그리기(layer, look, depth) · 길찾기(body) · 행동 자리(spots) · 터치(touch)에 쓴다.
  상태(states)에 따라 모습·자리·분류가 바뀔 수 있다. */
export let BGK = 1200 / 1561; // 배경 그림(원본 폭 stage.json bgWidth)을 무대 폭에 맞추는 배율
export const DEPTH = y => depthS0 + (depthS1 - depthS0) * clamp((y - depthY0) / (depthY1 - depthY0), 0, 1);
