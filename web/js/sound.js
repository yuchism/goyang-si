/* 소리: 방 잡음, 빗소리, 방울, 문, 생일 노래, TV 소리 (Web Audio로 만든다) */
import { rnd } from './util.js';
/* ───────── 생일 노래 표 ─────────
   노래를 바꾸면(템포, 곡) 이 표만 맞춘다. phrases: 소절이 시작하는 박(음표 박 수를 더한 위치). 손님이 이 소절에 맞춰 나온다 (birthday.js·guests.js)
   노래는 녹음 파일(file)을 쓴다. 파일을 아직 못 받았거나 못 읽으면 만든 소리(notes, beat·phrases) (BIRTHDAY_SONG_PLAN.md 4장) */
export const BDAY_SONG = {
  file: 'sound/birthday-ukulele-v1.mp3', // 녹음: "Happy Ukulele Day" 10.1초부터 29.3초. 출처는 ASSET_LICENSE.md
  fileBeat: 0.6, // 녹음 한 박(초, 약 100 BPM). 녹음 시작이 첫 박
  filePhrases: [0, 12, 24, 36], // 녹음 소절 시작 박 (4소절 × 12박)
  fileSec: 29.3, // 녹음 길이(초)
  fileVol: 0.35, // 녹음 크기 (원본이 커서 줄임. 마스터를 거친다)
  beat: 0.34, // 만든 소리 한 박(초). 강고양이 씨·손님 춤은 그 노래의 한 박에 한 칸
  phrases: [0, 6, 12, 19],
  notes: [[67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2], [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2], [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2], [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 2]] // [MIDI 음, 박]
};
/* ───────── 정각 종 표 (HOURLY_CHIME_PLAN.md 4-2) ─────────
   숫자만 고치면 된다. 앞 차임(웨스트민스터 차임, 넷째 마디까지) 뒤에 시각만큼 타종. 손님 시간표는 chimePlan이 돌려주는 시각을 따른다.
   차임은 녹음 파일(file)을 쓴다. 파일을 아직 못 받았거나 못 읽으면 같은 박자로 만든 소리(melody). 박자는 녹음에 맞춘 것(첫 음 0.16초, 음 간격 0.845초) */
