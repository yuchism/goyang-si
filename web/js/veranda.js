/* 베란다 손님 (WINDOW_PLAN.md 5장, WINDOW_SPRITE_PLAN.md): 난간의 새(비둘기·까치)와 작은 검은 고양이.
   유리창과 난간 사이(베란다 층)에 그린다: 방 배경(난간 포함) 다음, 창틀을 다시 덮기 전 (draw.js drawVeranda).
   "언제"는 time.js(birdSlots·blackcatSlot)가 날짜 씨앗으로 정한다. 한 번에 손님 하나(world.guest), 천둥 칠 땐 안 온다(events.js 교통정리).
   크기(WINDOW_SPRITE_PLAN.md 3장): 비둘기 몸 34px, 까치 42px(꼬리 포함. 처음 24·30px에서 1.4배), 검은 고양이 걷는 몸 길이 72px·빼꼼 폭 41px (처음 36px에서 새에 비해 너무 작아 1.8배로, 2026-10-16) */
import { play } from './anim.js';
import { imageReady, img } from './assets.js';
import { winFree } from './behave.js';
import { TRAFFIC, canStart } from './events.js';
import { occluded } from './glass.js';
import { tr } from './i18n.js';
import { P, S } from './objects.js';
import { drawSkySprite } from './sprites.js';
import { ctx } from './stage.js';
import { bub, fn, go, hold, run } from './steps.js';
import { birdSlots, blackcatSlot, clockText, now, rainNow, slotDue } from './time.js';
import { HAND, RM, clamp, lerp, pick, rnd } from './util.js';
import { cat, say, world } from './world.js';

// 방 좌표: 난간 윗단 윗면(bg 픽셀 y ≈ 497 → 방 382), 창 아랫단 윗면(bg 602 → 방 463)
const PERCH_Y = 382, SILL_Y = 463;
// 그림 배율(웹 px × K = 방 px)과 밤 눈 위치(웹 px, 왼쪽 위 기준). WINDOW_SPRITE_PLAN.md 3장 변환 표
const K = { pigeon: 0.30, magpie: 0.24, blackcat: 0.29 };
const EYES = {
  blackcat_peek: [[40.6, 83.7], [86.8, 88.7]], blackcat_alert: [[41.0, 82.1], [87.0, 88.1]],
  blackcat_walk_1: [[34.5, 136.2], [26.0, 139.7]], blackcat_walk_2: [[34.3, 136.3], [25.9, 139.7]], blackcat_walk_3: [[34.7, 139.4], [26.6, 143.5]], blackcat_walk_4: [[34.4, 136.5], [26.3, 140.0]],
  blackcat_run: [[47.6, 47.5], [30.0, 48.5]],
};
const FLY = 1.4; // 초: 날아오기·날아가기
const PAIR = 36; // 까치 짝 사이 (방 px)
const done = new Set(); // 이번에 이미 온 회차 (시간 점프 때 비운다)
const isBird = g => g && (g.kind === 'pigeon' || g.kind === 'magpie');
const birdHere = () => isBird(world.guest) && world.guest.phase !== 'out';
const glassX = u => lerp(P.window.x + 80, P.window.x + P.window.w - 100, u); // 커튼에 너무 가리지 않는 범위

