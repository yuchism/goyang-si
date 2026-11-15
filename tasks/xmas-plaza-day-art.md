# 크리스마스 광장 그림 2: 광장 풍경화 낮
- status: brief
- mode: needs-review
- office: ready
- brief: assets/briefs/XMAS_PLAZA_ART.md 6장
- assets: assets/plaza/xmas-day-source-v1.png (git 무시) · web/plaza/xmas-day.webp
- 출처: 회의 2026-11-15 크리스마스 광장 낮·밤 — `XMAS_PLAZA_PLAN.md` 3-2

## 범위
- **그림만.** 광장 페이지·낮밤 넘어가기·점등식·불꽃 코드는 다음 티켓.
- **`tasks/xmas-plaza-art.md`(#36, 밤 그림)이 `main`에 합쳐진 뒤에 시작한다** — 하늘을 잘라낸 `web/plaza/xmas-night.webp`가 이 그림의 기준이다.
- 낮 광장 1장: 밤 그림을 복사해 **빛만 낮으로** 바꾼다(창 불 끔, 맑은 겨울 낮 색). 자리·크기·외곽선은 그대로, 하늘은 투명. 자세한 것은 지시서 6장.
- 그림 속 글자 없음(AGENTS.md 6장).

## 요구사항
- [ ] 밤 그림(`web/plaza/xmas-night.webp`)을 기준으로 그림 일꾼에게 낮 그림 요청 → 들어오면 밤 그림과 대조(어긋난 자리·사라지거나 생긴 것 없음, 창 불 꺼짐, 하늘 투명), 다시 그릴 것만 다시
- [ ] 받은 그림의 하늘이 투명이 아니면 밤 그림의 하늘 자리(알파)를 그대로 써서 투명으로 맞춤 — 어떻게 했는지 메모에
- [ ] 원본 `assets/plaza/`에, 웹 `web/plaza/xmas-day.webp`(1561×989, 알파 있음)
- [ ] 밤 그림과 겹쳐 깜빡이는 비교 그림을 검수 폴더에(`_daynight.gif` 또는 나란히 놓은 png)

## 확인
- [ ] `test -f`로 웹 그림
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 비교 그림에서 낮·밤을 번갈아 봐도 트리·건물·오브젝트가 움찔하지 않는지, 낮이 맑은 겨울 낮으로 보이는지

<!-- office:verify
- test -f web/plaza/xmas-day.webp
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-15 지시서 작성(Claude, 회의). 주인 확인 뒤 `- office: ready`(2026-11-15).
- (사람) 항목은 사람 검수에서 주인이 본다(구현 중에 묻지 않고, 검수자도 막는 이유로 쓰지 않음).
