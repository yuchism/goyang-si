# 방 안정화 작업 지시서 v2

> 상태: **진행 중.** ③-a 반영함(2026-10-19, 실제 GitHub 실행은 다음 push 때 확인), ① 구현함, ② 구현함, ③-b 수정본 준비(`pages.yml` 반영 대기), ④ 구현함. 남은 것: ③-b 반영, 첫 push의 Actions 확인, 노트북에서 긴 묶음 한 번. 회의(2026-10-17)에서 검토 제안을 받아들여 v2로 고침: 오류 뒤 되돌리기 범위(3-1), 놀이·사건 중단(`abort`), 칸막이 목록 보충, 시작 실패(`allSettled`), 행동 검사 세부, 순서(기존 검사 배포 자동화를 맨 앞으로). 10/19: 프로덕션 영향 검토로 ③-a 건너뛰기·③-b 처음엔 막지 않기 추가, ③-a 수정본 준비.
> 목표: **방 하나의 실수가 방 전체를 멈추지 않게, 그리고 그런 실수를 배포 전에 잡게.** 이번 작업에서는 보이는 동작(행동·확률·화면)을 바꾸지 않는다.
> 관련 문서: `CODE.md`, `TV_STABILITY_PLAN.md`(TV 오류 격리 `tvBreak` — 이번 작업의 본보기), `TIME_BASE_PLAN.md`(`check_time.mjs`), `CLOCK_PLAN.md`(시간 점프)

## 1. 왜 하나

2026-10-16 코드 점검에서 `duet.js` `boxHideS()`(쥐야쥐 상자 숨바꼭질)가 **상자가 처음 온 날(닫힌 상자, 9일에 하루)** 에 `S('box.check')`가 `null`이라 오류를 냈다.
오류 자체보다 결과가 문제였다: `frame()` 안에서 오류가 나면 맨 끝의 `requestAnimationFrame(frame)`까지 가지 못해 **새로 고침할 때까지 화면·시계가 통째로 멈춘다.**
켜 두고 멍하니 보는 사이트라 방문자는 멈춘 줄도 모르고, 그날 쥐야쥐와 놀기를 고르면 약 21% 확률로 걸리니 하루 켜 두면 거의 한 번은 걸린다.

버그는 같은 날 고쳤다(자리 셋 중 하나라도 없으면 `greetS()`로). 이 문서는 **같은 종류의 실수가 다시 생겨도** 방이 멈추지 않고, 배포 전에 걸리게 하는 일이다.

## 2. 지금 구조와 문제 (2026-10-17 코드 기준)

| # | 문제 | 지금 코드 |
|---|---|---|
| 1 | **오류 하나가 방 전체를 멈춘다.** TV만 `tvBreak`로 격리되어 있고, 나머지 매 장면 할 일과 그리기에는 칸막이가 없다 | `main.js` `frame()`: `tickTimers`·`jumpTick`·`scheduled`·`visitTick`·`mouseTick`·`duetTick`·`sunbeamTick`·`eventsTick`·`frameTick`·`cupTick`·`catBrain`·`tickActor`·`updateManduk`·`calmDown`·`playsTick`·`render()`·상태 줄. `requestAnimationFrame(frame)`이 맨 끝 |
| 2 | **행동(고양이·쥐야쥐의 뇌)은 검사 도구가 없다.** 시간·TV는 수십만 건을 비교하는데, 행동은 화면 점검 장면 몇 개뿐. 이번 버그도 여기서 나왔다 | `tools/visual_check.js`(정해진 장면만), `check_scene.mjs` |
| 3 | **사라지는 자리를 확인하지 않는다.** `objects.json`의 상태(`states`)가 `spots`를 덮거나, 장면에 그 물건이 아예 없으면(`S()`가 `null`) 자리가 없어지는데, 코드는 `S(...)[0]`을 바로 쓰기도 한다 | 상태로 사라지는 자리: `box`(closed: enter·check·inside), `cup`(floor: push). 지금은 쓰는 곳이 모두 확인함(`boxHideS`는 10/16에 고침). 확인 없이 쓰는 곳 예: `main.js` `EVENT.wait`의 `S('door.wait')[0]`(문이 없는 장면이면 오류). 이름을 조합하는 곳: `mouse.js` `S(o.id + '.hide')`·`S(k + '.out')`, `halloween.js` `S(id + '.ghost')` |
| 4 | **배포 때 도는 검사가 하나뿐이다.** `check_time`·`check_tv`는 "배포 전에 손으로" | `.github/workflows/pages.yml`: `build_meta.py --check`만. (두 검사는 리눅스 노드에서 각각 약 3초, 지금 통과 — 2026-10-17 확인) |
| 5 | **시작에 필요한 파일을 못 읽으면 멈추거나 빈 방.** `Promise.all`은 하나가 실패하면 바로 끝나 `finally(loadImages)`를 부른다. `objects.json` 실패 때 `loadMeta`가 아직 받는 중이면 그림 목록이 비어 `start()`가 불리지 않고, 이미 끝났으면 사물 없이 `start()`가 불린다 | `main.js` `Promise.all(...).catch(...).finally(loadImages)`, `scene.js` `loadScene`(실패하면 던짐), `assets.js` `loadImages`(0개면 끝나지 않음) |
| 6 | **걸어 둔 일 하나의 오류가 같은 순간의 다른 일을 지운다.** `tickTimers`는 때가 된 일을 목록에서 먼저 빼고 차례로 부르므로, 하나가 오류를 내면 나머지는 영영 안 불린다(예: `cat.rock = 0`, `cat.peeked = false`가 사라져 고양이가 굳음) | `world.js` `tickTimers` |

