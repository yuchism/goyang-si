/* 기지 상태 JSON 읽기 (tasks/base-1-hall.md) — 믿지 않는 입력으로 다룬다
   - 모양(v1): { v, day, factory{blocked,limit}, roles{implement,review,image}, tasks[{stage,round?,title}], recent[{title,day}], stats{…} }
     (하네스 goyang-office src/office/public-status.ts)
   - 크기 상한(maxBytes), v가 1이 아니거나 모양이 다르면 버린다. 모르는 열쇠·모르는 stage는 무시. 글자는 잘라서 돌려주고, 화면은 textContent로만 쓴다
   - 마지막으로 정상 받은 것은 기기에만 기억(localStorage). 못 받으면 기억한 것 → 그것도 없으면 데모(demo.json, "연습 화면") */
export const STAGES = ['approval', 'ready', 'relay', 'implement', 'checks', 'image', 'image_check', 'review', 'question', 'human_review', 'deploy', 'blocked', 'limit'];
export const STATS = ['done', 'week', 'month', 'noBlockDays', 'deploys', 'images', 'redraws', 'firstPassPct', 'relayAvg', 'rejected', 'avgDays'];
const ROLES = ['implement', 'review', 'image'];
const MAX = { tasks: 20, recent: 5, title: 24 }; // 하네스는 tasks 12개까지 — 넉넉히 받되 상한은 둔다 (데모는 단계 13개)
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const KEY = 'goyang.base.status';

// 글자 단위(이모지·한글 조합 한 덩어리)로 나누기
const SEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter() : null;
export const chars = s => SEG ? Array.from(SEG.segment(s), x => x.segment) : Array.from(s);
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
// 제목: 문자열이 아니면 null(비밀 작업). 줄바꿈·제어 문자는 빈칸, 최대 MAX.title 글자
function title(t) {
  if (typeof t !== 'string')
    return null;
  const c = chars(t.replace(/[\u0000-\u001f\u007f-\u009f]+|\s+/g, ' ').trim());
  if (!c.length)
    return null;
  return c.length > MAX.title ? c.slice(0, MAX.title - 1).join('') + '…' : c.join('');
}
const num = v => typeof v === 'number' && isFinite(v) && v >= 0 && v < 1e7 ? v : null;

// 받은 것을 검사해서 깨끗한 새 객체로. 쓸 수 없으면 null
export function clean(raw) {
  if (!isObj(raw) || raw.v !== 1 || typeof raw.day !== 'string' || !DAY.test(raw.day))
    return null;
  if (!Array.isArray(raw.tasks) || !Array.isArray(raw.recent) || !isObj(raw.stats))
    return null;
  const tasks = [];
  for (const t of raw.tasks.slice(0, MAX.tasks)) {
    if (!isObj(t) || !STAGES.includes(t.stage))
      continue;
    const round = t.stage === 'relay' && typeof t.round === 'string' && /^[1-9]\/[1-9]$/.test(t.round) ? t.round : null;
    tasks.push({ stage: t.stage, round, title: title(t.title) });
  }
  const recent = [];
  for (const r of raw.recent.slice(0, MAX.recent))
    if (isObj(r) && typeof r.day === 'string' && DAY.test(r.day))
      recent.push({ title: title(r.title), day: r.day });
  const stats = {};
  for (const k of STATS)
    stats[k] = num(raw.stats[k]);
  const roles = {};
  for (const k of ROLES)
    roles[k] = isObj(raw.roles) && raw.roles[k] === 'busy' ? 'busy' : 'idle';
  const f = isObj(raw.factory) ? raw.factory : {};
  return { day: raw.day, factory: { blocked: f.blocked === true, limit: f.limit === true }, roles, tasks, recent, stats };
}

// 주소에서 읽기: 크기 상한을 넘거나 JSON이 아니거나 모양이 다르면 null
async function load(url, maxBytes) {
  try {
    const r = await fetch(url, { cache: 'no-store', credentials: 'omit' });
    if (!r.ok)
      return null;
    const len = Number(r.headers.get('content-length'));
    if (len > maxBytes)
      return null;
    const text = await r.text();
    if (!text.trim() || text.length > maxBytes)
      return null;
    return clean(JSON.parse(text));
  }
  catch (e) {
    return null;
  }
}
const remember = s => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  }
  catch (e) { }
};
const recall = () => {
  try {
    return clean({ v: 1, ...JSON.parse(localStorage.getItem(KEY)) });
  }
  catch (e) {
    return null;
  }
};

// { data, demo }: 새로 받은 것 → 기억한 것 → 데모
export async function readStatus(cfg, base, force) {
  const url = force || cfg.url;
  if (url) {
    const got = await load(url, cfg.maxBytes);
    if (got) {
      if (!force)
        remember(got);
      return { data: got, demo: false };
    }
  }
  const kept = !force && recall();
  if (kept)
    return { data: kept, demo: false };
  const demo = await load(new URL(cfg.demo, base).href, cfg.maxBytes);
  return { data: demo, demo: true };
}
