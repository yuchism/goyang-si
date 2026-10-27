# 손님 코드 리팩터 · 버그 수정: characters.js · guests.js · chime.js

> 상태: **기획 (2026-10-27).** 아직 손대지 않음. 리팩터(2~6장)는 보이는 동작을 바꾸지 않고, 버그 수정(7장)은 따로 커밋한다.
> 관련: `BIRTHDAY_GUESTS_PLAN.md`(생일 손님), `HOURLY_CHIME_PLAN.md`(정각 손님), `tasks/refactor-halloween-chime.md`(2026-10-27 정리 ①~④)

## 1. 한 줄 요약

춤추는 손님들의 **캐릭터 설정(표·시트·그리기)** 을 새 파일 `characters.js`로 떼어 낸다. `guests.js`에는 **생일 파티 진행**만, `chime.js`에는 **정각 종 진행**만 남기고, 둘 다 `characters.js`를 본다. 정각 종이 생일 코드(`birthday.js`)를 거쳐 캐릭터를 가져오는 연결을 끊는다. 그 뒤 생일 파티 손님 뽑기의 버그 둘을 고친다(7장).

## 2. 지금 (2026-10-27 정리 뒤)

```
birthday.js ──▶ guests.js ◀── chime.js
                  │  ▲
                  │  └── assets.js (GUESTS·guestLoads·guestSrc)
                  └──▶ birthday.js (birthdayName — 이름 소환)
```

`guests.js` 한 파일에 두 역할이 섞여 있다.

| 역할 | 들어 있는 것 |
|---|---|
| 캐릭터 설정 (생일과 무관) | `GUESTS` 표(id·size·foot·h·rare·owner·halloween·glow), `kindOf`·`guestsOf`, `CELL_W`·`guestSrc`, 크기 계산 `CAT_DANCE_H`·`scaleOf`, `SMALL`·`BIG`, 그리기 `drawGuest`·`drawGuestSheet`, "짠" `puff`·`drawPuffs`·`POP_SEC`·`PUFF_SEC` |
| 생일 파티 진행 | `GUEST_CUES`·`GUEST_CUES_RATIO`·`COUNT`, 확률 `RARE_CHANCE`·`OWNER_CHANCE`·`HALLOWEEN_CHANCE`·`HALLOWEEN_BOTH`·`WRONG_WAY_CHANCE`, 이름 소환 `SUMMON`·`nameKey`, 뽑기 `pickGuests`(자리 `party.guests`), `guestsStart`·`guestsCue`·`guestsTick`·`guestsLeave`·`guestLayers`, 그림 받기 `guestLoads` |

문제:
- 정각 종(`chime.js`)이 캐릭터를 쓰려면 `guests.js`를 불러야 하고, `guests.js`는 `birthday.js`(`birthdayName`)를 부른다 → 정각 종이 생일 코드에 기댄다.
- 그림 받기 규칙이 생일 기준이다: 생일 링크면 전부(`assets.js`), 아니면 정각 종이 다음 손님 한 장만(`chime.js` `prefetch`) — 같은 일을 두 곳에서 다르게.
- 캐릭터 하나를 더하거나 고칠 때 볼 곳이 "생일 손님 파일"이라 이름과 역할이 안 맞는다.

## 3. 나눈 뒤

```
birthday.js ──▶ guests.js ──┐
                            ├──▶ characters.js ◀── assets.js
              chime.js ─────┘
```

### 3-1. `characters.js` (새 파일) — 손님 캐릭터 명부
생일도 정각도 모른다. 진행 모듈(birthday·guests·chime)을 부르지 않는다(assets·stage·sound·util 정도만).

| 옮겨 오는 것 | 메모 |
|---|---|
| `GUESTS` 표 → 이름은 그대로(`GUESTS`) | 열은 그대로: id·size·foot·h·종류 표시·glow |
| `kindOf`·`guestsOf` | 종류: common·rare·owner·halloween |
| `CELL_W`·`guestSrc`·`CAT_DANCE_H`·`scaleOf` | 시트와 크기 |
| `SMALL`·`BIG` | 자리 규칙에서 쓰는 크기 기준 |
| `drawGuest`·`drawGuestSheet` | 한 명 그리기 (p.t가 시계) |
| `puff`·`drawPuffs`·`POP_SEC`·`PUFF_SEC` | "짠" 연기 |
| (새) `guestImg(g)` · `loadGuest(g)` | `IMG['f_guest_' + id]`·`loadLazy` 감싸기. 지금 여러 곳에 흩어진 `'f_guest_' + id` 글자를 한 곳으로 |
| (새) `ready(g)` | 그림을 다 받았나 (`guests.js`·`chime.js`가 같이) |

### 3-2. `guests.js` — 생일 파티 손님만
남는 것: 등장 시각 표, 인원·확률, 이름 소환(`SUMMON`·`nameKey` — 생일자 이름이 필요하므로 여기), `pickGuests`, `guestsStart`·`guestsCue`·`guestsTick`·`guestsLeave`·`guestLayers`, 생일 링크 그림 받기(`guestLoads` → 3-4).
`characters.js`만 보고 캐릭터를 쓴다.

### 3-3. `chime.js` — 정각 종만
`guests.js` 대신 `characters.js`를 본다. 손님 풀(`pool`)·씨앗 뽑기·자리(`chime.guest`)·진행·할로윈 자정 빛은 그대로.

