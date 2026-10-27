# 호박머리 괴물 손님 스프라이트 작업 지시서 v1

> 상태: **받음, 검수 끝 (2026-10-27).** 원본 `guest-pumpkinhead-dance-v2.png`. 칸마다 발 높이가 726/694/691/710으로 달라 변환 때 맞춤(`make_guests.py` `ALIGN_FEET`) → foot 545, h 374. 빛 마스크는 눈·입·이만 걸리고 껍질은 안 걸림.
> 대상: 호박머리 괴물 × 춤 4칸 = **시트 1장(4칸)**
> 관련: `HOURLY_CHIME_PLAN.md` 6장(할로윈 자정 손님), `GUEST_SPRITE_PLAN.md`(**규격·춤 동작·룩앤필의 기준 — 이 문서는 다른 점만 적는다**), `HALLOWEEN_FIX_PLAN.md` 2-1(호박 불빛)
> 예제 그림: `assets/references/guest-dance-poses-v1.png`(춤 4동작), `guest-dance-template-v1.png`(시트 틀), 방의 호박 그림(할로윈 소품)

## 0. 이야기

할로윈 기간의 자정, 불 꺼진 방에 멀리서 종이 열두 번 울리는 동안 **호박머리 괴물**이 뿅 나타나 강고양이 씨와 같은 춤을 살랑살랑 추다가 뿅 사라진다. 어둠 속에서 호박 머리의 눈과 입만 촛불처럼 노랗게 빛난다. 무섭지 않고, 좀 웃기고, 좀 신비롭다. 왜 왔는지는 아무도 모른다.

## 1. 한눈에

| 항목 | 값 |
|---|---|
| 원본 파일 | `assets/birthday/guests/guest-pumpkinhead-dance-v1.png` |
| 키(템플릿 px, 발바닥 ~ 꼭지 끝) | **약 590** (강고양이 씨 560보다 조금 큼) |
| 한 줄 | 커다란 주황 호박 머리 + 짧은 몸. 눈·입은 뚫린 구멍, 꼭지와 잎이 꼬리 역할 |

## 2. 규격·춤 (GUEST_SPRITE_PLAN.md와 같음)

- 시트 2048×768, 가로 4칸(512×768), 투명 배경, 발 기준선 y = 730, 모든 부분이 자기 칸 안에.
- 춤 4동작 ①왼쪽 기우뚱 ②가운데 ③오른쪽 기우뚱 ④가운데 — `GUEST_SPRITE_PLAN.md` 2장 표 그대로.
- 꼬리가 없으므로 **꼭지·덩굴손·잎**이 꼬리 대신 흔들린다: ① 오른쪽 위로 휙, ② 오른쪽으로 말림, ③ 왼쪽으로 휙, ④ 뒤로 넘어가 거의 안 보임.

## 3. 생김새

- **머리:** 둥글넓적한 주황 호박, 세로 골이 몇 줄. 키의 **약 50%**(다른 손님 40%보다 크게 — 머리가 주인공). 꼭대기에 짧은 초록 꼭지 + 잎 하나 + 꼬불 덩굴손.
- **눈:** 뚫린 구멍인데 **윗변이 평평한 반달**(윗눈꺼풀이 덮인 강고양이 씨의 시큰둥한 눈을 구멍 모양으로). 눈동자는 없다.
- **입:** 이가 두세 개 남은 뚫린 웃는 입. 구멍 안에서 **분홍 혀**가 살짝 메롱(다른 손님과 같은 "메롱").
- **몸:** 짧고 작다(2등신). **짙은 보라 또는 짙은 갈색의 짧은 망토**(목에서 무릎 위까지), 아래로 짧은 다리. 망토 끝은 살짝 뾰족뾰족.
- **앞발:** 망토 밖으로 나온 **작은 장갑 손**(크림색), 다른 손님처럼 가슴 앞에 모은다.
- **모자:** 고깔모자 **안 씀**(생일 손님이 아니라 할로윈 손님). 꼭지와 잎이 모자 역할. *(파티에도 넣기로 하면 그때 고깔모자 판을 따로)*
- 룩앤필은 `GUEST_SPRITE_PLAN.md` 4장 그대로: 진한 갈색 굵은 외곽선, 평평한 색면, 그러데이션·광택·질감 없음, 따뜻하고 낮은 채도.

