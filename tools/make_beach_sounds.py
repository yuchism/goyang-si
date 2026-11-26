#!/usr/bin/env python3
"""미스테리 해변 소리 만들기 (BEACH_PLAN.md 6장, tasks/beach-4-sound.md).
원본(assets/sound/beach/, 커밋 안 함 — 출처는 ASSET_LICENSE.md) → web/beach/sound/*.mp3 (모노)
원본은 Freesound에서 받은 이름 그대로 두면 됨: 맨 앞 번호로 찾음(아래 FILES)
 - 파도·바닷바람: 한 토막을 잘라 끝 FADE초를 머리에 겹쳐(교차 페이드) 이음매 없이 돌게
 - 먼 갈매기: 녹음에서 가장 센 울음 셋을 잘라, 높은 소리를 깎고(낮은 통과) 짧은 메아리를 섞어 멀리서 들리게
 - 병 '톡': 유리병 부딪는 녹음에서 맑은 소리 하나 + 모래가 유리를 스치는 소리를 앞에 살짝, 모래에 묻힌 듯 둥글게
 - 종이: 종이 바스락 녹음에서 가장 소리가 많은 1.2초
 - 크기: 소리마다 RMS를 맞춘 뒤(level) 웹에서 다시 조절(beach/sound.js SOUND)
쓰는 법: python3 tools/make_beach_sounds.py  (ffmpeg 필요)"""
import glob, os, subprocess
import numpy as np

SR = 44100
SRC = 'assets/sound/beach'
OUT = 'web/beach/sound'
FILES = {  # Freesound 번호
    'waves': 376795,     # Gentle Waves - Quiet Beach — amholma
    'wind': 697217,      # Looping Gentle Wind Ambience on an Open Desert Plain — dhallcomposer
    'gulls': 207130,     # SeaGulls.wav — ahill86
    'glass': 259671,     # Glass Bottles rattle and chink — LampEight
    'sand': 199396,      # sand slide on glass FF677 — martinimeniscus
    'paper': 181774,     # rustling paper.wav — keweldog
}


def find(n):
    hit = sorted(glob.glob(os.path.join(SRC, f'{n}__*'))) or sorted(glob.glob(os.path.join(SRC, f'{n}*')))
    if not hit:
        raise SystemExit(f'원본이 없음: {SRC}/{n}__… (ASSET_LICENSE.md의 주소에서 받아 이 폴더에)')
    return hit[0]


def load(n):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', find(n), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def save(x, name, kbps=80, af='highpass=f=40'):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-af', af, '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', path],
                   input=np.clip(x, -1, 1).astype(np.float32).tobytes(), check=True)
    print(f'{path}  {len(x) / SR:.2f}s  {os.path.getsize(path) // 1024}KB')


def rms(x):
    return float(np.sqrt(np.mean(x * x)) + 1e-9)


def level(x, target):
    return x * (target / rms(x))


def loop(x, start, length, fade):
    """x[start : start+length]이 끝에서 머리로 이어지게: 꼬리 다음 fade초를 머리에 겹침"""
    a, n, c = int(start * SR), int(length * SR), int(fade * SR)
    n = min(n, len(x) - a - c)
    y = x[a:a + n].copy()
    tail = x[a + n:a + n + c]
    t = np.linspace(0, 1, c)
    y[:c] = y[:c] * np.sin(t * np.pi / 2) + tail * np.cos(t * np.pi / 2)
    return y


def fades(x, fin=0.01, fout=0.05):
    a, b = int(fin * SR), int(fout * SR)
    x = x.copy()
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x


def envelope(x, win=0.02):
    w = max(1, int(win * SR))
    return np.convolve(np.abs(x), np.ones(w) / w, mode='same')


def peaks(x, n, gap, edge=0.5):
    """가장 센 순간 n개 (서로 gap초 이상 떨어지게, 앞뒤 edge초는 뺌)"""
    e = envelope(x)
    e[:int(edge * SR)] = 0
    e[-int(edge * SR) - int(1.5 * SR):] = 0
    out = []
    for _ in range(n):
        i = int(np.argmax(e))
        if e[i] <= 0:
            break
        out.append(i / SR)
        e[max(0, i - int(gap * SR)):i + int(gap * SR)] = 0
    return sorted(out)


def lowpass(x, hz):
    """한 번 깎는 낮은 통과 (두 번 걸어 조금 더 둥글게)"""
    a = np.exp(-2 * np.pi * hz / SR)
    for _ in range(2):
        y = np.empty_like(x)
        acc = 0.0
        for i, v in enumerate(x):
            acc = (1 - a) * v + a * acc
            y[i] = acc
        x = y
    return x


def cut(x, a, b):
    return x[max(0, int(a * SR)):int(b * SR)].copy()


def main():
    save(level(loop(load(FILES['waves']), 4, 36, 3), 0.1), 'waves-loop-v1', kbps=96)
    save(level(loop(load(FILES['wind']), 2, 34, 3), 0.08), 'wind-loop-v1', af='highpass=f=60,lowpass=f=5000')

    g = load(FILES['gulls'])
    for k, p in enumerate(peaks(g, 3, gap=3), 1):
        y = lowpass(cut(g, p - 0.25, p + 1.5), 2200)
        d = int(0.11 * SR)                       # 짧은 메아리: 멀리 바다 위에서
        y = np.concatenate([y, np.zeros(d)])
        y[d:] += 0.3 * y[:-d]
        save(level(fades(y, 0.02, 0.4), 0.05), f'gull-{k}-v1')

    glass, sand = load(FILES['glass']), load(FILES['sand'])
    tok = lowpass(cut(glass, peaks(glass, 1, gap=1)[0] - 0.01, peaks(glass, 1, gap=1)[0] + 0.35), 3000)
    s = sand[int(SR * 1):]
    s = cut(s, peaks(s, 1, gap=1)[0] - 0.25, peaks(s, 1, gap=1)[0] + 0.1)
    s = level(fades(s, 0.08, 0.1), 0.02)
    tok = level(fades(tok, 0.002, 0.15), 0.08)
    y = np.zeros(len(s) + len(tok))
    y[:len(s)] += s
    y[len(s) - int(0.05 * SR):len(s) - int(0.05 * SR) + len(tok)] += tok
    save(fades(y, 0.01, 0.1), 'bottle-land-v1')

    p = load(FILES['paper'])
    e = envelope(p, 0.2)
    w = int(1.2 * SR)
    i = int(np.argmax(np.convolve(e, np.ones(w), mode='valid')))
    save(level(fades(p[i:i + w], 0.05, 0.25), 0.07), 'paper-v1')


if __name__ == '__main__':
    main()
