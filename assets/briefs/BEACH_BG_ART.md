# 에셋: 미스테리 해변 배경 + 캠핑장 오솔길 입구 (BEACH_BG_ART)

> 상태: **지시서 씀 (2026-11-26) — 그림 기다림(주인이 ChatGPT로).** 기획 `BEACH_PLAN.md` 4장.
> ChatGPT가 레포를 볼 수 있음 — 아래 프롬프트는 레포 경로로 참고 그림을 가리킴(못 보면 첨부).

## 1. 만들 것 (3장)

| 파일(원본) | 쓰는 곳 | 크기 | 배경 |
|---|---|---|---|
| `beach-bg-far.png` | 해변 먼 겹: 왼쪽 곶, 먼 작은 섬들 | 1536×1024 | 투명 |
| `beach-bg-near.png` | 해변 가까운 겹: 왼쪽 바위·갯풀, 오른쪽 유목·갯풀, 가운데 비움 | 1536×1024 | 투명 |
| `campsite-bg-near-back.png` | 캠핑장 가까운 숲의 **뒤쪽 절반**: 숲 사이 오솔길 입구(팻말·작은 등불) | 1536×1024 | 투명 |

## 2. 해변 두 장 — 공통

- **캠핑장과 같은 픽셀아트**(먼 산 `web/campsite/bg-far-v1.png`, 가까운 숲 `web/campsite/bg-near-v1.png`). 받은 뒤 2px 격자로 줄임.
- **정면 고정 장면**(360도 아님): 양 끝이 이어질 필요 없음. 그림이 화면보다 조금 넓어 좌우로 살짝 고개를 돌림.
- **빛은 코드가 칠함**: 해변은 3분 동안 해돋이·해넘이로 하늘 색이 계속 바뀜 → 그림은 **색을 거의 빼고 명암만**(차분한 회청색 4~6단계)으로. 코드가 시간대 색을 곱해 물들임.
  - 해가 있는 쪽(가운데)을 향한 가장자리에만 아주 옅은 밝은 테두리.
- **넣지 않음**: 하늘, 해, 달, 별, 바다·파도, 모래사장 가운데, 병, 배, 새, 사람, 모닥불, 글자. (모두 코드)
- 배치 참고: `assets/briefs/beach/beach-far-layout.png`, `beach-near-layout.png`.

## 3. 캠핑장 오솔길 입구

- 지금 캠핑장 가까운 숲(`web/campsite/bg-near-v1.png` — 앞 절반 384 + 뒤 절반은 숲을 이어 붙여 채운 것)의 **뒤 절반을 이 그림으로 바꿈**. 양 끝은 숲이라 앞 절반의 숲과 이어져야 함.
- 가운데: 숲 사이로 들어가는 좁은 오솔길, 길가에 기울어진 나무 팻말(글자 없음) 하나, 말뚝에 걸린 작은 등불 하나. 등불의 따뜻한 빛 번짐은 코드가 깜빡이게 얹음 — 그림에는 등불 몸체만.
- 밤 색(지금 가까운 숲과 같은 남색·검푸른 실루엣, 끝에 옅은 달빛). 이 그림은 해변과 달리 색 그대로.
- 배치 참고: `assets/briefs/beach/campsite-back-layout.png`.

## 4. 받은 뒤 (Claude)

- 2px 격자로 줄이기(해변 384폭 안팎), 색 수 맞추기, 투명 다듬기. 원본은 `assets/beach/`·`assets/campsite/`(git 밖).
- 해변 두 장은 명암 그림으로 두고 코드가 시간대 색을 곱함. 오솔길 입구는 가까운 숲 768의 뒤 절반에 붙이고, 등불 자리에 빛·누르기.

## 5. ChatGPT 프롬프트

### ① `beach-bg-far.png`

```
Please read assets/briefs/BEACH_BG_ART.md in my repository.
Style references (same pixel-art world): web/campsite/bg-far-v1.png and web/campsite/bg-near-v1.png. Layout: assets/briefs/beach/beach-far-layout.png.

Pixel art, a wide seaside panorama strip — the FAR layer only, fully transparent background (PNG with transparency).
Follow the layout: a low headland / cape with gentle cliffs on the left (0–30%), open empty horizon in the middle (30–55%) where the sun will rise and set, two or three small low islands far away at 55–72%, and a very faint distant coastline on the right.
Everything is far away and low: content only in the bottom 25% of the image, standing on a perfectly flat bottom line (the horizon).
Colors: almost no hue — calm blue-grey values only (4–6 shades, dark to light), because the code will tint it with sunrise / sunset / night colors. Only the edges facing the center may have a very faint lighter rim.
Crisp pixel grid, no anti-aliasing, no gradients, no glow. No sky, no sun, no moon, no stars, no sea, no boats, no birds, no people, no text. 1536×1024. It does not need to loop.
```

### ② `beach-bg-near.png`

```
Please read assets/briefs/BEACH_BG_ART.md in my repository.
Style references: web/campsite/bg-near-v1.png (same pixel-art world). Layout: assets/briefs/beach/beach-near-layout.png.

Pixel art, a wide seaside panorama strip — the NEAR foreground layer only, fully transparent background (PNG with transparency).
Follow the layout: on the left (0–28%) a cluster of dark rounded rocks with tufts of dune grass; on the right (72–100%) a weathered driftwood log and a low sand dune with dune grass; the middle (28–72%) is completely empty so the sea and beach behind stay visible.
Content only in the bottom 35% of the image on a perfectly flat bottom line.
Colors: almost no hue — calm blue-grey values only (4–6 shades), because the code will tint it with the time-of-day light. Only the edges facing the center may have a very faint lighter rim.
Crisp pixel grid, no anti-aliasing, no gradients, no glow. No sky, no sea, no sand in the middle, no bottle, no boats, no birds, no people, no campfire, no text. 1536×1024. It does not need to loop.
```

### ③ `campsite-bg-near-back.png`

```
Please read assets/briefs/BEACH_BG_ART.md in my repository.
This continues the existing night forest layer web/campsite/bg-near-v1.png — same pixel-art style, same colors, same scale of trees. Layout: assets/briefs/beach/campsite-back-layout.png.

Pixel art, a wide night forest strip, fully transparent background above (PNG with transparency).
Dense dark conifer forest across the whole width; in the center (42–58%) a narrow trail opens and leads into the forest. Beside the trail stands one slightly tilted wooden signpost (no text on it) and one small lantern hanging on a wooden post — draw only the lantern body, no glow (the code adds the light).
The left and right edges are dense forest so they join the existing layer seamlessly.
Silhouettes in very dark navy and blue-black with faint cool moonlit edges on tree tips, like the reference. Content sits in the bottom 35% of the image on a perfectly flat bottom line.
Crisp pixel grid, no anti-aliasing, no gradients, no glow. No moon, no stars, no water, no fire, no people, no text. 1536×1024.
```

- 투명이 안 되면 "solid pure magenta #FF00FF background"로 바꿔 달라고 해도 됨.
