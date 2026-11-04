# Google Fonts가 첫 그리기를 막지 않게
- status: implemented   (검수 기다림 — 화면 점검·load_check·사람 항목은 맥에서)
- mode: needs-review
- office: ready
- brief: (그림 없음)
- assets: (없음)
- related-adr: 0007, 0008
- 출처: docs/plans/LOAD_PLAN.md 7장 · 회의 2026-11-04(구멍 1 E 격리 확인을 겸해 하네스로)

## 지금
- `index.html` 머리에서 Google Fonts CSS(Gaegu·Gowun Dodum·Patrick Hand, `display=swap`)를 `<link rel="stylesheet">`로 불러온다 → 이 CSS를 받을 때까지 첫 그리기가 막힌다.
- `sw.js`는 글꼴을 한 번 받으면 캐시한다(`goyang-fonts`). 처음 방문이 문제.

## 요구사항
- [ ] 글꼴 CSS가 첫 그리기를 막지 않게 (예: `media="print" onload` 방식 또는 미리 받기 + 비동기 적용 — 방법은 구현 때 비교해 메모에)
- [ ] 글꼴이 늦게 와도 글자가 깨지거나 크게 튀지 않게(대체 글꼴 `--font-hand`·`--font-body` 순서 그대로)
- [ ] 캔버스에 글자를 그리는 곳(말풍선·자막·책등)이 글꼴이 온 뒤 다시 그려지는지 확인
- [ ] 격리 확인(하네스 시험, 이 티켓에서만): 구현 전에 딱 한 번 Bash `ls ~/Documents`와 Read 도구로 `~/Documents`를 해 보고, 나온 결과를 이 항목의 criteria note에 그대로 적는다. 거절되는 게 정상이다(코드는 고치지 않음). 그 밖에는 작업 공간 밖을 보지 않는다

## 확인
- [ ] `node tools/check_structure.mjs` 통과
- [ ] `node tools/load_check.mjs` 전후 비교를 메모에(돌릴 수 없으면 그 이유를 메모에)
- [ ] 회귀: `visual_check` 전후 같음 (점검은 글꼴 요청을 막고 찍으므로 같아야 한다 — 돌릴 수 없으면 사람 검수로)
- [ ] (사람) 느린 네트워크(개발자 도구 Slow 4G)로 처음 열기 → 방이 먼저 뜨고 글꼴이 뒤따라 바뀌는지, 어색하지 않은지
- [ ] (사람) 하네스 시험: 격리 확인 항목의 결과가 "거절"인지, 맥에 "문서 접근" 창이 뜨지 않았는지

<!-- office:verify
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-04 하네스로 맡김(`office: ready`). 확인 절·검사 블록을 더하고, 구멍 1 E(일꾼이 `~/Documents`를 못 읽음) 확인을 겸함 — 주인 요청.
- 2026-11-04 구현 메모 (강고양이 씨, #49)
  - 방법 비교: ① `media="print" onload` — 간단하지만 크롬은 print CSS를 가장 낮은 우선순위로 받아 글꼴이 늦게 온다. ② `rel="preload" as="style" onload="this.rel='stylesheet'"` — 빠르지만 preload를 모르는 브라우저에선 CSS가 영영 안 붙는다.
    → 둘을 겹쳐 씀: `preload`(높은 우선순위로 미리 받기) + `media="print" onload="this.media='all'"`(같은 응답을 받아 두었다가 다 오면 적용). preload를 몰라도 ②의 구멍이 없다. 스크립트가 꺼진 경우를 위해 `<noscript>`로 보통 stylesheet.
  - 대체 글꼴: `style.css`의 `--font-hand`·`--font-body` 순서는 그대로, `display=swap`도 그대로 → 글꼴이 오기 전엔 대체 글꼴로 보이다가 바뀐다(글자 깨짐 없음). 글자 폭이 조금 달라 바뀔 때 살짝 움직일 수 있음 — `size-adjust`로 맞추기는 범위 밖.
  - 캔버스 글자: 말풍선·자막(`sprites.js`)·책 이름표(`shelf.js` `drawBookTag`)·TV 화면(`tv-screen.js`)·생일 노트북 띠(`birthday.js`)·만득 씨 말풍선(`manduk.js`)·참치 찾기(`draw.js`)·베란다(`veranda.js`) 모두 매 장면 `ctx.font`(HAND)·`measureText`·`fillText`로 다시 그린다 — 글자를 캐시하는 곳이 없어 글꼴이 오면 다음 장면부터 바뀐다. 책장 캐시(`buildCache`)에는 글자가 없고, 책장 판의 책등은 DOM(`.spine`)이라 CSS가 오면 저절로 바뀐다. 불꽃놀이 글자는 시스템 글꼴만 씀.
  - 다만 CSS가 늦게 오면 `setHandFont`의 `document.fonts.load`가 @font-face가 없어 빈손으로 끝난다 → `util.js`에서 `#fontcss`의 load 때 한 번 더 부르게 함(지금 언어의 손글씨 글꼴).
  - `check_structure` 통과. `load_check`·`visual_check`는 이 작업 공간에 Playwright(node_modules)가 없어 돌리지 못함 → 맥에서 전후 비교 필요. 두 점검 모두 글꼴 요청을 막으므로(`route abort`) 예전에도 막힌 CSS는 곧 실패로 끝나 첫 그리기를 오래 잡지 않았다 — `load_check` 수치는 거의 같고 화면 점검도 같아야 정상. 실제 효과는 (사람) Slow 4G 항목으로 본다.
  - 리팩터 후보: `assets.js` 맨 위의 `document.fonts.load('700 30px Gaegu')`는 `setHandFont`와 겹친다(한국어일 때). 지울지는 승인 후.
