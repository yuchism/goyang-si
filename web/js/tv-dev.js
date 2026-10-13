/* 미리보기 도구(?dev=1)의 TV 칸: 프로그램 틀어 보기, 사건 고르기, 7일 편성표, 특집 날짜로 가기, 문제 있는 프로그램 표시.
   틀어 보기·사건은 그 기기에서만 (편성은 그대로, 다른 방문자와 상관없음). TV_STABILITY_PLAN.md 7장 */
import { tr } from './i18n.js';
import { now } from './time.js';
import { TVP, fmtH, tvDay, tvForce, tvPreview, tvProblems } from './tv.js';
import { $, esc, pick } from './util.js';
import { caption, world } from './world.js';

const GO = [ // [번역 키, 월(1~12, 0이면 오늘), 일, 시, 분]
  ['devTvGoOn', 0, 0, 4, 59], ['devTvGoNap', 0, 0, 13, 54], ['devTvGoShop', 0, 0, 14, 29], ['devTvGoNapEnd', 0, 0, 15, 54], ['devTvGoPrime', 0, 0, 21, 0], ['devTvGoOff', 0, 0, 24, 54],
  ['devTvGoHw', 10, 31, 22, 0], ['devTvGoXmas', 12, 24, 21, 0], ['devTvGoNy', 1, 1, 7, 0]];
// 다음에 오는 그 날짜·시각 (오늘 것이면 오늘)
function goTarget([, m, d, h, mi]) {
  const n = now(), t = new Date(n);
  if (m) {
    t.setMonth(m - 1, d);
    t.setHours(h, mi, 0, 0);
    if (t < n - 60000)
      t.setFullYear(t.getFullYear() + 1);
  }
  else
    t.setHours(h, mi, 0, 0);
  return t.getTime();
}
function fillProgs() {
  const sel = $('dTvProg'), cur = sel.value;
  sel.innerHTML = Object.values(TVP).map(P => `<option value="${esc(P.id)}">${esc(P.name)}</option>`).join('');
  if (TVP[cur])
    sel.value = cur;
}
function fillEvents() {
  const sel = $('dTvEv'), st = world.tv.st, P = st && st.mode === 'prog' && TVP[st.p];
  const evs = P ? [...P.ev, ...(P.end ? [P.end] : [])] : [];
  sel.innerHTML = `<option value="">${esc(tr('devTvEvRandom'))}</option>` +
    evs.map(e => `<option value="${esc(e.id)}">${esc((P.end === e ? tr('devTvEnd') + ': ' : '') + (e.cap || e.id))} · ${e.size}</option>`).join('');
}
function fillGo() {
  $('dTvGo').innerHTML = `<option value="">${esc(tr('devTvGoPick'))}</option>` + GO.map((g, i) => `<option value="${i}">${esc(tr(g[0]))}</option>`).join('');
}
function showProblems() {
  const { problems, warnings } = tvProblems(), el = $('dTvWarn');
  const parts = [];
  if (problems.length)
    parts.push(tr('devTvProblems', { n: problems.length }));
  if (warnings.length)
    parts.push(tr('devTvWarnings', { n: warnings.length }));
  el.hidden = !parts.length;
  el.textContent = parts.join(' · ');
  el.title = [...problems.flatMap(p => p.errors), ...warnings].join('\n');
}
function renderWeek() {
  const box = $('tvWeek'), d0 = now(), out = [];
  for (let i = 0; i < 7; i++) {
    const bd = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i, 12);
    const head = bd.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', weekday: 'short' });
    const day = tvDay(bd), list = [...day.segs.map(s => [s.s, s.title, !s.p]), ...day.naps.map(n => [n.a / 60, tr('tvgNap'), false])].sort((a, b) => a[0] - b[0]);
    const rows = list.map(([s, t, bad]) => `<li${bad ? ' class="bad"' : ''}><time>${fmtH(s)}</time>${esc(t)}</li>`).join('');
    out.push(`<section><h3>${esc(head)}</h3><ol>${rows}</ol></section>`);
  }
  box.innerHTML = out.join('');
}
export function initTvDev(jumpTo) {
  fillProgs();
  fillEvents();
  fillGo();
  window.addEventListener('tvprograms', () => {
    fillProgs();
    showProblems();
  });
  window.addEventListener('langchange', () => {
    fillProgs();
    fillEvents();
    fillGo();
    showProblems();
    if (!$('tvWeek').hidden)
      renderWeek();
  });
  $('dTvEv').addEventListener('focus', fillEvents);
  $('dTvEv').addEventListener('pointerdown', fillEvents);
  $('dTvPlay').onclick = () => {
    const id = $('dTvProg').value;
    if (tvPreview(id, now()))
      caption(tr('devTvPlaying', { name: TVP[id].name }), 3);
  };
  // 사건 일으키기 (예전 "TV 사건" 버튼과 같은 방식: 고르지 않으면 큰 사건 아무거나)
  const fire = id => {
    if (!tvForce(id, pick))
      caption(tr('devNoProg'), 3);
  };
  $('dTvFire').onclick = () => fire($('dTvEv').value);
  $('dTv').onclick = () => fire('');
  $('dTvGo').onchange = e => {
    const g = GO[+e.target.value];
    e.target.value = '';
    if (g)
      jumpTo(goTarget(g), true);
  };
  $('dTvWeek').onclick = () => {
    const box = $('tvWeek'), open = box.hidden;
    box.hidden = !open;
    $('dTvWeek').setAttribute('aria-expanded', open);
    if (open)
      renderWeek();
  };
}
