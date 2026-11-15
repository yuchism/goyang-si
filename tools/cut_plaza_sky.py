#!/usr/bin/env python3
"""크리스마스 광장 풍경화(web/plaza/xmas-night.webp)의 하늘을 투명하게 뺀다. tasks/xmas-plaza-art.md 메모.

원본 assets/plaza/xmas-night-source-v2.png(1536×1024)에서 다시 만든다(웹 그림을 다시 읽으면 손실 압축이 겹친다):
가로 1561·세로 998로 줄이고, 위에 하늘 30px를 덧대고(맨 위 8줄 평균색), 아래 39px를 잘라 1561×989.

하늘 고르기: 하늘은 거의 한 색(남색 #0D1C49 근처)이라 위에서부터 채우지 않고 색으로 고른다 —
전구 줄 아래·건물 사이에 갇힌 하늘도 같이 빠진다. 하늘색과의 거리(RGB 유클리드)가
LO 이하면 투명, HI 이상이면 불투명, 그 사이는 부드럽게. 반투명 가장자리는 하늘색을 빼서
앞 색만 남긴다(어두운 하늘 테두리가 남지 않게). y 700 아래(땅·소품)는 건드리지 않는다.

쓰는 법:  python3 tools/cut_plaza_sky.py   (고양시 폴더에서) → web/plaza/xmas-night.webp
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', 'plaza', 'xmas-night-source-v2.png')
OUT = os.path.join(ROOT, 'web', 'plaza', 'xmas-night.webp')
W, H, SCALED_H, PAD_TOP = 1561, 989, 998, 30
SKY = (13, 28, 73)   # 원본 하늘 최빈색
LO, HI = 8, 40       # 하늘색과의 거리: LO 이하 투명, HI 이상 불투명
KEEP_Y = 700         # 이 줄부터 아래는 그대로


def landscape():
    src = Image.open(SRC).convert('RGB')
    top = src.crop((0, 0, src.width, 8)).resize((1, 1), Image.BOX).getpixel((0, 0))
    scaled = src.resize((W, SCALED_H), Image.LANCZOS)
    im = Image.new('RGB', (W, H), top)
    im.paste(scaled.crop((0, 0, W, H - PAD_TOP)), (0, PAD_TOP))
    return im


def cut_sky(im):
    rgba = im.convert('RGBA')
    px = rgba.load()
    for y in range(KEEP_Y):
        for x in range(im.width):
            r, g, b, _ = px[x, y]
            d = ((r - SKY[0]) ** 2 + (g - SKY[1]) ** 2 + (b - SKY[2]) ** 2) ** 0.5
            if d >= HI:
                continue
            if d <= LO:
                px[x, y] = (0, 0, 0, 0)
                continue
            a = (d - LO) / (HI - LO)
            # 반투명: 보이는 색 = a·앞색 + (1-a)·하늘 → 앞색을 되살린다
            fg = [min(255, max(0, round((c - (1 - a) * s) / a))) for c, s in zip((r, g, b), SKY)]
            px[x, y] = (*fg, round(a * 255))
    return rgba


def main():
    out = cut_sky(landscape())
    out.save(OUT, 'WEBP', quality=86, method=6, exact=False)
    clear = sum(1 for a in out.getchannel('A').getdata() if a == 0)
    print(f'{OUT}: {out.size} 투명 {clear}px ({clear / (W * H):.1%})')


if __name__ == '__main__':
    main()
