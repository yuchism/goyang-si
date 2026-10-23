# AGENTS.md — 고양.시 공통 규칙 (Claude · Codex)

> 두 AI가 같이 따르는 규칙의 단일 출처. CLAUDE.md는 이 문서를 가리키기만 한다.
> 워크플로 원칙: ai-workflow-principles.md

## 1. 이 프로젝트
- 고양.시(goyang.si): 강고양이 씨가 사는 방을 켜 두고 보는 웹페이지. `web/`만 GitHub Pages로 배포, 빌드 없음.
- 코드 구조·도구·검사: `CODE.md`. 사물 기준: `web/scenes/room/objects.json`
  (`OBJECTS.md`는 `make_objects_doc.py`로 만든다 — 직접 고치지 않는다).
- 로컬 실행: `cd web && python3 -m http.server` (파일을 더블클릭하면 안 뜬다).

## 1-1. 작업 환경
- 저장소는 `~/Workspace/goyang-si`. `~/Documents`·`~/Desktop`·`~/Downloads`(macOS 보호 폴더)에 두면 Claude 셸에 폴더가 붙지 않는다.
- Claude 셸(데스크톱 앱 VM)
  - 인터넷이 막혀 Playwright Chromium이 없다. 브라우저 검사(`check_scene`·`check_behave`·`visual_check`)는
    Mac 터미널·Codex에서 돌리거나, Claude가 클라우드 쪽으로 옮겨 돌린다.
  - git 커밋에는 폴더 삭제 권한이 필요하다(git이 자기 잠금·임시 파일을 지움). 권한을 받아도 git 파일 말고는 지우지 않는다.
  - 커밋 작성자는 저장소 git 설정(`git config user.name/email`)을 따른다. 설정이 없으면 직전 커밋의 작성자를 `git -c`로 쓰고 그렇게 했다고 알린다.

## 2. 문서 위치
- 결정 → `docs/adr/NNNN-제목.md` / 할 일 → `tasks/작업명.md`
- 그림 지시서 → `assets/briefs/작업명.md` / 검수 → `reviews/작업명.md`
- 끝난 플랜(읽기 전용 기록) → `docs/plans/` / 끝난 그림 지시서 → `assets/briefs/` / 분류 목록 → `docs/plan-triage.md`
- 루트에는 아직 열린 문서만 둔다(지금: `CABINET_PLAN`·`CARRY_PLAN`·`APT_BACKDROP_PLAN`·`CAT_INC_IDEAS`). 끝나면 위 자리로 옮긴다.
- 플랜·지시서의 상태는 3번째 줄(`> 상태:`)을 본다. 코드 주석은 문서를 파일 이름으로만 부르므로(`TIME_BASE_PLAN.md 9장`) 옮겨도 이름은 바꾸지 않는다.

## 3. 작업 흐름
- 회의(논의·결정) → 문서 → 구현 순서를 지킨다.
- 문서(플랜/ADR/스펙/AGENTS.md) 수정 전에는 바뀔 내용을 보여 주고 확인받는다.
- 작업 시작 시 `tasks/`의 status를 읽고, 끝나면 status를 갱신한다.
- 단계가 끝날 때마다 커밋한다. 검수는 커밋 단위(git diff)로 한다.
- 구현하며 계획과 달라진 점은 그 티켓(또는 플랜)의 "구현 메모"에 남긴다.
- status는 티켓 파일이 기준이다. 커밋 제목에 상태를 적을 때는 파일의 status와 같게 한다.
- "(사람)" 항목은 결과(통과/실패, 실패면 무엇이 보였나)까지 받아 적는다. "봤다"만으로는 체크하지 않는다.
- 티켓의 확인 항목은 "무엇을 띄워서 무엇을 보는지"까지 적는다. 사람이 눈으로 봐야 하는 항목은 "(사람)"으로 표시한다.

## 4. 사람이 하는 일 (AI가 혼자 하지 않음)
- 이미지 에셋 만들기·고르기, UX 판단, 배포.
- `.github/workflows/pages.yml` 수정 (보호된 파일 — 바꿀 내용을 제안만 한다).

## 5. 결정 기록
- 구조·정책 결정이 생기면 ADR 후보로 제안한다(작성은 승인 후).
- 기존 ADR과 어긋나는 구현이 필요하면 구현 전에 멈추고 알린다.

