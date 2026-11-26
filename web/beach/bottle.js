/* 쪽지 병 (BEACH_PLAN.md 5장, tasks/beach-3-bottle.md)
   - 하루에 한 번(방문자 날짜): 도착하고 조금 뒤(BOTTLE.wait) 물가에 병이 떠밀려 와, 젖은 모래 위에 눕고 파도가 닿을 때마다 살짝 흔들림
   - 누르면 쪽지(note.js). 닫으면 그날은 모래 위 병 자국만 남음 — 다음 날 또 옴. 기록은 방문자 브라우저에만(store BOTTLE.key)
   - 그리기: 작은 복셀 모형(누운 유리병·코르크·안에 말린 종이)을 높이별 판으로 구워 쌓음(캠핑장 모닥불과 같은 스프라이트 스태킹).
     빛깔은 해변 시간대 빛(L)으로 다시 구움 */
import { mix, rgb, clamp01, hash } from './sky.js';

export const BOTTLE = {
  key: 'beachNote',   // store: { day, opened, seen: [번호…] }
  wait: 18,           // 도착하고 병이 보이기 시작할 때까지 (초)
  drift: 9,           // 물에 떠서 물가까지 오는 시간 (초)
  land: 3,            // 모래 위로 밀려 올라 멈추는 시간 (초)
  at: [0.16, 0.3],    // 쉬는 자리: 화면 가운데에서 오른쪽으로 화면 폭의 [0], 물가~화면 아래의 [1]
  yaw: 0.42,          // 누운 방향 (라디안)
  SQ: 0.5,            // 모래 위를 내려다보는 정도 (모형 바닥이 납작한 정도)
  hit: 14,            // 누르는 둘레 (그림판 픽셀, 모형 크기 배)
  glint: 4.5,         // 유리가 반짝이는 간격 (초)
};
// 모형: 길이 L(가로) × 폭 D × 높이 D 칸. 병 몸통 반지름 R, 어깨·목·코르크
const L = 22, D = 9, C = (D - 1) / 2, R = 3.4;
const radius = u => u < 2 ? R - 0.8 : u < 13 ? R : u < 16 ? R - (u - 13) * 0.7 : u < 20 ? 1.4 : 1.6;
const GLASS = [86, 156, 128], CORK = [150, 108, 70], PAPER = [232, 220, 190];

function bake(Lgt) {
  const k = 0.35 + 0.65 * Lgt.lum, tint = mix([255, 255, 255], Lgt.light, 0.35);
  const slices = [];
  for (let z = 0; z < D; z++) {
    const cv = document.createElement('canvas');
    cv.width = L; cv.height = D;
    const c = cv.getContext('2d');
    for (let u = 0; u < L; u++) for (let v = 0; v < D; v++) {
      const dv = v - C, dz = z - C, d = Math.hypot(dv, dz), r = radius(u);
      if (d > r) continue;
      const cork = u >= 19, top = dz / Math.max(1, d), side = -dv / Math.max(1, d); // 위·앞쪽을 향한 정도
      let col = cork ? CORK : GLASS;
      if (!cork && u > 2 && u < 14 && Math.abs(dv) < 1.6 && dz > 1) col = mix(GLASS, PAPER, 0.45); // 유리 너머 말린 종이
      let shade = 0.55 + 0.35 * Math.max(0, top) + 0.15 * Math.max(0, side);
      if (u === 0 || u === 1) shade *= 0.8;            // 병 바닥
      let o = col.map((x, i) => x * shade * k * tint[i] / 255);
      if (!cork && dz > r * 0.6 && Math.abs(dv + 0.8) < 0.9 && u > 3 && u < 17) o = mix(o, [255, 252, 240], 0.55 * (0.4 + 0.6 * Lgt.lum)); // 반짝 결
      c.fillStyle = rgb(o, cork ? 1 : 0.92);
      c.fillRect(u, v, 1, 1);
    }
    slices.push(cv);
  }
  return slices;
}

