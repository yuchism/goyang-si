/* 모닥불 불꽃·불똥·연기·불빛 (CAMPSITE_PLAN.md 4장, tasks/campsite-7-stack.md)
   - 입자: 불꽃(숯 더미에서 피어올라 가운데로 모이며 흔들림), 불똥(가끔, 누르거나 기억을 태우면 많이), 옅은 연기
   - 숫자는 바닷가 모닥불 POC에서 맞춘 것 — 화면 크기에 따라 stage.kp배
   - 불빛: 땅에 납작하게 번지는 둥근 빛 + 불 둘레 빛. breath(느린 숨)·flick(빠른 일렁임)
   - glow: 기억을 태울 때 잠깐 솟는 기운(memory.js가 burst) — 불꽃이 커지고 숯불 판이 밝아짐
   - 동작 줄이기: 몇 초 미리 태운 뒤 멈춘 불 */
export const FIRE = {
  rate: 150,          // 초당 불꽃 입자 (×kp)
  rise: [13, 12],     // 오르는 빠르기 [기본, 더해지는 범위] (×kp)
  life: [0.7, 0.9],
  spread: 6,          // 피어오르는 둘레 반지름 (×kp)
  sparks: 0.9,        // 초당 저절로 튀는 불똥
  smoke: 2.2,         // 초당 연기
  ground: 38,         // 땅에 번지는 불빛 반지름 (×kp)
};
const R = Math.random;
const fireCol = f => f < .12 ? [255, 245, 200] : f < .3 ? [255, 205, 80] : f < .55 ? [255, 135, 40] : f < .8 ? [220, 70, 25] : [140, 35, 20];

