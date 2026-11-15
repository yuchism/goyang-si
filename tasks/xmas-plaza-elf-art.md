# 크리스마스 광장 엘프 그림: 지붕 위 달리기·점프·미끄덩 시트
- status: brief
- mode: needs-review
- office: ready
- relay: brief
- implement: codex
- brief: assets/briefs/XMAS_PLAZA_ELF_ART.md (회의에서 씀 — 왕복으로 다듬기)
- assets: assets/plaza/elf-source-v1.png (git 무시) · web/plaza/elf.webp
- 출처: 회의 2026-11-16 — `XMAS_PLAZA_PLAN.md` 3-7

## 범위
- **그림만.** 지붕 길·그림자 칠하기·등장 시각 코드는 다음 티켓. `web/js/`·`web/plaza/*.js`는 건드리지 않는다.
- 자루 멘 엘프 1명 × 8칸(달리기 4 · 점프 · 내려다보기 · 미끄덩 · 엉덩방아). 화면에선 단색 그림자로만 보이므로 윤곽이 또렷해야 한다.
- 그림 속 글자 없음(AGENTS.md 6장).

## 요구사항
- [ ] 지시서 `assets/briefs/XMAS_PLAZA_ELF_ART.md` 왕복으로 다듬기
- [ ] 시트 요청 → 들어오면 지시서 5장 체크리스트로 대조, 다시 그릴 것만 다시
- [ ] 원본 `assets/plaza/elf-source-v1.png`, 웹 `web/plaza/elf.webp` (줄인 크기·칸 크기는 메모에)
- [ ] 검수 폴더에 실루엣 미리 보기(8칸을 단색으로)와 달리기 gif, 광장 지붕 위 합성 `_overview.png`

## 확인
- [ ] `test -f web/plaza/elf.webp`
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 실루엣 미리 보기: 그림자만으로 엘프·자루가 읽히는지, 미끄덩·엉덩방아가 웃긴지
- [ ] (사람) `_overview.png`: 지붕 위 크기가 어울리는지

<!-- office:verify
- test -f web/plaza/elf.webp
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-16 지시서 작성(Claude, 회의). 주인 확인 뒤 `- office: ready`(2026-11-16). `implement: codex`(ChatGPT 구현·Claude 검수).
- (사람) 항목은 사람 검수에서 주인이 본다(구현 중에 묻지 않고, 검수자도 막는 이유로 쓰지 않음).
