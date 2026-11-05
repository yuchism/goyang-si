#!/usr/bin/env python3
"""만화방 회차 도구 (tasks/manhwa-viewer.md)

  python3 tools/build_manhwa.py csf 3 [--open YYYY-MM-DD] [--title "제목"]
      원고 assets/manhwa/csf/3/01.png, 02.jpg … 를 웹 그림으로 바꾼다.
      - 장마다 위아래 바깥 여백·테두리(색이 고른 줄)를 잘라낸다. 안쪽 칸 테두리는 줄 전체가 고르지 않으므로 남는다
      - 폭 1080px로 맞추고, 긴 장은 세로 조각(최대 약 2000px)으로 → web/manhwa/csf/<이름>/01.webp, 02.webp …
      - 장과 장 사이에는 그 장 바탕색으로 PAGE_GAP만큼 띄운다(여백을 다 자르면 다음 장 칸이 바로 붙으므로)
      - 처음이면 이름(소문자·숫자 5자)을 뽑아 episodes.json에 회차를 더한다(공개일 --open, 없으면 오늘 서울 날짜)
      - 다시 돌리면 그림만 다시 만든다(이름은 그대로). --open·--title을 주면 그 칸도 바꾼다
      - 회차 HTML(index.html, 공유 미리보기 og.jpg)과 목록 web/manhwa/csf/index.html도 같이 만든다
  python3 tools/build_manhwa.py csf
      그림은 두고 HTML만 다시 만든다 (episodes.json에서 제목을 고친 뒤)
  python3 tools/build_manhwa.py csf --check
      episodes.json과 파일(조각·크기·HTML·og.jpg)이 맞는지만 본다. 맞지 않으면 종료 코드 1
"""
import argparse
import datetime
import hashlib
import html
import io
import json
import re
import secrets
import shutil
import sys
import tempfile
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://goyang.si'
WIDTH = 1080          # 조각 폭
MAX_H = 2000          # 한 조각 최대 높이 (약)
PAGE_GAP = 48         # 장 사이 띄움 (폭 1080 기준)
TOL = 24              # 같은 색으로 보는 차이 (jpg 잡티)
NOISE = 0.003         # 한 줄에서 이만큼(비율)까지는 다른 색이 섞여도 고른 줄
SLUG_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789'  # 0·o·1·l 뺌
SLUG_LEN = 5
OG_W, OG_H = 1200, 630
SRC_EXT = ('.png', '.jpg', '.jpeg')


def paths(work):
    return ROOT / 'assets/manhwa' / work, ROOT / 'web/manhwa' / work


def today_seoul():
    return datetime.datetime.now(ZoneInfo('Asia/Seoul')).date().isoformat()


def load_json(work):
    f = paths(work)[1] / 'episodes.json'
    if not f.exists():
        sys.exit(f'✗ {f.relative_to(ROOT)}가 없습니다')
    return json.loads(f.read_text('utf8'))


def save_json(work, data):
    f = paths(work)[1] / 'episodes.json'
    data['episodes'].sort(key=lambda e: e['no'])
    f.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', 'utf8')


# ── 그림 ───────────────────────────────────────────────

def flat(im):
    """투명은 흰 바탕에 얹어 RGB로"""
    if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
        im = im.convert('RGBA')
        bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
        return Image.alpha_composite(bg, im).convert('RGB')
    return im.convert('RGB')


def row_color(im, y):
    """줄 y가 고른 색이면 그 색(r,g,b), 아니면 None"""
    w = im.width
    hist = im.crop((0, y, w, y + 1)).histogram()
    color = []
    for c in range(3):
        h = hist[c * 256:(c + 1) * 256]
        # 가장 많은 값 근처(±TOL)에 거의 다 들어가야 고른 줄
        peak = max(range(256), key=lambda v: h[v])
        near = sum(h[max(0, peak - TOL):peak + TOL + 1])
        if w - near > w * NOISE:
            return None
        color.append(peak)
    return tuple(color)


