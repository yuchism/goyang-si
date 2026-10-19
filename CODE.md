# 고양.시 코드 구조

> 2026-10-12 리팩토링. 한 파일(`web/index.html`, 152KB)에 있던 HTML·CSS·JS·데이터를 나눴다.
> 동작은 바꾸지 않았다. 리팩토링 전후 화면을 34장면에서 찍어 픽셀 단위로 같은 것을 확인했다(아래 "화면 점검").

## 폴더

```
web/                      ← GitHub Pages로 배포되는 폴더 (이 안만 사이트에 올라간다)
  index.html              ← 화면 뼈대(HTML)만
  manifest.webmanifest    ← 홈 화면 앱 정보 (이름 Kitty Kang, 아이콘, 색). MOBILE_PLAN.md 4-1
  sw.js                   ← 오프라인 캐시 (코드는 네트워크 먼저, 그림은 캐시 먼저). 배포 때 __VERSION__이 커밋 해시로 바뀐다. MOBILE_PLAN.md 4-2
  icon-*.png, apple-touch-icon.png, favicon* ← assets/icons/의 1024 원본에서 만든 아이콘
  style.css               ← 스타일
  scenes/room/            ← 장면 하나 = 폴더 하나 (SCENE_PLAN.md). 지금은 방(room) 하나
    window.json           ← 창 (SCENE_PLAN.md 4장): 자리 rect(방 좌표)와 창 안 좌표의 하늘 띠·해·달 자리 skySpot·하늘 색 skyGradient·구름·풍경(지평선, 산 자리 mountains)·난간·커튼·나비, 햇빛 조각 길(방 좌표). 없으면 창 없는 장면
    stage.json            ← 무대 숫자: 크기·바닥선·배경 원본 폭(bgWidth, r/meta.json bg와 같아야 함)·깊이·걷는 바닥(walk)·좁은 화면 폭·카메라 자리·방 자체 밝기(light.base: 바깥 빛이 안 들어올 때 방 어둠)
    objects.json          ← 방의 사물 (위치·상태·자리·소켓). 사람이 고치는 곳. OBJECTS.md 참고
  f/meta.json             ← 캐릭터 프레임 크기와 발 기준점  [폭, 높이, 기준점 x, y, (크기 보정)]  5번째 값은 그 그림만 키우거나 줄일 때 (예: 새 걷기 그림 1.1)
  r/meta.json             ← 방 그림 크기  [폭, 높이]
  r/tv/meta.json          ← TV 본체(화면 구멍 위치)와 기본 화면 그림(꺼짐·화면조정·마침·해돋이)
  r/tv/programs.json      ← TV 프로그램 표: 장면·사건·자막·화면 장식·강고양이 씨 반응 + 편성(길이 runtime·방영 조건·하루 상한·회차). 사람이 고치는 곳. TV_CHANNEL_PLAN.md 14장
  r/tv/schedule.json      ← 고양.방송 방송국 틀: 편성 칸·기간(이름 참조, 날짜는 js/calendar.js)·마감 뉴스·낮잠 정파·개편(3개월마다). TV_SCHEDULE_PLAN.md, TIME_BASE_PLAN.md 8-1
  sheet/                  ← meta.json 밖의 큰 시트 (생일 춤·케이크·깜짝 손님 guest-*-dance-v1, webp). build_meta.py 검사 밖. LOAD_PLAN.md 5장. 손님 시트는 make_guests.py가 만든다
  js/                     ← 코드 (JS 모듈)
  package.json            ← "type": "module" 한 줄 (web/js는 ES 모듈. 노드 검사 도구가 불러올 때 경고가 나지 않게, 사이트 동작과 상관없음)
package.json              ← 검사 도구용 playwright 버전 고정 (check_behave.mjs·visual_check.js. 배포는 pages.yml이 npm install). 사이트는 빌드 없음
tools/
  build_meta.py           ← 새 그림을 넣으면 f/·r/ meta.json을 채운다 (r/tv/·r/scenery/는 건드리지 않음)
  visual_check.js         ← 화면 점검 (같은 장면을 매번 똑같이 찍는다. 시간대는 서울 고정, `VC_TZ`로 바꿈. 3차 장면: scenery·dusk·nightwx·seasons. 2026-10-19부터 찍기 전에 늘 한 장면 더 그린다 — 예전엔 그림 받는 속도에 따라 들어가거나 빠져서 같은 코드도 몇 장이 달랐다. 그 전에 찍은 사진과는 비교하지 않는다)
  load_check.mjs          ← 처음 열 때 기다리는 양 재기 (web을 서버로 띄운 뒤 `node tools/load_check.mjs [포트] ['?birthday=이름']`): 느린 4G 흉내·서비스 워커 막음·캐시 없음으로 첫 장면까지 시간, 그때까지 받은 바이트·요청 수, 그림을 다 받을 때까지 시간. 로컬 서버라 절대 시간보다 전후 비교용. LOAD_PLAN.md 8장
  compare.py              ← 점검 화면 두 벌을 픽셀 단위로 비교
  clock_check.js          ← 시계 점검: 화면 끄기·뒤 탭·서머타임·빨리 감기를 흉내 내서 CLOCK_PLAN.md 10장 확인
  check_time.mjs          ← 시간 기준 검사 (배포 전 `node tools/check_time.mjs`. `pages.yml`에서도 돈다): 시간 모듈 밖에서 날짜·시각 직접 보기 금지(허용 목록·`// time-ok`), 달력 표, 날마다 시간대 표·해 시각 이어짐(3차), 풍경 날짜(남반구 반년·두 계절만·비 공통 함수), 약속, 회귀(2026~2030년). 시드니·서울 두 시간대로 프로세스를 따로 띄운다. TIME_BASE_PLAN.md 9장
                            기준을 일부러 바꿨으면 `--write-baseline`
  time_sample.mjs         ← 시간 회귀 표본 뽑기 (check_time.mjs가 쓴다)
  time_baseline.json.gz   ← 시간 회귀 기준: 2026~2030년 모든 날 × 하루 128시각의 명절·계절·방송일·스탠드·만득 씨 (두 시간대). 2026-10-15 시간 기준 정리 전 코드로 뽑음
  check_scene.mjs         ← 장면 검사 (배포 전, web을 서버로 띄우고 `node tools/check_scene.mjs [포트]`): bgWidth, 코드가 부르는 자리 이름·needs가 방 장면에 다 있는지, 창 없는 시험 장면에서 오류·창에 딸린 일이 없는지. SCENE_PLAN.md 7장
  check_tv.mjs            ← TV 검사 (배포 전 `node tools/check_tv.mjs`. `pages.yml`에서도 돈다): 그림·번역·방송국 틀·편성 규칙 400일·가짜 프로그램 시험·사건 400일·회귀 확인. TV_STABILITY_PLAN.md 6장, TV_SCHEDULE_PLAN.md 6장
  check_behave.mjs        ← 행동 검사 (배포 전 `node tools/check_behave.mjs --quick`, `pages.yml`에서도 돈다. 긴 묶음은 옵션 없이 손으로, 수십 분): 강고양이 씨·쥐야쥐를 빨리 감기 + 무작위 조작으로 시나리오 9개(상자 날 셋·비·할로윈·크리스마스·생일·새벽·남반구 여름) × 시드니·서울 × 한국어·영어로 돌려 오류(칸막이가 잡은 것 포함)·루프 멈춤·없는 이름표·바닥 밖·안 풀리는 쥐야쥐 상태를 찾는다. 정적 검사: 사라질 수 있는 자리(`S()`)를 확인 없이 쓰는 곳(괜찮은 곳은 파일 안 `SAFE`에 이유와 함께). 서버를 따로 띄우지 않고, 없는 그림은 meta.json 크기 대체 그림. 실패하면 시나리오·시드를 출력(`--only 이름 --seed 숫자`로 재현). STABILITY_PLAN.md 4장
                            편성을 일부러 바꿨으면 `--write-baseline`으로 회귀 기준을 다시 뽑는다
  tv_fake_programs.json   ← 편성 시험용 가짜 프로그램 (check_tv.mjs만 씀, 웹에 안 올라감)
  tv_sample.mjs           ← TV 회귀 확인 표본 뽑기 (check_tv.mjs가 쓴다)
  tv_baseline.json.gz     ← 회귀 기준: 35일 × 하루 여러 시각의 방송 (한국어·영어). 2026-10-15 시간 기준 정리(할로윈이 방송일 10/31에서 끝남) 후 다시 뽑음
  node_env.mjs            ← 노드에서 i18n·time·tv-core 모듈을 불러오기 위한 최소 흉내 (시간대 서울 고정)
  split_railing.py        ← 방 배경에서 창틀만 떼어 r/window_frame.webp를 만든다(베란다 손님 위에 다시 덮는 창틀). 창틀 + 난간 = 방 배경인지 픽셀 단위로 확인. WINDOW_PLAN.md 3장
  make_apt_mask.py        ← 건너편 아파트 마스크(r/apt_day_mask·apt_night_mask.webp: 하늘을 뺀 건물만, 산 앞에 덮는다). 그림 하늘이 투명하면(v2 그림부터) 그림 그대로, 하늘이 칠해진 예전 그림이면 하늘을 찾아 뺀다. 그림 형식은 APT_ART_GUIDE.md
  make_guests.py          ← 생일 깜짝 손님 춤 시트(assets/birthday/guests/guest-<이름>-dance-v*.png, 가장 높은 판) → web/sheet/guest-<이름>-dance-v1.webp (옆 칸으로 넘친 조각은 자기 칸으로, 칸 420px × 4, 0.75배). 손님마다 발 y·키를 출력 → js/guests.js GUESTS 표. BIRTHDAY_GUESTS_PLAN.md 5장
  make_mountains.py       ← 창밖 산 그림(assets/scenery/ 먼 산 mountain-far-*-v2.png, 가까운 산 mountain-near-*-v3.png. 판은 `VER`) → r/scenery/*.webp (여름 알파로 통일, 1200×550). `--show` → assets/references/mountain-check-v1.png. WINDOW_PLAN_3.md 6장
  map_windows.py          ← 건너편 아파트 밤 그림에서 창 사각형을 찾아 r/apt_windows.json (창 불빛). --show로 확인 그림
make_objects_doc.py       ← scenes/room/objects.json → OBJECTS.md
```

**오프라인 캐시:** `sw.js`의 `__VERSION__`이 그대로면(로컬) 그림도 네트워크 먼저라 그림을 바꿔도 바로 보인다. 배포본은 그림을 캐시해 두므로, 그림을 바꾼 배포는 다음다음 열 때쯤 새 그림이 보인다(코드는 바로).

**주의:** JS 모듈은 서버로 열어야 한다. `index.html`을 더블클릭하면 화면이 안 뜬다.

```
cd ~/Documents/ChatGPT/고양시/web && python3 -m http.server
# 브라우저에서 http://localhost:8000
```

## js/ 모듈

| 파일 | 하는 일 |
|---|---|
| `main.js` | 시작점. 하루 일정(밥·출근·귀가·불 끄기: `scheduled()`가 `passedEvents`의 `due`면 장면, `late`면 지났음 표시), 매 프레임 진행 `frame()`, 그리기 순서 `render()`, 처음 시작 `start()`. `frame()`은 진행 순서만 적는다: 각 파일의 `visitTick`·`mouseTick`·`duetTick`·`sunbeamTick`·`eventsTick`·`cupTick`·`playsTick`을 차례로 부른다(순서가 곧 확률을 뽑는 순서라 바꾸면 화면 점검 결과가 달라진다). 시작: 장면·그림 목록(meta.json)을 다 읽은 뒤(`Promise.allSettled`) 하나라도 못 읽었거나 `start()`에서 오류가 나면 `startFailed()` 안내("방을 여는 데 실패했어요 · 다시 열기"). TV 표·창밖 불빛은 없어도 연다. STABILITY_PLAN.md 6장. 서비스 워커 `warm`은 그림을 다 받은 뒤(`onWarm`) 보낸다 |
| `world.js` | 세상 상태 `world`(밝기: 방 어둠 `world.dark`, 바깥 어둠 `world.skyDark` — 하늘에 그리는 것은 skyDark)와 배우 `cat`(강고양이 씨)·`mouse`(쥐야쥐, 배우마다 몸 반폭 `half`), 말풍선 `say`, 자막 `caption`. **방 시간 타이머 `after(할 일, 초)`**: 행동을 "몇 초 뒤에"로 이을 때 setTimeout 대신 쓴다. 미리보기 배속을 따르고 탭을 떠나면 같이 멈춘다(`main.js`가 `tickTimers`). setTimeout은 화면·소리·설치 같은 바깥 일에만 |
| `guard.js` | 오류 칸막이 (STABILITY_PLAN.md 3장): `guard(이름, 할 일, 되돌리기)`·`guardDraw(ctx, 이름, 그리기)`(render 맨 바깥 칸에서만, 항상 save/restore)·`reportError`. 같은 오류는 콘솔에 한 번만, 10초 안에 5번이면 그 칸 1분 쉼, 건수 `ERRORS`(`__goyang.errors`). 난수를 쓰지 않고 아무것도 불러오지 않는다. `main.js` 매 장면은 `try … finally`로 다음 장면을 늘 요청하고, 할 일·그리기를 칸마다 감싼다(순서·횟수 그대로). `?dev=1`로 연 페이지에서만 "오류 n건"·"일부러 오류" 줄 |
| `recover.js` | 오류 뒤 되돌리기 (STABILITY_PLAN.md 3-1): `resetActor`(`run(a, [], '')` + 쥐야쥐 `state` 풀기, 둘이 놀던 중이면 둘 다, 붙잡고 있던 놀이도 끝냄), `resetPlay`, `resetDuet`, `abortPlay`(놀이의 `abort`, 없으면 `reset(지금, 지금)`), `abortEvent`(사건의 `abort`, 없으면 `reset`). 놀이 이름표 → 놀이 표 `PLAY_TAGS`: 새 놀이가 배우를 붙잡으면 여기 한 줄 |
| `time.js` | **시간 기준은 모두 여기 (TIME_BASE_PLAN.md).** 창밖 일정도 여기(WINDOW_PLAN.md): `rainPlan`(비 공통 함수, 장마)·`rainSpan`·`thunderNow`·`flashSince`·`rainbowAt`·`planeSlots`(높이는 하늘 띠 안 비율 `yk`, 철새 `geeseSlots`도)·`birdSlots`·`blackcatSlot`·`slotDue`·`aptLightsAt` (날짜 씨앗, 누구에게나 같음). 방 시계 `now()`(기기 시계 + 미리보기 offset)와 시간 점프 감지 `clockJump`. 지역 `REGION`(계절은 방문자 반구, 달은 한국)·계절. **한 해 위치·풍경 날짜**(WINDOW_PLAN_3.md 4장) `yearPos`(남반구 반년 밀림, 미리보기 `sceneryOverride`·계절 버튼 대표 날짜 `SEASON_DATE`)·`sceneryDate`·`sceneryOn`·`sceneryProgress`·`sceneryAt`(산 섞기·물드는 방향·눈 모자·미세먼지·가을 하늘). 해 뜨고 지는 시각 `sunTimes`(동지 ↔ 하지 코사인, 날마다 조금씩). 겨울 `firstSnow`·`firstSnowNow`·`snowCapAt`·`railSnowAt`·`frostAt`, 계절 손님 일정 `leafSlots`·`geeseSlots`·`dragonflySlots`·`blossomAt`, `dustDay`. **시간대(자연 시간)** 표 `DAYPARTS`와 `daypart`·`isNight`(해 진 뒤 30분 ~ 동틀 녘 시작)·`inParts`. 해 기준 오프셋 `pumpkinLit`·`batTime`·`butterflyTime`·`sunUp`·`sunArc`·`twilightGlow`·`settleNight`. **생활 시간표** `ROUTINE`(만득 씨 평일·주말, `DUE_WINDOW`, 놀이 제한 `play`, 주말 TV 소리)과 `visitHours`·`dayEvents`·`passedEvents`(지난 일정 `due`/`late`)·`inWindow`·`lampShouldBeOn`·`mandukHome`·`mandukAsleep`·`nightDark`·`secretTime`. **"하루" 세 가지** `calDay`(자정)·`broadcastDay`(새벽 5시, 그 방송일 정오의 Date)·`nightOf`(해질녘 ~ 다음 날 동틀 녘, 아침·낮엔 null), 날 넘기기 `forEachDay`·`atHour`·`visitsBetween`. **달력 함수** `inPeriod`(방·창밖, `through: 'night'` 반영)·`onDate`(TV, 날짜만)·`periodsAt`·`momentNow`·`holiday`(할로윈 → 크리스마스 → 설날 → 새해, 미리보기 `holidayOverride`가 먼저). 비·눈, 상자 있는 날, 기념일, 햇빛 조각(지나가는 길은 장면에서 `setSunbeamPath`, 창이 없으면 없음), 하늘색과 어둠, 달 모양 `moonPhase`(MOON_PLAN.md), 미리보기 한 줄 `timeInfo`. **규칙: 이 파일과 `calendar.js` 밖에서 `getMonth`·`getDate`·`getDay`·`getHours`·`hourOf`와 시각 숫자 비교를 쓰지 않는다** (`tools/check_time.mjs`) |
| `calendar.js` | 달력 한 장 `CAL`: 풍경 날짜 표 `scenery`(산 섞기 `mountain`, 가을 하늘·낙엽·철새·눈 모자 녹음·벚꽃잎·미세먼지·장마·잠자리·열대야 범위, WINDOW_PLAN_3.md 4-2), 기간(할로윈 10/24 ~ 10/31 밤 끝, 크리스마스 시즌, 이브·당일, 제야, 새해, 고양이의 날, 설날·추석 양력 날짜 표)과 특별한 순간(10/31 밤 마녀, 이브 밤 산타). **데이터만, import 없음.** 함수는 `time.js`. 새 기간은 여기 한 줄 (TV 특집에 쓰려면 `schedule.json` periods에 `{ "period": 이름 }`) |
| `jump.js` | 시간 점프 정리 `timeJumped`: 화면이 꺼졌다 켜지거나 서머타임·미리보기로 시계가 건너뛰면 방 상태(스탠드 `lampShouldBeOn`·밥그릇·컵·만득 씨 방문·지난 일정 `passedEvents`·고양이 자리 `settleCat`)를 그 시각에 맞추고 짧게 어두워졌다 밝아진다. CLOCK_PLAN.md |
| `scene.js` | 장면 불러오기 `loadScene`: 장면 이름(`SCENE.name`, 지금은 `room`)으로 `scenes/<이름>/`의 파일을 읽는다. 창 사물(`window`)의 자리 `area`는 `window.json`의 rect에서 넣는다(창이 없으면 창 사물도 뺀다). 다른 장면은 주소 `?scene=이름`. SCENE_PLAN.md |
| `win.js` | 창 `WIN`(window.json 값). 창 안은 독립 좌표(창 왼쪽 위 0): 창 안 → 방 `toRoom`·`wy`, 하늘 띠 `skyRnd`·`skyAt`. 창이 주는 빛 `windowLight(d)`(바깥 어둠과 가중치). 창이 없으면 `WIN.rect`가 null. SCENE_PLAN.md 4장 |
| `objects.js` | 장면의 `objects.json`을 받아 범위 `A('cat.roam')`(그 안 무작위 `ax`·`ay`·`aPt`)·경로 `PATH('duet.lap')`·기능별 자리 `PL('wheel')`·장소가 있나 `has('hole')`(창에 딸린 `window`·`railing`·`curtain`도)와 위치 `P`, 사물 `O`, 상태 `objView`, 자리 `S('bowl.eat')`, 소켓, 깊이를 알려준다 |
| `steps.js` | 행동 단계: `go`(길찾기로 걷기), `follow`, `hold`, `bub`, `fn`, `until`, 그리고 순서대로 실행 `run(배우, [단계...])`. 걷는 바닥은 `WALK`(`stage.json` walk). 바닥이 아닌 자리(TV 위·TV 뒤·상자 안·쳇바퀴) 표 `SPOTS`와 `inSpot`·`spotOf`. 자리마다 떠 있는 높이·그림자·누가 그리나를 적고 `actorLift`·`hasShadow`·`ownLayer`로 꺼내 쓴다(`sprites.js` 그리기, `main.js` 그리기 순서, `ui.js` 누르기 판정) |
| `behave.js` | 강고양이 씨 행동 성격표 `BEHAVIOR`: 이름표(tag)마다 TV 사건·유령 그림자·창밖 손님(새·검은 고양이·천둥)이 끼어들어도 되는지. `tvFree(cat)`, `ghostFree(cat)`, `winFree(cat)` |
| `anim.js` | 동작 그림: 자세 전환(서기↔식빵↔배 보이기), 동작 클립 `CLIP`과 `play`, 지금 보여줄 프레임 고르기 |
| `cat.js` | 강고양이 씨의 뇌 `catBrain`(하고 싶은 일 고르기)과 혼자 하는 행동들(`napB`, `windowB`…), 쓰다듬기. 매 장면: 낮잠 자다 햇빛 따라가기 `sunbeamTick`, 떨어지는 컵 `cupTick` |
| `duet.js` | 강고양이 씨와 쥐야쥐가 함께: 인사, 술래잡기, 노려보기, 상자 숨바꼭질, 같이 자기. 매 장면 `duetTick`: 같이 낮잠 → 화들짝, 자는 고양이 앞 지나가기, 서로 의식하기 |
| `mouse.js` | 쥐야쥐: 숨는 곳, 나오기, 도망, 혼자 하는 행동. 매 장면 `mouseTick`: 25~45초마다 나올지(만득 씨가 없을 때 높게, 비 오면 더), 뇌 |
| `manduk.js` | 김만득 씨: 방문 단계, 말풍선(만득 씨는 목소리로만 등장, 모습은 그리지 않는다), 포스트잇 메모. **다녀간 결과 표 `VISIT_RESULTS`**(밥그릇·붕어빵 부스러기·컵·스탠드·간식·노트북 글·액자): 실제 방문 `act`, 방문 도중 시간 점프 `endVisitNow`, 꺼져 있던 동안 지나간 방문 `missedVisit`(jump.js)이 모두 이 표를 쓴다. "만득 씨가 오면 ○○도 해 놓는다"는 여기 한 줄 |
| `outside.js` | 창밖: 하늘·해·달·구름·비·눈, 새, 나비, UFO, 산타 썰매 (박쥐·마녀는 halloween.js). 나비·UFO·산타는 파일 끝의 사건 물건으로 `events.js` 목록에 실린다. 그리는 순서(WINDOW_PLAN_3.md 5장): 하늘(지평선 `landscape.bottom`까지, 하늘 색 `skyGradient`, 밤 하늘·가을 하늘·미세먼지) → 해·달(같은 자리 `SKY_SPOT` = window.json `skySpot`(창 오른쪽 끝 기준): 오른쪽 아래에서 살짝 비스듬히 올라와 오른쪽 위에 머묾. 해는 `sunLift`, 달은 해 진 뒤 `moonLift`) → `skyBack`(무지개·번개 하늘) → 산·건물 판(`scenery.js`, 낮 판 위에 밤 판을 밤 비율로) → `apt`(창 불빛) → 노을 → 비 덮개(번쩍이는 동안 `world.flash`만큼 걷음) → 구름 → 멀리 나는 새 → `sky` → 꽃잎 → 눈·비 |
| `scenery.js` | 창밖 풍경 판(WINDOW_PLAN_3.md 5·6장, 자리는 window.json `landscape.mountains`·아파트는 `landscape`): 먼 산 → 연무 → 가까운 산 → 연무 → 건물 마스크를 임시 캔버스 두 장(낮·밤)에 합쳐 둔다. 산 두 계절 섞기(`lighter`로 A×(1−w)+B×w, 세로 그라데이션으로 가을은 꼭대기부터·봄은 아래부터), 눈 모자, 연무(`source-atop`, 미세먼지 날 누렇게), 밤엔 남색으로 어둡게, 산은 살짝 부드럽게(줄였다 키우기), 건물 뒤 은은한 그림자. 판 열쇠(풍경 날짜·화면 배율·그림 읽힘·덮어쓰기)가 바뀔 때만 다시 만든다. 산 그림 `r/scenery/`은 지금 섞는 계절 + 눈 모자만 `loadLazy` |
| `seasons.js` | 계절 손님(WINDOW_PLAN_3.md 7~9장, 높이는 window.json `sky`의 띠·난간 `railing`): 낙엽(바람 `leafSlots`, 난간에 앉을 잎은 내려올 때부터 베란다 층), 철새 V자 무리(`geeseSlots`, 하늘의 큰 것), 벚꽃잎(`blossomAt`, 생일 꽃잎이 있으면 그것만), 잠자리(`dragonflySlots`, 난간에 앉기), 첫눈 날 강고양이 씨(`firstSnowNow`, 페이지 열 때마다 한 번까지), 난간 눈(`railSnowAt`), 유리 성에(`frostAt`, 유리 칸 모서리), 미세먼지 버튼. 난간 자리: 새·검은 고양이가 있는 곳엔 앉지 않음 |
| `draw.js` | 방 그리기: 소품, 코드로 그리는 것(창밖·문·커튼·트리·난로·선풍기), 노트북 화면, 햇빛. **베란다 층** `drawVeranda`: 방 배경 다음에 베란다 손님(`events.js` veranda)을 그리고 그 자리만 창틀(`window_frame`)을 다시 덮는다 → 손님은 난간 앞·창틀 뒤. 손님이 없으면 아무것도 안 그려 화면이 전과 같다 |
| `sprites.js` | 배우 그리기: 고양이·쥐 프레임, 그림자, 쥐구멍 빼꼼(배경 입구 `HOLE`은 장면의 `hole.mouth`), 말풍선 아이콘, 자막. 아직 못 받은 프레임이 불리면 그 배우가 마지막으로 그린 프레임(`a.drawn`)을 대신 그린다(`frameMisses()` 점검용, LOAD_PLAN.md 4-3) |
| `stage.js` | 캔버스, 화면 맞추기, 카메라, 깊이 비율 `DEPTH`, 다른 캔버스에 잠깐 그리기 `withCtx`. 무대 숫자(`W`·`H`·`FLOOR`·`BGK`·`DEPTH`·걷는 바닥 `WALK`·카메라 자리)는 장면을 읽을 때 `applyStage`가 `stage.json`에서 넣는다. 방 어둠 `roomDark(창 빛)` = 방 자체 어둠 × (1 − 가중치) + 바깥 어둠 × 가중치. 걷는 바닥 안으로 넣기 `walkX(x, 몸 반폭)`·`walkY(y)`: 기능 코드는 바닥 범위 숫자를 직접 쓰지 않고 이것을 쓴다 |
| `assets.js` | meta.json 세 개를 읽어 그림 목록을 만들고 그림을 불러온다. **두 묶음**(LOAD_PLAN.md): 시작 묶음(`inStartSet`, 규칙은 이 파일 한 곳 `START_CAT`·`LATER_ROOM`·생일)만 기다렸다가 `start()`, 이어서 나중 묶음을 낮은 우선순위로 전부 받는다(오프라인용). 다 받으면 `assetsWarm()` true, `onWarm(할 일)`. 그 전에는 나중 묶음 그림을 쓰는 행동·사건·놀이를 고르지 않는다(`cat.js` catBrain, `events.js` canStart, `gate.js` gateOk, 나비, 레이저 누르기, TV 반응). `lazyPending()`은 나중 묶음도 센다(점검 도구가 다 받을 때까지 기다리게). `loadLazy`(TV 프로그램·산)는 높은 우선순위 |
| `sound.js` | Web Audio로 만든 소리 (방 잡음, 비, 방울, 문, 생일 노래, 손님 "뽁", TV). 생일 노래 표 `BDAY_SONG`(박 길이·소절 시작점·음표): 노래를 바꾸면 이것만 맞춘다 |
| `tv-core.js` | TV · 계산(화면 없이, 노드에서도 돈다): `programs.json` 검사 `setPrograms`, 방송국 틀 `setSchedule`, 하루 편성 `tvDay`·`tvSegs`·`tvNaps`(조건·고정 칸·틈 메우기·회차·정파 여러 번, 씨앗 = 시즌 + 요일), 구간 `segAt`·`segOrder`(홈쇼핑 상품, 요일마다 다른 순서), 사건 `tvEvents`, 지금 상태 `tvState`(낮잠 정파 포함), 장면 그림 `tvFrameName`, 제목 `tvTitle` |
| `tv.js` | TV · 방송: 프로그램 표·방송국 틀 불러오기 `loadPrograms`, 그림 미리 받기 `tvNeed`(지금·다음 칸, 매분), 매 프레임 `tvTick`, 오류 격리 `tvBreak`(그 칸 끝까지 "화면 조정 중"), 미리보기 `tvPreview`·`tvForce` |
| `tv-screen.js` | TV · 화면: 320×240 버퍼, 화면 장식(`overlay`: 뉴스 띠·대사·점수판·홈쇼핑 띠), "수신 중"·"화면 조정 중", 브라운관 효과, 방 안에 그리기, 밤 불빛 |
| `tv-cat.js` | TV · 강고양이 씨: 보기(`watch`)·위에서 낮잠·뒤 빼꼼·달려오기, 반응 목록 `REACT`(사건의 `react`가 고른다: 시무룩·펄쩍·하트·빼꼼·졸기·화면 툭툭·달려들기) |
| `tv-guide.js` | TV · 편성표 창(낮잠 정파 줄 포함)과 축하 방송 신청 화면 |
| `tv-dev.js` | 미리보기 도구의 TV 칸: 틀어 보기, 사건 고르기, 7일 편성표, 특집 날짜·낮잠 정파로 가기, 문제 있는 프로그램 수 |
| `plays.js` | 놀이 목록 `plays()`: 레이저·어항·실뭉치·쳇바퀴. 놀이마다 자기 파일 끝에 `{ tick, layers, overlay, light, press, drag, reset, dev, debug }` 물건을 내놓고, `main.js`(매 장면·그리기)·`ui.js`(누르기·미리보기 버튼)·`jump.js`(시간 점프)·`debug.js`는 이 목록만 돈다. 새 놀이는 여기 한 줄. 놀이마다 필요한 장소 `needs: [...]`(SCENE_PLAN.md 7장): 장면에 없으면 그 놀이는 없다(`livePlays`, 고양이 쪽 확인은 `playOk('fish')`) |
| `events.js` | 가끔 생기는 일 목록 `events()`: 나비, UFO, 산타 썰매, 마녀, 박쥐, 커튼 유령 그림자, 건너편 창 불빛, 천둥번개, 무지개, 비행기, 철새, 벚꽃잎, 낙엽, 난간 눈, 난간의 새, 작은 검은 고양이, 잠자리, 첫눈, 미세먼지(버튼), 성에. 놀이 목록과 같은 방식으로 `{ cls, active, tick, skyBack, apt, sky, veranda, room, shadow, reset, dev, debug, note }`을 내놓고 `main.js`·`outside.js`·`draw.js`(창밖·베란다)·`jump.js`·`ui.js`·`debug.js`는 이 목록만 돈다. 새 사건은 여기 한 줄. 사건마다 필요한 장소 `needs: [...]`(예: 나비 `['window', 'bfly.roam']`, 베란다 새 `['railing']`): 장면에 없으면 생기지도 그려지지도 않는다(SCENE_PLAN.md 7장). **창밖 교통정리**(WINDOW_PLAN.md 4장): 사건마다 등급 `cls`(sky·skySmall·curtain·veranda·weather·bg), 시작 전에 `canStart(cls, {special, noRest})`. 하늘의 큰 것은 한 번에 하나·끝나고 8분 쉼·한 시간 3번·천둥 중엔 안 나옴, 베란다 손님은 한 번에 하나. 숫자는 `TRAFFIC` 한 곳. 미리보기 한 줄 `trafficLine` |
| `gate.js` | 놀이가 저절로 시작해도 되는지 `gateOk`/`gateMark`: 시작 가능 시각은 `time.js` `ROUTINE.play`(`inWindow`), 간격 표 `GATES`(방 시각). 만득 씨가 있을 때·생일 파티 중엔 안 함. 간격은 기기에 저장 |
| `laser.js` | 레이저 놀이: 탁자 위 포인터(`penAt`, 코드 그림 `drawLaserPen`)를 누르면 40초 동안 빨간 점이 마우스·손가락을 따라가고 강고양이 씨가 쫓는다(`chase` 단계). 지치면 3분 동안 무시. 가끔 포인터 노려보기 `penStareB`. CAT_PLAY_PLAN.md 5-1 |
| `fish.js` | 어항 낚시: 어항 그리기(뒤판 → 금붕어·바늘·거품 → 앞판), 금붕어 헤엄과 도와주기(한숨 → 보물상자 → 붕어빵을 바늘에), 강고양이 씨 낚시 `fishB`(방 시각 4시간에 한 번, 8~21시), 붕어빵 날아가기·먹기, 어항 누르기 `tapBowl`. 밤 어항 구경 `bowlWatchB`, 붕어빵 부스러기(쥐야쥐 `mouseCrumbB`, 만득 씨 `sweepCrumbs`). 낚싯대 끝 `ROD_TIP`, 어항 안 자리 `BOWL`. CAT_PLAY_PLAN.md 5-2 |
| `yarn.js` | 실뭉치: 왼쪽 화면 밖에서 굴러오기 `yarnIn`(방 시각 3시간에 한 번, 8~22시), 바닥 마찰로 굴러가기, 화면 밖까지 이어진 실 한 가닥, 강고양이 씨 쫓기 `yarnB`(툭툭 치기 3~6번, 가끔 껴안고 뒷발 차기), 끌려 나가기, 누르기 `tapYarn`, 쥐야쥐가 코로 밀기. CAT_PLAY_PLAN.md 5-4 |
| `wheel.js` | 쳇바퀴: 강고양이 씨 `wheelB`(방 시각 4시간에 한 번, 9~20시, 만득 씨 없을 때) — 오른쪽 화면 밖으로 나갔다가 바퀴를 머리로 밀며 들어옴(`cat_push_1~4`), 어항 앞(x 210)에 세우고 폴짝 → 걷기 → 달리기 10~20초("…드르륵드르륵…") → 내려와 다른 데로 가면 바퀴가 혼자 왼쪽 화면 밖으로. 그리기는 뒤판 → 돌아가는 디딤판 줄무늬 → 고양이·쥐야쥐 → 앞판. `SPOTS`의 `wheel` 자리, 쥐야쥐가 올라타 같이 실려 나가는 변주 `mouseRide`, 만득 씨가 오면 즉시 정리. CAT_PLAY_PLAN.md 5-3 |
| `birthday.js` | 생일 파티(`?birthday=이름`): 배너, 케이크, 꽃비, 무대 조명, 노트북 자막, 쥐야쥐 박수(노래 끝나고 `MOUSE_ENCORE`초 더), 디스코볼(`drawDisco`·`drawDiscoLights`, 장면 `party.disco`). **노래는 강고양이 씨가 춤을 시작할 때 튼다**: 노래 시계 `world.party.song`(`start`·`sec`·`beat`·`phrases`), 춤 칸 번호 `danceCell()`(고양이·손님 같은 칸). 좁은 화면 카메라 단계 `world.party.cam`(`party` → `mouse`, `stage.js`). BIRTHDAY_GUESTS_PLAN.md |
| `guests.js` | 생일 깜짝 손님: 손님 표 `GUESTS`(크기 비율·발 y·키), 나오는 때 `GUEST_CUES`(소절+박, 소리 꺼짐은 `GUEST_CUES_RATIO`), 인원·확률 설정. 춤 시작 때 4~5명 뽑아 장면 `party.guests` 자리에(작은 손님 자리·뒷줄 규칙), 노래 소절에 "짠" 나타나고 노래 끝·만득 씨·파티 끝에 "짠" 사라짐. 그리기 `guestLayers`(바닥 순서)·`drawPuffs`(연기·별가루). 그림이 아직 없는 손님은 안 뽑는다 |
| `shelf.js` | 책장 메뉴 (`objects.json`의 `bookshelf.books`) |
| `frame.js` | 벽 액자: 날짜마다 바뀌는 가족사진(`objects.json`의 `frame.photos`), 누르면 다음 사진·조금씩 삐뚤어짐, 만득 씨가 다녀가면 반듯. 넘긴 사진·기울기는 그 기기에 저장. FRAME_PHOTOS_PLAN.md |
| `ui.js` | 캔버스 누르기, 쪽지·노트북 창, 소리·켜 두기·전체 화면 버튼(화면 꺼짐 방지), 미리보기 도구 |
| `install.js` | 홈 화면 앱: 홈 화면 앱으로 열었는지(`STANDALONE`), 설치 신호, 책장의 **이상한 책**(그리기·빛·누르기)과 「이 방을 데려가는 법」 창, 포스트잇 힌트, 강고양이 씨 올려다보기, 세로 화면 안내, 홈 화면 앱 통계. MOBILE_PLAN.md 참고 |
| `weather.js` | 창밖 날씨와 하늘(WINDOW_PLAN.md 6·7장): 건너편 창 불빛(`r/apt_windows.json`의 창마다 `time.js aptLightsAt`), 천둥번개(번쩍임 시각 `flashSince`, 실제 2초에 한 번까지·점프 직후 몰아 터뜨리지 않음, `world.flash`, 강고양이 씨 숨기·쥐야쥐 숨기), 무지개(`rainbowAt`, 시각의 함수), 비행기(`planeSlots`, 낮 비행기구름·밤 불빛). 미리보기 버튼: 천둥번개·무지개·비행기·창 불빛 시각 |
| `veranda.js` | 베란다 손님(WINDOW_PLAN.md 5장): 난간의 새(비둘기·까치, `birdSlots`)와 강고양이 씨 채터링(`chatter` 클립), 작은 검은 고양이(`blackcatSlot`: 빼꼼·난간 걷기, 밤 눈 먼저, 다가가면 도망). 한 번에 손님 하나 `world.guest`. 새로 고침·점프 직후면 있어야 할 모습으로 이어서 |
| `glass.js` | 유리 가림 검사 `occluded(x, y)`: 어둠 뒤에 그리는 창밖의 빛나는 점(검은 고양이 눈·비행기 불빛)이 창틀·커튼·방 안 물건·캐릭터에 가려지면 안 그린다. 유리 픽셀 표(`window_frame` 알파)는 한 번만 읽는다 |
| `halloween.js` | 할로윈(10/24 ~ 10/31 밤이 끝날 때, `calendar.js`): 호박 불빛, 창밖 박쥐, 고양이 마녀와 박쥐 수행단, 커튼 유령 그림자와 강고양이 씨 반응. 마녀·박쥐·유령은 파일 끝의 사건 물건으로 `events.js` 목록에 실린다. HALLOWEEN_PLAN.md 참고 |
| `i18n.js` | 말: 화면 글자 한국어·영어 표 `STR`, `tr('키')`, 언어 고르기·저장·전환(`setLang`). 새 글자는 여기 한 곳에. ENGLISH_PLAN.md 참고 |
| `util.js` | 난수·범위·해시, localStorage, 손글씨 글꼴, 색 섞기, `$`. 장면을 읽은 뒤 할 일 `onScene(fn)`: 장면 값으로 모듈 안 숫자를 채울 때 쓴다(쳇바퀴·케이크). 모듈 맨 위에서 장면 값을 바로 쓰지 않는다(아직 안 읽었음). 가져오는 것이 없는 이 파일에 두어 모듈 순서와 상관없다 |
| `debug.js` | 점검용으로 `window.__goyang`에 행동 함수들을 내보낸다 |

### 약속

- **시간은 `time.js`(와 데이터 `calendar.js`)에서만 판단한다.** 기능 파일은 `daypart`·`isNight`·`ROUTINE`·`inWindow`·`lampShouldBeOn`·`inPeriod`·`momentNow`·`nightOf` 같은 이름을 쓰고 `getHours`·`hourOf`·`h >= 19`를 쓰지 않는다. 시간이 아닌 비교(그리기의 높이 `h` 등)는 줄 끝에 `// time-ok`. `node tools/check_time.mjs`가 확인한다 (TIME_BASE_PLAN.md)
- 모듈끼리 서로 불러 쓰는 곳이 많다(순환). 그래서 **모듈 맨 위에서는 다른 모듈의 값을 바로 쓰지 않는다.**
  화면 요소에 이벤트를 다는 일처럼 시작할 때 할 일은 `initUI()`, `initShelf()`처럼 함수로 만들어 `main.js`에서 부른다.
- 다른 모듈의 `let` 변수는 직접 바꾸지 못한다(JS 모듈 규칙). 바꿀 일이 있으면 그 모듈에 함수를 둔다.
  예: 시계 `setSpeed`, `setSimMs`, `setOverride('rain', true)` / 캔버스 `withCtx(다른캔버스, 그리기)`
- 새 행동은 `run(cat, [go(...S('물건.자리')), hold(3, 'loaf'), ...], '이름표')`로 만든다. 이름표(`tag`)는 다른 반응이 끼어들지 판단하는 데 쓴다.
  이름표를 새로 만들면 `behave.js`의 `BEHAVIOR`에 한 줄 더한다(TV 사건·유령 그림자가 끼어들어도 되는지). 빠뜨리면 미리보기(`?dev=1`)에서 콘솔에 알려 준다.
  고양이가 바닥이 아닌 곳(쳇바퀴 안처럼)에 들어가는 행동은 `steps.js`의 `SPOTS`에 자리 하나를 더한다: 들어가 있는지(`on`)와, 다른 행동이 시작될 때 바닥으로 내려놓는 법(`exit`).
  (2026-10-14 정리: 예전 `TV_BUSY`·`NO_GHOST` 목록과 `run()` 안의 TV 위·뒤·상자 처리를 이 두 표로 옮겼다. 화면 점검 결과 같음)

## 그림을 새로 넣을 때

1. `web/f/`(캐릭터) 또는 `web/r/`(소품)에 webp로 넣는다
2. `python3 tools/build_meta.py` → meta.json에 크기가 들어간다. 캐릭터는 발 기준점이 그림 아래 가운데로 일단 들어가니, 필요하면 손으로 고친다. **meta.json에 없는 그림은 불러오지 않아 화면에 안 나온다**
3. 코드에서 이름으로 쓴다: 캐릭터는 `CLIP`에 프레임 이름, 소품은 `objects.json`의 `look`
4. 확인만: `python3 tools/build_meta.py --check` (Pillow 없어도 됨). 배포(`.github/workflows/pages.yml`)도 올리기 전에 이걸 돌려서, 그림과 meta.json이 어긋나면 배포를 멈춘다 (2026-10-15 액자 사진 5~7번이 meta.json에서 빠져 안 나왔던 일 이후)

배포 전 검사: `check_time`·`check_tv`는 이제 배포(`pages.yml`) 때 자동으로 돌고, 하나라도 실패하면 배포를 멈춘다. 급한 수정은 Actions에서 손으로 실행하며 `skip_checks`를 켜면 두 검사를 건너뛴다(`build_meta.py --check`는 늘 돈다). STABILITY_PLAN.md 5장

TV 프로그램은 코드를 고치지 않는다: 그림을 `r/tv/`에 → `r/tv/programs.json`에 한 덩어리(길이 `runtime`과 방영 조건 `"air": [["주말", "오전"]]` 같은 것까지) → `i18n.js` 번역 → `node tools/check_tv.mjs`. 편성에는 조건에 맞춰 저절로 들어간다. 자세한 것은 TV_CHANNEL_PLAN.md 14장. 프로그램 그림은 시작을 기다리게 하지 않고 필요할 때 받는다(`assets.js` `loadLazy`).

## 화면 점검 (코드를 크게 고칠 때)

```
cd web && python3 -m http.server 8000 &          # 고치기 전
node ../tools/visual_check.js 8000 ../shots_before
# … 코드 수정 …
node ../tools/visual_check.js 8000 ../shots_after
python3 ../tools/compare.py ../shots_before ../shots_after
```

시계·무작위 값·타이머를 고정해서 낮·밤·새벽 방송 마침/시작·TV 반응·생일 파티·크리스마스·만득 씨 방문·비·상자·쥐·나비·UFO·노트북·컵·편성표 창·쪽지·책장·폰 화면·빨리 감기·창밖 풍경(난간의 새·검은 고양이·밤 비행기·무지개·번개) 장면을 찍는다.
동작을 일부러 바꾼 경우에는 다른 화면이 나오는 게 맞으니, 다른 장면만 눈으로 확인하면 된다. Node와 Playwright가 필요하다.
