#!/usr/bin/env python3
"""베란다 층을 위해 방 배경(web/r/bg.webp)에서 창틀만 떼어 낸 그림을 만든다. WINDOW_PLAN.md 3장.

창밖에 그리는 것은 모두 방 배경에 박힌 난간 창살 **뒤**로 간다. 베란다 손님(난간의 새, 작은 검은 고양이)은
난간 **앞**(유리창과 난간 사이)에 와야 하므로, 방 배경을 그린 뒤 베란다 손님을 그리고 그 위에 창틀만 다시 덮는다.
  창밖 → 방 배경(지금 그대로, 난간 포함) → 베란다 손님 → 창틀(이 그림) → 커튼·방 안
- 방 배경은 바꾸지 않는다. 베란다 손님이 없을 때는 창틀을 덮지 않으므로 화면이 전과 픽셀 단위로 같다.
  (방 배경을 난간/나머지 두 장으로 나눠 따로 그리면, 줄여 그릴 때 두 그림의 경계 픽셀이 섞이는 방식이 달라
   경계에서 화면이 조금 달라진다. 그래서 나누지 않고 덮는 쪽을 택했다)
- 창틀 그림 = 창 영역(objects.json window.area) 안의 불투명 픽셀 중 **난간이 아닌 것**(창틀 기둥·바깥 창틀·창 아랫단).
  난간 = 난간 줄(bg y RAIL_TOP ~ SILL-1)에서 창틀 기둥 열이 아닌 불투명 픽셀(반투명 가장자리 포함).
  창틀 기둥 = 난간 위쪽 줄(y 100~480)에서도 불투명한 열.
- 크기는 방 배경과 같게(1561×989) 두어 같은 자리·같은 비율로 그린다(줄일 때 픽셀 격자가 방 배경과 맞는다). 무손실 webp.
- 확인: 창틀 + 난간을 겹치면 창 영역 안의 방 배경과 픽셀 단위로 같다(차이 0이 아니면 저장하지 않음).
- 유리 가림 검사(js/glass.js)도 이 그림의 알파를 쓴다(투명 = 유리 또는 난간 = 베란다에서 보이는 곳).

쓰는 법:  python3 tools/split_railing.py   (고양시 폴더에서) → web/r/window_frame.webp
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web')
R = os.path.join(ROOT, 'r')
RAIL_TOP, SILL, MULLION_ROWS = 490, 602, (100, 480)  # bg 픽셀 y
vis = lambda x: np.where(x[..., 3:] > 0, x, 0)  # 완전 투명 픽셀의 색은 보이지 않으니 비교에서 뺀다


def main():
    objs = json.load(open(os.path.join(ROOT, 'scenes', 'room', 'objects.json'), encoding='utf-8'))['objects']
    win = next(o for o in objs if o.get('id') == 'window')
    im = Image.open(os.path.join(R, 'bg.webp')).convert('RGBA')
    k = im.width / 1200
    x0, y0, w, h = win['area']
    X0, X1, Y1 = int(x0 * k), int(np.ceil((x0 + w) * k)), int(np.ceil((y0 + h + 4) * k))  # 창 영역 (draw.js 창밖 clip과 같은 아래 끝 +4)
    a = np.array(im)
    al = a[..., 3]
    mull = (al[MULLION_ROWS[0]:MULLION_ROWS[1], :] > 0).any(axis=0)
    rail = np.zeros(al.shape, bool)
    rail[RAIL_TOP:SILL, X0:X1] = al[RAIL_TOP:SILL, X0:X1] > 0
    rail[:, mull] = False
    inwin = np.zeros(al.shape, bool)
    inwin[0:Y1, X0:X1] = True
    frame = inwin & (al > 0) & ~rail
    fr = np.zeros_like(a)
    fr[frame] = a[frame]
    rl = np.zeros_like(a)
    rl[rail] = a[rail]
    out = np.array(Image.alpha_composite(Image.fromarray(rl), Image.fromarray(fr)))
    ref = np.where(inwin[..., None], a, 0)
    diff = int((vis(out).astype(int) != vis(ref).astype(int)).any(axis=-1).sum())
    ys, xs = np.where(rail)
    print(f'난간 픽셀 {int(rail.sum())}개 (반투명 {int(((al > 0) & (al < 255) & rail).sum())}개), 범위 x {xs.min()}~{xs.max()} y {ys.min()}~{ys.max()}')
    print(f'창틀 픽셀 {int(frame.sum())}개. 창틀 + 난간과 창 영역 방 배경의 차이: {diff}픽셀')
    if diff:
        sys.exit('차이가 0이 아니다. 저장하지 않음')
    path = os.path.join(R, 'window_frame.webp')
    Image.fromarray(fr).save(path, 'WEBP', lossless=True, method=6)
    back = np.array(Image.open(path).convert('RGBA'))
    d2 = int((vis(back).astype(int) != vis(fr).astype(int)).any(axis=-1).sum())
    print(f'저장 후 다시 읽은 차이: {d2}픽셀')
    if d2:
        sys.exit('저장한 파일이 원래와 다르다 (무손실 확인 실패)')
    print('window_frame.webp 저장. python3 tools/build_meta.py 로 meta.json을 채운다')


main()
