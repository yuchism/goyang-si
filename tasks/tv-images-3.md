# TV 3차 그림: 60분 4편 (괴담·응급실·편의점·털뭉치)
- status: brief
- mode: needs-review
- office: ready
- brief: assets/briefs/tv-drama-kids.md
- assets: assets/tv/programs/tv-<id>-*of5-*.png (git 무시, 로컬) · web/r/tv/tv_<id>_*of5.webp
- 출처: 회의 2026-11-01·02. 2차(`tasks/tv-images-2.md`, 30분 4편)와 같은 모양. 이게 끝나면 12편이 다 모여 편성 등록 한 번(`tasks/tv-schedule-1.md`, 보류)

## 범위
- 4편 × 5장 = 20장. 프로그램 하나 = 티켓 하나(아래 목록), 그림 5장을 그림 일꾼에게 한 번에 요청하고 한 번에 검수.
- 60분 프로 5장 = 평소(L) 2 + 사건 M 1 + 사건 L 1 + 끝 장면 1 (그림 지시서 2장).
- **편성 등록은 하지 않는다**: `programs.json`·`i18n.js`·`tv-assets.json`·`check_tv` 기대값은 12편이 다 모인 뒤 한 번에.

## 할 일
그림 지시서 `assets/briefs/tv-drama-kids.md`에서 `{id}` 절(장면 표·피할 것)대로 그림 5장(`1of5`~`5of5`)을 그림 일꾼에게 **한 번에** 요청한다. 들어오면 그림 지시서 2장 "다듬기"대로 납품 PNG(320×240)와 웹 webp를 만들고 webp만 커밋한다(원본·납품 PNG는 `assets/` — git 무시, 커밋하지 않음).
이 지시서와 그림 지시서는 **고치지 않는다** — 형제 티켓과 같이 쓰는 파일이라(고치면 다른 티켓 승인이 풀림). 장면을 바꿔야 할 것 같으면 질문으로.

## 완료 기준
- [ ] `web/r/tv/tv_{id}_1of5.webp` ~ `tv_{id}_5of5.webp` 5장이 있고 모두 320×240
- [ ] 원본 `assets/tv/programs/tv-{id}-<n>of5-source-v1.png`·납품 `…-320x240-v1.png`가 작업 공간에 있다 (커밋 안 함)
- [ ] `programs.json`·`i18n.js`는 건드리지 않았다
- [ ] (사람) 검수 폴더의 `_overview.png`로 다섯 장: 그림 지시서 장면대로, 평소 두 장(1·2of5) 구도·선이 겹침, 글자 없음(「어명이오」 같은 말·모니터 숫자도 없음), 아래 1/5 자막 자리가 비교적 비어 있음
- [ ] (사람) 피·상처 없음(괴담·의학극), 원작과 닮지 않음 — 그림 지시서 3장과 그 프로그램의 "피할 것"

## 목록
- dr_ghost — 「고양 괴담」 (4-4)
- dr_er — 「고양대학병원 응급실」 (4-5)
- dr_store — 「골목 끝 편의점」 (4-6)
- dr_family — 「우리 집 털뭉치들」 (4-7)

<!-- office:verify
- test -f web/r/tv/tv_{id}_1of5.webp && test -f web/r/tv/tv_{id}_2of5.webp && test -f web/r/tv/tv_{id}_3of5.webp && test -f web/r/tv/tv_{id}_4of5.webp && test -f web/r/tv/tv_{id}_5of5.webp
- python3 -c "import sys; from PIL import Image; bad=[f for f in sys.argv[1:] if Image.open(f).size != (320, 240)]; print(bad); sys.exit(1 if bad else 0)" web/r/tv/tv_{id}_1of5.webp web/r/tv/tv_{id}_2of5.webp web/r/tv/tv_{id}_3of5.webp web/r/tv/tv_{id}_4of5.webp web/r/tv/tv_{id}_5of5.webp
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-02 지시서 작성(Claude, 회의). 주인 확인 뒤 `- office: ready`로 커밋.
