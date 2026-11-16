#!/usr/bin/env python3
"""크리스마스 광장 붕어빵 노점 사장님 — 금붕생이 붕어빵 화로 로봇 시트 정리 (XMAS_PLAZA_PLAN.md 3-9).
원본 assets/plaza/fish-vendor-source-v1.png (주인이 ChatGPT로 그림, 가로 5칸: ① 가게 보기 ② 붕어빵 집기 ③ 들어 보이기 ④ 한숨 ⑤ 졸기)
→ web/plaza/fishvendor.webp (CELL×5). 칸마다 화로 몸통 왼쪽 끝(BODY_Y 줄의 가장 왼쪽 불투명 x)과 바퀴 바닥(WHEEL_Y)이
ANCHOR에 오게 맞춤 — 다섯 칸 몸통이 한자리, 움직이는 건 금붕생이·모자·팔뿐.
(v0: 팔 없는 첫 그림, 안 씀)"""
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/plaza/fish-vendor-source-v1.png'
OUT = ROOT / 'web/plaza/fishvendor.webp'
CELL = (460, 580)
ANCHOR = (20, 558)  # 칸 안 몸통 왼쪽 끝 x · 바퀴 바닥 y (scene.json vendor.anchor와 같게)
BODY_Y, WHEEL_Y = 520, 637

im = Image.open(SRC).convert('RGBA')
op = np.array(im)[..., 3] > 40
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
sheet = Image.new('RGBA', (CELL[0] * 5, CELL[1]), (0, 0, 0, 0))
for i, (x0, x1) in enumerate(segs):
    left = int(np.where(op[BODY_Y, x0:x1])[0].min()) + x0
    ys = np.where(op[:, x0:x1].any(1))[0]
    top, bot = int(ys.min()), int(ys.max())
    crop = im.crop((x0, top, x1, bot + 1))
    dx, dy = ANCHOR[0] - (left - x0), ANCHOR[1] - (WHEEL_Y - top)
    assert dx >= 0 and dy >= 0 and dx + crop.width <= CELL[0] and dy + crop.height <= CELL[1], (i, dx, dy, crop.size)
    sheet.alpha_composite(crop, (i * CELL[0] + dx, dy))
    print(f'칸 {i + 1}: 덩어리 {x0}~{x1}, 몸통 왼쪽 {left}, 놓기 ({dx}, {dy})')
sheet.save(OUT, 'WEBP', quality=88, method=6)
print(OUT.relative_to(ROOT), sheet.size, OUT.stat().st_size // 1024, 'KB')
