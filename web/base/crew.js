/* 기지 식구 둘 더 (tasks/base-2b-family.md) — 검은 고양이(검수 의자) · 붓 고양이(이젤)
   - family.js가 부른다: 자세는 crewPoses(상태), 그리기는 makeCrew(...).frame(P, now)
   - 한도 대기(factory.limit)면 식구가 보물상자 옆에 줄 서서 꾸벅 — 자리는 scene.json fam.line [강고양이, 검은 고양이, 붓 고양이]
   - 그림은 base/fam/black-*·brush-* (기준점·배율은 scene.json fam.art). 자리(fam.black·fam.brush)가 없으면 그 식구만 안 나온다
   - 밤엔 검은 고양이에 옅은 테두리 빛(base.css .fs.blackcat) — 어두운 바탕에 묻히지 않게 */

const has = (d, st) => d.tasks.some(t => t.stage === st);
const BLACK_IDLE = ['doze', 'doze', 'loupe', 'doze'], BRUSH_IDLE = ['doze', 'paint', 'doze', 'doze', 'paint'];
const pick = (now, ms, list, salt) => list[(Math.floor(now / ms) * 2654435761 + salt * 97) % 4294967296 % list.length]; // family.js idlePick과 같은 식

/* 상태 → 자세. 그림 검수도 검은 고양이(STATUS_JSON: roles.review) */
export function crewPoses(d) {
  const busy = k => d.roles[k] === 'busy';
  const black = has(d, 'relay') ? 'read' : busy('review') || has(d, 'review') || has(d, 'image_check') ? 'loupe' : 'doze';
  const brush = busy('image') || has(d, 'image') ? 'paint' : 'doze';
  return { black, brush, line: !!d.factory.limit };
}

/* 다시 그리기 = 그림 검수 → 그림으로 돌아옴: 지난번엔 image_check가 있었고 지금 image가 늘었으면 한숨 한 번 */
export const crewSnap = d => ({
  image: d.tasks.filter(t => t.stage === 'image').length,
  check: d.tasks.filter(t => t.stage === 'image_check').length,
});
export const redrawn = (prev, s) => !!prev && prev.check > 0 && typeof prev.image === 'number' && s.image > prev.image;

// face 1 = 오른쪽을 봄 (그림은 모두 왼쪽 보기)
const BLACK_FACE = 1, BRUSH_FACE = 1, LINE_FACE = -1;

export function makeCrew({ F, sprite, draw, RM }) {
  const black = F.black ? sprite('blackcat') : null;
  const brush = F.brush ? sprite('painter') : null;
  let sighUntil = 0;
  return {
    frame(P, now) {
      const line = P.line && F.line ? F.line : null;
      if (black)
        draw(black, 'fam:black-' + (line ? 'doze' : P.idle ? pick(now, 25000, BLACK_IDLE, 5) : P.black), line ? line[1] : F.black, line ? LINE_FACE : BLACK_FACE);
      if (brush) {
        const pose = line ? 'doze' : now < sighUntil ? 'sigh' : P.idle ? pick(now, 35000, BRUSH_IDLE, 7) : P.brush;
        draw(brush, 'fam:brush-' + pose, line ? line[2] : F.brush, line ? LINE_FACE : BRUSH_FACE);
        brush.n.classList.toggle('stroke', !RM && pose === 'paint');
      }
    },
    sigh(ms) {
      sighUntil = performance.now() + ms;
    },
    names: ['black-loupe', 'black-read', 'black-doze', 'brush-paint', 'brush-sigh', 'brush-doze'],
  };
}
