/* 3D 아스키 모닥불 (CAMPSITE_PLAN.md 4장, tasks/campsite-1-fire.md)
   - 불꽃: 장작 위 원판에서 입자가 피어올라 가운데로 모이며 소용돌이 → 화면 칸에 열기로 쌓임(ascii3d addHeat)
     세 갈래 혀가 천천히 돌며 일렁임(tongue). 3D 공간 안이라 돌려 보면 옆모습, 물체 뒤면 가려짐
   - 불빛: 불 자리에서 조금씩 흔들리는 점광원. flick = 잔잔한 숨쉬기(회의 2026-11-20: "불이 좀 강하다" → 순하게)
   - 불씨: 가끔 위로 날아오르며 반짝, 가까우면 *
   - 동작 줄이기: 한 장면으로 멈춘 불(입자를 수명 곳곳에 미리 뿌려 둠) */
import { fireColor } from './ascii3d.js';

export const FIRE = {
  rate: 1550,          // 초당 입자 수
  baseR: 0.4,          // 불 바닥 원판 반지름
  rise: [0.55, 0.45],  // 처음 오르는 속도 [최소, 더할 폭]
  life: [0.5, 0.6],    // 수명(초) [최소, 더할 폭]
  lift: 0.7,           // 오르며 빨라지는 정도
  pull: 2.1,           // 가운데로 모이는 힘
  swirl: 0.9,          // 소용돌이 세기
  heat: 0.56,          // 입자 하나가 칸에 쌓는 열기
  gain: 1.12,          // 열기 → 밝기 (클수록 진함)
  hue: 0.98,           // 가장 뜨거운 곳 색(1이면 흰빛까지)
  light: 1.45,         // 둘레에 비치는 불빛 세기
  falloff: 0.42,       // 불빛이 멀어지며 줄어드는 정도
  embers: 7,           // 초당 불씨
};

export function makeCampfire({ reduce }) {
  const parts = [], embers = [];
  let clock = 0, glow = 0; // glow: 글자를 태울 때 잠깐 확 솟는 기운 (기억 태우기)
  const spawn = () => {
    const r = Math.sqrt(Math.random()) * FIRE.baseR, a = Math.random() * Math.PI * 2;
    const tongue = 0.65 + 0.35 * Math.sin(a * 3 + clock * 2.1);
    parts.push({
      x: r * Math.cos(a), y: 0.16 + Math.random() * 0.06, z: r * Math.sin(a), a,
      vx: 0, vy: FIRE.rise[0] + Math.random() * FIRE.rise[1], vz: 0,
      age: 0, life: FIRE.life[0] + Math.random() * FIRE.life[1],
      h: (0.75 + Math.random() * 0.35) * tongue,
    });
  };
  if (reduce) for (let i = 0; i < 500; i++) { // 멈춘 불: 수명 곳곳의 입자
    spawn();
    const p = parts[parts.length - 1], k = Math.random();
    p.age = k * p.life;
    p.y += k * p.life * 0.75;
    p.x *= 1 - k * 0.7;
    p.z *= 1 - k * 0.7;
  }

  const stepFlames = (dt, T) => {
    for (let i = 0, n = Math.round(dt * FIRE.rate); i < n; i++) spawn();
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age > p.life) { parts.splice(i, 1); continue; }
      const sw = Math.sin(p.y * 5 - T * 7 + p.x * 4) * 0.9 + Math.sin(p.y * 3 + T * 4.3 + p.z * 5) * 0.6;
      p.vx += (-p.x * FIRE.pull + Math.cos(T * 1.7 + p.y * 6 + p.a) * sw * FIRE.swirl) * dt;
      p.vz += (-p.z * FIRE.pull + Math.sin(T * 1.3 + p.y * 5 + p.a) * sw * FIRE.swirl) * dt;
      p.vy += FIRE.lift * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }
  };
  const stepEmbers = (dt, T) => {
    if (Math.random() < dt * FIRE.embers) embers.push({
      x: (Math.random() - 0.5) * 0.3, y: 0.5 + Math.random() * 0.4, z: (Math.random() - 0.5) * 0.3,
      vx: (Math.random() - 0.5) * 0.2, vy: 0.5 + Math.random() * 0.6, vz: (Math.random() - 0.5) * 0.2,
      age: 0, life: 2 + Math.random() * 2.5, ph: Math.random() * 6,
    });
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.age += dt;
      if (e.age > e.life) { embers.splice(i, 1); continue; }
      e.vx += Math.sin(T * 2 + e.ph + e.y * 3) * 0.25 * dt;
      e.vz += Math.cos(T * 1.7 + e.ph) * 0.25 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.z += e.vz * dt;
    }
  };

  return {
    update(dt, T) {
      clock = T;
      glow = Math.max(0, glow - dt * 0.8);
      if (reduce) return;
      stepFlames(dt, T);
      stepEmbers(dt, T);
    },
    // 이번 순간의 불빛 (ascii3d drawCloud·flush에 넘김)
    light(T) {
      const breath = reduce ? 1 : 1 + 0.06 * Math.sin(T * 9.1) + 0.05 * Math.sin(T * 5.3 + 1) + 0.03 * Math.sin(T * 15.7) + (Math.random() - 0.5) * 0.02;
      const flick = breath * (1 + glow * 0.3);
      return {
        x: reduce ? 0 : Math.sin(T * 3.1) * 0.05, y: 0.5, z: reduce ? 0 : Math.cos(T * 2.7) * 0.05,
        flick, power: FIRE.light, falloff: FIRE.falloff, gain: FIRE.gain, hue: FIRE.hue,
      };
    },
    // 글자 하나가 불에 들어옴: 그 자리에서 불꽃이 잠깐 솟음 (tasks/campsite-3-memory.md)
    burst(x, z, n = 40) {
      glow = Math.min(1.5, glow + 0.25);
      if (reduce) return;
      for (let i = 0; i < n; i++) {
        spawn();
        const p = parts[parts.length - 1];
        p.x = x + (Math.random() - 0.5) * 0.16;
        p.z = z + (Math.random() - 0.5) * 0.16;
        p.y = 0.3;
        p.vy *= 1.15;
        p.h *= 1.2;
      }
    },
    drawFlames(view) {
      for (const p of parts) {
        const a = p.age / p.life;
        view.addHeat(p.x, p.y, p.z, p.h * (1 - a) * (1 - a * 0.3) * (a < 0.08 ? a / 0.08 : 1) * FIRE.heat);
      }
    },
    drawEmbers(view, T) {
      for (const e of embers) {
        const [sx, sy, dz] = view.project(e.x, e.y, e.z);
        if (dz < 0.3) continue;
        const id = view.cell(sx, sy);
        if (id < 0 || dz > view.depthAt(id) + 0.05) continue;
        const a = e.age / e.life, tw = 0.5 + 0.5 * Math.sin(T * 9 + e.ph), c = fireColor(0.95 - a * 0.55);
        view.put(id, dz < 2.8 && tw > 0.7 ? '*' : tw > 0.4 ? "'" : '.', `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`, Math.max(0, (1 - a) * (0.55 + 0.45 * tw)));
      }
    },
  };
}
