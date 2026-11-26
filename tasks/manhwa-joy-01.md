# 일격필살 이조이 — 새 작품 등록 + 1화 「하루에 단 한 번」 장 그림 4장 → 회차
- status: brief
- mode: needs-review
- office: ready
- brief: assets/briefs/joy/01-brief.md
- assets: assets/manhwa/joy/cover.png · assets/manhwa/joy/1/01.png ~ 04.png (새로, git 무시) · web/manhwa/joy/ (build_manhwa.py가 만듦)
- 출처: 회의 2026-11-26 — 주인: "이 만화는 고양시의 새로운 만화책이 될 거예요". 시나리오 goyang-hq `manhwa/joy/1-scenario.md`

> **검수·사람 확인:** `(사람)` 항목은 사람 검수에서 주인이 본다. 구현 중에 질문으로 묻지 않는다.

## 범위
- **새 작품 `joy` 등록:** 만화방 신간 코너(장면 설정 `works`)에 두 번째 작품으로 더한다. 제목 「일격필살 이조이」 / "One Strike Joy". 표어는 아직 없음(주인이 정하면 `tagline`·`taglineEn`).
- **작품 표지:** `assets/briefs/joy/cover-key.png`를 `assets/manhwa/joy/cover.png`로 쓴다(그림 안 「일격필살 이조이」 글자 포함 — csf 표지처럼 그대로 둠). 목록 아래 1/3에 글자가 걸리면 사람 판단.
- **1화 그림:** `01-brief.md`의 장 4개를 그림으로 받아 1화를 만든다. 지시서를 새로 쓰거나 고치지 않는다(오타·모순은 summary에).
- 웹툰 규칙은 `assets/briefs/joy/GUIDE.md`. csf 작품·뷰어 코드는 작품 목록에 한 줄 더하는 것 말고는 건드리지 않는다.

## 그림 요청 (4장)
- 경로 `assets/manhwa/joy/1/01.png` ~ `04.png`, 크기 1024×1536(세로 2:3).
- 장마다 prompt = `01-brief.md`의 그 장 덩어리 그대로 + 같은 문서 "이 화 공통" 절.
- image_common = `GUIDE.md` 5장 진지판 화풍 블록 그대로 + "인물은 `sheet-a.png`·`sheet-b.png`를 먼저 열어 보고 얼굴·머리·별 문양 위치·의상·검을 그대로, 화풍은 `cover-key.png`" + 04장은 `ending-master.png`도 함께 + 4장 페이지 규격(바깥 테두리·위아래 여백 없음, 지시서에 적힌 글자만 정확히, 한국어만).
- 회차 만들기: `python3 tools/build_manhwa.py joy 1 --open 2026-12-01 --title "하루에 단 한 번"` → `python3 tools/build_manhwa.py joy --check`. 공개일 2026-12-01(화). 이 작품은 매주 화요일 공개.

## 요구사항
- [ ] 장면 설정 `works`에 `joy` 추가, 신간 코너에 두 번째 책으로 나옴
- [ ] `assets/manhwa/joy/cover.png` 둠 → 목록 표지·미리보기 생성
- [ ] 그림 4장 요청 → 그림 검수 → `assets/manhwa/joy/1/01~04.png`
- [ ] 1화 만들기(공개일 2026-12-01, 제목 「하루에 단 한 번」), `web/manhwa/joy/episodes.json`에 등록
- [ ] summary 끝에 장마다 한 줄: 그림 검수 회차 · 남은 걱정(얼굴·별 문양 위치·글자·03장 컷3·엔딩 구도)

## 확인
- [ ] `node tools/check_structure.mjs` · `python3 tools/build_manhwa.py joy --check` · `python3 tools/build_manhwa.py csf --check` 통과
- [ ] (사람) 폰 화면 모드로 만화방 → 신간 코너에 「일격필살 이조이」 → 목록(표지·제목) → 1화 끝까지 → 「만화방으로」
- [ ] (사람) 4장을 이어 볼 때 조이가 시트와 같은 인물(별 문양 위치 포함), 끝까지 진지한 그림체, 03장 컷3이 이 화의 큰 컷으로 살아 있음
- [ ] (사람) 국기·실제 나라 모양·폭발·피가 없음, 말풍선·캡션 글자가 지시서와 같음
- [ ] (사람) 04장 컷3이 ending-master.png와 같은 나무·구도

<!-- office:verify
- node tools/check_structure.mjs
- python3 tools/build_manhwa.py joy --check
- python3 tools/build_manhwa.py csf --check
-->

## 메모
- 2026-11-26 지시서 작성(Claude, 주인과 회의). 주인 확인 뒤 `- office: ready`(2026-11-26).
- 2026-11-26 주인 확정: 별 문양은 조이의 왼쪽 볼(시트 기준), 연재는 매주 화요일, 1화 공개일 2026-12-01.
- 정할 것: 표어.
- 2026-11-27 주인 확정: 표어 "하루에 한 번이면 충분하다" / "Once a day is enough" (`build_manhwa.py --check`가 표어를 꼭 요구함). 작품 등록·표지 먼저 커밋, 1화 그림 4장 요청.
