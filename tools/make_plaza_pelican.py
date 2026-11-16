#!/usr/bin/env python3
"""크리스마스 광장 펠리컨 오르골 시트 정리 (XMAS_PLAZA_PLAN.md 3-2).
원본 assets/plaza/pelican-organ-source-v2.png (주인이 ChatGPT로 그림, 가로 5칸: ①~④ 손잡이 돌리기 · ⑤ 졸기)
→ web/plaza/pelican.webp (CELL×5, 칸마다 오르골 받침대 오른쪽 다리 바닥이 ANCHOR에 오게 맞춤 — 다섯 칸 받침대가 한자리)
칸 나누기: 투명한 세로 줄로 덩어리 다섯 개. 맞춤점: 덩어리의 y=LEG_Y 줄에서 가장 오른쪽 불투명 x(받침대 오른쪽 다리)."""
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/plaza/pelican-organ-source-v2.png'
OUT = ROOT / 'web/plaza/pelican.webp'
CELL = (500, 500)
ANCHOR = (430, 490)  # 칸 안 받침대 오른쪽 다리 바닥 (scene.json music.pelican.anchor와 같게)
LEG_Y = 600

im = Image.open(SRC).convert('RGBA')
a = np.array(im)
op = a[..., 3] > 40
cols = op.any(0)
segs, s = [], None
for x, c in enumerate(cols):
    if c and s is None:
        s = x
    if not c and s is not None:
        if x - s > 50:
            segs.append((s, x))
        s = None
if s is not None:
    segs.append((s, len(cols)))
assert len(segs) == 5, segs
bot = int(np.where(op.any(1))[0].max())
sheet = Image.new('RGBA', (CELL[0] * 5, CELL[1]), (0, 0, 0, 0))
for i, (x0, x1) in enumerate(segs):
    leg = int(np.where(op[LEG_Y, x0:x1])[0].max()) + x0
    ys = np.where(op[:, x0:x1].any(1))[0]
    crop = im.crop((x0, int(ys.min()), x1, int(ys.max()) + 1))
    dx = ANCHOR[0] - (leg - x0)
    dy = ANCHOR[1] - (int(ys.max()) - int(ys.min()))
    assert dx >= 0 and dx + crop.width <= CELL[0] and dy >= 0, (i, dx, dy, crop.size)
    sheet.alpha_composite(crop, (i * CELL[0] + dx, dy))
    print(f'칸 {i + 1}: 덩어리 {x0}~{x1}, 다리 x {leg}, 놓기 ({dx}, {dy})')
sheet.save(OUT, 'WEBP', quality=88, method=6)
print(OUT.relative_to(ROOT), sheet.size, OUT.stat().st_size // 1024, 'KB')
