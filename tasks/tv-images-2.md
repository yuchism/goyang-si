# TV 2차 그림: 30분 4편 (식당·유치원·털실·실험실)
- status: done
- mode: needs-review
- office: done (연습장 헤드쿼터, 2026-11-05 진짜 헤드쿼터로 이사하며 닫음)
- brief: assets/briefs/tv-drama-kids.md
- assets: assets/tv/programs/tv-<id>-*of3-*.png (git 무시, 로컬) · web/r/tv/tv_<id>_*of3.webp
- 출처: 회의 2026-11-01. 순서는 `tasks/tv-drama-kids.md` 메모 — 2차 30분 4편 → 3차 60분 4편 → 편성 등록 한 번(`tasks/tv-schedule-1.md`, 보류)

## 범위
- 4편 × 3장 = 12장. 프로그램 하나 = 티켓 하나(아래 목록), 그림 3장을 그림 일꾼에게 한 번에 요청하고 한 번에 검수.
- **편성 등록은 하지 않는다**: `programs.json`·`i18n.js`·`tv-assets.json`·`check_tv` 기대값은 12편이 다 모인 뒤 한 번에.

## 할 일
그림 지시서 `assets/briefs/tv-drama-kids.md`에서 `{id}` 절(장면 표·피할 것)대로 그림 3장(`1of3`·`2of3`·`3of3`)을 그림 일꾼에게 **한 번에** 요청한다. 들어오면 그림 지시서 2장 "다듬기"대로 납품 PNG(320×240)와 웹 webp를 만들고 webp만 커밋한다(원본·납품 PNG는 `assets/` — git 무시, 커밋하지 않음).
이 지시서와 그림 지시서는 **고치지 않는다** — 형제 티켓과 같이 쓰는 파일이라(고치면 다른 티켓 승인이 풀림). 장면을 바꿔야 할 것 같으면 질문으로.

## 완료 기준
- [ ] `web/r/tv/tv_{id}_1of3.webp`·`tv_{id}_2of3.webp`·`tv_{id}_3of3.webp`가 있고 모두 320×240
- [ ] 원본 `assets/tv/programs/tv-{id}-<n>of3-source-v1.png`·납품 `…-320x240-v1.png`가 작업 공간에 있다 (커밋 안 함)
- [ ] `programs.json`·`i18n.js`는 건드리지 않았다
- [ ] (사람) 검수 폴더의 `_overview.png`로 세 장: 그림 지시서 장면대로, 평소 두 장(1·2of3) 구도·선이 겹침, 글자 없음, 아래 1/5 자막 자리가 비교적 비어 있음
- [ ] (사람) 원작과 닮지 않음 — 그림 지시서 3장과 그 프로그램의 "피할 것"

## 목록
- dr_diner — 「고양 식당 사람들」 (4-2)
- kid_kinder — 「냥냥 유치원」 (5-2)
- kid_yarn — 「모험 털실」 (5-3)
- kid_lab — 「왜왜 박사의 실험실」 (5-5)

<!-- office:verify
- test -f web/r/tv/tv_{id}_1of3.webp && test -f web/r/tv/tv_{id}_2of3.webp && test -f web/r/tv/tv_{id}_3of3.webp
- python3 -c "import sys; from PIL import Image; bad=[f for f in sys.argv[1:] if Image.open(f).size != (320, 240)]; print(bad); sys.exit(1 if bad else 0)" web/r/tv/tv_{id}_1of3.webp web/r/tv/tv_{id}_2of3.webp web/r/tv/tv_{id}_3of3.webp
-->

## 메모
- 2026-11-01 지시서 작성(Claude, 회의). 고양이 사무실 1e(지시서를 커밋하면 등록)의 첫 실전 — 목록 묶음.
