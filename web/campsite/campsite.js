/* 미스테리 캠핑장 (CAMPSITE_PLAN.md, tasks/campsite-1-fire.md · campsite-2-scene.md · campsite-7-stack.md)
   - 들어오면 안개가 걷히고, 한가운데 모닥불. 좌우로 끌면 불 둘레를 돌며 방향마다 다른 풍경
   - 혼자 돌지는 않음(주인 요청 2026-11-20 — 돌리는 건 사용자만). 끌다 놓으면 살짝 미끄러지다 멈춤. 구석의 작은 버튼 → 안개 → 거실
   - 항상 밤. 달 모양은 오늘 날짜(time.js moonPhase), 남·북반구 모양은 방문자 시간대(time.js SOUTH)
   - 소리(sound.js): 장작·개울·풀벌레·부엉이·타자기. 오른쪽 위 작은 버튼으로 켬/끔(방과 같은 기록)
   - 기억 태우기: 아래 입력 칸에 치면 타자 줄에 찍혀 불로 날아가 타고 연기가 됨(memory.js·smoke.js)
   - 동작 줄이기: 불이 멈추고 안개 없음(끌어서 돌리기는 됨)
   - 그리기: 스프라이트 스태킹 픽셀아트, 한 픽셀 = 화면 2px (회의 2026-11-25) — stack.js(무대)·voxels.js(모닥불 모형)·
     backdrop.js(하늘·산·호수·숲 그림)·fire.js(불꽃·불빛). 기억 태우기 글자만 화면 픽셀로 위에
   - 미리보기(dev): ?fps=1, ?moon=0~1 (달 나이 비율: 0 그믐, 0.25 상현, 0.5 보름), ?south=1|0 */
import { makeStage } from './stack.js';
import { N, buildCampfire, drawCampfire } from './voxels.js';
import { FRONT, makeBackdrop } from './backdrop.js';
import { makeFire } from './fire.js';
import { makeFog } from './fog.js';
import { makeSmoke } from './smoke.js';
import { makeMemory } from './memory.js';
import { makeSound } from './sound.js';
import { moonPhase, now, SOUTH } from '../js/time.js';
import { gcEvent, pickLang, store } from '../js/util.js';
import { el, freshVisit } from '../js/page-kit.js';

const DRAG = { speed: 0.007, slide: 2.2 }; // 끌 때 화면 1px당 돌아가는 각, 놓은 뒤 멈추는 빠르기
const HOME = '/?from=campsite';

const Q = new URL(location.href).searchParams;
const DEV = Q.get('dev') === '1' || (Q.get('dev') !== '0' && store.get('devTools', false)); // 방 미리보기 도구와 같은 기록
const STR = {
  home: { ko: '거실로', en: 'Living room' },
  soundOn: { ko: '소리 켬', en: 'Sound on' },
  soundOff: { ko: '소리 끔', en: 'Sound off' },
  type: { ko: '여기를 눌러 불에 태울 기억을 적어 보세요', en: 'Tap here and type a memory to burn' },
  scene: { ko: '미스테리 캠핑장: 밤 호숫가, 가운데 모닥불. 좌우로 끌면 둘레를 돌아봐요', en: 'Mystery Campsite: a lakeside at night with a campfire in the middle. Drag sideways to look around' },
};
const LANG = pickLang();
const tr = k => STR[k][LANG];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = el('canvas', 'stage');
canvas.setAttribute('role', 'img');
canvas.setAttribute('aria-label', tr('scene'));
const exit = el('a', 'exit', '← ' + tr('home'));
exit.href = HOME;
document.title = LANG === 'ko' ? '미스테리 캠핑장' : 'Mystery Campsite';
document.documentElement.lang = LANG;
const input = el('input', 'type');
Object.assign(input, { type: 'text', autocomplete: 'off', spellcheck: false, placeholder: tr('type'), enterKeyHint: 'enter' });
input.setAttribute('autocorrect', 'off');
input.setAttribute('autocapitalize', 'off');
input.setAttribute('aria-label', tr('type'));
const snd = el('button', 'snd');
snd.type = 'button';
document.body.append(canvas, exit, snd, input);
const FONT = '-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

