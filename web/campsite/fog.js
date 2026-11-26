/* 안개 (CAMPSITE_PLAN.md 2장, tasks/campsite-2-scene.md · campsite-7-stack.md)
   - 들어올 때: 화면 가득한 안개가 걷히며 시작. 덩어리(부드러운 잡음)가 옅어지며 흩어져 위로
   - 나갈 때(leave): 안개가 다시 짙어진 뒤 다음 페이지로
   - 픽셀 덩어리로 — 작은 그림판(화면 픽셀 FOG.cell개마다 한 칸)에 그려 흐림 없이 키움. 기억 태우기 글자 위에 덮임
   - 동작 줄이기: 안개 없이 바로 */
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};

export const FOG = { clear: 3.2, close: 1.2, cell: 6 }; // 걷히는 데·짙어지는 데 걸리는 초, 안개 한 칸(화면 px)

export function makeFog({ reduce }) {
  let amount = reduce ? 0 : 1, target = 0, speed = 1 / FOG.clear, done = null, cv = null, img = null;
  return {
    leave(then) {
      if (reduce) { then(); return; }
      target = 1;
      speed = 1 / FOG.close;
      done = then;
    },
    // 다시 덮었다가 걷힘 (해변: 돌아오면 해돋이·해넘이를 처음부터 — 바뀌는 순간을 가림)
    cover() {
      if (reduce) return;
      amount = 1;
      target = 0;
      speed = 1 / FOG.clear;
      done = null;
    },
    // st.screen(화면 픽셀 좌표)에 덮음
    draw(st, dt, T) {
      if (amount < target) amount = Math.min(target, amount + dt * speed);
      else if (amount > target) amount = Math.max(target, amount - dt * speed);
      if (done && amount >= 1) { const f = done; done = null; f(); }
      if (amount <= 0.001) return;
      const cols = Math.ceil(st.width / FOG.cell), rows = Math.ceil(st.height / FOG.cell);
      if (!cv || cv.width !== cols || cv.height !== rows) {
        cv = document.createElement('canvas');
        cv.width = cols;
        cv.height = rows;
        img = cv.getContext('2d').createImageData(cols, rows);
      }
      const a = amount * amount * (3 - 2 * amount), d = img.data, base = a * a * 0.88;
      const up = (1 - a) * 6; // 걷히는 마지막에 덩어리가 위로 흩어짐
      for (let v = 0; v < rows; v++) for (let u = 0; u < cols; u++) {
        const n = vnoise(u * 0.09 + T * 0.08, (v + up) * 0.13 - T * 0.03) * 0.8 + hash(u, v) * 0.2;
        const k = Math.min(1, Math.max(0, (a * 1.25 - n) * 2.2)), o = (v * cols + u) * 4;
        d[o] = 118 + 96 * k; d[o + 1] = 126 + 93 * k; d[o + 2] = 146 + 86 * k; // 뿌연 바탕 → 밝은 덩어리
        d[o + 3] = Math.min(1, base + k * 0.35 * a) * 255;
      }
      cv.getContext('2d').putImageData(img, 0, 0);
      const ctx = st.screen;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cv, 0, 0, cols * FOG.cell, rows * FOG.cell);
    },
  };
}
