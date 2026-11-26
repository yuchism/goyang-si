/* 둘러싼 풍경 (CAMPSITE_PLAN.md 3·4장, tasks/campsite-7-stack.md)
   - 하늘(남색 그라데이션·은하수 띠·별) → 먼 산 그림 → 호수(물결·달빛 길) → 가까운 숲 그림 → 땅
   - 그림 두 장은 주인이 ChatGPT로 그린 것을 2px 격자로 줄인 것 (assets/briefs/CAMPSITE_BG_ART.md)
     · bg-far: 먼 산, 한 바퀴 = 384픽셀. 가운데(가장 높은 봉우리)가 앞(호수·달 쪽, FRONT)
     · bg-near: 가까운 숲·절벽·풀 언덕. 원래 384에 뒤쪽 숲을 이어 붙여 한 바퀴 = 768 → 먼 산보다 두 배 빨리 지나감(주인 요청 2026-11-25)
   - 하늘·별·달은 먼 산과 같이 천천히. 물결은 깊이에 따라: 수평선 쪽은 먼 산처럼, 물가 쪽은 가까운 숲처럼 (주인 요청 2026-11-25)
   - 달: 오늘 날짜의 모양(phase), 남·북반구(south)에 따라 밝은 쪽이 바뀜. 호수 오른쪽 위 하늘(SKY.moonAz). 물에는 달 원판 없이 달빛 길만(주인 2026-11-20)
   - 넓은 화면: 그림을 정수배(AS)로 키우고, 지평선은 산 높이에 맞춰 내림 */
export const FRONT = 0;   // 호수·달 쪽 방향 (처음 바라보는 쪽). sound.js가 개울·부엉이 방향을 여기서 잼
const TAU = Math.PI * 2;
const FAR_W = 384;        // 먼 산 그림 폭 (한 바퀴)
export const SKY = {
  top: '#04050d', mid: '#0c1029', hor: '#221d3e',
  night: 0.82,            // 먼 산 그림을 밤이라 조금 어둡게 (1 = 그림 그대로)
  stars: 0.9,             // 별 수 (하늘 넓이 대비)
  milky: { y: [0.18, 0.62], w: 0.085, glow: 0.1 }, // 은하수: 하늘 높이 비율로 오르내리는 띠, 굵기(하늘 높이 비율), 빛
  moonR: 0.022,           // 달 반지름 (화면 높이 비율)
  moonAz: 0.8,            // 달 방향: 앞(호수)에서 오른쪽으로 — 처음 화면 오른쪽 위쯤에 보이게 (주인 2026-11-26)
  moonY: 0.1,             // 달 높이 (화면 높이 비율)
};
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};
const lerp = (a, b, k) => a + (b - a) * k;
const img = src => { const i = new Image(); i.src = src; return i; };
// 이어 붙인 그림의 첫 장 자리 (-p~0) — 많이 돌려도 그림이 사라지지 않게
const tile = (x, p) => Math.round(((x % p) + p) % p - p);

