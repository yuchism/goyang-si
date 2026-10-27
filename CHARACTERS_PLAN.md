# 손님 캐릭터 나누기: characters.js · guests.js · chime.js

> 상태: **기획 (2026-10-27).** 회의에서 나온 리팩터 계획. 아직 손대지 않음. 보이는 동작은 바꾸지 않는다.
> 관련: `BIRTHDAY_GUESTS_PLAN.md`(생일 손님), `HOURLY_CHIME_PLAN.md`(정각 손님), `tasks/refactor-halloween-chime.md`(2026-10-27 정리 ①~④)

## 1. 한 줄 요약

춤추는 손님들의 **캐릭터 설정(표·시트·그리기)** 을 새 파일 `characters.js`로 떼어 낸다. `guests.js`에는 **생일 파티 진행**만, `chime.js`에는 **정각 종 진행**만 남기고, 둘 다 `characters.js`를 본다. 정각 종이 생일 코드(`birthday.js`)를 거쳐 캐릭터를 가져오는 연결을 끊는다.

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
생일도 정각도 모른다. 다른 게임 모듈을 부르지 않는다(assets·stage·sound·util 정도만).

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

### 3-4. 그림 받기 (회의에서 정할 것 — 7장)
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

## 6. 확인
- `check_time`·`check_scene`·`check_behave --quick`
- 화면 점검(`visual_check.js`) 전후 같음 (`ui`·`long`은 알려진 흔들림)
- 정각 손님 씨앗 뽑기: 300개 시각의 결과가 전후 같음 (`__goyang.chimeGuestFor`)
- 파티 손님 뽑기: 할로윈 기간·11월 각 3,000번 돌려 손님별·종류별 비율이 전후 비슷함(무작위라 같을 수는 없음)
- 할로윈 자정 손님 빛: 고정 시계 장면으로 전후 같음
- 순환 import 없음 (AGENTS.md 6장: 모듈 맨 위에서 다른 모듈 값을 바로 쓰지 않는다)

## 7. 아직 안 정한 것
- **3-4 그림 받기:** 이번엔 이름만 모으기(추천) / 한 장씩으로 통일(동작 바뀜)
- **"어디에 나오나"를 적는 방식:** 지금처럼 종류(`kindOf`)로 두기(추천, 이번 범위) / 캐릭터마다 출연처를 직접 적기(`appears: { party, chime, midnight }`) — 출연처가 더 늘면 다시 보기
- **캐릭터에 더 적을 것:** 이름(한/영)·한 줄 소개·분장 여부. 지금 쓰는 곳이 없어 이번엔 안 함. 손님 세계·도감 같은 게 생기면 그때(게임은 고양시 밖 다른 저장소로 하기로 함, 2026-10-27 회의)
- **같이 고칠지:** 파티 손님이 자리 규칙 때문에 3명만 오는 경우(할로윈 약 1.5%, 평소 약 0.4%) 빈자리 채우기, 이름 소환 파티의 할로윈 손님 최대 한 명 — 동작이 바뀌는 일이라 이 리팩터와 따로 하는 것을 추천
- 이 문서를 AGENTS.md 2장 "루트에 둔 열린 문서" 목록에 더할지
