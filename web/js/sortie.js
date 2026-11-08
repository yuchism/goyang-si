/* 쥐구멍 기지로 출동·귀환 (tasks/base-3-sortie.md) — 새 그림 없이 코드로
   - 열쇠: 책장 초록 책(green)의 발바닥이 은은하게 반짝. 그 자리를 누르면 출동(ui.js tapAt). 만득 씨가 있거나 생일·할로윈이면 꺼짐
   - 출동: 비상등이 짠짠짠(화면 가장자리 붉게 세 번) → 가운데 커다란 왕관 뿅 → /base/ (식구는 움직이지 않음 — 주인 결정 2026-11-08)
   - 귀환(/?from=base): 거실이 어둠에서 스르륵 밝아짐
   - 동작 줄이기: 깜박임 없이 왕관만 잠깐 → 넘어감 */
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
    crown();
    setTimeout(leave, CROWN_MS);
    return;
  }
  alarm();
  setTimeout(crown, ALARM_MS - 150);
  setTimeout(leave, ALARM_MS - 150 + CROWN_MS);
}
const ALARM_MS = 1150, CROWN_MS = 650;
// 화면 가장자리 붉게 세 번 (짠짠짠)
function alarm() {
  const a = document.createElement('div');
  Object.assign(a.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '59', boxShadow: 'inset 0 0 110px 36px rgba(230,40,30,.6)', opacity: '0' });
  document.body.append(a);
  a.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: ALARM_MS });
}
// 가운데 커다란 왕관 (기지 왕관과 같은 금빛 — 뾰족 다섯, 끝에 알, 가운데 빨간 보석)
const CROWN = '<svg viewBox="0 0 120 90" width="100%" height="100%" aria-hidden="true"><path d="M10 78 L6 26 L32 50 L44 14 L60 44 L76 14 L88 50 L114 26 L110 78 Z" fill="#f2c230" stroke="#2a1a12" stroke-width="5" stroke-linejoin="round"/><rect x="10" y="66" width="100" height="14" rx="4" fill="#e0a91e" stroke="#2a1a12" stroke-width="5"/><g fill="#fff3b0" stroke="#2a1a12" stroke-width="4"><circle cx="6" cy="24" r="6"/><circle cx="44" cy="12" r="6"/><circle cx="76" cy="12" r="6"/><circle cx="114" cy="24" r="6"/></g><circle cx="60" cy="56" r="8" fill="#c8432b" stroke="#2a1a12" stroke-width="4"/></svg>';
function crown() {
  const c = document.createElement('div');
  Object.assign(c.style, { position: 'fixed', left: '50%', top: '50%', width: 'min(42vw, 260px)', aspectRatio: '4 / 3', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: '61', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.35))' });
  c.innerHTML = CROWN;
  document.body.append(c);
  if (!RM)
    c.animate([{ transform: 'translate(-50%,-50%) scale(.2) rotate(-12deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.12) rotate(4deg)', opacity: 1, offset: 0.55 }, { transform: 'translate(-50%,-50%) scale(1) rotate(0)', opacity: 1 }], { duration: 380, easing: 'ease-out' });
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
