/* 창밖과 하늘을 나는 것: 하늘·해·달·구름·비·눈, 새, 나비, UFO, 산타 썰매.
   그리는 순서는 WINDOW_PLAN_3.md 5장: 하늘(지평선까지, 밤 하늘·가을 하늘·미세먼지) → 해·달 → skyBack(무지개·번개 하늘)
   → 산·건물 판(scenery.js: 먼 산 → 연무 → 가까운 산 → 연무 → 건물 마스크. 낮 판 위에 밤 판을 밤 비율로) → apt(창 불빛)
   → 노을 → 비 덮개 → 구름 → 멀리 나는 새 → sky(비행기·UFO·산타·마녀·박쥐·철새) → 꽃잎 → 눈·비. 난간과 베란다 층은 draw.js */
import { WIN, skyRnd, toRoom, wy } from './win.js';
import { play } from './anim.js';
import { canStart, eventsApt, eventsSky, eventsSkyBack } from './events.js';
import { imageReady, img } from './assets.js';
import { aptRect, sceneryPlates } from './scenery.js';
import { drawPetals } from './birthday.js';
import { A, P } from './objects.js';
import { ctx } from './stage.js';
import { fn, hold, run, until } from './steps.js';
import { MOON_SOUTH, butterflyTime, darkness, moonLift, sceneryAt, sunLift, holiday, isNight, momentNow, moonPhase, nightOf, rainNow, season, skyAt, sunUp, twilightGlow } from './time.js';
import { tr } from './i18n.js';
import { RM, clamp, hash, lerp, onScene, pick, rnd } from './util.js';
import { after, caption, cat, mouse, say, world } from './world.js';
/* ───────── 나비 ───────── */
export function spawnButterfly() {
  if (world.bfly)
    return;
  const [bx, by] = toRoom(...WIN.butterfly.enter);
  world.bfly = { x: bx, y: by, t: 0, life: rnd(26, 40), ph: 0, col: pick(['#f2a541', '#f6d65a', '#8ec1e6', '#f19bb0']) };
  const watch = a => {
    if (a.hidden || a.state === 'flee')
      return;
    const wasSleep = a.closed;
    run(a, a.kind === 'cat' ? [hold(wasSleep ? 1.2 : 0.4, 'loaf'), fn(x => say(x, '🦋👀', 99)), play('lookup', 60, () => !world.bfly), fn(x => {
        x.bub = null;
        say(x, '…', 2.5);
      }), hold(3, 'loaf')]
      : [hold(0.4, 'walk'), fn(x => say(x, '🦋👀', 99)), until(() => !world.bfly, 60), fn(x => {
          x.bub = null;
          say(x, '…', 2.5);
        }), hold(3, 'walk')], 'bfly');
    a.state = a.kind === 'mouse' ? 'bfly' : a.state;
  };
  if (Math.random() < 0.85 || !cat.closed)
    watch(cat);
  watch(mouse);
}
export function updateButterfly(dt) {
  const b = world.bfly;
  if (!b)
    return;
  b.t += dt;
  b.ph += dt * 14;
  const leaving = b.t > b.life;
  const [ex, ey] = toRoom(...WIN.butterfly.exit), fa = A('bfly.roam'), fmx = (fa.x[0] + fa.x[1]) / 2, fax = (fa.x[1] - fa.x[0]) / 2, fmy = (fa.y[0] + fa.y[1]) / 2, fay = (fa.y[1] - fa.y[0]) / 2;
  const tx = leaving ? ex : fmx + Math.sin(b.t * 0.31) * fax, ty = leaving ? ey : fmy + Math.sin(b.t * 0.53) * fay + Math.cos(b.t * 1.3) * 30;
  const ox = b.x;
  b.x += (tx - b.x) * dt * 0.9;
  b.y += (ty - b.y) * dt * 0.9;
  b.vx = b.x - ox;
  if (leaving && Math.hypot(b.x - tx, b.y - ty) < 20)
    world.bfly = null;
  [cat, mouse].forEach(a => {
    if (a.tag === 'bfly' && !a.hidden)
      a.face = b.x > a.x ? 1 : -1;
  });
}
// 비: 먼 빗줄기(가늘고 느림)와 가까운 빗줄기(길고 빠름) 두 겹, 바람에 살짝 기울고, 난간에 튀고, 유리에 물방울이 흘러내린다
const RAIN_SLANT = 0.18;
function drawRain(w) {
  const t = world.t, H = w.h;
  ctx.save();
  ctx.lineCap = 'round';
  const layer = (n, len, sp, alpha, lw, seed) => {
    ctx.strokeStyle = `rgba(225,232,242,${alpha})`;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const u = ((i * 0.618034 + seed) % 1), v = ((i * 0.754877 + seed * 0.5) % 1), s = sp * (0.85 + 0.3 * ((i * 0.3819) % 1));
      const y = (v * (H + len) + t * s) % (H + len) - len, x = w.x + ((u * w.w - y * RAIN_SLANT) % w.w + w.w) % w.w;
      ctx.moveTo(x, y);
      ctx.lineTo(x - len * RAIN_SLANT, y + len);
    }
    ctx.stroke();
  };
  layer(90, 10, 320, 0.28, 1, 0.13);
  layer(45, 22, 620, 0.42, 1.4, 0.71);
  // 난간과 창틀에 튀는 물방울
  ctx.strokeStyle = 'rgba(230,236,245,.55)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) {
    const ph = (t * 1.7 + i * 0.37) % 1;
    if (ph > 0.35)
      continue;
    const x = w.x + ((i * 0.618034) % 1) * w.w, y = i % 2 ? wy(WIN.splashY) : H - 6, r = 3 + ph * 14;
    ctx.globalAlpha = 1 - ph / 0.35;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 유리를 타고 천천히 흘러내리는 물방울
  for (let i = 0; i < 12; i++) {
    const u = (i * 0.618034 + 0.21) % 1, sp = 8 + ((i * 0.4142) % 1) * 22, y = ((i * 0.381966) * H + t * sp) % (H + 40) - 20, x = w.x + 18 + u * (w.w - 36);
    ctx.strokeStyle = 'rgba(235,240,248,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,245,252,.7)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 2.4, 3.2, 0, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}
// 달: 실제 날짜의 위상대로, 빛나는 부분만 직접 그린다 (MOON_PLAN.md 5장)
// 빛나는 쪽 반원 + 명암 경계 타원(가로 반지름 R·|cos 2πk|)을 이은 한 도형. 하늘색 원으로 덮지 않으니 노을·구름에도 자국이 없다
const MOON_RGB = '244,238,210';
function drawMoon(d, cx, cy, R) {
  const m = moonPhase(d);
  if (m.lit < 0.03)
    return; // 삭 앞뒤 하루쯤은 달이 없다
  const vis = clamp((m.lit - 0.03) / 0.07, 0, 1), right = m.waxing !== MOON_SOUTH, side = right ? 1 : -1;
  ctx.save();
  // 달무리: 빛나는 비율만큼. 보름에 가장 크고 초승달엔 거의 없다
  const hx = cx + side * R * (1 - m.lit) * 0.6, hr = R * (1.3 + 1.9 * m.lit); // time-ok (달무리 반지름)
  const g = ctx.createRadialGradient(hx, cy, R * 0.8, hx, cy, hr);
  g.addColorStop(0, `rgba(${MOON_RGB},${0.2 * m.lit * vis})`);
  g.addColorStop(1, `rgba(${MOON_RGB},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(hx - hr, cy - hr, hr * 2, hr * 2);
  ctx.translate(cx, cy);
  // 어두운 쪽: 지구빛으로 둥근 윤곽만 은은하게
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, 7);
  ctx.fillStyle = `rgba(${MOON_RGB},${0.08 * vis})`;
  ctx.fill();
  // 빛나는 부분
  if (!right)
    ctx.scale(-1, 1);
  const rx = R * Math.abs(Math.cos(2 * Math.PI * m.k));
  ctx.beginPath();
  ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2); // 오른쪽 반원 (위 → 아래)
  ctx.ellipse(0, 0, rx, R, 0, Math.PI / 2, -Math.PI / 2, m.lit < 0.5); // 아래 → 위: 초승·그믐은 안쪽으로 파이고, 반달 넘게 찬 달은 왼쪽으로 부푼다
  ctx.closePath();
  ctx.globalAlpha = 0.35 + 0.65 * vis;
  ctx.shadowColor = `rgba(${MOON_RGB},.7)`;
  ctx.shadowBlur = 1.5; // 가장자리를 살짝 부드럽게
  ctx.fillStyle = `rgb(${MOON_RGB})`;
  ctx.fill();
  ctx.restore();
}
// 하늘 색: 위는 예전 코드 하늘, 아래(지평선 y ≈ 466 쪽)는 예전 아파트 그림 속 하늘의 연보라 연무 (창에 보이는 범위에서 잰 색)
// 하늘 색과 지평선은 창 안 좌표 (window.json skyGradient, landscape.bottom)
const horizon = () => wy(WIN.landscape.bottom);
function skyFill(w, stops, alpha) {
  const HORIZON = horizon();
  const g = ctx.createLinearGradient(0, w.y, 0, HORIZON);
  stops.forEach(([y, c]) => g.addColorStop(clamp((wy(y) - w.y) / (HORIZON - w.y), 0, 1), c));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(w.x - 4, w.y, w.w + 8, w.h + 4);
  ctx.globalAlpha = 1;
}
// 해·달 자리 (WINDOW_PLAN_3.md 17장): 오른쪽 아래(능선·건물 뒤, 원반이 다 가려지는 곳)에서 살짝 비스듬히 오른쪽 위(예전 달 자리)로.
// 올라오고 내려갈 땐 부드럽게(smoothstep). lift 0 = 다 가려짐, 1 = 제자리
// 해·달 자리: 창 오른쪽 끝 기준 (window.json skySpot). 창 크기가 바뀌어도 오른쪽 위 모서리에 머문다
export const SKY_SPOT = {};
onScene(() => {
  if (!WIN.rect)
    return;
  const s = WIN.skySpot, r = WIN.rect.x + WIN.rect.w;
  Object.assign(SKY_SPOT, { low: [r - s.low[0], wy(s.low[1])], top: [r - s.top[0], wy(s.top[1])], sunR: s.sunR, moonR: s.moonR });
});
export function skySpot(k) {
  const e = k * k * (3 - 2 * k), [x0, y0] = SKY_SPOT.low, [x1, y1] = SKY_SPOT.top;
  return { x: lerp(x0, x1, e), y: lerp(y0, y1, e) };
}
export function drawOutside(d, w) {
  const day = sunUp(d), rain = rainNow(d);
  const night = clamp(darkness(d) / 0.62, 0, 1);
  // 1. 하늘 (지평선까지). 밤 하늘은 밤 비율로. 가을 하늘은 위쪽을 조금 더 진한 파랑으로 (sceneryAt skyTint, 미세먼지 날은 누렇게)
  const sc = sceneryAt(d);
  skyFill(w, WIN.skyGradient.day, 1);
  if (sc.skyTint > 0 && night < 1) {
    const tintTo = wy(WIN.skyGradient.tintTo), g = ctx.createLinearGradient(0, w.y, 0, tintTo);
    g.addColorStop(0, `rgba(72,118,222,${0.26 * sc.skyTint})`);
    g.addColorStop(1, 'rgba(72,118,222,0)');
    ctx.fillStyle = g;
    ctx.fillRect(w.x - 4, w.y, w.w + 8, tintTo - w.y);
  }
  if (sc.dust) {
    const g = ctx.createLinearGradient(0, w.y, 0, horizon());
    g.addColorStop(0, 'rgba(206,190,140,.32)');
    g.addColorStop(1, 'rgba(214,196,150,.62)');
    ctx.fillStyle = g;
    ctx.fillRect(w.x - 4, w.y, w.w + 8, w.h + 4);
  }
  if (night > 0)
    skyFill(w, WIN.skyGradient.night, night);
  // 2. 해·달 (산 뒤로 뜨고 진다. 노을·비 덮개 아래)
  const sl = sunLift(d), ml = moonLift(d); // 해는 낮에, 달은 해 진 뒤에. 같은 자리로 올라오고 내려간다
  if (sl > 0 && !rain) {
    const p = skySpot(sl);
    ctx.beginPath();
    ctx.arc(p.x, p.y, SKY_SPOT.sunR, 0, 7);
    ctx.fillStyle = 'rgba(255,243,196,.95)';
    ctx.fill();
  }
  if (ml > 0 && !rain) {
    const p = skySpot(ml);
    drawMoon(d, p.x, p.y, SKY_SPOT.moonR);
  }
  // 3. 무지개·번개 하늘 (events.js skyBack). 산·건물 판이 앞에 오므로 무지개 끝은 산 뒤로, 번개 땐 산·건물이 실루엣으로
  eventsSkyBack(w);
  // 4. 산·건물 판 (scenery.js): 낮 판 → 밤 판을 밤 비율로
  const P = sceneryPlates(d, w), b = P.box;
  ctx.drawImage(P.day, b.x, b.y, b.w, b.h);
  if (night > 0) {
    ctx.globalAlpha = night;
    ctx.drawImage(P.night, b.x, b.y, b.w, b.h);
    ctx.globalAlpha = 1;
  }
  // 5. 건너편 창 불빛 (weather.js)
  const { ax, ay, aw, ah } = aptRect(w);
  eventsApt(w, { ax, ay, aw, ah, night, d });
  // 새벽·노을 빛
  const [, bot] = skyAt(d);
  const tw = twilightGlow(d) ? 0.28 : 0;
  if (tw) {
    ctx.fillStyle = bot;
    ctx.globalAlpha = tw;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.globalAlpha = 1;
  }
  if (rain) {
    // 번개가 번쩍이는 동안은 비 덮개 두 장을 번쩍임 세기만큼 걷어 낸다 (weather.js, WINDOW_PLAN.md 7-1). 평소 world.flash는 0
    const snow = season(d) === 'winter', g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h), lift = 1 - (world.flash || 0);
    g.addColorStop(0, snow ? 'rgba(200,206,214,.92)' : 'rgba(104,113,128,.95)');
    g.addColorStop(0.62, snow ? 'rgba(210,215,222,.82)' : 'rgba(124,133,147,.85)');
    g.addColorStop(1, snow ? 'rgba(225,228,234,.45)' : 'rgba(140,148,160,.5)');
    ctx.globalAlpha = lift;
    ctx.fillStyle = g;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    if (night > 0) {
      ctx.fillStyle = `rgba(20,24,40,${0.55 * night})`;
      ctx.fillRect(w.x, w.y, w.w, w.h);
    }
    ctx.globalAlpha = 1;
  }
  if (rain) {
    const sn = season(d) === 'winter', c1 = sn ? 'rgba(236,238,242,.95)' : 'rgba(86,94,108,.95)', c2 = sn ? 'rgba(220,224,230,.95)' : 'rgba(100,108,122,.95)';
    for (let row = 0; row < 2; row++) {
      ctx.fillStyle = row ? c2 : c1;
      const yy = w.y + WIN.clouds.rain[row], dx = (world.t * (row ? 5 : 3)) % 120;
      for (let x = w.x - 120 + dx; x < w.x + w.w + 120; x += 60) {
        ctx.beginPath();
        ctx.ellipse(x, yy + Math.sin(x * 0.05 + row) * 8, 58, 26 + row * 6, 0, 0, 7);
        ctx.fill();
      }
    }
  }
  else {
    ctx.fillStyle = 'rgba(255,255,255,' + (day ? 0.8 : 0.12) + ')';
    for (let i = 0; i < 3; i++) {
      const cx = w.x + ((world.t * 3 + i * 190 + hash('c' + i) * 200) % (w.w + 200)) - 100, cy = w.y + WIN.clouds.y + i * WIN.clouds.gap;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 44, 14, 0, 0, 7);
      ctx.ellipse(cx + 28, cy - 9, 26, 14, 0, 0, 7);
      ctx.fill();
    }
  }
  if (world.bird) {
    const b = world.bird;
    b.x += 78 * (world.renderDt || 0);
    const im = img('fx/bird_' + (Math.floor(world.t * 9) % 3 + 1));
    if (imageReady(im))
      ctx.drawImage(im, w.x + b.x - 22, b.y - 18, 44, 44 * im.height / im.width);
    if (b.x > w.w + 20)
      world.bird = null;
  }
  eventsSky(w); // UFO, 산타 썰매, 마녀, 박쥐… (events.js)
  drawPetals(w);
  if (rain && season(d) === 'winter') {
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    for (let i = 0; i < 70; i++) {
      const sp = 18 + hash('sv' + i) * 26, r = 1.6 + hash('sr' + i) * 2.4, ry = (((i * 0.381966) % 1) * w.h + world.t * sp) % w.h, rx = w.x + ((((i * 0.618034) % 1) * w.w + Math.sin(world.t * 0.7 + i) * 14 + world.t * 6) % w.w + w.w) % w.w;
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, 7);
      ctx.fill();
    }
  }
  else if (rain) {
    drawRain(w);
  }
}
function drawUFO(w) {
  const u = world.ufo;
  if (!u)
    return;
  const k = u.t / u.dur;
  if (k >= 1) {
    world.ufo = null;
    return;
  }
  const x = w.x - 90 + k * (w.w + 180), y = u.y + Math.sin(k * Math.PI * 3) * 8, on = u.blink && Math.abs(k - 0.5) < 0.08 ? Math.floor(world.t * 8) % 2 : 0;
  const im = img(on ? 'fx/ufo_on' : 'fx/ufo_off');
  if (imageReady(im))
    ctx.drawImage(im, x - 38, y - 20, 76, 76 * im.height / im.width);
}
export function maybeUFO(d, dt) {
  if (world.ufo) {
    world.ufo.t += dt;
    return;
  }
  const boost = world.lastType && world.t - world.lastType < 90 ? 40 : 1;
  if (world.manduk || !isNight(d) || !canStart('sky', { noRest: boost > 1 }))
    return; // 밤(time.js isNight)에만. 하늘에 다른 큰 것(마녀 등)이 있거나 쉬는 중이면 미룸 (events.js 교통정리). 노트북 개그 직후엔 쉼 무시
  if (Math.random() < dt * boost / (3 * 3600))
    startUFO();
}
export function startUFO() {
  if (world.ufo)
    return;
  world.ufo = { t: 0, dur: rnd(16, 24), y: skyRnd('ufo'), blink: world.lastType && world.t - world.lastType < 90 || Math.random() < 0.4 };
  after(() => {
    if (!world.ufo || world.manduk)
      return;
    if (!cat.closed && !cat.inBox)
      run(cat, [
        fn(a => {
          a.face = -1;
          say(a, '👽‼️', 4);
        }),
        play('lookup', 8),
        hold(3, 'stand'),
        hold(10, 'loaf')
      ], 'ufo');
    if (!mouse.hidden && !mouse.peek) {
      mouse.react = { t: 2.5 };
      say(mouse, '‼️', 2.5);
    }
  }, 4);
}
// 산타 썰매: 크리스마스 무렵 밤에 아주 멀리 하늘을 지나가는 실루엣. 24일 밤에는 꼭 한 번
function drawSanta(w) {
  const u = world.santa;
  if (!u)
    return;
  const k = u.t / u.dur;
  if (k >= 1) {
    world.santa = null;
    return;
  }
  const im = img('fx/santa_' + (RM ? 1 : Math.floor(world.t * 4) % 2 + 1));
  if (!imageReady(im))
    return;
  const sw = 170, sh = sw * im.height / im.width, x = w.x + w.w + 100 - k * (w.w + 280), y = u.y - Math.sin(k * Math.PI) * 28, night = world.skyDark > 0.3;
  ctx.save();
  ctx.globalAlpha = night ? 0.95 : 0.8;
  ctx.drawImage(im, x - sw / 2, y - sh / 2, sw, sh);
  ctx.restore();
  if (night) {
    const nx = x - sw / 2 + 48 * sw / im.width, ny = y - sh / 2 + 220 * sh / im.height, g = ctx.createRadialGradient(nx, ny, 0, nx, ny, 9); // 루돌프 코가 밤하늘에서 반짝
    g.addColorStop(0, `rgba(255,90,80,${0.55 + 0.25 * Math.sin(world.t * 6)})`);
    g.addColorStop(1, 'rgba(255,90,80,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(nx - 9, ny - 9, 18, 18);
    ctx.restore();
  }
}
export function maybeSanta(d, dt) {
  if (world.santa) {
    world.santa.t += dt;
    return;
  }
  if (holiday(d) !== 'christmas')
    return;
  if (!isNight(d))
    return;
  // 이브 밤 9시 이후에는 꼭 한 번 (calendar.js christmasEveNight. 자정을 넘어도 같은 밤)
  if (momentNow('christmasEveNight', d) && world.santaEve !== nightOf(d)) {
    if (!canStart('sky', { special: true }))
      return; // 특별한 순간: 줄을 서지 않지만 지나가는 큰 것이 끝날 때까지는 기다린다 (events.js)
    world.santaEve = nightOf(d);
    return startSanta();
  }
  if (canStart('sky') && Math.random() < dt / (2 * 3600))
    startSanta();
}
export function startSanta() {
  if (world.santa)
    return;
  world.santa = { t: 0, dur: rnd(22, 30), y: skyRnd('santa') };
  after(() => {
    if (!world.santa)
      return;
    if (!cat.closed && !cat.inBox && !world.manduk)
      run(cat, [
        fn(a => {
          a.face = -1;
          say(a, '👀‼️', 4);
        }),
        play('lookup', 8),
        hold(3, 'stand'),
        hold(10, 'loaf')
      ], 'santa');
  }, 6);
}
export function drawButterfly() {
  const b = world.bfly;
  if (!b)
    return;
  const f = Math.floor(b.ph / 2.2) % 4 + 1;
  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.vx < 0)
    ctx.scale(-1, 1);
  const im = img('fx/bfly_' + f);
  if (imageReady(im))
    ctx.drawImage(im, -24, -16, 48, 48 * im.height / im.width);
  ctx.restore();
}

/* ───────── 사건 목록에 싣는 것 (events.js) ───────── */
// 나비: 봄·여름 낮, 비가 안 오고 만득 씨가 없을 때 (여름엔 7분, 봄엔 12분에 한 번 꼴)
export const butterflyEvent = {
  needs: ['window', 'bfly.roam'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'bfly',
  cls: 'bg',
  tick(d, real, bf) {
    const dt = real * bf, ss = season(d);
    if (!world.bfly && !world.manduk && butterflyTime(d) && !rainNow(d) && (ss === 'spring' || ss === 'summer') && Math.random() < dt / (ss === 'summer' ? 420 : 700))
      spawnButterfly();
    updateButterfly(real * Math.min(bf, 3));
  },
  room: drawButterfly,
  reset() {
    world.bfly = null;
  },
  dev: [{ btn: 'dBfly', go: () => spawnButterfly() }],
  debug: { spawnButterfly },
};
// UFO: 밤(해 진 뒤 30분 ~ 동틀 녘 시작, time.js isNight), 3시간에 한 번 꼴 (고양이가 몰래 노트북을 친 직후엔 훨씬 자주)
export const ufoEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'ufo',
  cls: 'sky',
  active: () => !!world.ufo,
  tick: (d, real) => maybeUFO(d, real),
  sky: drawUFO,
  reset() {
    world.ufo = null;
  },
  dev: [{ btn: 'dUfo', go: () => world.manduk ? caption(tr('devNoUfo'), 3) : startUFO() }], // 만득 씨는 UFO를 보면 안 된다
  debug: { startUFO },
};
// 산타 썰매: 크리스마스 무렵 밤, 24일 밤 9시 이후엔 꼭 한 번
export const santaEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'santa',
  cls: 'sky',
  active: () => !!world.santa,
  tick: (d, real) => maybeSanta(d, real),
  sky: drawSanta,
  reset() {
    world.santa = null;
  },
  dev: [{ btn: 'dSanta', go: () => startSanta() }],
  debug: { startSanta },
};
