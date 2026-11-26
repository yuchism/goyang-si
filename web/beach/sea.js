/* 바다와 모래 (BEACH_PLAN.md 4장, tasks/beach-1-scene.md)
   - 바다(지평선 y0 ~ 물가 ys): 수평선 쪽은 하늘빛을 비추고 가까울수록 깊은 물빛. 옆으로 흐르는 잔물결
   - 해 아래 햇빛 길: 해가 낮을수록 길고 진하게, 반짝이는 조각. 해가 지면 사라지고 밤엔 별빛 몇 점
   - 파도: 먼바다에서 다가오는 물결 마루(WAVE.lines) → 물가에서 모래 위로 밀려왔다 빠지는 얇은 물(swash)과 거품 테
   - 모래: 젖은 띠(하늘빛·햇빛이 비침) → 마른 모래(점 무늬). 모래 무늬는 빛깔이 바뀔 때만 다시 그림 */
import { mix, rgb, clamp01, hash, vnoise, dither } from './sky.js';

export const WAVE = {
  period: 8.5,     // 밀려왔다 빠지는 한 번 (초)
  lines: 3,        // 먼바다에서 다가오는 물결 마루 수
  reach: 0.3,      // 밀려오는 높이: 물가~화면 아래의 이 비율
  wet: 0.36,       // 젖은 모래 띠 높이 (같은 비율)
};

