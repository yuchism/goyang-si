/* 해변 하늘: 3분 동안의 해 높이, 그 높이의 빛깔, 하늘 그림 (BEACH_PLAN.md 3·4장, tasks/beach-1-scene.md)
   - 해 높이 e: 수평선 = 0, 위 +, 아래 -. 진행 p(0~1)에 따라 COURSE의 마디를 부드럽게 이음
     · 해넘이(set): 금빛 → 해가 수평선에 → 분홍·푸른 땅거미 → 첫 별 → 별 뜬 밤바다에 머묾
     · 해돋이(rise): 어둠 → 푸른 새벽 → 분홍 → 해가 떠오름 → 아침 빛에 머묾
   - 빛깔은 해 높이마다 정한 마디(LIGHT)를 섞음. 받은 그림(명암만)은 이 빛깔의 dark~light로 다시 칠함(scenery.js)
   - 하늘 그림: 세 색 그라데이션 + 해 둘레 노을 + 얇은 구름 띠. 픽셀아트라 4×4 점 무늬로 색 단계를 나눔 */
export const MINUTES = 3;            // 해돋이·해넘이 길이 (회의 2026-11-26 — "요즘 분들은 참을성이 없어서")
export const SUN = {
  u: 0.44,                           // 해 자리: 먼 겹 그림 폭의 이 비율 (곶과 섬 사이 빈 수평선)
  r: 0.032,                          // 해 반지름 (화면 높이 비율)
  lift: 0.62,                        // 해 높이 1 = 하늘 높이(지평선까지)의 이 비율
};
export const COURSE = {
  set: [[0, 0.2], [0.3, 0.04], [0.46, -0.04], [0.72, -0.3], [1, -0.62]],
  rise: [[0, -0.62], [0.28, -0.3], [0.54, -0.04], [0.7, 0.05], [1, 0.24]],
};
// 해 높이별 빛깔: top·mid·hor 하늘, glow 해 둘레 노을, sea 깊은 물, sand 모래, dark·light 그림 그늘·밝은 면, sun 해, stars 별 진하기, lum 밝기(0 밤~1 낮)
export const LIGHT = [
  { e: -0.62, top: '#020308', mid: '#070b1d', hor: '#161a36', glow: '#181a3a', sea: '#070a17', sand: '#191a26', dark: '#04050b', light: '#242a40', sun: '#000000', stars: 1, lum: 0.06 },
  { e: -0.3, top: '#050819', mid: '#141c42', hor: '#373a6a', glow: '#3e3a6e', sea: '#0b1029', sand: '#2b2a3e', dark: '#080a17', light: '#3b4163', sun: '#000000', stars: 0.55, lum: 0.2 },
  { e: -0.12, top: '#10173a', mid: '#38356a', hor: '#b06676', glow: '#d0707a', sea: '#1f2047', sand: '#54465a', dark: '#121227', light: '#665876', sun: '#ff6a40', stars: 0.12, lum: 0.36 },
  { e: -0.02, top: '#1b2756', mid: '#7c5282', hor: '#f4804e', glow: '#ff9050', sea: '#3a2c52', sand: '#836056', dark: '#1e182d', light: '#ab7872', sun: '#ff7a3c', stars: 0, lum: 0.52 },
  { e: 0.1, top: '#2a4682', mid: '#b47a82', hor: '#ffae62', glow: '#ffc070', sea: '#4c4a72', sand: '#b88a6c', dark: '#2a2840', light: '#dca482', sun: '#ffc46c', stars: 0, lum: 0.72 },
  { e: 0.32, top: '#3768ac', mid: '#86aed6', hor: '#f0d4aa', glow: '#fff0c8', sea: '#3c5c86', sand: '#d4bc9c', dark: '#363d56', light: '#c4c2c8', sun: '#fff4d8', stars: 0, lum: 1 },
];

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const LIGHT_RGB = LIGHT.map(k => Object.fromEntries(Object.entries(k).map(([n, v]) => [n, typeof v === 'string' ? hex(v) : v])));
export const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const rgb = (c, a = 1) => a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
const smooth = k => k * k * (3 - 2 * k);
export const clamp01 = v => Math.max(0, Math.min(1, v));