def trim(im):
    """위아래로 고른 줄(바깥 여백·바깥 테두리)을 잘라낸다. 바탕색(맨 위 줄 색)도 돌려준다"""
    top, bot = 0, im.height
    bg = row_color(im, 0) or (255, 255, 255)
    while top < bot and row_color(im, top) is not None:
        top += 1
    while bot > top and row_color(im, bot - 1) is not None:
        bot -= 1
    if bot <= top:
        return None, bg
    return im.crop((0, top, im.width, bot)), bg


def cut_points(im):
    """긴 장을 MAX_H 안의 조각으로 나눌 자리. 될 수 있으면 칸 사이(고른 줄)에서 자른다"""
    h = im.height
    cuts, start = [], 0
    while h - start > MAX_H:
        left = -(-(h - start) // MAX_H)          # 남은 조각 수
        target = start + (h - start) // left
        best = None
        lo, hi = max(start + MAX_H // 2, target - MAX_H // 4), min(start + MAX_H, target + MAX_H // 4)
        for d in range(0, max(target - lo, hi - target) + 1):
            for y in (target - d, target + d):
                if lo <= y <= hi and row_color(im, y) is not None:
                    best = y
                    break
            if best is not None:
                break
        y = best if best is not None else min(target, start + MAX_H)
        cuts.append(y)
        start = y
    return cuts


def sources(work, no):
    d = paths(work)[0] / str(no)
    if not d.is_dir():
        sys.exit(f'✗ 원고 폴더가 없습니다: {d.relative_to(ROOT)}  (01.png, 02.jpg … 를 넣어 주세요)')
    files = sorted(f for f in d.iterdir() if f.suffix.lower() in SRC_EXT)
    if not files:
        sys.exit(f'✗ 원고가 없습니다: {d.relative_to(ROOT)}  (png·jpg)')
    return files


def build_images(work, ep):
    """임시 폴더에서 변환을 끝낸 뒤에만 기존 그림을 바꾼다 (중간에 멈춰도 기존 회차는 그대로)"""
    files = sources(work, ep['no'])
    base = paths(work)[1]
    base.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix=f'.{ep["slug"]}-', dir=base))
    try:
        heights, v = convert(files, tmp)
        out = base / ep['slug']
        out.mkdir(exist_ok=True)
        for old in [*out.glob('*.webp'), out / 'og.jpg']:
            old.unlink(missing_ok=True)
        for f in tmp.iterdir():
            f.replace(out / f.name)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    ep['heights'] = heights
    ep['v'] = v


def convert(files, out):
    pieces = []
    for i, f in enumerate(files):
        try:
            with Image.open(f) as src:
                src.load()
                im, bg = trim(flat(src))
        except (OSError, Image.DecompressionBombError) as err:
            sys.exit(f'✗ {f.name}: 그림을 열 수 없습니다 ({err}) — 기존 그림은 그대로 둡니다')
        if im is None:
            print(f'  ⚠ {f.name}: 빈 장 — 건너뜀')
            continue
        im = im.resize((WIDTH, max(1, round(im.height * WIDTH / im.width))), Image.LANCZOS)
        if i < len(files) - 1 and PAGE_GAP:
            padded = Image.new('RGB', (WIDTH, im.height + PAGE_GAP), bg)
            padded.paste(im, (0, 0))
            im = padded
        ys = [0] + cut_points(im) + [im.height]
        for a, b in zip(ys, ys[1:]):
            pieces.append(im.crop((0, a, WIDTH, b)))
        print(f'  {f.name}: {im.height}px → 조각 {len(ys) - 1}')
    if not pieces:
        sys.exit('✗ 쓸 수 있는 장이 없습니다 — 기존 그림은 그대로 둡니다')
    sha = hashlib.sha1()
    for n, p in enumerate(pieces, 1):
        buf = io.BytesIO()
        p.save(buf, 'WEBP', quality=88, method=6)
        (out / f'{n:02d}.webp').write_bytes(buf.getvalue())
        sha.update(buf.getvalue())
    make_og(pieces[0]).save(out / 'og.jpg', 'JPEG', quality=86, optimize=True)
    return [p.height for p in pieces], sha.hexdigest()[:8]