## 3. 할 일 ①: 오류 격리 (`main.js`) — 가장 중요

- **루프는 무조건 이어진다.** `frame()` 몸통을 `try … finally { requestAnimationFrame(frame) }`로 감싼다(부르는 순서는 지금과 같게). 어떤 오류가 나도 다음 장면은 돈다.
- **할 일마다 칸막이** `guard('이름', fn)`: 2장 1번 표의 모든 할 일. 걸어 둔 일(`tickTimers`)은 **일 하나하나**를 감싼다(2장 6번).
  - 오류가 나면 그 칸만 이번 장면을 건너뛴다.
  - 배우 행동 중의 오류면 3-1처럼 되돌린다.
  - 같은 오류는 콘솔에 한 번만(`tv.js` `logged`와 같은 방식). 오류 수는 `__goyang.errors`(이름별 건수와 첫 오류)로 꺼내 볼 수 있게 한다(4장 검사 도구가 센다). 미리보기(`?dev=1`)에서는 화면 구석에 "오류 n건" 표시.
  - 같은 칸이 계속 오류면(예: 10초 안에 5번) 1분 쉰다.
- **그리기도 같게.** `render()` 안의 사물 하나·놀이 층·사건 층·말풍선·자막을 칸마다 감싼다. 실패한 것만 안 그려진다. 칸마다 **항상** `ctx.save()` → 그리기 → `ctx.restore()`로 감싸 캔버스 설정(`globalAlpha`·`globalCompositeOperation`·변환)이 다음 칸으로 새지 않게 한다(오류가 날 때만이 아니라). 앞 칸의 설정에 기대는 곳이 있으면 화면 점검에서 드러난다.
- **놀이·사건 목록도 항목별로.** `plays.js`·`events.js` 목록을 도는 곳(`playsTick`·`eventsTick`·`playsLayers`…)에서 항목 하나의 오류가 다른 항목을 막지 않게. 실패한 항목은 3-1의 `abort()`로 멈춘다.
- **순서는 그대로.** 부르는 순서가 곧 확률을 뽑는 순서라(`CODE.md`), 감싸기만 하고 순서·횟수는 바꾸지 않는다. 칸막이는 난수를 쓰지 않는다.
- **확인:** 화면 점검 34장면이 픽셀 단위로 같아야 한다(`visual_check.js` + `compare.py`). 미리보기 도구에 "일부러 오류" 버튼(`dBoom`)을 두고 방이 계속 도는지 본다.

### 3-1. 오류 뒤 되돌리기 — 배우만이 아니라 같이 하던 것까지

이번 버그 같은 경우: 옛 `boxHideS`는 오류 전에 `mouse.state = 'duet'`을 걸었다. 고양이 `steps`·`cur`만 비우면 쥐야쥐는 'duet'으로 남고, `catBrain`이 다시는 둘이 놀기를 고르지 않는다(`mouse.state !== 'duet'` 조건). 방은 돌지만 쥐야쥐 놀이가 새로 고침 때까지 조용히 사라진다. 그래서:

