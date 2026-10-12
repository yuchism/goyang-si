/* 강고양이 씨: 하고 싶은 일 고르기(뇌)와 혼자 하는 행동들, 쓰다듬기 */
import { play } from './anim.js';
import { FRAMES, FSC } from './assets.js';
import { screenEvent } from './draw.js';
import { duetB, mouseFree } from './duet.js';
import { O, S, present, socketOf } from './objects.js';
import { Snd } from './sound.js';
import { DEPTH } from './stage.js';
import { bub, fn, go, hold, run } from './steps.js';
import { boxToday, hourOf, inBeam, mandukAsleep, mandukHome, rainNow, sunbeam, wx } from './time.js';
import { TVP, tvOn } from './tv.js';
import { tvTopB, tvTopBlockedB, tvWatchB } from './tv-cat.js';
import { pick, rnd, store } from './util.js';
import { tr } from './i18n.js';
import { oddLookB, oddLookWeight } from './install.js';
import { cat, mouse, say, world } from './world.js';
// 타자 프레임의 앞발 끝: 발 기준점에서 [앞쪽 거리, 위로 높이] (프레임 픽셀)
const PAW_TYPE = [240, 162];
/* ───────── 강고양이 씨의 뇌 ───────── */
let annoy = 0, annoyT = 0;
// 건드림 짜증은 20초마다 하나씩 풀린다
export function calmDown(real) {
  annoyT += real;
  if (annoyT > 20) {
    annoyT = 0;
    annoy = Math.max(0, annoy - 1);
  }
}
export function catBrain(d) {
  const h = hourOf(d), b = sunbeam(d), rain = rainNow(d), dark = world.lampOn === false && (h >= 23 || h < 6);
  const away = !mandukHome(d) || mandukAsleep(d);
  const opts = [];
  const add = (w, f) => {
    if (w > 0)
      opts.push([w, f]);
  };
  add(4 + (b && b.k > 0.4 ? 5 : 0) + (dark ? 8 : 0) + (h >= 12 && h < 16 ? 2 : 0), napB);
  add(3.5, loafB);
  add(1.4, groomB);
  add(dark ? 0.3 : 1.4, wanderB);
  if (tvOn()) {
    const st = world.tv.st, pr = st.mode === 'prog' ? st.p : null, prime = pr === 'drama' && st.sg.s >= 21 && st.sg.s < 22;
    add(dark ? 0.5 : prime ? 4 : pr && TVP[pr].sport ? 2 : 0.9, tvWatchB);
    if (!present(O.pumpkin))
      add((h >= 19 || h < 1) ? 1.3 : 0.5, tvTopB);
    else
      add((h >= 19 || h < 1) ? 0.35 : 0.15, tvTopBlockedB); // 할로윈: 올라가려다 호박 때문에 포기
  }
  add(1 + (b && b.k > 0.4 ? 2.2 : 0), rollB);
  add(dark ? 0 : (1 + (rain ? 2 : 0)), windowB);
  if (world.cup.state === 'table')
    add((h >= 17 && h < 22 ? 1.1 : 0.3), knockB);
  add((h >= 17 && h < 22 ? 0.5 : 0.12), zoomiesB);
  if (boxToday(d))
    add(2.2, boxB);
  if (away && !world.manduk)
    add((h >= 23 || h < 5) ? 0.8 : (!mandukHome(d) ? 0.5 : 0), secretB);
  if (mouseFree() && mouse.state !== 'duet')
    add(9, duetB);
  if (performance.now() - world.lastTouch > 20 * 60e3)
    add(0.15, pawB);
  if (!dark)
    add(oddLookWeight(d), oddLookB); // 책장의 이상한 책 올려다보기 (하루 한두 번)
  let tot = opts.reduce((s, o) => s + o[0], 0), r = Math.random() * tot;
  for (const [w, f] of opts) {
    if ((r -= w) <= 0) {
      f(d);
      return;
    }
  }
  loafB(d);
}
function napSpot(d) {
  const b = sunbeam(d);
  if (b && b.k > 0.4) {
    const side = (!mouse.hidden && mouse.state === 'nap') ? (mouse.x < b.cx ? 1 : -1) : pick([-1, 1]);
    return [b.cx + side * rnd(20, 55), rnd(660, 700)];
  }
  if (present(O.cushion)) {
    const c = S('cushion.nap');
    return [c[0] + rnd(-10, 10), c[1]];
  }
  if (O.heater && present(O.heater)) {
    const c = S('heater.warm');
    return [c[0] + rnd(-15, 15), c[1]];
  }
  return [rnd(250, 700), rnd(650, 710)];
}
function napB(d) {
  const [x, y] = napSpot(d), b = sunbeam(d);
  run(cat, [
    go(x, y, 55),
    hold(rnd(3, 6), 'loaf'),
    fn(a => {
      if (inBeam(b, a.x))
        say(a, '☀️😌💤', 5);
      else
        say(a, '💤', 4);
    }),
    hold(rnd(60, 200), 'loaf', true)
  ], 'nap');
}
export function loafB() {
  run(cat, [
    hold(rnd(15, 45), 'loaf'),
    fn(a => {
      if (Math.random() < 0.35)
        a.react = { f: 'yawn', t: 1.3 };
    }),
    hold(2, 'loaf'),
    hold(0.25, 'loaf', true),
    hold(rnd(8, 20), 'loaf'),
    hold(0.25, 'loaf', true),
    hold(rnd(5, 15), 'loaf')
  ], 'loaf');
}
export function groomB() {
  run(cat, [
    hold(rnd(2, 4), 'loaf'),
    bub('😌✨', 4),
    play('groom', rnd(5, 9)),
    hold(rnd(6, 14), 'loaf')
  ], 'groom');
}
function wanderB() {
  run(cat, [
    go(rnd(120, 1000), rnd(630, 730), 60),
    hold(rnd(3, 7), 'stand'),
    fn(a => {
      a.face *= -1;
    }),
    hold(rnd(2, 5), 'stand')
  ], 'wander');
}
export function rollB(d) {
  const b = sunbeam(d);
  const x = b && b.k > 0.4 ? b.cx + rnd(-30, 30) : rnd(300, 800);
  run(cat, [
    go(x, rnd(665, 705), 55),
    hold(1.5, 'loaf'),
    fn(a => {
      say(a, inBeam(b, a.x) ? '☀️🙃' : '🙃', 4);
      a.rock = 1;
    }),
    hold(rnd(6, 12), 'roll'),
    fn(a => a.rock = 0),
    ...(Math.random() < 0.6 ? [bub('💤', 4), play('bsleep', rnd(40, 120))] : [hold(rnd(10, 25), 'roll')]),
    hold(rnd(5, 10), 'loaf')
  ], 'roll');
}
export function windowB(d) {
  const rain = rainNow(d);
  run(cat, [
    go(S('window.watch')[0] + rnd(-30, 30), S('window.watch')[1], 60),
    hold(0.5, 'stand', false, -1),
    fn(a => {
      if (rain)
        say(a, wx() + '😒', 5);
      else {
        world.bird = { x: -20, y: rnd(90, 200), t: 0 };
        say(a, '🐦👀‼️', 4);
      }
    }),
    play('window', rnd(18, 40)),
    hold(rnd(8, 15), 'loaf', false, -1)
  ], 'window');
}
export function knockB() {
  run(cat, [
    go(S('cup.push')[0], S('cup.push')[1], 60),
    hold(1.5, 'stand', false, -1),
    bub('🥛👉😏', 3.5),
    hold(3, 'stand', false, -1),
    play('paw', 0.62),
    fn(() => {
      if (world.cup.state === 'table') {
        world.cup.state = 'falling';
        world.cup.fall = 0;
        world.cup.fy = 0;
      }
    }),
    play('paw', 0.3),
    fn(a => {
      a.act = null;
    }),
    hold(0.3, 'stand', false, -1),
    play('startle'),
    hold(0.8, 'stand', false, -1),
    fn(a => {
      world.noise += 0.9;
      say(a, '😼', 2.5);
    }),
    go(rnd(600, 800), rnd(660, 720), 75),
    hold(rnd(10, 20), 'loaf')
  ], 'knock');
}
function zoomiesB() {
  const pts = [[200, 700], [1000, 650], [350, 630], [900, 725], [500, 690]];
  const st = [bub('⚡', 1.5)];
  pts.slice(0, 3 + Math.floor(Math.random() * 2)).forEach(p => st.push(go(p[0], p[1], 260)));
  st.push(fn(a => {
    world.noise += 0.35;
    say(a, '😮‍💨', 3);
  }), hold(rnd(15, 30), 'loaf', true));
  run(cat, st, 'zoom');
}
export function boxB() {
  const e = S('box.enter'), i = S('box.inside');
  if (!e)
    return loafB();
  run(cat, [
    go(e[0], e[1], 60),
    hold(0.6, 'stand', false, -1),
    fn(a => {
      a.inBox = true;
      a.x = i[0];
      a.y = i[1];
      say(a, '📦❤️', 4);
    }),
    play('box', rnd(60, 160)),
    fn(a => {
      a.inBox = false;
      a.x = e[0];
      a.y = e[1] + 6;
    }),
    go(rnd(380, 760), rnd(660, 725), 55)
  ], 'box');
}
// 노트북 글자는 i18n.js의 laptopMess(키보드 밟기)·laptopReal(가끔 진짜 수식)
export function secretB() {
  const kb = socketOf(O.laptop, 'keyboard'), pw = FRAMES.cat_type_1 && PAW_TYPE, sc = FSC * DEPTH(S('laptop.type')[1]);
  const seat = kb && pw ? [kb[0] + pw[0] * sc, S('laptop.type')[1]] : S('laptop.type');
  run(cat, [
    go(seat[0], seat[1], 60),
    fn(a => {
      a.face = -1;
      a.typing = true;
      a.x = seat[0];
      a.y = seat[1];
      screenEvent('catTyping');
    }),
    fn(a => {
      world.laptop += pick(tr('laptopMess')) + (Math.random() < 0.35 ? '\n' + pick(tr('laptopReal')) + '\n' : '\n');
      store.set('laptop', world.laptop);
    }),
    play('type', 2.2),
    fn(a => say(a, pick(['∑', '{ }', '⚛️', '∫']), 0.6)),
    play('type', 0.6),
    fn(a => say(a, '🐟', 3)),
    play('type', rnd(6, 12)),
    fn(() => {
      world.lastType = world.t;
    }),
    fn(a => {
      a.typing = false;
    }),
    go(rnd(300, 650), rnd(660, 720), 55),
    hold(rnd(10, 20), 'loaf')
  ], 'secret');
  if (mouseFree()) {
    run(mouse, [
      go(S('laptop.watch')[0], S('laptop.watch')[1], 60),
      fn(a => {
        a.face = S('laptop.watch').face;
        if (!cat.typing)
          screenEvent('mouseWatching');
      }),
      hold(1.5, 'walk'),
      bub('👀', 3),
      hold(16, 'walk'),
      fn(a => {
        a.state = '';
      })
    ], 'laptop');
    mouse.state = 'laptop';
  }
}
export function pawB() {
  run(cat, [
    go(S('screen.tap')[0], S('screen.tap')[1], 55),
    hold(1, 'stand', false, -1),
    fn(a => say(a, '🐾❔', 3)),
    play('screen', 2.4),
    fn(a => {
      world.paw = { t: 0, x: a.x - 20, y: a.y - 120 };
    }),
    hold(3, 'stand'),
    hold(10, 'loaf')
  ], 'paw');
}
export function petCat() {
  if (world.manduk)
    return;
  annoy++;
  annoyT = 0;
  if (cat.act && cat.act.c === 'box') {
    say(cat, '❔', 2);
    return;
  }
  if (annoy <= 2) {
    say(cat, cat.closed ? '❔💤' : '❔', 2.5);
    if (cat.closed) {
      const was = cat.closed;
      cat.closed = false;
      setTimeout(() => {
        if (cat.tag === 'nap' || cat.tag === 'innocent')
          cat.closed = true;
      }, 1400);
    }
    if (annoy === 1 && cat.pose === 'roll')
      Snd.purr(2);
  }
  else if (annoy <= 4) {
    say(cat, '💢', 2.5);
    cat.rock = 1;
    setTimeout(() => cat.rock = 0, 1200);
  }
  else {
    annoy = 2;
    const tx = cat.x < 600 ? rnd(800, 1000) : rnd(150, 350);
    run(cat, [
      bub('💢💢', 2.5),
      hold(1, 'stand'),
      go(tx, rnd(660, 720), 70),
      play('sulk', rnd(40, 90)),
      bub('😑', 3),
      hold(20, 'loaf', true)
    ], 'sulk');
  }
}
