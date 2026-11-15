/* 불꽃놀이 (FIREWORKS_PLAN.md): 건너편 아파트 너머 먼 하늘의 불꽃. 그림 없이 전부 코드로 그린다.
   - "언제"는 time.js fireworksShow(달력 calendar.js CAL.fireworks): 매주 토요일 밤, 불꽃축제 날, 크리스마스이브, 새해 0시.
     생일 파티 끝 불꽃만 파티가 부른다(fireworksBirthday). 미리보기 버튼은 그 공연을 지금 시작한 것처럼(setFireworksOverride)
   - 공연 하나 = 씨앗(공연 id)으로 정해지는 한 발 한 발의 목록. 그리기는 "공연 시작부터 지난 시간"의 함수라
     새로 고침·시간 점프에도 정리가 필요 없다(무지개와 같은 방식). 소리·강고양이 씨 반응만 진행(tick)에서
   - 그리는 자리: 동그란 불꽃은 skyBack(하늘 다음, 산·건물 판 전) → 낮게 터진 불꽃·올라가는 꼬리는 산과 건물 뒤로 가려진다.
     모양·글자 불꽃은 sky(산 앞): 생일 배너(화면 위)에 가리지 않게 산 앞·아파트 지붕 위에서 읽히도록
     방 안에는 큰 한 발마다 아주 옅은 색 번쩍임(shadow)
   - 모양 불꽃: 보이지 않는 작은 캔버스에 글자·도형을 그려 점을 뽑고, 불티가 그 자리로 날아가 잠깐 모양을 유지하다 처지며 꺼진다 */
import { tr } from './i18n.js';
import { S } from './objects.js';
import { play } from './anim.js';
import { Snd } from './sound.js';
import { ctx, H, W } from './stage.js';
import { bub, go, hold, run } from './steps.js';
import { darkness, fireworksShow, mandukAsleep, mandukHome, now, rainNow, setFireworksOverride, setOverride } from './time.js';
import { winFree } from './behave.js';
import { WIN } from './win.js';
import { RM, clamp, cutChars, hash, rnd } from './util.js';
import { makeFw, rgba } from './fw-core.js';
import { after, caption, cat, world } from './world.js';

/* ───────── 숫자 (한 곳) ───────── */
export const FW = {
  zone: { x: [95, 470], y: [48, 160] }, // 터지는 자리 (창 안 좌표). 커튼에 덜 가리고, 산 능선 위·뒤
  launchY: 340,                          // 올라가기 시작하는 높이 (창 안, 산·건물 뒤라 안 보임)
  frontY: 345,                           // 모양·글자 불꽃이 올라오기 시작하는 높이 (건너편 아파트 지붕 바로 위)
  text: { x: 165, y: 178, h: 44, w: 200 }, // 글자 불꽃 자리(가운데)와 크기 (창 안). 생일 배너에 가리지 않게 산 앞·아파트 지붕 위, 창 왼쪽 칸 안(가운데 창살을 덜 넘게)
  chars: { ko: 4, latin: 8 },             // 한 번에 터뜨리는 글자 수 (한글·영어). 긴 이름은 나눠서
  sound: 1.3,                             // 터지고 나서 소리가 들릴 때까지 (초, 멀리 있으니까)
  catEvery: 90,
  textGap: 2.3,                           // 생일 글자 불꽃끼리 간격 (초). 같은 자리라 앞 글자가 꺼진 뒤 다음
  escort: { n: [2, 3], at: [-600, 1600], gap: 90 }, // 모양·글자 한 발마다 배경 불꽃 몇 발(n), 그 발 기준 언제(ms), 가운데에서 얼마나 비켜서(창 안 px)                           // 공연 중 강고양이 씨가 다시 보러 갈지 살피는 간격 (방 시각 초)
};
/* ───────── 모양·한 발·그리기는 fw-core.js (광장과 같이 씀). 여기선 방 숫자(FW)·창 자리로 ───────── */
const F = makeFw(FW);
const { shell, rhythm, escorts } = F;
const drawShell = (s, tau, vis) => F.drawShell(ctx, WIN.rect.x, WIN.rect.y, s, tau, vis);
const drawRise = (s, u, vis) => F.drawRise(ctx, WIN.rect.x, WIN.rect.y, s, u, vis);

