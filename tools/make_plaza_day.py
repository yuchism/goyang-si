#!/usr/bin/env python3
"""크리스마스 광장 낮 그림(web/plaza/xmas-day.webp)을 만든다. tasks/xmas-plaza-day-art.md 메모.

원본 assets/plaza/xmas-day-source-v1.png(1575×998, 밤 그림과 같은 비율)을 1561×989로 줄이고,
하늘 자리는 밤 그림(web/plaza/xmas-night.webp)의 알파를 그대로 쓴다 — 두 장이 겹쳐 넘어가므로
윤곽이 한 픽셀도 다르면 안 된다.

가장자리 정리: 낮 원본이 덜 불투명한 곳(SOLID 미만 — 전선·지붕·트리 가장자리의 옅은 색 잔여, 또는
밤에는 있고 낮에는 빈 곳)은 색을 믿지 않고 둘레의 불투명한 낮 색으로 채운 뒤 밤 알파를 씌운다.

쓰는 법:  python3 tools/make_plaza_day.py   (고양시 폴더에서) → web/plaza/xmas-day.webp
          python3 tools/make_plaza_day.py --gif PATH   → 낮·밤을 번갈아 보이는 비교 그림도
"""
import os
import sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', 'plaza', 'xmas-day-source-v1.png')
NIGHT = os.path.join(ROOT, 'web', 'plaza', 'xmas-night.webp')
OUT = os.path.join(ROOT, 'web', 'plaza', 'xmas-day.webp')
W, H = 1561, 989
SOLID = 250   # 낮 원본 알파가 이 값 이상이어야 색을 그대로 쓴다


def day_scaled():
    # 알파를 곱한 채(RGBa)로 줄여야 투명한 곳의 색이 가장자리로 번지지 않는다
    return Image.open(SRC).convert('RGBA').convert('RGBa').resize((W, H), Image.LANCZOS).convert('RGBA')


def clean_edges(day, night_alpha):
    px = day.load()
    na = night_alpha.load()
    todo = {(x, y) for y in range(H) for x in range(W) if na[x, y] > 0 and px[x, y][3] < SOLID}
    known = lambda x, y: 0 <= x < W and 0 <= y < H and (x, y) not in todo and px[x, y][3] >= SOLID
    filled = {}
    while todo:
        step = {}
        for x, y in todo:
            near = [px[x + dx, y + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                    if (dx or dy) and (known(x + dx, y + dy) or (x + dx, y + dy) in filled)]
            if near:
                step[(x, y)] = tuple(sum(c[i] for c in near) // len(near) for i in range(3))
        if not step:
            break
        for (x, y), rgb in step.items():
            px[x, y] = rgb + (255,)
            filled[(x, y)] = True
        todo -= step.keys()
    return len(filled)


def build():
    night = Image.open(NIGHT).convert('RGBA')
    assert night.size == (W, H), night.size
    day = day_scaled()
    n = clean_edges(day, night.getchannel('A'))
    day.putalpha(night.getchannel('A'))
    day.save(OUT, 'WEBP', quality=86, method=6)
    print(f'{OUT}: {W}×{H}, 가장자리 {n}px 채움')
    return day, night


def daynight_gif(day, night, path):
    frames = []
    for im in (day, night):
        bg = Image.new('RGBA', (W, H), (150, 190, 230, 255))   # 낮·밤 같은 하늘색 바탕(비교용)
        bg.alpha_composite(im)
        frames.append(bg.convert('RGB').quantize(256, method=Image.Quantize.MEDIANCUT))
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=700, loop=0)
    print(path)


if __name__ == '__main__':
    d, nt = build()
    if '--gif' in sys.argv:
        daynight_gif(Image.open(OUT).convert('RGBA'), nt, sys.argv[sys.argv.index('--gif') + 1])