// 진행 p → 해 높이
export function sunHeight(mode, p) {
  const C = COURSE[mode];
  for (let i = 1; i < C.length; i++) if (p <= C[i][0]) {
    const [a, ea] = C[i - 1], [b, eb] = C[i];
    return ea + (eb - ea) * smooth((p - a) / (b - a));
  }
  return C[C.length - 1][1];
}
// 해 높이 → 빛깔 (각 색은 [r,g,b])
export function lightAt(e) {
  const L = LIGHT_RGB;
  if (e <= L[0].e) return L[0];
  for (let i = 1; i < L.length; i++) if (e <= L[i].e) {
    const a = L[i - 1], b = L[i], k = (e - a.e) / (b.e - a.e), o = {};
    for (const n in a) o[n] = Array.isArray(a[n]) ? mix(a[n], b[n], k) : a[n] + (b[n] - a[n]) * k;
    o.e = e;
    return o;
  }
  return L[L.length - 1];
}

const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
export const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};
export { hash };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.5);
export const STEP = 7; // 색 단계 (픽셀아트 띠)
export const dither = (v, x, y) => Math.max(0, Math.min(255, Math.round((v + BAYER[(y & 3) * 4 + (x & 3)] * STEP) / STEP) * STEP));

// 하늘 그림판: 폭 w, 높이 h(지평선까지), 해 자리 sx. 모양(구름·노을 무게)은 크기가 바뀔 때만, 색은 paint(light)마다
export function makeSkyCanvas(w, h, sx) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d'), img = c.createImageData(w, h), d = img.data;
  const glow = new Float32Array(w * h), cloud = new Float32Array(w * h), sxs = Math.max(20, w * 0.22), sys = Math.max(8, h * 0.32);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, dx = (x - sx) / sxs, dy = (h - y) / sys;
    glow[i] = Math.exp(-dx * dx - dy * dy) * 0.85 + Math.exp(-dy * dy * 0.35) * 0.15;
    // 얇은 구름 띠: 하늘 가운데쯤, 옆으로 길게
    const band = Math.exp(-((((y / h) - 0.62) / 0.16) ** 2)), n = vnoise(x * 0.018, y * 0.28) * 0.7 + vnoise(x * 0.06, y * 0.6) * 0.3;
    cloud[i] = Math.max(0, Math.min(1, (n - 0.58) * 4)) * band;
  }
  return {
    canvas: cv,
    paint(L) {
      const lit = clamp01((L.e + 0.2) / 0.3) * clamp01((0.36 - L.e) / 0.3); // 구름 밑이 노을에 물드는 정도 (해가 낮을 때)
      const cloudLit = mix(L.glow, [255, 236, 220], 0.25), cloudDark = mix(L.mid, L.top, 0.35);
      for (let y = 0; y < h; y++) {
        const k = y / h, base = k < 0.55 ? mix(L.top, L.mid, smooth(k / 0.55)) : mix(L.mid, L.hor, smooth((k - 0.55) / 0.45) ** 1.3);
        for (let x = 0; x < w; x++) {
          const i = y * w + x, g = glow[i], cl = cloud[i];
          let r = base[0] + (L.glow[0] - base[0]) * g * 0.75, gg = base[1] + (L.glow[1] - base[1]) * g * 0.75, b = base[2] + (L.glow[2] - base[2]) * g * 0.75;
          if (cl > 0) {
            const cc = mix(cloudDark, cloudLit, lit * (0.35 + 0.65 * g)), a = cl * 0.8;
            r += (cc[0] - r) * a; gg += (cc[1] - gg) * a; b += (cc[2] - b) * a;
          }
          const o = i * 4;
          d[o] = dither(r, x, y); d[o + 1] = dither(gg, x, y); d[o + 2] = dither(b, x, y); d[o + 3] = 255;
        }
      }
      c.putImageData(img, 0, 0);
    },
  };
}