/* ───────── 난간의 새 ───────── */
export function startBird(kind, slot = null, late = 0) {
  const resume = late > FLY;
  const b = { kind, id: slot ? slot.id : 'dev' + world.t, t: resume ? late : 0, dur: slot ? slot.dur : rnd(25, 45), x: glassX(slot ? slot.x : Math.random()), face: slot ? slot.face : pick([-1, 1]),
    pair: slot ? slot.pair : kind === 'magpie' && Math.random() < 0.4, phase: resume ? 'sit' : 'in', from: pick([-1, 1]), next: rnd(1.5, 3), peck: 0, peck2: 0, said: null, react: false };
  b.dur = Math.max(b.dur, FLY * 2 + 6);
  if (!resume)
    b.face = b.from > 0 ? -1 : 1; // 날아온 쪽을 그대로 보고 내려앉는다 (앉는 순간 몸이 뒤집히지 않게)
  world.guest = b;
}
function birdTick(d, real) {
  const b = world.guest;
  if (isBird(b)) {
    b.t += real;
    b.peck = Math.max(0, b.peck - real);
    b.peck2 = Math.max(0, b.peck2 - real);
    if (b.phase === 'in' && b.t >= FLY)
      b.phase = 'sit';
    if (b.phase === 'sit') {
      if (!b.react) {
        b.react = true;
        birdReact();
      }
      b.next -= real;
      if (b.next <= 0) { // 두리번 → 가끔 쪼기
        b.next = rnd(2.5, 5);
        const r = Math.random();
        if (r < 0.45)
          b.peck = 0.55;
        else if (r < 0.8)
          b.face *= -1;
        if (b.pair && Math.random() < 0.5)
          b.peck2 = 0.55;
        if (!b.said && Math.random() < 0.35) // 가끔 "…구구…", "…깍깍…" (새 바로 위 작게)
          b.said = { t: 0 };
      }
      if (b.t >= b.dur - FLY)
        b.phase = 'out';
    }
    if (b.said)
      b.said.t += real;
    if (b.t >= b.dur)
      world.guest = null;
    return;
  }
  if (world.guest)
    return;
  const due = slotDue(birdSlots(d), d, TRAFFIC.wait.bird);
  if (!due || done.has(due.slot.id))
    return;
  if (rainNow(d)) {
    done.add(due.slot.id); // 비·눈 오는 날은 안 온다
    return;
  }
  if (!canStart('veranda'))
    return;
  done.add(due.slot.id);
  startBird(due.slot.kind, due.slot, world.winResume !== false && due.late < due.slot.dur ? due.late : 0); // 새로 고침·점프 직후면 앉아 있는 모습으로 이어서
}
// 강고양이 씨: 깨어 있고 바쁘지 않으면 창가로 가서 채터링. 자고 있으면 귀만 쫑긋. 쥐야쥐는 반응 없음
function birdReact() {
  if (world.manduk || cat.inBox || cat.dance || cat.typing)
    return;
  if (cat.closed) {
    if (cat.dp === 'loaf' && !cat.act && !cat.moving)
      cat.react = { f: 'tv_ear_turn', t: 1.5 };
    return;
  }
  if (!winFree(cat))
    return;
  const ws = S('window.watch'), at = cat.tag === 'window';
  run(cat, [
    ...(at ? [] : [go(ws[0] + rnd(-30, 30), ws[1], 70), hold(0.5, 'stand', false, -1), play('window', 1.5)]),
    fn(a => say(a, tr('capChatter'), 4)),
    play('chatter', rnd(20, 40), () => !birdHere()),
    play('window', rnd(4, 8)),
    hold(rnd(5, 10), 'loaf', false, -1)
  ], 'chatter');
}
function flyPos(b, s) { // s: 0 = 하늘 저쪽, 1 = 난간 위
  const e = s * s * (3 - 2 * s), sx = b.x + b.from * 260, sy = PERCH_Y - 150;
  return [lerp(sx, b.x, e), lerp(sy, PERCH_Y - 8, e) - Math.sin(Math.PI * s) * 20];
}
function drawBirdOne(b, x, peck, face) {
  const name = 'fx/' + b.kind + (peck > 0 ? '_peck' : '_sit'), im = img(name);
  if (!imageReady(im))
    return;
  const k = K[b.kind], w = im.width * k, h = im.height * k;
  const bob = b.kind === 'magpie' && !RM ? Math.sin(world.t * 5 + x) * 0.6 : 0; // 까치: 꼬리 까딱
  ctx.save();
  ctx.translate(x, PERCH_Y);
  ctx.scale(-face, 1); // 그림은 왼쪽을 본다 (face -1 = 왼쪽)
  ctx.rotate(bob * 0.03);
  ctx.drawImage(im, -w / 2, -h, w, h);
  ctx.restore();
}
function drawBird(w) {
  const b = world.guest;
  if (!isBird(b))
    return null;
  const box = [b.x - 42, PERCH_Y - 42, b.x + 42 + (b.pair ? PAIR : 0), PERCH_Y + 2];
  if (b.phase === 'sit') {
    drawBirdOne(b, b.x, b.peck, b.face);
    if (b.pair)
      drawBirdOne(b, b.x + PAIR, b.peck2, b.t - FLY < 1.5 ? b.face : -b.face); // 짝: 내려앉고 잠깐 뒤 반대쪽으로 돌아앉는다
    return box;
  }
  const s = b.phase === 'in' ? clamp(b.t / FLY, 0, 1) : clamp(1 - (b.t - (b.dur - FLY)) / FLY, 0, 1);
  const [x, y] = flyPos(b, s), face = (b.from > 0) === (b.phase === 'in') ? -1 : 1; // 날아가는 쪽을 본다
  drawBirdFly(b, x, y + 8, face, s);
  if (b.pair)
    drawBirdFly(b, x + PAIR * 0.85, y - 3, face, s, 0.05);
  return [Math.min(x, b.x) - 60, Math.min(y, PERCH_Y) - 60, Math.max(x, b.x) + 60 + PAIR, PERCH_Y + 4];
}
// 날아오기·날아가기: 앉은 모습과 같은 새 그림으로 (멀리 나는 새 그림을 빌려 쓰면 앉는 순간 모양이 바뀐다).
// 날개를 편 그림(fx/pigeon_fly, fx/magpie_fly)이 있으면 앉은 그림과 번갈아 날갯짓, 없으면 앉은 그림을 위아래로 눌렀다 폈다 하며 몸을 기울인다.
// 난간에 가까워질수록(s → 1) 날갯짓이 잦아들어 그대로 앉은 모습이 된다
function drawBirdFly(b, x, y, face, s, ph = 0) {
  const sit = img('fx/' + b.kind + '_sit'), fly = img('fx/' + b.kind + '_fly');
  const flap = RM ? 0 : Math.sin((world.t + ph) * 34) * (1 - s * s), useFly = imageReady(fly) && flap > 0 && s < 0.85;
  const im = useFly ? fly : sit;
  if (!imageReady(im))
    return;
  const k = K[b.kind], w = im.width * k, h = im.height * k;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-face, 1);
  ctx.rotate(-0.25 * (1 - s)); // 날 때는 앞으로 기울고, 내려앉으며 바로 선다
  if (!imageReady(fly)) // 날개 편 그림이 없을 때만 앉은 그림을 눌렀다 폈다
    ctx.scale(1, 1 - 0.14 * Math.abs(flap));
  ctx.drawImage(im, -w / 2, -h, w, h);
  ctx.restore();
}
// "…구구…", "…깍깍…": 새 바로 위에 작게 (방 안 층에 그려서 창틀에 가리지 않게)
function drawBirdSay() {
  const b = world.guest;
  if (!isBird(b) || !b.said || b.said.t > 3 || b.phase !== 'sit')
    return;
  const al = Math.min(1, b.said.t * 3, (3 - b.said.t) * 2);
  ctx.save();
  ctx.globalAlpha = al;
  ctx.font = `700 15px ${HAND}`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(20,14,10,.6)';
  ctx.fillStyle = 'rgba(255,248,230,.95)';
  const t = tr(b.kind === 'magpie' ? 'capMagpie' : 'capPigeon'), y = PERCH_Y - 48 - (RM ? 0 : b.said.t * 3);
  ctx.strokeText(t, b.x + (b.pair ? PAIR / 2 : 0), y);
  ctx.fillText(t, b.x + (b.pair ? PAIR / 2 : 0), y);
  ctx.restore();
}
export const birdEvent = {
  id: 'bird',
  cls: 'veranda',
  active: () => isBird(world.guest),
  tick: (d, real) => birdTick(d, real),
  veranda: drawBird,
  room: drawBirdSay,
  reset() {
    if (isBird(world.guest))
      world.guest = null;
    done.clear();
  },
  dev: [{ btn: 'dBird', go: () => {
      devBird = devBird === 'pigeon' ? 'magpie' : 'pigeon';
      world.guest = null;
      startBird(devBird);
    } }],
  debug: { startBird },
};
let devBird = 'magpie';

