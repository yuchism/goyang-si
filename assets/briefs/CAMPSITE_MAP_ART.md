# 에셋: 미스테리 캠핑장 — 동네 약도의 안개 낀 캠핑장 (CAMPSITE_MAP_ART)

> 상태: **지시서 씀 (2026-11-20) — 그림 기다림(주인이 ChatGPT로).** 티켓 `tasks/campsite-5-map-art.md`. 기획 `CAMPSITE_PLAN.md` 2장.
> 넣을 곳: 현관문·책장 지도책이 여는 동네 약도(`objects.json` `door.map`)의 **맨 위 가운데 빈 풀밭(C 터)**. 화풍 기준 `MANHWA_MAP_ART.md`.

## 1. 한 줄 요약

약도에 얹을 그림 **1장**: 안개에 반쯤 잠긴 작은 숲속 캠핑장. 누르면 안개가 짙어지며 픽셀 캠핑장(`/campsite/`)으로 넘어간다.

| 파일(웹) | 장면 | 원본 크기 | 배경 |
|---|---|---|---|
| `web/r/map/campsite-fog.webp` | 침엽수에 둘러싸인 작은 빈터 + 가운데 모닥불 + 앉는 통나무 셋, 전체를 덮은 옅은 안개 | **512×512** | 투명 (안개 가장자리는 투명으로 스르르 사라짐) |

**그림 속 글자 없음.** 「미스테리 캠핑장」(영어 "Mystery Campsite") 이름표는 코드가 그림 밖에 얹는다.

## 2. 화풍 (약도와 같게)

- 약도 바탕 `web/r/map/map-base.webp`, 이웃 그림 `web/r/map/shop-day.webp`(만화방)·`plaza-winter.webp`(광장)과 **같은 손그림**: 굵고 고른 짙은 먹색 외곽선, 부드러운 면 채색, 납작한 3/4 시점(위에서 비스듬히), 장난감처럼 작고 둥근 나무.
- 참고 그림(저장소 안, 그대로 첨부): `assets/briefs/campsite/map-now.png`(지금 약도 전체, 만화방·광장 얹은 모습), `map-top.png`(맨 위 가운데를 잘라 낸 것).
- **작게 보인다.** 약도 창에서 이 그림은 폰 약 70px, 데스크톱 약 130px 폭. 가는 선·작은 무늬는 뭉개지니 큼직한 덩어리로.

## 3. 그림 내용

- **빈터:** 둥근 흙빛 빈터. 가장자리를 짙은 초록 **침엽수**(뾰족한 전나무, 약도의 둥근 나무와 다르게 — "숲 깊은 곳" 느낌) 대여섯 그루가 반쯤 둘러쌈. 앞쪽(아래)은 트여서 길에서 들어가는 입구처럼.
- **모닥불:** 빈터 가운데 돌 둘레 안의 작은 모닥불. 불꽃은 작게, 안개 속에서 **주황빛이 은은하게 번지는** 느낌(밝게 번쩍이지 않게).
- **앉는 통나무 셋:** 불 둘레에 누운 통나무 세 개(캠핑장 안과 같음). **텐트·사람·동물·간판 없음.**
- **안개:** 그림 전체를 덮는 희고 옅은 회색 안개 띠 두세 겹. 나무 아랫부분과 빈터 가장자리가 안개에 잠겨 흐릿하게. 안개는 외곽선 없이 부드럽게, 그림 가장자리로 갈수록 **투명으로** 사라짐(약도 종이와 자연스럽게 섞이게).
- **분위기:** 약도의 다른 곳은 밝은 낮인데, 여기만 살짝 어둑하고 신비로운 기운(안개가 푸르스름한 회색, 나무 색이 한 톤 차분). 그래도 밤은 아님 — 하늘·달·별 없음. 무섭지 않게, 궁금하게.

## 4. 자리 (코드)

- 약도 1200×1200 기준, 맨 위 가운데 풀밭(대략 x 460~720 · y 85~285). 길이 이 풀밭 아래(약 x 590 · y 290)에서 끝난다 — **빈터 입구가 그림 아래 가운데**에 오게 그려 주면 길과 이어진다.
- 코드가 그림을 `box` 약 **[450, 20, 280, 280]**(왼쪽·위·폭·높이)에 얹고, 이름표를 그 아래 길 위 약 **(590, 315)** 에 둔다. 받은 그림을 보고 숫자를 맞춘다.
- 그림 512×512 안에서: 빈터 입구(아래 끝)는 **y 약 490**, 가로 가운데. 위·옆 여백은 안개만.

## 5. ChatGPT에 줄 말 (첨부: `map-now.png`, `map-top.png`)

```
Attached is a hand-drawn neighborhood map from my website (map-now.png) and a crop of its top-center area (map-top.png).
Please draw ONE new small illustration to place on the empty green lot at the top center of this map.

Subject: a tiny mysterious campsite deep in the woods, half-hidden in fog.
- A round dirt clearing with a small campfire in a ring of stones at the center, and three logs lying around it as seats.
- Five or six pointed fir trees (not the round trees of the map) partly surround the clearing; the front (bottom) is open like an entrance path.
- Soft pale blue-grey fog drifts across the whole scene in two or three bands, covering the bottom of the trees and the edges of the clearing.
- The campfire glows softly orange through the fog (subtle, not bright).
- Slightly dim and mysterious compared with the sunny map, but NOT night: no sky, no moon, no stars. Curious, not scary.
- No tent, no people, no animals, no signs, no text.

Style: exactly the same as the map — thick even dark outlines, soft flat colors with one light shadow tone, flat 3/4 top-down view, toy-like small trees. Big simple shapes (it will be shown very small, about 70–130 px wide).
Canvas: 512×512, transparent background. The fog fades out to transparent toward the edges (no hard border). The clearing's entrance is at the bottom center (around y = 490) so it can meet the map's path.
```

## 6. 받은 뒤 (Claude)

- 투명 가장자리·크기 확인, `web/r/map/campsite-fog.webp`로 줄여 저장.
- `objects.json` `door.map.shops`에 한 줄: `name: mapCampsite`, `href: /campsite/`, `gc: campsite`, `day: r/map/campsite-fog.webp`, `box`, `label` (i18n `mapCampsite`: 「미스테리 캠핑장」 / "Mystery Campsite"). `OBJECTS.md` 다시 만들기.
- 약도에서 누르면 안개가 짙어지며 캠핑장으로(티켓 5번). `/campsite/`의 `noindex` 뺌.
- 고칠 데가 보이면 코드로 깎지 않고 참고 그림을 잘라 다시 받는다(주인 원칙).
