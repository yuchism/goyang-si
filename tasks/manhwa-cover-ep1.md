# 만화방 표지 + 1화 「역대 최강의 AI 등장」 공개 + 작품 제목 「쫄깃 소넷맛 치킨 — 지금까지 이런 치킨은 없었다」
- status: brief
- mode: needs-review
- implement: codex
- office: ready
- brief: assets/briefs/MANHWA_COVER_ART.md (이 티켓에서 새로 씀)
- assets: assets/manhwa/csf/cover.png (git 무시, 로컬) · web/manhwa/csf/cover.webp·og.jpg · web/manhwa/csf/<1화 이름>/
- related-adr: 0011
- 출처: 회의 2026-11-06 — 표지를 만들어 1화를 공개까지. `implement: codex`의 첫 진짜 티켓(Claude 사용량을 아끼려고 지시서 왕복은 뺌)

## 범위
- **표지 1장:** 만화방 목록 맨 위 큰 그림과 공유 미리보기에 쓰는 작품 표지(회차 도구는 `assets/manhwa/csf/cover.png`가 있으면 목록 표지·미리보기로 씀).
- **1화 공개:** 원고 `assets/manhwa/csf/1/`(11장, 이미 맥에 있음)로 1화를 올린다. 공개일 **2026-11-06(오늘)**.
- **제목(주인 2026-11-06):** 지금 목록은 큰 제목 「여전히 나는 기본값이다」 + 작은 줄 「쫄깃 소넷맛 치킨」(신간 코너도 같음). 이것을 **큰 제목 「쫄깃 소넷맛 치킨」 + 작은 줄(표어) 「지금까지 이런 치킨은 없었다」**로 바꾼다. 영어: "Chewy Sonnet-Flavored Chicken" + "Never Has There Been a Chicken Like This".
  - `episodes.json` 머리: `series`("여전히 나는 기본값이다")를 빼고 `tagline`·`taglineEn`을 둔다. 뷰어(`web/manhwa/viewer.js`)·만화방 신간 코너·회차 HTML(도구)·공유 미리보기 제목에서 큰 제목 = `name`(영어 화면은 `nameEn`), 작은 줄 = `tagline`. 회차 막대·문서 제목도 `name`으로.
- **1화 제목: 「역대 최강의 AI 등장」.**
- 그 밖의 뷰어·만화방 코드는 건드리지 않는다.

## 그림
- 원고와 같은 화풍·같은 인물(원고 `assets/manhwa/csf/1/episode-1-1-page.png` 등을 참고): 순정만화풍 곱슬머리 안경 아저씨(앞치마), 깃털 달린 하얀 소넷, 넥타이 맨 수탉, 다른 둥근 모델 친구들 — 치킨집 카운터에서 치킨 접시를 든 장면.
- **글자 없음**(제목은 코드가 KO/EN으로 얹음). 목록 맨 위에 깔리므로 **위쪽 1/10은 비교적 비우고**, 아래쪽 1/4은 크림 종이색(#f6eedf)으로 스르르 이어지게 덜 복잡하게.
- 크기 1200×1500 근처(세로), PNG. 유명 치킨 프랜차이즈 상징(빨강·흰 줄무늬, 할아버지 얼굴)은 피한다.

## 요구사항
- [ ] 그림 지시서 `assets/briefs/MANHWA_COVER_ART.md`: 위 그림의 장면·인물·크기·비울 자리·피할 것·참고 원고 — 그림 일꾼이 이 파일만 읽고 그릴 수 있게
- [ ] 표지 1장 요청(`assets/manhwa/csf/cover-source-v1.png`) → 그림 검수 통과 → `assets/manhwa/csf/cover.png`로 둠
- [ ] 제목 바꾸기(위 범위): `episodes.json` 머리 `tagline`·`taglineEn`, 뷰어·만화방 신간 코너·도구(회차 HTML·미리보기)가 큰 제목 = 작품명, 작은 줄 = 표어
- [ ] `python3 tools/build_manhwa.py csf 1 --open 2026-11-06 --title "역대 최강의 AI 등장"` → `web/manhwa/csf/` 표지·미리보기·1화 조각·썸네일·회차 HTML·목록이 생김(조각은 1화 본문 첫 장부터)
- [ ] `episodes.json`에 1화(공개일 2026-11-06, 제목 「역대 최강의 AI 등장」), 무작위 이름은 도구가 뽑은 그대로
- [ ] 이 지시서 메모에 1화 주소(`/manhwa/csf/<이름>/`) 한 줄

## 확인
- [ ] `python3 tools/build_manhwa.py csf --check` 통과
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 검수 폴더의 표지: 원고 인물과 같은 사람들, 글자 없음, 위쪽이 비어 제목 띠와 안 겹침
- [ ] (사람) 폰 화면 모드로 만화방 → 신간 코너(「쫄깃 소넷맛 치킨」·「지금까지 이런 치킨은 없었다」) → 목록(표지·제목) → 1화 「역대 최강의 AI 등장」 끝까지 → 「만화방으로」, 영어 화면도 한 번

<!-- office:verify
- test -f web/manhwa/csf/cover.webp && test -f web/manhwa/csf/og.jpg
- python3 tools/build_manhwa.py csf --check
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-06 지시서 작성(Claude, 회의). 주인: "커버 만들어서 1화 퍼블리싱까지" · "신간 「여전히 나는 기본값이다 (쫄깃 소넷맛 치킨)」을 「쫄깃 소넷맛 치킨 (지금까지 이런 치킨은 없었다)」로" · "1화 제목은 「역대 최강의 AI 등장」".
