/* 연기 (CAMPSITE_PLAN.md 5장, tasks/campsite-3-memory.md · campsite-7-stack.md)
   탄 글자가 남기는 연기. 픽셀 알갱이로 3D 공간(세계 좌표)에서 천천히 오르며 퍼진다.
   아래쪽은 불빛을 받아 따뜻하게, 오를수록 식어 회색이 되고 밤하늘에 녹아 사라짐. 글자 잔상은 없음 (회의 2026-11-20).
   동작 줄이기면 연기 없음 */
import { STACK } from './stack.js';

export const SMOKE = { life: [5, 3], rise: [0.28, 0.18], spread: 0.08 };

export function makeSmoke({ reduce }) {
  const ps = [];
  return {
    add(x, y, z, n = 20) {
      if (reduce) return;
      for (let i = 0; i < n; i++) ps.push({
        x: x + (Math.random() - 0.5) * 0.1, y: y + Math.random() * 0.2, z: z + (Math.random() - 0.5) * 0.1,
        vx: (Math.random() - 0.5) * SMOKE.spread, vy: SMOKE.rise[0] + Math.random() * SMOKE.rise[1], vz: (Math.random() - 0.5) * SMOKE.spread,
        age: 0, life: SMOKE.life[0] + Math.random() * SMOKE.life[1], ph: Math.random() * 6,
      });
    },
    update(dt, T) {
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.age += dt;
        if (p.age > p.life) { ps.splice(i, 1); continue; }
        p.vx += (Math.sin(T * 0.4 + p.ph + p.y) * 0.05 + 0.02) * dt; // 느린 바람에 살짝 기울며 흔들림
        p.vz += Math.cos(T * 0.33 + p.ph * 1.3) * 0.05 * dt;
        p.vy *= 1 - dt * 0.05;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
      }
    },
    // 그림판(낮은 해상도)에 알갱이로
    draw(st) {
      const { ctx, kp } = st, V = STACK.VPU;
      for (const p of ps) {
        const [x, y] = st.lowAt(p.x * V, p.z * V, p.y * V);
        const a = p.age / p.life, warm = Math.max(0, 1 - (p.y - 0.4) / 1.4); // 아래는 불빛을 받아 따뜻
        const r = 120 + 70 * warm, g = 118 + 22 * warm, b = 128 - 30 * warm;
        const alpha = (a < 0.1 ? a / 0.1 : 1) * (1 - a) * 0.5, sz = Math.max(1, Math.round((1 + a * 2) * kp * 0.4));
        ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha.toFixed(3)})`;
        ctx.fillRect(Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz);
      }
    },
  };
}
