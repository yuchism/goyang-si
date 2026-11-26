# 미스테리 해변 3: 쪽지 병
- status: todo
- mode: needs-review
- brief: 글귀 `assets/briefs/beach/notes-draft.md` (150개, 주인 확정 2026-11-26)
- 출처: 회의 2026-11-26 — `BEACH_PLAN.md` 5장

## 결정
- 병은 작은 복셀 모형(스프라이트 스태킹). 방문자 날짜로 하루 한 번, 도착하고 조금 뒤 물가로 밀려와 파도에 흔들림.
- 누르면 낡은 종이 쪽지가 펼쳐지고 글귀 하나 — 갈무리 픽셀 글꼴, 언어 설정에 따라 한국어/영어.
- 무작위, 다 볼 때까지 겹치지 않음. 닫으면 그날은 모래 위 병 자국만.
- 기록은 방문자 브라우저에만(`store`).

## 요구사항
- [ ] 글귀를 `web/beach/notes.json`(또는 js)으로
- [ ] 병 모형·밀려오기·흔들림
- [ ] 쪽지 열기·닫기, 키보드·스크린리더로도
- [ ] 하루 한 번·겹치지 않기 기록
- [ ] 미리보기: `?bottle=1`(오늘 이미 봤어도 다시)

## 확인
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 쪽지를 열 때 설레는지, 글이 읽기 편한지

<!-- office:verify
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-26 Claude 씀.
