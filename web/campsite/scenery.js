/* 캠핑장 먼 풍경 (CAMPSITE_PLAN.md 3장, tasks/campsite-2-scene.md)
   불을 가운데 두고 360도. 방향은 FRONT(호수, 처음 보이는 쪽)에서 오른쪽으로 잰 각(rel, 라디안)으로 정한다.
   - 앞(rel 0): 호수, 그 너머 V자 골짜기와 눈 덮인 먼 봉우리. 물에 하늘·산·달·별이 비치고 잔물결에 흔들림
   - 오른쪽: 풀 언덕 / 왼쪽: 가파른 산벽 / 뒤: 침엽수 숲. 숲에서 흘러나와 풀밭을 지나 호수로 드는 가는 개울
   - 하늘: 반짝이는 별, 호수 위 오늘의 달(위상은 날짜, 남·북반구 모양은 방문자 시간대)
   능선·물·개울은 글자 칸마다 방향(ascii3d drawBackdrop)으로 계산 — 그림 파일 없음.
   불과 카메라 사이엔 아무것도 세우지 않는다 (회의 2026-11-20: 불멍이니 시야를 막지 않게) */
export const FRONT = 4.6; // 호수 쪽 방향 (처음 카메라가 바라보는 쪽)
const TAU = Math.PI * 2;
const wrap = a => ((a % TAU) + TAU * 1.5) % TAU - Math.PI; // -π..π
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const rgb = (c, k = 1) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;

// 달: 호수 위 하늘 한가운데
const MOON = { rel: 0, el: 0.2, r: 0.04 };
// 개울: 숲 → 풀밭 → 호수 오른쪽 끝. [rel, 불에서 거리]
const STREAM = [[2.75, 16], [2.4, 8], [2.0, 5.2], [1.55, 4.6], [1.15, 5.0]].map(([r, d]) => [Math.sin(FRONT + r) * d, Math.cos(FRONT + r) * d]);
const SHORE = rel => 4.1 + 0.35 * Math.sin(rel * 3 + 1); // 호숫가까지 거리

/* ───── 능선 겹 (가까운 것부터). 각 겹: 있는 곳(w) · 능선 높이(ridge) · 바탕(색·글자) ───── */
const trees = rel => { // 숲 능선: 0.03rad마다 나무 한 그루(높이·폭은 고정 난수)
  let top = 0;
  const i0 = Math.floor(rel / 0.03);
  for (let i = i0 - 2; i <= i0 + 2; i++) {
    const c = (i + 0.5) * 0.03, hgt = 0.035 + hash(i, 3) * 0.06, half = 0.022 + hash(i, 7) * 0.012;
    top = Math.max(top, hgt * (1 - Math.abs(rel - c) / half));
  }
  return top;
};
const LAYERS = [
  { // 뒤: 침엽수 숲
    w: rel => smooth(2.25, 2.6, Math.abs(rel)),
    ridge: rel => 0.04 + trees(rel),
    color: [26, 48, 34], fill: '^Aa*', edge: '^', snow: 0, dense: 0.7,
  },
  { // 오른쪽: 풀 언덕
    w: rel => smooth(0.75, 1.05, rel) * (1 - smooth(2.3, 2.6, rel)),
    ridge: rel => 0.03 + 0.075 * Math.sin(Math.max(0, Math.min(1, (rel - 0.75) / 1.85)) * Math.PI) + 0.004 * Math.sin(rel * 41),
    color: [34, 60, 36], fill: ",'\".", edge: '_', snow: 0, dense: 0.45,
  },
  { // 왼쪽: 가파른 산벽
    w: rel => smooth(-2.6, -2.25, rel) * (1 - smooth(-1.0, -0.7, rel)),
    ridge: rel => 0.25 + 0.05 * Math.sin(rel * 9) + 0.02 * Math.sin(rel * 31 + 2) + 0.008 * Math.sin(rel * 77),
    color: [48, 54, 72], fill: '|!l:', edge: '^', snow: 0.03, dense: 0.38,
  },
  { // 앞: 골짜기 양쪽 산 (V자)
    w: rel => 1 - smooth(1.0, 1.3, Math.abs(rel)),
    ridge: rel => 0.045 + 0.3 * Math.pow(Math.min(1, Math.abs(rel) / 1.15), 1.4) + 0.012 * Math.sin(rel * 23) + 0.006 * Math.sin(rel * 57),
    color: [38, 44, 62], fill: ':;.', edge: '/', snow: 0.02, dense: 0.4,
  },
  { // 가장 먼 봉우리 (빙 둘러, 골짜기 사이로 눈 덮인 산)
    w: () => 1,
    ridge: rel => 0.12 + 0.05 * Math.sin(rel * 7.3) + 0.035 * Math.sin(rel * 13.1 + 1) + 0.02 * Math.sin(rel * 29.7),
    color: [62, 72, 100], fill: '.:', edge: '^', snow: 0.04, dense: 0.35,
  },
];

