#!/usr/bin/env python3
"""크리스마스 광장 자리 찍기 (tasks/xmas-plaza-code.md 「광장 페이지」) — 밤 그림 web/plaza/xmas-night.webp에서
트리 전구 자리와 전구 줄 길을 찾아 JSON으로 출력한다. 결과는 사람이 web/plaza/scene.json의 tree.lights·strings에 붙인다.

  python3 tools/plaza_points.py            # JSON 출력
  python3 tools/plaza_points.py --show     # assets/references/plaza-points-check.png 에 점을 찍은 확인 그림

- 트리 전구: 트리 몸통(별 아래 세모 안)의 초록 잎 위에서만(장식 공·리본·윤곽선을 피해 둘레 SAFE px가 다 초록) 고른다.
  간격 GAP px의 격자에 날짜와 상관없는 해시로 살짝 흔든 자리를 넣고, 서로 GAP×0.8보다 가까우면 뺀다. 아래 → 위 순서
- 전구 줄: 하늘(투명)을 지나는 얇은 불투명 줄. 왼쪽·오른쪽 각각 위·아래 두 줄, 별 쪽 → 바깥 끝으로 STEP px마다 [x, y] (점등식이 별 쪽부터)
"""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'web/plaza/xmas-night.webp'
STAR = (780, 100)            # 트리 꼭대기(별 아래끝) — 세모의 꼭짓점
BOTTOM, HALF = 700, 300      # 잎 아래끝 y와 그때 반폭
GAP, SAFE = 30, 3
STEP = 30
LEFT_END, RIGHT_START = 744, 816  # 줄이 별에 닿는 x


def green(p):
    r, g, b, a = p
    return a > 200 and g > r + 12 and g > b + 4


def tree_lights(px, w, h):
    pts = []
    for gy in range(STAR[1] + 40, BOTTOM, GAP):
        for gx in range(STAR[0] - HALF, STAR[0] + HALF + 1, GAP):
            hh = int(hashlib.md5(f'{gx},{gy}'.encode()).hexdigest()[:8], 16)
            x, y = gx + hh % 21 - 10, gy + (hh >> 8) % 21 - 10
            if abs(x - STAR[0]) > (y - STAR[1]) / (BOTTOM - STAR[1]) * HALF:
                continue
            if not all(green(px[x + dx, y + dy]) for dx in range(-SAFE, SAFE + 1, SAFE) for dy in range(-SAFE, SAFE + 1, SAFE)):
                continue
            if any((x - a) ** 2 + (y - b) ** 2 < (GAP * 0.8) ** 2 for a, b in pts):
                continue
            pts.append((x, y))
    return sorted(pts, key=lambda p: (-p[1], p[0]))


def thin_runs(px, x, y0=60, y1=330, most=9):
    out, cur = [], None
    for y in range(y0, y1):
        if px[x, y][3] > 128:
            cur = y if cur is None else cur
        elif cur is not None:
            if y - cur <= most:
                out.append((cur + y - 1) / 2)
            cur = None
    return out


def strings(px, w):
    lines = {'left': ([], []), 'right': ([], [])}
    for side, xs in (('left', range(0, LEFT_END + 1, STEP)), ('right', range(w - 1, RIGHT_START - 1, -STEP))):
        for x in list(xs) + [LEFT_END if side == 'left' else RIGHT_START]:
            r = thin_runs(px, x)
            if len(r) >= 2:
                lines[side][0].append([x, round(r[0])])
                lines[side][1].append([x, round(r[1])])
    out = []
    for side in ('left', 'right'):
        for ln in lines[side]:
            seen, path = set(), []
            for p in ln:
                if p[0] not in seen:
                    seen.add(p[0])
                    path.append(p)
            out.append(path[::-1])
    return out


def main():
    im = Image.open(SRC).convert('RGBA')
    px = im.load()
    lights = tree_lights(px, *im.size)
    lines = strings(px, im.size[0])
    if '--show' in sys.argv:
        bg = Image.new('RGBA', im.size, (20, 30, 80, 255))
        bg.alpha_composite(im)
        d = ImageDraw.Draw(bg)
        for x, y in lights:
            d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(255, 230, 80, 255))
        for ln in lines:
            d.line([tuple(p) for p in ln], fill=(255, 80, 80, 255), width=2)
        out = ROOT / 'assets/references/plaza-points-check.png'
        out.parent.mkdir(parents=True, exist_ok=True)
        bg.convert('RGB').save(out)
        print('확인 그림:', out, file=sys.stderr)
    print(f'전구 {len(lights)}개, 줄 {len(lines)}개', file=sys.stderr)
    print(json.dumps({'lights': [list(p) for p in lights], 'strings': lines}, separators=(',', ':')))


if __name__ == '__main__':
    main()
