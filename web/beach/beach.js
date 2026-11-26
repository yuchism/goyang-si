/* 미스테리 해변 (BEACH_PLAN.md, tasks/beach-1-scene.md)
   - 캠핑장 뒤 숲 오솔길 끝의 숨은 해변. 약도에는 없음. 바다를 정면으로 바라보는 한 장면 — 끌면 좌우로 조금만 고개를 돌림
   - 들어올 때마다 해가 뜨거나 짐: 방문자 시간대 오전(0~12시) 해돋이, 오후·밤 해넘이. 3분(sky.js MINUTES) 뒤 아침 빛·별 뜬 밤바다에 머묾
     다른 데 1분 넘게 갔다 돌아오면(탭·앱·뒤로 가기) 다시 처음부터 (REPLAY)
   - 그리기: 캠핑장과 같은 픽셀아트, 한 픽셀 = 화면 2px (../campsite/stack.js 무대, ../campsite/fog.js 안개)
     sky.js(해 높이·빛깔·하늘) · scenery.js(그림 두 겹·배·갈매기) · sea.js(바다·햇빛 길·파도·모래)
   - 소리(sound.js): 파도·바닷바람·해넘이 때 먼 갈매기·병 '톡'·종이. 오른쪽 위 작은 버튼으로 켬/끔(방·캠핑장과 같은 기록)
   - 하루 한 번 쪽지 병(bottle.js·note.js·notes.js): 조금 뒤 물가로 밀려옴 → 누르면 쪽지 → 닫으면 그날은 모래 위 자국만
   - 동작 줄이기: 끝 장면을 바로, 멈춘 채 (병은 이미 모래 위에)
   - 미리보기(dev): ?sun=rise|set, ?at=0~1 (이 진행에서 시작), ?bottle=1 (오늘 열었어도 다시, 3초 뒤), ?dolphin=1 (돌고래 자주), ?fps=1 */
import { makeStage } from '../campsite/stack.js';
import { makeFog } from '../campsite/fog.js';
import { MINUTES, SUN, sunHeight, lightAt, makeSkyCanvas, mix, rgb, clamp01, hash } from './sky.js';
import { makeScenery, DOLPHIN, GULLS } from './scenery.js';
import { makeSea } from './sea.js';
import { makeBottle } from './bottle.js';
import { makeNote, pickNote } from './note.js';
import { makeSound } from './sound.js';
import { now, dayKey } from '../js/time.js';
import { gcEvent, pickLang, store } from '../js/util.js';
import { el, freshVisit } from '../js/page-kit.js';

const VIEW = {
  horizon: 0.5,    // 지평선 (화면 높이 비율)
  shore: 0.38,     // 물가 = 지평선과 화면 아래 사이의 이 비율
  par: 0.4,        // 고개 돌릴 때 하늘·해·먼 겹이 지나가는 빠르기 (가까운 겹 = 1)
  turn: 0.25,      // 고개를 돌릴 수 있는 폭 (화면 폭 비율, 그림 끝을 넘지 않음)
  back: 1.2,       // 놓으면 제자리로 돌아오는 빠르기
  stars: 0.7,      // 별 수 (하늘 넓이 대비)
};
const BACK = '/campsite/?from=beach';

const Q = new URL(location.href).searchParams;
const DEV = Q.get('dev') === '1' || (Q.get('dev') !== '0' && store.get('devTools', false));
const STR = {
  back: { ko: '숲길로', en: 'Back to the woods' },
  bottle: { ko: '물가의 병 열기', en: 'Open the bottle on the shore' },
  soundOn: { ko: '소리 켬', en: 'Sound on' },
  soundOff: { ko: '소리 끔', en: 'Sound off' },
  set: { ko: '미스테리 해변: 바다 너머로 해가 지고 있어요. 좌우로 끌면 조금 둘러봐요', en: 'Mystery Beach: the sun is setting over the sea. Drag sideways to look around a little' },
  rise: { ko: '미스테리 해변: 바다 너머로 해가 뜨고 있어요. 좌우로 끌면 조금 둘러봐요', en: 'Mystery Beach: the sun is rising over the sea. Drag sideways to look around a little' },
};
const LANG = pickLang();
const tr = k => STR[k][LANG];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const FORCE = DEV && /^(rise|set)$/.test(Q.get('sun')) ? Q.get('sun') : null;
const modeNow = () => FORCE || (now().getHours() < 12 ? 'rise' : 'set');
let MODE = modeNow(), AT = DEV && Q.get('at') != null ? clamp01(+Q.get('at') || 0) : 0;

