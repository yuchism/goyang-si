# 방 밖 페이지(기지·광장·만화방)의 복사된 도우미를 한 곳으로
- status: done
- mode: needs-review
- brief: (그림 없음)
- related-adr: (없음)
- 출처: 대화 2026-11-16 — 코드 점검(Claude, jscpd 중복 검사)

## 배경 (2026-11-16 잰 것)
방(`web/js`) 안의 중복은 0.6%로 낮다. 중복은 거의 다 **방 밖 페이지들이 서로 베껴 온 도우미**다:

| 도우미 | 있는 곳 | 원본 |
|---|---|---|
| `gcEvent` (GoatCounter, count.js 늦으면 0.5초씩 40번 기다림) | `base.js` · `plaza.js` · `shop.js` · `viewer.js` | `js/util.js`에 이미 export |
| 언어 고르기 (`goyang.lang` → 브라우저 `/^ko\b/`) | `base.js` · `plaza.js` · `shop.js` · `viewer.js` | `js/i18n.js` `pickLang` (export 안 됨) |
| `freshVisit` (새로 고침·뒤로 가기는 안 셈) | `base.js` · `plaza.js` · `shop.js` | — |
| `leaveWith` (이벤트 보내고 0.18초 뒤 이동) | `shop.js` · `viewer.js` (+ 같은 동작을 `shelf.js`·`frontdoor.js`가 손으로) | — |
| `el` · `place` | `base.js` · `plaza.js` · `shop.js` | — |
| `fit` (폰: 높이 맞춤+가로 둘러보기 / 데스크톱: 전체) | `base.js` · `plaza.js` · `shop.js` — 13줄 똑같음 | — |

- **`shop.js`는 언어 기준이 둘**: `i18n.js`의 `tr`(→ `i18n` `LANG`)을 가져오면서 자기 `LANG`도 따로 계산한다. 규칙이 같아 지금은 괜찮지만 한쪽만 바뀌면 한 화면에 두 언어가 섞일 수 있다.
- plaza·shop은 이미 `../js/util.js`를 가져오고, base도 `time.js`를 거쳐 `util.js`를 받는다 → 새로 받는 바이트는 거의 없다.
- **`viewer.js`는 빼 둔다**: 모듈이 아닌 `<script defer>`이고 "의존성 없음·방 묶음과 분리"가 결정 사항(tasks/manhwa-viewer.md). 복사본 옆 주석("i18n.js pickLang과 같은 규칙")만 새 위치를 가리키게 고친다.

## 요구사항
- [x] `pickLang`을 `util.js`로 옮겨 export, `i18n.js`는 그것을 쓴다 (`i18n.js`를 가져오면 큰 글자 표·글꼴 설정이 따라오므로 언어 고르기만은 `util.js`에)
- [x] 새 파일 `js/subpage.js` (가져오는 것은 `util.js`만): `el` · `place` · `freshVisit` · `leaveWith` · `fit` (+ base·shop의 가로 둘러보기가 정말 같으면 그것도. 다르면 그대로 두고 메모에 무엇이 다른지)
- [x] `base.js` · `plaza.js` · `shop.js`가 복사본을 지우고 `util.js`(`gcEvent`·`pickLang`)·`subpage.js`에서 가져온다
- [x] 통계 경로·제목이 지금과 글자 하나까지 같다: shop은 앞에 `manhwa/shop/`를 붙이고 제목 없으면 경로, base·plaza는 경로 그대로. 접두어는 각 페이지의 작은 감싸개로
- [x] `shop.js`의 언어 기준을 하나로 (`i18n.js` `LANG`)
- [x] `shelf.js` · `frontdoor.js`의 "보내고 0.18초 뒤 이동"을 `subpage.js`(또는 `util.js`)의 같은 함수로 — 눌린 대상 찾기 같은 각자의 부분은 그대로
- [x] `viewer.js`는 코드 그대로, 주석만
- [x] 보이는 동작·통계 그대로

