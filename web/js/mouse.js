/* 쥐야쥐: 숨는 곳, 나오기, 도망, 혼자 하는 행동 */
import { napNextTo } from './duet.js';
import { O, OBJ, S, present } from './objects.js';
import { bub, faceTo, fn, go, hold, run } from './steps.js';
import { inBeam, rainNow, sunbeam, wx } from './time.js';
import { clamp, pick, rnd } from './util.js';
import { cat, mouse, say, world } from './world.js';
/* ───────── 쥐야쥐의 뇌 ───────── */
function nearestHide() {
  const spots = OBJ.filter(o => o.kind === 'hideout' && present(o)).map(o => ({ k: o.id, p: S(o.id + '.hide') })).filter(s => s.p);
  spots.forEach(s => s.d = Math.hypot(s.p[0] - mouse.x, s.p[1] - mouse.y));
  spots.sort((a, b) => a.d - b.d);
  return spots[0];
}
export const MOUSE_RUN = 230;
export function mouseHideTime() {
  if (mouse.hidden)
    return 0;
  if (mouse.peek)
    return 0.3;
  return nearestHide().d / MOUSE_RUN + 0.7;
}
export function mouseHide(fast = true) {
  if (mouse.hidden)
    return;
  const s = nearestHide();
  mouse.state = 'flee';
  mouse.peek = false;
  mouse.closed = false;
  if (fast)
    mouse.react = { t: 0.3 };
  run(mouse, [
    ...(fast ? [hold(0.3, 'walk')] : []),
    go(s.p[0], s.p[1], fast ? MOUSE_RUN : 110, s.k === 'boxback' ? ['box'] : false),
    fn(a => {
      a.hidden = true;
      a.state = '';
      a.where = s.k;
      a.bub = null;
    })
  ], 'flee');
}
export function mouseFleeAround() {
  if (mouse.hidden)
    return;
  mouse.state = 'chased';
  const tx = clamp(mouse.x + (mouse.x < cat.x ? -1 : 1) * rnd(180, 300), 60, 1140);
  run(mouse, [
    go(tx, rnd(630, 730), 180),
    hold(0.6, 'walk'),
    fn(a => {
      if (Math.random() < 0.5)
        mouseHide(false);
      else {
        a.state = '';
        run(a, [hold(rnd(4, 8), 'walk')]);
      }
    })
  ], 'chased');
}
export function spawnMouse(d, force) {
  if (world.party)
    return; // 파티 중에는 쥐구멍에서 박수만
  if (!mouse.hidden || world.manduk)
    return;
  const s = nearestHideSpotFor(mouse.where || 'hole');
  mouse.x = s[0];
  mouse.y = s[1];
  mouse.hidden = false;
  mouse.state = '';
  mouse.outFor = rnd(160, 380);
  if ((mouse.where || 'hole') === 'hole') {
    mouse.peek = true;
    run(mouse, [hold(rnd(2.5, 5), 'walk'), fn(a => {
        a.peek = false;
        if (world.manduk)
          a.hidden = true;
      })], 'peek');
  }
  else
    mouseBrain(d);
  if (!cat.closed && !cat.act && !cat.inBox && !cat.moving)
    setTimeout(() => {
      if (!mouse.hidden && !cat.closed && !cat.act)
        say(cat, '👀', 2.5);
    }, 1500);
}
function nearestHideSpotFor(k) {
  return (O[k] && present(O[k]) && S(k + '.out')) || S('hole.out');
}
export function mouseBrain(d) {
  const b = sunbeam(d), rain = rainNow(d);
  mouse.state = '';
  if (mouse.outFor <= 0) {
    mouseHide(false);
    return;
  }
  const r = Math.random();
  if (rain && r < 0.4) {
    mouse.state = 'rain';
    run(mouse, [
      go(S('window.rainMouse')[0] + rnd(-20, 20), S('window.rainMouse')[1], 90),
      hold(1, 'walk', false, -1),
      bub(wx(), 4),
      hold(rnd(20, 40), 'walk', false, -1)
    ], 'rain');
    if (!world.manduk && cat.tag !== 'window' && Math.random() < 0.7)
      run(cat, [
        go(S('window.rainCat')[0], S('window.rainCat')[1], 55),
        hold(1, 'loaf', false, -1),
        bub(wx() + '👀', 5),
        hold(rnd(25, 40), 'loaf', false, -1)
      ], 'window');
    return;
  }
  if (b && b.k > 0.45 && r < 0.55) {
    const side = cat.tag === 'nap' && inBeam(b, cat.x) ? (cat.x < b.cx ? 1 : -1) : pick([-1, 1]);
    mouse.state = 'nap';
    run(mouse, [
      go(b.cx + side * rnd(70, 100), rnd(660, 700), 90),
      hold(2, 'walk'),
      bub('💤', 4),
      hold(rnd(60, 150), 'walk', true),
      fn(a => {
        a.state = '';
      })
    ], 'nap');
    return;
  }
  if (cat.closed && (cat.tag === 'nap' || cat.tag === 'loaf') && !cat.inBox && Math.random() < 0.6) {
    napNextTo();
    return;
  }
  const near = Math.random() < 0.55 && !cat.inBox;
  const tx = near ? clamp(cat.x + pick([-1, 1]) * rnd(140, 260), 80, 1120) : rnd(150, 1050), ty = near ? clamp(cat.y + rnd(-30, 30), 600, 738) : rnd(630, 730);
  run(mouse, [
    go(tx, ty, 85),
    hold(rnd(2, 5), 'walk'),
    ...(near ? [faceTo(cat), hold(rnd(2, 5), 'walk')] : [fn(a => {
        a.face *= -1;
      })]),
    hold(rnd(1, 3), 'walk')
  ], 'wander');
}
