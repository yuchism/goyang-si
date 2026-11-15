# 크리스마스 광장 그림 2: 광장 풍경화 낮
- status: implemented
- mode: needs-review
- office: done (헤드쿼터 #43, 2026-11-15)
- brief: assets/briefs/XMAS_PLAZA_ART.md 9장
- assets: assets/plaza/xmas-day-source-v1.png (git 무시) · web/plaza/xmas-day.webp
- 출처: 회의 2026-11-15 크리스마스 광장 낮·밤 — `XMAS_PLAZA_PLAN.md` 3-2

## 범위
- **그림만.** 광장 페이지·낮밤 넘어가기·점등식·불꽃 코드는 다음 티켓.
- **`tasks/xmas-plaza-art.md`(#36, 밤 그림)이 `main`에 합쳐진 뒤에 시작한다** — 하늘을 잘라낸 `web/plaza/xmas-night.webp`가 이 그림의 기준이다.
- 낮 광장 1장: 밤 그림을 복사해 **빛만 낮으로** 바꾼다(창 불 끔, 맑은 겨울 낮 색). 자리·크기·외곽선은 그대로, 하늘은 투명. 자세한 것은 지시서 9장.
- 그림 속 글자 없음(AGENTS.md 6장).

## 요구사항
- [x] 밤 그림(`web/plaza/xmas-night.webp`)을 기준으로 그림 일꾼에게 낮 그림 요청 → 들어오면 밤 그림과 대조(어긋난 자리·사라지거나 생긴 것 없음, 창 불 꺼짐, 하늘 투명), 다시 그릴 것만 다시
- [x] 받은 그림의 하늘이 투명이 아니면 밤 그림의 하늘 자리(알파)를 그대로 써서 투명으로 맞춤 — 어떻게 했는지 메모에
- [x] 원본 `assets/plaza/`에, 웹 `web/plaza/xmas-day.webp`(1561×989, 알파 있음)
- [x] 밤 그림과 겹쳐 깜빡이는 비교 그림을 검수 폴더에(`_daynight.gif` 또는 나란히 놓은 png)

## 확인
- [x] `test -f`로 웹 그림
- [x] `node tools/check_structure.mjs` 통과
- [ ] (사람) 비교 그림에서 낮·밤을 번갈아 봐도 트리·건물·오브젝트가 움찔하지 않는지, 낮이 맑은 겨울 낮으로 보이는지

<!-- office:verify
- test -f web/plaza/xmas-day.webp
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-15 지시서 작성(Claude, 회의). 주인 확인 뒤 `- office: ready`(2026-11-15).
- (사람) 항목은 사람 검수에서 주인이 본다(구현 중에 묻지 않고, 검수자도 막는 이유로 쓰지 않음).
- 2026-11-15 구현 시작(Claude): 지시서 9장대로 그림 일꾼에게 낮 그림 요청 — 밤 그림 `web/plaza/xmas-night.webp`를 본으로 빛만 낮으로, 원본 `assets/plaza/xmas-day-source-v1.png`.
- 2026-11-15 그림 들어옴·다듬음(Claude): 원본 `assets/plaza/xmas-day-source-v1.png`(1575×998, 밤과 같은 비율 1.578, 하늘은 이미 투명) → `tools/make_plaza_day.py`로 `web/plaza/xmas-day.webp`(1561×989, 알파, `WEBP quality=86 method=6`).
  - 크기: 알파를 곱한 채(RGBa) `LANCZOS`로 1561×989로 줄임(자르기 없음). 밤 그림과 먹색 외곽선 겹침을 ±8px로 밀어 보니 (0,0)이 가장 잘 맞음 — 옮기지 않음.
  - 하늘: 원본 하늘도 투명했지만 윤곽이 밤과 약 0.4% 달라서 **알파는 밤 그림 것을 그대로 씀**(두 장 알파가 바이트까지 같음).
  - 가장자리: 낮 원본 알파 250 미만인 곳(전선·지붕·트리 가장자리의 옅은 색 잔여, 밤엔 있고 낮엔 빈 곳) 약 2.4만 px는 둘레의 불투명한 낮 색으로 채운 뒤 밤 알파를 씌움. 남색·하늘색 바탕에 겹쳐 밝은 테두리 없음 확인.
  - 비교 그림: `python3 tools/make_plaza_day.py --gif assets/plaza/_daynight.gif` — 같은 하늘색 바탕에 낮·밤 0.7초씩 번갈아(원본 폴더라 git 무시, 커밋 안 함). 전선은 낮 원본에서 1px쯤 위아래로 다르게 그려진 곳이 있으나 윤곽은 밤 알파라 같음.
- 2026-11-15 검수 지적(M1) 반영(Claude): 끝낸 요구사항 4개·자동 확인 2개 체크. (사람) 항목은 주인 검수에 남김.
- 2026-11-15 검수 지적(H1) 반영(Claude): 전구 줄 3가닥이 낮 그림에서 검은 바탕에 흰 조각이 섞인 끊긴 선이던 것을 고침 — `tools/make_plaza_day.py`의 `copy_wires`: 밤 알파에서 굵은 덩어리(11px 열기)를 빼고 남은 가는 선 중 300px 이상 이어진 조각을 전선으로 보고, 거기서 트리 쪽으로 12px까지 밤 색이 회색인 곳까지 넓혀 밤 그림 색을 그대로 복사(약 2.1만 px). 낮·밤이 같은 회색 줄. 트리에 감긴 줄(트리 안)은 낮 색 그대로. `_daynight.gif` 다시 만듦.
