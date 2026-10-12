/* 벽 액자: 날짜마다 바뀌는 가족사진, 누르면 다음 사진, 넘길수록 삐뚤어짐, 만득 씨가 다녀가면 반듯. FRAME_PHOTOS_PLAN.md
   - 오늘의 사진: (dayNum + SEED) % 장수. 같은 날엔 누구에게나 같다
   - 넘긴 사진: 그 기기에 그날 날짜와 함께 저장. 날짜가 바뀌면 무시하고 그날의 사진으로
   - 기울기: 넘길 때마다 2~4도(방향 무작위, 최대 ±10도). 그 기기에 저장. 만득 씨가 밥·퇴근·불 끄기·기념일에 다녀가면 0
   - 페이지가 꺼져 있었거나 시간이 건너뛰어 그 방문을 못 봤으면, 방 시계로 따져서 지나간 방문이 있으면 0
   저장이 안 되는 브라우저에서는 그 페이지에서만 유지된다 */
import { imageReady, img } from './assets.js';
import { O } from './objects.js';
import { ctx } from './stage.js';
import { dayKey, dayNum, now, visitHours } from './time.js';
import { RM, clamp, ease, lerp, rnd, store } from './util.js';

const KEY = 'frame';
const SEED = 0; // 오늘의 사진을 정하는 고정값
const MAX_TILT = 10, STEP_MIN = 2, STEP_MAX = 4; // 도
const SHAKE = 0.4; // 넘길 때 흔들리는 시간(초)
const FIXERS = ['feed', 'ret', 'lights', 'anniv']; // 다녀가면 액자를 바로잡는 방문 (time.js visitHours의 이름)
const FIX_WAIT = 0.35; // 시간. 방문 시각에서 이만큼 지나기 전에는 실제 방문(main.js 일정)이 처리하게 둔다

// 기기에 남기는 것: { day, idx } 넘긴 사진(그날만), { tilt, at } 기울기(도)와 마지막으로 넘긴 방 시각(ms)
let st = null;
const S = () => {
  if (!st) {
    const v = store.get(KEY, null);
    st = v && typeof v === 'object' ? v : {};
  }
  return st;
};
const save = () => store.set(KEY, S());
let anim = null; // 넘기는 중: { from: 이전 사진 이름, fromTilt, t }
let checkT = 0;

const photos = () => (O.frame && O.frame.photos) || [];
export function todayIndex(d) {
  const n = photos().length;
  return n ? ((dayNum(d) + SEED) % n + n) % n : 0;
}
export function frameIndex(d) {
  const s = S();
  return s.day === dayKey(d) && Number.isInteger(s.idx) && s.idx >= 0 && s.idx < photos().length ? s.idx : todayIndex(d);
}
export const frameTilt = () => +S().tilt || 0;

// 누르면 다음 사진으로. 조금씩 삐뚤어진다
export function flipFrame() {
  const list = photos();
  if (!list.length)
    return;
  const d = now(), cur = frameIndex(d), t0 = frameTilt();
  const step = rnd(STEP_MIN, STEP_MAX);
  let dir = Math.random() < 0.5 ? -1 : 1;
  if (Math.abs(t0 + dir * step) > MAX_TILT)
    dir = -dir;
  const tilt = clamp(t0 + dir * step, -MAX_TILT, MAX_TILT);
  anim = { from: list[cur], fromTilt: t0, t: 0, dir };
  Object.assign(S(), { day: dayKey(d), idx: (cur + 1) % list.length, tilt, at: d.getTime() });
  save();
}

// 만득 씨 방문이 끝났을 때 (manduk.js). 결과로만 보이게, 고치는 장면은 없다
export function straightenFrame(type) {
  if (!FIXERS.includes(type) || !frameTilt())
    return;
  S().tilt = 0;
  save();
}

// a(ms) 뒤부터 b(ms)까지, 바로잡는 방문 시각이 지나갔는지 (지나고 FIX_WAIT이 넘은 것만)
export function missedFix(a, b) {
  const end = b - FIX_WAIT * 3600000;
  if (!(end > a))
    return false;
  const day = new Date(a);
  day.setHours(0, 0, 0, 0);
  for (let i = 0; i < 400 && day.getTime() <= end; i++) {
    const vh = visitHours(day);
    for (const k of FIXERS) {
      const h = vh[k];
      if (h == null)
        continue;
      const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(h), Math.round((h % 1) * 60)).getTime();
      if (t > a && t <= end)
        return true;
    }
    day.setDate(day.getDate() + 1);
  }
  return false;
}

// 매 장면 (main.js frame): 흔들림 진행, 1초마다 놓친 방문 확인
export function frameTick(d, real) {
  if (anim) {
    anim.t += real;
    if (anim.t >= SHAKE)
      anim = null;
  }
  if ((checkT -= real) > 0)
    return;
  checkT = 1;
  const s = S();
  if (frameTilt() && s.at && missedFix(s.at, d.getTime())) {
    s.tilt = 0;
    save();
  }
}

// 그리기 (draw.js drawObj). 못 자리(그림 위쪽 가운데)를 축으로 기울인다
export function drawFrame(v, z) {
  const list = photos();
  let im = img(list[frameIndex(now())]);
  if (!imageReady(im))
    im = list.map(img).find(imageReady) || img(v.look); // 오늘 사진이 없으면 다른 사진, 하나도 없으면 예전 액자 그림
  if (!imageReady(im))
    return;
  const w = v.pos.w, h = w * im.height / im.width;
  let deg = frameTilt(), from = null, k = 1;
  if (anim) {
    const p = Math.min(1, anim.t / SHAKE);
    k = ease(p);
    deg = lerp(anim.fromTilt, deg, k) + (RM ? 0 : anim.dir * 3 * Math.sin(p * Math.PI * 3) * (1 - p));
    from = img(anim.from);
  }
  ctx.save();
  ctx.translate(v.pos.x, v.pos.y - z - h);
  ctx.rotate(deg * Math.PI / 180);
  if (from && from !== im && imageReady(from)) {
    ctx.drawImage(from, -w / 2, 0, w, h);
    ctx.globalAlpha = k;
  }
  ctx.drawImage(im, -w / 2, 0, w, h);
  ctx.restore();
}
