#!/usr/bin/env python3
"""광장 전구 줄 소품(web/plaza/props/lights-day·night.webp)을 전구 자리에서 새로 그린다 (2026-11-16).
그림에서 떼어 낸 줄은 트리에 가렸던 곳이 비고, 이어 그려도 전구 불빛(scene.json strings.paths — 코드가 그 길 위에 전구를 찍음)과
조금씩 어긋나 보였다. 그래서 줄을 그 길 자체로 그린다: 길 점들을 부드럽게(Catmull-Rom) 이어 진한 외곽 + 밝은 속선, 원래 그림의 줄 모양.
트리 뒤 겹이라 트리에 닿는 끝은 트리가 가린다. 그림 자리는 scene.json props lights.at(왼쪽 위)."""
from pathlib import Path
from PIL import Image, ImageDraw
import json

ROOT = Path(__file__).resolve().parent.parent
cfg = json.loads((ROOT / 'web/plaza/scene.json').read_text())
paths = cfg['strings']['paths']
lights = next(p for p in cfg['props']['list'] if p['id'] == 'lights')
W = cfg['size'][0]
ax, ay = lights['at']
SS = 3  # 3배로 그려 줄여서 가장자리를 부드럽게
OUTER, INNER = (20, 18, 26, 255), (160, 148, 155, 255)
OW, IW = 6, 2


def smooth(pts, n=8):
    out = []
    P = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in range(2)))
    out.append(tuple(pts[-1]))
    return out


ys = [y for p in paths for _, y in p]
H = int(max(ys) - ay + 20)
im = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
lines = [[((x - ax) * SS, (y - ay) * SS) for x, y in smooth(p)] for p in paths]
for ln in lines:
    d.line(ln, fill=OUTER, width=OW * SS, joint='curve')
for ln in lines:
    d.line(ln, fill=INNER, width=IW * SS, joint='curve')
im = im.resize((W, H), Image.LANCZOS)
for n in ('day', 'night'):  # 밤 그림의 줄도 같은 색
    im.save(ROOT / f'web/plaza/props/lights-{n}.webp', 'WEBP', lossless=True, method=6)
print('lights', im.size, '자리', [ax, ay], '줄', len(paths))
