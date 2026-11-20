/* 미스테리 캠핑장 (CAMPSITE_PLAN.md, tasks/campsite-1-fire.md · campsite-2-scene.md)
   - 들어오면 안개가 걷히고, 한가운데 모닥불. 좌우로 끌면 불 둘레를 돌며 방향마다 다른 풍경
   - 혼자 돌지는 않음(주인 요청 2026-11-20 — 돌리는 건 사용자만). 구석의 작은 버튼 → 안개 → 거실
   - 항상 밤. 달 모양은 오늘 날짜(time.js moonPhase), 남·북반구 모양은 방문자 시간대(time.js SOUTH)
   - 소리(sound.js): 장작·개울·풀벌레·부엉이·타자기. 오른쪽 위 작은 버튼으로 켬/끔(방과 같은 기록)
   - 기억 태우기: 아래 입력 칸에 치면 타자 줄에 찍혀 불로 날아가 타고 연기가 됨(memory.js·smoke.js)
   - 동작 줄이기: 불이 멈추고 안개 없음(끌어서 돌리기는 됨)
   - 그리기: 캔버스 아스키(ascii3d.js, 6px). 불꽃만 WebGL(gl3d.js)이 되면 셰이더로, 안 되면 불꽃 입자로 — tasks/campsite-6-webgl.md
   - 미리보기(dev): ?gl=0 (캔버스로), ?fps=1, ?moon=0~1 (달 나이 비율: 0 그믐, 0.25 상현, 0.5 보름), ?south=1|0 */
import { makeCloud, makeView } from './ascii3d.js';
import { makeGLFire } from './gl3d.js';
import { buildCampsite } from './props.js';
import { makeCampfire } from './campfire.js';
import { FRONT, makeScenery } from './scenery.js';
import { makeFog } from './fog.js';
import { makeSmoke } from './smoke.js';
import { makeMemory } from './memory.js';
import { makeSound } from './sound.js';
import { moonPhase, now, SOUTH } from '../js/time.js';
import { gcEvent, pickLang, store } from '../js/util.js';
import { el, freshVisit } from '../js/page-kit.js';

const CAM = { fontPx: 6, dist: 4.7, zoom: 1.5, pitch: 0.24, lookY: 0.5, horizon: 0.66 };
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
const scenery = makeScenery({
  phase: qMoon ?? moonPhase(now()).k,
  south: DEV && Q.get('south') != null ? Q.get('south') === '1' : SOUTH,
});
let glFire = DEV && Q.get('gl') === '0' ? null : makeGLFire(CAM);
const view = makeView(canvas, CAM);
const cl = makeCloud();
buildCampsite(cl);
const cloud = cl.done();
const fire = makeCampfire({ reduce, flames: !glFire });
const fog = makeFog({ reduce });
const smoke = makeSmoke({ reduce });
const sound = makeSound({ store });
const showSound = () => { snd.textContent = sound.on ? '♪ ' + tr('soundOn') : tr('soundOff'); snd.setAttribute('aria-pressed', String(sound.on)); };
showSound();
snd.addEventListener('click', () => { sound.toggle(); showSound(); });
const memory = makeMemory({ view, fire, smoke, input, reduce, font: FONT, onKey: sound.key, onReturn: sound.bell, onBurn: sound.burn });

exit.addEventListener('click', ev => {
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
  ev.preventDefault();
  fog.leave(() => { location.href = HOME; });
});

// 끌어서 돌리기. 돌려도 입력 칸의 포커스(키보드)는 그대로 두고(누를 때 기본 동작 막음),
// 끌지 않고 톡 누르기만 하면 입력 칸으로 — 돌린 다음에도 바로 이어 칠 수 있게 (주인 요청 2026-11-20)
let yaw = FRONT, drag = false, px = 0, moved = 0;
const keepFocus = e => { if (e.cancelable) e.preventDefault(); };
canvas.addEventListener('touchstart', keepFocus, { passive: false });
canvas.addEventListener('mousedown', keepFocus);
canvas.addEventListener('pointerdown', e => { drag = true; px = e.clientX; moved = 0; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!drag) return; yaw -= (e.clientX - px) * 0.01; moved += Math.abs(e.clientX - px); px = e.clientX; });
canvas.addEventListener('pointerup', () => {
  drag = false;
  if (moved < 6) input.focus({ preventScroll: true });
});
canvas.addEventListener('pointercancel', () => { drag = false; });

const SHOW_FPS = DEV && Q.get('fps') === '1';
let fpsN = 0, fpsT = 0, fpsText = '';
let last = 0;
function frame(ms) {
  const t = ms / 1000, dt = last ? Math.min(0.05, t - last) : 0.016;
  last = t;
  const T = reduce ? 0 : t;
  fire.update(dt, T);
  smoke.update(dt, T);
  sound.update(yaw);
  const light = fire.light(T);
  view.begin(yaw);
  scenery.drawFar(view, yaw, T);
  scenery.drawStars(view, yaw, T);
  view.drawCloud(cloud, light, scenery.moonLight, T);
  if (glFire && !glFire.render(view, yaw, T, light, fire.glow)) { // 그림판을 잃으면 불꽃 입자로
    glFire = null;
    fire.useFlames();
  }
  if (!glFire) fire.drawFlames(view);
  view.flush(light);
  fire.drawEmbers(view, T);
  smoke.draw(view);
  memory.draw();
  fog.draw(view, dt, t);
  if (SHOW_FPS) {
    fpsN++;
    if (t - fpsT > 1) { fpsText = `${fpsN} fps · ${glFire ? 'WebGL fire' : 'canvas'}`; fpsN = 0; fpsT = t; }
    view.ctx.fillStyle = 'rgba(200,205,225,0.6)';
    view.ctx.font = '11px ui-monospace,Menlo,monospace';
    view.ctx.fillText(fpsText, 10, view.height - 20);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (freshVisit())
  gcEvent('campsite-visit', '캠핑장 방문');
// 오프라인: 방과 같은 서비스 워커 (sw.js 캠핑장 칸 — 캠핑장은 그림 없이 코드뿐)
if ('serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('../sw.js').catch(() => { });