- **배우 되돌리기는 `run(a, [], '')`로.** 이미 바닥이 아닌 자리(`SPOTS`: TV 위·TV 뒤·상자 안·쳇바퀴)에서 내려놓기, 점프, `act`, `typing`, 이름표를 정리한다. 새 함수 `resetActor(a)`에 묶는다.
- **쥐야쥐는 더:** `state`를 `''`로. 숨어 있던 중이면(`hidden`) 숨은 자리(`where`) 그대로 두고 다음 등장 규칙을 따른다(`mouse.js`).
- **둘이 같이 하던 행동이면 둘 다.** 오류 난 쪽이 둘이 놀기(인사·술래잡기·노려보기·상자 숨바꼭질·같이 자기) 중이었거나 쥐야쥐 `state`가 `duet`·`nap`이면 고양이·쥐야쥐를 함께 되돌린다.
- **놀이가 배우를 붙잡고 있으면 짝으로.** 놀이(쳇바퀴 안, 레이저 쫓기, 낚시, 실뭉치)에서 오류가 나면 그 놀이를 `abort()`하고 붙잡힌 배우도 되돌린다. 배우 쪽 오류인데 놀이가 그 배우를 붙잡고 있으면 그 놀이도 `abort()`.
- **`abort()` (놀이·사건에 새로):** "지금 하던 것을 조용히 끝내고 처음 상태로." 지금의 `reset(a, b)`는 시간 점프용(방 시각 a → b의 결과만 적용)이라 뜻이 다르다. `abort()`가 없는 항목은 `reset(지금, 지금)`으로 대신한다. 사건(`events.js`)도 같은 이름으로.
- 되돌린 뒤에는 다음 장면에 뇌가 새 행동을 고른다.

## 4. 할 일 ②: 행동 검사 도구 `tools/check_behave.mjs`

이번 버그를 잡은 방식(빨리 감기 + 무작위 조작)을 정식 도구로.

- **재현 가능하게:** 시계·`Math.random`·`setTimeout`·`requestAnimationFrame`을 고정(씨앗)한다. `visual_check.js`의 `INIT`과 같은 방식에 시간 점프(`__warp`, 화면 꺼짐 흉내)를 새로 더한다. 실패하면 씨앗과 시각을 출력해 그대로 다시 돌릴 수 있게.
- **시나리오:** 상자 없는 날 · 닫힌 상자 날 · 열린 상자 날 · 비 · 할로윈(10/31 밤) · 크리스마스 · `?birthday=` · 남반구(시드니)·북반구(서울) × ko·en.
  각각: 1분 = 하루(1440배)로 며칠 → 1분 = 1시간(60배)으로 몇 시간 → 실시간 + 무작위(미리보기 버튼·쓰다듬기·캔버스 누르기·화면 꺼짐 최대 14시간).
- **실패 조건:**
  - 오류 한 건이라도. 3장 칸막이가 잡은 것도 `__goyang.errors`로 세어 실패로 친다(숨기지 말고 고치게).
  - 루프 멈춤.
  - `BEHAVIOR`에 없는 이름표.
  - 배우가 걷는 바닥(`WALK`) 밖으로 나감. 단, 정상인 경우는 뺀다: 바닥이 아닌 자리(`inSpot`: TV 위·TV 뒤·상자 안·쳇바퀴), 점프 중(`jump`)·쳇바퀴 오르내리기(`hop`), 쥐야쥐가 숨은 동안(`hidden`·`peek`), 만득 씨가 들어오고 나가는 길.
  - 3-1이 끝난 뒤에도 쥐야쥐 `state`가 오래(예: 10분) 같은 값으로 남아 있음(되돌리기가 빠진 곳 찾기).
- **같이 넣는 정적 검사:** 코드에 나오는 `S('물건.자리')`가 **그 물건의 모든 상태**와 **그 물건이 없는 장면**에서 있는지 본다. 사라질 수 있는 자리는 목록으로 보여 주고, 그 자리를 쓰는 함수가 `null` 확인을 하는지 표시한다(이번 버그는 이것만으로 걸린다). 이름을 코드에서 조합하는 곳(`S(o.id + '.hide')`, `S(k + '.out')`, `S(id + '.ghost')`)은 글자 찾기로 못 잡으므로, 그 함수에 들어갈 수 있는 물건 목록으로 펼쳐 검사하거나 확인 목록에 따로 적는다.
- **그림:** 실제 그림이 없어도 되게 `meta.json` 크기로 대체 그림을 만든다(로직 검사용). 노드 + Playwright.
- 결과 한 줄 예: `✓ 닫힌 상자 날 (시드니·ko): 3일 빨리 감기 · 4시간 60배 · 무작위 40번 — 오류 0, 행동 312번(greet 41 · boxhide 0 · nap 77 …)`

