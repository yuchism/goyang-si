#!/usr/bin/env python3
"""승인된 광장 손님 원본을 정렬하고 웹 시트·검수용 GIF/합성을 만든다.

실행: python3 tools/make_plaza_guests.py (Pillow만 필요)
원본은 덮어쓰지 않는다. XMAS_PLAZA_GUEST_ART.md 규격.
"""
from pathlib import Path
import json
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / 'assets/plaza/guests/_review'  # 검수용 정렬 그림·gif·합성 (git 무시, 커밋하지 않음)
WEB = ROOT / 'web/plaza/guests'
CELL, HEIGHT, FOOT, SCALE = 512, 768, 730, 0.75
# 목표 키, 공중에서 발이 뜨는 높이. 깡충은 ⑤의 키로 같은 배율을 쓴다.
GUESTS = {
    'koala': (476, (0, 0, 0, 0, 0)),
    'kangaroo': (700, (0, 40, 50, 0, 0)),
    'rabbit': (448, (0, 40, 60, 0, 0)),
    'sheep': (476, (0, 0, 0, 0, 0)),
    'dog': (504, (0, 0, 0, 0, 0)),
    'wombat': (392, (0, 0, 0, 0, 0)),
    'wolf-sheep-disguise': (490, (0, 0, 0, 0, 0)),  # 양 탈을 쓴 늑대 (주인이 ChatGPT로 직접 그림, 2026-11-16)
}


def clean(im):
    """옅은 잔여를 지우고, 실체에 닿은 가장자리 알파만 보존한다."""
    alpha = im.getchannel('A')
    core = alpha.point(lambda a: 255 if a >= 96 else 0)
    near = core.filter(ImageFilter.MaxFilter(5))
    im.putalpha(Image.frombytes('L', im.size, bytes(
        a if a > 24 and n else 0
        for a, n in zip(alpha.tobytes(), near.tobytes()))))
    return im.crop(im.getbbox())


def body_center(im):
    # 몸 위쪽의 불투명 무게중심: 발·긴 꼬리가 중심을 끌지 않게 한다.
    a = im.getchannel('A')
    band = a.crop((0, im.height // 4, im.width, im.height * 2 // 3))
    weights = [sum(band.crop((x, 0, x + 1, band.height)).getdata())
               for x in range(im.width)]  # (Pillow getdata 경고는 무시해도 됨)
    return sum(x * w for x, w in enumerate(weights)) / sum(weights)


def convert(name, target, lifts):
    src = Image.open(ROOT / f'assets/plaza/guests/{name}-walk-source-v1.png').convert('RGBA')
    parts = [clean(src.crop((round(i * src.width / 5), 0,
                            round((i + 1) * src.width / 5), src.height)))
             for i in range(5)]
    sheet = Image.new('RGBA', (CELL * 5, HEIGHT))
    frames, metrics = [], []
    for i, part in enumerate(parts):
        k = target / (parts[4].height if any(lifts) else part.height)
        size = (round(part.width * k), round(part.height * k))
        part = part.resize(size, Image.Resampling.LANCZOS)
        x = round(CELL / 2 - body_center(part))
        x = max(2, min(x, CELL - 2 - part.width))
        y = FOOT - lifts[i] - part.height
        assert x >= 2 and x + part.width <= CELL - 2 and y >= 0, (name, i, size)
        frame = Image.new('RGBA', (CELL, HEIGHT))
        frame.alpha_composite(part, (x, y))
        sheet.alpha_composite(frame, (CELL * i, 0))
        frames.append(frame)
        metrics.append({'height': part.height, 'bottom': FOOT - lifts[i],
                        'left': x, 'width': part.width})
    sheet.save(REVIEW / f'{name}-aligned.png')
    web = sheet.resize((1920, 576), Image.Resampling.LANCZOS)
    web.save(WEB / f'{name}-walk.webp', quality=86, alpha_quality=100, method=6)
    # 고정 팔레트·밝은 배경: GIF 투명색의 가장자리 번짐 없이 동작 확인.
    preview = []
    for frame in frames[:4]:
        bg = Image.new('RGBA', frame.size, '#e7ecf0')
        bg.alpha_composite(frame)
        preview.append(bg.convert('RGB').resize((256, 384), Image.Resampling.LANCZOS))
    palette = Image.new('RGB', (256 * 4, 384))
    for i, frame in enumerate(preview):
        palette.paste(frame, (i * 256, 0))
    palette = palette.quantize(colors=255)
    gif = [frame.quantize(palette=palette) for frame in preview]
    gif[0].save(REVIEW / f'{name}-walk.gif', save_all=True,
                append_images=gif[1:], duration=150, loop=0, disposal=2)
    return frames, metrics


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    WEB.mkdir(parents=True, exist_ok=True)
    plaza = Image.open(ROOT / 'web/plaza/xmas-night.webp').convert('RGBA')
    overview = Image.new('RGBA', plaza.size, '#18243b')
    overview.alpha_composite(plaza)
    metrics = {}
    # 검수 합성 전용 자리. 실제 장면 설정·동작에는 사용하지 않는다.
    for (name, (height, lifts)), x in zip(GUESTS.items(), (130, 340, 550, 760, 970, 1180, 1390)):
        frames, metrics[name] = convert(name, height, lifts)
        frame = frames[0].resize((round(CELL * .42), round(HEIGHT * .42)), Image.Resampling.LANCZOS)
        overview.alpha_composite(frame, (round(x - CELL * .42 / 2), round(940 - FOOT * .42)))
        print(name, metrics[name])
    overview.save(REVIEW / '_overview.png')
    (REVIEW / 'metrics.json').write_text(json.dumps({
        'aligned': [2560, 768], 'cell': [512, 768], 'foot': FOOT,
        'web': [1920, 576], 'webCell': [384, 576], 'webFoot': FOOT * SCALE,
        'scale': SCALE, 'overviewScale': .42, 'frames': metrics,
    }, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
