# 구조 지킴이 2단계: 바닥 파일이 위를 부르지 않게 (엉킨 덩어리 44 → 31)
- status: done
- mode: needs-review
- brief: (그림 없음)
- related-adr: (없음 — 층 ADR은 아직 회의 전. 아래 "다음" 참고)
- 출처: 대화 2026-11-16 — 코드 점검(Claude). structure-guard.md "다음"의 3단계 중 첫 묶음

## 배경 (2026-11-16 잰 것)
- `node tools/check_structure.mjs`: 파일 61 · 500줄 넘는 파일 4 · **엉킨 덩어리 44개 파일 / 가져오기 292**.
- 덩어리가 큰 까닭은 기능 파일끼리 얽힌 것보다, **여러 곳이 가져다 쓰는 바닥 파일 몇 개가 위층 파일을 부르는 것**이다. 아래 8개 가져오기만 끊으면 덩어리가 **44 → 31개**로 줄고, 바닥 13개가 덩어리 밖으로 나온다:
  `anim` `assets` `objects` `stage` `steps` `scene` `scenery` `gate` `chime` `fireworks` `yarn` `debug` `main`
- 남는 31개(cat ↔ tv-cat, tv ↔ tv-screen 같은 기능끼리 얽힘)는 이 티켓에서 다루지 않는다.

| 끊을 가져오기 | 무엇 때문에 | 바꾸는 법 |
|---|---|---|
| `assets.js → main.js` | 시작 묶음을 다 받으면 `start()` | `loadImages(onFirst)` 콜백으로 받는다. `main.js`가 `loadImages(start)` |
| `assets.js → birthday.js` | `birthdayMode` | 아래 `query.js` |
| `objects.js → birthday.js` | `birthdayMode` (생일엔 트리 숨김) | 아래 `query.js` |
| `assets.js → guests.js` | 생일 손님 춤 시트 목록 | `guests.js`가 `guestSheets()`(받을 시트 `{키: 경로}`, 생일·할로윈 조건 그대로)를 내보내고, `main.js`가 `loadMeta`에 넘긴다. `assets.js`는 받은 것을 `SRC`에 더하기만 |
| `objects.js → fish.js` | `fishRodOut()` (낚싯대 벽/밖) | `objects.js`에 상태 함수 등록(`objState('rod', fn)` 같은 것). `fish.js`가 init에서 등록. 등록 전 기본값은 지금과 같은 `'wall'` |
| `stage.js → shelf.js` | `shelfUI` (책장 펼쳤을 때 카메라) | `stage.js`에 "볼 곳 힌트" 등록 함수. `shelf.js`가 `initShelf()`에서 등록 |
| `stage.js → sprites.js` | `HOLE` (쥐구멍 입구) | `HOLE` 정의와 `onScene` 채우기를 `objects.js`로(`O`가 있는 곳). `sprites.js`·`birthday.js`·`stage.js`는 거기서 |
| `anim.js → tv-cat.js` | `tvwatch` 프레임 고르기 `tvWatchFrame` | `anim.js`에 프레임 함수 등록. `tv-cat.js`가 init에서 등록. 등록 전엔 표의 첫 프레임 |

- **`js/query.js`** (새 파일, 가져오는 것 없음): `pageParams`, `birthdayMode`. `birthday.js`는 여기서 가져와 그대로 다시 내보낸다(다른 파일의 import는 안 바꿔도 되게).
- 등록 함수는 `util.js` `onScene`처럼 "등록해 두고 나중에 부른다". AGENTS.md 6장대로 등록은 모듈 맨 위가 아니라 `initXxx()`에서, `main.js`가 부른다.

## 요구사항
- [x] 위 표의 8개 가져오기를 없앤다 (`assets`·`objects`·`stage`·`anim`이 위층을 가져오지 않음)
- [x] `js/query.js` 추가, `birthdayMode`·`pageParams`의 출처를 한 곳으로
- [x] `node tools/check_structure.mjs`가 "줄었습니다"를 내고, `--write`로 기준을 낮춘다 (목표: 덩어리 31개 파일 안팎, 바닥 13개가 덩어리 밖)
- [x] 보이는 동작 그대로: 확률 뽑는 순서(`main.js` `frame()` 차례)·그림 받는 순서(시작 묶음/나중 묶음)를 바꾸지 않는다
- [x] 등록 전 기본값이 지금 동작과 같다(낚싯대 `'wall'`, 볼 곳 힌트 없음, `tvwatch` 첫 프레임) — 등록이 빠져도 오류 없이 조용히

