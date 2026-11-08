/* 기지 식구 넷 (tasks/base-2a-family.md) — 쥐야쥐 왕 · 강고양이 씨 · 까치 · 금붕생이 + 만득 씨 환기구 말풍선
   - 상태(status.js clean 결과) → 식구마다 자세(poses). 동시에 여러 일이면 각자 자기 일
   - 바뀐 걸 봤을 때 한 번씩(changes): 이 기기에서 지난번 본 상태와 비교. 기기에만 저장, 없으면 안 함. 데모는 바로 앞 쪽과 비교(저장 안 함)
   - 그림: 거실 그림(f/·r/, 크기·발 기준점은 meta.json)은 다시 쓰고, 새 그림은 base/fam/ (기준점·배율은 scene.json fam.art).
     두루마리·경광등·쾅·빈자리 표시·말풍선은 코드(base.css)
   - 자리·크기는 scene.json fam 한 곳. 자리가 없으면 그 식구만 안 나온다. 그림을 못 받으면 그 그림만 안 보인다
   - 동작 줄이기: 프레임 넘김·움직임 없이 자세만 바뀜 */
import { STR } from './screens.js';

const SEEN = 'goyang.base.seen';
const ROOM_F = '../f/', ROOM_R = '../r/', FAM = 'fam/';
const rng = (k, n) => Array.from({ length: n }, (_, i) => k + '_' + (i + 1));

/* ───────── 자세 표 (그림 이름, 프레임 ms, face: 1 = 오른쪽을 봄 — 그림은 모두 왼쪽 보기) ───────── */
const CAT = {
  type: { f: rng('cat_type', 6), ms: 125, loop: 1, face: 1 }, // 책상 화면 쪽
  scroll: { f: ['fam:cat-scroll'], face: -1 }, // 검수 의자 쪽으로 내밂
  lookup: { f: rng('cat_lookup', 3), ms: 330, face: -1 }, // 환기구를 올려다봄 (한 번 돌고 마지막 자세로)
  sit: { f: rng('cat_sit', 2), ms: 1100, loop: 1, face: 1 }, // 꼬리 탁탁
  sleep: { f: rng('cat_sleep', 2), ms: 1800, loop: 1, face: 1 },
  loaf: { f: rng('cat_loaf', 2), ms: 1600, loop: 1, face: 1 },
  groom: { f: rng('cat_groom', 4), ms: 320, loop: 1, face: 1 },
};
const IDLE = [['loaf', 24000], ['sleep', 24000], ['groom', 7000]]; // 일이 없을 때 천천히 번갈아
const KING = { sit: 'king-sit', chin: 'king-chin', doze: 'king-doze', seal: 'king-seal', cheer: 'king-cheer' };

/* ───────── 상태 → 자세 ───────── */
const has = (d, st) => d.tasks.some(t => t.stage === st);
export function poses(d) {
  const busy = k => d.roles[k] === 'busy';
  const cat = busy('implement') ? 'type' : d.factory.limit ? 'sleep' : has(d, 'relay') ? 'scroll' : has(d, 'question') ? 'lookup' : has(d, 'ready') ? 'sit' : 'idle';
  const king = d.factory.blocked ? 'chin' : has(d, 'human_review') ? 'listen' : has(d, 'approval') ? 'hold' : d.tasks.length ? 'sit' : 'doze';
  return {
    cat, king,
    beacon: d.factory.blocked,
    vent: king === 'listen' ? 'look' : king === 'hold' ? 'hmm' : null,
    chest: d.factory.limit ? 'closed' : 'open',
    magpie: has(d, 'deploy'),
    review: busy('review') || has(d, 'review') || has(d, 'image_check'), // 2b 검은 고양이 자리 — 지금은 돋보기 반짝
    easel: busy('image') || has(d, 'image'), // 2b 붓 고양이 자리 — 지금은 붓 자국
  };
}

