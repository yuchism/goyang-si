# 손글씨 글꼴 부르기를 한 곳으로 (assets.js·util.js 중복 정리)
- status: brief
- mode: needs-review
- office: ready
- brief: (그림 없음)
- related-adr: 0008
- 출처: #49 검수(Codex 0단계 시험, 2026-11-05) "리팩터 후보: assets.js와 setHandFont의 글꼴 로딩 중복" · 회의 2026-11-05(역할 설정 첫 진짜 티켓 — 구현 Claude ↔ 검수 Codex, 격리 확인 겸함)

## 지금
- `web/js/util.js`: `loadHand()`가 언어에 맞는 손글씨 글꼴(`Gaegu` 또는 `"Patrick Hand"`)을 `document.fonts.load`로 부르고, 글꼴 CSS(`#fontcss`)가 늦게 오면 한 번 더 부른다(#49). `setHandFont(lang)`이 언어를 바꿀 때 부른다.
- `web/js/assets.js` 52줄: 따로 `document.fonts.load('700 30px Gaegu')`를 한 번 더 부른다(언어와 상관없이 Gaegu). #49 전부터 있던 줄이라 지금은 겹친다.

## 범위
- 리팩터: **보이는 동작은 그대로.** 손글씨 글꼴을 부르는 곳을 `util.js` 한 곳으로 모은다.
- 다른 글꼴(본문 `--font-body`)·글꼴 CSS 받는 법(`index.html`)은 건드리지 않는다.

## 요구사항
- [ ] `assets.js`의 따로 부르기를 없애고, 필요하면 `util.js`의 것을 쓴다(영어 화면에서 Gaegu를 괜히 받지 않게 — 받던 게 동작에 필요했으면 그 이유를 메모에)
- [ ] 첫 화면에서 손글씨 글꼴이 한 번은 불린다(언어에 맞는 것). 언어를 바꾸면 그 언어 것이 불린다 — 지금과 같다
- [ ] 격리 확인(하네스 시험, 이 티켓에서만): 구현 전에 딱 한 번 Read 도구로 `~/Documents` **안의 파일 하나**(아무 파일, 예: `~/Documents/.localized`)를 읽어 보고, 나온 결과를 이 항목의 criteria note에 그대로 적는다. **권한 거절이 정상**이다. 그 밖에는 작업 공간 밖을 보지 않는다

## 확인
- [ ] `node tools/check_structure.mjs` 통과
- [ ] (사람) 한국어·영어로 처음 열기 → 말풍선·책등 손글씨가 전과 같은지(개발자 도구 네트워크에서 영어일 때 Gaegu woff2를 안 받는지 보면 더 좋음)
- [ ] (사람) 하네스 시험: 검수 댓글이 `(codex)`인지, 구현 쪽 Read와 검수 쪽 `ls`가 둘 다 거절인지, 맥에 "문서 접근" 창이 안 떴는지

## 검수자에게 (완료 기준 아님)
검수자는 격리 확인으로 판정 전에 딱 한 번 `ls ~/Documents`를 해 보고 결과를 summary 끝에 한 줄로 적는다(이 티켓에서만, 거절이 정상). 구현 일꾼은 이 절을 하지 않는다.

<!-- office:verify
- node tools/check_structure.mjs
-->

## 메모
- 2026-11-05 지시서 작성(Claude, 회의). 역할 설정(검수 = Codex) 첫 진짜 티켓.
