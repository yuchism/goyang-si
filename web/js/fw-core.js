/* 불꽃 그리기 핵심 (tasks/xmas-plaza-code.md 「광장 불꽃」): 방(fireworks.js)과 크리스마스 광장(plaza/)이 같이 쓴다.
   거실 모듈(고양이·창·세계·소리)에 기대지 않는다 — util.js만. fireworks.js에서 그대로 옮겼고, 숫자는 Z(방의 FW와 같은 모양)로 받는다.
   - makeFw(Z): { shell, rhythm, escorts, textPts, drawShell(ctx, ox, oy, s, tau, vis), drawRise(ctx, ox, oy, s, u, vis) }
     ox, oy: Z 좌표(방은 창 안)의 0,0이 캔버스의 어디인지 */
import { clamp, hash } from './util.js';

export const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export const H_ = (id, i, k) => hash(id + ':' + i + ':' + k);
export const COLORS = [[255, 214, 120], [255, 120, 150], [140, 220, 255], [170, 255, 170], [210, 160, 255], [255, 255, 235], [255, 170, 90]];
export const GOLD = [255, 205, 120];

/* ───────── 모양: 단위 좌표(가운데 0, 반지름 약 1, 아래가 +y)의 점 목록 ───────── */
function outline(fn, n) {
  const out = [];
  for (let i = 0; i < n; i++)
    out.push(fn(i / n));
  return out;
}
function poly(vs, n) { // 꼭짓점을 이어 고르게 점을 찍는다 (닫힌 도형)
  const seg = [];
  let len = 0;
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i], b = vs[(i + 1) % vs.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    seg.push([a, b, l]);
    len += l;
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    let d = (i / n) * len;
    for (const [a, b, l] of seg) {
      if (d <= l) {
        out.push([a[0] + (b[0] - a[0]) * d / l, a[1] + (b[1] - a[1]) * d / l]);
        break;
      }
      d -= l;
    }
  }
  return out;
}
const SHAPES = {
  heart: () => outline(u => {
    const t = u * Math.PI * 2, s = Math.sin(t);
    return [16 * s * s * s / 17, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 - 0.1];
  }, 46),
  star: () => poly(Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 0.42 : 1, a = -Math.PI / 2 + i * Math.PI / 5;
    return [r * Math.cos(a), r * Math.sin(a)];
  }), 50),
  flower: () => outline(u => {
    const t = u * Math.PI * 2, r = 0.35 + 0.65 * Math.abs(Math.cos(2.5 * t));
    return [r * Math.cos(t), r * Math.sin(t)];
  }, 64).concat(outline(u => [0.16 * Math.cos(u * 7), 0.16 * Math.sin(u * 7)], 6)),
  tree: () => poly([[0, -1], [0.38, -0.45], [0.2, -0.45], [0.62, 0.15], [0.36, 0.15], [0.82, 0.72], [-0.82, 0.72], [-0.36, 0.15], [-0.62, 0.15], [-0.2, -0.45], [-0.38, -0.45]], 56)
    .concat([[0, 0.82], [0, 0.95], [-0.12, 0.95], [0.12, 0.95]]),
  // 강고양이 씨 얼굴: 둥근 머리, 귀 두 개, 눈, 코 (설명 없는 한 발)
  cat: () => poly([[-0.95, 0.05], [-0.85, -0.95], [-0.42, -0.6], [0.42, -0.6], [0.85, -0.95], [0.95, 0.05], [0.72, 0.62], [0.3, 0.85], [-0.3, 0.85], [-0.72, 0.62]], 62)
    .concat([[-0.36, 0.02], [-0.36, 0.12], [0.36, 0.02], [0.36, 0.12], [0, 0.32], [-0.08, 0.4], [0.08, 0.4],
      [-0.62, 0.36], [-0.82, 0.32], [0.62, 0.36], [0.82, 0.32], [-0.62, 0.48], [-0.82, 0.52], [0.62, 0.48], [0.82, 0.52]]),
};
const shapeCache = {};
const shapePts = k => shapeCache[k] || (shapeCache[k] = SHAPES[k]());

