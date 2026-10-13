/* 시간 점프: 화면이 꺼졌다 켜지거나, 서머타임이 바뀌거나, 미리보기 도구로 시각을 옮겨 방 시계가 건너뛰었을 때
   방의 상태를 그 시각에 맞춘다. 장면은 건너뛰고 결과만 적용한다. CLOCK_PLAN.md 5~7장
   원칙: 상태는 시각에서 계산하고, 사건(main.js scheduled)은 그 상태로 넘어가는 "장면"일 뿐이다 */
import { napSpot } from './cat.js';
import { cupToTable, endVisitNow } from './manduk.js';
import { ctx } from './stage.js';
import { hold, run } from './steps.js';
import { clockJump, dayEvents, dayKey, hourOf, now, sunTimes, sunbeam, visitHours, visitsBetween } from './time.js';
import { RM, rnd } from './util.js';
import { cat, mouse, world } from './world.js';

const FADE_MIN = 10 * 60e3; // 이보다 많이 건너뛰었을 때만 어두워졌다 밝아지는 연출
const FADE = 0.6, FADE_IN = 0.12; // 초: 전체, 그중 어두워지는 시간
const BOWL_KEEP = 0.5; // 시간: 밥 준 뒤 이만큼은 찬 그릇 (그 뒤엔 고양이가 이미 먹음)

// 날이 바뀌면 하루 기록을 비운다 (main.js scheduled와 같이 쓴다)
export function newDay(k) {
  world.dayKey = k;
  world.doneToday = {};
  world.visitsToday = 0;
  world.notes.cleared = false;
  world.treat = false;
}

/* 강고양이 씨 자리 잡기 (처음 열 때와 점프 때)
   밤이면 낮잠 자리에서 자고, 낮이면 햇빛 조각이 있으면 그 위에서 낮잠, 없으면 식빵 자세 */
export function settleCat(d) {
  run(cat, [], ''); // TV 위·뒤, 상자 안이면 내려놓고 하던 동작을 멈춘다 (steps.js run)
  Object.assign(cat, { act: null, tr: null, react: null, dance: null, jump: null, bub: null, rock: 0, typing: false, moving: false, peeked: false, duetT: 0 });
  const h = hourOf(d), [r, s] = sunTimes(d), b = sunbeam(d);
  if (h >= s + 1 || h < r) {
    const [x, y] = napSpot(d);
    cat.x = x;
    cat.y = y;
    run(cat, [hold(rnd(60, 200), 'loaf', true)], 'nap');
    cat.closed = true;
  }
  else if (b && b.k > 0.4) {
    cat.x = b.cx;
    cat.y = 684;
    run(cat, [hold(rnd(30, 90), 'loaf', true)], 'nap');
    cat.closed = true;
  }
  else {
    cat.x = 560;
    cat.y = 690;
    run(cat, [hold(rnd(15, 30), 'loaf')], 'loaf');
    cat.closed = false;
  }
  cat.dp = cat.pose = 'loaf';
}

/* 점프 정리. prev: 직전 방 시각, d: 지금 방 시각, fx: 연출을 할지 (미리보기 슬라이더처럼 연달아 옮기는 곳은 false) */
export function timeJumped(prev, d, fx = true) {
  const a = prev.getTime(), b = d.getTime();
  world.jumps = (world.jumps || 0) + 1; // 점검용 횟수
  // 만득 씨 방문 중이면 바로 끝낸다 (결과만)
  endVisitNow();
  // 하루 기록: 날이 바뀌었으면 비우고, 지금보다 앞선 일정은 모두 "한 일"(장면 없음)
  const k = dayKey(d);
  if (world.dayKey !== k)
    newDay(k);
  const h = hourOf(d), vh = visitHours(d);
  world.doneToday = {};
  for (const [name, hr] of dayEvents(d))
    if (h >= hr)
      world.doneToday[name] = true;
  // 스탠드: 해 지기 조금 전부터 밤 11시(불 끄기)까지
  world.lampOn = h >= sunTimes(d)[1] - 0.3 && h < vh.lights;
  // 밥그릇: 밥 준 뒤 잠깐만 찬 그릇
  world.bowlFull = [vh.feed, vh.ret].some(t => t != null && h >= t && h < t + BOWL_KEEP);
  // 기념일 간식
  world.treat = !!(vh.anniv && h >= vh.anniv);
  // 컵: 바닥에 있었고 그사이 만득 씨가 밥·퇴근으로 다녀갔으면 탁자 위로 (manduk.js act와 같은 결과)
  const c = world.cup;
  if (c.state === 'falling') {
    c.state = 'floor';
    c.fy = 640;
  }
  if (c.state === 'floor' && visitsBetween(a, b).some(v => v === 'feed' || v === 'ret'))
    cupToTable();
  // 쥐야쥐: 쥐구멍으로
  Object.assign(mouse, { hidden: true, peek: false, steps: [], cur: null, state: '', where: 'hole', bub: null, react: null, moving: false, closed: false, napTogether: 0 });
  // 말풍선·자막, 창밖에 지나가던 것, 잠깐 있는 효과
  world.captions.length = 0;
  Object.assign(world, { ufo: null, santa: null, witch: null, bats: null, bird: null, bfly: null, curtainShadow: null, paw: null });
  // 강고양이 씨: 자연스러운 자세로. 생일 파티는 애니메이션 시계로 흐르니 그대로 둔다
  if (cat.tag !== 'birthday')
    settleCat(d);
  // TV: 화면은 시각으로 계산하니 그대로. 켜짐·꺼짐 알림과 반응이 점프 때 일어나지 않게 처음 상태로
  world.tv.st = null;
  world.tv.force = null;
  // 연출
  world.jumpFade = fx && !RM && Math.abs(b - a) > FADE_MIN ? { t: 0 } : null;
}

// 매 장면 (main.js frame): scheduled()보다 먼저 불러야 한다
export function jumpTick(real) {
  const prev = clockJump(real);
  if (prev)
    timeJumped(prev, now());
}

// 연출: 아주 짧게 어두워졌다 밝아진다. 자리를 비운 사이 고양이는 잤다는 느낌
export function drawJumpFade(real, W, H) {
  const f = world.jumpFade;
  if (!f)
    return;
  f.t += real;
  if (f.t >= FADE) {
    world.jumpFade = null;
    return;
  }
  const k = f.t < FADE_IN ? f.t / FADE_IN : 1 - (f.t - FADE_IN) / (FADE - FADE_IN);
  ctx.save();
  ctx.fillStyle = `rgba(16,20,46,${0.8 * k})`;
  ctx.fillRect(-W, 0, W * 3, H);
  ctx.restore();
}

// 화면이 다시 보일 때도 한 번 확인한다
export function initJump() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible')
      jumpTick(0);
  });
}
