/* 스케이트장 — 비버·오리너구리 (XMAS_PLAZA_PLAN.md 3-10)
   - 그림: web/plaza/guests/<id>-skate.webp (5칸: ① 밀기 왼발 ② 밀기 오른발 ③ 미끄러지기 ④ 빙글 ⑤ 엉덩방아, 오른쪽을 봄 · tools/make_plaza_skate.py)
   - 길: 얼음 위 타원(center, r). 화면에서 시계 반대로 돈다 — 앞쪽(아래)은 오른쪽으로, 뒤쪽(위)은 왼쪽으로(뒤집기)
   - 밀기·밀기·밀기·미끄러지기를 되풀이, 가끔 빙글(제자리에서 좌우 뒤집기), 아주 가끔 엉덩방아(미끄러지다 멈춤 → 일어남)
   - 앞 펜스·눈사람은 그림에서 잘라 둔 겹(rink-front-day/night.webp, tools/make_plaza_rink.py)을 위에 얹어 펜스 너머로 보이게
   - 언제: hours 사이에, slot초 칸마다 손님별 chance로(드나들 땐 스르륵). 12/24·25 밤엔 둘 다. 동작 줄이기: ③ 제자리. 미리보기 ?skate=1 */
const clamp01 = v => Math.max(0, Math.min(1, v));

export function makeRink(cfg, { rnd, RM, depthAt, hourOf, dev }) {
  const S = cfg.skate, CH = cfg.char, catPx = CH.roomPx * CH.charScale * cfg.guests.catH;
  const [cw, chh] = S.cell, [cx, cy] = S.center, [rx, ry] = S.r;
  const sheets = {}, front = {};
  for (const id of S.ids)
    sheets[id] = Object.assign(new Image(), { src: `guests/${id}-skate.webp?v=${cfg.v}` });
  for (const n of ['day', 'night'])
    front[n] = Object.assign(new Image(), { src: `rink-front-${n}.webp?v=${cfg.v}` });
  const ok = im => im.complete && im.naturalWidth > 0;
  const sk = S.ids.map((id, i) => ({ id, th: Math.PI / 2 + i * Math.PI * 0.9, w: S.speed[0] + (S.speed[1] - S.speed[0]) * (i ? 0.25 : 0.8), ph: i * 0.9, act: null, nextAct: 6 + i * 5 + Math.random() * S.actEvery, vis: 0, on: false }));
  const update = (t, dt, d, xmasNight) => {
    const hr = hourOf(d), slot = Math.floor(d.getTime() / 1000 / S.slot);
    for (const [i, s] of sk.entries()) {
      s.on = dev || (xmasNight && (hr >= 17 || hr < 1)) || (hr >= S.hours[0] && hr < S.hours[1] && rnd('skate' + s.id, slot) < S.chance);
      s.vis = clamp01(s.vis + (s.on ? dt : -dt) / S.fade);
      if (RM)
        continue;
      if (s.act && t >= s.act.until)
        s.act = null;
      if (!s.act && t >= s.nextAct) {
        s.nextAct = t + S.actEvery * (0.6 + Math.random() * 0.8);
        const r = Math.random();
        if (r < S.fallChance)
          s.act = { kind: 'fall', until: t + S.fallSec, t0: t };
        else if (r < S.fallChance + S.spinChance)
          s.act = { kind: 'spin', until: t + S.spinSec, t0: t };
      }
      let w = s.w;
      if (s.act && s.act.kind === 'spin')
        w = 0;
      else if (s.act && s.act.kind === 'fall')
        w *= Math.max(0, 1 - (t - s.act.t0) / 0.6); // 미끄러지다 멈춤
      s.th -= w * dt; // 화면에서 시계 반대
    }
  };
  const drawSkater = (g, t, s) => {
    const im = sheets[s.id];
    if (!ok(im) || s.vis <= 0.01)
      return;
    const x = cx + rx * Math.cos(s.th), y = cy + ry * Math.sin(s.th);
    const goingRight = Math.sin(s.th) > 0; // 앞쪽(아래 반)은 오른쪽으로
    let fi, flip = !goingRight;
    if (RM)
      fi = 2;
    else if (s.act && s.act.kind === 'fall')
      fi = 4;
    else if (s.act && s.act.kind === 'spin') {
      fi = 3;
      flip = Math.cos((t - s.act.t0) * S.spinRate) < 0;
    }
    else {
      const p = ((t + s.ph) % S.cycle) / S.cycle; // 밀기 셋 → 미끄러지기
      fi = p < 0.5 ? Math.floor(p / 0.5 * 3) % 2 : 2;
    }
    const want = catPx * (S.tplH[s.id] || 420) / 560 * depthAt(y), k = want / (S.visH[s.id] || chh * 0.9);
    const w = cw * k, h = chh * k;
    g.save();
    g.globalAlpha = s.vis * 0.16;
    g.fillStyle = '#1a3050';
    g.beginPath();
    g.ellipse(x, y, w * 0.22, w * 0.05, 0, 0, 7);
    g.fill();
    g.globalAlpha = s.vis;
    g.translate(x, y);
    if (flip)
      g.scale(-1, 1);
    g.drawImage(im, fi * cw, 0, cw, chh, -w / 2, -S.foot * k, w, h);
    g.restore();
  };
  // 스케이트 손님(안쪽부터) → 앞 펜스 겹(낮 위에 밤을 mix만큼)
  const draw = (g, t, mix) => {
    for (const s of [...sk].sort((a, b) => Math.sin(a.th) - Math.sin(b.th)))
      drawSkater(g, t, s);
    const [fx, fy] = S.front;
    if (sk.some(s => s.vis > 0.01)) { // 아무도 없으면 배경 그림 그대로
      if (ok(front.day))
        g.drawImage(front.day, fx, fy);
      if (mix > 0.01 && ok(front.night)) {
        g.save();
        g.globalAlpha = Math.min(1, mix);
        g.drawImage(front.night, fx, fy);
        g.restore();
      }
    }
  };
  return { update, draw, y: S.layerY };
}
