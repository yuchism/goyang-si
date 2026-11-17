/* 붕어빵 가판대를 누르면 (2026-11-17, PLAZA_PLAN.md 4-6): 굽는 판 틀 하나에서 노릇한 붕어빵이 퐁 튀어 공중제비를 돌고
   오른쪽 바구니로 쏙. 그림 web/plaza/props/taiyaki.webp(주인이 ChatGPT로, 원본 assets/plaza/props/bungeoppang-v1.png), 움직임은 코드. scene.json taiyaki
   - 여러 번 누르면 여러 마리가 따로 날아감(동시에 max마리까지). 밤에도 같은 그림. 동작 줄이기: 없음 */
export function makeTaiyaki(cfg, { RM }) {
  const T = cfg.taiyaki, im = Object.assign(new Image(), { src: `props/taiyaki.webp?v=${cfg.v}` });
  const flying = [];
  const ease = p => p * p * (3 - 2 * p);
  const tap = (x, y, t) => {
    const [x0, y0, x1, y1] = T.hit;
    if (RM || x < x0 || x > x1 || y < y0 || y > y1)
      return false;
    if (flying.length < T.max && im.naturalWidth) {
      const m = T.molds[Math.floor(Math.random() * T.molds.length)];
      flying.push({ t0: t, from: m, to: [T.basket[0] + (Math.random() - 0.5) * T.basketSpread, T.basket[1]], h: T.height * (0.85 + Math.random() * 0.3), spin: Math.random() < 0.5 ? 1 : -1 });
    }
    return true;
  };
  const draw = (g, t) => {
    if (!im.naturalWidth)
      return;
    const w = T.w, h = w * im.naturalHeight / im.naturalWidth;
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i], u = (t - f.t0) / T.sec;
      if (u > 1) {
        flying.splice(i, 1);
        continue;
      }
      // 처음 0.12는 틀에서 솟음(찌그러졌다 늘어남), 그 뒤 포물선 + 공중제비, 바구니에 닿으면 살짝 눌렸다 바구니 속으로 스르륵
      const p = ease(Math.min(1, u / T.fly)), land = Math.max(0, (u - T.fly) / (1 - T.fly));
      const x = f.from[0] + (f.to[0] - f.from[0]) * p;
      const y = f.from[1] + (f.to[1] - f.from[1]) * p - Math.sin(Math.PI * p) * f.h;
      const rot = f.spin * Math.PI * 2 * T.spins * p;
      const sq = u < 0.06 ? 1 - u / 0.06 * 0.25 : land > 0 ? 1 - 0.2 * Math.sin(Math.PI * Math.min(1, land * 2)) : 1;
      g.save();
      g.globalAlpha = land > 0.5 ? 1 - (land - 0.5) * 2 : 1;
      g.translate(x, y + land * 6);
      g.rotate(rot);
      g.scale(1 / Math.sqrt(sq), sq);
      g.drawImage(im, -w / 2, -h / 2, w, h);
      g.restore();
    }
  };
  return { tap, draw };
}
