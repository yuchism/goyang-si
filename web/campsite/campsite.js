/* 미스테리 캠핑장 (CAMPSITE_PLAN.md) — 지금은 1번 티켓 시험 화면: 모닥불과 둘레만 (tasks/campsite-1-fire.md)
   풍경·달·안개·나가기 버튼은 tasks/campsite-2-scene.md에서.
   - 손가락·마우스로 좌우로 끌면 불 둘레를 돈다. 손을 떼고 4초 뒤부터 아주 천천히 혼자 돈다
   - 동작 줄이기: 불이 멈추고 혼자 돌지 않음(끌어서 돌리기는 됨) */
import { makeCloud, makeView } from './ascii3d.js';
import { buildCampsite } from './props.js';
import { makeCampfire } from './campfire.js';

const CAM = { fontPx: 6, dist: 4.7, zoom: 1.5, pitch: 0.36, lookY: 0.5, horizon: 0.6 };
const MOON = { dir: [-0.35, 0.75, 0.55], power: 0.28, color: [105, 125, 190] };
const IDLE_SPIN = 0.05; // 혼자 도는 빠르기 (라디안/초)

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.createElement('canvas');
canvas.className = 'stage';
document.body.append(canvas);
const view = makeView(canvas, CAM);
const cl = makeCloud();
buildCampsite(cl);
const cloud = cl.done();
const fire = makeCampfire({ reduce });

// 임시 하늘: 별 (2번 티켓에서 파노라마 하늘로 바뀜)
const stars = Array.from({ length: 140 }, () => ({ a: Math.random() * Math.PI * 2, h: 0.25 + Math.random() * 0.7, p: Math.random() * 6, s: Math.random() }));
function drawStars(yaw, T) {
  const { ctx, width: w, height: h } = view;
  for (const s of stars) {
    const a = (((s.a + yaw) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    if (Math.abs(a) > 1.2) continue;
    const y = h * 0.5 * (1 - s.h) - 10;
    if (y < 0) continue;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(T * (0.6 + s.s) + s.p));
    ctx.fillStyle = `rgba(205,215,255,${(tw * 0.75).toFixed(2)})`;
    ctx.fillText(s.s > 0.85 ? '+' : s.s > 0.5 ? '.' : '·', w / 2 + a / 1.2 * w * 0.75, y);
  }
}

let yaw = 4.6, drag = false, px = 0, idle = 0;
canvas.addEventListener('pointerdown', e => { drag = true; px = e.clientX; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!drag) return; yaw -= (e.clientX - px) * 0.01; px = e.clientX; idle = 0; });
const up = () => { drag = false; };
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);

let last = 0;
function frame(ms) {
  const t = ms / 1000, dt = last ? Math.min(0.05, t - last) : 0.016;
  last = t;
  if (!drag && (idle += dt) > 4 && !reduce) yaw += dt * IDLE_SPIN;
  const T = reduce ? 0 : t;
  fire.update(dt, T);
  const light = fire.light(T);
  view.begin(yaw);
  drawStars(yaw, T);
  view.drawCloud(cloud, light, MOON, T);
  fire.drawFlames(view);
  view.flush(light);
  fire.drawEmbers(view, T);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