/* ───────── 작은 검은 고양이 (동네 길고양이) ─────────
   빼꼼: 창 아랫단 너머로 고개를 쓱 → 빤히 → (강고양이 씨가 다가오거나 몇 초 지나면) 알아챔 → 후다닥 내려감
   난간 걷기: 난간 윗단을 살금살금 지나감. 강고양이 씨가 다가오면 후다닥 뛰어감
   밤: 어둠 속에서 눈 두 개가 먼저 반짝(어둠 뒤, 가려지면 안 그림) → 1~2초 뒤 모습. 사라질 때도 눈이 마지막. 몸은 달빛 테두리(drawSkySprite) */
const EYES_FIRST = 1.5, EYES_LAST = 0.5;
const WALK_STEP = 9; // 방 px: 걷기 그림 한 장 동안 나아가는 거리 (지금 빠르기 약 16px/s면 한 장 0.55초 안팎)
const isCat = g => g && g.kind === 'blackcat';
const darkNow = () => (world.dark || 0) > 0.3;
export function startBlackcat(mode, slot = null, late = 0) {
  const g = { kind: 'blackcat', id: slot ? slot.id : 'dev' + world.t, mode, t: 0, phase: 'eyes', pt: 0, night: darkNow(),
    x: glassX(slot ? slot.x : Math.random()), dir: slot ? slot.dir : pick([-1, 1]), stare: rnd(3, 5), seen: false, bodyA: 0 };
  if (mode === 'walk') {
    g.speed = (P.window.w + 80) / (slot ? slot.dur : rnd(32, 44));
    g.x = g.dir > 0 ? P.window.x - 40 : P.window.x + P.window.w + 40;
    if (late > 0)
      g.x += g.dir * g.speed * late; // 새로 고침·점프 직후면 걷던 자리에서
  }
  if (!g.night || late > 0)
    g.phase = mode === 'peek' ? 'up' : 'walk';
  world.guest = g;
}
const setPhase = (g, p) => {
  g.phase = p;
  g.pt = 0;
};
const approaching = () => cat.tag === 'blackcat' && cat.moving;
function catTick(d, real) {
  const g = world.guest;
  if (isCat(g)) {
    g.t += real;
    g.pt += real;
    if (g.mode === 'peek') {
      if (g.phase === 'eyes' && g.pt >= EYES_FIRST)
        setPhase(g, 'up');
      else if (g.phase === 'up' && g.pt >= 0.6)
        setPhase(g, 'stare');
      else if (g.phase === 'stare') {
        if (!g.seen && g.pt > 0.8) {
          g.seen = true;
          blackcatReact();
        }
        if (g.pt >= g.stare || (approaching() && (g.close = (g.close || 0) + real) > 0.9))
          setPhase(g, 'alert');
      }
      else if (g.phase === 'alert' && g.pt >= 0.6)
        setPhase(g, 'down');
      else if (g.phase === 'down' && g.pt >= 0.35)
        setPhase(g, 'gone');
      else if (g.phase === 'gone' && g.pt >= (g.night ? EYES_LAST : 0))
        world.guest = null;
    }
    else {
      if (g.phase === 'eyes' && g.pt >= EYES_FIRST)
        setPhase(g, 'walk');
      if (g.phase === 'walk' || g.phase === 'flee') {
        const dx = (g.phase === 'flee' ? 150 : g.speed) * real;
        g.x += g.dir * dx;
        g.walked = (g.walked || 0) + dx;
      }
      if (g.phase === 'walk') {
        const inView = g.x > P.window.x + 60 && g.x < P.window.x + P.window.w - 60;
        if (!g.seen && inView && g.pt > 2) {
          g.seen = true;
          blackcatReact();
        }
        if (approaching() && (g.close = (g.close || 0) + real) > 0.9)
          setPhase(g, 'flee');
      }
      if (g.x < P.window.x - 60 || g.x > P.window.x + P.window.w + 60)
        world.guest = null;
    }
    return;
  }
  if (world.guest)
    return;
  const sl = blackcatSlot(d), due = sl && slotDue([sl], d, TRAFFIC.wait.blackcat);
  if (!due || done.has(sl.id))
    return;
  if (rainNow(d)) {
    done.add(sl.id); // 비·눈 오는 밤은 안 온다
    return;
  }
  if (!canStart('veranda'))
    return;
  done.add(sl.id);
  const late = world.winResume !== false && due.late < sl.dur ? due.late : 0;
  if (sl.mode === 'peek' && late > 4)
    return; // 빼꼼은 몇 초뿐이라 이어 보여 주지 않는다
  startBlackcat(sl.mode, sl, late);
}
// 강고양이 씨: 깨어 있으면 창가로 다가가 꼬리를 부풀림 → 다가가는 사이 검은 고양이가 도망. 자고 있으면 반응 없음
function blackcatReact() {
  if (world.manduk || cat.inBox || cat.dance || cat.typing || cat.closed || !winFree(cat))
    return;
  const ws = S('window.watch');
  run(cat, [
    go(ws[0] + rnd(-20, 20), ws[1], 75),
    hold(0.5, 'stand', false, -1),
    bub('💢', 2.5),
    play('window', rnd(6, 10)),
    hold(rnd(5, 10), 'loaf', false, -1)
  ], 'blackcat');
}
// 지금 그릴 그림 이름, 기준점(가운데 아래) 위치, 몸 투명도
function catPose(g) {
  if (g.mode === 'peek') {
    const im = img('fx/blackcat_peek'), h = (imageReady(im) ? im.height : 83) * K.blackcat;
    const up = g.phase === 'eyes' ? 0 : g.phase === 'up' ? clamp(g.pt / 0.6, 0, 1) : g.phase === 'down' ? 1 - clamp(g.pt / 0.35, 0, 1) : g.phase === 'gone' ? 0 : 1;
    const e = up * up * (3 - 2 * up);
    return { name: g.phase === 'alert' || g.phase === 'down' ? 'fx/blackcat_alert' : 'fx/blackcat_peek', x: g.x, y: SILL_Y + (1 - e) * h, face: -1, a: g.phase === 'eyes' || g.phase === 'gone' ? 0 : 1,
      jump: g.phase === 'alert' && g.pt < 0.15 && !RM ? -1.5 : 0 }; // 알아챔: 1~2px 움찔
  }
  // 걷기 4장: 왼발 딛기 → 지나감 → 오른발 딛기 → 지나감. 한 장의 시간은 걷는 빠르기에 맞춰 발이 미끄러지지 않게 (한 장에 WALK_STEP px 나아감)
  const flee = g.phase === 'flee', step = RM ? 0 : Math.floor(g.walked / WALK_STEP) % 4;
  return { name: flee ? 'fx/blackcat_run' : 'fx/blackcat_walk_' + (step + 1), x: g.x, y: PERCH_Y + (flee ? 2 : 0), face: g.dir,
    a: g.phase === 'eyes' ? 0 : g.night ? clamp(g.pt / 1.2, 0, 1) : 1, jump: 0 };
}
function drawCat(w) {
  const g = world.guest;
  if (!isCat(g))
    return null;
  const p = catPose(g), im = img(p.name);
  if (!imageReady(im) || p.a <= 0)
    return [g.x - 30, PERCH_Y - 40, g.x + 30, SILL_Y];
  const k = K.blackcat, iw = im.width * k, ih = im.height * k;
  ctx.save();
  ctx.translate(p.x, p.y + p.jump);
  ctx.scale(-p.face, 1); // 그림은 왼쪽을 본다
  drawSkySprite(p.name, im, -iw / 2, -ih, iw, ih, p.a); // 밤이면 달빛 테두리와 살짝 밝히기 (sprites.js)
  ctx.restore();
  return [p.x - iw / 2 - 3, p.y - ih - 3, p.x + iw / 2 + 3, Math.min(p.y + 2, SILL_Y + 2)];
}
// 밤: 눈 두 개 (어둠 뒤). 몸보다 먼저 나타나고 마지막에 사라진다. 가려진 눈은 안 그림 (glass.js)
function drawEyes(dk) {
  const g = world.guest;
  if (!isCat(g) || dk < 0.25)
    return;
  const p = catPose(g), im = img(p.name), E = EYES[p.name.slice(3)];
  if (!imageReady(im) || !E)
    return;
  let a;
  if (g.mode === 'peek')
    a = g.phase === 'eyes' ? clamp(g.pt / 0.4, 0, 1) : g.phase === 'gone' ? 1 - clamp(g.pt / EYES_LAST, 0, 1) : g.phase === 'down' ? 1 : 1;
  else
    a = g.phase === 'eyes' ? clamp(g.pt / 0.4, 0, 1) : 1;
  if (g.phase === 'gone' && g.mode === 'peek') { // 몸이 내려간 뒤에도 눈은 아랫단 바로 위에 잠깐 남는다
    p.y = SILL_Y + 6;
  }
  const blink = !RM && (g.t % 3.3) < 0.12; // 가끔 깜빡
  if (blink)
    return;
  const k = K.blackcat, iw = im.width * k, ih = im.height * k;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [ex, ey] of E) {
    const x = p.x + (-p.face) * (ex * k - iw / 2), y = p.y + p.jump - ih + ey * k;
    if (occluded(x, y))
      continue;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, 2.6);
    gr.addColorStop(0, `rgba(250,236,120,${0.95 * a})`);
    gr.addColorStop(1, 'rgba(250,236,120,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }
  ctx.restore();
}
export const blackcatEvent = {
  id: 'blackcat',
  cls: 'veranda',
  active: () => isCat(world.guest),
  tick: (d, real) => catTick(d, real),
  veranda: drawCat,
  shadow: drawEyes,
  reset() {
    if (isCat(world.guest))
      world.guest = null;
    done.clear();
  },
  // 미리보기 한 줄: "오늘 밤 검은 고양이: 21:40(빼꼼)"
  note(t) {
    const s = blackcatSlot(now(), true);
    return s ? t('wtCat', { at: clockText(s.at), mode: t(s.mode === 'peek' ? 'wtPeek' : 'wtWalk') }) : t('wtNoCat');
  },
  dev: [{ btn: 'dBlackcat', go: () => {
      devCat = devCat === 'peek' ? 'walk' : 'peek';
      world.guest = null;
      startBlackcat(devCat);
    } }],
  debug: { startBlackcat },
};
let devCat = 'walk';
