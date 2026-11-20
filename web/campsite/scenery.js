/* 캠핑장 먼 풍경 (CAMPSITE_PLAN.md 3장, tasks/campsite-2-scene.md)
   불을 가운데 두고 360도. 방향은 FRONT(호수, 처음 보이는 쪽)에서 오른쪽으로 잰 각(rel, 라디안)으로 정한다.
   - 앞(rel 0): 호수, 그 너머 V자 골짜기와 눈 덮인 먼 봉우리. 물에 하늘·산·달·별이 비치고 잔물결에 흔들림
   - 오른쪽: 풀 언덕 / 왼쪽: 가파른 산벽 / 뒤: 침엽수 숲. 숲에서 흘러나와 풀밭을 지나 호수로 드는 가는 개울
   - 하늘: 반짝이는 별, 호수 위 오늘의 달(위상은 날짜, 남·북반구 모양은 방문자 시간대)
   그림 파일 없음. 들어올 때 한 번 360도 표를 구워 두고(bake — 하늘·산·달 / 땅·호수·개울), 프레임마다는 표에서 읽기만.
   카메라는 불 둘레를 yaw로만 도니, 화면 칸의 방향도 한 번 재 두고 yaw만 더한다(prepare). 움직이는 건 물결·개울·별뿐
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

// 구운 표의 칸 크기
const AZ_N = 1440, AZ_STEP = TAU / AZ_N;                    // 방향 0.25°
const EL_MIN = -0.06, EL_STEP = 0.005, EL_N = 150;           // 높이 -0.06 ~ 0.69 rad
const R0 = 3.3, R_K = 0.035, R_N = 200;                       // 땅: 불에서 R0 ~ 약 3600 (로그 간격)
const RIDGE_STEP = 0.009;                                     // 능선 글자 두께(라디안)
const azBin = a => ((Math.floor(a / AZ_STEP) % AZ_N) + AZ_N) % AZ_N;
const G = { NEAR: 0, GRASS: 1, LAKE: 2, STREAM: 3 };
const STARS = 4500; // 별 수 (주인 요청 2026-11-20: 더 많이). 보이는 하늘(높이 0~0.75rad)에만 고르게 — 머리 위로 흩어 버리지 않게. 대부분 희미한 ·, 드물게 밝은 +

export function makeScenery({ phase, south }) {
  const moonDir = [Math.sin(FRONT + MOON.rel) * Math.cos(MOON.el), Math.sin(MOON.el), Math.cos(FRONT + MOON.rel) * Math.cos(MOON.el)];
  const lit = (1 - Math.cos(phase * TAU)) / 2;
  // 별: 방향(az) 순으로 정렬해 두고, 프레임마다 화면에 들어오는 방향의 별만 그린다(4500개를 다 돌면 밀림)
  const stars = Array.from({ length: STARS }, () => {
    const el = 0.015 + Math.random() * 0.74, az = Math.random() * TAU, s = Math.random();
    return { dir: [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)], az, el, p: Math.random() * 6, s,
      c: s > 0.97 ? '+' : s > 0.8 ? '*' : s > 0.5 ? '.' : '·', b: 0.45 + 0.5 * s, sp: 0.5 + s * 0.8 };
  }).sort((a, b) => a.az - b.az);
  const starAz = Float32Array.from(stars, s => s.az);
  const lowerBound = a => { let lo = 0, hi = starAz.length; while (lo < hi) { const m = (lo + hi) >> 1; if (starAz[m] < a) lo = m + 1; else hi = m; } return lo; };
  // 반짝임 밝기는 12단계로 — 색 글자를 프레임마다 새로 만들지 않게
  const STAR_COL = Array.from({ length: 12 }, (_, i) => `rgba(205,215,255,${(i / 11).toFixed(2)})`);
  const REFL_COL = Array.from({ length: 12 }, (_, i) => `rgba(170,185,230,${(i / 11 * 0.4).toFixed(2)})`);

  // 색 이름표 (표에는 번호만)
  const colors = [''], colorNo = new Map([['', 0]]);
  const cno = c => { let n = colorNo.get(c); if (n === undefined) { n = colors.length; colors.push(c); colorNo.set(c, n); } return n; };

  // 하늘·산·달 (물에 비칠 때도 이것)
  const skyAt = (rel, el, dim) => {
    const du = wrap(rel - MOON.rel) * Math.cos(MOON.el) / MOON.r, dv = (el - MOON.el) / MOON.r;
    if (du * du + dv * dv <= 1) {
      const m = moonAt(du, dv, phase, south);
      return m && m[0] !== ' ' ? [m[0], dim < 1 ? m[1].replace(/\d+/g, n => (n * dim) | 0) : m[1]] : null;
    }
    return mountainAt(rel, el, RIDGE_STEP, dim);
  };

  /* ───── 굽기: 하늘 표 (방향 × 높이) — 글자(0 하늘, 32 산 속 빈칸), 색, 물에 비친 색 ───── */
  const skyCh = new Uint16Array(AZ_N * EL_N), skyCol = new Uint16Array(AZ_N * EL_N), skyDim = new Uint16Array(AZ_N * EL_N);
  for (let i = 0; i < AZ_N; i++) {
    const rel = wrap((i + 0.5) * AZ_STEP - FRONT);
    for (let j = 0; j < EL_N; j++) {
      const el = EL_MIN + (j + 0.5) * EL_STEP, r = skyAt(rel, el, 1), k = i * EL_N + j;
      if (!r) continue;
      skyCh[k] = r[0].charCodeAt(0);
      skyCol[k] = cno(r[1]);
      const d = skyAt(rel, el, 0.45);
      skyDim[k] = cno(d ? d[1] : '');
    }
  }
  const skyK = (az, el) => { const j = Math.floor((el - EL_MIN) / EL_STEP); return j < 0 || j >= EL_N ? -1 : azBin(az) * EL_N + j; };

  /* ───── 굽기: 땅 표 (방향 × 거리) — 풀밭·호수·개울(흐름 위치) ───── */
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
  const gType = new Uint8Array(AZ_N * R_N), gAlong = new Float32Array(AZ_N * R_N), gCh = new Uint16Array(AZ_N * R_N), gCol = new Uint16Array(AZ_N * R_N);
  for (let i = 0; i < AZ_N; i++) {
    const az = (i + 0.5) * AZ_STEP, grel = wrap(az - FRONT), sx = Math.sin(az), cz = Math.cos(az);
    for (let k = 0; k < R_N; k++) {
      const r = R0 * Math.exp((k + 0.5) * R_K), x = sx * r, z = cz * r, n = i * R_N + k;
      if (Math.abs(grel) < 1.18 && r > SHORE(grel)) { gType[n] = G.LAKE; continue; }
      const s = streamAt(x, z);
      if (s >= 0) { gType[n] = G.STREAM; gAlong[n] = s; continue; }
      gType[n] = G.GRASS;
      const far = Math.min(1, 6 / r);
      if (hash(Math.floor(x * 4), Math.floor(z * 4)) < 0.3 * far + 0.05) {
        gCh[n] = (hash(x, z) < 0.5 ? ',' : '.').charCodeAt(0);
        gCol[n] = cno(rgb([30, 52, 30], 0.6 + 0.6 * far));
      }
    }
  }

  /* ───── 화면 칸 → 방향 (화면 크기가 바뀔 때만) ───── */
  let gen = -1, cells = null;
  const prepare = view => {
    if (gen === view.gen) return;
    gen = view.gen;
    const n = view.cols * view.rows, cam = view.camera0();
    cells = { ground: new Uint8Array(n), az: new Float32Array(n), el: new Float32Array(n), gAz: new Float32Array(n), r: new Float32Array(n), t: new Float32Array(n) };
    for (let v = 0; v < view.rows; v++)
      for (let u = 0; u < view.cols; u++) {
        const id = v * view.cols + u, [dx, dy, dz] = view.rayAt(u, v);
        cells.az[id] = Math.atan2(dx, dz);
        cells.el[id] = Math.asin(dy);
        if (dy > -0.002) continue;
        const t = -cam[1] / dy, gx = cam[0] + dx * t, gz = cam[2] + dz * t;
        cells.ground[id] = 1;
        cells.gAz[id] = Math.atan2(gx, gz);
        cells.r[id] = Math.hypot(gx, gz);
        cells.t[id] = t;
      }
  };

  const moonPath = 0.05 * lit + 0.004;
  return {
    moonLight: { dir: moonDir, power: 0.1 + 0.22 * lit, color: [105, 125, 190] },
    // 먼 풍경 그리기 (프레임마다): 표에서 읽어 ascii3d 칸에
    drawFar(view, yaw, T) {
      prepare(view);
      const { ground, az, el, gAz, r, t } = cells, n = ground.length;
      for (let id = 0; id < n; id++) {
        if (!ground[id]) { // 하늘·산·달
          const k = skyK(az[id] + yaw, el[id]);
          if (k >= 0 && skyCh[k]) view.setBack(id, String.fromCharCode(skyCh[k]), colors[skyCol[k]], 1);
          continue;
        }
        if (r[id] < R0) continue; // 가까운 풀밭은 점 구름이 그림
        const gi = azBin(gAz[id] + yaw), rk = Math.min(R_N - 1, Math.floor(Math.log(r[id] / R0) / R_K)), g = gi * R_N + rk, type = gType[g];
        if (type === G.LAKE) { // 비친 하늘·산·달 + 잔물결, 달빛 길
          const ripple = 0.006 * Math.sin(t[id] * 1.3 - T * 1.4 + gi * 0.05) + 0.004 * Math.sin(t[id] * 2.9 + T * 0.9);
          const k = skyK(az[id] + yaw + ripple * 0.6, -el[id] + ripple);
          const c = k >= 0 ? skyCh[k] : 0;
          if (c && c !== 32) {
            const ch = String.fromCharCode(c), moon = ch === '@' || ch === 'O';
            if (!moon && hash(gi, rk) < 0.5) view.setBack(id, ' ', '', 2); // 비친 산은 성기게
            else view.setBack(id, moon ? '~' : ch === '/' || ch === '\\' ? '-' : ch, colors[skyDim[k]], 2);
            continue;
          }
          if (Math.abs(wrap(az[id] + yaw - FRONT - MOON.rel)) < moonPath && hash(rk, Math.floor(T * 3) + gi) < 0.35 * lit)
            view.setBack(id, '~', rgb([220, 220, 200], 0.4 + 0.5 * lit), 2);
          else view.setBack(id, hash(gi >> 2, rk + Math.floor(T * 0.5)) < 0.12 ? '-' : ' ', 'rgb(24,34,58)', 2);
        }
        else if (type === G.STREAM) { // 흐름을 따라 물결 글자가 내려감, 가끔 달빛에 반짝
          const s = gAlong[g], shine = hash(Math.floor(s * 12), Math.floor(T * 4)) < 0.06;
          view.setBack(id, shine ? "'" : Math.sin(s * 9 - T * 3.2) > 0.3 ? '~' : '-', shine ? rgb([200, 210, 230], 0.5 + 0.5 * lit) : 'rgb(52,78,118)', 2);
        }
        else if (gCh[g]) view.setBack(id, String.fromCharCode(gCh[g]), colors[gCol[g]], 1);
        else view.setBack(id, ' ', '', 1);
      }
    },
    // 별 (하늘 빈 칸에만) + 물에 비친 별
    drawStars(view, yaw, T) {
      const half = view.halfFov() + 0.03;
      const one = s => {
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(T * s.sp + s.p));
        const pp = view.projectDir(s.dir[0], s.dir[1], s.dir[2]);
        if (pp) view.putBack(view.cell(pp[0], pp[1]), s.c, STAR_COL[Math.round(tw * s.b * 11)], 0);
        if (s.el > 0.35 || s.s <= 0.7) return;
        const rp = view.projectDir(s.dir[0], -s.dir[1], s.dir[2]);
        if (rp) view.putBack(view.cell(rp[0], rp[1]), '.', REFL_COL[Math.round(tw * 11)], 2);
      };
      const a0 = (((yaw - half) % TAU) + TAU) % TAU, a1 = a0 + 2 * half; // 화면 왼쪽 끝 ~ 오른쪽 끝 방향
      for (let i = lowerBound(a0); i < stars.length && starAz[i] <= a1; i++) one(stars[i]);
      if (a1 > TAU) for (let i = 0; i < stars.length && starAz[i] <= a1 - TAU; i++) one(stars[i]); // 0을 넘어 이어지는 쪽
    },
  };
}
