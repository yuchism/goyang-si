# 화면 점검 ui 장면 흔들림 고치기
- status: brief
- mode: needs-review
- brief: (그림 없음)
- assets: (없음)
- related-adr: (없음)
- 출처: tasks/season-watch-tags.md 회귀 점검 (2026-10-24)

## 문제
- `node tools/visual_check.js <포트> <폴더> ui`를 **같은 코드·같은 포트로 두 번** 찍어도
  `ui_0.png`·`ui_1.png`·`ui_2.png` 세 장이 `compare.py`에서 "다름"으로 나온다.
- 다른 곳은 늘 같고, 달라지는 곳은 매번 같은 상자 (654,618)–(748,621) — 94×3px 띠, 아래 패널 바로 위.
- 그래서 보이는 동작을 바꾸지 않는 작업에서도 "다른 화면 3 개"가 거짓 경보로 나온다 (AGENTS.md 8장 회귀 판단을 흐림).
- 다른 15개 장면(59장)은 실행마다 같다.

## 요구사항
- [ ] 원인 찾기: 그 자리에 무엇이 그려지는지, 왜 시계·무작위·타이머·rAF 고정(`INIT`)을 빠져나가는지
      (후보: CSS transition/animation, 글꼴 늦게 뜸, `ui` 장면의 `page:1` 찍는 시점)
- [ ] 고치기: 가능하면 `visual_check.js` 쪽(점검 도구)에서 고정한다. 앱 코드를 바꿔야 하면 멈추고 알린다
- [ ] 확인: `ui` 장면을 같은 코드로 3번 찍어 `compare.py` 셋 다 "다른 화면 0 개"
- [ ] 회귀: 고친 뒤 전체 장면 전후 비교에서 다른 장면이 그대로인지 (도구를 바꾸므로 기존 결과와도 비교)

## 메모
- 재현 (2026-10-24, Claude, 클라우드 Chromium): after@8001 두 번 → ui 3장 다름 / before@8000 vs before@8001 → ui 3장 다름 / before@8000 vs after@8001 → 0장 (우연히 같음).
- 회귀 기준(`--write-baseline`)은 건드리지 않는다.
