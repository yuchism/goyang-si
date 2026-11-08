/* 쉬는 시간: 지난 일 다시 보기 (tasks/base-4-idle.md)
   - 상태는 3시간마다 찍은 한 장이라 대부분 "다 쉬는 중" → 쉬는 동안 가끔 recent의 일 하나를 일 한 바퀴로 다시 틀어 준다
   - recent엔 제목·날짜뿐이라 순서는 늘 같다: 확정 대기 → 옥새 → 타자 → 두루마리 왕복 → 붓질 → 돋보기 → 까치 대기 → 끝(왕 번쩍·까치)
   - 식구에게만(family.set). 상황판은 늘 진짜 상태. 다시 보는 중에 진짜 일이 들어오면 바로 멈춤 */
import { STR } from './screens.js';

const FIRST_MS = 15000, DEMO_FIRST_MS = 1500, EVERY_MS = 5 * 60000, BEAT_MS = 3600;
const BEATS = [ // [roles, tasks 단계(제목은 다시 보는 일)] — 마지막은 끝(일 없음, done + 1)
  [{}, 'approval'],
  [{}, 'ready'],
  [{ implement: 'busy' }, 'implement'],
  [{ review: 'busy' }, 'relay'],
  [{ image: 'busy' }, 'image'],
  [{ review: 'busy' }, 'image_check'],
  [{}, 'deploy'],
  [{}, null],
];
export const isIdle = d => !!d && !d.tasks.length && !d.factory.blocked && !d.factory.limit;

export function makeReplay(fam, { lang, el, body }) {
  const cap = el('p', 'replay');
  cap.hidden = true;
  cap.setAttribute('aria-live', 'polite');
  body.append(cap);
  let real = null, demo = false, timer = 0, beat = 0, playing = null, turn = 0;
  const T = k => STR[k][lang];
  const md = day => { const [, m, d] = day.split('-'); return +m + '/' + +d; };
  const stop = () => {
    clearTimeout(timer);
    playing = null;
    cap.hidden = true;
  };
  const schedule = ms => {
    clearTimeout(timer);
    timer = setTimeout(start, ms);
  };
  function start() {
    if (!isIdle(real) || !real.recent.length) return;
    const r = real.recent[turn++ % real.recent.length];
    playing = { r, base: real };
    beat = 0;
    cap.textContent = `${T('replay')} · ${r.title || T('secret')} (${md(r.day)})`;
    cap.hidden = false;
    step();
  }
  function step() {
    if (!playing) return;
    const { r, base } = playing;
    if (beat >= BEATS.length) { // 끝: 진짜 상태로
      stop();
      fam.set(real, true);
      schedule(EVERY_MS);
      return;
    }
    const [roles, stage] = BEATS[beat++];
    const last = !stage;
    fam.set({
      ...base, factory: { blocked: false, limit: false },
      roles: { implement: 'idle', review: 'idle', image: 'idle', ...roles },
      tasks: stage ? [{ stage, round: stage === 'relay' ? '2/3' : null, title: r.title }] : [],
      stats: { ...base.stats, done: (base.stats.done || 0) + (last ? 0 : -1) },
    }, true); // 데모처럼: 바로 앞 장면과 비교 (기기에 저장하지 않음)
    timer = setTimeout(step, last ? BEAT_MS * 1.6 : BEAT_MS);
  }
  return {
    // base.js showFamily 대신: d = 진짜(또는 데모 쪽) 상태
    set(d, isDemo) {
      real = d;
      demo = isDemo;
      if (playing && isIdle(d)) return; // 다시 보는 중엔 그대로 (진짜 일이 들어올 때만 멈춤)
      stop();
      fam.set(d, isDemo);
      if (isIdle(d)) schedule(demo ? DEMO_FIRST_MS : FIRST_MS);
    },
    busy: () => !!playing,
  };
}