export const CHIME = {
  files: { quarters: 'sound/chime-westminster-v1.mp3', strike: 'sound/chime-strike-v1.mp3' }, // 녹음: 차임(20초, 음 16개 + 여운), 타종 한 번(2.5초). 출처는 ASSET_LICENSE.md
  fileVol: 1.6, // 녹음 크기 (vol·volQuiet에 곱한다)
  fileFar: 1800, // 녹음: 이 Hz 위를 깎는다 (멀리서 들려오는 종처럼, HOURLY_CHIME_PLAN.md 14장)
  lead: 0.16, // 녹음에서 첫 음까지(초). 만든 소리도 같은 시각에
  melody: [[68, 1], [66, 1], [64, 1], [59, 2], [64, 1], [68, 1], [66, 1], [59, 2], [64, 1], [66, 1], [68, 1], [64, 2], [68, 1], [64, 1], [66, 1], [59, 2]], // [MIDI 음, 박]
  phrase: 0, // 마디(5박) 사이 쉼(박)
  beat: 0.845, // 차임 한 박(초)
  hourNote: 52, // 타종 음 (E3)
  gap: 1.2, // 차임 끝 ~ 첫 타종(초)
  strike: 2.4, // 타종 간격(초)
  tail: 2.2, // 마지막 타종 뒤 여운(초)
  vol: 0.06, // 낮 소리 크기 (멀리서 들리게 줄임, HOURLY_CHIME_PLAN.md 14장)
  volQuiet: 0.02, // 불 꺼진 시간 (HOURLY_CHIME_PLAN.md 3장: 밤엔 작게). 낮과 같은 비율로 줄임
  far: 1900, // 멀리서 들리게: 이 Hz 위를 깎는다
  guestAt: 1.2, // 손님이 나오는 때: 차임 시작 몇 초 뒤
  guestOut: 0.4, // 차임 마지막 음 끝 ~ 손님 퇴장(초). gap보다 작게 (손님은 차임에서만, HOURLY_CHIME_PLAN.md 14장)
  danceBeat: 0.6, // 정각 손님 춤 한 칸(초). 파티(0.34)보다 느리게 살랑살랑
};
// 종 시간표 (소리가 꺼져 있어도 같은 길이): { notes: [[초, MIDI, 울림초]], strikes: [초], leave: 손님 퇴장(초), sec }
export function chimePlan(n) {
  const c = CHIME, notes = [];
  let at = 0, inPhrase = 0;
  for (const [m, d] of c.melody) {
    notes.push([c.lead + at * c.beat, m, d * c.beat + 1.6]);
    at += d;
    inPhrase += d;
    if (inPhrase >= 5) {
      at += c.phrase;
      inPhrase = 0;
    }
  }
  const end = c.lead + (at - c.phrase) * c.beat, t0 = end + c.gap, strikes = []; // end: 차임 마지막 음 끝
  for (let i = 0; i < n; i++)
    strikes.push(t0 + i * c.strike);
  return { notes, strikes, leave: end + c.guestOut, sec: strikes[strikes.length - 1] + c.tail };
}
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
  // 생일 노래: 소리가 켜져 있으면 연주하고 { sec, beat, phrases }를 돌려준다. 꺼져 있으면 null (BIRTHDAY_GUESTS_PLAN.md 4-1)
  // 녹음을 받아 두었으면 녹음, 아니면 만든 소리 (BIRTHDAY_SONG_PLAN.md 4장)
  birthdaySong() {
    if (!this.on || !this.ac)
      return null;
    const ac = this.ac, start = ac.currentTime + 0.08, { beat, notes, phrases } = BDAY_SONG;
    if (this.recBufs.birthday) {
      const b = BDAY_SONG, src = ac.createBufferSource(), g = ac.createGain();
      src.buffer = this.recBufs.birthday;
      g.gain.value = b.fileVol;
      src.connect(g);
      g.connect(this.master);
      src.start(start);
      return { sec: b.fileSec, beat: b.fileBeat, phrases: b.filePhrases };
    }
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
    return { sec: at * beat + .15, beat, phrases };
  },
  // 녹음 준비: 소리가 켜져 있으면 파일을 받아 Web Audio로 풀어 둔다(recBufs[이름]). 쓸 때까지 못 풀면 그때는 만든 소리. 매 장면 불러도 된다
  // group: 묶음 이름(다 받았으면 바로 빠진다), files: { 이름: 주소 }
  recBufs: {}, recRaw: {}, recBusy: {}, recDone: {},
  prepRec(group, files) {
    if (!this.on || this.recDone[group]) // 소리를 켠 사람만 받는다. 다 받았으면(또는 못 받기로 끝났으면) 바로 빠진다
      return;
    const list = Object.entries(files || {});
    if (list.every(([k]) => this.recBufs[k] || this.recRaw[k] === false)) {
      this.recDone[group] = true;
      return;
    }
    for (const [k, url] of list) {
      if (this.recBufs[k] || this.recBusy[k] || this.recRaw[k] === false)
        continue;
      this.recBusy[k] = true;
      const done = () => {
        this.recBusy[k] = false;
      }, bad = () => {
        this.recRaw[k] = false; // false: 못 받음·못 읽음 → 만든 소리로
      };
      if (!this.recRaw[k])
        fetch(url).then(r => r.ok ? r.arrayBuffer() : null).then(b => {
          this.recRaw[k] = b || false;
        }).catch(bad).finally(done);
      else if (this.ac)
        this.ac.decodeAudioData(this.recRaw[k].slice(0)).then(buf => {
          this.recBufs[k] = buf;
        }).catch(bad).finally(done);
      else
        done();
    }
  },
  // 녹음 차임 받아 두기. 첫 종까지 못 풀면 그 종은 만든 소리 (chime.js)
  prepChime() {
    this.prepRec('chime', CHIME.files);
  },
  // 녹음 생일 노래 받아 두기. 춤 시작까지 못 풀면 그 파티는 만든 소리 (birthday.js, 생일 링크일 때만)
  prepSong() {
    if (BDAY_SONG.file)
      this.prepRec('song', { birthday: BDAY_SONG.file });
  },
  // 정각 종: 소리가 켜져 있으면 plan(chimePlan)대로 울리고 { t0: 시작한 오디오 시각, stop() }. 꺼져 있으면 false. 멀리서 들리게 고음을 깎는다
  chime(plan, quiet) {
    if (!this.on || !this.ac)
      return false;
    const ac = this.ac, t0 = ac.currentTime + 0.05, c = CHIME, out = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = c.far;
    out.gain.value = quiet ? c.volQuiet : c.vol;
    lp.connect(out);
    out.connect(this.master);
    const bell = (t, m, ring, v) => { // 종 배음 몇 개 + 긴 여운
      const f = 440 * Math.pow(2, (m - 69) / 12);
      [[0.5, 0.35], [1, 1], [1.19, 0.45], [1.5, 0.3], [2, 0.4], [2.74, 0.18], [3.76, 0.1]].forEach(([r, a], i) => {
        const o = ac.createOscillator(), g = ac.createGain(), dur = ring * (i ? 1 / (1 + i * 0.35) : 1.4);
        o.type = 'sine';
        o.frequency.value = f * r;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09 * a * v, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.05);
      });
    };
    const B = this.recBufs;
    let rec = null; // 녹음을 틀 곳 (한 번 만든다)
    const playRec = (buf, t) => {
      if (!rec) {
        const fl = ac.createBiquadFilter();
        rec = ac.createGain();
        fl.type = 'lowpass';
        fl.frequency.value = c.fileFar;
        rec.gain.value = (quiet ? c.volQuiet : c.vol) * c.fileVol;
        rec.connect(fl);
        fl.connect(this.master);
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(rec);
      src.start(t);
    };
    if (B.quarters) // 녹음 차임 (0초부터 틀면 lead 뒤에 첫 음)
      playRec(B.quarters, t0);
    else
      plan.notes.forEach(([t, m, ring]) => bell(t0 + t, m, ring, 0.8));
    plan.strikes.forEach(t => B.strike ? playRec(B.strike, t0 + t) : bell(t0 + t, c.hourNote, 4.5, 1.2)); // 타종: 녹음 한 번을 시각만큼
    return { t0, stop() { // 시간 점프: 남은 종소리를 끊는다
      out.disconnect();
      if (rec)
        rec.disconnect();
    } };
  },
  // 생일 손님이 "짠" 나타나고 사라질 때: 아주 작은 "뽁"
  pop(v = 1) {
    if (!this.on || !this.ac)
      return;
    const ac = this.ac, t = ac.currentTime, o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(rnd(520, 640), t);
    o.frequency.exponentialRampToValueAtTime(rnd(1300, 1600), t + 0.07);
    this.env(o, t, 0.004, 0.11, 0.06 * v);
    o.start(t);
    o.stop(t + 0.2);
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
    // 사건의 소리는 programs.json의 sfx
    if (e.sfx === 'homerun') {
      this.thump(0.35, 2600);
      setTimeout(() => this.tvCheer(1), 120);
    }
    else if (e.sfx === 'cheer')
      this.tvCheer(1.2);
    else if (e.sfx === 'click')
      this.click();
  },
  setAmb(rain, tv, dark) {
    if (!this.on)
      return;
    const t = this.ac.currentTime;
    this.rainG.gain.setTargetAtTime(rain ? 0.16 : 0, t, 1.5);
    this.tvG.gain.setTargetAtTime(tv ? 0.004 * (0.6 + 0.4 * Math.sin(t * 1.7) * Math.sin(t * 0.6)) : 0, t, 0.3); // TV 잡음 (2026-10-22: 바람 소리처럼 커서 1/3로)
    this.roomG.gain.setTargetAtTime(0, t, 2); // 방 잡음: 끔 (2026-10-22: 바람 소리처럼 들려서. 예전 값 dark ? 0.05 : 0.08)
  }
};
