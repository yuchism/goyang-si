#!/usr/bin/env python3
"""어항 크게 보기 그림 다듬기 (FISHBOWL_VIEW_SPRITE_PLAN.md 4·5장): assets/sprites/*-v1.png → web/r/*.webp
- 원본은 고치지 않는다. 받은 원본은 1254×1254(지시서 2장의 1536·512와 다름)라 여기서 맞춘다
- 어항 뒤·앞: 바깥 테두리 원을 재어(최소제곱 원 맞춤) 지름 1480 · 가운데 (768,768)로 옮긴다.
  두 장 원이 따로 그려져 크기가 조금 다르므로(반지름 618 / 627) 배율도 따로. 그러면 원이 같은 자리·같은 크기
  뒤판: 원 안 알파는 끝까지 255(원본은 252~254), 원 밖 옅은 알파는 지운다
  앞판: 옅은 알파 잔여(반사광·수면선 둘레의 흐린 번짐)를 지운다
- 보물상자 3장: 몸통 폭 280 · 바닥 가운데 (256, 460)에 맞춘다(배율은 그림마다 몸통 폭으로).
  아래 몸통(맨 아래 판자 줄 아래)은 닫힘 그림을 세 장에 같게 붙인다 — 바꿔 끼울 때 튀지 않게
  python3 tools/fishbowl_view_art.py [--check]   (--check: assets/sprites/_check/에 겹쳐 본 그림)"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'sprites'
OUT = ROOT / 'web' / 'r'
FAINT = 60  # 이보다 옅은 알파는 잔여로 보고 지운다
FULL = 200  # 이보다 진한 알파는 불투명으로
BOWL, R, C = 1536, 740, 768  # 캔버스 · 바깥 테두리 반지름 · 원 가운데
CHEST, BODY_W, FOOT = 512, 280, (256, 460)
SEAM = 42  # 몸통 바닥에서 이만큼(512 기준) 위 줄부터 아래를 닫힘 그림으로 같게


def load(name):
    return Image.open(SRC / f'{name}-v1.png').convert('RGBA')


def tidy(a):
    return a.point(lambda v: 0 if v < FAINT else 255 if v > FULL else v)


def solve3(m, v):
    a = [m[i] + [v[i]] for i in range(3)]
    for i in range(3):
        p = max(range(i, 3), key=lambda r: abs(a[r][i]))
        a[i], a[p] = a[p], a[i]
        for r in range(3):
            if r != i:
                f = a[r][i] / a[i][i]
                a[r] = [x - f * y for x, y in zip(a[r], a[i])]
    return [a[i][3] / a[i][i] for i in range(3)]


def bowl_circle(im):
    """바깥 테두리 원 (가운데 x, y, 반지름). 입술이 있는 위쪽은 빼고 양옆·아래 가장자리로 잰다"""
    px, (w, h) = im.getchannel('A').load(), im.size
    pts = []
    for y in range(h // 5, h, 4):
        xs = [x for x in range(w) if px[x, y] > 128]
        if xs:
            pts += [(xs[0], y), (xs[-1] + 1, y)]
    for x in range(w // 6, w - w // 6, 4):
        ys = [y for y in range(h) if px[x, y] > 128]
        if ys:
            pts.append((x, ys[-1] + 1))
    s = lambda g: sum(g(x, y) for x, y in pts)
    m = [[s(lambda x, y: x * x), s(lambda x, y: x * y), s(lambda x, y: x)],
         [s(lambda x, y: x * y), s(lambda x, y: y * y), s(lambda x, y: y)],
         [s(lambda x, y: x), s(lambda x, y: y), len(pts)]]
    v = [s(lambda x, y: x * (x * x + y * y)), s(lambda x, y: y * (x * x + y * y)), s(lambda x, y: x * x + y * y)]
    a, b, c = solve3(m, v)
    cx, cy = a / 2, b / 2
    return cx, cy, (c + cx * cx + cy * cy) ** 0.5


def place(im, size, k, src_pt, dst_pt):
    """src_pt를 dst_pt에 오게 k배로 size 캔버스에"""
    w, h = round(im.size[0] * k), round(im.size[1] * k)
    big = im.resize((w, h), Image.LANCZOS)
    can = Image.new('RGBA', size, (0, 0, 0, 0))
    can.alpha_composite(big, (round(dst_pt[0] - src_pt[0] * k), round(dst_pt[1] - src_pt[1] * k)))
    return can


def disc(r, size=BOWL):
    """원 가운데 (C, C) 반지름 r 안이 255인 마스크 (가장자리 1px 부드럽게)"""
    m = Image.new('L', (size * 2, size * 2), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(m).ellipse((2 * (C - r), 2 * (C - r), 2 * (C + r), 2 * (C + r)), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def save(im, name):
    im.save(OUT / f'{name}.webp', 'WEBP', quality=88, method=6)
    print(f'{name}.webp {im.size[0]}×{im.size[1]} 그림 둘레 {im.getchannel("A").getbbox()}')


def blue(p):
    """수면선의 진한 하늘색"""
    return p[3] > 128 and p[2] > 190 and p[0] < 70


def outline_fill(a):
    """앞판 그림의 겉모양(세로줄마다 맨 위~맨 아래 칠한 곳 사이)을 채운 마스크"""
    px, (w, h) = a.load(), a.size
    m = Image.new('L', a.size, 0)
    mp = m.load()
    for x in range(w):
        ys = [y for y in range(h) if px[x, y] > 128]
        for y in range(ys[0], ys[-1] + 1) if ys else ():
            mp[x, y] = 255
    return m


def match_back(back, front):
    """뒤판의 입술·수면선은 앞판과 20px쯤 어긋나 겹쳐 보이므로 앞판 것만 보이게:
    - 뒤판은 원 안 ∩ 앞판 겉모양 안만 남긴다(앞판 입술 위로 삐져나온 뒤판 입술이 없어진다)
    - 뒤판 수면선은 지우고, 앞판 수면선 윗줄보다 위의 물은 공기색, 아래는 물색으로 칠한다"""
    fp, bp = front.load(), back.load()
    air, curtain = (237, 234, 224, 255), (140, 201, 244, 255)
    water = bp[C, 560]  # 수면 아래 첫 물색(뒤판에서 잰다)
    for x in range(BOWL):
        top = next((y for y in range(250, 600) if blue(fp[x, y])), None)
        if top is None:
            continue
        for y in range(240, 600):
            p = bp[x, y]
            if p[3] < 128 or p[2] < p[0] - 10 or sum(p[:3]) < 360:  # 테두리·입술 선·유리 띠는 그대로
                continue
            if y < top and p[2] <= p[0]:  # 공기는 그대로
                continue
            if y < top:
                bp[x, y] = air
            elif blue(p) or (y < top + 100 and sum(abs(u - v) for u, v in zip(p, curtain)) > 24):
                bp[x, y] = water  # 수면선과 그 둘레 번짐(커튼 색 덩어리는 빼고)
    a = Image.composite(tidy(back.getchannel('A')), Image.new('L', back.size, 0), outline_fill(front.getchannel('A')))
    a = Image.composite(a, Image.new('L', a.size, 0), disc(R))
    inner = disc(R - 3).point(lambda v: 255 if v == 255 else 0)  # 원 안은 끝까지 불투명
    a = Image.composite(Image.new('L', a.size, 255), a, Image.composite(inner, Image.new('L', a.size, 0), a.point(lambda v: 255 if v else 0)))
    back.putalpha(a)


def bowls():
    out = {}
    for n in ('back', 'front'):
        im = load(f'fbv-{n}')
        cx, cy, r = bowl_circle(im)
        k = R / r
        print(f'  fbv-{n}: 원 가운데 ({cx:.1f}, {cy:.1f}) 반지름 {r:.1f} → 배율 {k:.4f}')
        im = place(im, (BOWL, BOWL), k, (cx, cy), (C, C))
        im.putalpha(tidy(im.getchannel('A')))
        out[n] = im
    match_back(out['back'], out['front'])
    for n, im in out.items():
        save(im, f'fbv_{n}')
    return out


def chest_marks(im):
    """몸통 폭(바닥에서 60px 위 줄의 양끝)과 바닥 가운데"""
    a = tidy(im.getchannel('A'))
    px, (w, h) = a.load(), a.size
    bottom = max(y for y in range(h) if any(px[x, y] == 255 for x in range(0, w, 3)))
    y = bottom - 60
    xs = [x for x in range(w) if px[x, y] == 255]
    return xs[0], xs[-1] + 1, bottom + 1


def chests():
    done = {}
    for n in ('closed', 'peek', 'open'):
        im = load(f'chest-{n}')
        im.putalpha(tidy(im.getchannel('A')))
        l, r, b = chest_marks(im)
        k = BODY_W / (r - l)
        print(f'  chest-{n}: 몸통 x {l}~{r} 바닥 {b} → 배율 {k:.4f}')
        done[n] = place(im, (CHEST, CHEST), k, ((l + r) / 2, b), FOOT)
    seam = FOOT[1] - SEAM
    low = done['closed'].crop((0, seam, CHEST, CHEST))
    for n in ('peek', 'open'):
        im = done[n]
        im.paste(Image.new('RGBA', low.size, (0, 0, 0, 0)), (0, seam))
        im.alpha_composite(low, (0, seam))
    for n, im in done.items():
        im.putalpha(tidy(im.getchannel('A')))
        save(im, f'chest_{n}')
    return done


def check(b, c):
    d = SRC / '_check'
    d.mkdir(exist_ok=True)
    from PIL import ImageDraw
    both = b['back'].copy()
    both.alpha_composite(b['front'])
    g = ImageDraw.Draw(both)
    g.ellipse((C - R, C - R, C + R, C + R), outline=(255, 0, 0, 255), width=2)
    for y in (300, 1330):
        g.line((0, y, BOWL, y), fill=(255, 0, 0, 255), width=2)
    g.rectangle((375, 1330, 1160, 1345), outline=(255, 0, 255, 255), width=2)
    both.save(d / 'fbv_both.png')
    sheet = Image.new('RGBA', (CHEST * 3, CHEST), (200, 230, 245, 255))
    for i, n in enumerate(('closed', 'peek', 'open')):
        sheet.alpha_composite(c[n], (CHEST * i, 0))
        g = ImageDraw.Draw(sheet)
        g.rectangle((CHEST * i + 116, 300, CHEST * i + 396, 460), outline=(255, 0, 0, 255))
        g.line((CHEST * i, 460 - SEAM, CHEST * (i + 1), 460 - SEAM), fill=(255, 0, 255, 255))
    sheet.save(d / 'chest_sheet.png')
    print(f'겹쳐 보기: {d}')


if __name__ == '__main__':
    b, c = bowls(), chests()
    if '--check' in sys.argv:
        check(b, c)
