#!/usr/bin/env python3
"""크리스마스 광장 스케이트 손님 시트 정리 (XMAS_PLAZA_PLAN.md 3-10).
원본 assets/plaza/guests/<id>-skate-source-v1.png (주인이 ChatGPT로 그림, 가로 5칸: ① 밀기 왼발 ② 밀기 오른발 ③ 미끄러지기 ④ 빙글 ⑤ 엉덩방아,
오른쪽을 봄) → web/plaza/guests/<id>-skate.webp (CELL×5). 칸마다 그림 덩어리의 바닥(스케이트 날)을 FOOT에, 가로 가운데를 칸 가운데에.
③(미끄러지기) 그림 키를 출력 — scene.json skate.visH로 옮겨 적는다."""
from pathlib import Path
from PIL import Image
import numpy as np
from collections import deque


def components(mask):
    """4-이웃 연결 성분 [(크기, [(y, x), ...])] (scipy 없이)"""
    seen = np.zeros_like(mask, bool)
    H, W = mask.shape
    out = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        q, pts = deque([(y0, x0)]), []
        seen[y0, x0] = True
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True
                    q.append((yy, xx))
        out.append((len(pts), pts))
    return out

ROOT = Path(__file__).resolve().parent.parent
IDS = ['beaver', 'platypus']
CELL = (520, 600)
FOOT = 590

for gid in IDS:
    src = ROOT / f'assets/plaza/guests/{gid}-skate-source-v1.png'
    im = Image.open(src).convert('RGBA')
    op = np.array(im)[..., 3] > 40
    # 칸 나누기: 다섯 등분 경계 근처(±90px)에서 불투명 픽셀이 가장 적은 세로줄로 자름 (목도리·꼬리가 이웃 칸에 닿아도)
    colsum = op.sum(0)
    W = op.shape[1]
    cuts = [0]
    for kk in range(1, 5):
        c0 = int(W * kk / 5)
        lo, hi = c0 - 90, c0 + 90
        cuts.append(lo + int(np.argmin(colsum[lo:hi])))
    cuts.append(W)
    segs = []
    for a0, a1 in zip(cuts, cuts[1:]):
        xs = np.where(colsum[a0:a1] > 0)[0]
        segs.append((a0 + int(xs.min()), a0 + int(xs.max()) + 1))
    assert len(segs) == 5, (gid, segs)
    sheet = Image.new('RGBA', (CELL[0] * 5, CELL[1]), (0, 0, 0, 0))
    hs = []
    for i, (x0, x1) in enumerate(segs):
        # 이웃 칸에서 넘어온 조각 빼기: 덩어리(연결 성분) 중 큰 것(가장 큰 것의 3% 이상)만
        sub = op[:, x0:x1]
        comps = components(sub)
        big = max(c[0] for c in comps)
        keep = np.zeros_like(sub)
        for n_, pts in comps:
            if n_ >= big * 0.03:
                ys_, xs_ = zip(*pts)
                keep[list(ys_), list(xs_)] = True
        part = np.array(im)[:, x0:x1].copy()
        part[..., 3] = np.where(keep, part[..., 3], 0)
        ys = np.where(keep.any(1))[0]
        xs = np.where(keep.any(0))[0]
        top, bot = int(ys.min()), int(ys.max())
        crop = Image.fromarray(part, 'RGBA').crop((int(xs.min()), top, int(xs.max()) + 1, bot + 1))
        dx, dy = (CELL[0] - crop.width) // 2, FOOT - crop.height
        assert dx >= 0 and dy >= 0, (gid, i, crop.size)
        sheet.alpha_composite(crop, (i * CELL[0] + dx, dy))
        hs.append(crop.height)
    out = ROOT / f'web/plaza/guests/{gid}-skate.webp'
    sheet.save(out, 'WEBP', quality=88, method=6)
    print(gid, '칸 키', hs, '→', out.relative_to(ROOT), out.stat().st_size // 1024, 'KB')
