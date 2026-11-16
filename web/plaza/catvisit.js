/* 강고양이 씨 광장 나들이 (XMAS_PLAZA_PLAN.md 3-8). 방과 상관없이 따로 논다
   - 왼쪽 붕어빵 노점 뒤(cat.fromX, 스르륵 나타남)에서 걸어 들어와 트리 앞 자리(cat.spot — 펠리컨 왼쪽)에 멈춤
     → 트리 올려다보기 → 앉기(가끔 하품·그루밍·식빵) → 일어나 왔던 길로 돌아가 노점 뒤로 사라짐
   - 그림: 방 프레임(../f/cat_*.webp, f/meta.json [폭, 높이, 기준점 x, y, (크기 보정)]). 방 그림은 왼쪽을 본다 → 오른쪽을 볼 땐 뒤집기
   - 크기: 방 대비 cat.scale배(손님 charScale과 따로 — 손님 크기는 생일 그림 틀 기준이라 같은 숫자여도 강고양이 씨가 커 보임) × depth(y)
   - 언제: every초 칸마다 chance로 한 번(칸 안 시작은 고정 난수 — 같은 시각엔 누구에게나 같음). 낮·밤 모두
   - 동작 줄이기: 나들이 칸이면 트리 앞에 앉아 있는 모습만. 미리보기 ?cat=1: 바로, devEvery초마다 */
const clamp01 = v => Math.max(0, Math.min(1, v));
const WALK = ['walk_contact_right', 'walk_pass_after_right', 'walk_contact_left', 'walk_pass_after_left'];

export function makeCatVisit(cfg, { rnd, RM, depthAt, dev }) {
  const C = cfg.cat, CH = cfg.char;
  let meta = null;
  const ims = {};
  const im = n => ims[n] || (ims[n] = Object.assign(new Image(), { src: `../f/cat_${n}.webp` }));
  fetch('../f/meta.json').then(r => r.json()).then(m => { meta = m; }).catch(() => { });
  let cat = null, lastSlot = -1;
  const every = dev ? C.devEvery : C.every;
  // 앉아 있는 동안의 순서: [프레임 이름들(번갈아), 초]
  const plan = () => {
    const out = [[['lookup_2', 'lookup_3'], C.lookSec, 1.1]];
    out.push([['sit_1'], C.sitSec[0] + Math.random() * (C.sitSec[1] - C.sitSec[0]), 9]);
    const extra = [[['yawn'], 1.6, 9], [['groom_1', 'groom_2', 'groom_3', 'groom_4'], 3.2, 0.35], [['loaf_1', 'loaf_2'], 6, 2.5]];
    for (const e of extra)
      if (Math.random() < C.extraChance)
        out.push(e, [['sit_1'], 2 + Math.random() * 3, 9]);
    out.push([['lookup_2', 'lookup_3'], C.lookSec * 0.6, 1.1], [['stand'], 0.6, 9]);
    return out;
  };
  const update = (t, dt) => {
    const slot = Math.floor(t / every), at = slot * every + (dev ? 0 : rnd('catAt', slot) * every * 0.5);
    if (!cat && slot !== lastSlot && t >= at) {
      lastSlot = slot;
      if (dev || rnd('catOn', slot) < C.chance)
        cat = { x: C.fromX, state: RM ? 'sit' : 'in', face: 1, steps: plan(), si: 0, sT: t, walkPh: 0 };
    }
    if (!cat)
      return;
    const [sx] = C.spot;
    if (cat.state === 'in' || cat.state === 'out') {
      const dir = cat.state === 'in' ? 1 : -1;
      cat.face = dir;
      cat.x += dir * C.speed * dt;
      cat.walkPh += dt * C.walkFps;
      if (cat.state === 'in' && cat.x >= sx) {
        cat.x = sx;
        cat.state = 'stay';
        cat.si = 0;
        cat.sT = t;
        cat.face = C.face; // 트리 쪽을 봄
      }
      else if (cat.state === 'out' && cat.x <= C.fromX)
        cat = null;
    }
    else if (cat.state === 'stay') {
      const st = cat.steps[cat.si];
      if (t - cat.sT >= st[1]) {
        cat.si++;
        cat.sT = t;
        if (cat.si >= cat.steps.length)
          cat.state = 'out';
      }
    }
    else if (cat.state === 'sit' && t - (lastSlot * every) > C.rmSec) // 동작 줄이기: 앉아 있다가 사라짐
      cat = null;
  };
  const draw = g => {
    if (!cat || !meta)
      return;
    const [sx, sy] = C.spot;
    let name;
    if (cat.state === 'in' || cat.state === 'out')
      name = WALK[Math.floor(cat.walkPh) % 4];
    else if (cat.state === 'sit')
      name = 'sit_1';
    else {
      const [names, , per] = cat.steps[cat.si], el = performance.now() / 1000 - 0;
      name = names[Math.floor(el / per) % names.length];
    }
    const m = meta['cat_' + name], fr = im(name);
    if (!m || !fr.complete || !fr.naturalWidth)
      return;
    const [fw, fh, ax, ay, fk = 1] = m, k = CH.roomPx * C.scale * depthAt(sy) * fk;
    const x = cat.x, y = sy;
    g.save();
    if (cat.state === 'in' || cat.state === 'out')
      g.globalAlpha = clamp01((cat.x - C.fromX) / C.fade); // 노점 뒤에서 스르륵
    g.translate(x, y);
    g.scale(cat.face > 0 ? -k : k, k); // 방 그림은 왼쪽을 봄
    g.drawImage(fr, -ax, -ay, fw, fh);
    g.restore();
  };
  return { update, draw, y: () => C.spot[1] };
}
