/* 배우 그리기: 고양이·쥐 프레임, 그림자, 빼꼼, 말풍선 아이콘, 자막 */
import { catFrame, mouseFrame } from './anim.js';
import { FRAMES, FSC, IMG, MSC, imageReady, img } from './assets.js';
import { DANCE_CELLS, danceCell } from './birthday.js';
import { inked, rr } from './draw.js';
import { O, P } from './objects.js';
import { DEPTH, H, W, cam, ctx, view } from './stage.js';
import { actorLift, hasShadow } from './steps.js';
import { HAND, INK, RM, clamp, onScene } from './util.js';
import { cat, world } from './world.js';
import { holiday, now } from './time.js';
// 나중 묶음을 다 받기 전에 아직 없는 프레임이 불리면 (LOAD_PLAN.md 4-3): 그 배우가 마지막으로 실제로 그린 프레임을 그 자리에 그린다.
// 그것도 없으면 서 있는 그림. a.frame(지금 프레임 이름, 다른 곳이 읽는다)은 그대로 두고, 그린 것은 a.drawn에 따로 기억한다
let frameMiss = 0;
export const frameMisses = () => frameMiss; // 점검용: 대신 그린 횟수 (다 받기 전 허용한 행동이 나중 묶음 그림을 쓰면 늘어난다)
function drawFrame(name, x, y, face, sc, sy = 1, a = null) {
  let im = IMG['f_' + name];
  if (!imageReady(im)) {
    if (!FRAMES[name] && !im)
      return;
    frameMiss++;
    name = a && a.drawn && imageReady(IMG['f_' + a.drawn]) ? a.drawn : a && a.kind === 'mouse' ? 'mouse_idle_1' : 'cat_stand';
    im = IMG['f_' + name];
    if (!imageReady(im))
      return;
  }
  else if (a)
    a.drawn = name;
  const [fw, fh, ax, ay, k = 1] = FRAMES[name]; // k: 이 그림만의 크기 보정 (그림마다 고양이 크기가 조금 다를 때, meta.json 5번째 값)
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-face * sc * k, sc * sy * k);
  ctx.drawImage(im, -ax, -ay);
  ctx.restore();
}
function drawCat(a) {
  const dp = DEPTH(a.y), sc = FSC * dp;
  if (a.dance) {
    const im = IMG.f_birthday_dance, i = danceCell(a), h = 213 * dp; // 칸 번호는 노래 시계로 (손님과 같은 칸, birthday.js)
    a.frame = 'cat_stand';
    ctx.beginPath();
    ctx.ellipse(a.x, a.y + 2, 72 * dp, 12 * dp, 0, 0, 7);
    ctx.fillStyle = 'rgba(50,30,15,.22)';
    ctx.fill();
    // 시트의 칸 폭이 고르지 않아(1번 꼬리가 2번 칸으로 넘어감) 실제 그림 범위로 자른다
    if (imageReady(im)) {
      const [x0, x1] = DANCE_CELLS[i], k = h / im.height, dw = (x1 - x0) * k;
      ctx.drawImage(im, x0, 0, x1 - x0, im.height, a.x - dw / 2, a.y - h * 690 / 724, dw, h);
    }
    else // 시트를 아직 못 받았으면 사라지지 않게 마지막 그림으로 (LOAD_PLAN.md 4-3)
      drawFrame('birthday_dance', a.x, a.y, a.face, sc, 1, a);
    return;
  }
  const fr = 'cat_' + catFrame(a);
  a.frame = fr;
  const lift = actorLift(a); // TV 위, 선반 위 TV 뒤, 쳇바퀴 안, 점프 중 (steps.js SPOTS)
  if (!fr.startsWith('cat_box_') && hasShadow(a)) {
    ctx.beginPath();
    ctx.ellipse(a.x, a.y + 2, 96 * dp, 13 * dp, 0, 0, 7);
    ctx.fillStyle = 'rgba(50,30,15,.22)';
    ctx.fill();
  }
  const br = (!RM && a.closed && a.dp === 'loaf' && !a.tr && !a.act) ? 1 + Math.sin(world.t * 1.5 + a.phase) * 0.012 : 1;
  if (fr.startsWith('cat_box_'))
    drawFrame(fr, P.box.x, P.box.y, -1, FSC * DEPTH(P.box.y));
  else
    drawFrame(fr, a.x, a.y - lift, a.face, sc, br, a);
}
// 빼꼼: 그림 속 구멍을 배경의 쥐구멍에 맞추고, 쥐구멍 모양으로 잘라서 그린다
export const HOLE = {}; // 배경 쥐구멍 입구: 장면의 hole.mouth (cx, bottom, w, h)
onScene(() => Object.assign(HOLE, O.hole.mouth));
export const PEEK_HOLE = { x0: 62, x1: 157, bottom: 93 }; // 빼꼼 그림 안의 구멍 (그림 기준)
function drawPeek() {
  const im = IMG.f_mouse_peek_1;
  if (!imageReady(im))
    return;
  const s = HOLE.w / (PEEK_HOLE.x1 - PEEK_HOLE.x0), hx = (PEEK_HOLE.x0 + PEEK_HOLE.x1) / 2, r = HOLE.w / 2, top = HOLE.bottom - HOLE.h + r;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(HOLE.cx - r, HOLE.bottom + 1);
  ctx.lineTo(HOLE.cx - r, top);
  ctx.arc(HOLE.cx, top, r, Math.PI, 0);
  ctx.lineTo(HOLE.cx + r, HOLE.bottom + 1);
  ctx.closePath();
  ctx.rect(HOLE.cx - r - 120, HOLE.bottom - 26, 120, 27);
  ctx.clip();
  ctx.drawImage(im, HOLE.cx - hx * s, HOLE.bottom - PEEK_HOLE.bottom * s, im.width * s, im.height * s);
  ctx.restore();
}
function drawMouse(a) {
  if (a.hidden)
    return;
  const dp = DEPTH(a.y), fr = 'mouse_' + mouseFrame(a);
  a.frame = fr;
  if (a.peek) {
    drawPeek();
    return;
  }
  if (hasShadow(a)) {
    ctx.beginPath();
    ctx.ellipse(a.x, a.y + 2, 52 * dp, 7 * dp, 0, 0, 7);
    ctx.fillStyle = 'rgba(50,30,15,.22)';
    ctx.fill();
  }
  // 코 킁킁: 가만히 있을 때 아주 살짝 앞뒤로
  const sn = (!RM && fr === 'mouse_idle_1') ? 1 + Math.max(0, Math.sin((world.t + a.phase) * 7)) * 0.012 : 1;
  drawFrame(fr, a.x, a.y - actorLift(a), a.face, MSC * dp * sn, 1, a);
  if (holiday(now()) === 'halloween')
    drawGhostSheet(a.drawn || fr, a.x, a.y - actorLift(a), a.face, MSC * dp * sn);
}
/* 할로윈 유령 분장 (tasks/halloween-room-extras.md 2장): 쥐야쥐 그림 위에 하얀 천을 덮어 그린다.
   그림 좌표(drawFrame과 같은 변환)로: 머리 쪽(그림 왼쪽 30%)이 둥근 천, 아래 단은 물결, 눈구멍 둘. 꼬리 끝(그림 오른쪽)은 천 밖으로 */
