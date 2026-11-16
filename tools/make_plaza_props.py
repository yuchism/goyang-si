#!/usr/bin/env python3
"""광장 소품 그림 정리 (PLAZA_PLAN.md 4장, PLAZA_REFACTOR_PLAN.md R2).
주인이 ChatGPT로 다시 그린 소품(assets/plaza/props/<id>-day·night-source-v1.png, 참고 그림과 같은 크기 — 배경 투명)을
보이는 곳만 남게 잘라 web/plaza/props/<id>-day·night.webp로, 자리(왼쪽 위)를 scene.json props.list의 at에 적는다.
참고 상자·바로잡기는 tools/plaza_props.json 한 곳. 전구 줄(lights)은 tools/make_plaza_wires.py가 전구 길에서 그린다.
(2026-11-16 전: 크리스마스 그림과 빈 광장 그림의 차이로 떼어 냈음 — 색이 비슷한 곳이 빠지고 이웃 물건 조각이 붙어 다시 받기로 바꿈)
쓰는 법: python3 tools/make_plaza_props.py [id ...]   (id를 빼면 전부)"""
from pathlib import Path
from PIL import Image
import numpy as np
import json
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
SPEC = json.loads((ROOT / 'tools/plaza_props.json').read_text())['props']
SCENE = ROOT / 'web/plaza/scene.json'
ids = sys.argv[1:] or list(SPEC)
scene = SCENE.read_text()
for pid in ids:
    sp = SPEC[pid]
    x0, y0 = sp['box'][:2]
    dx, dy = sp.get('shift', [0, 0])
    ims = {}
    for n in ('day', 'night'):
        a = np.array(Image.open(ROOT / f'assets/plaza/props/{pid}-{n}-source-v1.png').convert('RGBA'))
        a[..., 3] = np.where(a[..., 3] < 12, 0, a[..., 3])  # 가장자리 잔여 지움
        ims[n] = a
    m = (ims['day'][..., 3] > 0) | (ims['night'][..., 3] > 0)
    ys, xs = np.nonzero(m)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    for n, a in ims.items():
        Image.fromarray(a[by0:by1, bx0:bx1], 'RGBA').save(ROOT / f'web/plaza/props/{pid}-{n}.webp', 'WEBP',
                                                          quality=88, method=6, alpha_quality=100, exact=False)
    at = [int(x0 + dx + bx0), int(y0 + dy + by0)]
    scene, k = re.subn(r'(\{ "id": "%s", "at": )\[\d+, \d+\]' % re.escape(pid), r'\g<1>[%d, %d]' % tuple(at), scene)
    assert k == 1, pid
    print(f'{pid:11s} 자리 {at} 크기 {[int(bx1 - bx0), int(by1 - by0)]}')
SCENE.write_text(scene)
