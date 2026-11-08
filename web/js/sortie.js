/* 쥐구멍 기지로 출동·귀환 (tasks/base-3-sortie.md) — 새 그림 없이 코드로
   - 열쇠: 책장 초록 책(green)의 발바닥이 은은하게 반짝. 그 자리를 누르면 출동(ui.js tapAt). 만득 씨가 있거나 생일·할로윈이면 꺼짐
   - 출동: 쥐구멍 쪽으로 살짝 다가가며 어두워짐 → /base/ (식구는 움직이지 않음 — 주인 결정 2026-11-08: 장면이 과함)
   - 귀환(/?from=base): 거실이 어둠에서 스르륵 밝아짐
   - 동작 줄이기: 다가가기 없이 어두워졌다 넘어감 */
import { isHalloween, now } from './time.js';
import { RM, store } from './util.js';
import { world } from './world.js';

// 방 쪽 도구는 main.js가 넣어 준다(initSortie) — 이 파일이 방 모듈을 가져오면 엉킨 덩어리가 커진다 (tasks/structure-guard.md)
let D = null;
export const initSortie = deps => { D = deps; };

const BASE = '/base/';
const KEY_BOOK = 'green';
const SEEN = 'baseVisits';
const BRIGHT_FIRST = 3; // 처음 몇 번은 더 밝게
const ZOOM_SEC = 0.8;
const RAD = Math.PI / 180;

let R = null; // 출동 중
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

const mouth = () => {
  const m = D.O.hole && D.O.hole.mouth;
  return m ? { cx: m.cx, cy: m.bottom - m.h / 2 } : { cx: 810, cy: 479 };
};

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
  zoom();
}
function zoom() {
  const m = mouth(), vw = D.view.vw || D.W(), cv = D.cv;
  cv.style.transformOrigin = `${((m.cx - D.cam.x) / vw * 100).toFixed(2)}% ${(m.cy / D.H() * 100).toFixed(2)}%`;
  cv.style.transition = `transform ${ZOOM_SEC}s ease-in`;
  cv.style.transform = 'scale(1.8)';
  setTimeout(() => (cover().style.opacity = '1'), ZOOM_SEC * 600);
  setTimeout(leave, ZOOM_SEC * 1000 + 250);
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
export function baseReturn() { // 어둠에서 스르륵 (시작하자마자 부른다)
  const v = cover();
  v.style.transition = 'none';
  v.style.opacity = '1';
  void v.offsetWidth;
  v.style.transition = `opacity ${RM ? 0.3 : 0.9}s ease`;
  requestAnimationFrame(() => (v.style.opacity = '0'));
}
