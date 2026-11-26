/* 해변 그림 두 겹과 먼 것들 (BEACH_PLAN.md 4장, tasks/beach-1-scene.md)
   - bg-far: 왼쪽 곶, 먼 작은 섬들 (384×22). bg-near: 왼쪽 바위·갯풀, 오른쪽 유목·갯풀, 가운데 빔 (384×62)
     주인이 ChatGPT로 그린 것을 2px 격자로 줄인 것 (assets/briefs/BEACH_BG_ART.md). 색 없이 명암만 → 시간대 빛깔로 다시 칠함
     · 먼 겹은 수평선 빛깔로 조금 흐리게(HAZE)
   - 좁은 화면: 가까운 겹을 두 쪽으로 갈라 안쪽으로 당김 — 바위와 유목이 화면 양옆에 걸리게 (NEAR_EDGE)
   - 해넘이 때만: 수평선의 먼 작은 배(어두워지면 작은 불빛), 먼 갈매기 */
import { mix, rgb, clamp01, hash } from './sky.js';

export const HAZE = 0.32;       // 먼 겹을 수평선 빛깔로 흐리는 정도
export const NEAR_EDGE = 0.2;   // 좁은 화면에서 가까운 겹의 바위·유목 안쪽 끝이 화면 폭의 이 비율까지 들어오게
const NEAR_INNER = [107, 276];  // 가까운 겹 그림에서 왼쪽 바위가 끝나는 x, 오른쪽 유목이 시작하는 x
export const BOAT = { u: 0.6, drift: 0.025, show: [0.02, 1] }; // 배: 먼 겹 폭의 비율 자리, 3분 동안 옆으로 가는 양, 보이는 진행 구간
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
  return {
    far, near,
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
