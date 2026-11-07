/* 공항식 넘김 상황판 (tasks/base-1-hall.md) — rows줄. 판이 바뀔 때 위아래 반쪽이 촤라락 넘어간다
   - 한 줄 = 왼쪽 큰 줄 판(제목·이름, 낱말째 넘김) + 오른쪽 자리. 오른쪽은 줄 판 하나(단계·상태) 또는 숫자 칸 digits개 + 단위 판(통계)
   - 판마다 몇 번 다른 낱말·숫자로 넘어가다 새 값에서 멈춘다(spins). 위 줄부터 조금씩 늦게(colMs·rowMs) — 숫자는 scene.json board.flip
   - 소리: 코드로 만든 짧은 딸깍(Web Audio). 설정 책의 소리 켜기(goyang.sound, 기본 켜짐)를 따르고, 누르기 전엔 브라우저가 막으므로 첫 누름에 연다
   - 동작 줄이기: 넘김 없이 바로 바뀐다(소리도 없음) */
const DIGITS = '0123456789'.split('');

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

/* ── 판 하나(줄 판·숫자 칸 같은 모양): 위 반쪽·아래 반쪽 + 넘어가는 두 날개 */
function half(cls) {
  const h = document.createElement('span');
  h.className = 'h ' + cls;
  h.append(document.createElement('i'));
  return h;
}
function makeFlap(cls, spin) {
  const c = document.createElement('span');
  c.className = 'fl ' + cls;
  const parts = { t: half('t'), b: half('b'), ft: half('ft'), fb: half('fb') };
  c.append(parts.t, parts.b, parts.ft, parts.fb);
  return { el: c, parts, spin, ch: '', want: '', token: 0 };
}
const put = (h, ch) => { h.firstChild.textContent = ch; };
function setNow(f, ch) {
  f.ch = ch;
  f.el.classList.remove('go');
  for (const h of Object.values(f.parts))
    put(h, ch);
}

export function makeBoard(host, cfg, RM) {
  const { rows, digits, flip } = cfg;
  Click.gap = cfg.clickGapMs;
  Click.vol = cfg.clickVol;
  host.style.setProperty('--fd', flip.stepMs + 'ms');
  // 글자 크기: 줄 높이에 맞게
  const [, , , h] = cfg.rect, [, py] = cfg.pad;
  const rh = (h - 2 * py - (rows - 1) * cfg.gap) / rows;
  host.style.setProperty('--rh', rh.toFixed(1) + 'px');
  host.style.setProperty('--fs', (rh * cfg.fontRatio).toFixed(1) + 'px');
  host.style.setProperty('--gap', cfg.gap + 'px');
  host.style.setProperty('--side', (cfg.side * 100).toFixed(1) + '%');
  let pool = [];
  const lines = [];
  for (let r = 0; r < rows; r++) {
    const row = document.createElement('span');
    row.className = 'fr' + (r === 0 ? ' head' : ''); // 맨 윗줄: 화면 이름
    const main = makeFlap('word main', 'word'), side = makeFlap('word side', 'word'), unit = makeFlap('word unit', 'word');
    const num = document.createElement('span');
    num.className = 'num';
    const cells = [];
    for (let k = 0; k < digits; k++) {
      cells.push(makeFlap('dg', 'digit'));
      num.append(cells[k].el);
    }
    num.append(unit.el);
    const right = document.createElement('span');
    right.className = 'rt';
    right.append(side.el, num);
    row.append(main.el, right);
    host.append(row);
    lines.push({ row, flaps: [main, side, ...cells, unit] });
  }
  // 한 번 넘김: old → ch
  const step = (f, ch) => {
    const p = f.parts, old = f.ch;
    f.el.classList.remove('go');
    put(p.t, ch);
    put(p.b, old);
    put(p.ft, old);
    put(p.fb, ch);
    void f.el.offsetWidth; // 애니메이션 다시 시작
    f.el.classList.add('go');
    f.ch = ch;
    Click.play();
  };
  const pick = f => {
    const from = f.spin === 'digit' ? DIGITS : pool;
    return from.length ? from[Math.floor(Math.random() * from.length)] : '';
  };
  const run = (f, start, ch) => {
    const token = ++f.token;
    const n = 1 + Math.floor(Math.random() * flip.spins);
    const seq = [];
    for (let k = 0; k < n - 1; k++)
      seq.push(pick(f));
    seq.push(ch);
    seq.forEach((x, k) => setTimeout(() => {
      if (f.token !== token)
        return;
      step(f, x);
      if (k === seq.length - 1)
        setTimeout(() => f.token === token && setNow(f, x), flip.stepMs + 20);
    }, start + k * flip.stepMs));
  };
  // page: [{ l, r } 또는 { l, n, u }] × rows (screens.js pages). n은 오른쪽 맞춤 숫자 칸
  return function show(page) {
    pool = page.flatMap(x => [x.l, x.r]).filter(Boolean);
    lines.forEach(({ row, flaps }, r) => {
      const x = page[r] || {}, isNum = x.n != null;
      row.classList.toggle('isnum', isNum);
      const n = isNum ? Array.from(x.n).slice(-digits) : [];
      const want = [x.l || '', isNum ? '' : x.r || '']
        .concat(Array.from({ length: digits }, (_, k) => n[k - (digits - n.length)] ?? ''), isNum ? x.u || '' : '');
      flaps.forEach((f, i) => {
        const ch = want[i];
        if (ch === f.want)
          return;
        f.want = ch;
        if (RM) {
          f.token++;
          setNow(f, ch);
        }
        else
          run(f, r * flip.rowMs + i * flip.colMs, ch);
      });
    });
  };
}
