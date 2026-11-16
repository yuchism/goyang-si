/* 도는 회전목마 (PLAZA_PLAN.md — 소품을 부품으로 나눠 코드로 움직이기, 회의 2026-11-16)
   그림(주인이 ChatGPT로, 낮·밤):
   - props/carousel-empty-day·night.webp: 말·막대를 뺀 회전목마(지붕·가운데 기둥·받침·바깥 기둥 둘). 원래 회전목마 그림과 같은 크기·자리(cfg.carousel.at)
   - props/carousel-horse-day·night.webp: 막대에 꽂힌 말 옆모습(왼쪽을 봄) 2칸(다리 바뀜). 밤 그림은 막대 자리가 조금 달라 pole·poleBottom을 따로
   그리는 순서(회전목마 칸 안): 뒤쪽 말 → 빈 회전목마 전체 → 앞쪽 말 → 지붕(roofCut 위)만 다시 — 말 막대 꼭대기가 지붕 속으로
   - 말 n마리가 받침 위 타원(ring)을 돈다. 앞쪽은 왼쪽으로(그림 그대로), 뒤쪽은 오른쪽으로(뒤집기). 앞일수록 조금 크게
   - 말은 막대를 따라 오르락내리락(bob) — 막대 아래끝은 받침 속으로 잘라 넣어 틈이 안 보이게
   - 밤: 낮 그린 것 위에 밤 그린 것을 mix만큼(배경·소품과 같은 넘어가기). 밤 그림이 없으면 남색을 얹어 어둡게(night). 동작 줄이기: 멈춘 모습
   - 노래가 나올 때만 돈다(회의 2026-11-16) — 오르골(musicbox.js)과 같은 노래: 펠리컨을 누르든 회전목마를 누르든 같은 순서로 넘김.
     멈출 땐 스르륵 느려지고, 돌기 시작할 땐 스르륵 빨라짐(spinUp초). 밤에 돌 땐 환하게: 회전목마를 밝게 한 번 더 얹고(glow.a) 지붕 둘레 전구(glow.bulbs)가 차례로 반짝 */
