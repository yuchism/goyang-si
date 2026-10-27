/* 할로윈(10/24 ~ 10/31 밤이 끝날 때, calendar.js · time.js의 holiday): 호박 불빛, 창밖 박쥐, 고양이 마녀와 박쥐 수행단, 커튼 유령 그림자
   자세한 내용은 HALLOWEEN_PLAN.md, 고친 것은 HALLOWEEN_FIX_PLAN.md. 공포 영화 특집은 r/tv/programs.json(horror의 "special": [["할로윈", "22:00"]])과 r/tv/schedule.json(기간 할로윈) */
import { WIN, skyRnd, wy } from './win.js';
import { play } from './anim.js';
import { ghostFree } from './behave.js';
import { assetsWarm, imageReady, img } from './assets.js';
import { curtainSkew, drawProp } from './draw.js';
import { tr } from './i18n.js';
import { O, PL, S, objView, present, zOf } from './objects.js';
import { cv, ctx } from './stage.js';
import { drawSkySprite } from './sprites.js';
import { canStart } from './events.js';
import { bub, fn, go, hold, run, until } from './steps.js';
import { batTime, holiday, isNight, momentNow, moonPhase, nightOf, now, rainNow } from './time.js';
import { INK, RM, clamp, pick, rnd } from './util.js';
import { after, caption, cat, say, world } from './world.js';
export const isHalloween = d => holiday(d) === 'halloween';
// 박쥐·유령은 time.js batTime(해 진 뒤 18분 ~ 동틀 녘 시작), 마녀는 isNight(해 진 뒤 30분 ~ 동틀 녘 시작). 유령 횟수·10/31 마녀는 하룻밤(time.js nightOf)으로 센다
const flick = () => RM ? 1 : 1 + 0.06 * Math.sin(world.t * 2.3) + 0.04 * Math.sin(world.t * 5.9 + 1.3); // 촛불처럼 ±10%
/* ───────── 호박 불빛 ───────── */
// 불 켜진 그림은 따로 쓰지 않는다(HALLOWEEN_FIX_PLAN.md 2-1). 원본 그림에서 뚫린 눈(귀 모양)·입의 연주황 픽셀만
// 골라 노란 불빛 마스크를 한 번 만들어 두고, 어둠 위에 덧그려서 안에서 촛불이 비치는 것처럼 한다
let glowMask = null;
function pumpkinMask(im) {
  if (glowMask !== null)
    return glowMask;
  try {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const on = p[i] > 220 && p[i + 1] > 150 && p[i + 2] < 150 && p[i + 3] > 200;
      p[i] = 255; p[i + 1] = 228; p[i + 2] = 105; p[i + 3] = on ? 255 : 0;
    }
    x.putImageData(d, 0, 0);
    glowMask = c;
  }
  catch (e) {
    glowMask = false; // file:// 등으로 픽셀을 못 읽으면 마스크 없이(몸통 빛만)
  }
  return glowMask;
}
// 어둠을 덮은 뒤에 부른다: 불 켜진 호박을 다시 밝게 그리고, 눈·입에 노란 불빛, 둘레 벽·TV 윗면에 옅은 주황빛
export function drawPumpkinGlow(dk) {
  const o = O.pumpkin;
  if (!o || !present(o) || dk < 0.04)
    return;
  const v = objView(o);
  if (v.state !== 'lit')
    return;
  const im = img(v.look);
  if (!imageReady(im))
    return;
  const f = flick(), w = v.pos.w, h = w * im.height / im.width, by = v.pos.y - zOf(o);
  ctx.save();
  // 몸통은 어둠 속에서 은은하게, 안에서 빛나는 눈·입은 더 밝게(더하기로 한 번 더)
  ctx.globalAlpha = clamp(dk * 0.95, 0, 0.7);
  drawProp(v.look, v.pos.x, by, w);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp(dk * 0.45 * f, 0, 0.35);
  drawProp(v.look, v.pos.x, by, w);
  // 눈·입: 촛불 노란빛 (그림 위치는 drawProp과 같게: 가운데 아래 기준)
  const mk = pumpkinMask(im);
  if (mk) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = clamp(dk * 1.6 * f, 0, 0.9);
    ctx.drawImage(mk, v.pos.x - w / 2, by - h, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(dk * 0.5 * f, 0, 0.3);
    ctx.drawImage(mk, v.pos.x - w / 2, by - h, w, h);
  }
  ctx.globalAlpha = 1;
  const cx = v.pos.x, cy = by - h * 0.42, R = 170;
  const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, R);
  g.addColorStop(0, `rgba(255,150,60,${0.3 * dk * f})`);
  g.addColorStop(0.45, `rgba(255,130,50,${0.1 * dk * f})`);
  g.addColorStop(1, 'rgba(255,130,50,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
}
// 스탠드도 TV도 꺼진 할로윈 밤: 방을 조금 더 어둡게 해서 호박빛만 남게
export function pumpkinNight() {
  const o = O.pumpkin;
  return !!(o && present(o) && objView(o).state === 'lit' && !world.lampOn && !(world.tv.st && world.tv.st.mode !== 'off'));
}
/* 밤하늘 실루엣 대비(달빛 테두리)는 sprites.js drawSkySprite (검은 고양이도 같이 쓴다, WINDOW_PLAN.md 5-2) */
/* ───────── 박쥐 ───────── */
// 지그재그: 위아래로 짧게 꺾이는 삼각파
const zig = u => 2 * Math.abs(2 * (u - Math.floor(u + 0.5))) - 1;
function drawBat(x, y, sc, ph, alpha) {
  const name = 'fx/bat_' + [1, 2, 3, 2][Math.floor(ph) % 4], im = img(name);
  if (!imageReady(im))
    return;
  const bw = 46 * sc, bh = bw * im.height / im.width;
  drawSkySprite(name, im, x - bw / 2, y - bh / 2, bw, bh, alpha);
}
export function startBats() {
  if (world.bats)
    return;
  const dir = Math.random() < 0.5 ? 1 : -1, n = Math.random() < 0.5 ? 2 : 3, far = Math.random() < 0.4;
  world.bats = { t: 0, dur: rnd(5, 7.5), dir, y: skyRnd('bats'), far, m: Array.from({ length: n }, (_, i) => ({ back: i * rnd(26, 42), dy: rnd(-24, 24), ph: rnd(0, 1), fq: rnd(1.6, 2.4), wing: rnd(0, 4), sc: rnd(0.85, 1.1) })) };
  after(() => {
    if (world.bats && cat.tag === 'window' && !cat.closed)
      say(cat, '👀', 2.5);
  }, 1.5);
}
export function maybeBats(d, dt) {
  if (world.bats) {
    world.bats.t += dt;
    if (world.bats.t > world.bats.dur)
      world.bats = null;
    return;
  }
  if (!isHalloween(d) || !batTime(d) || rainNow(d) || !canStart('skySmall'))
    return; // 하늘에 큰 것(마녀·UFO·산타·비행기)이 있으면 안 나온다 (events.js 교통정리)
  const first = world.batEve !== nightOf(d); // 그 밤 첫 무리는 곧 (2분에 한 번 꼴), 그 뒤는 25분에 한 번 꼴 (tasks/halloween-nightly.md)
  if (Math.random() < dt / (first ? 120 : 1500)) {
    world.batEve = nightOf(d);
    startBats();
  }
}
function drawBats(w) {
  const b = world.bats;
  if (!b)
    return;
  const k = b.t / b.dur, lead = b.dir > 0 ? w.x - 60 + k * (w.w + 200) : w.x + w.w + 60 - k * (w.w + 200);
  b.m.forEach(m => {
    const x = lead - b.dir * m.back, y = b.y + m.dy + zig(b.t * m.fq + m.ph) * 9;
    drawBat(x, y, m.sc * (b.far ? 0.65 : 1), b.t * 11 + m.wing, b.far ? 0.7 : 0.95);
  });
}
/* ───────── 고양이 마녀 (산타 썰매와 같은 구조) + 박쥐 수행단 ───────── */
export function startWitch(shadow) {
  if (world.witch || world.curtainShadow)
    return;
  world.bats = null;
  if (shadow == null)
    shadow = !rainNow(now()) && Math.random() < 0.3;
  if (shadow) { // 가끔 반전: 오른쪽 커튼에 크게 부풀린 그림자가 먼저 비치고, 곧 창밖에 작게 지나간다
    world.curtainShadow = { kind: 'witch', id: 'curtain_r', t: 0, dur: 3.4 };
    return;
  }
  world.witch = { t: 0, dur: rnd(22, 30), y: skyRnd('witch'), m: Array.from({ length: pick([3, 4]) }, (_, i) => ({ lag: 0.012 + i * 0.01, or: rnd(18, 34), ph: rnd(0, 6), wing: rnd(0, 4), sc: rnd(0.55, 0.75) })) };
  after(() => {
    if (!world.witch || world.manduk || cat.inBox)
      return;
    if (cat.tag === 'window' && !cat.closed)
      run(cat, [
        fn(a => {
          a.face = -1;
          say(a, '👀‼️', 4);
        }),
        play('lookup', 8),
        hold(3, 'stand'),
        hold(10, 'loaf')
      ], 'witch');
    else if (!cat.closed && cat.dp === 'loaf' && !cat.act && !cat.moving)
      cat.react = { f: 'tv_ear_turn', t: 1.5 }; // 귀 쫑긋
  }, 6);
}
export function maybeWitch(d, dt) {
  if (world.witch) {
    world.witch.t += dt;
    if (world.witch.t > world.witch.dur)
      world.witch = null;
    return;
  }
  if (!isHalloween(d) || !canStart('curtain'))
    return; // 커튼 자리(유령 그림자)가 비어 있어야 한다 (마녀 반전 그림자가 같은 자리를 쓴다)
  if (!isNight(d))
    return;
  // 할로윈 기간 매일 밤 9시 이후에는 꼭 한 번 (calendar.js halloweenNight. 자정을 넘어도 같은 밤, tasks/halloween-nightly.md). 특별한 순간: 쉼·천둥을 무시하고 지나가는 큰 것만 기다린다
  if (momentNow('halloweenNight', d) && world.witchEve !== nightOf(d)) {
    if (!canStart('sky', { special: true }))
      return;
    world.witchEve = nightOf(d);
    return startWitch();
  }
  if (canStart('sky') && Math.random() < dt / (2 * 3600))
    startWitch();
}
// 마녀 그림은 1번 한 장만 쓴다. 2번은 몸·빗자루 각도가 달라 번갈아 쓰면 자세가 툭툭 바뀌어 보여서,
// 대신 코드로 아주 작게 기울어 흔들리게 한다 (±2.5도, 1.3초 주기). HALLOWEEN_FIX_PLAN.md 2-2
const WITCH = 'fx/witch_1';
const witchTilt = () => RM ? 0 : 2.5 * Math.PI / 180 * Math.sin(world.t * 2 * Math.PI / 1.3);
function witchAt(w, k, y0) {
  return [w.x + w.w + 100 - k * (w.w + 280), y0 - Math.sin(k * Math.PI) * 28 + Math.sin(k * Math.PI * 7) * 6];
}
function drawWitch(w) {
  const u = world.witch;
  if (!u)
    return;
  const k = u.t / u.dur, im = img(WITCH);
  if (!imageReady(im))
    return;
  const sw = 150, sh = sw * im.height / im.width, [x, y] = witchAt(w, k, u.y);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(witchTilt());
  drawSkySprite(WITCH, im, -sw / 2, -sh / 2, sw, sh, world.skyDark > 0.3 ? 0.95 : 0.8);
  ctx.restore();
  // 수행단: 마녀보다 살짝 늦게, 주위를 맴돌며 흩어졌다 모인다
  u.m.forEach((m, i) => {
    const [bx, by] = witchAt(w, Math.max(0, k - m.lag), u.y), sp = 0.6 + 0.4 * Math.sin(world.t * 0.9 + m.ph);
    drawBat(bx + 40 + Math.cos(world.t * 1.7 + m.ph) * m.or * sp, by - 10 + Math.sin(world.t * 2.2 + m.ph * 1.3) * m.or * 0.8 * sp + zig(world.t * 2 + i * 0.3) * 4, m.sc, world.t * 11 + m.wing, 0.9);
  });
}
/* ───────── 커튼 그림자 (이불 유령 / 마녀 반전) ───────── */
export function startGhost() {
  if (world.curtainShadow || world.witch)
    return;
  const id = pick(['curtain_l', 'curtain_r']);
  world.curtainShadow = { kind: 'ghost', id, t: 0, dur: rnd(7, 9), y: wy(rnd(...WIN.curtain.ghostY)) };
  const nk = nightOf(now());
  world.ghostNight = world.ghostNight && world.ghostNight.k === nk ? { k: nk, n: world.ghostNight.n + 1 } : { k: nk, n: 1 };
  if (Math.random() < 0.5)
    after(() => world.curtainShadow && caption(tr('capGhost'), 2.5), 1.2);
  after(() => ghostReaction(id), 1.6);
}
// 강고양이 씨: 깜짝 → 확인하러 감 → 이미 없음 → 시무룩 또는 그루밍 (TV 큰 사건을 늘 놓치는 것과 같은 개그)
function ghostReaction(id) {
  const o = O[id];
  if (!o || !world.curtainShadow || world.manduk || cat.closed || cat.inBox || cat.onTV || cat.typing || cat.dance || !ghostFree(cat))
    return;
  const left = id === 'curtain_l', spot = S(id + '.ghost'), cx = o.pos.x;
  run(cat, [
    fn(a => {
      a.face = cx > a.x ? 1 : -1;
    }),
    play('startle'),
    bub('‼️', 1.6),
    go(spot[0], spot[1], 85),
    until(() => !world.curtainShadow, 15),
    fn(a => {
      a.face = cx > a.x ? 1 : -1;
    }),
    play('lookup', 2),
    bub('❓', 2.2),
    ...(Math.random() < 0.55 ? [play('sulk', rnd(10, 20)), bub('😑', 2.5)] : [play('groom', rnd(4, 7))]),
    hold(rnd(8, 20), 'loaf')
  ], 'ghost');
}
export function maybeGhost(d, dt) {
  const s = world.curtainShadow;
  if (s) {
    s.t += dt;
    if (s.t >= s.dur) {
      world.curtainShadow = null;
      if (s.kind === 'witch')
        startWitch(false);
    }
    return;
  }
  if (!isHalloween(d) || !batTime(d) || rainNow(d) || world.witch || moonPhase(d).lit < 0.1)
    return; // 달이 떠 있는 밤에만 (빛나는 비율 10% 이상, MOON_PLAN.md 7장). 그믐 무렵엔 유령도 쉰다
  const g = world.ghostNight, n = g && g.k === nightOf(d) ? g.n : 0;
  if (n >= 4)
    return; // 하룻밤에 네 번까지
  if (Math.random() < dt / (n ? 3600 : 12 * 60)) // 그 밤 첫 유령은 곧(12분에 한 번 꼴), 그 뒤는 1시간에 한 번 꼴 (tasks/halloween-nightly.md)
    startGhost();
}
// 그림을 어두운 단색 실루엣으로 (한 번 만들어 둔다)
const tintC = {};
function silhouette(name) {
  if (tintC[name])
    return tintC[name];
  const im = img(name);
  if (!imageReady(im))
    return null;
  const c = document.createElement('canvas');
  c.width = im.width;
  c.height = im.height;
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#140f1c';
  x.fillRect(0, 0, c.width, c.height);
  return tintC[name] = c;
}
const tmpc = document.createElement('canvas'), tmx = tmpc.getContext('2d');
// 어둠을 덮은 뒤에 부른다: 커튼 모양으로 잘라서 그림자를 비춘다. 유리 쪽으로는 넘어가지 않는다
export function drawCurtainShadow(dk) {
  const s = world.curtainShadow;
  if (!s)
    return;
  const o = O[s.id], v = o && objView(o), cim = v && img(v.img);
  if (!v || !imageReady(cim))
    return;
  const k = s.t / s.dur, cw = v.pos.w, inner = s.id === 'curtain_l' ? cw : 0; // 유리와 맞닿은 쪽 가장자리
  let sil, gx, gy, gw, alpha;
  if (s.kind === 'ghost') {
    // 유리 쪽 가장자리에서 빼꼼 들어왔다가 천천히 빠져나간다
    const io = k < 0.3 ? k / 0.3 : k > 0.7 ? (1 - k) / 0.3 : 1, e = io * io * (3 - 2 * io), into = s.id === 'curtain_l' ? -1 : 1;
    sil = silhouette('fx/ghost_' + (RM ? 1 : Math.floor(world.t * 1.6) % 2 + 1));
    gw = 96;
    gx = inner + into * (-gw * 0.45 + e * gw * 0.75);
    gy = s.y + Math.sin(world.t * 1.3) * 5;
    alpha = 0.58 * clamp(Math.min(k / 0.12, (1 - k) / 0.12), 0, 1);
  }
  else {
    // 마녀 반전: 크게, 흐리게. 오른쪽에서 왼쪽으로 커튼을 스쳐 지나간다
    sil = silhouette(WITCH);
    gw = 260;
    gx = cw + gw * 0.5 - k * (cw + gw);
    gy = wy(WIN.curtain.witchY) - Math.sin(k * Math.PI) * 20;
    alpha = 0.42 * clamp(Math.min(k / 0.15, (1 - k) / 0.15), 0, 1);
  }
  if (!sil || alpha <= 0)
    return;
  const gh = gw * sil.height / sil.width, m = ctx.getTransform(), sk = curtainSkew(v);
  if (tmpc.width !== cv.width || tmpc.height !== cv.height) {
    tmpc.width = cv.width;
    tmpc.height = cv.height;
  }
  tmx.setTransform(1, 0, 0, 1, 0, 0);
  tmx.clearRect(0, 0, tmpc.width, tmpc.height);
  tmx.setTransform(m);
  tmx.translate(v.pos.x - cw / 2, 0);
  tmx.transform(1, 0, sk, 1, -sk * wy(WIN.curtain.pivotY), 0);
  tmx.globalCompositeOperation = 'source-over';
  tmx.drawImage(cim, 0, -30, cw, v.pos.y + 30); // 커튼 모양
  tmx.globalCompositeOperation = 'source-in';
  tmx.globalAlpha = alpha * (0.75 + 0.25 * clamp(dk / 0.6, 0, 1));
  tmx.filter = s.kind === 'witch' ? 'blur(5px)' : 'blur(1.5px)';
  if (s.kind === 'witch') {
    tmx.translate(gx, gy);
    tmx.rotate(witchTilt());
    tmx.drawImage(sil, -gw / 2, -gh / 2, gw, gh);
  }
  else
    tmx.drawImage(sil, gx - gw / 2, gy - gh / 2, gw, gh);
  tmx.filter = 'none';
  tmx.globalAlpha = 1;
  tmx.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(tmpc, 0, 0);
  ctx.restore();
}

