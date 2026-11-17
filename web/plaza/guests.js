/* 크리스마스 광장 손님 (PLAZA_PLAN.md 4-3, 그림 XMAS_PLAZA_GUEST_ART.md): 생일 손님들이 겨울 소품을 하고 광장을 걸어 다닌다.
   - 오른쪽 화면 밖, 또는 왼쪽 붕어빵 노점 뒤(leftX, 스르륵 나타남)에서 걸어 들어와 멈출 곳(트리 앞 양옆·붕어빵 노점 앞·스케이트장 앞) 한두 곳에서 트리를 올려다보고(⑤) 반대편으로 나간다
   - 몇 명: 시간대마다 [적게, 많게](scene.json guests.count), 10분 칸마다 날짜 씨앗으로 그 사이 한 수. 12/24·25 밤은 북적
   - 크기: 캐릭터 크기 규칙(plaza.js char — 방보다 작게 + 원근 depth). 생일 시트 틀(강고양이 씨 560) 기준 키 → 광장 px
   - 그림이 아직 없는 손님은 나오지 않는다(그림이 들어오면 저절로). 밤엔 그림을 어둡게 덮는다(광장 그림과 같이)
   - 누르면(tapAt) 잠깐 춤추고(생일 춤 시트 web/sheet/guest-<id>-dance-v1.webp ①~④, danceSec초) 다시 걷는다 (2026-11-17)
   - family-01은 스케이트보드를 타고 지나감(guests.sheet·ride, 2026-11-18): 밀기 두 칸 → 미끄러지기, 걷는 손님의 두 배쯤 빠르게, 멈출 곳에선 보드 위에 서서 올려다봄
   - 동작 줄이기: 걷지 않고 멈출 곳에 서서 올려다보는 모습만 (춤도 없음) */
import { tintAtop } from './plaza-kit.js';
const clamp01 = v => Math.max(0, Math.min(1, v));

