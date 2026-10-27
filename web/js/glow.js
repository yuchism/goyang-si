/* 노란 불빛 마스크: 그림에서 밝은 노랑·연주황 픽셀(뚫린 눈·입, 창 등)만 골라 촛불빛 노랑으로 칠한 캔버스.
   어둠을 덮은 뒤 이걸 덧그리면 안에서 불이 비치는 것처럼 보인다 (HALLOWEEN_FIX_PLAN.md 2-1 호박, HOURLY_CHIME_PLAN.md 할로윈 자정 손님).
   그림마다 한 번만 만든다. 픽셀을 못 읽으면(file:// 등) false — 부르는 쪽은 빛 없이 그린다. 다른 모듈을 불러오지 않는다 */
const cache = new WeakMap();
export function glowMask(im) {
  if (cache.has(im))
    return cache.get(im);
  let out = false;
  try {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const on = p[i] > 220 && p[i + 1] > 150 && p[i + 2] < 150 && p[i + 3] > 200;
      p[i] = 255; p[i + 1] = 228; p[i + 2] = 105; p[i + 3] = on ? 255 : 0;
    }
    x.putImageData(d, 0, 0);
    out = c;
  }
  catch (e) {
    out = false;
  }
  cache.set(im, out);
  return out;
}
