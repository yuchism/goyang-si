/* 생일 파티(?birthday=이름): 배너, 케이크, 꽃비, 무대 조명, 노트북 축하 자막, 쥐야쥐 박수 */
import { play } from './anim.js';
import { FRAMES, IMG, imageReady, img } from './assets.js';
import { O, S, objView, socketOf } from './objects.js';
import { Snd } from './sound.js';
import { HOLE } from './sprites.js';
import { H, W, ctx } from './stage.js';
import { bub, dance, fn, go, hold, run } from './steps.js';
import { $, RM, clamp, cutChars, gcEvent, hash, pick, rnd } from './util.js';
import { tr } from './i18n.js';
import { cat, mouse, say, world } from './world.js';
export const DANCE_CELLS = [[54, 553], [599, 1085], [1098, 1591], [1710, 2122]]; // 춤 시트 4장의 가로 범위(px)
export const pageParams = new URLSearchParams(location.search), birthdayMode = pageParams.has('birthday');
export const birthdayName = cutChars((pageParams.get('birthday') || '').trim(), 24).trim();
if (birthdayMode) {
  const banner = document.getElementById('birthday');
  banner.hidden = false;
  gcEvent('birthday-open', '생일 링크로 방 열림'); // 이름은 보내지 않는다
}
export function bannerText() {
  if (birthdayMode)
    document.getElementById('birthdayText').textContent = birthdayName ? tr('bdayBanner', { name: birthdayName }) : tr('bdayBannerNoName');
}
// 생일 파티 중 노트북 화면: 축하 문구가 오른쪽에서 왼쪽으로 흘러간다
export function drawPartyScreen(v) {
  const p = socketOf(O[v.id], 'screenTL'), q = socketOf(O[v.id], 'screenBR');
  if (!p || !q)
    return;
  const x = p[0], y = p[1], w = q[0] - p[0], h = q[1] - p[1], t = world.t, msg = tr('bdayLaptop', { name: birthdayName || tr('bdayDefaultName') });
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#3a1830');
  g.addColorStop(1, '#1c0e22');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 10; i++) {
    const s = 0.5 + 0.5 * Math.sin(t * 3 + i * 2.3);
    ctx.fillStyle = `rgba(255,${200 + i * 5},${150 + i * 8},${0.25 + 0.5 * s})`; // 화면 속 작은 반짝이
    ctx.fillRect(x + w * hash('sx' + i), y + h * (hash('sy' + i) < 0.5 ? 0.12 + 0.18 * hash('sz' + i) : 0.72 + 0.16 * hash('sz' + i)), 1.6, 1.6);
  }
  const fs = Math.round(h * 0.42);
  ctx.font = `700 ${fs}px Gaegu, 'Gowun Dodum', sans-serif`;
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(msg).width, gap = w * 0.6, period = tw + gap, off = RM ? 0 : (t * 34) % period, ty = y + h * 0.5 + Math.sin(t * 4) * h * 0.04;
  ctx.fillStyle = '#ffe28a';
  ctx.shadowColor = 'rgba(255,140,180,.85)';
  ctx.shadowBlur = 6;
  for (let sx = x + w - off - period; sx < x + w; sx += period)
    if (sx + tw > x)
      ctx.fillText(msg, sx, ty);
  ctx.restore();
}
// 밤의 생일 파티: 어둠 위에 무대 조명을 뿌린다 (천장에서 내려오는 색 조명 + 강고양이 씨 핀 조명 + 환한 노트북)
const PARTY_BEAMS = [[250, '255,140,180', 0.55, 0], [640, '255,214,110', 0.4, 2.1], [1010, '130,220,210', 0.5, 4.2]];
export function drawPartyLights(dk) {
  const lv = partyLevel();
  if (!lv || dk < 0.05)
    return;
  const I = lv * Math.min(1, dk * 1.6), t = RM ? 0 : world.t;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // 방 가운데를 따뜻하게 밝혀 어둠을 걷어냄
  let g = ctx.createRadialGradient(cat.x, cat.y - 120, 40, cat.x, cat.y - 60, 560);
  g.addColorStop(0, `rgba(255,214,170,${0.26 * I})`);
  g.addColorStop(1, 'rgba(255,214,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 천장에서 바닥을 훑는 색 조명
  for (const [sx, c, sp, ph] of PARTY_BEAMS) {
    const fx = 600 + Math.sin(t * sp + ph) * 430, fy = 650 + Math.sin(t * sp * 1.3 + ph) * 50, hw = 70;
    g = ctx.createLinearGradient(sx, -20, fx, fy);
    g.addColorStop(0, `rgba(${c},${0.30 * I})`);
    g.addColorStop(1, `rgba(${c},${0.06 * I})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - 10, -20);
    ctx.lineTo(sx + 10, -20);
    ctx.lineTo(fx + hw, fy);
    ctx.lineTo(fx - hw, fy);
    ctx.closePath();
    ctx.fill();
    g = ctx.createRadialGradient(fx, fy, 0, fx, fy, hw * 1.3);
    g.addColorStop(0, `rgba(${c},${0.38 * I})`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(fx, fy, hw * 1.3, hw * 0.42, 0, 0, 7);
    ctx.fill();
  }
  // 강고양이 씨 핀 조명
  const px = cat.x, py = cat.y;
  g = ctx.createLinearGradient(px, -20, px, py);
  g.addColorStop(0, `rgba(255,250,225,${0.05 * I})`);
  g.addColorStop(1, `rgba(255,250,225,${0.2 * I})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(px - 14, -20);
  ctx.lineTo(px + 14, -20);
  ctx.lineTo(px + 105, py);
  ctx.lineTo(px - 105, py);
  ctx.closePath();
  ctx.fill();
  g = ctx.createRadialGradient(px, py, 0, px, py, 120);
  g.addColorStop(0, `rgba(255,248,220,${0.4 * I})`);
  g.addColorStop(1, 'rgba(255,248,220,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(px, py, 120, 34, 0, 0, 7);
  ctx.fill();
  // 노트북 화면 빛
  const lp = O.laptop && socketOf(O.laptop, 'screenTL'), lq = O.laptop && socketOf(O.laptop, 'screenBR');
  if (lp && lq) {
    const cx = (lp[0] + lq[0]) / 2, cy = (lp[1] + lq[1]) / 2;
    g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 150);
    g.addColorStop(0, `rgba(255,150,200,${0.3 * I})`);
    g.addColorStop(1, 'rgba(255,150,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 150, cy - 150, 300, 300);
  }
  ctx.restore();
  // 화면 글자는 어둠 위에 다시 그려 또렷하게
  if (lp && lq && objView(O.laptop).state === 'on') {
    ctx.save();
    ctx.globalAlpha = Math.min(1, I * 1.1);
    drawPartyScreen(objView(O.laptop));
    ctx.restore();
  }
}
/* ───────── 생일: 케이크 촛불과 창밖 꽃비 ───────── */
export const CAKE = { x: 616, y: 600, w: 142 }; // TV 오른쪽 뒤, 책 더미 왼쪽 뒤
// 케이크 그림(993×1584) 안의 촛불 끝 위치
const CAKE_FLAMES = [[255, 236], [362, 170], [495, 86], [640, 170], [750, 236]];
const PETAL_FADE = 6, PETAL_COLORS = ['#ffb7c9', '#ff8fab', '#fff1f4', '#ffe08a', '#f7a8d8', '#ffd0dc'];
export function drawCakeGlow() {
  const im = img('birthday_cake');
  if (!imageReady(im))
    return;
  const k = CAKE.w / im.width, x0 = CAKE.x - CAKE.w / 2, y0 = CAKE.y - im.height * k, t = world.t, lv = partyLevel(), dk = world.lampOn ? (world.dark || 0) * 0.6 : (world.dark || 0), boost = 1 / Math.max(0.35, 1 - dk); // 밤 어둠이 위에 덮이므로 그만큼 밝게
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  CAKE_FLAMES.forEach(([fx, fy], i) => {
    const x = x0 + fx * k, y = y0 + fy * k, fl = 0.75 + 0.25 * Math.sin(t * 11 + i * 2.1) * Math.sin(t * 4.3 + i);
    const r = (14 + lv * 10) * fl, g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = Math.min(1, (0.22 + lv * 0.3) * fl * boost);
    g.addColorStop(0, `rgba(255,226,140,${a})`);
    g.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
  });
  if (lv > 0 && !RM) {
    for (let i = 0; i < 9; i++) {
      const per = 1.6 + hash('ck' + i) * 1.2, ph = (t / per + hash('cp' + i)) % 1, s = Math.sin(ph * Math.PI);
      if (s < 0.05)
        continue;
      const cyc = Math.floor(t / per + hash('cp' + i)), x = x0 + CAKE.w * (0.12 + 0.76 * hash('cx' + i + '_' + cyc)), y = y0 + im.height * k * (0.12 + 0.62 * hash('cy' + i + '_' + cyc)), r = (3 + 5 * s) * lv;
      ctx.fillStyle = `rgba(255,248,215,${Math.min(1, 0.9 * s * lv * boost)})`;
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r, y);
      ctx.quadraticCurveTo(x, y, x, y - r);
      ctx.fill();
    }
  }
  ctx.restore();
}
export function drawPetals(w) {
  const lv = partyLevel();
  if (!lv)
    return;
  const t = world.t, n = RM ? 26 : 64;
  ctx.save();
  ctx.beginPath();
  ctx.rect(w.x, w.y, w.w, w.h);
  ctx.clip();
  for (let i = 0; i < Math.round(n * lv); i++) {
    const sp = 26 + hash('pv' + i) * 34, sz = 4.4 + hash('ps' + i) * 4, y = w.y + (((i * 0.381966) % 1) * (w.h + 30) + t * sp) % (w.h + 30) - 15, x = w.x + ((((i * 0.618034) % 1) * w.w + Math.sin(t * 1.1 + i * 1.7) * 22 + t * 9) % w.w + w.w) % w.w, rot = t * (1.5 + hash('pr' + i) * 2) + i, flip = Math.cos(t * (2.4 + hash('pf' + i) * 2) + i);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(1, 0.35 + 0.65 * Math.abs(flip));
    ctx.fillStyle = PETAL_COLORS[i % PETAL_COLORS.length];
    if (i % 5 === 4) {
      ctx.fillRect(-sz * 0.5, -sz * 0.9, sz, sz * 1.8);
    } // 반짝이 종이 조각
    else {
      ctx.beginPath();
      ctx.moveTo(0, -sz);
      ctx.quadraticCurveTo(sz * 0.95, -sz * 0.15, 0, sz);
      ctx.quadraticCurveTo(-sz * 0.95, -sz * 0.15, 0, -sz);
      ctx.fill();
    } // 꽃잎
    ctx.restore();
  }
  ctx.restore();
}
// 생일 파티: 쥐야쥐가 꼬깔모자를 쓰고 쥐구멍에서 몸을 반쯤 내밀고 박수
export function drawPartyMouse() {
  const lv = partyLevel();
  if (!lv || world.manduk || !mouse.hidden || (mouse.where || 'hole') !== 'hole')
    return;
  const p = world.party, since = p.end == null ? -1 : p.t - p.end, fr = 'mouse_bday_clap_' + (since < 2 && !RM ? Math.floor(world.t * 3.2) % 2 + 1 : 2), im = IMG['f_' + fr];
  if (!imageReady(im))
    return;
  const [, , ax, ay] = FRAMES[fr], s = 0.21;
  ctx.save();
  ctx.globalAlpha = since < 0 ? Math.min(1, lv * 1.5) : clamp((PETAL_FADE - since) / 2, 0, 1); /* 춤이 끝나도 조금 더 박수 치다가 웃으며 쏙 */
  ctx.beginPath();
  ctx.rect(HOLE.cx - 160, HOLE.bottom - 140, 240, 140);
  ctx.clip();
  ctx.drawImage(im, HOLE.cx - ax * s, HOLE.bottom + 4 - ay * s, im.width * s, im.height * s);
  ctx.restore();
}
let birthdayPartyStarted = false;
// 파티: 배너를 누르면 시작, 춤이 끝나면(또는 중간에 끊겨도 시간이 지나면) 끝나고 배너를 다시 누를 수 있다
function startBirthdayParty() {
  if (!birthdayMode || birthdayPartyStarted)
    return;
  birthdayPartyStarted = true;
  const banner = $('birthday');
  banner.classList.add('party-started');
  banner.setAttribute('aria-pressed', 'true');
  Snd.init();
  if (Snd.ac) {
    Snd.on = true;
    Snd.ac.resume();
    $('bSound').setAttribute('aria-pressed', 'true');
    $('bSound').textContent = tr('soundOff');
  }
  const sec = Snd.birthdaySong() || 13;
  world.party = { t: 0, limit: sec + 20, end: null };
  // 쥐야쥐도 쥐구멍으로 가서 박수 (밤이든 낮이든, 만득 씨 없을 때)
  if (!mouse.hidden && !world.manduk) {
    const o = S('hole.out');
    run(mouse, [go(o[0], o[1], 150), fn(a => {
        a.hidden = true;
        a.peek = false;
        a.where = 'hole';
        a.state = '';
      })], 'party');
  }
  run(cat, [
    go(500, 690, 85),
    bub('🎂❤️✨', 2),
    play('hatOn'),
    dance(sec),
    fn(() => endBirthdayParty()),
    play(pick(['tada', 'bow'])),
    fn(a => say(a, '❤️', 3)),
    fn(a => {
      a.dp = a.pose = 'loaf';
      a.tr = null;
    }),
    play('hatloaf', rnd(25, 50)),
    hold(rnd(20, 45), 'loaf', true)
  ], 'birthday');
}
function endBirthdayParty() {
  const p = world.party;
  if (p && p.end == null)
    p.end = p.t;
  birthdayPartyStarted = false;
  const banner = $('birthday');
  banner.classList.remove('party-started');
  banner.setAttribute('aria-pressed', 'false');
}
export function tickParty(dt) {
  const p = world.party;
  if (!p)
    return;
  p.t += dt;
  if (p.end == null && p.t > p.limit)
    endBirthdayParty();
  if (p.end != null && p.t - p.end > PETAL_FADE)
    world.party = null;
}
// 0(없음)~1(한창): 시작할 때 서서히 내리고, 끝나면 서서히 그친다
export function partyLevel() {
  const p = world.party;
  if (!p)
    return 0;
  const a = Math.min(1, p.t / 1.5);
  return p.end == null ? a : a * Math.max(0, 1 - (p.t - p.end) / PETAL_FADE);
}
$('birthday').onclick = startBirthdayParty;
