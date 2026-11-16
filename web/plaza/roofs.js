/* 지붕 위 엘프 그림자 · 이브 산타 썰매 그림자 (XMAS_PLAZA_PLAN.md 3-7, 그림 XMAS_PLAZA_ELF_ART.md)
   - 하늘 겹(stars 캔버스 — 광장 그림 뒤)에 그린다 → 건물·트리가 저절로 가린다. 엘프는 지붕 능선 위로만 보이고 트리 뒤를 지나갈 땐 숨는다
   - 지붕 길: 밤 그림 알파에서 열마다 위에서 처음 두껍게(thick px) 불투명한 곳 = 능선(가는 전선은 건너뜀). 트리 쪽(skip)은 양끝을 이어 트리 뒤로
   - 엘프: 달리기 → (가끔) 멈춰 내려다보기 → 능선이 확 바뀌는 곳은 폴짝 → (가끔) 미끄덩·엉덩방아·털고 일어나기 → 반대편 화면 밖
   - 언제: 밤(별이 뜬 만큼)엔 그림자, 낮엔 색 그대로(dayEvery) — 2026-11-16. every초 칸마다 chance 확률로 한 번(칸 안 시작은 고정 난수). 12/24·25 밤은 xmas 숫자(더 자주, 가끔 둘)
   - 썰매: 12/24 밤에만, 방 창밖 산타 그림(r/fx/santa_1·2)을 그림자로. 하늘 높이 천천히
   - 동작 줄이기: 없음. 미리보기(dev): ?elf=1(자주) ?elf=slip(늘 미끄덩) ?sleigh=1(자주) */
const clamp01 = v => Math.max(0, Math.min(1, v));
// 엘프 시트 칸(assets/briefs/XMAS_PLAZA_ELF_ART.md): ①~④ 달리기 · ⑤ 점프 · ⑥ 내려다보기 · ⑦ 미끄덩 · ⑧ 엉덩방아. 일어나기는 ⑧ → ⑥ → 달리기. 땅 위 엘프(elfrun.js)도 이것을 씀
export const ELF_FRAMES = { jump: 4, look: 5, up: 5, slip: 6, sit: 7 };

