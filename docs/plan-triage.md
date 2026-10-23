# 플랜 문서 분류 목록 (ADR 후보 / 티켓 후보)

> 상태: **분류만 함 (2026-10-24, Claude).** 문서는 아직 옮기거나 고치지 않았다. ADR 작성·티켓 만들기·문서 이동은 승인 뒤에 한다.
> 기준: `ai-workflow-principles.md` 7장 1단계. 대상: 루트의 `*_PLAN.md`·`*_GUIDE.md` 등 37개 (`AGENTS`·`CLAUDE`·`CODE`·`OBJECTS`·`ASSET_LICENSE` 제외).

## 1. 문서 상태 한눈에

| 묶음 | 문서 | 앞으로 |
|---|---|---|
| **끝남 (구현·배포)** | BIRTHDAY_GUESTS, BIRTHDAY_LINK, BOOKSHELF, CLOCK, ENGLISH, FIREWORKS, FRAME_PHOTOS, HALLOWEEN, HALLOWEEN_FIX, LOAD, MOBILE, MOON, SCENE, STABILITY, TIME_BASE, TV_CHANNEL, TV_SCHEDULE, TV_SHELF, TV_STABILITY, WINDOW, WINDOW_PLAN_3 | 결정은 ADR로 뽑고(2장), 남은 일은 티켓 후보로(3장), 문서는 보관 |
| **그림 지시서 (끝남)** | APT_ART_GUIDE, CAT_SPRITE, EFFECT_ASSET, FISH_SPRITE, GUEST_SPRITE, LASER_SPRITE, MOUNTAIN_SPRITE, MOUSE_SPRITE, ROOM_ASSET, TV_PROGRAM_ASSET, WHEEL_SPRITE, WINDOW_SPRITE, YARN_SPRITE | 새 자리 `assets/briefs/`로 옮길 후보. 공통 그림 원칙만 ADR로 |
| **미결 · 보류** | CABINET, CARRY ("정리된 방" 논의 중), APT_BACKDROP (보류) | 회의 안건 (3-1) |
| **방향만 정함** | CAT_PLAY | 상태 줄이 낡음 (3-4). 결정은 ADR로 |
| **구상 중** | CAT_INC_IDEAS | 지시서가 아님. 그대로 둔다. 11장 "ADR로 처음 옮길 결정 목록"을 이 문서가 채운다 |

## 2. ADR 후보

여러 기능에 걸치는 구조·정책 결정만 골랐다. 기능 하나 안의 결정(예: 손님 키 B안, 액자 하루 한 장)은 그 플랜에 남겨도 된다.
"AGENTS" 칸이 ○면 규칙은 이미 AGENTS.md에 있고, ADR은 "왜 그렇게 정했나"를 남기는 역할이다.

### 시간
| # | 결정 | 출처 | AGENTS |
|---|---|---|---|
| A1 | 시간은 세 종류(자연·생활·방송)이고, 시간 판단은 `time.js`·`calendar.js`에서만. 검사는 `check_time.mjs` | TIME_BASE 3·9장 | ○ |
| A2 → [0001](adr/0001-지역-기준-계절-달-명절.md) | 계절은 방문자 지역 기준(남반구는 풍경 날짜를 반년 민다), 달은 한국 기준 고정 | TIME_BASE 3장, MOON 6장, WINDOW_PLAN_3 2장 (CLOCK 11장의 질문을 닫음) | |
| A3 → [0002](adr/0002-밤은-해-기준.md) | "밤"은 해 기준. 해 시각은 날짜별 코사인 곡선(계절 경계 계단 없앰) | TIME_BASE 3·12장, WINDOW_PLAN_3 4-3 | |
| A4 | "언제 일어나나"는 날짜·시각으로 계산(날짜 씨앗), 저장하지 않는다 | WINDOW 2장, WINDOW_PLAN_3 2장 | ○ |
| A5 → [0003](adr/0003-해와-달은-창-오른쪽에서-오르내린다.md) | 해·달은 창 오른쪽 아래↔위로만 오르내린다. 낮달 없음, 모양만 실제 날짜 | WINDOW_PLAN_3 17장 (MOON 8장의 "위상대로 뜨기"를 대체) | |