## 5. 할 일 ③: 배포 전 검사 자동화 (`pages.yml`)

두 단계로 나눈다.

- **③-a (맨 먼저, 다른 일과 상관없음):** `actions/setup-node` 단계를 더하고, `build_meta.py --check` 다음에 `node tools/check_time.mjs`, `node tools/check_tv.mjs`. 하나라도 실패하면 배포를 멈춘다. 둘 다 약 3초.
  - **급한 수정용 건너뛰기:** 손으로 실행(`workflow_dispatch`)할 때 `skip_checks`를 켜면 두 검사를 건너뛴다(`build_meta.py --check`는 늘 돈다). push 배포는 늘 검사한다.
  - 노드는 22로 고정(검사를 돌려 본 버전).
  - 회귀 기준 `tools/tv_baseline.json.gz`·`tools/time_baseline.json.gz`가 git에 올라가 있어야 한다(없으면 첫 배포부터 실패).
- **③-b (②가 끝난 뒤):** `node tools/check_behave.mjs --quick`을 더한다. 저장소에 `package.json`이 없으므로 Playwright 설치 단계가 따로 필요하다(`package.json`에 `playwright` 버전 고정 + `npx playwright install --with-deps chromium`, 캐시). 배포용 짧은 묶음(`--quick`)과 손으로 돌리는 긴 묶음을 나눈다.
  - **처음 1~2주는 실패해도 배포는 진행**(`continue-on-error: true`)하며 흔들리는(가끔 실패하는) 검사가 없는지 본다. 괜찮으면 막는 쪽으로 바꾼다. 배포가 1~3분 느려진다.
- `CODE.md`의 tools 설명과 "배포 전" 안내를 고친다.

## 6. 할 일 ④: 시작 실패 안내 (`main.js`, `assets.js`) — 작은 일

- `Promise.all` → **`Promise.allSettled`**. 모두 끝난 뒤에 판단한다.
- 장면(`loadScene`)·`meta.json`(`loadMeta`) 중 하나라도 못 읽었으면 `start()`를 부르지 않고 짧은 안내: "방을 여는 데 실패했어요 · 다시 열기" (영어는 `i18n.js`). TV 표·창밖 불빛(`loadPrograms`·`loadWindows`)은 지금처럼 없어도 연다.
- `loadImages`는 0개여도 끝나게(바로 `start()` 또는 안내로).
- `start()` 자체의 오류도 안내로 이어지게.

## 7. 하지 않을 것

- 모듈 구조·순환 import 정리, TypeScript 도입: 지금 문제와 관계없고 바꾸는 범위만 커진다.
- 보이는 동작 변경: 확률·순서·화면은 그대로(화면 점검으로 확인).

## 8. 순서

1. 할 일 ③-a(`check_time`·`check_tv` 배포 자동화) — 바로 할 수 있고 다른 일과 상관없음
2. 할 일 ①(오류 격리 + 3-1 되돌리기 + `abort()`) → 화면 점검이 전과 같은지
3. 할 일 ②(`check_behave.mjs`) — ①이 오류를 숨기지 않고 실패로 세는지, 3-1 되돌리기 뒤 쥐야쥐 상태가 풀리는지도 여기서 확인
4. 할 일 ③-b(`check_behave --quick` 배포 자동화)
5. 할 일 ④(시작 실패 안내)

## 9. 이미 한 일

- **2026-10-19 ③-a (반영함):** `.github/workflows/pages.yml`에 `actions/setup-node@v6`(노드 22) + `check_time.mjs`·`check_tv.mjs` 단계, 손으로 실행할 때 `skip_checks` 선택지. 두 검사는 리눅스·노드 22·`TZ=UTC`(실행기 기본값)에서 통과 확인. 실제 GitHub 실행은 다음 push 때 확인

