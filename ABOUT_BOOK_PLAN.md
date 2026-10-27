# 설명책 문구 더하기 (정각 종 · 생일 축하 방송)

> 상태: **지시서 (2026-10-27).** 아직 구현 안 함. 고양이 사무실 시험용 작은 일감.
> 관련 문서: `docs/plans/BOOKSHELF_PLAN.md` 4장(설명책 처음 문구 — 끝난 기록이라 고치지 않는다), `HOURLY_CHIME_PLAN.md`(정각 종·손님), `docs/plans/BIRTHDAY_LINK_PLAN.md`(TV 축하 방송 신청)

## 1. 한 줄 요약

책장의 설명책에 **정각 종**과 **생일 축하 방송 신청** 이야기를 한 줄씩 더한다. 둘 다 이미 방에 있는 볼거리인데 설명책에는 빠져 있다.

## 2. 왜

- 설명책은 이 방의 볼거리를 살짝 귀띔하는 책이다(BOOKSHELF_PLAN.md 4장).
- 정각 종·정각 손님(2026-10-27 구현)과 TV 편성표의 「📮 축하 방송 신청하기」는 모르면 지나치기 쉽다.

## 3. 정해진 것

| 항목 | 결정 |
|---|---|
| 정각 종 | **시간 문단**(둘째 문단)의 "계절이 바뀌어요." 다음 줄에 넣는다 |
| 생일 축하 방송 | **TV 문단**(셋째 문단) 끝에 넣는다 |
| 말투 | 소문·수수께끼 말투. 손님이 누구인지·왜 오는지는 설명하지 않는다(AGENTS.md 7장) |
| 겹침 피하기 | "누군지는 아무도 몰라요"는 정각 쪽에만. 생일 쪽은 "손님들이 우르르" |
| 안 적는 것 | 불 꺼진 밤엔 손님이 안 오는 것, 할로윈 자정 손님 — 귀띔만 한다 |
| 문단 수 | 그대로 다섯 문단. 새 문단을 만들지 않는다 |

## 4. 문구

굵은 줄이 새로 더하는 줄이다. 나머지는 지금 그대로.

### 한국어

이 방은 진짜 시간을 따라 살아요.
아침이 오고 밤이 오고, 계절이 바뀌어요.
**정각마다 먼 데서 종이 울려요. 그때 누가 잠깐 들러 춤추고 간다는데, 누군지는 아무도 몰라요.**
가끔은 창밖에 이상한 풍경이 펼쳐지기도 해요.
산타도 지나가고, 마녀도 날아간다는 소문이 있어요.

강고양이 씨의 TV는 하루 종일 방송 중이에요.
편성표가 생각보다 복잡해요. 주말엔 명화도 해요.
**생일 축하 방송도 신청할 수 있어요. 그날은 손님들이 우르르 와서 같이 춤을 춰요.**

### English

The room runs on real time.
Mornings come, nights come, seasons change.
**Every hour, a bell rings somewhere far away. Someone drops in to dance while it rings. Nobody knows who.**
And sometimes something strange drifts past the window.
Rumor has it Santa passes by. A witch, too.

Kitty Kang's TV is on all day.
The schedule is more complicated than you'd think. There's even a weekend movie.
**You can even request a birthday broadcast. On the day, a whole crowd of guests shows up to dance.**

## 5. 건드릴 곳

- `web/js/i18n.js` `aboutBook` — `ko`·`en` 배열의 둘째·셋째 문단(문단 안 줄바꿈은 `\n`)
- 다른 파일은 고치지 않는다. `BOOKSHELF_PLAN.md`는 끝난 기록이라 그대로 둔다(이 문서가 새 문구의 기준).

## 6. 완료 기준

- [ ] `aboutBook.ko`·`aboutBook.en`이 4장 문구와 글자 하나까지 같다(굵은 표시 제외)
- [ ] 두 배열 모두 문단 다섯 개 그대로
- [ ] 노드 점검: `node --input-type=module -e "await import('./tools/node_env.mjs'); const {STR}=await import('./web/js/i18n.js'); const a=STR.aboutBook; if(a.ko.length!==5||a.en.length!==5||!a.ko[1].includes('정각마다')||!a.en[2].includes('birthday broadcast')) process.exit(1)"` 이 성공
- [ ] (사람) 로컬 실행 → 책장의 설명책 펼치기 → 한국어·영어(상단 언어 바꾸기)에서 새 줄이 제자리에 보이고, 휴대폰 세로 화면에서도 글이 잘리지 않는다

## 7. 구현 메모

(구현하며 달라진 점을 여기에)
