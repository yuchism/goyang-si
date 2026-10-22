# 계절 구경 행동의 끼어들기 정하기
- status: implemented
- mode: needs-review
- brief: (그림 없음)
- assets: (없음)
- related-adr: (없음 — 기존 행동 성격표 규칙 안의 값 결정)
- 출처: STABILITY_PLAN.md 9장 ② "창밖 보기(window)처럼 할지는 따로 정한다"

## 결정 (2026-10-23)
- `leaves`(낙엽 구경)·`firstsnow`(첫눈 구경)·`geese`(철새 올려다보기)는
  창밖 보기 `window`와 같은 `[N, Y, Y]`로 한다.
  창밖에 빠져 있을 때는 TV 사건을 무시하고, 유령 그림자·창밖 손님에는 반응한다.

## 요구사항
- [x] `web/js/behave.js` `BEHAVIOR`의 세 줄을 `[N, Y, Y]`로
- [x] 세 줄 위 주석("지금 동작 그대로 … 따로 정한다")을 결정 내용으로 바꾼다
- [ ] `node tools/check_behave.mjs --quick` 통과
- [ ] 화면 점검: 다른 장면이 나오면 계절 구경 중 TV 반응이 빠진 것뿐인지 눈으로 확인
- [x] STABILITY_PLAN.md 9장 해당 줄에 "→ tasks/season-watch-tags.md" 표시

## 메모
- 보이는 동작 변화: 계절 구경 중 TV 큰 장면이 나와도 고개를 돌리거나 달려가지 않는다. 다른 것은 같다.
- 2026-10-23 구현 (Claude): 위 [x] 세 항목. 검사 실행·커밋은 아직 — 노트북 또는 Codex가 돌리고 결과를 여기에 적은 뒤 status를 reviewed로.
