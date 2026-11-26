/* 병 속 쪽지 (BEACH_PLAN.md 5장, tasks/beach-3-bottle.md)
   - 병을 누르면 말린 낡은 종이가 펼쳐지며 글귀 하나 (notes.js 150개). 언어 설정에 따라 한국어/English
   - 사람마다 무작위, 다 볼 때까지 겹치지 않음 — 본 번호는 방문자 브라우저에만(store beachNote.seen)
   - 글꼴: 갈무리11(캠핑장과 같은 파일, beach.css @font-face). 24px = 12px 격자 2배
   - 닫기: 버튼·바깥 누르기·Esc. 열리면 닫기 버튼에 포커스, 닫으면 원래 자리로 */
import { NOTES } from './notes.js';
import { el } from '../js/page-kit.js';

const KEY = 'beachNote';
const STR = {
  close: { ko: '닫기', en: 'Close' },
  label: { ko: '병 속 쪽지', en: 'The note in the bottle' },
};

// 아직 안 본 것 중 하나. 다 봤으면 처음부터(방금 본 것만 빼고)
export function pickNote(store) {
  const s = store.get(KEY, null) || {}, seen = new Set(s.seen || []);
  let pool = NOTES.map((n, i) => n && !seen.has(i) ? i : -1).filter(i => i >= 0);
  if (!pool.length) {
    pool = NOTES.map((n, i) => n && i !== s.last ? i : -1).filter(i => i >= 0);
    seen.clear();
  }
  const i = pool[Math.floor(Math.random() * pool.length)];
  seen.add(i);
  store.set(KEY, { ...s, seen: [...seen], last: i });
  return i;
}

export function makeNote({ lang, onClose, onOpen }) {
  let box = null, back = null;
  const close = () => {
    if (!box) return;
    const b = box;
    box = null;
    b.classList.add('rolling');
    setTimeout(() => b.remove(), 420);
    document.removeEventListener('keydown', key);
    back?.focus?.({ preventScroll: true });
    onClose?.();
  };
  const key = e => { if (e.key === 'Escape') close(); };
  return {
    get open() { return !!box; },
    show(i) {
      if (box) return;
      back = document.activeElement;
      const [ko, en] = NOTES[i];
      box = el('div', 'note');
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', STR.label[lang]);
      const paper = el('div', 'paper'), text = el('p', 'words', lang === 'ko' ? ko : en), no = el('span', 'no', '#' + (i + 1));
      const btn = el('button', 'shut', STR.close[lang]);
      btn.type = 'button';
      paper.append(text, no);
      box.append(paper, btn);
      box.addEventListener('click', e => { if (e.target === box || e.target === btn) close(); });
      document.body.append(box);
      document.addEventListener('keydown', key);
      setTimeout(() => btn.focus({ preventScroll: true }), 50);
      onOpen?.();
    },
    close,
  };
}
