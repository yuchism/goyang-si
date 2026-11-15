# 크리스마스 광장 그림 1: 광장 풍경화(밤) · 약도 광장 2장
- status: brief
- mode: needs-review
- relay: brief
- office: ready
- brief: assets/briefs/XMAS_PLAZA_ART.md (회의에서 씀 — 왕복으로 다듬기)
- assets: assets/plaza/*-source-v1.png (git 무시) · web/plaza/xmas-night.webp · web/r/map/plaza-xmas.webp · web/r/map/plaza-lot.webp
- 출처: 회의 2026-11-15 크리스마스 광장 — `XMAS_PLAZA_PLAN.md`

## 범위
- **그림만.** 광장 페이지(`/plaza/`)·반짝임·눈·약도 연결·기간 코드는 다음 티켓. 방(`web/index.html`·`web/js/`)과 약도 설정(`objects.json` `door.map`)은 건드리지 않는다.
- 그림 셋 (자리·크기·피할 것은 지시서):
  1. **광장 풍경화, 밤** 1561×989 (방 `bg.webp`와 같은 크기) — 동화책 속 조용한 크리스마스 밤. 가운데 거대 트리, 왼쪽 회전목마·붕어빵 노점, 오른쪽 스케이트장·눈사람, 트리 밑 선물. **전구 알·내리는 눈·김·빛무리는 그리지 않는다**(코드가 얹음). 트리 앞 바닥은 비워 둔다(나중에 펠리컨·강고양이·쥐야쥐 자리).
  2. **약도용 크리스마스 광장** 512×512 투명 — 만화방 건물 그림(`web/r/map/shop-day.webp`)과 같은 시점·선 굵기.
  3. **약도용 펜스 친 공터** 512×512 투명 — 2와 땅 모양·크기·자리가 같게.
- 그림 속 글자 없음(AGENTS.md 6장).
- 2차(펠리컨 오르골)는 이 티켓이 아니다.

## 요구사항
- [ ] 지시서 `assets/briefs/XMAS_PLAZA_ART.md` 왕복으로 다듬기(자리 숫자는 플랜과 어긋나지 않게)
- [ ] 그림 3장 요청 → 들어오면 지시서와 대조(트리 자리·비워 둘 자리·전구 알 없음·글자 없음, 약도 두 장 땅 자리 같음), 다시 그릴 것만 다시
- [ ] 원본 `assets/plaza/`에, 웹 `web/plaza/xmas-night.webp`·`web/r/map/plaza-xmas.webp`·`web/r/map/plaza-lot.webp`
- [ ] 받은 그림 크기가 지시서와 다르면 어떻게 맞췄는지 메모에 (풍경화는 1561×989, 약도 그림은 땅 선 y 496)

## 확인
- [ ] `test -f`로 웹 그림 셋
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 풍경화를 띄워 보고: "예쁜 크리스마스 풍경화" 느낌인지, 방 그림과 같은 화풍인지, 전구 알·글자 없음, 트리 앞이 비었는지
- [ ] (사람) 약도 그림 둘을 `map-base.webp` 빈 터 A(x 120~360 · y 160~400)에 겹쳐 보고 크기·시점이 만화방 건물과 어울리는지

<!-- office:verify
- test -f web/plaza/xmas-night.webp && test -f web/r/map/plaza-xmas.webp && test -f web/r/map/plaza-lot.webp
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-15 지시서 작성(Claude, 회의). 주인 요청으로 `- office: ready`(2026-11-15).
