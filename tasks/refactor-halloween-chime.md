# 오늘 급히 넣은 코드 정리: 생일·정각 손님, 정각 종, 마녀의 집, 거미
- status: done
- mode: needs-review
- brief: (그림 없음)
- assets: (없음)
- related-adr: (없음)
- 출처: 회의 2026-10-27 (AGENTS.md 9장 리팩터 후보 16개 → 주인 승인 "순서대로")

## ① 버그 (동작이 바뀜)
- [x] 4. 마녀의 집 창 불 꺼짐·켜짐이 화면 주사율을 따라감(장면마다 0.02) + 그리기 함수 안에서 상태를 바꿈 → 초 단위로, 진행은 tick에서
- [x] 7. 거미가 미리보기 배속(bf)을 안 따라감 → 다른 사건처럼
- [x] 11. 정각 종이 울리는 중 시간 점프·탭 복귀(점프)해도 손님이 남음 → 점프면 손님 보내고 종 진행 끝
- [x] 12. 탭이 가려지면 춤(화면 시계)과 소리(오디오 시계)가 어긋남 → 소리가 울리는 종은 오디오 시계로 진행

## ② 손님 (동작 그대로)
- [x] 1. 손님 풀이 파티(`pickGuests`)·정각(`chime.js pool`)에 따로 → `guests.js`에 "어디에 나오나" 한 곳
- [x] 2. 작은 손님 기준 0.8이 두 곳(`SMALL`, `spotFor`) → 하나
- [x] 3. 노란 픽셀 빛 마스크가 두 벌(`halloween.js pumpkinMask`, `chime.js maskOf`) → 하나
- [x] 13. 눈이 빛나는 손님 목록(`chime.js GLOW`) → `GUESTS` 표 `glow: true`
- [x] 14. 안 쓰는 `run.force`, 낡은 주석("고양이 탑")

## ③ 할로윈 (동작 그대로)
- [x] 5. `drawWitchTower` 90줄 → 봉우리·집·창 불빛·박쥐로 나누고 모양 비율은 표 하나
- [x] 6. "마녀가 나가 있나"가 두 곳 → `witchOut()`
- [x] 8. 거미줄을 거미 사건에서 떼어 따로
- [x] 9. "지금 할로윈인가"가 여러 모양 → `time.js` 함수 하나
- [x] 10. `halloween.js` 580줄 → 마녀의 집·거미를 새 파일로

## ④ 자잘한 것
- [x] 15. `Snd.prepChime()`이 다 받은 뒤에도 매 장면 목록을 돎 → 다 받았으면 바로 빠짐
- [x] 16. `HOURLY_CHIME_PLAN.md` 4-2장 옛 숫자 → 13·14장이 최신이라고 표시

## 확인
- 묶음마다: `check_time`·`check_scene`·`check_behave --quick`
- ②③④: 화면 점검(`visual_check.js` 전후 → `compare.py`)이 같아야 한다. ①은 달라진 장면만 눈으로
- (사람) 배포 뒤: 할로윈 밤 마녀의 집 창이 마녀가 지나갈 때 천천히 꺼졌다 켜지는지, 정각 종 중 시간 점프하면 손님이 사라지는지

## 메모
- ①: 탑 창 불은 `towerTick`(0.8초에 다 꺼지고 켜짐). 거미 확률은 `real*bf`, 움직임은 `real*min(bf,3)`(나비와 같음). `Snd.chime`이 `{ t0, stop() }`을 돌려주고, 정각 종 진행 시계는 오디오가 돌고 있으면 `ac.currentTime - t0`(소리를 끄면 화면 시계로). 점프하면 손님 뿅 + 종소리 끊음. `run.force`는 여기서 뺐다(14번 일부). 확인: 브라우저로 종 중 3시간 점프 → 손님 사라지고 종 끝남, 진행 시계가 오디오 시계와 같음. check_time·check_scene·check_behave --quick 통과
- ②: `guests.js` `kindOf`·`guestsOf(...)`(common·rare·owner·halloween)로 파티·정각 풀을 한 곳에서. `SMALL`을 내보내 정각 자리도 같이. 빛 마스크는 새 파일 `glow.js` `glowMask(im)`(그림별 캐시) — 호박·할로윈 자정 손님이 같이. `GUESTS` 표 `glow: true`(마녀·호박머리). 낡은 주석("고양이 탑") 고침. 확인: 정각 손님 300시각 뽑기 결과가 전과 같음(해시 같음), 할로윈 자정 호박머리 눈 빛남. 화면 점검: ui(알려진 흔들림), long_1·long_2 다름 — long은 같은 코드로 두 번 찍어도 long_2가 달라지는 흔들리는 장면(60배속 무작위 행동)이라 판단. check_time·check_scene·check_behave --quick 통과
- ③: 새 파일 `halloween-extra.js`(마녀의 집 `towerEvent` · 구석 거미줄 `webEvent` · 천장 거미 `spiderEvent`) — `halloween.js`는 580 → 367줄. 마녀의 집은 `spireOf`·`drawSpire`·`drawHouse`·`drawHouseLight`·`drawTowerBats`로 나누고 모양 비율은 `TOWER` 표(spire·house). `halloween.js` `witchOut()`(하늘 자리·집 창 불이 같이), `drawBat`·`zig` 내보냄. `time.js` `isHalloween(d)` 하나로(halloween.js·guests.js·sprites.js·weather.js·objects.js). CODE.md에 chime.js·glow.js·halloween-extra.js 줄. 확인: 할로윈 밤·낮 장면(마녀의 집·거미·유령 쥐야쥐)을 고정 시계로 찍어 전후 같음(0개 다름), 전체 화면 점검은 long_2(흔들림)만 다름. check_time·check_scene·check_behave --quick 통과
- ④: `Snd.prepChime` — 다 받았으면(`chimeDone`) 바로 빠짐(녹음 두 개 받고 풀리는 것 확인). `HOURLY_CHIME_PLAN.md` 4-2장 머리에 "처음 기획 숫자, 지금 값은 CHIME 표·13·14장" 표시. check_time·check_scene·check_behave --quick 통과
- 알게 된 것: 화면 점검 `long` 장면(60배속)은 같은 코드로 두 번 찍어도 `long_2`가 달라지는 흔들리는 장면이다(`ui`처럼). 알려진 흔들림 목록(AGENTS.md 8장, tasks/visual-check-ui-flake.md)에 더할지 주인에게 물을 것
- 할로윈 장면은 화면 점검(`visual_check.js`) 날짜(10/13)에 안 걸려서, 고정 시계로 할로윈 밤·낮을 찍는 임시 장면으로 전후를 비교했다(저장소에 넣지 않음). 넣을지 주인에게 물을 것

## 리팩터 후보 (AGENTS.md 9장, 이번 작업 끝)
- `chime.js` `startChime`의 손님 정하기 한 줄이 길다(점검용 pick · RM · 만득 씨 · 밤 · 할로윈). 작은 함수 `chimeGuestNow(d, hw, pick)`로 뺄 만하다
- `halloween-extra.js` 거미 그리기(다리·몸)도 숫자가 코드에 섞여 있다. 거미가 더 쓰이면 `SPIDER` 표로
- `world.chimeGlow`처럼 모듈 사이를 `world` 깃발로 잇는 곳이 늘고 있다(chime → 마녀의 집). 더 생기면 작은 "지금 상태" 함수로 바꿀 것

