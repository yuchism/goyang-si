/* 유리 가림 검사: 어둠 뒤(events.js shadow)에 그리는 창밖의 빛나는 점(검은 고양이 눈, 비행기 불빛)이
   창틀·커튼·방 안 물건·캐릭터 뒤에 있으면 그리지 않는다. WINDOW_PLAN.md 3장 15번
   - 유리 픽셀 표: 창틀 그림(window_frame.webp)에서 창 영역의 투명한 픽셀(= 유리와 난간)을 한 번만 읽어 둔다
   - 커튼: 지금 흔들림(curtainSkew)까지 계산해 커튼 그림의 그 픽셀이 불투명한가
   - 방 안 물건(벽·바닥 층의 그림 소품): 그림 상자 안이고 그 픽셀이 불투명한가
   - 캐릭터: 강고양이 씨·쥐야쥐의 그림 상자 안인가
   매 장면 화면 크기 임시 캔버스를 합성하지 않는다(휴대폰 고해상도에서 부담). 점 몇 개만 본다 */
import { WIN, wy } from './win.js';
import { FRAMES, FSC, IMG, MSC, imageReady, img } from './assets.js';
import { curtainSkew } from './draw.js';
import { O, OBJ, P, objView, present, zOf } from './objects.js';
import { BGK, DEPTH } from './stage.js';
import { actorLift } from './steps.js';
import { cat, mouse } from './world.js';

// 그림 하나의 알파를 한 번 읽어 둔다 (작은 그림만). 픽셀을 못 읽는 환경(file://)이면 false
const alphaC = {};
function alphaOf(name, im) {
  if (alphaC[name] !== undefined)
    return alphaC[name];
  try {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data, a = new Uint8Array(c.width * c.height);
    for (let i = 0; i < a.length; i++)
      a[i] = d[i * 4 + 3];
    alphaC[name] = { a, w: c.width, h: c.height };
  }
  catch (e) {
    alphaC[name] = false;
  }
  return alphaC[name];
}
// (u, v)는 그림 안 비율 0~1
function opaqueAt(name, im, u, v) {
  if (u < 0 || u >= 1 || v < 0 || v >= 1)
    return false;
  const A = alphaOf(name, im);
  if (!A)
    return true; // 못 읽으면 상자 안은 가린 것으로
  return A.a[Math.floor(v * A.h) * A.w + Math.floor(u * A.w)] > 40;
}
// 유리인가: 창 영역 안이고 방 배경이 투명한 곳
// 유리인가: 창 영역 안이고 창틀 그림(window_frame: 방 배경에서 난간을 뺀 창틀)이 투명한 곳 = 유리 또는 난간 (베란다에서 보이는 곳)
export function glassAt(x, y) {
  const w = P.window, im = IMG.r_window_frame;
  if (!w || x < w.x || x >= w.x + w.w || y < w.y || y >= w.y + w.h)
    return false;
  if (!imageReady(im))
    return true;
  return !opaqueAt('frame', im, x / 1200, y / (im.height * BGK));
}
function curtainAt(o, x, y) {
  if (!o || !present(o))
    return false;
  const v = objView(o), im = img(v.img);
  if (!imageReady(im) || y > v.pos.y)
    return false;
  const sk = curtainSkew(v), lx = x - (v.pos.x - v.pos.w / 2) - sk * (y - wy(WIN.curtain.pivotY)); // draw.js 커튼 그리기와 같은 변환
  return opaqueAt('c_' + v.img, im, lx / v.pos.w, (y + 30) / (v.pos.y + 30));
}
// 벽·바닥 층의 그림 소품 (drawProp: 가운데 아래 기준)
function propAt(o, x, y) {
  if (!present(o) || (o.layer !== 'floor' && o.layer !== 'wall'))
    return false;
  const v = objView(o);
  if (!v.pos || !v.look || v.look.startsWith('code:'))
    return false;
  const im = img(v.look);
  if (!imageReady(im))
    return false;
  const w = v.pos.w, h = w * im.height / im.width, by = v.pos.y - zOf(o);
  return opaqueAt('p_' + v.look, im, (x - (v.pos.x - w / 2)) / w, (y - (by - h)) / h);
}
// 캐릭터 그림 상자 (sprites.js drawFrame과 같은 크기·기준점)
function actorAt(a, x, y) {
  if (a.hidden)
    return false;
  const f = FRAMES[a.frame] || FRAMES[a.kind === 'cat' ? 'cat_loaf_1' : 'mouse_idle_1'];
  if (!f)
    return false;
  const s = (a.kind === 'cat' ? FSC : MSC) * DEPTH(a.y) * (f[4] || 1), lift = actorLift(a);
  const half = Math.max(f[2], f[0] - f[2]) * s, top = a.y - lift - f[3] * s, bot = a.y - lift + (f[1] - f[3]) * s;
  return x > a.x - half && x < a.x + half && y > top && y < bot;
}
// 점 (x, y)가 무언가에 가려졌나
export function occluded(x, y) {
  if (!glassAt(x, y))
    return true;
  if (curtainAt(O.curtain_l, x, y) || curtainAt(O.curtain_r, x, y))
    return true;
  for (const o of OBJ)
    if (propAt(o, x, y))
      return true;
  return actorAt(cat, x, y) || actorAt(mouse, x, y);
}
