# APT_ART_GUIDE — 건너편 아파트 그림 다시 그리기 가이드

> 상태: v1.1 (2026-10-16). **v2 그림 받아 적용함(10장).** 웹용 그림·마스크·창 위치표는 코드 쪽에서 도구로 만든다.
> 관련: [WINDOW_PLAN_3.md](../../docs/plans/WINDOW_PLAN_3.md) 18장(창밖 그림 회의), [SCENE_PLAN.md](../../docs/plans/SCENE_PLAN.md) 4장(창 좌표), [APT_BACKDROP_PLAN.md](../../APT_BACKDROP_PLAN.md)(보류된 뒷판안)

## 1. 왜

예전 창밖은 산이 너무 사실적이라 방과 따로 놀았고, 아파트는 흐릿해서 붕 떠 보였다. 방 그림체(평평한 면, 맑은 색, 테두리)에 맞춰 아파트를 새로 그린다. 형식과 크기는 지금 그림과 **똑같이** 해서 코드는 거의 그대로 쓴다.

참고 그림:
- 지금 원판: `assets/room/window-apartments-day-night-v1.png`
- 창에 보이는 곳 표시: `assets/references/apt-position-guide-v1.png`
- 원하는 느낌(시안 화면): `assets/references/apt-lookfeel-mock-v1.png`

## 2. 형식

| 항목 | 값 |
|---|---|
| 파일 | PNG 한 장, `assets/room/window-apartments-day-night-v2.png` |
| 크기 | **2086 × 754** |
| 위 절반 (y 0~376) | **낮** |
| 아래 절반 (y 377~753) | **밤** — 낮과 **건물 위치·모양이 완전히 같은** 밤 버전 |
| 투명 | **하늘은 투명** (v2부터 기본). 하늘은 코드가 칠하고, 투명한 곳이 곧 마스크가 되어 무지개·번개·산이 건물 뒤로 들어간다. 건물은 바닥 줄까지 불투명하게 |

## 3. 창에 실제 보이는 곳

창은 그림의 가운데 일부만 보여 준다. 숫자는 각 절반 기준(원판 px). 밤 절반은 y에 377을 더한다.

| 구역 | 가로 x | 세로 y | 뜻 |
|---|---|---|---|
| 창 전체 | **731 ~ 1355** | **0 ~ 372** | 창틀 안에 들어오는 곳 |
| 잘 보이는 곳 | **793 ~ 1269** | 0 ~ 372 | 좌우 커튼에 안 가리는 곳. **중요한 것은 여기에** |
| 커튼에 가림 | 731~793, 1269~1355 | | 반쯤 보이거나 안 보임 |
| 난간 뒤 | | **281 ~ 376** | 베란다 난간 살 뒤라 반쯤 가림 |
| 여유분 | 0~731, 1355~2086 | | 지금은 안 보임. 그래도 이어지게 그려 둔다(나중에 창이 커지거나 화면이 바뀔 때) |

- 그림은 방에서 높이 330px로 줄여 창 가운데에 맞춰 그린다(원판 1px ≈ 방 0.875px). 그림 맨 위가 방 y 136, 맨 아래가 창 아래보다 4px 아래다.
- 시안처럼 **아파트 윗선은 난간(281)보다 조금 위**, 그 위로 숲과 산, 맨 위는 하늘이 보이게 하면 좋다.

## 4. 그림체 (시안 기준)

시안 방향이 맞다. 산은 방과 같은 그림체가 되었고(둥근 나무 덩어리, 단순한 바위 면, 맑은 색), 아파트는 또렷해서 흐릿하게 뜨지 않는다. 멀수록 선이 얇고 옅어지는 것도 좋다(방 물건 굵은 테두리 → 아파트 얇은 테두리 → 산은 거의 없음).

조금 더 다듬을 것:
1. **숲 색 한 단계 낮추기:** 연두·노랑이 방 안 색보다 채도가 높아 시선이 창밖으로 먼저 간다. 방이 주인공으로 남게 한 단계만 뺀다.
2. **바위 결 반으로:** 분홍 바위 봉우리의 결·음영이 숲보다 세밀하다. 반쯤 줄여 한 덩어리로.
3. **아파트 윗선 덜 일자로:** 숲과 만나는 선이 칼로 자른 듯 곧다. 옥상 난간·물탱크를 하나 두거나 동마다 높이를 조금씩 다르게.
4. **나무 크기:** 나무 한 그루가 아파트 한 층만 해서 숲이 아파트보다 가까워 보일 수 있다. 아파트 뒤 숲의 나무를 조금 작게.

## 5. 밤 그림

- 하늘은 짙은 남색, 건물은 어둡게. 낮 그림과 같은 자리·모양.
- **창은 반듯한 사각형, 단색**으로. 그라데이션·반사·커튼 무늬를 넣지 않는다. 코드가 밤 그림에서 창 칸을 **색으로 찾아** 불을 켜고 끈다 (`tools/map_windows.py`).
  - 불 켜진 창: 따뜻한 주황 (지금 그림은 약 `rgb(244, 183, 116)`)
  - 꺼진 창: 어두운 회남색 (지금 그림은 약 `rgb(74, 73, 87)`)
  - 켜진 창은 전체의 3분의 1쯤. 시각에 따라 코드가 더 켜고 끈다.
