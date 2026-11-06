/* 현관문 (tasks/manhwa-2-gate.md): 문을 누르면 문이 살짝 열리고 문틈에서 동네 약도가 펼쳐진다. 약도의 가게를 누르면 그 가게로 간다.
   만화방에서 「고양.시로 돌아가기」로 오면(/?from=manhwa) 딸랑 + 문이 잠깐 열렸다 닫힌다(고양이 반응은 cat.js welcomeB).
   - 약도 자리·가게 목록: objects.json door.map (없으면 문은 눌러도 아무 일 없음). 좌표는 약도 그림 픽셀(size) 기준. 그림 규격 MANHWA_MAP_ART.md
   - 약도 그림은 시작 묶음에 넣지 않는다(0008) — 처음 펼칠 때 받는다. 못 받으면 종이색 판 + 이름표만
   - 가게 그림: 방 시계가 밤(time.js isNight)이면 night, 아니면 day
   - 문틈 열림 정도는 world.doorAjar(0~1, 그리기는 draw.js drawDoor). 만득 씨가 오면 약도는 바로 접힌다
   이 파일은 덩어리 밖 모듈만 가져온다(구조 검사). 문 자리·카메라는 ui.js가 넘겨준다 */
import { tr } from './i18n.js';
import { Snd } from './sound.js';
import { isNight, now } from './time.js';
import { RM, esc, gcEvent } from './util.js';
import { after, caption, world } from './world.js';

const mapEl = document.getElementById('mapp');
const AJAR_SEC = 0.25; // 문이 살짝 열리고 닫히는 시간
const BELL_WAIT = 12; // 돌아온 딸랑을 소리가 열릴 때까지 기다리는 시간(초). 그보다 늦은 첫 터치에는 울리지 않는다
let cfg = null, back = false, bellAt = 0; // bellAt: 아직 못 울린 돌아옴 딸랑을 미룬 때(performance.now). 0이면 없음

