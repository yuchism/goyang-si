/* 창밖 풍경 판 (WINDOW_PLAN_3.md 5·6장): 하늘 뒤의 산 두 겹 + 연무 + 건너편 아파트(마스크)를 임시 캔버스 두 장(낮 판·밤 판)에 합쳐 둔다.
   매 장면엔 낮 판을 그리고 밤 판을 밤 비율 알파로 겹친다 (outside.js). 하늘은 판에 넣지 않는다(그라데이션 한 번이라 캐시 이득 없음).
   판은 이럴 때만 다시 만든다: 풍경 날짜(산 섞기·눈 모자·미세먼지)가 바뀔 때, 화면 배율·크기가 바뀔 때, 산·건물 그림이 늦게 읽혔을 때,
   미리보기 덮어쓰기(풍경 날짜·계절)를 켜고 끌 때 — 모두 판 열쇠(key)에 들어 있다.
   산 그림(r/scenery/, tools/make_mountains.py)은 지금 섞는 두 계절 + 눈 모자만 그때그때 받는다 (loadLazy). 못 받았으면 산 없이 건물만 */
import { IMG, imageReady, loadLazy } from './assets.js';
import { view } from './stage.js';
import { sceneryAt } from './time.js';
import { clamp, onScene } from './util.js';
import { WIN, wy } from './win.js';