const canvas = el('canvas', 'stage');
canvas.setAttribute('role', 'img');
canvas.setAttribute('aria-label', tr(MODE));
const exit = el('a', 'exit', '← ' + tr('back'));
exit.href = BACK;
document.title = LANG === 'ko' ? '미스테리 해변' : 'Mystery Beach';
document.documentElement.lang = LANG;
document.body.append(canvas, exit);

const stage = makeStage(canvas, 24);
const fog = makeFog({ reduce });
if (DEV && Q.get('dolphin') === '1') DOLPHIN.every = [3, 5]; // 미리보기: 돌고래 자주
const scenery = makeScenery();
const sea = makeSea();
const sound = makeSound({ store });
const snd = el('button', 'snd');
snd.type = 'button';
document.body.append(snd);
const showSound = () => { snd.textContent = sound.on ? '♪ ' + tr('soundOn') : tr('soundOff'); snd.setAttribute('aria-pressed', String(sound.on)); };
showSound();
snd.addEventListener('click', () => { sound.toggle(); showSound(); });
const bottle = makeBottle({ store, today: dayKey(now()), dev: DEV && Q.get('bottle') === '1', reduce, onLand: sound.land });
const note = makeNote({ lang: LANG, onOpen: sound.paper });
const openBottle = el('button', 'open-bottle', tr('bottle'));
openBottle.type = 'button';
openBottle.hidden = true;
document.body.append(openBottle);
const readNote = () => {
  if (!bottle.ready || note.open) return;
  note.show(pickNote(store));
  bottle.open();
  openBottle.hidden = true;
};
openBottle.addEventListener('click', readNote);
document.fonts?.load('24px Galmuri11').catch(() => { }); // 쪽지 글꼴은 미리 (병이 오기 전에)

exit.addEventListener('click', ev => {
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
  ev.preventDefault();
  fog.leave(() => { location.href = BACK; });
});

// 화면 크기가 바뀌면 다시 셈
let lay = null, sky = null, painted = { e: NaN, gen: -1, img: false }, stars = [];
function layout() {
  const { W, H } = stage, AS = Math.max(1, Math.round(W / 384));
  const y0 = Math.round(H * VIEW.horizon), ys = y0 + Math.round((H - y0) * VIEW.shore);
  const turn = Math.max(0, Math.min(W * VIEW.turn, scenery.nearSlack(W, AS, H)));
  const M = Math.ceil(turn * VIEW.par) + 2;
  lay = { W, H, AS, y0, ys, turn, M, gen: stage.gen, nearOK: scenery.near.ready };
  sky = makeSkyCanvas(W + M * 2, y0 + 1, M + W / 2 + (SUN.u - 0.5) * 384 * AS);
  stars = Array.from({ length: Math.round((W + M * 2) * y0 * VIEW.stars / 100) }, (_, i) => ({
    x: Math.floor(hash(i, 1.7) * (W + M * 2)), y: Math.floor(hash(i, 2.3) ** 1.4 * (y0 - 3)), p: hash(i, 3.1) * 6.3, s: 0.3 + hash(i, 4.9) * 1.1, b: 0.3 + hash(i, 5.3) * 0.6,
  }));
  painted.gen = -1;
}

// 끌어서 고개 돌리기 (조금만). 놓으면 천천히 제자리로
// 끌지 않고 톡 누르면: 병 위면 쪽지
let pan = 0, drag = false, px = 0, moved = 0;
const onBottle = e => bottle.hit(e.clientX / stage.S, e.clientY / stage.S);
canvas.addEventListener('pointerdown', e => { drag = true; px = e.clientX; moved = 0; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!drag) { if (e.pointerType === 'mouse') canvas.style.cursor = onBottle(e) ? 'pointer' : ''; return; }
  if (!lay) return;
  pan -= (e.clientX - px) / stage.S;
  pan = Math.max(-lay.turn, Math.min(lay.turn, pan));
  moved += Math.abs(e.clientX - px);
  px = e.clientX;
});
const up = e => {
  if (drag && moved < 6 && e.type === 'pointerup' && onBottle(e)) readNote();
  drag = false;
};
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);