function drawGhostSheet(name, x, y, face, sc) {
  const f = FRAMES[name];
  if (!f)
    return;
  const [fw, fh, ax, ay, k = 1] = f, L = fw * 0.04 - ax, R = fw * 0.72 - ax, B = fh - ay, T = -ay - fh * 0.12, hx = fw * 0.3 - ax, sleep = name.startsWith('mouse_sleep');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-face * sc * k, sc * k);
  ctx.beginPath();
  ctx.moveTo(L, B);
  ctx.lineTo(L, T + (B - T) * 0.45);
  ctx.quadraticCurveTo(L, T, hx, T); // 머리 쪽 둥근 꼭대기
  ctx.quadraticCurveTo(R, T, R, T + (B - T) * 0.55);
  ctx.lineTo(R, B);
  const n = 5, wob = RM ? 0 : Math.sin(world.t * 5) * 3; // 아래 단 물결 (걸을 때 살랑)
  for (let i = n; i > 0; i--) {
    const x0 = L + (R - L) * i / n, x1 = L + (R - L) * (i - 1) / n;
    ctx.quadraticCurveTo((x0 + x1) / 2 + wob, B - fh * 0.16, x1, B);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(250,247,240,.97)';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4 / (sc * k);
  ctx.stroke();
  ctx.fillStyle = INK; // 눈구멍 (자는 중엔 감은 눈)
  const ey = T + (B - T) * 0.32, er = Math.max(5, fh * 0.07);
  for (const ex of [hx - er * 1.6, hx + er * 1.4])
    if (sleep) {
      ctx.beginPath();
      ctx.moveTo(ex - er, ey);
      ctx.quadraticCurveTo(ex, ey + er * 0.8, ex + er, ey);
      ctx.stroke();
    }
    else {
      ctx.beginPath();
      ctx.ellipse(ex, ey, er * 0.75, er, 0, 0, 7);
      ctx.fill();
    }
  ctx.restore();
}
export function drawActor(a) {
  if (a.kind === 'cat')
    drawCat(a);
  else
    drawMouse(a);
}
const TV_HEAD = { cat_tv_ear_turn: [95, 240], cat_tv_top_sleep_1of2: [120, 270], cat_tv_top_sleep_2of2: [120, 270], cat_tv_behind_peek_1of2: [250, 110], cat_tv_behind_peek_2of2: [250, 110],
  cat_fish_sit_1: [411, 131], cat_fish_sit_2: [411, 140], cat_fish_yank_1: [529, 73], cat_fish_yank_2: [215, 271] }; // TV·낚시 그림의 머리 위치 (말풍선)
