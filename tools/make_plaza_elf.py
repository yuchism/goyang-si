#!/usr/bin/env python3
"""크리스마스 광장 엘프 시트 다듬기 (XMAS_PLAZA_ELF_ART.md, tasks/xmas-plaza-elf-art.md).
원본(생성기가 준 가로 한 줄 8자세, 크기 제각각)을 8칸(칸 512×512) 시트로 다시 놓는다.
 - 자세 나누기: 붙은 픽셀 덩어리 중 큰 것 8개(왼쪽부터). 작은 조각(방울 등)은 가장 가까운 자세에
 - 같은 배율: ⑥(서서 내려다보기)의 키가 STAND_H가 되게, 모든 칸 같은 배율
 - 같은 바닥: 원본 ⑥의 발끝 줄을 칸의 GROUND로. 다른 칸도 같은 세로 위치 그대로(점프는 원본만큼 떠 있음)
 - 가로: 칸 가운데에 덩어리 가운데
쓰는 법: python3 tools/make_plaza_elf.py 원본.png 웹.webp [--cell 256] [--preview 폴더]"""
import sys
from PIL import Image
import numpy as np

CELL0, GROUND0, STAND_H0 = 512, 480, 300  # 지시서 규격 (칸 512 기준)

def label(m):
    """붙은 픽셀 덩어리 번호 (8방향). scipy가 있으면 그것, 없으면 직접"""
    try:
        import scipy.ndimage as nd
        lab, n = nd.label(m, structure=np.ones((3, 3)))
        return lab, n
    except ImportError:
        H, W = m.shape
        lab = np.zeros((H, W), np.int32)
        n = 0
        for y0, x0 in zip(*np.nonzero(m)):
            if lab[y0, x0]:
                continue
            n += 1
            st = [(y0, x0)]
            lab[y0, x0] = n
            while st:
                y, x = st.pop()
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not lab[yy, xx]:
                            lab[yy, xx] = n
                            st.append((yy, xx))
        return lab, n

def poses(a):
    """자세 8개: 큰 덩어리 8개(왼쪽부터), 작은 조각은 가로 가운데가 가장 가까운 자세에. 자세마다 (마스크, 상자)"""
    m = a[..., 3] > 0
    lab, n = label(m)
    info = []
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        info.append((len(xs), xs.mean(), k))
    big = sorted([t for t in info if t[0] > 300], key=lambda t: -t[0])[:8]
    assert len(big) == 8, f'큰 덩어리가 8개가 아님: {len(big)}'
    big.sort(key=lambda t: t[1])
    groups = [[t[2]] for t in big]
    for cnt, cx, k in info:
        if any(k == t[2] for t in big):
            continue
        i = min(range(8), key=lambda q: abs(big[q][1] - cx))
        groups[i].append(k)
    out = []
    for g in groups:
        mm = np.isin(lab, g)
        ys, xs = np.nonzero(mm)
        out.append((mm, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)))
    return out

def main():
    src, dst = sys.argv[1], sys.argv[2]
    cell = int(sys.argv[sys.argv.index('--cell') + 1]) if '--cell' in sys.argv else 256
    prev = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    im = Image.open(src).convert('RGBA')
    a = np.array(im)
    a[a[..., 3] < 12] = 0  # 옅은 알파 잔여
    PS = poses(a)
    boxes = [bx for _, bx in PS]
    st = boxes[5]
    k = (STAND_H0 / (st[3] - st[1])) * (cell / CELL0)
    ground_src = st[3]
    ground = GROUND0 * cell / CELL0
    sheet = Image.new('RGBA', (cell * 8, cell), (0, 0, 0, 0))
    for i, (mm, (x0, y0, x1, y1)) in enumerate(PS):
        only = a.copy()
        only[~mm] = 0  # 옆 자세가 상자에 걸쳐 들어오지 않게 그 자세 픽셀만
        piece = Image.fromarray(only).crop((x0, y0, x1, y1))
        w, h = max(1, round((x1 - x0) * k)), max(1, round((y1 - y0) * k))
        piece = piece.resize((w, h), Image.LANCZOS)
        top = round(ground - (ground_src - y0) * k)
        left = i * cell + round((cell - w) / 2)
        assert top >= 0 and top + h <= cell + 1, f'칸 {i + 1} 세로 넘침 top={top} h={h}'
        sheet.alpha_composite(piece, (left, max(0, top)))
    sheet.save(dst, 'WEBP', quality=86, method=6)
    print(f'{dst}: {sheet.size}, 칸 {cell}, 배율 {k:.4f}, 바닥 y {ground:.0f}')
    if prev:
        import os
        os.makedirs(prev, exist_ok=True)
        b = np.array(sheet)
        sil = np.zeros_like(b)
        sil[..., :3] = (20, 26, 48)
        sil[..., 3] = (b[..., 3] > 40) * 255
        bg = Image.new('RGBA', sheet.size, (70, 90, 150, 255))
        bg.alpha_composite(Image.fromarray(sil))
        bg.convert('RGB').save(f'{prev}/elf-silhouette.png')
        frames = [sheet.crop((i * cell, 0, (i + 1) * cell, cell)) for i in range(4)]
        out = []
        for f in frames:
            c = Image.new('RGBA', (cell, cell), (200, 210, 230, 255))
            c.alpha_composite(f)
            out.append(c.convert('P'))
        out[0].save(f'{prev}/elf-run.gif', save_all=True, append_images=out[1:], duration=110, loop=0)

if __name__ == '__main__':
    main()
