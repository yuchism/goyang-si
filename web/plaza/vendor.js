/* 붕어빵 노점 사장님 — 금붕생이 붕어빵 화로 로봇 (PLAZA_PLAN.md 4-6, 그림 web/plaza/fishvendor.webp · tools/make_plaza_fishvendor.py)
   - 칸: ① 가게 보기 ② 붕어빵 집기 ③ 들어 보이기 ④ 한숨 ⑤ 졸기. 화로 몸통은 다섯 칸 한자리(anchor = 몸통 왼쪽 끝 · 바퀴 바닥 → vendor.at)
   - 평소 ①, 가끔(showEvery초쯤) ②→③ 붕어빵 자랑, 가끔(sighChance) ④ 한숨. 새벽(sleepHours) ⑤ 졸기
   - 노점 옆(roam[0])과 오르골 근처(roam[1]) 사이를 바퀴로 천천히 왔다 갔다(돌지 않고 굴러감), 멈춰서 wait초 쉬는 동안 자랑·한숨
   - 누르면 ②→③ 한 번 (졸 땐 깨서). 굴뚝 김은 plaza.js 붕어빵 김이 chimney()로 따라 그림
   - 동작 줄이기: ① 또는 ⑤ 고정 */
export function makeVendor(cfg, { RM, label, hourOf }) {
  const V = cfg.vendor, k = V.scale, [cw, ch] = V.cell, [ax, ay] = V.anchor, y = V.at[1];
  let x = V.at[0], goal = x, waitTill = 3 + Math.random() * 4, moving = false;
  const y0 = y - ay * k, w = cw * k, h = ch * k;
  const left = () => x - ax * k;
  const sheet = new Image();
  sheet.src = `fishvendor.webp?v=${cfg.v}`;
  let act = null, nextAct = 4 + Math.random() * V.showEvery; // act: [[칸, 초], ...] 남은 순서
  const show = t => { act = { t0: t, steps: [[1, 1.1], [2, 2.6]] }; };
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mbox';
  btn.setAttribute('aria-label', label);
  const [hx0, hy0, hx1, hy1] = V.hit;
  Object.assign(btn.style, { left: left() + hx0 * k + 'px', top: y0 + hy0 * k + 'px', width: (hx1 - hx0) * k + 'px', height: (hy1 - hy0) * k + 'px' });
  let lastT = 0;
  btn.addEventListener('click', () => { if (!RM) show(lastT); });
  const frameAt = (t, d) => {
    const hr = hourOf(d), asleep = hr >= V.sleepHours[0] && hr < V.sleepHours[1];
    if (RM)
      return asleep ? 4 : 0;
    if (act) {
      let e = t - act.t0;
      for (const [f, sec] of act.steps) {
        if (e < sec)
          return f;
        e -= sec;
      }
      act = null;
    }
    if (asleep)
      return 4;
    if (moving)
      return 0;
    if (t >= nextAct) {
      nextAct = t + V.showEvery * (0.6 + Math.random() * 0.8);
      if (Math.random() < V.sighChance)
        act = { t0: t, steps: [[3, 3.2]] };
      else
        show(t);
      return frameAt(t, d);
    }
    return 0;
  };
  // 왔다 갔다: 쉬다가 roam 안의 새 자리로 speed px/초. 자랑·한숨 중이거나 졸 땐 안 움직임
  const move = (t, dt, d) => {
    const hr = hourOf(d);
    if (RM || act || (hr >= V.sleepHours[0] && hr < V.sleepHours[1])) {
      moving = false;
      return;
    }
    if (!moving && t >= waitTill) {
      const [a, b] = V.roam;
      let ng = a + Math.random() * (b - a);
      if (Math.abs(ng - x) < V.minStep)
        ng = x + (x < (a + b) / 2 ? 1 : -1) * V.minStep;
      goal = Math.max(a, Math.min(b, ng));
      moving = true;
    }
    if (moving) {
      const st = Math.sign(goal - x) * V.speed * dt;
      if (Math.abs(goal - x) <= Math.abs(st)) {
        x = goal;
        moving = false;
        waitTill = t + V.wait[0] + Math.random() * (V.wait[1] - V.wait[0]);
        nextAct = Math.min(nextAct, t + 1.5 + Math.random() * 2); // 멈추면 곧 붕어빵 한 번
      }
      else
        x += st;
      btn.style.left = left() + hx0 * k + 'px';
    }
  };
  let lastDrawT = 0;
  const draw = (g, t, d) => {
    lastT = t;
    move(t, Math.min(0.1, t - lastDrawT), d);
    lastDrawT = t;
    if (!sheet.complete || !sheet.naturalWidth)
      return;
    const fi = frameAt(t, d), x0 = left();
    g.save();
    g.globalAlpha = 0.2;
    g.fillStyle = '#1a1d2e';
    g.beginPath();
    g.ellipse(x0 + V.shadow[0] * k, y, V.shadow[1] * k, V.shadow[1] * k * 0.16, 0, 0, 7);
    g.fill();
    g.restore();
    // 졸 땐 아주 살짝 들썩 (숨)
    const bob = fi === 4 && !RM ? Math.sin(t * 1.4) * 0.6 : moving ? Math.abs(Math.sin(t * 9)) * -1.2 : 0; // 굴러갈 땐 덜덜
    g.drawImage(sheet, fi * cw, 0, cw, ch, x0, y0 + bob, w, h);
  };
  const chimney = () => [left() + V.chimney[0] * k, y0 + V.chimney[1] * k];
  return { btn, draw, y, chimney };
}
