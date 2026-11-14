/* 생일 깜짝 손님 (BIRTHDAY_GUESTS_PLAN.md): 노래 소절에 맞춰 동물 손님 4~5명이 "짠" 나타나
   강고양이 씨와 같은 춤을 같은 박자로 추다가, 노래가 끝나면 "짠" 사라진다. 왜 왔는지는 아무도 모른다.
   그림: web/sheet/guest-<이름>-dance-v1.webp (tools/make_guests.py가 만든다. 칸 폭 CELL_W, 네 칸 ①②③④ = 강고양이 씨 춤과 같은 동작) */
import { IMG, imageReady } from './assets.js';
import { birthdayName } from './birthday.js';
import { PL } from './objects.js';
import { BDAY_SONG, Snd } from './sound.js';
import { DEPTH, ctx } from './stage.js';
import { isHalloween, now } from './time.js';
import { RM, clamp, pick } from './util.js';
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
  // glow: 할로윈 자정 어둠 속에서 눈·입(밝은 노랑 픽셀)이 빛난다 (chime.js, glow.js)
  { id: 'witch', size: 0.95, foot: 547, h: 377, halloween: true, glow: true },
  { id: 'pumpkinhead', size: 1.00, foot: 545, h: 374, halloween: true, glow: true },
  // 주인장 손님 (assets/birthday/family-guests/): 가족 이름 파티 앞줄에만 (ALLSTAR)
  { id: 'mandeuk', size: 1.10, foot: 544, h: 536, owner: true },
  { id: 'family-01', size: 1.10, foot: 546, h: 542, owner: true },
  { id: 'family-02', size: 1.10, foot: 546, h: 539, owner: true },
  { id: 'family-03', size: 1.10, foot: 546, h: 519, owner: true },
];
// 손님 종류: 어디에 나오나는 이 둘로만 정한다 (파티 pickCrowd, 정각 chime.js). 순서는 GUESTS 표 순서 그대로
//   common: 파티(늘)·정각 / rare(외계인): 평소 파티 가끔·가족 이름 파티 늘·할로윈 자정 / owner(주인장 닮은): 가족 이름 파티 앞줄 / halloween: 할로윈 기간 파티(늘)·할로윈 자정
export const kindOf = g => g.owner ? 'owner' : g.rare ? 'rare' : g.halloween ? 'halloween' : 'common';
export const guestsOf = (...kinds) => GUESTS.filter(g => kinds.includes(kindOf(g)));
export const CELL_W = 420; // 시트 한 칸 폭 (px)
export const guestSrc = id => 'sheet/guest-' + id + '-dance-v1.webp';
const CAT_DANCE_H = 200; // 강고양이 씨 춤 그림의 키(발~모자, 깊이 1일 때 방 px). sprites.js drawCat: 213 × 681/724
export const RARE_CHANCE = 0.1; // 평소 파티에 외계인이 끼어드는 확률 (가족 이름 파티엔 늘, BIRTHDAY_ALLSTAR_PLAN.md 9장)
// 이 손님 그림을 받을까 (assets.js): 할로윈 손님은 할로윈 기간에만
export const guestLoads = g => !g.halloween || isHalloween(now());
// 총출동 (BIRTHDAY_ALLSTAR_PLAN.md): 모든 생일 파티에 손님이 다 같이 온다(9장, 2026-11-14 — 예전 4~5명 뽑기는 없앰).
// 가족 이름 표: 생일자 이름(띄어쓰기 뺌)이 여기 있으면 front의 주인장 손님 셋이 강고양이 씨 양옆 앞줄에 서고 외계인도 늘 온다.
// 아니면 앞줄도 보통 손님이 채우고 외계인은 가끔(RARE_CHANCE). 자리는 장면 party.crowd.
// 이름을 코드에 그대로 적지 않으려고 이름의 해시(nameKey)로 적는다. 새로 넣으려면 개발자 도구에서 __nameKey('이름')
// (예전 "이름 소환"(첫 파티에 주인장 셋만, BIRTHDAY_GUESTS_PLAN.md 19장)은 두 이름이 모두 총출동으로 옮겨 가서 없앴다, 2026-10-28)
export const ALLSTAR = {
  659352347: { front: ['mandeuk', 'family-01', 'family-02'] }, // 주인장 3번 빼고
  1639570168: { front: ['mandeuk', 'family-02', 'family-03'] }, // 주인장 1번 빼고
};
// 등장 시각: 몇 번째 소절 + 몇 박 뒤. 앞줄(front 자리)은 1소절에 한 박씩, 동물은 2·3소절에 무리로(waves), 외계인·할로윈 손님은 4소절에
export const CROWD_CUES = {
  front: { phrase: 0, beat: 0, step: 1 },
  waves: [{ phrase: 1, beats: [0, 2, 4] }, { phrase: 2, beats: [0, 2.5, 4.5] }],
  last: { phrase: 3, beat: 0 },
};
export const CROWD_POPS = 4; // 다 같이 사라질 때 "뽁" 소리는 이만큼만 (한꺼번에 열몇 개면 시끄러워서)
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
const BIG = 1.1; // 큰 손님(맨 뒷줄 back 자리를 먼저)
export const SMALL = 0.8; // 작은 손님(강고양이 씨 옆 자리 등 small 자리에 섬. 파티·정각 같이)
const POP_SEC = 0.15, PUFF_SEC = 0.55;