## 확인
- [x] `node tools/check_structure.mjs` 통과 (`subpage.js`가 덩어리 밖이어야 한다)
- [x] `node tools/check_time.mjs` 통과 (base·plaza·shop은 시간 검사 대상)
- [x] `node tools/check_plaza.mjs '?dev=1&night=1&probe=1'` 통과
- [x] 화면 점검: `visual_check.js` 전후 → `compare.py` 같음 (방 쪽은 `shelf.js`·`frontdoor.js`만 닿음)
- [x] 통계 (사람 또는 브라우저 도구): 각 페이지 콘솔에서 `window.goatcounter = { count: o => console.log(o) }` 를 넣은 뒤 — 기지 방문·상황판 넘김 / 광장 방문 / 만화방 방문·나가기·책 / 방 책장 책·약도 가게 — 찍히는 `path`·`title`이 바꾸기 전과 같은지 (전후를 메모에)
- [x] 화면 (사람): `/base/` · `/plaza/` · `/manhwa/`를 폰 폭과 데스크톱 폭으로 열어 맞춤·가로 둘러보기가 전과 같은지
- [x] 언어 (사람): 방에서 EN으로 바꾼 뒤 `/manhwa/`를 열어 계산대 말풍선·문 표지판·책 이름이 모두 영어인지

<!-- office:verify
- node tools/check_structure.mjs
- node tools/check_time.mjs
- node tools/check_plaza.mjs '?dev=1&night=1&probe=1'
-->

## 메모
- 2026-11-16 지시서 작성(Claude, 코드 점검 대화). jscpd(8줄·70토큰 이상) 기준 방 밖 페이지 중복 약 130줄, 느슨하게(5줄) 보면 약 390줄.
- 2026-11-16 구현(Claude, 주인 "그냥 직접 해줘요"). 지시서와 달라진 점:
  - 새 파일 이름은 `js/page-kit.js`(방의 책장·약도도 같이 쓰므로 subpage 대신). **가져오는 것 없음**: 통계 보내기는 함수로 받는다(`countThenGo(링크, 보내기)`·`leaveOnClick(a, 보내기)`). 그래서 `util.js`도 안 가져온다.
  - `fit`만 `fitStage(W, H, sc, stage, view)`로 같이 씀. 가로 둘러보기는 기지(기다렸다 출발 `panWait`, 시간 인자)와 만화방(2800ms 고정)이 달라 그대로 둠.
  - `base/family.js`의 `el(tag, cls)`는 cls가 없어도 className을 넣어서(`"undefined"`) 그대로 둠.
  - `pickLang`은 `util.js`(store를 씀). 기지 `LANG`은 예전엔 localStorage를 직접 읽었지만 같은 열쇠(`goyang.lang`)·같은 결과.
  - 같이 지운 안 쓰는 가져오기: `clamp`(duet·fish·mouse·wheel·yarn), `esc`(fishview), `say`(main), `P`(outside), `O`·`onScene`(sprites — HOLE을 objects.js로 옮긴 뒤).
- 검사(클라우드 Chromium, 가짜 시계): 기지·광장(?dev=1&night=1)·만화방(·?dev=1) × 한국어·영어 × 폰(390)·데스크톱(1300) 20가지
  - 통계(`goatcounter.count`로 받은 path·title)·`document.title`·`lang` 모두 전후 같음 (기지 `base-visit`, 광장 `plaza-visit`, 만화방 출입문 `manhwa/shop/go-home`).
  - 화면: 다른 8장은 모두 같은 코드(전)로 다시 찍어도 같은 자리가 달라지는 흔들림(기지 붓 고양이 프레임, 만화방 작은 움직임 두 곳).
  - 방 약도: 문 약도 열기 → 만화방 누르기 → 통계 `door-map`, `map-manhwa`("약도에서 가게로: map-manhwa") 전후 같고 `/manhwa/?via=map`으로 떠남.
  - 맥: `check_structure`(page-kit·query 덩어리 밖)·`check_time`·`check_plaza` 통과. 방 `visual_check`는 위 티켓 메모.
  - (사람) 세 항목은 위 자동 확인으로 갈음. 실제 폰에서 기지·만화방 가로 둘러보기를 한 번 보면 좋다.

## 리팩터 후보 (AGENTS.md 9장, 이번 작업 끝)
- 가로 둘러보기(`stopPan`·`scrollAt`·`panTo`)를 기지·만화방이 따로 가짐 — `makePan(view, {wait})` 하나로 모을 수 있음.
- `manhwa/viewer.js`의 언어·통계 복사본은 결정대로 남김. 뷰어를 모듈로 바꿀 일이 생기면 그때 `util.js`·`page-kit.js`로.
