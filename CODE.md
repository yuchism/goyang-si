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
  objects.json            ← 방의 사물 (위치·상태·자리·소켓). 사람이 고치는 곳. OBJECTS.md 참고
  f/meta.json             ← 캐릭터 프레임 크기와 발 기준점  [폭, 높이, 기준점 x, y, (크기 보정)]  5번째 값은 그 그림만 키우거나 줄일 때 (예: 새 걷기 그림 1.1)
  r/meta.json             ← 방 그림 크기  [폭, 높이]
  r/tv/meta.json          ← TV 본체(화면 구멍 위치)와 기본 화면 그림(꺼짐·화면조정·마침·해돋이)
  r/tv/programs.json      ← TV 프로그램 표: 장면·사건·자막·화면 장식·강고양이 씨 반응 + 편성(길이 runtime·방영 조건·하루 상한·회차). 사람이 고치는 곳. TV_CHANNEL_PLAN.md 14장
  r/tv/schedule.json      ← 고양.방송 방송국 틀: 편성 칸·기간(이름 참조, 날짜는 js/calendar.js)·마감 뉴스·낮잠 정파·개편(3개월마다). TV_SCHEDULE_PLAN.md, TIME_BASE_PLAN.md 8-1
  js/                     ← 코드 (JS 모듈)
tools/
  build_meta.py           ← 새 그림을 넣으면 f/·r/ meta.json을 채운다
  visual_check.js         ← 화면 점검 (같은 장면을 매번 똑같이 찍는다)
  compare.py              ← 점검 화면 두 벌을 픽셀 단위로 비교
  clock_check.js          ← 시계 점검: 화면 끄기·뒤 탭·서머타임·빨리 감기를 흉내 내서 CLOCK_PLAN.md 10장 확인
  check_time.mjs          ← 시간 기준 검사 (배포 전 `node tools/check_time.mjs`): 시간 모듈 밖에서 날짜·시각 직접 보기 금지(허용 목록·`// time-ok`), 달력 표, 네 계절 시간대 표, 약속, 회귀(2026~2030년). 시드니·서울 두 시간대로 프로세스를 따로 띄운다. TIME_BASE_PLAN.md 9장
                            기준을 일부러 바꿨으면 `--write-baseline`
  time_sample.mjs         ← 시간 회귀 표본 뽑기 (check_time.mjs가 쓴다)
  time_baseline.json.gz   ← 시간 회귀 기준: 2026~2030년 모든 날 × 하루 128시각의 명절·계절·방송일·스탠드·만득 씨 (두 시간대). 2026-10-15 시간 기준 정리 전 코드로 뽑음
  check_tv.mjs            ← TV 검사 (배포 전 `node tools/check_tv.mjs`): 그림·번역·방송국 틀·편성 규칙 400일·가짜 프로그램 시험·사건 400일·회귀 확인. TV_STABILITY_PLAN.md 6장, TV_SCHEDULE_PLAN.md 6장
                            편성을 일부러 바꿨으면 `--write-baseline`으로 회귀 기준을 다시 뽑는다
  tv_fake_programs.json   ← 편성 시험용 가짜 프로그램 (check_tv.mjs만 씀, 웹에 안 올라감)
  tv_sample.mjs           ← TV 회귀 확인 표본 뽑기 (check_tv.mjs가 쓴다)
  tv_baseline.json.gz     ← 회귀 기준: 35일 × 하루 여러 시각의 방송 (한국어·영어). 2026-10-15 시간 기준 정리(할로윈이 방송일 10/31에서 끝남) 후 다시 뽑음
  node_env.mjs            ← 노드에서 i18n·time·tv-core 모듈을 불러오기 위한 최소 흉내 (시간대 서울 고정)
  split_railing.py        ← 방 배경에서 창틀만 떼어 r/window_frame.webp를 만든다(베란다 손님 위에 다시 덮는 창틀). 창틀 + 난간 = 방 배경인지 픽셀 단위로 확인. WINDOW_PLAN.md 3장
  make_apt_mask.py        ← 건너편 아파트 그림에서 하늘을 뺀 마스크(r/apt_day_mask·apt_night_mask.webp). 무지개·번개 하늘을 건물 뒤로
  map_windows.py          ← 건너편 아파트 밤 그림에서 창 사각형을 찾아 r/apt_windows.json (창 불빛). --show로 확인 그림