// 방향(rel, el)의 먼 풍경: 산이면 [글자, 색], 하늘이면 null. step = 글자 한 칸 높이(라디안)
function mountainAt(rel, el, step, dim = 1) {
  for (const L of LAYERS) {
    const wt = L.w(rel);
    if (wt <= 0.01) continue;
    const top = L.ridge(rel) * wt - (1 - wt) * 0.2;
    if (el > top) continue;
    const below = top - el;
    const slope = (L.ridge(rel + 0.004) - L.ridge(rel - 0.004)) * wt;
    let c, col;
    if (below < step) c = Math.abs(slope) < 0.0006 ? L.edge : slope > 0 ? '/' : '\\';
    else {
      const n = hash(Math.floor(rel * 160), Math.floor(el * 95));
      if (n > L.dense) return [' ', '']; // 산 속은 성기게 (빈 칸도 산이라 별이 안 비침)
      c = L.fill[(n / L.dense * L.fill.length) | 0];
    }
    if (L.snow && below < L.snow && top > 0.12) col = [175, 185, 210]; // 눈 (달빛에 희미하게)
    else col = L.color;
    const fade = below < step ? 1.25 : 0.75 + 0.25 * hash(Math.floor(rel * 70), Math.floor(el * 40));
    return [c, rgb(col, fade * dim)];
  }
  return null;
}

// 달 원판 안이면 [글자, 색]. u 오른쪽, v 위 (원판 반지름 1)
function moonAt(u, v, phase, south) {
  const r2 = u * u + v * v;
  if (r2 > 1) return null;
  const wz = Math.sqrt(1 - r2), p = phase * TAU, uu = south ? -u : u;
  const lit = uu * Math.sin(p) - wz * Math.cos(p);
  if (lit <= 0) return hash(u * 9, v * 9) < 0.25 ? ['.', 'rgb(40,46,64)'] : [' ', ''];
  const crater = hash(Math.floor(u * 6 + 9), Math.floor(v * 6 + 9)) < 0.18;
  const k = 0.75 + 0.25 * wz;
  return [crater ? '%' : wz > 0.6 ? '@' : wz > 0.3 ? 'O' : 'o', rgb(crater ? [200, 196, 175] : [240, 235, 210], k)];
}

