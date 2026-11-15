/* 크리스마스 광장 (tasks/xmas-plaza-code.md 「광장 페이지」, XMAS_PLAZA_PLAN.md 3장) — /plaza/. 기지처럼 따로 된 페이지. 방 코드는 시간(time.js)·도구(util.js)만 빌린다
   - 겹(뒤 → 앞): 하늘(코드, 방 창밖 하늘색 skyAt) → [불꽃 자리, 다음 티켓] → 광장 그림(낮·밤 두 장, 하늘 투명) → 반짝임(코드)
   - 반짝임: 트리 전구(하나하나 따로 깜빡 + 가끔 아래 → 위 물결), 꼭대기 별빛, 전구 줄, 눈 두 겹, 붕어빵 노점 김
   - 낮·밤(플랜 3-2): 방과 같은 해 기준. 그림은 방 어둠(darkness, 비 빼고)만큼 밤 그림을 겹침. 밤이 되는 순간(isNight) 점등식, 동틀 녘 거꾸로 꺼짐
   - 자리·숫자는 scene.json (그림 픽셀). 캐릭터 크기 char(charScale·depth), ?probe=1 시험 캐릭터
   - 동작 줄이기: 깜빡임·물결·넘어가기 없이 정지, 눈 없음
   - 미리보기(dev에서만 — ?dev=1, 또는 방 미리보기 도구를 켠 기기): ?night=1|0 (밤·낮 고정), ?t=HH:MM (그 시각으로), ?speed=60 (시계 빨리), ?probe=1 */
import { advanceClock, atHour, darkness, isNight, now, setSimMs, setSpeed, skyAt } from '../js/time.js';
import { hash, store } from '../js/util.js';

const body = document.body;
const HOME = '/?from=plaza';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const Q = new URL(location.href).searchParams;
// 방 미리보기 도구와 같은 기록 (ui.js): ?dev=1로 켜고 기억, ?dev=0으로 끈다
if (Q.get('dev') === '1')
  store.set('devTools', true);
else if (Q.get('dev') === '0') {
  store.set('devTools', false);
  store.set('dev', false);
}
const DEV = Q.get('dev') === '1' || (Q.get('dev') !== '0' && store.get('devTools', false));
const FORCE_NIGHT = !DEV ? null : Q.get('night') === '1' ? true : Q.get('night') === '0' ? false : null;
const PROBE = DEV && Q.get('probe') === '1';

/* ───────── 글자 (기지·만화방과 같은 규칙: 저장한 언어 → 브라우저 언어) ───────── */
const STR = {
  title: { ko: '크리스마스 광장', en: 'Christmas Plaza' },
  home: { ko: '고양.시 거실로', en: 'Back to the living room' },
  scene: { ko: '크리스마스 광장 풍경: 가운데 거대 트리, 왼쪽 회전목마와 붕어빵 노점, 오른쪽 스케이트장과 눈사람', en: 'Christmas plaza: a giant tree in the middle, a carousel and a fish-bread stall on the left, a skating rink and a snowman on the right' },
};
const LANG = (() => {
  const saved = store.get('lang', null);
  if (saved === 'ko' || saved === 'en')
    return saved;
  const ls = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
  return ls.some(l => /^ko\b/i.test(l || '')) ? 'ko' : 'en';
})();
const tr = k => STR[k][LANG];

/* ───────── 통계 (GoatCounter goyangsi): 광장 방문 ───────── */
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
const canvas = (cls, W, H) => {
  const c = el('canvas', cls);
  c.width = W;
  c.height = H;
  return c;
};
const clamp01 = v => Math.max(0, Math.min(1, v));
const rnd = (s, i) => hash(s + ':' + i); // 0~1, 날짜와 상관없는 고정 난수 (전구마다 박자)
// 미리 구운 불빛 한 알 (색마다 한 장, 그릴 때 globalAlpha만)
const glowSprite = (col, r) => {
  const c = canvas('', r * 2, r * 2), g = c.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.18, col);
  gr.addColorStop(0.45, col + '66');
  gr.addColorStop(1, col + '00');
  g.fillStyle = gr;
  g.fillRect(0, 0, r * 2, r * 2);
  return c;
};
// 길 [[x, y], ...]을 따라 gap px마다 점 (지나온 거리 0~1도)
function alongPath(path, gap) {
  const segs = [];
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1], [bx, by] = path[i], l = Math.hypot(bx - ax, by - ay);
    segs.push([ax, ay, bx, by, len, l]);
    len += l;
  }
  const out = [];
  for (let s = gap / 2; s < len; s += gap) {
    const g = segs.find(q => s <= q[4] + q[5]) || segs[segs.length - 1], t = (s - g[4]) / g[5];
    out.push({ x: g[0] + (g[2] - g[0]) * t, y: g[1] + (g[3] - g[1]) * t, along: s / len });
  }
  return out;
}

