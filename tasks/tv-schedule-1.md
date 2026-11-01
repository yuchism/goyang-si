# TV 1차 편성 등록: 그림 들어온 4편 + 「창가에서」·「뮤직냥크」 편성 바꾸기
- status: brief
- mode: needs-review
- office: ready
- brief: assets/briefs/tv-drama-kids.md
- assets: web/r/tv/tv_dr_secret_*·tv_dr_joseon_*·tv_kid_five_*·tv_kid_hill_*.webp (이미 main에)
- related-adr: 0006 · 0013 (평일은 본방만, 재방은 주말 몰아보기)
- 출처: 회의 2026-11-01. 전체 결정은 `tasks/tv-drama-kids.md` "결정" 절 — 이 지시서는 그중 1차

## 범위
- 4편: 「출생의 비밀냥」(`dr_secret`, 30분·3장) · 「냥조실록」(`dr_joseon`, 60분·5장) · 「발바닥 특공대 냥파이브」(`kid_five`, 30분·3장) · 「꾹꾹이 언덕」(`kid_hill`, 30분·3장).
  시각·요일은 `tasks/tv-drama-kids.md` 결정 표대로(출생의 비밀냥 평일 08:00, 냥조실록 수·목 21:00, 냥파이브 평일 16:30, 꾹꾹이 언덕 평일 07:30, 주말 몰아보기).
- 「창가에서」(`drama`): 월·화 21:00 본방, 평일 재방 빼고 주말만.
- 「뮤직냥크」(`music`): 금 16:00 → 금 22:00.
- 나머지 8편은 그림이 없어서 넣지 않는다 — 그 칸은 지금처럼 일반 편성이 채운다. 「고양 괴담」 할로윈 특집도 3차 때.

## 요구사항
- [ ] `web/r/tv/programs.json`에 4편: `name`·`loop`·`events`·`end`·`gap`·`watch`·`runtime`·`episodes`·`first`·`rerun`(주말만)·`maxPerDay`. 장면·반응은 그림 지시서 4·5장
- [ ] `drama`: `first`를 월·화 21:00으로(방영 조건 문법은 구현 때 확인), `rerun`에서 평일 시간대를 빼고 주말만
- [ ] `music`: `air`를 금 22:00으로
- [ ] `web/js/i18n.js`: 4편 이름(ko/en — The Switched Kitten / Annals of the Meow Dynasty / Paw Squad Meow Five / Kneading Hill) + 자막
- [ ] `assets/tv/tv-assets.json`에 4편 그림 등록, `python3 tools/build_meta.py`로 메타 다시 만들기
- [ ] `tools/check_tv.mjs` 기대값: 평일 드라마·어린이 `rerun` 0건 / 4편이 정해진 요일·시각에 본방 / 본방 회차가 1씩 오름 / 금 22:00 뮤직냥크
- [ ] 06시 막힘: 「창가에서」 새벽 재방을 빼면 05:10~07:00이 모자랄 수 있음 — 400일 편성 검사(빈틈·화면 조정 0)로 확인, 막히면 뉴스·날씨 등 새벽 조건으로 푼다
- [ ] 의도한 편성 변경이므로 회귀 기준을 `node tools/check_tv.mjs --write-baseline`으로 다시 뽑아 같이 커밋(사람 검수에서 확인)
- [ ] 방영 조건으로 안 되는 게 나오면 코드를 고치지 말고 질문으로(AGENTS.md 6장 "TV 프로그램": 데이터만으로)

## 확인
- [ ] `node tools/check_tv.mjs` 통과 (위 기대값 포함)
- [ ] `python3 tools/build_meta.py --check` 통과
- [ ] 편성 (사람): `?dev=1` → TV 미리보기 7일 보기에서 평일 07:30·08:00·16:30·21:00·22:00 칸이 결정 표와 같고(수·목 21:00 냥조실록, 금 22:00 뮤직냥크), 평일에 「(재)」 표시가 없는지
- [ ] 주말 (사람): 같은 7일 보기에서 토·일 몰아보기 회차가 그 주 본방 회차와 이어지는지
- [ ] 화면 (사람): 미리보기에서 4편을 하나씩 띄워 평소 장면·사건·끝 장면·자막·고양이 반응

<!-- office:verify
- node tools/check_tv.mjs
- python3 tools/build_meta.py --check
-->

## 메모
- 2026-11-01 지시서 작성(Claude, 회의). 고양이 사무실 1e(지시서를 커밋하면 등록)의 첫 실전.
- `- office: ready` 줄은 하네스용: 이 줄이 있으면 하네스가 일감을 연다. 같은 값으로는 한 번만 — 다시 돌리려면 `ready 2`로.
