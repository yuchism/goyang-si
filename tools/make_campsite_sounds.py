#!/usr/bin/env python3
"""미스테리 캠핑장 소리 만들기 (CAMPSITE_PLAN.md 6장, tasks/campsite-4-sound.md).
원본(assets/sound/campsite/, 커밋 안 함 — 출처는 ASSET_LICENSE.md) → web/campsite/sound/*.mp3 (모노)
 - 반복 소리(장작·개울·풀벌레): 한 토막을 잘라 끝 FADE초를 머리에 겹쳐(교차 페이드) 이음매 없이 돌게
 - 부엉이: 한 번 우는 토막, 앞뒤 페이드
 - 타자기: 올리베티 녹음에서 키 소리(짧고 날카로운 소리) 여러 개와 줄 끝 종('띵')을 찾아 자름
 - 장작 '툭': 모닥불 녹음에서 가장 센 순간 몇 개
 - 크기: 소리마다 RMS를 맞춘 뒤(TARGET) 웹에서 다시 조절(campsite/sound.js)
쓰는 법: python3 tools/make_campsite_sounds.py [--preview 폴더]  (ffmpeg 필요)"""
import os, subprocess, sys
import numpy as np

SR = 44100
SRC = 'assets/sound/campsite'
OUT = 'web/campsite/sound'
FILES = {
    'fire': '729396__heckfricker__campfire-02.wav',
    'stream': '333987__gluckose__stream2.wav',
    'crickets': 'crickets.mp3',
    'owl': '454842__thegoosington__hoot.wav',
    'typewriter': '123344__keithpeter__typewriter-olivetti-lettra-22.wav',
}

def load(name):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(SRC, name), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def save(x, name, kbps=80):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-af', 'highpass=f=40', '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', path], input=np.clip(x, -1, 1).astype(np.float32).tobytes(), check=True)
    print(f'{path}  {len(x) / SR:.2f}s  {os.path.getsize(path) // 1024}KB')

def rms(x):
    return float(np.sqrt(np.mean(x * x)) + 1e-9)

def level(x, target):
    return x * (target / rms(x))

def loop(x, start, length, fade):
    """x[start : start+length]이 끝에서 머리로 이어지게: 꼬리 다음 fade초를 머리에 겹침"""
    a, n, c = int(start * SR), int(length * SR), int(fade * SR)
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

def envelope(x, win=0.005):
    w = max(1, int(win * SR))
    return np.convolve(np.abs(x), np.ones(w) / w, mode='same')

def onsets(x, gap=0.09, k=4.0):
    """짧은 타격(키 소리·장작 툭)의 시작: 짧은 창 에너지가 직전보다 확 커지는 곳"""
    e = envelope(x, 0.003)
    base = np.convolve(e, np.ones(int(0.05 * SR)) / int(0.05 * SR), mode='same')
    hit = np.where((e > base * k) & (e > np.percentile(e, 90)))[0]
    out, last = [], -10 ** 9
    for i in hit:
        if i - last > gap * SR:
            out.append(i)
        last = i
    return out

def band_ratio(x, i, n, lo, hi):
    seg = x[i:i + n]
    if len(seg) < n: return 0
    f = np.abs(np.fft.rfft(seg * np.hanning(n)))
    fr = np.fft.rfftfreq(n, 1 / SR)
    return float(f[(fr > lo) & (fr < hi)].sum() / (f.sum() + 1e-9))

def main():
    TARGET = 0.08
    fire = load(FILES['fire'])
    save(level(loop(fire, 20, 75, 3), TARGET), 'fire-loop-v1')
    # 장작 '툭': 불 녹음에서 가장 센 타격 3개 (서로 2초 이상 떨어진)
    e = envelope(fire, 0.004)
    picks = []
    for i in np.argsort(e)[::-1]:
        if all(abs(i - p) > 2 * SR for p in picks) and SR < i < len(fire) - SR:
            picks.append(int(i))
        if len(picks) == 3: break
    for n, i in enumerate(sorted(picks), 1):
        save(level(fades(fire[i - int(0.02 * SR): i + int(0.45 * SR)], 0.01, 0.2), TARGET * 1.6), f'log-pop-{n}-v1', 64)
    stream = load(FILES['stream'])
    save(level(loop(stream, 10, 60, 3), TARGET), 'stream-loop-v1')
    cr = load(FILES['crickets'])
    save(level(loop(cr, 0, len(cr) / SR - 1.2, 1.0), TARGET), 'crickets-loop-v1', 64)
    owl = load(FILES['owl'])
    e = envelope(owl, 0.02)
    on = np.where(e > e.max() * 0.08)[0]
    save(level(fades(owl[max(0, on[0] - int(0.1 * SR)): min(len(owl), on[-1] + int(0.6 * SR))], 0.05, 0.6), TARGET), 'owl-v1', 64)
    tw = load(FILES['typewriter'])
    # 줄 끝 종: 2.5~6kHz가 길게(0.25초) 우세한 곳
    best, bi = 0, None
    for i in range(0, len(tw) - SR, int(0.05 * SR)):
        r = min(band_ratio(tw, i + int(k * 0.08 * SR), 2048, 2500, 6000) for k in range(3))
        if r > best: best, bi = r, i
    # 종이 울리기 시작하는 순간에 맞춤: 그 근처에서 3kHz 언저리만 남긴 소리가 가장 커지는 곳의 조금 앞
    lo, hi = bi - int(0.3 * SR), bi + int(0.6 * SR)
    F = np.fft.rfft(tw[lo:hi]); fr = np.fft.rfftfreq(hi - lo, 1 / SR)
    F[(fr < 2500) | (fr > 4000)] = 0
    be = envelope(np.fft.irfft(F, hi - lo), 0.01)
    bi = lo + int(np.argmax(be)) - int(0.03 * SR)
    bell = tw[bi: bi + int(0.34 * SR)]  # 뒤이어 키 소리가 섞이기 전까지
    save(level(fades(bell, 0.003, 0.12), TARGET), "typewriter-bell-v1", 64)
    # 키 소리: 종 근처는 빼고, 크기가 가운데쯤인 것 6개
    keys = [i for i in onsets(tw) if abs(i - bi) > SR and int(0.01 * SR) < i < len(tw) - SR]
    loud = sorted(keys, key=lambda i: rms(tw[i:i + int(0.06 * SR)]))
    mid = loud[len(loud) // 2 - 3: len(loud) // 2 + 3]
    for n, i in enumerate(sorted(mid), 1):
        save(level(fades(tw[i - int(0.004 * SR): i + int(0.13 * SR)], 0.002, 0.04), TARGET), f'typewriter-key-{n}-v1', 64)
    print(f'종: {bi / SR:.2f}s (2.5~6kHz 비율 {best:.2f}), 키 후보 {len(keys)}개, 툭: {[round(p / SR, 2) for p in sorted(picks)]}')

if __name__ == '__main__':
    main()
