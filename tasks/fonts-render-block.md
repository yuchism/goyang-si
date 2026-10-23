# Google Fonts가 첫 그리기를 막지 않게
- status: brief
- mode: needs-review
- brief: (그림 없음)
- assets: (없음)
- related-adr: 0007, 0008
- 출처: docs/plans/LOAD_PLAN.md 7장

## 지금
- `index.html` 머리에서 Google Fonts CSS(Gaegu·Gowun Dodum·Patrick Hand, `display=swap`)를 `<link rel="stylesheet">`로 불러온다 → 이 CSS를 받을 때까지 첫 그리기가 막힌다.
- `sw.js`는 글꼴을 한 번 받으면 캐시한다(`goyang-fonts`). 처음 방문이 문제.

## 요구사항
- [ ] 글꼴 CSS가 첫 그리기를 막지 않게 (예: `media="print" onload` 방식 또는 미리 받기 + 비동기 적용 — 방법은 구현 때 비교해 메모에)
- [ ] 글꼴이 늦게 와도 글자가 깨지거나 크게 튀지 않게(대체 글꼴 `--font-hand`·`--font-body` 순서 그대로)
- [ ] 캔버스에 글자를 그리는 곳(말풍선·자막·책등)이 글꼴이 온 뒤 다시 그려지는지 확인
- [ ] 확인: `node tools/load_check.mjs` 전후 비교, 메모에
- [ ] 확인 (사람): 느린 네트워크(개발자 도구 Slow 4G)로 처음 열기 → 방이 먼저 뜨고 글꼴이 뒤따라 바뀌는지, 어색하지 않은지
- [ ] 회귀: `visual_check` 전후 같음 (점검은 글꼴 요청을 막고 찍으므로 같아야 한다)

## 메모