- 낮 그림의 창도 같은 자리에 같은 크기로.
- 아주 먼 뒤쪽 건물의 작은 창은 그림 그대로 두어도 된다(코드가 안 건드림).

## 6. 산을 같이 그릴까

| 방법 | 장점 | 단점 |
|---|---|---|
| **A. 이 한 장에 산·숲까지 같이** (시안 그대로) | 지금 코드로 바로 바꿀 수 있다 | 계절마다 산 색 바꾸기는 안 된다 |
| B. 산·숲은 따로, 아파트만 이 형식 | 계절(봄 꽃·가을 단풍·겨울 눈)을 바꿀 수 있다 (WINDOW_PLAN_3 3차) | 그림이 여러 장, 코드 작업이 더 있다 |

지금은 **A로 먼저** 하고, 계절은 나중에 B로 나눠도 된다. B로 갈 때는 산·숲 그림을 하늘 없이 투명 배경으로, 같은 2086 폭에 맞춰 따로 받는다.

## 7. 이미지 생성에 쓸 문장 (예시)

```
Flat cozy illustration, view through an apartment window in Goyang, Korea.
Wide horizontal strip, 2086x377. Top: clear soft blue sky. Back: rounded granite
mountain peaks with simple flat rock planes. Middle: lush forest of round tree
clumps and a few pine trees, slightly muted greens. Front-bottom: a row of
beige mid-rise apartment blocks with clean thin outlines, flat colors, evenly
spaced rectangular windows, a few rooftop details. No people, no text, no
perspective distortion, no blur, no gradient on windows. Same palette as a
warm hand-drawn cat room illustration with dark outlines.
```
밤: 같은 문장 끝에 `Night version of the exact same scene: deep navy sky, darker buildings, windows as flat solid rectangles, about one third warm orange lit, the rest dark grey-navy. Identical building positions.`

생성기가 2086×377을 바로 못 만들면 비율(약 5.5:1)만 맞춰 크게 만든 뒤 줄여서, 낮·밤을 위아래로 붙여 2086×754 한 장으로 만든다. **낮·밤 건물 위치가 어긋나지 않는 것**이 제일 중요하다(밤 그림은 낮 그림을 바탕으로 색만 바꾸는 방식이 안전).

## 8. 넘기기 전 확인

- [ ] 2086 × 754, 위 낮 · 아래 밤, 하늘 투명
- [ ] 건물이 바닥 줄까지 칠해져 있다
- [ ] 낮·밤 겹쳐 보면 건물 윤곽이 같다
- [ ] 잘 보이는 곳(793~1269)에 아파트·숲·산이 보기 좋게 들어온다
- [ ] 아파트 윗선이 난간(y 281)보다 조금 위
- [ ] 밤 창이 단색 사각형, 켜진 창 주황·꺼진 창 회남색
- [ ] 숲 채도가 방보다 튀지 않는다

## 9. 받은 뒤 코드 쪽에서 할 일

1. 원판에서 웹용 `web/r/apt_day.webp`·`apt_night.webp`(각 2086×377)를 만든다
2. `python3 tools/make_apt_mask.py` → 하늘을 뺀 마스크(무지개·번개가 건물 뒤로)
3. `python3 tools/map_windows.py --show` → 창 위치표 `web/r/apt_windows.json`, 확인 그림
4. 화면 점검(낮·밤·비·무지개·번개), 숲·건물 높이가 바뀌면 `window.json`의 `landscape`·`splashY`를 맞춘다

## 10. 받은 그림 v2 (2026-10-16)

`assets/room/window-apartments-day-night-v2.png` (2086×754). 그림체 좋음, 산 없이 아파트만(산은 따로, `MOUNTAIN_SPRITE_PLAN.md` 10장). 웹용으로 바꾸면서 맞춘 것 (원본은 그대로, `web/r/apt_*.webp`만):

1. **하늘이 투명**했다 → 가이드(하늘 칠하기)보다 낫다. 마스크를 따로 찾지 않고 그림의 투명도를 그대로 쓴다 (`tools/make_apt_mask.py`). 2장 형식을 투명 하늘 기본으로 고쳤다.
2. **밤 그림이 낮보다 46px 위에** 그려져 있었다(가로는 같음) → 밤 쪽을 46px 내려 윤곽을 맞춤(어긋남 0.3%). **다음 그림도 낮·밤을 겹쳐 확인할 것.**
3. **낮 그림 맨 아래 6줄이 비어** 있었다 → 바로 위 줄로 채움(창 아랫단 바로 위라 거의 안 보임). **건물은 바닥 줄까지 칠할 것.**

코드 쪽: 밤 하늘 덮개를 창 전체에 씌우게 고침(예전 그림은 하늘이 칠해져 있어 위쪽만 덮었다). 밤 창 위치표 다시 만듦(창 107개, 원래 켜짐 42개).