export function makeFire({ reduce }) {
  const flames = [], sparks = [], smoke = [];
  let acc = 0, burstQueue = 0, glow = 0, flick = 1, sway = 0, frozen = false;
  const step = (st, dt, t) => {
    const { cx, cy, kp, zs } = st, base = cy - 4 * zs;
    sway = Math.sin(t * .5) * .6 + Math.sin(t * 1.3 + 1) * .4;
    const breath = .8 + .2 * Math.sin(t * .35) + .1 * Math.sin(t * 1.7);
    flick = breath + .08 * Math.sin(t * 11) + .06 * Math.sin(t * 27.3) + .05 * (R() - .5) + glow * .4;
    glow = Math.max(0, glow - dt * .8);
    acc += FIRE.rate * flick * dt * Math.max(1, kp * .9) * (1 + glow * .6);
    while (acc > 1) {
      acc--;
      const a = R() * Math.PI * 2, r = Math.sqrt(R()) * FIRE.spread * kp;
      flames.push({ x: cx + Math.cos(a) * r, y: base + Math.sin(a) * r * .44, ox: cx, vy: -(FIRE.rise[0] + R() * FIRE.rise[1]) * kp * (1 + glow * .4),
        life: 0, max: (FIRE.life[0] + R() * FIRE.life[1]) * (1.15 - r / (8 * kp)) * (.8 + flick * .35), ph: R() * 6.28 });
    }
    if (R() < dt * FIRE.smoke) smoke.push({ x: cx + (R() - .5) * 4 * kp, y: base - 30 * kp, vy: -(3 + R() * 3) * kp, life: 0, max: 5 + R() * 4 });
    if (!reduce && R() < dt * FIRE.sparks) burstQueue += 1;
    while (burstQueue > 0) {
      sparks.push({ x: cx + (R() - .5) * 6 * kp, y: base - 4 * kp, vx: (R() - .5) * 22 * kp, vy: -(22 + R() * 38) * kp, life: 0, max: 1 + R() * 1.8 });
      burstQueue--;
    }
    for (let i = flames.length - 1; i >= 0; i--) {
      const p = flames[i];
      p.life += dt;
      p.f = p.life / p.max;
      if (p.f >= 1) { flames.splice(i, 1); continue; }
      p.vy -= 10 * kp * dt;
      p.x += ((p.ox - p.x) * 1.6 + (Math.sin(t * 7 + p.ph) * 3 + sway * 10 * p.f) * kp) * dt;
      p.y += p.vy * dt;
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life += dt;
      if (p.life >= p.max) { sparks.splice(i, 1); continue; }
      p.vy += 16 * kp * dt;
      p.vx *= 1 - dt * 1.4;
      p.x += (p.vx + (Math.sin(t * 4 + i) * 5 + sway * 6) * kp) * dt;
      p.y += p.vy * dt;
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      p.life += dt;
      if (p.life >= p.max) { smoke.splice(i, 1); continue; }
      p.x += (Math.sin(t * .8 + i) * 1.5 + sway * 4) * kp * dt;
      p.y += p.vy * dt;
    }
  };
  let lastCx = null;
  return {
    get glow() { return glow; },
    get flick() { return flick; },
    // 기억이 불에 들어감 (x, z는 세계 좌표 — 지금은 자리와 상관없이 가운데에서)
    burst(x, z, n = 12) { glow = Math.min(1.5, glow + .25); burstQueue += n; },
    // 톡 누름
    pop() { glow = Math.min(1.5, glow + .5); burstQueue += 20; },
    update(st, dt, t) {
      // 화면 크기가 바뀌면 입자 자리가 어긋나므로 비움
      if (lastCx !== null && lastCx !== st.cx * 1e4 + st.cy) { flames.length = sparks.length = smoke.length = 0; frozen = false; }
      lastCx = st.cx * 1e4 + st.cy;
      if (reduce) { // 멈춘 불: 처음에 몇 초 태워 두고 그대로
        if (!frozen) { for (let k = 0; k < 90; k++) step(st, 1 / 30, k / 30); frozen = true; }
        return;
      }
      step(st, dt, t);
    },
    // 땅에 번진 불빛 (판 쌓기 전에)
    drawGround(st) {
      const { ctx, cx, cy, kp } = st, G = FIRE.ground * kp * flick;
      ctx.globalCompositeOperation = 'lighter';
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, .44);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, G);
      g.addColorStop(0, `rgba(255,130,55,${(.2 * flick).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,130,55,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, G, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    },
    // 불꽃·불똥·연기 (판 쌓은 뒤)
    draw(st) {
      const { ctx, cx, cy, kp, zs } = st, base = cy - 4 * zs;
      ctx.globalCompositeOperation = 'lighter';
      const lit = ctx.createRadialGradient(cx, base - 6 * kp, 1, cx, base - 2 * kp, 34 * kp);
      lit.addColorStop(0, `rgba(255,150,60,${(.2 * flick).toFixed(3)})`);
      lit.addColorStop(1, 'rgba(255,120,50,0)');
      ctx.fillStyle = lit;
      ctx.fillRect(cx - 40 * kp, base - 46 * kp, 80 * kp, 80 * kp);
      const dim = Math.max(1, kp * .6);
      for (const p of flames) {
        const f = p.f, [r, g, b] = fireCol(f), sz = Math.max(1, Math.round((f < .25 ? 3 : f < .6 ? 2 : 1) * kp * .75));
        ctx.fillStyle = `rgba(${r},${g},${b},${((1 - f) * (f < .2 ? .22 : .42) / dim).toFixed(3)})`;
        ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
      }
      for (const p of sparks) {
        const f = p.life / p.max;
        if (R() < .85) { ctx.fillStyle = `rgba(255,${190 - f * 90 | 0},80,${(1 - f).toFixed(2)})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const p of smoke) {
        const f = p.life / p.max, sz = Math.round((2 + f * 7) * kp * .6);
        ctx.fillStyle = `rgba(140,140,165,${(.06 * Math.sin(f * Math.PI)).toFixed(3)})`;
        ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
      }
    },
  };
}
