/* 사물: objects.json을 읽어 위치·상태·자리·소켓·깊이를 알려준다 */
import { imageReady, img } from './assets.js';
import { birthdayMode } from './birthday.js';
import { boxOpen, boxToday, holiday, isHalloween, now, pumpkinLit, season } from './time.js';
import { cat, mouse, world } from './world.js';
import { fishRodOut } from './fish.js';
import { rnd, runSceneHooks } from './util.js';
import { WIN } from './win.js';
export let OBJ = [];
export const O = {};
export const P = {}; // P: 위치 바로가기 (objects.json에서 만들어짐)
const AREAS = {}, PATHS = {}, PLACES = {};

export function initObjects(data) {
  OBJ = data.objects;
  Object.assign(AREAS, data.areas || {});
  Object.assign(PATHS, data.paths || {});
  Object.assign(PLACES, data.places || {});
  OBJ.forEach(o => {
    O[o.id] = o;
    if (o.pos)
      P[o.id] = o.pos;
    if (o.area)
      P[o.id] = { x: o.area[0], y: o.area[1], w: o.area[2], h: o.area[3] };
  });
  if (P.cup)
    Object.assign(world.cup, { x: P.cup.x, y: P.cup.y }); // 컵이 떨어지기 시작하는 곳 = 탁자 위 컵 자리
  for (const [a, k] of [[cat, 'start.cat'], [mouse, 'start.mouse']])
    if (PLACES[k])
      Object.assign(a, { x: PLACES[k].x, y: PLACES[k].y });
  runSceneHooks();
}
// 등장 조건
const WHEN = { always: () => true, summer: () => season(now()) === 'summer', winter: () => season(now()) === 'winter',
  halloween: () => isHalloween(now()), christmas: () => holiday(now()) === 'christmas', boxDay: () => boxToday(now()), treat: () => world.treat,
  doorClosed: () => STATE.door() !== 'open' };
export const present = o => o.id === 'tree' && birthdayMode ? false : (WHEN[o.when || 'always'] || WHEN.always)();
// 지금 상태
const STATE = {
  door: () => {
    const m = world.manduk;
    if (!m)
      return 'closed';
    if (m.phase === 'steps' || m.phase === 'pause')
      return 'glow';
    return (m.phase !== 'close' || m.t < 0.6) ? 'open' : 'closed';
  },
  lamp: () => world.lampOn ? 'on' : 'off', cup: () => world.cup.state, bowl: () => world.bowlFull ? 'full' : 'empty',
  laptop: () => (world.laptop || cat.typing || world.party || mouse.state === 'laptop' && !mouse.hidden) ? 'on' : 'off',
  box: () => cat.inBox ? 'occupied' : boxOpen(now()) ? 'open' : 'closed',
  pumpkin: () => pumpkinLit(now()) ? 'lit' : 'off',
  rod: () => fishRodOut() ? 'out' : 'wall'
};
// 상태가 반영된 모습 (states의 값이 기본값을 덮어씀)
export function objView(o) {
  const st = STATE[o.id] ? STATE[o.id]() : null, ov = st && o.states && o.states[st];
  return Object.assign({}, o, ov || {}, { state: st });
}
// 자리 이름으로 좌표 얻기: S('bowl.eat') → [x, y], .face
export function S(name) {
  const [id, k] = name.split('.'), o = O[id];
  if (!o)
    return null;
  const v = objView(o), s = v.spots && v.spots[k];
  if (!s)
    return null;
  const r = [s[0], s[1]];
  r.face = s[2];
  return r;
}
// 위에 얹힌 물건: on(밑에 있는 물건)과 z(바닥에서 뜬 높이). 깊이는 밑 물건을 따르고 그림만 위로 올라간다
export function topOf(id) {
  const o = O[id];
  if (!o || !o.top)
    return 0;
  return zOf(o) + o.top;
}
export function zOf(o) {
  return o.z != null ? o.z : o.on ? topOf(o.on) : 0;
}
// 소켓: 그림 안의 한 점을 방 좌표로. [x비율, y비율] (0~1, 그림 왼쪽 위 기준)
export function socketOf(o, name) {
  const v = objView(o), sk = v.sockets && v.sockets[name], im = img(v.look);
  if (!sk || !imageReady(im))
    return null;
  const w = v.pos.w, h = w * im.height / im.width;
  return [v.pos.x - w / 2 + sk[0] * w, v.pos.y - zOf(o) - h + sk[1] * h];
}
export const depthOf = v => v.id === 'cup' && v.state === 'floor' ? world.cup.fy : (v.depth != null ? v.depth : v.on && O[v.on] ? O[v.on].pos.y + 0.1 : v.pos.y);
// 범위: A('cat.roam') → { x: [왼, 오른], y: [위, 아래] }. ax·ay는 그 안에서 무작위 (x를 먼저 뽑는다)
export const A = name => AREAS[name] || null;
export const ax = a => rnd(a.x[0], a.x[1]);
export const ay = a => rnd(a.y[0], a.y[1]);
export const aPt = a => [ax(a), ay(a)];
// 경로: PATH('duet.lap') → [[x, y], ...] (복사본)
export const PATH = name => PATHS[name] ? PATHS[name].points.map(p => p.slice()) : null;
// 기능별 자리: PL('wheel') → { x, y, w, ... } (쓰는 값만 있음)
export const PL = name => PLACES[name] || null;
// 장면에 이 장소가 있나 (SCENE_PLAN.md 7장). 사물 id, 범위·경로·자리 이름, 창에 딸린 것('window', 'railing', 'curtain')
export function has(name) {
  if (name === 'window')
    return !!WIN.rect;
  if (name === 'railing')
    return !!(WIN.rect && WIN.railing);
  if (name === 'curtain')
    return !!(WIN.rect && WIN.curtain && (O.curtain_l || O.curtain_r));
  return !!(O[name] || PLACES[name] || AREAS[name] || PATHS[name]);
}
