/* 강고양이 씨 TV · 편성표 창: TV를 누르면 지금 화면을 크게 + 오늘 편성표, 그리고 축하 방송 신청(생일 링크 만들기).
   tv-cat.js에서 나눴다 (TV_STABILITY_PLAN.md 3장). 동작은 그대로 */
import { LANG, tr } from './i18n.js';
import { closeShelf } from './shelf.js';
import { now } from './time.js';
import { fmtH, tvBday, tvH, tvNaps, tvNeed, tvSegs, tvState } from './tv.js';
import { noteEl, scrEl } from './ui.js';
import { cutChars, esc, gcEvent } from './util.js';
import { cat, say, world } from './world.js';
/* TV를 누르면: 지금 화면을 크게 + 오늘 편성표 */
const tvgEl = document.getElementById('tvg');
export let tvBig = null;
function tvNowText(st) {
  if (!st)
    return '';
  if (st.mode === 'prog')
    return tr('tvgNow', { title: esc(st.sg.title), s: fmtH(st.sg.s), e: fmtH(st.sg.e) });
  if (st.nap && st.mode !== 'signoff')
    return st.mode === 'off' ? tr('tvgNapOff', { t: fmtH(st.napTo / 60) }) : tr('tvgTestcard');
  return { off: tr('tvgOff'), testcard: tr('tvgTestcard'), opening: tr('tvgOpening'), signoff: tr('tvgSignoff'), adjust: tr('tvgAdjusting') }[st.mode] || '';
}
// 편성표 창은 두 화면: 'guide'(편성표) · 'req'(축하 방송 신청, BIRTHDAY_LINK_PLAN.md 4장)
let tvgView = 'guide', reqName = '', reqLink = '', reqMsg = '';
const REQ_MAX = 24;
export function openTvGuide(quiet) {
  if (!quiet)
    tvgView = 'guide';
  if (tvgView === 'req') {
    renderReq();
    return;
  }
  const d = now(), st = world.tv.st || tvState(d), bd = tvBday(d), H = tvH(d), segs = tvSegs(bd), naps = tvNaps(bd);
  if (st.p)
    tvNeed(st.p); // 창에 크게 보이는 지금 화면 그림
  const rows = [[5, tr('tvgSignOn')], ...segs.map(s => [s.s, s.title]), ...naps.map(n => [n.a / 60, tr('tvgNap')]), [24 + 55 / 60, tr('tvgSignOff')]].sort((a, b) => a[0] - b[0]);
  let cur = -1;
  if (st.mode !== 'off' || st.nap)
    rows.forEach((r, i) => {
      if (H >= r[0])
        cur = i;
    });
  noteEl.hidden = true;
  scrEl.hidden = true;
  closeShelf();
  tvgEl.innerHTML = `<button class="x" type="button" aria-label="${esc(tr('tvgClose'))}">×</button><h2>${esc(tr('tvChannel'))}</h2><canvas width="320" height="240" aria-label="${esc(tr('tvgScreen'))}"></canvas>` +
    `<p class="now">${tvNowText(st)}</p><ol aria-label="${esc(tr('tvgList'))}">` + rows.map((r, i) => `<li${i === cur ? ' class="cur" aria-current="true"' : ''}><time>${fmtH(r[0])}</time><span>${esc(r[1])}</span></li>`).join('') +
    `</ol><p class="foot">${esc(tr('tvgFoot'))}</p><p class="reqline"><button class="reqopen" type="button">${esc(tr('tvgReq'))}</button></p>`;
  tvBig = tvgEl.querySelector('canvas').getContext('2d');
  tvgEl.hidden = false;
  tvgEl.focus({ preventScroll: true });
  if (!quiet && !cat.closed && !world.manduk && Math.random() < 0.4)
    say(cat, '👀', 1.6);
}
export function closeTvGuide() {
  if (tvgEl.hidden)
    return;
  tvgEl.hidden = true;
  tvBig = null;
  tvgView = 'guide';
  reqMsg = '';
  reqLink = '';
  placeKb();
}
/* ───────── 축하 방송 신청: 생일 링크 만들기 ───────── */
const canShare = () => typeof navigator.share === 'function';
const reqClean = v => cutChars(String(v || '').replace(/\s+/g, ' ').trim(), REQ_MAX);
// 보내는 링크: 지금 보고 있는 언어의 생일 페이지 (카톡 미리보기 카드 언어가 달라진다)
const reqUrl = name => location.origin + '/birthday/' + (LANG === 'en' ? 'en/' : '') + '?n=' + encodeURIComponent(name);
function renderReq() {
  noteEl.hidden = true;
  scrEl.hidden = true;
  closeShelf();
  tvBig = null;
  const n = Array.from(reqName.trim()).length;
  tvgEl.innerHTML = `<button class="x" type="button" aria-label="${esc(tr('tvgClose'))}">×</button>` +
    `<button class="back" type="button">‹ ${esc(tr('reqBack'))}</button>` +
    `<div class="req"><h2>${esc(tr('reqTitle'))}</h2><p class="lead">${esc(tr('reqLead'))}</p>` +
    `<label for="reqName">${esc(tr('reqLabel'))}</label>` +
    `<div class="field"><input id="reqName" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" placeholder="${esc(tr('reqPh'))}" value="${esc(reqName)}"><span class="count" aria-hidden="true">${n}/${REQ_MAX}</span></div>` +
    `<div class="acts"><button class="send" type="button"${n ? '' : ' disabled'}>${esc(tr(canShare() ? 'reqSend' : 'reqCopy'))}</button>` +
    `<button class="pv" type="button"${n ? '' : ' disabled'}>${esc(tr('reqPreview'))}</button></div>` +
    `<p class="msg" role="status" aria-live="polite">${esc(reqMsg)}</p>` +
    `<input class="link" type="text" readonly aria-label="${esc(tr('reqLinkLabel'))}" value="${esc(reqLink)}"${reqLink ? '' : ' hidden'}></div>`;
  tvgEl.hidden = false;
  placeKb();
}
/* 폰 키보드가 올라오면: 신청 창을 지금 보이는 화면(visualViewport) 위쪽에 붙인다.
   키보드는 레이아웃을 줄이지 않고 화면 아래를 덮기만 해서, 무대 아래쪽에 붙은 창이 키보드 뒤로 숨는다 */