def make_og(first):
    """첫 조각을 1200×630에 맞춘다: 폭을 맞추고 위에서부터 자른다 (짧으면 아래를 바탕색으로)"""
    im = first.resize((OG_W, round(first.height * OG_W / first.width)), Image.LANCZOS)
    if im.height >= OG_H:
        return im.crop((0, 0, OG_W, OG_H))
    bg = Image.new('RGB', (OG_W, OG_H), row_color(im, im.height - 1) or (255, 255, 255))
    bg.paste(im, (0, 0))
    return bg


# ── HTML ───────────────────────────────────────────────

def e(s):
    return html.escape(str(s), quote=True)


def ep_heading(data, ep):
    t = f"「{data['series']}」 {ep['no']}화"
    return f"{t} — {ep['title']}" if ep.get('title') else t


def head(title, desc, url, image, alt, root):
    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(title)} · 고양.시 만화방</title>
<meta name="description" content="{e(desc)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{e(image)}">
<meta property="og:image:width" content="{OG_W}">
<meta property="og:image:height" content="{OG_H}">
<meta property="og:image:alt" content="{e(alt)}">
<meta property="og:url" content="{e(url)}">
<link rel="canonical" href="{e(url)}"><!-- GoatCounter가 주소 뒤(?from=…)를 기록하지 않게 -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="고양.시">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{e(image)}">
<meta name="theme-color" content="#17130F">
<link rel="icon" href="{root}favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="{root}apple-touch-icon.png">
<script data-goatcounter="https://goyangsi.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
<link rel="stylesheet" href="{root}manhwa/viewer.css">
<script defer src="{root}manhwa/viewer.js"></script>
</head>
"""


def desc_of(data):
    d = f"고양.시 만화방 · {data['name']}"
    return f"{d} — {data['about']}" if data.get('about') else d


def episode_html(work, data, ep):
    url = f"{SITE}/manhwa/{work}/{ep['slug']}/"
    title = ep_heading(data, ep)
    return head(title, desc_of(data), url, url + 'og.jpg', title, '../../../') + f"""<body class="mh" data-page="episode" data-work="{e(work)}" data-no="{ep['no']}">
<noscript><p class="mh-msg">만화를 보려면 자바스크립트를 켜 주세요.</p></noscript>
</body>
</html>
"""


def list_html(work, data):
    url = f"{SITE}/manhwa/{work}/"
    eps = data['episodes']
    image = f"{url}{eps[0]['slug']}/og.jpg" if eps else f'{SITE}/og/room.jpg'
    title = f"「{data['series']}」"
    return head(title, desc_of(data), url, image, title, '../../') + f"""<body class="mh" data-page="list" data-work="{e(work)}">
