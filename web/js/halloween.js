/* 할로윈(10/24 ~ 11/1, time.js의 holiday): 호박 불빛, 창밖 박쥐, 고양이 마녀와 박쥐 수행단, 커튼 유령 그림자
   자세한 내용은 HALLOWEEN_PLAN.md, 고친 것은 HALLOWEEN_FIX_PLAN.md. 공포 영화 특집은 r/tv/programs.json(horror)과 tv-core.js(tvSegs) */
import { play } from './anim.js';
import { imageReady, img } from './assets.js';
import { curtainSkew, drawProp } from './draw.js';
import { tr } from './i18n.js';
import { O, objView, present, zOf } from './objects.js';
import { cv, ctx } from './stage.js';
import { bub, fn, go, hold, run, until } from './steps.js';
import { dayKey, holiday, hourOf, moonPhase, now, rainNow, sunTimes } from './time.js';
import { RM, clamp, pick, rnd } from './util.js';
import { caption, cat, say, world } from './world.js';
export const isHalloween = d => holiday(d) === 'halloween';
// 밤: 해 지고 조금 뒤 ~ 새벽 4시 (박쥐·유령), 마녀는 19시 ~ 4시
const batNight = d => {
  const h = hourOf(d);
  return h >= sunTimes(d)[1] + 0.3 || h < 4;
};
const nightKey = d => dayKey(new Date(d.getTime() - 12 * 3600e3)); // 저녁~새벽을 한 밤으로
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
/* ───────── 밤하늘 실루엣 대비 (HALLOWEEN_FIX_PLAN.md 2-3) ─────────
   박쥐·마녀 그림은 짙은 갈색이라 깊은 밤 남색 하늘에 묻힌다. 어두운 밤일수록(world.dark)
   가장자리에 옅은 달빛 테두리(연노랑, 약 1px)를 두르고 몸도 살짝 밝힌다. 노을 직후처럼 하늘이 밝을 때는 거의 그대로 */
