/* 강고양이 씨 행동 성격표: 행동 이름표(run의 tag)마다 다른 일이 끼어들어도 되는지 한 곳에 적는다.
   새 행동을 만들면 여기 한 줄을 더한다. 표에 없는 이름표로 run(cat, …)을 부르면 미리보기(?dev=1)에서 콘솔에 알려 준다.

   tv    : TV 사건(큰 장면·켜짐·삐 소리)에 고개를 돌리거나 달려가도 되는지. false = 몰두 중이라 무시
   ghost : 할로윈 커튼 유령 그림자를 보고 확인하러 가도 되는지
   win   : 창밖 베란다 손님(난간의 새·검은 고양이)을 보러 창가로 가거나 천둥에 놀라 숨어도 되는지 (WINDOW_PLAN.md 5장, 7-1)
   (예전 tv-cat.js TV_BUSY, halloween.js NO_GHOST 목록을 합친 것. 값은 그때와 같다) */
const Y = true, N = false;
export const BEHAVIOR = {
  //            tv  ghost win
  '':         [Y, Y, Y], // 아무것도 안 하는 중 (처음, 시간 점프 직후)
  loaf:       [Y, Y, Y], // 식빵
  nap:        [Y, Y, Y], // 낮잠
  groom:      [Y, Y, Y], // 그루밍
  wander:     [Y, Y, Y], // 어슬렁
  roll:       [Y, Y, Y], // 배 보이고 뒹굴
  rest:       [Y, Y, Y], // 술래잡기 끝나고 지쳐서 쉼
  oddlook:    [Y, Y, Y], // 책장의 이상한 책 올려다보기
  tv:         [Y, Y, N], // TV 보기 (반응은 tvwatch 클립이 따로 받는다)
  window:     [N, Y, Y], // 창밖 보기
  sulk:       [N, Y, N], // 삐침
  bfly:       [N, Y, N], // 나비 구경
  tvtop:      [Y, N, N], // TV 위 낮잠 (TV 위에서는 따로 처리)
  witch:      [Y, N, N], // 할로윈 마녀 구경
  ghost:      [Y, N, N], // 유령 그림자 확인 중
  knock:      [N, N, N], // 컵 떨어뜨리기
  zoom:       [N, N, N], // 우다다
  chase:      [N, N, N], // 쥐야쥐 술래잡기
  stalk:      [N, N, N], // 쥐야쥐 노려보기
  boxhide:    [N, N, N], // 상자 숨바꼭질
  greet:      [N, N, N], // 쥐야쥐·만득 씨 인사
  birthday:   [N, N, N], // 생일 파티
  wait:       [N, N, N], // 문 앞에서 만득 씨 기다리기
  innocent:   [N, N, N], // 만득 씨 앞에서 시치미
  secret:     [N, N, N], // 몰래 노트북
  box:        [N, N, N], // 상자 안
  tvrush:     [N, N, N], // TV 큰 장면에 달려가기
  ufo:        [N, N, N], // UFO 구경
  santa:      [N, N, N], // 산타 구경
  paw:        [N, N, N], // 화면 톡
  laser:      [N, N, N], // 레이저 놀이 (보는 사람과)
  fish:       [N, N, N], // 어항 낚시
  bowlwatch:  [Y, Y, Y], // 밤에 어항 앞에서 금붕어 구경
  penstare:   [Y, Y, Y], // 탁자 위 레이저 포인터 노려보기
  yarn:       [N, N, N], // 실뭉치 놀이
  wheel:      [N, N, N], // 쳇바퀴
  chatter:    [N, N, N], // 창가에서 난간의 새 보고 채터링 (veranda.js)
  blackcat:   [N, N, N], // 베란다의 작은 검은 고양이 보러 감 (veranda.js)
  thunder:    [N, N, N], // 천둥에 놀라 숨기 (weather.js)
  fireworks:  [N, Y, N], // 창가에서 불꽃놀이 구경 (fireworks.js)
  // 계절 구경은 창밖 보기(window)와 같게: TV는 무시, 유령·창밖 손님엔 반응 (2026-10-23, tasks/season-watch-tags.md)
  leaves:     [N, Y, Y], // 창가에서 낙엽 구경 (seasons.js)
  firstsnow:  [N, Y, Y], // 창가에서 첫눈 구경 (seasons.js)
  geese:      [N, Y, Y], // 철새 올려다보기 (seasons.js)
};
const row = tag => BEHAVIOR[tag] || BEHAVIOR[''];
// TV 사건에 반응해도 되나
export const tvFree = a => row(a.tag)[0];
// 유령 그림자를 확인하러 가도 되나
export const ghostFree = a => row(a.tag)[1];
// 창밖 손님을 보러 가도 되나 (천둥에 놀라는 것도)
export const winFree = a => row(a.tag)[2];
// 표에 없는 이름표 알림 (steps.js run이 부른다)
export function checkTag(tag) {
  if (!(tag in BEHAVIOR) && typeof location !== 'undefined' && /[?&]dev=1/.test(location.search))
    console.warn('behave.js: 행동 성격표에 없는 이름표', tag);
}