## 6. 코드 약속
- **시간**은 `time.js`·`calendar.js`에서만 판단한다. 기능 파일은 `daypart`·`isNight`·`ROUTINE`·`inPeriod`·`nightOf` 같은 이름을 쓰고 `getHours`·`h >= 19`를 쓰지 않는다. 시간이 아닌 비교는 줄 끝에 `// time-ok`.
  시간은 세 종류다: 자연(해·달·창밖) / 생활(만득 씨 일정) / 방송(고양.방송). 기능마다 무엇을 따르는지 분명히 한다.
- **언제 일어나나**는 날짜·시각으로 계산한다(날짜 씨앗). 저장하지 않는다 — 새로 고침·시간 점프에도 같고, 같은 시각엔 누구나 같다.
- **좌표·자리**는 장면 설정(`scenes/room/stage.json`·`objects.json`·`window.json`)에 둔다. 코드에 숫자를 박지 않는다. 자리가 없으면 그 기능은 조용히 꺼진다.
- **새 행동·놀이는 표에 항목을 더한다** (if를 늘리지 않는다):
  - 행동: `run(cat, [...], '이름표')` + `behave.js` `BEHAVIOR`에 한 줄
  - 바닥이 아닌 자리: `steps.js` `SPOTS`
  - 놀이: 파일 하나 + `plays.js` 한 줄 + `behave.js` 한 줄 (+ 저절로 시작하면 `gate.js` `GATES`)
  - TV 프로그램: 코드 수정 없이 `r/tv/programs.json` + `i18n.js` (TV_CHANNEL_PLAN.md 14장)
- 모듈 맨 위에서 다른 모듈의 값을 바로 쓰지 않는다(순환 import). 시작할 일은 `initXxx()`로 만들어 `main.js`에서 부른다. 다른 모듈의 `let`은 그 모듈의 함수로만 바꾼다.
- 그림: `web/f/`·`web/r/`에 webp → `python3 tools/build_meta.py`. meta.json에 없는 그림은 안 나온다.
- 글자: 모두 `i18n.js` `STR` 표(`tr()`). 그림 안에는 글자를 넣지 않는다.
- `localStorage`는 try/catch로 감싸고, 실패해도 동작하게.
- 오류는 칸막이(`guard.js`)가 잡는다. 놀이·사건은 끊길 때를 위해 `abort()`/`reset`을 둔다.

## 7. 세계관 규칙
- 진짜 만득 씨는 말풍선으로만 존재한다. 모습은 어디에도 그리지 않는다.
- 손님·물건이 어디서 왜 왔는지는 설명하지 않는다(미스터리한 방).
- 만득 씨가 오면 놀이·물건은 즉시 정리되고 강고양이 씨는 시치미.
- 소리는 아직 자막만(소리 회의 전). 자막은 소리를 낸 자리에 띄운다.

## 8. 검사
- 배포 전: `node tools/check_time.mjs` · `node tools/check_tv.mjs` · `node tools/check_scene.mjs [포트]` · `node tools/check_behave.mjs --quick` · `python3 tools/build_meta.py --check`
- 보이는 동작을 바꾸지 않는 작업: 화면 점검(`visual_check.js` 전후 → `compare.py`)이 같아야 한다. 일부러 바꿨으면 달라진 장면만 눈으로 확인하고 그 사실을 적는다.
- 화면 점검에서 "다름"이 나오면 먼저 같은 코드로 두 번 찍어 흔들림인지 가린다.
  알려진 흔들림: `ui` 장면 (654,618)–(748,621) → tasks/visual-check-ui-flake.md
- 회귀 기준(`--write-baseline`)은 동작을 일부러 바꿨고 승인받았을 때만 다시 뽑는다.

## 9. 리팩터 후보 보고 (매 작업 종료 시)
- 작업 끝에 "리팩터 후보" 섹션을 남긴다:
  늘어난 조건 분기 / 특수 케이스 플래그 / 중복 로직 / 길어진 함수.
  이벤트·규칙이 if로 쌓이면 데이터 정의(표) + 스케줄러 구조를 제안한다.
- 리팩터링 실행은 승인 후에만.

## 10. 자동 협업 (아직 꺼 둠 — tasks/ 시범 운영 뒤 켬)
- `mode: auto` 티켓은 구현 → 상대 AI 검수(`reviews/작업명.md`) → 수정을 사람 없이 진행할 수 있다.
- 왕복은 최대 3회. 넘으면 멈추고 사람에게 요약 보고.
- `mode: needs-review`, 이미지 에셋, 배포는 항상 사람 승인.
