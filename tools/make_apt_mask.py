#!/usr/bin/env python3
"""건너편 아파트 그림(web/r/apt_day.webp, apt_night.webp)에서 하늘을 투명하게 뺀 마스크를 만든다. WINDOW_PLAN.md 3장.

v1 아파트 그림은 알파가 없고 위쪽에 하늘이 칠해져 있어, 그대로면 무지개·번개 하늘이 그림 위쪽(창의 y ≈ 136)에서 잘린다.
창밖에 무지개·번개를 그린 다음 이 마스크(건물만)를 다시 덮어 건물이 앞에 오게 한다.

하늘 찾기(낮 그림): 맨 위 두 줄은 모두 하늘. 아래로 한 줄씩 내려가며 "바로 위 픽셀이 하늘이고, 색이 위 픽셀과 거의 같고,
그 줄 하늘의 대표색(중앙값)과도 가까운" 픽셀을 하늘로 본다(하늘은 세로로만 부드럽게 바뀌고 건물 윤곽은 색이 확 바뀐다).
경계는 1~2px 부드럽게.

쓰는 법:  python3 tools/make_apt_mask.py   (고양시 폴더에서) → web/r/apt_day_mask.webp, apt_night_mask.webp
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'r')
STEP, REF = 14, 30  # 위 픽셀과의 차이, 그 줄 하늘 대표색과의 차이 (RGB 차이 합)


def sky_mask(im):
    h, w, _ = im.shape
    sky = np.zeros((h, w), bool)
    sky[:2] = True  # 맨 위 한 줄은 테두리처럼 색이 다를 수 있어 둘째 줄부터 본다
    for y in range(2, h):
        cand = sky[y - 1] & (np.abs(im[y] - im[y - 1]).sum(-1) < STEP)
        if not cand.any():
            break
        ref = np.median(im[y][cand], axis=0)
        sky[y] = cand & (np.abs(im[y] - ref).sum(-1) < REF)
        # 가로로도 번진다 (위에서 막혀 있던 하늘 조각: 건물 사이 좁은 틈)
        row = sky[y].copy()
        for x in range(1, w):
            if not row[x] and row[x - 1] and np.abs(im[y, x] - im[y, x - 1]).sum() < STEP and np.abs(im[y, x] - ref).sum() < REF:
                row[x] = True
        for x in range(w - 2, -1, -1):
            if not row[x] and row[x + 1] and np.abs(im[y, x] - im[y, x + 1]).sum() < STEP and np.abs(im[y, x] - ref).sum() < REF:
                row[x] = True
        sky[y] = row
    return sky


# 그림에 투명한 하늘이 있으면(2026-10-16 v2 그림부터) 하늘 찾기 없이 그림의 투명도를 그대로 쓴다: 마스크 = 그림
src_day = Image.open(os.path.join(R, 'apt_day.webp'))
if src_day.mode == 'RGBA' and np.array(src_day)[..., 3].min() < 128:
    for n in ('apt_day', 'apt_night'):
        im = Image.open(os.path.join(R, n + '.webp')).convert('RGBA')
        im.save(os.path.join(R, n + '_mask.webp'), 'WEBP', lossless=True, method=6)
        print(f'{n}_mask.webp: 그림의 투명도 그대로 (하늘 {(np.array(im)[..., 3] < 128).mean() * 100:.1f}%)')
    raise SystemExit
# 하늘은 낮 그림에서 찾는다. 밤 그림은 같은 건물 배치라 낮의 하늘 모양을 그대로 쓴다
# (밤 그림은 아래쪽 하늘색이 건물 벽색과 거의 같아 따로 찾으면 벽으로 번진다)
day = np.array(Image.open(os.path.join(R, 'apt_day.webp')).convert('RGB')).astype(int)
SKY = sky_mask(day)
for n in ('apt_day', 'apt_night'):
    im = np.array(Image.open(os.path.join(R, n + '.webp')).convert('RGB')).astype(int)
    sky = SKY
    a = np.where(sky, 0.0, 255.0)
    a = nd.gaussian_filter(a, 0.8)  # 경계 1~2px 부드럽게
    a[~sky & (nd.distance_transform_edt(~sky) > 2)] = 255
    out = np.dstack([im.astype(np.uint8), a.clip(0, 255).astype(np.uint8)])
    Image.fromarray(out).save(os.path.join(R, n + '_mask.webp'), 'WEBP', lossless=True, method=6)
    print(f'{n}_mask.webp: 하늘 {sky.mean() * 100:.1f}%')
