#!/usr/bin/env python3
"""크리스마스 광장 낮 그림(web/plaza/xmas-day.webp)을 만든다. tasks/xmas-plaza-day-art.md 메모.

원본 assets/plaza/xmas-day-source-v1.png(1575×998, 밤 그림과 같은 비율)을 1561×989로 줄이고,
하늘 자리는 밤 그림(web/plaza/xmas-night.webp)의 알파를 그대로 쓴다 — 두 장이 겹쳐 넘어가므로
윤곽이 한 픽셀도 다르면 안 된다.

전구 줄(트리 위에서 양옆으로 처진 전선): 밤 알파의 가는 선 부분(굵은 덩어리 — 트리·건물 — 에서 떨어진
곳, 작은 조각 빼고)과 거기서 트리 쪽으로 이어진 밤 회색 끝은 낮 원본 색 대신 밤 그림 색을 그대로 복사한다 — 낮·밤이 같은 회색 줄.

가장자리 정리: 낮 원본이 덜 불투명한 곳(SOLID 미만 — 전선·지붕·트리 가장자리의 옅은 색 잔여, 또는
밤에는 있고 낮에는 빈 곳)은 색을 믿지 않고 둘레의 불투명한 낮 색으로 채운 뒤 밤 알파를 씌운다.

쓰는 법:  python3 tools/make_plaza_day.py   (고양시 폴더에서) → web/plaza/xmas-day.webp
          python3 tools/make_plaza_day.py --gif PATH   → 낮·밤을 번갈아 보이는 비교 그림도
"""
import os
import sys
from PIL import Image, ImageChops, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', 'plaza', 'xmas-day-source-v1.png')
NIGHT = os.path.join(ROOT, 'web', 'plaza', 'xmas-night.webp')
OUT = os.path.join(ROOT, 'web', 'plaza', 'xmas-day.webp')
W, H = 1561, 989
SOLID = 250   # 낮 원본 알파가 이 값 이상이어야 색을 그대로 쓴다
THICK = 11    # 이보다 가는 밤 알파 부분이 전선 후보
WIRE_MIN = 300   # 이보다 작은 가는 조각(별 끝·티끌)은 전선이 아님
WIRE_GROW = 12   # 트리에 닿는 끝: 전선에서 이만큼까지 밤 색이 회색인 곳도 전선으로 본다


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


def wire_mask(night_alpha):
    m = night_alpha.point(lambda v: 255 if v > 0 else 0)
    thick = m.filter(ImageFilter.MinFilter(THICK)).filter(ImageFilter.MaxFilter(THICK))
    thin = ImageChops.subtract(m, thick).load()
    wires, seen = set(), set()
    for y in range(H):
        for x in range(W):
            if not thin[x, y] or (x, y) in seen:
                continue
            part, stack = [], [(x, y)]
            seen.add((x, y))
            while stack:
                cx, cy = stack.pop()
                part.append((cx, cy))
                for nx in range(cx - 1, cx + 2):
                    for ny in range(cy - 1, cy + 2):
                        if 0 <= nx < W and 0 <= ny < H and thin[nx, ny] and (nx, ny) not in seen:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
            if len(part) >= WIRE_MIN:
                wires.update(part)
    return wires


def is_wire_gray(rgba):
    r, g, b, a = rgba
    return a > 0 and max(r, g, b) - min(r, g, b) < 40 and 50 <= (r + g + b) // 3 <= 210


def copy_wires(day, night):
    px, npx = day.load(), night.load()
    wires = wire_mask(night.getchannel('A'))
    edge = set(wires)
    for _ in range(WIRE_GROW):
        edge = {(nx, ny) for x, y in edge for nx in (x - 1, x, x + 1) for ny in (y - 1, y, y + 1)
                if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in wires and is_wire_gray(npx[nx, ny])}
        wires |= edge
    for x, y in wires:
        px[x, y] = npx[x, y][:3] + (255,)
    return len(wires)


def build():
    night = Image.open(NIGHT).convert('RGBA')
    assert night.size == (W, H), night.size
    day = day_scaled()
    n = clean_edges(day, night.getchannel('A'))
    nw = copy_wires(day, night)
    day.putalpha(night.getchannel('A'))
    day.save(OUT, 'WEBP', quality=86, method=6)
    print(f'{OUT}: {W}×{H}, 가장자리 {n}px 채움, 전선 {nw}px 밤 색 복사')
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