- **2026-10-16 `duet.js` `boxHideS()`:** 자리 `boxback.hide`·`box.check`·`boxback.out`을 먼저 구하고, 하나라도 없으면 `greetS()`로(쥐야쥐 `state = 'duet'`을 걸기 전에). 닫힌 상자 날엔 인사, 열린 상자 날엔 숨바꼭질이 전과 같이 끝까지 도는 것을 확인. `check_time.mjs` 통과, 10/19(닫힌 상자 날)부터 빨리 감기·무작위 조작 오류 0
- **2026-10-19 ① 오류 격리:** 새 파일 `web/js/guard.js`(칸막이)·`web/js/recover.js`(되돌리기). `main.js` 매 장면 `try … finally`, 할 일·그리기 칸마다 감쌈(순서·횟수 그대로), `world.js` 걸어 둔 일 하나씩, `plays.js`·`events.js` 항목마다. `laser.js`·`fish.js`에 `abort()`(쳇바퀴·실뭉치는 기존 `reset`). `?dev=1`로 연 페이지에서만 "오류 n건"·"일부러 오류" 줄(index.html에 두지 않음: 미리보기 줄이 늘면 화면 점검의 무대 크기가 바뀌므로).
  - 확인: 화면 점검 62장 모두 전과 같음. 쥐야쥐 `duet`을 건 채 고양이 행동 오류 → 다음 장면에 둘 다 풀리고 새 행동. "일부러 오류" 세 곳(고양이 행동·걸어 둔 일·그리기, 짝이 깨진 save 포함) 모두 잡힘. 쳇바퀴로 가는 중 오류 → 쳇바퀴도 끝. 같은 칸 5번째 오류에서 1분 쉼, 시계는 계속. `check_time`·`check_tv`·`check_scene` 통과
  - 알게 된 것: `visual_check.js`는 그림을 받는 속도에 따라 "한 장면 더 진행"이 들어가거나 빠져서, 바꾸지 않은 코드끼리도 몇 장이 다르게 나온다. 다르면 그 장면만 다시 찍어 확인한다. ②에서 그림을 다 받은 뒤 시작하도록 고친다
- **2026-10-19 ② 행동 검사 `tools/check_behave.mjs`:** 4장대로. 서버를 직접 띄우고 없는 그림은 meta.json 크기 대체 그림. 바닥 밖에서 뺀 것: 바닥이 아닌 자리·점프·숨은 쥐야쥐·숨는 곳 드나드는 자리(쥐구멍 입구는 바닥보다 4px 위)·쳇바퀴를 밀고 화면 밖에서 들어오는 고양이. 쥐야쥐 state는 배우 시간(dt)으로 10분(빨리 감기에서도 행동 길이는 배속 bf만큼만 빨라지므로). 정적 검사의 괜찮은 곳 `SAFE` 5곳(창 보기·컵 치기·SPOTS 상자 나오기·베란다/계절 사건의 needs)
  - 옛 상자 숨바꼭질 코드를 다시 넣으면 정적 검사와 실제 돌리기("강고양이 씨 뇌" 오류) 둘 다 실패로 잡는다
  - 찾아서 고친 것: `behave.js` 이름표 `leaves`·`firstsnow`·`geese`가 표에 없었음 → 지금 동작 그대로(표에 없을 때 쓰던 '' 줄 값)로 적음. 창밖 보기(`window`)처럼 TV에 반응하지 않게 할지는 따로 정한다. `cat.js` `boxB`가 `box.enter`만 확인 → `box.inside`도 (닫힌 상자 날엔 둘 다 없어 지금은 문제없었음)
  - `visual_check.js`: 찍기 전에 늘 한 장면 더 그린다(위 ① 항목의 "알게 된 것"). 같은 코드 두 번 62장 같음, 오늘 코드와 고치기 전 코드 62장 같음
  - 돌린 것: 짧은 묶음 9개 통과, 긴 묶음 서울·한국어 9개 통과, 시드니·영어 4개 통과. 긴 묶음 전체 36개는 노트북에서 한 번 돌려 볼 것(1시간 가까이)
- **2026-10-19 ④ 시작 실패 안내:** `main.js` `Promise.all` → `Promise.allSettled`(모두 끝난 뒤 판단). 장면·`meta.json`을 못 읽었거나 `start()`에서 오류면 `startFailed()`: "방을 여는 데 실패했어요 · 다시 열기"(영어 "Couldn't open the room · Try again", `i18n.js` `startFail`·`startRetry`). TV 표·창밖 불빛은 없어도 연다. `assets.js` `loadImages`는 받을 그림이 0개여도 `start()`.
  - 확인: 정상 → 방 열림 / `objects.json`·`stage.json`·`r/meta.json` 404 → 안내 / `apt_windows.json`·`programs.json`·`schedule.json` 404 → 방 열림. 화면 점검 62장 같음, `check_time`·`check_tv`·`check_scene`·`check_behave --quick` 통과
  - 같이 한 것: 루트 `package.json`(③-b)이 생기자 노드 검사에서 "모듈 형식 미지정" 경고가 나서 `web/package.json`(`"type": "module"` 한 줄)을 더함
