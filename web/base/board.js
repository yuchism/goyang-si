/* 공항식 넘김 상황판 (tasks/base-1-hall.md) — rows×cols 글자 칸. 칸이 바뀔 때 위아래 반쪽이 촤라락 넘어간다
   - 칸마다 몇 번 아무 글자로 넘어가다 새 글자에서 멈춘다(spins). 왼쪽 위부터 조금씩 늦게(colMs·rowMs) — 숫자는 scene.json board.flip
   - 소리: 코드로 만든 짧은 딸깍(Web Audio). 설정 책의 소리 켜기(goyang.sound, 기본 켜짐)를 따르고, 누르기 전엔 브라우저가 막으므로 첫 누름에 연다
   - 동작 줄이기: 넘김 없이 바로 바뀐다(소리도 없음) */
const SPIN = '가나다라마바사아자차카타파하0123456789ABCDEFGHJKLMNPRSTUVWXYZ'.split('');

/* ── 딸깍 소리 */
const soundWanted = () => {
  try {
    return JSON.parse(localStorage.getItem('goyang.sound') ?? 'true') !== false;
  }
  catch (e) {
    return true;
  }
};
const Click = { ac: null, buf: null, last: 0, gap: 22, vol: 0.05,
  unlock() {
    if (!soundWanted())
      return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC)
      return;
    if (!this.ac) {
      this.ac = new AC();
      const n = Math.floor(this.ac.sampleRate * 0.012), b = this.ac.createBuffer(1, n, this.ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++)
        d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
      this.buf = b;
    }
    if (this.ac.state !== 'running')
      this.ac.resume().catch(() => { });
  },
  play() {
    const ac = this.ac, t = performance.now();
    if (!ac || ac.state !== 'running' || t - this.last < this.gap || !soundWanted())
      return;
    this.last = t;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = this.buf;
    s.playbackRate.value = 0.8 + Math.random() * 0.5;
    f.type = 'bandpass';
    f.frequency.value = 2400 + Math.random() * 1200;
    g.gain.value = this.vol * (0.6 + Math.random() * 0.4);
    s.connect(f).connect(g).connect(ac.destination);
    s.start();
  },
};
for (const t of ['pointerdown', 'keydown', 'touchend'])
  document.addEventListener(t, () => Click.unlock(), { capture: true, passive: true });

/* ── 칸 하나: 위 반쪽·아래 반쪽 + 넘어가는 두 날개 */
function half(cls) {
  const h = document.createElement('span');
  h.className = 'h ' + cls;
  h.append(document.createElement('i'));
  return h;
}
function makeCell() {
  const c = document.createElement('span');
  c.className = 'fc';
  const parts = { t: half('t'), b: half('b'), ft: half('ft'), fb: half('fb') };
  c.append(parts.t, parts.b, parts.ft, parts.fb);
  return { el: c, parts, ch: ' ', want: ' ', token: 0 };
}
const put = (h, ch) => { h.firstChild.textContent = ch; };
function setNow(cell, ch) {
  cell.ch = ch;
  cell.el.classList.remove('go');
  for (const h of Object.values(cell.parts))
    put(h, ch);
}

export function makeBoard(host, cfg, RM) {
  const { rows, cols, flip } = cfg;
  Click.gap = cfg.clickGapMs;
  Click.vol = cfg.clickVol;
  host.style.setProperty('--rows', rows);
  host.style.setProperty('--cols', cols);
  host.style.setProperty('--fd', flip.stepMs + 'ms');
  const cells = [];
  // 글자 크기: 칸 너비·높이에 맞게 (한글 한 글자가 칸을 넘지 않게)
  const [, , w, h] = cfg.rect, [px, py] = cfg.pad;
  const cw = (w - 2 * px - (cols - 1) * 2) / cols, chh = (h - 2 * py - (rows - 1) * 3) / rows;
  host.style.setProperty('--fs', Math.min(cw * 0.92, chh * 0.62).toFixed(1) + 'px');
  for (let i = 0; i < rows * cols; i++) {
    const c = makeCell();
    if (i < cols)
      c.el.classList.add('head'); // 맨 윗줄: 화면 이름
    setNow(c, ' ');
    host.append(c.el);
    cells.push(c);
  }
  // 한 번 넘김: old → ch
  const step = (cell, ch) => {
    const p = cell.parts, old = cell.ch;
    cell.el.classList.remove('go');
    put(p.t, ch);
    put(p.b, old);
    put(p.ft, old);
    put(p.fb, ch);
    void cell.el.offsetWidth; // 애니메이션 다시 시작
    cell.el.classList.add('go');
    cell.ch = ch;
    Click.play();
  };
  const run = (cell, i, ch) => {
    const token = ++cell.token;
    const r = Math.floor(i / cols), c = i % cols;
    const n = 1 + Math.floor(Math.random() * flip.spins);
    const seq = [];
    for (let k = 0; k < n - 1; k++)
      seq.push(SPIN[Math.floor(Math.random() * SPIN.length)]);
    seq.push(ch);
    const start = c * flip.colMs + r * flip.rowMs;
    seq.forEach((x, k) => setTimeout(() => {
      if (cell.token !== token)
        return;
      step(cell, x);
      if (k === seq.length - 1)
        setTimeout(() => cell.token === token && setNow(cell, x), flip.stepMs + 20);
    }, start + k * flip.stepMs));
  };
  // lines: 글자 배열 × rows (screens.js pages)
  return function show(lines) {
    cells.forEach((cell, i) => {
      const ch = (lines[Math.floor(i / cols)] || [])[i % cols] || ' ';
      if (ch === cell.want)
        return;
      cell.want = ch;
      if (RM) {
        cell.token++;
        setNow(cell, ch);
      }
      else
        run(cell, i, ch);
    });
  };
}
