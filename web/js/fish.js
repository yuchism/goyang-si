/* 어항 낚시: 왼쪽 커튼 앞 어항과 금붕어, 강고양이 씨의 낚시. CAT_PLAY_PLAN.md 5-2, FISH_SPRITE_PLAN.md
   강고양이 씨가 낚싯줄을 드리우고 졸면, 금붕어가 한숨 쉬고 보물상자에서 붕어빵을 꺼내 바늘에 끼워 준다(열 번에 한 번은 물풀).
   어항 그리기 순서: 뒤판 → 금붕어·바늘·거품 → 앞판 유리. 낚싯줄은 고양이 그림의 낚싯대 끝(ROD_TIP)에서 그린다 */
import { play } from './anim.js';
import { FRAMES, FSC, ROOM, imageReady, img } from './assets.js';
import { drawProp } from './draw.js';
import { A, O, P, PL, ay, present } from './objects.js';
import { Snd } from './sound.js';
import { DEPTH, ctx, walkY } from './stage.js';
import { bub, faceTo, fn, go, hold, run } from './steps.js';
import { now } from './time.js';
import { gateMark, gateOk } from './gate.js';
import { RM, clamp, lerp, rnd } from './util.js';
import { cat, mouse, say, world } from './world.js';

// 고양이 낚시 그림의 낚싯대 끝 (프레임 픽셀, 그림 왼쪽 위 기준). 그림을 바꾸면 여기만 다시 잰다
const ROD_TIP = { cat_fish_sit_1: [15, 12], cat_fish_sit_2: [15, 11.4], cat_fish_yank_1: [7.8, 23.5], cat_fish_yank_2: [571.2, 9.5] };
// 어항 그림 안의 자리 (그림 폭·높이에 대한 비율): 물 타원 [가운데 x, y, 반지름 x, y], 보물상자 입구, 바늘 늘어뜨릴 곳, 수면 높이
const BOWL = { water: [0.5, 0.41, 0.36, 0.18], chest: [0.68, 0.56], hook: [0.4475, 0.44], surface: 0.18 };
const FISH_W = 25, BOONG_W = 30; // 방 크기: 금붕어 길이, 붕어빵 길이 (낚시할 때 고양이 자리는 장면의 fish.cat)

/* ───── 상태 ───── */
const F = { x: 0, y: 0, tx: 0, ty: 0, face: -1, mode: 'swim', t: 0, wait: 0, ph: 0, ready: false,
  rod: false, line: 0, hookItem: null, help: null, helpT: 0, bite: false, bubbles: [], ripple: null };
let boong = null, weedTip = false, crumbs = null; // crumbs: 붕어빵 부스러기 {x, y}
export const fishCrumbs = () => crumbs;
export const fishRodOut = () => F.rod; // objects.js: 낚시하는 동안 벽의 낚싯대를 숨긴다
export const fishState = () => ({ F, boong }); // 점검용

/* ───── 어항 좌표 ───── */
function bowlBox() {
  const p = O.fishbowl && O.fishbowl.pos, m = ROOM.fishbowl_back;
  if (!p || !m)
    return null;
  const h = p.w * m[1] / m[0];
  return { x0: p.x - p.w / 2, y0: p.y - h, w: p.w, h };
}
const at = (b, fx, fy) => [b.x0 + fx * b.w, b.y0 + fy * b.h];
function inWater(b, x, y, pad = 0) {
  const [cx, cy] = at(b, BOWL.water[0], BOWL.water[1]), rx = BOWL.water[2] * b.w - pad, ry = BOWL.water[3] * b.h - pad * 0.6;
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}
function randWater(b) {
  const [cx, cy] = at(b, BOWL.water[0], BOWL.water[1]);
  for (let i = 0; i < 20; i++) {
    const x = cx + rnd(-1, 1) * BOWL.water[2] * b.w, y = cy + rnd(-1, 1) * BOWL.water[3] * b.h;
    if (inWater(b, x, y, 8))
      return [x, y];
  }
  return [cx, cy];
}
const hookPos = b => at(b, BOWL.hook[0], BOWL.hook[1]);
// 고양이 낚싯대 끝 (방 좌표). 그림이 낚시 그림이 아니면 null
function rodTip() {
  const fr = cat.frame, t = ROD_TIP[fr], m = FRAMES[fr];
  if (!t || !m)
    return null;
  const sc = FSC * DEPTH(cat.y) * (m[4] || 1);
  return [cat.x + (-cat.face) * (t[0] - m[2]) * sc, cat.y + (t[1] - m[3]) * sc];
}
// 낚시 자리: 낚싯대 끝이 바늘 바로 위에 오도록 고양이를 앉힌다
export function fishSpot() {
  const b = bowlBox(), m = FRAMES.cat_fish_sit_1;
  const fc = PL('fish.cat');
  if (!b || !m)
    return [fc.x, fc.y];
  const sc = FSC * DEPTH(fc.y), [hx] = hookPos(b);
  return [hx - (ROD_TIP.cat_fish_sit_1[0] - m[2]) * sc, fc.y];
}

