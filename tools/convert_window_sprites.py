#!/usr/bin/env python3
"""창밖 손님 원본 그림(assets/sprites/)을 웹 그림(web/r/fx/, web/f/)으로 바꾼다. WINDOW_SPRITE_PLAN.md 3장 변환 표.

- 알파 정리: 240 이상 → 255(몸이 비치지 않게), 8 미만 → 0
- 같은 종류끼리 **같은 잘라내기 상자·같은 배율**: 겹치면 발·머리 위치가 같다. 맨 아래 줄 = 발(빼꼼·알아챔은 앞발이 걸친 선)
- 날개 편 그림(*-fly)은 캔버스 크기가 달라 따로 자르되, 몸 크기가 앉은 그림과 같아지는 배율(FLY_MATCH)을 곱한다
- 방에서 그릴 배율은 js/veranda.js K (웹 px × K = 방 px). 웹 그림 배율을 바꾸면 화면 크기가 그만큼 바뀐다
- 채터링(f/cat_chatter_*)은 강고양이 씨 프레임이라 meta.json 기준점을 손으로 맞춘다(여기서는 만들지 않음)

쓰는 법:  python3 tools/convert_window_sprites.py   (고양시 폴더에서) → python3 tools/build_meta.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
S, O = os.path.join(ROOT, 'assets', 'sprites'), os.path.join(ROOT, 'web', 'r', 'fx')
PAD = 6  # 사방 여백 (아래는 0): 처음 배율 기준 웹 px. 키운 배수만큼 같이 커진다

# 웹 그림 배율 (원본 px → 웹 px). 처음 값 × 키운 배수
BIRD0, CAT0 = 0.11, 0.115  # 처음 배율
BIRD = BIRD0 * 1.4  # 새: 화면에서 작아 1.4배 (2026-10-16)
CAT = CAT0 * 1.8  # 검은 고양이: 새에 비해 작아 1.8배 (2026-10-16)
# 날개 편 그림의 몸을 앉은 그림 몸과 같은 크기로: 원본끼리 몸 길이(부리 ~ 꼬리 끝) 비율
FLY_MATCH = {'pigeon': 713 / 370, 'magpie': 1121 / 442}

GROUPS = [  # (원본 이름들, 웹 이름들, 배율, 여백 기준 배율)
    (['pigeon-sit-v1', 'pigeon-peck-v1'], ['pigeon_sit', 'pigeon_peck'], BIRD, BIRD0),
    (['magpie-sit-v1', 'magpie-peck-v1'], ['magpie_sit', 'magpie_peck'], BIRD, BIRD0),
    (['pigeon-fly-v1'], ['pigeon_fly'], BIRD * FLY_MATCH['pigeon'], BIRD0 * FLY_MATCH['pigeon']),
    (['magpie-fly-v1'], ['magpie_fly'], BIRD * FLY_MATCH['magpie'], BIRD0 * FLY_MATCH['magpie']),
    (['blackcat-peek-v1', 'blackcat-alert-v1'], ['blackcat_peek', 'blackcat_alert'], CAT, CAT0),
    # 걷기 4장 (2026-10-16 추가 주문, WINDOW_SPRITE_PLAN.md 8장): 왼발 딛기 → 지나감 → 오른발 딛기 → 지나감. 발 높이를 맞춘다(FEET)
    (['blackcat-walk-contact-left-v1', 'blackcat-walk-pass-left-v1', 'blackcat-walk-contact-right-v1', 'blackcat-walk-pass-right-v1'],
     ['blackcat_walk_1', 'blackcat_walk_2', 'blackcat_walk_3', 'blackcat_walk_4'], CAT, CAT0),
    (['blackcat-run-v1'], ['blackcat_run'], CAT, CAT0),
]


def clean(a):
    al = a[..., 3].astype(int)
    al[al >= 240] = 255
    al[al < 8] = 0
    a[..., 3] = al
    a[al == 0, :3] = 0
    return a


def main():
    for srcs, names, sc, sc0 in GROUPS:
        if not all(os.path.exists(os.path.join(S, n + '.png')) for n in srcs):
            print('건너뜀 (원본 없음):', ', '.join(srcs))
            continue
        ims = [clean(np.array(Image.open(os.path.join(S, n + '.png')).convert('RGBA'))) for n in srcs]
        if len(ims) > 1 and names[0].startswith('blackcat_walk'):  # FEET: 네 장의 발(그림 맨 아래)이 같은 줄에 오게 아래로 민다
            low = max(np.where(a[..., 3] > 8)[0].max() for a in ims)
            ims = [np.roll(a, low - np.where(a[..., 3] > 8)[0].max(), axis=0) for a in ims]
        boxes = [np.where(a[..., 3] > 8) for a in ims]
        pad = int(PAD / sc0)
        box = (min(b[1].min() for b in boxes) - pad, min(b[0].min() for b in boxes) - pad,
               max(b[1].max() for b in boxes) + 1 + pad, max(b[0].max() for b in boxes) + 1)
        for a, nm in zip(ims, names):
            c = Image.fromarray(a).crop(box)
            c = c.resize((round(c.width * sc), round(c.height * sc)), Image.LANCZOS)
            c = clean(np.array(c))
            Image.fromarray(c).save(os.path.join(O, nm + '.webp'), 'WEBP', lossless=True, method=6)
            m = (c[..., 0] > 170) & (c[..., 1] > 120) & (c[..., 2] < 120) & (c[..., 3] > 200)  # 노란 눈 (검은 고양이)
            eyes = ''
            if nm.startswith('blackcat'):
                lab, k = nd.label(m)
                cs = sorted([(nd.sum(m, lab, i), nd.center_of_mass(m, lab, i)) for i in range(1, k + 1)], reverse=True)[:2]
                eyes = ' 눈 ' + ' · '.join(f'({q[1][1]:.1f}, {q[1][0]:.1f})' for q in cs)
            print(f'fx/{nm}.webp {c.shape[1]}×{c.shape[0]}{eyes}')


main()
