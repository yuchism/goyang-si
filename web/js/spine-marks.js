/* 책등 표시 (shelf.js에서 나눔): objects.json 책의 deco.mark 이름마다 그리는 법 하나.
   새 표시는 이 표에 한 줄 + 그리는 함수. 책 바닥 왼쪽 모서리가 원점, 위가 -y (shelf.js paintBook) */
const INKC = '#2a1a12';
const RAD = Math.PI / 180;
function paw(c, x, y, s, a) { // 흐린 발자국 (catbook.js 발바닥과 같은 모양)
  c.save();
  c.translate(x, y);
  c.rotate(a * RAD);
  c.scale(s / 40, s / 40);
  c.translate(-20, -20);
  c.fillStyle = INKC;
  c.globalAlpha = 0.38;
  for (const [ex, ey, rx, ry, r] of [[20, 27, 9.5, 8, 0], [9, 15.5, 3.6, 4.6, -22], [16, 9.5, 3.8, 4.9, -7], [24, 9.5, 3.8, 4.9, 7], [31, 15.5, 3.6, 4.6, 22]]) {
    c.beginPath();
    c.ellipse(ex, ey, rx, ry, r * RAD, 0, 7);
    c.fill();
  }
  c.restore();
}
function catFace(c, x, y, s) { // 강고양이 씨 얼굴: 흰 바탕에 오른쪽 갈색 얼룩
  c.save();
  c.translate(x, y);
  c.scale(s / 20, s / 20);
  c.lineWidth = 1.5;
  c.strokeStyle = INKC;
  c.lineJoin = 'round';
  c.fillStyle = '#fbf3e6';
  c.beginPath();
  c.moveTo(-8, -3);
  c.lineTo(-7, -11);
  c.lineTo(-2, -6.5);
  c.moveTo(8, -3);
  c.lineTo(7, -11);
  c.lineTo(2, -6.5);
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(0, 0, 9.5, 7.5, 0, 0, 7);
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = '#9a6a45';
  c.beginPath();
  c.ellipse(5.5, -1.5, 5, 4.5, -0.3, 0, 7);
  c.fill();
  c.restore();
  c.beginPath();
  c.ellipse(0, 0, 9.5, 7.5, 0, 0, 7);
  c.stroke();
  c.fillStyle = INKC;
  c.fillRect(-5.2, -1, 2.6, 1.3);
  c.fillRect(2.6, -1, 2.6, 1.3);
  c.fillStyle = '#e88a9a';
  c.beginPath();
  c.arc(0, 2, 1, 0, 7);
  c.fill();
  c.restore();
}
function yarn(c, x, y, r) { // 빨간 실뭉치
  c.save();
  c.lineWidth = 1.3;
  c.strokeStyle = INKC;
  c.beginPath();
  c.moveTo(x + r * 0.6, y + r * 0.8);
  c.quadraticCurveTo(x + r * 1.6, y + r * 2, x + r * 0.4, y + r * 2.6);
  c.stroke();
  c.beginPath();
  c.arc(x, y, r, 0, 7);
  c.fillStyle = '#d0503f';
  c.fill();
  c.stroke();
  c.clip();
  c.strokeStyle = 'rgba(42,26,18,.7)';
  c.lineWidth = 1;
  for (const k of [-0.5, 0, 0.5]) {
    c.beginPath();
    c.ellipse(x + k * r, y, r * 0.35, r * 1.2, 0.5, 0, 7);
    c.stroke();
  }
  c.restore();
}
// 만화책 표시: 말풍선 하나 (안에 느낌표)
function comic(c, x, y, r) {
  c.save();
  c.lineWidth = 1.3;
  c.strokeStyle = INKC;
  c.fillStyle = '#fff8ea';
  c.beginPath();
  c.ellipse(x, y, r, r * 0.78, 0, 0, 7);
  c.moveTo(x - r * 0.35, y + r * 0.6);
  c.lineTo(x - r * 0.75, y + r * 1.3);
  c.lineTo(x + r * 0.05, y + r * 0.72);
  c.fill();
  c.stroke();
  c.fillStyle = INKC;
  c.fillRect(x - r * 0.12, y - r * 0.5, r * 0.24, r * 0.6);
  c.beginPath();
  c.arc(x, y + r * 0.38, r * 0.14, 0, 7);
  c.fill();
  c.restore();
}
// 지도책 표시: 세 번 접힌 지도 (접힌 면이 번갈아 밝고 어둡게, 그 위로 점선 길과 빨간 점)
function foldedMap(c, x, y, s) {
  const w = s, h = s * 1.25, l = x - w / 2, t = y - h / 2, f = w / 3, k = h * 0.08;
  c.save();
  c.lineWidth = 1.2;
  c.strokeStyle = INKC;
  c.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const a = l + f * i, dy = i % 2 ? k : 0;
    c.beginPath();
    c.moveTo(a, t + (i % 2 ? 0 : k));
    c.lineTo(a + f, t + dy);
    c.lineTo(a + f, t + h + dy);
    c.lineTo(a, t + h + (i % 2 ? 0 : k));
    c.closePath();
    c.fillStyle = i % 2 ? '#e8dcc0' : '#fff8ea';
    c.fill();
    c.stroke();
  }
  c.setLineDash([1.6, 1.6]);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(l + w * 0.12, t + h * 0.8);
  c.quadraticCurveTo(l + w * 0.45, t + h * 0.3, l + w * 0.8, t + h * 0.38);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = '#d0503f';
  c.beginPath();
  c.arc(l + w * 0.8, t + h * 0.36, s * 0.1, 0, 7);
  c.fill();
  c.restore();
}

export const MARKS = {
  face: (c, { w, h, deco: d }) => catFace(c, w / 2, -h + (d.label ? d.label[0] * h + d.label[1] / 2 + 1 : h * 0.35), Math.min(18, w * 0.62)),
  yarn: (c, { w, h }) => yarn(c, w / 2, -h * 0.55, Math.min(6.5, w * 0.24)),
  paw: (c, { w, h, deco: d }) => {
    const [px, py, pa] = d.paw || [0.5, 0.5, 0];
    paw(c, w * px, -h + h * py, Math.min(w * 0.62, 16), pa);
  },
  comic: (c, { w, h }) => comic(c, w / 2, -h * 0.5, Math.min(w * 0.36, 10)),
  map: (c, { w, h }) => foldedMap(c, w / 2, -h * 0.5, Math.min(w * 0.7, 18)),
};
