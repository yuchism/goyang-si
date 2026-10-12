# 두 점검 폴더의 화면을 픽셀 단위로 비교한다.
# 쓰는 법: python3 tools/compare.py shots_before shots_after
import os, sys
from PIL import Image, ImageChops

a, b = sys.argv[1], sys.argv[2]
bad = 0
for f in sorted(os.listdir(a)):
    if not f.endswith('.png'):
        continue
    if not os.path.exists(os.path.join(b, f)):
        print('없음', f); bad += 1; continue
    x = Image.open(os.path.join(a, f)).convert('RGB')
    y = Image.open(os.path.join(b, f)).convert('RGB')
    if x.size != y.size:
        print('크기 다름', f); bad += 1; continue
    box = ImageChops.difference(x, y).getbbox()
    if box:
        print('다름', f, box); bad += 1
print('다른 화면', bad, '개')
sys.exit(1 if bad else 0)
