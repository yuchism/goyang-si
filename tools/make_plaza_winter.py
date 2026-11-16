#!/usr/bin/env python3
"""사계절 광장 — 겨울 빈 광장 배경의 하늘을 투명하게 (PLAZA_SEASONS_PLAN.md 4장).

원본(주인이 ChatGPT로, 크리스마스 그림에서 소품을 지운 것 — 크기·자리 그대로 1561×989):
  낮 assets/plaza/winter-day-source-v1.png, 밤 assets/plaza/winter-night-source-v2.png(낮 그림을 밤으로 바꾼 것)
→ web/plaza/winter-day.webp · winter-night.webp

하늘은 단색이 아니라 위아래로 조금 변한다(낮: 위가 더 짙은 하늘색). 맨 위 FIT_Y줄까지의 줄별 중앙값으로 줄마다 하늘색을
직선으로 맞춰(아래로 늘려) 쓰고, 그 색과의 거리가 HI 미만인 픽셀 중 맨 윗줄에서 이어진 곳만 하늘로 본다(창문의 하늘색은
안 빠지게). 거리 LO 이하는 투명, LO~HI는 부드럽게 — 반투명 가장자리는 하늘색을 빼서 앞 색만 남긴다."""
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = {'day': 'assets/plaza/winter-day-source-v1.png', 'night': 'assets/plaza/winter-night-source-v2.png'}
FIT_Y, KEEP_Y = 280, 720
TH = {'day': (10, 42), 'night': (5, 16)}  # LO, HI — 밤 하늘은 거의 검정이라 외곽선(진한 갈색)이 먹히지 않게 좁게


def cut(path, out, LO, HI):
    im = np.array(Image.open(ROOT / path).convert('RGB')).astype(float)
    H, W, _ = im.shape
    ys = np.arange(FIT_Y)
    med = np.median(im[:FIT_Y], axis=1)  # 줄별 중앙값
    sky = np.zeros((H, 3))
    for c in range(3):
        k, b = np.polyfit(ys, med[:, c], 1)
        sky[:, c] = k * np.arange(H) + b
    d = np.sqrt(((im - sky[:, None, :]) ** 2).sum(2))
    cand = d < HI
    cand[KEEP_Y:] = False
    m = np.zeros_like(cand)
    m[0] = cand[0]
    while True:  # 맨 윗줄에서 이어진 후보만 (4-이웃으로 번지기)
        g = m.copy()
        g[1:] |= m[:-1]
        g[:-1] |= m[1:]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        g &= cand
        if (g == m).all():
            break
        m = g
    a = np.ones((H, W))
    a[m] = np.clip((d[m] - LO) / (HI - LO), 0, 1)
    rgb = im.copy()
    soft = m & (a > 0)
    s = sky[np.nonzero(soft)[0]]
    rgb[soft] = np.clip((im[soft] - (1 - a[soft, None]) * s) / a[soft, None], 0, 255)
    rgba = np.dstack([rgb, a * 255]).round().astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(ROOT / out, 'WEBP', quality=86, method=6, exact=False)
    print(out, f'투명 {(a == 0).mean():.1%}')


for n, p in SRC.items():
    cut(p, f'web/plaza/winter-{n}.webp', *TH[n])