export function makeRoofs(cfg, { nightImg, RM, rnd, dev }) {
  const R = cfg.roofs, E = cfg.elf, S = cfg.sleigh, W = cfg.size[0];
  let ridge = null; // x(px)마다 능선 y (Float32Array, 폭 W)
  const buildRidge = () => {
    try {
      const im = nightImg, w = im.naturalWidth, h = Math.min(im.naturalHeight, R.maxY + R.thick);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, w, h).data, ys = new Float32Array(w);
      for (let col = 0; col < w; col++) {
        let y = R.maxY;
        for (let yy = 0; yy < R.maxY; yy++) {
          let ok = true;
          for (let k = 0; k < R.thick && ok; k++)
            ok = d[((yy + k) * w + col) * 4 + 3] > 200;
          if (ok) {
            y = yy;
            break;
          }
        }
        ys[col] = y;
      }
      for (const [a, b] of R.skip) { // 트리 쪽: 양끝 능선을 곧게 이어 트리 뒤로
        const ya = ys[Math.max(0, a - 1)], yb = ys[Math.min(w - 1, b + 1)];
        for (let col = a; col <= b && col < w; col++)
          ys[col] = ya + (yb - ya) * (col - a) / Math.max(1, b - a);
      }
      // 고르기(smooth px) — 지붕 결의 잔물결에 폴짝대지 않게
      const sm = R.smooth, out = new Float32Array(w);
      for (let col = 0; col < w; col++) {
        let sum = 0, n = 0;
        for (let k = Math.max(0, col - sm); k <= Math.min(w - 1, col + sm); k++) {
          sum += ys[k];
          n++;
        }
        out[col] = sum / n;
      }
      ridge = out;
    }
    catch (e) { ridge = null; }
  };
  if (nightImg.complete && nightImg.naturalWidth)
    buildRidge();
  else
    nightImg.addEventListener('load', buildRidge, { once: true });
  const ry = x => ridge ? ridge[Math.max(0, Math.min(W - 1, Math.round(x)))] : R.maxY;
  // 지붕 구간(runs [x, x]) 밖 = 지붕 사이 틈(회전목마 등) → 다음 구간으로 멀리뛰기
  const onRoof = x => x < 0 || x > W - 1 || R.runs.some(([a, b]) => x >= a && x <= b);
  const nextRoof = (x, dir) => {
    const xs = R.runs.map(([a, b]) => dir > 0 ? a : b).filter(v => dir > 0 ? v > x : v < x);
    return xs.length ? (dir > 0 ? Math.min(...xs) : Math.max(...xs)) + dir * 4 : x + dir * E.jumpLen;
  };

  const sheet = new Image();
  sheet.src = `elf.webp?v=${cfg.v}`;
  const santa = [1, 2].map(i => Object.assign(new Image(), { src: `../r/fx/santa_${i}.webp` }));
  let tmp = null;
  // 그림 한 칸을 그림자 색으로 칠해 그린다 (작은 캔버스에 칠한 뒤)
  const shadowDraw = (g, im, sx, sy, sw, sh, dx, dy, dw, dh, flip, alpha) => {
    if (!tmp)
      tmp = document.createElement('canvas');
    if (tmp.width !== sw || tmp.height !== sh)
      Object.assign(tmp, { width: sw, height: sh });
    const tg = tmp.getContext('2d');
    tg.globalCompositeOperation = 'source-over';
    tg.clearRect(0, 0, sw, sh);
    tg.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = cfg.roofs.shadow;
    tg.fillRect(0, 0, sw, sh);
    g.save();
    g.globalAlpha = alpha;
    g.translate(dx + (flip ? dw : 0), dy);
    if (flip)
      g.scale(-1, 1);
    g.drawImage(tmp, 0, 0, dw, dh);
    g.restore();
  };

  /* ── 엘프 */
  const elves = [];
  let lastSlot = -1, lastSleigh = -1, sleigh = null;
  const DEV_ELF = dev.elf, DEV_SLEIGH = dev.sleigh;
  const newElf = (t, dir, delay = 0) => {
    const q = j => Math.random();
    const slip = DEV_ELF === 'slip' || q() < E.slipChance;
    elves.push({ dir, x: dir > 0 ? -30 : W + 30, t0: t + delay, phase: 'run', until: 0, jump: null,
      lookAt: q() < E.lookChance ? E.lookX[0] + q() * (E.lookX[1] - E.lookX[0]) : null,
      slipAt: slip ? E.slipX[0] + q() * (E.slipX[1] - E.slipX[0]) : null, speed: E.speed[0] + q() * (E.speed[1] - E.speed[0]) });
  };
  const update = (t, dt, nightK, xmasNight, eveNight) => {
    if (RM || !ridge)
      return;
    // 등장: 밤엔 그림자, 낮엔 색 그대로(2026-11-16) — 해 질 녘·새벽 반쯤일 땐 안 나옴
    const isDay = nightK < 0.2;
    if (nightK > 0.6 || isDay) {
      const every = DEV_ELF ? E.devEvery : isDay ? E.dayEvery : xmasNight ? E.xmasEvery : E.every, slot = Math.floor(t / every);
      const at = slot * every + rnd('elf', slot) * every * 0.6;
      if (slot !== lastSlot && t >= at) {
        lastSlot = slot;
        if (DEV_ELF || rnd('elfOn', slot) < (xmasNight ? E.xmasChance : E.chance)) {
          const dir = rnd('elfDir', slot) < 0.5 ? 1 : -1;
          newElf(t, dir);
          if (xmasNight && rnd('elfPair', slot) < E.pairChance)
            newElf(t, dir, E.pairDelay);
        }
      }
      // 썰매: 12/24 밤
      if (!isDay && (eveNight || DEV_SLEIGH) && !sleigh) {
        const ev = DEV_SLEIGH ? S.devEvery : S.every, s2 = Math.floor(t / ev);
        if (s2 !== lastSleigh && t >= s2 * ev + rnd('sleigh', s2) * ev * 0.5) {
          lastSleigh = s2;
          if (DEV_SLEIGH || rnd('sleighOn', s2) < S.chance)
            sleigh = { t0: t, dir: rnd('sleighDir', s2) < 0.5 ? 1 : -1, y: S.y[0] + rnd('sleighY', s2) * (S.y[1] - S.y[0]) };
        }
      }
    }
    for (const e of elves) {
      if (t < e.t0)
        continue;
      if (e.phase === 'look' || e.phase === 'slip' || e.phase === 'sit' || e.phase === 'up') {
        if (e.phase === 'slip')
          e.x += e.dir * E.slipSlide * dt / E.slipSec;
        if (t >= e.until) {
          const next = { look: ['run', 0], slip: ['sit', E.sitSec], sit: ['up', E.upSec], up: ['run', 0] }[e.phase];
          e.phase = next[0];
          e.until = t + next[1];
        }
        continue;
      }
      if (e.jump) { // 폴짝: 포물선
        const j = e.jump, p = clamp01((t - j.t0) / j.sec);
        e.x = j.x0 + (j.x1 - j.x0) * p;
        e.y = j.y0 + (j.y1 - j.y0) * p - Math.sin(Math.PI * p) * (j.h || E.jumpH);
        if (p >= 1)
          e.jump = null;
        continue;
      }
      const nx = e.x + e.dir * e.speed * dt;
      if (!onRoof(nx + e.dir * 4)) { // 지붕 끝 → 틈 건너 멀리뛰기
        const x1 = nextRoof(e.x, e.dir), d = Math.abs(x1 - e.x);
        e.jump = { t0: t, sec: E.jumpSec * Math.max(1, Math.sqrt(d / E.jumpLen)), x0: e.x, x1, y0: ry(e.x), y1: ry(x1), h: E.jumpH * Math.max(1, d / E.jumpLen * 0.5) };
        continue;
      }
      // 앞 능선이 확 바뀌면 폴짝 (jumpLen 앞 땅으로)
      const ahead = ry(nx + e.dir * 6), here = ry(e.x);
      if (Math.abs(ahead - here) > E.jumpDy) {
        const x1 = e.x + e.dir * E.jumpLen;
        e.jump = { t0: t, sec: E.jumpSec, x0: e.x, x1, y0: here, y1: ry(x1) };
        continue;
      }
      if (e.lookAt !== null && (e.dir > 0 ? e.x < e.lookAt && nx >= e.lookAt : e.x > e.lookAt && nx <= e.lookAt)) {
        e.lookAt = null;
        e.phase = 'look';
        e.until = t + E.lookSec;
      }
      else if (e.slipAt !== null && (e.dir > 0 ? e.x < e.slipAt && nx >= e.slipAt : e.x > e.slipAt && nx <= e.slipAt)) {
        e.slipAt = null;
        e.phase = 'slip';
        e.until = t + E.slipSec;
      }
      e.x = nx;
      e.y = ry(e.x);
      e.gone = e.dir > 0 ? e.x > W + 40 : e.x < -40;
    }
    for (let i = elves.length - 1; i >= 0; i--)
      if (elves[i].gone)
        elves.splice(i, 1);
    if (sleigh && (t - sleigh.t0) > S.sec)
      sleigh = null;
  };

  // vis: 밤 정도(별 세기) — 그만큼 그림자, 나머지는 색 그대로
  const draw = (g, t, vis) => {
    if (RM)
      return;
    if (sheet.complete && sheet.naturalWidth) {
      const cell = sheet.naturalHeight, k = E.scale;
      for (const e of elves) {
        if (t < e.t0 || e.y == null)
          continue;
        const fi = e.jump ? ELF_FRAMES.jump : ELF_FRAMES[e.phase] ?? Math.floor((t - e.t0) * E.fps) % 4;
        const w = cell * k, foot = E.foot * k;
        const dx = e.x - w / 2, dy = e.y - foot + E.sink;
        if (vis < 0.99) { // 낮: 색 그대로
          g.save();
          g.globalAlpha = 1 - vis;
          g.translate(dx + (e.dir < 0 ? w : 0), dy);
          if (e.dir < 0)
            g.scale(-1, 1);
          g.drawImage(sheet, fi * cell, 0, cell, cell, 0, 0, w, w);
          g.restore();
        }
        if (vis > 0.01)
          shadowDraw(g, sheet, fi * cell, 0, cell, cell, dx, dy, w, w, e.dir < 0, vis);
      }
    }
    if (vis > 0.01 && sleigh && santa[0].complete && santa[0].naturalWidth) {
      const p = (t - sleigh.t0) / S.sec, im = santa[Math.floor(t * 4) % 2], w = im.naturalWidth * S.scale, h = im.naturalHeight * S.scale;
      const x = sleigh.dir > 0 ? -w + (W + w * 2) * p : W + w - (W + w * 2) * p;
      const y = sleigh.y + Math.sin(t * 1.6) * 6;
      shadowDraw(g, im, 0, 0, im.naturalWidth, im.naturalHeight, x - w / 2, y - h / 2, w, h, sleigh.dir > 0, vis * 0.95);
      // 루돌프 코만 빨갛게 반짝 (방 창밖 산타와 같은 자리, 그림 px S.nose)
      const nx = sleigh.dir > 0 ? x + w / 2 - S.nose[0] * S.scale : x - w / 2 + S.nose[0] * S.scale, ny = y - h / 2 + S.nose[1] * S.scale;
      const gr = g.createRadialGradient(nx, ny, 0, nx, ny, 7);
      gr.addColorStop(0, `rgba(255,90,80,${(0.55 + 0.25 * Math.sin(t * 6)) * vis})`);
      gr.addColorStop(1, 'rgba(255,90,80,0)');
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = gr;
      g.fillRect(nx - 7, ny - 7, 14, 14);
      g.restore();
    }
  };
  return { update, draw };
}
