/* 오류 칸막이 (STABILITY_PLAN.md 3장). 한 칸의 오류가 방 전체를 멈추지 않게 한다.
   guard(이름, 할 일, 되돌리기)     오류가 나면 이번 장면만 그 칸을 건너뛰고 되돌리기를 부른다
   guardDraw(ctx, 이름, 그리기)    그리기 칸: 항상 save → 그리기 → restore (캔버스 설정이 다음 칸으로 새지 않게).
                                  render()의 맨 바깥 칸에서만 쓴다: 오류가 나면 그리기 안에서 짝이 깨진 save까지 모두 걷어 낸다
   - 같은 오류는 콘솔에 한 번만. 건수는 ERRORS(window.__goyang.errors)에서 본다 (행동 검사 도구가 센다)
   - 같은 칸이 10초 안에 5번 오류면 1분 쉰다
   - 난수를 쓰지 않는다 (부르는 순서가 곧 확률을 뽑는 순서라서. CODE.md)
   이 파일은 아무것도 불러오지 않는다 (어디서나 쓸 수 있게) */
const REST_N = 5, REST_WIN = 10e3, REST_MS = 60e3;
// total: 모든 오류 수 / by[칸 이름]: { n, first(첫 오류 글), rests(쉰 횟수) }
export const ERRORS = { total: 0, by: {} };
const logged = new Set(), recent = {}, restUntil = {};
const clock = () => performance.now();
// 오류를 적는다. 칸막이가 없는 곳(타이머 하나, 맨 바깥)에서도 쓴다
export function reportError(name, e) {
  const msg = String(e && e.message || e), b = ERRORS.by[name] || (ERRORS.by[name] = { n: 0, first: String(e && e.stack || e), rests: 0 });
  b.n++;
  ERRORS.total++;
  const k = name + '|' + msg;
  if (!logged.has(k)) { // 매 장면 쏟아지지 않게 한 번만
    logged.add(k);
    console.error(`고양.시: ${name}에서 오류 (방은 계속 돌아요)`, e);
  }
  const t = clock(), r = (recent[name] || []).filter(x => t - x < REST_WIN);
  r.push(t);
  recent[name] = r;
  if (r.length >= REST_N) {
    restUntil[name] = t + REST_MS;
    recent[name] = [];
    b.rests++;
    console.warn(`고양.시: ${name}에서 오류가 계속 나서 1분 쉬어요`);
  }
}
const resting = name => restUntil[name] != null && clock() < restUntil[name];
export function guard(name, fn, recover) {
  if (resting(name))
    return undefined;
  try {
    return fn();
  }
  catch (e) {
    reportError(name, e);
    if (recover) {
      try {
        recover(e);
      }
      catch (e2) {
        reportError(name + ' (되돌리기)', e2);
      }
    }
    return undefined;
  }
}
export function guardDraw(ctx, name, fn) {
  if (resting(name))
    return;
  ctx.save();
  try {
    fn();
  }
  catch (e) {
    reportError(name, e);
    for (let i = 0; i < 32; i++) // 그리기 도중 save만 하고 끊겼을 수 있다. 빈 상태의 restore는 아무 일도 안 한다
      ctx.restore();
    return;
  }
  ctx.restore();
}
