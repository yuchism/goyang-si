/* 페이지 주소의 물음표 뒤(?birthday=이름 등). 가져오는 것 없음 — 바닥 파일(assets·objects)도 위층(birthday.js) 없이 읽게 (tasks/structure-floor-untangle.md) */
export const pageParams = new URLSearchParams(location.search), birthdayMode = pageParams.has('birthday');