/* ───────── 사건 목록에 싣는 것 (events.js). 할로윈 기간 밤에만 저절로 생긴다 ───────── */
// 고양이 마녀와 박쥐 수행단 (가끔 커튼 그림자가 먼저). 할로윈 기간 매일 밤 9시 이후엔 꼭 한 번
export const witchEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'witch',
  cls: 'sky',
  active: () => !!world.witch || !!(world.curtainShadow && world.curtainShadow.kind === 'witch'), // 커튼 마녀 그림자가 비치는 순간부터 하늘 자리를 잡는다
  tick: (d, real) => maybeWitch(d, real),
  sky: drawWitch,
  reset() {
    world.witch = null;
  },
  dev: [{ btn: 'dWitch', go: () => startWitch(Math.random() < 0.5) }],
  debug: { startWitch },
};
// 창밖 박쥐 두세 마리 (그 밤 첫 무리는 곧, 그 뒤 25분에 한 번 꼴)
export const batsEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'bats',
  cls: 'skySmall',
  active: () => !!world.bats,
  tick: (d, real) => maybeBats(d, real),
  sky: drawBats,
  reset() {
    world.bats = null;
  },
  dev: [{ btn: 'dBat', go: () => startBats() }],
  debug: { startBats },
};
// 커튼 유령 그림자 (달이 떠 있는 밤, 하룻밤 두 번까지). 마녀 반전 그림자도 이 자리를 쓴다
export const ghostEvent = {
  needs: ['curtain'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'ghost',
  cls: 'curtain',
  active: () => !!world.curtainShadow, // 유령과 마녀 반전 그림자가 커튼 자리 하나를 같이 쓴다
  tick: (d, real) => maybeGhost(d, real),
  shadow: drawCurtainShadow,
  reset() {
    world.curtainShadow = null;
  },
  dev: [{ btn: 'dGhost', go: () => startGhost() }],
  debug: { startGhost },
};

/* ───────── 산 너머 마녀의 집 (tasks/halloween-witch-tower.md) ─────────
   할로윈 기간에만, 먼 산 너머로 가늘고 구불구불한 바위 봉우리가 솟아 있고 그 꼭대기에 작은 마녀의 집이 얹혀 있다.
   낮엔 먼 산처럼 뿌옇게, 밤엔 시커멓게. 집의 창 하나에 촛불(해 질 무렵부터). 마녀가 창밖을 날아가는 동안엔 창 불이 꺼진다(집을 비움).
   밤엔 작은 박쥐 두 마리가 집 둘레를 맴돈다. 정체는 설명하지 않는다.
   산 판보다 먼저 그려(skyBack) 봉우리 밑동이 능선에 가려진다. 자리·크기는 window.json witchTower (창 안 좌표) */
const TOWER = { ink: '27,20,44', day: '146,146,176', rim: 'rgba(206,196,255,.16)', light: '255,200,105', bats: 2 }; // ink: 밤 실루엣, day: 낮(먼 산 연무색)
let towerLit = 1; // 창 불빛 (마녀가 나가면 서서히 꺼지고 돌아오면 켜진다). 진행은 towerTick, 그리기는 읽기만
const TOWER_FADE = 0.8; // 창 불이 다 꺼지거나 켜지는 데 걸리는 초
function towerTick(d, real) {
  const away = !!world.witch || !!(world.curtainShadow && world.curtainShadow.kind === 'witch');
  towerLit = clamp(towerLit + (away ? -1 : 1) * real / TOWER_FADE, 0, 1);
}
function drawWitchTower(w) {
  const T = WIN.witchTower;
  if (!T || holiday(now()) !== 'halloween')
    return false;
  const a = clamp(((world.skyDark || 0) - 0.2) / 0.5, 0, 1); // 밤 정도: 낮엔 먼 산처럼 뿌옇게(0), 어두워질수록 시커멓게(1)
  const x0 = w.x + T.x, base = wy(T.base), h = T.h, bw = T.w / 2, sway = T.sway * h;
  // 봉우리: t 0(밑동) ~ 1(꼭대기). 밑동은 넓게 퍼져 산에 묻히고, 위로 갈수록 가늘어지며 S자로 구불거린다. 꼭대기는 살짝 넓은 턱
  const cx = t => x0 + sway * Math.sin(t * Math.PI * 1.15) * t, cy = t => base - t * h;
  const half = t => bw * (0.13 + 0.87 * Math.pow(1 - t, 2.6)) + (t > 0.9 ? bw * 0.22 * (t - 0.9) / 0.1 : 0);
  const rough = (t, k) => Math.sin(t * 23 + k) * 0.6 + Math.sin(t * 57 + k * 2) * 0.35; // 바위 결 (px)
  const ink = TOWER.day.split(',').map((v, i) => Math.round(+v + (TOWER.ink.split(',')[i] - v) * a)).join(',');
  ctx.save();
  ctx.fillStyle = `rgb(${ink})`;
  ctx.strokeStyle = a > 0.5 ? TOWER.rim : `rgba(${ink},0)`; // 밤엔 달빛 테두리 아주 옅게
  ctx.lineWidth = 1;
  ctx.beginPath();
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    ctx[i ? 'lineTo' : 'moveTo'](cx(t) - half(t) + rough(t, 1), cy(t));
  }
  for (let i = N; i >= 0; i--) {
    const t = i / N;
    ctx.lineTo(cx(t) + half(t) + rough(t, 4), cy(t));
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 꼭대기의 작은 마녀 집: 비뚤게 기운 상자 + 높고 끝이 꺾인 뾰족 지붕 + 굴뚝
  const hx = cx(1), hy = cy(1) + 1, hw = T.house / 2, hh = T.house * 0.7, tilt = -0.08;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);
  ctx.fillStyle = `rgb(${ink})`;
  ctx.beginPath(); // 벽
  ctx.moveTo(-hw, 0);
  ctx.lineTo(-hw * 0.9, -hh);
  ctx.lineTo(hw * 0.95, -hh * 1.05);
  ctx.lineTo(hw, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(hw * 0.35, -hh * 1.9, hw * 0.28, hh * 0.9); // 굴뚝
  ctx.beginPath(); // 지붕: 처마가 조금 나오고, 끝이 옆으로 휘어 꺾인다
  ctx.moveTo(-hw * 1.35, -hh * 0.92);
  ctx.quadraticCurveTo(-hw * 0.2, -hh * 1.6, -hw * 0.05, -hh * 2.6);
  ctx.quadraticCurveTo(hw * 0.2, -hh * 3.2, hw * 1.1, -hh * 3.05); // 꺾인 끝
  ctx.quadraticCurveTo(hw * 0.35, -hh * 2.7, hw * 0.45, -hh * 1.9);
  ctx.quadraticCurveTo(hw * 0.7, -hh * 1.25, hw * 1.35, -hh * 1.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 창 하나: 촛불처럼 일렁인다. 할로윈 자정 손님이 와 있으면 조금 더 밝게 (chime.js world.chimeGlow)
  const lit = towerLit * clamp((a - 0.5) / 0.3, 0, 1); // 창 불은 해 질 무렵부터
  if (lit > 0.01) {
    const wx = -hw * 0.15, wyy = -hh * 0.5, ww = Math.max(1.4, hw * 0.24), wh = ww * 1.6;
    const f = (RM ? 1 : 0.85 + 0.1 * Math.sin(world.t * 3.1) + 0.05 * Math.sin(world.t * 7.7)) * lit * (world.chimeGlow ? 1.4 : 1);
    const g = ctx.createRadialGradient(wx, wyy, 0, wx, wyy, T.house * 1.6);
    g.addColorStop(0, `rgba(${TOWER.light},${0.3 * f})`);
    g.addColorStop(1, `rgba(${TOWER.light},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(wx - T.house * 1.6, wyy - T.house * 1.6, T.house * 3.2, T.house * 3.2);
    ctx.fillStyle = `rgba(${TOWER.light},${Math.min(1, f)})`;
    ctx.fillRect(wx - ww, wyy - wh / 2, ww * 2, wh);
  }
  ctx.restore();
  ctx.restore();
  // 집 둘레를 맴도는 작은 박쥐들 (밤에만. 뒤로 갈 땐 작고 옅게)
  for (let i = 0; a > 0.5 && i < TOWER.bats; i++) {
    const u = world.t * (RM ? 0 : 0.45) + i * (Math.PI * 2 / TOWER.bats), bx = hx + Math.cos(u) * T.house * 2.2, by = hy - hh * 2 + Math.sin(u) * T.house * 0.6 + zig(world.t * 1.7 + i) * 2;
    drawBat(bx, by, 0.18 + 0.05 * Math.sin(u), world.t * 10 + i * 1.3, a * (0.55 + 0.35 * Math.sin(u)));
  }
  return true;
}
export const towerEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'witchTower',
  tick: (d, real) => towerTick(d, real),
  skyBack: drawWitchTower,
};

/* ───────── 천장 거미와 구석 거미줄 (tasks/halloween-room-extras.md 1장) ─────────
   할로윈 기간 밤에 가끔 벽 위 천장에서 작은 거미가 실을 타고 내려와 대롱대롱하다 올라간다. 구석엔 거미줄(기간 내내).
   자리는 objects.json halloween.spider (x, 천장 top, 가장 낮은 곳 low) · halloween.web (구석 x·y, 크기 r, 방향 dir: 1이면 오른쪽 아래로 펼침) */
const SPIDER = { every: 900, down: 5, hang: [7, 14], up: 3.5 }; // 평균 몇 초에 한 번, 내려오기·대롱대롱·올라가기(초)
export function startSpider() {
  const sp = PL('halloween.spider');
  if (world.spider || !sp)
    return;
  world.spider = { t: 0, hang: rnd(SPIDER.hang[0], SPIDER.hang[1]), low: rnd(0.75, 1), seen: false };
}
function spiderTick(d, real, bf) {
  const s = world.spider;
  if (!s) { // 확률은 미리보기 배속을 따른다(다른 사건처럼), 움직임은 3배까지만 (나비와 같음)
    if (isHalloween(d) && isNight(d) && !world.manduk && assetsWarm() && Math.random() < real * bf / SPIDER.every)
      startSpider();
    return;
  }
  if (world.manduk && s.t < SPIDER.down + s.hang) // 만득 씨가 오면 바로 올라간다
    s.t = SPIDER.down + s.hang;
  s.t += real * Math.min(bf, 3);
  if (!s.seen && s.t > SPIDER.down && !cat.closed && !cat.bub && !world.manduk) {
    s.seen = true;
    say(cat, '👀', 3);
  }
  if (s.t > SPIDER.down + s.hang + SPIDER.up)
    world.spider = null;
}
function drawSpiderWeb() {
  const wb = PL('halloween.web');
  if (!wb || !isHalloween(now()))
    return;
  const { x, y, r } = wb, dir = wb.dir || 1;
  ctx.save();
  ctx.strokeStyle = 'rgba(245,240,230,.55)';
  ctx.lineWidth = 1;
  const A = [0, 0.28, 0.55, 0.8, 1].map(k => k * Math.PI / 2); // 구석에서 부채꼴로
  const pt = (k, rr) => [x + dir * Math.cos(A[k]) * rr, y + Math.sin(A[k]) * rr];
  A.forEach((_, k) => {
    const [ex, ey] = pt(k, r);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  });
  for (const f of [0.3, 0.55, 0.8]) { // 처진 가로줄
    ctx.beginPath();
    for (let k = 0; k < A.length; k++) {
      const [px, py] = pt(k, r * f);
      if (!k)
        ctx.moveTo(px, py);
      else {
        const [qx, qy] = pt(k - 1, r * f), mx = (px + qx) / 2 - dir * r * 0.04, my = (py + qy) / 2 - r * 0.04;
        ctx.quadraticCurveTo(mx + (x - mx) * 0.12, my + (y - my) * 0.12, px, py);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}
function drawSpider() {
  drawSpiderWeb();
  const s = world.spider, sp = PL('halloween.spider');
  if (!s || !sp)
    return;
  const { down, up } = SPIDER, t = s.t;
  const k = t < down ? t / down : t < down + s.hang ? 1 : 1 - (t - down - s.hang) / up; // 내려온 정도
  const ease2 = u => u * u * (3 - 2 * u), y = sp.top + (sp.low - sp.top) * s.low * ease2(clamp(k, 0, 1));
  const sw = RM ? 0 : Math.sin(world.t * 1.6) * 3 * (t > down ? 1 : k), x = sp.x + sw, bob = RM ? 0 : Math.sin(world.t * 4.3) * 0.6;
  ctx.save();
  ctx.strokeStyle = 'rgba(240,236,228,.6)'; // 실
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(sp.x, sp.top);
  ctx.lineTo(x, y - 4);
  ctx.stroke();
  ctx.strokeStyle = INK; // 다리 여덟
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++)
    for (const sd of [-1, 1]) {
      const a0 = -0.9 + i * 0.55 + (RM ? 0 : Math.sin(world.t * 6 + i) * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, y + bob);
      ctx.quadraticCurveTo(x + sd * 6 * Math.cos(a0), y + bob - 4 + 7 * Math.sin(a0) - 3, x + sd * 9 * Math.cos(a0 * 0.8), y + bob + 7 * Math.sin(a0) + 2);
      ctx.stroke();
    }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(x, y + 3 + bob, 4.6, 5.4, 0, 0, 7); // 배
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - 3 + bob, 2.8, 0, 7); // 머리
  ctx.fill();
  ctx.restore();
}
export const spiderEvent = {
  needs: ['halloween.spider'], // 장면에 이 자리가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'spider',
  tick: (d, real, bf) => spiderTick(d, real, bf),
  room: drawSpider,
  reset() {
    world.spider = null;
  },
  debug: { startSpider },
};

