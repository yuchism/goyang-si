#!/usr/bin/env python3
"""쥐구멍 기지 밤 그림 굽기: 낮 그림(web/base/bg.webp)에 남보라빛을 곱해(multiply) web/base/bg-night.webp를 만든다.
색을 돌리지 않으니 붉은 카펫·금테가 그대로, 조명만 낮춘 밤. 그림 한 장이라 브라우저 다크 모드가 바꿔 칠하지 못한다.
  python3 tools/base_night.py [색, 기본 #555c95]"""
import sys
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent / 'web' / 'base'
color = sys.argv[1] if len(sys.argv) > 1 else '#555c95'
rgb = tuple(int(color.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))
day = Image.open(ROOT / 'bg.webp').convert('RGB')
night = ImageChops.multiply(day, Image.new('RGB', day.size, rgb))
night.save(ROOT / 'bg-night.webp', 'WEBP', quality=86, method=6)
print(f'bg-night.webp {night.size[0]}×{night.size[1]} ({color})')
