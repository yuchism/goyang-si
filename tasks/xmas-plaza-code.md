# 크리스마스 광장 코드: 광장 페이지 · 불꽃 · 약도 연결
- status: implemented
- mode: needs-review
- office: done (헤드쿼터 #45 · #46·#47은 주인 요청으로 하네스 밖에서 Claude가 구현, 손으로 끝냄 2026-11-15)
- brief: 그림 없음 (그림은 `tasks/xmas-plaza-art.md`·`tasks/xmas-plaza-day-art.md`)
- 출처: 회의 2026-11-15 — `XMAS_PLAZA_PLAN.md`

## 범위
- 플랜 `XMAS_PLAZA_PLAN.md` 2~5장의 1차 코드. 펠리컨 오르골(3-1)·캐릭터 연출·소리는 하지 않는다.
- **#36(밤 그림, `tasks/xmas-plaza-art.md`)이 `main`에 합쳐진 뒤 시작.** 낮 그림(`web/plaza/xmas-day.webp`)이 아직 없으면 밤 그림으로 대신 보여 주고, 들어오면 파일만 바뀐다.
- 셋은 순서대로: 페이지 → 불꽃 → 약도.

## 티켓: 광장 페이지
- 새 페이지 `/plaza/` (기지 `/base/`처럼 따로). 숫자·자리는 `web/plaza/scene.json` 한 곳.
- 겹(뒤 → 앞): 하늘(코드) → [불꽃 자리, 다음 티켓] → 광장 그림(하늘 투명) → 반짝임(코드).
- 반짝임: 트리 전구(자리 목록을 그림에서 찍음, 하나하나 따로 깜빡 + 가끔 아래→위 물결), 꼭대기 별빛, 전구 줄(그림의 줄을 따라 점), 눈 두 겹, 붕어빵 노점 김.
- 낮·밤(플랜 3-2): 방 `time.js`의 해 기준. 하늘색 낮 → 노을 → 남색. 해 질 녘 그림 겹쳐 넘어가기 + **점등식**(전구가 아래부터, 별 마지막, 이어 전구 줄). 낮엔 전구 꺼짐.
- 캐릭터 크기 자리만(플랜 2장): `charScale`(0.8 → 검수 H3로 **0.5**)·`depth`(y 두 지점의 배율). 미리보기 `?probe=1`에서 방 스프라이트 하나를 두 지점에 세워 크기 확인.
- 화면: 가로, 좁은 화면은 방·기지와 같은 방식. 나가기 버튼 → 거실(`/?from=plaza`).
- 동작 줄이기: 깜빡임·물결·넘어가기 없이 정지, 눈 없음.
- 글자는 기지처럼 페이지 안 STR(KO/EN). `sw.js`에 광장 칸. GoatCounter `plaza-visit`.
- 미리보기(dev에서만): `?night=1|0`, `?t=HH:MM`(해 질 녘 확인).

### 요구사항
- [x] `/plaza/` 페이지와 `scene.json`, 네 겹 그리기
- [x] 트리 전구 자리 목록(그림에서 찍음)과 깜빡임·물결·별빛, 전구 줄, 눈, 김
- [x] 낮·밤 하늘색, 해 질 녘·해 뜰 녘 넘어가기, 점등식
- [x] `charScale`·`depth`와 `?probe=1` 시험 캐릭터
- [x] 동작 줄이기, KO/EN, `sw.js`, GoatCounter, 거실로 나가기

### 확인
- [x] `node tools/check_structure.mjs`·`node tools/check_time.mjs` 통과
- [x] (사람) `/plaza/?night=1` 넓은 화면·폰: 풍경화 위에서 전구·별·눈이 예쁘게 반짝이는지
- [x] (사람) `?t=` 로 해 질 녘: 하늘이 노을 → 남색, 전구가 아래부터 켜지는지
- [x] (사람) `?probe=1`: 캐릭터가 방보다 살짝 작고 안쪽이 더 작아 넓어 보이는지

<!-- office:verify
- node tools/check_structure.mjs
- node tools/check_time.mjs
-->

## 티켓: 광장 불꽃
- 방 `fireworks.js`는 거실 모듈(고양이·창·세계)에 묶여 있어 광장에서 바로 못 쓴다. **그리기 핵심(모양·발사 계획·불꽃 그리기)만 거실 모듈에 기대지 않는 모듈로 떼어내** 방과 광장이 같이 쓴다. 방 불꽃은 **화면이 전과 같아야** 한다.
- 규칙(플랜 3-3): 밤에만. **그날 밤 첫 방문**에 몇 분(`초기값` 3분). 12/24·25 밤도 첫 방문에만, 크게(`초기값` 5분, 별·트리 모양 섞음 — 방 `xmasEve` 설정). 기록 키 `nightOf`, 기기에만. 낮에 열어 둔 채 밤이 되면 점등식 뒤 시작. 터질 때 하늘이 은은하게 밝아짐. 동작 줄이기면 없음.
- 미리보기: `?fw=1`(지금 바로), `?fw=eve`.

### 요구사항
- [x] 불꽃 그리기 핵심 떼어내기, 방은 그것을 쓰도록 (동작 그대로)
- [x] 광장 불꽃 겹(하늘과 광장 그림 사이), 첫 방문 규칙, 이브·성탄 크게, 하늘 밝아짐

### 확인
- [x] `node tools/check_structure.mjs`·`node tools/check_time.mjs` 통과
- [ ] (사람) 맥에서 `node tools/check_behave.mjs` 통과 (브라우저가 필요해 샌드박스 밖)
- [ ] (사람) 방의 토요일 밤·이브 불꽃이 전과 같은지 (미리보기 불꽃 켜기)
- [ ] (사람) `/plaza/?night=1` 처음 열면 불꽃이 트리·건물 뒤에서 몇 분, 다시 열면 없음, `?fw=eve`는 크게

<!-- office:verify
- node tools/check_structure.mjs
- node tools/check_time.mjs
-->

## 티켓: 약도 연결과 기간
- `calendar.js` 새 기간 `xmasPlaza`: **`11-15 ~ 12-31`** (회의 2026-11-15: 완성(배포)한 날이 곧 공개일 — 배포 전엔 아무도 못 봄).
- 약도 `door.map.shops`에 광장 한 줄 + **계절 그림** 갈래(낮/밤 대신 `xmasPlaza`면 `plaza-xmas`, 아니면 `plaza-lot`). 빈 터 A 바닥 가운데 (240, 400)에 **빈 터를 거의 채우게(약 0.58배)**. 이름표 「광장」/"Plaza", 공터일 땐 「광장 (공사 중)」이고 누를 수 없음.
- 기간 밖에 `/plaza/`로 바로 오면 거실로 돌려보냄. 미리보기 도구에 "크리스마스 광장 켜기".

### 요구사항
- [x] `xmasPlaza` 기간, 약도 계절 그림·크기·이름표·누르기
- [x] 기간 밖 `/plaza/` → 거실, 미리보기 켜기

### 확인
- [x] `node tools/check_structure.mjs`·`node tools/check_time.mjs` 통과
- [ ] (사람) 약도: 기간 안엔 트리 광장(누르면 광장), 밖엔 공터(안 눌림), 만화방 건물과 크기가 어울리는지

<!-- office:verify
- node tools/check_structure.mjs
- node tools/check_time.mjs
-->

## 메모
- 2026-11-15 지시서 작성(Claude, 회의). 주인 확인 뒤 `- office: ready`(2026-11-15).
- (사람) 항목은 사람 검수에서 주인이 본다(구현 중에 묻지 않고, 검수자도 막는 이유로 쓰지 않음).
- 2026-11-15 「광장 페이지」(#45) 검수 고침: H1 눈 고르게·`rnd` 섞기, H2 별빛, H3 `charScale` 0.8 → 0.5(플랜 2장도 a1451f1). H4(꼭대기 별 팅글팅글)는 잘못 알아들은 요청이라 취소(되돌림 46d7f25), H5 꼭대기 별 밝기 줄임(8efa359). 뒤이어 주인과 숫자 맞춤: 빛살 짧게·섬광 끔(12f1697·d8b13fa). (사람) 셋은 주인이 사람 검수로 통과.
- 2026-11-15 하늘 별·눈 일정·별똥별은 따로 `tasks/xmas-plaza-sky.md`(4f2dc16).
- 2026-11-15 「광장 불꽃」(#46) — 주인 요청으로 하네스 밖에서 Claude가 구현(dc0964c):
  - `web/js/fireworks.js`의 모양·한 발(shell·rhythm·escorts)·글자 점·그리기(sparkPos·drawShell·drawRise)를 그대로 `web/js/fw-core.js`의 `makeFw(Z)`로 옮김(FW → Z, ctx·창 자리는 인자). 방은 `makeFw(FW)` + 창 자리 감싸개. fireworks.js 584 → 332줄(구조 기준 낮춤).
  - 방 화면이 같은지: `visual_check` 방식(가짜 시계·고정 난수)으로 이브·생일·새해·고양이 얼굴 불꽃 7장을 바꾸기 전후로 찍어 **픽셀 차이 0**.
  - 광장: `scene.json` `fireworks`(방 창 안과 같은 모양의 좌표를 k 1.6배로), 그날 밤 첫 방문(`store` `plazaFw` = `nightOf`)에 점등식이 끝난 뒤 3분, 12/24·25 밤은 5분·별·트리 모양 35%. 공연 시간은 실제 시간. 터질 때 하늘 밝아짐(`skyFlash`). 소리는 없음(2차). `?fw=1|eve`.
  - (사람) `check_behave`는 이 작업 공간에서 못 돌림 — 맥에서.
- 2026-11-15 「약도 연결과 기간」(#47) — 하네스 밖에서 Claude가 구현(49cc026):
  - `calendar.js` `xmasPlaza` 11-15 ~ 12-31. `objects.json` `door.map.shops`에 계절 가게(period·on/off 그림·offName), box [92, 112, 297, 297](0.58배), 이름표 (240, 432). `frontdoor.js`가 기간 밖이면 그림·이름표만(안 눌림).
  - 미리보기는 새 버튼 대신 기존 「크리스마스」(holidayOverride christmas)로 켜짐. `/plaza/`는 기간 밖이면 거실로(dev는 그대로).
  - 헤드리스 크롬으로 약도를 열어 봄: 11/15 트리 광장 + 「광장」, 10/1 공터 + 「광장 (공사 중)」. 「광장 (공사 중)」 이름표가 옆 작은 집에 살짝 걸림.
  - `tools/check_scene.mjs`는 `web/scenes/.DS_Store` 때문에 돌다 멈춤(이번 변경 전에도 같음).
