# 고양이 홈쇼핑 6번째 상품: 「고양이 왕방울」
- status: brief
- mode: needs-review
- relay: brief
- office: ready
- brief: assets/briefs/tv-homeshop-bell.md (이 티켓에서 새로 씀)
- assets: assets/tv/homeshop/tv-homeshop_bell-<n>of2-*.png (git 무시, 로컬) · web/r/tv/tv_homeshop_bell_<n>of2.webp
- related-adr: 0006
- 출처: 회의 2026-11-05(주인: "홈쇼핑 하나 더 — 고양이 왕방울"). 지시서 왕복(`relay: brief`)의 첫 진짜 일감

## 시나리오 (주인)
- 상품: **목에 다는 큰 방울.** 모델 고양이 얼굴만 한 왕방울 목걸이.
- 그림 2장: **1of2** 모델 고양이가 왕방울 목걸이를 하고 포즈를 잡는다 · **2of2** 고개를 흔들어 방울이 딸랑(음표·반짝임으로 소리를 보여 줌). 평소 장면 둘이라 번갈아 보이므로 구도·선이 거의 겹치게(살짝 다르게).
- 가격: **츄르 1개 (파격 특가).** 이름: 「고양이 왕방울」 / 영어 "Cat Jumbo Bell".
- 편성: **6개 × 10분.** 방송 시간(매일 14:30~15:30)·정파는 그대로, 모든 상품이 매일 나온다. 요일마다 다른 순서(7가지 모두 다름)는 그대로 지킨다.

## 범위
- 지금 홈쇼핑 그림 규칙은 `assets/briefs/TV_PROGRAM_ASSET_PLAN.md` 8장(전화기 고양이 발자국 같은 자리·같은 모양, 글자·숫자 없음, 실존 채널·브랜드·제품 닮지 않게, 320×240). 그 규칙을 따른다.
- 그림 지시서는 **새 파일** `assets/briefs/tv-homeshop-bell.md`에 쓴다(8장 표에는 한 줄 링크만 더해도 됨).
- 원본·납품 PNG는 `assets/`(git 무시) — 커밋하지 않는다. 웹 webp만 커밋.
- 다른 상품 그림·띠 모양·정파 시각은 건드리지 않는다.

## 요구사항
- [ ] 그림 지시서 `assets/briefs/tv-homeshop-bell.md`: 두 장의 장면, 기존 다섯 상품과 맞출 것(화풍·발자국 자리), 피할 것, 파일 이름·규격 — 그림 일꾼이 이 파일만 읽고 그릴 수 있게
- [ ] 그림 2장을 그림 일꾼에게 한 번에 요청 → 들어오면 그림마다 지시서와 대조(다시 그릴 것만 다시) → 320×240 납품 PNG와 웹 `web/r/tv/tv_homeshop_bell_1of2.webp`·`_2of2.webp`
- [ ] `programs.json` 홈쇼핑에 `bell` 구간(`shop`: `tvShopBell`), `segments.min` 12 → 10. `i18n.js`에 `tvShopBell` (ko `['고양이 왕방울', '츄르 1개']`, en `['Cat Jumbo Bell', '1 treat']`)
- [ ] 요일마다 다른 순서가 6개에서도 7가지 모두 다름(코드가 다섯 개에 묶여 있으면 고친다)
- [ ] 편성을 일부러 바꿨으므로 `node tools/check_tv.mjs --write-baseline`으로 회귀 기준을 다시 뽑고, 바뀐 것이 홈쇼핑 구간뿐인지 메모에

## 확인
- [ ] `node tools/check_tv.mjs` 통과(새 기준으로)
- [ ] `python3 tools/build_meta.py --check` 통과
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 검수 폴더 `_overview.png`: 두 장이 시나리오대로, 기존 홈쇼핑과 같은 화풍, 전화기 고양이 발자국이 오른쪽 위 같은 자리, 글자 없음
- [ ] (사람) `?dev=1`로 14:30 이후 홈쇼핑 → 왕방울 구간과 띠「고양이 왕방울 · 츄르 1개」, 영어 화면 "Cat Jumbo Bell · 1 treat"
- [ ] (사람) 하네스 시험: 지시서 왕복 댓글(📝)이 나오고, 확정·시작 뒤 사람 검수까지 주인이 말을 옮긴 일이 없었는지

<!-- office:verify
- test -f web/r/tv/tv_homeshop_bell_1of2.webp && test -f web/r/tv/tv_homeshop_bell_2of2.webp
- node tools/check_tv.mjs
- python3 tools/build_meta.py --check
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-05 지시서 작성(Claude, 회의). 주인이 고름: 목에 다는 큰 방울 · 츄르 1개 · 6개 × 10분.
- 2026-11-05 그림 지시서 `assets/briefs/tv-homeshop-bell.md` 씀(강고양이 씨, 지시서 왕복 1차). 모델은 기존 다섯과 겹치지 않게 회색 단색 고양이, 발자국 자리는 기존 10장을 보고 오른쪽 위 (292, 24) 근처로 적음. `TV_PROGRAM_ASSET_PLAN.md` 8장 표에 링크 한 줄.