// 언제든 돌아오면 처음부터 (주인 2026-11-26): 다른 탭·앱에 REPLAY.away초 넘게 가 있다 돌아오거나, 뒤로 가기로 다시 오면
// 안개가 덮였다 걷히며 그때 시각의 해돋이·해넘이를 다시 3분. 머물러 있는 동안은 끝 장면에 그대로 머묾
const REPLAY = { away: 60 };
let start = performance.now(), awayAt = 0;
const replay = () => {
  if (reduce) return;
  MODE = modeNow();
  AT = 0;
  start = performance.now();
  canvas.setAttribute('aria-label', tr(MODE));
  fog.cover();
  painted.gen = -1;
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) awayAt = performance.now();
  else if (awayAt && performance.now() - awayAt > REPLAY.away * 1000) replay();
});
addEventListener('pageshow', e => { if (e.persisted) replay(); });
const SHOW_FPS = DEV && Q.get('fps') === '1';
let fpsN = 0, fpsT = 0, fpsText = '', last = 0;
function frame(ms) {
  const t = ms / 1000, dt = last ? Math.min(0.05, t - last) : 0.016;
  last = t;
  const T = reduce ? 0 : t;
  if (!lay || lay.gen !== stage.gen || lay.nearOK !== scenery.near.ready) layout();
  const { W, H, AS, y0, ys, M } = lay, { ctx } = stage, cx = W / 2;
  if (!drag) pan *= 1 - Math.min(1, dt * VIEW.back);
  const p = reduce ? 1 : clamp01(AT + (ms - start) / 1000 / (MINUTES * 60));
  const e = sunHeight(MODE, p), L = lightAt(e);
  if (painted.gen !== lay.gen || Math.abs(painted.e - e) > 0.004 || !painted.img) {
    sky.paint(L);
    painted.img = scenery.paint(L);
    sea.paintSand(W, H, ys, L);
    painted.e = e;
    painted.gen = lay.gen;
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false;
  const shift = -pan * VIEW.par, fx = Math.round(cx + shift), sx = Math.round(cx + (SUN.u - 0.5) * 384 * AS + shift);
  // 하늘·별
  ctx.drawImage(sky.canvas, Math.round(-M + shift), 0);
  if (L.stars > 0.01) for (const s of stars) {
    const a = L.stars * s.b * (0.55 + 0.45 * Math.sin(T * s.s + s.p));
    if (a < 0.03) continue;
    ctx.fillStyle = `rgba(226,230,255,${a.toFixed(3)})`;
    ctx.fillRect(Math.round(s.x - M + shift), s.y, 1, 1);
  }
  // 해 (수평선 아래는 바다가 덮음)
  const sunR = Math.max(3, Math.round(H * SUN.r)), sunY = Math.round(y0 - e * SUN.lift * y0);
  if (e > -0.06) {
    const fade = clamp01((e + 0.06) / 0.06);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(sx, sunY, 1, sx, sunY, sunR * 5);
    g.addColorStop(0, rgb(L.sun, 0.2 * fade * (1 - 0.8 * clamp01((SUN.redden - e) / SUN.redden)))); // 해가 낮으면 번짐을 줄임 — 둘레가 해보다 밝지 않게 (주인 2026-11-26)
    g.addColorStop(1, rgb(L.sun, 0));
    ctx.fillStyle = g;
    ctx.fillRect(sx - sunR * 5, sunY - sunR * 5, sunR * 10, sunR * 10);
    ctx.globalCompositeOperation = 'source-over';
    // 해 바로 둘레의 밝은 테 — 둘레 노을보다 해가 또렷이 밝게 (높이 뜨면 조금 줄임)
    ctx.globalCompositeOperation = 'lighter';
    const h2 = ctx.createRadialGradient(sx, sunY, sunR * 0.6, sx, sunY, sunR * 2.2);
    h2.addColorStop(0, rgb(mix(L.sun, [255, 250, 230], 0.5), 0.28 * fade * (1 - 0.5 * clamp01((L.e - 0.1) / 0.2)) * (1 - clamp01((SUN.redden - e) / SUN.redden))));
    h2.addColorStop(1, rgb(L.sun, 0));
    ctx.fillStyle = h2;
    ctx.fillRect(sx - sunR * 3, sunY - sunR * 3, sunR * 6, Math.max(0, Math.min(sunR * 6, y0 + 1 - (sunY - sunR * 3))));
    ctx.globalCompositeOperation = 'source-over';
    // 해 원판: 낮아질수록 아랫부분부터 붉게 물듦(두꺼운 대기를 지나는 빛), 수평선 가까이선 살짝 납작해지고 옅은 가로 띠
    const core = mix(L.sun, [255, 253, 244], 0.85);
    const red = clamp01((SUN.redden - e) / SUN.redden), flat = 1 - SUN.flatten * clamp01((0.06 - e) / 0.08);
    const ry = Math.max(2, Math.round(sunR * flat));
    for (let v = -ry; v <= ry; v++) {
      const y = sunY + v;
      if (y > y0) break;
      const k = (v + ry) / (2 * ry), hw = Math.round(sunR * Math.sqrt(Math.max(0, 1 - (v / ry) ** 2)));
      let c = mix(core, SUN.warm, Math.min(1, red * 1.4));                   // 하얀 해가 짙은 노랑으로
      c = mix(c, SUN.red, 0.9 * clamp01((k - (1 - red * 1.1)) / 0.55));      // 주황 기운이 아래에서부터 차오름
      c = mix(c, SUN.deep, clamp01((red - 0.75) / 0.25) * k ** 1.5 * 0.8);   // 수평선에 닿을 무렵 맨 아래는 더 붉게
      if (red > 0.6 && k > 0.45 && (v + 99) % 3 === 0) c = mix(c, L.glow, (red - 0.6) * 0.8); // 옅은 가로 띠
      ctx.fillStyle = rgb(c, fade);
      ctx.fillRect(sx - hw, y, hw * 2 + 1, 1);
    }
  }
  scenery.drawGulls(ctx, W, y0, p, L, T, MODE);
  // 바다·모래 (먼 겹은 바다 위, 수평선에)
  sea.draw(ctx, { W, H, y0, ys, sx, sunR, L, t: T, pan });
  if (!reduce && MODE === 'set' && p < DOLPHIN.until) scenery.drawDolphins(ctx, W, y0, ys, L, T, pan);
  scenery.drawFar(ctx, fx, y0, AS);
  scenery.drawBoat(ctx, fx, y0, AS, p, L, T, MODE);
  bottle.draw(ctx, { W, H, ys, L, t: T, dt, pan, wetAt: (x, y) => sea.edgeAt(x) >= y ? 1 : 0 });
  if (bottle.ready && openBottle.hidden && !note.open) openBottle.hidden = false;
  scenery.drawNear(ctx, Math.round(cx - pan), H, AS, W);
  sound.update(1 - L.lum, MODE === 'set' && p > GULLS.show[0] && p < GULLS.show[1]);
  vignette(stage, L);
  stage.present();
  fog.draw(stage, dt, t);
  if (SHOW_FPS) {
    fpsN++;
    if (t - fpsT > 1) { fpsText = `${fpsN} fps · ${W}×${H} · ${MODE} p ${p.toFixed(2)} e ${e.toFixed(2)}`; fpsN = 0; fpsT = t; }
    stage.screen.fillStyle = 'rgba(220,225,240,0.75)';
    stage.screen.font = '11px ui-monospace,Menlo,monospace';
    stage.screen.fillText(fpsText, 10, stage.height - 14);
  }
  requestAnimationFrame(frame);
}
// 가장자리를 살짝 어둡게 (밤일수록)
function vignette({ ctx, W, H }, L) {
  const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.max(W, H) * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${(0.42 - 0.22 * L.lum).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
requestAnimationFrame(frame);

if (freshVisit())
  gcEvent('beach-visit', '해변 방문');
if ('serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('../sw.js').catch(() => { });
