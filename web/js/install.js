/* 홈 화면 앱 (MOBILE_PLAN.md 4장·6장)
   - 홈 화면 앱으로 열었는지(STANDALONE), 브라우저가 주는 설치 신호(beforeinstallprompt)
   - 책장의 이상한 책: 설치하지 않은 사람에게만 보인다. 누르면 「이 방을 데려가는 법」
   - 만득 씨 포스트잇 힌트(두 번째 방문부터 가끔), 강고양이 씨가 책을 올려다보기(하루 한두 번)
   - 세로 화면 안내(폰을 세로로 처음 열었을 때 딱 한 번)
   - 홈 화면 앱으로 연 횟수를 GoatCounter에 따로 남김 */
import { imageReady, img } from './assets.js';
import { tr } from './i18n.js';
import { closeShelf, shelfUI } from './shelf.js';
import { play } from './anim.js';
import { bub, fn, go, hold, run } from './steps.js';
import { dayKey } from './time.js';
import { closeTvGuide } from './tv-guide.js';
import { noteEl, scrEl } from './ui.js';
import { RM, esc, hash, rnd, store, storageOK } from './util.js';
import { ctx } from './stage.js';
import { cat, say, world } from './world.js';

/* ───────── 어디서 열었나 ───────── */
const mm = q => { try { return matchMedia(q).matches; } catch (e) { return false; } };
export const STANDALONE = mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || mm('(display-mode: minimal-ui)') || navigator.standalone === true;
const UA = navigator.userAgent || '';
export const IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ANDROID = /Android/i.test(UA);
// 카카오톡·인스타그램·페이스북·라인·네이버 등 앱 안 브라우저 (홈 화면 추가가 안 된다)
const IN_APP = /KAKAOTALK|Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|NAVER\(inapp|DaumApps|Twitter|Snapchat|everytimeApp|BAND\/|; wv\)/i.test(UA);
const PHONE = mm('(pointer: coarse)') && Math.min(screen.width || 0, screen.height || 0) < 600;

let deferred = null; // 안드로이드 크롬 등이 주는 설치 신호
export const odd = { show: !STANDALONE, gone: 0, open: false, lift: 0, sway: 0, swayV: 0, nextSwish: rnd(6, 14), spark: -1, nextSpark: rnd(4, 9), motes: [] };

/* ───────── 이상한 책: 자리와 모양 ─────────
   그림(256×640)의 책은 x 38~218, y 120~640. 방에서 폭 42가 되게 줄이고,
   왼쪽 아래 모서리를 축으로 약 15도 기울여 왼쪽 풀잎 책(green2, 오른쪽 끝 x 680)에 기댄다. */
const IMG_X0 = 38, IMG_W = 180, IMG_BOTTOM = 640, EMBLEM = [128, 380];
const S = 42 / IMG_W, BW = 42, BH = (640 - 120) * S;
const LEAN = 15 * Math.PI / 180;
const PX = 680 + BH * Math.sin(LEAN) - 4, PY = 338.5; // 왼쪽 아래 모서리 (선반 위). 둥근 모서리만큼 안쪽으로 붙여 기댄 게 보이게
// 책갈피 끈: 그림 64×256에서 끈은 x 23~41, 길이 230. 책과 같은 비율이면 실처럼 가늘어서 폭은 약 1.4배로, 길이는 선반 앞으로 조금 늘어질 만큼
const RIB_W = 64 * (6.2 / 18), RIB_H = 256 * (50 / 230);
const angle = () => LEAN * (1 - odd.lift * 0.035); // 빠져나올수록 조금 똑바로

// 그릴 때: 사라지는 중(gone 0→1)에도 그린다
const oddDrawn = () => odd.show && odd.gone < 1;
// 누르기·책장 목록·포스트잇 힌트·올려다보기: 사라지기 시작하면 끝
export function oddVisible() {
  return odd.show && odd.gone === 0;
}
// 책 위의 한 점(책 왼쪽 아래 기준, 오른쪽 +x, 위쪽 -y)을 방 좌표로
function toRoom(lx, ly) {
  const a = -angle(), c = Math.cos(a), s = Math.sin(a);
  return [PX + lx * c - ly * s, PY - odd.lift + lx * s + ly * c];
}
export function oddAt(x, y) {
  if (!oddVisible())
    return false;
  const a = angle(), c = Math.cos(a), s = Math.sin(a), dx = x - PX, dy = y - (PY - odd.lift);
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  if (lx > -6 && lx < BW + 6 && ly > -BH - 6 && ly < 6)
    return true;
  // 늘어진 책갈피 끈도 누를 수 있게 (폰에서 책이 작으니까)
  const [rx, ry] = toRoom(BW * 0.55, -2);
  return x > rx - 9 && x < rx + 9 && y > ry && y < ry + RIB_H * 0.85;
}

