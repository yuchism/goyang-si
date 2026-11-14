# 행동 검사가 페이지를 넘기는 링크를 누르면 멈춤
- status: done
- mode: needs-review
- brief: (그림 없음)
- assets: (없음)
- related-adr: (없음)
- 출처: 2026-11-14 (총출동 9장 검사 중 발견, 주인: "검사 도구에서 막는 쪽")

## 지금
- `node tools/check_behave.mjs --quick`이 둘째 장면에서 `page.evaluate: Execution context was destroyed … navigation`으로 멈춘다. 변경 전 코드로도 같음.
- 까닭: 무작위 조작(캔버스 아무 데나 누르기)이 책장 책·현관·출동(고양이 기지, `sortie.js`)처럼 `location.href`로 다른 페이지로 넘어가는 것을 누른다(주인 짐작: 고양이 기지로 가는 출동).

## 요구사항
- [x] 사이트 코드는 건드리지 않고 검사 도구에서 막는다: 첫 페이지를 연 뒤 메인 프레임의 페이지 이동 요청에 204로 답해 지금 페이지에 머물게
- [x] 막은 횟수를 장면 결과 줄에 "페이지 이동 막음 n번"으로
- [x] 확인: `check_behave --quick`이 끝까지 돈다

## 메모
- 처음엔 page.route만 걸었는데도 넘어갔다 — 페이지 이동 요청을 서비스 워커(`sw.js`)가 받아서 page.route를 거치지 않았기 때문. 검사 브라우저는 `serviceWorkers: 'block'`으로 연다(행동 검사엔 서비스 워커가 필요 없다).
- 실제로 넘어가던 곳: `/base/`(고양이 기지 — 주인 짐작이 맞음).
- 확인 (2026-11-15): `check_behave --quick` 정적 검사 + 장면 10개 모두 통과, "페이지 이동 막음 1번"이 한 장면에 찍힘.