export function makeFw(Z) {
  const textCache = {};
  // 글자: 보이지 않는 캔버스에 굵게 쓰고 점을 뽑는다. 결과는 창 안 크기(px)의 [x, y] (가운데 0)
  function textPts(s) {
    if (textCache[s])
      return textCache[s];
    if (typeof document === 'undefined')
      return [];
    const c = document.createElement('canvas'), g = c.getContext('2d'), F = 64;
    g.font = `900 ${F}px "Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic","Noto Sans CJK KR",sans-serif`;
    const tw = Math.ceil(g.measureText(s).width) + 8;
    c.width = tw;
    c.height = F + 24;
    g.font = `900 ${F}px "Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic","Noto Sans CJK KR",sans-serif`;
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(s, 4, c.height / 2);
    const data = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const on = (x, y) => data[(y * c.width + x) * 4 + 3] > 140;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if (on(x, y)) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
    if (x1 < x0)
      return textCache[s] = [];
    const k = Math.min(Z.text.h / (y1 - y0 + 1), Z.text.w / (x1 - x0 + 1)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    // 점 간격: 창 안 3.4px 정도, 많으면 넓힌다 (한 발에 260개까지)
    let out = [];
    for (let step = Math.max(2, Math.round(3.4 / k)); step < 40; step++) {
      out = [];
      for (let y = y0; y <= y1; y += step)
        for (let x = x0 + ((y / step) % 2 ? step / 2 : 0); x <= x1; x += step)
          if (on(Math.round(x), y))
            out.push([(x - cx) * k, (y - cy) * k]);
      if (out.length <= 260)
        break;
    }
    return textCache[s] = out;
  }
  /* ───────── 공연 프로그램: 한 발 한 발 ─────────
     한 발 = { at(공연 시작부터 ms), rise(초), x, y(터지는 곳, 창 안), kind, R(크기), col, col2, life, n, shape|text, tilt, flipX, flipY, big } */
  function shell(id, i, at, o = {}) {
    const h = k => H_(id, i, k), kinds = ['peony', 'peony', 'ring', 'willow', 'glitter', 'double'];
    const big = !!o.big;
    const s = {
      at,
      rise: 1.1 + h('r') * 0.6,
      x: Z.zone.x[0] + h('x') * (Z.zone.x[1] - Z.zone.x[0]),
      y: Z.zone.y[0] + h('y') * (Z.zone.y[1] - Z.zone.y[0]),
      kind: kinds[Math.floor(h('k') * kinds.length)],
      R: (big ? 74 : 44) + h('R') * (big ? 30 : 30),
      col: COLORS[Math.floor(h('c') * COLORS.length)],
      col2: COLORS[Math.floor(h('c2') * COLORS.length)],
      n: 46 + Math.floor(h('n') * 30),
      big,
      lx: h('lx') * 30 - 15,
    };
    Object.assign(s, o);
    if (s.kind === 'willow' && !o.col)
      s.col = GOLD;
    s.life = s.kind === 'willow' ? 3.4 : s.kind === 'glitter' ? 2.8 : 2.3;
    if (s.shape || s.text) {
      s.kind = 'shape';
      s.hold = o.hold != null ? o.hold : s.text ? 1.9 : 1.3;
      s.life = s.hold + (o.hold != null ? 0.75 : 1.3); // 글자가 이어지면 다음 글자 전에 빨리 꺼진다
      const odd = !s.text && h('odd') < 0.12; // 가끔 기울거나 거꾸로 (실제 모양 불꽃처럼 보는 방향이 달라 보이는 장난)
      s.tilt = s.text ? (h('t') - 0.5) * 0.08 : (h('t') - 0.5) * 0.5 + (odd ? (h('o') < 0.5 ? Math.PI : Math.PI / 2) : 0);
      s.squash = s.text ? 1 : 0.75 + h('sq') * 0.25; // 옆에서 본 듯 납작하게
      if (o.tilt != null)
        s.tilt = o.tilt;
      if (o.squash != null)
        s.squash = o.squash;
      s.front = true;
      if (s.text) {
        s.x = Z.text.x;
        s.y = Z.text.y;
      }
      else if (o.y == null)
        s.y = 150 + h('fy') * 60; // 산 앞에서 읽히는 높이 (생일 배너 아래, 아파트 지붕 위)
    }
    return s;
  }
  // 구간 [a, b](ms) 리듬: 한 발씩 1~4초 간격, 가끔 몇 발 연달아, 끝 40초는 피날레
  function rhythm(id, out, a, b, opt) {
    let t = a + 1500, i = out.length;
    const fin = b - Math.min(40000, (b - a) * 0.25);
    while (t < fin) {
      const volley = H_(id, i, 'v') < 0.14;
      const n = volley ? 3 + Math.floor(H_(id, i, 'vn') * 3) : 1;
      for (let j = 0; j < n; j++, i++) {
        const sh = H_(id, i, 'sh') < opt.shape ? opt.shapes[Math.floor(H_(id, i, 'sk') * opt.shapes.length)] : null;
        out.push(shell(id, i, t + j * (250 + H_(id, i, 'vg') * 300), sh ? { shape: sh } : {}));
      }
      t += 1200 + H_(id, i, 'g') * 3200 + (n > 1 ? 1500 : 0);
    }
    while (t < b - 2500) {
      out.push(shell(id, i, t, { big: H_(id, i, 'b') < 0.45 }));
      i++;
      t += 260 + H_(id, i, 'g') * 500;
    }
    out.push(shell(id, i, b - 2400, { big: true, kind: 'willow' }), shell(id, i + 1, b - 2300, { big: true, kind: 'peony', x: 280 }));
  }
  // 모양·글자 한 발에 곁들이는 배경 불꽃: 뒤쪽 하늘(산 뒤, 글자보다 높이)에 동그란 불꽃 몇 발.
  // 글자가 가운데를 비워 두도록 양옆·위쪽으로. 숫자는 Z.escort
  function escorts(id, out) {
    const E = Z.escort, add = [];
    out.filter(s => s.front).forEach((s, j) => {
      const n = E.n[0] + Math.floor(H_(id, 'e' + j, 'n') * (E.n[1] - E.n[0] + 1));
      for (let k = 0; k < n; k++) {
        const h = q => H_(id, 'e' + j + '.' + k, q), side = k % 2 ? 1 : -1;
        const x = clamp(s.x + side * (E.gap + h('x') * 110), Z.zone.x[0], Z.zone.x[1]);
        add.push(shell(id, 'e' + j + '.' + k, s.at + E.at[0] + h('t') * (E.at[1] - E.at[0]), { x, y: Z.zone.y[0] + h('y') * 70, big: h('b') < 0.3 }));
      }
    });
    out.push(...add);
  }
  // 한 발의 불티 위치 (창 안 좌표). tau = 터진 뒤 초
  function sparkPos(s, i, tau) {
    if (s.kind === 'shape') {
      const p = s.pts[i], k = 1 - Math.exp(-5.5 * tau), drop = Math.max(0, tau - s.hold) ** 2 * 9;
      const c = Math.cos(s.tilt), sn = Math.sin(s.tilt), px = p[0] * s.squash, py = p[1];
      return [s.x + (px * c - py * sn) * k, s.y + (px * sn + py * c) * k + drop];
    }
    const a = s.ang[i], sp = s.spd[i];
    const drag = s.kind === 'willow' ? 1.8 : 3.2, G = s.kind === 'willow' ? 16 : 7;
    const r = s.R * sp * (1 - Math.exp(-drag * tau));
    return [s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.96 + G * tau * tau];
  }
  function drawShell(ctx, ox, oy, s, tau, vis) {
    const toRoomX = x => ox + x, toRoomY = y => oy + y;
    if (s.kind === 'shape' && !s.pts) {
      const raw = s.text ? textPts(s.text) : shapePts(s.shape).map(([x, y]) => [x * s.R, y * s.R]);
      s.pts = raw;
      s.n = raw.length;
    }
    if (s.kind !== 'shape' && !s.ang) { // 불티마다 방향·빠르기 (한 번만 뽑아 둔다)
      s.ang = new Float32Array(s.n);
      s.spd = new Float32Array(s.n);
      for (let i = 0; i < s.n; i++) {
        s.ang[i] = (i / s.n) * Math.PI * 2 + (H_(s.at, i, 'a') - 0.5) * (s.kind === 'ring' ? 0.02 : 0.25);
        s.spd[i] = (s.kind === 'ring' ? 1 : 0.8 + H_(s.at, i, 's') * 0.25) * (s.kind === 'double' && i % 3 === 0 ? 0.5 : 1);
      }
    }
    const fade = tau < s.life ? Math.pow(1 - tau / s.life, s.kind === 'willow' ? 0.8 : 1.1) : 0;
    if (fade <= 0)
      return;
    const hot = clamp(1 - tau / 0.22, 0, 1); // 터지는 순간 하얗게
    // 터지는 빛 (하늘도 조금 밝아진다)
    if (tau < 0.5) {
      const g = ctx.createRadialGradient(toRoomX(s.x), toRoomY(s.y), 0, toRoomX(s.x), toRoomY(s.y), s.R * 2.4);
      const a = (1 - tau / 0.5) * (s.big ? 0.22 : 0.13) * vis;
      g.addColorStop(0, rgba(s.col, a));
      g.addColorStop(1, rgba(s.col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(toRoomX(s.x) - s.R * 2.4, toRoomY(s.y) - s.R * 2.4, s.R * 4.8, s.R * 4.8);
    }
    const shape = s.kind === 'shape';
    const trail = s.kind === 'willow' ? 0.32 : shape ? 0.05 : 0.09;
    for (let i = 0; i < s.n; i++) {
      let b = fade;
      if (s.kind === 'glitter' && tau > s.life * 0.45)
        b *= H_(s.at, i, Math.floor(tau * 14)) > 0.5 ? 1 : 0.15;
      if (shape && tau > s.hold)
        b *= H_(s.at, i, Math.floor(tau * 10)) > 0.25 ? 1 : 0.4; // 꺼지며 반짝반짝
      if (b < 0.02)
        continue;
      const col = s.kind === 'double' && i % 3 === 0 ? s.col2 : s.kind === 'ring' && i % 2 ? s.col2 : shape && s.text && i % 7 === 0 ? s.col2 : s.col;
      const c = hot > 0 ? [col[0] + (255 - col[0]) * hot, col[1] + (255 - col[1]) * hot, col[2] + (255 - col[2]) * hot] : col;
      const [x1, y1] = sparkPos(s, i, tau);
      if (shape) {
        ctx.fillStyle = rgba(c, 0.3 * b * vis);
        ctx.beginPath();
        ctx.arc(toRoomX(x1), toRoomY(y1), 3.4, 0, 7);
        ctx.fill();
        ctx.fillStyle = rgba(c, b * vis);
        ctx.beginPath();
        ctx.arc(toRoomX(x1), toRoomY(y1), 1.5, 0, 7);
        ctx.fill();
        continue;
      }
      const [x0, y0] = sparkPos(s, i, Math.max(0, tau - trail));
      ctx.beginPath();
      ctx.moveTo(toRoomX(x0), toRoomY(y0));
      ctx.lineTo(toRoomX(x1), toRoomY(y1));
      ctx.strokeStyle = rgba(c, 0.28 * b * vis); // 번지는 빛
      ctx.lineWidth = s.big ? 5 : 4;
      ctx.stroke();
      ctx.strokeStyle = rgba(c, b * vis);
      ctx.lineWidth = s.big ? 2.2 : 1.8;
      ctx.stroke();
    }
  }
  function drawRise(ctx, ox, oy, s, u, vis) { // u: 올라가는 진행 0~1
    const toRoomX = x => ox + x, toRoomY = y => oy + y;
    const e = 1 - (1 - u) * (1 - u), sx = s.x + s.lx;
    for (let k = 0; k < 4; k++) {
      const y0 = s.front ? Z.frontY : Z.launchY, uu = Math.max(0, e - k * 0.05), x = sx + (s.x - sx) * uu, y = y0 + (s.y - y0) * uu;
      ctx.fillStyle = rgba(s.kind === 'willow' ? GOLD : [255, 230, 190], (0.8 - k * 0.2) * vis);
      ctx.fillRect(toRoomX(x) - 1.3, toRoomY(y) - 1.3, 2.6, 2.6);
    }
  }
  return { shell, rhythm, escorts, textPts, sparkPos, drawShell, drawRise };
}
