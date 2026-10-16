/* 강고양이 씨와 쥐야쥐가 함께: 인사, 술래잡기, 노려보기, 상자 숨바꼭질, 같이 자기 */
import { play } from './anim.js';
import { loafB } from './cat.js';
import { MOUSE_RUN, mouseFleeAround } from './mouse.js';
import { A, P, PATH, S, aPt, ay } from './objects.js';
import { bub, faceTo, fn, follow, go, hold, inSpot, run, until } from './steps.js';
import { boxToday, now } from './time.js';
import { walkX, walkY } from './stage.js';
import { clamp, pick, rnd } from './util.js';
import { after, cat, mouse, say, world } from './world.js';
/* ───── 둘이 함께 ───── */
export const mouseFree = () => !mouse.hidden && !mouse.peek && mouse.state !== 'flee' && !world.manduk;
const nearCat = (dx, dy = 4) => [walkX(cat.x + dx, mouse.half), walkY(cat.y + dy)];
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
  const lap = PATH('duet.lap');
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
  after(() => {
    if (cat.tag === 'chase')
      cat.tag = 'rest';
  }, 11);
  world.noise += 0.15;
}
// 노려보기: 식빵 자세로 쥐야쥐를 지켜보다 가까이 오면 덮친다. 물론 놓친다
export function stalkS() {
  mouse.state = 'duet';
  const tx = walkX(cat.x + (mouse.x < cat.x ? -1 : 1) * rnd(150, 190), mouse.half);
  run(mouse, [
    go(walkX(mouse.x + (cat.x - mouse.x) * 0.3, mouse.half), ay(A('duet.stalk')), 55),
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
  // 상자가 처음 온 날은 닫혀 있어서 box.check 자리가 없다(objects.json box.states.closed). 자리가 하나라도 없으면 인사로
  const hd = S('boxback.hide'), ck = S('box.check'), po = S('boxback.out');
  if (!boxToday(now()) || !hd || !ck || !po)
    return greetS();
  mouse.state = 'duet';
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
        go(...aPt(A('duet.mouseRest')), 120),
        faceTo(cat),
        hold(rnd(8, 14), 'walk')
      ], 'tease');
    }),
    play('startle'),
    bub('‼️', 2),
    hold(1.5, 'stand'),
    go(po[0] + 40, po[1] + 20, 120),
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

/* ───── 매 장면 (main.js): 둘이 가까이 있을 때 저절로 일어나는 일 ───── */
export function duetTick(dt) {
  // 같이 낮잠 → 뒤척임 → 화들짝
  if (!mouse.hidden && mouse.state === 'nap' && mouse.closed && cat.tag === 'nap' && cat.closed && Math.abs(cat.x - mouse.x) < 190) {
    mouse.napTogether = (mouse.napTogether || 0) + dt;
    if (mouse.napTogether > rnd(40, 90)) {
      mouse.napTogether = 0;
      cat.pose = 'roll';
      cat.rock = 1;
      after(() => {
        cat.rock = 0;
        cat.pose = 'loaf';
      }, 2.6);
      mouse.state = 'flee';
      say(mouse, '‼️', 2);
      run(mouse, [
        hold(0.5, 'walk'),
        go(S('hole.out')[0], S('hole.out')[1], MOUSE_RUN),
        fn(a => {
          a.hidden = true;
          a.state = '';
          a.where = 'hole';
        })
      ], 'flee');
    }
  }
  // 자는 강고양이 씨 앞을 지나가는 쥐야쥐
  if (!mouse.hidden && cat.closed && cat.tag === 'nap' && mouse.state !== 'nap' && Math.abs(cat.x - mouse.x) < 120 && !cat.peeked) {
    cat.peeked = true;
    run(cat, [
      hold(2.5, 'loaf', false),
      bub('🐭 … 🙄', 3),
      hold(1, 'loaf', true),
      hold(rnd(40, 90), 'loaf', true)
    ], 'nap');
    after(() => cat.peeked = false, 60);
  }
  // 서로 의식하기
  if (!mouse.hidden && !mouse.peek && !world.manduk) {
    const dd = Math.hypot(cat.x - mouse.x, cat.y - mouse.y);
    if (dd < 420 && !cat.moving && !cat.act && !cat.tr && !cat.closed && !inSpot(cat) && cat.tag !== 'window')
      cat.face = mouse.x > cat.x ? 1 : -1;
    if (dd < 300 && !mouse.moving && !mouse.closed && mouse.state !== 'flee')
      mouse.face = cat.x > mouse.x ? 1 : -1;
    if (dd < 420 && !cat.duetT)
      cat.duetT = world.t;
  }
  else
    cat.duetT = 0;
}
