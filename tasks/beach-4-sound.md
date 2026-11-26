# 미스테리 해변 4: 소리
- status: in-progress (원본 소리 받기를 기다림)
- mode: needs-review
- 출처: 회의 2026-11-26 — `BEACH_PLAN.md` 6장

## 결정
- 실제 녹음만(합성음 X), CC0 우선(Openverse·Pixabay).
- 파도(계속), 먼 바닷바람, 해넘이 때 먼 갈매기(드물게), 병이 모래에 닿는 '톡', 쪽지 펼치는 종이 소리.
- 켬·끔 기록은 방·캠핑장과 같이.

## 원본 (모두 CC0, 2026-11-26 Claude가 라이선스 확인) — 주인이 받아 `assets/sound/beach/`에 이름 그대로
| 쓰는 곳 | Freesound | 만든이 |
|---|---|---|
| 파도(계속) | [Gentle Waves - Quiet Beach](https://freesound.org/s/376795) | amholma |
| 바닷바람(계속) | [Looping Gentle Wind Ambience on an Open Desert Plain](https://freesound.org/s/697217) | dhallcomposer |
| 먼 갈매기 | [SeaGulls.wav](https://freesound.org/people/ahill86/sounds/207130/) | ahill86 |
| 병 '톡' | [Glass Bottles rattle and chink](https://freesound.org/s/259671) | LampEight |
| 병이 모래를 스침 | [sand slide on glass FF677](https://freesound.org/s/199396) | martinimeniscus |
| 쪽지 종이 | [rustling paper.wav](https://freesound.org/s/181774) | keweldog |

## 요구사항
- [ ] 소리 파일 `web/beach/sound/`, 작게(ogg/m4a)
- [x] 해 진행에 따라 바람·갈매기 세기
- [ ] `ASSET_LICENSE.md`에 출처

## 확인
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 이어폰으로 오래 들어도 편한지

<!-- office:verify
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-26 Claude 씀.
- 2026-11-26 Claude: 코드 먼저 — `web/beach/sound.js`(파도·바닷바람 고리, 밤일수록 바람 조금 크게, 갈매기는 해넘이 때 갈매기가 보일 때만 7~18초마다 좌우 아무 쪽, 병이 멈출 때 '톡', 쪽지 펼칠 때 종이; 오른쪽 위 켬/끔 버튼), `tools/make_beach_sounds.py`(원본 → sound/*.mp3: 고리 교차 페이드, 갈매기는 센 울음 셋을 낮은 통과 + 짧은 메아리로 멀게, 병은 모래 스침 + 둥글게 깎은 유리 소리). 원본이 없으면 소리 없이 그대로 돎. 원본을 받으면 스크립트를 돌리고 ASSET_LICENSE.md에 적음.