function headPos(a) {
  const dp = DEPTH(a.y), lift = actorLift(a);
  if (a.frame && (a.frame.startsWith('cat_tv_') || TV_HEAD[a.frame])) {
    const f = FRAMES[a.frame], hd = TV_HEAD[a.frame] || [276, 110], sc = FSC * dp * (f[4] || 1);
    return [a.x + (-a.face) * (hd[0] - f[2]) * sc, a.y - lift - (f[3] - hd[1]) * sc];
  }
  const fr = FRAMES[a.frame] || FRAMES[a.kind === 'cat' ? 'cat_loaf_1' : 'mouse_idle_1'], sc = (a.kind === 'cat' ? FSC : MSC) * dp * (fr[4] || 1);
  if (a.kind === 'mouse' && a.peek)
    return [HOLE.cx - 20, HOLE.bottom - 30];
  return [a.x + (-a.face) * (fr[0] * 0.3 - fr[2]) * sc, a.y - lift - (fr[3] - fr[1] * 0.08) * sc];
}
// 이모지 → 손그림 아이콘. 목록에 없는 글자(… 등)는 글자로 그린다
const EMO = { '🐟': 'fish', '❓': 'question', '❔': 'question', '❗': 'excl', '‼️': 'excl2', '☀️': 'sun', '😌': 'cat_calm', '💤': 'zzz', '➡️': 'arrow', '🐦': 'bird', '👀': 'eyes', '🐭': 'mouse',
  '😮‍💨': 'sigh', '🦋': 'butterfly', '🙃': 'cat_flip', '👣': 'paws', '❤️': 'heart', '🥛': 'cup', '👉': 'paw', '🐾': 'paw', '😏': 'cat_smug', '😼': 'cat_smug', '😜': 'cat_smug', '💢': 'angry', '🌧️': 'rain', '❄️': 'snow', '🙉': 'ears', '👃': 'eyes',
  '😋': 'bowl', '∑': 'code', '{ }': 'code', '⚛️': 'code', '∫': 'code', '👽': 'alien', '😒': 'cat_smug', '🙄': 'cat_smug', '😑': 'cat_smug', '💨': 'sigh', '✨': 'sun' };
