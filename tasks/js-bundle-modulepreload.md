# 처음 열 때 JS 왕복 줄이기 (묶기 또는 modulepreload)
- status: brief
- mode: needs-review
- brief: (그림 없음)
- assets: (없음)
- related-adr: 0007 (오프라인, 새 버전 바로), 0008 (시작 묶음)
- 출처: docs/plans/LOAD_PLAN.md 7장 ("이번에는 안 하는 것")

## 지금
- `web/js/` 모듈 53개를 import를 따라 한 겹씩 찾는다(`main.js`만 import 35줄). 왕복이 겹겹이 쌓인다.
- 빌드 없음(AGENTS.md 1장: `web/`을 그대로 배포).

## 고를 것 (사람 — 회의)
- (가) `index.html`에 `<link rel="modulepreload">` 목록. 빌드 없음 유지. 목록이 코드와 어긋나지 않게 검사가 필요
- (나) 배포 때 esbuild로 하나로 묶기. `pages.yml`이 바뀐다(보호된 파일 — 사람이 고침). 로컬 실행·화면 점검은 묶지 않은 원본으로 계속
- → 정해지면 ADR 후보 (빌드 없음 원칙을 바꾸는지)

## 요구사항
- [ ] 고른 방법 구현 (`pages.yml` 수정이면 바꿀 내용을 제안만)
- [ ] 확인: `node tools/load_check.mjs`로 전후 "방이 열리기까지" 시간·요청 수 비교, 결과를 메모에
- [ ] 오프라인(0007): 한 번 연 뒤 비행기 모드로 다시 열린다 (사람, 폰)
- [ ] 새 버전이 바로 보인다(0007): 배포 후 다시 열면 새 코드 (사람)
- [ ] 회귀: 보이는 동작은 그대로 — `visual_check` 전후 같음

## 메모
