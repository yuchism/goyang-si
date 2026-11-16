/* 쥐야쥐가 눈사람 뒤에서 가끔 얼굴을 내밂 (회의 2026-11-16). 방 프레임 f/mouse_idle_1(엎드려 왼쪽을 봄)을 다시 씀
   - 눈사람 뒤 겹(peek.y < 눈사람 소품 y)에 그려서 몸은 눈사람에 가려지고, 코·얼굴만 옆으로 쏙 → 잠깐 두리번 → 쏙 들어감
   - 왼쪽·오른쪽 어느 쪽으로든(오른쪽은 뒤집기). every초 칸마다 chance. 눈사람이 있을 때만(plaza.js). 동작 줄이기: 없음. 미리보기 ?peek=1 */
const ease = p => p < 0 ? 0 : p > 1 ? 1 : p * p * (3 - 2 * p);
export function makePeek(cfg, { RM, dev }) {
  const P = cfg.peek, CH = cfg.char;
  const im = Object.assign(new Image(), { src: `../f/mouse_${P.frame}.webp` });
  let meta = null, cur = null, lastSlot = -1;
  fetch('../f/meta.json').then(r => r.json()).then(m => { meta = m['mouse_' + P.frame]; }).catch(() => { });
  const k = CH.roomPx * P.scale;
  const update = t => {
    if (RM)
      return;
    const every = dev ? P.devEvery : P.every, slot = Math.floor(t / every);
    if (!cur && slot !== lastSlot && t >= slot * every + (dev ? 1 : Math.random() * every * 0.5)) {
      lastSlot = slot;
      if (dev || Math.random() < P.chance)
        cur = { t0: t, side: Math.random() < 0.5 ? 0 : 1 };
    }
    if (cur && t - cur.t0 > P.outSec + P.holdSec + P.inSec)
      cur = null;
  };
  const draw = (g, t) => {
    if (!cur || !meta || !im.complete || !im.naturalWidth)
      return;
    const [fw, fh, ax, ay] = meta, e = t - cur.t0;
    const p = e < P.outSec ? ease(e / P.outSec) : e < P.outSec + P.holdSec ? 1 : 1 - ease((e - P.outSec - P.holdSec) / P.inSec);
    const [hid, out] = P.nose[cur.side], nose = hid + (out - hid) * p;
    const sniff = e > P.outSec && e < P.outSec + P.holdSec ? Math.sin(e * 9) * 1.2 : 0; // 코 킁킁
    const flip = cur.side === 1; // 오른쪽: 오른쪽을 봄
    g.save();
    g.translate(nose + (flip ? -1 : 1) * sniff, P.y);
    if (flip)
      g.scale(-k, k);
    else
      g.scale(k, k);
    g.drawImage(im, 0, -ay, fw, fh); // 그림 왼쪽 끝 = 코
    g.restore();
  };
  return { update, draw, y: P.layerY };
}