const skyTintC = {};
function skyTint(name, kind) {
  const key = name + kind;
  if (skyTintC[key])
    return skyTintC[key];
  const im = img(name);
  if (!imageReady(im))
    return null;
  const c = document.createElement('canvas');
  c.width = im.naturalWidth;
  c.height = im.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = kind === 'rim' ? 'rgb(255,238,176)' : 'rgba(196,186,232,0.24)';
  x.fillRect(0, 0, c.width, c.height);
  return skyTintC[key] = c;
}
const skyNight = () => clamp((world.dark - 0.35) / 0.4, 0, 1);
// (x, y)는 그림 왼쪽 위. 지금 변환(회전 등) 그대로 그린다
function drawSkySprite(name, im, x, y, w, h, alpha) {
  const nk = skyNight(), rim = nk > 0 && skyTint(name, 'rim'), lift = nk > 0 && skyTint(name, 'lift');
  if (rim) {
    ctx.globalAlpha = alpha * 0.6 * nk;
    for (const [dx, dy] of [[-1.1, 0], [1.1, 0], [0, -1.1], [0, 1.1]])
      ctx.drawImage(rim, x + dx, y + dy, w, h);
  }
  ctx.globalAlpha = alpha;
  ctx.drawImage(im, x, y, w, h);
  if (lift) {
    ctx.globalAlpha = alpha * nk;
    ctx.drawImage(lift, x, y, w, h);
  }
  ctx.globalAlpha = 1;
}
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
  world.bats = { t: 0, dur: rnd(5, 7.5), dir, y: rnd(70, 170), far, m: Array.from({ length: n }, (_, i) => ({ back: i * rnd(26, 42), dy: rnd(-24, 24), ph: rnd(0, 1), fq: rnd(1.6, 2.4), wing: rnd(0, 4), sc: rnd(0.85, 1.1) })) };
  setTimeout(() => {
    if (world.bats && cat.tag === 'window' && !cat.closed)
      say(cat, '👀', 2.5);
  }, 1500);
}
export function maybeBats(d, dt) {
  if (world.bats) {
    world.bats.t += dt;
    if (world.bats.t > world.bats.dur)
      world.bats = null;
    return;
  }
  if (!isHalloween(d) || !batNight(d) || rainNow(d) || world.witch || world.ufo)
    return;
  if (Math.random() < dt / 1500) // 25분에 한 번 꼴
    startBats();
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
  world.witch = { t: 0, dur: rnd(22, 30), y: rnd(70, 120), m: Array.from({ length: pick([3, 4]) }, (_, i) => ({ lag: 0.012 + i * 0.01, or: rnd(18, 34), ph: rnd(0, 6), wing: rnd(0, 4), sc: rnd(0.55, 0.75) })) };
  setTimeout(() => {
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
  }, 6000);
}
export function maybeWitch(d, dt) {
  if (world.witch) {
    world.witch.t += dt;
    if (world.witch.t > world.witch.dur)
      world.witch = null;
    return;
  }
  if (!isHalloween(d) || world.ufo || world.curtainShadow)
    return;
  const h = hourOf(d);
  if (!(h >= 19 || h < 4))
    return;
  const eve = d.getMonth() === 9 && d.getDate() === 31 && h >= 21; // 10/31 밤 9시 이후에는 꼭 한 번
  if (eve && world.witchEve !== dayKey(d)) {
    world.witchEve = dayKey(d);
    return startWitch();
  }
  if (Math.random() < dt / (2 * 3600))
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
  drawSkySprite(WITCH, im, -sw / 2, -sh / 2, sw, sh, world.dark > 0.3 ? 0.95 : 0.8);
  ctx.restore();
  // 수행단: 마녀보다 살짝 늦게, 주위를 맴돌며 흩어졌다 모인다
  u.m.forEach((m, i) => {
    const [bx, by] = witchAt(w, Math.max(0, k - m.lag), u.y), sp = 0.6 + 0.4 * Math.sin(world.t * 0.9 + m.ph);
    drawBat(bx + 40 + Math.cos(world.t * 1.7 + m.ph) * m.or * sp, by - 10 + Math.sin(world.t * 2.2 + m.ph * 1.3) * m.or * 0.8 * sp + zig(world.t * 2 + i * 0.3) * 4, m.sc, world.t * 11 + m.wing, 0.9);
  });
}
// outside.js의 창밖 그리기에서 부른다 (창 영역 안)
export function drawHalloweenSky(w) {
  drawBats(w);
  drawWitch(w);
}
/* ───────── 커튼 그림자 (이불 유령 / 마녀 반전) ───────── */
export function startGhost() {
  if (world.curtainShadow || world.witch)
    return;
  const id = pick(['curtain_l', 'curtain_r']);
  world.curtainShadow = { kind: 'ghost', id, t: 0, dur: rnd(7, 9), y: rnd(190, 260) };
  const nk = nightKey(now());
  world.ghostNight = world.ghostNight && world.ghostNight.k === nk ? { k: nk, n: world.ghostNight.n + 1 } : { k: nk, n: 1 };
  if (Math.random() < 0.5)
    setTimeout(() => world.curtainShadow && caption(tr('capGhost'), 2.5), 1200);
  setTimeout(() => ghostReaction(id), 1600);
}
const NO_GHOST = ['knock', 'zoom', 'chase', 'stalk', 'boxhide', 'greet', 'birthday', 'wait', 'innocent', 'secret', 'box', 'tvrush', 'tvtop', 'ufo', 'santa', 'witch', 'paw', 'ghost'];
// 강고양이 씨: 깜짝 → 확인하러 감 → 이미 없음 → 시무룩 또는 그루밍 (TV 큰 사건을 늘 놓치는 것과 같은 개그)
function ghostReaction(id) {
  const o = O[id];
  if (!o || !world.curtainShadow || world.manduk || cat.closed || cat.inBox || cat.onTV || cat.typing || cat.dance || NO_GHOST.includes(cat.tag))
    return;
  const left = id === 'curtain_l', spot = left ? [150, 684] : [560, 682], cx = o.pos.x;
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
  if (!isHalloween(d) || !batNight(d) || rainNow(d) || world.witch || moonPhase(d).lit < 0.1)
    return; // 달이 떠 있는 밤에만 (빛나는 비율 10% 이상, MOON_PLAN.md 7장). 그믐 무렵엔 유령도 쉰다
  const g = world.ghostNight;
  if (g && g.k === nightKey(d) && g.n >= 2)
    return; // 하룻밤에 두 번까지
  if (Math.random() < dt / (2.5 * 3600))
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
    gy = 170 - Math.sin(k * Math.PI) * 20;
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
  tmx.transform(1, 0, sk, 1, -sk * 460, 0);
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