const qMoon = DEV && Q.get('moon') != null ? ((+Q.get('moon') % 1) + 1) % 1 : null;
const backdrop = makeBackdrop({
  phase: qMoon ?? moonPhase(now()).k,
  south: DEV && Q.get('south') != null ? Q.get('south') === '1' : SOUTH,
});
const stage = makeStage(canvas, N);
const campfire = buildCampfire();
const fire = makeFire({ reduce });
const fog = makeFog({ reduce });
const smoke = makeSmoke({ reduce });
const sound = makeSound({ store });
const showSound = () => { snd.textContent = sound.on ? '♪ ' + tr('soundOn') : tr('soundOff'); snd.setAttribute('aria-pressed', String(sound.on)); };
showSound();
snd.addEventListener('click', () => { sound.toggle(); showSound(); });
const view = { ctx: stage.screen, get width() { return stage.width; }, get height() { return stage.height; }, project: stage.project };
const memory = makeMemory({ view, fire, smoke, input, reduce, font: FONT, onKey: sound.key, onReturn: sound.bell, onBurn: sound.burn });

exit.addEventListener('click', ev => {
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
  ev.preventDefault();
  fog.leave(() => { location.href = HOME; });
});

// 끌어서 돌리기. 돌려도 입력 칸의 포커스(키보드)는 그대로 두고(누를 때 기본 동작 막음),
// 끌지 않고 톡 누르기만 하면 입력 칸으로 — 돌린 다음에도 바로 이어 칠 수 있게 (주인 요청 2026-11-20)
let angle = 0, vel = 0, drag = false, px = 0, moved = 0, lastMove = 0;
const keepFocus = e => { if (e.cancelable) e.preventDefault(); };
canvas.addEventListener('touchstart', keepFocus, { passive: false });
canvas.addEventListener('mousedown', keepFocus);
canvas.addEventListener('pointerdown', e => { drag = true; px = e.clientX; moved = 0; vel = 0; lastMove = performance.now(); canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const now = performance.now(), dx = e.clientX - px, dt = Math.max(1, now - lastMove) / 1000;
  angle -= dx * DRAG.speed;
  vel = -dx * DRAG.speed / dt;
  moved += Math.abs(dx);
  px = e.clientX;
  lastMove = now;
});
canvas.addEventListener('pointerup', () => {
  drag = false;
  if (performance.now() - lastMove > 80) vel = 0; // 멈췄다 놓으면 미끄러지지 않음
  if (moved < 6) { input.focus({ preventScroll: true }); fire.pop(); }
});
canvas.addEventListener('pointercancel', () => { drag = false; vel = 0; });

const SHOW_FPS = DEV && Q.get('fps') === '1';
let fpsN = 0, fpsT = 0, fpsText = '';
let last = 0;
function frame(ms) {
  const t = ms / 1000, dt = last ? Math.min(0.05, t - last) : 0.016;
  last = t;
  const T = reduce ? 0 : t;
  if (!drag) { angle += vel * dt; vel *= 1 - Math.min(1, dt * DRAG.slide); }
  stage.angle = angle;
  const azc = FRONT - angle; // 화면 가운데가 보는 방향 — 불이 돌아가는 반대로 풍경이 지나감
  fire.update(stage, dt, T);
  smoke.update(dt, T);
  sound.update(azc);
  backdrop.draw(stage, azc, T);
  fire.drawGround(stage);
  drawCampfire(stage, campfire, T, fire.glow);
  fire.draw(stage);
  smoke.draw(stage);
  vignette(stage);
  stage.present();
  memory.draw();
  fog.draw(stage, dt, t);
  if (SHOW_FPS) {
    fpsN++;
    if (t - fpsT > 1) { fpsText = `${fpsN} fps · ${stage.W}×${stage.H}`; fpsN = 0; fpsT = t; }
    stage.screen.fillStyle = 'rgba(200,205,225,0.6)';
    stage.screen.font = '11px ui-monospace,Menlo,monospace';
    stage.screen.fillText(fpsText, 10, stage.height - 20);
  }
  requestAnimationFrame(frame);
}
// 가장자리 어둡게 — 눈이 불로 가게
function vignette({ ctx, W, H, cx, cy }) {
  const g = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
requestAnimationFrame(frame);

if (freshVisit())
  gcEvent('campsite-visit', '캠핑장 방문');
// 오프라인: 방과 같은 서비스 워커 (sw.js 캠핑장 칸)
if ('serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('../sw.js').catch(() => { });