### 장면·행동
| # | 결정 | 출처 | AGENTS |
|---|---|---|---|
| A6 | 좌표·자리는 장면 설정(`scenes/room/*.json`)에. 걷는 바닥은 하나, 캐릭터는 몸 반폭만 가진다 | SCENE 2·3장 | ○ |
| A7 | 장소가 없으면 기능도 없다(대체 장소 만들지 않음), `needs`·`has()`, 검사는 `check_scene.mjs` | SCENE 7장 | ○ |
| A8 | 행동 성격표(`behave.js` `BEHAVIOR`: TV·유령·창밖 끼어들기)와 "새 행동은 표에 항목 추가" | CAT_PLAY 2장, WINDOW 14장, STABILITY 9장 | ○ |
| A9 → [0004](adr/0004-놀이는-드물게-레이저만-방문자가.md) | 놀이: 고양이가 시작하는 놀이는 드물게, 방문자가 시작하는 건 레이저만. 끌고 나오는 물건은 한 번에 하나, 만득 씨 오면 정리 | CAT_PLAY 2장, CARRY 2장 | 일부 |
| A10 | 오류 칸막이(`guard.js`)·되돌리기(`recover.js`)·놀이 `abort()`, 시작 실패 안내 | STABILITY 3·6·9장 | ○ |

### TV
| # | 결정 | 출처 | AGENTS |
|---|---|---|---|
| A11 → [0005](adr/0005-tv는-강고양이-씨의-tv.md) | TV는 강고양이 씨의 TV. 직접 그린 루프만(유튜브 안 씀), 방송은 고양이와 상관없이 흐르고 같은 시각엔 누구나 같은 방송 | TV_CHANNEL 2장 | |
| A12 | 프로그램은 데이터(`programs.json`). 코드는 이름이 아니라 성질을 보고, 반응은 프로그램이 고르고 고양이가 실행 | TV_STABILITY 3·3-1 | ○ |
| A13 → [0006](adr/0006-tv-편성-규칙.md) | 편성 규칙: 조건 우선순위 기간 > 시각 고정 > 자유, 조건 토큰 한글, 3개월 개편, 낮잠 정파 | TV_SCHEDULE 4·7장 | |

### 화면 밖·배포
| # | 결정 | 출처 | AGENTS |
|---|---|---|---|
| A14 → [0007](adr/0007-홈-화면-앱과-오프라인.md) | 홈 화면 앱(PWA)·오프라인 유지. 홈 화면 이름 Kitty Kang, 사이트 이름 고양.시 | MOBILE 4·8장 | |
| A15 → [0008](adr/0008-시작-묶음과-나중-묶음.md) | 처음 열 때는 시작 묶음만 기다리고, 나머지는 나중 묶음(그래도 결국 전부 받아 오프라인 유지) | LOAD 2·3장 | |
| A16 → [0009](adr/0009-미리보기-도구는-dev에서만.md) | 미리보기 도구는 `?dev=1`일 때만 보인다 | MOBILE 13장 | |
| A17 → [0010](adr/0010-방-밖-ui는-위-줄과-설정-책.md) | 방 밖 UI: 위 줄만 두고(📖 포함) 아래 줄은 없앰, 설정은 책장의 설정 책, 소리 기본 켜짐 | MOBILE 14장 | |
| A18 | 언어: 브라우저 언어로 시작, KO/EN 전환, 글자는 `i18n.js`, 그림에 글자 없음 | ENGLISH 3장 | ○ |
| A19 | 배포 전 검사 자동화(`pages.yml`), 회귀 기준은 승인받았을 때만 다시 뽑음 | STABILITY 5·9장, TIME_BASE 13장 | ○ |

### 세계관·그림
| # | 결정 | 출처 | AGENTS |
|---|---|---|---|
| A20 | 만득 씨는 말풍선으로만, 손님·물건 출처는 설명하지 않음 | BIRTHDAY_GUESTS 3장, CAT_PLAY 2장 | ○ |
| A21 | 소리는 소리 회의 전까지 자막만, 소리 난 자리에 띄운다 | WINDOW 2장, WINDOW_PLAN_3 2장 | ○ |
| A22 → [0011](adr/0011-스프라이트-원칙.md) | 스프라이트 원칙: 같은 바닥선·기준점, 이동은 코드, 왼쪽 보는 그림만(뒤집기는 코드), 느린 재생 | CAT_SPRITE 제작 원칙, LASER 2장 | |
| A23 → [0012](adr/0012-창밖은-층으로-산은-모양-하나에-색-넷.md) | 창밖은 층으로(하늘·산·건물 따로, 아파트 마스크), 산은 두 겹·모양 하나에 색만 넷 | WINDOW_PLAN_3 2장, MOUNTAIN 2장 | |

## 3. 티켓 후보 (남은 일)

