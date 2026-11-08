#!/usr/bin/env python3
"""쥐구멍 기지 식구 그림 다듬기 (BASE_FAMILY_A_ART.md 7절): assets/base/*-source-v1.png → web/base/fam/*.webp
- 원본은 고치지 않는다. 옅은 알파 잔여(그림 둘레 밖의 흐린 점·번짐)는 걷어 낸다
- 짝인 그림은 기준선을 맞춰 같은 캔버스로 (그림마다 따로 바짝 자르지 않는다 — 바꿔 끼울 때 튀지 않게)
  왕 5장: 엉덩이·발 아래(앉는 면) → y 210, 몸 가운데 → x 128 (256×256, 지시서 512 기준의 절반). 배율은 5장 같음
  고양이: 바닥선 → y 240, 꼬리 뒤끝 → x 246 (256×256)
  상자 2장: 닫힘 그림의 아래 몸통을 열림 그림에도 써서 몸통을 같게, 바닥 가운데 → (96, 150) (192×160)
- 기준점·배율은 web/base/scene.json fam.art에 적는다(이 스크립트가 출력한 값)
  python3 tools/base_family_art.py [--check]   (--check: assets/base/_check/에 겹쳐 본 그림)"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'base'
OUT = ROOT / 'web' / 'base' / 'fam'
KINGS = ['sit', 'seal', 'chin', 'doze', 'cheer']
FAINT = 24  # 이보다 옅은 알파는 잔여로 보고 지운다
SOLID = 40  # 그림 둘레(바운딩 상자)를 재는 알파


def load(name):
    return Image.open(SRC / f'{name}-source-v1.png').convert('RGBA')


def clean(im, pad=6):
    """옅은 알파를 지우고, 진한 그림 둘레(pad px) 밖은 모두 투명으로"""
    a = im.getchannel('A')
    box = a.point(lambda v: 255 if v > SOLID else 0).getbbox()
    a = a.point(lambda v: 0 if v < FAINT else v)
    keep = Image.new('L', im.size, 0)
    keep.paste(255, (max(0, box[0] - pad), max(0, box[1] - pad), min(im.size[0], box[2] + pad), min(im.size[1], box[3] + pad)))
    out = im.copy()
    out.putalpha(Image.composite(a, keep, keep))
    return out


def runs(a, y, t=SOLID):
    px, w = a.load(), a.size[0]
    out, s = [], None
    for x in range(w):
        on = px[x, y] > t
        if on and s is None:
            s = x
        if not on and s is not None:
            out.append((s, x - 1))
            s = None
    if s is not None:
        out.append((s, w - 1))
    return out


def place(im, size, k, src_pt, dst_pt):
    """src_pt를 dst_pt에 오게 k배로 줄여 size 캔버스에"""
    w, h = round(im.size[0] * k), round(im.size[1] * k)
    small = im.resize((w, h), Image.LANCZOS)
    can = Image.new('RGBA', size, (0, 0, 0, 0))
    can.alpha_composite(small, (round(dst_pt[0] - src_pt[0] * k), round(dst_pt[1] - src_pt[1] * k)))
    return can


def save(im, name):
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / f'{name}.webp', 'WEBP', quality=86, method=6)
    print(f'{name}.webp {im.size[0]}×{im.size[1]} 그림 둘레 {im.getchannel("A").getbbox()}')


def king_marks(a):
    """몸 가운데(엉덩이 높이 줄의 가운데)와 앉는 면(몸통 아래 끝 — 꼬리는 빼고)"""
    w, h = a.size
    hip = round(h * 0.68)  # 1254 원본의 y 850 근처: 엉덩이 둘레 줄
    r = max(runs(a, hip), key=lambda r: r[1] - r[0])
    cx = (r[0] + r[1]) / 2
    seat = hip
    for y in range(hip, h):
        if any(s < cx + 60 and e > cx - 150 for s, e in runs(a, y)):
            seat = y
    return cx, seat


def kings():
    K = 0.2  # 원본 1254 → 웹: 지시서 512 캔버스 배율 0.4의 절반. 손끝 y ≥ 15·왕관 ≥ 30·꼬리 ≤ 245 (256 기준)
    for n in KINGS:
        im = clean(load(f'king-{n}'))
        cx, seat = king_marks(im.getchannel('A'))
        print(f'  king-{n}: 몸 가운데 x {cx:.0f}, 앉는 면 y {seat}')
        save(place(im, (256, 256), K, (cx, seat), (128, 210)), f'king-{n}')


def cat():
    im = clean(load('cat-scroll'))
    a = im.getchannel('A')
    box = a.point(lambda v: 255 if v > SOLID else 0).getbbox()
    K = 0.19  # 귀·꼬리·두루마리 둘레 10px(512 기준 20px) 안에 들어가는 가장 큰 배율
    save(place(im, (256, 256), K, (box[2], box[3]), (246, 240)), 'cat-scroll')


def chests():
    op, cl = clean(load('chest-open')), clean(load('chest-closed'))
    # 아래 몸통(판재·금테·자물쇠 아래쪽)을 닫힘 그림으로 같게: 열림 그림과 1px 어긋나 있어 맞춰 붙인다
    SEAM, DX, DY = 800, 1, 1
    body = cl.crop((0, SEAM - DY, cl.size[0], cl.size[1]))
    op2 = op.copy()
    op2.paste(Image.new('RGBA', (op.size[0], op.size[1] - SEAM), (0, 0, 0, 0)), (0, SEAM))
    op2.alpha_composite(body, (DX, SEAM))
    cl2 = Image.new('RGBA', cl.size, (0, 0, 0, 0))
    cl2.alpha_composite(cl, (DX, DY))
    a = cl2.getchannel('A')
    box = a.point(lambda v: 255 if v > SOLID else 0).getbbox()
    body_w = box[2] - box[0]
    K = 130 / body_w  # 몸통 폭 260(384 기준) → 192 캔버스에서 130
    pt = ((box[0] + box[2]) / 2, box[3])
    for n, im in (('open', op2), ('closed', cl2)):
        save(place(im, (192, 160), K, pt, (96, 150)), f'chest-{n}')


def check():
    """겹쳐 보기: 왕 5장 · 고양이(cat_type_1 + 두루마리) · 상자 2장. 기준선은 빨강"""
    from PIL import ImageDraw
    d = SRC / '_check'
    d.mkdir(exist_ok=True)
    sheet = Image.new('RGBA', (256 * 5, 256 * 2 + 160), (90, 150, 90, 255))
    for i, n in enumerate(KINGS):
        sheet.alpha_composite(Image.open(OUT / f'king-{n}.webp'), (256 * i, 0))
        over = Image.open(OUT / f'king-{n}.webp').copy()
        over.putalpha(over.getchannel('A').point(lambda v: v // 3))
        sheet.alpha_composite(over, (0, 256))
    sheet.alpha_composite(Image.open(OUT / 'cat-scroll.webp'), (256, 256))
    sheet.alpha_composite(Image.open(OUT / 'chest-open.webp'), (512, 256))
    sheet.alpha_composite(Image.open(OUT / 'chest-closed.webp'), (704, 256))
    dr = ImageDraw.Draw(sheet)
    for i in range(5):
        dr.line([(256 * i, 210), (256 * i + 255, 210)], fill='red')
        dr.line([(256 * i + 128, 0), (256 * i + 128, 255)], fill='red')
    dr.line([(256, 496), (511, 496)], fill='red')
    dr.line([(512, 406), (895, 406)], fill='red')
    sheet.save(d / 'fam_align.png')
    print(d / 'fam_align.png')
    scene(d)


def scene(d):
    """바탕(낮·밤) 위 제자리 합성: scene.json fam 값을 family.js와 같은 셈으로 (타자 · 앉은 왕 · 열린 상자 · 어항 · 횃대 까치)"""
    import json
    W = ROOT / 'web'
    cfg = json.loads((W / 'base' / 'scene.json').read_text())
    F = cfg['fam']
    fm = json.loads((W / 'f' / 'meta.json').read_text())
    rm = json.loads((W / 'r' / 'meta.json').read_text())

    def put(can, path, meta, at, s, flip=False):
        im = Image.open(path).convert('RGBA')
        w, h, ax, ay = meta[:4]
        im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
        if flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
            ax = w - ax
        can.alpha_composite(im, (round(at[0] - ax * s), round(at[1] - ay * s)))

    for bg in ('bg', 'bg-night'):
        can = Image.open(W / 'base' / f'{bg}.webp').convert('RGBA')
        b = F['bowl']
        m = rm['fishbowl_back']
        s = b['w'] / m[0]
        for part in ('fishbowl_back', 'fishbowl_front'):
            put(can, W / 'r' / f'{part}.webp', [*rm[part], rm[part][0] / 2, rm[part][1]], b['at'], s)
        c = F['chest']
        put(can, OUT / 'chest-open.webp', F['art']['chest-open'], c['at'], c['w'] / 192)
        a = F['art']['king-sit']
        put(can, OUT / 'king-sit.webp', a, F['king'], F['k'] / a[4])
        put(can, W / 'f' / 'cat_type_1.webp', fm['cat_type_1'], F['cat'], F['k'], flip=True)
        mg = F['magpie']
        put(can, W / 'r' / 'fx' / 'magpie_sit.webp', [*rm['fx/magpie_sit'], 97, 132], mg['at'], mg['w'] / 194)
        out = d / f'fam_scene_{bg}.png'
        can.save(out)
        print(out)


if __name__ == '__main__':
    kings()
    cat()
    chests()
    if '--check' in sys.argv:
        check()