// 산 그림 자리: 캔버스 2400×1100 → 창 안 x −81 ~ 599, y 120 ~ 432 (0.2833배, MOUNTAIN_SPRITE_PLAN.md 3장). 장면의 window.json landscape.mountains
export const MT = {};
// 물드는 방향을 계산하는 높이 범위: 먼 산 봉우리 ~ 가까운 산에 가려지는 곳, 가까운 산 능선 ~ 건물에 가려지는 곳
const SPAN = {};
onScene(() => {
  if (!WIN.rect)
    return;
  const m = WIN.landscape.mountains;
  Object.assign(MT, { x: WIN.rect.x + m.x, y: wy(m.y), w: m.w, h: m.w * 1100 / 2400 });
  for (const L of ['far', 'near'])
    SPAN[L] = m.span[L].map(wy);
});
const BAND = 0.35; // 물드는 경계의 부드러운 폭 (범위 대비)
// 가까운 산 그림 맨 아래 색 (캔버스 아래 ~ 지평선을 한 번 더 채움. 건물 사이 틈 방지)
const NEAR_BASE = { spring: '#82a664', summer: '#41795f', autumn: '#9f6824', winter: '#645554' };
// 연무: 먼 산엔 진하게, 가까운 산엔 옅게. 미세먼지 날엔 누런빛으로 더 진하게. 산이 있는 곳에만(source-atop)
// 산은 건물보다 뒤이므로 건물보다 흐리고 옅어야 거리감이 맞다 (WINDOW_PLAN_3.md 16장: 연무를 진하게, 살짝 부드럽게)
const HAZE = {
  day: { col: '196,190,222', far: 0.5, near: 0.3 },
  night: { col: '66,62,104', far: 0.4, near: 0.22 },
  dust: { col: '214,196,150', far: 0.78, near: 0.46 },
};
const SOFT = { far: 1.0, near: 0.7 }; // 산을 부드럽게 (방 px 만큼 흐리게)
const SHADOW = { col: '40,38,70', blur: 5, day: 0.35, night: 0.25 }; // 건물 뒤 은은한 그림자 (건물이 산 앞에 놓인 느낌)
// c를 방 px r만큼 흐리게: 작게 줄였다가 다시 키운다 (ctx.filter가 없는 브라우저에서도 같게)
function soften(c, r, box) {
  const k = c.width / box.w, f = clamp(1 / (1 + r * k * 0.9), 0.08, 1);
  if (f > 0.95)
    return;
  const sw = Math.max(1, Math.round(c.width * f)), sh = Math.max(1, Math.round(c.height * f)), t = tmp(3, sw, sh), y = t.getContext('2d'), x = c.getContext('2d');
  y.imageSmoothingQuality = 'high';
  y.drawImage(c, 0, 0, sw, sh);
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'copy';
  x.imageSmoothingQuality = 'high';
  x.drawImage(t, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-over';
}
// 밤: 산을 남색 쪽으로 어둡게 (먼 산이 밤 건물보다 살짝 밝아야 거리감)
const NIGHT_INK = { col: '24,28,58', far: 0.66, near: 0.74 };
const mtKey = (layer, s) => 'r_scenery/mountain_' + layer + '_' + s;
// 산 그림 하나 (처음 부를 때 받기 시작)
const mt = (layer, s) => loadLazy(mtKey(layer, s), 'r/scenery/mountain_' + layer + '_' + s + '.webp');

const P = { key: '', day: null, night: null, box: null, tmp: [] };
const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
function tmp(i, w, h) {
  let c = P.tmp[i];
  if (!c || c.width !== w || c.height !== h)
    c = P.tmp[i] = canvas(w, h);
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1;
  x.clearRect(0, 0, w, h);
  return c;
}
// 세로 그라데이션 가중치 w(y): 진행도 k(0 → 1)에 따라 경계가 산을 따라 움직인다. dir 'down' = 꼭대기부터, 'up' = 아래부터
function weightGradient(x, box, span, k, dir, flip) {
  const [ya, yb] = span, e = k * (1 + BAND), at = u => {
    const v = clamp((e - u) / BAND, 0, 1);
    return flip ? 1 - v : v;
  };
  const g = x.createLinearGradient(0, dir === 'down' ? ya : yb, 0, dir === 'down' ? yb : ya); // u = 0 → 1
  [0, clamp(e - BAND, 0, 1), clamp(e, 0, 1), 1].forEach(u => g.addColorStop(u, `rgba(0,0,0,${at(u)})`));
  return g;
}
// 산 한 겹을 c에 그린다: 두 계절 섞기(물드는 방향) → 눈 모자 → 연무 → (밤이면) 어둡게. 그림이 없으면 false
function drawLayer(c, box, layer, sc, night, haze) {
  const [[sa, ka], [sb, kb]] = sc.mix, A = mt(layer, sa), B = kb > 0 ? mt(layer, sb) : null;
  if (!imageReady(A) || (B && !imageReady(B)))
    return false;
  const x = c.getContext('2d'), put = (cv, im) => {
    const y = cv.getContext('2d');
    y.setTransform(c.width / box.w, 0, 0, c.height / box.h, -box.x * c.width / box.w, -box.y * c.height / box.h);
    y.drawImage(im, MT.x, MT.y, MT.w, MT.h);
    return y;
  };
  if (!B || kb >= 1 || ka >= 1) {
    put(c, kb >= 1 && B ? B : A);
  }
  else {
    // 섞기: A × (1 − w) + B × w 를 lighter로 더한다 (알파가 같으니 가장자리 알파가 그대로 유지됨)
    const w = c.width, h = c.height;
    [[A, true], [B, false]].forEach(([im, flip], i) => {
      const t = tmp(i, w, h), y = put(t, im);
      y.globalCompositeOperation = 'destination-in';
      y.fillStyle = weightGradient(y, box, SPAN[layer], kb, sc.dir, flip);
      y.fillRect(box.x, box.y, box.w, box.h);
      x.globalCompositeOperation = 'lighter';
      x.drawImage(t, 0, 0);
    });
    x.globalCompositeOperation = 'source-over';
  }
  x.setTransform(c.width / box.w, 0, 0, c.height / box.h, -box.x * c.width / box.w, -box.y * c.height / box.h);
  if (layer === 'far' && sc.snowCap > 0) {
    const cap = mt('far', 'snowcap');
    if (imageReady(cap)) {
      x.globalAlpha = sc.snowCap;
      x.drawImage(cap, MT.x, MT.y, MT.w, MT.h);
      x.globalAlpha = 1;
    }
  }
  if (layer === 'near') { // 캔버스 아래 ~ 지평선: 가까운 산 밑색 (섞기 비율대로)
    x.fillStyle = NEAR_BASE[ka >= kb ? sa : sb];
    x.fillRect(box.x, MT.y + MT.h - 1, box.w, box.y + box.h - (MT.y + MT.h) + 1);
  }
  x.globalCompositeOperation = 'source-atop'; // 산이 있는 곳에만
  x.fillStyle = `rgba(${haze.col},${haze[layer]})`;
  x.fillRect(box.x, box.y, box.w, box.h);
  if (night) {
    x.fillStyle = `rgba(${NIGHT_INK.col},${NIGHT_INK[layer]})`;
    x.fillRect(box.x, box.y, box.w, box.h);
  }
  x.globalCompositeOperation = 'source-over';
  return true;
}
// 건너편 아파트 자리 (window.json landscape: 높이 height, 창 가운데, 밑동은 지평선 bottom)
export function aptRect(w) {
  const base = IMG.r_apt_day_mask && imageReady(IMG.r_apt_day_mask) ? IMG.r_apt_day_mask : IMG.r_apt_day;
  const iw = base && base.naturalWidth || 2086, ih = base && base.naturalHeight || 377, ah = WIN.landscape.height, aw = iw * ah / ih;
  return { ax: w.x + w.w / 2 - aw / 2, ay: w.y + WIN.landscape.bottom - ah, aw, ah };
}
function build(c, box, sc, night, w) {
  const x = c.getContext('2d'), haze = sc.dust ? HAZE.dust : night ? HAZE.night : HAZE.day;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, c.width, c.height);
  for (const L of ['far', 'near']) {
    const t = tmp(2, c.width, c.height);
    if (drawLayer(t, box, L, sc, night, haze)) {
      soften(t, SOFT[L], box);
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.drawImage(t, 0, 0);
    }
  }
  // 건물: 마스크(하늘을 뺀 건물만). 마스크를 못 읽었으면 예전 그림(하늘 포함)으로 대신한다
  const { ax, ay, aw, ah } = aptRect(w), mask = IMG[night ? 'r_apt_night_mask' : 'r_apt_day_mask'], old = IMG[night ? 'r_apt_night' : 'r_apt_day'];
  const im = imageReady(mask) ? mask : imageReady(old) ? old : null;
  x.setTransform(c.width / box.w, 0, 0, c.height / box.h, -box.x * c.width / box.w, -box.y * c.height / box.h);
  if (!im)
    return;
  // 건물 뒤 은은한 그림자: 건물 모양을 어둡게 칠해 흐린 뒤 깔아 둔다
  const t = tmp(2, c.width, c.height), y = t.getContext('2d');
  y.setTransform(c.width / box.w, 0, 0, c.height / box.h, -box.x * c.width / box.w, -box.y * c.height / box.h);
  y.drawImage(im, ax, ay, aw, ah);
  y.globalCompositeOperation = 'source-in';
  y.fillStyle = `rgb(${SHADOW.col})`;
  y.fillRect(box.x, box.y, box.w, box.h);
  y.globalCompositeOperation = 'source-over';
  soften(t, SHADOW.blur, box);
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = night ? SHADOW.night : SHADOW.day;
  x.drawImage(t, 0, 0);
  x.globalAlpha = 1;
  x.setTransform(c.width / box.w, 0, 0, c.height / box.h, -box.x * c.width / box.w, -box.y * c.height / box.h);
  x.drawImage(im, ax, ay, aw, ah);
}
// 지금 판 두 장 { day, night, box }. 필요하면 다시 만든다
export function sceneryPlates(d, w) {
  const sc = sceneryAt(d), k = view.s * view.dpr, box = { x: w.x - 4, y: w.y, w: w.w + 8, h: w.h + 4 };
  const pw = Math.max(1, Math.ceil(box.w * k)), ph = Math.max(1, Math.ceil(box.h * k));
  const need = [...sc.mix.filter(([, v]) => v > 0).map(([s]) => s)], ready = ['far', 'near'].map(L => need.map(s => imageReady(mt(L, s)) ? 1 : 0).join('')).join('/') + (sc.snowCap > 0 ? (imageReady(mt('far', 'snowcap')) ? 'c' : 'C') : '');
  const masks = ['r_apt_day_mask', 'r_apt_night_mask', 'r_apt_day', 'r_apt_night'].map(n => imageReady(IMG[n]) ? 1 : 0).join('');
  const key = [pw, ph, w.x, w.y, w.w, w.h, sc.md, sc.mix.map(([s, v]) => s + v.toFixed(3)).join(','), sc.dir, sc.snowCap.toFixed(2), sc.dust, ready, masks].join('|');
  if (key !== P.key) {
    P.key = key;
    if (!P.day || P.day.width !== pw || P.day.height !== ph) {
      P.day = canvas(pw, ph);
      P.night = canvas(pw, ph);
    }
    build(P.day, box, sc, false, w);
    build(P.night, box, sc, true, w);
    P.box = box;
    P.builds = (P.builds || 0) + 1;
  }
  return P;
}
export const sceneryBuilds = () => P.builds || 0; // 점검용: 판을 몇 번 만들었나
