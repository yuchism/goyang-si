/* 장면: 한 장면 = scenes/<이름>/ 폴더 하나 (SCENE_PLAN.md 2장)
   stage.json   : 무대 크기·바닥선·배경 배율·깊이·걷는 바닥·카메라 자리
   objects.json : 사물·서는 자리·소켓 (OBJECTS.md)
   window.json  : 창 (없으면 창 없는 장면). 창 사물(window)의 자리 area는 여기 rect에서 온다
   지금 장면은 방(room) 하나뿐이다 */
import { initObjects } from './objects.js';
import { applyStage } from './stage.js';
import { applyWindow } from './win.js';
// 장면 이름: 주소의 ?scene=이름 (없으면 방). 시험 장면은 tools/check_scene.mjs가 띄운다
const asked = new URLSearchParams(location.search).get('scene');
export const SCENE = { name: asked && /^[\w-]+$/.test(asked) ? asked : 'room' };
// no-cache: 서버에 확인은 하되 바뀌지 않았으면 다시 받지 않는다 (LOAD_PLAN.md 6장)
const getJSON = (name, file) => fetch(`scenes/${name}/${file}`, { cache: 'no-cache' }).then(r => r.json());
const getOptional = (name, file) => fetch(`scenes/${name}/${file}`, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
export async function loadScene(name = SCENE.name) {
  SCENE.name = name;
  const [stage, objects, win] = await Promise.all([getJSON(name, 'stage.json'), getJSON(name, 'objects.json'), getOptional(name, 'window.json')]);
  applyStage(stage);
  applyWindow(win);
  // 창 사물의 자리는 window.json의 rect. 창이 없는 장면이면 창 사물도 없다 (SCENE_PLAN.md 7장)
  const wo = objects.objects.find(o => o.id === 'window');
  if (wo && win)
    wo.area = win.rect;
  else if (wo)
    objects.objects = objects.objects.filter(o => o !== wo);
  initObjects(objects);
}
