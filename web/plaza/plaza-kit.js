/* 광장 모듈 공용 도우미 (PLAZA_REFACTOR_PLAN.md R5)
   - depthOf(cfg): y → 깊이 배율(char.depth 두 지점 사이를 잇고 밖은 끝값). 손님·강고양이 씨·스케이터·시험 캐릭터가 같이 씀
   - frameMeta(): 방 프레임 표(../f/meta.json [폭, 높이, 기준점 x, y, (크기 보정)])를 한 번만 받아 나눠 씀
   - tintAtop(ctx, w, h, fill): 그려 둔 그림 위에만 색을 덮음(밤 그늘) — 작은 캔버스에 그린 뒤 부름 */
const clamp01 = v => Math.max(0, Math.min(1, v));

export const depthOf = cfg => y => {
  const [y0, y1] = cfg.char.depth.y, [k0, k1] = cfg.char.depth.scale, p = clamp01((y - y0) / (y1 - y0));
  return k0 + (k1 - k0) * p;
};

let metaP = null;
export const frameMeta = () => metaP || (metaP = fetch('../f/meta.json').then(r => r.json()).catch(() => ({})));

export const tintAtop = (ctx, w, h, fill) => {
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = op;
};
