/* 쥐야쥐가 눈사람 뒤에서 가끔 얼굴을 내밂 (회의 2026-11-16). 방 프레임 f/mouse_idle_1(엎드려 왼쪽을 봄)을 다시 씀
   - 눈사람 뒤 겹(peek.y < 눈사람 소품 y)에 그려서 몸은 눈사람에 가려지고, 코·얼굴만 옆으로 쏙 → 킁킁 → 살짝 나와 앉아 있다가(f/mouse_watch_1) → 쏙 숨음
   - 왼쪽·오른쪽 어느 쪽으로든(오른쪽은 뒤집기). every초 칸마다 chance. 눈사람이 있을 때만(plaza.js). 동작 줄이기: 없음. 미리보기 ?peek=1 */
const ease = p => p < 0 ? 0 : p > 1 ? 1 : p * p * (3 - 2 * p);
export function makePeek(cfg, { RM, dev }) {
  const P = cfg.peek, CH = cfg.char;
  const load = f => Object.assign(new Image(), { src: `../f/mouse_${f}.webp` });
  const ims = { peek: load(P.frame), sit: load(P.sitFrame) };
  let meta = null, cur = null, lastSlot = -1;
  fetch('../f/meta.json').then(r => r.json()).then(m => { meta = { peek: m['mouse_' + P.frame], sit: m['mouse_' + P.sitFrame] }; }).catch(() => { });
  const k = CH.roomPx * P.scale, total = P.outSec + P.lookSec + P.sitSec + P.inSec;
  const update = t => {
    if (RM)
      return;
    const every = dev ? P.devEvery : P.every, slot = Math.floor(t / every);
    if (!cur && slot !== lastSlot && t >= slot * every + (dev ? 1 : Math.random() * every * 0.5)) {
      lastSlot = slot;
      if (dev || Math.random() < P.chance)
        cur = { t0: t, side: Math.random() < 0.5 ? 0 : 1 };
    }
    if (cur && t - cur.t0 > total)
      cur = null;
  };
  // 흐름: 빼꼼(엎드려 코만 쏙 → 킁킁) → 살짝 나와 앉아 두리번 → 엎드려 쏙 숨음
  const draw = (g, t) => {
    if (!cur || !meta || !meta.peek || !meta.sit)
      return;
    const e = t - cur.t0, flip = cur.side === 1, [hid, out] = P.nose[cur.side];
    let kind = 'peek', nose = hid, sniff = 0;
    if (e < P.outSec)
      nose = hid + (out - hid) * ease(e / P.outSec);
    else if (e < P.outSec + P.lookSec) {
      nose = out;
      sniff = Math.sin(e * 9) * 1.2;
    }
    else if (e < P.outSec + P.lookSec + P.sitSec)
      kind = 'sit';
    else
      nose = out + (hid - out) * ease((e - P.outSec - P.lookSec - P.sitSec) / P.inSec);
    const im = ims[kind];
    if (!im.complete || !im.naturalWidth)
      return;
    const [fw, fh, ax, ay] = meta[kind];
    g.save();
    if (kind === 'sit') {
      const sx = P.sitX[cur.side], bob = Math.sin(e * 2.2) * 0.8; // 숨 쉬듯
      g.translate(sx, P.y + bob);
      g.scale(flip ? -k : k, k);
      g.drawImage(im, -ax, -ay, fw, fh);
    }
    else {
      g.translate(nose + (flip ? -1 : 1) * sniff, P.y);
      g.scale(flip ? -k : k, k);
      g.drawImage(im, 0, -ay, fw, fh); // 그림 왼쪽 끝 = 코
    }
    g.restore();
  };
  return { update, draw, y: P.layerY };
}
