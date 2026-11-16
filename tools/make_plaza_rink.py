#!/usr/bin/env python3
"""크리스마스 광장 스케이트장 앞 겹 (XMAS_PLAZA_PLAN.md 3-10).
배경 그림의 스케이트장 앞쪽 펜스(+ 오른쪽 눈사람)만 잘라 web/plaza/rink-front-day.webp · rink-front-night.webp로.
스케이트 타는 손님을 그 뒤에 그리고 이 겹을 위에 얹으면 펜스 너머로 보인다.
고르기는 낮 그림 색으로(펜스 갈색·외곽선 진한 색·눈사람 흰색·빨강) 하고, 같은 자리 픽셀을 밤 그림에서도 똑같이 자른다(밤 그림은 낮과 구도가 같음).
자르는 곳: BOX 안에서 — 앞 펜스 띠(y ≥ FRONT_Y), 왼쪽 끝 기둥(x < LEFT_X, y ≥ LEFT_Y), 눈사람(x ≥ SNOW_X). 바닥(회색 돌)·얼음(하늘색)은 빼고."""
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
BOX = (995, 780, 1520, 989)  # x0, y0, x1, y1
FRONT_Y, LEFT_X, LEFT_Y, SNOW_X = 846, 1050, 792, 1368

day = np.array(Image.open(ROOT / 'web/plaza/xmas-day.webp').convert('RGBA')).astype(int)
night = np.array(Image.open(ROOT / 'web/plaza/xmas-night.webp').convert('RGBA'))
x0, y0, x1, y1 = BOX
d = day[y0:y1, x0:x1]
r, g, b, a = d[..., 0], d[..., 1], d[..., 2], d[..., 3]
mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
sat = mx - mn
brown = (r > g) & (g > b) & (r - b > 45)
dark = mx < 90
red = (r > 170) & (g < 110) & (b < 110)
white = mn > 228
ice = (b > r + 18) & (mx > 170)
ground = (sat < 30) & (mx >= 90) & (mx <= 228)
yy, xx = np.mgrid[y0:y1, x0:x1]
zone = (yy >= FRONT_Y) | ((xx < LEFT_X) & (yy >= LEFT_Y))
snow = xx >= SNOW_X
keep = (a > 40) & ~ice & ~ground & ((zone & (brown | dark)) | (snow & (brown | dark | red | white)))
# 외곽선이 끊기지 않게 한 칸 넓힘
k = keep.copy()
k[1:] |= keep[:-1]; k[:-1] |= keep[1:]; k[:, 1:] |= keep[:, :-1]; k[:, :-1] |= keep[:, 1:]
k &= ~ice | (keep)
for name, arr in (('day', day.astype(np.uint8)), ('night', night)):
    c = arr[y0:y1, x0:x1].copy()
    c[..., 3] = np.where(k, c[..., 3], 0)
    out = ROOT / f'web/plaza/rink-front-{name}.webp'
    Image.fromarray(c, 'RGBA').save(out, 'WEBP', quality=90, method=6)
    print(out.relative_to(ROOT), c.shape[1], 'x', c.shape[0], out.stat().st_size // 1024, 'KB')
print('at', [x0, y0])
