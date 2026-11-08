/* 쥐구멍 기지로 출동·귀환 (tasks/base-3-sortie.md) — 새 그림 없이 코드로
   - 열쇠: 책장 초록 책(green)의 발바닥이 은은하게 반짝. 그 자리를 누르면 출동(ui.js tapAt). 만득 씨가 있거나 생일·할로윈이면 꺼짐
   - 출동: 비상등 → 쥐야쥐(코드 왕관) 쏙 → 강고양이 씨가 쥐구멍 앞으로 가서 빨려 들어감 → 어항 스르륵 → 쥐구멍 줌인 → /base/
   - 귀환(/?from=base): 쥐야쥐 → 강고양이 씨 순으로 쥐구멍에서 튀어나와 제자리로. 어항은 처음부터 제자리
   - 빨려 들어감 = 쥐구멍 입구(objects.json hole.mouth) 쪽으로 줄이며 잘라 그림(withSuck — main.js가 강고양이 씨·어항을 그릴 때 감싼다)
   - 동작 줄이기: 장면 없이 잠깐 어두워졌다 넘어감 */
import { isHalloween, now } from './time.js';
import { RM, store } from './util.js';
import { cat, mouse, world } from './world.js';

// 방 쪽 도구는 main.js가 넣어 준다(initSortie) — 이 파일이 방 모듈을 가져오면 엉킨 덩어리가 커진다 (tasks/structure-guard.md)
let D = null;
export const initSortie = deps => { D = deps; };

const BASE = '/base/';
const KEY_BOOK = 'green';
const SEEN = 'baseVisits';
const BRIGHT_FIRST = 3; // 처음 몇 번은 더 밝게
const SUCK_SEC = 0.8, BOWL_SLIDE = 1.3, ZOOM_SEC = 0.75;
const RAD = Math.PI / 180;

let R = null; // 출동 중: { t0, catAt, bowlAt, bowlFrom, zoomAt }
const suck = {}; // 빨려 들어감 0..1 (cat · fishbowl)
const T = () => performance.now() / 1000;

export const sortieOn = () => !!R;
export const keyOn = () => !!D && !R && !world.manduk && !D.birthdayMode() && !isHalloween(now()) && !!keyPaw();

// 초록 책 발바닥 가운데 (방 좌표). shelf.js paintBook과 같은 자리: 책 바닥 왼쪽이 원점, 위가 -y, 책 기울기대로
function keyPaw() {
  const bs = D.O.bookshelf, b = bs && bs.books && bs.books.find(x => x.id === KEY_BOOK);
  if (!b || !bs.frame) return null;
  const [px, py] = (b.deco && b.deco.paw) || [0.5, 0.5];
  const by = bs.frame.rows[b.shelf || 0][1], r = (b.rot || 0) * RAD;
  const u = b.w * px, v = -b.h + b.h * py;
  return [b.x + u * Math.cos(r) - v * Math.sin(r), by + u * Math.sin(r) + v * Math.cos(r)];
}
export function keyAt(x, y) {
  const p = keyOn() && keyPaw();
  if (!p) return false;
  const rad = Math.max(14, 22 / (D.view.s || 1)); // 화면에서 44px 이상
  return Math.hypot(x - p[0], y - p[1]) <= rad;
}
export function drawKey() {
  const p = keyOn() && keyPaw();
  if (!p) return;
  const first = (store.get(SEEN, 0) || 0) < BRIGHT_FIRST;
  const a = (first ? 0.55 : 0.32) * (RM ? 1 : 0.7 + 0.3 * Math.sin(T() * 2.2));
  D.ctx.globalCompositeOperation = 'lighter';
  const g = D.ctx.createRadialGradient(p[0], p[1], 1, p[0], p[1], 15);
  g.addColorStop(0, `rgba(255,236,170,${a})`);
  g.addColorStop(1, 'rgba(255,236,170,0)');
  D.ctx.fillStyle = g;
  D.ctx.fillRect(p[0] - 16, p[1] - 16, 32, 32);
}

