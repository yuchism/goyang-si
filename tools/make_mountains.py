#!/usr/bin/env python3
"""창밖 산 그림(assets/scenery/mountain-far-*-v2.png, mountain-near-*-v3.png, MOUNTAIN_SPRITE_PLAN.md)을 웹용으로 바꾼다. WINDOW_PLAN_3.md 6장.

1. 알파 통일: 계절 사이에는 두 그림을 섞는다. 윤곽이 조금이라도 다르면 섞는 동안 능선이 두 겹으로 보이므로
   먼 산·가까운 산 각각 **여름 그림의 알파 하나**를 네 계절 모두에 쓴다.
   다른 계절의 색은 그 계절 그림에서 가져오고, 여름에만 칠해진 곳은 가장 가까운 그 계절 색으로 번져 채운다.
2. 색 번지기: 반투명 가장자리의 색이 투명 쪽(검정)에 끌려 어두운 테가 생기지 않게, 투명·반투명 픽셀의 색을 가까운 불투명 색으로.
3. 줄이기: 2400×1100 → 1200×550 (방에서 680×312로 그려짐. 고해상도 화면 2배까지 충분), 알파 포함 webp.
4. 확인: 계절별 윤곽 차이(캔버스 px)와 웹용 파일 크기를 출력. --show 면 assets/references/mountain-check-v1.png
   (네 계절 + 눈 모자를 하늘색 바탕에 겹친 그림)

쓰는 법:  python3 tools/make_mountains.py [--show]   (고양시 폴더에서) → web/r/scenery/mountain_{far,near}_{spring,summer,autumn,winter}.webp, mountain_far_snowcap.webp
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'assets', 'scenery')
DST = os.path.join(HERE, '..', 'web', 'r', 'scenery')
VER = {'far': 'v2', 'near': 'v3'}  # 그림 판: 가까운 산은 2026-10-16 v3(방 그림체로 다시 그림), 먼 산은 v2
SEASONS = ('spring', 'summer', 'autumn', 'winter')
OUT_W, OUT_H = 1200, 550


def load(name):
    return np.array(Image.open(os.path.join(SRC, f'mountain-{name}-{VER[name.split("-")[0]]}.png')).convert('RGBA'))


def bleed(rgb, solid):
    if solid.all():
        return rgb
    _, (iy, ix) = nd.distance_transform_edt(~solid, return_indices=True)
    return rgb[iy, ix]


def save(arr, key):
    im = Image.fromarray(arr, 'RGBA').convert('RGBa').resize((OUT_W, OUT_H), Image.LANCZOS).convert('RGBA')
    a = np.array(im)
    a[..., :3] = bleed(a[..., :3], a[..., 3] >= 250)  # 줄인 뒤에도 가장자리 색이 어둡지 않게
    path = os.path.join(DST, key + '.webp')
    Image.fromarray(a).save(path, 'WEBP', quality=88, alpha_quality=100, method=6)
    return os.path.getsize(path)


os.makedirs(DST, exist_ok=True)
total = 0
for layer in ('far', 'near'):
    base = load(f'{layer}-summer')
    alpha = base[..., 3]
    solid = alpha >= 250
    edge = solid ^ nd.binary_erosion(solid)
    dist = nd.distance_transform_edt(~edge)
    for s in SEASONS:
        im = base if s == 'summer' else load(f'{layer}-{s}')
        own = im[..., 3] >= 128
        diff = own ^ (alpha >= 128)
        far = dist[diff].max() if diff.any() else 0
        rgb = bleed(im[..., :3], im[..., 3] >= 250)  # 이 계절 색을 여름 알파 안까지 번진다
        out = np.dstack([rgb, alpha])
        size = save(out, f'mountain_{layer}_{s}')
        total += size
        print(f'mountain_{layer}_{s}.webp  {size // 1024}KB  윤곽 차이 {int(diff.sum())}px, 최대 {far:.0f}px → 여름 알파로 맞춤')
cap = load('far-snowcap')
cap[..., :3] = bleed(cap[..., :3], cap[..., 3] >= 250)
total += save(cap, 'mountain_far_snowcap')
print(f'mountain_far_snowcap.webp  (합계 {total // 1024}KB)')

if '--show' in sys.argv:
    tiles = []
    for s in SEASONS:
        bg = Image.new('RGBA', (OUT_W, OUT_H), (150, 173, 233, 255))
        bg.alpha_composite(Image.open(os.path.join(DST, f'mountain_far_{s}.webp')))
        if s == 'winter':
            bg.alpha_composite(Image.open(os.path.join(DST, 'mountain_far_snowcap.webp')))
        bg.alpha_composite(Image.open(os.path.join(DST, f'mountain_near_{s}.webp')))
        tiles.append(bg.resize((OUT_W // 2, OUT_H // 2)))
    sheet = Image.new('RGBA', (OUT_W, OUT_H), (255, 255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % 2) * OUT_W // 2, (i // 2) * OUT_H // 2))
    dst = os.path.join(HERE, '..', 'assets', 'references', 'mountain-check-v1.png')
    sheet.convert('RGB').save(dst)
    print('확인 그림:', os.path.normpath(dst))
