# 미스테리 캠핑장 4: 소리
- status: brief
- mode: needs-review
- brief: 그림 없음 (소리는 주인이 고름)
- 출처: 회의 2026-11-20 — `CAMPSITE_PLAN.md` 6장

## 범위
- 실제 녹음만(합성음 X). Claude가 Openverse·Pixabay에서 후보를 찾고 주인이 고른 뒤 넣는다.

## 요구사항
- [ ] 장작 타닥(계속), 개울 졸졸(그쪽을 보면 커짐), 풀벌레(작게), 가끔 부엉이·장작 '툭'
- [ ] 타자기 키 소리, 줄 바꿈 '띵'
- [ ] 반복 소리는 이음매 없이
- [ ] 출처를 `ASSET_LICENSE.md` "Third-party sounds"에

## 확인
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 소리 후보를 듣고 고름
- [ ] (사람) `/campsite/`에서 반복 이음매가 안 들리는지, 개울 쪽을 보면 졸졸이 커지는지

<!-- office:verify
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-20 Claude 씀.