export function makeScenery({ phase, south }) {
  const moonDir = [Math.sin(FRONT + MOON.rel) * Math.cos(MOON.el), Math.sin(MOON.el), Math.cos(FRONT + MOON.rel) * Math.cos(MOON.el)];
  const lit = (1 - Math.cos(phase * TAU)) / 2;
  const stars = Array.from({ length: 320 }, (_, i) => {
    const el = Math.asin(0.03 + Math.random() * 0.95), az = Math.random() * TAU;
    return { dir: [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)], az, el, p: Math.random() * 6, s: Math.random(), i };
  });

  // 하늘·산 (물에 비칠 때도 이것). 달이면 달, 아니면 산, 아니면 null(하늘)
  const skyAt = (rel, el, step, dim) => {
    const du = wrap(rel - MOON.rel) * Math.cos(MOON.el) / MOON.r, dv = (el - MOON.el) / MOON.r;
    if (du * du + dv * dv <= 1) {
      const m = moonAt(du, dv, phase, south);
      return m && m[0] !== ' ' ? [m[0], dim < 1 ? m[1].replace(/\d+/g, n => (n * dim) | 0) : m[1]] : null;
    }
    return mountainAt(rel, el, step, dim);
  };

  // 땅 자리(불 기준 x,z) 가 개울이면 흐름 위치(0~), 아니면 -1
  const streamAt = (x, z) => {
    let best = 9, along = 0, acc = 0;
    for (let i = 0; i < STREAM.length - 1; i++) {
      const [ax, az] = STREAM[i], [bx, bz] = STREAM[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
      if (d < best) { best = d; along = acc + t * Math.sqrt(L2); }
      acc += Math.sqrt(L2);
    }
    return best < 0.11 + along * 0.006 ? along : -1;
  };

  return {
    moonLight: { dir: moonDir, power: 0.1 + 0.22 * lit, color: [105, 125, 190] },
    // ascii3d drawBackdrop에 넘길 함수를 만든다 (프레임마다)
    backdrop(view, T) {
      const step = view.angleStep(), cam = view.camera();
      return ([dx, dy, dz]) => {
        const rel = wrap(Math.atan2(dx, dz) - FRONT), el = Math.asin(dy);
        if (dy > -0.002) return skyAt(rel, el, step, 1);
        // 땅에 닿는 자리
        const t = -cam[1] / dy, gx = cam[0] + dx * t, gz = cam[2] + dz * t, gr = Math.hypot(gx, gz);
        const grel = wrap(Math.atan2(gx, gz) - FRONT);
        if (Math.abs(grel) < 1.18 && gr > SHORE(grel)) { // 호수: 비친 하늘·산·달 + 잔물결
          const ripple = 0.006 * Math.sin(t * 1.3 - T * 1.4 + gx * 1.7) + 0.004 * Math.sin(t * 2.9 + T * 0.9);
          const m = skyAt(rel + ripple * 0.6, -el + ripple, step, 0.45);
          if (m && m[0] !== ' ' && m[0] !== '@' && m[0] !== 'O' && hash(Math.floor(gx * 5), Math.floor(gz * 5)) < 0.5) return [' ', '', 2]; // 비친 산은 더 성기게
          if (m) return [m[0] === '@' || m[0] === 'O' ? '~' : m[0] === '/' || m[0] === '\\' ? '-' : m[0], m[1], 2];
          const glint = Math.abs(wrap(rel - MOON.rel)) < 0.05 * lit + 0.004 && hash(Math.floor(t * 3), Math.floor(T * 3 + gx)) < 0.35 * lit;
          if (glint) return ['~', rgb([220, 220, 200], 0.4 + 0.5 * lit), 2]; // 달빛 길
          const n = hash(Math.floor(gx * 3), Math.floor(gz * 3 + T * 0.5));
          return n < 0.12 ? ['-', 'rgb(24,34,58)', 2] : [' ', '', 2];
        }
        const s = streamAt(gx, gz);
        if (s >= 0) { // 개울: 흐름을 따라 물결 글자가 내려감, 가끔 달빛에 반짝
          const ph = Math.sin(s * 9 - T * 3.2);
          const shine = hash(Math.floor(s * 12), Math.floor(T * 4)) < 0.06;
          return [shine ? "'" : ph > 0.3 ? '~' : '-', shine ? rgb([200, 210, 230], 0.5 + 0.5 * lit) : 'rgb(52,78,118)', 2];
        }
        if (gr < 3.3) return null; // 가까운 풀밭은 점 구름이 그림
        const far = Math.min(1, 6 / gr);
        return hash(Math.floor(gx * 4), Math.floor(gz * 4)) < 0.3 * far + 0.05 ? [hash(gx, gz) < 0.5 ? ',' : '.', rgb([30, 52, 30], 0.6 + 0.6 * far)] : [' ', ''];
      };
    },
    // 별 (하늘 빈 칸에만) + 물에 비친 별
    drawStars(view, T) {
      for (const s of stars) {
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(T * (0.5 + s.s * 0.8) + s.p));
        const c = s.s > 0.9 ? '+' : s.s > 0.55 ? '.' : '·';
        const pp = view.projectDir(...s.dir);
        if (pp) view.putBack(view.cell(pp[0], pp[1]), c, `rgba(205,215,255,${(tw * 0.8).toFixed(2)})`, 0);
        if (s.el > 0.35) continue;
        const rp = view.projectDir(s.dir[0], -s.dir[1], s.dir[2]);
        if (rp && s.s > 0.5) view.putBack(view.cell(rp[0], rp[1]), '.', `rgba(170,185,230,${(tw * 0.4).toFixed(2)})`, 2);
      }
    },
  };
}