// 문틈 열림 정도를 목표값 쪽으로 (main.js 매 장면)
export function doorTick(real) {
  const to = world.doorTo || 0, cur = world.doorAjar || 0;
  if (cur !== to)
    world.doorAjar = RM ? to : cur < to ? Math.min(to, cur + real / AJAR_SEC) : Math.max(to, cur - real / AJAR_SEC);
  if (world.manduk && isMapOpen())
    closeMap();
}
export const isMapOpen = () => !!mapEl && !mapEl.hidden;
// 약도 자리 (objects.json door.map). 없으면 문은 그냥 문
export const mapReady = map => !!(mapEl && map && map.base && map.size);
// 퍼센트 자리
const pct = (v, size) => (v / size * 100).toFixed(3) + '%';
const at = (p, s) => `left:${pct(p[0], s)};top:${pct(p[1], s)}`;
function render(map) {
  const s = map.size, night = isNight(now());
  const shops = (map.shops || []).map(sh => {
    const b = sh.box, src = night ? sh.night : sh.day, name = esc(tr(sh.name)), go = `href="${esc(sh.href)}" data-gc="${esc(sh.gc || '')}"`;
    return `<a class="shop" ${go} style="${at(b, s)};width:${pct(b[2], s)};height:${pct(b[3], s)}" tabindex="-1" aria-hidden="true">` +
      (src ? `<img src="${esc(src)}" alt="" decoding="async" onerror="this.remove()">` : '') + '</a>' +
      (sh.label ? `<a class="mlabel" ${go} style="${at(sh.label, s)}">${name}</a>` : '');
  }).join('');
  mapEl.setAttribute('aria-label', tr('mapDlg'));
  mapEl.innerHTML = `<div class="mapbox"><img class="base" src="${esc(map.base)}" alt="" decoding="async" onerror="this.remove()">` +
    (map.home ? `<span class="mlabel home" style="${at(map.home, s)}">${esc(tr('mapHome'))}</span>` : '') + shops +
    `<button class="x" type="button" aria-label="${esc(tr('mapClose'))}">×</button></div>`;
  // 화면에 맞는 정사각형 (글자 크기도 약도 크기를 따라)
  const box = mapEl.querySelector('.mapbox'), side = Math.floor(Math.min(560, innerWidth * 0.92, innerHeight * 0.86));
  box.style.width = box.style.height = side + 'px';
  box.style.fontSize = Math.max(13, side / 24) + 'px';
  return box;
}
// 펼치기. from: 문의 화면 자리 [x, y] (약도가 거기서 자라난다)
export function openMap(map, from) {
  if (!mapReady(map) || isMapOpen())
    return;
  cfg = map;
  world.doorTo = 1;
  mapEl.hidden = false;
  const box = render(map), r = box.getBoundingClientRect();
  if (from)
    box.style.transformOrigin = `${Math.round(from[0] - r.left)}px ${Math.round(from[1] - r.top)}px`;
  mapEl.classList.toggle('grow', !RM);
  box.querySelector('.x').focus({ preventScroll: true });
  gcEvent('door-map', '현관문 약도 열기');
}
// 접기 (펼쳐져 있었으면 true)
export function closeMap() {
  if (!isMapOpen())
    return false;
  mapEl.hidden = true;
  mapEl.classList.remove('grow');
  mapEl.innerHTML = '';
  world.doorTo = 0;
  return true;
}
/* ───────── 만화방에서 돌아옴 ───────── */
// 시작할 때 한 번: 주소 꼬리 from=manhwa를 읽고 지운다(새로 고침에 또 딸랑 안 하게). 다른 꼬리(dev=1 등)는 남긴다
function readBack() {
  try {
    const u = new URL(location.href);
    if (u.searchParams.get('from') !== 'manhwa')
      return false;
    u.searchParams.delete('from');
    history.replaceState(history.state, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams : '') + u.hash);
    return true;
  }
  catch (e) {
    return false;
  }
}
export const cameBack = () => back;
// 딸랑 + 문이 잠깐 열렸다 닫힘 (소리가 꺼져 있으면 자막만. 소리가 아직 안 열렸으면 딸랑은 첫 터치 때 bellLate)
const heard = () => Snd.on && Snd.ac && Snd.ac.state === 'running';
function bell() {
  Snd.bell(1.4);
  after(() => Snd.bell(1.1), 0.14);
}
// 새 문서는 소리가 닫힌 채 시작한다(브라우저가 첫 입력 전엔 막음). 그땐 딸랑을 미뤄 두고, 소리가 열리면 ui.js가 이걸 부른다. 한 번만 울린다
export function bellLate() {
  const at = bellAt;
  bellAt = 0;
  if (at && heard() && performance.now() - at < BELL_WAIT * 1000)
    bell();
}
export function ringDoor() {
  if (heard())
    bell();
  else
    bellAt = performance.now();
  caption(tr('capDoorBell'), 2.6);
  world.doorTo = 1;
  after(() => {
    if (!isMapOpen())
      world.doorTo = 0;
  }, 1.1);
}
export function initFrontDoor() {
  back = readBack();
  if (back)
    gcEvent('manhwa-return', '만화방에서 돌아옴');
  if (!mapEl)
    return;
  // 바깥(어두운 둘레)·닫기 → 접기. 가게 → 통계를 보내고 조금 있다가 떠난다
  mapEl.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button)
        return;
      e.preventDefault();
      if (a.dataset.gc)
        gcEvent(a.dataset.gc, '약도에서 가게로: ' + a.dataset.gc);
      setTimeout(() => { location.href = a.href; }, 180);
      return;
    }
    if (e.target === mapEl || e.target.closest('.x'))
      closeMap();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      closeMap();
  });
  window.addEventListener('langchange', () => {
    if (isMapOpen() && cfg) {
      mapEl.classList.remove('grow'); // 다시 채울 때는 자라나는 움직임 없이
      render(cfg).querySelector('.x').focus({ preventScroll: true });
    }
  });
}
