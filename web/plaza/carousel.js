/* 도는 회전목마 (PLAZA_SEASONS_PLAN.md — 소품을 부품으로 나눠 코드로 움직이기, 회의 2026-11-16)
   그림(주인이 ChatGPT로, 지금은 낮 것만 — 실험해 보고 좋으면 밤 것도):
   - props/carousel-empty-day.webp: 말·막대를 뺀 회전목마(지붕·가운데 기둥·받침·바깥 기둥 둘). 원래 회전목마 그림과 같은 크기·자리(cfg.carousel.at)
   - props/carousel-horse-day.webp: 막대에 꽂힌 말 옆모습(왼쪽을 봄) 2칸(다리 바뀜)
   그리는 순서(회전목마 칸 안): 뒤쪽 말 → 빈 회전목마 전체 → 앞쪽 말 → 지붕(roofCut 위)만 다시 — 말 막대 꼭대기가 지붕 속으로
   - 말 n마리가 받침 위 타원(ring)을 돈다. 앞쪽은 왼쪽으로(그림 그대로), 뒤쪽은 오른쪽으로(뒤집기). 앞일수록 조금 크게
   - 말은 막대를 따라 오르락내리락(bob) — 막대 아래끝은 받침 속으로 잘라 넣어 틈이 안 보이게
   - 밤: 밤 그림이 오기 전까지 남색을 얹어 어둡게(night). 동작 줄이기: 멈춘 모습 */
export function makeCarousel(cfg, { RM }) {
  const C = cfg.carousel, [ox, oy] = C.at, [cw, ch] = C.size;
  const load = f => Object.assign(new Image(), { src: `props/${f}?v=${cfg.v}` });
  const empty = load(C.empty), horse = load(C.horse);
  const ok = im => im.complete && im.naturalWidth > 0;
  const buf = document.createElement('canvas');
  Object.assign(buf, { width: cw, height: ch });
  const b = buf.getContext('2d');
  const [hw, hh] = C.horseCell, k = C.horseScale, [cx, cy] = C.ring.center, [rx, ry] = C.ring.r;
  const drawHorse = (th, i, t) => {
    const s = Math.sin(th), front = s > 0, depth = C.depth[0] + (C.depth[1] - C.depth[0]) * (s + 1) / 2;
    const x = cx + rx * Math.cos(th), base = cy + ry * s; // 막대가 받침에 꽂히는 자리
    const bob = RM ? 0 : Math.sin(th * 2 + i * 1.7) * C.bob;
    const fi = RM ? 0 : Math.floor((t * C.legFps + i * 0.5)) % 2;
    const kk = k * depth, px = C.pole[fi], w = hw * kk, h = hh * kk;
    b.save();
    b.beginPath(); // 받침 아래로는 안 보이게 (막대가 받침 속으로)
    b.rect(0, 0, cw, base + 1);
    b.clip();
    b.translate(x, base + C.sink * kk - C.poleBottom * kk + bob);
    if (!front)
      b.scale(-1, 1);
    b.drawImage(horse, fi * hw, 0, hw, hh, -px * kk, 0, w, h);
    b.restore();
  };
  const draw = (g, t, mix) => {
    if (!ok(empty) || !ok(horse))
      return false;
    b.clearRect(0, 0, cw, ch);
    const a0 = RM ? C.rmAngle : t * C.speed;
    const hs = [...Array(C.n).keys()].map(i => [a0 + i * Math.PI * 2 / C.n, i]);
    for (const [th, i] of hs)
      if (Math.sin(th) <= 0)
        drawHorse(th, i, t);
    b.drawImage(empty, 0, 0);
    for (const [th, i] of hs.filter(([th]) => Math.sin(th) > 0).sort((p, q) => Math.sin(p[0]) - Math.sin(q[0])))
      drawHorse(th, i, t);
    b.drawImage(empty, 0, 0, cw, C.roofCut, 0, 0, cw, C.roofCut);
    if (mix > 0.01) { // 밤 그림이 오기 전: 남색을 얹어 어둡게
      b.globalCompositeOperation = 'source-atop';
      b.fillStyle = `rgba(${C.night.rgb},${(Math.min(1, mix) * C.night.a).toFixed(3)})`;
      b.fillRect(0, 0, cw, ch);
      b.globalCompositeOperation = 'source-over';
    }
    g.drawImage(buf, ox, oy);
    return true;
  };
  return { draw };
}
