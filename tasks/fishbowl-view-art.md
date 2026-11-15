# 어항 크게 보기 그림: 금붕생이네 집 (어항·보물상자 / 살림 / 고양이 비침)
- status: done
- mode: needs-review
- relay: brief
- office: done (헤드쿼터 #38·#39·#40, 2026-11-15)
- brief: assets/briefs/FISHBOWL_VIEW_SPRITE_PLAN.md (회의에서 씀 — 왕복으로 다듬기)
- assets: assets/sprites/*-v1.png (git 무시, 로컬) · web/r/fbv_*.webp · web/r/chest_*.webp · web/r/home_*.webp · web/r/fish_sleep_1.webp · web/r/cat_glass_*.webp
- 출처: 회의 2026-11-15 어항 크게 보기 — `FISHBOWL_VIEW_PLAN.md`

## 범위
- **그림만.** 크게 보기 화면 코드(들어가기·나가기, 층 그리기, 상태 공유, 낚시 연결)는 `FISHBOWL_VIEW_PLAN.md` 1단계 티켓에서 한다. `web/js/`·`objects.json`은 건드리지 않는다.
- 그림 속 글자 없음(AGENTS.md 6장) — 문패도 금붕어 그림만.
- 그리지 않는 것(물풀·거품·바늘·줄·반투명·일그러짐·물빛)은 지시서 1장 끝 목록대로 코드 몫.
- 강고양이 씨 비침은 **불투명하게** 그려 받는다(반투명은 코드).
- 세 티켓은 지시서 3장 "넣는 순서"대로: 어항·보물상자 → 살림·금붕생이 → 고양이 비침. 앞 티켓을 기다리지 않아도 되지만, 화풍 기준은 어항 뒤판이다.

## 요구사항
- [ ] 받은 그림 크기·여백이 지시서 2장과 다르면 어떻게 맞췄는지 메모에
- [ ] 원본은 `assets/sprites/`에 `이름-v1.png`, 웹은 `web/r/`에 webp → `python3 tools/build_meta.py`

## 티켓: 어항·보물상자 (5장)
- [ ] 지시서 `assets/briefs/FISHBOWL_VIEW_SPRITE_PLAN.md` 왕복으로 다듬기(크기 감각 숫자는 플랜과 어긋나지 않게)
- [ ] `fbv_back`·`fbv_front` 1536×1536 — 두 장 원이 같은 자리·같은 크기, 뒤판은 원 밖 투명, 앞판은 테두리·반사광·수면선 말고 투명
- [ ] `chest_closed`·`chest_peek`·`chest_open` 512×512 — 세 장 상자 몸통 자리·크기 같게(뚜껑만 바뀜), `peek`은 붕어빵 꼬리 삐죽, `open`은 붕어빵 가득. 붕어빵 모양은 `web/r/boong_1.webp`와 같게
- [ ] (사람) 뒤판·앞판을 겹쳐 띄워 보고: 방 어항(`web/r/fishbowl_back.webp`)과 같은 어항으로 보이는지, 아늑한 집 톤인지, 글자 없음

<!-- office:verify
- test -f web/r/fbv_back.webp && test -f web/r/fbv_front.webp && test -f web/r/chest_closed.webp && test -f web/r/chest_peek.webp && test -f web/r/chest_open.webp
- python3 tools/build_meta.py --check
- node tools/check_structure.mjs
-->

## 티켓: 살림·금붕생이 (4장 + 다시 뽑기)
- [ ] `home_bed`(조개 침대 + 물풀 이불)·`home_chair`(돌 두 개 의자)·`home_sign`(글자 없는 금붕어 문패) 512×512
- [ ] `fish_sleep_1` 512×512 — 조개 침대에 누워 쉬는 금붕생이, 기존 금붕어 그림(`assets/sprites/fish-*-v1.png`)과 같은 얼굴·색
- [ ] 기존 금붕어 5장(swim 1·2, sigh, carry, hello)을 원본에서 크게 다시 뽑기 → `web/r/fbv_fish_*.webp` (방에서 쓰는 `fish_*.webp`는 그대로)
- [ ] (사람) 어항 뒤판 위에 살림·보물상자를 대충 놓아 보고 크기·화풍이 어울리는지

<!-- office:verify
- test -f web/r/home_bed.webp && test -f web/r/home_chair.webp && test -f web/r/home_sign.webp && test -f web/r/fish_sleep_1.webp && test -f web/r/fbv_fish_swim_1.webp
- python3 tools/build_meta.py --check
- node tools/check_structure.mjs
-->

## 티켓: 강고양이 씨 비침 (4장)
- [ ] `cat_glass_look`·`cat_glass_blink` 1536×1536 정면 — 두 장 얼굴 위치 완전히 같게(눈만 다름)
- [ ] `cat_glass_nose`(코를 유리에 눌러 납작)·`cat_glass_paw`(앞발 하나, 분홍 젤리) 1536×1536
- [ ] 강고양이 씨 체크리스트(`FISH_SPRITE_PLAN.md` 3장) 대조 — 곱슬 털 뭉치, 눈가 갈색 얼룩, 분홍 귀, 주황 목줄 + 금방울
- [ ] (사람) 네 장을 나란히 띄워 보고: 방의 강고양이 씨(`web/f/cat_sit_1.webp`)와 같은 고양이로 보이는지, 무섭지 않고 귀여운지

<!-- office:verify
- test -f web/r/cat_glass_look.webp && test -f web/r/cat_glass_blink.webp && test -f web/r/cat_glass_nose.webp && test -f web/r/cat_glass_paw.webp
- python3 tools/build_meta.py --check
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-15 티켓 작성(Claude, 회의). 지시서는 회의에서 먼저 씀. 주인 요청으로 `- office: ready`(2026-11-15).
- 2026-11-15 세 티켓 사람 검수 통과, `main`에 합침(501c81e). 지시서 장 번호는 합치며 4~8장으로 정리.
