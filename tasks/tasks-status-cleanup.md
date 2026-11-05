# tasks/ 상태 줄 정리 (끝난 것 done으로)
- status: done
- mode: needs-review
- office: done (헤드쿼터 #3, 2026-11-06)
- brief: (그림 없음)
- 출처: 회의 2026-11-05 — 진짜 헤드쿼터(goyang-hq)의 첫 일감. 주인이 정함: 할로윈 마녀의 집은 끝남

## 범위
- `tasks/`의 지시서 머리 `- status:` 줄만 고친다(메모에 한 줄씩 이유). 코드·그림·다른 절은 건드리지 않는다.
- `- office:` 줄은 건드리지 않는다.

## 요구사항
- [ ] `tasks/halloween-witch-tower.md`: `status: done` — 2026 할로윈 기간이 끝났고 들어간 기능은 매년 돈다. 메모에 "내년 할로윈 전에 다시 볼 것: 낮 연무색·창 불·박쥐 시각"
- [ ] `tasks/tv-drama-kids.md`: `status: done` — 12편 그림·편성이 다 들어감(`tasks/tv-schedule.md` 끝). 메모에 그 한 줄
- [ ] `tasks/season-watch-tags.md`: `reviewed` → `done` (검수·확인 끝, 메모 그대로)
- [ ] 그 밖의 `brief` 지시서(js-bundle-modulepreload · scene-without-basic-props · sprite-anchors-to-meta · visual-check-ui-flake · window-light-tint)는 그대로 둔다 — 아직 안 한 일
- [ ] `node tools/check_structure.mjs` 통과

## 확인
- [ ] (사람) 하네스 시험: 진짜 헤드쿼터에서 이 일감이 열리고(번호가 새로 시작), 브랜치가 `office/issue-N`, 검수 댓글이 `(codex)`, 끝나면 이슈가 닫히는지

<!-- office:verify
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-05 지시서 작성(Claude, 회의).
- 2026-11-05 구현(Claude): 세 지시서 status 줄·메모만 고침. 나머지 brief 5개는 그대로.
