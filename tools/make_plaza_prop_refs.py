#!/usr/bin/env python3
"""광장 소품 참고 그림 자르기 (PLAZA_REFACTOR_PLAN.md R3) — ChatGPT에 "이것만 같은 크기로 다시 그려 줘"와 함께 첨부할 그림.
크리스마스 광장 그림(낮·밤, 하늘엔 하늘색을 깔아)에서 tools/plaza_props.json의 box를 잘라 assets/plaza/prop-ref/<id>-day·night-ref.png로.
쓰는 법: python3 tools/make_plaza_prop_refs.py [id ...]"""
from pathlib import Path
from PIL import Image
import json
import sys

ROOT = Path(__file__).resolve().parent.parent
SPEC = json.loads((ROOT / 'tools/plaza_props.json').read_text())['props']
BG = {'day': (120, 170, 230, 255), 'night': (13, 28, 73, 255)}
SRC = {'day': 'tools/ref/xmas-day.webp', 'night': 'tools/ref/xmas-night.webp'}
ids = sys.argv[1:] or list(SPEC)
(ROOT / 'assets/plaza/prop-ref').mkdir(parents=True, exist_ok=True)
for n in ('day', 'night'):
    im = Image.open(ROOT / SRC[n]).convert('RGBA')
    b = Image.new('RGBA', im.size, BG[n])
    b.alpha_composite(im)
    for pid in ids:
        c = b.crop(tuple(SPEC[pid]['box'])).convert('RGB')
        c.save(ROOT / f'assets/plaza/prop-ref/{pid}-{n}-ref.png')
        print(pid, n, c.size)
