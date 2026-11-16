/* 땅 위 엘프 — 크리스마스 트리 ↔ 회전목마 뒤를 뛰어다님 (회의 2026-11-16, 그림 web/plaza/elf.webp — 지붕 그림자와 같은 8칸, 여기선 색 그대로)
   - 광장 뒤쪽 바닥 길(path: y, x 범위)을 달린다. 길의 y가 트리·회전목마 소품의 앞뒤 기준보다 작아서 둘 뒤로 지나가면 가려진다
   - 한 번에 한 명(크리스마스 밤엔 가끔 둘), every초 칸마다 chance. 가다가 가끔 멈춰 두리번(⑤), 가끔 미끄덩(⑥ → ⑦ → ⑧)
   - 누르면(tapAt) 달리던 엘프가 그 자리에서 미끄덩 (2026-11-17)
   - 크리스마스(xmasPlaza) 기간에만, 낮·밤 모두. 동작 줄이기: 없음. 미리보기 ?elfrun=1 */
import { ELF_FRAMES } from './roofs.js';

export function makeElfRun(cfg, { RM, dev, key = 'elfRun' }) {
  const E = cfg[key], R = cfg.elf;
  const sheet = Object.assign(new Image(), { src: `elf.webp?v=${cfg.v}` });
  const list = [];
  let lastSlot = -1;
  const spawn = (t, dir, delay = 0) => {
    const slip = Math.random() < E.slipChance, look = Math.random() < E.lookChance;
    const [a, b] = E.x, span = b - a;
    list.push({ dir, x: dir > 0 ? a - 30 : b + 30, t0: t + delay, phase: 'run', until: 0, speed: E.speed[0] + Math.random() * (E.speed[1] - E.speed[0]),
      lookAt: look ? a + span * (0.2 + Math.random() * 0.6) : null, slipAt: slip ? a + span * (0.2 + Math.random() * 0.6) : null });
  };
  const update = (t, dt, xmasNight) => {
    if (RM)
      return;
    const every = dev ? E.devEvery : E.every, slot = Math.floor(t / every);
    if (slot !== lastSlot && t >= slot * every + (dev ? 0 : Math.random() * every * 0.4)) {
      lastSlot = slot;
      if (dev || Math.random() < E.chance) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        spawn(t, dir);
        if (xmasNight && Math.random() < R.pairChance)
          spawn(t, dir, R.pairDelay);
      }
    }
    for (const e of list) {
      if (t < e.t0)
        continue;
      if (e.phase !== 'run') {
        if (e.phase === 'slip')
          e.x += e.dir * R.slipSlide * 0.7 * dt / R.slipSec;
        if (t >= e.until) {
          const next = { look: ['run', 0], slip: ['sit', R.sitSec], sit: ['up', R.upSec], up: ['run', 0] }[e.phase];
          e.phase = next[0];
          e.until = t + next[1];
        }
        continue;
      }
      const nx = e.x + e.dir * e.speed * dt;
      const cross = v => v !== null && (e.dir > 0 ? e.x < v && nx >= v : e.x > v && nx <= v);
      if (cross(e.lookAt)) {
        e.lookAt = null;
        e.phase = 'look';
        e.until = t + R.lookSec;
      }
      else if (cross(e.slipAt)) {
        e.slipAt = null;
        e.phase = 'slip';
        e.until = t + R.slipSec;
      }
      e.x = nx;
      e.gone = e.dir > 0 ? e.x > E.x[1] + 40 : e.x < E.x[0] - 40;
    }
    for (let i = list.length - 1; i >= 0; i--)
      if (list[i].gone)
        list.splice(i, 1);
  };
  const draw = (g, t) => {
    if (!sheet.complete || !sheet.naturalWidth)
      return;
    const cell = sheet.naturalHeight, k = E.scale, w = cell * k;
    for (const e of list) {
      if (t < e.t0)
        continue;
      const fi = ELF_FRAMES[e.phase] ?? Math.floor((t - e.t0) * R.fps) % 4; // 칸 번호는 roofs.js와 같이 (2026-11-16: 한 칸씩 밀려 있던 것 고침)
      const hop = e.phase === 'run' ? Math.abs(Math.sin((t - e.t0) * R.fps * Math.PI / 2)) * E.hop : 0;
      const fade = Math.min(1, Math.min(e.x - (E.x[0] - 30), (E.x[1] + 30) - e.x) / 30); // 길 양끝에서 스르륵
      g.save();
      g.globalAlpha = Math.max(0, fade);
      g.translate(e.x, E.y - hop);
      if (e.dir < 0)
        g.scale(-1, 1);
      g.drawImage(sheet, fi * cell, 0, cell, cell, -w / 2, -R.foot * k, w, w);
      g.restore();
    }
  };
  // 누른 자리에서 달리던 엘프가 미끄덩. 맞았으면 true
  const tapAt = (x, y, t) => {
    const w = (sheet.naturalHeight || 256) * E.scale;
    const e = list.find(e => t >= e.t0 && e.phase === 'run' && Math.abs(x - e.x) < w * 0.35 + 10 && y > E.y - R.foot * E.scale * 0.85 - 10 && y < E.y + 12);
    if (!e)
      return false;
    Object.assign(e, { phase: 'slip', until: t + R.slipSec, slipAt: null });
    return true;
  };
  return { update, draw, tapAt, y: E.y };
}