const EMO_KEYS = Object.keys(EMO).sort((a, b) => b.length - a.length);
function tokens(t) {
  const out = [];
  let i = 0;
  while (i < t.length) {
    if (t[i] === ' ') {
      i++;
      continue;
    }
    const k = EMO_KEYS.find(k => t.startsWith(k, i));
    if (k) {
      out.push({ icon: EMO[k] });
      i += k.length;
    }
    else {
      const cp = String.fromCodePoint(t.codePointAt(i));
      out.push({ txt: cp });
      i += cp.length;
    }
  }
  return out.reduce((a, x) => {
    const l = a[a.length - 1];
    if (x.txt && l && l.txt && /[.…]/.test(x.txt) && /[.…]/.test(l.txt))
      l.txt += x.txt;
    else
      a.push(x);
    return a;
  }, []);
}
const ICON_H = 30, ICON_GAP = 4;
export function drawBubble(a) {
  if (!a.bub || (a.kind === 'mouse' && a.hidden))
    return;
  const b = a.bub;
  const al = Math.min(1, (b.max - b.life) * 3, b.life * 2);
  if (al <= 0)
    return;
  let [hx, hy] = headPos(a);
  if (a.kind === 'mouse' && cat.bub) {
    const [cx, cy] = headPos(cat);
    if (Math.abs(cx - hx) < 130 && Math.abs(cy - hy) < 90)
      hy = Math.min(hy, cy - 60);
  }
  ctx.save();
  ctx.globalAlpha = al;
  ctx.font = '700 24px ' + HAND;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const T = tokens(b.t).map(x => {
    if (x.icon) {
      const im = img('icon/' + x.icon);
      const w = imageReady(im) ? ICON_H * im.width / im.height : ICON_H;
      return { ...x, im, w: Math.min(w, ICON_H * 1.5) };
    }
    return { ...x, w: ctx.measureText(x.txt).width };
  });
  const tw = T.reduce((s, x) => s + x.w, 0) + ICON_GAP * Math.max(0, T.length - 1), bw = Math.max(48, tw + 26), bh = 46, bx = clamp(hx - bw / 2, cam.x + 8, cam.x + (view.vw || W) - bw - 8), by = hy - bh - 18 - (RM ? 0 : Math.sin(world.t * 2) * 2);
  rr(bx, by, bw, bh, 20);
  inked('#fffaf0', 3.5);
  ctx.beginPath();
  ctx.moveTo(hx - 8, by + bh - 1);
  ctx.lineTo(hx - 2, by + bh + 12);
  ctx.lineTo(hx + 8, by + bh - 1);
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(hx - 8, by + bh + 1);
  ctx.lineTo(hx - 2, by + bh + 12);
  ctx.lineTo(hx + 8, by + bh + 1);
  ctx.stroke();
  let cx = bx + (bw - tw) / 2;
  ctx.fillStyle = INK;
  for (const x of T) {
    if (x.icon) {
      if (imageReady(x.im)) {
        const h = x.w * x.im.height / x.im.width;
        ctx.drawImage(x.im, cx, by + bh / 2 - h / 2, x.w, h);
      }
    }
    else
      ctx.fillText(x.txt, cx, by + bh / 2 + 1);
    cx += x.w + ICON_GAP;
  }
  ctx.restore();
}
export function drawCaptions(dt) {
  let y = H - 30;
  world.captions = world.captions.filter(c => (c.life -= dt) > 0);
  world.captions.forEach(c => {
    const al = Math.min(1, c.life, (c.max - c.life) * 3);
    ctx.save();
    ctx.globalAlpha = al;
    ctx.font = '700 22px ' + HAND;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,248,230,.95)';
    ctx.strokeStyle = 'rgba(20,14,10,.7)';
    ctx.lineWidth = 5;
    const cx = cam.x + (view.vw || W) - 24;
    ctx.strokeText(c.t, cx, y);
    ctx.fillText(c.t, cx, y);
    ctx.restore();
    y -= 30;
  });
}
/* ───────── 밤하늘 실루엣 대비 (HALLOWEEN_FIX_PLAN.md 2-3, 예전 halloween.js) ─────────
   박쥐·마녀·검은 고양이 그림은 짙은 갈색이라 깊은 밤 남색 하늘에 묻힌다. 어두운 밤일수록(world.dark)
   가장자리에 옅은 달빛 테두리(연노랑, 약 1px)를 두르고 몸도 살짝 밝힌다. 노을 직후처럼 하늘이 밝을 때는 거의 그대로 */
const skyTintC = {};
function skyTint(name, kind) {
  const key = name + kind;
  if (skyTintC[key])
    return skyTintC[key];
  const im = img(name);
  if (!imageReady(im))
    return null;
  const c = document.createElement('canvas');
  c.width = im.naturalWidth;
  c.height = im.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = kind === 'rim' ? 'rgb(255,238,176)' : 'rgba(196,186,232,0.24)';
  x.fillRect(0, 0, c.width, c.height);
  return skyTintC[key] = c;
}
const skyNight = () => clamp((world.skyDark - 0.35) / 0.4, 0, 1); // 바깥 어둠
// (x, y)는 그림 왼쪽 위. 지금 변환(회전 등) 그대로 그린다
export function drawSkySprite(name, im, x, y, w, h, alpha) {
  const nk = skyNight(), rim = nk > 0 && skyTint(name, 'rim'), lift = nk > 0 && skyTint(name, 'lift');
  if (rim) {
    ctx.globalAlpha = alpha * 0.6 * nk;
    for (const [dx, dy] of [[-1.1, 0], [1.1, 0], [0, -1.1], [0, 1.1]])
      ctx.drawImage(rim, x + dx, y + dy, w, h);
  }
  ctx.globalAlpha = alpha;
  ctx.drawImage(im, x, y, w, h);
  if (lift) {
    ctx.globalAlpha = alpha * nk;
    ctx.drawImage(lift, x, y, w, h);
  }
  ctx.globalAlpha = 1;
}