export function makeGuests(cfg, { rnd, RM, depthAt, isXmasNight, hourOf, force }) {
  const G = cfg.guests, CH = cfg.char;
  const imgs = {};
  const load = id => {
    if (imgs[id])
      return imgs[id];
    const im = new Image();
    im.decoding = 'async';
    im.src = `guests/${id}-${(G.sheet && G.sheet[id]) || 'walk'}.webp?v=${cfg.v}`; // family-01은 스케이트보드(sheet)
    im.onerror = () => { im.bad = true; };
    im.onload = () => measure(im);
    return imgs[id] = im;
  };
  // 그림마다 ⑤(서 있는 칸)의 실제 키·발끝을 잰다 — 칸 여백이 손님마다 달라도 키가 틀 표(G.tplH)대로 나오게
  const measure = (im, cell = 4, [cw, chh] = G.cell) => {
    try {
      const c = document.createElement('canvas');
      c.width = cw;
      c.height = chh;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, cell * cw, 0, cw, chh, 0, 0, cw, chh);
      const d = x.getImageData(0, 0, cw, chh).data;
      let top = chh, bot = -1;
      for (let y = 0; y < chh; y++)
        for (let xx = 0; xx < cw; xx += 2)
          if (d[(y * cw + xx) * 4 + 3] > 60) {
            if (y < top)
              top = y;
            bot = y;
            break;
          }
      if (bot > top)
        Object.assign(im, { visH: bot - top + 1, footY: bot + 1 });
    }
    catch (e) { }
  };
  G.ids.forEach(load);
  // 춤 시트: 처음 누를 때 불러옴 (생일 손님 그림 — 칸 G.danceCell, ① 칸 키를 재서 걷는 그림과 같은 키로)
  const dances = {};
  const dance = id => {
    if (dances[id])
      return dances[id];
    const im = new Image();
    im.decoding = 'async';
    im.src = `../sheet/guest-${id}-dance-v1.webp?v=${cfg.v}`;
    im.onerror = () => { im.bad = true; };
    im.onload = () => measure(im, 0, G.danceCell);
    return dances[id] = im;
  };
  const danceReady = id => { const im = dances[id]; return im && !im.bad && im.complete && im.naturalWidth > 0 && im.visH; };
  const ready = id => { const im = imgs[id]; return im && !im.bad && im.complete && im.naturalWidth > 0; };
  const list = [];
  let nextAt = 0, tmp = null;

  // 앞쪽(깊이 1) 강고양이 씨 키(광장 px) = 방 프레임 키(catH) × roomPx × charScale. 손님 키 = 그 × 틀 키 ÷ 틀의 강고양이 씨 키(560)
  const catPx = CH.roomPx * CH.charScale * G.catH;
  const wantOf = q => catPx * (G.tplH[q.id] || 480) / 560 * depthAt(q.y) * (G.size[q.id] || 1);
  const target = (d, night, xmas) => {
    if (force != null)
      return force;
    const h = hourOf(d), c = G.count;
    const [lo, hi] = xmas && night ? c.xmasNight : h >= 1 && h < 6 ? c.lateNight : night ? c.evening : c.day;
    const slot = Math.floor(d.getTime() / 600000);
    return lo + Math.floor(rnd('gcount', slot) * (hi - lo + 1));
  };
  const spawn = (t, standOnly) => {
    const here = new Set(list.map(q => q.id));
    const free = G.ids.filter(id => ready(id) && !here.has(id));
    if (!free.length)
      return;
    const wt = id => (G.weight && G.weight[id]) || 1; // 주인장들은 조금 덜 (scene.json guests.weight)
    let r = Math.random() * free.reduce((a, id) => a + wt(id), 0), id = free[free.length - 1];
    for (const f of free)
      if ((r -= wt(f)) < 0) {
        id = f;
        break;
      }
    const hop = G.hop.includes(id), ride = G.ride && G.ride[id];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y = G.y[0] + Math.random() * (G.y[1] - G.y[0]);
    // 멈출 곳 한두 곳 (걷는 방향 순서대로)
    const stops = G.stops.filter(() => Math.random() < 0.55).slice(0, 2).map(s => s[0]);
    stops.sort((a, b) => dir * (a - b));
    const W = cfg.size[0];
    const q = { id, hop, dir, y: standOnly ? G.stops[list.length % G.stops.length][1] : y, x: dir > 0 ? G.leftX : W + 60, stops, state: 'walk', until: 0, t0: t,
      speed: (() => { const r = ride ? ride.speed : hop ? G.hopSpeed : G.speed; return r[0] + Math.random() * (r[1] - r[0]); })(), ride };
    if (standOnly) {
      const s = G.stops[list.length % G.stops.length];
      Object.assign(q, { x: s[0], state: 'look', until: Infinity });
    }
    list.push(q);
  };

  const update = (t, dt, d, night, xmas) => {
    const want = target(d, night, xmas);
    if (RM) {
      while (list.length < Math.min(want, G.stops.length) && G.ids.some(ready))
        if (spawn(t, true) === undefined && list.length >= G.ids.filter(ready).length) break;
      while (list.length > want)
        list.pop();
      return;
    }
    if (list.length < want && t >= nextAt) {
      spawn(t, false);
      nextAt = t + G.gap[0] + Math.random() * (G.gap[1] - G.gap[0]);
    }
    const W = cfg.size[0];
    for (const q of list) {
      if (q.state === 'dance') {
        if (t >= q.until) {
          q.state = 'walk';
          q.t0 = t;
        }
        continue;
      }
      if (q.state === 'look') {
        if (t >= q.until)
          q.state = 'walk';
        continue;
      }
      const k = depthAt(q.y);
      const nx = q.x + q.dir * q.speed * k * dt;
      if (q.stops.length && (q.dir > 0 ? q.x < q.stops[0] && nx >= q.stops[0] : q.x > q.stops[0] && nx <= q.stops[0])) {
        q.stops.shift();
        q.state = 'look';
        q.until = t + G.look[0] + Math.random() * (G.look[1] - G.look[0]);
      }
      q.x = nx;
      q.gone = q.dir > 0 ? q.x > W + 80 : q.x < G.leftX;
    }
    for (let i = list.length - 1; i >= 0; i--)
      if (list[i].gone)
        list.splice(i, 1);
  };

  // 밤엔 그림을 어둡게 (광장 그림이 밤 그림으로 넘어가는 만큼). 한 장 그릴 때마다 작은 캔버스에 칠해서
  // lo ≤ y < hi 인 손님만 (오르골·강고양이 씨와 앞뒤를 맞추려고 나눠 그림). 빼면 모두
  const draw = (g, t, dark, lo = -Infinity, hi = Infinity) => {
    const chh = G.cell[1];
    for (const q of [...list].sort((a, b) => a.y - b.y)) {
      if (q.y < lo || q.y >= hi)
        continue;
      if (!ready(q.id))
        continue;
      const dancing = q.state === 'dance' && danceReady(q.id);
      const im = dancing ? dances[q.id] : imgs[q.id];
      const cw = dancing ? G.danceCell[0] : G.cell[0];
      const fi = dancing ? Math.floor((t - q.dt0) * G.danceFps) % 4 : q.state === 'look' || q.state === 'dance' ? 4
        : q.ride ? q.ride.seq[Math.floor((t - q.t0) * q.ride.fps) % q.ride.seq.length] // 보드: 밀기 ①② → 미끄러지기 ③④
          : Math.floor((t - q.t0) * (q.hop ? G.hopFps : G.fps)) % 4;
      const want = wantOf(q);
      const k = want / (im.visH || chh * 0.62), foot = im.footY || G.foot;
      const w = cw * k, h = chh * k;
      // 왼쪽은 붕어빵 노점 뒤에서 나타나고 그리로 사라진다(노점 앞을 지나가면 노점 안에 선 것처럼 보여서): leftX 근처에서 흐려짐
      const fade = clamp01((q.x - G.leftX) / G.leftFade);
      // 발밑 그림자
      g.globalAlpha = 0.18 * fade;
      g.fillStyle = '#1a1d2e';
      g.beginPath();
      g.ellipse(q.x, q.y, w * 0.28, w * 0.07, 0, 0, 7);
      g.fill();
      g.globalAlpha = 1;
      if (!tmp || tmp.width < cw)
        tmp = Object.assign(document.createElement('canvas'), { width: cw, height: chh });
      const tg = tmp.getContext('2d');
      tg.clearRect(0, 0, cw, chh);
      tg.globalCompositeOperation = 'source-over';
      tg.drawImage(im, fi * cw, 0, cw, chh, 0, 0, cw, chh);
      if (dark > 0.01) {
        tintAtop(tg, cw, chh, `rgba(16,22,52,${(dark * G.nightShade).toFixed(3)})`);
      }
      g.save();
      g.globalAlpha = fade;
      g.translate(q.x, q.y);
      if (q.dir < 0 && !dancing) // 춤 그림은 앞을 봄
        g.scale(-1, 1);
      g.drawImage(tmp, -w / 2, -foot * k, w, h);
      g.restore();
      g.globalAlpha = 1;
    }
  };
  // 누른 자리의 손님(앞쪽 먼저)이 잠깐 춤. 맞았으면 true
  const tapAt = (x, y, t) => {
    if (RM)
      return false;
    const hit = [...list].sort((a, b) => b.y - a.y).find(q => {
      const h = wantOf(q);
      return q.state !== 'dance' && ready(q.id) && Math.abs(x - q.x) < h * 0.4 + 8 && y > q.y - h - 8 && y < q.y + 12;
    });
    if (!hit)
      return false;
    dance(hit.id);
    Object.assign(hit, { state: 'dance', dt0: t, until: t + G.danceSec });
    return true;
  };
  // 트리를 누르면 그 둘레(x0~x1) 걷던 손님이 멈춰 올려다본다(⑤). 원래 멈출 곳은 그대로
  const lookUp = (x0, x1, t) => {
    for (const q of list)
      if (q.state === 'walk' && q.x > x0 && q.x < x1)
        Object.assign(q, { state: 'look', until: t + G.lookTap[0] + Math.random() * (G.lookTap[1] - G.lookTap[0]) });
  };
  return { update, draw, list, tapAt, lookUp };
}
