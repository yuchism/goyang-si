/* 방 그리기: 소품, 코드로 그리는 것(창밖·문·커튼·트리·난로·선풍기), 노트북 화면, 햇빛 */
import { imageReady, img } from './assets.js';
import { drawPartyScreen } from './birthday.js';
import { O, OBJ, P, objView, present, socketOf, zOf } from './objects.js';
import { drawOutside } from './outside.js';
import { BGK, FLOOR, ctx } from './stage.js';
import { now, season, sunbeam } from './time.js';
import { drawTV } from './tv-screen.js';
import { INK, RM, lerp, pick } from './util.js';
import { world } from './world.js';
export function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function inked(fill, lw = 4) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}
export function drawProp(k, cx, by, w, opt = {}) {
  const im = img(k);
  if (!imageReady(im))
    return;
  const h = w * im.height / im.width;
  ctx.save();
  ctx.translate(cx, by);
  if (opt.rot)
    ctx.rotate(opt.rot);
  if (opt.flip)
    ctx.scale(-1, 1);
  if (opt.skew)
    ctx.transform(1, 0, opt.skew, 1, 0, 0);
  ctx.drawImage(im, -w / 2, -h, w, h);
  ctx.restore();
  return h;
}
// 트리 불빛: [x비율, y비율, 색, 장식 공이면 true]. 첫 번째는 별
const TREE_LIGHTS = [[0.546, 0.105, 'rgba(255,230,120,A)', 1], [0.359, 0.362, 'rgba(255,120,110,A)', 1], [0.767, 0.44, 'rgba(255,215,110,A)', 1], [0.246, 0.574, 'rgba(255,215,110,A)', 1], [0.682, 0.635, 'rgba(255,120,110,A)', 1],
  [0.5, 0.28, 'rgba(255,250,200,A)'], [0.42, 0.47, 'rgba(170,220,255,A)'], [0.6, 0.4, 'rgba(255,250,200,A)'], [0.33, 0.66, 'rgba(255,190,230,A)'], [0.55, 0.56, 'rgba(170,220,255,A)'], [0.75, 0.7, 'rgba(255,250,200,A)'], [0.47, 0.69, 'rgba(255,190,230,A)']];