// 글자를 한 번에 터뜨릴 만큼씩 나눈다: 띄어쓰기에서 먼저, 그래도 길면 글자 수로. 이모지·기호는 뺀다
export function textChunks(s) {
  const clean = Array.from(String(s || '')).filter(ch => /[\p{L}\p{N} '’.!&-]/u.test(ch)).join('').replace(/\s+/g, ' ').trim();
  const out = [];
  for (const word of clean.split(' ').filter(Boolean)) {
    const ko = /[ㄱ-힝]/.test(word), n = ko ? FW.chars.ko : FW.chars.latin, a = Array.from(word);
    for (let i = 0; i < a.length; i += n)
      out.push(a.slice(i, i + n).join(''));
  }
  // 짧은 조각 둘은 한 번에 (예: "만득" + "씨" → "만득 씨")
  const merged = [];
  for (const c of out) {
    const last = merged[merged.length - 1], ko = /[ㄱ-힝]/.test(c), n = ko ? FW.chars.ko : FW.chars.latin;
    if (last && Array.from(last + ' ' + c).length <= n + (ko ? 1 : 1))
      merged[merged.length - 1] = last + ' ' + c;
    else
      merged.push(c);
  }
  return merged;
}

const progCache = { id: null, v: null };
function program(show) {
  if (progCache.id === show.id)
    return progCache.v;
  const id = show.id, out = [];
  if (show.kind === 'birthday') {
    // 생일 노래에 맞춰 (노래를 바꾸면 소절 표 BDAY_SONG.phrases만 맞으면 된다): 터지는 시각(초, 노래 시작부터)
    //   1소절: 여는 두 발 · 2소절: 하트 · 3소절("사랑하는 ○○○"): 이름 · 4소절부터: "생일 / 축하해" → 마무리 (노래가 끝난 뒤까지 이어질 수 있다)
    const cue = show.cues, gap = FW.textGap, out2 = [];
    let i = 0;
    const at = (burst, o) => { // 터지는 시각에 맞춰 쏘아 올린다 (노래 시작 전에는 못 쏘므로 올라가는 시간을 줄임)
      const rise = Math.max(0.5, Math.min(o.rise || 1.1, burst));
      out2.push(shell(id, i++, Math.max(0, burst - rise) * 1000, { ...o, rise }));
    };
    at(Math.max(0.6, cue[0] + 0.6), { big: true });
    at(Math.max(1.1, cue[0] + 1.1), { big: true });
    at(cue[1], { shape: 'heart', col: [255, 120, 160], tilt: 0, squash: 1, R: 40, x: 390, y: 190 });
    let t = cue[2];
    for (const c of show.names) {
      at(t, { text: c, col: [255, 225, 150], col2: [255, 150, 180], hold: gap - 0.8 });
      t += gap;
    }
    t = Math.max(t, cue[3]);
    for (const c of tr('fwBday')) {
      at(t, { text: c, col: [180, 230, 255], col2: [255, 255, 235], hold: gap - 0.8 });
      t += gap;
    }
    for (let k = 0; k < 4; k++)
      at(t - 0.6 + k * 0.38, { big: true });
    out.push(...out2);
  }
  else if (show.kind === 'cat') {
    out.push(shell(id, 0, 300, { shape: 'cat', col: [255, 214, 160], tilt: 0, squash: 1, R: 40, x: 250, y: 180 }));
  }
  else {
    const opt = {
      weekly: { shape: 0.07, shapes: ['heart', 'flower', 'star'] },
      fest: { shape: 0.2, shapes: ['heart', 'flower', 'star', 'cat'] },
      xmasEve: { shape: 0.35, shapes: ['star', 'tree', 'star'] },
      newyear: { shape: 0.12, shapes: ['heart', 'flower', 'star'] },
    }[show.kind];
    for (const [a, b] of show.parts)
      rhythm(id, out, a, b, opt);
    // 토요일 공연의 강고양이 씨 얼굴: 넷에 한 번 꼴, 공연 가운데쯤 한 발 (설명 없음)
    if (show.kind === 'weekly' && hash('fwcat' + id) < 0.25)
      out.push(shell(id, 900, show.parts[0][1] * (0.3 + hash('fwcatT' + id) * 0.3), { shape: 'cat', col: [255, 214, 160], R: 36 }));
    if (show.kind === 'newyear' && show.midnight != null) {
      // 자정: 큰 세 발 + 새해 연도 숫자, 조금 뒤 한 번 더
      const m = show.midnight;
      for (const s of out) // 연도 숫자와 겹치지 않게 자정 앞뒤의 모양 불꽃은 동그란 불꽃으로
        if (s.front && s.at > m - 4000 && s.at < m + 12000)
          Object.assign(s, { front: false, kind: 'peony', life: 2.3, y: FW.zone.y[0] + (s.y % 1) * 60 });
      for (let k = 0; k < 3; k++)
        out.push(shell(id, 800 + k, m - 1200 + k * 200, { big: true }));
      out.push(shell(id, 810, m + 400, { text: String(show.year || ''), col: [255, 230, 160], col2: [255, 255, 240] }));
      out.push(shell(id, 811, m + 6000, { text: String(show.year || ''), col: [170, 225, 255], col2: [255, 200, 230] }));
      out.push(shell(id, 812, show.parts[0][1] - 6000, { shape: 'flower', big: true, R: 62, col: [255, 190, 210], tilt: 0, squash: 1 }));
    }
  }
  escorts(id, out);
  out.sort((p, q) => p.at - q.at);
  progCache.id = id;
  progCache.v = out;
  return out;
}

/* ───────── 지금 공연 ───────── */
const ST = { show: null, manual: null, lastT: null, seen: null, catAt: -1e9, earAt: -1e9, capAt: -1e9, nyDone: null };
function currentShow(d) {
  const t = d.getTime(), m = ST.manual;
  if (m) {
    if (t >= m.start && t < m.end)
      return m;
    if (t >= m.end || t < m.start - 1000)
      ST.manual = null;
  }
  return fireworksShow(d);
}
const showEnd = (show, list) => show.end != null ? show.end : list.length ? show.start + list[list.length - 1].at + 6000 : show.start;
function manualShow(kind, extra = {}) {
  const t = now().getTime(), s = { id: kind + t, kind, start: t, end: t + 60000, ...extra };
  ST.manual = s;
  const list = program(s);
  s.end = showEnd({ ...s, end: null }, list);
}
// 생일 노래가 시작될 때 (birthday.js startSong). song: { sec, beat, phrases(박) } — phrases가 없으면(소리 꺼짐) 길이 비율로.
// 비 오는 날은 쉰다
const SONG_CUES = [0, 6, 12, 19], SONG_BEATS = 25; // 소리 꺼짐일 때: 노래 25박 중 소절 시작 박 (sound.js BDAY_SONG과 같은 비율)
export function fireworksBirthday(name, song = null) {
  if (rainNow(now()) || !WIN.rect)
    return;
  const names = textChunks(cutChars(name, 24));
  const cues = song && song.phrases ? song.phrases.map(b => b * song.beat) : SONG_CUES.map(b => b / SONG_BEATS * (song ? song.sec : 8.65));
  manualShow('birthday', { names, cues });
}

/* ───────── 그리기 ───────── */
// 창밖: 동그란 불꽃은 하늘 다음·산 전(front false), 모양·글자는 산 앞(front true)
function drawSky(w, front) {
  const show = ST.show;
  if (!show)
    return false;
  const d = now(), el = (d.getTime() - show.start) / 1000, list = program(show);
  const night = clamp(darkness(d) / 0.62, 0, 1), vis = 0.55 + 0.45 * night;
  ctx.save();
  ctx.beginPath();
  ctx.rect(w.x, w.y, w.w, w.h);
  ctx.clip();
  ctx.globalCompositeOperation = night > 0.45 ? 'lighter' : 'source-over'; // 밤엔 빛이 겹치면 더 밝게
  for (const s of list) {
    const t0 = s.at / 1000;
    if (t0 > el)
      break;
    if (!!s.front !== front)
      continue;
    const tau = el - t0 - s.rise;
    if (tau < -s.rise || tau > s.life + 0.2)
      continue;
    if (tau < 0)
      drawRise(s, 1 + tau / s.rise, vis);
    else
      drawShell(s, tau, vis);
  }
  ctx.restore();
  return true;
}
// 방 안: 큰 한 발마다 아주 옅은 색 번쩍임 (어둠 위)
function flashLevel(show, el) {
  let lv = 0, col = [255, 230, 200];
  for (const s of program(show)) {
    if (s.at / 1000 > el)
      break;
    const tau = el - s.at / 1000 - s.rise;
    if (tau >= 0 && tau < 0.6) {
      const v = (1 - tau / 0.6) ** 2 * (s.big ? 1 : 0.45);
      if (v > lv * 0.6)
        col = s.col;
      lv += v;
    }
  }
  return [Math.min(1, lv), col];
}
function drawRoom(dk) {
  const show = ST.show;
  if (!show || dk < 0.25)
    return;
  const d = now(), el = (d.getTime() - show.start) / 1000, [lv, col] = flashLevel(show, el);
  if (lv <= 0.01)
    return;
  const cx = WIN.rect.x + WIN.rect.w / 2, cy = WIN.rect.y + WIN.rect.h * 0.4;
  const g = ctx.createRadialGradient(cx, cy, 40, cx, cy, W * 0.9);
  const a = lv * 0.075 * Math.min(1, dk / 0.6) * (RM ? 0.3 : 1);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(1, rgba(col, a * 0.25));
  ctx.fillStyle = g;
  ctx.fillRect(-W, 0, W * 3, H);
}

/* ───────── 진행: 소리·자막·강고양이 씨·만득 씨 ───────── */
function onBurst(s, show) {
  const v = s.big ? 0.35 : s.kind === 'shape' ? 0.25 : 0.16;
  after(() => Snd.boom(v, s.big ? 90 : 120), FW.sound + rnd(-0.1, 0.2));
  if (world.t - ST.capAt > 45 && s.big) {
    ST.capAt = world.t;
    after(() => caption(tr('capFireworks'), 3), FW.sound);
  }
  // 자고 있으면 큰 한 발에 귀만 움찔 (실제 1분에 한 번까지)
  if (s.big && cat.closed && world.t - ST.earAt > 60 && cat.dp === 'loaf' && !cat.act && !cat.moving && !world.party) {
    ST.earAt = world.t;
    after(() => {
      if (cat.closed && !cat.act)
        cat.react = { f: 'tv_ear_turn', t: 1.5 };
    }, FW.sound);
  }
  // 새해 자정: 만득 씨 목소리 (집에 있고 깨어 있을 때, 그 공연에 한 번)
  if (show.kind === 'newyear' && s.text && ST.nyDone !== show.id) {
    ST.nyDone = show.id;
    const d = now();
    if (mandukHome(d) && !mandukAsleep(d) && !world.manduk)
      after(() => caption(tr('capNewYear'), 5), 3);
  }
}
// 깨어 있으면 창가로 가서 구경 (고개로 따라가기 = 올려다보기). 바쁘면 다음에
function catWatch() {
  if (world.manduk || world.party || cat.inBox || cat.dance || cat.typing || cat.closed || !winFree(cat))
    return false;
  const ws = S('window.watch');
  if (!ws)
    return false;
  const here = cat.tag === 'fireworks';
  run(cat, [
    ...(here ? [] : [go(ws[0] + rnd(-30, 30), ws[1], 70), hold(0.5, 'stand', false, -1)]),
    bub('🎆', 2.5),
    play('lookup', 4),
    play('window', rnd(20, 40)),
    play('lookup', 3),
    bub('✨', 2),
    play('window', rnd(20, 40)),
    hold(rnd(8, 15), 'loaf', false, -1)
  ], 'fireworks');
  return true;
}
function tick(d) {
  const show = WIN.rect ? currentShow(d) : null, t = d.getTime();
  ST.show = show;
  if (!show) {
    ST.lastT = null;
    return;
  }
  const list = program(show);
  if (ST.lastT != null && t > ST.lastT && t - ST.lastT < 2000) {
    const a = (ST.lastT - show.start) / 1000, b = (t - show.start) / 1000;
    for (const s of list) {
      const bt = s.at / 1000 + s.rise;
      if (s.at / 1000 > b)
        break;
      if (bt > a && bt <= b)
        onBurst(s, show);
    }
  }
  ST.lastT = t;
  // 강고양이 씨: 공연이 시작되면 한 번, 그 뒤로는 가끔 다시 (생일 파티 중엔 춤추느라 안 봄)
  if (show.kind !== 'birthday' && (ST.seen !== show.id || world.t - ST.catAt > FW.catEvery)) {
    if (ST.seen !== show.id || Math.random() < 0.35)
      catWatch();
    ST.seen = show.id;
    ST.catAt = world.t;
  }
}

/* ───────── 미리보기 ───────── */
function preview(kind) {
  setOverride('rain', false);
  const t = now().getTime();
  ST.manual = null;
  if (kind === 'newyear') // 자정 8초 전부터 (연도 숫자가 바로 보이게)
    setFireworksOverride({ kind, start: t - (5 * 60 - 8) * 1000 });
  else
    setFireworksOverride({ kind, start: t });
  ST.lastT = null;
}
export const fireworksEvent = {
  needs: ['window'], // 장면에 이 장소가 없으면 이 일은 없다 (SCENE_PLAN.md 7장)
  id: 'fireworks',
  cls: 'sky',
  active: () => !!ST.show,
  tick: d => tick(d),
  skyBack: w => drawSky(w, false),
  sky: w => drawSky(w, true),
  shadow: drawRoom,
  reset() {
    ST.lastT = null; // 시간 점프: 지나간 발의 소리는 내지 않는다. 그림은 시각의 함수라 그대로
    ST.manual = null;
  },
  dev: [
    { btn: 'dFw', go: () => preview('weekly') },
    { btn: 'dFwFest', go: () => preview('fest') },
    { btn: 'dFwXmas', go: () => preview('xmasEve') },
    { btn: 'dFwNy', go: () => preview('newyear') },
    { btn: 'dFwBday', go: () => {
        setFireworksOverride(null);
        setOverride('rain', false);
        fireworksBirthday(new URLSearchParams(location.search).get('birthday') || tr('fwDevName'));
      } },
    { btn: 'dFwCat', go: () => {
        setFireworksOverride(null);
        manualShow('cat');
      } },
  ],
  debug: { fireworksBirthday, textChunks, fwShow: () => ST.show, fwProgram: () => ST.show && program(ST.show) },
};
