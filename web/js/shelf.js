/* 책장 메뉴: 책 한 권이 메뉴 하나 (objects.json의 bookshelf.books) */
import { imageReady, img } from './assets.js';
import { tObj, tr } from './i18n.js';
import { rr } from './draw.js';
import { O } from './objects.js';
import { ctx, cv, view } from './stage.js';
import { closeBook, isPageBook, noteEl, openBook, scrEl, toStage } from './ui.js';
import { HAND, RM, esc, onScene } from './util.js';
import { cat, say, world } from './world.js';
import { oddAt, oddVisible, openOdd } from './install.js';
/* ───────── 책장 메뉴 ─────────
  objects.json의 bookshelf.books 한 권이 메뉴 하나.
  큰 화면: 책에 올리면 살짝 빠지고 이름표, 누르면 그 책이 펼쳐진 목록.
  폰: 책이 손가락보다 작으니 책장 아무 데나 누르면 큰 책등 목록. 위쪽 줄의 📖 버튼은 늘 있다(책장이 화면 밖이어도).
  설명책(about)·고양이책(cat)·설정책(settings)은 목록 아래가 아니라 오래된 책 페이지 창으로 열린다 (ui.js openBook, BOOKSHELF_PLAN.md 3장) */
const shelfEl = document.getElementById('shelf');
export const shelfUI = { hover: null, pull: null, open: false, lift: {}, oddOpen: false, book: null };
const BOOKS = () => (O.bookshelf && O.bookshelf.books) || [];
const FR = () => O.bookshelf.frame;
const baseY = b => FR().rows[b.shelf || 0][1]; // 책이 서는 선반 윗면
const RAD = Math.PI / 180;
// 책 영역(기울어진 책은 네 모서리를 감싸는 상자). 이름표 자리·📖 목록 책등 키가 쓴다
function bbox(b) {
  const r = (b.rot || 0) * RAD, c = Math.cos(r), sn = Math.sin(r), by = baseY(b);
  const pts = [[0, 0], [b.w, 0], [0, -b.h], [b.w, -b.h]].map(([u, v]) => [b.x + u * c - v * sn, by + u * sn + v * c]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
}
onScene(() => {
  for (const b of BOOKS())
    b.area = bbox(b);
  cache = null;
});
export function bookAt(x, y) {
  for (const b of BOOKS().slice().reverse()) { // 나중에 그린(위에 보이는) 책부터
    // 책 기준 좌표로 돌려서 판정 (기댄 책도 기울기대로)
    const r = -(b.rot || 0) * RAD, dx = x - b.x, dy = y - baseY(b);
    const u = dx * Math.cos(r) - dy * Math.sin(r), v = dx * Math.sin(r) + dy * Math.cos(r);
    if (u >= -2 && u <= b.w + 2 && v >= -b.h - 6 && v <= 2)
      return b;
  }
  return null;
}
export function onShelf(x, y) {
  const a = O.bookshelf && O.bookshelf.area;
  return !!a && x >= a[0] && x <= a[0] + a[2] && y >= a[1] && y <= a[1] + a[3];
}

/* ───────── 책장 그리기 (BOOKSHELF_PLAN.md 10장) ─────────
  배경(bg)의 책장 위에 코드로 덮어 그린다: 뒤판·선반 판·수납장 한 장 + 책마다 한 장.
  처음 한 번 따로 그려 두고(캐시) 매 프레임 붙이기만 한다. 화면 배율이 바뀌면 다시 그린다 */
const INKC = '#2a1a12';
let cache = null;
function seeded(seed) {
  let s = Math.max(1, Math.floor(seed) % 2147483647);
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function grad(c, x0, y0, x1, y1, a) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, `rgba(35,15,5,${a})`);
  g.addColorStop(1, 'rgba(35,15,5,0)');
  return g;
}
// 뒤판·선반 판·수납장
function paintShelf(c) {
  const f = FR(), { x0, x1 } = f, bw = f.board || 10;
  for (const [t, b] of f.rows) {
    c.fillStyle = '#8d5c3a';
    c.fillRect(x0, t, x1 - x0, b - t);
    c.strokeStyle = 'rgba(50,25,10,.22)'; // 뒤판 널 이음새
    c.lineWidth = 1.2;
    for (const k of [0.255, 0.585]) {
      const sx = x0 + (x1 - x0) * k;
      c.beginPath();
      c.moveTo(sx, t);
      c.lineTo(sx, b);
      c.stroke();
    }
    const R = seeded(t * 7 + 3); // 결
    c.strokeStyle = 'rgba(60,30,12,.10)';
    c.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = x0 + R() * (x1 - x0), y = t + R() * (b - t);
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 2, y + 10, x, y + 22 + R() * 20);
      c.stroke();
    }
    c.fillStyle = grad(c, 0, t, 0, t + 26, 0.42); // 천장 그림자
    c.fillRect(x0, t, x1 - x0, 26);
    c.fillStyle = grad(c, x0, 0, x0 + 12, 0, 0.30); // 옆 그림자
    c.fillRect(x0, t, 12, b - t);
    c.fillStyle = grad(c, x1, 0, x1 - 8, 0, 0.22);
    c.fillRect(x1 - 8, t, 8, b - t);
  }
  for (const [, y] of f.rows) { // 선반 판: 두께 있는 앞면
    c.fillStyle = '#a9714a';
    c.fillRect(x0 - 3, y, x1 - x0 + 6, bw);
    c.fillStyle = 'rgba(255,225,180,.28)';
    c.fillRect(x0 - 3, y + 1.5, x1 - x0 + 6, 2);
    c.strokeStyle = INKC;
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(x0 - 3, y);
    c.lineTo(x1 + 3, y);
    c.moveTo(x0 - 3, y + bw);
    c.lineTo(x1 + 3, y + bw);
    c.stroke();
  }
  if (f.cabinet)
    paintCabinet(c, ...f.cabinet);
}
// 수납장: 문 두 짝(나뭇결·도드라진 판·놋쇠 손잡이), 받침대. 겉모습만 (CABINET_PLAN.md)
function paintCabinet(c, L, R, T, B) {
  const M = (L + R) / 2;
  c.fillStyle = '#8f5d3b';
  c.fillRect(L - 2, T, R - L + 4, B - T + 6);
  c.fillStyle = '#6e4329';
  c.fillRect(L - 4, B - 4, R - L + 8, 10);
  c.strokeStyle = INKC;
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(L - 4, B - 4);
  c.lineTo(R + 4, B - 4);
  c.stroke();
  for (const [dx0, dx1, kx] of [[L + 3, M - 1, M - 13], [M + 1, R - 3, M + 13]]) {
    const y0 = T + 4, y1 = B - 8;
    c.fillStyle = '#a56d45';
    c.fillRect(dx0, y0, dx1 - dx0, y1 - y0);
    const Rn = seeded(dx0 * 3);
    c.strokeStyle = 'rgba(70,35,15,.16)';
    c.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const x = dx0 + 6 + Rn() * (dx1 - dx0 - 12);
      c.beginPath();
      c.moveTo(x, y0 + 4);
      c.bezierCurveTo(x + 3, y0 + 40, x - 3, y0 + 90, x + 1, y1 - 4);
      c.stroke();
    }
    const ix = dx0 + 9, iy = y0 + 11, iw = dx1 - dx0 - 18, ih = y1 - y0 - 22;
    c.fillStyle = 'rgba(255,225,185,.16)';
    c.fillRect(ix, iy, iw, ih);
    c.lineWidth = 1.6;
    c.strokeStyle = 'rgba(255,230,195,.45)';
    c.beginPath();
    c.moveTo(ix, iy + ih);
    c.lineTo(ix, iy);
    c.lineTo(ix + iw, iy);
    c.stroke();
    c.strokeStyle = 'rgba(40,18,6,.45)';
    c.beginPath();
    c.moveTo(ix + iw, iy);
    c.lineTo(ix + iw, iy + ih);
    c.lineTo(ix, iy + ih);
    c.stroke();
    c.strokeStyle = INKC;
    c.lineWidth = 1.4;
    c.strokeRect(ix - 1.5, iy - 1.5, iw + 3, ih + 3);
    c.lineWidth = 2.5;
    c.strokeRect(dx0, y0, dx1 - dx0, y1 - y0);
    const ky = (y0 + y1) / 2 - 6; // 손잡이
    c.fillStyle = 'rgba(30,12,4,.25)';
    c.beginPath();
    c.ellipse(kx + 1, ky + 2.5, 4.6, 3, 0, 0, 7);
    c.fill();
    c.beginPath();
    c.arc(kx, ky, 4.4, 0, 7);
    c.fillStyle = '#d8a94c';
    c.fill();
    c.strokeStyle = INKC;
    c.lineWidth = 1.8;
    c.stroke();
    c.fillStyle = 'rgba(255,248,215,.85)';
    c.beginPath();
    c.arc(kx - 1.4, ky - 1.4, 1.3, 0, 7);
    c.fill();
  }
}
// 책등 꾸밈
function band(c, w, y, k) {
  if (k === 'gold2') {
    band(c, w, y, 'gold');
    band(c, w, y + 5.5, 'gold');
  }
  else if (k === 'gold') {
    c.fillStyle = '#ddb259';
    c.fillRect(0, y, w, 3.4);
    c.strokeStyle = 'rgba(42,26,18,.7)';
    c.lineWidth = 0.9;
    c.strokeRect(-1, y, w + 2, 3.4);
  }
  else if (k === 'dark') {
    c.fillStyle = 'rgba(35,15,5,.35)';
    c.fillRect(0, y, w, 5);
  }
  else if (k === 'line') {
    c.strokeStyle = 'rgba(42,26,18,.75)';
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(w, y);
    c.stroke();
  }
}
function paw(c, x, y, s, a) { // 흐린 발자국 (catbook.js 발바닥과 같은 모양)
  c.save();
  c.translate(x, y);
  c.rotate(a * RAD);
  c.scale(s / 40, s / 40);
  c.translate(-20, -20);
  c.fillStyle = INKC;
  c.globalAlpha = 0.38;
  for (const [ex, ey, rx, ry, r] of [[20, 27, 9.5, 8, 0], [9, 15.5, 3.6, 4.6, -22], [16, 9.5, 3.8, 4.9, -7], [24, 9.5, 3.8, 4.9, 7], [31, 15.5, 3.6, 4.6, 22]]) {
    c.beginPath();
    c.ellipse(ex, ey, rx, ry, r * RAD, 0, 7);
    c.fill();
  }
  c.restore();
}
function catFace(c, x, y, s) { // 강고양이 씨 얼굴: 흰 바탕에 오른쪽 갈색 얼룩
  c.save();
  c.translate(x, y);
  c.scale(s / 20, s / 20);
  c.lineWidth = 1.5;
  c.strokeStyle = INKC;
  c.lineJoin = 'round';
  c.fillStyle = '#fbf3e6';
  c.beginPath();
  c.moveTo(-8, -3);
  c.lineTo(-7, -11);
  c.lineTo(-2, -6.5);
  c.moveTo(8, -3);
  c.lineTo(7, -11);
  c.lineTo(2, -6.5);
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(0, 0, 9.5, 7.5, 0, 0, 7);
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = '#9a6a45';
  c.beginPath();
  c.ellipse(5.5, -1.5, 5, 4.5, -0.3, 0, 7);
  c.fill();
  c.restore();
  c.beginPath();
  c.ellipse(0, 0, 9.5, 7.5, 0, 0, 7);
  c.stroke();
  c.fillStyle = INKC;
  c.fillRect(-5.2, -1, 2.6, 1.3);
  c.fillRect(2.6, -1, 2.6, 1.3);
  c.fillStyle = '#e88a9a';
  c.beginPath();
  c.arc(0, 2, 1, 0, 7);
  c.fill();
  c.restore();
}
function yarn(c, x, y, r) { // 빨간 실뭉치
  c.save();
  c.lineWidth = 1.3;
  c.strokeStyle = INKC;
  c.beginPath();
  c.moveTo(x + r * 0.6, y + r * 0.8);
  c.quadraticCurveTo(x + r * 1.6, y + r * 2, x + r * 0.4, y + r * 2.6);
  c.stroke();
  c.beginPath();
  c.arc(x, y, r, 0, 7);
  c.fillStyle = '#d0503f';
  c.fill();
  c.stroke();
  c.clip();
  c.strokeStyle = 'rgba(42,26,18,.7)';
  c.lineWidth = 1;
  for (const k of [-0.5, 0, 0.5]) {
    c.beginPath();
    c.ellipse(x + k * r, y, r * 0.35, r * 1.2, 0.5, 0, 7);
    c.stroke();
  }
  c.restore();
}
// 책 한 권: 바닥 왼쪽 모서리가 원점, 위가 -y
function paintBook(c, b) {
  const { w, h, color } = b, d = b.deco || {};
  rrect(c, 0, -h, w, h, 3.2);
  c.fillStyle = color || '#a0785a';
  c.fill();
  c.save();
  rrect(c, 0, -h, w, h, 3.2);
  c.clip();
  c.fillStyle = 'rgba(255,240,215,.20)'; // 둥근 책등: 왼쪽 밝게, 오른쪽 어둡게
  c.fillRect(1.5, -h, Math.max(3, w * 0.2), h);
  c.fillStyle = 'rgba(40,18,8,.20)';
  c.fillRect(w * 0.74, -h, w * 0.26, h);
  const R = seeded(w * 131 + h * 17); // 얼룩 질감
  for (let i = 0; i < h * w / 90; i++) {
    c.fillStyle = R() < 0.6 ? 'rgba(30,12,4,.10)' : 'rgba(255,235,200,.12)';
    c.beginPath();
    c.arc(R() * w, -R() * h, 0.5 + R() * 0.9, 0, 7);
    c.fill();
  }
  c.fillStyle = 'rgba(255,228,190,.30)'; // 닳은 모서리
  for (const [x, y] of [[0, -h], [w, -h], [0, 0], [w, 0]]) {
    c.beginPath();
    c.arc(x, y, 3.2, 0, 7);
    c.fill();
  }
  for (const [y, k] of d.bands || [])
    band(c, w, -h + y * h, k);
  c.restore();
  if (d.label) {
    const [ly, lh] = d.label;
    rrect(c, w * 0.16, -h + ly * h, w * 0.68, lh, 2);
    c.fillStyle = '#efe1c2';
    c.fill();
    c.strokeStyle = INKC;
    c.lineWidth = 1.3;
    c.stroke();
  }
  if (d.mark === 'face')
    catFace(c, w / 2, -h + (d.label ? d.label[0] * h + d.label[1] / 2 + 1 : h * 0.35), Math.min(18, w * 0.62));
  else if (d.mark === 'yarn')
    yarn(c, w / 2, -h * 0.55, Math.min(6.5, w * 0.24));
  else if (d.mark === 'paw') {
    const [px, py, pa] = d.paw || [0.5, 0.5, 0];
    paw(c, w * px, -h + h * py, Math.min(w * 0.62, 16), pa);
  }
  rrect(c, 0, -h, w, h, 3.2);
  c.strokeStyle = INKC;
  c.lineWidth = 2.5;
  c.lineJoin = 'round';
  c.stroke();
}
const PAD = 4; // 책 그림 둘레 여백 (테두리 선이 잘리지 않게)
function sheet(w, h, k, paint) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * k));
  c.height = Math.max(1, Math.ceil(h * k));
  const g = c.getContext('2d');
  g.scale(k, k);
  paint(g);
  return c;
}
function buildCache() {
  const k = Math.round(view.s * view.dpr * 100) / 100 || 1, src = O.bookshelf;
  if (cache && cache.k === k && cache.src === src)
    return cache;
  const a = src.area, f = src.frame, y1 = f.cabinet ? f.cabinet[3] + 8 : a[1] + a[3];
  const box = [a[0], a[1], a[2], y1 - a[1]];
  const shelf = sheet(box[2], box[3], k, g => {
    g.translate(-box[0], -box[1]);
    paintShelf(g);
  });
  const books = {};
  for (const b of BOOKS())
    books[b.id] = sheet(b.w + PAD * 2, b.h + PAD * 2, k, g => {
      g.translate(PAD, b.h + PAD);
      paintBook(g, b);
    });
  return cache = { k, src, box, shelf, books };
}
export function drawBooks(dt) {
  if (!O.bookshelf || !O.bookshelf.frame)
    return;
  const C = buildCache();
  ctx.drawImage(C.shelf, C.box[0], C.box[1], C.box[2], C.box[3]);
  for (const b of BOOKS()) {
    const tgt = shelfUI.pull === b.id ? 14 : shelfUI.hover === b.id ? 6 : 0, cur = shelfUI.lift[b.id] || 0;
    const v = RM ? tgt : cur + (tgt - cur) * Math.min(1, (dt || 0.016) * 14);
    shelfUI.lift[b.id] = v;
    ctx.save();
    ctx.translate(b.x, baseY(b));
    if (b.rot)
      ctx.rotate(b.rot * RAD);
    ctx.translate(0, -v); // 책 방향(기울기)대로 들어 올림
    const im = b.look && img(b.look);
    if (im && imageReady(im))
      ctx.drawImage(im, 0, -b.h, b.w, b.h); // 손그림으로 바꿔 끼운 책
    else
      ctx.drawImage(C.books[b.id], -PAD, -b.h - PAD, b.w + PAD * 2, b.h + PAD * 2);
    ctx.restore();
  }
}
export function drawBookTag() {
  const odd = shelfUI.hover === '__odd';
  const b = odd ? { title: tr('oddTag'), area: O.bookshelf.oddBook.tag } : BOOKS().find(b => b.id === shelfUI.hover);
  if (!b || shelfUI.open || shelfUI.oddOpen || shelfUI.book)
    return;
  const a = O.bookshelf.area, tx = a[0] + a[2] + 8, ty = b.area[1] + b.area[3] / 2;
  ctx.save();
  ctx.font = '700 24px ' + HAND;
  const tw = ctx.measureText(tObj(b, 'title')).width + 24;
  ctx.fillStyle = 'rgba(247,236,214,.96)';
  ctx.strokeStyle = '#2b1d16';
  ctx.lineWidth = 2.5;
  rr(tx, ty - 18, tw, 36, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2b1d16';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tObj(b, 'title'), tx + 12, ty + 1);
  ctx.restore();
}
function renderShelf(sel) {
  const bs = BOOKS(), cur = bs.find(b => b.id === sel);
  const ext = h => /^https?:/i.test(h) && !/^https?:\/\/(www\.)?goyang\.si(\/|$)/i.test(h);
  shelfEl.innerHTML = `<button class="x" type="button" aria-label="${esc(tr('shelfClose'))}">×</button><p class="lbl">${esc(tr('shelfDlg'))}</p>` +
    '<div class="spines">' + bs.map(b => `<button class="spine" type="button" data-id="${esc(b.id)}" aria-pressed="${b.id === sel}" style="--c:${esc(b.color || '#a0785a')};--h:${Math.round(96 + b.area[3] * 0.3)}px"${b.spine ? ` aria-label="${esc(tObj(b, 'title'))}"` : ''}>${esc(tObj(b, 'spine') || tObj(b, 'title'))}</button>`).join('') +
    (oddVisible() ? `<button class="spine odd" type="button" data-id="__odd" aria-label="${esc(tr('oddTag'))}"><span aria-hidden="true">🐾</span></button>` : '') + '</div>' +
    '<div class="bookd" aria-live="polite">' + (cur ? `<h2>${esc(tObj(cur, 'title'))}</h2><p>${esc(tObj(cur, 'desc') || '')}</p>` +
    (cur.href ? `<a class="open" href="${esc(cur.href)}"${ext(cur.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(tr('shelfOpen'))}</a>` : `<span class="empty">${esc(tr('shelfEmpty'))}</span>`)
    : `<p>${esc(tr('shelfPick'))}</p>`) + '</div>';
}
export function openShelf(id) {
  const b = id && BOOKS().find(b => b.id === id);
  if (isPageBook(b)) { // 설명책·고양이책·설정책은 책 창으로
    closeShelf();
    openBook(b.id);
    return;
  }
  closeBook();
  shelfUI.open = true;
  shelfUI.pull = id || null;
  noteEl.hidden = true;
  scrEl.hidden = true;
  renderShelf(shelfUI.pull);
  shelfEl.hidden = false;
  const f = shelfEl.querySelector(shelfUI.pull ? '.spine[aria-pressed="true"]' : '.spine');
  (f || shelfEl).focus({ preventScroll: true });
  if (id && !cat.closed && !world.manduk && Math.random() < 0.5)
    say(cat, '👀', 1.6);
}
export function closeShelf() {
  if (!shelfUI.open)
    return;
  shelfUI.open = false;
  shelfUI.pull = null;
  shelfEl.hidden = true;
}
// 책장 메뉴 연결
export function initShelf() {
  shelfEl.addEventListener('click', e => {
    if (e.target.closest('.x')) {
      closeShelf();
      return;
    }
    const sp = e.target.closest('.spine');
    if (sp && sp.dataset.id === '__odd') {
      openOdd(); // 이상한 책은 책장 목록이 아니라 제 페이지로
      return;
    }
    if (sp && isPageBook(BOOKS().find(b => b.id === sp.dataset.id))) {
      openShelf(sp.dataset.id);
      return;
    }
    if (sp) {
      shelfUI.pull = sp.dataset.id;
      renderShelf(shelfUI.pull);
      const f = shelfEl.querySelector(`.spine[data-id="${CSS.escape(sp.dataset.id)}"]`);
      f && f.focus({ preventScroll: true });
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && shelfUI.open)
      closeShelf();
  });
  cv.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch')
      return;
    const [x, y] = toStage(e), odd = oddAt(x, y), b = !odd && bookAt(x, y);
    shelfUI.hover = odd ? '__odd' : b ? b.id : null;
    cv.style.cursor = odd || b ? 'pointer' : '';
  });
  cv.addEventListener('pointerleave', () => {
    shelfUI.hover = null;
    cv.style.cursor = '';
  });
  window.addEventListener('langchange', () => {
    if (shelfUI.open)
      renderShelf(shelfUI.pull);
  });
  document.getElementById('aShelf').onclick = () => openShelf(null);
  document.getElementById('bShelf').onclick = () => shelfUI.open ? closeShelf() : openShelf(null); // 책 창이 펼쳐져 있어도 책장 목록으로
}
