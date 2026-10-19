/* 생일 파티(?birthday=이름): 배너, 케이크, 꽃비, 무대 조명, 노트북 축하 자막, 쥐야쥐 박수, 디스코볼, 노래 시계.
   깜짝 손님은 guests.js (BIRTHDAY_GUESTS_PLAN.md) */
import { play } from './anim.js';
import { FRAMES, IMG, imageReady, img } from './assets.js';
import { A, O, PL, S, objView, socketOf } from './objects.js';
import { BDAY_SONG, Snd } from './sound.js';
import { guestsCue, guestsLeave, guestsStart, guestsTick } from './guests.js';
import { HOLE } from './sprites.js';
import { H, W, ctx } from './stage.js';
import { bub, dance, fn, go, hold, run } from './steps.js';
import { $, INK, RM, clamp, cutChars, ease, gcEvent, hash, onScene, pick, rnd } from './util.js';
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
const PARTY_BEAMS = [['255,140,180', 0.55, 0], ['255,214,110', 0.4, 2.1], ['130,220,210', 0.5, 4.2]]; // 색·빠르기·위상. 내려오는 x는 장면의 party.beams
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
  const xs = PL('party.beams').xs, fl = A('party.floorLight');
  const fcx = (fl.x[0] + fl.x[1]) / 2, fax = (fl.x[1] - fl.x[0]) / 2, fcy = (fl.y[0] + fl.y[1]) / 2, fay = (fl.y[1] - fl.y[0]) / 2;
  for (const [i, [c, sp, ph]] of PARTY_BEAMS.entries()) {
    const sx = xs[i], fx = fcx + Math.sin(t * sp + ph) * fax, fy = fcy + Math.sin(t * sp * 1.3 + ph) * fay, hw = 70;
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
export const CAKE = {}; // 장면의 party.cake: x, y, w, 그리는 깊이 depth (TV 오른쪽 뒤, 책 더미 왼쪽 뒤)
onScene(() => Object.assign(CAKE, PL('party.cake')));
// 케이크 그림(993×1584) 안의 촛불 끝 위치
const CAKE_FLAMES = [[255, 236], [362, 170], [495, 86], [640, 170], [750, 236]];
const PETAL_FADE = 6, MOUSE_ENCORE = 6, PETAL_COLORS = ['#ffb7c9', '#ff8fab', '#fff1f4', '#ffe08a', '#f7a8d8', '#ffd0dc'];
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
const mouseClapping = () => !world.manduk && mouse.hidden && (mouse.where || 'hole') === 'hole';
export function drawPartyMouse() {
  const p = world.party;
  if (!p || !mouseClapping() || (p.end != null && p.t - p.end > MOUSE_ENCORE + 1.5) || (p.end == null && !partyLevel()))
    return;
  const lv = partyLevel(), since = p.end == null ? -1 : p.t - p.end, fr = 'mouse_bday_clap_' + (since < MOUSE_ENCORE && !RM ? Math.floor(world.t * 3.2) % 2 + 1 : 2), im = IMG['f_' + fr];
  if (!imageReady(im))
    return;
  const [, , ax, ay] = FRAMES[fr], s = 0.21;
  ctx.save();
  ctx.globalAlpha = since < 0 ? Math.min(1, lv * 1.5) : clamp((MOUSE_ENCORE + 1.5 - since) / 1.5, 0, 1); /* 춤이 끝나도 MOUSE_ENCORE초 더 박수 치다가 웃으며 쏙 (작은 폰은 카메라가 이때 쥐야쥐 쪽으로, 7-1) */
  ctx.beginPath();
  ctx.rect(HOLE.cx - 160, HOLE.bottom - 140, 240, 140);
  ctx.clip();
  ctx.drawImage(im, HOLE.cx - ax * s, HOLE.bottom + 4 - ay * s, im.width * s, im.height * s);
  ctx.restore();
}
let birthdayPartyStarted = false;
const NO_SOUND_SEC = 13, PARTY_WAIT = 30; // 소리가 꺼져 있을 때 춤 길이, 춤 시작 전 최대 대기(끊김 대비)
const PARTY_CLEAR = Math.max(PETAL_FADE, MOUSE_ENCORE + 1.5); // 파티가 끝나고 정리될 때까지 (꽃비 그침, 쥐야쥐 박수 끝)
// 파티: 배너를 누르면 시작, 춤이 끝나면(또는 중간에 끊겨도 시간이 지나면) 끝나고 배너를 다시 누를 수 있다.
// 배너를 누르면 조명·꽃비·케이크·디스코볼 내려오기가 바로 시작하고, 노래는 강고양이 씨가 춤을 시작하는 순간에 튼다 (BIRTHDAY_GUESTS_PLAN.md 13장)
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
  // song: 노래 시계 (노래를 튼 때 startSong이 채움). cam: 좁은 화면 카메라 'party' → 'mouse' → null (stage.js camTarget, 7-1)
  const p = world.party = { t: 0, limit: PARTY_WAIT + NO_SOUND_SEC + 20, end: null, song: null, songEnd: null, cam: 'party' };
  guestsStart(p);
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
    go(PL('party.cat').x, PL('party.cat').y, 85),
    bub('🎂❤️✨', 2),
    play('hatOn'),
    fn(() => startSong()),
    dance(() => world.party && world.party.song ? world.party.song.sec : NO_SOUND_SEC),
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
// 춤 시작: 노래를 틀고 노래 시계를 잡는다. 손님 나오는 시각도 이때 정한다
function startSong() {
  const p = world.party;
  if (!p || p.end != null || p.song)
    return;
  const info = Snd.birthdaySong(); // 소리 꺼짐이면 null
  p.song = info ? { start: p.t, sec: info.sec, beat: info.beat, phrases: info.phrases } : { start: p.t, sec: NO_SOUND_SEC, beat: BDAY_SONG.beat, phrases: null };
  p.limit = p.t + p.song.sec + 20;
  guestsCue(p);
}
// 춤 칸 번호(0~3): 노래 시계로 센다. 강고양이 씨와 손님이 같은 함수를 써서 늘 같은 칸 (BIRTHDAY_GUESTS_PLAN.md 4-4)
export function danceCell(a) {
  const p = world.party, s = p && p.song;
  if (s)
    return Math.floor(Math.max(0, p.t - s.start) / s.beat) % 4;
  return Math.floor((a && a.dance ? a.dance.t : 0) / BDAY_SONG.beat) % 4;
}
function endBirthdayParty() {
  const p = world.party;
  if (p && p.end == null) {
    p.end = p.t;
    guestsLeave(p);
  }
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
  if (p.song && p.songEnd == null && (p.t - p.song.start >= p.song.sec || p.end != null))
    p.songEnd = p.t; // 노래 끝 (디스코볼이 올라가기 시작, 카메라는 쥐야쥐 쪽으로)
  guestsTick(p);
  // 카메라: 노래가 끝나면 쥐야쥐 박수 쪽으로 (쥐야쥐가 쥐구멍에서 박수 칠 때만), 박수가 끝나면 평소대로
  if (p.songEnd != null || p.end != null)
    p.cam = mouseClapping() && (p.end == null || p.t - p.end < MOUSE_ENCORE + 1) ? 'mouse' : null;
  if (world.manduk)
    p.cam = null;
  if (p.end != null && p.t - p.end > PARTY_CLEAR)
    world.party = null;
}
/* ───────── 디스코볼 (BIRTHDAY_GUESTS_PLAN.md 10장) ─────────
   배너를 누르면 배너 뒤(천장 위)에서 내려와 장면의 party.disco 자리에 걸린다. 노래가 시작되면 돌고,
   노래가 끝나면 다시 올라간다. 배너는 캔버스 위에 떠 있는 HTML이라 위에서 내려오기만 하면 배너 뒤에서 나오는 것처럼 보인다 */
const DISCO_DROP = 2, DISCO_SPIN = 1.7; // 내려오는·올라가는 시간(초), 도는 빠르기(라디안/초)
const DISCO_DOTS = ['255,250,235', '255,170,205', '255,222,130', '150,235,220'];
function discoState() {
  const p = world.party, D = PL('party.disco');
  if (!p || !D)
    return null;
  const up = p.songEnd != null ? p.songEnd : p.end; // 올라가기 시작한 때
  let d = RM ? 1 : ease(clamp(p.t / DISCO_DROP, 0, 1));
  if (up != null)
    d = RM ? 0 : Math.min(d, 1 - ease(clamp((p.t - up) / DISCO_DROP, 0, 1)));
  if (d <= 0)
    return null;
  const s = p.song, st = s ? clamp(p.t - s.start, 0, s.sec) : 0, spinning = !!s && p.songEnd == null && !RM;
  const top = -D.r - 20, y = top + (D.y - top) * d;
  const sway = RM ? 0 : Math.sin(p.t * 1.9) * 5 * (s ? 0.3 : 1) * d; // 매달려 내려오며 살짝 흔들림
  return { x: D.x + sway, y, r: D.r, ph: st * DISCO_SPIN, spinning, beat: s ? Math.floor(st / s.beat) : 0, d };
}
// 볼 (어둠 위에 그리고 밤만큼 살짝 어둡게)
export function drawDisco(dk) {
  const b = discoState();
  if (!b)
    return;
  const { x, y, r, ph } = b;
  ctx.save();
  ctx.strokeStyle = INK; // 줄
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, -10);
  ctx.lineTo(x, y - r - 5);
  ctx.stroke();
  ctx.fillStyle = '#8a8f99'; // 꼭지
  ctx.fillRect(x - 5, y - r - 7, 10, 8);
  ctx.strokeRect(x - 5, y - r - 7, 10, 8);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#9aa0ab';
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  const ROWS = 7;
  for (let j = 0; j < ROWS; j++) { // 위도 띠마다 거울 타일 (가로로 흘러서 도는 것처럼)
    const f0 = -Math.PI / 2 + Math.PI * j / ROWS, f1 = -Math.PI / 2 + Math.PI * (j + 1) / ROWS, fm = (f0 + f1) / 2;
    const y0 = y + r * Math.sin(f0), y1 = y + r * Math.sin(f1), rho = r * Math.cos(fm), N = Math.max(4, Math.round(12 * Math.cos(fm)));
    for (let k = 0; k < N; k++) {
      const ta = k * 2 * Math.PI / N + ph + j * 0.4, tb = ta + 2 * Math.PI / N, tm = (ta + tb) / 2;
      if (Math.cos(tm) <= 0)
        continue;
      const xa = x + rho * Math.sin(Math.max(-Math.PI / 2, Math.min(Math.PI / 2, ((ta + Math.PI) % (2 * Math.PI)) - Math.PI)));
      const xb = x + rho * Math.sin(Math.max(-Math.PI / 2, Math.min(Math.PI / 2, ((tb + Math.PI) % (2 * Math.PI)) - Math.PI)));
      const lit = 0.55 + 0.4 * Math.cos(tm) * (1 - Math.abs(Math.sin(fm))) + 0.15 * (hash('dt' + j + '_' + k) - 0.5);
      const spark = b.spinning && (k * 5 + j * 3 + b.beat * 7) % 11 === 0;
      const c = spark ? 255 : Math.round(120 + 110 * clamp(lit, 0, 1));
      ctx.fillStyle = spark ? '#fffbe8' : `rgb(${c - 6},${c},${c + 10})`;
      ctx.fillRect(Math.min(xa, xb) + 0.6, Math.min(y0, y1) + 0.6, Math.abs(xb - xa) - 1.2, Math.abs(y1 - y0) - 1.2);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,.75)'; // 반사광
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.13, -0.6, 0, 7);
  ctx.fill();
  if (dk > 0) {
    ctx.fillStyle = `rgba(16,20,46,${dk * 0.35})`;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.stroke();
  ctx.restore();
}
// 도는 동안 방을 훑는 작은 빛 점 (밤엔 또렷이, 낮엔 아주 옅게)
export function drawDiscoLights(dk) {
  const b = discoState();
  if (!b || !b.spinning)
    return;
  const I = b.d * (0.22 + 0.78 * clamp(dk * 1.4, 0, 1)), t = world.t;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 34; i++) {
    const span = W + 240, x = ((hash('dx' + i) * span + b.ph * 70 * (0.7 + 0.6 * hash('ds' + i))) % span) - 120, y = 40 + hash('dy' + i) * 690;
    const tw = 0.6 + 0.4 * Math.sin(t * 5 + i * 1.7), r = 2.5 + 3.5 * hash('dr' + i), floor = y > 590;
    ctx.fillStyle = `rgba(${DISCO_DOTS[i % DISCO_DOTS.length]},${0.55 * I * tw})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r * (floor ? 1.6 : 1), r * (floor ? 0.6 : 1), 0, 0, 7);
    ctx.fill();
  }
  ctx.restore();
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
