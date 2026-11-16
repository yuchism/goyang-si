/* 크리스마스 광장 오르골 (XMAS_PLAZA_PLAN.md 3-1): 트리 앞 펠리컨 자리의 작은 오르골 상자. 누를 때마다 다음 캐럴 → … → 안 나옴.
   - 펠리컨(web/plaza/pelican.webp, 주인이 ChatGPT로 그림 · tools/make_plaza_pelican.py): 노래 중 ①~④ 손잡이 돌리기, 꺼지면 ⑤ 졸기.
     받침대 오른쪽 다리 바닥(pelican.anchor)이 music.at에 온다. 그림을 못 받으면 예전 임시 상자를 코드로 그린다
   - 소리: sound.js Snd(방과 같은 오디오)로 녹음을 통째로 받아 풀고(range 요청 없이 — 서비스 워커와 다투지 않게) 같은 곡을 되풀이
   - 누르는 것 자체가 소리를 켜겠다는 뜻이라, 소리가 꺼져 있어도 연다(거실 설정은 바꾸지 않음)
   - 페이지를 나갔다 오면 다시 「안 나옴」부터 (기억하지 않음). 동작 줄이기: 손잡이·음표 멈춤, 소리는 그대로 */
export function makeMusicBox(cfg, { Snd, RM, label }) {
  const M = cfg.music, n = M.files.length;
  const bufs = {}, busy = {};
  let idx = 0, src = null, gain = null, playT = 0, loading = false;
  const stop = () => {
    if (src) {
      try {
        src.stop();
      }
      catch (e) { }
      src.disconnect();
    }
    src = null;
  };
  const get = i => {
    if (bufs[i])
      return Promise.resolve(bufs[i]);
    if (!busy[i])
      busy[i] = fetch('../' + M.files[i]).then(r => r.arrayBuffer()).then(b => Snd.ac.decodeAudioData(b)).then(buf => (bufs[i] = buf));
    return busy[i];
  };
  const play = i => {
    stop();
    if (!Snd.ac)
      return;
    if (!gain) {
      gain = Snd.ac.createGain();
      gain.gain.value = M.vol;
      gain.connect(Snd.master);
    }
    loading = true;
    get(i).then(buf => {
      if (idx - 1 !== i) // 받는 사이 다른 곡으로 넘어갔으면 버림
        return;
      loading = false;
      stop();
      src = Snd.ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(gain);
      src.start();
      playT = performance.now() / 1000;
    }).catch(() => { loading = false; });
  };
  const tap = () => {
    idx = (idx + 1) % (n + 1);
    if (!idx) {
      stop();
      loading = false;
      return;
    }
    if (!Snd.on)
      Snd.toggle();
    else if (Snd.ac && Snd.ac.state !== 'running')
      Snd.ac.resume();
    play(idx - 1);
  };
  // 누르는 자리 (장면 좌표 단추)
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mbox';
  btn.setAttribute('aria-label', label);
  const [x, y] = M.at, [bw, bh] = M.size, pad = M.hitPad;
  const P = M.pelican, pk = P.scale, [pcw, pch] = P.cell, [pax, pay] = P.anchor;
  const px0 = x - pax * pk, py0 = y - pay * pk; // 펠리컨 칸 왼쪽 위 (광장 px)
  const [hx0, hy0, hx1, hy1] = P.hit; // 누르는 자리: 칸 안 [x0, y0, x1, y1]
  Object.assign(btn.style, { left: px0 + hx0 * pk - pad + 'px', top: py0 + hy0 * pk - pad + 'px', width: (hx1 - hx0) * pk + pad * 2 + 'px', height: (hy1 - hy0) * pk + pad * 2 + 'px' });
  const sheet = new Image();
  sheet.src = `pelican.webp?v=${cfg.v}`;
  let tmp = null;
  btn.addEventListener('click', tap);

  // 펠리컨 그리기. dark: 밤 어둠 0~1 (남색을 얹어 어둡게 — 광장 그림과 같이)
  const drawPelican = (g, t, dark, on) => {
    const fi = on ? (RM ? 1 : Math.floor((t - playT) * P.fps) % 4) : loading ? 0 : 4;
    const dw = pcw * pk, dh = pch * pk;
    // 그림자
    g.save();
    g.globalAlpha = 0.2;
    g.fillStyle = '#1a1d2e';
    g.beginPath();
    g.ellipse(x - P.shadow[0] * pk, y, P.shadow[1] * pk, P.shadow[1] * pk * 0.16, 0, 0, 7);
    g.fill();
    g.restore();
    if (dark > 0.01) {
      if (!tmp)
        tmp = document.createElement('canvas');
      const tw = Math.ceil(dw), th = Math.ceil(dh);
      if (tmp.width !== tw || tmp.height !== th)
        Object.assign(tmp, { width: tw, height: th });
      const tg = tmp.getContext('2d');
      tg.globalCompositeOperation = 'source-over';
      tg.clearRect(0, 0, tw, th);
      tg.drawImage(sheet, fi * pcw, 0, pcw, pch, 0, 0, dw, dh);
      tg.globalCompositeOperation = 'source-atop';
      tg.fillStyle = `rgba(16,22,52,${Math.min(1, dark) * (cfg.guests.nightShade || 0.22)})`; // 손님과 같은 밤 그늘
      tg.fillRect(0, 0, tw, th);
      g.drawImage(tmp, px0, py0);
    }
    else
      g.drawImage(sheet, fi * pcw, 0, pcw, pch, px0, py0, dw, dh);
    // 음표: 오르골 위에서 (노래 중 셋, 받는 중 하나). 졸 땐 z (코드로)
    const nx = x + P.notes[0] * pk, ny = y + P.notes[1] * pk;
    if (RM)
      return;
    g.save();
    if (on || loading) {
      g.font = '700 16px serif';
      g.fillStyle = '#fff6c8';
      for (let k = 0; k < (loading ? 1 : 3); k++) {
        const p = ((t * 0.45 + k / 3) % 1);
        g.globalAlpha = Math.sin(Math.PI * p) * 0.9;
        g.fillText(k % 2 ? '♫' : '♪', nx - 6 + Math.sin(p * 6 + k) * 8 + k * 6, ny - p * 46);
      }
    }
    else {
      const zx = x + P.zzz[0] * pk, zy = y + P.zzz[1] * pk;
      g.font = '700 11px sans-serif';
      g.fillStyle = '#eef2ff';
      for (let k = 0; k < 2; k++) {
        const p = ((t * 0.3 + k / 2) % 1);
        g.globalAlpha = Math.sin(Math.PI * p) * 0.75;
        g.fillText('z', zx + p * 10 + k * 3, zy - p * 22);
      }
    }
    g.restore();
  };

  // 임시 상자 (펠리컨 그림을 못 받았을 때)
  const draw = (g, t, dark) => {
    const on = idx > 0 && !!src, w = bw, h = bh, x0 = x - w / 2, y0 = y - h;
    if (sheet.complete && sheet.naturalWidth)
      return drawPelican(g, t, dark, on);
    const shade = c => { // 밤: 남색 쪽으로 섞어 어둡게 (광장 그림과 같이)
      const v = parseInt(c.slice(1), 16), k = dark * 0.35, mixc = (a, b) => Math.round(a + (b - a) * k);
      return `rgb(${mixc(v >> 16, 16)},${mixc(v >> 8 & 255, 22)},${mixc(v & 255, 52)})`;
    };
    g.save();
    // 그림자
    g.globalAlpha = 0.2;
    g.fillStyle = '#1a1d2e';
    g.beginPath();
    g.ellipse(x, y, w * 0.62, w * 0.12, 0, 0, 7);
    g.fill();
    g.globalAlpha = 1;
    g.lineWidth = 2.2;
    g.strokeStyle = shade('#3a2416');
    // 몸통
    g.fillStyle = shade('#a8693a');
    g.beginPath();
    g.roundRect(x0, y0 + h * 0.3, w, h * 0.7, 4);
    g.fill();
    g.stroke();
    // 금테
    g.fillStyle = shade('#e8b84a');
    g.fillRect(x0 + 3, y0 + h * 0.48, w - 6, 3);
    // 뚜껑 (노래 중엔 조금 열림)
    g.save();
    g.translate(x0 + 2, y0 + h * 0.3);
    g.rotate(on ? -0.32 : 0);
    g.fillStyle = shade('#b8794a');
    g.beginPath();
    g.roundRect(0, -h * 0.22, w, h * 0.22, 3);
    g.fill();
    g.stroke();
    g.restore();
    // 손잡이 (오른쪽 옆) — 노래 중엔 돈다
    const a = on && !RM ? (t - playT) * 2.4 : 0.6, cx = x0 + w + 3, cy = y0 + h * 0.62;
    g.beginPath();
    g.moveTo(cx - 3, cy);
    g.lineTo(cx, cy);
    g.stroke();
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7);
    g.stroke();
    g.fillStyle = shade('#e8b84a');
    g.beginPath();
    g.arc(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 2.6, 0, 7);
    g.fill();
    g.stroke();
    // 음표 (노래 중, 받는 중엔 작게 하나)
    if ((on || loading) && !RM) {
      g.font = '700 16px serif';
      g.fillStyle = '#fff6c8';
      for (let k = 0; k < (loading ? 1 : 3); k++) {
        const p = ((t * 0.45 + k / 3) % 1);
        g.globalAlpha = Math.sin(Math.PI * p) * 0.9;
        g.fillText(k % 2 ? '♫' : '♪', x - 6 + Math.sin(p * 6 + k) * 8 + k * 6, y0 - 4 - p * 46);
      }
      g.globalAlpha = 1;
    }
    g.restore();
  };
  return { btn, draw, tap, state: () => idx };
}
