/* 모닥불 둘레 물체를 점 구름으로 (CAMPSITE_PLAN.md 3·4장, tasks/campsite-1-fire.md)
   단위: 불 가운데가 (0,0,0), 1 ≈ 1m 남짓. y가 위.
   - 땅: 풀밭 원판, 불 둘레는 재(가운데 재는 숯불처럼 숨 쉼)
   - 돌 열두 개 동그랗게, 엇갈린 장작 셋(불 가까운 쪽이 숯불), 앉는 통나무 셋(자른 면에 나이테)
   - 텐트는 뺌(회의 2026-11-20) — 그 자리에도 통나무 */
import { KIND } from './ascii3d.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const shade = (c, v) => [c[0] * v, c[1] * v, c[2] * v];

function ground(cl) {
  for (let i = 0; i < 5200; i++) {
    const r = Math.sqrt(Math.random()) * 3.4, a = Math.random() * Math.PI * 2, x = r * Math.cos(a), z = r * Math.sin(a);
    if (r < 0.78) cl.add(x, 0, z, 0, 1, 0, [75, 68, 62], KIND.ASH, r < 0.45 ? 0.5 : 0);
    else cl.add(x, Math.random() < 0.25 ? 0.03 : 0, z, rnd(-0.2, 0.2), 1, rnd(-0.2, 0.2), shade([58, 95, 48], rnd(0.8, 1.2)), KIND.GRASS);
  }
}

function ellipsoid(cl, [cx, cy, cz], [rx, ry, rz], n, color, kind) {
  for (let i = 0; i < n; i++) {
    let x, y, z, l;
    do { x = rnd(-1, 1); y = rnd(-1, 1); z = rnd(-1, 1); l = x * x + y * y + z * z; } while (l > 1 || l < 1e-3);
    l = Math.sqrt(l);
    x /= l; y /= l; z /= l;
    if (cy + ry * y < 0) continue;
    cl.add(cx + rx * x, cy + ry * y, cz + rz * z, x / rx, y / ry, z / rz, shade(color, rnd(0.85, 1.15)), kind);
  }
}

// a → b 원기둥. ember(x,y,z)가 있으면 그 세기로 숯불, caps면 자른 면(나이테)
function cylinder(cl, a, b, rad, n, color, { ember, caps } = {}) {
  const ax = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...ax), u = ax.map(v => v / L);
  const t1 = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let p1 = [u[1] * t1[2] - u[2] * t1[1], u[2] * t1[0] - u[0] * t1[2], u[0] * t1[1] - u[1] * t1[0]];
  const l1 = Math.hypot(...p1);
  p1 = p1.map(v => v / l1);
  const p2 = [u[1] * p1[2] - u[2] * p1[1], u[2] * p1[0] - u[0] * p1[2], u[0] * p1[1] - u[1] * p1[0]];
  const ring = (r, th) => [0, 1, 2].map(k => p1[k] * r * Math.cos(th) + p2[k] * r * Math.sin(th));
  for (let i = 0; i < n; i++) {
    const t = Math.random(), [nx, ny, nz] = ring(1, Math.random() * Math.PI * 2);
    const x = a[0] + ax[0] * t + nx * rad, y = a[1] + ax[1] * t + ny * rad, z = a[2] + ax[2] * t + nz * rad;
    if (y < 0) continue;
    cl.add(x, y, z, nx, ny, nz, shade(color, rnd(0.8, 1.15)), KIND.WOOD, ember ? ember(x, y, z) : 0);
  }
  if (!caps) return;
  for (const [e, sg] of [[a, -1], [b, 1]])
    for (let i = 0; i < n * 0.12; i++) {
      const r = Math.sqrt(Math.random()) * rad, [ox, oy, oz] = ring(r, Math.random() * Math.PI * 2);
      const tree = Math.sin(r / rad * 18) > 0.3; // 나이테
      cl.add(e[0] + ox, e[1] + oy, e[2] + oz, u[0] * sg, u[1] * sg, u[2] * sg, tree ? [170, 120, 75] : [140, 95, 60], KIND.WOOD);
    }
}

export function buildCampsite(cl) {
  ground(cl);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + Math.random() * 0.2, r = 0.66;
    ellipsoid(cl, [r * Math.cos(a), 0.04, r * Math.sin(a)], [rnd(0.12, 0.16), rnd(0.09, 0.12), 0.1], 150, [120, 118, 112], KIND.STONE);
  }
  const ember = (x, y, z) => { const d = Math.hypot(x, z); return d < 0.38 ? (1 - d / 0.38) * 0.9 : 0; };
  cylinder(cl, [-0.48, 0.04, -0.18], [0.42, 0.2, 0.12], 0.065, 700, [45, 32, 24], { ember });
  cylinder(cl, [0.3, 0.04, -0.46], [-0.16, 0.22, 0.38], 0.06, 650, [42, 30, 22], { ember });
  cylinder(cl, [0.1, 0.04, 0.5], [-0.05, 0.24, -0.42], 0.058, 650, [48, 34, 25], { ember });
  for (const ang of [0.55, 3.4, 5.3]) { // 앉는 통나무 (불 둘레를 따라 누움)
    const r = 1.75, cx = r * Math.cos(ang), cz = r * Math.sin(ang), tx = -Math.sin(ang) * 0.6, tz = Math.cos(ang) * 0.6;
    cylinder(cl, [cx - tx, 0.17, cz - tz], [cx + tx, 0.17, cz + tz], 0.17, 2200, [110, 72, 42], { caps: true });
  }
}