// 햇빛 길 둘레의 번진 빛 그림판 (폭 = 물가에서 가장 넓은 폭)
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
function makeSheen(W, sH, sunR, col, glare) {
  const hw = Math.ceil(sunR * 11), cv = document.createElement('canvas');
  cv.width = hw * 2;
  cv.height = Math.max(1, sH - 1);
  const c = cv.getContext('2d'), img = c.createImageData(cv.width, cv.height), px = img.data;
  for (let y = 0; y < cv.height; y++) {
    const d = y / sH, sw = sunR * (1.5 + d * 8);
    for (let x = 0; x < cv.width; x++) {
      const dx = (x - hw) / sw, a = glare * 0.22 * (1 - d * 0.45) * Math.exp(-dx * dx * 1.6);
      const q = Math.floor(a * 40 + BAY[(y & 3) * 4 + (x & 3)]) / 40; // 점 무늬로 단계
      if (q <= 0) continue;
      const o = (y * cv.width + x) * 4;
      px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = q * 255;
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

export function makeSea() {
  let sandCv = null, sandKey = '', sheen = null, sheenKey = '';
  const ripples = Array.from({ length: 160 }, (_, i) => ({ u: hash(i, 1.3), d: hash(i, 2.9) ** 0.8, l: 1 + Math.floor(hash(i, 4.1) * 4), p: hash(i, 6.7) * 6.3, light: hash(i, 8.3) < 0.55 }));

  // 밀려온 정도 0~1: 빨리 올라왔다 천천히 빠짐. n번째 파도마다 높이가 조금씩 다름
  const swash = t => {
    const n = Math.floor(t / WAVE.period), k = (t / WAVE.period) % 1;
    const up = k < 0.28 ? Math.sin(k / 0.28 * Math.PI / 2) : Math.cos((k - 0.28) / 0.72 * Math.PI / 2) ** 1.6;
    return { k, n, v: up * (0.65 + 0.35 * hash(n, 3)) };
  };

  return {
    // 모래 그림판(물가 아래 전체) — 빛깔이 바뀔 때
    paintSand(W, H, ys, L) {
      const h = H - ys, key = W + 'x' + h;
      if (!sandCv || sandKey !== key) { sandCv = document.createElement('canvas'); sandCv.width = W; sandCv.height = h; sandKey = key; }
      const c = sandCv.getContext('2d'), img = c.createImageData(W, h), d = img.data, wetH = h * WAVE.wet;
      const wet = mix(mix(L.sand, L.sea, 0.55), L.hor, 0.12), dry = L.sand, far = mix(L.sand, L.hor, 0.15);
      for (let y = 0; y < h; y++) {
        const k = y / h, base = y < wetH ? mix(wet, mix(far, dry, k), (y / wetH) ** 2.2) : mix(far, mix(dry, L.dark, 0.25), (k - WAVE.wet) / (1 - WAVE.wet));
        for (let x = 0; x < W; x++) {
          const s = hash(x, y + 91), sp = s < 0.06 ? -14 : s > 0.96 ? 10 : 0, o = (y * W + x) * 4;
          const ln = vnoise(x * 0.05, y * 0.5) * 8 - 4; // 바람 결
          d[o] = dither(base[0] + sp + ln, x, y); d[o + 1] = dither(base[1] + sp + ln, x, y); d[o + 2] = dither(base[2] + sp * 0.8 + ln, x, y); d[o + 3] = 255;
        }
      }
      c.putImageData(img, 0, 0);
    },
    // sx: 해의 x, sunR: 해 반지름, pan: 고개 돌린 양(물결이 따라 지나감)
    draw(ctx, { W, H, y0, ys, sx, sunR, L, t, pan }) {
      const sH = ys - y0, sunUp = clamp01((L.e + 0.05) / 0.08);
      // 바다 줄
      for (let y = y0 + 1; y < ys; y++) {
        const d = (y - y0) / sH, c = mix(mix(L.hor, L.mid, 0.35), L.sea, Math.min(1, d ** 0.55 * 1.05));
        ctx.fillStyle = rgb(c);
        ctx.fillRect(0, y, W, 1);
      }
      ctx.fillStyle = rgb(mix(L.hor, [255, 255, 255], 0.2), 0.5);
      ctx.fillRect(0, y0, W, 1);
      // 잔물결
      for (const r of ripples) {
        const P = W * (1.4 + r.d), x = Math.round((((r.u * P - pan * (0.5 + 0.6 * r.d) + t * (0.8 + r.d * 1.5)) % P) + P) % P - (P - W) / 2);
        if (x < -6 || x > W) continue;
        const y = Math.round(y0 + 1 + r.d * (sH - 2)), a = (0.5 + 0.5 * Math.sin(t * 1.3 + r.p)) * (0.25 + 0.3 * r.d);
        ctx.fillStyle = rgb(r.light ? mix(L.mid, L.hor, 0.5) : mix(L.sea, L.dark, 0.5), a);
        ctx.fillRect(x, y, Math.round(r.l * (0.6 + r.d * 1.6)), 1);
      }
      // 햇빛 길: ① 물 위에 넓게 번진 은은한 빛 ② 해 바로 아래 이어진 빛기둥(가로로 끊긴 밝은 결) ③ 가장자리 반짝이 조각
      const glare = sunUp * (1 - clamp01((L.e - 0.12) / 0.3) * 0.5);
      if (glare > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        // ① 번진 빛: 가운데서 옆으로 부드럽게 옅어짐 (점 무늬로 단계), 빛깔이 바뀔 때만 다시 그림
        const key = [W, sH, sunR, glare.toFixed(2), L.glow.map(Math.round)].join();
        if (key !== sheenKey) { sheen = makeSheen(W, sH, sunR, mix(L.glow, L.sun, 0.5), glare); sheenKey = key; }
        ctx.drawImage(sheen, Math.round(sx - sheen.width / 2), y0 + 1);
        const low = 1 - clamp01(L.e / 0.25); // 해가 낮을수록 빛기둥이 진하고 길게
        for (let y = y0 + 1; y < ys; y++) {
          const d = (y - y0) / sH;
          // ② 빛기둥: 줄마다 가운데 쪽 긴 결 하나, 물결 따라 끊기고 흔들림
          const cw = sunR * (0.55 + d * 1.6), wob = Math.sin(y * 0.9 + t * 1.7) * (0.6 + d * 1.5);
          const on = vnoise(y * 0.45, t * 0.9) > 0.32 - low * 0.12;
          if (on) {
            const len = Math.max(1, Math.round(cw * (0.7 + 0.8 * vnoise(y * 0.7 + 5, t * 1.3)))), x = Math.round(sx + wob - len / 2);
            const k = glare * (0.22 + 0.4 * low) * (1 - d * 0.55);
            ctx.fillStyle = rgb(mix(L.sun, [255, 246, 224], 0.5), k);
            ctx.fillRect(x, y, len, 1);
          }
        }
        // 수평선 바로 아래 해의 납작한 그림자 (해가 낮을 때)
        if (L.e < 0.12) {
          const k = glare * clamp01((0.12 - L.e) / 0.1);
          for (let i = 0; i < 3; i++) {
            const hw = Math.round(sunR * (0.9 - i * 0.22));
            ctx.fillStyle = rgb(mix(L.sun, [255, 240, 210], 0.4), k * 0.45);
            ctx.fillRect(sx - hw, y0 + 1 + i, hw * 2 + 1, 1);
          }
        }
        for (let y = y0 + 1; y < ys; y++) {
          const d = (y - y0) / sH, hw = (sunR * (0.5 + d * 3.2) + Math.sin(y * 1.7 + t * 2) * (1 + d * 2)) * (0.8 + 0.4 * hash(y, Math.floor(t * 1.5)));
          const n = Math.ceil(hw * 0.7);
          for (let i = 0; i < n; i++) {
            const h = hash(y * 13 + i, Math.floor(t * 3 + i * 0.37 + y * 0.11));
            if (h < 0.42) continue;
            const x = Math.round(sx + (hash(i, y) * 2 - 1) * hw), a = glare * (0.18 + 0.5 * (h - 0.42)) * (1 - d * 0.35);
            ctx.fillStyle = rgb(L.sun, a);
            ctx.fillRect(x, y, 1 + Math.round(d * 3 * hash(y, i)), 1);
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      // 밤: 별빛 몇 점
      if (L.stars > 0.3) {
        for (let i = 0; i < 26; i++) {
          const a = L.stars * 0.35 * Math.max(0, Math.sin(t * (0.6 + hash(i, 3)) + i * 1.9));
          if (a < 0.04) continue;
          ctx.fillStyle = `rgba(190,200,235,${a.toFixed(3)})`;
          ctx.fillRect(Math.round(hash(i, 5) * W), Math.round(y0 + 1 + hash(i, 8) ** 1.5 * sH * 0.9), 1, 1);
        }
      }
      // 다가오는 물결 마루: 밝은 거품 조각(위아래로 한 칸씩 흔들림) + 그 아래 물 앞면의 옅은 그늘
      const foam = mix(mix(L.light, [236, 240, 248], 0.45), L.hor, 0.15), face = mix(L.sea, L.dark, 0.45);
      for (let k = 0; k < WAVE.lines; k++) {
        const ph = ((t / WAVE.period + k / WAVE.lines) % 1), y = Math.round(y0 + (0.5 + 0.5 * ph ** 1.3) * sH);
        if (y >= ys - 1) continue;
        const a = Math.sin(ph * Math.PI) * (0.2 + 0.45 * ph) * (0.45 + 0.55 * L.lum), seed = Math.floor(t / WAVE.period + k / WAVE.lines) * 7 + k;
        for (let x = 0; x < W; x++) {
          const n = vnoise((x + pan * 0.8) * 0.035 + seed * 13, ph * 1.5);
          if (n < 0.66 - ph * 0.2) continue;
          const dy = vnoise(x * 0.12, seed) > 0.5 ? 1 : 0;
          ctx.fillStyle = rgb(face, a * 0.6);
          ctx.fillRect(x, y + dy + 1, 1, 1);
          if (hash(x, seed) > 0.2) { ctx.fillStyle = rgb(foam, a * (0.6 + 0.4 * n)); ctx.fillRect(x, y + dy, 1, 1); }
        }
      }
      // 물가 가까운 얕은 물: 하늘빛이 밝게 비침
      for (let i = 0; i < 4; i++) { ctx.fillStyle = rgb(mix(L.sea, L.hor, 0.4), 0.12 * (4 - i)); ctx.fillRect(0, ys - 1 - i, W, 1); }
      // 모래
      if (sandCv) ctx.drawImage(sandCv, 0, ys);
      // 젖은 모래에 비친 해 (흐릿한 세로 빛)
      const wetH = (H - ys) * WAVE.wet;
      if (sunUp > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        for (let y = ys; y < ys + wetH; y++) {
          const k = (y - ys) / wetH, a = sunUp * 0.07 * (1 - k) ** 1.5;
          for (let j = 1; j <= 3; j++) { // 가운데가 진하고 가장자리로 옅게 — 들쭉날쭉한 끝
            const hw = sunR * (0.5 + k * 1.6) * j * (0.85 + 0.3 * hash(y, j));
            ctx.fillStyle = rgb(L.sun, a);
            ctx.fillRect(Math.round(sx - hw), y, Math.round(hw * 2), 1);
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      // 밀려왔다 빠지는 얇은 물 + 거품 테
      const s = swash(t), reach = (H - ys) * WAVE.reach, sheet = mix(mix(L.sea, L.hor, 0.5), L.light, 0.2);
      const fa = (s.k < 0.28 ? 0.85 : 0.85 * (1 - (s.k - 0.28) / 0.72)) * (0.55 + 0.45 * L.lum);
      for (let x = 0; x < W; x++) {
        const wob = 0.75 + 0.5 * vnoise((x + pan) * 0.025, s.n * 3.1), edge = ys + Math.round(s.v * reach * wob);
        if (edge > ys) {
          ctx.fillStyle = rgb(sheet, 0.7 - 0.25 * s.k);
          ctx.fillRect(x, ys, 1, edge - ys);
        }
        if (fa > 0.03 && hash(x, s.n) > 0.12) { ctx.fillStyle = rgb(foam, fa); ctx.fillRect(x, edge - 1, 1, hash(x, s.n + 1) > 0.5 ? 2 : 1); }
        if (s.k > 0.35 && hash(x * 3, s.n) > 0.6) { ctx.fillStyle = rgb(foam, fa * 0.5); ctx.fillRect(x, edge - 2, 1, 1); } // 빠지며 남는 거품 점
      }
      // 물가 거품 (늘 있는 얇은 띠)
      for (let x = 0; x < W; x++) {
        const a = 0.25 + 0.25 * Math.sin(x * 0.7 + t * 1.6 + vnoise(x * 0.1, t * 0.3) * 4);
        if (a > 0.3) { ctx.fillStyle = rgb(foam, a * (0.4 + 0.6 * L.lum)); ctx.fillRect(x, ys, 1, 1); }
      }
    },
  };
}