import { tintAtop } from './plaza-kit.js';
export function makeCarousel(cfg, { RM, playing, onTap, label }) {
  const C = cfg.carousel, [ox, oy] = C.at, [cw, ch] = C.size;
  const load = f => Object.assign(new Image(), { src: `props/${f}?v=${cfg.v}` });
  const sets = { day: { empty: load(C.empty), horse: load(C.horse), pole: C.pole, poleBottom: C.poleBottom } };
  if (C.nightSet)
    sets.night = { empty: load(C.nightSet.empty), horse: load(C.nightSet.horse), pole: C.nightSet.pole, poleBottom: C.nightSet.poleBottom };
  const ok = im => im.complete && im.naturalWidth > 0;
  const buf = document.createElement('canvas');
  Object.assign(buf, { width: cw, height: ch });
  const b = buf.getContext('2d');
  let ang = C.rmAngle, sp = 0, lastT = null; // 각도·도는 정도(0~1)
  const G = C.glow;
  const bulb = (() => { // 지붕 둘레 전구 빛 하나
    const c = document.createElement('canvas'), r = G.r * 2;
    Object.assign(c, { width: r * 2, height: r * 2 });
    const x = c.getContext('2d'), gr = x.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, 'rgba(255,250,215,1)');
    gr.addColorStop(0.35, 'rgba(255,214,120,0.75)');
    gr.addColorStop(1, 'rgba(255,190,90,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, r * 2, r * 2);
    return c;
  })();
  // 누르는 자리 (회전목마 그림 위): 오르골과 같은 노래 넘기기
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mbox';
  btn.setAttribute('aria-label', label);
  const [bx0, by0, bx1, by1] = C.hit;
  Object.assign(btn.style, { left: ox + bx0 + 'px', top: oy + by0 + 'px', width: bx1 - bx0 + 'px', height: by1 - by0 + 'px' });
  btn.addEventListener('click', () => onTap && onTap());
  const [hw, hh] = C.horseCell, k = C.horseScale, [cx, cy] = C.ring.center, [rx, ry] = C.ring.r;
  const drawHorse = (S, th, i, t) => {
    const s = Math.sin(th), front = s > 0, depth = C.depth[0] + (C.depth[1] - C.depth[0]) * (s + 1) / 2;
    const x = cx + rx * Math.cos(th), base = cy + ry * s; // 막대가 받침에 꽂히는 자리
    const bob = RM ? 0 : Math.sin(th * 2 + i * 1.7) * C.bob;
    const fi = RM ? 0 : Math.floor((ang / C.speed * C.legFps + i * 0.5)) % 2; // 다리는 도는 만큼만 바뀜
    const kk = k * depth, px = S.pole[fi], w = hw * kk, h = hh * kk;
    b.save();
    b.beginPath(); // 받침 아래로는 안 보이게 (막대가 받침 속으로)
    b.rect(0, 0, cw, base + 1);
    b.clip();
    b.translate(x, base + C.sink * kk - S.poleBottom * kk + bob);
    if (!front)
      b.scale(-1, 1);
    b.drawImage(S.horse, fi * hw, 0, hw, hh, -px * kk, 0, w, h);
    b.restore();
  };
  const render = (S, t) => {
    b.clearRect(0, 0, cw, ch);
    const a0 = ang;
    const hs = [...Array(C.n).keys()].map(i => [a0 + i * Math.PI * 2 / C.n, i]);
    for (const [th, i] of hs)
      if (Math.sin(th) <= 0)
        drawHorse(S, th, i, t);
    b.drawImage(S.empty, 0, 0);
    for (const [th, i] of hs.filter(([th]) => Math.sin(th) > 0).sort((p, q) => Math.sin(p[0]) - Math.sin(q[0])))
      drawHorse(S, th, i, t);
    b.drawImage(S.empty, 0, 0, cw, C.roofCut, 0, 0, cw, C.roofCut);
  };
  const ready = S => S && ok(S.empty) && ok(S.horse);
  const draw = (g, t, mix) => {
    const D = sets.day, N = sets.night;
    if (!ready(D))
      return false;
    const dt = lastT === null ? 0 : Math.min(0.1, t - lastT);
    lastT = t;
    const on = !RM && playing && playing();
    sp = Math.max(0, Math.min(1, sp + (on ? 1 : -1) * dt / C.spinUp));
    ang += C.speed * sp * dt;
    const nightPic = ready(N);
    if (mix < 0.999 || !nightPic) {
      render(D, t);
      if (!nightPic && mix > 0.01) { // 밤 그림이 없을 때: 남색을 얹어 어둡게
        tintAtop(b, cw, ch, `rgba(${C.night.rgb},${(Math.min(1, mix) * C.night.a).toFixed(3)})`);
      }
      g.drawImage(buf, ox, oy);
    }
    if (nightPic && mix > 0.001) {
      render(N, t);
      g.globalAlpha = Math.min(1, mix);
      g.drawImage(buf, ox, oy);
      g.globalAlpha = 1;
    }
    // 밤에 돌 땐 환하게 (낮엔 그대로)
    const gk = Math.min(1, mix) * sp;
    if (gk > 0.01) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = G.a * gk;
      g.drawImage(buf, ox, oy); // 방금 그린 회전목마를 한 번 더 — 전체가 밝아짐
      const n = G.bulbs, [x0, x1] = G.x, [yTop, sag] = G.y;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), bx = x0 + (x1 - x0) * u, by = yTop + sag * (1 - (2 * u - 1) ** 2);
        const tw = 0.55 + 0.45 * Math.sin(t * G.chase - i * 0.9); // 차례로 반짝
        g.globalAlpha = gk * tw;
        g.drawImage(bulb, ox + bx - G.r * 2, oy + by - G.r * 2);
      }
      g.restore();
    }
    return true;
  };
  return { draw, btn };
}
