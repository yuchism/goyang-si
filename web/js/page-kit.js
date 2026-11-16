/* 페이지 도구: 방 밖 페이지(기지 /base/·광장 /plaza/·만화방 /manhwa/)와 방 쪽 링크(책장·약도)가 같이 쓰는 작은 도우미.
   가져오는 것 없음 — 구조 검사의 엉킨 덩어리 밖에 둔다 (tasks/subpage-shared-helpers.md).
   만화 뷰어(manhwa/viewer.js)는 모듈이 아닌 스크립트라 같은 것을 따로 적는다 */

// 새로 들어온 방문인가 (새로 고침·뒤로 가기는 세지 않는다)
export const freshVisit = () => {
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  return !nav || nav.type === 'navigate';
};
// 통계를 보낸 뒤 조금 있다가 링크로 떠난다 (보내기 전에 페이지가 닫히지 않게). send: 통계 보내기, link: 떠날 때 href를 읽는 링크
export const countThenGo = (link, send) => {
  send();
  setTimeout(() => { location.href = link.href; }, 180);
};
// 링크를 누르면 countThenGo (새 탭·창으로 여는 누름은 그대로 둔다)
export const leaveOnClick = (a, send) => a.addEventListener('click', ev => {
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button)
    return;
  ev.preventDefault();
  countThenGo(a, send);
});

/* ───────── 화면 조각 ───────── */
export const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls)
    n.className = cls;
  if (text != null)
    n.textContent = text;
  return n;
};
export const place = (n, [x, y, w, h]) => {
  Object.assign(n.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  return n;
};
// 무대(바탕 그림 W×H) 맞추기 — 폰: 화면 높이에 맞추고 가로로 둘러보기(view에 .pan) / 데스크톱: 전체가 보이게. 배율을 돌려준다
export const fitStage = (W, H, sc, stage, view) => {
  const vw = innerWidth, vh = innerHeight;
  const wide = vw / vh >= W / H * 0.8;
  const k = wide ? Math.min(vw / W, vh / H) : vh / H;
  sc.style.transform = `scale(${k})`;
  stage.style.width = Math.round(W * k) + 'px';
  stage.style.height = Math.round(H * k) + 'px';
  view.classList.toggle('pan', !wide);
  return k;
};

// 「항상 켜 두기」(방 설정 책, localStorage goyang.awake — ui.js와 같은 값)를 방 밖 페이지도 따른다.
// 켜져 있거나 전체 화면이면 화면 깨우기(Wake Lock)를 요청하고, 다른 앱에 다녀오면(풀려 있으니) 다시 요청. 설정을 바꾸는 곳은 방 설정 책 하나
export const keepAwakeLikeRoom = () => {
  if (!navigator.wakeLock)
    return;
  let wake = null, asking = false;
  const want = () => {
    try {
      return JSON.parse(localStorage.getItem('goyang.awake') || 'false') === true || !!document.fullscreenElement;
    }
    catch (e) {
      return !!document.fullscreenElement;
    }
  };
  const ask = async () => {
    if (document.visibilityState !== 'visible' || wake || asking || !want())
      return;
    asking = true;
    try {
      const w = await navigator.wakeLock.request('screen');
      wake = w;
      w.addEventListener('release', () => {
        if (wake === w)
          wake = null;
      });
    }
    catch (e) { }
    asking = false;
  };
  document.addEventListener('visibilitychange', ask);
  document.addEventListener('fullscreenchange', ask);
  ask();
};
