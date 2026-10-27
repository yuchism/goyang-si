#!/usr/bin/env python3
"""생일 깜짝 손님 춤 시트(assets/birthday/guests/guest-<이름>-dance-v*.png, GUEST_SPRITE_PLAN.md)와
주인장 손님 시트(assets/birthday/family-guests/<이름>-dance-sheet-v*.png, -raw는 빼고)를 웹용으로 바꾼다.
BIRTHDAY_GUESTS_PLAN.md 5장.

1. 칸 정리: 원본은 2048×768에 512 폭 네 칸. 꼬리·부리 끝이 옆 칸으로 조금 넘친 그림(비버 ②, 펠리칸 ③)이 있어서
   칸 경계로 자르지 않고, 덩어리(붙어 있는 픽셀)마다 무게중심이 있는 칸에 붙인다.
   새 시트는 칸마다 양옆에 여백(PAD)을 두어 넘친 조각도 자기 칸 안에 들어가게 한다.
2. 색 번지기: 반투명 가장자리의 색을 가까운 불투명 색으로 (어두운 테 방지).
3. 줄이기: SCALE배 (방에서 가장 큰 손님도 약 230 방 px. 고해상도 화면 2배까지 충분), 알파 포함 webp.
4. 출력: 손님마다 발바닥 y(foot)·그림 키(h, ② 칸)를 새 시트 px로 출력 → js/guests.js GUESTS 표에 옮긴다.

쓰는 법:  python3 tools/make_guests.py [이름 ...]   (고양시 폴더에서) → web/sheet/guest-<이름>-dance-v1.webp
          이름을 주면 그 손님만 다시 만든다 (예: mandeuk family-01). 안 주면 전부
"""
import glob, os, re
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
SRCS = [  # (폴더, 파일 이름 규칙: 이름·판)
    (os.path.join(HERE, '..', 'assets', 'birthday', 'guests'), r'guest-([\w-]+?)-dance-v(\d+)\.png$'),
    (os.path.join(HERE, '..', 'assets', 'birthday', 'family-guests'), r'([\w-]+?)-dance-sheet-v(\d+)\.png$'),  # 주인장 손님 (-raw는 규칙에 안 맞아 빠짐)
]
DST = os.path.join(HERE, '..', 'web', 'sheet')
CELL, PAD, SCALE = 512, 24, 0.75  # 새 칸 폭 = (512 + 2×24) × 0.75 = 420
# 칸마다 발 높이가 다른 그림: 칸마다 몸통(가장 큰 덩어리)의 발바닥을 가장 낮은 칸에 맞춰 위아래로 민다 (HOURLY_CHIME_PLAN.md 7장).
# 다른 손님은 네 칸 발 높이가 이미 같아서 건드리지 않는다
ALIGN_FEET = {'pumpkinhead'}


def latest():
    best = {}
    for src, pat in SRCS:
        for p in glob.glob(os.path.join(src, '*.png')):
            m = re.match(pat, os.path.basename(p))
            if m and int(m.group(2)) > best.get(m.group(1), (0, ''))[0]:
                best[m.group(1)] = (int(m.group(2)), p)
    return {k: v[1] for k, v in sorted(best.items())}


def bleed(a):
    al = a[..., 3]
    solid = al > 200
    if solid.any():
        _, (iy, ix) = nd.distance_transform_edt(~solid, return_indices=True)
        edge = al <= 200
        a[..., :3][edge] = a[iy[edge], ix[edge], :3]
    return a


def align_feet(a):
    feet = []
    for i in range(4):
        sub = a[:, i * CELL:(i + 1) * CELL, 3] > 40
        lab, n = nd.label(sub)
        big = np.argmax(nd.sum(sub, lab, range(1, n + 1))) + 1
        feet.append(int(np.nonzero(lab == big)[0].max()))
    target = max(feet)
    out = np.zeros_like(a)
    for i, f in enumerate(feet):
        d = target - f
        src = a[:, i * CELL:(i + 1) * CELL]
        out[d:, i * CELL:(i + 1) * CELL] = src[:a.shape[0] - d]
        assert not src[a.shape[0] - d:, :, 3].any(), f'칸 {i + 1} 아래가 잘림'
    print(f'    발 맞춤: {feet} → {target}')
    return out


def convert(name, path):
    a = np.array(Image.open(path).convert('RGBA'))
    a[a[..., 3] <= 3] = 0  # 칸 경계의 거의 투명한 티끌(생성 도구 흔적)은 지운다
    if name in ALIGN_FEET:
        a = align_feet(a)
    H, W = a.shape[:2]
    lab, n = nd.label(a[..., 3] > 0, structure=np.ones((3, 3)))
    cw = CELL + 2 * PAD
    out = np.zeros((H, cw * 4, 4), np.uint8)
    moved = 0
    for k, sl in enumerate(nd.find_objects(lab), 1):
        ys, xs = np.nonzero(lab[sl] == k)
        cx = xs.mean() + sl[1].start
        cell = min(3, int(cx // CELL))
        y0, x0 = sl[0].start, sl[1].start
        if x0 < cell * CELL or sl[1].stop > (cell + 1) * CELL:
            moved += 1
        dx = cell * cw + PAD - cell * CELL
        m = lab[sl] == k
        tgt = out[sl[0], slice(x0 + dx, sl[1].stop + dx)]
        tgt[m] = a[sl][m]
    out = bleed(out)
    im = Image.fromarray(out).resize((round(cw * 4 * SCALE), round(H * SCALE)), Image.LANCZOS)
    os.makedirs(DST, exist_ok=True)
    dst = os.path.join(DST, f'guest-{name}-dance-v1.webp')
    im.save(dst, 'WEBP', quality=86, alpha_quality=100, method=6)
    A = np.array(im)[..., 3] > 40
    c = round(cw * SCALE)
    feet, hs = [], []
    for i in range(4):
        ys = np.nonzero(A[:, i * c:(i + 1) * c].any(1))[0]
        feet.append(ys.max())
        hs.append(ys.max() - ys.min())
        cols = np.nonzero(A[:, i * c:(i + 1) * c].any(0))[0]
        assert cols.min() > 0 and cols.max() < c - 1, f'{name} 칸 {i + 1}이 칸 끝에 닿음'
    return dst, im.size, c, max(feet), hs[1], moved, os.path.getsize(dst)


if __name__ == '__main__':
    import sys
    only = set(sys.argv[1:])
    total = 0
    for name, path in latest().items():
        if only and name not in only:
            continue
        dst, size, c, foot, h, moved, b = convert(name, path)
        total += b
        print(f"  {{ id: '{name}', foot: {foot}, h: {h} }},  // {os.path.basename(path)} → {size[0]}×{size[1]} 칸 {c}, {b // 1024}KB" + (f', 넘친 조각 {moved}개 옮김' if moved else ''))
    print(f'합계 {total // 1024}KB')
