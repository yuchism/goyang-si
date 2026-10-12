/* 책장 메뉴: 책 한 권이 메뉴 하나 (objects.json의 bookshelf.books) */
import { imageReady, img } from './assets.js';
import { tObj, tr } from './i18n.js';
import { rr } from './draw.js';
import { O } from './objects.js';
import { ctx, cv } from './stage.js';
import { noteEl, scrEl, toStage } from './ui.js';
import { HAND, RM, esc } from './util.js';
import { cat, say, world } from './world.js';
/* ───────── 책장 메뉴 ─────────
  objects.json의 bookshelf.books 한 권이 메뉴 하나.
  큰 화면: 책에 올리면 살짝 빠지고 이름표, 누르면 그 책이 펼쳐진 목록.
  폰: 책이 손가락보다 작으니 책장 아무 데나 누르면 큰 책등 목록. 아래 「책장」 버튼은 늘 있다. */
const shelfEl = document.getElementById('shelf');
export const shelfUI = { hover: null, pull: null, open: false, lift: {} };
const BOOKS = () => (O.bookshelf && O.bookshelf.books) || [];
export function bookAt(x, y) {
  for (const b of BOOKS()) {
    const [bx, by, bw, bh] = b.area;
    if (x >= bx - 2 && x <= bx + bw + 2 && y >= by - 6 && y <= by + bh + 2)
      return b;
  }
  return null;
}
export function onShelf(x, y) {
  const a = O.bookshelf && O.bookshelf.area;
  return !!a && x >= a[0] && x <= a[0] + a[2] && y >= a[1] && y <= a[1] + a[3];
}
function drawSpine(x, y, w, h, c) {
  ctx.save();
  ctx.fillStyle = c;
  ctx.strokeStyle = '#2b1d16';
  ctx.lineWidth = 2.5;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}
export function drawBooks(dt) {
  const bg = img('bg'), k = 1561 / 1200, back = (O.bookshelf && O.bookshelf.back) || '#936441';
  for (const b of BOOKS()) {
    const tgt = shelfUI.pull === b.id ? 14 : shelfUI.hover === b.id ? 6 : 0, cur = shelfUI.lift[b.id] || 0;
    const v = RM ? tgt : cur + (tgt - cur) * Math.min(1, (dt || 0.016) * 14);
    shelfUI.lift[b.id] = v;
    const [x, y, w, h] = b.area;
    if (b.drawn) {
      drawSpine(x, y - v, w, h, b.color || '#a0785a');
      continue;
    }
    if (v < 0.3 || !imageReady(bg))
      continue;
    ctx.fillStyle = back;
    ctx.fillRect(x + 2, y, w - 4, h); // 빠진 자리
    ctx.drawImage(bg, x * k, y * k, w * k, h * k, x, y - v, w, h); // 배경 그림의 그 책을 위로 들어 올림
  }
}
export function drawBookTag() {
  const b = BOOKS().find(b => b.id === shelfUI.hover);
  if (!b || shelfUI.open)
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
    '<div class="spines">' + bs.map(b => `<button class="spine" type="button" data-id="${esc(b.id)}" aria-pressed="${b.id === sel}" style="--c:${esc(b.color || '#a0785a')};--h:${Math.round(96 + b.area[3] * 0.3)}px">${esc(tObj(b, 'title'))}</button>`).join('') + '</div>' +
    '<div class="bookd" aria-live="polite">' + (cur ? `<h2>${esc(tObj(cur, 'title'))}</h2><p>${esc(tObj(cur, 'desc') || '')}</p>` +
    (cur.href ? `<a class="open" href="${esc(cur.href)}"${ext(cur.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(tr('shelfOpen'))}</a>` : `<span class="empty">${esc(tr('shelfEmpty'))}</span>`)
    : `<p>${esc(tr('shelfPick'))}</p>`) + '</div>';
}
export function openShelf(id) {
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
    const [x, y] = toStage(e), b = bookAt(x, y);
    shelfUI.hover = b ? b.id : null;
    cv.style.cursor = b ? 'pointer' : '';
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
  document.getElementById('bShelf').onclick = () => shelfUI.open ? closeShelf() : openShelf(null);
}
