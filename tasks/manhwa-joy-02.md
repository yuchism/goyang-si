# 일격필살 이조이 2화 「어디든 갑니다」 — 장 그림 4장 → 회차
- status: implemented
- mode: needs-review
- office: ready
- brief: assets/briefs/joy/02-brief.md
- assets: assets/manhwa/joy/2/01.png ~ 04.png (새로, git 무시) · web/manhwa/joy/ (build_manhwa.py가 만듦)
- 출처: 회의 2026-11-27 — 주인: "술 먹고 집에 가는데 승차거부 당하다가 일격필살로 승차거부를 없애 버리는… 택시에서 다들 파 냄새가 나고". 시나리오 goyang-hq `manhwa/joy/2-scenario.md`

> **검수·사람 확인:** `(사람)` 항목은 사람 검수에서 주인이 본다. 구현 중에 질문으로 묻지 않는다.

## 범위
- `02-brief.md`의 장 4개를 그림으로 받아 2화를 만든다. 지시서를 새로 쓰거나 고치지 않는다(오타·모순은 summary에).
- 웹툰 규칙은 `assets/briefs/joy/GUIDE.md`. 개그판(5장 "후보")·현대편 복식(2장)을 처음 쓰는 화다.
- 작품 등록·표지·뷰어 코드는 건드리지 않는다.

## 그림 요청 (4장)
- 경로 `assets/manhwa/joy/2/01.png` ~ `04.png`, 크기 1024×1536(세로 2:3).
- 장마다 prompt = `02-brief.md`의 그 장 덩어리 그대로 + 같은 문서 "이 화 공통" 절.
- image_common = `GUIDE.md` 5장 개그판 블록 그대로 + "인물은 `sheet-modern.png`(복식·대파검)와 `sheet-b.png`(표정·SD)를 먼저 열어 보고 얼굴·머리·별 문양 위치(조이의 왼쪽 볼)·추리닝·장바구니·대파와 빨간 술을 그대로" + 04장은 `ending-master.png`도 함께(엔딩 컷만 진지판 화풍) + 4장 페이지 규격(바깥 테두리·위아래 여백 없음, 지시서에 적힌 글자만 정확히, 한국어만).
- 회차 만들기: `python3 tools/build_manhwa.py joy 2 --open 2026-12-08 --title "어디든 갑니다"` → `python3 tools/build_manhwa.py joy --check`. 공개일 2026-12-08(화).

## 요구사항
- [ ] 그림 4장 요청 → 그림 검수 → `assets/manhwa/joy/2/01~04.png`
- [ ] 2화 만들기(공개일 2026-12-08, 제목 「어디든 갑니다」), `web/manhwa/joy/episodes.json`에 등록
- [ ] summary 끝에 장마다 한 줄: 그림 검수 회차 · 남은 걱정(얼굴·별 문양 위치·추리닝·대파와 술·택시 표시등 글자·엔딩 구도)

## 확인
- [ ] `node tools/check_structure.mjs` · `python3 tools/build_manhwa.py joy --check` · `python3 tools/build_manhwa.py csf --check` 통과
- [ ] (사람) 폰 화면 모드로 「일격필살 이조이」 목록 → 2화 끝까지 → 「만화방으로」
- [ ] (사람) 4장을 이어 볼 때 조이가 시트와 같은 인물(별 문양 위치, 추리닝, 대파와 빨간 술), 개그판 그림체가 장마다 같음
- [ ] (사람) 03장 컷1 "일격필살!!" 컷이 이 화의 큰 컷으로 살아 있음, 04장 컷3이 ending-master.png와 같은 나무·구도
- [ ] (사람) 택시에 실제 회사 로고·번호판 글자 없음, 술병·간판 없음, 말풍선·캡션·표시등 글자가 지시서와 같음

<!-- office:verify
- node tools/check_structure.mjs
- python3 tools/build_manhwa.py joy --check
- python3 tools/build_manhwa.py csf --check
-->

## 메모
- 2026-11-27 지시서 작성(Claude, 주인과 회의). 주인 확인 받고 `- office: ready`.
- 2026-11-27 그림 4장 받음(그림 검수 통과, 1회) → 2화 이름 `u8cm6`, 공개일 2026-12-08, 조각 4개. 검수 지적 "01장 첫 캡션이 맨 위 1/10에 걸림" → 다시 그리지 않고 원본은 `assets/manhwa/joy/2/raw/01.png`로 두고, `01.png`는 컷1 맨 위 24px(건물·밤하늘)을 184px로 늘려 컷 안 내용을 160px 아래로 내림(1024×1536 → 1024×1696, 1/10 선 약 170px, 캡션 상자 위끝 약 205px). 검사 셋 통과.
