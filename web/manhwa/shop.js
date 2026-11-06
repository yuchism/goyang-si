/* 만화방 안 (tasks/manhwa-3-shop.md) — /manhwa/. 고양.시 방처럼 켜 두고 보는 한 장면. 방 코드는 시간(time.js)·발자국(catbook.js)만 빌린다
   - 24시간 영업. 방 시계의 낮·밤(time.js isNight): 낮엔 사장님이 계산대에서 존다, 밤엔 옆 자리에서 운동(편성 shop-plan.js)
   - 관람금지 책장: 책등·딱지·제목 모두 코드. 누르면 사장님이 느리게 대답, 아주 가끔 「네, 99세 이상입니다」 → 발자국만 있는 페이지
   - 신간 코너: 작품(scene.json works)마다 한 권 — 관람금지 책장에서 그만큼 빠진다. 누르면 그 작품 목록
   - 출입문: 고양.시로 돌아가기(/?from=manhwa)
   - 자리·크기는 shop/scene.json (바탕 그림 픽셀). 그림을 못 받으면 종이색 바탕 + 코드 책장·진열대·문
   - 그림은 서비스 워커 시작 묶음에 넣지 않는다(sw.js 만화방 칸 — 본 것만 담김)
   - ?dev=1: 시각 옮기기 + 그날 밤 편성 */
import { atHour, clockText, isNight, nightOf, now, setSimMs } from '../js/time.js';
import { hash } from '../js/util.js';
import { pawsHTML } from '../js/catbook.js';
import { MOVE_SEC, gymAt, moving, nightPlan } from './shop-plan.js';

const body = document.body;
const DIR = 'shop/';
const HOME = '/?from=manhwa'; // 고양.시가 딸랑 + 문으로 맞는다 (tasks/manhwa-2-gate.md)
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEV = /[?&]dev=1/.test(location.search);

/* ───────── 글자 (viewer.js와 같은 규칙: 저장한 언어 → 브라우저 언어) ───────── */
const STR = {
  title: { ko: '고양.시 만화방', en: 'Goyang Comic Café' },
  home: { ko: '고양.시로 돌아가기', en: 'Back to goyang.si' },
  fresh: { ko: '신간', en: 'New' },
  sticker: { ko: '99세 이하 관람금지', en: 'No one under 99' },
  yes99: { ko: '네, 99세 이상입니다', en: "Yes, I'm 99 or older" },
  close: { ko: '닫기', en: 'Close' },
  sloth: { ko: '사장님', en: 'The owner' },
  // 사장님 말 — 한 글자씩 느리게 (만화방 1 「아…직…이…에…요…」와 같은 방식)
  hello: { ko: ['어…서…오…세…요…', '천…천…히…보…세…요…', '음…냐…', '신…간…은… 저…쪽…이…에…요…'], en: ['W…e…l…c…o…m…e…', 'T…a…k…e… y…o…u…r… t…i…m…e…', 'M…m…m…', 'N…e…w… b…o…o…k…s… o…v…e…r… t…h…e…r…e…'] },
  idPlease: { ko: '손…님…, 신…분…증… 좀…', en: 'I…D…, p…l…e…a…s…e…' },
  young: { ko: '아…직… 젊…으…시…네…요…', en: 'Y…o…u… l…o…o…k… s…o… y…o…u…n…g…' },
  move: { ko: '영…차…', en: 'H…e…a…v…e…' },
  ex: {
    treadmill: { ko: '오…늘…3…미…터…', en: 'T…h…r…e…e… m…e…t…r…e…s… t…o…d…a…y…' },
    dumbbell: { ko: '하…나…', en: 'O…n…e…' },
    bar: { ko: '매…달…리…기…는… 자…신… 있…어…요…', en: 'H…a…n…g…i…n…g… i…s… m…y… t…h…i…n…g…' },
    mat: { ko: '이…것…도… 운…동…이…에…요…', en: 'T…h…i…s… c…o…u…n…t…s…' },
  },
  // 관람금지 책 가짜 제목 (실제 작품 패러디 없음)
  books: {
    ko: ['아주 긴 낮잠', '느린 오후', '천천히 걷는 법', '아직 이르다', '조금만 더', '나뭇가지 위에서', '이따가 할게요', '세 발톱 일기', '오늘도 늦잠', '느긋한 하루', '잎사귀 한 장', '기다림의 기술', '다음 주에', '꾸벅 꾸벅', '늘어진 계절', '멈춘 시계 아래', '한 걸음 반', '반쯤 감은 눈', '나중에 읽을 책', '낮잠의 역사'],
    en: ['A Very Long Nap', 'Slow Afternoon', 'How to Walk Slowly', 'Too Soon', 'Just a Little More', 'Up in the Branches', 'Later, Maybe', 'Diary of Three Claws', 'Overslept Again', 'An Easy Day', 'One Leaf', 'The Art of Waiting', 'Next Week', 'Nod, Nod', 'The Drooping Season', 'Under a Stopped Clock', 'One and a Half Steps', 'Half-Closed Eyes', 'Read It Later', 'A History of Naps'],
  },
  // 미리보기
  dNight: { ko: '오늘 밤 운동', en: "Tonight's workouts" },
  dDay: { ko: '낮 (사장님 졸기)', en: 'Day (dozing)' },
  dReal: { ko: '지금으로', en: 'Real time' },
  dNext: { ko: '다음 바뀜', en: 'Next change' },
  exName: { ko: { treadmill: '러닝머신', dumbbell: '아령', bar: '철봉', mat: '요가 매트' }, en: { treadmill: 'Treadmill', dumbbell: 'Dumbbell', bar: 'Pull-up bar', mat: 'Yoga mat' } },
};
const lsGet = (k, d) => {
  try {
    const v = localStorage.getItem('goyang.' + k);
    return v == null ? d : JSON.parse(v);
  }
  catch (e) {
    return d;
  }
};
const LANG = (() => {
  const saved = lsGet('lang', null);
  if (saved === 'ko' || saved === 'en')
    return saved;
  const ls = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
  return ls.some(l => /^ko\b/i.test(l || '')) ? 'ko' : 'en';
})();
const L = v => v[LANG];
const tr = key => L(STR[key]);