// 트리 불빛: 트리 바로 다음에 그려서 앞에 있는 캐릭터에 가려지게 하고, 밤에는 어둠에 덮이는 만큼 미리 밝게 그린다
function drawTreeGlow() {
  const o = O.tree;
  if (!o || !present(o))
    return;
  const im = img('tree');
  if (!imageReady(im))
    return;
  const w = o.pos.w, h = w * im.height / im.width, x0 = o.pos.x - w / 2, y0 = o.pos.y - h, t = world.t, dk = world.lampOn ? (world.dark || 0) * 0.6 : (world.dark || 0), boost = 1 / Math.max(0.35, 1 - dk);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  TREE_LIGHTS.forEach(([fx, fy, c, big], i) => {
    const k = RM ? 0.6 : 0.5 + 0.5 * Math.sin(t * (big ? 1.6 : 2.4) + i * 1.7);
    if (k < 0.15)
      return;
    const x = x0 + fx * w, y = y0 + fy * h, rr = (big ? w * 0.13 : w * 0.06) * (0.7 + 0.3 * k);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, c.replace('A', Math.min(1, 0.6 * k * boost).toFixed(2)));
    g.addColorStop(1, c.replace('A', '0'));
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  });
  ctx.restore();
  const st = TREE_LIGHTS[0], sx = x0 + st[0] * w, sy = y0 + st[1] * h;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(RM ? 0 : t * 0.8);
  ctx.strokeStyle = 'rgba(255,245,190,' + (0.5 + 0.4 * Math.sin(t * 3)) + ')';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(-w * 0.14, 0);
    ctx.lineTo(w * 0.14, 0);
    ctx.stroke();
  }
  ctx.restore();
}
// 겨울 난로 (임시 코드 그림): 둥근 반사판에 주황 열선, 바닥에 따뜻한 빛
function drawHeater(v) {
  const p = v.pos, t = world.t, fl = RM ? 1 : 0.85 + 0.15 * Math.sin(t * 5) * Math.sin(t * 1.3);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(p.x + 30, p.y + 4, 4, p.x + 30, p.y + 4, 180);
  g.addColorStop(0, `rgba(255,150,70,${0.26 * fl})`);
  g.addColorStop(1, 'rgba(255,150,70,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(p.x + 30, p.y + 4, 180, 42, 0, 0, 7);
  ctx.fill();
  ctx.restore();
  const h = drawProp('heater', p.x, p.y, p.w, { flip: v.flip });
  if (!h)
    return;
  // 열선이 은은하게 일렁임
  const ww = p.w * 0.62, hh = h * 0.58, x0 = v.flip ? p.x + p.w / 2 - p.w * 0.1 - ww : p.x - p.w / 2 + p.w * 0.1, y0 = p.y - h + h * 0.22;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cg = ctx.createRadialGradient(x0 + ww / 2, y0 + hh / 2, 2, x0 + ww / 2, y0 + hh / 2, ww * 0.6);
  cg.addColorStop(0, `rgba(255,170,80,${0.35 * fl})`);
  cg.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(x0 - 10, y0 - 10, ww + 20, hh + 20);
  ctx.restore();
}
// 코드로 그리는 모습 (look이 "code:이름"인 것)
const CODE = {
  outside: (v, d) => {
    const w = P.window;
    ctx.save();
    ctx.beginPath();
    ctx.rect(w.x - 4, w.y, w.w + 8, w.h + 4);
    ctx.clip();
    drawOutside(d, w);
    ctx.restore();
  },
  door: v => drawDoor(v),
  curtain: v => {
    const im = img(v.img);
    if (!imageReady(im))
      return;
    const ss = season(now()), sk = ((ss === 'summer' || ss === 'spring') && !RM ? Math.sin(world.t * 0.9) * 0.05 : 0) * (v.id === 'curtain_l' ? 1 : -1);
    ctx.save();
    ctx.translate(v.pos.x - v.pos.w / 2, 0);
    ctx.transform(1, 0, sk, 1, -sk * 460, 0);
    ctx.drawImage(im, 0, -30, v.pos.w, v.pos.y + 30);
    ctx.restore();
  },
  cupFalling: () => { }, cupFloor: () => drawCup(world.cup.x + 14, world.cup.fy, 1.57),
  tree: v => {
    drawProp('tree', v.pos.x, v.pos.y, v.pos.w);
    drawTreeGlow();
  },
  heater: v => drawHeater(v),
  tvShelf: v => drawShelfL(v),
  fan: v => drawProp('fx/fan_' + (Math.floor(world.t * (RM ? 2 : 14)) % 4 + 1), v.pos.x, v.pos.y, v.pos.w),
};
// ㄱ자 TV 선반: 윗판은 그림 비율 그대로, 다리만 선반 높이(h)에 맞춰 늘인다
const SHELF_BOARD = 72; // 그림에서 윗판이 끝나는 줄(원본 768×180 기준)
function drawShelfL(v) {
  const im = img(v.img);
  if (!imageReady(im))
    return;
  const k = v.pos.w / im.width, bh = SHELF_BOARD * im.height / 180, x0 = v.pos.x - v.pos.w / 2, y0 = v.pos.y - v.h;
  ctx.drawImage(im, 0, 0, im.width, bh, x0, y0, v.pos.w, bh * k);
  ctx.drawImage(im, 0, bh, im.width, im.height - bh, x0, y0 + bh * k, v.pos.w, v.h - bh * k);
}
// 노트북 화면: 상황별 그룹에서 하나를 골라 화면 안쪽에만 그린다
// 이벤트 한 번에 화면 하나: 이벤트가 시작될 때 한 번만 고르고, 노트북이 꺼질 때까지 그대로 둔다
const screenPick = { img: null };
export function screenEvent(group) {
  const g = O.laptop && O.laptop.screenInset && O.laptop.screenInset.groups;
  if (!g)
    return;
  if (group === 'catTyping' && Math.random() < 0.06 && g.rare)
    group = 'rare';
  const list = g[group];
  if (list && list.length)
    screenPick.img = pick(list);
}
function drawScreen(v) {
  if (!v.screenInset)
    return;
  if (v.state !== 'on') {
    screenPick.img = null;
    return;
  }
  if (world.party) {
    drawPartyScreen(v);
    return;
  }
  if (!screenPick.img)
    screenEvent('idle');
  if (!screenPick.img)
    return;
  const im = img('screen/' + screenPick.img);
  const p = socketOf(O[v.id], 'screenTL'), q = socketOf(O[v.id], 'screenBR');
  if (!imageReady(im) || !p || !q)
    return;
  ctx.drawImage(im, p[0], p[1], q[0] - p[0], q[1] - p[1]);
}
export function drawObj(o, d) {
  const v = objView(o), L = v.look;
  if (!L)
    return;
  if (v.tv) {
    drawTV(v);
    return;
  }
  if (L.startsWith('code:')) {
    const f = CODE[L.slice(5)];
    if (f)
      f(v, d);
    return;
  }
  if (!v.pos) {
    const im = img(L);
    if (imageReady(im))
      ctx.drawImage(im, 0, 0, 1200, im.height * BGK);
    return;
  } // 화면 전체 그림(배경)
  drawProp(L, v.pos.x, v.pos.y - zOf(o), v.pos.w);
  if (v.screen)
    drawScreen(v);
}
const drawLayer = (layer, d) => OBJ.forEach(o => {
  if (o.layer === layer && present(o))
    drawObj(o, d);
});
export function drawRoom(d) {
  drawLayer('background', d);
  drawLayer('wall', d);
  drawLayer('floor-flat', d);
}
function drawDoor(v) {
  const o = P.door, open = v.state === 'open', glow = v.state === 'glow';
  if (open) {
    ctx.fillStyle = '#f1dfb6';
    ctx.fillRect(o.x, o.y, o.w, o.h + 2);
    const g = ctx.createLinearGradient(o.x, 0, o.x + o.w, 0);
    g.addColorStop(0, 'rgba(255,236,190,.9)');
    g.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = g;
    ctx.fillRect(o.x - 60, FLOOR, o.w + 60, 40);
    const im = img('door_open');
    if (imageReady(im)) {
      const hh = o.h + 4, ww = im.width * hh / im.height;
      ctx.save();
      ctx.translate(o.x + o.w + ww * 0.62, o.y - 2);
      ctx.scale(-1, 1);
      ctx.drawImage(im, 0, 0, ww, hh);
      ctx.restore();
    }
  }
  if (glow) {
    ctx.fillStyle = 'rgba(255,226,160,.9)';
    ctx.fillRect(o.x, FLOOR - 4, o.w, 4);
  }
}
export function drawCup(x, y, rot) {
  drawProp(rot ? 'cup_down' : 'cup_up', x, y, rot ? 44 : 42);
}
export function drawSunbeam(d) {
  const b = sunbeam(d);
  if (!b)
    return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const a = 0.24 * b.k, L = b.cx - 140, R = b.cx + 140, mid = b.cx, y0 = 600, y1 = 740, ym = lerp(y0, y1, 0.5), sk = b.sk;
  const quad = (x0, x1, ya, yb, s0, s1) => {
    ctx.beginPath();
    ctx.moveTo(x0 + s0, ya);
    ctx.lineTo(x1 + s0, ya);
    ctx.lineTo(x1 + s1, yb);
    ctx.lineTo(x0 + s1, yb);
    ctx.closePath();
  };
  ctx.fillStyle = `rgba(255,214,140,${a})`;
  quad(L, mid - 8, y0, ym - 6, 0, sk * 0.5);
  ctx.fill();
  quad(mid + 8, R, y0, ym - 6, 0, sk * 0.5);
  ctx.fill();
  quad(L, mid - 8, ym + 6, y1, sk * 0.55, sk);
  ctx.fill();
  quad(mid + 8, R, ym + 6, y1, sk * 0.55, sk);
  ctx.fill();
  const g = ctx.createLinearGradient(0, 0, 0, 700);
  g.addColorStop(0, `rgba(255,230,170,${0.06 * b.k})`);
  g.addColorStop(1, 'rgba(255,230,170,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(P.window.x + 40, 0);
  ctx.lineTo(P.window.x + P.window.w - 40, 0);
  ctx.lineTo(R + sk, y1);
  ctx.lineTo(L, y0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
