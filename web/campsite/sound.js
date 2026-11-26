/* 캠핑장 소리 (CAMPSITE_PLAN.md 6장, tasks/campsite-4-sound.md)
   실제 녹음만(합성음 X). 파일은 tools/make_campsite_sounds.py가 만든 sound/*.mp3, 출처는 ASSET_LICENSE.md
   - 늘: 장작 타닥(불), 개울 졸졸(카메라가 개울 쪽을 보면 커지고 그쪽 귀로), 풀벌레(작게)
   - 가끔: 먼 숲에서 부엉이(숲 쪽 귀로), 장작 '툭'
   - 기억 태우기: 타자 키(여러 소리를 돌려 가며 살짝 높낮이를 바꿈), 줄이 떠날 때 '띵', 글자가 불에 들어갈 때 작은 '툭'
   - 소리 켬/끔은 방과 같은 기록(store 'sound', 기본 켬). 브라우저 규칙상 처음 누르거나 칠 때 시작. 화면을 가리면 멈춤 */
import { FRONT } from './backdrop.js';

export const SOUND = {
  fire: 0.55, crickets: 0.12, owl: 0.28, pop: 0.45, key: 0.55, bell: 0.4, burn: 0.25,
  stream: [0.08, 0.45],      // 개울: [등지고 있을 때, 바로 볼 때]
  streamRel: -0.33,          // 물소리 방향 (호수 쪽에서 오른쪽으로 잰 각) — 먼 산 골짜기의 폭포(backdrop.js SKY.fall)
  owlRel: Math.PI,           // 부엉이는 뒤쪽 숲
  owlEvery: [45, 110],       // 부엉이 간격(초)
  popEvery: [14, 40],        // 장작 '툭' 간격(초)
  fadeIn: 2.5,
};
const FILES = {
  fire: 'fire-loop-v1', stream: 'stream-loop-v1', crickets: 'crickets-loop-v1', owl: 'owl-v1', bell: 'typewriter-bell-v1',
  key: [1, 2, 3, 4, 5, 6].map(n => `typewriter-key-${n}-v1`), pop: [1, 2, 3].map(n => `log-pop-${n}-v1`),
};
const rnd = (a, b) => a + Math.random() * (b - a);

export function makeSound({ store }) {
  let on = store.get('sound', true), ac = null, master = null, buf = {}, loops = null, started = false;
  let nextOwl = 0, nextPop = 0;
  const load = async name => {
    const r = await fetch(`sound/${name}.mp3`);
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
      const all = [FILES.fire, FILES.stream, FILES.crickets, FILES.owl, FILES.bell, ...FILES.key, ...FILES.pop];
      const got = await Promise.all(all.map(load));
      all.forEach((n, i) => { buf[n] = got[i]; });
      const loop = (name, gain, pan = 0) => {
        const s = ac.createBufferSource(), g = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : null;
        s.buffer = buf[name];
        s.loop = true;
        g.gain.value = gain;
        s.connect(g);
        if (p) { p.pan.value = pan; g.connect(p).connect(master); } else g.connect(master);
        s.start(0, Math.random() * s.buffer.duration * 0.8);
        return { g, p };
      };
      loops = { fire: loop(FILES.fire, SOUND.fire), stream: loop(FILES.stream, SOUND.stream[0]), crickets: loop(FILES.crickets, SOUND.crickets) };
      master.gain.setTargetAtTime(1, ac.currentTime, SOUND.fadeIn / 3);
      const t = ac.currentTime;
      nextOwl = t + rnd(15, 40);
      nextPop = t + rnd(...SOUND.popEvery);
    }
    catch (e) {
      console.warn('캠핑장 소리를 못 켬', e);
    }
  };
  // 한 번 울리기 (rate: 높낮이, pan: -1 왼쪽 ~ 1 오른쪽)
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
  // 그 방향이 화면 어느 쪽인가: 0 정면, ±1 옆, 뒤는 다시 0 쪽으로 (귀 좌우)
  const sideOf = (rel, yaw) => Math.sin(FRONT + rel - yaw);
  const facing = (rel, yaw) => Math.cos(FRONT + rel - yaw);

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
    // 프레임마다: 개울 크기·방향, 가끔 부엉이·장작 툭
    update(yaw) {
      if (!loops || !ac || ac.state !== 'running') return;
      const t = ac.currentTime, f = Math.max(0, facing(SOUND.streamRel, yaw));
      loops.stream.g.gain.setTargetAtTime(SOUND.stream[0] + (SOUND.stream[1] - SOUND.stream[0]) * f * f, t, 0.3);
      if (loops.stream.p) loops.stream.p.pan.setTargetAtTime(sideOf(SOUND.streamRel, yaw) * 0.8, t, 0.3);
      if (t > nextOwl) { once(FILES.owl, SOUND.owl, rnd(0.97, 1.03), sideOf(SOUND.owlRel, yaw) * 0.7); nextOwl = t + rnd(...SOUND.owlEvery); }
      if (t > nextPop) { once(FILES.pop[(Math.random() * FILES.pop.length) | 0], SOUND.pop, rnd(0.9, 1.1)); nextPop = t + rnd(...SOUND.popEvery); }
    },
    key: () => once(FILES.key[(Math.random() * FILES.key.length) | 0], SOUND.key, rnd(0.94, 1.06)),
    bell: () => once(FILES.bell, SOUND.bell),
    burn: () => once(FILES.pop[(Math.random() * FILES.pop.length) | 0], SOUND.burn, rnd(1.2, 1.5)),
  };
}