/* ───────── 통계 (GoatCounter goyangsi, viewer.js와 같은 방식) ───────── */
const gcEvent = (path, title) => {
  let tries = 0;
  const send = () => {
    const gc = window.goatcounter;
    if (gc && gc.count) {
      try {
        gc.count({ path: 'manhwa/shop/' + path, title: title || path, event: true });
      }
      catch (e) { }
      return;
    }
    if (++tries <= 40)
      setTimeout(send, 500);
  };
  send();
};
// 이벤트를 보낸 뒤 조금 있다가 떠난다
const leaveWith = (a, path, title) => a.addEventListener('click', ev => {
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button)
    return;
  ev.preventDefault();
  gcEvent(path, title);
  setTimeout(() => { location.href = a.href; }, 180);
});
// 새로 고침·뒤로 가기는 세지 않는다
const freshVisit = () => {
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  return !nav || nav.type === 'navigate';
};

/* ───────── 도우미 ───────── */
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls)
    n.className = cls;
  if (text != null)
    n.textContent = text;
  return n;
};
const img = (src, cls) => {
  const im = el('img', cls);
  im.alt = '';
  im.decoding = 'async';
  im.draggable = false;
  im.src = src;
  return im;
};
// 바탕 픽셀 자리 [x, y, w, h] → 절대 위치
const place = (n, [x, y, w, h]) => {
  Object.assign(n.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  return n;
};

/* ───────── 말풍선: 몇 초 늦게, 한 글자씩 ───────── */
let talkId = 0;
function say(bubble, text, onEnd) {
  const id = ++talkId;
  const chars = Array.from(text);
  const step = LANG === 'en' ? 260 : 420;
  bubble.hidden = true;
  bubble.textContent = '';
  const done = () => setTimeout(() => {
    if (id !== talkId)
      return;
    bubble.hidden = true;
    onEnd && onEnd();
  }, 2600);
  setTimeout(() => {
    if (id !== talkId)
      return;
    bubble.hidden = false;
    if (RM) {
      bubble.textContent = text;
      done();
      return;
    }
    chars.forEach((c, k) => setTimeout(() => {
      if (id !== talkId)
        return;
      bubble.textContent += c;
      if (k === chars.length - 1)
        done();
    }, k * step));
  }, RM ? 300 : 1400 + Math.random() * 1200); // 사장님은 늦게 대답한다
}

/* ───────── 장면 ───────── */
function build(cfg) {
  const [W, H] = cfg.size, S = cfg.scale;
  const view = el('main', 'sv');
  const stage = el('div', 'ss');
  const sc = el('div', 'sc');
  sc.style.width = W + 'px';
  sc.style.height = H + 'px';
  stage.append(sc);
  view.append(stage);
  view.setAttribute('aria-label', tr('title'));
  document.title = tr('title');

  // 바탕 낮·밤 (못 받으면 종이색 + 코드 그림)
  const bgs = {};
  for (const k of ['day', 'night']) {
    bgs[k] = img(DIR + cfg.bg[k] + '?v=' + cfg.v, 'bg bg-' + k);
    bgs[k].onerror = () => {
      bgs[k].remove();
      sc.classList.add('nobg-' + k);
    };
    sc.append(bgs[k]);
  }

  // 사장님 말풍선 (한 개를 낮·밤이 같이 쓴다)
  const bubble = el('p', 'bubble');
  bubble.hidden = true;
  bubble.setAttribute('aria-live', 'polite');

  /* 출입문 */
  const door = place(el('a', 'door'), cfg.door);
  door.href = HOME;
  door.setAttribute('aria-label', tr('home'));
  const sign = el('span', 'door-sign', '🔔 ' + tr('home'));
  door.append(sign);
  leaveWith(door, 'go-home', '만화방 → 고양.시');
  sc.append(door);

  /* 관람금지 책장 — 칸마다 책등. 신간 코너로 옮겨 간 책 수만큼 마지막 칸에서 빠진다 */
  const shelf = el('div', 'shelf');
  const cells = [];
  cfg.shelf.rows.forEach(([y, h]) => cfg.shelf.cols.forEach(([x, w]) => cells.push([x, y, w, h])));
  const COLORS = ['#7a3b2e', '#2f4a6b', '#3f5e3a', '#8a6a2f', '#5b3d5e', '#2e5a5a', '#6b4a33', '#38455f', '#7d5a48', '#4d3a2a'];
  const spines = [];
  cells.forEach((c, ci) => {
    const cell = place(el('div', 'cell'), c);
    let x = 3, k = 0;
    while (true) {
      const r = hash(ci + ':' + k + ':spine'), r2 = hash(k + ':' + ci + ':tall');
      const w = Math.round(15 + r * 9);
      if (x + w > c[2] - 3)
        break;
      const h = Math.round(c[3] * (0.72 + r2 * 0.22));
      const b = el('button', 'spine');
      b.type = 'button';
      const id = spines.length;
      b.style.cssText = `left:${x}px;width:${w}px;height:${h}px;background:${COLORS[Math.floor(hash('c' + id) * COLORS.length)]}`;
      b.setAttribute('aria-label', L(STR.books)[id % 20] + ' — ' + tr('sticker'));
      b.append(el('i', 'tag', '99'));
      b.dataset.id = id;
      cell.append(b);
      spines.push(b);
      x += w + (r2 < 0.15 ? 4 : 1);
      k++;
    }
    shelf.append(cell);
  });
  sc.append(shelf);

  /* 신간 코너 */
  const plate = place(el('div', 'plate', tr('fresh')), cfg.fresh.plate);
  sc.append(plate);
  const slots = cfg.fresh.slots.map(s => {
    const n = place(el('div', 'slot'), s);
    sc.append(n);
    return n;
  });
  loadWorks(cfg.works || [], slots, spines);

  /* 계산대 사장님 (낮): 네 장을 겹쳐 두고 보이는 것만 바꾼다(번갈아 천천히 비침) */
  const cc = cfg.counter, F = cc.frames;
  const counter = el('button', 'sloth counter');
  counter.type = 'button';
  counter.setAttribute('aria-label', tr('sloth'));
  place(counter, [cc.at[0] - cc.anchor[0] * S, cc.at[1] - cc.anchor[1] * S, 512 * S, 512 * S]);
  const frames = {};
  for (const k of Object.keys(F)) {
    frames[k] = img(DIR + F[k] + '?v=' + cfg.v, 'fr');
    counter.append(frames[k]);
  }
  sc.append(counter);

  /* 운동 자리 (밤) */
  const gc = cfg.gym, GS = 800 * S;
  const gym = el('button', 'sloth gym');
  gym.type = 'button';
  gym.setAttribute('aria-label', tr('sloth'));
  place(gym, [gc.at[0] - gc.anchor[0] * S, gc.at[1] - gc.anchor[1] * S, GS, GS]);
  sc.append(gym);

  // 말풍선은 사장님 머리 위 (낮: 계산대, 밤: 운동 자리)
  sc.append(bubble);
  const bubbleAt = night => {
    const [x, y] = night ? [gc.at[0], gc.at[1] - 700 * S] : [cc.at[0], cc.at[1] - 512 * S * 0.86];
    bubble.style.left = Math.min(x, W - 230) + 'px'; // 오른쪽 끝에서 잘리지 않게
    bubble.style.top = y + 'px';
  };

  /* ── 낮: 졸기 — 기본 → 졸기 1 → 졸기 2 → 졸기 1 → … 아주 느리게 */
  const DOZE = [['awake', 9], ['doze1', 7], ['doze2', 12], ['doze1', 6]];
  let dozeI = 0, dozeT = 0, talking = false;
  const show = k => {
    for (const [n, f] of Object.entries(frames))
      f.classList.toggle('on', n === k);
  };
  const doze = () => {
    clearTimeout(dozeT);
    if (talking)
      return;
    const [k, sec] = DOZE[dozeI % DOZE.length];
    show(RM ? 'awake' : k);
    if (RM)
      return;
    dozeI++;
    dozeT = setTimeout(doze, sec * 1000);
  };
  // 사장님이 말한다 (낮이면 말하기 그림으로, 다 말하면 다시 졸기)
  const talk = text => {
    if (state.night) {
      bubbleAt(true);
      say(bubble, text);
      return;
    }
    talking = true;
    clearTimeout(dozeT);
    bubbleAt(false);
    say(bubble, text, () => {
      talking = false;
      dozeI = 0;
      doze();
    });
    setTimeout(() => talking && show('talk'), RM ? 300 : 1300); // 눈을 뜨는 데도 한참
  };
  counter.addEventListener('click', () => {
    const lines = tr('hello');
    talk(lines[Math.floor(Math.random() * lines.length)]);
  });
  gym.addEventListener('click', () => {
    if (!state.slot)
      return;
    talk(moving(state.slot, now()) >= 0 ? tr('move') : L(STR.ex[state.slot.ex]));
  });

  /* ── 관람금지 책 누름: 책이 앞으로 나오고(제목·딱지), 사장님이 느리게. 아주 가끔 99세 버튼 */
  const pop = el('div', 'pop');
  pop.hidden = true;
  body.append(pop);
  let ids = 0;
  shelf.addEventListener('click', e => {
    const b = e.target.closest('.spine');
    if (!b)
      return;
    const id = Number(b.dataset.id);
    gcEvent('adult-book', '만화방 관람금지 책 누름');
    openBook(id, b.style.background);
    talk(ids++ % 2 ? tr('young') : tr('idPlease'));
  });
  function openBook(id, color) {
    pop.innerHTML = '';
    const card = el('div', 'book');
    card.style.background = color;
    card.append(el('b', 'book-t', L(STR.books)[id % 20]), el('span', 'book-tag', tr('sticker')));
    const x = el('button', 'pop-x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', tr('close'));
    const box = el('div', 'pop-in');
    box.append(card);
    if (Math.random() < 0.12) { // 아주 가끔
      const yes = el('button', 'mh-btn yes99', tr('yes99'));
      yes.type = 'button';
      yes.onclick = () => {
        gcEvent('age-99', '만화방 99세 버튼');
        openPaws();
      };
      box.append(yes);
    }
    box.append(x);
    pop.append(box);
    pop.hidden = false;
    x.focus({ preventScroll: true });
  }
  // 99세 이상 손님에게만 보이는 페이지: 글자 없이 고양이 발바닥 자국만 (고양이책과 같은 방식)
  function openPaws() {
    pop.innerHTML = '';
    const box = el('div', 'pop-in page99');
    box.innerHTML = pawsHTML('manhwa99');
    const x = el('button', 'pop-x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', tr('close'));
    box.append(x);
    pop.append(box);
    x.focus({ preventScroll: true });
  }
  const closePop = () => {
    pop.hidden = true;
    pop.innerHTML = '';
  };
  pop.addEventListener('click', e => {
    if (e.target === pop || e.target.closest('.pop-x'))
      closePop();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      closePop();
  });

  /* ── 낮·밤·편성: 1초마다 확인해서 바뀌었을 때만 고친다 */
  const exImg = (ex, n) => img(DIR + 'ex-' + ex + '-' + n + '.webp?v=' + cfg.v, 'fr');
  const layer = ex => {
    const g = el('div', 'gl');
    g.dataset.ex = ex;
    g.append(exImg(ex, 1), exImg(ex, 2));
    return g;
  };
  const state = { night: null, slot: null, key: '' };
  let flip = 0;
  const apply = () => {
    const d = now(), night = isNight(d);
    const slot = night ? gymAt(d, gc.exercises) : null;
    const key = night + '|' + (slot ? slot.from : '');
    if (key !== state.key) {
      const wasNight = state.night;
      state.night = night;
      state.slot = slot;
      state.key = key;
      body.classList.toggle('is-night', night);
      if (!night) {
        gym.textContent = '';
        if (wasNight !== false)
          doze();
      }
      else {
        clearTimeout(dozeT);
        talking = false;
        gym.textContent = '';
        if (slot) {
          // 옮겨 가는 짧은 순간: 앞 기구는 흐려지며 빠지고, 새 기구로 사장님이 느릿느릿 (들어온 때가 그 사이면 그만큼 지난 자리부터)
          const m = moving(slot, d);
          const cur = layer(slot.ex);
          if (m >= 0 && !RM) {
            const delay = -(m * MOVE_SEC) + 's';
            if (slot.prev) {
              const old = layer(slot.prev);
              old.classList.add('go-out');
              old.style.animationDelay = delay;
              gym.append(old);
            }
            cur.classList.add('go-in');
            cur.style.animationDelay = delay;
            if (wasNight === true && m < 0.2)
              setTimeout(() => talk(tr('move')), 4000);
          }
          gym.append(cur);
        }
      }
      if (DEV)
        devPlan();
    }
    // 운동: 두 장을 아주 느리게 번갈아
    if (night && !RM && ++flip % 4 === 0)
      gym.querySelectorAll('.gl:not(.go-out)').forEach(g => g.classList.toggle('two'));
    if (DEV)
      devClock();
  };

  /* ── 폰: 화면 높이에 맞추고 가로로 둘러보기 / 데스크톱: 전체가 보이게 */
  const fit = () => {
    const vw = innerWidth, vh = innerHeight;
    const wide = vw / vh >= W / H * 0.8;
    const k = wide ? Math.min(vw / W, vh / H) : vh / H;
    sc.style.transform = `scale(${k})`;
    stage.style.width = Math.round(W * k) + 'px';
    stage.style.height = Math.round(H * k) + 'px';
    view.classList.toggle('pan', !wide);
    return k;
  };
  let first = true;
  const onResize = () => {
    const k = fit();
    if (first && view.classList.contains('pan')) // 처음엔 신간 코너·계산대 쪽을 보며 들어온다
      view.scrollLeft = Math.max(0, (cfg.view && cfg.view.phoneFocus || W / 2) * k - innerWidth / 2);
    first = false;
  };
  addEventListener('resize', onResize);

  /* ── 미리보기 (?dev=1): 시각 옮기기 + 그날 밤 편성 */
  let devEl = null, devClockEl = null;
  // 지금 밤이면 그 밤, 낮이면 오늘 밤 편성
  const tonight = () => {
    const d = now(), key = nightOf(d) || nightOf(new Date(atHour(d, 23)));
    return key ? nightPlan(key, gc.exercises) : [];
  };
  function devPlan() {
    if (!devEl)
      return;
    const list = devEl.querySelector('ol');
    list.textContent = '';
    for (const s of tonight()) {
      const li = el('li', state.slot && state.slot.from === s.from ? 'cur' : '', clockText(s.from) + ' ' + L(STR.exName)[s.ex]);
      li.onclick = () => go(s.from - 3000);
      list.append(li);
    }
  }
  function devClock() {
    if (devClockEl)
      devClockEl.textContent = clockText(now().getTime()) + (state.night ? ' 🌙' : ' ☀️') + (state.slot ? ' ' + L(STR.exName)[state.slot.ex] : '');
  }
  const go = ms => {
    setSimMs(ms);
    apply();
  };
  if (DEV) {
    devEl = el('div', 'dev');
    devClockEl = el('b');
    const btn = (t, f) => {
      const b = el('button', '', t);
      b.type = 'button';
      b.onclick = f;
      return b;
    };
    const d0 = () => now();
    const row = el('div');
    row.append(
      btn('−1h', () => go(d0().getTime() - 3600e3)),
      btn('+10m', () => go(d0().getTime() + 600e3)),
      btn('+1h', () => go(d0().getTime() + 3600e3)),
      btn(tr('dNext'), () => {
        const t = state.slot ? state.slot.to : (tonight()[0] || {}).from;
        if (t)
          go(t - 3000);
      }),
      btn(tr('dDay'), () => go(atHour(d0(), 13))),
      btn(tr('dReal'), () => go(Date.now())));
    devEl.append(devClockEl, row, el('small', '', tr('dNight')), el('ol'));
    body.append(devEl);
  }

  body.append(view);
  onResize();
  apply();
  setInterval(apply, 1000);
  return state;
}

/* ───────── 신간 코너: 작품마다 한 권 (episodes.json을 훑어서) ───────── */
function loadWorks(works, slots, spines) {
  let used = 0;
  works.slice(0, slots.length).forEach((w, i) => {
    fetch(w + '/episodes.json', { cache: 'no-cache' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const slot = slots[i];
        const a = el('a', 'cover');
        a.href = w + '/';
        a.setAttribute('aria-label', tr('fresh') + ': ' + (LANG === 'en' && data.nameEn ? data.nameEn : data.name));
        if (data.cover) {
          const im = img(w + '/cover.webp?v=' + data.cover);
          im.onerror = () => {
            im.remove();
            a.classList.add('code');
          };
          a.append(im);
        }
        else
          a.classList.add('code');
        const title = el('span', 'cover-t');
        title.append(el('b', '', LANG === 'en' && data.nameEn ? data.nameEn : data.name),
          el('small', '', LANG === 'en' && data.taglineEn ? data.taglineEn : data.tagline));
        a.append(title); // 코드 책일 때만 보인다 (그림 표지에는 제목이 그려져 있음)
        leaveWith(a, 'fresh-list', '만화방 신간 코너 → 목록: ' + w);
        slot.append(a);
        // 관람금지 책장에서 한 권이 신간 코너로 옮겨 왔다
        const gone = spines[spines.length - 1 - used++];
        if (gone)
          gone.classList.add('moved');
      })
      .catch(() => { });
  });
}

/* ───────── 시작 ───────── */
document.documentElement.lang = LANG;
// 들어온 길: 고양.시 약도(map)·책장 만화책(shelf). 세고 나서 주소 꼬리를 지운다 (dev=1은 남긴다)
{
  const u = new URL(location.href), via = u.searchParams.get('via');
  if (via === 'map' || via === 'shelf') {
    if (freshVisit())
      gcEvent('in-' + via, '만화방 들어온 길: ' + ({ map: '고양.시 약도', shelf: '고양.시 책장 만화책' })[via]);
    u.searchParams.delete('via');
    history.replaceState(null, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams : '') + u.hash);
  }
}
fetch(DIR + 'scene.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : Promise.reject(r.status))
  .then(cfg => {
    const st = build(cfg);
    if (st.night && freshVisit())
      gcEvent('night-visit', '만화방 밤에 들어옴 (운동 보기)');
  })
  .catch(() => {
    body.classList.add('mh-paper');
    const box = el('div', 'mh-msg');
    const a = el('a', 'mh-btn', tr('home'));
    a.href = HOME;
    box.append(el('p', '', '🐾'), a);
    body.append(box);
  });

// 오프라인 캐시: 방과 같은 서비스 워커. 만화방 그림은 본 것만 담는다 (sw.js 만화방 칸)
if ('serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('../sw.js').catch(() => { });
