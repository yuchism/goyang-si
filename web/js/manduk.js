/* 김만득 씨: 방문(밥, 소음, 귀가, 불 끄기, 기념일), 말풍선, 포스트잇 메모 */
import { straightenFrame } from './frame.js';
import { play } from './anim.js';
import { inked, rr } from './draw.js';
import { mouseHide, mouseHideTime } from './mouse.js';
import { P, S } from './objects.js';
import { Snd } from './sound.js';
import { DEPTH, cam, ctx } from './stage.js';
import { bub, fn, go, hold, run, until } from './steps.js';
import { oddHintToday } from './install.js';
import { FIRST, dayNum, isAnniversary, now, rainNow } from './time.js';
import { HAND, INK, RM, ease, lerp, pick, rnd, store } from './util.js';
import { caption, cat, mouse, say, world } from './world.js';
import { tr } from './i18n.js';
import { sweepCrumbs } from './fish.js';
/* ───────── 김만득 씨 ───────── */
const LINES = () => tr('manduk'); // 방문 종류별 대사 묶음 (i18n.js의 manduk)
export function startVisit(type) {
  if (world.manduk)
    return;
  const d = now();
  world.manduk = { type, phase: 'steps', t: 0, legX: 1320, stride: 0, say: null, hand: null, lines: pick(LINES()[type] || LINES().check), li: 0 };
  world.lastVisit = world.t;
  world.visitsToday++;
  // 규칙: 만득 씨는 절대 쥐야쥐를 보면 안 된다
  world.manduk.stepsDur = Math.max(2.6, mouseHideTime() + 0.5);
  mouseHide(true);
  world.mouseCool = 40;
  // 강고양이 씨: 시치미
  cat.typing = false;
  const innocent = () => {
    if (type === 'feed' || type === 'ret' || type === 'anniv') {
      run(cat, [
        bub('👣❤️', 3),
        go(S('door.greet')[0], S('door.greet')[1], 95),
        hold(1, 'stand', false, 1),
        until(() => !world.manduk, 40),
        ...(type === 'feed' || type === 'ret' ? [go(S('bowl.eat')[0], S('bowl.eat')[1], 60), fn(a => {
            a.face = -1;
          }), until(() => world.bowlFull, 10), play('eat', 14), fn(() => {
            world.bowlFull = false;
          }), bub('😋', 3), go(rnd(500, 800), rnd(670, 720), 50), hold(20, 'loaf', true)] : [])
      ], 'greet');
      return;
    }
    say(cat, '👣❗', 2.5);
    if (cat.inBox)
      return; // 상자 안에 있으면 그대로 시치미
    if (cat.dp === 'stand' && !cat.tr && Math.random() < 0.7)
      run(cat, [
        play('startle'),
        hold(0.6, 'stand'),
        fn(() => innocent2())
      ], 'innocent');
    else
      innocent2();
  };
  const innocent2 = () => {
    const choice = type === 'lights' ? 'sleep' : pick(['roll', 'sleep', 'groom', 'loaf']);
    if (choice === 'roll')
      run(cat, [
        hold(1, 'loaf'),
        fn(a => a.rock = 1),
        hold(1, 'roll'),
        until(() => !world.manduk, 60),
        fn(a => a.rock = 0),
        hold(5, 'roll', true)
      ], 'innocent');
    else if (choice === 'sleep')
      run(cat, [
        hold(0.5, 'loaf', true),
        until(() => !world.manduk, 60),
        hold(rnd(20, 60), 'loaf', true)
      ], 'innocent');
    else if (choice === 'groom')
      run(cat, [play('groom', 60, () => !world.manduk), hold(8, 'loaf')], 'innocent');
    else
      run(cat, [
        hold(0.5, 'loaf'),
        until(() => !world.manduk, 60),
        hold(8, 'loaf')
      ], 'innocent');
  };
  if (!cat.inBox)
    cat.act = null;
  innocent();
  caption(tr('capSteps'), 2.4);
  Snd.thump(0.6);
}
export function updateManduk(dt) {
  const m = world.manduk;
  if (!m)
    return;
  m.t += dt;
  const pace = (x) => {
    if (Math.random() < dt * 2.2)
      Snd.thump(0.5);
  };
  if (m.phase === 'steps') {
    pace();
    if (m.t >= m.stepsDur) {
      if (!mouse.hidden) {
        m.phase = 'pause';
        m.t = 0;
        caption(tr('capSlipper'), 3);
      }
      else {
        m.phase = 'open';
        m.t = 0;
        Snd.door();
      }
    }
    return;
  }
  if (m.phase === 'pause') {
    if (mouse.hidden && m.t > 1.2) {
      m.phase = 'open';
      m.t = 0;
      Snd.door();
    }
    return;
  }
  if (!mouse.hidden) {
    mouse.hidden = true;
    mouse.peek = false;
    mouse.steps = [];
    mouse.cur = null;
  } // 안전장치
  if (m.phase === 'open') {
    if (m.t > 0.9) {
      m.phase = 'enter';
      m.t = 0;
    }
    return;
  }
  if (m.phase === 'enter') {
    m.legX = lerp(1380, 1040, ease(Math.min(1, m.t / 1.8)));
    m.stride += dt * 4.4;
    if (Math.random() < dt * 3)
      Snd.thump(0.8);
    if (m.t > 1.8) {
      m.phase = 'act';
      m.t = 0;
      m.say = m.lines[0];
      m.li = 0;
      act(m);
    }
    return;
  }
  if (m.phase === 'act') {
    if (m.hand) {
      m.hand.k = Math.min(1, m.hand.k + dt * 1.2);
    }
    if (m.t > 2.8 && m.li === 0) {
      m.li = 1;
      m.say = m.lines[1] || null;
      act2(m);
    }
    if (m.t > (m.extra ? 7.5 : 5.6)) {
      m.phase = 'leave';
      m.t = 0;
      m.say = null;
      m.hand = null;
    }
    return;
  }
  if (m.phase === 'leave') {
    m.legX = lerp(m.legX, 1400, Math.min(1, dt * 1.8));
    m.stride += dt * 6;
    if (Math.random() < dt * 3)
      Snd.thump(0.6);
    if (m.t > 1.6) {
      m.phase = 'close';
      m.t = 0;
      Snd.door();
    }
    return;
  }
  if (m.phase === 'close') {
    if (m.t > 0.9) {
      world.manduk = null;
      straightenFrame(m.type); // 다녀가면서 삐뚤어진 액자를 바로잡아 놓았다
    }
  }
}
function act(m) {
  const d = now();
  const later = (ms, f) => setTimeout(() => {
    if (world.manduk === m)
      f();
  }, ms); // 시간 점프로 방문이 먼저 끝났으면 하지 않는다 (결과는 endVisitNow가 이미 적용)
  if (m.type === 'feed' || m.type === 'ret') {
    m.hand = { x: P.bowl.x, y: P.bowl.y - 20, k: 0 };
    later(700, () => {
      world.bowlFull = true;
      Snd.clink();
      sweepCrumbs(); // 붕어빵 부스러기도 치운다 (쪽지에 남음)
      if (world.cup.state === 'floor')
        cupToTable();
    });
  }
  if (m.type === 'noise') {
    if (world.cup.state === 'floor') {
      later(1100, cupToTable);
    }
    else {
      m.lines = LINES().quiet[0];
      m.say = m.lines[0];
    }
  }
  if (m.type === 'lights') {
    later(900, () => {
      world.lampOn = false;
      Snd.click();
    });
  }
  if (m.type === 'anniv') {
    later(800, () => {
      world.treat = true;
    });
  }
  if (world.laptop && m.type !== 'lights') {
    m.extra = true;
  }
}
// 컵을 탁자 위 제자리로
export function cupToTable() {
  const c = world.cup;
  c.state = 'table';
  c.fall = 0;
  c.x = P.cup.x;
  c.y = P.cup.y;
}
// 시간 점프 (jump.js): 하던 방문을 바로 끝내고 그 방문의 결과만 남긴다. 문은 닫힌 채
export function endVisitNow() {
  const m = world.manduk;
  if (!m)
    return;
  const t = m.type;
  if ((t === 'feed' || t === 'ret' || t === 'noise') && (world.cup.state === 'floor' || world.cup.state === 'falling'))
    cupToTable();
  if (t === 'feed' || t === 'ret') {
    world.bowlFull = true;
    sweepCrumbs();
  }
  if (t === 'lights')
    world.lampOn = false;
  if (t === 'anniv')
    world.treat = true;
  if (world.laptop && t !== 'lights') { // 노트북에 쓴 글을 치우고 간다 (act2의 extra와 같은 결과)
    world.laptop = '';
    store.set('laptop', '');
    world.notes.cleared = true;
  }
  world.manduk = null;
  straightenFrame(t);
}
function act2(m) {
  if (m.type === 'noise' && m.lines[1]) {
    setTimeout(() => world.manduk === m && say(cat, '🙉', 4), 600);
  }
  if (m.type === 'ret' || m.type === 'anniv') {
    m.hand = { x: cat.x, y: cat.y - 100 * DEPTH(cat.y), k: 0 };
    Snd.purr(3);
    if (m.type === 'anniv')
      setTimeout(() => world.manduk === m && say(cat, '🎂❤️', 5), 500);
  }
  if (m.extra) {
    setTimeout(() => {
      if (world.manduk === m) {
        world.manduk.say = tr('mandukKeyboard');
        world.laptop = '';
        store.set('laptop', '');
        world.notes.cleared = true;
      }
    }, 2200);
  }
}
/* ───────── 포스트잇 ───────── */
// 포스트잇 글은 i18n.js의 notes (날마다 하나씩 차례로)
world.notes = { cleared: false };
export function todaysNote(d) {
  if (isAnniversary(d))
    return tr('noteAnniv');
  if (world.notes.cleared)
    return tr('noteLaptop');
  if (world.notes.crumbs)
    return tr('noteCrumbs');
  if (rainNow(d))
    return tr('noteRain');
  if (oddHintToday(d))
    return tr('noteOddHint'); // 설치 안 한 사람에게, 두 번째 방문부터 가끔 (MOBILE_PLAN.md 4-3)
  const NOTES = tr('notes'), idx = Math.floor((dayNum(d) - dayNum(FIRST) + NOTES.length * 100)) % NOTES.length;
  return NOTES[idx];
}
export function drawManduk(part) {
  const m = world.manduk;
  if (!m || !['enter', 'act', 'leave'].includes(m.phase))
    return;
  if (part === 'say') {
    drawMandukSay(m);
    return;
  }
  return; // 만득 씨는 말풍선으로만 등장한다 (다리 그림은 쓰지 않음)
  const x = m.legX, walking = m.phase !== 'act', ph = m.stride;
  // 고양이 눈높이: 무릎과 허벅지 아래만 보인다. 고양이 키(30cm)의 세 배쯤이 무릎 위까지
  const leg = (fx, i) => {
    const s = walking ? Math.sin(ph + i * Math.PI) : 0, lift = Math.max(0, s) * 30, sw = s * 26;
    const fy = 738 - lift, ax = fx + sw, ay = fy - 62, kx = fx + sw * 0.55 + 14, ky = fy - 330, hx = fx + 6, hy = -30;
    const poly = (pts) => {
      ctx.beginPath();
      pts.forEach(([px, py], j) => j ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
      ctx.closePath();
    };
    // 허벅지 + 정강이 (바지)
    poly([[hx - 66, hy], [hx + 66, hy], [kx + 52, ky], [ax + 42, ay], [ax - 42, ay], [kx - 50, ky]]);
    inked('#3d4a66', 5);
    ctx.strokeStyle = 'rgba(20,25,40,.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(kx - 30, ky - 12);
    ctx.quadraticCurveTo(kx, ky + 8, kx + 30, ky - 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx + 6, hy + 60);
    ctx.lineTo(kx + 4, ky - 30);
    ctx.stroke();
    // 바짓단, 발목
    ctx.beginPath();
    ctx.rect(ax - 44, ay - 16, 88, 16);
    inked('#2f3a52', 4);
    ctx.beginPath();
    ctx.rect(ax - 28, ay, 56, 24);
    inked('#f0c9a0', 4);
    // 삼선 슬리퍼
    const sx = ax - 12, sy = fy;
    ctx.beginPath();
    ctx.moveTo(sx - 86, sy);
    ctx.lineTo(sx + 64, sy);
    ctx.quadraticCurveTo(sx + 78, sy - 20, sx + 52, sy - 38);
    ctx.lineTo(sx - 70, sy - 38);
    ctx.quadraticCurveTo(sx - 98, sy - 20, sx - 86, sy);
    inked('#2f3d6b', 4);
    ctx.strokeStyle = '#f4f1e8';
    ctx.lineWidth = 6;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(sx - 36 + k * 20, sy - 36);
      ctx.lineTo(sx - 48 + k * 20, sy - 8);
      ctx.stroke();
    }
  };
  ctx.save();
  leg(x + 70, 1);
  leg(x - 70, 0);
  if (m.hand) {
    const hk = ease(m.hand.k), sx0 = x - 150, hx = lerp(sx0, m.hand.x, hk), hy = lerp(-60, m.hand.y, hk);
    ctx.beginPath();
    ctx.moveTo(sx0, -60);
    ctx.quadraticCurveTo(lerp(sx0, hx, 0.5), lerp(-60, hy, 0.25), hx, hy - 26);
    ctx.lineCap = 'round';
    ctx.lineWidth = 58;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 48;
    ctx.strokeStyle = '#d9a441';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(hx, hy, 30, 22, 0, 0, 7);
    inked('#f0c9a0', 4);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    [-12, 0, 12].forEach(o => {
      ctx.beginPath();
      ctx.moveTo(hx + o, hy + 8);
      ctx.lineTo(hx + o, hy + 18);
      ctx.stroke();
    });
  }
  ctx.restore();
}
function drawMandukSay(m) {
  const x = m.legX;
  if (m.say) {
    ctx.save();
    ctx.font = '700 30px ' + HAND;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(m.say).width, bw = tw + 44, bh = 58, bx = Math.max(cam.x + 10, P.door.x - bw - 28), by = 150 + (RM ? 0 : Math.sin(world.t * 1.5) * 2);
    rr(bx, by, bw, bh, 26);
    inked('#ffffff', 4);
    // 꼬리는 문 쪽(화면 밖 만득 씨)을 가리킨다
    ctx.beginPath();
    ctx.moveTo(bx + bw - 2, by + 16);
    ctx.lineTo(bx + bw + 40, by - 6);
    ctx.lineTo(bx + bw - 2, by + 40);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx + bw, by + 16);
    ctx.lineTo(bx + bw + 40, by - 6);
    ctx.lineTo(bx + bw, by + 40);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillText(m.say, bx + bw / 2, by + bh / 2 + 2);
    ctx.restore();
  }
}