export function drawOddBook(dt) {
  if (!oddDrawn())
    return;
  const book = img('book_odd'), rib = img('book_odd_ribbon');
  if (!imageReady(book))
    return;
  dt = dt || 0.016;
  const tgt = odd.open ? 12 : shelfUI.hover === '__odd' ? 5 : 0;
  odd.lift = RM ? tgt : odd.lift + (tgt - odd.lift) * Math.min(1, dt * 10);
  // 끈: 평소엔 거의 가만히, 가끔 고양이 꼬리처럼 살랑, 아주 가끔 툭
  if (!RM) {
    odd.nextSwish -= dt;
    if (odd.nextSwish <= 0) {
      const flick = Math.random() < 0.15;
      odd.swayV += (flick ? 3.2 : 1.1) * (Math.random() < 0.5 ? -1 : 1);
      odd.nextSwish = flick ? rnd(20, 40) : rnd(7, 18);
    }
    odd.swayV += (-odd.sway * 9 - odd.swayV * 1.6) * dt;
    odd.sway += odd.swayV * dt;
  }
  const fade = 1 - odd.gone;
  if (odd.gone > 0)
    odd.gone = Math.min(1, odd.gone + dt / 1.6);
  ctx.save();
  ctx.globalAlpha = fade;
  // 끈 먼저(책 아래에서 나온다), 위쪽 가운데가 매달리는 점
  if (imageReady(rib)) {
    const [rx, ry] = toRoom(BW * 0.55, -2);
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(odd.sway * 0.35 + Math.sin(world.t * 0.9) * (RM ? 0 : 0.02));
    ctx.drawImage(rib, -RIB_W / 2, 0, RIB_W, RIB_H);
    ctx.restore();
  }
  ctx.translate(PX, PY - odd.lift);
  ctx.rotate(-angle());
  ctx.drawImage(book, -IMG_X0 * S, -IMG_BOTTOM * S, 256 * S, 640 * S);
  ctx.restore();
}