/* ───── 강고양이 씨: 낚시 ───── */
export function fishOk(d) { // 시간대·간격은 gate.js 표
  return !!O.fishbowl && present(O.fishbowl) && gateOk('fish', d);
}
export function fishB() {
  gateMark('fish', now());
  const [sx, sy] = fishSpot();
  run(cat, [
    go(sx, sy, 55),
    hold(0.4, 'stand', false, -1),
    play('sitdown'),
    fn(a => {
      a.face = -1;
      Object.assign(F, { rod: true, line: 0, hookItem: null, help: null, bite: false });
      F.ripple = { t: 0 };
    }),
    bub('👀', 2.5),
    play('fishsit', rnd(10, 18)),
    fn(a => {
      say(a, '💤', 4);
      F.help = Math.random() < 0.1 ? 'weed' : 'boong';
      F.helpT = rnd(5, 9);
    }),
    play('fishdoze', 90, () => F.bite),
    fn(a => say(a, '‼️', 1.4)),
    play('yank1'),
    fn(() => launch()),
    play('yank2'),
    fn(() => {
      F.rod = false;
      weedTip = false;
    }),
    play('sitdown'),
    fn(a => afterCatch(a))
  ], 'fish');
}
function afterCatch(a) {
  if (!boong) { // 물풀만 걸렸다
    run(a, [bub('😑', 3), play('sulk', rnd(10, 20)), hold(rnd(8, 15), 'loaf')], 'fish');
    return;
  }
  const m = FRAMES.cat_eat_1, mouth = m ? (m[2] - 30) * FSC * DEPTH(boong.y) : 95; // 먹는 그림의 입 = 그림 왼쪽 끝 근처
  run(a, [
    go(boong.x + mouth, boong.y - 2, 50),
    fn(c => {
      c.face = -1;
      say(c, '🐟❤️', 3);
      if (boong)
        boong.state = 'eat';
    }),
    play('eat', rnd(4.5, 6)),
    fn(() => {
      crumbs = { x: boong.x, y: boong.y, seed: Math.random() * 99 }; // 부스러기가 남는다 (쥐야쥐가 주워 가거나, 만득 씨가 치운다)
      boong = null;
    }),
    hold(0.8, 'stand'),
    play('groom', rnd(4, 7)),
    hold(rnd(10, 20), 'loaf')
  ], 'fish');
}
// 낚아챔: 바늘에 걸린 것이 낚싯대 끝까지 올라왔다가 붕어빵이면 고양이 오른쪽 바닥으로 떨어진다
function launch() {
  const b = bowlBox();
  if (!b)
    return;
  const [hx, hy] = hookPos(b);
  if (F.hookItem === 'boong')
    boong = { state: 'up', t: 0, x: hx, y: hy, x0: hx, y0: hy, lx: cat.x + rnd(25, 55), ly: walkY(cat.y + rnd(2, 12)), rot: 0 };
  else
    weedTip = true;
  F.hookItem = null;
  F.line = 0;
  F.ripple = { t: 0 };
  Snd.thump(0.4, 900);
}

