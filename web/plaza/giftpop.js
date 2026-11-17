/* 선물 상자를 누르면 (2026-11-17, PLAZA_PLAN·XMAS_PLAZA_PLAN 3-1): 상자가 찌그러졌다 통 튀고(들썩),
   위로 색종이·반짝이가 퐁 터져 내려오고, 작은 하트·별이 둥실 떠올랐다 사라진다. 그림 없이 코드로만. scene.json giftPop
   - ids: 누를 수 있는 소품 id. 소품 그림 칸 안(inset만큼 안쪽)을 누르면 그 상자만
   - 동작 줄이기: 없음 */
const CONF = ['#e8473b', '#3f9c4a', '#f2c230', '#4a8fd8', '#ff8fb1', '#ffffff'];
export function makeGiftPop(cfg, { RM }) {
  const P = cfg.giftPop, state = {}; // id → 누른 때
  const parts = [];
  const tap = (p, x, y, t) => {
    const im = p.im[0];
    if (RM || !P.ids.includes(p.id) || !im.naturalWidth)
      return false;
    const [px, py] = p.at, w = im.naturalWidth, h = im.naturalHeight, m = P.inset;
    if (x < px + w * m || x > px + w * (1 - m) || y < py + h * m || y > py + h)
      return false;
    if (t - (state[p.id] || -1e9) < P.sec * 0.5) // 너무 연달아 누르면 한 번
      return true;
    state[p.id] = t;
    const cx = px + w / 2, top = py + h * 0.15, R = Math.random;
    for (let i = 0; i < P.confetti; i++) {
      const a = -Math.PI / 2 + (R() - 0.5) * 1.6, v = P.speed[0] + R() * (P.speed[1] - P.speed[0]);
      parts.push({ k: R() < 0.3 ? 'spark' : 'conf', x: cx + (R() - 0.5) * w * 0.4, y: top, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        c: CONF[Math.floor(R() * CONF.length)], s: P.confSize[0] + R() * (P.confSize[1] - P.confSize[0]), rot: R() * 6, spin: (R() - 0.5) * 12, t0: t + 0.12, life: P.life * (0.7 + R() * 0.5) });
    }
    for (let i = 0; i < P.floats; i++)
      parts.push({ k: i % 2 ? 'star' : 'heart', x: cx + (i - (P.floats - 1) / 2) * w * 0.22 + (R() - 0.5) * 8, y: top, vy: -P.rise * (0.8 + R() * 0.4),
        s: P.floatSize[0] + R() * (P.floatSize[1] - P.floatSize[0]), ph: R() * 6, t0: t + 0.15 + i * 0.12, life: P.floatLife * (0.85 + R() * 0.3) });
    return true;
  };
  // 상자 모양 바꾸기: 밑동 가운데를 축으로 [가로 배율, 세로 배율, 위로 뜬 px]. 움직이지 않으면 null
  const shape = (p, t) => {
    const u = t - (state[p.id] || -1e9);
    if (RM || u < 0 || u > P.sec)
      return null;
    const v = -P.squash * Math.cos(u * P.hz * Math.PI * 2) * (1 - u / P.sec); // 처음엔 찌그러짐(-) → 늘어남(+) → 잦아듦
    const hop = u > 0.1 && u < 0.45 ? Math.sin(Math.PI * (u - 0.1) / 0.35) * P.hop : 0;
    return [1 - v * 0.6, 1 + v, hop];
  };
  const heart = (g, s) => {
    g.beginPath();
    g.moveTo(0, s * 0.35);
    g.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45);
    g.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
    g.closePath();
  };
  const star = (g, s) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? s * 0.45 : s, a = -Math.PI / 2 + i * Math.PI / 5;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
  };
  const draw = (g, t) => {
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i], u = t - q.t0;
      if (u < 0)
        continue;
      if (u > q.life) {
        parts.splice(i, 1);
        continue;
      }
      const f = 1 - u / q.life;
      g.save();
      if (q.k === 'heart' || q.k === 'star') { // 둥실: 천천히 오르며 좌우로 살랑, 처음엔 퐁 커짐
        const x = q.x + Math.sin(u * 3 + q.ph) * 5, y = q.y + q.vy * u, pop = Math.min(1, u / 0.18);
        g.translate(x, y);
        g.scale(pop, pop);
        g.globalAlpha = Math.min(1, f * 1.8);
        (q.k === 'heart' ? heart : star)(g, q.s);
        g.fillStyle = q.k === 'heart' ? '#ff7f9f' : '#ffd84d';
        g.fill();
        g.lineWidth = 1.4;
        g.strokeStyle = '#5a3424';
        g.stroke();
      }
      else { // 색종이·반짝이: 퐁 튀었다 떨어짐(공기 저항)
        const dr = Math.exp(-u * P.drag), x = q.x + q.vx * (1 - dr) / P.drag, y = q.y + q.vy * (1 - dr) / P.drag + 0.5 * P.gravity * u * u;
        g.translate(x, y);
        g.globalAlpha = Math.min(1, f * 1.5);
        if (q.k === 'spark') {
          g.globalCompositeOperation = 'lighter';
          g.fillStyle = '#fff3b0';
          star(g, q.s * (0.7 + 0.3 * Math.sin(u * 20 + q.rot)));
          g.fill();
        }
        else {
          g.rotate(q.rot + q.spin * u);
          g.scale(1, Math.cos(u * 9 + q.rot)); // 뒤집히며 팔랑
          g.fillStyle = q.c;
          g.fillRect(-q.s / 2, -q.s * 0.3, q.s, q.s * 0.6);
        }
      }
      g.restore();
    }
  };
  return { tap, shape, draw, ids: P.ids };
}
