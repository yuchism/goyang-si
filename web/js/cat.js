/* 강고양이 씨: 하고 싶은 일 고르기(뇌)와 혼자 하는 행동들, 쓰다듬기 */
import { skyRnd } from './win.js';
import { play } from './anim.js';
import { FRAMES, FSC } from './assets.js';
import { screenEvent } from './draw.js';
import { duetB, mouseFree } from './duet.js';
import { A, O, PATH, PL, S, aPt, ax, ay, has, present, socketOf } from './objects.js';
import { playOk } from './plays.js';
import { Snd } from './sound.js';
import { DEPTH, W } from './stage.js';
import { bub, fn, go, hold, run } from './steps.js';
import { boxToday, inBeam, inParts, isNight, mandukAsleep, mandukHome, nightDark, rainNow, secretTime, sunbeam, wx } from './time.js';
import { TVP, tvOn, tvPrime } from './tv.js';
import { tvTopB, tvTopBlockedB, tvWatchB } from './tv-cat.js';
import { pick, rnd, store } from './util.js';
import { tr } from './i18n.js';
import { oddLookB, oddLookWeight } from './install.js';
import { after, cat, mouse, say, world } from './world.js';
import { bowlWatchB, bowlWatchOk, fishB, fishOk } from './fish.js';
import { penStareB, penStareOk } from './laser.js';
import { wheelB, wheelOk } from './wheel.js';
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
  // 시간 기준은 time.js (TIME_BASE_PLAN.md 5장): 어두움 = 스탠드 꺼짐 + 불 끈 뒤 ~ 해 뜰 때, 활동 리듬은 자연 시간대
  const b = sunbeam(d), rain = rainNow(d), dark = world.lampOn === false && nightDark(d);
  const evening = inParts(d, 'evening', 'night'), lively = inParts(d, 'dusk', 'evening'), night = isNight(d);
  const away = !mandukHome(d) || mandukAsleep(d);
  const opts = [];
  const add = (w, f) => {
    if (w > 0)
      opts.push([w, f]);
  };
  add(4 + (b && b.k > 0.4 ? 5 : 0) + (dark ? 8 : 0) + (inParts(d, 'day') ? 2 : 0), napB); // 낮잠: 낮 칸
  add(3.5, loafB);
  add(1.4, groomB);
  add(dark ? 0.3 : 1.4, wanderB);
  if (tvOn()) {
    const st = world.tv.st, pr = st.mode === 'prog' ? st.p : null, prime = !!pr && tvPrime(st.sg);
    add(dark ? 0.5 : prime ? 4 : pr && TVP[pr].watch === 'track' ? 2 : 0.9, tvWatchB);
    if (!present(O.pumpkin))
      add(evening ? 1.3 : 0.5, tvTopB); // TV 위 낮잠: 저녁·밤
    else
      add(evening ? 0.35 : 0.15, tvTopBlockedB); // 할로윈: 올라가려다 호박 때문에 포기
  }
  add(1 + (b && b.k > 0.4 ? 2.2 : 0), rollB);
  if (has('window'))
    add(dark ? 0 : (1 + (rain ? 2 : 0)), windowB);
  if (has('cup') && world.cup.state === 'table')
    add(lively ? 1.1 : 0.3, knockB); // 컵 치기·우다다: 해질녘·저녁
  add(lively ? 0.5 : 0.12, zoomiesB);
  if (has('box') && boxToday(d))
    add(2.2, boxB);
  if (away && !world.manduk && has('laptop'))
    add(secretTime(d) ? 0.8 : (!mandukHome(d) ? 0.5 : 0), secretB); // 비밀 타자: 만득 씨 잠든 뒤 ~ 일어나기 2시간 전
  if (mouseFree() && mouse.state !== 'duet')
    add(9, duetB);
  if (performance.now() - world.lastTouch > 20 * 60e3)
    add(0.15, pawB);
  if (!dark && has('bookshelf'))
    add(oddLookWeight(d), oddLookB);
  if (playOk('fish') && fishOk(d))
    add(1.6, fishB); // 어항 낚시 (방 시각으로 4시간에 한 번까지, 낮에만)
  if (playOk('fish') && bowlWatchOk(d))
    add(dark ? 0.6 : night ? 1.0 : 0.15, bowlWatchB); // 밤 어항 구경
  if (!dark && playOk('wheel') && wheelOk(d))
    add(1.2, wheelB); // 쳇바퀴 (방 시각 4시간에 한 번, 9~20시)
  if (!dark && playOk('laser') && penStareOk())
    add(0.3, penStareB); // 레이저 포인터 노려보기 // 책장의 이상한 책 올려다보기 (하루 한두 번)
  let tot = opts.reduce((s, o) => s + o[0], 0), r = Math.random() * tot;
  for (const [w, f] of opts) {
    if ((r -= w) <= 0) {
      f(d);
      return;
    }
  }
  loafB(d);
}
export function napSpot(d) {
  const b = sunbeam(d);
  if (b && b.k > 0.4) {
    const side = (!mouse.hidden && mouse.state === 'nap') ? (mouse.x < b.cx ? 1 : -1) : pick([-1, 1]);
    return [b.cx + side * rnd(20, 55), ay(A('beam.nap'))];
  }
  if (present(O.cushion)) {
    const c = S('cushion.nap');
    return [c[0] + rnd(-10, 10), c[1]];
  }
  if (O.heater && present(O.heater)) {
    const c = S('heater.warm');
    return [c[0] + rnd(-15, 15), c[1]];
  }
  return aPt(A('cat.nap'));
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
    go(...aPt(A('cat.roam')), 60),
    hold(rnd(3, 7), 'stand'),
    fn(a => {
      a.face *= -1;
    }),
    hold(rnd(2, 5), 'stand')
  ], 'wander');
}
export function rollB(d) {
  const b = sunbeam(d);
  const x = b && b.k > 0.4 ? b.cx + rnd(-30, 30) : ax(A('cat.roll'));
  run(cat, [
    go(x, ay(A('cat.roll')), 55),
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
        world.bird = { x: -20, y: skyRnd('bird'), t: 0 };
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
    go(...aPt(A('cat.afterKnock')), 75),
    hold(rnd(10, 20), 'loaf')
  ], 'knock');
}
function zoomiesB() {
  const pts = PATH('cat.zoomies');
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
  if (!e || !i) // 닫힌 상자 날엔 둘 다 없다 (objects.json box.states.closed)
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
    go(...aPt(A('cat.afterBox')), 55)
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
    go(...aPt(A('cat.afterType')), 55),
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
      after(() => {
        if (cat.tag === 'nap' || cat.tag === 'innocent')
          cat.closed = true;
      }, 1.4);
    }
    if (annoy === 1 && cat.pose === 'roll')
      Snd.purr(2);
  }
  else if (annoy <= 4) {
    say(cat, '💢', 2.5);
    cat.rock = 1;
    after(() => cat.rock = 0, 1.2);
  }
  else {
    annoy = 2;
    const sulk = A(cat.x < W / 2 ? 'cat.sulkRight' : 'cat.sulkLeft'), tx = ax(sulk);
    run(cat, [
      bub('💢💢', 2.5),
      hold(1, 'stand'),
      go(tx, ay(sulk), 70),
      play('sulk', rnd(40, 90)),
      bub('😑', 3),
      hold(20, 'loaf', true)
    ], 'sulk');
  }
}

/* ───── 매 장면 (main.js) ───── */
// 낮잠 자다 햇빛 조각이 옮겨 가면 따라간다
export function sunbeamTick(d, dt) {
  const b = sunbeam(d);
  if (cat.tag === 'nap' && cat.closed && b && b.k > 0.4 && !inBeam(b, cat.x) && Math.abs(cat.x - b.cx) < 300 && Math.random() < dt / 20) {
    run(cat, [
      hold(0.8, 'loaf'),
      bub('☀️➡️ 😑', 3.5),
      hold(2, 'loaf'),
      go(b.cx + rnd(-30, 30), cat.y, 40),
      hold(1, 'loaf'),
      hold(rnd(60, 160), 'loaf', true)
    ], 'nap');
  }
}
// 탁자에서 떨어지는 컵 (knockB)
export function cupTick(dt) {
  const c = world.cup;
  if (c.state === 'falling') {
    c.fall += dt * 1.6;
    c.fy = c.y + c.fall * c.fall * 90;
    c.x += dt * 40;
    const floor = PL('cup.floor').y;
    if (c.fy >= floor) {
      c.fy = floor;
      c.state = 'floor';
      Snd.clink();
    }
  }
}