<noscript><p class="mh-msg">만화를 보려면 자바스크립트를 켜 주세요.</p></noscript>
</body>
</html>
"""


def write_html(work, data):
    base = paths(work)[1]
    for ep in data['episodes']:
        (base / ep['slug'] / 'index.html').write_text(episode_html(work, data, ep), 'utf8')
    (base / 'index.html').write_text(list_html(work, data), 'utf8')


# ── 검사 ───────────────────────────────────────────────

def check(work):
    base = paths(work)[1]
    data = load_json(work)
    errs = []
    for k in ('name', 'series'):
        if not data.get(k):
            errs.append(f'episodes.json 머리에 {k}가 없습니다')
    eps = data.get('episodes')
    if not isinstance(eps, list):
        sys.exit('✗ episodes.json에 episodes 목록이 없습니다')
    nos, slugs = set(), set()
    for ep in eps:
        tag = f"{ep.get('no')}화"
        no, slug = ep.get('no'), ep.get('slug', '')
        if not isinstance(no, int) or no < 1 or no in nos:
            errs.append(f'{tag}: 회차 번호가 잘못되었거나 겹칩니다')
        nos.add(no)
        if not re.fullmatch(f'[{SLUG_CHARS}]{{{SLUG_LEN}}}', slug) or slug in slugs:
            errs.append(f'{tag}: 이름 "{slug}"이 잘못되었거나 겹칩니다')
            continue
        slugs.add(slug)
        try:
            datetime.date.fromisoformat(ep.get('open', ''))
        except (TypeError, ValueError):
            errs.append(f'{tag}: 공개일 "{ep.get("open")}"이 YYYY-MM-DD가 아닙니다')
        hs = ep.get('heights')
        if not isinstance(hs, list) or not hs or not ep.get('v'):
            errs.append(f'{tag}: heights·v가 없습니다 (도구로 다시 만드세요)')
            continue
        d = base / slug
        want = [f'{n:02d}.webp' for n in range(1, len(hs) + 1)]
        have = {f.name for f in d.glob('*.webp')} if d.is_dir() else set()
        if have != set(want):
            errs.append(f'{tag}: 조각 파일이 맞지 않습니다 (episodes.json {len(want)}개, 폴더 {len(have)}개)')
            continue
        for name, h in zip(want, hs):
            with Image.open(d / name) as im:
                if im.size != (WIDTH, h):
                    errs.append(f'{tag} {name}: 크기 {im.size[0]}×{im.size[1]} — episodes.json은 {WIDTH}×{h}')
        og = d / 'og.jpg'
        if not og.exists():
            errs.append(f'{tag}: og.jpg가 없습니다')
        else:
            with Image.open(og) as im:
                if im.size != (OG_W, OG_H):
                    errs.append(f'{tag}: og.jpg 크기 {im.size}')
        page = d / 'index.html'
        if not page.exists() or page.read_text('utf8') != episode_html(work, data, ep):
            errs.append(f'{tag}: index.html이 episodes.json과 다릅니다 → python3 tools/build_manhwa.py {work}')
    for d in base.iterdir() if base.is_dir() else []:
        if d.is_dir() and d.name not in slugs:
            errs.append(f'episodes.json에 없는 폴더: {d.relative_to(ROOT)}')
    page = base / 'index.html'
    if not page.exists() or page.read_text('utf8') != list_html(work, data):
        errs.append(f'목록 index.html이 episodes.json과 다릅니다 → python3 tools/build_manhwa.py {work}')
    for s in errs:
        print(f'✗ {s}')
    if errs:
        sys.exit(1)
    print(f'만화방 {work}: 회차 {len(eps)}개 — 검사 통과')


# ── 시작 ───────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description='만화방 회차 도구')
    ap.add_argument('work')
    ap.add_argument('no', nargs='?', type=int)
    ap.add_argument('--open', help='공개일 YYYY-MM-DD (처음 올릴 때 없으면 오늘)')
    ap.add_argument('--title', help='회차 제목')
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    if not re.fullmatch(r'[a-z0-9]+', a.work):
        sys.exit('✗ 작품 id는 소문자·숫자')
    if a.check:
        return check(a.work)
    data = load_json(a.work)
    if a.no is None:
        write_html(a.work, data)
        print(f'HTML을 다시 만들었습니다 (회차 {len(data["episodes"])}개)')
        return
    if a.open:
        try:
            datetime.date.fromisoformat(a.open)
        except ValueError:
            sys.exit('✗ --open은 YYYY-MM-DD')
    ep = next((x for x in data['episodes'] if x['no'] == a.no), None)
    if ep is None:
        used = {x['slug'] for x in data['episodes']}
        slug = None
        while slug is None or slug in used:
            slug = ''.join(secrets.choice(SLUG_CHARS) for _ in range(SLUG_LEN))
        ep = {'no': a.no, 'slug': slug, 'title': a.title or '', 'open': a.open or today_seoul()}
        data['episodes'].append(ep)
        print(f'{a.no}화 새로 올림: 이름 {slug}, 공개일 {ep["open"]}')
    else:
        if a.open:
            ep['open'] = a.open
        if a.title is not None:
            ep['title'] = a.title
        print(f'{a.no}화 그림을 다시 만듦: 이름 {ep["slug"]}, 공개일 {ep["open"]}')
    build_images(a.work, ep)
    save_json(a.work, data)
    write_html(a.work, data)
    print(f'→ web/manhwa/{a.work}/{ep["slug"]}/  조각 {len(ep["heights"])}개')


if __name__ == '__main__':
    main()