## 4. 눈·입 색 약속 (중요 — 코드가 빛을 넣는다)

코드(`halloween.js`의 호박 불빛 마스크)는 **밝은 노랑·연주황 픽셀(대략 R > 220, G > 150, B < 150)만** 골라 노란 촛불빛을 덧그린다. 그래서:

| 부분 | 색 | 이유 |
|---|---|---|
| 눈·입 구멍 안 | **밝은 노랑 한 가지** (예: `#FFD866`) | 이 색만 빛난다 |
| 호박 껍질 | **진한 주황** (예: `#E07A2E`, G가 150보다 확실히 낮게) | 껍질까지 빛나면 안 된다 |
| 혀 | 분홍 (예: `#E88A9A`) | 빛 마스크에 안 걸리게 B를 높게 |
| 껍질 밝은 쪽·하이라이트 | 쓰지 않거나 위 주황보다 어둡게 | 노랑에 가까운 밝은 주황은 같이 빛나 버린다 |

- 구멍 안은 그러데이션 없이 **평평한 노랑 한 색**. 불꽃·촛불은 그리지 않는다(빛과 깜빡임은 코드가).
- 받은 뒤 마스크를 뽑아 보고 껍질이 걸리면 색만 고쳐 달라고 한다.

## 5. 그리지 않는 것 (코드가 그린다)

"뿅" 연기·별가루, 바닥 그림자, 어둠·촛불빛·깜빡임, 좌우 반전.

## 6. 이미지 생성 도구로 그릴 때 (예시 프롬프트)

참고 그림으로 `guest-dance-poses-v1.png`와 `web/f/cat-birthday-dance-sheet-v1.png`를 같이 넣는다.

```
Reference: the attached cat dance sheet. Draw a NEW character in exactly the same art style:
thick dark-brown outlines, flat warm low-saturation colors, no gradients, no texture, no shine.

Character: a cute, slightly silly Halloween PUMPKIN-HEAD MONSTER. Its head is a big round
deep-orange pumpkin (about half its height) with a few vertical ridges, a short green stem,
one leaf and a curly tendril on top. Carved eyes are half-moon holes with a FLAT TOP edge
(sleepy, unimpressed look), no pupils. Carved grin with two or three teeth and a small pink
tongue sticking out. Fill the inside of every carved hole with ONE flat bright yellow
(#FFD866). The pumpkin skin must be a darker orange (#E07A2E), never light yellow-orange.
Small body (2 heads tall) in a short dark-purple cape with a jagged hem, short legs,
small cream gloved hands curled at the chest. No party hat.

Make a 4-frame dance sprite sheet, 2048x768, transparent background, four equal 512x768
cells side by side, feet on the same baseline near the bottom (y=730), every part inside
its own cell. Copy the cat's four poses in order:
1) whole body leans to the viewer's left, hands at chest, stem and leaf swing up to the right
2) stands straight, hands at chest, tendril curls to the right
3) mirror of pose 1: leans to the viewer's right, stem and leaf swing to the left
4) stands straight, hands at chest, leaf tucked behind, carved eyes look right
Add two or three small wiggle lines beside the feet like the reference.
No text, no shadow, no background, no candle or flame.
```

- 칸이 넘치거나 발 높이가 다르면 칸마다 따로(512×768 × 4장) 받아도 된다: `guest-pumpkinhead-dance-1of4-v1.png` …

## 7. 넣는 순서

1. 원본을 `assets/birthday/guests/guest-pumpkinhead-dance-v1.png`에 둔다
2. `python3 tools/make_guests.py pumpkinhead` → `web/sheet/guest-pumpkinhead-dance-v1.webp`, 출력된 `foot`·`h`를 `guests.js` `GUESTS` 표에 (할로윈 전용 표시와 함께)
3. 눈·입 빛 마스크를 뽑아 확인(4장)
4. 할로윈 자정으로 시각을 옮겨 방에서 확인 (`HOURLY_CHIME_PLAN.md` 11장)
