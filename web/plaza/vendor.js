/* 붕어빵 노점 사장님 — 금붕생이 붕어빵 화로 로봇 (XMAS_PLAZA_PLAN.md 3-9, 그림 web/plaza/fishvendor.webp · tools/make_plaza_fishvendor.py)
   - 칸: ① 가게 보기 ② 붕어빵 집기 ③ 들어 보이기 ④ 한숨 ⑤ 졸기. 화로 몸통은 다섯 칸 한자리(anchor = 몸통 왼쪽 끝 · 바퀴 바닥 → vendor.at)
   - 평소 ①, 가끔(showEvery초쯤) ②→③ 붕어빵 자랑, 가끔(sighChance) ④ 한숨. 새벽(sleepHours) ⑤ 졸기
   - 누르면 ②→③ 한 번 (졸 땐 깨서). 굴뚝 김은 plaza.js 붕어빵 김(steam.from에 굴뚝 자리)
   - 동작 줄이기: ① 또는 ⑤ 고정 */
export function makeVendor(cfg, { RM, label, hourOf }) {
  const V = cfg.vendor, k = V.scale, [cw, ch] = V.cell, [ax, ay] = V.anchor, [x, y] = V.at;
  const x0 = x - ax * k, y0 = y - ay * k, w = cw * k, h = ch * k;
  const sheet = new Image();
  sheet.src = `fishvendor.webp?v=${cfg.v}`;
  let act = null, nextAct = 4 + Math.random() * V.showEvery; // act: [[칸, 초], ...] 남은 순서
  const show = t => { act = { t0: t, steps: [[1, 1.1], [2, 2.6]] }; };
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mbox';
  btn.setAttribute('aria-label', label);
  const [hx0, hy0, hx1, hy1] = V.hit;
  Object.assign(btn.style, { left: x0 + hx0 * k + 'px', top: y0 + hy0 * k + 'px', width: (hx1 - hx0) * k + 'px', height: (hy1 - hy0) * k + 'px' });
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
  const draw = (g, t, d) => {
    lastT = t;
    if (!sheet.complete || !sheet.naturalWidth)
      return;
    const fi = frameAt(t, d);
    g.save();
    g.globalAlpha = 0.2;
    g.fillStyle = '#1a1d2e';
    g.beginPath();
    g.ellipse(x0 + V.shadow[0] * k, y, V.shadow[1] * k, V.shadow[1] * k * 0.16, 0, 0, 7);
    g.fill();
    g.restore();
    // 졸 땐 아주 살짝 들썩 (숨)
    const bob = fi === 4 && !RM ? Math.sin(t * 1.4) * 0.6 : 0;
    g.drawImage(sheet, fi * cw, 0, cw, ch, x0, y0 + bob, w, h);
  };
  return { btn, draw, y };
}
