#!/usr/bin/env python3
"""web/f/meta.json, web/r/meta.json을 그림 파일과 맞춘다.

- 이미 있는 항목은 그대로 둔다 (손으로 맞춘 발 기준점을 지키기 위해).
- 새 그림이 있으면 추가한다.
    f/ (캐릭터 프레임): [폭, 높이, 발 기준점 x, y]. 기준점은 그림 아래쪽 가운데로 일단 채운다. 필요하면 손으로 고친다.
    r/ (방 소품):       [폭, 높이]
- 크기가 바뀐 그림은 크기만 고친다.
- 파일이 없어진 항목은 알려만 주고 지우지 않는다 (--prune을 주면 지운다).
- --check: 아무것도 고치지 않고 맞는지만 본다. 그림은 있는데 meta.json에 없거나(그 그림은 화면에 안 나온다),
  meta.json에만 있고 그림이 없으면 실패(종료 코드 1). 배포(.github/workflows/pages.yml)가 올리기 전에 돌린다.
  Pillow가 없어도 돈다 (있으면 크기도 본다).
- r/tv/ 는 따로 r/tv/meta.json을 쓰므로 건드리지 않는다. .png 큰 시트(생일 춤, 케이크)는 코드(js/assets.js)에 따로 적혀 있다.

쓰는 법:  python3 tools/build_meta.py          (고양시 폴더에서)
          python3 tools/build_meta.py --check  (확인만)
필요한 것: Pillow (pip3 install pillow)
"""
import json, os, sys
try:
    from PIL import Image
except ImportError:  # --check는 Pillow 없이도 이름만 맞춰 본다
    Image = None

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web')
PRUNE = '--prune' in sys.argv
CHECK = '--check' in sys.argv


def dump(d):
    return '{\n' + ',\n'.join(f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v)}' for k, v in d.items()) + '\n}\n'


def scan(folder, skip=()):
    out = {}
    base = os.path.join(ROOT, folder)
    for dp, dns, fns in os.walk(base):
        rel = os.path.relpath(dp, base)
        if rel.split(os.sep)[0] in skip:
            continue
        for fn in sorted(fns):
            if fn.endswith('.webp'):
                key = (fn[:-5] if rel == '.' else rel.replace(os.sep, '/') + '/' + fn[:-5])
                out[key] = os.path.join(dp, fn)
    return out


def foot(path):
    im = Image.open(path).convert('RGBA')
    a = im.getchannel('A')
    box = a.point(lambda v: 255 if v > 128 else 0).getbbox() or (0, 0, im.width, im.height)
    return [im.width, im.height, round((box[0] + box[2]) / 2, 1), float(box[3] - 1)]


def update(folder, kind, skip=()):
    meta_path = os.path.join(ROOT, folder, 'meta.json')
    meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {}
    files = scan(folder, skip)
    added, resized, missing = [], [], []
    for key, path in files.items():
        w, h = Image.open(path).size
        if key not in meta:
            meta[key] = foot(path) if kind == 'frame' else [w, h]
            added.append(key)
        elif meta[key][:2] != [w, h]:
            meta[key][:2] = [w, h]
            resized.append(key)
    for key in list(meta):
        if key not in files:
            missing.append(key)
            if PRUNE:
                del meta[key]
    open(meta_path, 'w', encoding='utf-8').write(dump(meta))
    print(f'{folder}/meta.json: {len(meta)}개', '| 추가', added or '-', '| 크기 고침', resized or '-',
          '| 파일 없음' + (' (지움)' if PRUNE else ''), missing or '-')


def check(folder, skip=()):
    meta_path = os.path.join(ROOT, folder, 'meta.json')
    meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {}
    files = scan(folder, skip)
    bad = []
    for key in files:
        if key not in meta:
            bad.append(f'{folder}/{key}.webp: meta.json에 없음 (화면에 안 나온다)')
        elif Image is not None and list(Image.open(files[key]).size) != meta[key][:2]:
            bad.append(f'{folder}/{key}.webp: 크기가 meta.json과 다름 {list(Image.open(files[key]).size)} != {meta[key][:2]}')
    for key in meta:
        if key not in files:
            bad.append(f'{folder}/meta.json의 {key}: 그림 파일이 없음')
    print(f'{folder}/meta.json: 그림 {len(files)}개, 항목 {len(meta)}개' + (' — 맞음' if not bad else ''))
    for b in bad:
        print('  ✗', b)
    return bad


if CHECK:
    if Image is None:
        print('(Pillow 없음: 크기는 보지 않고 이름만 맞춰 본다)')
    bad = check('f') + check('r', skip=('tv',))
    if bad:
        print(f'\n맞지 않는 곳 {len(bad)}군데. python3 tools/build_meta.py 로 채운 뒤 다시 올리세요.')
        sys.exit(1)
    sys.exit(0)
if Image is None:
    sys.exit('Pillow가 필요하다: pip3 install pillow')
update('f', 'frame')
update('r', 'room', skip=('tv',))
