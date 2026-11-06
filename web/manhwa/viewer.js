/* 만화방 뷰어 (tasks/manhwa-viewer.md) — 의존성 없음. 방(web/js)과 따로 산다
   페이지 두 가지: 목록(web/manhwa/<작품>/index.html)과 회차(web/manhwa/<작품>/<이름>/index.html).
   둘 다 tools/build_manhwa.py가 만든 빈 틀이고, 내용은 여기서 episodes.json을 읽어 채운다.
   - 공개일: 한국 시간 자정(Asia/Seoul) 기준. 공개 전 회차는 원고를 불러오지 않는다
   - 이어 보기: 읽은 위치를 이 기기에만(localStorage goyang.manhwa.<작품>)
   - 글자: 막대·목록·안내는 KO/EN(고양.시와 같은 규칙: 저장한 언어 → 브라우저 언어). 원고는 한국어만 */
(() => {
  'use strict';
  const body = document.body;
  const PAGE = body.dataset.page, WORK = body.dataset.work;
  if (!PAGE || !WORK)
    return;
  const EP_PAGE = PAGE === 'episode';
  const WORK_DIR = EP_PAGE ? '../' : './';
  const ROOT = EP_PAGE ? '../../../' : '../../';
  const HOME = '/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────── 글자 ───────── */
  const STR = {
    list: { ko: '목록', en: 'Episodes' },
    prev: { ko: '이전 화', en: 'Prev' },
    next: { ko: '다음 화', en: 'Next' },
    nextEp: { ko: '다음 화 보기', en: 'Next episode' },
    ep: { ko: '{n}화', en: 'Ep. {n}' },
    resume: { ko: '{n}화 이어 보기', en: 'Continue Ep. {n}' },
    opens: { ko: '{m}월 {d}일 공개', en: 'Opens {mon} {d}' },
    yet: { ko: '아…직…이…에…요…', en: 'N…o…t… y…e…t…' },
    home: { ko: '고양.시로 돌아가기', en: 'Back to goyang.si' },
    start: { ko: '{n}화부터 보기', en: 'Start from Ep. {n}' },
    fresh: { ko: '신간', en: 'New' },
    end: { ko: '{n}화 끝!', en: 'End of Ep. {n}!' },
    empty: { ko: '아직 연재 전이에요.', en: 'No episodes yet.' },
    koOnly: { ko: '', en: 'Korean only' },
    missing: { ko: '없는 회차예요.', en: 'This episode does not exist.' },
    fail: { ko: '불러오지 못했어요.', en: 'Could not load.' },
    retry: { ko: '다시 해 보기', en: 'Try again' },
    room: { ko: '고양.시 만화방', en: 'goyang.si Manhwa Room' },
  };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lsGet = (k, d) => {
    try {
      const v = localStorage.getItem('goyang.' + k);
      return v == null ? d : JSON.parse(v);
    }
    catch (e) {
      return d;
    }
  };
  const lsSet = (k, v) => {
    try {
      localStorage.setItem('goyang.' + k, JSON.stringify(v));
    }
    catch (e) { }
  };
  // 고양.시 i18n.js pickLang과 같은 규칙
  const LANG = (() => {
    const saved = lsGet('lang', null);
    if (saved === 'ko' || saved === 'en')
      return saved;
    const ls = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    return ls.some(l => /^ko\b/i.test(l || '')) ? 'ko' : 'en';
  })();
  const tr = (key, vars) => {
    let v = STR[key][LANG];
    if (vars)
      v = v.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m);
    return v;
  };
  const dateVars = open => {
    const [, m, d] = open.split('-').map(Number);
    return { m, d, mon: MON[m - 1] };
  };

  /* ───────── 공개일: 한국 시간 날짜 (YYYY-MM-DD 문자열끼리 비교) ───────── */
  const todaySeoul = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    }
    catch (e) {
      return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // 한국은 서머타임이 없다
    }
  };
  const TODAY = todaySeoul();
  const isOpen = ep => ep.open <= TODAY;
  // 「신간」 딱지: 마지막 공개 화가 이 날수 안에 열렸을 때
  const FRESH_DAYS = 14;
  const daysAgo = n => new Date(Date.parse(TODAY + 'T00:00:00Z') - n * 864e5).toISOString().slice(0, 10);

  /* ───────── 강고양이 씨 (코드로 그린다 — 그림 파일 없음) ───────── */
  const INK = '#2b2118', FUR = '#fbf3e6', PATCH = '#8a5a3c', PINK = '#f2a7b5';
  // 간판의 작은 얼굴
  const CAT_FACE = '<svg viewBox="0 0 48 42" aria-hidden="true">'
    + `<path d="M8 20 L6 3 L20 12 Z M40 20 L42 3 L28 12 Z" fill="${FUR}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
    + `<path d="M9 15 L8 8 L14 12 Z M39 15 L40 8 L34 12 Z" fill="${PINK}"/>`
    + `<ellipse cx="24" cy="25" rx="18" ry="15" fill="${FUR}" stroke="${INK}" stroke-width="2.5"/>`
    + `<ellipse cx="31" cy="23" rx="7" ry="6" fill="${PATCH}"/>`
    + `<circle cx="17" cy="23" r="2.4" fill="${INK}"/><circle cx="31" cy="23" r="2.4" fill="${INK}"/>`
    + `<path d="M22 28 h4 l-2 2.4 z" fill="#e07a8a"/>`
    + `<path d="M20 31 q2 2 4 0 q2 2 4 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  // 회차 끝 칸 위로 빼꼼: 머리는 칸 테두리(y=100) 뒤에, 앞발은 테두리 위에
  const CAT_PEEK = '<svg viewBox="0 0 140 112" aria-hidden="true">'
    + '<defs><clipPath id="mh-peek-clip"><rect width="140" height="100"/></clipPath></defs>'
    + '<g clip-path="url(#mh-peek-clip)">'
    + `<path d="M34 44 L26 4 L60 26 Z M106 44 L114 4 L80 26 Z" fill="${FUR}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`
    + `<path d="M36 34 L31 13 L50 26 Z M104 34 L109 13 L90 26 Z" fill="${PINK}"/>`
    + `<ellipse cx="70" cy="70" rx="50" ry="42" fill="${FUR}" stroke="${INK}" stroke-width="3.5"/>`
    + `<g fill="${FUR}" stroke="${INK}" stroke-width="2.5"><circle cx="62" cy="31" r="6"/><circle cx="71" cy="28" r="7"/><circle cx="80" cy="32" r="6"/></g>`
    + `<ellipse cx="91" cy="62" rx="18" ry="15" fill="${PATCH}"/>`
    + `<ellipse cx="50" cy="62" rx="5" ry="6.5" fill="${INK}"/><ellipse cx="91" cy="62" rx="5" ry="6.5" fill="${INK}"/>`
    + '<circle cx="52" cy="59.5" r="1.8" fill="#fff"/><circle cx="93" cy="59.5" r="1.8" fill="#fff"/>'
    + '<path d="M66 74 h8 l-4 4.5 z" fill="#e07a8a"/>'
    + `<path d="M62 80 q4 4 8 0 q4 4 8 0" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`
    + `<path d="M67 82 q3 9 7 0" fill="#f08a9c" stroke="${INK}" stroke-width="2"/>`
    + '<ellipse cx="44" cy="80" rx="7" ry="4" fill="#f4b9b9" opacity=".7"/><ellipse cx="98" cy="80" rx="7" ry="4" fill="#f4b9b9" opacity=".7"/>'
    + '</g>'
    + `<g fill="${FUR}" stroke="${INK}" stroke-width="3"><ellipse cx="38" cy="101" rx="15" ry="9"/><ellipse cx="102" cy="101" rx="15" ry="9"/></g>`
    + `<path d="M33 97 v6 M43 97 v6 M97 97 v6 M107 97 v6" stroke="${INK}" stroke-width="2" stroke-linecap="round"/></svg>`;

  /* ───────── 통계 (GoatCounter goyangsi, 방 util.js gcEvent와 같은 방식) ───────── */
  const gcEvent = (path, title) => {
    let tries = 0;
    const send = () => {
      const gc = window.goatcounter;
      if (gc && gc.count) {
        try {
          gc.count({ path: 'manhwa/' + WORK + '/' + path, title: title || path, event: true });
        }
        catch (e) { }
        return;
      }
      if (++tries <= 40)
        setTimeout(send, 500);
    };
    send();
  };
  // 이벤트를 보낸 뒤 조금 있다가 떠난다 (보내기 전에 페이지가 닫히지 않게)
  const leaveWith = (a, path, title) => a.addEventListener('click', ev => {
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button)
      return;
    ev.preventDefault();
    gcEvent(path, title);
    setTimeout(() => { location.href = a.href; }, 180);
  });

  /* ───────── 이어 보기 ───────── */
  const KEY = 'manhwa.' + WORK;
  const readPos = () => {
    const p = lsGet(KEY, null);
    return p && typeof p.no === 'number' && typeof p.at === 'number' ? p : null;
  };
  // 마지막으로 읽던 곳: 다 읽었으면 다음 화 처음(공개된 것만)
  const resumeTarget = eps => {
    const p = readPos();
    if (!p)
      return null;
    const i = eps.findIndex(e => e.no === p.no);
    if (i < 0 || !isOpen(eps[i]))
      return null;
    if (p.done) {
      const nx = eps[i + 1];
      return nx && isOpen(nx) ? { ep: nx, at: 0 } : null;
    }
    return { ep: eps[i], at: p.at };
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
  const link = (cls, text, href) => {
    const a = el('a', cls, text);
    a.href = href;
    return a;
  };
  const piece = (ep, i) => String(i).padStart(2, '0') + '.webp?v=' + ep.v;
  const epHref = (ep, from) => WORK_DIR + ep.slug + '/' + (from ? '?from=' + from : '');
  const homeLink = () => {
    const a = link('mh-home', '🔔 ' + tr('home'), HOME);
    leaveWith(a, 'go-home', '만화방 → 고양.시');
    return a;
  };

  // 회차 카드: 썸네일(그 화 첫 장 위쪽) + N화 · 제목 · 공개일
  function card(ep, from, kicker) {
    const a = link('mh-card', null, epHref(ep, from));
    const th = el('span', 'mh-thumb');
    const img = el('img');
    img.width = 360;
    img.height = 270;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = WORK_DIR + ep.slug + '/thumb.webp?v=' + ep.v;
    th.append(img);
    const t = el('span', 'mh-card-t');
    if (kicker)
      t.append(el('small', 'mh-kick', kicker));
    t.append(el('b', '', tr('ep', { n: ep.no })), el('span', 'mh-card-title', ep.title || ''));
    if (!kicker)
      t.append(el('small', '', ep.open.replace(/-/g, '.')));
    a.append(th, t);
    return a;
  }
  // 공개 전 다음 한 화: 줄무늬 칸 + 🐾 + 날짜 (누르지 못함)
  function soonCard(ep, kicker) {
    const d = el('div', 'mh-card mh-soon');
    d.setAttribute('aria-disabled', 'true');
    const th = el('span', 'mh-thumb mh-stripes', '🐾');
    th.setAttribute('aria-hidden', 'true');
    const t = el('span', 'mh-card-t');
    if (kicker)
      t.append(el('small', 'mh-kick', kicker));
    t.append(el('b', '', tr('ep', { n: ep.no })), el('span', 'mh-card-title', tr('opens', dateVars(ep.open))));
    d.append(th, t);
    return d;
  }

  function fail() {
    body.textContent = '';
    body.classList.add('mh-paper');
    const box = el('div', 'mh-msg');
    const btn = el('button', 'mh-btn', tr('retry'));
    btn.onclick = () => location.reload();
    box.append(el('p', '', tr('fail')), btn);
    body.append(box);
  }

  /* ───────── 목록 ───────── */
  function renderList(data) {
    const eps = data.episodes;
    const open = eps.filter(isOpen);
    const soon = eps.find(e => !isOpen(e)); // 다음 한 화만 보인다
    body.classList.add('mh-paper');

    // 맨 위 짙은 띠: 고양이 얼굴 + 간판
    const sign = el('header', 'mh-sign');
    const signIn = el('div', 'mh-sign-in');
    const face = el('span', 'mh-face');
    face.innerHTML = CAT_FACE;
    signIn.append(face, el('b', '', tr('room')));
    sign.append(signIn);

    // 표지(아래쪽이 종이색으로 이어짐) 위에 딱지·연재 제목·작품명·큰 버튼
    const main = el('main', 'mh-list');
    const hero = el('section', 'mh-hero');
    if (data.cover) {
      hero.classList.add('mh-has-cover');
      const box = el('div', 'mh-cover');
      const img = el('img');
      img.alt = '';
      img.src = 'cover.webp?v=' + data.cover;
      box.append(img);
      hero.append(box);
    }
    const txt = el('div', 'mh-hero-txt');
    const latest = open[open.length - 1];
    if (latest && latest.open >= daysAgo(FRESH_DAYS))
      txt.append(el('span', 'mh-tag', tr('fresh')));
    txt.append(el('h1', '', data.series));
    txt.append(el('p', 'mh-by', LANG === 'en' && data.nameEn ? data.name + ' · ' + data.nameEn : data.name));
    if (LANG === 'en')
      txt.append(el('p', 'mh-koonly', tr('koOnly')));
    const rt = resumeTarget(eps);
    if (rt)
      txt.append(link('mh-cta', tr('resume', { n: rt.ep.no }), epHref(rt.ep, 'list') + '&resume=1'));
    else if (open.length)
      txt.append(link('mh-cta', tr('start', { n: open[0].no }), epHref(open[0], 'list')));
    hero.append(txt);
    main.append(hero);
    if (data.about)
      main.append(el('p', 'mh-about', data.about));

    if (!open.length && !soon)
      main.append(el('p', 'mh-empty', tr('empty')));
    const ol = el('ol', 'mh-cards');
    for (const ep of open) {
      const li = el('li');
      li.append(card(ep, 'list'));
      ol.append(li);
    }
    if (soon) {
      const li = el('li');
      li.append(soonCard(soon));
      ol.append(li);
    }
    if (ol.children.length)
      main.append(ol);
    main.append(homeLink());
    body.append(sign, main);
  }

  /* ───────── 회차 ───────── */
  function renderEpisode(data) {
    const eps = data.episodes;
    const no = Number(body.dataset.no);
    const i = eps.findIndex(e => e.no === no);
    const ep = eps[i];
    const listHref = WORK_DIR;
    if (!ep) {
      body.classList.add('mh-paper');
      const box = el('div', 'mh-msg');
      box.append(el('p', '', tr('missing')), link('mh-btn', tr('list'), listHref));
      body.append(box);
      return;
    }
    const prev = eps[i - 1], next = eps[i + 1];
    const nextOpen = next && isOpen(next);
    const firstSoon = eps.find(e => !isOpen(e));

    // 공개 전: 원고를 불러오지 않는다
    if (!isOpen(ep)) {
      body.classList.add('mh-paper');
      const box = el('div', 'mh-wait');
      const yet = el('p', 'mh-yet');
      yet.setAttribute('aria-label', tr('yet'));
      box.append(yet);
      if (firstSoon === ep)
        box.append(el('p', 'mh-when', tr('opens', dateVars(ep.open))));
      box.append(link('mh-btn', tr('list'), listHref));
      body.append(box);
      const chars = Array.from(tr('yet'));
      if (RM)
        yet.textContent = chars.join('');
      else
        chars.forEach((c, k) => setTimeout(() => { yet.textContent += c; }, 400 + k * 420));
      return;
    }

    // 들어온 길 (새로 고침·뒤로 가기는 세지 않는다)
    const q = new URLSearchParams(location.search);
    const from = ['list', 'next'].includes(q.get('from')) ? q.get('from') : 'direct';
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (!nav || nav.type === 'navigate')
      gcEvent('in-' + from, '만화방 들어온 길: ' + ({ direct: '직접 링크', list: '목록', next: '다음 화' })[from]);
    const wantResume = q.get('resume') === '1';
    if (location.search)
      history.replaceState(null, '', location.pathname + location.hash);
    if ('scrollRestoration' in history)
      history.scrollRestoration = 'manual';

    const epLabel = tr('ep', { n: ep.no });
    document.title = data.series + ' ' + epLabel + (ep.title ? ' — ' + ep.title : '') + ' · ' + tr('room');

    const prog = el('div', 'mh-progress');
    const bar = el('i');
    prog.append(bar);

    const top = el('header', 'mh-bar mh-top');
    const topIn = el('div', 'mh-bar-in');
    const back = link('mh-icon', '‹', listHref);
    back.setAttribute('aria-label', tr('list'));
    const ttl = el('div', 'mh-ttl');
    ttl.append(el('b', '', data.series), el('span', '', epLabel + (ep.title ? ' · ' + ep.title : '')));
    topIn.append(back, ttl);
    top.append(topIn);

    const strip = el('main', 'mh-strip');
    strip.lang = 'ko';
    ep.heights.forEach((h, k) => {
      const img = el('img');
      img.width = 1080;
      img.height = h;
      img.alt = k === 0 ? data.series + ' ' + epLabel : '';
      img.decoding = 'async';
      if (k > 1)
        img.loading = 'lazy'; // 보이기 직전에 (처음 두 조각은 바로)
      img.src = piece(ep, k + 1);
      strip.append(img);
    });

    // 회차 끝: 크림 종이 칸 위로 강고양이 씨가 빼꼼, "N화 끝!", 다음 화 카드, 고양.시로
    const end = el('section', 'mh-end');
    const peek = el('div', 'mh-peek');
    peek.innerHTML = CAT_PEEK;
    end.append(peek, el('h2', 'mh-end-t', tr('end', { n: ep.no })));
    if (nextOpen) {
      const a = card(next, 'next', tr('nextEp') + ' ›');
      leaveWith(a, ep.no + '/next-click', '만화방 다음 화 누름: ' + ep.no + '화');
      end.append(a);
    }
    else if (next && next === firstSoon)
      end.append(soonCard(next, tr('next')));
    const row = el('div', 'mh-end-row');
    row.append(link('mh-btn', tr('list'), listHref), homeLink());
    end.append(row);
    const endWrap = el('div', 'mh-end-wrap');
    endWrap.append(end);

    const bot = el('nav', 'mh-bar mh-bot');
    const botIn = el('div', 'mh-bar-in');
    const navBtn = (text, target, from) => {
      if (!target)
        return el('span', 'mh-off', text);
      return link('', text, epHref(target, from));
    };
    const nb = navBtn(tr('next') + ' ›', nextOpen ? next : null, 'next');
    if (nb.tagName === 'A')
      leaveWith(nb, ep.no + '/next-click', '만화방 다음 화 누름: ' + ep.no + '화');
    botIn.append(navBtn('‹ ' + tr('prev'), prev, null), link('', tr('list'), listHref), nb);
    bot.append(botIn);

    // 원고는 위쪽 막대 높이(safe-area 포함)만큼 아래에서 시작한다 (첫 장 맨 위를 막대가 덮지 않게 — CSS .mh-reading)
    body.classList.add('mh-reading');
    body.append(prog, top, strip, endWrap, bot);

    /* 위치 ↔ 비율 (기기마다 폭이 달라도 같은 자리) */
    const span = () => Math.max(1, strip.offsetTop + strip.offsetHeight - innerHeight);
    const ratio = () => Math.min(1, Math.max(0, scrollY / span()));
    const goTo = at => scrollTo(0, Math.round(at * span()));

    // 이어 보기 버튼
    const rt = resumeTarget(eps);
    if (rt && rt.ep === ep && wantResume)
      goTo(rt.at);
    else if (rt && (rt.ep !== ep || (rt.at > 0.02 && rt.at < 0.98))) {
      const same = rt.ep === ep;
      const b = link('mh-btn mh-resume', tr('resume', { n: rt.ep.no }), same ? '#' : epHref(rt.ep, null) + '?resume=1');
      if (same)
        b.onclick = ev => {
          ev.preventDefault();
          goTo(rt.at);
          b.remove();
        };
      body.append(b);
      setTimeout(() => b.remove(), 9000);
    }

    /* 막대: 아래로 스크롤하면 숨고, 위로 올리거나 탭하면 나온다. 끝에 닿으면 나온다 */
    // 움직이기 전에는 저장하지 않는다 (들어오자마자 예전 읽던 자리를 0으로 덮지 않게)
    const startY = scrollY;
    let lastY = scrollY, ticking = false, saveAt = 0, ended = false, prefetched = false, moved = false;
    const setHidden = h => body.classList.toggle('mh-hide', h);
    strip.addEventListener('click', () => setHidden(!body.classList.contains('mh-hide')));
    const save = r => {
      if (moved)
        lsSet(KEY, { no: ep.no, at: Math.round(r * 1000) / 1000, done: r >= 0.99 });
    };
    const onScroll = () => {
      ticking = false;
      const y = scrollY, dy = y - lastY;
      const r = ratio();
      if (y !== startY)
        moved = true;
      if (r >= 0.995)
        setHidden(false);
      else if (dy > 6 && y > 60)
        setHidden(true);
      else if (dy < -6)
        setHidden(false);
      lastY = y;
      bar.style.transform = 'scaleX(' + r + ')';
      const now = Date.now();
      if (now - saveAt > 800 || r >= 0.99) {
        saveAt = now;
        save(r);
      }
      // 끝 무렵 다음 화 첫 조각을 미리 받는다
      if (!prefetched && nextOpen && r > 0.8) {
        prefetched = true;
        new Image().src = WORK_DIR + next.slug + '/' + piece(next, 1);
      }
    };
    addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    }, { passive: true });
    addEventListener('pagehide', () => save(ratio()));
    if ('IntersectionObserver' in window)
      new IntersectionObserver((ents, ob) => {
        if (!ended && ents.some(x => x.isIntersecting)) {
          ended = true;
          ob.disconnect();
          gcEvent(ep.no + '/read-end', '만화방 끝까지 읽음: ' + ep.no + '화');
        }
      }).observe(end);
    onScroll();
  }

  /* ───────── 시작 ───────── */
  document.documentElement.lang = LANG;
  fetch(WORK_DIR + 'episodes.json', { cache: 'no-cache' })
    .then(r => {
      if (!r.ok)
        throw new Error(r.status);
      return r.json();
    })
    .then(data => {
      data.episodes = (data.episodes || []).slice().sort((a, b) => a.no - b.no);
      (EP_PAGE ? renderEpisode : renderList)(data);
    })
    .catch(fail);

  // 오프라인 캐시: 방과 같은 서비스 워커(sw.js). 만화방 그림은 본 것만 담는다 (sw.js 만화방 칸)
  if ('serviceWorker' in navigator && location.protocol !== 'file:')
    navigator.serviceWorker.register(ROOT + 'sw.js').catch(() => { });
})();