/* ───────── 빨려 들어감·튀어나옴 ───────── */
const mouth = () => {
  const m = D.O.hole && D.O.hole.mouth;
  return m ? { cx: m.cx, cy: m.bottom - m.h / 2, w: m.w, h: m.h } : { cx: 810, cy: 479, w: 64, h: 46 };
};
export function withSuck(key, draw) {
  const k = suck[key] || 0;
  if (!k) return draw();
  if (k >= 1) return;
  const m = mouth(), e = k * k;
  D.ctx.save();
  D.ctx.beginPath(); // 입구 둘레로 좁아지는 타원 밖은 안 보임 (벽 속으로)
  D.ctx.ellipse(m.cx, m.cy, m.w / 2 + (1 - e) * 700, m.h / 2 + (1 - e) * 500, 0, 0, Math.PI * 2);
  D.ctx.clip();
  D.ctx.translate(m.cx, m.cy);
  D.ctx.scale(1 - 0.9 * e, 1 - 0.75 * e);
  D.ctx.translate(-m.cx, -m.cy);
  D.ctx.globalAlpha *= 1 - Math.max(0, k - 0.8) * 5;
  draw();
  D.ctx.restore();
}
function ease(key, from, to, sec, done) {
  const t0 = T();
  const step = () => {
    const k = Math.min(1, (T() - t0) / sec);
    suck[key] = from + (to - from) * k;
    if (k < 1) requestAnimationFrame(step);
    else done && done();
  };
  step();
}

/* ───────── 출동 ───────── */
let veil = null;
function cover() {
  if (veil) return veil;
  veil = document.createElement('div');
  Object.assign(veil.style, { position: 'fixed', inset: '0', background: '#0b0a12', opacity: '0', pointerEvents: 'none', zIndex: '60', transition: 'opacity .35s ease' });
  document.body.append(veil);
  return veil;
}
const leave = () => { location.href = BASE; };
function alarm() { // 화면 가장자리 붉게 두 번
  const a = document.createElement('div');
  Object.assign(a.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '59', boxShadow: 'inset 0 0 90px 30px rgba(230,40,30,.55)', opacity: '0' });
  document.body.append(a);
  a.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 1100 }).finished.then(() => a.remove(), () => a.remove());
}
export function sortieTap(x, y) { // ui.js tapAt 맨 앞: 출동 중엔 다른 입력을 막고, 열쇠면 출동
  if (R) return true;
  if (!keyAt(x, y)) return false;
  startSortie();
  return true;
}
export function startSortie() {
  if (R || !D) return;
  store.set(SEEN, (store.get(SEEN, 0) || 0) + 1);
  R = { t0: T() };
  world.sortie = true;
  if (RM) {
    cover().style.opacity = '1';
    setTimeout(leave, 450);
    return;
  }
  alarm();
  const out = D.S('hole.out') || [819, 588];
  // 쥐야쥐: 보이면 쥐구멍으로 달려가고, 숨어 있으면 빼꼼 나왔다가 쏙
  mouse.crown = true;
  if (mouse.hidden) {
    Object.assign(mouse, { x: out[0], y: out[1], hidden: false, face: -1, peek: false, state: 'sortie' });
    D.run(mouse, [D.hold(0.7, 'walk', false, 1), D.fn(a => { a.hidden = true; a.state = ''; a.where = 'hole'; })], 'sortie');
  }
  else {
    mouse.state = 'sortie';
    D.run(mouse, [D.go(out[0], out[1], D.MOUSE_RUN * 1.2), D.fn(a => { a.hidden = true; a.state = ''; a.where = 'hole'; })], 'sortie');
  }
  // 강고양이 씨: 하던 걸 멈추고 쥐구멍 앞으로 → 빨려 들어감
  D.run(cat, [], '');
  Object.assign(cat, { act: null, tr: null, react: null, jump: null, bub: null, inBox: false, typing: false, closed: false });
  const sp = Math.max(240, Math.hypot(cat.x - out[0], cat.y - out[1]) / 1.6);
  D.run(cat, [D.hold(0.5, 'stand', false, cat.x > out[0] ? -1 : 1), D.go(out[0] + 10, out[1] + 4, sp), D.hold(0.15, 'stand', false, -1),
    D.fn(() => ease('cat', 0, 1, SUCK_SEC, () => (R.catAt = T())))], 'sortie');
  // 어항: 조금 뒤 바닥을 스르륵 쥐구멍 쪽으로 → 빨려 들어감
  const bowl = D.O.fishbowl;
  if (bowl && bowl.pos) {
    const from = { ...bowl.pos }, to = [out[0] + 70, out[1] + 14];
    setTimeout(() => {
      const t0 = T();
      const slide = () => {
        const k = Math.min(1, (T() - t0) / BOWL_SLIDE), e = k < 0.5 ? 2 * k * k : 1 - (2 - 2 * k) ** 2 / 2;
        bowl.pos.x = from.x + (to[0] - from.x) * e;
        bowl.pos.y = from.y + (to[1] - from.y) * e;
        if (k < 1) requestAnimationFrame(slide);
        else ease('fishbowl', 0, 1, SUCK_SEC * 0.8, () => (R.bowlAt = T()));
      };
      slide();
    }, 900);
  }
  else R.bowlAt = T();
  const wait = () => {
    if (R.catAt && R.bowlAt) return zoom();
    if (T() - R.t0 > 12) return zoom(); // 무엇이 걸려도 넘어감
    setTimeout(wait, 100);
  };
  wait();
}
function zoom() {
  const m = mouth(), vw = D.view.vw || D.W(), cv = D.cv;
  cv.style.transformOrigin = `${((m.cx - D.cam.x) / vw * 100).toFixed(2)}% ${(m.cy / D.H() * 100).toFixed(2)}%`;
  cv.style.transition = `transform ${ZOOM_SEC}s ease-in`;
  cv.style.transform = 'scale(6)';
  setTimeout(() => (cover().style.opacity = '1'), ZOOM_SEC * 600);
  setTimeout(leave, ZOOM_SEC * 1000 + 250);
}
export function drawSortie() { // 쥐야쥐 코드 왕관 (출동할 때만)
  if (!mouse.crown || mouse.hidden) return;
  const x = mouse.x + (mouse.face > 0 ? 4 : -4), y = mouse.y - 30;
  D.ctx.fillStyle = '#f2c230';
  D.ctx.strokeStyle = '#2a1a12';
  D.ctx.lineWidth = 1.4;
  D.ctx.beginPath();
  D.ctx.moveTo(x - 7, y + 4); D.ctx.lineTo(x - 7, y - 3); D.ctx.lineTo(x - 3.5, y + 1); D.ctx.lineTo(x, y - 5);
  D.ctx.lineTo(x + 3.5, y + 1); D.ctx.lineTo(x + 7, y - 3); D.ctx.lineTo(x + 7, y + 4); D.ctx.closePath();
  D.ctx.fill();
  D.ctx.stroke();
}

