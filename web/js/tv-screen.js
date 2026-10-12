/* 강고양이 씨 TV · 화면: 320×240 화면 버퍼, 브라운관 효과, 방 안에 그리기, 밤 불빛 */
import { TV_META, imageReady, img } from './assets.js';
import { birthdayName, partyLevel } from './birthday.js';
import { drawProp } from './draw.js';
import { O, P, objView, present, zOf } from './objects.js';
import { drawActor } from './sprites.js';
import { ctx, cv, withCtx } from './stage.js';
import { TVP } from './tv.js';
import { HAND, clamp, ease } from './util.js';
import { cat, mouse, world } from './world.js';
/* 화면 버퍼 그리기 */
export const tvBuf = document.createElement('canvas');
tvBuf.width = 320;
tvBuf.height = 240;
const tb = tvBuf.getContext('2d');
const tvNoise = document.createElement('canvas');
tvNoise.width = 80;
tvNoise.height = 60;
const tn = tvNoise.getContext('2d'), tnImg = tn.createImageData(80, 60);
function noiseFill() {
  const a = tnImg.data;
  for (let i = 0; i < a.length; i += 4) {
    const v = Math.random() * 255 | 0;
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
  const w = Math.min(306, tb.measureText(t).width + 26);
  tb.fillStyle = o.bg || 'rgba(22,18,34,.78)';
  tbRR(160 - w / 2, y - size * 0.78, w, size * 1.56, 7);
  tb.fill();
  tb.restore();
  tvText(t, 160, y + 1, size, { lw: 0, fill: o.fill });
}
export function drawTvBuf(st) {
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
    tvText('고양.방송', 160, 50, 46, { fill: '#fff3d6', lw: 6 });
    tvText('오늘도 방송을 시작합니다', 160, 90, 19, { lw: 4 });
    tb.globalAlpha = 1;
  }
  else
    pic(T.frame);
  if (st.mode === 'testcard')
    tvBand('고양.방송   화면조정', 20, 16);
  if (st.mode === 'signoff')
    tvBand('오늘 방송을 모두 마쳤습니다. 안녕히 주무세요', 222, 15);
  if (st.mode === 'prog') {
    const P = TVP[st.p], e = st.ev && st.ev.e;
    if (e && e.cap)
      tvBand(e.cap, 214, e.size >= 3 ? 24 : 18, { fill: e.size >= 3 ? '#ffe28a' : undefined });
    else if (st.p === 'news') {
      const msg = P.ticker.join('   ·   ') + '   ·   ', w = (tb.font = `700 15px ${HAND}`, tb.measureText(msg).width), off = (st.tIn * 38) % w;
      tb.fillStyle = 'rgba(150,30,40,.88)';
      tb.fillRect(0, 224, 320, 16);
      tb.save();
      tb.beginPath();
      tb.rect(0, 224, 320, 16);
      tb.clip();
      for (let x = 320 - off - w; x < 320; x += w)
        tvText(msg, x, 232.5, 15, { align: 'left', lw: 0 });
      tb.restore();
    }
    else if (st.p === 'drama') {
      const i = Math.floor(st.tIn / 14), u = st.tIn % 14;
      if (u > 2 && u < 5.5)
        tvText(P.subs[i % P.subs.length], 160, 214, 19, { lw: 4 });
    }
    if (P.sport) {
      const s = st.score, tx = `${P.teams[0]} ${s[0]} : ${s[1]} ${P.teams[1]}`;
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
      tvText(st.sg.title, P.sport ? 160 : 12, P.sport ? 48 : 22, 16, { align: P.sport ? 'center' : 'left', lw: 4 });
      tb.globalAlpha = 1;
    }
  }
  if (world.party && partyLevel() > 0.05) {
    tb.globalAlpha = Math.min(1, partyLevel() * 1.5);
    tvBand('🎂 축하 방송 · ' + (birthdayName ? birthdayName + '님' : '') + ' 생일 축하해요', st.mode === 'prog' && TVP[st.p].sport ? 46 : 20, 15, { bg: 'rgba(120,30,60,.85)', fill: '#ffe9a8' });
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
// 어둠 위에 다시 그릴 때: 그림을 따로 그려 같은 어둠을 씌운 뒤 붙인다 (화면 구멍 근처만)
const tmpc = document.createElement('canvas'), tmx = tmpc.getContext('2d');
function redrawDark(draw, a, box) {
  const m = ctx.getTransform();
  if (tmpc.width !== cv.width || tmpc.height !== cv.height) {
    tmpc.width = cv.width;
    tmpc.height = cv.height;
  }
  const bx = Math.max(0, Math.floor(m.a * box[0] + m.e) - 4), by = Math.max(0, Math.floor(m.d * box[1] + m.f) - 4), bw = Math.ceil(m.a * box[2]) + 8, bh = Math.ceil(m.d * box[3]) + 8;
  tmx.setTransform(1, 0, 0, 1, 0, 0);
  tmx.clearRect(bx, by, bw, bh);
  tmx.setTransform(m);
  withCtx(tmx, draw);
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
// 밤: 화면은 스스로 빛나므로 어둠 위에 다시 밝게, 앞을 가린 것들은 다시 어둡게. 그리고 방에 번지는 TV 불빛
export function drawTVNight(dk) {
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
  for (const ac of [cat, mouse]) {
    if (ac.hidden || ac.peek || ac.tvPeek)
      continue;
    if ((ac.inBox ? P.box.y : ac.y) <= v.pos.y)
      continue;
    redrawDark(() => drawActor(ac), a, box);
  }
  ctx.restore();
  if (st.mode === 'off')
    return;
  const [cr, cg, cb] = T.avg || [190, 200, 225], I = k * (0.78 + 0.22 * clamp(T.flick, 0, 1.6)), cx = r.sx + r.sw / 2, cy = r.sy + r.sh / 2, fy = v.pos.y + 50;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(cx, cy, r.sw * 0.35, cx, cy, 320);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${0.15 * I})`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(cx - 320, cy - 320, 640, 640);
  g = ctx.createRadialGradient(cx, fy, 10, cx, fy, 280);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${0.2 * I})`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, fy, 280, 78, 0, 0, 7);
  ctx.fill();
  ctx.restore();
}
