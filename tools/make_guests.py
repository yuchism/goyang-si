#!/usr/bin/env python3
"""생일 깜짝 손님 춤 시트(assets/birthday/guests/guest-<이름>-dance-v*.png, GUEST_SPRITE_PLAN.md)를 웹용으로 바꾼다.
BIRTHDAY_GUESTS_PLAN.md 5장.

1. 칸 정리: 원본은 2048×768에 512 폭 네 칸. 꼬리·부리 끝이 옆 칸으로 조금 넘친 그림(비버 ②, 펠리칸 ③)이 있어서
   칸 경계로 자르지 않고, 덩어리(붙어 있는 픽셀)마다 무게중심이 있는 칸에 붙인다.
   새 시트는 칸마다 양옆에 여백(PAD)을 두어 넘친 조각도 자기 칸 안에 들어가게 한다.
2. 색 번지기: 반투명 가장자리의 색을 가까운 불투명 색으로 (어두운 테 방지).
3. 줄이기: SCALE배 (방에서 가장 큰 손님도 약 230 방 px. 고해상도 화면 2배까지 충분), 알파 포함 webp.
4. 출력: 손님마다 발바닥 y(foot)·그림 키(h, ② 칸)를 새 시트 px로 출력 → js/guests.js GUESTS 표에 옮긴다.

쓰는 법:  python3 tools/make_guests.py   (고양시 폴더에서) → web/sheet/guest-<이름>-dance-v1.webp
"""
import glob, os, re
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'assets', 'birthday', 'guests')
DST = os.path.join(HERE, '..', 'web', 'sheet')
CELL, PAD, SCALE = 512, 24, 0.75  # 새 칸 폭 = (512 + 2×24) × 0.75 = 420


def latest():
    best = {}
    for p in glob.glob(os.path.join(SRC, 'guest-*-dance-v*.png')):
        m = re.match(r'guest-(\w+)-dance-v(\d+)\.png$', os.path.basename(p))
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


def convert(name, path):
    a = np.array(Image.open(path).convert('RGBA'))
    a[a[..., 3] <= 3] = 0  # 칸 경계의 거의 투명한 티끌(생성 도구 흔적)은 지운다
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
    total = 0
    for name, path in latest().items():
        dst, size, c, foot, h, moved, b = convert(name, path)
        total += b
        print(f"  {{ id: '{name}', foot: {foot}, h: {h} }},  // {os.path.basename(path)} → {size[0]}×{size[1]} 칸 {c}, {b // 1024}KB" + (f', 넘친 조각 {moved}개 옮김' if moved else ''))
    print(f'합계 {total // 1024}KB')
