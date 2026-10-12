/* 행동 단계와 길찾기: 걷기(go), 따라가기, 기다리기, 말풍선 단계, 순서대로 실행(run) */
import { EDGE, nextHop } from './anim.js';
import { OBJ, S, objView, present } from './objects.js';
import { clamp, lerp } from './util.js';
// step helpers
/* ───────── 길찾기: 사물의 몸(body)을 피해 간다 ───────── */
const R = b => ({ x0: b.rect[0], x1: b.rect[1], y0: b.rect[2], y1: b.rect[3] });
function blockers(kind, free) {
  return OBJ.filter(o => present(o) && !(free && free.includes(o.id))).map(objView).filter(v => v.body && v.body.blocks.includes(kind)).map(v => R(v.body));
}
function inRect(r, x, y) {
  return r && x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1;
}
function crosses(r, x0, y0, x1, y1) {
  if (!r)
    return false;
  for (let i = 1; i < 24; i++) {
    const t = i / 24;
    if (inRect(r, lerp(x0, x1, t), lerp(y0, y1, t)))
      return true;
  }
  return false;
}
// 막힌 물건을 앞이나 뒤로 돌아가는 길. 물건이 여러 개면 차례로 돌아간다
function detour(rs, x0, y0, tx, ty, depth) {
  const r = rs.find(r => crosses(r, x0, y0, tx, ty));
  if (!r || depth <= 0)
    return [[tx, ty]];
  const fy = Math.min(r.y1 + 14, 740), by = Math.max(r.y0 - 10, 592);
  const wy = (Math.abs(y0 - fy) + Math.abs(ty - fy)) <= (Math.abs(y0 - by) + Math.abs(ty - by)) ? fy : by;
  const L = r.x0 - 16, Rr = r.x1 + 16, right = tx > x0, pts = [];
  if (x0 > r.x0 && x0 < r.x1)
    pts.push([x0, wy]);
  else
    pts.push([right ? L : Rr, wy]);
  if (!(tx > r.x0 && tx < r.x1))
    pts.push([right ? Rr : L, wy]);
  else
    pts.push([tx, wy]);
  pts.push([tx, ty]);
  const out = [];
  let px = x0, py = y0;
  for (const [qx, qy] of pts) {
    out.push(...detour(rs.filter(q => q !== r), px, py, qx, qy, depth - 1));
    px = qx;
    py = qy;
  }
  return out;
}
function routeTo(a, tx, ty, free) {
  const rs = blockers(a.kind, free === true ? ['box'] : free);
  for (const r of rs)
    if (inRect(r, tx, ty))
      ty = (a.y < (r.y0 + r.y1) / 2 && r.y0 - 8 >= 592) ? r.y0 - 8 : Math.min(r.y1 + 10, 740);
  return detour(rs, a.x, a.y, tx, ty, 4);
}
function stepToward(a, tx, ty, sp, dt) {
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  if (d < 3)
    return true;
  a.moving = true;
  a.fast = sp >= 140;
  a.walkPh += dt * sp * 0.075;
  a.pose = a.kind === 'cat' ? 'stand' : 'walk';
  a.closed = false;
  if (Math.abs(dx) > 2)
    a.face = dx > 0 ? 1 : -1;
  const m = Math.min(d, sp * dt);
  a.x += dx / d * m;
  a.y += dy / d * m;
  return d - m < 3;
}
const gate = a => {
  if (a.kind === 'cat' && (a.tr || a.dp !== 'stand')) {
    a.pose = 'stand';
    a.closed = false;
    a.moving = false;
    return true;
  }
  return false;
}; // 일어나는 동작이 끝나야 걷는다
export const go = (x, y, sp = 70, free = false) => ({ init(a) {
    a.path = null;
    a.gx = clamp(x, 40, 1160);
    a.gy = clamp(y, 592, 740);
  }, tick(a, dt) {
    if (gate(a))
      return false;
    if (!a.path)
      a.path = routeTo(a, a.gx, a.gy, free);
    const p = a.path[0];
    if (stepToward(a, p[0], p[1], sp, dt)) {
      a.path.shift();
      if (!a.path.length) {
        a.moving = false;
        return true;
      }
    }
    return false;
  } });
