/* 크리스마스 광장 (tasks/xmas-plaza-code.md 「광장 페이지」, XMAS_PLAZA_PLAN.md 3장) — /plaza/. 기지처럼 따로 된 페이지. 방 코드는 시간(time.js)·도구(util.js)만 빌린다
   - 겹(뒤 → 앞): 하늘(코드, 방 창밖 하늘색 skyAt) → [불꽃 자리, 다음 티켓] → 광장 그림(낮·밤 두 장, 하늘 투명) → 반짝임(코드)
   - 반짝임: 트리 전구(하나하나 따로 깜빡 + 가끔 아래 → 위 물결), 꼭대기 별빛, 전구 줄, 눈 두 겹, 붕어빵 노점 김
   - 낮·밤(플랜 3-2): 방과 같은 해 기준. 그림은 방 어둠(darkness, 비 빼고)만큼 밤 그림을 겹침. 밤이 되는 순간(isNight) 점등식, 동틀 녘 거꾸로 꺼짐
   - 자리·숫자는 scene.json (그림 픽셀). 캐릭터 크기 char(charScale·depth), ?probe=1 시험 캐릭터
   - 하늘 별·눈 일정·별똥별(플랜 3-4, tasks/xmas-plaza-sky.md): 눈은 날짜로 정한 칸(누구에게나 같음)마다 오거나 그치고, 그친 밤엔 하늘 별이 반짝, 가끔 별똥별. 12/24·25 밤은 늘 눈
   - 동작 줄이기: 깜빡임·물결·넘어가기 없이 정지, 눈·별똥별 없음, 별은 멈춘 점
   - 미리보기(dev에서만 — ?dev=1, 또는 방 미리보기 도구를 켠 기기): ?night=1|0 (밤·낮 고정), ?t=HH:MM (그 시각으로), ?speed=60 (시계 빨리), ?probe=1, ?snow=1|0 (눈 고정), ?shoot=1 (별똥별 자주) */
