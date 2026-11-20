/* 안개 (CAMPSITE_PLAN.md 2장, tasks/campsite-2-scene.md)
   - 들어올 때: 화면 가득한 안개가 걷히며 시작. 덩어리(부드러운 잡음)가 옅어지며 글자 입자로 흩어져 위로 날아감
   - 나갈 때(leave): 안개가 다시 짙어진 뒤 다음 페이지로
   - 동작 줄이기: 안개 없이 바로 */
const CH = '.:~-=';
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
// 부드러운 잡음 (값 잡음, 0~1)
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};

export const FOG = { clear: 3.2, close: 1.2 }; // 걷히는 데·짙어지는 데 걸리는 초

export function makeFog({ reduce }) {
  let amount = reduce ? 0 : 1, target = 0, speed = 1 / FOG.clear, done = null;
  return {
    leave(then) {
      if (reduce) { then(); return; }
      target = 1;
      speed = 1 / FOG.close;
      done = then;
    },
    draw(view, dt, T) {
      if (amount < target) amount = Math.min(target, amount + dt * speed);
      else if (amount > target) amount = Math.max(target, amount - dt * speed);
      if (done && amount >= 1) { const f = done; done = null; f(); }
      if (amount <= 0.001) return;
      const { ctx, cols, rows, cellW, cellH } = view;
      const a = amount * amount * (3 - 2 * amount), rise = (1 - a) * view.height * 0.25;
      ctx.fillStyle = `rgba(118,126,146,${(a * a * 0.88).toFixed(3)})`; // 뿌연 바탕
      ctx.fillRect(0, 0, view.width, view.height);
      ctx.font = `${cellH}px ui-monospace,Menlo,monospace`;
      ctx.textBaseline = 'top';
      for (let v = 0; v < rows; v++)
        for (let u = 0; u < cols; u++) {
          const n = vnoise(u * 0.07 + T * 0.08, v * 0.11 - T * 0.03) * 0.75 + hash(u, v) * 0.25;
          const k = a * 1.25 - n;
          if (k <= 0.12) continue;
          const up = rise * hash(v, u) * (1 - a); // 걷히는 마지막에 흩어져 위로
          ctx.fillStyle = `rgba(214,219,232,${Math.min(0.4, 0.06 + k * 0.4).toFixed(2)})`;
          ctx.fillText(CH[(hash(u, v) * 97 | 0) % CH.length], u * cellW, v * cellH - up);
        }
    },
  };
}
