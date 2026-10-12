/* 강고양이 씨와 쥐야쥐가 함께: 인사, 술래잡기, 노려보기, 상자 숨바꼭질, 같이 자기 */
import { play } from './anim.js';
import { loafB } from './cat.js';
import { mouseFleeAround } from './mouse.js';
import { P, S } from './objects.js';
import { bub, faceTo, fn, follow, go, hold, run, until } from './steps.js';
import { boxToday, now } from './time.js';
import { clamp, pick, rnd } from './util.js';
import { cat, mouse, say, world } from './world.js';
/* ───── 둘이 함께 ───── */
export const mouseFree = () => !mouse.hidden && !mouse.peek && mouse.state !== 'flee' && !world.manduk;
const nearCat = (dx, dy = 4) => [clamp(cat.x + dx, 60, 1140), clamp(cat.y + dy, 600, 738)];
// 인사: 쥐야쥐가 다가와 코를 킁킁, 강고양이 씨는 귀찮은 듯 바라보다 하품
export function greetS() {
  const side = mouse.x < cat.x ? -1 : 1, [mx, my] = nearCat(side * 110);
  mouse.state = 'duet';
  run(mouse, [
    go(mx, my, 80),
    faceTo(cat),
    bub('👃', 3),
    hold(3.5, 'walk'),
    bub('…', 2),
    hold(rnd(3, 6), 'walk'),
    fn(a => {
      a.state = '';
    })
  ], 'greet');
  run(cat, [
    until(() => Math.hypot(mouse.x - cat.x, mouse.y - cat.y) < 170 || mouse.hidden, 14),
    faceTo(mouse),
    bub('🐭…🙄', 3.5),
    hold(3.5, cat.dp === 'roll' ? 'roll' : 'loaf'),
    fn(a => {
      a.react = { f: 'yawn', t: 1.3 };
    }),
    hold(rnd(6, 12), 'loaf')
  ], 'greet');
}
// 술래잡기: 쥐야쥐가 상자와 탁자를 돌아 달아나고, 강고양이 씨가 따라가다 지쳐 드러눕는다. 쥐야쥐도 근처에 멈춰 같이 쉰다
export function chaseS() {
  const lap = [[300, 736], [560, 738], [880, 712], [1100, 700], [840, 668], [520, 664]];
  const st = lap.slice(0, 3 + Math.floor(Math.random() * 3));
  mouse.state = 'duet';
  run(mouse, [
    fn(a => {
      a.react = { t: 0.35 };
    }),
    bub('‼️', 1.5),
    hold(0.35, 'walk'),
    ...st.map(p => go(p[0], p[1], 190)),
    hold(0.4, 'walk'),
    faceTo(cat),
    bub('😏', 3),
    until(() => cat.tag === 'rest', 12),
    hold(rnd(12, 22), 'walk', true),
    fn(a => {
      a.state = '';
    })
  ], 'chase');
  say(cat, '🐭‼️', 2);
  run(cat, [
    hold(0.5, 'stand'),
    follow(mouse, 150, 60, rnd(6, 10), 40),
    fn(a => {
      a.moving = false;
      say(a, '😮‍💨', 3);
      a.tag = 'rest';
    }),
    hold(rnd(14, 24), 'loaf'),
    hold(rnd(10, 20), 'loaf', true)
  ], 'chase');
  setTimeout(() => {
    if (cat.tag === 'chase')
      cat.tag = 'rest';
  }, 11000);
  world.noise += 0.15;
}
// 노려보기: 식빵 자세로 쥐야쥐를 지켜보다 가까이 오면 덮친다. 물론 놓친다
export function stalkS() {
  mouse.state = 'duet';
  const tx = clamp(cat.x + (mouse.x < cat.x ? -1 : 1) * rnd(150, 190), 80, 1120);
  run(mouse, [
    go(clamp(mouse.x + (cat.x - mouse.x) * 0.3, 80, 1120), rnd(650, 730), 55),
    hold(rnd(2, 4), 'walk'),
    go(tx, cat.y + rnd(-20, 20), 55),
    hold(0.5, 'walk')
  ], 'stalked');
  run(cat, [
    hold(0.3, 'loaf'),
    bub('👀', 4),
    until(() => Math.hypot(mouse.x - cat.x, mouse.y - cat.y) < 200 && !mouse.moving || mouse.hidden, 25),
    fn(a => {
      if (mouse.hidden)
        return;
      a.face = mouse.x > a.x ? 1 : -1;
      say(a, '⚡', 1.2);
      mouseFleeAround();
    }),
    hold(0.2, 'stand'),
    follow(mouse, 190, 40, 1.4),
    fn(a => {
      say(a, '😑', 3);
    }),
    play('startle'),
    hold(rnd(4, 8), 'stand'),
    hold(rnd(10, 20), 'loaf')
  ], 'stalk');
}
// 상자 숨바꼭질: 쥐야쥐가 상자 뒤로 숨고, 강고양이 씨가 기웃거리면 반대편으로 쏙 나온다
export function boxHideS() {
  if (!boxToday(now()))
    return greetS();
  mouse.state = 'duet';
  const hd = S('boxback.hide'), ck = S('box.check'), po = S('boxback.out');
  run(mouse, [go(hd[0], hd[1], 170, ['box']), fn(a => {
      a.hidden = true;
      a.where = 'boxback';
    })], 'boxhide');
  run(cat, [
    hold(0.6, 'stand'),
    bub('❓', 2),
    until(() => mouse.hidden, 8),
    go(ck[0], ck[1], 70),
    faceTo({ x: P.box.x }),
    bub('❓📦', 3),
    play('lookup', 3),
    hold(1.2, 'stand', false, -1),
    fn(() => {
      mouse.hidden = false;
      mouse.peek = false;
      mouse.x = po[0];
      mouse.y = po[1];
      mouse.face = -1;
      mouse.react = { t: 0.5 };
      mouse.state = '';
      say(mouse, '😜', 2.5);
      run(mouse, [
        hold(0.5, 'walk'),
        go(rnd(120, 240), rnd(640, 700), 120),
        faceTo(cat),
        hold(rnd(8, 14), 'walk')
      ], 'tease');
    }),
    play('startle'),
    bub('‼️', 2),
    hold(1.5, 'stand'),
    go(S('boxback.out')[0] + 40, S('boxback.out')[1] + 20, 120),
    hold(1, 'stand'),
    bub('😮‍💨', 3),
    hold(rnd(12, 20), 'loaf')
  ], 'boxhide');
}
// 같이 자기: 자고 있는 강고양이 씨 옆으로 와서 동그랗게 눕는다
export function napNextTo() {
  const side = pick([-1, 1]), [mx, my] = nearCat(side * rnd(100, 125), rnd(2, 10));
  mouse.state = 'nap';
  run(mouse, [
    go(mx, my, 60),
    faceTo(cat),
    hold(1.5, 'walk'),
    bub('💤', 3),
    hold(rnd(60, 160), 'walk', true),
    fn(a => {
      a.state = '';
    })
  ], 'nap');
}
export function duetB() {
  if (!mouseFree())
    return loafB();
  const opts = [[3, greetS], [2.5, chaseS], [2, stalkS]];
  if (boxToday(now()))
    opts.push([2, boxHideS]);
  let t = opts.reduce((s, o) => s + o[0], 0) * Math.random();
  for (const [w, f] of opts) {
    if ((t -= w) <= 0)
      return f();
  }
  greetS();
}
