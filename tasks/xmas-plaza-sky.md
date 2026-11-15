# 크리스마스 광장: 하늘 별 · 눈 일정 · 별똥별
- status: implemented
- mode: needs-review
- brief: 그림 없음
- 출처: 회의 2026-11-15 — `XMAS_PLAZA_PLAN.md` 2장·3-4. 주인 요청으로 하네스 없이 Claude가 직접 구현.

## 범위
- `/plaza/`(#45 광장 페이지 위)에 하늘 별 겹, 눈 일정, 별똥별. 불꽃(#46)·약도(#47)는 건드리지 않는다.

## 요구사항
- [x] 눈 일정: 30분 칸 날짜 씨앗, 절반쯤 눈, 경계 3분 넘어가기, 송이 수가 늘고 줆
- [x] 12/24·25 밤은 늘 눈
- [x] 눈 올 때 하늘 살짝 흐림, 별 숨김
- [x] 하늘 별: 크기 섞음, 제각각 빠르게 반짝, 해 질 녘 하나둘씩
- [x] 별똥별: 맑은 밤에 가끔
- [x] 동작 줄이기, 미리보기 `?snow=1|0`·`?shoot=1`, 숫자는 `scene.json` `weather`·`stars`·`shoot`

## 확인
- [x] `node tools/check_structure.mjs`·`node tools/check_time.mjs` 통과
- [x] (참고) 헤드리스 크롬으로 `?dev=1&night=1&snow=0&shoot=1`·`&snow=1` 찍어 봄: 맑을 땐 별·별똥별, 눈 올 땐 흐림·별 없음·눈. 칸 1440개 모의: 눈 비율 0.50, 한 번에 이어지는 길이 가운데값 60분
- [ ] (사람) `/plaza/?dev=1&night=1&snow=0`에서 별이 팅글팅글 반짝이는지, 수·밝기
- [ ] (사람) `?shoot=1` 별똥별, `?snow=1` 눈 올 때 별이 사라지는지
- [ ] (사람) 이브 밤(미리보기 날짜)에 눈이 계속 오는지

## 메모
- 2026-11-15 구현(Claude, 직접): `web/plaza/plaza.js`(snowAt·하늘 별 캔버스 `stars`·drawStars·눈 송이 문턱), `scene.json`(weather·stars·shoot), `plaza.css`(.stars 높이). 별 세기는 방 어둠 `darkness(d, true) / weather.nightDark`(0.62)로, `?night=1`이면 1.
