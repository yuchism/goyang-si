#!/usr/bin/env python3
"""사계절 광장 — 지금 크리스마스 광장 그림에서 소품을 떼어 낸다 (PLAZA_SEASONS_PLAN.md 4장).

크리스마스 그림(web/plaza/xmas-day·night.webp)과 겨울 빈 광장(web/plaza/winter-day·night.webp — tools/make_plaza_winter.py)의
차이로 소품 모양(마스크)을 낮 그림에서 잡고, 같은 마스크로 낮·밤 크리스마스 그림을 잘라 web/plaza/props/<id>-day·night.webp로.
(밤 크리스마스 그림은 낮과 구도가 같다 — 낮을 밤에서 만들었음)

소품마다 상자(BOX)를 주고 그 안에서만 찾는다(빈 광장은 ChatGPT가 다시 그린 것이라 집 외곽선이 1~2px씩 달라 상자 밖은 잡음).
상자 안: 차이(RGB 합 > DIFF) 또는 빈 광장에선 하늘인 곳 → 가는 잡음 걷기(열기 r=OPEN) → 막힌 구멍 메우기(HOLE — 기본 다 메움)
(통짜 물건은 막힌 구멍 다 메움, 회전목마만 작은 것만) → 테두리 한 칸 넓힘. 상자가 겹치면 ORDER 앞의 소품이 먼저 가져간다(앞에 있는 것 먼저).
출력: 소품마다 잘라낸 그림(상자 크기) + scene.json에 옮길 자리 [x, y] 목록."""
from pathlib import Path
from PIL import Image
import numpy as np
import json

ROOT = Path(__file__).resolve().parent.parent
DIFF, OPEN = 90, 2
HOLE = {}  # 구멍 메우기 한도(소품별, 없으면 다 메움). 회전목마도 다 메움(2026-11-16: 작은 구멍만 메웠더니 색이 비슷한 곳이 빠져 누덕누덕 — 기둥 사이는 원래 그림의 뒤 건물이 그대로 보임)
# id: (x0, y0, x1, y1) — 광장 그림 px
BOX = {
    'stall': (196, 755, 516, 989),
    'gifts-left': (505, 705, 705, 856),
    'gift-right': (872, 760, 992, 852),
    'snowman': (1350, 725, 1512, 989),
    'rink': (995, 760, 1385, 925),
    'carousel': (40, 400, 448, 805),
    'tree': (470, 20, 1070, 856),
    'lights': (0, 60, 1561, 330),
}
# 상자 안에서 더 좁히는 다각형(광장 px) — 노점 지붕이 회전목마 받침과 겹치는 곳: 노점 것은 지붕선 아래만
POLY = {'stall': [(238, 755), (472, 755), (522, 806), (522, 989), (196, 989), (196, 810)]}
# 소품별 차이 문턱 — 회전목마 크림색 처마가 뒤 집 벽 색과 비슷해서 기본(DIFF)으로는 테두리가 빠짐
DIFF_OF = {'carousel': 40}
ORDER = ['stall', 'gifts-left', 'gift-right', 'snowman', 'rink', 'carousel', 'tree', 'lights']


def shift_or(m, r):
    g = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx or dy:
                g |= np.roll(np.roll(m, dy, 0), dx, 1)
    return g


def shift_and(m, r):
    g = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx or dy:
                g &= np.roll(np.roll(m, dy, 0), dx, 1)
    return g


def fill_small_holes(m, hole):
    """상자 테두리에서 이어지지 않은 빈 곳 중 hole px 미만만 메움"""
    H, W = m.shape
    out = m.copy()
    seen = m.copy()
    from collections import deque
    for y0 in range(H):
        for x0 in range(W):
            if seen[y0, x0]:
                continue
            q, pts, edge = deque([(y0, x0)]), [], False
            seen[y0, x0] = True
            while q:
                y, x = q.popleft()
                pts.append((y, x))
                if y in (0, H - 1) or x in (0, W - 1):
                    edge = True
                for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= yy < H and 0 <= xx < W and not seen[yy, xx]:
                        seen[yy, xx] = True
                        q.append((yy, xx))
            if not edge and len(pts) < hole:
                ys, xs = zip(*pts)
                out[list(ys), list(xs)] = True
    return out


xd = np.array(Image.open(ROOT / 'web/plaza/xmas-day.webp').convert('RGBA'))
xn = np.array(Image.open(ROOT / 'web/plaza/xmas-night.webp').convert('RGBA'))
wd = np.array(Image.open(ROOT / 'web/plaza/winter-day.webp').convert('RGBA'))
diff = np.abs(xd[..., :3].astype(int) - wd[..., :3].astype(int)).sum(2)
sky = wd[..., 3] < 128
opaque = xd[..., 3] > 40
taken = np.zeros(opaque.shape, bool)
(ROOT / 'web/plaza/props').mkdir(exist_ok=True)
places = {}
for pid in ORDER:
    x0, y0, x1, y1 = BOX[pid]
    dth = DIFF_OF.get(pid, DIFF)
    m = (opaque & (sky | (diff > dth)))[y0:y1, x0:x1].copy()
    if pid in POLY:
        from PIL import ImageDraw
        pm = Image.new('L', (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(pm).polygon([(px - x0, py - y0) for px, py in POLY[pid]], fill=255)
        poly = np.array(pm) > 0
        m &= poly
    if pid == 'lights':  # 전구 줄은 가늘어서 열기를 하면 끊김 — 빈 광장에서 하늘인 곳만(잡음 없음)
        m &= wd[y0:y1, x0:x1, 3] < 128
    else:
        m = shift_or(shift_and(m, OPEN), OPEN)  # 열기: 가는 집 외곽선 잡음 걷기
        m = fill_small_holes(m, HOLE.get(pid, 10 ** 9))
    m = shift_or(m, 1) & (xd[y0:y1, x0:x1, 3] > 0)
    if pid in POLY:
        m &= poly
    m &= ~taken[y0:y1, x0:x1]
    taken[y0:y1, x0:x1] |= m
    ys, xs = np.nonzero(m)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    for name, src in (('day', xd), ('night', xn)):
        c = src[y0:y1, x0:x1].copy()
        c[..., 3] = np.where(m, c[..., 3], 0)
        c = c[by0:by1, bx0:bx1]
        out = ROOT / f'web/plaza/props/{pid}-{name}.webp'
        if pid == 'lights':  # 가는 줄은 손실 압축하면 끊겨 보임
            Image.fromarray(c, 'RGBA').save(out, 'WEBP', lossless=True, method=6)
        else:
            Image.fromarray(c, 'RGBA').save(out, 'WEBP', quality=88, method=6, alpha_quality=100, exact=False)
    places[pid] = [int(x0 + bx0), int(y0 + by0), int(bx1 - bx0), int(by1 - by0)]
    print(f'{pid:11s} 자리 {places[pid][:2]} 크기 {places[pid][2:]}')
print(json.dumps(places))