/* ───────── 바뀐 것 (지난번 본 것 → 지금) ───────── */
const snap = d => ({
  done: d.stats.done, rejected: d.stats.rejected,
  approval: d.tasks.filter(t => t.stage === 'approval').length,
  after: d.tasks.filter(t => t.stage !== 'approval').length, // ready·그 뒤 단계
});
const grew = (a, b) => typeof a === 'number' && typeof b === 'number' && b > a;
export function changes(prev, d) {
  if (!prev)
    return [];
  const s = snap(d), out = [];
  if (typeof prev.approval === 'number' && s.approval < prev.approval && s.after > prev.after)
    out.push('seal');
  if (grew(prev.rejected, s.rejected))
    out.push('toss');
  if (grew(prev.done, s.done))
    out.push('cheer');
  return out;
}
const recall = () => {
  try {
    const s = JSON.parse(localStorage.getItem(SEEN));
    return s && typeof s === 'object' ? s : null;
  }
  catch (e) {
    return null;
  }
};
const remember = s => {
  try {
    localStorage.setItem(SEEN, JSON.stringify(s));
  }
  catch (e) { }
};

/* ───────── 도우미 ───────── */
const el = (tag, cls) => {
  const n = document.createElement(tag);
  n.className = cls;
  return n;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const preload = src => {
  const i = new Image();
  i.src = src;
};

// 그림 한 장 자리: at(바탕 픽셀)에 그림의 기준점(ax, ay)을 맞추고 s배. face 1이면 기준점에서 좌우 뒤집기
function sprite(layer, cls) {
  const n = el('img', 'fs ' + cls);
  n.alt = '';
  n.decoding = 'async';
  n.draggable = false;
  n.onerror = () => n.classList.add('gone');
  n.onload = () => n.classList.remove('gone');
  layer.append(n);
  let cur = '';
  return {
    n,
    put(src, [w, h, ax, ay], [x, y], s, face) {
      if (src !== cur)
        n.src = cur = src;
      Object.assign(n.style, { left: x - ax * s + 'px', top: y - ay * s + 'px', width: w * s + 'px', height: h * s + 'px', transformOrigin: ax * s + 'px ' + ay * s + 'px' });
      n.classList.toggle('flip', face > 0);
      n.hidden = false;
    },
    hide() {
      n.hidden = true;
    },
  };
}

/* ───────── 식구 ───────── */
export function makeFamily(sc, cfg, { RM, lang }) {
  const F = cfg.fam;
  if (!F)
    return { set() { }, typing: () => false };
  const say = STR.vent[lang];
  const layer = el('div', 'fam');
  sc.append(layer);
  let FM = {}, RMETA = {}; // f/meta.json · r/meta.json
  const art = name => name.startsWith('fam:') ? F.art[name.slice(4)] : FM[name];
  const src = name => name.startsWith('fam:') ? FAM + name.slice(4) + '.webp?v=' + cfg.v : ROOM_F + name + '.webp';
  // 그림 → 바탕 배율: 거실 프레임은 F.k, 새 그림은 F.k / px(그림 px ÷ 거실 프레임 px)
  const scaleOf = name => {
    const a = art(name);
    return a ? F.k / (a[4] || 1) : 0;
  };
  const draw = (sp, name, at, face) => {
    const a = art(name);
    if (!a || !at)
      return sp.hide();
    sp.put(src(name), a, at, scaleOf(name), face);
  };
  const prop = (sp, name, at, w, meta) => { // 거실 소품(r/)·새 소품: 폭 w(바탕 px), 바닥 가운데 기준
    if (!meta || !at)
      return sp.hide();
    const s = w / meta[0];
    sp.put(name, [meta[0], meta[1], meta[2] ?? meta[0] / 2, meta[3] ?? meta[1]], at, s, -1);
  };

  // 빈자리 표시 (2b 식구 자리): 의자 위 돋보기 반짝 · 이젤 위 붓 자국
  const mark = (cls, at) => {
    const n = el('i', 'mark ' + cls);
    if (at)
      Object.assign(n.style, { left: at[0] + 'px', top: at[1] + 'px' });
    n.hidden = true;
    layer.append(n);
    return at ? n : null;
  };
  const review = mark('loupe', F.review), easel = mark('brush', F.easel);
  // 경광등: 상황판 위 왕관 옆
  const beacon = mark('beacon', F.beacon);
  // 금붕생이: 어항 뒤판 · 금붕어 · 앞판, 옆에 보물상자
  const bowlB = sprite(layer, 'bowl'), fish = sprite(layer, 'fish'), bowlF = sprite(layer, 'bowl'), chest = sprite(layer, 'chest');
  // 쥐야쥐 왕 (+ 손에 든 두루마리)
  const king = sprite(layer, 'king'), held = el('i', 'scroll rolled');
  held.hidden = true;
  layer.append(held);
  // 강고양이 씨
  const cat = sprite(layer, 'cat');
  // 까치
  const bird = sprite(layer, 'bird');
  // 만득 씨 말풍선 (환기구 아래)
  const bub = el('p', 'say');
  bub.hidden = true;
  if (F.vent)
    Object.assign(bub.style, { left: F.vent[0] + 'px', top: F.vent[1] + 'px' });
  layer.append(bub);
  if (F.scroll) // 코드 두루마리 크기 (base.css .scroll)
    for (const [k, [w, h]] of [['roll', F.scroll.rolled], ['open', F.scroll.size]]) {
      layer.style.setProperty(`--${k}-w`, w + 'px');
      layer.style.setProperty(`--${k}-h`, h + 'px');
    }

  /* ── 지금 상태 */
  let P = null, over = null, t0 = performance.now(), catSince = t0, ventAt = 0, ready = false, prev = null;
  const busyQ = [];
  let running = false;

  const catPose = now => {
    if (P.cat !== 'idle')
      return P.cat;
    const all = IDLE.reduce((s, x) => s + x[1], 0);
    let t = (now - catSince) % all;
    for (const [k, ms] of IDLE) {
      if (t < ms)
        return k;
      t -= ms;
    }
    return IDLE[0][0];
  };
  const catFrame = (c, now) => {
    if (c.f.length === 1 || RM)
      return c.loop || c.f.length === 1 ? c.f[0] : c.f[c.f.length - 1];
    const i = Math.floor((now - catSince) / c.ms);
    return c.loop ? c.f[i % c.f.length] : c.f[Math.min(i, c.f.length - 1)];
  };

  const kingName = () => 'fam:' + KING[over || (P.king === 'listen' || P.king === 'hold' ? 'sit' : P.king)];
  const putHeld = () => {
    const show = !over && P.king === 'hold' && F.paws && F.king;
    held.hidden = !show;
    if (show) {
      const s = scaleOf('fam:king-sit'), a = F.art['king-sit'];
      Object.assign(held.style, { left: F.king[0] + (F.paws[0] - a[2]) * s + 'px', top: F.king[1] + (F.paws[1] - a[3]) * s + 'px' });
    }
  };

  const fishAt = now => { // 어항 물속 가운데에서 천천히 왔다 갔다 (한숨이면 바닥 쪽에 가만히)
    const B = F.bowl, m = RMETA.fishbowl_back;
    const w = B.w, h = w * m[1] / m[0], x0 = B.at[0] - w / 2, y0 = B.at[1] - h;
    const [cx, cy, rx, ry] = B.water;
    const sigh = P.chest === 'closed';
    const ph = RM || sigh ? 0 : (now - t0) / 9000 * Math.PI * 2;
    const x = x0 + (cx + Math.sin(ph) * rx * 0.55) * w, y = y0 + (cy + (sigh ? ry * 0.5 : Math.sin(ph * 2) * ry * 0.2)) * h;
    return { x, y, face: Math.cos(ph) > 0 ? 1 : -1, sigh };
  };

  const frame = () => {
    if (!P || !ready)
      return;
    const now = performance.now();
    // 강고양이
    if (F.cat) {
      const c = CAT[catPose(now)];
      draw(cat, catFrame(c, now), F.cat, c.face);
    }
    // 쥐야쥐 왕
    if (F.king) {
      draw(king, kingName(), F.king, -1);
      king.n.classList.toggle('lean', !over && P.king === 'listen');
      king.n.classList.toggle('doze', !over && P.king === 'doze' && !RM);
      putHeld();
    }
    // 금붕생이 + 보물상자
    if (F.bowl && RMETA.fishbowl_back) {
      prop(bowlB, ROOM_R + 'fishbowl_back.webp', F.bowl.at, F.bowl.w, RMETA.fishbowl_back);
      const f = fishAt(now), name = f.sigh ? 'fish_sigh_1' : RM || Math.floor(now / 330) % 2 ? 'fish_swim_1' : 'fish_swim_2';
      const m = RMETA[name], base = RMETA.fish_swim_1;
      if (m && base) // 금붕어 길이 = 어항 폭 × fish (헤엄 그림 기준, 다른 자세도 같은 배율)
        fish.put(ROOM_R + name + '.webp', [m[0], m[1], m[0] / 2, m[1] / 2], [f.x, f.y], F.bowl.w * F.bowl.fish / base[0], f.sigh ? -1 : f.face);
      prop(bowlF, ROOM_R + 'fishbowl_front.webp', F.bowl.at, F.bowl.w, RMETA.fishbowl_front);
    }
    if (F.chest) {
      const k = 'chest-' + P.chest;
      prop(chest, FAM + k + '.webp?v=' + cfg.v, F.chest.at, F.chest.w, F.art[k]);
    }
    // 까치: 배포 대기면 횃대에서 기다림(앉기 · 가끔 쪼기). 날아가는 중이면 그쪽이 그린다
    if (F.magpie && !bird.flying) {
      if (P.magpie) {
        const peck = !RM && (now - t0) % 5200 > 4500;
        const name = 'fx/magpie_' + (peck ? 'peck' : 'sit'), m = RMETA[name];
        prop(bird, ROOM_R + name + '.webp', F.magpie.at, F.magpie.w * (m ? m[0] : 1) / 194, m);
      }
      else
        bird.hide();
    }
    if (review)
      review.hidden = !P.review;
    if (easel)
      easel.hidden = !P.easel;
    if (beacon)
      beacon.hidden = !P.beacon;
    // 만득 씨: 귀 기울임·두루마리 기다림이면 처음 한 번 + 가끔
    if (P.vent && now - ventAt > (F.ventEvery || 40) * 1000 && !over) {
      ventAt = now;
      speak(say[P.vent]);
    }
  };

  let bubT = 0;
  const speak = text => {
    if (!F.vent)
      return;
    clearTimeout(bubT);
    bub.textContent = text;
    bub.hidden = false;
    bub.classList.remove('in');
    void bub.offsetWidth;
    bub.classList.add('in');
    bubT = setTimeout(() => (bub.hidden = true), 3200);
  };

  /* ── 한 번씩: 왕 한 팔 번쩍 → 까치 날아감 / 옥새 쾅 + 펼친 두루마리 / 두루마리 둘둘 던짐 */
  const fx = (cls, [x, y]) => {
    const n = el('i', cls);
    Object.assign(n.style, { left: x + 'px', top: y + 'px' });
    layer.append(n);
    return n;
  };
  const kingPt = (name, pt) => { // 왕 그림 안의 점 → 바탕 좌표
    const a = F.art[name], s = scaleOf('fam:' + name);
    return [F.king[0] + (pt[0] - a[2]) * s, F.king[1] + (pt[1] - a[3]) * s];
  };
  const ACT = {
    async cheer() {
      over = 'cheer';
      frame();
      await wait(RM ? 1500 : 700);
      if (F.magpie && RMETA['fx/magpie_fly']) {
        const m = RMETA['fx/magpie_fly'];
        bird.flying = true;
        prop(bird, ROOM_R + 'fx/magpie_fly.webp', F.magpie.at, F.magpie.w * m[0] / 194, m);
        if (!RM) {
          const [dx, dy] = [F.magpie.away[0] - F.magpie.at[0], F.magpie.away[1] - F.magpie.at[1]];
          const a = bird.n.animate([
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${dx * 0.4}px,${dy * 0.7}px) scale(.85)`, opacity: 1, offset: 0.5 },
            { transform: `translate(${dx}px,${dy}px) scale(.5)`, opacity: 0 },
          ], { duration: 1800, easing: 'ease-in' });
          await a.finished.catch(() => { });
        }
        bird.hide();
        bird.flying = false;
      }
      else
        await wait(800);
      over = null;
    },
    async seal() {
      over = 'seal';
      frame();
      speak(say.good);
      const paper = F.scroll && fx('scroll open', F.scroll.open);
      if (paper && !RM)
        paper.animate([{ transform: 'translate(-50%,-50%) scaleX(.15)' }, { transform: 'translate(-50%,-50%) scaleX(1)' }], { duration: 350, easing: 'ease-out' });
      await wait(450);
      if (paper)
        paper.classList.add('sealed'); // 빨간 도장 자국
      const bang = F.art['king-seal'] && F.stamp && fx('bang', kingPt('king-seal', F.stamp));
      if (!RM)
        king.n.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(2px)', offset: 0.3 }, { transform: 'translateY(0)' }], { duration: 260 });
      await wait(1300);
      if (bang)
        bang.remove();
      over = null;
      frame();
      await wait(900);
      if (paper)
        paper.remove();
    },
    async toss() {
      over = 'cheer';
      frame();
      if (!F.scroll || !F.hand)
        return wait(1400).then(() => (over = null));
      const from = kingPt('king-cheer', F.hand), to = F.scroll.land;
      const roll = fx('scroll rolled toss', from);
      if (!RM) {
        const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
        await roll.animate([
          { transform: 'translate(-50%,-50%) rotate(0)' },
          { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 60}px)) rotate(360deg)`, offset: 0.45 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(720deg)` },
        ], { duration: 900, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => { });
      }
      else
        Object.assign(roll.style, { left: to[0] + 'px', top: to[1] + 'px' });
      over = null;
      frame();
      await wait(2200);
      roll.remove();
    },
  };
  const run = async () => {
    if (running)
      return;
    running = true;
    while (busyQ.length) {
      try {
        await ACT[busyQ.shift()]();
      }
      catch (e) {
        over = null;
      }
      frame();
    }
    running = false;
  };

  /* ── 시작: 거실 meta 두 개를 받고 나서 그린다 (못 받으면 거실 그림 식구만 안 보임) */
  const getJSON = u => fetch(u, { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
  Promise.all([getJSON(ROOM_F + 'meta.json'), getJSON(ROOM_R + 'meta.json')]).then(([f, r]) => {
    FM = f;
    RMETA = r;
    ready = true;
    for (const c of Object.values(CAT))
      c.f.forEach(n => art(n) && preload(src(n)));
    for (const k of Object.values(KING))
      preload(src('fam:' + k));
    frame();
  });
  setInterval(frame, RM ? 1000 : 110);

  return {
    // d: 지금 상태, demo: 데모 쪽(지난번 = 바로 앞 쪽, 저장 안 함)
    set(d, demo) {
      const p = poses(d);
      if (!P || p.cat !== P.cat)
        catSince = performance.now();
      if (!P || p.vent !== P.vent)
        ventAt = 0;
      P = p;
      const before = demo ? prev : recall();
      const s = snap(d);
      if (demo)
        prev = s;
      else
        remember(s);
      busyQ.push(...changes(before, d));
      frame();
      run();
    },
    typing: () => !!P && P.cat === 'type',
  };
}