/* ───────── 뽑기 ───────── */
const ready = g => imageReady(IMG['f_guest_' + g.id]);
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/* ───────── 뽑기: 총출동 (BIRTHDAY_ALLSTAR_PLAN.md) ───────── */
// 노래 시각: 소절·박 → 노래 시작 기준 초. 소리가 꺼져 박자가 없으면 노래 표의 비율로 춤 길이에 맞춘다
const SONG_BEATS = BDAY_SONG.notes.reduce((a, n) => a + n[1], 0);
function cueAt(s, phrase, beat) {
  const ph = s.phrases || BDAY_SONG.phrases, b = ph[Math.min(phrase, ph.length - 1)] + beat;
  return s.phrases ? b * s.beat : b / SONG_BEATS * s.sec;
}
// 손님 전부를 장면 party.crowd 자리에. 그림이 아직 없는 손님은 빠진다(그린 애부터 나온다).
// 자리 표시: front(앞줄 — 가족 이름이면 주인장 전용, 아니면 누구나) · small(SMALL 이하) · back(큰 손님 먼저). 맞는 자리가 없으면 빠진다
// A: 가족 이름 표의 줄(ALLSTAR) 또는 null(평소 파티)
function pickCrowd(A, s) {
  const spots = (PL('party.crowd') || {}).spots || [];
  const front = A ? A.front.map(id => GUESTS.find(g => g.id === id)).filter(g => g && ready(g)) : [];
  const alien = A || Math.random() < RARE_CHANCE ? guestsOf('rare') : [];
  const rest = [...guestsOf('common'), ...alien, ...(isHalloween(now()) ? guestsOf('halloween') : [])].filter(ready);
  const free = spots.slice(), out = [];
  const take = (g, pool) => {
    if (!pool.length)
      return null;
    const sp = pick(pool);
    free.splice(free.indexOf(sp), 1);
    const q = { g, x: sp.x, y: sp.y, flip: false, at: 0, shown: false, gone: false, t0: 0 };
    out.push(q);
    return q;
  };
  // 앞줄: 가족 이름이면 주인장 셋, 1소절에 한 박씩
  front.forEach((g, i) => {
    const q = take(g, free.filter(sp => sp.front));
    if (q)
      q.at = cueAt(s, CROWD_CUES.front.phrase, CROWD_CUES.front.beat + i * CROWD_CUES.front.step);
  });
  // 나머지: 큰 손님 → 작은 손님 → 보통 순으로 맞는 자리를 먼저 고른다
  const big = g => g.size >= BIG, small = g => g.size <= SMALL;
  const order = shuffle(rest.slice()).sort((a, b) => (big(b) - big(a)) || (small(b) - small(a)));
  const placed = [];
  for (const g of order) {
    const ok = free.filter(sp => (!A || !sp.front) && (!sp.small || small(g))); // 평소 파티면 앞줄도 보통 자리
    const want = big(g) ? ok.filter(sp => sp.back) : small(g) ? ok.filter(sp => sp.small) : ok.filter(sp => !sp.back && !sp.small);
    const q = take(g, want.length ? want : ok);
    if (q)
      placed.push(q);
  }
  // 등장 시각: 외계인·할로윈 손님은 4소절, 앞줄 자리에 선 동물은 1소절에 한 박씩(평소 파티), 나머지 동물은 2·3소절에 무리로 나눠서
  const onFront = q => !A && spots.some(sp => sp.front && sp.x === q.x && sp.y === q.y);
  const lastOnes = placed.filter(q => kindOf(q.g) !== 'common');
  placed.filter(q => kindOf(q.g) === 'common' && onFront(q)).forEach((q, i) => q.at = cueAt(s, CROWD_CUES.front.phrase, CROWD_CUES.front.beat + i * CROWD_CUES.front.step));
  const animals = shuffle(placed.filter(q => kindOf(q.g) === 'common' && !onFront(q)));
  lastOnes.forEach(q => q.at = cueAt(s, CROWD_CUES.last.phrase, CROWD_CUES.last.beat));
  const slots = CROWD_CUES.waves.flatMap(w => w.beats.map(b => [w.phrase, b]));
  animals.forEach((q, i) => {
    const [ph, b] = slots[Math.floor(i * slots.length / animals.length)];
    q.at = cueAt(s, ph, b);
  });
  if (out.length && Math.random() < WRONG_WAY_CHANCE)
    pick(out).flip = true;
  return out;
}
export const allstarName = () => ALLSTAR[nameKey(birthdayName)] || null; // 지금 생일 링크가 가족 이름인가

