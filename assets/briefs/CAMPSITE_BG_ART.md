# 에셋: 미스테리 캠핑장 — 360도 둘러싼 배경 (CAMPSITE_BG_ART)

> 상태: **지시서 씀 (2026-11-25) — 그림 기다림(주인이 ChatGPT로).** 회의 2026-11-25: 캠핑장을 아스키 대신 **스프라이트 스태킹 픽셀아트(2px)**로 — 시안 https://claude.ai/artifact/PvBfbeNwFENALjxAUudV33 (바닷가 모닥불 POC를 바탕으로). 기획서·티켓 반영은 따로.
> 넣을 곳: 캠핑장(`/campsite/`)의 하늘과 땅 사이, 불 둘레를 돌면 함께 도는 먼 풍경.

## 1. 한 줄 요약

가로로 이어지는 픽셀아트 띠 그림 **2장(겹)**. 하늘은 투명 — 하늘·별·은하수·오늘의 달·호수 물결과 반사는 코드가 그린다.

| 파일(원본) | 겹 | 크기 | 배경 |
|---|---|---|---|
| `campsite-bg-far.png` | 먼 산 (눈 덮인 봉우리·절벽·언덕 능선) | 1536×1024 | 투명 |
| `campsite-bg-near.png` | 가까운 숲·절벽 밑·풀 언덕·호숫가 | 1536×1024 | 투명 |

돌리면 두 겹이 서로 다른 빠르기로 움직여 깊이감을 낸다(먼 산이 느리게).

## 2. 공통 조건

- **양 끝이 이어져야** 함 (360도).
- **구역 배치**(참고 그림 `assets/briefs/campsite/bg-strip-layout.png`), 왼쪽부터: 숲(캠프 뒤) 0–22% → 절벽(왼쪽) 22–38% → **가운데 호수와 눈 덮인 골짜기(앞, 달이 뜨는 쪽)** 38–62% → 풀 언덕(오른쪽) 62–78% → 숲 78–100%. 지금 캠핑장 기획(`CAMPSITE_PLAN.md` 피오르 호숫가)과 같은 방향.
- 밤 색: 남색·보라·검푸른색, 눈은 흐린 은보라. 숲은 거의 검은 남색, 끝에만 옅은 달빛.
- **넣지 않음:** 달, 별, 물, 불, 빛 번짐(glow), 사람, 텐트, 글자.
- 픽셀 격자 또렷하게, 안티앨리어싱·그라데이션 없이, 색 수 적게.
- 지금 모습 참고: `assets/briefs/campsite/bg-poc-now.png` (코드로 그린 임시 실루엣 — 이것을 대신함).

## 3. 받은 뒤 (Claude)

- 2px 격자로 줄이기(최근접), 색 수 맞추기, 양 끝 이음새 다듬기.
- 투명이 안 나오면 단색 배경(#FF00FF 등)을 지움.
- 원본은 `assets/`(git 밖 규칙대로), 웹용은 `web/campsite/` 아래 작은 webp/png로.

## 4. ChatGPT 프롬프트 (참고 그림 `bg-strip-layout.png` 첨부)

### ① 먼 산 — `campsite-bg-far.png`

```
Pixel art, 360-degree seamless horizontal panorama strip, night. Distant snowy mountain range only, as a silhouette layer with a fully transparent sky (PNG with transparency). The left and right edges must tile seamlessly. Follow the attached layout: the tallest snow-capped peaks sit in the center (behind a lake valley), a steep dark cliff wall rises at about 22–38% from the left, a low rounded hill at 62–78%, and gentle low ridges elsewhere. Palette: deep navy and muted violet rock, snow in soft pale lavender-silver with subtle moonlit highlights. Mountains occupy only the bottom 40% of the image, with a perfectly flat bottom edge. Crisp pixel grid, no anti-aliasing, limited palette (12–16 colors), no gradients, no glow. No moon, no stars, no water, no trees, no text. 1536×1024.
```

### ② 가까운 숲·언덕 — `campsite-bg-near.png`

```
Pixel art, 360-degree seamless horizontal panorama strip, night, foreground layer with a fully transparent background above (PNG with transparency). The left and right edges must tile seamlessly. Follow the attached layout: dense dark conifer forest from 0–22% and 78–100%; a dark rocky cliff base with a few pines at 22–38%; at 38–62% only a very thin, low far shoreline (one or two pixels tall) so a lake can be seen; a grassy hill with a few scattered pines rising gently at 62–78%. Silhouettes in very dark navy and blue-black with faint cool moonlit edges on tree tips and grass. Content sits in the bottom 35% of the image on a perfectly flat bottom line. Crisp pixel grid, no anti-aliasing, limited palette (10–14 colors), no gradients, no glow. No moon, no stars, no water, no fire, no tents, no people, no text. 1536×1024.
```

- 투명 배경이 안 되면: "solid pure magenta #FF00FF background" 로 바꿔 달라고 해도 됨.
- 양 끝이 조금 어긋나도 괜찮음 — 코드로 다듬음.
