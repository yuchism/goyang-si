#!/usr/bin/env python3
"""광장 전구 줄 소품(web/plaza/props/lights-day·night.webp)의 끊긴 곳 잇기 (2026-11-16).
전구 줄은 크리스마스 그림에서 차이로 떼어 냈는데(tools/make_plaza_props.py), 그때 트리에 가려 있던 부분은 비어 있다.
트리를 새로 받아 모양이 바뀌면서 빈 곳이 보이게 돼, 줄 4가닥(왼쪽 위·아래, 오른쪽 위·아래)을 보이는 픽셀로 2차 곡선을 맞춰
트리 가운데(TOP_X)까지 같은 색·굵기로 이어 그린다(트리 뒤 겹이라 나머지는 트리가 가림). make_plaza_props.py 다음에 돌린다."""
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
AT_Y = 65          # 전구 줄 소품 자리 y (scene.json props lights.at)
TOP_X = 780        # 트리 가운데(꼭대기 별 x)
SPLIT = (470, 1070)  # 이 x 바깥에서만 맞춤 (안쪽은 원래 트리에 가렸던 곳)
OUTER = {'day': (20, 18, 26, 255), 'night': (20, 18, 26, 255)}  # 밤 그림의 줄도 같은 색
INNER = {'day': (160, 148, 155, 255), 'night': (160, 148, 155, 255)}
BLEND = 30  # 맞춘 곳 바깥쪽으로 이만큼 들어와서부터 새로 그림


def runs(col):
    ys = np.nonzero(col)[0]
    out, s, p = [], None, None
    for y in ys:
        if s is None:
            s = p = y
        elif y == p + 1:
            p = y
        else:
            out.append((s + p) / 2)
            s = p = y
    if s is not None:
        out.append((s + p) / 2)
    return out


day = np.array(Image.open(ROOT / 'web/plaza/props/lights-day.webp').convert('RGBA'))
op = day[..., 3] > 100
H, W = op.shape
wires = {'L0': [], 'L1': [], 'R0': [], 'R1': []}
for x in range(W):
    rs = runs(op[:, x])
    if len(rs) != 2:
        continue
    side = 'L' if x < SPLIT[0] else 'R' if x > SPLIT[1] else None
    if side:
        wires[side + '0'].append((x, rs[0]))
        wires[side + '1'].append((x, rs[1]))
fits = {k: np.polyfit([p[0] for p in v], [p[1] for p in v], 2) for k, v in wires.items()}
for name in ('day', 'night'):
    path = ROOT / f'web/plaza/props/lights-{name}.webp'
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    # 줄 = 진한 외곽(OUTER) 안에 밝은 속(INNER) — 원래 그림과 같은 모양
    a[:, SPLIT[0] - BLEND:SPLIT[1] + BLEND, 3] = 0  # 트리 근처 남은 조각은 지우고 새로(조각과 겹쳐 점선처럼 보여서)
    lay = Image.fromarray(a, 'RGBA')
    d = ImageDraw.Draw(lay)
    for k, f in fits.items():
        xs = range(SPLIT[0] - BLEND - 2, TOP_X + 1) if k[0] == 'L' else range(TOP_X, SPLIT[1] + BLEND + 3)
        pts = [(x, float(np.polyval(f, x))) for x in xs]
        pts = [(x, y) for x, y in pts if 0 <= y < H]
        d.line(pts, fill=OUTER[name], width=6, joint='curve')
        d.line(pts, fill=INNER[name], width=2, joint='curve')
    a = np.array(lay)
    Image.fromarray(a, 'RGBA').save(path, 'WEBP', lossless=True, method=6)
    print(path.name)
for k, f in fits.items():
    print(k, '트리 가운데에서 y', round(float(np.polyval(f, TOP_X)) + AT_Y))
