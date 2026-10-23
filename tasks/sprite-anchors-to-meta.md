# 그림 안 기준점을 그림 정보(meta.json)로 옮기기
- status: brief
- mode: needs-review
- brief: (그림 없음)
- assets: (없음)
- related-adr: 0011 (스프라이트 원칙)
- 출처: docs/plans/SCENE_PLAN.md 8장 ("나중에 f/meta.json 쪽으로 옮길지 따로 생각한다")
- 종류: 리팩터 (AGENTS.md 9장 — 실행은 승인 후)

## 지금
그림에 딸린 비율·좌표가 코드 곳곳에 숫자로 있다. 그림을 다시 그리면 코드를 찾아 고쳐야 한다.
- `sprites.js` `TV_HEAD` (TV 그림 머리 위치)
- `fish.js` `ROD_TIP` (낚싯대 끝), `BOWL` (어항 물높이 등)
- `wheel.js` `G` (쳇바퀴 중심·반지름)
- `draw.js` `SHELF_BOARD` (책장 윗판 줄)
- `cat.js` `PAW_TYPE`
- `birthday.js` 케이크 촛불·춤 시트 칸, `install.js` 기대는 책 그림 치수

## 요구사항
- [ ] 그림마다 기준점을 `f/meta.json`·`r/meta.json`(`tools/build_meta.py`가 만드는 곳)에 둘 형식 제안 — 사람 확인 후 진행
- [ ] `build_meta.py`가 기준점을 지우지 않고 유지(또는 별도 파일에서 합침). `--check`가 빠진 기준점을 알려 준다
- [ ] 코드의 숫자 표를 meta 값으로 바꾼다. 값은 그대로(보이는 동작 변화 없음)
- [ ] 회귀: `visual_check` 전후 같음, `check_behave --quick` 통과

## 메모
