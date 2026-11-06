# 만화방 그림 1: 빼꼼 강고양이 씨 · 만화방 간판 · 포장하는 사장님
- status: brief
- mode: needs-review
- relay: brief
- office: ready
- brief: assets/briefs/MANHWA_UI_ART.md (이 티켓에서 새로 씀)
- assets: assets/manhwa/ui/*-source-v1.png (git 무시, 로컬) · web/manhwa/ui/*.webp
- related-adr: 0011
- 출처: 회의 2026-11-06 — 만화방 1(#5) 뷰어의 코드 그림을 진짜 그림으로. 구상 goyang-hq `ideas/MANHWABANG_IDEAS.md` 2장(나무늘보 사장님)

## 범위
- **만화방 1(웹툰 뷰어)이 `main`에 합쳐진 뒤에 시작한다** — 이 티켓은 그 뷰어 위에 그림을 얹는다(`web/manhwa/viewer.js`·`viewer.css`).
- 그림 넷(아래). 그림 속 글자 없음(AGENTS.md 6장) — 간판 글자는 코드가 얹는다(KO/EN).
- 고양.시 방(`web/index.html`·`web/js/`)과 원고·회차 도구의 잘라내기는 건드리지 않는다.
- 만화방 3(실내)의 사장님 그림(계산대·졸기·말하기)은 다음 지시서 — **이번 사장님 그림이 그 기준(화풍·생김)이 된다.**

## 그림 (주인 시나리오)
1. **빼꼼 강고양이 씨 2장** — 회차 끝 크림 종이 칸 위로 얼굴을 내밀고 앞발 둘로 종이 끝을 잡은 모습. `peek-open`(눈 뜸, 살짝 웃음) · `peek-blink`(같은 그림에서 눈만 감음 — 코드가 가끔 바꿔 깜빡임). 고양.시 강고양이 씨와 **같은 인물**: 크림색 몸에 갈색 얼룩(한쪽 눈가 큰 얼룩), 머리 위 곱슬 한 줌, 분홍 귀 속, 주황 목걸이에 금방울. 참고: `web/f/cat_sit_1.webp` 등 `web/f/cat_*`, `assets/briefs/CAT_SPRITE_PLAN.md`. 목 아래는 종이에 가려지므로 그리지 않음(바닥선 = 종이 끝). 목록 맨 위 간판 옆 작은 얼굴은 `peek-open`의 얼굴 부분을 코드가 잘라 씀.
2. **만화방 간판 1장** — 동네 만화방 같은 나무 간판(가로로 긴 판, 못 자국·나뭇결, 한쪽에 작은 책 모양 장식). **글자 자리는 비워 둔다**(코드가 「고양.시 만화방」/"Goyang Comic Café"를 얹음). 목록 맨 위 짙은 띠에 얹는다.
3. **포장하는 나무늘보 사장님 1장** — 공개 전 회차 칸(지금은 줄무늬 + 🐾)에. 사장님이 갈색 포장지와 끈으로 만화책 한 권을 싸다가 반쯤 졸고 있다(머리가 살짝 기울고 눈이 반쯤 감김). 생김은 고양.시 생일 손님 나무늘보와 같은 화풍(`web/sheet/guest-sloth-dance-v1.webp`, `assets/briefs/GUEST_SPRITE_PLAN.md` 5절: 회갈색 털, 크림 얼굴, 눈가 갈색 줄무늬, 긴 발톱 셋, 늘 웃는 입) — 단 고깔모자 대신 **만화방 앞치마**. 같은 인물인지는 설명하지 않는다(구상 2장).

## 요구사항
- [ ] 그림 지시서 `assets/briefs/MANHWA_UI_ART.md`: 그림마다 장면·크기(대략: 빼꼼 512×320, 간판 1024×256, 사장님 640×480 — 넣을 자리의 비율에 맞게 지시서에서 확정)·배경(빼꼼·간판은 투명, 사장님은 크림 종이색 배경 또는 투명)·참고 그림·피할 것. 그림 일꾼이 이 파일만 읽고 그릴 수 있게
- [ ] 그림 4장을 그림 일꾼에게 한 번에 요청 → 들어오면 그림마다 지시서·참고 그림과 대조(강고양이 씨·사장님 생김이 맞는지, 다시 그릴 것만 다시) → 웹 `web/manhwa/ui/cat-peek-open.webp`·`cat-peek-blink.webp`·`sign.webp`·`sloth-wrap.webp`
- [ ] 뷰어에 얹기: 회차 끝 코드 고양이 → `cat-peek-*`(가끔 깜빡, 동작 줄이기 설정이면 깜빡이지 않음) · 목록 맨 위 띠 → 간판 그림 + 코드 글자(KO/EN) + 빼꼼 얼굴 · 공개 전 회차 칸 → `sloth-wrap` + "○월 ○일 공개"
- [ ] 그림을 못 불러와도 지금 코드 그림으로 떨어진다(깨진 그림 표시 없음)
- [ ] 만화방 그림은 서비스 워커 시작 묶음에 넣지 않는다(만화방 1과 같은 규칙)

## 확인
- [ ] `test -f`로 웹 그림 넷
- [ ] `python3 tools/build_manhwa.py csf --check` 통과
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 검수 폴더 `_overview.png`: 강고양이 씨가 방의 강고양이 씨와 같은 고양이로 보이는지, 사장님이 생일 손님 나무늘보와 같은 화풍인지, 글자 없음
- [ ] (사람) 폰 화면 모드로 목록·회차 끝·공개 전 칸(공개일을 내일로 한 시험 회차)

<!-- office:verify
- test -f web/manhwa/ui/cat-peek-open.webp && test -f web/manhwa/ui/cat-peek-blink.webp && test -f web/manhwa/ui/sign.webp && test -f web/manhwa/ui/sloth-wrap.webp
- python3 tools/build_manhwa.py csf --check
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-06 지시서 작성(Claude, 회의). 주인 확인 뒤 `- office: ready`(2026-11-06).
