# 미스테리 캠핑장 2: 캠핑장 페이지 · 풍경 · 하늘
- status: brief
- mode: needs-review
- brief: 그림 없음 (전부 코드)
- 출처: 회의 2026-11-20 — `CAMPSITE_PLAN.md` 2~4장

## 범위
- 1번(모닥불) 다음. 새 페이지 `/campsite/`(광장·기지처럼 따로). 나가기 버튼 → 거실.
- 먼 풍경은 아스키 파노라마 띠, 가까운 것은 1번 모듈.

## 요구사항
- [ ] `/campsite/` 페이지: 들어올 때 안개가 걷히며(글자 입자로 흩어짐) 시작, 구석의 작은 나가기 버튼 → 안개 → 거실
- [ ] 360도 파노라마: 앞 호수·눈 덮인 골짜기(물에 별·산 비침), 오른쪽 텐트 쪽 풀 언덕, 왼쪽 산벽, 뒤 숲과 호수로 드는 개울
- [ ] 별 반짝임, 호수 위 한가운데 오늘의 달(날짜로 위상 계산, 방문자 타임존으로 남·북반구 모양)
- [ ] 항상 밤. KO/EN, `sw.js`, GoatCounter `campsite-visit`, 동작 줄이기

## 확인
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) `/campsite/` 폰·넓은 화면: 돌리면 방향마다 풍경이 다르고, 달 모양이 오늘과 맞는지

<!-- office:verify
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-20 Claude 씀.
