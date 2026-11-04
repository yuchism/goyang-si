# Google Fonts가 첫 그리기를 막지 않게
- status: brief
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