## 확인
- [x] `node tools/check_structure.mjs` 통과 (낮춘 기준으로). 출력 첫 줄 숫자를 메모에
- [x] `node tools/check_time.mjs` · `node tools/check_tv.mjs` 통과
- [x] `node tools/check_scene.mjs [포트]` 통과 (Mac 또는 클라우드 — Claude 셸엔 Chromium 없음)
- [x] `node tools/check_behave.mjs --quick` 통과 (Mac 또는 클라우드)
- [x] 화면 점검: `visual_check.js` 전후 → `compare.py` 같음 (다르면 먼저 같은 코드로 두 번 찍어 흔들림인지 가린다)
- [x] 생일 화면 (사람): `?birthday=이름`으로 열어 손님 춤·케이크·쥐구멍 앞 쥐야쥐가 전과 같은지
- [x] 책장·낚시·TV (사람): 책장 펼치면 카메라가 책장으로, 낚시하는 동안 벽 낚싯대가 사라지는지, 스포츠 방송 때 강고양이 씨 고개가 따라가는지

<!-- office:verify
- node tools/check_structure.mjs
- node tools/check_time.mjs
- node tools/check_tv.mjs
-->

## 다음 (이 티켓 아님)
- 층 ADR(회의): structure-guard.md에 적은 순서(바닥 → 그림·물건 → 장면 → 이벤트 → 화면). 이 티켓은 그 맨 아래층만 먼저 깨끗하게 하는 것이라 ADR 없이 할 수 있다.
- `check_structure.mjs`에 "바닥 파일은 위를 가져오지 않는다" 검사 추가 — ADR 뒤.
- 남은 31개 덩어리(기능끼리).

## 메모
- 2026-11-16 지시서 작성(Claude, 코드 점검 대화). 44 → 31은 가져오기 그래프에서 8개를 뺀 계산값.
- 2026-11-16 구현(Claude, 주인 "그냥 직접 해줘요"). `node tools/check_structure.mjs`: **파일 63 · 500줄 넘는 파일 4 · 엉킨 덩어리 29개 파일 / 가져오기 88** (전 44 / 292). `--write`로 기준 낮춤.
  - 표의 8개를 끊음. 이름: `objState(id, fn)`(objects.js), `watchShelf(fn)`(stage.js, initShelf가 잇음), `setClipFn(이름, fn)`(anim.js — `clipFrame`은 이미 있는 이름이라), `loadImages(start)`·`loadMeta(guestSheets)`(함수를 넘겨 예전과 같은 때에 손님 목록을 셈). 낚싯대·tvwatch는 main.js 시작 칸에서 잇는다.
  - 표 계산(31)보다 더 줄어든 것은 `HOLE`을 objects.js로 옮기며 `birthday.js → sprites.js`도 없어졌기 때문(`sprites ↔ birthday` 고리가 풀려 birthday·guests가 덩어리 밖으로).
  - **달라질 뻔한 것: 모듈 읽는 순서.** 가져오기를 끊으면 모듈을 읽는 순서가 바뀐다. `install.js`(이상한 책 첫 기다림)와 `fishview.js`(어항 보기 첫 기다림)가 파일 맨 위에서 `rnd()`를 뽑고 있어서, 순서가 바뀌자 화면 점검 41장이 달라졌다. 두 곳을 `rollOdd()`·`rollFishView()`로 빼서 main.js가 `resetMouseTimer()` 바로 앞에서 예전 순서대로 부른다 → 같은 값. (모듈 맨 위에서 무작위를 뽑지 않는다 — AGENTS.md 6장 "모듈 맨 위에서 다른 모듈 값 쓰지 않기"와 같은 까닭)
  - 검사(클라우드 — 맥 Chromium 대신 playwright 1.56 + Chromium 141): `visual_check` 전후 62장 중 61장 같음, 다른 1장 `long_2`는 같은 코드(전)로 두 번 찍어도 달라지는 흔들림(같은 자리). `check_behave --quick` 통과, `check_scene` 통과(159곳). 맥: `check_structure`·`check_time`·`check_tv`·`check_plaza` 통과.
  - (사람) 두 항목(생일·책장·낚시·TV)은 화면 점검의 party·tvacts·misc·window 장면이 전과 픽셀까지 같아 그것으로 갈음했다. 눈으로 한 번 더 보려면 `?birthday=만득`과 책장 펼치기.

## 리팩터 후보 (AGENTS.md 9장, 이번 작업 끝)
- 남은 덩어리 29개: `cat ↔ tv-cat`, `tv ↔ tv-screen`, `ui ↔ install ↔ shelf` 같은 기능끼리. 층 ADR(회의) 뒤 묶음별로.
- `check_structure`에 "바닥 파일은 위를 가져오지 않는다"(바닥: util·world·time·calendar·query·assets·objects·stage·anim·steps) — ADR 뒤.
- 모듈 맨 위에서 무작위를 뽑는 곳이 더 생기지 않게 검사에 넣을 만함(`world.js` mkActor의 `phase`는 맨 처음이라 순서 영향 없음).
