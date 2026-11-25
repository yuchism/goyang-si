/* 모닥불 복셀 모형 (CAMPSITE_PLAN.md 4장, tasks/campsite-7-stack.md)
   - 스프라이트 스태킹: 96×96×24 복셀 모형을 높이별 판(그림 한 장씩)으로 구워 두고, 그릴 때 판마다 돌려 한 칸씩 올려 쌓음
   - 모양: 흙 원판(가장자리는 배경 땅과 섞이게 듬성듬성) · 숯 더미 · 돌 12개 · 나지막하게 엇갈려 쌓은 장작 6개
     (높은 원뿔은 거슬림 — 주인 2026-11-25) · 앉는 통나무 셋(지금 캠핑장과 같은 자리) · 잔가지
   - 빛은 구울 때 한 번: 면 방향(비어 있는 이웃 쪽)·불빛(가까울수록 따뜻하게)·달빛(위에서 푸르게)·틈 그늘
   - 숯불은 따로 빛나는 판 두 장(e1·e2)으로 — 그릴 때 번갈아 숨 쉬듯 밝아짐
   - 시안: assets/briefs/campsite/stack-poc.html */
import { STACK } from './stack.js';

export const N = 96, HV = 24, FZ = 6; // FZ: 불 가운데 높이(복셀)
const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const mixC = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

