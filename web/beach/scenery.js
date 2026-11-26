/* 해변 그림 두 겹과 먼 것들 (BEACH_PLAN.md 4장, tasks/beach-1-scene.md)
   - bg-far: 왼쪽 곶, 먼 작은 섬들 (384×22). bg-near: 왼쪽 바위·갯풀, 오른쪽 유목·갯풀, 가운데 빔 (384×62)
     주인이 ChatGPT로 그린 것을 2px 격자로 줄인 것 (assets/briefs/BEACH_BG_ART.md). 색 없이 명암만 → 시간대 빛깔로 다시 칠함
     · 먼 겹은 수평선 빛깔로 조금 흐리게(HAZE)
   - 좁은 화면: 가까운 겹을 두 쪽으로 갈라 안쪽으로 당김 — 바위와 유목이 화면 양옆에 걸리게 (NEAR_EDGE)
   - 해넘이 때만: 수평선의 먼 작은 배(어두워지면 작은 불빛), 먼 갈매기
   - 해넘이 때 가끔: 먼바다에 돌고래가 아주 살짝 솟았다 들어감(DOLPHIN, 주인 2026-11-26·27) */
import { mix, rgb, clamp01, hash } from './sky.js';

export const HAZE = 0.32;       // 먼 겹을 수평선 빛깔로 흐리는 정도
export const NEAR_EDGE = 0.2;   // 좁은 화면에서 가까운 겹의 바위·유목 안쪽 끝이 화면 폭의 이 비율까지 들어오게
const NEAR_INNER = [107, 276];  // 가까운 겹 그림에서 왼쪽 바위가 끝나는 x, 오른쪽 유목이 시작하는 x
export const BOAT = { u: 0.6, drift: 0.025, show: [0.02, 1] }; // 배: 먼 겹 폭의 비율 자리, 3분 동안 옆으로 가는 양, 보이는 진행 구간
// 돌고래: 먼바다에서 가끔 아주 살짝 물 위로 둥글게 솟았다 들어감 (주인 2026-11-26). 한 번에 한두 마리가 잇따라
export const DOLPHIN = {
  every: [26, 55],   // 다음 돌고래까지 (초)
  depth: [0.1, 0.38],// 바다 깊이(수평선 0 ~ 물가 1) 중 나오는 자리
  dur: 1.7,          // 한 번 솟았다 들어가는 시간 (초)
  pair: 0.45,        // 한 마리 더 뒤따를 확률
  until: 0.72,       // 해넘이 때만, 이 진행까지 (땅거미가 짙어지면 그만) — 주인 2026-11-27
};
export const GULLS = { n: 3, show: [0.04, 0.62], speed: 2.2 }; // 갈매기 수, 보이는 진행 구간, 빠르기(픽셀/초)

// 가까운 겹 배율: 좁고 긴 화면(폰)에선 먼 겹보다 크게 — 가까이 있는 것이라 굵은 픽셀이어도 어울림
const nearScale = (AS, H) => Math.max(AS, Math.floor(H / 200));
const img = src => { const i = new Image(); i.src = src; return i; };
const ready = i => i.complete && i.naturalWidth > 0;

// 명암 그림 → 빛깔 칠한 그림판 (dark~light, haze만큼 hor로)
function tinter(src) {
  const im = img(src);
  let cv = null, lum = null, lo = 0, hi = 1;
  const prep = () => {
    cv = document.createElement('canvas');
    cv.width = im.naturalWidth;
    cv.height = im.naturalHeight;
    const c = cv.getContext('2d');
    c.drawImage(im, 0, 0);
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    lum = new Float32Array(cv.width * cv.height);
    lo = 255; hi = 0;
    for (let i = 0; i < lum.length; i++) {
      if (d[i * 4 + 3] < 128) { lum[i] = -1; continue; }
      const l = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.55 + d[i * 4 + 2] * 0.15;
      lum[i] = l; lo = Math.min(lo, l); hi = Math.max(hi, l);
    }
  };
  return {
    get ready() { return ready(im); },
    get w() { return im.naturalWidth; },
    get h() { return im.naturalHeight; },
    canvas: () => cv,
    paint(dark, light, haze, hor) {
      if (!ready(im)) return false;
      if (!cv) prep();
      const c = cv.getContext('2d'), out = c.createImageData(cv.width, cv.height), d = out.data;
      for (let i = 0; i < lum.length; i++) {
        if (lum[i] < 0) continue;
        let col = mix(dark, light, (lum[i] - lo) / Math.max(1, hi - lo));
        if (haze) col = mix(col, hor, haze);
        d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
      }
      c.putImageData(out, 0, 0);
      return true;
    },
  };
}

