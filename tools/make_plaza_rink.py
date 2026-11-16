#!/usr/bin/env python3
"""크리스마스 광장 스케이트장 앞 펜스 겹 (XMAS_PLAZA_PLAN.md 3-10).
스케이트장 소품(주인이 ChatGPT로 다시 그린 것, assets/plaza/props/rink-day·night-source-v1.png — tools/plaza_props.json rink 상자 자리)에서
앞쪽 펜스만 잘라 web/plaza/rink-front-day·night.webp로. 스케이트 타는 손님을 스케이트장 위에 그린 뒤 이 겹을 얹으면 펜스 너머로 보인다.
앞쪽 = 열마다 얼음(하늘색)의 위·아래 끝 가운데보다 아래에 있는 얼음 아닌 불투명 픽셀(펜스). 얼음이 없는 열(양끝 기둥)은 FRONT_END_Y 아래.
(2026-11-16 전: 옛 크리스마스 그림에서 펜스를 색으로 골라 잘랐음)"""
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
import json
REF = tuple(json.loads((ROOT / 'tools/plaza_props.json').read_text())['props']['rink']['box'][:2])  # 참고 상자 한 곳(R3)
FRONT_END_Y = 95  # 얼음 없는 열에서 이 y(그림 px) 아래를 앞으로

for name in ('day', 'night'):
    a = np.array(Image.open(ROOT / f'assets/plaza/props/rink-{name}-source-v1.png').convert('RGBA'))
    a[..., 3] = np.where(a[..., 3] < 12, 0, a[..., 3])
    r, g, b, al = [a[..., i].astype(int) for i in range(4)]
    ice = (al > 200) & (b > r + 15) & (b > 120)
    H, W = al.shape
    keep = np.zeros((H, W), bool)
    for x in range(W):
        ys = np.nonzero(ice[:, x])[0]
        mid = (ys.min() + ys.max()) / 2 if len(ys) > 3 else FRONT_END_Y
        col = (al[:, x] > 0) & ~ice[:, x]
        col[:int(mid) + 1] = False
        keep[:, x] = col
    out = a.copy()
    out[..., 3] = np.where(keep, a[..., 3], 0)
    path = ROOT / f'web/plaza/rink-front-{name}.webp'
    Image.fromarray(out, 'RGBA').save(path, 'WEBP', quality=90, method=6, alpha_quality=100, exact=False)
    print(path.name, W, 'x', H)
print('at', list(REF))
