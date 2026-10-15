#!/usr/bin/env python3
"""건너편 아파트 밤 그림(web/r/apt_night.webp)에서 창 사각형을 찾아 web/r/apt_windows.json으로 저장한다. WINDOW_PLAN.md 6장.

- 앞쪽 건물 벽(베이지·회색: 빨강 ≥ 파랑)으로 둘러싸인 어두운 사각형 = 꺼진 창, 노란 사각형 = 켜진 창.
  뒤쪽의 흐린 보랏빛 건물 창은 찾지 않는다(그대로 그림의 것).
- 저장: { "size": [그림 폭, 높이], "windows": [[x, y, 폭, 높이, 원래 켜짐 0/1], ...], "lit": [r,g,b], "dark": [r,g,b] }
  lit·dark는 그림 속 켜진 창·꺼진 창의 대표색(중앙값). 코드(js/weather.js)가 창마다 켜짐·꺼짐을 이 색으로 덮어 그린다.

쓰는 법:  python3 tools/map_windows.py   (고양시 폴더에서)
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'r')
src = Image.open(os.path.join(R, 'apt_night.webp')).convert('RGB')
im = np.array(src).astype(int)
h, w, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]
lum = (r * 3 + g * 6 + b) / 10
lit = (r > 190) & (g > 140) & (b < 170) & (r - b > 50)
wall = (r >= b - 4) & (lum > 92) & ~lit
# 그림 아래 끝에 걸친 창도 구멍으로 메워지게 맨 아래에 벽 한 줄을 덧대고 찾는다
pad = np.vstack([wall | lit, np.ones((1, w), bool)])
bld = nd.binary_fill_holes(pad)[:h]
cand = nd.binary_opening((bld & ~wall) | lit, iterations=1)
lab, n = nd.label(cand)
wins = []
for i, sl in enumerate(nd.find_objects(lab)):
    ys, xs = sl
    hh, ww = ys.stop - ys.start, xs.stop - xs.start
    if not (8 <= ww <= 40 and 8 <= hh <= 40 and 0.5 < ww / hh < 2):
        continue
    region = lab[sl] == i + 1
    if region.mean() < 0.6:
        continue
    on = int(lit[sl][region].mean() > 0.4)
    wins.append([int(xs.start), int(ys.start), int(ww), int(hh), on])
wins.sort(key=lambda q: (q[0], q[1]))
med = lambda m: [int(v) for v in np.median(im[m], axis=0)]
offm = np.zeros((h, w), bool)
for x, y, ww, hh, on in wins:
    if not on:
        offm[y + 2:y + hh - 2, x + 2:x + ww - 2] = True
out = {'size': [w, h], 'lit': med(lit), 'dark': med(offm), 'windows': wins}
open(os.path.join(R, 'apt_windows.json'), 'w', encoding='utf-8').write(
    '{\n  "size": %s, "lit": %s, "dark": %s,\n  "windows": [\n%s\n  ]\n}\n' % (
        json.dumps(out['size']), json.dumps(out['lit']), json.dumps(out['dark']),
        ',\n'.join('    ' + json.dumps(q) for q in wins)))
print(f'창 {len(wins)}개 (원래 켜짐 {sum(q[4] for q in wins)}개), 켜진 색 {out["lit"]}, 꺼진 색 {out["dark"]}')
if '--show' in os.sys.argv:
    d = ImageDraw.Draw(src)
    for x, y, ww, hh, on in wins:
        d.rectangle([x, y, x + ww - 1, y + hh - 1], outline=(0, 255, 0) if on else (255, 0, 0))
    src.save('apt_windows_check.png')
    print('apt_windows_check.png 저장 (확인용)')
