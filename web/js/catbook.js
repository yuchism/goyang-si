/* 고양이책: 열면 글자 없이 발자국만 (BOOKSHELF_PLAN.md 5장)
   책마다 발자국 길이 다르다. 자리는 고정(열 때마다 바뀌지 않음). 새 고양이책은 PATHS에 한 줄 */
// 발자국 칸은 가로:세로 = 16:10. 좌표는 칸 안의 % (x, y), 방향 a는 도(0 = 위쪽으로 걷기, 시계 방향)
const AX = 16, AY = 10;
const heading = (dx, dy) => Math.atan2(dx * AX, -dy * AY) * 180 / Math.PI;
// 직선으로 걷기: n걸음, 걸음마다 왼발·오른발이 길 양옆으로 조금씩
function walk(x0, y0, x1, y1, n, side = 3.2) {
  const a = heading(x1 - x0, y1 - y0), r = a * Math.PI / 180;
  const px = Math.cos(r) * side / AX * AY, py = Math.sin(r) * side; // 길에 수직인 방향 (칸 비율 보정)
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1), s = i % 2 ? 1 : -1;
    return [x0 + (x1 - x0) * t + px * s, y0 + (y1 - y0) * t + py * s, a];
  });
}
// 맴돌기: 가운데 (cx, cy), 반지름 r(가로 %), from°에서 시작해 sweep°만큼 시계 방향
function circle(cx, cy, r, from, sweep, n) {
  return Array.from({ length: n }, (_, i) => {
    const d = (from + sweep * i / (n - 1)) * Math.PI / 180, s = i % 2 ? 0.88 : 1.12;
    return [cx + Math.sin(d) * r * s, cy - Math.cos(d) * r * s * AX / AY, from + sweep * i / (n - 1) + 90];
  });
}
const PATHS = {
  yellow: walk(10, 88, 88, 14, 8), // 왼쪽 아래 → 오른쪽 위 대각선
  blue: circle(50, 50, 18, 200, 300, 10), // 가운데에서 한 바퀴 맴돌다 멈춤
  green: [[76, 78, -20], [84, 70, 15], [88, 86, 160], [72, 90, 95]], // 오른쪽 아래 구석에 옹기종기
  blue2: walk(-2, 66, 103, 38, 9), // 왼쪽에서 들어와 오른쪽 밖으로 (마지막 발자국은 반쯤 잘림)
  green2: [[50, 50, 0]] // 한가운데 딱 하나
};
// 발바닥 하나: 큰 볼록 + 작은 볼록 넷 (위쪽이 발가락)
const PAW = '<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="27" rx="9.5" ry="8"/><ellipse cx="9" cy="15.5" rx="3.6" ry="4.6" transform="rotate(-22 9 15.5)"/><ellipse cx="16" cy="9.5" rx="3.8" ry="4.9" transform="rotate(-7 16 9.5)"/><ellipse cx="24" cy="9.5" rx="3.8" ry="4.9" transform="rotate(7 24 9.5)"/><ellipse cx="31" cy="15.5" rx="3.6" ry="4.6" transform="rotate(22 31 15.5)"/></svg>';
export function pawsHTML(id) {
  const ps = PATHS[id] || PATHS.green2;
  return '<div class="paws" role="img" aria-hidden="true">' + ps.map(([x, y, a], i) =>
    `<i style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;transform:translate(-50%,-50%) rotate(${Math.round(a + (i % 2 ? 8 : -8))}deg)">${PAW}</i>`).join('') + '</div>';
}