/* ───────── 진행 (birthday.js가 부른다) ───────── */
// 파티 시작
export function guestsStart(p) {
  p.guests = [];
  p.puffs = [];
}
// 노래를 틀었을 때(춤 시작): 손님을 뽑고 나오는 시각(노래 시작 기준 초)을 정한다.
// 뽑기를 춤 시작까지 미루는 것은, 고양이가 걸어가는 동안 손님 그림(나중 묶음)을 받을 시간을 벌기 위해
export function guestsCue(p) {
  p.guests = RM || world.manduk ? [] : pickCrowd(allstarName(), p.song); // 자리·등장 시각을 pickCrowd가 정한다
}
// "짠" 연기 하나를 p.puffs에 (p: 파티 또는 정각 종 — p.t가 시계)
export function puff(q, p, quiet = false) {
  const k = scaleOf(q);
  p.puffs.push({ x: q.x, y: q.y - q.g.h * 0.45 * k, r: q.g.h * 0.4 * k, t0: p.t, seed: Math.random() * 9 });
  if (!quiet)
    Snd.pop(0.8);
}
// 사라지게: 남아 있는 손님 모두 "짠" (노래 끝, 파티 끝·끊김, 만득 씨)
export function guestsLeave(p) {
  let pops = 0;
  for (const q of p.guests || [])
    if (q.shown && !q.gone) {
      q.gone = true;
      puff(q, p, ++pops > CROWD_POPS); // 다 같이 사라지니 소리는 몇 개만
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
// 손님 한 명 (파티·정각 종이 같이 쓴다). p.t: 그 무대의 시계
export function drawGuest(q, p, cell) {
  const im = IMG['f_guest_' + q.g.id];
  if (!imageReady(im))
    return;
  const dp = DEPTH(q.y);
  ctx.beginPath();
  ctx.ellipse(q.x, q.y + 2, 58 * dp * Math.sqrt(q.g.size), 10 * dp, 0, 0, 7);
  ctx.fillStyle = 'rgba(50,30,15,.2)';
  ctx.fill();
  drawGuestSheet(q, p, cell, im);
}
// 손님 시트(또는 같은 크기의 빛 마스크 캔버스)를 손님 자리·크기·방향·"짠" 튕김에 맞춰 그린다
export function drawGuestSheet(q, p, cell, im) {
  const since = p.t - q.t0, pop = !RM && since < POP_SEC ? 1 + 0.18 * Math.sin(since / POP_SEC * Math.PI) : 1;
  const k = scaleOf(q) * pop, i = cell % 4, h = im.height || im.naturalHeight;
  ctx.save();
  ctx.translate(q.x, q.y);
  if (q.flip)
    ctx.scale(-1, 1);
  ctx.drawImage(im, i * CELL_W, 0, CELL_W, h, -CELL_W * k / 2, -q.g.foot * k, CELL_W * k, h * k);
  ctx.restore();
}
// "짠" 연기와 별가루 (손님이 나타나고 사라질 때). 어둠 위에 그린다 (main.js)
export function drawPuffs(p = world.party) {
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