const VV = window.visualViewport;
let kbWas = false;
function placeKb() {
  const kb = !!VV && document.documentElement.clientHeight - VV.height > 120;
  const on = kb && !tvgEl.hidden && tvgView === 'req';
  tvgEl.classList.toggle('kb', on);
  tvgEl.style.top = on ? Math.round(VV.offsetTop + 8) + 'px' : '';
  tvgEl.style.maxHeight = on ? Math.max(140, Math.round(VV.height - 16)) + 'px' : '';
  // 키보드가 내려가면: 입력창을 보여 주려고 밀려 올라간 페이지를 제자리로
  if (kbWas && !kb && (window.scrollY || document.documentElement.scrollTop))
    window.scrollTo(0, 0);
  kbWas = kb;
}
if (VV) {
  VV.addEventListener('resize', placeKb);
  VV.addEventListener('scroll', placeKb);
}
function openReq() {
  tvgView = 'req';
  reqMsg = '';
  reqLink = '';
  renderReq();
  const inp = tvgEl.querySelector('#reqName');
  inp && inp.focus({ preventScroll: true });
  gcEvent('birthday-request-open', '축하 방송 신청 창 열기');
}
function backToGuide() {
  tvgView = 'guide';
  openTvGuide(true);
  placeKb();
  const b = tvgEl.querySelector('.reqopen');
  b && b.focus({ preventScroll: true });
}
// 입력이 바뀔 때: 글자 수와 버튼만 고친다 (다시 그리면 한글 조합이 끊긴다)
function onReqInput(inp, composing) {
  if (!composing && Array.from(inp.value).length > REQ_MAX)
    inp.value = cutChars(inp.value, REQ_MAX);
  reqName = inp.value;
  const n = Array.from(reqName.trim()).length, ok = !!reqClean(reqName);
  tvgEl.querySelector('.count').textContent = `${Math.min(n, REQ_MAX)}/${REQ_MAX}`;
  tvgEl.querySelector('.send').disabled = !ok;
  tvgEl.querySelector('.pv').disabled = !ok;
  if (reqLink) { // 이름을 고치면 예전 링크는 치운다
    reqLink = '';
    reqMsg = '';
    tvgEl.querySelector('.link').hidden = true;
    tvgEl.querySelector('.msg').textContent = '';
  }
}
function showReqResult(msg, link, select) {
  reqMsg = msg;
  reqLink = link;
  tvgEl.querySelector('.msg').textContent = msg;
  const li = tvgEl.querySelector('.link');
  li.value = link;
  li.hidden = false;
  if (select) {
    li.focus({ preventScroll: true });
    li.select();
  }
}
async function copyText(t, li) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  }
  catch (e) { }
  try { // 오래된 브라우저: 선택해 두고 복사 명령
    li.hidden = false;
    li.value = t;
    li.focus({ preventScroll: true });
    li.select();
    return document.execCommand('copy');
  }
  catch (e) {
    return false;
  }
}
async function sendReq() {
  const name = reqClean(reqName);
  if (!name)
    return;
  const url = reqUrl(name), li = tvgEl.querySelector('.link');
  if (canShare()) {
    try {
      await navigator.share({ title: tr('reqShareTitle'), text: tr('reqShareText', { name }), url });
      showReqResult(tr('reqShared'), url, false);
      gcEvent('birthday-link-shared', '생일 링크 공유');
      return;
    }
    catch (e) {
      if (e && e.name === 'AbortError') { // 공유 창을 닫았을 뿐: 링크만 보여 둔다
        showReqResult('', url, false);
        return;
      }
      // 공유가 막힌 경우(권한 등): 복사로 넘어간다
    }
  }
  if (await copyText(url, li)) {
    showReqResult(tr('reqCopied'), url, false);
    gcEvent('birthday-link-copied', '생일 링크 복사');
  }
  else
    showReqResult(tr('reqManual'), url, true);
}
function previewReq() {
  const name = reqClean(reqName);
  if (name)
    window.open('/?birthday=' + encodeURIComponent(name), '_blank', 'noopener');
}
tvgEl.addEventListener('input', e => {
  if (e.target.id === 'reqName')
    onReqInput(e.target, e.isComposing);
});
tvgEl.addEventListener('compositionend', e => {
  if (e.target.id === 'reqName')
    onReqInput(e.target, false);
});
tvgEl.addEventListener('keydown', e => {
  if (e.target.id === 'reqName' && e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    sendReq();
  }
});
tvgEl.addEventListener('click', e => {
  if (e.target.closest('.x'))
    closeTvGuide();
  else if (e.target.closest('.reqopen'))
    openReq();
  else if (e.target.closest('.back'))
    backToGuide();
  else if (e.target.closest('.send'))
    sendReq();
  else if (e.target.closest('.pv'))
    previewReq();
  else if (e.target.closest('.link'))
    e.target.select();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    closeTvGuide();
});