// 작은 그림들 (# = 몸, o = 불빛)
const BOAT_PX = ['   #   ', '   ##  ', '   ### ', '#######', ' ##### '];
const GULL_PX = [['#   #', ' # # ', '  #  '], ['     ', '## ##', '  #  ']];

export function makeScenery() {
  const far = tinter('bg-far-v1.png'), near = tinter('bg-near-v1.png');
  let painted = false;
  const gulls = Array.from({ length: GULLS.n }, (_, i) => ({ x0: hash(i, 2) * 1.4 - 0.2, y: 0.22 + hash(i, 5) * 0.3, dir: hash(i, 9) < 0.5 ? -1 : 1, ph: hash(i, 7) * 6, sp: 0.6 + hash(i, 3) * 0.7 }));
  // 돌고래 차례: 시작 시각·자리. 진행 시간 t로 정함(같은 t면 같은 모습)
  let nextD = DOLPHIN.every[0] * 0.6, jumps = [];
  const dolphins = (ctx, W, y0, ys, L, t, pan) => {
    if (t >= nextD) {
      const u = 0.12 + Math.random() * 0.76, d = DOLPHIN.depth[0] + Math.random() * (DOLPHIN.depth[1] - DOLPHIN.depth[0]), dir = Math.random() < 0.5 ? -1 : 1;
      jumps.push({ t0: t, u, d, dir });
      if (Math.random() < DOLPHIN.pair) jumps.push({ t0: t + 0.55 + Math.random() * 0.4, u: u - dir * 0.012, d: d + 0.01, dir });
      nextD = t + DOLPHIN.every[0] + Math.random() * (DOLPHIN.every[1] - DOLPHIN.every[0]);
    }
    jumps = jumps.filter(j => t - j.t0 < DOLPHIN.dur + 1.2);
    const body = mix(mix(L.dark, L.sea, 0.35), L.hor, 0.12), rim = mix(L.light, L.hor, 0.5), foam = mix(L.light, [240, 244, 250], 0.4);
    for (const j of jumps) {
      const q = (t - j.t0) / DOLPHIN.dur;
      if (q < 0) continue;
      const w = Math.round(y0 + j.d * (ys - y0)), span = 12 + j.d * 22, h = 3 + j.d * 7;
      const x0 = W * j.u - pan * 0.45 - j.dir * span / 2;
      const at = u => [x0 + j.dir * u * span, w - h * 4 * u * (1 - u)];
      // 몸: 머리(ph)에서 꼬리 쪽으로 이어진 점들, 물 위인 것만
      // 몸: 머리에서 꼬리 쪽으로 이어진 점들(가운데가 두 칸 굵게), 물 위인 것만. 등지느러미 하나, 꼬리 끝은 갈라짐
      const n = Math.round(span * 0.55), step = 1 / span;
      if (q <= 1.4) for (let k = 0; k <= n; k++) {
        const u = q - k * step;
        if (u < 0 || u > 1) continue;
        const [x, y] = at(u), px = Math.round(x), py = Math.round(y);
        if (py >= w) continue;
        const thick = k > 1 && k < n - 2 ? 2 : 1;
        ctx.fillStyle = rgb(body, 0.95);
        ctx.fillRect(px, py, 1, thick);
        if (k === Math.round(n * 0.45)) ctx.fillRect(px, py - 1, 1, 1), ctx.fillRect(px - j.dir, py - 2, 1, 1); // 등지느러미
        if (k === n) ctx.fillRect(px - j.dir, py - 1, 1, 1), ctx.fillRect(px - j.dir, py + 1, 1, 1);       // 꼬리
        if (k > 0 && k < n * 0.6 && L.lum > 0.3) { ctx.fillStyle = rgb(rim, 0.45 * L.lum); ctx.fillRect(px, py - 1, 1, 1); }
      }
      // 물보라: 솟을 때와 들어갈 때
      for (const [s, u] of [[q, 0], [q - 1, 1]]) {
        if (s < 0 || s > 0.35) continue;
        const [x] = at(u), a = (1 - s / 0.35) * (0.4 + 0.5 * L.lum);
        ctx.fillStyle = rgb(foam, a);
        ctx.fillRect(Math.round(x) - 1, w - 1, 3, 1);
        if (s < 0.15) ctx.fillRect(Math.round(x), w - 2, 1, 1);
      }
    }
  };
  return {
    far, near,
    drawDolphins: dolphins,
    paint(L) {
      const a = far.paint(L.dark, L.light, HAZE, L.hor), b = near.paint(L.dark, mix(L.light, L.dark, 0.15), 0, null);
      painted = a && b;
      return painted;
    },
    get painted() { return painted; },
    // 먼 겹: 밑변 = 지평선 y0, 가운데 = fx
    drawFar(ctx, fx, y0, AS) {
      const cv = far.canvas();
      if (!cv) return;
      ctx.drawImage(cv, Math.round(fx - cv.width * AS / 2), y0 + 1 - cv.height * AS, cv.width * AS, cv.height * AS);
    },
    // 가까운 겹: 밑변 = 화면 아래, 가운데 = nx. 좁으면 두 쪽을 안쪽으로 당김
    drawNear(ctx, nx, H, AS, W) {
      const cv = near.canvas();
      AS = nearScale(AS, H);
      if (!cv) return;
      const half = cv.width / 2, w = cv.width * AS, h = cv.height * AS, y = H - h;
      const inner = (half - NEAR_INNER[0]) * AS, shift = Math.max(0, W * NEAR_EDGE - (W / 2 - inner));
      ctx.drawImage(cv, 0, 0, half, cv.height, Math.round(nx - w / 2 + shift), y, half * AS, h);
      ctx.drawImage(cv, half, 0, half, cv.height, Math.round(nx - shift), y, half * AS, h);
    },
    // 가까운 겹을 당긴 만큼 — 고개를 돌릴 수 있는 폭을 셈 (그림 끝이 보이지 않게)
    nearSlack(W, AS, H) {
      if (!near.ready) return 0;
      AS = nearScale(AS, H);
      const half = near.w / 2, inner = (half - NEAR_INNER[0]) * AS, shift = Math.max(0, W * NEAR_EDGE - (W / 2 - inner));
      return Math.max(0, half * AS - shift - W / 2);
    },
    // 배: 수평선 위 fx(먼 겹 가운데) 기준. 어두워지면 작은 불빛
    drawBoat(ctx, fx, y0, AS, p, L, t, mode) {
      if (mode !== 'set' || p < BOAT.show[0]) return;
      const fade = clamp01((p - BOAT.show[0]) / 0.05);
      const x = Math.round(fx + (BOAT.u - 0.5 + BOAT.drift * p) * far.w * AS), y = y0 + 1 - BOAT_PX.length;
      ctx.fillStyle = rgb(mix(L.dark, L.hor, 0.25), fade);
      BOAT_PX.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') ctx.fillRect(x + i, y + j, 1, 1); });
      const lamp = clamp01((-0.08 - L.e) / 0.12);
      if (lamp > 0) {
        ctx.fillStyle = `rgba(255,214,140,${(lamp * fade * (0.75 + 0.25 * Math.sin(t * 1.3))).toFixed(3)})`;
        ctx.fillRect(x + 3, y - 1, 1, 1);
        ctx.fillStyle = `rgba(255,200,120,${(lamp * fade * 0.18).toFixed(3)})`; // 물에 비친 불빛
        ctx.fillRect(x + 3, y0 + 2, 1, 2);
      }
    },
    // 갈매기: 하늘 높이 y0의 y비율에서 천천히 가로지름, 두 장 날갯짓
    drawGulls(ctx, W, y0, p, L, t, mode) {
      if (mode !== 'set' || p < GULLS.show[0] || p > GULLS.show[1]) return;
      const fade = Math.min(clamp01((p - GULLS.show[0]) / 0.05), clamp01((GULLS.show[1] - p) / 0.08));
      ctx.fillStyle = rgb(mix(L.dark, L.mid, 0.3), 0.85 * fade);
      for (const g of gulls) {
        const span = W + 20, x = Math.round((((g.x0 * span + g.dir * t * GULLS.speed * g.sp) % span) + span) % span - 10);
        const y = Math.round(y0 * g.y + Math.sin(t * 0.5 + g.ph) * 2), f = GULL_PX[Math.floor(t * 2.2 * g.sp + g.ph) % 2];
        f.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') ctx.fillRect(x + i, y + j, 1, 1); });
      }
    },
  };
}