/* ───────── 귀환 ───────── */
let back = false;
export function readBaseBack() { // 시작할 때 한 번: ?from=base를 읽고 지운다(새로 고침에 또 안 하게)
  try {
    const u = new URL(location.href);
    if (u.searchParams.get('from') !== 'base') return false;
    u.searchParams.delete('from');
    history.replaceState(history.state, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams : '') + u.hash);
    back = true;
  }
  catch (e) { back = false; }
  return back;
}
export const cameFromBase = () => back;
export function baseReturn() {
  if (!D || world.manduk || RM) return; // 만득 씨가 있으면 조용히 이미 제자리
  const out = D.S('hole.out') || [819, 588];
  // 쥐야쥐 먼저
  Object.assign(mouse, { x: out[0], y: out[1], hidden: false, face: 1, peek: false, state: 'sortie' });
  D.run(mouse, [D.hold(0.3, 'walk', false, 1), D.go(out[0] + 110, out[1] + 10, D.MOUSE_RUN), D.hold(1.6, 'walk', false, -1), D.fn(a => { a.state = ''; D.mouseHide(false); })], 'return');
  // 이어서 강고양이 씨: 쥐구멍에서 튀어나와 원래 자리로
  const home = [cat.x, cat.y], pose = cat.pose;
  suck.cat = 1;
  setTimeout(() => {
    D.run(cat, [], '');
    Object.assign(cat, { x: out[0] + 10, y: out[1] + 4, face: 1, inBox: false, bub: null });
    ease('cat', 1, 0, 0.5, () => {
      suck.cat = 0;
      D.run(cat, [D.hold(0.4, 'stand', false, 1), D.go(home[0], home[1], 140), D.hold(1, pose === 'sleep' ? 'loaf' : pose || 'loaf')], 'return');
    });
  }, 700);
}
