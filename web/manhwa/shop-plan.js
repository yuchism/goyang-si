/* 만화방 안 — 밤 운동 편성 (tasks/manhwa-3-shop.md). 화면 없이 계산만 한다(노드에서도 불러짐)
   - 낮·밤은 방 시계 그대로(time.js isNight). 밤 = 저녁 시작(해 진 뒤 30분) ~ 동틀 녘 시작
   - 하룻밤(time.js nightOf)을 씨앗으로 섞은 편성: 40~60분마다 기구가 바뀌고, 바로 앞과 같은 기구는 오지 않는다.
     TV 편성표처럼 같은 시각엔 누구에게나 같은 운동이다. 저장하지 않는다(AGENTS.md 6장)
   - 날짜·시각은 time.js 함수로만 읽는다 */
import { atHour, daypartStarts, isNight, nightOf } from '../js/time.js';
import { hash } from '../js/util.js';

export const SLOT_MIN = [40, 60]; // 한 운동의 길이(분) `초기값`
export const MOVE_SEC = 24; // 기구를 옮겨 가는 짧은 순간(초)
const MIN = 60000;

// 하룻밤 키('2026-11-6') → 그날·다음 날 정오 Date (서머타임에도 정오는 있다)
const noonOf = (key, k = 0) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d + k, 12);
};
const startOf = (day, part) => daypartStarts(day).find(([n]) => n === part)[1];
// 씨앗 0~1. util.js hash(FNV)는 끝 글자만 다르면 고르게 섞이지 않아서 바뀌는 칸 번호를 앞에 두고 한 번 더 섞는다
const seed = (i, what, key) => hash(String(hash(i + what + key)));

// 그 밤의 편성 [{ ex, from, to }] (ms). exs: 기구 이름 목록 (장면 설정 순서)
const cache = new Map();
export function nightPlan(key, exs) {
  const ck = key + '|' + exs.join(',');
  if (cache.has(ck))
    return cache.get(ck);
  const day = noonOf(key), next = noonOf(key, 1);
  const begin = atHour(day, startOf(day, 'evening')), end = atHour(next, startOf(next, 'dawn'));
  const plan = [];
  let t = begin, prev = -1;
  for (let i = 0; t < end; i++) {
    const len = Math.round(SLOT_MIN[0] + seed(i, '|gym-len|', key) * (SLOT_MIN[1] - SLOT_MIN[0])) * MIN;
    let k;
    if (prev < 0)
      k = Math.floor(seed(i, '|gym|', key) * exs.length) % exs.length;
    else { // 바로 앞 것을 뺀 나머지에서
      k = Math.floor(seed(i, '|gym|', key) * (exs.length - 1)) % (exs.length - 1);
      if (k >= prev)
        k++;
    }
    plan.push({ ex: exs[k], from: t, to: Math.min(t + len, end) });
    prev = k;
    t += len;
  }
  if (cache.size > 8)
    cache.clear();
  cache.set(ck, plan);
  return plan;
}

// 지금(d, Date) 운동: 낮이면 null. { ex, from, to, prev(앞 운동 이름, 첫 칸이면 null), plan, i }
export function gymAt(d, exs) {
  if (!exs.length || !isNight(d))
    return null;
  const plan = nightPlan(nightOf(d), exs), ms = d.getTime();
  const i = plan.findIndex(s => ms >= s.from && ms < s.to);
  if (i < 0)
    return null;
  return { ...plan[i], prev: i ? plan[i - 1].ex : null, plan, i };
}

// 옮겨 가는 중이면 0~1 (칸이 시작한 뒤 MOVE_SEC 동안), 아니면 -1
export const moving = (slot, d) => {
  const t = (d.getTime() - slot.from) / 1000;
  return t >= 0 && t < MOVE_SEC ? t / MOVE_SEC : -1;
};