/* ───── 매 장면 (main.js) ───── */
export function fishTick(dt) {
  const b = bowlBox();
  if (!b || !present(O.fishbowl))
    return;
  if (!F.ready) {
    [F.x, F.y] = randWater(b);
    [F.tx, F.ty] = [F.x, F.y];
    F.ready = true;
  }
  // 낚시가 끊겼으면 (만득 씨, 쓰다듬기, 시간 점프…) 낚싯대를 벽으로
  if (cat.tag !== 'fish' && (F.rod || F.help || boong || weedTip)) {
    Object.assign(F, { rod: false, help: null, bite: false, hookItem: null, line: 0 });
    boong = null;
    weedTip = false;
    if (F.mode !== 'swim' && F.mode !== 'hello')
      setMode('swim');
  }
  if (F.rod)
    F.line = Math.min(1, F.line + dt / 1.2);
  if (F.ripple && (F.ripple.t += dt) > 1.2)
    F.ripple = null;
  fishMove(b, dt);
  F.bubbles = F.bubbles.filter(q => (q.t += dt) < q.life);
  F.bubbles.forEach(q => {
    q.y -= dt * 14;
    q.x += Math.sin(q.t * 5 + q.ph) * dt * 4;
  });
  if (boong)
    boongMove(dt);
}
// 오류 뒤 되돌리기: 낚싯대는 벽으로, 금붕어는 헤엄 (부스러기는 그대로 둔다)
function fishAbort() {
  Object.assign(F, { rod: false, help: null, bite: false, hookItem: null, line: 0 });
  boong = null;
  weedTip = false;
  setMode('swim');
}
function setMode(m, wait = 0) {
  F.mode = m;
  F.t = 0;
  F.wait = wait;
}
function puff(n, x, y) {
  for (let i = 0; i < n; i++)
    F.bubbles.push({ x: x + rnd(-2, 2), y: y - i * 4, r: rnd(1.2, 2.4), t: -i * 0.18, life: 1.6 + i * 0.18, ph: rnd(0, 6) });
}
const mouthOf = () => [F.x + F.face * FISH_W * 0.45, F.y - 1];
function swimTo(x, y, sp, dt) {
  const dx = x - F.x, dy = y - F.y, d = Math.hypot(dx, dy);
  if (Math.abs(dx) > 1.5)
    F.face = dx > 0 ? 1 : -1;
  if (d < 1.5)
    return true;
  const m = Math.min(d, sp * dt);
  F.x += dx / d * m;
  F.y += dy / d * m;
  return false;
}
function fishMove(b, dt) {
  F.t += dt;
  F.ph += dt;
  const [hx, hy] = hookPos(b), side = hx + 16, [chx, chy] = at(b, BOWL.chest[0], BOWL.chest[1]);
  // 고양이가 졸면 도와주러 간다
  if (F.mode === 'swim' && F.help && cat.act && cat.act.c === 'fishdoze' && (F.helpT -= dt) <= 0)
    setMode('tohook');
  switch (F.mode) {
    case 'swim':
      if (swimTo(F.tx, F.ty, 8, dt)) {
        const peer = cat.tag === 'bowlwatch' && !cat.closed && !cat.moving;
        if (peer)
          F.face = 1; // 유리 너머 고양이를 본다
        if ((F.wait -= dt) <= 0) {
          if (peer && Math.random() < 0.7) // 고양이가 보고 있으면 유리 오른쪽으로 와서 마주 본다
            [F.tx, F.ty] = at(b, BOWL.water[0] + BOWL.water[2] * rnd(0.6, 0.85), BOWL.water[1] + rnd(-0.06, 0.06));
          else
            [F.tx, F.ty] = randWater(b);
          F.wait = peer ? rnd(3, 8) : rnd(0.5, 3);
        }
      }
      if (Math.random() < dt / 5)
        puff(1, ...mouthOf());
      break;
    case 'tohook':
      if (swimTo(side, hy + 4, 12, dt)) {
        F.face = -1;
        setMode('sigh');
        puff(4, ...mouthOf());
      }
      break;
    case 'sigh':
      if (F.t > 1.8)
        setMode('tochest');
      break;
    case 'tochest':
      if (swimTo(chx - 14, chy - 4, 12, dt)) {
        F.face = 1;
        setMode('grab');
      }
      break;
    case 'grab':
      if (F.t > 0.6)
        setMode('carry');
      break;
    case 'carry':
      if (swimTo(side, hy + 2, 7, dt)) {
        F.face = -1;
        F.hookItem = F.help;
        F.help = null;
        Snd.thump(0.2, 1400);
        setMode('away');
        [F.tx, F.ty] = [side + 22, hy + 10];
      }
      break;
    case 'away':
      if (swimTo(F.tx, F.ty, 12, dt)) {
        F.face = -1;
        setMode('tug');
      }
      break;
    case 'tug': // 줄을 톡톡 (바늘이 흔들린다)
      if (F.t > 1.3) {
        F.bite = true;
        setMode('watch');
      }
      break;
    case 'watch': { // 유리 오른쪽으로 와서 고양이 쪽을 본다. 물풀이었으면 거품으로 웃음
      const [wx, wy] = at(b, BOWL.water[0] + BOWL.water[2] * 0.75, BOWL.water[1]);
      if (swimTo(wx, wy, 12, dt)) {
        F.face = 1;
        if (weedTip && Math.random() < dt * 3)
          puff(1, ...mouthOf());
      }
      if (F.t > 6)
        setMode('swim');
      break;
    }
    case 'hello':
      if (F.t > 1.6)
        setMode('swim');
      break;
  }
}
function boongMove(dt) {
  const B = boong;
  B.t += dt;
  if (B.state === 'up') { // 바늘에 매달려 낚싯대 끝 아래까지
    const tip = rodTip(), k = Math.min(1, B.t / 0.45), e = 1 - (1 - k) * (1 - k);
    const tx = tip ? tip[0] : B.x0, ty = tip ? tip[1] + 22 : B.y0 - 150;
    B.x = lerp(B.x0, tx, e);
    B.y = lerp(B.y0, ty, e);
    B.rot = Math.sin(B.t * 18) * 0.3;
    if (k >= 1) {
      Object.assign(B, { state: 'fall', t: 0, x0: B.x, y0: B.y });
    }
  }
  else if (B.state === 'fall') { // 포물선으로 고양이 오른쪽 바닥에 톡
    const k = Math.min(1, B.t / 0.75);
    B.x = lerp(B.x0, B.lx, k);
    B.y = lerp(B.y0, B.ly, k) - Math.sin(Math.PI * k) * 60;
    B.rot += dt * 9;
    if (k >= 1) {
      Object.assign(B, { state: 'floor', t: 0, x: B.lx, y: B.ly, rot: rnd(-0.15, 0.15) });
      Snd.thump(0.35, 500);
    }
  }
}

