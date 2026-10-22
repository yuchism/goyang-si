# 계절 구경 행동의 끼어들기 정하기
- status: implemented   (검수: reviews/season-watch-tags.md — 코드 적합, 화면 점검 남음)
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
- [x] `node tools/check_behave.mjs --quick` 통과 (Codex, 2026-10-23)
- [ ] 회귀: `visual_check.js` 전후 같음 (기존 장면에는 계절 구경 + TV 큰 장면 겹침이 없으므로 같아야 한다)
- [ ] 겹침 장면 (사람): `?dev=1` → 「낙엽」 → 창가에 앉으면 콘솔에서 TV 큰 장면 → 고양이가 돌아보지 않는다
- [x] STABILITY_PLAN.md 9장 해당 줄에 "→ tasks/season-watch-tags.md" 표시

## 메모
- 보이는 동작 변화: 계절 구경 중 TV 큰 장면이 나와도 고개를 돌리거나 달려가지 않는다. 다른 것은 같다.
- 2026-10-23 구현 (Claude), 커밋 `9a02165`. 검수 (Codex) `a855314`: 코드 결함 없음, check_behave --quick 통과.
- 회귀·겹침 두 항목이 끝나면 status를 reviewed로.
