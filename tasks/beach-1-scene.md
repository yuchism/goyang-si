# 미스테리 해변 1: 장면 — 하늘·해·물·파도, 해돋이/해넘이 3분
- status: todo
- mode: needs-review
- brief: `assets/briefs/BEACH_BG_ART.md` (배경 두 겹 — 받음: `assets/beach/beach-bg-far-384.png`·`beach-bg-near-384.png`)
- 출처: 회의 2026-11-26 — `BEACH_PLAN.md` 3·4장

## 범위
- `/beach/` 새 페이지. 캠핑장 무대(`web/campsite/stack.js`)·안개(`fog.js`)를 같이 씀. 한 픽셀 = 화면 2px. 이 대화에서 Claude가 직접 구현.
- 길(beach-2)·병(beach-3)·소리(beach-4)는 따로.

## 결정
- 정면 고정. 끌면 좌우로 조금만 고개를 돌림(360도 아님), 놓으면 제자리로 천천히.
- 방문자 시간대 0~12시 → 해돋이, 12~24시 → 해넘이. 도착부터 3분.
  - 해넘이: 금빛 → 주황 → 분홍 → 푸른 땅거미 → 첫 별 → 별 뜬 밤바다에 머묾.
  - 해돋이: 어둠 → 푸른 새벽 → 분홍 → 해가 떠오름 → 아침 빛에 머묾.
- 받은 그림은 명암만 있는 푸른 회색 → 시간대 색으로 물들임(코드).
- 코드로: 하늘 색 띠, 해, 물 위 햇빛 길, 물결, 밀려왔다 빠지는 파도 거품, 젖은 모래, 별.
- 해넘이 때 수평선 근처 먼 작은 배 한 척, 먼 갈매기.
- 모닥불 없음.

## 요구사항
- [ ] `web/beach/` (index.html·beach.css·beach.js·sky.js 등), 그림은 384폭 png로
- [ ] 3분 진행 + 끝 장면에 머묾
- [ ] 동작 줄이기: 끝 장면 바로
- [ ] 미리보기: `?sun=rise|set`, `?at=0~1`
- [ ] 넓은 화면: 그림 정수배, 수평선 맞춤
- [ ] 들어올 때 안개가 걷힘

## 확인
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 폰·랩탑: 3분이 지루하지 않은지, 밤바다가 먹먹한지

<!-- office:verify
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-26 Claude 씀.
