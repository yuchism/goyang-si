# TV 편성 등록: 드라마·어린이 12편 한 번에 + 「창가에서」·「뮤직냥크」·할로윈 「고양 괴담」
- status: done
- mode: needs-review
- office: done (연습장 헤드쿼터 #47, 2026-11-05 진짜 헤드쿼터로 이사하며 닫음)
- brief: assets/briefs/tv-drama-kids.md
- related-adr: 0006 · 0013 (평일은 본방만, 재방은 주말 몰아보기)
- 출처: 회의 2026-10-29(편성 결정) · 2026-11-01(12편이 다 모인 뒤 한 번에) · 2026-11-03(하나의 티켓으로). 결정 표는 `tasks/tv-drama-kids.md` "결정" 절이 기준. 이 지시서가 `tasks/tv-schedule-1.md`(4편, 보류)를 대신한다

## 범위
- 그림 46장이 다 `main`에 있음(`web/r/tv/tv_dr_*`·`tv_kid_*`). 12편을 한 번에 편성에 넣고, 편성 변경 셋을 같이 — 회귀 기준을 한 번만 다시 뽑기 위해.
- **드라마 8편**(「창가에서」 포함)

  | 시각 | 월 | 화 | 수 | 목 | 금 | 토·일 |
  |---|---|---|---|---|---|---|
  | 08:00 (30분) | 출생의 비밀냥 `dr_secret` | ← | ← | ← | ← | 몰아보기 |
  | 17:00 (30분) | 고양 식당 사람들 `dr_diner` | ← | ← | ← | ← | 몰아보기 |
  | 21:00 (60분) | 창가에서 `drama` | 창가에서 | 냥조실록 `dr_joseon` | 냥조실록 | 고양 괴담 `dr_ghost` | 몰아보기 |
  | 22:00 (60분) | 고양대학병원 응급실 `dr_er` | ← | 골목 끝 편의점 `dr_store` | ← | 뮤직냥크 `music` (옮김) | 몰아보기 |
  | 12:00 (60분) | | | | | | 우리 집 털뭉치들 `dr_family` (본방) |

- **어린이 5편** (30분, 평일 본방): 07:30 꾹꾹이 언덕 `kid_hill` · 10:00 냥냥 유치원 `kid_kinder` · 16:00 모험 털실 `kid_yarn` · 16:30 발바닥 특공대 냥파이브 `kid_five` · 17:30 왜왜 박사의 실험실 `kid_lab`. 주말: 토 아침 냥파이브·모험 털실 몰아보기, 일 아침 꾹꾹이 언덕·냥냥 유치원 몰아보기.
- **평일에는 드라마·어린이 재방 없음.** 재방은 주말 몰아보기로만(ADR 0013).
- 「뮤직냥크」는 금 16:00 → 금 22:00(금 16:00은 어린이 시간). 금요일 밤: 21 괴담 → 22 뮤직냥크 → 23:30 마감 뉴스 → 24 누아르.
- **할로윈:** 21시 「고양 괴담」 특집 → 22시부터 기존 공포 특집(`horror`). 21시 그날 본방은 밀려나고 회차는 세지 않는다(기존 특집 규칙).
- 참고: 보류 전에 4편만 돌았던 브랜치 `office/issue-33`(`git show office/issue-33:web/r/tv/programs.json` 등)에 4편 항목·`check_tv` 기대값·창가에서/뮤직냥크 변경이 있다 — 합치지 말고 읽기만.

## 요구사항
- [ ] `web/r/tv/programs.json`에 12편: `name`·`loop`·`events`·`end`·`gap`·`watch`·`runtime`·`episodes`·`first`·`rerun`(주말 몰아보기만)·`maxPerDay`. 장면(L·사건·끝)과 고양이 반응은 그림 지시서 4·5장
- [ ] `drama`(창가에서): 월·화 21:00 본방, `rerun`에서 평일 시간대를 빼고 주말만
- [ ] `music`(뮤직냥크): 금 22:00으로
- [ ] 할로윈 21:00 「고양 괴담」 특집(`special`) → 22시부터 기존 `horror`
- [ ] `web/js/i18n.js`: 12편 이름(ko/en — The Switched Kitten / Goyang Diner / Annals of the Meow Dynasty / Goyang Ghost Stories / Goyang University ER / The Corner Store / Our Furball Family / Kneading Hill / Meow Meow Kindergarten / The Yarn Adventure / Paw Squad Meow Five / Dr. Why's Lab) + 자막
- [ ] `python3 tools/build_meta.py`로 웹 메타(`web/r/tv/meta.json`)가 46장을 다 담는지 확인(필요하면 다시 만들기)
> 참고(할 일 아님): `assets/tv/tv-assets.json`은 git 무시 대상인 주인 맥의 로컬 목록 — 작업 공간에서 고칠 수 없으니 티켓에선 하지 않는다(주인이 필요할 때 로컬에서). 작업 공간 밖을 찾지 않는다
- [ ] `tools/check_tv.mjs` 기대값: 평일 드라마·어린이 `rerun` 0건 / 12편이 위 표의 요일·시각에 본방 / 본방 회차가 1씩 오름 / 주말 몰아보기 회차가 그 주 본방과 이어짐 / 금 22:00 뮤직냥크 / 할로윈 21~24시 공포 편성
- [ ] 06시 막힘: 「창가에서」 새벽 재방을 빼면 05:10~07:00이 모자랄 수 있음 — 400일 편성 검사(빈틈·화면 조정 0)로 확인, 막히면 뉴스·날씨 등 새벽 조건으로 푼다
- [ ] 의도한 편성 변경이므로 회귀 기준을 `node tools/check_tv.mjs --write-baseline`으로 다시 뽑아 같이 커밋(사람 검수에서 확인)
- [ ] 방영 조건으로 안 되는 게 나오면 코드를 고치지 말고 질문으로(AGENTS.md 6장 "TV 프로그램": 데이터만으로)
- [ ] 이 지시서와 그림 지시서는 고치지 않는다(구현 메모는 커밋 메시지와 일꾼 요약에)

## 확인
- [ ] `node tools/check_tv.mjs` 통과 (위 기대값 포함)
- [ ] `python3 tools/build_meta.py --check` 통과
- [ ] `node tools/check_structure.mjs` 통과
- [ ] 편성 (사람): `?dev=1` → TV 미리보기 7일 보기에서 평일 07:30·08:00·10:00·16:00·16:30·17:00·17:30·21:00·22:00 칸이 위 표와 같고, 평일에 「(재)」 표시가 없는지
- [ ] 주말 (사람): 같은 7일 보기에서 토·일 몰아보기(드라마·어린이)가 그 주 본방 회차와 이어지고, 토·일 12:00에 「우리 집 털뭉치들」 본방이 있는지
- [ ] 화면 (사람): 미리보기에서 12편을 하나씩 띄워 평소 장면·사건·끝 장면·자막·고양이 반응, 방 안 작은 TV로 봐도 장르가 읽히는지
- [ ] 할로윈 (사람): 미리보기 명절 켜기 「할로윈」 → 21시 괴담 특집, 22시 공포 특집이 이어지는지

<!-- office:verify
- node tools/check_tv.mjs
- python3 tools/build_meta.py --check
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-03 지시서 작성(Claude, 회의). 주인 확인 뒤 `- office: ready`로 커밋(2026-11-03).
- 2026-11-03 고침: `tv-assets.json` 46장 등록 요구를 뺌 — git 무시 대상이라 작업 공간에서 할 수 없는 일이었음(#47 검수 M1 → 일꾼 "할 수 없음", 찾다가 `find /`로 디스크 전체를 뒤짐). 지시서를 쓴 Claude의 잘못.
- 2026-11-04 검수 1회차 M1(`tv-assets.json` 46장 등록): 주인이 (나) 범위 밖으로 정함. 구현은 `d8db11f` 그대로, 검사 세 가지 통과(일꾼 확인). 참고 줄의 체크박스를 메모로 바꿈 — 일꾼이 할 일로 읽었음.
