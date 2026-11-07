/* 쥐구멍 기지 홀 (tasks/base-1-hall.md) — /base/. 만화방처럼 별도 페이지. 방 코드는 시간(time.js)만 빌린다
   - 바탕 한 장(bg.webp) + 밤 색조(방 시계 isNight): 전체를 어둡게, 샹들리에는 더 어둡게, 단말기·램프 불빛은 남긴다
   - 상황판: 상태 JSON(status.js) → 네 화면(screens.js) → 넘김 판(board.js). 누르면 다음 화면
   - 상단 띠: "마지막 소식: 오늘·어제·며칠 전" 또는 "연습 화면"(데모)
   - 발바닥 판: 고양.시 거실로(/?from=base). 귀환 장면은 base-3
   - 자리·숫자는 scene.json (바탕 그림 픽셀). 그림을 못 받으면 바위색 바탕 + 코드 상황판·발바닥 단추
   - 미리보기: ?night=1 / ?night=0 (밤·낮 고정), ?demo=1 (데모), ?status=파일.json (같은 사이트의 시험용 JSON) */
import { isNight, now } from '../js/time.js';
import { makeBoard } from './board.js';
import { STR, agoText, daysAgo, pages } from './screens.js';
import { readStatus } from './status.js';

const body = document.body;
const HOME = '/?from=base';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const Q = new URL(location.href).searchParams;
const FORCE_NIGHT = Q.get('night') === '1' ? true : Q.get('night') === '0' ? false : null;

/* ───────── 글자 (만화방과 같은 규칙: 저장한 언어 → 브라우저 언어) ───────── */
const LANG = (() => {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem('goyang.lang'));
  }
  catch (e) { }
  if (saved === 'ko' || saved === 'en')
    return saved;
  const ls = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
  return ls.some(l => /^ko\b/i.test(l || '')) ? 'ko' : 'en';
})();
const tr = k => STR[k][LANG];

/* ───────── 통계 (GoatCounter goyangsi): 기지 방문 · 상황판 눌러 넘김(방문당 한 번) ───────── */
const gcEvent = (path, title) => {
  let tries = 0;
  const send = () => {
    const gc = window.goatcounter;
    if (gc && gc.count) {
      try {
        gc.count({ path, title, event: true });
      }
      catch (e) { }
      return;
    }
    if (++tries <= 40)
      setTimeout(send, 500);
  };
  send();
};
const freshVisit = () => {
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  return !nav || nav.type === 'navigate';
};

