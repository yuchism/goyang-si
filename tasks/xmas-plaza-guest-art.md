# 크리스마스 광장 손님 그림: 6명 걷기·올려다보기 시트
- status: implemented
- mode: needs-review
- office: done (헤드쿼터 #49, 그림 검수 다시 그리기 한도에 막혀 주인 요청으로 손으로 끝냄 2026-11-16)
- relay: brief
- implement: codex
- brief: assets/briefs/XMAS_PLAZA_GUEST_ART.md (회의에서 씀 — 왕복으로 다듬기)
- assets: assets/plaza/guests/*-walk-source-v1.png (git 무시) · web/plaza/guests/*-walk.webp
- 출처: 회의 2026-11-16 — `XMAS_PLAZA_PLAN.md` 3-5

## 범위
- **그림만.** 광장에서 걷고 멈추는 코드는 다음 티켓. 방(`web/js/`)·광장 코드(`web/plaza/*.js`)는 건드리지 않는다.
- 코알라·캥거루·토끼·양·강아지·웜뱃 6명 × 5칸(걷기 4 + 트리 올려다보기 1). 캥거루·토끼는 깡충 뛰기. 생일 손님과 같은 인물, 고깔모자 대신 겨울 소품 하나.
- 그림 속 글자 없음(AGENTS.md 6장).

## 요구사항
- [x] 지시서 `assets/briefs/XMAS_PLAZA_GUEST_ART.md` 왕복으로 다듬기
- [x] 6장 요청 → 들어오면 지시서 5장 체크리스트로 대조, 다시 그릴 것만 다시
- [x] 원본 `assets/plaza/guests/`, 웹 `web/plaza/guests/<이름>-walk.webp` 6장 (줄인 크기·칸 크기는 메모에)
- [x] 검수 폴더에 손님별 걷기 미리 보기 gif와 광장 위 0.42배 합성 `_overview.png`

## 확인
- [x] `test -f`로 웹 그림 6장
- [x] `node tools/check_structure.mjs` 통과
- [ ] (사람) 걷기 gif: 제자리에서 자연스럽게 걷는지(캥거루·토끼는 깡충), 생일 손님과 같은 인물인지
- [ ] (사람) `_overview.png`: 광장에서 크기·화풍이 어울리는지, 겨울 소품이 귀여운지

<!-- office:verify
- test -f web/plaza/guests/koala-walk.webp && test -f web/plaza/guests/kangaroo-walk.webp && test -f web/plaza/guests/rabbit-walk.webp && test -f web/plaza/guests/sheep-walk.webp && test -f web/plaza/guests/dog-walk.webp && test -f web/plaza/guests/wombat-walk.webp
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-16 지시서 작성(Claude, 회의). 주인 확인 뒤 `- office: ready`(2026-11-16). ChatGPT 토큰이 넉넉해서 `implement: codex`(ChatGPT 구현·Claude 검수), 6명 한 번에.
- (사람) 항목은 사람 검수에서 주인이 본다(구현 중에 묻지 않고, 검수자도 막는 이유로 쓰지 않음).
- 2026-11-16 막힘 정리(Claude, 손으로): 하네스 그림 검수가 "①③ 다리·팔 교대"를 이유로 11회까지 다시 그리게 하다 막힘. 사람 검수 결과로 정리:
  - 코알라·캥거루·토끼·웜뱃·강아지: 하네스 원본(강아지·코알라는 사람 검수 뒤 다시 그린 것)을 `tools/make_plaza_guests.py`(하네스가 만든 정리 도구를 `main`으로 가져옴)로 웹 시트 → `web/plaza/guests/` (60296d8).
  - 양: 하네스 그림은 사람처럼 성큼성큼 걸어서 쓰지 않음. 주인이 ChatGPT로 직접 그린 것(앞발 가슴에 모음, 짧은 뒷다리 종종걸음)을 씀. **양 탈을 쓴 늑대**도 주인이 같은 방식으로 그려 손님에 추가(살금살금, 올려다보며 침). 원본 `assets/plaza/guests/sheep-·wolf-sheep-disguise-walk-source-v1.png`, 도구에 늑대 키 490 (cdd1945).
  - 광장 손님 7명. 걷기·멈추기 코드는 `web/plaza/guests.js`(ec5738b).
