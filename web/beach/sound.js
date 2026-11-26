/* 해변 소리 (BEACH_PLAN.md 6장, tasks/beach-4-sound.md)
   실제 녹음만(합성음 X). 파일은 tools/make_beach_sounds.py가 만든 sound/*.mp3, 출처는 ASSET_LICENSE.md
   - 늘: 파도(밀려왔다 빠지는 물), 바닷바람(해가 질수록·밤일수록 조금 커짐)
   - 해넘이 때(갈매기가 보일 때): 가끔 먼 갈매기 — 좌우 어느 쪽에서
   - 병이 모래 위에 멈출 때 '톡', 쪽지를 펼칠 때 종이 소리
   - 소리 켬/끔은 방·캠핑장과 같은 기록(store 'sound', 기본 켬). 브라우저 규칙상 처음 누를 때 시작. 화면을 가리면 멈춤 */
export const SOUND = {
  waves: 0.6,
  wind: [0.1, 0.22],        // 바닷바람: [낮, 밤]
  gull: 0.2, gullEvery: [7, 18],
  land: 0.5, paper: 0.55,
  fadeIn: 3,
};
const FILES = {
  waves: 'waves-loop-v1', wind: 'wind-loop-v1', land: 'bottle-land-v1', paper: 'paper-v1',
  gull: [1, 2, 3].map(n => `gull-${n}-v1`),
};
const rnd = (a, b) => a + Math.random() * (b - a);

export function makeSound({ store }) {
  let on = store.get('sound', true), ac = null, master = null, buf = {}, loops = null, started = false, nextGull = 0;
  const load = async name => {
    const r = await fetch(`sound/${name}.mp3`);
    if (!r.ok) throw new Error(name);
    return ac.decodeAudioData(await r.arrayBuffer());
  };
  const start = async () => {
    if (started || !on) return;
    started = true;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0;
      master.connect(ac.destination);
      const all = [FILES.waves, FILES.wind, FILES.land, FILES.paper, ...FILES.gull];
      const got = await Promise.all(all.map(load));
      all.forEach((n, i) => { buf[n] = got[i]; });
      const loop = (name, gain) => {
        const s = ac.createBufferSource(), g = ac.createGain();
        s.buffer = buf[name];
        s.loop = true;
        g.gain.value = gain;
        s.connect(g).connect(master);
        s.start(0, Math.random() * s.buffer.duration * 0.8);
        return { g };
      };
      loops = { waves: loop(FILES.waves, SOUND.waves), wind: loop(FILES.wind, SOUND.wind[0]) };
      master.gain.setTargetAtTime(1, ac.currentTime, SOUND.fadeIn / 3);
      nextGull = ac.currentTime + rnd(3, 8);
    }
    catch (e) {
      console.warn('해변 소리를 못 켬', e);
    }
  };
  const once = (name, gain, rate = 1, pan = 0) => {
    if (!on || !ac || !buf[name] || ac.state !== 'running') return;
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = buf[name];
    s.playbackRate.value = rate;
    g.gain.value = gain;
    s.connect(g);
    if (ac.createStereoPanner && pan) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(master); }
    else g.connect(master);
    s.start();
  };
  const gesture = () => { start(); if (ac && ac.state === 'suspended' && on) ac.resume(); };
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => window.addEventListener(ev, gesture, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend();
    else if (on) ac.resume();
  });
  return {
    get on() { return on; },
    toggle() {
      on = !on;
      store.set('sound', on);
      if (!on && ac) ac.suspend();
      if (on) { started ? ac && ac.resume() : start(); }
      return on;
    },
    // 프레임마다: night 0(낮)~1(밤), gulls 갈매기가 보이는가
    update(night, gulls) {
      if (!loops || !ac || ac.state !== 'running') return;
      const t = ac.currentTime;
      loops.wind.g.gain.setTargetAtTime(SOUND.wind[0] + (SOUND.wind[1] - SOUND.wind[0]) * night, t, 1.5);
      if (t > nextGull) {
        if (gulls) once(FILES.gull[(Math.random() * FILES.gull.length) | 0], SOUND.gull * rnd(0.6, 1), rnd(0.92, 1.05), rnd(-0.7, 0.7));
        nextGull = t + rnd(...SOUND.gullEvery);
      }
    },
    land: () => once(FILES.land, SOUND.land, rnd(0.95, 1.05), 0.25),
    paper: () => once(FILES.paper, SOUND.paper),
  };
}