export function makeBackdrop({ phase, south }) {
  const far = img('bg-far-v1.png'), near = img('bg-near-v1.png');
  let farDark = null, sky = null, moon = null, built = -1, stars = [], dashes = [];
  let AS = 1, PW = FAR_W, y0 = 0, y1 = 0, farH = 0, mr = 3;
  const ready = i => i.complete && i.naturalWidth > 0;

  // 화면 크기가 바뀌면: 하늘 한 바퀴(그라데이션·은하수 먼지)·달·별·물결을 다시 만듦
  const build = st => {
    const { W, H } = st;
    AS = Math.max(1, Math.round(W / FAR_W));
    PW = FAR_W * AS;
    farH = (ready(far) ? far.naturalHeight : 69) * AS;
    y0 = Math.round(Math.max(H * 0.4, farH + H * 0.08)); // 낮고 넓은 화면: 산을 키운 만큼 지평선을 내리되, 땅(불 자리)이 넉넉히 남게 — 달은 봉우리에 조금 걸려도 됨
    y1 = y0 + Math.round(H * 0.1);
    mr = Math.max(3, Math.round(H * SKY.moonR));
    // 하늘 띠 (PW × y0): 그라데이션 + 은하수
    sky = document.createElement('canvas');
    sky.width = PW;
    sky.height = y0 + 1;
    const c = sky.getContext('2d'), g = c.createLinearGradient(0, 0, 0, y0);
    g.addColorStop(0, SKY.top); g.addColorStop(0.6, SKY.mid); g.addColorStop(1, SKY.hor);
    c.fillStyle = g;
    c.fillRect(0, 0, PW, y0 + 1);
    const M = SKY.milky, bw = Math.max(3, y0 * M.w);
    const bandY = u => y0 * lerp(M.y[0], M.y[1], 0.5 + 0.5 * Math.sin(u * TAU + 0.9));
    for (let x = 0; x < PW; x++) {
      const yc = bandY(x / PW);
      for (let y = Math.max(0, Math.floor(yc - bw * 2.2)); y < Math.min(y0, yc + bw * 2.2); y++) {
        const d = (y - yc) / bw, core = Math.exp(-d * d), n = vnoise(x * 0.09, y * 0.15);
        const lane = 1 - 0.7 * Math.exp(-(((y - yc - bw * 0.25) / (bw * 0.3)) ** 2)) * (vnoise(x * 0.05, 3) > 0.45 ? 1 : 0.3);
        const a = M.glow * core * (0.5 + n) * lane;
        if (a > 0.01) { c.fillStyle = `rgba(150,150,200,${a.toFixed(3)})`; c.fillRect(x, y, 1, 1); }
        if (hash(x, y) < 0.09 * core * lane) { c.fillStyle = `rgba(210,212,240,${(0.25 + 0.35 * hash(y, x)).toFixed(2)})`; c.fillRect(x, y, 1, 1); }
      }
    }
    // 깜빡이는 별 (하늘 한 바퀴 안의 자리 u, 높이 비율 v)
    stars = Array.from({ length: Math.round(PW * y0 * SKY.stars / 100) }, (_, i) => ({
      u: hash(i, 1.7), v: hash(i, 2.3) ** 1.3 * 0.95, p: hash(i, 3.1) * TAU, s: 0.3 + hash(i, 4.9) * 1.2, b: 0.25 + hash(i, 5.3) * 0.6,
    }));
    dashes = Array.from({ length: Math.round(FAR_W * 1.5 * AS * H * 0.1 / 12) }, (_, i) => ({
      u: hash(i, 7.1), y: hash(i, 8.3), l: 2 + Math.floor(hash(i, 9.7) * 5 * Math.max(1, st.kp / 2)), p: hash(i, 6.1) * TAU,
    }));
    // 오늘의 달
    moon = document.createElement('canvas');
    moon.width = moon.height = mr * 2 + 1;
    const mc = moon.getContext('2d'), p = phase * TAU;
    for (let v = -mr; v <= mr; v++) for (let u = -mr; u <= mr; u++) {
      const r2 = (u * u + v * v) / (mr * mr);
      if (r2 > 1) continue;
      const wz = Math.sqrt(1 - r2), uu = (south ? -u : u) / mr;
      const lit = uu * Math.sin(p) - wz * Math.cos(p);
      if (lit <= 0) { mc.fillStyle = 'rgba(52,58,84,.55)'; }   // 그늘진 쪽: 희미하게
      else {
        const crater = hash(Math.floor((u / mr) * 4 + 9), Math.floor((v / mr) * 4 + 9)) < 0.2, k = 0.78 + 0.22 * wz;
        const col = crater ? [206, 200, 180] : [238, 232, 212];
        mc.fillStyle = `rgb(${col[0] * k | 0},${col[1] * k | 0},${col[2] * k | 0})`;
      }
      mc.fillRect(u + mr, v + mr, 1, 1);
    }
    farDark = null;
    built = st.gen;
  };

  return {
    get horizon() { return y0; },
    get shore() { return y1; },
    // azc: 화면 가운데가 보는 방향 (FRONT = 호수)
    draw(st, azc, t) {
      if (built !== st.gen || (!farDark && ready(far) && farH !== far.naturalHeight * AS)) build(st);
      const { ctx, W, H } = st, xFar = az => W / 2 + (((az - azc) % TAU + TAU + Math.PI) % TAU - Math.PI) / TAU * PW;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      // 하늘 (먼 산과 같이 돎)
      const sx0 = tile(W / 2 - PW / 2 - azc / TAU * PW, PW);
      for (let x = sx0; x < W; x += PW) ctx.drawImage(sky, x, 0);
      for (const s of stars) {
        const x = Math.round(((sx0 + s.u * PW) % PW + PW) % PW);
        for (let xx = x; xx < W; xx += PW) {
          ctx.fillStyle = `rgba(225,228,255,${(s.b * (0.55 + 0.45 * Math.sin(t * s.s + s.p))).toFixed(2)})`;
          ctx.fillRect(xx, Math.floor(s.v * (y0 - 4)), 1, 1);
        }
      }
      // 달 (호수 위)
      const mx = Math.round(xFar(FRONT + SKY.moonAz)), my = Math.round(Math.max(mr + 4, H * SKY.moonY));
      const moonIn = mx > -mr * 6 && mx < W + mr * 6;
      if (moonIn) {
        ctx.globalCompositeOperation = 'lighter';
        const mg = ctx.createRadialGradient(mx, my, 1, mx, my, mr * 6);
        mg.addColorStop(0, `rgba(200,205,230,${(0.06 + 0.12 * phaseLight(phase)).toFixed(3)})`);
        mg.addColorStop(1, 'rgba(200,205,230,0)');
        ctx.fillStyle = mg;
        ctx.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(moon, mx - mr, my - mr);
      }
      // 먼 산 (밑변 = 지평선)
      if (ready(far)) {
        if (!farDark) {
          farDark = document.createElement('canvas');
          farDark.width = far.naturalWidth;
          farDark.height = far.naturalHeight;
          const fc = farDark.getContext('2d');
          fc.drawImage(far, 0, 0);
          fc.globalCompositeOperation = 'source-atop';
          fc.fillStyle = `rgba(6,6,22,${1 - SKY.night})`;
          fc.fillRect(0, 0, farDark.width, farDark.height);
        }
        for (let x = sx0; x < W; x += PW) ctx.drawImage(farDark, x, y0 + 1 - farH, PW, farH);
      }
      // 호수와 땅
      ctx.fillStyle = '#141a38'; ctx.fillRect(0, y0, W, y1 - y0);
      const ym = Math.round(lerp(y0, y1, 0.5));
      ctx.fillStyle = '#0d1129'; ctx.fillRect(0, ym, W, y1 - ym);
      ctx.fillStyle = '#19151f'; ctx.fillRect(0, y1, W, H - y1); // 땅 (voxels.js GROUND와 같은 색)
      ctx.fillStyle = 'rgba(170,170,210,.35)'; ctx.fillRect(0, y0, W, 1);
      for (const d of dashes) { // 물결: 깊이에 따라 먼 산(PW)~가까운 숲(2PW) 빠르기
        const P = PW * (1 + d.y), off = (((d.u - azc / TAU) * P + t * 1.2) % P + P) % P;
        const x = Math.round(W / 2 - P / 2 + off), y = Math.round(lerp(y0 + 1, y1 - 1, d.y));
        if (x < -8 || x >= W) continue;
        ctx.fillStyle = `rgba(150,155,205,${(0.22 * (0.5 + 0.5 * Math.sin(t * 1.4 + d.p))).toFixed(3)})`;
        ctx.fillRect(x, y, d.l, 1);
      }
      if (moonIn) { // 달빛 길 — 달이 밝을수록 진하게
        ctx.globalCompositeOperation = 'lighter';
        const k = 0.12 + 0.3 * phaseLight(phase), wk = Math.max(1, st.kp / 2);
        for (let y = y0 + 1; y < y1; y++) {
          const dep = (y - y0) / (y1 - y0), wv = 1 + Math.round((dep * 4 + 2 * Math.sin(y * 2.1 + t * 2.5)) * wk);
          ctx.fillStyle = `rgba(200,205,225,${(k * (0.45 + 0.45 * Math.sin(y * 2.3 + t * 4))).toFixed(3)})`;
          ctx.fillRect(mx - wv + Math.round(Math.sin(y * 1.7 + t * 3) * 1.5), y, wv * 2, 1);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      for (let x = 0; x < W; x += 2) {
        const a = 0.18 * (0.5 + 0.5 * Math.sin(x * 0.9 + t * 1.5));
        ctx.fillStyle = `rgba(190,195,225,${a.toFixed(3)})`;
        ctx.fillRect(x, y1, 1, 1);
      }
      // 가까운 숲·절벽·언덕 (밑변 = 가까운 물가). 앞 가운데가 비어 호수가 보임
      if (ready(near)) {
        const PN = near.naturalWidth * AS, nh = near.naturalHeight * AS;
        for (let x = tile(W / 2 - FAR_W / 2 * AS - azc / TAU * PN, PN); x < W; x += PN) ctx.drawImage(near, x, y1 + 2 - nh, PN, nh);
      }
    },
  };
}
// 달 밝기 0(그믐)~1(보름)
const phaseLight = phase => (1 - Math.cos(phase * TAU)) / 2;