// 움직이는 상대를 따라가기 (near 안으로 들어가거나 시간이 다 되면 끝)
export const follow = (who, sp, near, maxT, off = 0) => ({ init(a) {
    a.left = maxT;
  }, tick(a, dt) {
    a.left -= dt;
    if (gate(a))
      return false;
    const tx = who.x + off * (who.x < a.x ? 1 : -1), ty = who.y, d = Math.hypot(tx - a.x, ty - a.y);
    if (who.hidden || d < near || a.left <= 0) {
      a.moving = false;
      return true;
    }
    const pts = routeTo(a, tx, ty, false);
    stepToward(a, pts[0][0], pts[0][1], sp, dt);
    return false;
  } });
export const faceTo = who => fn(a => {
  a.face = who.x > a.x ? 1 : -1;
});
export const hold = (sec, pose, closed = false, face) => ({ init(a) {
    a.left = sec;
    a.moving = false;
    if (pose)
      a.pose = pose;
    a.closed = closed;
    if (face)
      a.face = face;
  }, tick(a, dt) {
    a.left -= dt;
    return a.left <= 0;
  } });
export const dance = sec => ({ init(a) {
    a.left = sec;
    a.dance = { t: 0, dur: sec };
    a.pose = 'stand';
    a.closed = false;
    a.moving = false;
  }, tick(a, dt) {
    a.left -= dt;
    a.dance.t += dt;
    if (a.left <= 0) {
      a.dance = null;
      return true;
    }
    return false;
  } });
export const bub = (t, sec = 4) => ({ init(a) {
    a.bub = { t, life: sec, max: sec };
  }, tick() {
    return true;
  } });
export const fn = f => ({ init(a) {
    f(a);
  }, tick() {
    return true;
  } });
export const until = (cond, max = 60) => ({ init(a) {
    a.left = max;
    a.moving = false;
  }, tick(a, dt) {
    a.left -= dt;
    return cond() || a.left <= 0;
  } });
export function run(a, steps, tag = '') {
  if (a.act)
    a.act = null;
  if (a.kind === 'cat')
    a.typing = false;
  if (a.jump) {
    if (a.jump.up)
      a.onTV = true;
    a.jump = null;
  } // 점프 중에 끊기면 TV 위에 있던 것으로 치고 아래 규칙대로 내려놓는다
  if (a.onTV) {
    a.onTV = false;
    const s = S('tv.side');
    if (s) {
      a.x = s[0];
      a.y = s[1];
    }
    a.dp = a.pose = 'stand';
    a.tr = null;
  } // TV 위에서 내려와서 시작
  if (a.tvPeek) {
    a.tvPeek = false;
    const s = S('tv.behind');
    if (s) {
      a.x = s[0] + 20;
      a.y = s[1];
    }
  }
  if (a.inBox) {
    a.inBox = false;
    const e = S('box.enter');
    a.x = e[0];
    a.y = e[1] + 6;
    a.dp = a.pose = 'loaf';
    a.tr = null;
  }
  a.steps = steps.slice();
  a.cur = null;
  a.tag = tag;
  a.moving = false;
}
export function tickActor(a, dt) {
  if (a.bub) {
    a.bub.life -= dt;
    if (a.bub.life <= 0)
      a.bub = null;
  }
  if (a.kind === 'mouse' && a.react) {
    a.react.t -= dt;
    if (a.react.t <= 0)
      a.react = null;
  }
  if (a.kind === 'cat') {
    if (a.react) {
      a.react.t -= dt;
      if (a.react.t <= 0)
        a.react = null;
    }
    if (a.tr) {
      a.tr.t += dt;
      if (a.tr.t >= a.tr.dur) {
        a.dp = a.tr.to;
        a.tr = null;
      }
    }
    if (!a.tr && a.dp !== a.pose) {
      const n = nextHop(a.dp, a.pose), e = EDGE[a.dp + '>' + n];
      if (e) {
        a.tr = { name: e[0], from: a.dp, to: n, t: 0, dur: e[1] };
        if (e[0] === 'rise' && Math.random() < 0.5)
          a.yawn = 1;
      }
      else
        a.dp = a.pose;
    }
  }
  let guard = 0;
  while (guard++ < 8) {
    if (!a.cur) {
      if (!a.steps.length)
        return;
      const st = a.steps.shift();
      a.cur = st;
      st.init(a);
      if (a.cur !== st)
        continue;
    }
    const st = a.cur;
    if (st.tick(a, dt)) {
      if (a.cur === st)
        a.cur = null;
      dt = 0;
      continue;
    }
    return;
  }
}
