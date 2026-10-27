/* 생일 깜짝 손님 (BIRTHDAY_GUESTS_PLAN.md): 노래 소절에 맞춰 동물 손님 4~5명이 "짠" 나타나
   강고양이 씨와 같은 춤을 같은 박자로 추다가, 노래가 끝나면 "짠" 사라진다. 왜 왔는지는 아무도 모른다.
   그림: web/sheet/guest-<이름>-dance-v1.webp (tools/make_guests.py가 만든다. 칸 폭 CELL_W, 네 칸 ①②③④ = 강고양이 씨 춤과 같은 동작) */
import { IMG, imageReady } from './assets.js';
import { birthdayName } from './birthday.js';
import { PL } from './objects.js';
import { Snd } from './sound.js';
import { DEPTH, ctx } from './stage.js';
import { holiday, now } from './time.js';
import { RM, clamp } from './util.js';
import { world } from './world.js';

/* ───────── 설정 (숫자만 고치면 된다) ───────── */
// size: 크기표 비율(GUEST_SPRITE_PLAN.md 1장). 그리는 키 = 강고양이 씨 춤 키 × √size × 깊이 (B안: 선 두께가 비슷하게)
// foot: 시트에서 발바닥 y, h: ② 칸 그림 키 (시트 px, tools/make_guests.py 출력). 그림을 바꾸면 다시 옮겨 적는다
export const GUESTS = [
  { id: 'koala', size: 0.85, foot: 517, h: 437 },
  { id: 'kangaroo', size: 1.25, foot: 529, h: 470 },
  { id: 'beaver', size: 0.80, foot: 521, h: 453 },
  { id: 'dog', size: 0.90, foot: 530, h: 449 },
  { id: 'sloth', size: 0.95, foot: 521, h: 468 },
  { id: 'pelican', size: 1.10, foot: 514, h: 438 },
  { id: 'wombat', size: 0.70, foot: 514, h: 442 },
  { id: 'platypus', size: 0.60, foot: 499, h: 414 },
  { id: 'rabbit', size: 0.80, foot: 553, h: 520 },
  { id: 'sheep', size: 0.85, foot: 536, h: 491 },
  { id: 'wolf-sheep-disguise', size: 0.90, foot: 543, h: 490 }, // 양 탈을 쓴 늑대
  { id: 'alien', size: 0.90, foot: 523, h: 451, rare: true },
  // 할로윈 손님 (HOURLY_CHIME_PLAN.md 6-1): 할로윈 기간 파티에만. 고깔모자 없음(분장하고 온 손님)
  { id: 'witch', size: 0.95, foot: 547, h: 377, halloween: true },
  { id: 'pumpkinhead', size: 1.00, foot: 545, h: 374, halloween: true },
  // 주인장 손님 (assets/birthday/family-guests/): 외계인보다 더 드물게 (OWNER_CHANCE)
  { id: 'mandeuk', size: 1.10, foot: 544, h: 536, owner: true },
  { id: 'family-01', size: 1.10, foot: 546, h: 542, owner: true },
  { id: 'family-02', size: 1.10, foot: 546, h: 539, owner: true },
  { id: 'family-03', size: 1.10, foot: 546, h: 519, owner: true },
];
export const CELL_W = 420; // 시트 한 칸 폭 (px)
export const guestSrc = id => 'sheet/guest-' + id + '-dance-v1.webp';
const CAT_DANCE_H = 200; // 강고양이 씨 춤 그림의 키(발~모자, 깊이 1일 때 방 px). sprites.js drawCat: 213 × 681/724
// 나오는 때: 몇 번째 소절(BDAY_SONG.phrases) + 몇 박 뒤. 4명이면 넷째 줄(3소절 중간)을 뺀다
export const GUEST_CUES = [
  { phrase: 0, beat: 0 }, // 1소절 시작
  { phrase: 1, beat: 0 }, // 2소절 시작
  { phrase: 2, beat: 0 }, // 3소절 시작 ("사랑하는 ○○의", 클라이맥스)
  { phrase: 2, beat: 3 }, // 3소절 중간 (5명일 때만)
  { phrase: 3, beat: 0 }, // 4소절 시작 (늦게 온 손님)
];
export const GUEST_CUES_RATIO = [0, 0.2, 0.4, 0.55, 0.7]; // 소리가 꺼져 노래 박자가 없을 때: 춤 길이 비율
export const COUNT = [4, 5]; // 인원 (둘 중 하나, 반반)
export const RARE_CHANCE = 0.1; // 희귀 손님(외계인)이 한 자리를 차지할 확률
export const HALLOWEEN_CHANCE = 0.5; // 할로윈 기간 파티에 할로윈 손님이 오는 확률
export const HALLOWEEN_BOTH = 0.1; // 그때 둘 다 오는 확률
export const halloweenNow = () => holiday(now()) === 'halloween';
// 이 손님 그림을 받을까 (assets.js): 할로윈 손님은 할로윈 기간에만
export const guestLoads = g => !g.halloween || halloweenNow();
export const OWNER_CHANCE = 0.1; // 주인장을 닮은 손님 넷 중 하나가 한 자리를 차지할 확률 (외계인과 같은 정도, 2026-10-22 4% → 10%)
// 이름 소환: 생일자 이름(띄어쓰기 뺌)이 맞으면 첫 파티(페이지를 연 뒤 처음 누른 배너)에 이 주인장 손님들이 꼭 나온다. 배너를 다시 누르면 평소대로 (BIRTHDAY_GUESTS_PLAN.md 19장).
// 이름을 코드에 그대로 적지 않으려고 이름의 해시(nameKey)로 적는다. 새로 넣으려면 개발자 도구에서 __nameKey('이름')
export const SUMMON = {
  659352347: ['mandeuk', 'family-01', 'family-02'], // 주인장 3번 빼고
  1639570168: ['mandeuk', 'family-02', 'family-03'], // 주인장 1번 빼고
};
export function nameKey(name) {
  const s = String(name || '').replace(/\s+/g, '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
if (typeof window !== 'undefined')
  window.__nameKey = nameKey;
export const WRONG_WAY_CHANCE = 0.3; // 한 명이 혼자 반대 방향으로 출 확률
const BIG = 1.1, SMALL = 0.8; // 큰 손님(뒷줄 안 섬), 작은 손님(강고양이 씨 옆 자리에 섬)
const POP_SEC = 0.15, PUFF_SEC = 0.55;

/* ───────── 뽑기 ───────── */
let lastKey = '', summonDone = false; // summonDone: 이름 소환은 페이지를 연 뒤 첫 파티에서 한 번만
const ready = g => imageReady(IMG['f_guest_' + g.id]);
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// 손님을 뽑고 자리를 정한다. 그림이 아직 없는 손님은 뽑지 않는다(그린 애부터 나온다)
function pickGuests() {
  const spots = (PL('party.guests') || {}).spots || [];
  const hw = halloweenNow() ? GUESTS.filter(g => g.halloween && ready(g)) : [];
  const common = GUESTS.filter(g => !g.rare && !g.owner && !g.halloween && ready(g)), rare = GUESTS.filter(g => g.rare && ready(g)), owners = GUESTS.filter(g => g.owner && ready(g));
  if (!spots.length || !common.length)
    return [];
  const summon = summonDone ? [] : (SUMMON[nameKey(birthdayName)] || []).map(id => owners.find(g => g.id === id)).filter(Boolean); // 그림이 있는 것만. 두 번째 파티부터는 평소대로
  if (summon.length)
    summonDone = true;
  let chosen = [], special = [];
  for (let tries = 0; tries < 6; tries++) {
    const n = Math.min(Math.random() < 0.5 ? COUNT[0] : COUNT[1], spots.length);
    special = summon.slice(); // 특별 손님은 각각 한 자리씩 차지한다 (둘 다 나올 수도 있다). 이름 소환이면 소환된 주인장들이 먼저
    if (!summon.length && owners.length && Math.random() < OWNER_CHANCE)
      special.push(owners[Math.floor(Math.random() * owners.length)]);
    if (rare.length && Math.random() < RARE_CHANCE)
      special.push(rare[Math.floor(Math.random() * rare.length)]);
    if (hw.length && Math.random() < HALLOWEEN_CHANCE)
      special.push(...shuffle(hw.slice()).slice(0, Math.random() < HALLOWEEN_BOTH ? 2 : 1));
    chosen = [...special, ...shuffle(common.slice()).slice(0, Math.max(1, n - special.length))];
    const key = chosen.map(g => g.id).sort().join();
    if (key !== lastKey || tries === 5) {
      lastKey = key;
      break;
    }
  }
  // 자리: 큰 손님부터. 작은 손님 자리(small)는 size ≤ SMALL만, 뒷줄(back)엔 큰 손님(≥ BIG)이 안 선다. 맞는 자리가 없으면 그 손님은 빠진다
  const free = spots.slice(), out = [];
  // 특별 손님(주인장·외계인·할로윈)이 먼저 자리를 잡는다 (큰 손님이 많아 앞줄이 모자라도 빠지지 않게)
  for (const g of chosen.slice().sort((a, b) => (special.includes(b) - special.includes(a)) || b.size - a.size)) {
    const ok = free.filter(s => (!s.small || g.size <= SMALL) && (!s.back || g.size < BIG || summon.includes(g))); // 소환된 주인장은 뒷줄에도 선다 (앞줄 큰 자리가 둘뿐이라)
    // 작은 손님은 작은 손님 자리를 먼저 (거기 설 수 있는 애가 적으므로)
    const pool = g.size <= SMALL && ok.some(s => s.small) ? ok.filter(s => s.small) : ok;
    if (!pool.length)
      continue;
    const s = pool[Math.floor(Math.random() * pool.length)];
    free.splice(free.indexOf(s), 1);
    out.push({ g, x: s.x, y: s.y, flip: false, at: 0, shown: false, gone: false, t0: 0 });
  }
  shuffle(out); // 나오는 순서
  if (out.length && Math.random() < WRONG_WAY_CHANCE)
    out[Math.floor(Math.random() * out.length)].flip = true;
  return out;
}

/* ───────── 진행 (birthday.js가 부른다) ───────── */
// 파티 시작
export function guestsStart(p) {
  p.guests = [];
  p.puffs = [];
}
// 노래를 틀었을 때(춤 시작): 손님을 뽑고 나오는 시각(노래 시작 기준 초)을 정한다.
// 뽑기를 춤 시작까지 미루는 것은, 고양이가 걸어가는 동안 손님 그림(나중 묶음)을 받을 시간을 벌기 위해
export function guestsCue(p) {
  p.guests = RM || world.manduk ? [] : pickGuests();
  const s = p.song, list = p.guests;
  const cues = list.length >= 5 ? GUEST_CUES : GUEST_CUES.filter((c, i) => i !== 3);
  const ratio = list.length >= 5 ? GUEST_CUES_RATIO : GUEST_CUES_RATIO.filter((c, i) => i !== 3);
  list.forEach((q, i) => {
    if (s.phrases) {
      const c = cues[Math.min(i, cues.length - 1)];
      q.at = (s.phrases[Math.min(c.phrase, s.phrases.length - 1)] + c.beat) * s.beat;
    }
    else
      q.at = ratio[Math.min(i, ratio.length - 1)] * s.sec;
  });
}
function puff(q, p) {
  const k = scaleOf(q);
  p.puffs.push({ x: q.x, y: q.y - q.g.h * 0.45 * k, r: q.g.h * 0.4 * k, t0: p.t, seed: Math.random() * 9 });
  Snd.pop(0.8);
}
// 사라지게: 남아 있는 손님 모두 "짠" (노래 끝, 파티 끝·끊김, 만득 씨)
export function guestsLeave(p) {
  for (const q of p.guests || [])
    if (q.shown && !q.gone) {
      q.gone = true;
      puff(q, p);
    }
    else
      q.gone = true;
}
export function guestsTick(p) {
  if (!p.guests || !p.guests.length)
    return;
  if (world.manduk) { // 만득 씨가 오면 손님은 안 나오고, 나와 있던 손님은 바로 사라진다
    guestsLeave(p);
    return;
  }
  const s = p.song;
  if (!s)
    return;
  const st = p.t - s.start;
  if (st >= s.sec || p.end != null) {
    guestsLeave(p);
    return;
  }
  for (const q of p.guests)
    if (!q.shown && !q.gone && st >= q.at) {
      q.shown = true;
      q.t0 = p.t;
      puff(q, p);
    }
}

/* ───────── 그리기 ───────── */
const scaleOf = q => CAT_DANCE_H * Math.sqrt(q.g.size) * DEPTH(q.y) / q.g.h;
// 바닥 순서 목록에 넣을 것: [깊이, 그리기, 이름] (main.js render)
export function guestLayers(cell) {
  const p = world.party;
  if (!p || !p.guests)
    return [];
  return p.guests.filter(q => q.shown && !q.gone).map(q => [q.y, () => drawGuest(q, p, cell), '손님 ' + q.g.id]);
}
function drawGuest(q, p, cell) {
  const im = IMG['f_guest_' + q.g.id];
  if (!imageReady(im))
    return;
  const since = p.t - q.t0, pop = !RM && since < POP_SEC ? 1 + 0.18 * Math.sin(since / POP_SEC * Math.PI) : 1;
  const k = scaleOf(q) * pop, dp = DEPTH(q.y), i = cell % 4;
  ctx.beginPath();
  ctx.ellipse(q.x, q.y + 2, 58 * dp * Math.sqrt(q.g.size), 10 * dp, 0, 0, 7);
  ctx.fillStyle = 'rgba(50,30,15,.2)';
  ctx.fill();
  ctx.save();
  ctx.translate(q.x, q.y);
  if (q.flip)
    ctx.scale(-1, 1);
  ctx.drawImage(im, i * CELL_W, 0, CELL_W, im.height, -CELL_W * k / 2, -q.g.foot * k, CELL_W * k, im.height * k);
  ctx.restore();
}
// "짠" 연기와 별가루 (손님이 나타나고 사라질 때). 어둠 위에 그린다 (main.js)
export function drawPuffs() {
  const p = world.party;
  if (!p || !p.puffs || !p.puffs.length)
    return;
  p.puffs = p.puffs.filter(f => p.t - f.t0 < PUFF_SEC);
  for (const f of p.puffs) {
    const k = clamp((p.t - f.t0) / PUFF_SEC, 0, 1), a = 1 - k;
    ctx.save();
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = '#fffaf0';
    ctx.strokeStyle = 'rgba(29,22,18,.35)';
    ctx.lineWidth = 2;
    for (let j = 0; j < 7; j++) { // 연기 동그라미: 가운데에서 퍼지며 옅어짐
      const ang = f.seed + j * 0.9, d = f.r * (0.25 + 0.75 * k), rr = f.r * (0.32 - 0.12 * k) * (0.8 + 0.4 * ((j * 37) % 7) / 7);
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(ang) * d, f.y + Math.sin(ang) * d * 0.8, rr, 0, 7);
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffe28a';
    for (let j = 0; j < 5; j++) { // 별가루
      const ang = f.seed * 2 + j * 1.3, d = f.r * (0.5 + 0.9 * k), x = f.x + Math.cos(ang) * d, y = f.y + Math.sin(ang) * d - 10 * k, r = 7 * (1 - k * 0.5);
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r, y);
      ctx.quadraticCurveTo(x, y, x, y - r);
      ctx.fill();
    }
    ctx.restore();
  }
}
