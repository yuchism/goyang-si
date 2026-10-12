/* 강고양이 씨 TV · 반응과 편성표 창: TV 보기, TV 위 낮잠, 뒤 빼꼼, 사건 반응, 편성표 창 */
import { play } from './anim.js';
import { loafB } from './cat.js';
import { O, S, socketOf } from './objects.js';
import { closeShelf } from './shelf.js';
import { Snd } from './sound.js';
import { bub, fn, go, hold, run } from './steps.js';
import { now } from './time.js';
import { TVP, fmtH, tvBday, tvCold, tvH, tvOn, tvSegs, tvState } from './tv.js';
import { noteEl, scrEl } from './ui.js';
import { esc, pick, rnd } from './util.js';
import { cat, say, world } from './world.js';
/* TV와 강고양이 씨 */
const TV_BUSY = ['knock', 'zoom', 'chase', 'stalk', 'boxhide', 'greet', 'birthday', 'wait', 'innocent', 'secret', 'box', 'tvrush', 'sulk', 'ufo', 'santa', 'paw', 'bfly', 'window'];
const faceTV = a => {
  a.face = O.tv.pos.x > a.x ? 1 : -1;
};
export function tvWatchFrame() {
  const st = world.tv.st;
  if (st && st.mode === 'prog' && TVP[st.p].sport) {
    const fast = st.ev && st.ev.e.size >= 2, seq = ['tv_track_left', 'tv_track_center', 'tv_track_right', 'tv_track_center'];
    return seq[Math.floor(world.t * (fast ? 2.4 : 0.6)) % 4];
  }
  if (O.tv && cat.x - O.tv.pos.x > 50)
    return (world.t % 9 < 1.2) ? 'tv_track_center' : 'tv_track_left'; // 비스듬히 앉았으면 고개를 TV 쪽으로
  return (world.t % 6.5 < 0.45) ? 'tv_watch_back_2of2' : 'tv_watch_back_1of2';
}
// TV 앞에 앉아서 보기
export function tvWatchB() {
  const w = S('tv.watch');
  if (!w || !tvOn())
    return loafB();
  const st = world.tv.st, long = st.mode === 'prog' && (st.p === 'drama' || TVP[st.p].sport);
  const side = Math.random() < 0.65; // 대개는 화면 오른쪽 앞에서 비스듬히, 가끔은 화면 바로 앞을 가리고 앉는다
  run(cat, [
    go(side ? w[0] + rnd(80, 100) : w[0] + rnd(-14, 14), w[1] + rnd(-4, 6), 60),
    fn(a => {
      a.face = -1;
      if (Math.random() < 0.35)
        say(a, '👀', 3);
    }),
    play('tvwatch', long ? rnd(80, 240) : rnd(25, 70), () => !tvOn()),
    hold(rnd(2, 4), 'loaf'),
    hold(rnd(10, 30), 'loaf', Math.random() < 0.4)
  ], 'tv');
}
// 따뜻한 TV 위에서 낮잠. 꺼지고 식으면 내려온다
export function tvTopB() {
  const s = S('tv.side');
  if (!s || !tvOn())
    return loafB();
  run(cat, [
    go(s[0], s[1], 60),
    hold(0.5, 'stand', false, -1),
    fn(a => {
      a.onTV = true;
      a.x = O.tv.pos.x + rnd(-14, 12);
      a.y = O.tv.pos.y + 0.5;
      a.face = pick([-1, 1]);
      Snd.thump(0.3, 300);
    }),
    hold(1.4, 'loaf'),
    bub('💤', 4),
    play('tvtop', rnd(240, 900), () => tvCold()),
    fn(a => {
      const cold = tvCold();
      a.onTV = false;
      a.x = s[0];
      a.y = s[1];
      a.dp = a.pose = 'stand';
      a.tr = null;
      Snd.thump(0.3, 300);
      if (cold)
        say(a, '😑', 3);
    }),
    go(rnd(260, 720), rnd(665, 720), 50),
    hold(rnd(20, 60), 'loaf', true)
  ], 'tvtop');
}
// TV 뒤로 돌아가 공이 어디 갔나 빼꼼
export function tvPeekB() {
  const b = S('tv.behind'), w = S('tv.watch'), edge = socketOf(O.tv, 'right');
  if (!b || !edge || !w)
    return;
  run(cat, [
    bub('❓', 2),
    go(b[0] + 20, b[1], 80),
    fn(a => {
      a.tvPeek = true;
      a.x = edge[0] - 9;
      a.y = b[1];
      a.face = -1;
    }),
    play('tvpeek', rnd(4, 7)),
    fn(a => {
      a.tvPeek = false;
      a.x = b[0] + 20;
      a.y = b[1];
    }),
    bub('❔', 2.5),
    go(w[0], w[1], 60),
    fn(a => {
      a.face = -1;
    }),
    play('tvwatch', rnd(20, 50), () => !tvOn()),
    hold(rnd(8, 15), 'loaf')
  ], 'tv');
}
// 큰 장면에 달려오지만 대개 이미 지나갔다
export function tvRush(key) {
  const w = S('tv.watch');
  world.tv.lastRush = world.t;
  run(cat, [
    bub('‼️', 1.4),
    go(w[0] + rnd(-10, 10), w[1], 175),
    fn(a => {
      a.face = -1;
      a.caught = world.tv.st && world.tv.st.key === key;
    }),
    play('tvwatch', 2.4),
    fn(a => {
      if (a.caught) {
        say(a, '‼️❤️', 3);
        run(a, [play('tvwatch', rnd(30, 90), () => !tvOn()), hold(rnd(10, 20), 'loaf')], 'tv');
      }
      else {
        say(a, '… 😮‍💨', 3.5);
        run(a, [
          play('sulk', rnd(15, 30)),
          bub('😑', 3),
          hold(rnd(10, 25), 'loaf')
        ], 'sulk');
      }
    })
  ], 'tvrush');
}
export function tvEventFired(e) {
  const T = world.tv;
  T.flash = world.t;
  Snd.tvEvent(e);
  if (world.manduk || cat.inBox || cat.typing || cat.dance)
    return;
  if (cat.act && cat.act.c === 'tvwatch') {
    if (e.id === 'next') {
      run(cat, [
        hold(1, 'stand'),
        bub('…', 3),
        play('sulk', rnd(20, 40)),
        hold(rnd(10, 20), 'loaf')
      ], 'sulk');
      return;
    }
    if (e.size >= 3)
      say(cat, e.id === 'nose' ? '❤️' : '‼️', 2.5);
    else if (e.size === 2 && Math.random() < 0.5)
      say(cat, '👀', 2);
    if ((e.id === 'chase' || e.id === 'box') && Math.random() < 0.3 && !world.manduk)
      setTimeout(() => {
        if (cat.act && cat.act.c === 'tvwatch')
          tvPeekB();
      }, 1500);
    return;
  }
  if (cat.onTV) {
    if (e.size >= 3 && Math.random() < 0.3)
      say(cat, '❔', 2);
    return;
  }
  if (TV_BUSY.includes(cat.tag) || cat.moving || cat.tr)
    return;
  if (cat.closed) {
    if (e.size >= 3 && Math.random() < 0.35)
      cat.react = { f: 'tv_ear_turn', t: 1.3 };
    return;
  }
  if (e.size < 3 && world.t - (T.lastReact || -1e9) < 15)
    return;
  T.lastReact = world.t;
  if (e.size === 1) {
    if (cat.dp === 'loaf' && !cat.act) {
      faceTV(cat);
      cat.react = { f: 'tv_ear_turn', t: 1.5 };
    }
    return;
  }
  if (e.size === 2) {
    if (!cat.act) {
      faceTV(cat);
      say(cat, '👀', 2.2);
    }
    return;
  }
  if (world.t - (T.lastRush || -1e9) > 240 && Math.random() < 0.6)
    tvRush(T.st.key);
  else {
    faceTV(cat);
    say(cat, '‼️', 1.8);
  }
}
export function tvReactPower() {
  if (world.manduk || cat.onTV)
    return;
  if (cat.closed) {
    if (cat.dp === 'loaf' && !cat.tr)
      cat.react = { f: 'tv_ear_turn', t: 1.3 };
    return;
  }
  if (!TV_BUSY.includes(cat.tag) && !cat.moving)
    say(cat, '❗', 2);
}
export function tvReactBeep() {
  if (world.manduk || cat.closed || cat.onTV || TV_BUSY.includes(cat.tag) || cat.moving)
    return;
  faceTV(cat);
  say(cat, '❔', 3);
}
/* TV를 누르면: 지금 화면을 크게 + 오늘 편성표 */
const tvgEl = document.getElementById('tvg');
export let tvBig = null;
function tvNowText(st) {
  if (!st)
    return '';
  if (st.mode === 'prog')
    return `지금 <b>${esc(st.sg.title)}</b> · ${fmtH(st.sg.s)}–${fmtH(st.sg.e)}`;
  return { off: '지금은 방송을 쉬는 시간이에요. 새벽 5시에 다시 켜져요.', testcard: '화면조정 중', opening: '방송을 시작합니다', signoff: '오늘 방송을 마치는 중' }[st.mode] || '';
}
export function openTvGuide() {
  const d = now(), st = world.tv.st || tvState(d), bd = tvBday(d), H = tvH(d), segs = tvSegs(bd);
  const rows = [[5, '방송 시작 · 화면조정과 아침 해'], ...segs.map(s => [s.s, s.title]), [24 + 55 / 60, '방송 마침 · 화면조정']];
  let cur = -1;
  if (st.mode !== 'off')
    rows.forEach((r, i) => {
      if (H >= r[0])
        cur = i;
    });
  noteEl.hidden = true;
  scrEl.hidden = true;
  closeShelf();
  tvgEl.innerHTML = '<button class="x" type="button" aria-label="TV 닫기">×</button><h2>고양.방송</h2><canvas width="320" height="240" aria-label="지금 TV 화면"></canvas>' +
    `<p class="now">${tvNowText(st)}</p><ol aria-label="오늘 편성표">` + rows.map((r, i) => `<li${i === cur ? ' class="cur" aria-current="true"' : ''}><time>${fmtH(r[0])}</time><span>${esc(r[1])}</span></li>`).join('') +
    '</ol><p class="foot">고양.방송은 실제 시간에 맞춰 나와요. 새벽 1시부터 5시까지는 쉬어요.</p>';
  tvBig = tvgEl.querySelector('canvas').getContext('2d');
  tvgEl.hidden = false;
  tvgEl.focus({ preventScroll: true });
  if (!cat.closed && !world.manduk && Math.random() < 0.4)
    say(cat, '👀', 1.6);
}
export function closeTvGuide() {
  if (tvgEl.hidden)
    return;
  tvgEl.hidden = true;
  tvBig = null;
}
tvgEl.addEventListener('click', e => {
  if (e.target.closest('.x'))
    closeTvGuide();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    closeTvGuide();
});
