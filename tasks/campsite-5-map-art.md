# 미스테리 캠핑장 5: 약도의 안개 낀 캠핑장
- status: brief
- mode: needs-review
- brief: `assets/briefs/CAMPSITE_MAP_ART.md` (참고 그림 `assets/briefs/campsite/`)
- 출처: 회의 2026-11-20 — `CAMPSITE_PLAN.md` 2장

## 범위
- 맨 마지막. 동네 약도 맨 위 가운데에 안개 낀 캠핑장 그림(주인이 ChatGPT로) + 이름표 「미스테리 캠핑장」 / Mystery Campsite.

## 요구사항
- [x] 그림 지시서 쓰기(약도 화풍에 맞춰)
- [ ] (사람) 그림 받기
- [ ] `objects.json` `door.map` shops에 한 줄(주소 `/campsite/`, 통계 이름), `OBJECTS.md` 다시 만들기
- [ ] 약도에서 누르면 안개가 짙어지며 캠핑장으로

## 확인
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 현관문·책장 지도책 두 길 모두 약도에서 캠핑장으로 들어가고 거실로 돌아오는지

<!-- office:verify
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-20 Claude 씀.
- 2026-11-20 지시서 씀. 자리는 약도 맨 위 가운데 풀밭(C 터) — 길이 그 아래에서 끝남. 그림은 내일(주인: ChatGPT 오늘 한도 다 씀).
