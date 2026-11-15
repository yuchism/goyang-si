#!/usr/bin/env python3
"""어항 크게 보기 그림 다듬기 (FISHBOWL_VIEW_SPRITE_PLAN.md 4·5장): assets/sprites/*-v1.png → web/r/*.webp
- 원본은 고치지 않는다. 받은 원본은 1254×1254(지시서 2장의 1536·512와 다름)라 여기서 맞춘다
- 어항 뒤·앞: 바깥 테두리 원을 재어(최소제곱 원 맞춤) 지름 1480 · 가운데 (768,768)로 옮긴다.
  두 장 원이 따로 그려져 크기가 조금 다르므로(반지름 618 / 627) 배율도 따로. 그러면 원이 같은 자리·같은 크기
  뒤판: 원 안 알파는 끝까지 255(원본은 252~254), 원 밖 옅은 알파는 지운다
  앞판: 옅은 알파 잔여(반사광·수면선 둘레의 흐린 번짐)를 지운다
- 보물상자 3장: 몸통 폭 280 · 바닥 가운데 (256, 460)에 맞춘다(배율은 그림마다 몸통 폭으로).
  몸통(윗띠 위 테두리 y 314 아래)은 세 장 모두 같은 공통 몸통 = 닫힘 그림에서 걸쇠를 지운 것(5장 '픽셀까지 같게').
  상태마다 다른 것만 그 위에 얹는다: 뚜껑(y 314 위)과, 몸통 위로 내려온 뚜껑 걸쇠·붕어빵·꼬리
  (y 314 위의 밝은 칠에서 이어져 내려온 칠 + 그 테두리). 열림 그림의 몸통 걸쇠는 쓰지 않는다(걸쇠는 뚜껑 것)
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
TOP = 314  # 몸통 윗띠 위 테두리(512 기준). 이 줄부터 아래는 공통 몸통
CLASP = (220, 292, 320, 391)  # 닫힘 그림의 걸쇠 x0, x1, y0, y1 — 공통 몸통에선 옆 판자로 메운다
OUTLINE = 6  # 테두리 두께 한도(512 기준)
HANG = 4  # 칠이 TOP 아래로 이만큼 넘게 내려와야 띠 위로 걸친 것(peek 뚜껑 걸쇠)으로 본다
FILL = 50  # 걸쇠 자리를 메울 때 걸쇠 왼쪽 이만큼 폭을 거울처럼 되풀이


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


def save(im, name, lossless=False):
    """lossless: 보물상자 — 손실 압축이면 공통 몸통이 장마다 조금씩 달라진다"""
    im.save(OUT / f'{name}.webp', 'WEBP', **({'lossless': True} if lossless else {'quality': 88}), method=6)
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


def bright(p):
    return p[3] > 128 and sum(p[:3]) >= 200


def common_body(closed):
    """닫힘 그림의 y TOP 아래에서 걸쇠를 지운 몸통 (판자·띠는 가로로 같으니 걸쇠 왼쪽을 거울처럼 되풀이해 메운다)"""
    body = Image.new('RGBA', closed.size, (0, 0, 0, 0))
    body.paste(closed.crop((0, TOP, CHEST, CHEST)), (0, TOP))
    x0, x1, y0, y1 = CLASP
    bp = body.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            t = (x - x0) % (2 * FILL)
            bp[x, y] = bp[x0 - 1 - t if t < FILL else x0 - 2 * FILL + t, y]
    return body


def lid_part(im, body):
    """상태 그림에서 뚜껑 쪽만: y TOP 위 전부 + 그 위 밝은 칠에서 이어져 TOP 아래로 내려온 칠(걸쇠·붕어빵)과 그 테두리"""
    px = im.load()
    m = Image.new('L', im.size, 0)
    mp = m.load()
    for y in range(TOP):
        for x in range(CHEST):
            mp[x, y] = 255
    deep = set()  # 띠 위로 걸쳐 HANG 넘게 내려온 덩어리(peek 뚜껑 걸쇠)의 칠
    for seed in [(x, TOP) for x in range(CHEST) if bright(px[x, TOP]) and bright(px[x, TOP - 1])]:
        todo, part = [seed], []
        while todo:
            x, y = todo.pop()
            if mp[x, y] or y < TOP or y > TOP + 20 or not bright(px[x, y]):
                continue
            mp[x, y] = 255
            part.append((x, y))
            todo += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        if part and max(y for _, y in part) >= TOP + HANG:
            deep.update(part)
    edge = m.copy()  # 내려온 칠 둘레의 진한 테두리: 칠 끝에서 아래·옆으로 이어진 진한 줄이 OUTLINE 안에서 끝나면 그 줄까지
    ep, bp = edge.load(), body.load()
    dark = lambda x, y: 0 <= x < CHEST and px[x, y][3] > 128 and not bright(px[x, y])
    for y in range(TOP, TOP + 21):
        for x in range(CHEST):
            if not mp[x, y]:
                continue
            for dx, dy in ((0, 1), (1, 0), (-1, 0)):
                run = []
                u, v = x + dx, y + dy
                while dark(u, v) and len(run) <= OUTLINE:
                    run.append((u, v))
                    u, v = u + dx, v + dy
                if len(run) > OUTLINE:  # 더 길면 그 그림 몸통의 띠·걸쇠 테두리라 공통 몸통 것을 둔다
                    continue
                if dy and (x, y) not in deep:  # 띠 위 테두리에 얹혔을 뿐인 칠(붕어빵 배)은 공통 몸통 테두리 안까지만
                    run = [q for q in run if not bright(bp[q])]
                for q in run:
                    ep[q] = 255
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.paste(im, (0, 0), edge)
    return out


def on_body(im, body, clasp=False):
    """공통 몸통 위에 뚜껑 쪽을 얹는다. clasp: 닫힘 — 뚜껑 걸쇠가 몸통 윗띠에 채워져 있다(뚜껑과 테두리로 떨어져 있어 따로 얹음)"""
    out = body.copy()
    out.alpha_composite(lid_part(im, body))
    if clasp:
        x0, x1, y0, y1 = CLASP
        out.paste(im.crop((x0, y0, x1, y1)), (x0, y0))
    return out


def chests():
    done = {}
    for n in ('closed', 'peek', 'open'):
        im = load(f'chest-{n}')
        im.putalpha(tidy(im.getchannel('A')))
        l, r, b = chest_marks(im)
        k = BODY_W / (r - l)
        print(f'  chest-{n}: 몸통 x {l}~{r} 바닥 {b} → 배율 {k:.4f}')
        done[n] = place(im, (CHEST, CHEST), k, ((l + r) / 2, b), FOOT)
    body = common_body(done['closed'])
    for n in ('closed', 'peek', 'open'):
        done[n] = on_body(done[n], body, n == 'closed')
    for n, im in done.items():
        im.putalpha(tidy(im.getchannel('A')))
        save(im, f'chest_{n}', lossless=True)
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
        g.line((CHEST * i, TOP, CHEST * (i + 1), TOP), fill=(255, 0, 255, 255))
    sheet.save(d / 'chest_sheet.png')
    print(f'겹쳐 보기: {d}')


if __name__ == '__main__':
    b, c = bowls(), chests()
    if '--check' in sys.argv:
        check(b, c)
