/* 창밖과 하늘을 나는 것: 하늘·해·달·구름·비·눈, 새, 나비, UFO, 산타 썰매 */
import { play } from './anim.js';
import { drawHalloweenSky } from './halloween.js';
import { IMG, imageReady, img } from './assets.js';
import { drawPetals } from './birthday.js';
import { P } from './objects.js';
import { ctx } from './stage.js';
import { fn, hold, run, until } from './steps.js';
import { darkness, dayKey, holiday, hourOf, rainNow, season, skyAt, sunTimes } from './time.js';
import { RM, clamp, hash, pick, rnd } from './util.js';
import { cat, mouse, say, world } from './world.js';
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
export function drawOutside(d, w) {
  const h = hourOf(d), [r, s] = sunTimes(d), day = h > r && h < s, rain = rainNow(d);
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
  // 새벽·노을 빛
  const [top, bot] = skyAt(d);
  const tw = (h > r - 1 && h < r + 1.5) || (h > s - 1.5 && h < s + 1) ? 0.28 : 0;
  if (tw) {
    ctx.fillStyle = bot;
    ctx.globalAlpha = tw;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.globalAlpha = 1;
  }
  if (rain) {
    const snow = season(d) === 'winter', g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
    g.addColorStop(0, snow ? 'rgba(200,206,214,.92)' : 'rgba(104,113,128,.95)');
    g.addColorStop(0.62, snow ? 'rgba(210,215,222,.82)' : 'rgba(124,133,147,.85)');
    g.addColorStop(1, snow ? 'rgba(225,228,234,.45)' : 'rgba(140,148,160,.5)');
    ctx.fillStyle = g;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    if (night > 0) {
      ctx.fillStyle = `rgba(20,24,40,${0.55 * night})`;
      ctx.fillRect(w.x, w.y, w.w, w.h);
    }
  }
  // 해 / 달 (하늘 띠 안에서만)
  if (day && !rain) {
    const t = (h - r) / (s - r);
    ctx.beginPath();
    ctx.arc(w.x + 50 + t * (w.w - 100), 190 - Math.sin(Math.PI * t) * 150, 22, 0, 7);
    ctx.fillStyle = 'rgba(255,243,196,.95)';
    ctx.fill();
  }
  if (!day && !rain) {
    ctx.beginPath();
    ctx.arc(w.x + w.w * 0.74, 70, 17, 0, 7);
    ctx.fillStyle = '#f4eed2';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w.x + w.w * 0.74 + 8, 64, 14, 0, 7);
    ctx.fillStyle = top;
    ctx.fill();
  }
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
  drawUFO(w);
  drawSanta(w);
  drawHalloweenSky(w);
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
  const h = hourOf(d);
  if (world.manduk || world.witch || world.curtainShadow || !(h >= 20 || h < 4))
    return; // 마녀가 지나가는 밤에는 미룸
  const boost = world.lastType && world.t - world.lastType < 90 ? 40 : 1;
  if (Math.random() < dt * boost / (3 * 3600))
    startUFO();
}
export function startUFO() {
  if (world.ufo)
    return;
  world.ufo = { t: 0, dur: rnd(16, 24), y: rnd(60, 150), blink: world.lastType && world.t - world.lastType < 90 || Math.random() < 0.4 };
  setTimeout(() => {
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
  }, 4000);
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
  const h = hourOf(d);
  if (!(h >= 19 || h < 4))
    return;
  const eve = d.getMonth() === 11 && d.getDate() === 24 && h >= 21;
  if (eve && !world.santaEve) {
    world.santaEve = dayKey(d);
    return startSanta();
  }
  if (Math.random() < dt / (2 * 3600))
    startSanta();
}
export function startSanta() {
  if (world.santa)
    return;
  world.santa = { t: 0, dur: rnd(22, 30), y: rnd(70, 120) };
  setTimeout(() => {
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
  }, 6000);
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
