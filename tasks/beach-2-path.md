# 미스테리 해변 2: 캠핑장 ↔ 해변 오가는 길
- status: todo
- mode: needs-review
- brief: 캠핑장 뒤 오솔길 그림은 이미 들어감(`web/campsite/bg-near-v2.png` 뒤 절반 — 팻말·등불)
- 출처: 회의 2026-11-26 — `BEACH_PLAN.md` 2장

## 결정
- 캠핑장 뒤 등불에 따뜻한 빛이 은은히 깜빡임.
- 오솔길 쪽을 보고 있을 때 누르면 안개 → `/beach/`. (다른 쪽을 볼 때 누르면 지금처럼 입력 칸 + 불똥)
- 해변 구석 작은 버튼 → 안개 → `/campsite/`. 거실로는 캠핑장을 거쳐서.
- 약도에는 없음. 숨은 곳이라 검색 차단(noindex) 유지.

## 요구사항
- [ ] 등불 빛(배경 각도에 붙어 함께 돎)
- [ ] 오솔길 방향 판정 + 누르기 → 안개 나가기
- [ ] 해변 돌아가기 버튼
- [ ] `web/sw.js`에 해변 파일

## 확인
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 돌아보다 발견하는 맛이 있는지, 너무 숨지는 않았는지

<!-- office:verify
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-26 Claude 씀.
