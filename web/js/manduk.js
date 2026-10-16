/* 김만득 씨: 방문(밥, 소음, 귀가, 불 끄기, 기념일), 말풍선, 포스트잇 메모 */
import { straightenFrame } from './frame.js';
import { play } from './anim.js';
import { inked, rr } from './draw.js';
import { mouseHide, mouseHideTime } from './mouse.js';
import { A, O, P, S, aPt } from './objects.js';
import { Snd } from './sound.js';
import { cam, ctx } from './stage.js';
import { bub, fn, go, hold, run, until } from './steps.js';
import { oddHintToday } from './install.js';
import { FIRST, dayNum, isAnniversary, isWeekend, mandukAsleep, mandukHome, now, rainNow } from './time.js';
import { HAND, INK, RM, pick, rnd, store } from './util.js';
import { after, caption, cat, mouse, say, world } from './world.js';
import { tr } from './i18n.js';
import { sweepCrumbs } from './fish.js';
/* ───────── 김만득 씨 ───────── */
const LINES = () => tr('manduk'); // 방문 종류별 대사 묶음 (i18n.js의 manduk)
export function startVisit(type) {
  if (world.manduk)
    return;
  const d = now();
  world.manduk = { type, phase: 'steps', t: 0, say: null, lines: pick(LINES()[type] || LINES().check), li: 0 };
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
          }), bub('😋', 3), go(...aPt(A('cat.afterMeal')), 50), hold(20, 'loaf', true)] : [])
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
// 매 장면 (main.js): 소음 게이지가 차면 만득 씨가 와 본다. 주말 낮에는 가끔 그냥 들여다본다
export function visitTick(d, dt) {
  world.noise = Math.max(0, world.noise - dt * 0.02);
  const home = mandukHome(d), asleep = mandukAsleep(d);
  if (home && !world.manduk && world.visitsToday < 8 && world.t - world.lastVisit > 60) {
    if (world.noise > (asleep ? 1.25 : 0.8)) {
      world.noise = 0;
      startVisit(asleep ? 'night' : 'noise');
    }
    else if (!asleep && isWeekend(d) && Math.random() < dt / 900)
      startVisit('check');
  }
  if (!home)
    world.noise = Math.max(0, world.noise - dt * 0.05);
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
    if (m.t > 2.8 && m.li === 0) {
      m.li = 1;
      m.say = m.lines[1] || null;
      act2(m);
    }
    if (m.t > (m.extra ? 7.5 : 5.6)) {
      m.phase = 'leave';
      m.t = 0;
      m.say = null;
    }
    return;
  }
  if (m.phase === 'leave') {
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
      visitResults(m.type, 'end').forEach(r => r.done()); // 나간 뒤에 보이는 결과 (액자)
    }
  }
}
/* ───────── 다녀간 결과: 방문 종류별로 한 곳에 ─────────
   세 군데가 이 표를 쓴다. "만득 씨가 오면 ○○도 해 놓는다"를 더할 때는 여기 한 줄.
   - 실제 방문 (act): 장면에 맞춰 at초 뒤에 live(없으면 done). at이 'end'면 나간 뒤에. scene이면 장면이 직접 한다(act2)
   - 방문 도중 시간 점프 (endVisitNow): 바로 done
   - 꺼져 있던 동안 지나간 정해진 방문 (jump.js missedVisit): missed가 true인 것만 done.
     false인 것은 다른 곳이 시각으로 계산한다(밥그릇·스탠드·간식: jump.js, 액자: frame.js missedFix) */
