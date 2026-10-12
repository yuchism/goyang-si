/* 소리: 방 잡음, 빗소리, 방울, 문, 생일 노래, TV 소리 (Web Audio로 만든다) */
import { rnd } from './util.js';
/* ───────── 소리 ───────── */
export const Snd = { ac: null, on: false, master: null, rainG: null, roomG: null, tvG: null,
  init() {
    if (this.ac)
      return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC)
      return;
    const ac = this.ac = new AC();
    this.master = ac.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(ac.destination);
    const nb = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate), d = nb.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
    this.brown = nb;
    const wb = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate), wd = wb.getChannelData(0);
    for (let i = 0; i < wd.length; i++)
      wd[i] = Math.random() * 2 - 1;
    this.white = wb;
    const loop = (buf, filt, f, q) => {
      const s = ac.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      const fl = ac.createBiquadFilter();
      fl.type = filt;
      fl.frequency.value = f;
      fl.Q.value = q || 0.7;
      const g = ac.createGain();
      g.gain.value = 0;
      s.connect(fl);
      fl.connect(g);
      g.connect(this.master);
      s.start();
      return g;
    };
    this.roomG = loop(nb, 'lowpass', 300);
    this.rainG = loop(wb, 'bandpass', 2200, 0.4);
    this.tvG = loop(wb, 'bandpass', 900, 3);
  },
  toggle() {
    this.init();
    if (!this.ac)
      return false;
    this.on = !this.on;
    if (this.on)
      this.ac.resume();
    else
      this.ac.suspend();
    return this.on;
  },
  env(node, t, a, d, peak) {
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    node.connect(g);
    g.connect(this.master);
    return g;
  },
  bell(v = 1) {
    if (!this.on)
      return;
    const ac = this.ac, t = ac.currentTime;
    [2350, 3520, 5100].forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * (1 + rnd(-.01, .01));
      this.env(o, t, 0.003, 0.35 - i * 0.08, 0.06 * v / (i + 1));
      o.start(t);
      o.stop(t + 0.5);
    });
  },
  thump(v = 1, f = 120) {
    if (!this.on)
      return;
    const ac = this.ac, t = ac.currentTime, s = ac.createBufferSource();
    s.buffer = this.brown;
    const fl = ac.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = f;
    s.connect(fl);
    this.env(fl, t, 0.005, 0.16, 0.9 * v);
    s.start(t, rnd(0, 2));
    s.stop(t + 0.3);
  },
  clink() {
    if (!this.on)
      return;
    const ac = this.ac, t = ac.currentTime;
    [1800, 2650, 4100].forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      this.env(o, t, 0.002, 0.25, 0.08 / (i + 1));
      o.start(t);
      o.stop(t + 0.4);
    });
    this.thump(0.8, 400);
  },
  door() {
    if (!this.on)
      return;
    const ac = this.ac, t = ac.currentTime, o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t);
    o.frequency.linearRampToValueAtTime(120, t + 0.6);
    const fl = ac.createBiquadFilter();
    fl.type = 'bandpass';
    fl.frequency.value = 700;
    fl.Q.value = 6;
    o.connect(fl);
    this.env(fl, t, 0.05, 0.6, 0.05);
    o.start(t);
    o.stop(t + 0.8);
  },
  click() {
    if (!this.on)
      return;
    this.thump(0.5, 2000);
  },
  purr(sec = 3) {
    if (!this.on)
      return;
    const ac = this.ac, t = ac.currentTime, s = ac.createBufferSource();
    s.buffer = this.brown;
    s.loop = true;
    const fl = ac.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = 160;
    const am = ac.createGain();
    am.gain.value = 0.5;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 24;
    const lg = ac.createGain();
    lg.gain.value = 0.5;
    lfo.connect(lg);
    lg.connect(am.gain);
    s.connect(fl);
    fl.connect(am);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.5);
    g.gain.linearRampToValueAtTime(0, t + sec);
    am.connect(g);
    g.connect(this.master);
    s.start(t);
    lfo.start(t);
    s.stop(t + sec + 0.1);
    lfo.stop(t + sec + 0.1);
  },
  birthdaySong() {
    if (!this.on || !this.ac)
      return 0;
    const ac = this.ac, start = ac.currentTime + 0.08, beat = 0.34;
    const notes = [[67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2], [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2], [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2], [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 2]];
    let at = 0;
    notes.forEach(([m, d]) => {
      const t = start + at * beat, dur = d * beat, o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
      const g = ac.createGain();
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.11, t + .025);
      g.gain.setValueAtTime(.09, t + Math.max(.03, dur - .09));
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + .02);
      at += d;
    });
    return at * beat + .15;
  },
  // TV: 켜고 끄는 탁 소리, 화면조정 삐, 관중 함성 (모두 아주 작게)
  tvClick(on) {
    if (!this.on)
      return;
    this.thump(0.35, on ? 1800 : 700);
  },
  tvBeep(sec = 2.5) {
    if (!this.on)
      return;
    const ac = this.ac, t = ac.currentTime, o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = 1000;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.01, t + 0.05);
    g.gain.setValueAtTime(0.01, t + sec - 0.1);
    g.gain.linearRampToValueAtTime(0, t + sec);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + sec + 0.05);
  },
  tvCheer(v = 1) {
    if (!this.on)
      return;
    const ac = this.ac, t = ac.currentTime, s = ac.createBufferSource();
    s.buffer = this.white;
    const fl = ac.createBiquadFilter();
    fl.type = 'bandpass';
    fl.frequency.value = 1100;
    fl.Q.value = 0.8;
    s.connect(fl);
    this.env(fl, t, 0.25, 1.6, 0.04 * v);
    s.start(t, rnd(0, 1.2));
    s.stop(t + 2);
  },
  tvEvent(e) {
    if (!this.on)
      return;
    if (e.id === 'homerun') {
      this.thump(0.35, 2600);
      setTimeout(() => this.tvCheer(1), 120);
    }
    else if (e.id === 'goal')
      this.tvCheer(1.2);
    else if (e.id === 'flash')
      this.click();
  },
  setAmb(rain, tv, dark) {
    if (!this.on)
      return;
    const t = this.ac.currentTime;
    this.rainG.gain.setTargetAtTime(rain ? 0.16 : 0, t, 1.5);
    this.tvG.gain.setTargetAtTime(tv ? 0.012 * (0.6 + 0.4 * Math.sin(t * 1.7) * Math.sin(t * 0.6)) : 0, t, 0.3);
    this.roomG.gain.setTargetAtTime(dark ? 0.05 : 0.08, t, 2);
  }
};
