/* 강고양이 씨 TV · 화면: 320×240 화면 버퍼, 브라운관 효과, 방 안에 그리기, 밤 불빛 */
import { TV_META, imageReady, img } from './assets.js';
import { tr } from './i18n.js';
import { birthdayName, partyLevel } from './birthday.js';
import { drawProp } from './draw.js';
import { O, depthOf, objView, present, zOf } from './objects.js';
import { ctx, redrawDark, redrawFront } from './stage.js';
import { now } from './time.js';
import { TVP, fmtH, tvBreak } from './tv.js';
import { segAt } from './tv-core.js';
import { HAND, clamp, ease } from './util.js';
import { world } from './world.js';
/* 화면 버퍼 그리기 */
export const tvBuf = document.createElement('canvas');
tvBuf.width = 320;
tvBuf.height = 240;
const tb = tvBuf.getContext('2d');
const tvNoise = document.createElement('canvas');
tvNoise.width = 80;
tvNoise.height = 60;
const tn = tvNoise.getContext('2d'), tnImg = tn.createImageData(80, 60);
// 노이즈. "수신 중" 노이즈는 따로 만든 난수를 쓴다 (Math.random을 쓰면 그림을 받는 속도에 따라 고양이 행동의 난수가 달라진다)
let nz = 2463534242;
const nrand = () => {
  nz ^= nz << 13;
  nz ^= nz >>> 17;
  nz ^= nz << 5;
  return (nz >>> 0) / 4294967296;
};
function noiseFill(own) {
  const a = tnImg.data, R = own ? nrand : Math.random;
  for (let i = 0; i < a.length; i += 4) {
    const v = R() * 255 | 0;
    a[i] = a[i + 1] = a[i + 2] = v;
    a[i + 3] = 255;
  }
  tn.putImageData(tnImg, 0, 0);
}
function tbRR(x, y, w, h, r) {
  tb.beginPath();
  tb.moveTo(x + r, y);
  tb.arcTo(x + w, y, x + w, y + h, r);
  tb.arcTo(x + w, y + h, x, y + h, r);
  tb.arcTo(x, y + h, x, y, r);
  tb.arcTo(x, y, x + w, y, r);
  tb.closePath();
}
function tvText(t, x, y, size, o = {}) {
  tb.save();
  tb.font = `700 ${size}px ${HAND}`;
  // 화면 폭을 넘으면 글자를 줄인다 (영어가 대체로 길다). 흐르는 뉴스 띠(lw 0, maxW 없음)는 그대로
  const max = o.maxW || (o.align === 'left' ? 312 - x : 304);
  if (!o.noFit)
    while (size > 10 && tb.measureText(t).width > max)
      tb.font = `700 ${--size}px ${HAND}`;
  tb.textAlign = o.align || 'center';
  tb.textBaseline = 'middle';
  tb.lineJoin = 'round';
  if (o.lw !== 0) {
    tb.lineWidth = o.lw || 5;
    tb.strokeStyle = o.stroke || 'rgba(20,14,10,.85)';
    tb.strokeText(t, x, y);
  }
  tb.fillStyle = o.fill || '#fff8e6';
  tb.fillText(t, x, y);
  tb.restore();
}
function tvBand(t, y, size, o = {}) {
  tb.save();
  tb.font = `700 ${size}px ${HAND}`;
  let w = tb.measureText(t).width + 26;
  while (w > 306 && size > 10) {
    tb.font = `700 ${--size}px ${HAND}`;
    w = tb.measureText(t).width + 26;
  }
  tb.fillStyle = o.bg || 'rgba(22,18,34,.78)';
  tbRR(160 - w / 2, y - size * 0.78, w, size * 1.56, 7);
  tb.fill();
  tb.restore();
  tvText(t, 160, y + 1, size, { lw: 0, fill: o.fill });
}
// TV 화면 그리기. 오류가 나면 그 칸이 끝날 때까지 "잠시 화면 조정 중입니다" (tv.js tvBreak). 방은 계속 그린다
export function drawTvBuf(st) {
  try {
    drawBuf(st);
  }
  catch (e) {
    tvBreak(now(), e, '화면 그리기');
    try {
      drawBuf({ mode: 'adjust', broken: true });
    }
    catch (e2) { }
  }
}
function drawBuf(st) {
  const T = world.tv, t = world.t;
  tb.setTransform(1, 0, 0, 1, 0, 0);
  tb.globalAlpha = 1;
  tb.globalCompositeOperation = 'source-over';
  tb.fillStyle = '#08090c';
  tb.fillRect(0, 0, 320, 240);
  const pic = (n, a = 1) => {
    const im = img('tv/' + n);
    if (!imageReady(im))
      return;
    tb.globalAlpha = a;
    tb.drawImage(im, 0, 0, 320, 240);
    tb.globalAlpha = 1;
  };
  if (st.mode === 'off') {
    const p = st.tOff;
    if (p > 2.4 || p < 0)
      pic('screen_off', p < 0 ? 1 : clamp((p - 2.4) / 1.2, 0, 1));
    if (p >= 0 && p < 0.25) {
      const k = 1 - p / 0.25, h = Math.max(3, 240 * k), im = img('tv/screen_testcard');
      if (imageReady(im))
        tb.drawImage(im, 0, 120 - h / 2, 320, h);
      tb.fillStyle = `rgba(255,255,255,${0.6 * (1 - k)})`;
      tb.fillRect(0, 120 - h / 2, 320, h);
    }
    else if (p >= 0.25 && p < 0.5) {
      const w = 320 * (1 - (p - 0.25) / 0.25);
      tb.fillStyle = '#fff';
      tb.fillRect(160 - w / 2, 118, w, 4);
    }
    else if (p >= 0.5 && p < 2.6) {
      const a = 1 - (p - 0.5) / 2.1, g = tb.createRadialGradient(160, 120, 0, 160, 120, 14);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      tb.fillStyle = g;
      tb.fillRect(140, 100, 40, 40);
    }
    return;
  }
  if (st.mode === 'opening') {
    pic('screen_sunrise_1of2');
    pic('screen_sunrise_2of2', ease(clamp(st.k, 0, 1)));
    tb.globalAlpha = clamp(st.k * 4, 0, 1);
    tvText(tr('tvChannel'), 160, 50, 46, { fill: '#fff3d6', lw: 6 });
    tvText(tr('tvOpening'), 160, 90, 19, { lw: 4 });
    tb.globalAlpha = 1;
  }
  else if (st.mode === 'adjust')
    pic('screen_testcard');
  else if (!st.tuning && !st.missing)
    pic(T.frame);
  if (st.mode === 'adjust')
    tvBand(tr('tvAdjusting'), 214, 17);
  if (st.mode === 'prog' && st.missing) { // 그림 파일이 없는 프로그램
    pic('screen_testcard');
    tvBand(tr('tvAdjusting'), 214, 17);
  }
  if (st.mode === 'testcard')
    tvBand(tr('tvTestcard'), 20, 16);
  if (st.mode === 'signoff')
    tvBand(st.nap ? tr('tvNapSignoff', { t: fmtH(st.napTo / 60) }) : tr('tvSignoff'), 222, 15);
  // 프로그램 그림을 아직 못 받았다: 노이즈 + "…수신 중…" (받아지면 바로 정상 화면)
  else if (st.mode === 'prog' && st.tuning) {
    noiseFill(true);
    tb.drawImage(tvNoise, 0, 0, 320, 240);
    tvBand(tr('tvTuning'), 214, 18);
  }
  const P = st.mode === 'prog' && TVP[st.p], board = P && P.ovl('scoreboard');
  if (P && !st.tuning && !st.missing) {
    const e = st.ev && st.ev.e, ticker = P.ovl('ticker'), subs = P.ovl('subs'), shop = P.ovl('shop');
    if (shop && P.segs) { // 홈쇼핑 띠: 상품 이름 · 가격, 오른쪽에 전화번호. 자막은 그 위에
      const g = segAt(P, st.sg, st.tIn).g, item = g.shop;
      tb.fillStyle = 'rgba(28,38,92,.88)';
      tb.fillRect(0, 216, 320, 24);
      tb.fillStyle = 'rgba(255,214,90,.95)';
      tb.fillRect(0, 216, 320, 2);
      if (item)
        tvText(`${item[0]} · ${item[1]}`, 8, 228.5, 14, { align: 'left', lw: 0, maxW: 196 });
      tvText(shop.list, 312, 228.5, 13, { align: 'right', lw: 0, fill: '#ffe28a', maxW: 104 });
      if (e && e.cap)
        tvBand(e.cap, 192, e.size >= 3 ? 22 : 17, { fill: e.size >= 2 ? '#ffe28a' : undefined });
    }
    else if (e && e.cap)
      tvBand(e.cap, 214, e.size >= 3 ? 24 : 18, { fill: e.size >= 3 ? '#ffe28a' : undefined });
    else if (ticker) { // 뉴스 띠
      const msg = ticker.list.join('   ·   ') + '   ·   ', w = (tb.font = `700 15px ${HAND}`, tb.measureText(msg).width), off = (st.tIn * 38) % w;
      tb.fillStyle = 'rgba(150,30,40,.88)';
      tb.fillRect(0, 224, 320, 16);
      tb.save();
      tb.beginPath();
      tb.rect(0, 224, 320, 16);
      tb.clip();
      for (let x = 320 - off - w; x < 320; x += w)
        tvText(msg, x, 232.5, 15, { align: 'left', lw: 0, noFit: 1 });
      tb.restore();
    }
    else if (subs) { // 드라마 대사: 14초마다
      const i = Math.floor(st.tIn / 14), u = st.tIn % 14, L = subs.list;
      if (u > 2 && u < 5.5)
        tvText(L[i % L.length], 160, 214, 19, { lw: 4 });
    }
    if (board) { // 점수판
      const s = st.score, tm = board.list, tx = `${tm[0]} ${s[0]} : ${s[1]} ${tm[1]}`;
      tb.save();
      tb.font = `700 15px ${HAND}`;
      const w = tb.measureText(tx).width + 16;
      tb.fillStyle = 'rgba(16,20,40,.82)';
      tbRR(8, 8, w, 22, 5);
      tb.fill();
      tb.restore();
      tvText(tx, 16, 19.5, 15, { align: 'left', lw: 0 });
    }
    if (T.osd != null && t - T.osd < 5) {
      tb.globalAlpha = clamp(5 - (t - T.osd), 0, 1);
      tvText(st.sg.title, board ? 160 : 12, board ? 48 : 22, 16, { align: board ? 'center' : 'left', lw: 4 });
      tb.globalAlpha = 1;
    }
  }
  if (world.party && partyLevel() > 0.05) {
    tb.globalAlpha = Math.min(1, partyLevel() * 1.5);
    tvBand(birthdayName ? tr('bdayTv', { name: birthdayName }) : tr('bdayTvNoName'), board && !st.tuning && !st.missing ? 46 : 20, 15, { bg: 'rgba(120,30,60,.85)', fill: '#ffe9a8' });
    tb.globalAlpha = 1;
  }
  if (st.noise) {
    noiseFill();
    tb.globalAlpha = st.noise;
    tb.drawImage(tvNoise, 0, 0, 320, 240);
    tb.globalAlpha = 1;
  }
  // 켜질 때: 점 → 가로줄 → 화면
  if (st.tOn != null && st.tOn >= 0 && st.tOn < 0.9) {
    const p = st.tOn;
    if (p < 0.25) {
      tb.fillStyle = '#08090c';
      tb.fillRect(0, 0, 320, 240);
      const w = Math.max(4, 320 * p / 0.25);
      tb.fillStyle = '#fff';
      tb.fillRect(160 - w / 2, 118, w, 4);
    }
    else {
      const q = (p - 0.25) / 0.65, h = 240 * ease(q);
      tb.fillStyle = '#08090c';
      tb.fillRect(0, 0, 320, 120 - h / 2);
      tb.fillRect(0, 120 + h / 2, 320, 120 - h / 2);
      tb.fillStyle = `rgba(255,255,255,${0.7 * (1 - q)})`;
      tb.fillRect(0, 120 - h / 2, 320, h);
    }
  }
  // 브라운관: 주사선, 가장자리 어둡게, 유리 반사
  tb.fillStyle = 'rgba(0,0,0,.10)';
  for (let y = 0; y < 240; y += 3)
    tb.fillRect(0, y, 320, 1);
  let g = tb.createRadialGradient(160, 120, 90, 160, 120, 210);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.42)');
  tb.fillStyle = g;
  tb.fillRect(0, 0, 320, 240);
  g = tb.createLinearGradient(0, 0, 320, 240);
  g.addColorStop(0, 'rgba(255,255,255,.10)');
  g.addColorStop(0.35, 'rgba(255,255,255,0)');
  tb.fillStyle = g;
  tb.fillRect(0, 0, 320, 240);
}
// 방 안에서 TV 본체와 화면의 위치
function tvRect(v) {
  const B = TV_META.body, [hx0, hy0] = B.screenTL, [hx1, hy1] = B.screenBR; // 본체 그림 안의 화면 구멍(투명)
  const w = v.pos.w, k = w / B.size[0], h = B.size[1] * k, x0 = v.pos.x - w / 2, y0 = v.pos.y - zOf(O.tv) - h;
  return { x0, y0, w, h, k, sx: x0 + hx0 * k, sy: y0 + hy0 * k, sw: (hx1 - hx0) * k, sh: (hy1 - hy0) * k };
}
function drawScreenInto(c, r) {
  const s = Math.max(r.sw / 320, r.sh / 240), dw = 320 * s, dh = 240 * s;
  c.drawImage(tvBuf, r.sx + (r.sw - dw) / 2, r.sy + (r.sh - dh) / 2, dw, dh);
}
export function drawTV(v) {
  const r = tvRect(v);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.sx, r.sy, r.sw, r.sh);
  ctx.clip();
  drawScreenInto(ctx, r);
  ctx.restore();
  drawProp(v.look, v.pos.x, v.pos.y - zOf(O.tv), v.pos.w);
}
// 밤: 화면은 스스로 빛나므로 어둠 위에 다시 밝게, 앞을 가린 것들은 다시 어둡게. 그리고 방에 번지는 TV 불빛
// floor: main.js의 바닥 순서 목록 (TV 앞에 선 것을 다시 그릴 때)
export function drawTVNight(dk, floor) {
  try {
    drawNight(dk, floor);
  }
  catch (e) {
    tvBreak(now(), e, '밤 불빛');
  }
}
function drawNight(dk, floor) {
  const T = world.tv, st = T.st;
  if (!O.tv || !present(O.tv) || !st)
    return;
  const a = world.lampOn ? dk * 0.6 : dk;
  if (a < 0.03)
    return;
  if (st.mode === 'off' && !(st.tOff >= 0 && st.tOff < 2.6))
    return;
  const v = objView(O.tv), r = tvRect(v), k = clamp(a * 1.7, 0, 1), box = [r.sx, r.sy, r.sw, r.sh];
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.sx, r.sy, r.sw, r.sh);
  ctx.clip();
  ctx.globalAlpha = k;
  drawScreenInto(ctx, r);
  ctx.globalAlpha = 1;
  redrawDark(() => drawProp(v.look, v.pos.x, v.pos.y - zOf(O.tv), v.pos.w), a, box);
  redrawFront(floor, depthOf(v), a, box); // 강고양이 씨·쥐야쥐·손님·앞의 바닥 물건 (NIGHT_SCREEN_FRONT_PLAN.md)
  ctx.restore();
  if (st.mode === 'off')
    return;
  const [cr, cg, cb] = T.avg || [190, 200, 225], I = k * (0.78 + 0.22 * clamp(T.flick, 0, 1.6)), cx = r.sx + r.sw / 2, cy = r.sy + r.sh / 2; // 벽에 번지는 빛만 (바닥 빛은 뺐다)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cx, cy, r.sw * 0.35, cx, cy, 320);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${0.15 * I})`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(cx - 320, cy - 320, 640, 640);
  ctx.restore();
}