/* ───────── 도우미 ───────── */
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls)
    n.className = cls;
  if (text != null)
    n.textContent = text;
  return n;
};
const place = (n, [x, y, w, h]) => {
  Object.assign(n.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  return n;
};

/* ───────── 장면 ───────── */
function build(cfg) {
  const [W, H] = cfg.size, B = cfg.board;
  const view = el('main', 'bv');
  const stage = el('div', 'bs');
  const sc = el('div', 'bc');
  sc.style.width = W + 'px';
  sc.style.height = H + 'px';
  stage.append(sc);
  view.append(stage);
  view.setAttribute('aria-label', tr('title'));
  document.title = tr('title');

  const bg = el('img', 'bg');
  bg.alt = '';
  bg.decoding = 'async';
  bg.draggable = false;
  bg.onerror = () => {
    bg.remove();
    sc.classList.add('nobg');
  };
  bg.src = cfg.bg + '?v=' + cfg.v;
  sc.append(bg);

  // 밤 색조: 전체 그늘 + 샹들리에 더 어둡게 + 불빛(CRT·램프)은 위에 다시
  const night = el('div', 'night');
  for (const [x, y, r] of cfg.chandeliers || [])
    night.append(place(el('i', 'dim'), [x - r, y - r, r * 2, r * 2]));
  sc.append(night);
  const glow = el('div', 'glows');
  if (cfg.crt)
    glow.append(place(el('i', 'glow crt'), cfg.crt));
  for (const l of cfg.lamps || [])
    glow.append(place(el('i', 'glow lamp'), l));
  sc.append(glow);

  // 상황판 (불빛이라 밤 색조 위)
  const board = place(el('button', 'board'), B.rect);
  board.type = 'button';
  board.setAttribute('aria-label', tr('board'));
  const grid = el('span', 'grid');
  grid.style.padding = B.pad[1] + 'px ' + B.pad[0] + 'px';
  board.append(grid);
  const said = el('span', 'sr');
  said.setAttribute('aria-live', 'polite');
  board.append(said);
  sc.append(board);
  const show = makeBoard(grid, B, RM);

  // 발바닥 판 → 거실
  const paw = place(el('a', 'paw'), cfg.paw);
  paw.href = HOME;
  paw.setAttribute('aria-label', tr('home'));
  paw.title = tr('home');
  sc.append(paw);

  // 상단 띠
  const band = el('p', 'band');
  band.setAttribute('aria-live', 'polite');
  body.append(band);

  /* ── 화면 돌리기 */
  let all = [], at = 0, timer = 0, counted = false, data = null, demo = true;
  const render = () => {
    const pg = all[at % all.length];
    if (!pg)
      return;
    show(pg.lines);
    said.textContent = pg.lines.map(l => [l.l, l.r, l.n, l.u].filter(Boolean).join(' ')).filter(Boolean).join(' / ');
  };
  const next = () => {
    clearTimeout(timer);
    at = (at + 1) % Math.max(1, all.length);
    render();
    timer = setTimeout(next, B.screenSec * 1000);
  };
  board.addEventListener('click', () => {
    if (!counted) {
      counted = true;
      gcEvent('base-board', '기지 상황판 눌러 넘김');
    }
    next();
  });
  const setBand = () => {
    if (!data) {
      band.hidden = true;
      return;
    }
    band.hidden = false;
    band.textContent = demo ? tr('practice') : tr('last') + agoText(LANG, daysAgo(data.day, Date.now()));
    band.classList.toggle('demo', demo);
  };
  const use = got => {
    if (!got.data)
      return;
    const first = !data;
    data = got.data;
    demo = got.demo;
    all = pages(data, LANG, B.rows, B.digits);
    setBand();
    if (first) {
      at = 0;
      render();
      clearTimeout(timer);
      timer = setTimeout(next, B.screenSec * 1000);
    }
    else
      at = Math.min(at, all.length - 1); // 다음 넘김부터 새 내용
  };
  const S = cfg.status;
  const force = Q.get('demo') === '1' ? 'about:blank' : sameSite(Q.get('status')); // about:blank: 일부러 못 읽게 → 데모
  const read = () => readStatus(S, location.href, force).then(use, () => { });
  read();
  setInterval(read, S.everyMin * 60000);
  setInterval(setBand, 600000); // 자정이 지나면 "오늘" → "어제"

  /* ── 낮·밤 */
  const tint = () => body.classList.toggle('is-night', FORCE_NIGHT ?? isNight(now()));
  tint();
  setInterval(tint, 30000);

  /* ── 폰: 화면 높이에 맞추고 가로로 둘러보기 / 데스크톱: 전체 */
  const fit = () => {
    const vw = innerWidth, vh = innerHeight;
    const wide = vw / vh >= W / H * 0.8;
    const k = wide ? Math.min(vw / W, vh / H) : vh / H;
    sc.style.transform = `scale(${k})`;
    stage.style.width = Math.round(W * k) + 'px';
    stage.style.height = Math.round(H * k) + 'px';
    view.classList.toggle('pan', !wide);
    return k;
  };
  let scale = 1, panFrame = 0, panWait = 0;
  const stopPan = () => {
    clearTimeout(panWait);
    panWait = 0;
    cancelAnimationFrame(panFrame);
    panFrame = 0;
  };
  const scrollAt = x => Math.max(0, Math.min(view.scrollWidth - view.clientWidth, x * scale - view.clientWidth / 2));
  const panTo = (x, ms) => {
    stopPan();
    const from = view.scrollLeft, to = scrollAt(x);
    if (RM) {
      view.scrollLeft = to;
      return;
    }
    const start = performance.now();
    const go = t => {
      const p = Math.min(1, (t - start) / ms);
      view.scrollLeft = from + (to - from) * (1 - (1 - p) ** 3);
      panFrame = p < 1 ? requestAnimationFrame(go) : 0;
    };
    panFrame = requestAnimationFrame(go);
  };
  for (const ev of ['pointerdown', 'touchstart', 'wheel'])
    view.addEventListener(ev, stopPan, { passive: true });
  document.addEventListener('keydown', stopPan);
  addEventListener('resize', () => {
    stopPan();
    scale = fit();
  });

  body.append(view);
  scale = fit();
  // 들어오면 쥐구멍 입구 → 왕좌 스르륵 (만지면 멈춤, 동작 줄이기면 바로 왕좌)
  if (view.classList.contains('pan')) {
    const V = cfg.view;
    if (RM)
      view.scrollLeft = scrollAt(V.focus);
    else {
      view.scrollLeft = scrollAt(V.start);
      panWait = setTimeout(() => panTo(V.focus, V.panMs), 400);
    }
  }
}

// ?status= 는 같은 사이트 파일만 (시험용)
function sameSite(s) {
  if (!s)
    return null;
  try {
    const u = new URL(s, location.href);
    return u.origin === location.origin ? u.href : null;
  }
  catch (e) {
    return null;
  }
}

/* ───────── 시작 ───────── */
document.documentElement.lang = LANG;
fetch('scene.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : Promise.reject(r.status))
  .then(cfg => {
    build(cfg);
    if (freshVisit())
      gcEvent('base-visit', '쥐구멍 기지 방문');
  })
  .catch(() => {
    const box = el('div', 'msg');
    const a = el('a', 'btn', tr('home'));
    a.href = HOME;
    box.append(el('p', '', '🐾'), a);
    body.append(box);
  });

// 오프라인: 방과 같은 서비스 워커. 기지 그림은 본 것만 담는다 (sw.js 기지 칸)
if ('serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('../sw.js').catch(() => { });
