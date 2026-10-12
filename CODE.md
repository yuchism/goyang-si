# 고양.시 코드 구조

> 2026-10-12 리팩토링. 한 파일(`web/index.html`, 152KB)에 있던 HTML·CSS·JS·데이터를 나눴다.
> 동작은 바꾸지 않았다. 리팩토링 전후 화면을 34장면에서 찍어 픽셀 단위로 같은 것을 확인했다(아래 "화면 점검").

## 폴더

```
web/                      ← GitHub Pages로 배포되는 폴더 (이 안만 사이트에 올라간다)
  index.html              ← 화면 뼈대(HTML)만
  style.css               ← 스타일
  objects.json            ← 방의 사물 (위치·상태·자리·소켓). 사람이 고치는 곳. OBJECTS.md 참고
  f/meta.json             ← 캐릭터 프레임 크기와 발 기준점  [폭, 높이, 기준점 x, y, (크기 보정)]  5번째 값은 그 그림만 키우거나 줄일 때 (예: 새 걷기 그림 1.1)
  r/meta.json             ← 방 그림 크기  [폭, 높이]
  r/tv/meta.json          ← TV 본체(화면 구멍 위치)와 TV 화면 그림 목록
  js/                     ← 코드 (JS 모듈)
tools/
  build_meta.py           ← 새 그림을 넣으면 f/·r/ meta.json을 채운다
  visual_check.js         ← 화면 점검 (같은 장면을 매번 똑같이 찍는다)
  compare.py              ← 점검 화면 두 벌을 픽셀 단위로 비교
make_objects_doc.py       ← objects.json → OBJECTS.md
```

**주의:** JS 모듈은 서버로 열어야 한다. `index.html`을 더블클릭하면 화면이 안 뜬다.

```
cd ~/Documents/ChatGPT/고양시/web && python3 -m http.server
# 브라우저에서 http://localhost:8000
```

## js/ 모듈

| 파일 | 하는 일 |
|---|---|
| `main.js` | 시작점. 하루 일정(밥·출근·귀가·불 끄기), 매 프레임 진행 `frame()`, 그리기 순서 `render()`, 처음 시작 `start()` |
| `world.js` | 세상 상태 `world`와 배우 `cat`(강고양이 씨)·`mouse`(쥐야쥐), 말풍선 `say`, 자막 `caption` |
| `time.js` | 방 시계(미리보기 속도 포함), 계절·해 뜨고 지는 시각, 비·눈, 상자 있는 날, 기념일, 명절, 햇빛 조각, 하늘색과 어둠 |
| `objects.js` | `objects.json`을 읽어 위치 `P`, 사물 `O`, 상태 `objView`, 자리 `S('bowl.eat')`, 소켓, 깊이를 알려준다 |
| `steps.js` | 행동 단계: `go`(길찾기로 걷기), `follow`, `hold`, `bub`, `fn`, `until`, 그리고 순서대로 실행 `run(배우, [단계...])` |
| `anim.js` | 동작 그림: 자세 전환(서기↔식빵↔배 보이기), 동작 클립 `CLIP`과 `play`, 지금 보여줄 프레임 고르기 |
| `cat.js` | 강고양이 씨의 뇌 `catBrain`(하고 싶은 일 고르기)과 혼자 하는 행동들(`napB`, `windowB`…), 쓰다듬기 |
| `duet.js` | 강고양이 씨와 쥐야쥐가 함께: 인사, 술래잡기, 노려보기, 상자 숨바꼭질, 같이 자기 |
| `mouse.js` | 쥐야쥐: 숨는 곳, 나오기, 도망, 혼자 하는 행동 |
| `manduk.js` | 김만득 씨: 방문 단계, 말풍선, 포스트잇 메모 |
| `outside.js` | 창밖: 하늘·해·달·구름·비·눈, 새, 나비, UFO, 산타 썰매 (박쥐·마녀는 halloween.js) |
| `draw.js` | 방 그리기: 소품, 코드로 그리는 것(창밖·문·커튼·트리·난로·선풍기), 노트북 화면, 햇빛 |
| `sprites.js` | 배우 그리기: 고양이·쥐 프레임, 그림자, 쥐구멍 빼꼼, 말풍선 아이콘, 자막 |
| `stage.js` | 캔버스, 화면 맞추기, 카메라, 깊이 비율 `DEPTH`, 다른 캔버스에 잠깐 그리기 `withCtx` |
| `assets.js` | meta.json 세 개를 읽어 그림 목록을 만들고 그림을 불러온다 |
| `sound.js` | Web Audio로 만든 소리 (방 잡음, 비, 방울, 문, 생일 노래, TV) |
| `tv.js` | TV · 방송: 편성표 `TV_GRID`, 프로그램 `TVP`, 지금 상태 `tvState`, 매 프레임 `tvTick` |
| `tv-screen.js` | TV · 화면: 320×240 버퍼, 브라운관 효과, 방 안에 그리기, 밤 불빛 |
| `tv-cat.js` | TV · 강고양이 씨 반응(보기·위에서 낮잠·뒤 빼꼼·달려오기)과 편성표 창 |
| `birthday.js` | 생일 파티(`?birthday=이름`): 배너, 케이크, 꽃비, 무대 조명, 노트북 자막, 쥐야쥐 박수 |
| `shelf.js` | 책장 메뉴 (`objects.json`의 `bookshelf.books`) |
| `ui.js` | 캔버스 누르기, 쪽지·노트북 창, 소리·전체 화면 버튼, 미리보기 도구 |
| `halloween.js` | 할로윈(10/24~11/1): 호박 불빛, 창밖 박쥐, 고양이 마녀와 박쥐 수행단, 커튼 유령 그림자와 강고양이 씨 반응. HALLOWEEN_PLAN.md 참고 |
| `i18n.js` | 말: 화면 글자 한국어·영어 표 `STR`, `tr('키')`, 언어 고르기·저장·전환(`setLang`). 새 글자는 여기 한 곳에. ENGLISH_PLAN.md 참고 |
| `util.js` | 난수·범위·해시, localStorage, 손글씨 글꼴, 색 섞기, `$` |
| `debug.js` | 점검용으로 `window.__goyang`에 행동 함수들을 내보낸다 |

