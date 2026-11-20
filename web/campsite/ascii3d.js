/* 아스키 3D 그리기 도구 (CAMPSITE_PLAN.md 4장, tasks/campsite-1-fire.md)
   - 점 구름: 물체 표면에 뿌린 점(자리·법선·바탕색·종류·숯불 세기). makeCloud로 모아 Float32Array 하나로
   - 화면: 글자 칸 격자. 불을 가운데 둔 궤도 카메라(yaw로 돌림)로 투영 → 칸마다 가장 가까운 점 하나(z-버퍼)
   - 빛: 모닥불(점광원 — 거리로 어두워지고 flick만큼 일렁임) + 달빛(방향광, 푸른빛). 밝기 → 종류별 글자 사다리
   - 불꽃처럼 비치는 것은 heat 칸(addHeat)에 쌓아 두었다가 flush에서 물체 위에 얹는다 */
export const KIND = { GRASS: 0, STONE: 1, WOOD: 2, TENT: 3, ASH: 4, DARK: 5 };
const RAMPS = [" .,'\";:", '.:-=oO0@', '.:-=+#%&', '.,:;=+*%', '.,:;-', '.:'];
const FIRE_CH = ' .,:;-=+*#%';
const STRIDE = 11; // x y z nx ny nz r g b kind ember
// 불을 맞춘 화면 크기(높이 400px × zoom 1.5). 화면이 크면 불이 더 많은 칸에 퍼지므로 칸마다 쌓는 열기를 넓이만큼 늘려 같은 진하기로
const HEAT_REF = 600;