// 한 번만 만듦 (들어올 때 약 0.1초)
export function buildCampfire() {
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const MID = N / 2 - 0.5;
  const vox = Array.from({ length: HV }, () => new Array(N * N).fill(null));
  const set = (x, y, z, c, glow = 0, a = 255) => {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    if (x < 0 || y < 0 || z < 0 || x >= N || y >= N || z >= HV) return;
    vox[z][y * N + x] = { c, glow, a };
  };
  const get = (x, y, z) => (z < 0 || z >= HV || x < 0 || y < 0 || x >= N || y >= N) ? null : vox[z][y * N + x];
  const hash3 = (x, y, z) => { let n = Math.sin(x * 12.99 + y * 78.23 + z * 37.71) * 43758.55; return n - Math.floor(n); };
  const vary = (c, k) => { const n = (rnd() - .5) * k; return [c[0] + n, c[1] + n * .9, c[2] + n * .8]; };

  // 땅: 흙 원판 — 가장자리는 듬성듬성 비워 배경 땅과 섞이게
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - MID, y - MID), edge = (d - 31) / 13;
    if (d > 44 || hash3(Math.floor(x / 3), Math.floor(y / 3), 0) * .7 + rnd() * .3 < edge) continue;
    const ash = Math.max(0, 1 - d / 19);
    set(x, y, 0, vary(mixC([48, 40, 38], [104, 98, 96], ash * ash), 12));
  }
  // 숯 더미: 가운데가 살짝 봉긋, 숯불·검은 숯·재가 섞임
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - MID, y - MID); if (d > 16) continue;
    const top = Math.round(1 + 2.6 * (1 - d / 16) ** 1.5);
    for (let z = 1; z <= top; z++) {
      const r = rnd(), hot = (1 - d / 16) * .55;
      if (r < hot) set(x, y, z, [255, 110 + rnd() * 80, 30 + rnd() * 30], rnd() < .5 ? 1 : 2);
      else if (r < hot + .35) set(x, y, z, vary([34, 28, 26], 10));
      else set(x, y, z, vary([118, 112, 108], 16));
    }
  }
  // 돌 둘레: 크기·모양이 다른 돌 12개, 안쪽 면은 그을음
  const STONES = 12, stoneC = [];
  for (let i = 0; i < STONES; i++) {
    const a = i / STONES * TAU + (rnd() - .5) * .18, rr = 25.5 + rnd() * 2.5;
    const cx = MID + Math.cos(a) * rr, cy = MID + Math.sin(a) * rr;
    const rx = 4.2 + rnd() * 2.4, ry = 3.6 + rnd() * 2, rz = 3.2 + rnd() * 3, rot = a + (rnd() - .5) * .6;
    const base = [[98, 100, 112], [112, 108, 104], [86, 90, 100], [120, 118, 122]][i % 4];
    stoneC.push([cx, cy]);
    for (let z = 1; z < 11; z++) for (let v = -9; v <= 9; v++) for (let u = -9; u <= 9; u++) {
      const lx = u * Math.cos(rot) + v * Math.sin(rot), ly = -u * Math.sin(rot) + v * Math.cos(rot);
      const bump = .22 * (hash3(Math.round(cx + u) * .5, Math.round(cy + v) * .5, z * .5) - .5);
      if ((lx / rx) ** 2 + (ly / ry) ** 2 + ((z - .5) / rz) ** 2 > 1 + bump) continue;
      const inward = -(u * Math.cos(a) + v * Math.sin(a)) / Math.max(1, Math.hypot(u, v));
      let c = vary(base, 18);
      if (inward > .3 && z < rz + 1) c = mixC(c, [30, 26, 26], .55 * inward);   // 불 쪽 그을음
      set(cx + u, cy + v, z, c);
    }
  }
  // 나무 껍질 색: 결 따라 줄무늬
  const barkAt = (base, ang, along) => {
    const k = (Math.floor(ang / TAU * 11 + Math.sin(along * .35) * .6) & 1) ? .78 : 1;
    return vary([base[0] * k, base[1] * k, base[2] * k], 14);
  };
  // 장작: 숯 더미 위에 나지막하게 엇갈려 쌓음 (주인 요청 2026-11-25 — 높은 원뿔은 거슬림)
  //  [가운데에서 비낀 정도, 방향, 길이, 굵기, 양 끝 높이 z1·z2]. 가운데(불 닿는 곳)는 타서 검고 숯불
  const PILE = [[-3, .35, 30, 2.8, 3.2, 3.6], [3.5, .5, 27, 2.6, 3.4, 3.2], [-2, 2.0, 28, 2.7, 6.8, 6.2], [3, 1.85, 24, 2.4, 6.4, 7.4], [0, 1.15, 22, 2.3, 9.6, 8.6], [1, 2.75, 18, 2.1, 10.6, 11.4]];
  PILE.forEach(([off, a, L, r, z1, z2], i) => {
    const dx = Math.cos(a), dy = Math.sin(a), ox = -dy * off, oy = dx * off;
    const bark = [[122, 80, 48], [108, 72, 46], [132, 92, 58]][i % 3];
    const ax = dx * L / 2, ay = dy * L / 2, dz = z2 - z1, len = Math.hypot(L, dz);
    const ux = -dy, uy = dx;                                       // 축에 수직(수평) 방향
    for (let t = -L / 2; t <= L / 2; t += .4) for (let th = 0; th < TAU; th += .2) for (let rr = 0; rr <= r; rr += .7) {
      const k = (t + L / 2) / L, u = Math.cos(th) * rr, w = Math.sin(th) * rr;
      const x = MID + ox + dx * t + ux * u, y = MID + oy + dy * t + uy * u, z = lerp(z1, z2, k) + w;
      if (z < .5) continue;
      const mid = Math.hypot(x - MID, y - MID) < 9 + rnd() * 2, outer = rr > r - .8, end = Math.abs(t) > L / 2 - .5;
      if (mid) {
        if (outer && rnd() < .32) set(x, y, z, [255, 120 + rnd() * 60, 35], rnd() < .5 ? 1 : 2);
        else set(x, y, z, vary([40, 30, 26], 10));
      } else if (end) set(x, y, z, (Math.floor(rr * 1.5) & 1) ? [176, 136, 92] : [146, 108, 70]);
      else if (outer) set(x, y, z, barkAt(bark, th, t));
      else set(x, y, z, vary([168, 128, 86], 14));
    }
  });
  // 앉는 통나무 셋 (지금 캠핑장과 같은 자리): 줄무늬 껍질, 자른 면엔 나이테, 하나는 곁가지
  const SEATS = [[0.55, 39, 13, 4.4], [3.4, 40, 11, 4.8], [5.3, 38.5, 12, 4.2]];
  SEATS.forEach(([a, R, L, r], si) => {
    const cx = MID + Math.cos(a) * R, cy = MID + Math.sin(a) * R, tx = -Math.sin(a), ty = Math.cos(a), nx = Math.cos(a), ny = Math.sin(a);
    const bark = [[96, 66, 44], [104, 72, 48], [88, 62, 42]][si];
    for (let s = -L; s <= L; s += .4) for (let th = 0; th < TAU; th += .12) for (let rr = 0; rr <= r; rr += .6) {
      const u = Math.cos(th) * rr, w = Math.sin(th) * rr, z = r + w;
      if (z < .5) continue;
      const x = cx + tx * s + nx * u, y = cy + ty * s + ny * u;
      let c;
      if (Math.abs(s) > L - .6) c = (Math.floor(rr * 1.5) & 1) ? [178, 140, 98] : [150, 112, 74];   // 나이테
      else if (rr > r - .7) c = barkAt(bark, th, s);
      else c = [150, 112, 74];
      if (rr > r - .7 && w > r * .6 && hash3(Math.round(x), Math.round(y), 1) < .25) c = mixC(c, [70, 92, 56], .5);   // 위에 이끼 조금
      set(x, y, z, c);
    }
    if (si === 1) for (let t = 0; t < 5; t += .4) for (let th = 0; th < TAU; th += .4) {   // 곁가지
      const x = cx + tx * 4 + nx * (r * .6 + t * .8) + Math.cos(th), y = cy + ty * 4 + ny * (r * .6 + t * .8) + Math.sin(th);
      set(x, y, r * 1.4 + t * .9, barkAt(bark, th, t));
    }
  });
  // 잔가지 몇 개 (불 옆에 흩어진)
  for (let i = 0; i < 5; i++) {
    const a = rnd() * TAU, d0 = 30 + rnd() * 6, dir = a + 1.2 + rnd() * .8;
    for (let t = 0; t < 7; t += .5) set(MID + Math.cos(a) * d0 + Math.cos(dir) * t, MID + Math.sin(a) * d0 + Math.sin(dir) * t, 1, vary([92, 66, 44], 16));
  }

  // ---------- 굽기 ----------
  const mk = () => { const cv = document.createElement('canvas'); cv.width = cv.height = N; return cv; };
  const slices = [];
  const MOON = [-.45, -.35, .82];                                  // 위에서 비스듬히 오는 달빛 (모형 기준)
  for (let z = 0; z < HV; z++) {
    const base = mk(), e1 = mk(), e2 = mk();
    const ib = new ImageData(N, N), i1 = new ImageData(N, N), i2 = new ImageData(N, N);
    let any = false, has1 = false, has2 = false;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = get(x, y, z); if (!v) continue; any = true;
      const k = (y * N + x) * 4, c = v.c;
      if (v.glow) {
        ib.data.set([120, 34, 18, 255], k);
        const tg = v.glow === 1 ? (has1 = true, i1) : (has2 = true, i2);
        tg.data.set([c[0], c[1], c[2], 255], k);
        continue;
      }
      // 면 방향: 비어 있는 이웃 쪽을 향함. 틈 그늘: 둘레가 얼마나 막혔나
      let nx = 0, ny = 0, nz = 0, occ = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy && !dz) continue;
        if (get(x + dx, y + dy, z + dz) || (z + dz < 0)) { occ++; continue; }
        nx += dx; ny += dy; nz += dz;
      }
      let nl = Math.hypot(nx, ny, nz); if (nl < .01) { nx = 0; ny = 0; nz = 1; nl = 1; }
      nx /= nl; ny /= nl; nz /= nl;
      const lx = MID - x, ly = MID - y, lz = FZ - z, ld = Math.hypot(lx, ly, lz) || 1;
      const lam = Math.max(0, (nx * lx + ny * ly + nz * lz) / ld) * .8 + .2;
      const fire = lam * 1.25 / (1 + (ld / 15) ** 2 * 1.4);
      const moon = Math.max(0, nx * MOON[0] + ny * MOON[1] + nz * MOON[2]) * .45;
      const ao = 1 - occ / 26 * .55;
      const lr = (.12 + moon * .8 + fire) * ao, lg = (.12 + moon * .85 + fire * .64) * ao, lb = (.18 + moon * 1.1 + fire * .36) * ao;
      ib.data.set([Math.min(255, c[0] * lr * 1.6), Math.min(255, c[1] * lg * 1.6), Math.min(255, c[2] * lb * 1.6), v.a], k);
    }
    if (!any) continue;
    base.getContext('2d').putImageData(ib, 0, 0);
    e1.getContext('2d').putImageData(i1, 0, 0);
    e2.getContext('2d').putImageData(i2, 0, 0);
    slices.push({ z, base, e1: has1 && e1, e2: has2 && e2 });
  }
  return slices;
}