// 빛: 어둠을 덮은 뒤에 그린다. 낮엔 발바닥 문양이 가끔 반짝, 밤엔 옅은 빛과 빛 알갱이
export function drawOddGlow(dk) {
  if (!oddDrawn() || !imageReady(img('book_odd')))
    return;
  const dt = world.renderDt || 0.016, fade = 1 - odd.gone;
  const [ex, ey] = toRoom((EMBLEM[0] - IMG_X0) * S, (EMBLEM[1] - IMG_BOTTOM) * S);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (dk > 0.25) {
    const k = Math.min(1, (dk - 0.25) / 0.4) * fade, [cx, cy] = toRoom(BW / 2, -BH / 2);
    const pulse = RM ? 1 : 0.85 + 0.15 * Math.sin(world.t * 0.8);
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 95);
    g.addColorStop(0, `rgba(255,214,130,${0.22 * k * pulse})`);
    g.addColorStop(1, 'rgba(255,214,130,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 100, cy - 100, 200, 200);
    const eg = ctx.createRadialGradient(ex, ey, 1, ex, ey, 14);
    eg.addColorStop(0, `rgba(255,226,150,${0.5 * k * pulse})`);
    eg.addColorStop(1, 'rgba(255,226,150,0)');
    ctx.fillStyle = eg;
    ctx.fillRect(ex - 14, ey - 14, 28, 28);
    // 작은 빛 알갱이: 책 둘레에서 천천히 떠오른다
    if (!RM && odd.motes.length < 7 && Math.random() < dt * 1.5)
      odd.motes.push({ x: cx + rnd(-30, 30), y: cy + rnd(-20, 60), vx: rnd(-3, 3), vy: rnd(-9, -4), life: 0, max: rnd(3, 6), r: rnd(0.8, 1.8) });
    for (const m of odd.motes) {
      m.life += dt;
      m.x += m.vx * dt + Math.sin(world.t * 1.3 + m.max) * dt * 3;
      m.y += m.vy * dt;
      const a = Math.sin(Math.PI * Math.min(1, m.life / m.max)) * k;
      ctx.fillStyle = `rgba(255,224,150,${0.75 * a})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, 7);
      ctx.fill();
    }
    odd.motes = odd.motes.filter(m => m.life < m.max);
  }
  else
    odd.motes.length = 0;
  // 반짝: 낮에도 밤에도 가끔
  odd.nextSpark -= dt;
  if (odd.nextSpark <= 0 && odd.spark < 0) {
    odd.spark = 0;
    odd.nextSpark = rnd(5, 12);
  }
  if (odd.spark >= 0) {
    odd.spark += dt;
    const p = odd.spark / 0.9;
    if (p >= 1)
      odd.spark = -1;
    else {
      const a = Math.sin(Math.PI * p) * fade, r = 3 + 7 * Math.sin(Math.PI * p);
      ctx.translate(ex + 4, ey - 3);
      ctx.rotate(p * 0.6);
      ctx.fillStyle = `rgba(255,236,170,${0.95 * a})`;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rr = i % 2 ? r * 0.22 : r, t = i * Math.PI / 4;
        ctx.lineTo(Math.cos(t) * rr, Math.sin(t) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ───────── 「이 방을 데려가는 법」 ───────── */
const oddEl = document.getElementById('oddp');
const SHARE = '<svg class="share" viewBox="0 0 20 24" aria-hidden="true"><path d="M10 15V2.5M5.5 7 10 2.5 14.5 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 10H4.2A1.7 1.7 0 0 0 2.5 11.7v8.6A1.7 1.7 0 0 0 4.2 22h11.6a1.7 1.7 0 0 0 1.7-1.7v-8.6A1.7 1.7 0 0 0 15.8 10h-2.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function steps(list) {
  return '<ol>' + list.map(s => `<li>${esc(s).replace('{share}', SHARE)}</li>`).join('') + '</ol>';
}
function renderOdd() {
  let body;
  if (odd.gone > 0 || STANDALONE)
    body = `<p>${esc(tr('oddDone'))}</p>`;
  else if (IN_APP)
    body = `<p class="warn">${esc(tr('oddInApp', { browser: IOS ? 'Safari' : 'Chrome' }))}</p><p class="sub">${esc(tr('oddInAppHow'))}</p>`;
  else if (IOS)
    body = steps(tr('oddIOS'));
  else if (deferred)
    body = `<p>${esc(tr(ANDROID ? 'oddAndroid' : 'oddDesktop'))}</p><button class="take" type="button">${esc(tr('oddTake'))}</button>`;
  else if (ANDROID)
    body = steps(tr('oddAndroidMenu'));
  else
    body = `<p>${esc(tr('oddPhone'))}</p>`;
  oddEl.innerHTML = `<button class="x" type="button" aria-label="${esc(tr('oddClose'))}">×</button>` +
    `<h2>${esc(tr('oddTitle'))}</h2><p class="intro">${esc(tr('oddIntro'))}</p>${body}<p class="sign">✦ 🐾 ✦</p>`;
}
export function openOdd() {
  if (!odd.show)
    return;
  noteEl.hidden = true;
  scrEl.hidden = true;
  closeShelf();
  closeTvGuide();
  odd.open = true;
  shelfUI.oddOpen = true;
  renderOdd();
  oddEl.hidden = false;
  oddEl.focus({ preventScroll: true });
  if (!cat.closed && !world.manduk && Math.random() < 0.5)
    say(cat, '👀✨', 1.8);
}
export function closeOdd() {
  if (!odd.open)
    return;
  odd.open = false;
  shelfUI.oddOpen = false;
  oddEl.hidden = true;
}
// 홈 화면에 두면(브라우저가 알려 주면) 책이 사라진다
function takenAway() {
  deferred = null;
  if (odd.gone === 0)
    odd.gone = 0.001;
  if (odd.open)
    renderOdd();
  syncA11y();
}
function syncA11y() {
  const b = document.getElementById('aOdd');
  if (b)
    b.hidden = !oddVisible();
}
// 미리보기 도구: 이상한 책 보이기/숨기기
export function toggleOdd() {
  odd.show = !odd.show;
  odd.gone = 0;
  if (!odd.show)
    closeOdd();
  syncA11y();
  return odd.show;
}

/* ───────── 포스트잇 힌트 ─────────
   두 번째 방문부터, 홈 화면 앱이 아닐 때, 날마다 정해지는 확률로 가끔 (같은 날엔 같은 메모) */
let visits = 0;
export function oddHintToday(d) {
  return oddVisible() && visits >= 2 && hash(dayKey(d) + '|odd') < 0.3;
}

/* ───────── 강고양이 씨가 책을 올려다보기 (하루 한두 번) ───────── */
export function oddLookWeight(d) {
  if (!oddVisible() || world.manduk)
    return 0;
  const k = dayKey(d);
  if (world.oddLook?.day !== k)
    world.oddLook = { day: k, n: 0, max: Math.random() < 0.5 ? 1 : 2 };
  return world.oddLook.n < world.oddLook.max ? 0.3 : 0;
}
export function oddLookB() {
  world.oddLook.n++;
  run(cat, [
    go(rnd(728, 742), rnd(612, 620), 50), // 노트북 더미와 TV 선반 사이, 책 오른쪽 아래에서
    fn(a => a.face = -1),
    hold(0.8, 'stand'),
    play('lookup', rnd(4, 7)),
    bub(Math.random() < 0.5 ? '❓' : '👀✨', 3),
    hold(rnd(1.5, 3), 'stand'),
    hold(rnd(8, 18), 'loaf')
  ], 'oddlook');
}

/* ───────── 세로 화면 안내: 폰을 세로로 처음 열었을 때 딱 한 번 ───────── */
// main.js의 start()에서 방 크기가 정해진 뒤에 부른다
export function portraitHint() {
  if (!PHONE || !mm('(orientation: portrait)') || !storageOK() || store.get('portraitHint', false))
    return;
  store.set('portraitHint', true); // 보여 준 순간 기록. 돌렸든 닫았든 지나갔든 다시는 안 띄운다
  const el = document.getElementById('turnHint'), cv = document.getElementById('cv');
  if (!el)
    return;
  el.textContent = tr('portraitHint');
  const place = () => {
    const wrapH = el.parentElement.clientHeight, bottom = cv.offsetTop + cv.offsetHeight;
    el.style.top = Math.min(bottom + 10, wrapH - 44) + 'px';
  };
  place();
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('on'));
  let done = false;
  const hide = () => {
    if (done)
      return;
    done = true;
    el.classList.remove('on');
    setTimeout(() => el.hidden = true, RM ? 0 : 400);
    window.removeEventListener('resize', onResize);
  };
  const onResize = () => mm('(orientation: landscape)') ? hide() : place();
  el.addEventListener('click', hide, { once: true });
  window.addEventListener('resize', onResize);
  setTimeout(hide, 5000);
}

/* ───────── 통계: 홈 화면 앱으로 연 횟수 ───────── */
function countHomeOpen() {
  if (!STANDALONE)
    return;
  let tries = 0;
  const t = setInterval(() => {
    const gc = window.goatcounter;
    if (gc && gc.count) {
      clearInterval(t);
      try {
        gc.count({ path: 'home-screen-app', title: 'Kitty Kang (홈 화면 앱)', event: true });
      }
      catch (e) { }
    }
    else if (++tries > 40)
      clearInterval(t);
  }, 500);
}

/* ───────── 시작 ───────── */
export function initInstall() {
  // 방문 횟수: 30분 넘게 비웠다가 다시 오면 한 번. 기록이 안 되는 브라우저는 0(힌트 없음)
  if (storageOK()) {
    const v = store.get('visits', { n: 0, last: 0 }), t = Date.now();
    if (t - (v.last || 0) > 30 * 60e3)
      v.n = (v.n || 0) + 1;
    v.last = t;
    store.set('visits', v);
    visits = v.n;
  }
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); // 브라우저의 기본 안내 대신 책 안의 버튼으로
    deferred = e;
    if (odd.open)
      renderOdd();
  });
  window.addEventListener('appinstalled', takenAway);
  oddEl.addEventListener('click', async e => {
    if (e.target.closest('.x')) {
      closeOdd();
      return;
    }
    if (e.target.closest('.take') && deferred) {
      const p = deferred;
      deferred = null;
      try {
        p.prompt();
        const r = await p.userChoice;
        if (r && r.outcome === 'accepted')
          takenAway();
      }
      catch (err) { }
      if (odd.open)
        renderOdd();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && odd.open)
      closeOdd();
  });
  window.addEventListener('langchange', () => {
    if (odd.open)
      renderOdd();
  });
  const a = document.getElementById('aOdd');
  if (a)
    a.onclick = openOdd;
  syncA11y();
  if (STANDALONE)
    document.documentElement.classList.add('standalone');
  countHomeOpen();
}