// 불 색: 검붉음 → 주황 → 노랑 → 흰빛 (0~1)
const PAL = [[0, [110, 18, 6]], [0.3, [210, 60, 14]], [0.55, [252, 140, 35]], [0.8, [255, 214, 110]], [1, [255, 250, 228]]];
export function fireColor(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < PAL.length; i++) {
    if (t > PAL[i][0]) continue;
    const [ta, a] = PAL[i - 1], [tb, b] = PAL[i], k = (t - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  return PAL[PAL.length - 1][1];
}
const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

export function makeCloud() {
  const a = [];
  return {
    add(x, y, z, nx, ny, nz, col, kind, ember = 0) {
      const l = Math.hypot(nx, ny, nz) || 1;
      a.push(x, y, z, nx / l, ny / l, nz / l, col[0], col[1], col[2], kind, ember);
    },
    done: () => ({ data: new Float32Array(a), n: a.length / STRIDE }),
  };
}

// opt: fontPx(글자 크기), dist(카메라 거리), zoom(화면 높이 배), pitch(내려다보는 각), lookY(바라보는 높이), horizon(불 자리, 화면 높이 비율)
export function makeView(canvas, opt) {
  const ctx = canvas.getContext('2d');
  const fs = opt.fontPx, cw = fs * 0.6;
  let w = 0, h = 0, cols = 0, rows = 0, zb, ch, col, heat, heatScale = 1, fpx = 600;
  const resize = () => {
    const d = window.devicePixelRatio || 1;
    w = canvas.clientWidth || 360;
    h = canvas.clientHeight || 400;
    canvas.width = w * d;
    canvas.height = h * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    cols = Math.ceil(w / cw);
    rows = Math.ceil(h / fs);
    zb = new Float32Array(cols * rows);
    ch = new Array(cols * rows);
    col = new Array(cols * rows);
    heat = new Float32Array(cols * rows);
    fpx = Math.min(h, w * 1.1) * opt.zoom; // 세로로 긴 폰에서 불이 너무 커지지 않게 좁은 쪽 기준
    heatScale = (fpx / HEAT_REF) ** 2;
  };
  resize();
  window.addEventListener('resize', resize);

  let ca = 1, sa = 0;
  const cp = Math.cos(opt.pitch), sp = Math.sin(opt.pitch);
  // 세계 좌표 → [화면 x, 화면 y, 깊이]
  const project = (x, y, z) => {
    y -= opt.lookY;
    const x1 = x * ca - z * sa, z1 = x * sa + z * ca;
    const y2 = y * cp + z1 * sp, z2 = -y * sp + z1 * cp + opt.dist;
    return [w / 2 + fpx * x1 / z2, h * opt.horizon - fpx * y2 / z2, z2];
  };
  // 화면 자리 → 칸 번호(밖이면 -1)
  const cell = (sx, sy, pad = 0) => {
    const u = (sx / cw) | 0, v = (sy / fs) | 0;
    return u < pad || u >= cols - pad || v < pad || v >= rows - pad ? -1 : v * cols + u;
  };

  return {
    ctx, project, cell,
    get width() { return w; },
    get height() { return h; },
    depthAt: id => zb[id],
    begin(yaw, sky = '#04060c') {
      ca = Math.cos(yaw);
      sa = Math.sin(yaw);
      zb.fill(1e9);
      ch.fill(undefined);
      heat.fill(0);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${fs}px ui-monospace,Menlo,monospace`;
      ctx.textBaseline = 'top';
    },
    // 점 구름 그리기. fire = {x,y,z,flick,power,falloff}, moon = {dir, power, color}
    drawCloud({ data, n }, fire, moon, T) {
      const [mx, my, mz] = moon.dir;
      for (let i = 0; i < n; i++) {
        const o = i * STRIDE, x = data[o], y = data[o + 1], z = data[o + 2];
        const [sx, sy, dz] = project(x, y, z);
        if (dz < 0.3) continue;
        const id = cell(sx, sy);
        if (id < 0 || dz >= zb[id]) continue;
        const nx = data[o + 3], ny = data[o + 4], nz = data[o + 5];
        let dx = fire.x - x, dy = fire.y - y, dw = fire.z - z;
        const dd = Math.hypot(dx, dy, dw);
        const facing = Math.max(0, (nx * dx + ny * dy + nz * dw) / dd) + 0.18;
        const fl = facing * fire.flick * fire.power / (1 + dd * dd * fire.falloff);
        const ml = Math.max(0, nx * mx + ny * my + nz * mz) * moon.power + 0.02;
        let r = data[o + 6] / 255 * (255 * fl + moon.color[0] * ml);
        let g = data[o + 7] / 255 * (150 * fl + moon.color[1] * ml);
        let b = data[o + 8] / 255 * (60 * fl + moon.color[2] * ml);
        const em = data[o + 10];
        if (em > 0) { // 숯불: 불 가까운 장작·재가 숨 쉬듯 빨갛게
          const gl = em * (0.6 + 0.4 * Math.sin(T * 5 + x * 20 + z * 13)) * fire.flick;
          const ec = fireColor(0.35 + gl * 0.5);
          r += ec[0] * gl;
          g += ec[1] * gl;
          b += ec[2] * gl;
        }
        const lum = Math.max(r, g, b) / 255;
        if (lum < 0.03) continue;
        zb[id] = dz;
        const rp = RAMPS[data[o + 9]];
        ch[id] = em > 0.3 && lum > 0.4 ? '*' : rp[Math.min(rp.length - 1, Math.floor(Math.min(1, lum * 1.15) * rp.length))];
        col[id] = rgb([Math.min(255, r), Math.min(255, g), Math.min(255, b)]);
      }
    },
    // 불꽃 열기 한 점 쌓기 (물체 뒤면 안 쌓음)
    addHeat(x, y, z, amount) {
      const [sx, sy, dz] = project(x, y, z);
      const id = cell(sx, sy, 1);
      if (id < 0 || dz > zb[id] + 0.05) return;
      heat[id] += amount * heatScale;
    },
    // 열기를 살짝 번지게 한 뒤 불 글자로 얹고, 모든 칸을 캔버스에 쓴다
    flush(fire) {
      const sm = new Float32Array(heat.length);
      for (let v = 1; v < rows - 1; v++)
        for (let u = 1; u < cols - 1; u++) {
          const id = v * cols + u;
          sm[id] = heat[id] * 0.5 + (heat[id - 1] + heat[id + 1]) * 0.14 + (heat[id - cols] + heat[id + cols]) * 0.08 + heat[id + cols] * 0.04;
        }
      for (let id = 0; id < sm.length; id++) {
        if (sm[id] <= 0.06) continue;
        const lv = 1 - Math.exp(-sm[id] * fire.gain);
        if (lv <= 0.12 && ch[id]) continue;
        ch[id] = FIRE_CH[Math.min(FIRE_CH.length - 1, 1 + Math.floor(lv * (FIRE_CH.length - 1)))];
        col[id] = rgb(fireColor(lv * fire.hue));
      }
      let cur = '';
      for (let id = 0; id < ch.length; id++) {
        if (!ch[id]) continue;
        if (col[id] !== cur) ctx.fillStyle = cur = col[id];
        ctx.fillText(ch[id], (id % cols) * cw, ((id / cols) | 0) * fs);
      }
    },
    // 칸에 글자 하나를 바로 쓰기 (불씨처럼 위에 얹는 것)
    put(id, c, color, alpha = 1) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillText(c, (id % cols) * cw, ((id / cols) | 0) * fs);
      ctx.globalAlpha = 1;
    },
  };
}