const NOT_LIGHTS = t => t !== 'lights';
const VISIT_RESULTS = [
  { id: 'bowl', types: ['feed', 'ret'], at: 0.7, missed: false, live: () => {
      world.bowlFull = true;
      Snd.clink();
    }, done: () => {
      world.bowlFull = true;
    } },
  { id: 'crumbs', types: ['feed', 'ret'], at: 0.7, missed: true, done: () => sweepCrumbs() }, // 붕어빵 부스러기 (쪽지에 남음)
  { id: 'cup', types: ['feed', 'ret', 'noise'], at: t => t === 'noise' ? 1.1 : 0.7, missed: true, done: () => {
      if (world.cup.state === 'floor' || world.cup.state === 'falling')
        cupToTable();
    } },
  { id: 'lamp', types: ['lights'], at: 0.9, missed: false, live: () => {
      world.lampOn = false;
      Snd.click();
    }, done: () => {
      world.lampOn = false;
    } },
  { id: 'treat', types: ['anniv'], at: 0.8, missed: false, done: () => {
      world.treat = true;
    } },
  { id: 'laptop', types: NOT_LIGHTS, when: () => !!world.laptop, scene: true, missed: false, done: () => clearLaptop() }, // 노트북에 쓴 글 (act2가 말과 함께)
  { id: 'frame', types: ['feed', 'ret', 'lights', 'anniv'], at: 'end', missed: false, done: () => straightenFrame() }, // 삐뚤어진 액자
];
const has = (r, t) => typeof r.types === 'function' ? r.types(t) : r.types.includes(t);
// type 방문의 결과들. at: 'end'면 나간 뒤 것만, 'now'면 나가기 전 것만, 없으면 전부
function visitResults(type, at) {
  return VISIT_RESULTS.filter(r => has(r, type) && (!r.when || r.when()) && (at == null || (at === 'end') === (r.at === 'end')));
}
// 액자를 바로잡는 방문 이름들 (frame.js)
export const frameFixers = () => VISIT_RESULTS.find(r => r.id === 'frame').types;
// 꺼져 있던 동안 지나간 정해진 방문 하나의 결과 (jump.js)
export function missedVisit(type) {
  visitResults(type).filter(r => r.missed).forEach(r => r.done());
}
function clearLaptop() {
  world.laptop = '';
  store.set('laptop', '');
  world.notes.cleared = true;
}
function act(m) {
  const later = (sec, f) => after(() => {
    if (world.manduk === m)
      f();
  }, sec); // 시간 점프로 방문이 먼저 끝났으면 하지 않는다 (결과는 endVisitNow가 이미 적용)
  if (m.type === 'noise' && world.cup.state !== 'floor') { // 치울 게 없으면 조용히 하라는 말만
    m.lines = LINES().quiet[0];
    m.say = m.lines[0];
  }
  for (const r of visitResults(m.type, 'now'))
    if (!r.scene)
      later(typeof r.at === 'function' ? r.at(m.type) : r.at, r.live || r.done);
  if (visitResults(m.type).some(r => r.id === 'laptop'))
    m.extra = true; // 노트북을 치우느라 조금 더 머문다 (act2)
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
  const res = visitResults(m.type); // 표의 결과를 모두 바로 (act·act2·나간 뒤와 같은 결과)
  world.manduk = null;
  res.forEach(r => r.done());
}
function act2(m) {
  if (m.type === 'noise' && m.lines[1]) {
    after(() => world.manduk === m && say(cat, '🙉', 4), 0.6);
  }
  if (m.type === 'ret' || m.type === 'anniv') {
    Snd.purr(3);
    if (m.type === 'anniv')
      after(() => world.manduk === m && say(cat, '🎂❤️', 5), 0.5);
  }
  if (m.extra) {
    after(() => {
      if (world.manduk === m) {
        world.manduk.say = tr('mandukKeyboard');
        clearLaptop(); // 표의 laptop
      }
    }, 2.2);
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
// 만득 씨는 목소리(말풍선)로만 등장한다
export function drawManduk() {
  const m = world.manduk;
  if (!m || !['enter', 'act', 'leave'].includes(m.phase))
    return;
  drawMandukSay(m);
}
function drawMandukSay(m) {
  if (m.say) {
    ctx.save();
    ctx.font = '700 30px ' + HAND;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(m.say).width, bw = tw + 44, bh = 58, bx = Math.max(cam.x + 10, P.door.x - bw - 28), by = O.door.sayY + (RM ? 0 : Math.sin(world.t * 1.5) * 2);
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
