/* 미스테리 캠핑장 (CAMPSITE_PLAN.md, tasks/campsite-1-fire.md · campsite-2-scene.md)
   - 들어오면 안개가 걷히고, 한가운데 모닥불. 좌우로 끌면 불 둘레를 돌며 방향마다 다른 풍경
   - 손을 떼고 4초 뒤부터 아주 천천히 혼자 돈다. 구석의 작은 버튼 → 안개 → 거실
   - 항상 밤. 달 모양은 오늘 날짜(time.js moonPhase), 남·북반구 모양은 방문자 시간대(time.js SOUTH)
   - 기억 태우기: 아래 입력 칸에 치면 타자 줄에 찍혀 불로 날아가 타고 연기가 됨(memory.js·smoke.js)
   - 동작 줄이기: 불이 멈추고 혼자 돌지 않음, 안개 없음(끌어서 돌리기는 됨)
   - 미리보기(dev): ?moon=0~1 (달 나이 비율: 0 그믐, 0.25 상현, 0.5 보름), ?south=1|0 */
import { makeCloud, makeView } from './ascii3d.js';
import { buildCampsite } from './props.js';
import { makeCampfire } from './campfire.js';
import { FRONT, makeScenery } from './scenery.js';
import { makeFog } from './fog.js';
import { makeSmoke } from './smoke.js';
import { makeMemory } from './memory.js';
import { moonPhase, now, SOUTH } from '../js/time.js';
import { gcEvent, pickLang, store } from '../js/util.js';
import { el, freshVisit } from '../js/page-kit.js';

const CAM = { fontPx: 6, dist: 4.7, zoom: 1.5, pitch: 0.24, lookY: 0.5, horizon: 0.66 };
const IDLE_SPIN = 0.05; // 혼자 도는 빠르기 (라디안/초)
const HOME = '/?from=campsite';

const Q = new URL(location.href).searchParams;
const DEV = Q.get('dev') === '1' || (Q.get('dev') !== '0' && store.get('devTools', false)); // 방 미리보기 도구와 같은 기록
const STR = {
  home: { ko: '거실로', en: 'Living room' },
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
document.body.append(canvas, exit, input);
const FONT = '-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

const view = makeView(canvas, CAM);
const cl = makeCloud();
buildCampsite(cl);
const cloud = cl.done();
const fire = makeCampfire({ reduce });
const qMoon = DEV && Q.get('moon') != null ? ((+Q.get('moon') % 1) + 1) % 1 : null;
const scenery = makeScenery({
  phase: qMoon ?? moonPhase(now()).k,
  south: DEV && Q.get('south') != null ? Q.get('south') === '1' : SOUTH,
});
const fog = makeFog({ reduce });
const smoke = makeSmoke({ reduce });
const memory = makeMemory({ view, fire, smoke, input, reduce, font: FONT });

exit.addEventListener('click', ev => {
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
  ev.preventDefault();
  fog.leave(() => { location.href = HOME; });
});

let yaw = FRONT, drag = false, px = 0, idle = 0;
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
  smoke.update(dt, T);
  const light = fire.light(T);
  view.begin(yaw);
  scenery.drawFar(view, yaw, T);
  scenery.drawStars(view, T);
  view.drawCloud(cloud, light, scenery.moonLight, T);
  fire.drawFlames(view);
  view.flush(light);
  fire.drawEmbers(view, T);
  smoke.draw(view);
  memory.draw();
  fog.draw(view, dt, t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (freshVisit())
  gcEvent('campsite-visit', '캠핑장 방문');
// 오프라인: 방과 같은 서비스 워커 (sw.js 캠핑장 칸 — 캠핑장은 그림 없이 코드뿐)
if ('serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('../sw.js').catch(() => { });