export function makeBottle({ store, today, dev, reduce }) {
  const saved = store.get(BOTTLE.key, null);
  const done = !dev && saved && saved.day === today && saved.opened;
  let slices = null, bakedE = NaN, since = 0, landedAt = -1, gone = done, pos = null;
  const t0 = dev ? BOTTLE.wait - 3 : 0; // 미리보기: 3초 뒤
  return {
    get done() { return gone; },
    // 누를 수 있나 (모래 위에 멈춘 뒤)
    get ready() { return !gone && landedAt >= 0; },
    // 지금 진행 시간(초), 밀려온 물 정도 swash(0~1), 화면 배치
    draw(ctx, { W, H, ys, L: Lgt, t, dt, pan, wetAt }) {
      const k = Math.max(1, Math.floor(H / 260)), rx = Math.round(W / 2 + W * BOTTLE.at[0] - pan * 0.8), ry = Math.round(ys + (H - ys) * BOTTLE.at[1]);
      if (gone) { mark(ctx, rx, ry, k, Lgt); pos = null; return; }
      since += reduce ? 1e3 : dt;
      const s = since + t0 - BOTTLE.wait;
      if (s < 0) { pos = null; return; }
      if (!slices || Math.abs(bakedE - Lgt.e) > 0.02) { slices = bake(Lgt); bakedE = Lgt.e; }
      // 어디쯤: 물 위에서 물가로 → 모래 위로 → 쉼
      let x = rx, y = ry, yaw = BOTTLE.yaw, sink = 0, a = 1;
      const tt = reduce ? 1e9 : s;
      if (tt < BOTTLE.drift) {
        const q = tt / BOTTLE.drift;
        y = ys - 10 * k * (1 - q) ** 1.5 - 1;
        x = rx + (1 - q) * 18 * k;
        sink = 0.55 - 0.2 * q + 0.12 * Math.sin(t * 2.1);   // 반쯤 잠김
        yaw = BOTTLE.yaw + 0.5 * (1 - q) + 0.12 * Math.sin(t * 0.9);
        a = clamp01(tt / 1.5);
        y += Math.sin(t * 2.1) * k;
      } else if (tt < BOTTLE.drift + BOTTLE.land) {
        const q = (tt - BOTTLE.drift) / BOTTLE.land, e = 1 - (1 - q) ** 3;
        y = ys + (ry - ys) * e;
        sink = 0.35 * (1 - e);
        yaw = BOTTLE.yaw + 0.08 * (1 - e) * Math.sin(t * 3);
      } else {
        if (landedAt < 0) landedAt = t;
        const wet = wetAt ? wetAt(x, y) : 0;                 // 파도가 닿으면 살짝 흔들림
        yaw = BOTTLE.yaw + 0.06 * wet * Math.sin(t * 2.6);
      }
      pos = { x, y, k };
      if (tt >= BOTTLE.drift) shadow(ctx, x, y, k, Lgt);
      stack(ctx, slices, x, y, yaw, k, sink, a);
      // 유리의 반짝: 가끔 작은 십자 빛 — 눈길이 가게
      const g = (t % BOTTLE.glint) / BOTTLE.glint;
      if (g < 0.12 && !reduce) {
        const f = Math.sin(g / 0.12 * Math.PI), gx = Math.round(x - 3 * k), gy = Math.round(y - 5 * k);
        ctx.fillStyle = rgb(mix(Lgt.sun, [255, 255, 255], 0.7), 0.9 * f * (0.4 + 0.6 * Lgt.lum));
        ctx.fillRect(gx, gy, k, k);
        if (f > 0.5) { ctx.fillRect(gx - k, gy, k, k); ctx.fillRect(gx + k, gy, k, k); ctx.fillRect(gx, gy - k, k, k); ctx.fillRect(gx, gy + k, k, k); }
      }
    },
    // 그림판 픽셀 (lx, ly)가 병 위인가
    hit(lx, ly) {
      if (!pos || landedAt < 0) return false;
      return Math.hypot(lx - pos.x, (ly - pos.y) * 1.4) < BOTTLE.hit * pos.k;
    },
    // 열었음: 오늘은 끝
    open() {
      gone = true;
      if (dev) return;
      const s = store.get(BOTTLE.key, null) || {};
      store.set(BOTTLE.key, { ...s, day: today, opened: true });
    },
    get screenPos() { return pos; },
  };
}

// 판을 쌓아 그림: 바닥 판부터, 판마다 돌리고 납작하게(SQ) 한 칸씩 위로. sink: 물에 잠긴 비율(아래 판을 흐리게)
function stack(ctx, slices, x, y, yaw, k, sink, a) {
  const n = slices.length;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (let z = 0; z < n; z++) {
    const under = z < n * sink;
    ctx.globalAlpha = a * (under ? 0.35 : 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(Math.round(x), Math.round(y - (z - n * sink) * k * 0.8));
    ctx.scale(k, k * BOTTLE.SQ);
    ctx.rotate(yaw);
    ctx.drawImage(slices[z], -L / 2, -D / 2);
  }
  ctx.restore();
}
// 병 그림자 (해 반대쪽으로 조금)
function shadow(ctx, x, y, k, Lgt) {
  ctx.fillStyle = rgb(mix(Lgt.sand, Lgt.dark, 0.6), 0.35);
  for (let i = -9; i <= 9; i++) {
    const h = Math.round((1 - (i / 10) ** 2) * 2 * k);
    ctx.fillRect(Math.round(x + i * k + 2 * k), Math.round(y + 2 * k), k, h);
  }
}
// 병이 누웠던 자국: 모래가 살짝 눌린 길쭉한 홈
function mark(ctx, x, y, k, Lgt) {
  const dark = rgb(mix(Lgt.sand, Lgt.dark, 0.5), 0.6), lip = rgb(mix(Lgt.sand, Lgt.light, 0.5), 0.55);
  for (let i = -10; i <= 10; i++) {
    const yy = Math.round(y + i * k * Math.sin(BOTTLE.yaw) * BOTTLE.SQ), xx = Math.round(x + i * k * Math.cos(BOTTLE.yaw));
    const w = Math.max(1, Math.round((1 - (i / 11) ** 2) * 2.4 * k));
    ctx.fillStyle = dark;
    ctx.fillRect(xx, yy - w + 1, k, w);
    if (hash(i, 3) > 0.4) { ctx.fillStyle = lip; ctx.fillRect(xx, yy + 1, k, 1); }
  }
}