/* ───── 보는 사람이 어항을 누름 ───── */
export function fishAt(x, y) {
  const b = bowlBox();
  return !!b && present(O.fishbowl) && x > b.x0 && x < b.x0 + b.w && y > b.y0 && y < b.y0 + b.h;
}
export function tapBowl() {
  const b = bowlBox();
  if (!b)
    return;
  if (['swim', 'watch', 'hello'].includes(F.mode)) {
    const [cx] = at(b, 0.5, 0);
    F.tx = cx + rnd(-8, 8);
    F.ty = F.y;
    setMode('hello');
  }
  F.ripple = { t: 0 };
  puff(2, ...mouthOf());
  if (!cat.closed && !cat.act && Math.hypot(cat.x - b.x0 - b.w / 2, cat.y - P.fishbowl.y) < 260 && cat.tag !== 'fish')
    say(cat, '👀', 2);
}

/* ───── 그리기 ───── */
// objects.json look "code:fishbowl" (draw.js CODE)
export function drawFishbowl(v) {
  const b = bowlBox();
  if (!b)
    return;
  drawProp('fishbowl_back', v.pos.x, v.pos.y, v.pos.w);
  const surf = b.y0 + BOWL.surface * b.h;
  // 바늘과 낚싯줄 (어항 안쪽은 앞 유리 뒤에 보이게 여기서 그린다)
  const tip = F.rod && cat.frame !== 'cat_fish_yank_2' ? rodTip() : null; // 낚아챈 뒤의 줄은 drawFishOverlay가 그린다
  if (tip) {
    const [hx, hy0] = hookPos(b), tug = F.mode === 'tug' ? Math.sin(F.t * 30) * 2.5 : 0;
    const hy = lerp(tip[1], hy0, F.line) + tug, hx2 = hx + (F.mode === 'tug' ? Math.sin(F.t * 23) * 1.5 : 0);
    ctx.save();
    ctx.strokeStyle = 'rgba(250,250,245,.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1]);
    ctx.quadraticCurveTo((tip[0] + hx2) / 2, Math.max(tip[1], hy) - 4, hx2, hy);
    ctx.stroke();
    // 바늘
    ctx.strokeStyle = '#8a8f99';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(hx2 + 1.5, hy + 3, 2, Math.PI * 0.1, Math.PI * 1.1);
    ctx.stroke();
    ctx.restore();
    if (F.hookItem === 'boong')
      drawBoongAt(hx2 + 1, hy + 9, Math.sin(F.ph * 2) * 0.2 + 1.3, BOONG_W * 0.9);
    else if (F.hookItem === 'weed')
      drawWeed(hx2 + 1.5, hy + 4);
  }
  drawFish();
  F.bubbles.forEach(q => {
    if (q.t < 0 || q.y < surf)
      return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (q.life - q.t) * 2) * 0.8;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.r, 0, 7);
    ctx.stroke();
    ctx.restore();
  });
  if (F.ripple && !RM) { // 수면 동그라미
    const k = F.ripple.t / 1.2, [hx] = hookPos(b);
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.7;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(hx, surf + 1, 4 + k * 22, 1 + k * 3, 0, 0, 7);
    ctx.stroke();
    ctx.restore();
  }
  drawProp('fishbowl_front', v.pos.x, v.pos.y, v.pos.w);
}
function fishFrame() {
  switch (F.mode) {
    case 'sigh':
      return 'fish_sigh_1';
    case 'carry':
      return F.hookItem || F.help === 'weed' ? 'fish_swim_1' : 'fish_carry_1';
    case 'hello':
      return 'fish_hello_1';
    default: {
      const fast = F.mode === 'tug' || F.mode === 'tohook' || F.mode === 'tochest';
      return Math.floor(F.ph * (fast ? 6 : 3.3)) % 2 ? 'fish_swim_2' : 'fish_swim_1';
    }
  }
}
function drawFish() {
  const k = fishFrame(), im = img(k), base = ROOM.fish_swim_1;
  if (!imageReady(im) || !base)
    return;
  const s = FISH_W / base[0], w = im.width * s, h = im.height * s, bob = RM ? 0 : Math.sin(F.ph * 2.2) * 0.8;
  ctx.save();
  ctx.translate(F.x, F.y + bob);
  if (F.face > 0 && k !== 'fish_hello_1')
    ctx.scale(-1, 1);
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  ctx.restore();
  if (F.mode === 'carry' && F.help === 'weed') {
    const [mx, my] = mouthOf();
    drawWeed(mx, my);
  }
}
function drawWeed(x, y) {
  ctx.save();
  ctx.strokeStyle = '#4f8a3c';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 1; i <= 4; i++)
    ctx.lineTo(x + (i % 2 ? 3 : -3), y + i * 3.5);
  ctx.stroke();
  ctx.restore();
}
function drawBoongAt(x, y, rot, w, alpha = 1) {
  const im = img('boong');
  if (!imageReady(im))
    return;
  const h = w * im.height / im.width;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  ctx.restore();
}
// 바닥의 붕어빵: 앞뒤 정렬에 끼운다 (main.js render)
export function fishLayers() {
  const L = crumbs ? [[crumbs.y - 1, drawCrumbs]] : [];
  if (!boong || (boong.state !== 'floor' && boong.state !== 'eat'))
    return L;
  return [...L, [boong.y - 0.5, () => {
        let w = BOONG_W * DEPTH(boong.y), a = 1;
        if (boong.state === 'eat') { // 먹는 동안 조금씩 작아진다
          const k = Math.min(1, boong.t / 5);
          w *= 1 - k * 0.7;
          a = 1 - k * 0.3;
        }
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(boong.x, boong.y + 1, w * 0.45, 3, 0, 0, 7);
        ctx.fillStyle = 'rgba(50,30,15,.18)';
        ctx.fill();
        ctx.restore();
        drawBoongAt(boong.x, boong.y - w * 0.3, boong.rot, w, a);
      }]];
}
// 날아가는 붕어빵과 줄, 낚싯대 끝에 걸린 물풀 (캐릭터 위에)
export function drawFishOverlay() {
  const tip = rodTip();
  if (boong && boong.state === 'up' && tip) {
    ctx.save();
    ctx.strokeStyle = 'rgba(250,250,245,.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1]);
    ctx.lineTo(boong.x, boong.y - 6);
    ctx.stroke();
    ctx.restore();
  }
  if (boong && (boong.state === 'up' || boong.state === 'fall'))
    drawBoongAt(boong.x, boong.y, boong.rot, BOONG_W);
  if (weedTip && tip && F.rod) {
    ctx.save();
    ctx.strokeStyle = 'rgba(250,250,245,.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1]);
    ctx.lineTo(tip[0], tip[1] + 16);
    ctx.stroke();
    ctx.restore();
    drawWeed(tip[0], tip[1] + 16);
  }
}

