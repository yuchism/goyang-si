# 쫄깃 소넷맛 치킨 4화 「아저씨의 이중생활」 — 장 그림 14장 → 회차
- status: brief
- mode: needs-review
- office: ready
- brief: assets/briefs/csf/04-brief.md
- assets: assets/manhwa/csf/4/01.png ~ 14.png (새로, git 무시) · web/manhwa/csf/ 회차 (build_manhwa.py가 만듦)
- 출처: 주인 원고 "어디 가시게요?"(2026-11-13 회의에서 다듬음) → 회차 지시서 `04-brief.md`(Claude, 진지판 14장)

> **검수·사람 확인:** `(사람)` 항목은 사람 검수에서 주인이 본다. 구현 중에 질문으로 묻지 않고, 검수자도 "사람 확인 결과가 없다"를 꼭 고칠 것으로 내지 않는다(사람 확인 남음에만).

## 범위
- `04-brief.md`의 장 14개를 그림으로 받아 회차 4화를 만든다. 지시서는 이미 있다 — **지시서를 새로 쓰거나 고치지 않는다**(오타·모순을 찾으면 summary에 적기만).
- 웹툰 규칙은 `assets/briefs/csf/GUIDE.md`(세계 규칙 2장 · 페이지 규격 3장 · 진지판 화풍 4장 · 그림 검수 기준 6장), 원고 폴더·올리기는 `assets/briefs/manhwa-manuscript.md`.
- 3화와 다른 점: 회상 장면이 많다(젊은 아저씨·어르신). 회상 위 아저씨 말은 따옴표 붙은 "목소리 캡션"(지시서 "이 화 공통"). 실제 포털 이름은 대사에만 — 그림 속 로고·화면은 모두 가상 디자인.

## 그림 요청 (그림 14장 — 하네스가 8장씩 나눠 그림)
- 한 요청에 14장 전부: 경로 `assets/manhwa/csf/4/01.png` ~ `14.png`(새로 만들 파일), 크기 1024×1536(세로 2:3).
- 장마다 prompt = `04-brief.md`의 그 장 덩어리(```text 블록) 그대로 + 같은 문서 "이 화 공통" 절.
- image_common = `GUIDE.md` 4장 진지판 화풍 블록 그대로 + "인물은 `assets/briefs/csf/sheet-serious.png`(캐릭터 시트)를 먼저 열어 보고 얼굴·머리·체격·의상을 그대로" + 3장 페이지 규격(바깥 테두리·위아래 여백 없음, 지시서에 적힌 글자만 정확히, 한국어만, 실제 로고 금지).
- 장 번호 순서대로 그리게 한다(01부터).

## 그림을 받은 뒤
- 그림 검수가 남긴 "다듬을 것"(여백·크기)은 코드로 다듬는다. `build_manhwa.py`가 바깥 여백·테두리를 잘라내니 대부분은 그대로 둬도 된다.
- 회차 만들기: `python3 tools/build_manhwa.py csf 4 --open 2026-11-27 --title "아저씨의 이중생활"` → `python3 tools/build_manhwa.py csf --check`.

## 요구사항
- [ ] 그림 14장 요청 → 그림 검수 → `assets/manhwa/csf/4/01~14.png`
- [ ] 회차 4화 만들기(공개일 2026-11-27, 제목 「아저씨의 이중생활」), `episodes.json`에 등록
- [ ] summary 끝에 장마다 한 줄: 그림 검수 회차 · 남은 걱정(얼굴·글자·로고)

## 확인
- [ ] `node tools/check_structure.mjs` · `node tools/check_time.mjs` · `python3 tools/build_manhwa.py csf --check` 통과
- [ ] (사람) 사람 검수에서: 14장을 이어서 볼 때 아저씨·소넷 얼굴이 장마다 같은 인물로 보임(시트 기준), 젊은 아저씨가 같은 사람의 젊은 시절로 보임
- [ ] (사람) 사람 검수에서: 말풍선·캡션 글자가 지시서와 같음(목소리 캡션의 따옴표 포함), 컷 순서가 지시서대로
- [ ] (사람) 사람 검수에서: 실제 포털·회사 로고나 실존 인물을 닮은 얼굴이 없음

<!-- office:verify
- node tools/check_structure.mjs
- node tools/check_time.mjs
- python3 tools/build_manhwa.py csf --check
-->

## 메모
- 2026-11-13 지시서 작성(Claude, 주인과 회의). 원고에서 소스 보기 절·뤽배송 농담·되풀이 대사를 빼고 몇 표현을 순화함(지시서 메모 참고). 진지판, 14장(8+6으로 나눠 그림).