/* ───────── 장면 ───────── */
function build(cfg) {
  const [W, H] = cfg.size;
  const view = el('main', 'pv');
  const stage = el('div', 'ps');
  const sc = el('div', 'pc');
  sc.style.width = W + 'px';
  sc.style.height = H + 'px';
  sc.setAttribute('role', 'img');
  sc.setAttribute('aria-label', tr('scene'));
  stage.append(sc);
  view.append(stage);
  document.title = tr('title');

  // 1. 하늘 (코드)
  const sky = canvas('sky', 8, H); // 세로 그라데이션만이라 폭은 좁게 그리고 늘린다
  const skyG = sky.getContext('2d');
  let skyKey = '';
  const drawSky = (d, mix) => {
    const [top, bot] = FORCE_NIGHT === null ? skyAt(d) : skyAt(new Date(atHour(d, mix > 0.5 ? 23 : 13)));
    if (top + bot === skyKey)
      return;
    skyKey = top + bot;
    const g = skyG.createLinearGradient(0, 0, 0, cfg.sky.horizon);
    g.addColorStop(0, top);
    g.addColorStop(1, bot);
    skyG.fillStyle = g;
    skyG.fillRect(0, 0, 8, H);
  };
  // 2. 불꽃 자리 (광장 불꽃 티켓에서 이 겹에 그린다)
  const fw = el('div', 'fw');
  // 3. 광장 그림: 낮 위에 밤을 겹친다. 낮 그림이 없으면 밤 그림으로 대신
  const pic = (cls, src) => {
    const n = el('img', 'pic ' + cls);
    n.alt = '';
    n.decoding = 'async';
    n.draggable = false;
    n.src = src + '?v=' + cfg.v;
    return n;
  };
  const day = pic('day', cfg.day), night = pic('night', cfg.night);
  day.onerror = () => {
    day.onerror = null;
    day.src = night.src;
  };
  night.onerror = () => sc.classList.add('nopic');
  // 4. 반짝임 (코드)
  const fx = canvas('fx', W, H), g = fx.getContext('2d');
  sc.append(sky, fw, day, night, fx);

  /* ── 트리 전구·별·전구 줄 */
  const T = cfg.tree, S = cfg.strings, C = cfg.ceremony;
  const treeSpr = T.colors.map(c => glowSprite(c, T.r * 2));
  const strSpr = S.colors.map(c => glowSprite(c, S.r * 2));
  const starSpr = glowSprite('#fff2b0', T.star[2]);
  // 점등 차례(0~1): 트리는 아래 → 위(목록 순서), 별, 전구 줄은 별 쪽 → 바깥
  const tree = T.lights.map(([x, y], i) => ({ x, y, on: (i / T.lights.length) * C.tree, spr: treeSpr[i % treeSpr.length],
    sp: 1.2 + rnd('tsp', i) * 2.2, ph: rnd('tph', i) * 7 }));
  const bulbs = [];
  S.paths.forEach((p, k) => alongPath(p, S.gap).forEach((b, i) => bulbs.push({ ...b, on: C.star + 0.04 + b.along * (1 - C.star - 0.04),
    spr: strSpr[(i + k) % strSpr.length], sp: 0.9 + rnd('ssp' + k, i) * 1.4, ph: rnd('sph' + k, i) * 7 })));

  // 점등 정도 lit 0~1 (점등식 진행). 처음 열 때는 그 시각 그대로(밤이면 다 켜짐)
  let lastNight = null, lit = 0, litTo = 0, litRate = 0;
  const setNight = n => {
    if (n === lastNight)
      return;
    const first = lastNight === null;
    lastNight = n;
    litTo = n ? 1 : 0;
    if (first || RM)
      lit = litTo;
    else
      litRate = 1 / (n ? C.sec : C.offSec);
  };
  // 물결: 시각 칸(every초)마다 한 번, 칸 안 시작은 고정 난수
  const waveY = t => {
    const W8 = cfg.wave, slot = Math.floor(t / W8.every), at = slot * W8.every + rnd('wave', slot) * W8.every * 0.8;
    const p = (t - at) / W8.sec;
    if (p < 0 || p > 1)
      return null;
    return T.lights[0][1] + 40 - p * (T.lights[0][1] - T.star[1] + 80);
  };
  const onK = (on, fade) => clamp01((lit - on) / fade);
  const drawLights = t => {
    const fade = C.fade / C.sec, wy = RM ? null : waveY(t);
    g.globalCompositeOperation = 'lighter';
    for (const L of tree) {
      const k = onK(L.on, fade);
      if (k <= 0)
        continue;
      let b = RM ? 0.8 : 0.55 + 0.45 * Math.sin(t * L.sp + L.ph);
      if (wy !== null)
        b = Math.max(b, 1.3 * Math.max(0, 1 - Math.abs(L.y - wy) / cfg.wave.band));
      g.globalAlpha = Math.min(1, k * (0.35 + 0.65 * b));
      const s = T.r * 2 * (0.75 + 0.35 * Math.min(1, b));
      g.drawImage(L.spr, L.x - s, L.y - s, s * 2, s * 2);
    }
    for (const B of bulbs) {
      const k = onK(B.on, fade);
      if (k <= 0)
        continue;
      const b = RM ? 0.8 : 0.6 + 0.4 * Math.sin(t * B.sp + B.ph);
      g.globalAlpha = k * (0.4 + 0.6 * b);
      const s = S.r * 2;
      g.drawImage(B.spr, B.x - s, B.y - s, s * 2, s * 2);
    }
    // 꼭대기 별빛: 낮엔 약하게(dayK), 점등식에선 트리 다음
    const [sx, sy, sr] = T.star, sk = T.dayK + (1 - T.dayK) * onK(C.tree, C.star - C.tree);
    const pulse = RM ? 1 : 0.85 + 0.15 * Math.sin(t * 1.3);
    g.globalAlpha = sk * pulse;
    g.drawImage(starSpr, sx - sr * 2, sy - sr * 2, sr * 4, sr * 4);
    g.save();
    g.translate(sx, sy);
    g.rotate(RM ? 0 : t * 0.15);
    g.strokeStyle = '#fff6c8';
    g.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      g.rotate(Math.PI / 4);
      g.globalAlpha = sk * (i % 2 ? 0.35 : 0.6) * (RM ? 1 : 0.7 + 0.3 * Math.sin(t * 2 + i));
      g.lineWidth = i % 2 ? 1.5 : 2.5;
      g.beginPath();
      g.moveTo(sr * 0.55, 0);
      g.lineTo(sr * (i % 2 ? 1.4 : 2.1), 0);
      g.stroke();
    }
    g.restore();
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  };

  /* ── 눈 두 겹 (동작 줄이기면 없음) */
  const flakes = RM ? [] : ['back', 'front'].flatMap(layer => {
    const F = cfg.snow[layer];
    return Array.from({ length: F.n }, (_, i) => {
      const q = j => rnd(layer + j, i);
      return { F, x: q(1) * W, y: q(2) * H, r: F.r[0] + q(3) * (F.r[1] - F.r[0]), v: F.fall[0] + q(4) * (F.fall[1] - F.fall[0]), sp: 0.4 + q(5) * 0.8, ph: q(6) * 7 };
    });
  });
  const drawSnow = (t, dt) => {
    g.fillStyle = '#ffffff';
    for (const f of flakes) {
      f.y += f.v * dt;
      if (f.y > H + 6) {
        f.y = -6;
        f.x = Math.random() * W;
      }
      const x = (f.x + Math.sin(t * f.sp + f.ph) * f.F.sway + W) % W;
      g.globalAlpha = f.F.a;
      g.beginPath();
      g.arc(x, f.y, f.r, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
  };

  /* ── 붕어빵 노점 김: 줄기마다 나온 시각이 고정(every초 칸)이라 따로 기억하지 않는다. 동작 줄이기면 멈춘 김 한 장 */
  const ST = cfg.steam;
  const drawSteam = t => {
    const n = Math.ceil(ST.life / ST.every);
    for (const [i, [x0, y0]] of ST.from.entries()) {
      const tt = RM ? ST.life * 0.5 + i : t + i * 0.37;
      const first = Math.floor(tt / ST.every);
      for (let k = first - n; k <= first; k++) {
        const p = (tt - k * ST.every) / ST.life;
        if (p < 0 || p > 1 || (RM && k % 2))
          continue;
        const wob = Math.sin(p * 5 + rnd('st' + i, k) * 6) * 8 * p;
        const r = ST.r[0] + (ST.r[1] - ST.r[0]) * p;
        g.globalAlpha = ST.a * Math.sin(Math.PI * p) * (0.6 + 0.4 * rnd('sa' + i, k));
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(x0 + wob, y0 - p * ST.rise, r, 0, 7);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  };

  /* ── 시험 캐릭터 (?probe=1): 방 스프라이트 하나를 두 자리에 — 방 앞쪽 크기 × charScale × depth(y) */
  if (PROBE)
    probe(sc, cfg.char);

  /* ── 낮·밤: 1초마다 시각을 읽고, 그림 섞기·하늘·점등 목표를 맞춘다 */
  let mix = 0;
  const tick = () => {
    const d = now(), n = FORCE_NIGHT ?? isNight(d);
    mix = FORCE_NIGHT !== null ? +FORCE_NIGHT : RM ? +n : clamp01(darkness(d, true));
    night.style.opacity = mix;
    drawSky(d, mix);
    setNight(n);
  };

  /* ── 매 장면 */
  let lastT = performance.now() / 1000, nextTick = 0;
  const frame = ms => {
    const t = ms / 1000, dt = Math.min(0.1, t - lastT);
    lastT = t;
    if (DEV)
      advanceClock(ms); // ?speed= 빨리 감기
    if (t >= nextTick) {
      nextTick = t + 1;
      tick();
    }
    if (lit !== litTo)
      lit = litTo > lit ? Math.min(litTo, lit + litRate * dt) : Math.max(litTo, lit - litRate * dt);
    g.clearRect(0, 0, W, H);
    drawLights(t);
    drawSteam(t);
    drawSnow(t, dt);
    if (!RM || lit !== litTo)
      requestAnimationFrame(frame);
  };
  tick();
  requestAnimationFrame(frame);
  if (RM) // 동작 줄이기: 멈춘 그림을 1분마다 다시 (낮·밤 바뀜)
    setInterval(() => requestAnimationFrame(frame), 60000);

  /* ── 나가기: 거실로 */
  const exit = el('a', 'exit', '← ' + tr('home'));
  exit.href = HOME;
  body.append(exit);

  /* ── 폰: 화면 높이에 맞추고 가로로 둘러보기 / 데스크톱: 전체 (기지와 같은 방식) */
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
  const center = k => (view.scrollLeft = Math.max(0, cfg.view.focus * k - view.clientWidth / 2));
  addEventListener('resize', () => center(fit()));
  body.append(view);
  center(fit());
}

// 시험 캐릭터: 방 프레임(f/meta.json [폭, 높이, 기준점 x, y, (크기 보정)])을 광장 배율로
function probe(sc, CH) {
  const at = y => {
    const [y0, y1] = CH.depth.y, [k0, k1] = CH.depth.scale, p = clamp01((y - y0) / (y1 - y0));
    return CH.roomPx * CH.charScale * (k0 + (k1 - k0) * p);
  };
  const name = CH.probe.frame;
  fetch('../f/meta.json').then(r => r.json()).then(meta => {
    const [fw, fh, ax, ay, fk = 1] = meta[name];
    for (const [x, y] of CH.probe.at) {
      const k = at(y) * fk, im = el('img', 'probe');
      im.alt = '';
      im.src = '../f/' + name + '.webp';
      Object.assign(im.style, { left: x - ax * k + 'px', top: y - ay * k + 'px', width: fw * k + 'px', height: fh * k + 'px' });
      const tag = el('span', 'probe-tag', '×' + (at(y) / CH.roomPx).toFixed(2) + ' · y ' + y);
      Object.assign(tag.style, { left: x + 'px', top: y + 6 + 'px' });
      sc.append(im, tag);
    }
  }).catch(() => { });
}

/* ───────── 시작 ───────── */
document.documentElement.lang = LANG;
if (DEV) {
  const tq = /^(\d{1,2}):(\d{2})$/.exec(Q.get('t') || '');
  if (tq)
    setSimMs(atHour(now(), +tq[1] + tq[2] / 60));
  if (+Q.get('speed') > 0)
    setSpeed(+Q.get('speed'));
}
fetch('scene.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : Promise.reject(r.status))
  .then(cfg => {
    build(cfg);
    if (freshVisit())
      gcEvent('plaza-visit', '크리스마스 광장 방문');
  })
  .catch(() => {
    const box = el('div', 'msg');
    const a = el('a', 'btn', tr('home'));
    a.href = HOME;
    box.append(el('p', '', '🎄'), a);
    body.append(box);
  });

// 오프라인: 방과 같은 서비스 워커. 광장 그림은 본 것만 담는다 (sw.js 광장 칸)
if ('serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('../sw.js').catch(() => { });