/* ───── 붕어빵 부스러기: 쥐야쥐가 주워 가고, 남아 있으면 만득 씨가 치우고 쪽지에 쓴다 ───── */
// 쥐야쥐 (mouse.js mouseBrain이 부른다)
export function mouseCrumbB() {
  if (!crumbs)
    return false;
  const c = crumbs;
  mouse.state = 'crumb';
  run(mouse, [
    go(c.x + 18, c.y + 2, 90),
    faceTo({ x: c.x }),
    bub('😋', 3),
    hold(rnd(3, 5), 'walk'),
    fn(() => {
      if (crumbs === c)
        crumbs = null;
    }),
    hold(rnd(2, 4), 'walk'),
    fn(a => {
      a.state = '';
    })
  ], 'crumb');
  return true;
}
// 만득 씨가 밥·퇴근으로 다녀가면 치운다 (manduk.js 다녀간 결과 표). 쥐야쥐가 안 먹었으면 오늘 쪽지가 바뀐다
export function sweepCrumbs() {
  if (!crumbs)
    return;
  crumbs = null;
  world.notes.crumbs = true;
}
function drawCrumbs() {
  const c = crumbs;
  ctx.save();
  ctx.fillStyle = '#b97a3c';
  for (let i = 0; i < 6; i++) {
    const a = c.seed + i * 2.1, r = 4 + (i * 7 % 9);
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.35, 1 + (i % 2) * 0.6, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

/* ───── 밤 어항 구경: 어두워지면 어항 앞 식빵 자세로 금붕어를 오래 본다. 금붕어도 유리 쪽으로 와서 본다 ───── */
export function bowlWatchOk(d) {
  return !!O.fishbowl && present(O.fishbowl) && !world.manduk && !F.rod;
}
export function bowlWatchB() {
  const b = bowlBox();
  if (!b)
    return;
  run(cat, [
    go(b.x0 + b.w + rnd(55, 75), ay(A('fish.bowlWatch')), 50),
    hold(0.6, 'stand', false, -1),
    fn(a => say(a, '🐟👀', 3)),
    play('window', rnd(40, 90)), // 창밖 보기와 같은 뒷모습으로 어항을 본다
    hold(rnd(30, 80), 'loaf', true, -1)
  ], 'bowlwatch');
}

/* ───── 놀이 목록에 싣는 것 (plays.js) ───── */
export const fishPlay = {
  needs: ['fishbowl', 'fish.cat'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'fish',
  tick: dt => fishTick(dt), // 금붕어, 낚싯줄, 붕어빵
  layers: fishLayers,
  overlay: drawFishOverlay,
  press(x, y, when) { // 어항: 금붕어가 유리 쪽으로 와서 뻐끔 (고양이·쥐야쥐 다음에 본다)
    if (when !== 'after' || !fishAt(x, y))
      return false;
    tapBowl();
    return true;
  },
  abort: fishAbort, // 오류 뒤 되돌리기 (STABILITY_PLAN.md 3-1, recover.js)
  dev: { btn: 'dFish', go: () => !world.manduk && fishB() },
  debug: { fishB, fishState, tapBowl, bowlWatchB, mouseCrumbB },
};
