# 광장 코드 정리

> 상태: **명세 (2026-11-16).** R1~R5 끝(2026-11-16). 크리스마스 광장 → 사계절 광장을 하루에 빠르게 붙이면서 생긴 버그·복잡함·남은 것. 기능은 바꾸지 않는다(화면이 그대로인지 `tools/check_plaza.mjs`와 화면 비교로 확인).

## 1. 버그 (먼저)

- **R1. 땅 위 엘프 칸 번호 — 끝 (2026-11-16):** `web/plaza/elfrun.js`가 그림 칸을 한 칸씩 당겨 썼음(두리번 → 점프 그림, 미끄덩 → 내려다보기 그림 …). 그림 순서(`assets/briefs/XMAS_PLAZA_ELF_ART.md`): ⑤ 점프 · ⑥ 내려다보기 · ⑦ 미끄덩 · ⑧ 엉덩방아. 칸 번호를 `roofs.js` `ELF_FRAMES` 한 곳에 두고 둘이 같이 씀.

## 2. 소품 도구 (`tools/`)

- **R2. 차이 뽑기 걷어내기 — 끝:** 소품은 이제 전부 주인이 다시 받은 그림(`assets/plaza/props/*-source-v1.png`). `make_plaza_props.py`는 "받은 그림 → 참고 상자 자리에 맞춰 자르기 → `scene.json` 자리 출력"만 남긴다. 전구 줄을 옛 방식으로 덮어쓰는 문제가 함께 없어짐(지금은 `make_plaza_wires.py`를 꼭 뒤에 다시 돌려야 함).
- **R3. 참고 상자 한 곳 — 끝:** `tools/plaza_props.json`(상자·바로잡기 shift) — `make_plaza_props.py`(scene.json at도 씀)·`make_plaza_prop_refs.py`(참고 그림 자르기, 새로)·`make_plaza_rink.py`가 같이 읽음. 결과 그림은 전과 픽셀까지 같음. 참고 그림 자르기(`assets/plaza/prop-ref/`)와 소품 자리 맞추기가 같은 상자(REF)를 쓰게 — 지금은 스크립트마다 숫자를 따로 적음(`make_plaza_rink.py`의 REF 포함).

## 3. 광장 그리기 (`web/plaza/plaza.js`)

- **R4. 그리기 겹 등록 — 끝:** `plaza.js` `LAYERS`(겹마다 `{ y(), on(ctx)?, update?, always?, draw }`), `frame()`은 켜진 겹을 y로 세워 손님과 섞어 그리기만. `frame()` 안에서 소품·오르골·강고양이 씨·금붕생이·스케이트·엘프·쥐야쥐를 그때그때 목록에 넣고 예외(트리 전구, 도는 회전목마, 눈사람 있을 때 쥐야쥐)를 섞어 둔 것을 정리. 모듈마다 `{ y, on(ctx), update(t, dt, ctx), draw(g, t, ctx) }`를 내고 `plaza.js`는 등록된 겹을 y로 세워 손님과 섞어 그리기만. 새 캐릭터는 등록 한 줄.
- **R5. 공용 도우미 — 끝:** `web/plaza/plaza-kit.js`(`depthOf`·`frameMeta`·`tintAtop`). 밤 그늘(작은 캔버스에 칠하기 — 손님·오르골·회전목마), 깊이 배율(`depthAt`), 방 프레임 읽기(`f/meta.json` — 강고양이 씨·쥐야쥐·시험 캐릭터)를 `plaza-kit.js` 하나로.

## 4. 크기 기준

- **R6. 크기 표 하나:** 손님은 생일 그림 틀(`char.charScale` 0.7), 강고양이 씨·쥐야쥐는 방 프레임(`cat.scale`·`peek.scale`), 스케이트는 손님 기준, 펠리컨·금붕생이·엘프는 각자 배율. `scene.json`에 "누가 어떤 기준으로 몇 배"를 한 표로 모으고 설명을 붙임 — 다음 크기 조율 때 숫자 하나씩만.

## 5. 안 쓰는 것 걷어내기

- **R7.** 화면에 안 쓰는데 배포되는 그림: `web/plaza/xmas-day·night.webp`(도구 입력은 `assets/`의 원본으로), 공사 중 약도 `web/r/map/plaza-lot.webp`와 이름표 `mapPlazaLot`. 임시 오르골 상자 그리기(`musicbox.js` 대체 코드). 예전 도구 `cut_plaza_sky.py`·`make_plaza_day.py`(사계절 배경 도구로 바뀜). 지우기 전 주인 확인.

## 6. 문서

- **R8.** `XMAS_PLAZA_PLAN.md`(크리스마스 행사)와 `PLAZA_SEASONS_PLAN.md`(광장 틀·계절)의 몫을 나누고, 겹치는 것(손님 크기, 자리, 기간)은 한쪽에만 두고 다른 쪽은 가리킴.

## 7. 순서

R1 → R2·R3 → R4·R5 → R6 → R7 → R8. 단계마다 화면이 그대로인지 확인하고 커밋.