### 약속

- 모듈끼리 서로 불러 쓰는 곳이 많다(순환). 그래서 **모듈 맨 위에서는 다른 모듈의 값을 바로 쓰지 않는다.**
  화면 요소에 이벤트를 다는 일처럼 시작할 때 할 일은 `initUI()`, `initShelf()`처럼 함수로 만들어 `main.js`에서 부른다.
- 다른 모듈의 `let` 변수는 직접 바꾸지 못한다(JS 모듈 규칙). 바꿀 일이 있으면 그 모듈에 함수를 둔다.
  예: 시계 `setSpeed`, `setSimMs`, `setOverride('rain', true)` / 캔버스 `withCtx(다른캔버스, 그리기)`
- 새 행동은 `run(cat, [go(...S('물건.자리')), hold(3, 'loaf'), ...], '이름표')`로 만든다. 이름표(`tag`)는 다른 반응이 끼어들지 판단하는 데 쓴다.

## 그림을 새로 넣을 때

1. `web/f/`(캐릭터) 또는 `web/r/`(소품)에 webp로 넣는다
2. `python3 tools/build_meta.py` → meta.json에 크기가 들어간다. 캐릭터는 발 기준점이 그림 아래 가운데로 일단 들어가니, 필요하면 손으로 고친다
3. 코드에서 이름으로 쓴다: 캐릭터는 `CLIP`에 프레임 이름, 소품은 `objects.json`의 `look`

TV 화면 그림은 `r/tv/meta.json`에 목록이 있다. 새 프로그램은 그 목록과 `tv.js`의 `TVP`, `TV_GRID`에 함께 넣는다.

## 화면 점검 (코드를 크게 고칠 때)

```
cd web && python3 -m http.server 8000 &          # 고치기 전
node ../tools/visual_check.js 8000 ../shots_before
# … 코드 수정 …
node ../tools/visual_check.js 8000 ../shots_after
python3 ../tools/compare.py ../shots_before ../shots_after
```

시계·무작위 값·타이머를 고정해서 낮·밤·새벽 방송 마침/시작·TV 반응·생일 파티·크리스마스·만득 씨 방문·비·상자·쥐·나비·UFO·노트북·컵·편성표 창·쪽지·책장·폰 화면·빨리 감기 장면을 찍는다.
동작을 일부러 바꾼 경우에는 다른 화면이 나오는 게 맞으니, 다른 장면만 눈으로 확인하면 된다. Node와 Playwright가 필요하다.