### 3-4. 그림 받기 (정할 것 — 8장)
- 지금 동작을 그대로 두는 안: `assets.js`는 생일 링크면 `GUESTS.filter(guestLoads)`를 나중 묶음에(지금처럼), 정각 종은 `loadGuest(g)`로 다음 손님만. 함수 이름만 `characters.js`로 모은다.
- (선택) 통일안: 모두 "필요할 때 한 장씩"(`loadGuest`). 생일 파티는 춤 시작 전에 뽑힐 손님을 미리 받아야 하므로 뽑기를 앞당겨야 한다 → 동작이 바뀌니 이번엔 안 함.

## 4. 바뀌지 않는 것
- 보이는 동작 전부: 파티 손님 구성·확률·자리, 정각 손님 뽑기 결과(시각 씨앗), 춤 박자, "짠" 효과, 할로윈 자정 빛.
- `birthday.js`가 부르는 함수 이름(`guestsStart`·`guestsCue`·`guestsTick`·`guestsLeave`)과 `main.js`의 `guestLayers`·`drawPuffs`.
- 강고양이 씨·쥐야쥐(배우 구조: `world.js` `mkActor`, `anim.js`, `steps.js`, `cat.js`, `behave.js`)는 이번 범위 밖. 손님과 구조가 달라 합치지 않는다.

## 5. 작업 순서
1. `characters.js` 만들기: 3-1의 것을 `guests.js`에서 그대로 옮기고, `guests.js`는 잠시 `export { … } from './characters.js'`로 다시 내보내 바깥이 안 깨지게
2. `chime.js`·`assets.js`가 `characters.js`를 직접 보게
3. `guests.js`의 다시 내보내기를 걷어 내고, `'f_guest_' + id` 글자를 `guestImg`·`loadGuest`·`ready`로
4. CODE.md 줄 고치기 (characters.js 더하고 guests.js·chime.js 설명 고침)
5. 단계마다 커밋
6. 리팩터가 끝나면 7장 버그 수정 (따로 커밋)

## 6. 확인
- `check_time`·`check_scene`·`check_behave --quick`
- 화면 점검(`visual_check.js`) 전후 같음 (`ui`·`long`은 알려진 흔들림)
- 정각 손님 씨앗 뽑기: 300개 시각의 결과가 전후 같음 (`__goyang.chimeGuestFor`)
- 파티 손님 뽑기: 할로윈 기간·11월 각 3,000번 돌려 손님별·종류별 비율이 전후 비슷함(무작위라 같을 수는 없음)
- 할로윈 자정 손님 빛: 고정 시계 장면으로 전후 같음
- 순환 import 없음 (AGENTS.md 6장: 모듈 맨 위에서 다른 모듈 값을 바로 쓰지 않는다)

## 7. 버그 수정 (리팩터 뒤, 따로 커밋 — 동작이 바뀜)

### 7-1. 파티 손님이 3명만 올 때가 있다
- **지금:** 인원은 4~5명이어야 하는데, 자리 규칙 때문에 빠진 손님의 자리를 아무도 채우지 않는다. 할로윈 기간 약 1.5%, 평소 약 0.4%의 파티가 3명(2026-10-27, 파티 뽑기 3,000번씩).
- **까닭:** 파티 자리 다섯(`party.guests`) 중 큰 손님(크기 1.1 이상: 캥거루·펠리컨·주인장 닮은 손님)이 설 수 있는 건 앞줄 두 자리뿐. 뒷줄(`back`)엔 큰 손님이 못 서고, 작은 자리(`small`)엔 0.8 이하만. 큰 손님이 셋 뽑히면 한 명이 조용히 빠진다. 할로윈 손님이 특별 손님으로 먼저 자리를 잡으면서 조금 늘었다.
- **고치기:** 자리를 다 정한 뒤 인원이 모자라면, 아직 안 뽑힌 보통 손님 중 남은 자리에 맞는 크기(작은 자리면 `SMALL` 이하, 뒷줄이면 `BIG` 미만)를 무작위로 채운다. 특별 손님 확률·손님 표·자리 규칙은 그대로.

### 7-2. 이름 소환 파티 + 할로윈이면 특별 손님이 자리보다 많을 수 있다
- **지금:** 이름 소환(주인장 셋이 꼭 옴) 파티가 할로윈 기간에 열리면 소환 셋 + 할로윈 손님(최대 둘) + 외계인까지 특별 손님이 자리(5)보다 많아질 수 있고, 가장 작은 특별 손님이 빠진다. 보통 손님도 최소 한 명은 넣으려다 늘 빠진다(`Math.max(1, …)`). 코드를 읽어 확인(이름은 해시라 직접 돌리지는 못함).
- **고치기:** 이름 소환 파티에선 할로윈 손님을 최대 한 명으로. 특별 손님이 자리 수 이상이면 보통 손님은 안 넣는다.

### 7-3. 확인
- 파티 뽑기를 할로윈 기간·11월 각 3,000번: 인원이 늘 4~5명, 손님별·종류별 비율은 전과 비슷
- 이름 소환은 `SUMMON`에 시험용 해시를 잠시 넣어 할로윈 기간에 돌려 보고 빼기 (저장소에 남기지 않음)
- `check_time`·`check_scene`·`check_behave --quick`, 화면 점검의 `party` 장면은 손님 구성이 달라질 수 있으니 눈으로 확인 (사람)

## 8. 정할 것
- **3-4 그림 받기:** 이번엔 이름만 모으기(추천) / 한 장씩으로 통일(동작 바뀜, 이번엔 안 함)
- 이 문서를 AGENTS.md 2장 "루트에 둔 열린 문서" 목록에 더할지
