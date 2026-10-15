/* 창밖과 하늘을 나는 것: 하늘·해·달·구름·비·눈, 새, 나비, UFO, 산타 썰매.
   그리는 순서는 WINDOW_PLAN.md 3장: 하늘 → 아파트(낮·밤 하늘 덮개·밤) → skyBack(무지개·번개 하늘) → 아파트 마스크 → apt(창 불빛)
   → 노을 → 비 덮개 → 해·달 → 구름 → 멀리 나는 새 → sky(비행기·UFO·산타·마녀·박쥐) → 꽃잎 → 눈·비. 난간과 베란다 층은 draw.js */
import { play } from './anim.js';
import { canStart, eventsApt, eventsSky, eventsSkyBack } from './events.js';
import { IMG, imageReady, img } from './assets.js';
import { drawPetals } from './birthday.js';
import { P } from './objects.js';
import { ctx } from './stage.js';
import { fn, hold, run, until } from './steps.js';
import { MOON_SOUTH, butterflyTime, darkness, holiday, isNight, momentNow, moonPhase, nightOf, rainNow, season, skyAt, sunArc, sunUp, twilightGlow } from './time.js';
import { tr } from './i18n.js';
import { RM, clamp, hash, pick, rnd } from './util.js';
import { after, caption, cat, mouse, say, world } from './world.js';
/* ───────── 나비 ───────── */
export function spawnButterfly() {
  if (world.bfly)
    return;
  world.bfly = { x: P.window.x + 180, y: 200, t: 0, life: rnd(26, 40), ph: 0, col: pick(['#f2a541', '#f6d65a', '#8ec1e6', '#f19bb0']) };
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
  const tx = leaving ? P.window.x + 150 : 600 + Math.sin(b.t * 0.31) * 360, ty = leaving ? 120 : 330 + Math.sin(b.t * 0.53) * 120 + Math.cos(b.t * 1.3) * 30;
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
    const x = w.x + ((i * 0.618034) % 1) * w.w, y = i % 2 ? 383 : H - 6, r = 3 + ph * 14;
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
export function drawOutside(d, w) {
  const day = sunUp(d), rain = rainNow(d);
  const night = clamp(darkness(d) / 0.62, 0, 1);
  // 하늘은 그림의 하늘색으로 채우고, 건물은 아래쪽에 작게 (더 많이 보이게)
  const ad = IMG.r_apt_day, an = IMG.r_apt_night, ah = 330, base = imageReady(ad) ? ad : imageReady(an) ? an : null;
  if (!base) {
    ctx.fillStyle = '#263357';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    return;
  }
  const aw = base.width * ah / base.height, ax = w.x + w.w / 2 - aw / 2, ay = w.y + w.h + 4 - ah;
  const sky = (c1, c2) => {
    const g = ctx.createLinearGradient(0, w.y, 0, ay + ah * 0.3);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    return g;
  };
  ctx.fillStyle = sky('#8aa3e6', '#96ade9');
  ctx.fillRect(w.x, w.y, w.w, w.h);
  if (imageReady(ad))
    ctx.drawImage(ad, ax, ay, aw, ah);
  if (night > 0) {
    ctx.globalAlpha = night;
    ctx.fillStyle = sky('#1f2750', '#313d6f');
    ctx.fillRect(w.x, w.y, w.w, ay - w.y + ah * 0.3);
    if (imageReady(an))
      ctx.drawImage(an, ax, ay, aw, ah);
    ctx.globalAlpha = 1;
  }
  // 무지개·번개 하늘(skyBack)을 그렸으면 아파트 마스크(하늘을 뺀 건물만)를 다시 덮어 건물이 앞에 오게 한다. 밤 마스크는 밤 비율로
  if (eventsSkyBack(w)) {
    const md = IMG.r_apt_day_mask, mn = IMG.r_apt_night_mask;
    if (imageReady(md))
      ctx.drawImage(md, ax, ay, aw, ah);
    if (night > 0 && imageReady(mn)) {
      ctx.globalAlpha = night;
      ctx.drawImage(mn, ax, ay, aw, ah);
      ctx.globalAlpha = 1;
    }
  }
  eventsApt(w, { ax, ay, aw, ah, night, d }); // 건너편 창 불빛 (weather.js)
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
  // 해 / 달 (하늘 띠 안에서만)
  if (day && !rain) {
    const t = sunArc(d);
    ctx.beginPath();
    ctx.arc(w.x + 50 + t * (w.w - 100), 190 - Math.sin(Math.PI * t) * 150, 22, 0, 7);
    ctx.fillStyle = 'rgba(255,243,196,.95)';
    ctx.fill();
  }
  if (!day && !rain)
    drawMoon(d, w.x + w.w * 0.74, 70, 17);
  if (rain) {
    const sn = season(d) === 'winter', c1 = sn ? 'rgba(236,238,242,.95)' : 'rgba(86,94,108,.95)', c2 = sn ? 'rgba(220,224,230,.95)' : 'rgba(100,108,122,.95)';
    for (let row = 0; row < 2; row++) {
      ctx.fillStyle = row ? c2 : c1;
      const yy = w.y + (row ? 52 : 22), dx = (world.t * (row ? 5 : 3)) % 120;
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
      const cx = w.x + ((world.t * 3 + i * 190 + hash('c' + i) * 200) % (w.w + 200)) - 100, cy = 36 + i * 40;
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
  world.ufo = { t: 0, dur: rnd(16, 24), y: rnd(60, 150), blink: world.lastType && world.t - world.lastType < 90 || Math.random() < 0.4 };
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
  const sw = 170, sh = sw * im.height / im.width, x = w.x + w.w + 100 - k * (w.w + 280), y = u.y - Math.sin(k * Math.PI) * 28, night = world.dark > 0.3;
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
  world.santa = { t: 0, dur: rnd(22, 30), y: rnd(70, 120) };
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