make_objects_doc.py       ← objects.json → OBJECTS.md
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
| `main.js` | 시작점. 하루 일정(밥·출근·귀가·불 끄기: `scheduled()`가 `passedEvents`의 `due`면 장면, `late`면 지났음 표시), 매 프레임 진행 `frame()`, 그리기 순서 `render()`, 처음 시작 `start()`. `frame()`은 진행 순서만 적는다: 각 파일의 `visitTick`·`mouseTick`·`duetTick`·`sunbeamTick`·`eventsTick`·`cupTick`·`playsTick`을 차례로 부른다(순서가 곧 확률을 뽑는 순서라 바꾸면 화면 점검 결과가 달라진다) |
| `world.js` | 세상 상태 `world`와 배우 `cat`(강고양이 씨)·`mouse`(쥐야쥐), 말풍선 `say`, 자막 `caption`. **방 시간 타이머 `after(할 일, 초)`**: 행동을 "몇 초 뒤에"로 이을 때 setTimeout 대신 쓴다. 미리보기 배속을 따르고 탭을 떠나면 같이 멈춘다(`main.js`가 `tickTimers`). setTimeout은 화면·소리·설치 같은 바깥 일에만 |
| `time.js` | **시간 기준은 모두 여기 (TIME_BASE_PLAN.md).** 창밖 일정도 여기(WINDOW_PLAN.md): `rainSpan`·`thunderNow`·`flashSince`·`rainbowAt`·`planeSlots`·`birdSlots`·`blackcatSlot`·`slotDue`·`aptLightsAt` (날짜 씨앗, 누구에게나 같음). 방 시계 `now()`(기기 시계 + 미리보기 offset)와 시간 점프 감지 `clockJump`. 지역 `REGION`(계절은 방문자 반구, 달은 한국)·계절·해 뜨고 지는 시각. **시간대(자연 시간)** 표 `DAYPARTS`와 `daypart`·`isNight`(해 진 뒤 30분 ~ 동틀 녘 시작)·`inParts`. 해 기준 오프셋 `pumpkinLit`·`batTime`·`butterflyTime`·`sunUp`·`sunArc`·`twilightGlow`·`settleNight`. **생활 시간표** `ROUTINE`(만득 씨 평일·주말, `DUE_WINDOW`, 놀이 제한 `play`, 주말 TV 소리)과 `visitHours`·`dayEvents`·`passedEvents`(지난 일정 `due`/`late`)·`inWindow`·`lampShouldBeOn`·`mandukHome`·`mandukAsleep`·`nightDark`·`secretTime`. **"하루" 세 가지** `calDay`(자정)·`broadcastDay`(새벽 5시, 그 방송일 정오의 Date)·`nightOf`(해질녘 ~ 다음 날 동틀 녘, 아침·낮엔 null), 날 넘기기 `forEachDay`·`atHour`·`visitsBetween`. **달력 함수** `inPeriod`(방·창밖, `through: 'night'` 반영)·`onDate`(TV, 날짜만)·`periodsAt`·`momentNow`·`holiday`(할로윈 → 크리스마스 → 설날 → 새해, 미리보기 `holidayOverride`가 먼저). 비·눈, 상자 있는 날, 기념일, 햇빛 조각, 하늘색과 어둠, 달 모양 `moonPhase`(MOON_PLAN.md), 미리보기 한 줄 `timeInfo`. **규칙: 이 파일과 `calendar.js` 밖에서 `getMonth`·`getDate`·`getDay`·`getHours`·`hourOf`와 시각 숫자 비교를 쓰지 않는다** (`tools/check_time.mjs`) |
| `calendar.js` | 달력 한 장 `CAL`: 기간(할로윈 10/24 ~ 10/31 밤 끝, 크리스마스 시즌, 이브·당일, 제야, 새해, 고양이의 날, 설날·추석 양력 날짜 표)과 특별한 순간(10/31 밤 마녀, 이브 밤 산타). **데이터만, import 없음.** 함수는 `time.js`. 새 기간은 여기 한 줄 (TV 특집에 쓰려면 `schedule.json` periods에 `{ "period": 이름 }`) |
| `jump.js` | 시간 점프 정리 `timeJumped`: 화면이 꺼졌다 켜지거나 서머타임·미리보기로 시계가 건너뛰면 방 상태(스탠드 `lampShouldBeOn`·밥그릇·컵·만득 씨 방문·지난 일정 `passedEvents`·고양이 자리 `settleCat`)를 그 시각에 맞추고 짧게 어두워졌다 밝아진다. CLOCK_PLAN.md |
| `objects.js` | `objects.json`을 읽어 위치 `P`, 사물 `O`, 상태 `objView`, 자리 `S('bowl.eat')`, 소켓, 깊이를 알려준다 |
| `steps.js` | 행동 단계: `go`(길찾기로 걷기), `follow`, `hold`, `bub`, `fn`, `until`, 그리고 순서대로 실행 `run(배우, [단계...])`. 바닥이 아닌 자리(TV 위·TV 뒤·상자 안·쳇바퀴) 표 `SPOTS`와 `inSpot`·`spotOf`. 자리마다 떠 있는 높이·그림자·누가 그리나를 적고 `actorLift`·`hasShadow`·`ownLayer`로 꺼내 쓴다(`sprites.js` 그리기, `main.js` 그리기 순서, `ui.js` 누르기 판정) |
| `behave.js` | 강고양이 씨 행동 성격표 `BEHAVIOR`: 이름표(tag)마다 TV 사건·유령 그림자·창밖 손님(새·검은 고양이·천둥)이 끼어들어도 되는지. `tvFree(cat)`, `ghostFree(cat)`, `winFree(cat)` |
| `anim.js` | 동작 그림: 자세 전환(서기↔식빵↔배 보이기), 동작 클립 `CLIP`과 `play`, 지금 보여줄 프레임 고르기 |
| `cat.js` | 강고양이 씨의 뇌 `catBrain`(하고 싶은 일 고르기)과 혼자 하는 행동들(`napB`, `windowB`…), 쓰다듬기. 매 장면: 낮잠 자다 햇빛 따라가기 `sunbeamTick`, 떨어지는 컵 `cupTick` |
| `duet.js` | 강고양이 씨와 쥐야쥐가 함께: 인사, 술래잡기, 노려보기, 상자 숨바꼭질, 같이 자기. 매 장면 `duetTick`: 같이 낮잠 → 화들짝, 자는 고양이 앞 지나가기, 서로 의식하기 |
| `mouse.js` | 쥐야쥐: 숨는 곳, 나오기, 도망, 혼자 하는 행동. 매 장면 `mouseTick`: 25~45초마다 나올지(만득 씨가 없을 때 높게, 비 오면 더), 뇌 |
| `manduk.js` | 김만득 씨: 방문 단계, 말풍선, 포스트잇 메모. **다녀간 결과 표 `VISIT_RESULTS`**(밥그릇·붕어빵 부스러기·컵·스탠드·간식·노트북 글·액자): 실제 방문 `act`, 방문 도중 시간 점프 `endVisitNow`, 꺼져 있던 동안 지나간 방문 `missedVisit`(jump.js)이 모두 이 표를 쓴다. "만득 씨가 오면 ○○도 해 놓는다"는 여기 한 줄 |
| `outside.js` | 창밖: 하늘·해·달·구름·비·눈, 새, 나비, UFO, 산타 썰매 (박쥐·마녀는 halloween.js). 나비·UFO·산타는 파일 끝의 사건 물건으로 `events.js` 목록에 실린다. 그리는 순서(WINDOW_PLAN.md 3장): 하늘 → 아파트(낮 → 밤 하늘 덮개 → 밤) → `skyBack`(무지개·번개 하늘) → 그렸으면 아파트 마스크 → `apt`(창 불빛) → 노을 → 비 덮개(번쩍이는 동안 `world.flash`만큼 걷음) → 해·달 → 구름 → 멀리 나는 새 → `sky` → 꽃잎 → 눈·비 |
| `draw.js` | 방 그리기: 소품, 코드로 그리는 것(창밖·문·커튼·트리·난로·선풍기), 노트북 화면, 햇빛. **베란다 층** `drawVeranda`: 방 배경 다음에 베란다 손님(`events.js` veranda)을 그리고 그 자리만 창틀(`window_frame`)을 다시 덮는다 → 손님은 난간 앞·창틀 뒤. 손님이 없으면 아무것도 안 그려 화면이 전과 같다 |
| `sprites.js` | 배우 그리기: 고양이·쥐 프레임, 그림자, 쥐구멍 빼꼼, 말풍선 아이콘, 자막 |
| `stage.js` | 캔버스, 화면 맞추기, 카메라, 깊이 비율 `DEPTH`, 다른 캔버스에 잠깐 그리기 `withCtx` |
| `assets.js` | meta.json 세 개를 읽어 그림 목록을 만들고 그림을 불러온다 |
| `sound.js` | Web Audio로 만든 소리 (방 잡음, 비, 방울, 문, 생일 노래, TV) |
| `tv-core.js` | TV · 계산(화면 없이, 노드에서도 돈다): `programs.json` 검사 `setPrograms`, 방송국 틀 `setSchedule`, 하루 편성 `tvDay`·`tvSegs`·`tvNaps`(조건·고정 칸·틈 메우기·회차·정파 여러 번, 씨앗 = 시즌 + 요일), 구간 `segAt`·`segOrder`(홈쇼핑 상품, 요일마다 다른 순서), 사건 `tvEvents`, 지금 상태 `tvState`(낮잠 정파 포함), 장면 그림 `tvFrameName`, 제목 `tvTitle` |
| `tv.js` | TV · 방송: 프로그램 표·방송국 틀 불러오기 `loadPrograms`, 그림 미리 받기 `tvNeed`(지금·다음 칸, 매분), 매 프레임 `tvTick`, 오류 격리 `tvBreak`(그 칸 끝까지 "화면 조정 중"), 미리보기 `tvPreview`·`tvForce` |
| `tv-screen.js` | TV · 화면: 320×240 버퍼, 화면 장식(`overlay`: 뉴스 띠·대사·점수판·홈쇼핑 띠), "수신 중"·"화면 조정 중", 브라운관 효과, 방 안에 그리기, 밤 불빛 |
| `tv-cat.js` | TV · 강고양이 씨: 보기(`watch`)·위에서 낮잠·뒤 빼꼼·달려오기, 반응 목록 `REACT`(사건의 `react`가 고른다: 시무룩·펄쩍·하트·빼꼼·졸기·화면 툭툭·달려들기) |
| `tv-guide.js` | TV · 편성표 창(낮잠 정파 줄 포함)과 축하 방송 신청 화면 |
| `tv-dev.js` | 미리보기 도구의 TV 칸: 틀어 보기, 사건 고르기, 7일 편성표, 특집 날짜·낮잠 정파로 가기, 문제 있는 프로그램 수 |
| `plays.js` | 놀이 목록 `plays()`: 레이저·어항·실뭉치·쳇바퀴. 놀이마다 자기 파일 끝에 `{ tick, layers, overlay, light, press, drag, reset, dev, debug }` 물건을 내놓고, `main.js`(매 장면·그리기)·`ui.js`(누르기·미리보기 버튼)·`jump.js`(시간 점프)·`debug.js`는 이 목록만 돈다. 새 놀이는 여기 한 줄 |
| `events.js` | 가끔 생기는 일 목록 `events()`: 나비, UFO, 산타 썰매, 마녀, 박쥐, 커튼 유령 그림자, 건너편 창 불빛, 천둥번개, 무지개, 비행기, 난간의 새, 작은 검은 고양이. 놀이 목록과 같은 방식으로 `{ cls, active, tick, skyBack, apt, sky, veranda, room, shadow, reset, dev, debug, note }`을 내놓고 `main.js`·`outside.js`·`draw.js`(창밖·베란다)·`jump.js`·`ui.js`·`debug.js`는 이 목록만 돈다. 새 사건은 여기 한 줄. **창밖 교통정리**(WINDOW_PLAN.md 4장): 사건마다 등급 `cls`(sky·skySmall·curtain·veranda·weather·bg), 시작 전에 `canStart(cls, {special, noRest})`. 하늘의 큰 것은 한 번에 하나·끝나고 8분 쉼·한 시간 3번·천둥 중엔 안 나옴, 베란다 손님은 한 번에 하나. 숫자는 `TRAFFIC` 한 곳. 미리보기 한 줄 `trafficLine` |
| `gate.js` | 놀이가 저절로 시작해도 되는지 `gateOk`/`gateMark`: 시작 가능 시각은 `time.js` `ROUTINE.play`(`inWindow`), 간격 표 `GATES`(방 시각). 만득 씨가 있을 때·생일 파티 중엔 안 함. 간격은 기기에 저장 |
| `laser.js` | 레이저 놀이: 탁자 위 포인터(`penAt`, 코드 그림 `drawLaserPen`)를 누르면 40초 동안 빨간 점이 마우스·손가락을 따라가고 강고양이 씨가 쫓는다(`chase` 단계). 지치면 3분 동안 무시. 가끔 포인터 노려보기 `penStareB`. CAT_PLAY_PLAN.md 5-1 |
| `fish.js` | 어항 낚시: 어항 그리기(뒤판 → 금붕어·바늘·거품 → 앞판), 금붕어 헤엄과 도와주기(한숨 → 보물상자 → 붕어빵을 바늘에), 강고양이 씨 낚시 `fishB`(방 시각 4시간에 한 번, 8~21시), 붕어빵 날아가기·먹기, 어항 누르기 `tapBowl`. 밤 어항 구경 `bowlWatchB`, 붕어빵 부스러기(쥐야쥐 `mouseCrumbB`, 만득 씨 `sweepCrumbs`). 낚싯대 끝 `ROD_TIP`, 어항 안 자리 `BOWL`. CAT_PLAY_PLAN.md 5-2 |
| `yarn.js` | 실뭉치: 왼쪽 화면 밖에서 굴러오기 `yarnIn`(방 시각 3시간에 한 번, 8~22시), 바닥 마찰로 굴러가기, 화면 밖까지 이어진 실 한 가닥, 강고양이 씨 쫓기 `yarnB`(툭툭 치기 3~6번, 가끔 껴안고 뒷발 차기), 끌려 나가기, 누르기 `tapYarn`, 쥐야쥐가 코로 밀기. CAT_PLAY_PLAN.md 5-4 |
| `wheel.js` | 쳇바퀴: 강고양이 씨 `wheelB`(방 시각 4시간에 한 번, 9~20시, 만득 씨 없을 때) — 오른쪽 화면 밖으로 나갔다가 바퀴를 머리로 밀며 들어옴(`cat_push_1~4`), 어항 앞(x 210)에 세우고 폴짝 → 걷기 → 달리기 10~20초("…드르륵드르륵…") → 내려와 다른 데로 가면 바퀴가 혼자 왼쪽 화면 밖으로. 그리기는 뒤판 → 돌아가는 디딤판 줄무늬 → 고양이·쥐야쥐 → 앞판. `SPOTS`의 `wheel` 자리, 쥐야쥐가 올라타 같이 실려 나가는 변주 `mouseRide`, 만득 씨가 오면 즉시 정리. CAT_PLAY_PLAN.md 5-3 |
| `birthday.js` | 생일 파티(`?birthday=이름`): 배너, 케이크, 꽃비, 무대 조명, 노트북 자막, 쥐야쥐 박수 |
| `shelf.js` | 책장 메뉴 (`objects.json`의 `bookshelf.books`) |
| `frame.js` | 벽 액자: 날짜마다 바뀌는 가족사진(`objects.json`의 `frame.photos`), 누르면 다음 사진·조금씩 삐뚤어짐, 만득 씨가 다녀가면 반듯. 넘긴 사진·기울기는 그 기기에 저장. FRAME_PHOTOS_PLAN.md |
| `ui.js` | 캔버스 누르기, 쪽지·노트북 창, 소리·켜 두기·전체 화면 버튼(화면 꺼짐 방지), 미리보기 도구 |
| `install.js` | 홈 화면 앱: 홈 화면 앱으로 열었는지(`STANDALONE`), 설치 신호, 책장의 **이상한 책**(그리기·빛·누르기)과 「이 방을 데려가는 법」 창, 포스트잇 힌트, 강고양이 씨 올려다보기, 세로 화면 안내, 홈 화면 앱 통계. MOBILE_PLAN.md 참고 |
| `weather.js` | 창밖 날씨와 하늘(WINDOW_PLAN.md 6·7장): 건너편 창 불빛(`r/apt_windows.json`의 창마다 `time.js aptLightsAt`), 천둥번개(번쩍임 시각 `flashSince`, 실제 2초에 한 번까지·점프 직후 몰아 터뜨리지 않음, `world.flash`, 강고양이 씨 숨기·쥐야쥐 숨기), 무지개(`rainbowAt`, 시각의 함수), 비행기(`planeSlots`, 낮 비행기구름·밤 불빛). 미리보기 버튼: 천둥번개·무지개·비행기·창 불빛 시각 |
| `veranda.js` | 베란다 손님(WINDOW_PLAN.md 5장): 난간의 새(비둘기·까치, `birdSlots`)와 강고양이 씨 채터링(`chatter` 클립), 작은 검은 고양이(`blackcatSlot`: 빼꼼·난간 걷기, 밤 눈 먼저, 다가가면 도망). 한 번에 손님 하나 `world.guest`. 새로 고침·점프 직후면 있어야 할 모습으로 이어서 |
| `glass.js` | 유리 가림 검사 `occluded(x, y)`: 어둠 뒤에 그리는 창밖의 빛나는 점(검은 고양이 눈·비행기 불빛)이 창틀·커튼·방 안 물건·캐릭터에 가려지면 안 그린다. 유리 픽셀 표(`window_frame` 알파)는 한 번만 읽는다 |
| `halloween.js` | 할로윈(10/24 ~ 10/31 밤이 끝날 때, `calendar.js`): 호박 불빛, 창밖 박쥐, 고양이 마녀와 박쥐 수행단, 커튼 유령 그림자와 강고양이 씨 반응. 마녀·박쥐·유령은 파일 끝의 사건 물건으로 `events.js` 목록에 실린다. HALLOWEEN_PLAN.md 참고 |
| `i18n.js` | 말: 화면 글자 한국어·영어 표 `STR`, `tr('키')`, 언어 고르기·저장·전환(`setLang`). 새 글자는 여기 한 곳에. ENGLISH_PLAN.md 참고 |
| `util.js` | 난수·범위·해시, localStorage, 손글씨 글꼴, 색 섞기, `$` |
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