import { advanceClock, atHour, darkness, isNight, nightOf, now, setSimMs, setSpeed, skyAt } from '../js/time.js';
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
const FORCE_SNOW = !DEV ? null : Q.get('snow') === '1' ? 1 : Q.get('snow') === '0' ? 0 : null;
const SHOOT_DEV = DEV && Q.get('shoot') === '1';

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
// 0~1, 날짜와 상관없는 고정 난수 (전구마다 박자). FNV(hash)는 짧은 글자를 연달아 넣으면 값이 몰려서 마지막에 murmur3 fmix32로 한 번 더 섞는다
const rnd = (s, i) => {
  let h = hash(s + ':' + i) * 4294967295 >>> 0;
  h = Math.imul(h ^ h >>> 16, 0x85ebca6b);
  h = Math.imul(h ^ h >>> 13, 0xc2b2ae35);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
};
// 눈 일정 (플랜 3-4): 하루를 block분 칸으로 나눠 칸마다 눈/맑음을 날짜 씨앗으로 정한다(share만큼 눈) → 누구에게나 같다.
// 칸 경계 앞뒤 fade/2분 동안 천천히 넘어간다. 12/24·25 밤(nightOf)은 늘 눈. 돌려주는 값: 눈 세기 0~1
function snowAt(d, Wc) {
  const nk = nightOf(d);
  if (nk && Wc.xmasNights.some(md => nk.endsWith('-' + md)))
    return 1;
  const min = (d.getTime() - d.getTimezoneOffset() * 60000) / 60000, b = Math.floor(min / Wc.block), u = min - b * Wc.block;
  const on = i => rnd('snowblock', i) < Wc.share ? 1 : 0, half = Wc.fade / 2, sm = x => x * x * (3 - 2 * x);
  if (u < half)
    return on(b - 1) + (on(b) - on(b - 1)) * sm(0.5 + u / Wc.fade);
  if (u > Wc.block - half)
    return on(b) + (on(b + 1) - on(b)) * sm((u - (Wc.block - half)) / Wc.fade);
  return on(b);
}
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
  // 1-2. 하늘 별·별똥별·눈 올 때 흐림 (코드, 하늘 바로 위 — 그림이 투명한 하늘 자리에만 보인다)
  const SK = cfg.stars, stars = canvas('stars', W, SK.bottom), sg = stars.getContext('2d');
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
  sc.append(sky, stars, fw, day, night, fx);

  /* ── 트리 전구·별·전구 줄 */
  const T = cfg.tree, S = cfg.strings, C = cfg.ceremony;
  const treeSpr = T.colors.map(c => glowSprite(c, T.r * 2));
  const strSpr = S.colors.map(c => glowSprite(c, S.r * 2));
  const ST8 = T.starGlow, starSpr = glowSprite('#fff2b0', T.star[2]), haloSpr = glowSprite(ST8.haloColor, T.star[2] * ST8.halo);
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
    // 별 뒤 따뜻한 금빛 빛무리 (금색 별에 묻히지 않게 크게, haloN겹 겹쳐 밝게)
    const hr = sr * ST8.halo;
    for (let i = 0; i < ST8.haloN; i++) {
      g.globalAlpha = Math.min(1, sk * pulse * ST8.haloA);
      g.drawImage(haloSpr, sx - hr, sy - hr, hr * 2, hr * 2);
    }
    g.globalAlpha = sk * pulse;
    g.drawImage(starSpr, sx - sr * 2, sy - sr * 2, sr * 4, sr * 4);
    g.save();
    g.translate(sx, sy);
    g.rotate(RM ? 0 : t * 0.15);
    g.strokeStyle = '#fff6c8';
    g.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      g.rotate(Math.PI / 4);
      g.globalAlpha = sk * (i % 2 ? 0.45 : 0.75) * (RM ? 1 : 0.7 + 0.3 * Math.sin(t * 2 + i));
      g.lineWidth = ST8.rayW * (i % 2 ? 0.6 : 1);
      g.beginPath();
      g.moveTo(sr * 0.55, 0);
      g.lineTo(sr * ST8.ray * (i % 2 ? 0.65 : 1), 0);
      g.stroke();
    }
    g.restore();
    // 가끔(flashEvery초 칸마다 한 번, 칸 안 시작은 고정 난수) 반짝 빛나는 십자 섬광
    if (!RM) {
      const slot = Math.floor(t / ST8.flashEvery), p = (t - slot * ST8.flashEvery - rnd('flash', slot) * ST8.flashEvery * 0.7) / ST8.flashSec;
      if (p >= 0 && p <= 1) {
        const k = sk * Math.sin(Math.PI * p), len = sr * ST8.flashLen * (0.6 + 0.4 * Math.sin(Math.PI * p));
        g.globalAlpha = Math.min(1, k * 1.4);
        g.drawImage(starSpr, sx - sr * 2.5, sy - sr * 2.5, sr * 5, sr * 5);
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
          const gr = g.createLinearGradient(sx - dx * len, sy - dy * len, sx + dx * len, sy + dy * len);
          gr.addColorStop(0, '#fff6c800');
          gr.addColorStop(0.5, '#ffffff');
          gr.addColorStop(1, '#fff6c800');
          g.strokeStyle = gr;
          g.globalAlpha = k;
          g.lineWidth = ST8.rayW * 1.6;
          g.beginPath();
          g.moveTo(sx - dx * len, sy - dy * len);
          g.lineTo(sx + dx * len, sy + dy * len);
          g.stroke();
        }
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  };

  /* ── 하늘 별: 크기가 섞인 작은 별이 제각각 빠르게 반짝(팅글팅글). 밤 + 맑을 때만, 해 질 녘엔 하나둘씩(별마다 나오는 문턱) */
  const starSpr2 = glowSprite('#fffbe8', 8);
  const sky8 = Array.from({ length: SK.n }, (_, i) => {
    const q = j => rnd('sky' + j, i), big = q(3) < SK.big;
    return { x: q(1) * W, y: SK.top + Math.pow(q(2), 1.3) * (SK.bottom - SK.top), r: big ? SK.r[1] : SK.r[0] + q(4) * (SK.r[1] - SK.r[0]) * 0.6, big,
      a: SK.a[0] + q(5) * (SK.a[1] - SK.a[0]), sp: SK.sp[0] + q(6) * (SK.sp[1] - SK.sp[0]), sp2: 0.7 + q(7) * 1.6, ph: q(8) * 7, thr: q(9) * 0.85 };
  });
  const SH = cfg.shoot;
  let starK = 0, snowK = 0;
  const drawStars = t => {
    sg.clearRect(0, 0, W, SK.bottom);
    const vis = starK * (1 - snowK);
    if (vis > 0.01)
      for (const S8 of sky8) {
        const k = clamp01((vis - S8.thr) * 6);
        if (k <= 0)
          continue;
        // 두 박자를 곱해 불규칙하게 톡톡 튀는 반짝임 (동작 줄이기면 멈춘 점)
        const b = RM ? 0.8 : (0.5 + 0.5 * Math.sin(t * S8.sp + S8.ph)) * (0.6 + 0.4 * Math.sin(t * S8.sp2 * 2.3 + S8.ph * 1.7));
        const tw = 0.3 + 0.7 * b * b;
        sg.globalAlpha = k * S8.a * tw;
        if (S8.big) {
          const s = S8.r * (3 + 2.5 * tw);
          sg.drawImage(starSpr2, S8.x - s, S8.y - s, s * 2, s * 2);
          if (tw > 0.65) { // 밝을 때만 작은 십자 빛
            sg.globalAlpha = k * S8.a * (tw - 0.65) * 2.2;
            sg.fillStyle = '#ffffff';
            const L = S8.r * 5;
            sg.fillRect(S8.x - L, S8.y - 0.5, L * 2, 1);
            sg.fillRect(S8.x - 0.5, S8.y - L, 1, L * 2);
          }
        }
        else {
          sg.fillStyle = '#fffbe8';
          sg.beginPath();
          sg.arc(S8.x, S8.y, S8.r, 0, 7);
          sg.fill();
        }
      }
    // 별똥별: every초 칸마다 한 번쯤(칸 안 시작은 고정 난수), 맑은 밤에만. ?shoot=1이면 devEvery초마다
    if (!RM && vis > 0.5) {
      const every = SHOOT_DEV ? SH.devEvery : SH.every, slot = Math.floor(t / every);
      const p = (t - slot * every - rnd('shoot', slot) * every * 0.7) / SH.sec;
      if (p >= 0 && p <= 1 && (SHOOT_DEV || rnd('shootOn', slot) < SH.chance)) {
        const q = j => rnd('sh' + j, slot), dir = q(1) < 0.5 ? -1 : 1;
        const x0 = W * (0.15 + q(2) * 0.7), y0 = SK.top + 20 + q(3) * (SK.bottom - SK.top) * 0.35;
        const ang = (0.35 + q(4) * 0.3), dx = Math.cos(ang) * dir, dy = Math.sin(ang);
        const hx = x0 + dx * SH.len * p * 1.6, hy = y0 + dy * SH.len * p * 1.6, tail = SH.len * Math.min(1, p * 2.5);
        const gr = sg.createLinearGradient(hx, hy, hx - dx * tail, hy - dy * tail);
        gr.addColorStop(0, '#ffffff');
        gr.addColorStop(1, '#ffffff00');
        sg.globalAlpha = vis * Math.sin(Math.PI * p);
        sg.strokeStyle = gr;
        sg.lineWidth = 2;
        sg.lineCap = 'round';
        sg.beginPath();
        sg.moveTo(hx, hy);
        sg.lineTo(hx - dx * tail, hy - dy * tail);
        sg.stroke();
        sg.drawImage(starSpr2, hx - 6, hy - 6, 12, 12);
      }
    }
    // 눈 올 때 하늘이 살짝 흐림
    if (snowK > 0.01) {
      sg.globalAlpha = cfg.weather.haze * snowK;
      sg.fillStyle = cfg.weather.hazeColor;
      sg.fillRect(0, 0, W, SK.bottom);
    }
    sg.globalAlpha = 1;
  };

  /* ── 눈 두 겹 (동작 줄이기면 없음). 처음 자리는 화면을 n칸(가로 cols × 세로 rows)으로 나눠 칸마다 한 송이 + 칸 안 흔들기라 고르게 퍼진다 */
  const flakes = RM ? [] : ['back', 'front'].flatMap(layer => {
    const F = cfg.snow[layer], cols = Math.max(1, Math.round(Math.sqrt(F.n * W / H))), rows = Math.ceil(F.n / cols);
    const cells = Array.from({ length: cols * rows }, (_, c) => c).sort((a, b) => rnd(layer + 'c', a) - rnd(layer + 'c', b)).slice(0, F.n);
    return cells.map((c, i) => {
      const q = j => rnd(layer + j, i);
      return { F, x: (c % cols + q(1)) * W / cols, y: (Math.floor(c / cols) + q(2)) * H / rows, r: F.r[0] + q(3) * (F.r[1] - F.r[0]), v: F.fall[0] + q(4) * (F.fall[1] - F.fall[0]), sp: 0.4 + q(5) * 0.8, ph: q(6) * 7, thr: q(7) * 0.95 };
    });
  });
  const drawSnow = (t, dt) => {
    g.fillStyle = '#ffffff';
    for (const f of flakes) {
      f.y += f.v * dt;
      if (f.y > H + 6) {
        f.y = -6 - Math.random() * H * 0.15; // 다시 뿌릴 때 시작 높이도 흩어 줄지어 내리지 않게
        f.x = Math.random() * W;
      }
      const k = clamp01((snowK - f.thr) * 8); // 눈 세기만큼 송이가 늘고 준다 (송이마다 문턱)
      if (k <= 0)
        continue;
      const x = (f.x + Math.sin(t * f.sp + f.ph) * f.F.sway + W) % W;
      g.globalAlpha = f.F.a * k;
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
  let mix = 0, starTo = 0, snowTo = 0;
  const tick = () => {
    const d = now(), n = FORCE_NIGHT ?? isNight(d);
    mix = FORCE_NIGHT !== null ? +FORCE_NIGHT : RM ? +n : clamp01(darkness(d, true));
    night.style.opacity = mix;
    starTo = FORCE_NIGHT !== null ? +FORCE_NIGHT : clamp01(darkness(d, true) / cfg.weather.nightDark);
    snowTo = FORCE_SNOW ?? snowAt(d, cfg.weather);
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
    // 별·눈 세기는 1초마다 정한 목표로 부드럽게 (일정의 넘어가기는 snowAt이 몇 분에 걸쳐)
    const ease = RM ? 1 : Math.min(1, dt * 1.5);
    starK += (starTo - starK) * ease;
    snowK += (snowTo - snowK) * ease;
    drawStars(t);
    g.clearRect(0, 0, W, H);
    drawLights(t);
    drawSteam(t);
    drawSnow(t, dt);
    if (!RM || lit !== litTo)
      requestAnimationFrame(frame);
  };
  tick();
  starK = starTo;
  snowK = snowTo;
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