// 판 쌓아 그리기. glow: 기억을 태울 때 솟는 기운(0~), 숯불 판이 더 밝아짐
export function drawCampfire(stage, slices, t, glow) {
  const { ctx, sc, zs, cx, cy } = stage, rep = Math.max(1, Math.ceil(zs));
  const a1 = .55 + .45 * Math.sin(t * 1.9) * Math.sin(t * .7 + 2) + glow * .3;
  const a2 = .55 + .45 * Math.sin(t * 1.3 + 3) * Math.sin(t * .9) + glow * .3;
  ctx.imageSmoothingEnabled = false;
  for (const s of slices) for (let r = 0; r < rep; r++) { // 판 사이 틈이 없게 zs만큼 여러 번
    ctx.save();
    ctx.translate(cx, cy - s.z * zs - r * zs / rep);
    ctx.scale(sc, sc * STACK.SQ);
    ctx.rotate(stage.angle);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(s.base, -N / 2, -N / 2);
    ctx.globalCompositeOperation = 'lighter';
    if (s.e1) { ctx.globalAlpha = Math.max(.15, Math.min(1, a1)); ctx.drawImage(s.e1, -N / 2, -N / 2); }
    if (s.e2) { ctx.globalAlpha = Math.max(.15, Math.min(1, a2)); ctx.drawImage(s.e2, -N / 2, -N / 2); }
    ctx.restore();
  }
}