### 3-1. 회의가 먼저 필요한 것 (티켓 전)
| 안건 | 출처 | 메모 |
|---|---|---|
| "정리된 방": 수납장(인벤토리) vs 끌고 나오는 물건 | CABINET 3장 (열린 질문 6개), CARRY | 둘 중 하나는 폐기될 수 있음 |
| 창밖 그림 다시 그리기: 산·아파트 한 번에, 단순함 정도, 창 지도, 디자인 기준 문서 | WINDOW_PLAN_3 18장, APT_BACKDROP(보류), APT_ART_GUIDE | 그림은 사람 일. APT_ART_GUIDE 10장에 v2 적용 기록이 있어 18장과 어디까지 겹치는지 먼저 확인 |
| 영어 호칭 "씨" (a/b/c), 5장 이름표 | ENGLISH 8장 | 구현에서 무엇으로 했는지 확인해 닫기만 하면 될 수도 |
| 크리스마스·제야에도 `through: 'night'`? | TIME_BASE 12장 | 작음 |
| 소리 회의 (고양이·동네·날씨) | WINDOW 2·10장, WINDOW_PLAN_3 2장 | 여러 문서가 미뤄 둔 큰 안건 |

### 3-2. 바로 티켓으로 만들 수 있는 것
| 후보 | 출처 | 메모 |
|---|---|---|
| 창빛 색을 방에 물들이기 · 커튼 가중치 | SCENE 6장 | 보이는 동작이 바뀜. 구조는 이미 있음 |
| JS 묶기 / `modulepreload` | LOAD 7장 | `pages.yml`이 바뀌는 일이라 사람 승인 |
| Google Fonts가 첫 그리기를 막는 것 | LOAD 7장 | |
| 그림 안 기준점(`TV_HEAD`·`ROD_TIP`·`G`·`SHELF_BOARD` …)을 `meta.json`으로 | SCENE 8장 | 리팩터 후보, 승인 후 |
| 기본 사물(스탠드·문·TV)이 없는 장면 지원 | SCENE 7장 "아직" | 새 장면을 실제로 만들 때 |
| visual_check `ui` 흔들림 | (이미 티켓) `tasks/visual-check-ui-flake.md` | STABILITY 9장에 비슷한 흔들림을 "한 장면 더 그리기"로 고친 기록이 있다. 원인 찾을 때 참고 |

### 3-3. 아이디어 백로그 (언젠가)
- 창밖 2차: 유리 앞 강고양이 씨 자리(유리 톡·코 대기·검은 고양이와 마주 앉기), 특별 손님(앵무새·독수리), 까치 이야기, 유성우, 안개·바람 — WINDOW 10장, WINDOW_PLAN_3 14장
- 창밖 4차: 만득 씨 베란다 살림(화분·빨래 건조대), 11월 하순 비를 눈으로, 산 계절 중간 그림 — WINDOW_PLAN_3 14장
- 달: 달빛 조각, 추석·대보름 큰 달, 그믐 밤 별 — MOON 8장
- 방 안 날짜·시계 표시(일력, TV 구석 시계, 벽시계) — CLOCK 11장
- 네이티브 앱·웹 푸시·맥 화면보호기 — MOBILE 9장
- 책 손그림(`look`)·고양이책 자리에 진짜 메뉴 — BOOKSHELF 6장
- 짧은 TV 프로(광고·막간) 늘리기 — TV_SCHEDULE 7장 6번
- 생일 날짜 맞추기, 불꽃 손그림 실루엣 — BIRTHDAY_LINK 3장, FIREWORKS 2장

### 3-4. 문서 정리 (작은 일) — **끝 (2026-10-24)**
- ✓ `CAT_PLAY_PLAN.md` 상태 줄 "나머지는 그림 준비 전"이 낡음 — 낚시·쳇바퀴·실뭉치 모두 적용 완료(FISH·WHEEL·YARN)
- ✓ 3번째 줄에 `> 상태:`가 없는 문서: CAT_SPRITE, EFFECT_ASSET, MOUSE_SPRITE, ROOM_ASSET (AGENTS.md 2장 규칙)
- ✓ `TV_CHANNEL_PLAN.md` 10장 4번(1차 장르 5개 확정)이 열린 채로 남음 — 구현 완료라 닫기만
- ✓ 끝난 플랜 22개 → `docs/plans/`, 그림 지시서 13개 → `assets/briefs/` (`git mv`, 마크다운 링크 3곳 고침). 루트엔 열린 문서만

## 4. 다음에 정할 것
1. ADR 번호·파일 이름 규칙 (예: `docs/adr/0001-시간은-세-종류.md`) — CAT_INC_IDEAS 11장과 같은 질문
2. 2장에서 실제로 옮길 것 (전부 / ○ 없는 것부터 / 몇 개만 시범)
3. 3-2에서 티켓으로 만들 것, 3-4 문서 정리를 한 번에 할지
4. ~~끝난 플랜·그림 지시서를 옮길지~~ → 옮김 (3-4)
