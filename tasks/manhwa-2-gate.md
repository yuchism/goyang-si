# 만화방 2: 현관문 → 동네 약도 · 책장 만화책 · 출입문으로 돌아오기
- status: brief
- mode: needs-review
- relay: brief
- office: ready
- brief: assets/briefs/MANHWA_MAP_ART.md (이 티켓에서 새로 씀)
- assets: assets/manhwa/map/*-source-v1.png (git 무시, 로컬) · web/r/map/*.webp
- related-adr: 0008, 0010, 0011
- 출처: 구상 goyang-hq `ideas/MANHWABANG_IDEAS.md` v1 1장(입구와 출구)·5장(통계) · 회의 2026-11-06(2 → 3 순서)

## 범위
- 고양.시 방에서 만화방으로 가는 길 둘(현관문 약도, 책장 만화책)과 돌아오는 길 하나. 만화방 실내(사장님 계산대·관람금지 책장·밤 운동)는 만화방 3.
- 만화방 화면(`web/manhwa/`)은 「고양.시로 돌아가기」 주소만 바꾼다.
- 왜 동네에 만화방이 있는지는 설명하지 않는다(구상 1장).

## 결정 (구상 1장 그대로)
- **현관문:** 누르면 문이 살짝 열리고 문틈에 **동네 약도**가 펼쳐진다. 갈 수 있는 곳만 그린다 — 처음엔 고양.시 집과 만화방 하나. 잠금·"준비 중" 없음, 가게가 생기는 대로 늘어난다.
  - **만화방은 24시간 영업**(주인 2026-11-06 — 구상의 셔터·영업시간은 뺌). 약도의 만화방은 방 시계의 낮·밤에 따라 낮 그림 / 밤 그림(창에 불, 간판 불). 밤의 만화방 안(사장님이 러닝머신 등)은 만화방 3.
  - **만득 씨가 문 앞에 있을 때(말풍선 중·문이 열려 있을 때)는 문이 안 열린다.** 만득 씨 말풍선 "잠깐만~"만 뜬다.
- **책장:** 고양이책 한 권을 **만화책**으로 바꾼다(`objects.json` `bookshelf.books`의 `href` — 다른 책처럼 코드로 그린 책등, 만화책답게 표시 하나). 만화방 목록 `/manhwa/csf/`로 바로 가는 지름길.
- **돌아오기:** 만화방 「고양.시로 돌아가기」 → `/?from=manhwa` → 고양.시에서 **딸랑**(현관 종 소리, 소리 꺼짐이면 없음) + 현관문이 잠깐 열렸다 닫힘 + 강고양이 씨가 고개를 들어 문 쪽을 보거나 가끔(확률 `초기값` 1/3) 문 앞으로 마중. 방은 그동안 실제 시간대로 흘러가 있다(이어 붙이지 않음). 주소의 `from` 꼬리는 처리 뒤 지운다(새로 고침에 또 딸랑 안 하게).

## 그림 (지시서 왕복으로)
1. **동네 약도 바탕 1장** — 손으로 그린 동네 지도(골목·나무·작은 집들), 고양.시 집 자리와 만화방 자리가 보이는 정도. 글자 없음(이름은 코드가 얹음, KO/EN). 나중에 가게를 얹을 빈 자리가 있게.
2. **만화방 건물 2장** — `shop-day`(작은 2층 만화방, 책 모양 장식, 간판 자리 비움) · `shop-night`(같은 건물·같은 구도, 밤 — 창과 간판에 불, 창 안에 작은 실루엣이 달리는 듯 보이면 좋음: 러닝머신 하는 사장님). 약도 위에 코드가 얹는다(투명 배경).
3. 화풍: 고양.시 방·만화방 간판(`web/manhwa/ui/sign.webp`)과 같은 손그림. 참고 `assets/briefs/MANHWA_UI_ART.md`.

## 요구사항
- [ ] 그림 지시서 `assets/briefs/MANHWA_MAP_ART.md`: 위 그림 셋의 장면·크기·투명 여부·약도 위 얹는 자리(좌표 기준)·참고·피할 것
- [ ] 그림 요청 → 대조 → 웹 `web/r/map/map-base.webp`·`shop-day.webp`·`shop-night.webp`. 약도 그림은 시작 묶음에 넣지 않는다(문을 누를 때 받음, 0008)
- [ ] 현관문 누르기: 문 살짝 열림 → 문틈 약도 펼침(작게 열렸다 커지는 짧은 움직임, 동작 줄이기면 바로) → 고양.시 집·만화방 표시(이름은 i18n) → 만화방 누르면 `/manhwa/csf/` · 바깥 누르거나 닫기면 문 닫힘
- [ ] 방 시계가 밤이면 `shop-night`(고양.시의 낮·밤 기준 그대로), 만득 씨가 문 앞이면 열리지 않고 "잠깐만~"
- [ ] 책장 만화책 한 권(`href`) — 책장 목록(폰 큰 목록 포함)에도 「만화방」으로
- [ ] 돌아오기 `/?from=manhwa`: 딸랑 · 문 열렸다 닫힘 · 고양이 반응 · 주소 꼬리 지움. 만화방 「고양.시로 돌아가기」 주소를 이걸로
- [ ] 통계(GoatCounter): 약도 열기, 약도에서 만화방, 책장 만화책, 만화방에서 돌아옴 — 만화방 쪽 "들어온 길"에 `map`·`shelf`가 잡히게(주소 꼬리 `?via=map|shelf`를 만화방이 읽고 지움)
- [ ] 회귀: `visual_check` 전후 — 문을 누르지 않은 방 장면은 같아야 한다(책장 만화책 한 권 바뀐 것만)

## 확인
- [ ] `test -f`로 웹 그림 셋
- [ ] 장면 설정 JSON이 읽힌다(검사 블록). `node tools/check_scene.mjs`는 서버·브라우저가 필요해 샌드박스에선 못 돌 수 있음 — 돌리지 못하면 메모에 이유, 사람 검수 때 맥에서
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 폰·데스크톱: 문 → 약도 → 만화방 → 「고양.시로 돌아가기」 → 딸랑과 고양이 반응
- [ ] (사람) `?dev=1`로 시각을 02:00에 → 약도의 만화방이 밤 그림, 만득 씨 귀가 시각에 문 누르기 → "잠깐만~"

<!-- office:verify
- test -f web/r/map/map-base.webp && test -f web/r/map/shop-day.webp && test -f web/r/map/shop-night.webp
- python3 -c "import json; [json.load(open(f)) for f in ('web/scenes/room/objects.json', 'web/scenes/room/stage.json')]"
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-06 지시서 작성(Claude, 회의). 주인 확인 뒤 `- office: ready`(2026-11-06). 만화방은 24시간 영업(주인 같은 날 고침 — 셔터·영업시간 뺌, 밤에는 사장님 운동 장면).
- 2026-11-06 그림 지시서 `assets/briefs/MANHWA_MAP_ART.md` 씀(강고양이 씨) — 약도 1200×1200 종이색, 건물 512×512 투명(땅 선 y 496, 약도 (880, 580)에 320×320으로 얹음). 검수 왕복 뒤 그림 요청.
- 2026-11-06 구현(강고양이 씨). 그림 3장 대조 — 다시 그린 것 없음. 약도는 지시서 좌표에서 조금 벗어남(고양.시 집이 y 1034까지 내려와 이름표 자리를 덮고, 만화방 터는 x 741~1088 · y 272~655로 큼) → 지시서대로 좌표는 장면 설정에 실제 그림 기준으로 적음(`objects.json` `door.map`: 만화방 그림 box [704, 247, 420, 420], 이름표 「고양.시」(330, 1092) 집 아래 길 · 「만화방」(914, 690) 가게 앞 길). 밤 그림 2층 창 실루엣은 사람 같은 둥근 머리로도 보임 — 사람 검수 때 볼 것.
  - 코드: `web/js/frontdoor.js`(새, 약도 창·문틈 `world.doorAjar`·돌아옴 딸랑) · `ui.js`(문 누르기 판정, a11y 버튼 `aDoor`) · `draw.js`(문틈 빛) · `manduk.js` `mandukWait`("잠깐만~") · `cat.js` `welcomeB`(마중 확률 `WELCOME_GO` 초기값 1/3, `behave.js` `welcome`) · `main.js`(시작·매 장면) · `viewer.js`(돌아가기 `/?from=manhwa`, 목록에서 `?via=map|shelf` 세고 지움) · `i18n.js` · `style.css` · `index.html`.
  - 약도 그림은 `r/map/`(build_meta 대상 밖, `scenery`처럼) — 시작·나중 묶음 어디에도 없고 문을 누를 때 `<img>`가 받는다. 못 받으면 종이색 판 + 이름표만.
  - 책장: 고양이책 `green2` → 만화책 `manhwa`(같은 자리·크기, 빨강 `#c8432b`, 표시 `comic` 말풍선). 책장 목록·폰 큰 목록에 「만화방」, 펼치기 → `/manhwa/csf/?via=shelf`.
  - 구조 검사: 표시 그리기를 넣자 `shelf.js`가 500줄을 넘어서 책등 표시(face·yarn·paw·comic)를 `spine-marks.js` 표 `MARKS`로 옮김(그리는 법은 그대로). `frontdoor.js`는 덩어리 밖 모듈만 가져와 엉킨 덩어리 그대로(44개 / 292).
  - 통계 이름: `door-map`(약도 열기) · `map-manhwa`(약도에서 만화방) · `shelf-manhwa`(책장 만화책) · `manhwa-return`(돌아옴) · 만화방 쪽 `manhwa/csf/in-map`·`in-shelf`.
  - 못 돌린 검사: `check_scene.mjs`·`visual_check.js`는 서버·브라우저가 필요한데 이 샌드박스에서 로컬 서버를 띄우는 명령이 막힘 → 사람 검수 때 맥에서. 돌린 것: `check_structure`·`check_time`·`check_tv` 통과, `build_meta.py --check` 맞음, 바꾼 JS `node --check` 통과.
- 2026-11-06 검수 고침(강고양이 씨).
  - M2 돌아옴 딸랑: 새 문서는 소리가 닫힌 채 시작해서(첫 입력 전엔 브라우저가 막음) 0.8초 뒤 `Snd.bell`이 그냥 지나갔다. 이제 소리가 열려 있지 않으면 `frontdoor.js`가 딸랑을 미뤄 두고(`bellAt`), `ui.js` `soundUnlock`이 소리를 실제로 연 뒤(`ac.resume()` 끝) `bellLate`를 부른다. 한 번만(미룬 표시를 먼저 지움), 12초(`BELL_WAIT`) 안의 첫 입력에만, 소리를 끈 사람은 그대로 자막만.
  - M1 `visual_check` 전후: 이 샌드박스에서 다시 시도 — 로컬 서버는 포트 열기가 막히고(EPERM), 서버 없이 파일을 바로 돌려주게 감싸도 Chromium이 뜨자마자 죽는다(`bootstrap_check_in … MachPortRendezvousServer: Permission denied`). 여기선 못 찍음 → 맥에서: `cd web && python3 -m http.server 8000 &` 뒤 `git archive b990203 web`로 꺼낸 전 판과 지금 판을 각각 `node tools/visual_check.js 8000 …` → `python3 tools/compare.py`. 다를 수 있는 곳은 책장이 보이는 장면의 만화책 한 권뿐이어야 한다.
