/* 기억 태우기 (CAMPSITE_PLAN.md 5장, tasks/campsite-3-memory.md)
   - 화면 아래 고정된 한 줄에 타자기처럼 글자가 찍힘. 한글은 조합 중인 글자가 흐리게 미리 보이고, 조합이 끝나야 찍힘
   - 친 순서대로(빨리 쳐도 일정한 간격으로) 3D 공간의 모닥불로 날아 들어가 그을리며 타고 → 불이 잠깐 솟고 → 연기(smoke.js)
   - 줄 끝·엔터에 줄 바꿈, 한참(idleReturn초) 안 치면 조용히 처음으로. 백스페이스로 되돌릴 수 없음
   - 날아가는 동안 카메라를 돌려도 목적지(불 속의 한 점)를 따라감
   - 동작 줄이기: 날지 않고 그 자리에서 천천히 사라짐(연기 없음)
   - 소리(타자 키·줄 바꿈 '띵'·타닥)는 tasks/campsite-4-sound.md 에서 — 여기엔 onKey·onReturn·onBurn 자리만 */
export const MEMORY = {
  fontPx: 17,      // 타자 줄 글자 크기
  margin: 18,      // 줄 양끝 여백(px)
  bottom: 78,      // 화면 아래에서 타자 줄까지(px) — 그 아래는 입력 칸
  wait: 0.4,       // 찍힌 뒤 날아가기 시작할 때까지(초)
  gap: 0.11,       // 글자끼리 떠나는 최소 간격(초)
  fly: 1.1,        // 불까지 날아가는 시간
  burn: 0.7,       // 불 속에서 타는 시간
  idleReturn: 3,   // 안 치면 줄이 처음으로 돌아가는 시간
};
const INK = [232, 226, 212];
const BURN = [[0, INK], [0.15, [250, 199, 117]], [0.4, [239, 159, 39]], [0.6, [216, 90, 48]], [0.82, [153, 60, 29]], [1, [50, 20, 10]]];
function burnColor(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < BURN.length; i++) {
    if (t > BURN[i][0]) continue;
    const [ta, a] = BURN[i - 1], [tb, b] = BURN[i], k = (t - ta) / (tb - ta);
    return `rgb(${(a[0] + (b[0] - a[0]) * k) | 0},${(a[1] + (b[1] - a[1]) * k) | 0},${(a[2] + (b[2] - a[2]) * k) | 0})`;
  }
  return 'rgb(50,20,10)';
}
const now = () => performance.now() / 1000;

export function makeMemory({ view, fire, smoke, input, reduce, font, onKey, onReturn, onBurn }) {
  const M = MEMORY, letters = [];
  let cursor = M.margin, lastDep = 0, lastType = -9, preview = '';
  const lineY = () => view.height - M.bottom;
  const setFont = px => { view.ctx.font = `500 ${px}px ${font}`; };
  const carriage = quiet => {
    if (cursor > M.margin && !quiet && onReturn) onReturn();
    cursor = M.margin;
  };

  const stamp = ch => {
    setFont(M.fontPx);
    if (ch === '\n') { carriage(); return; }
    const w = view.ctx.measureText(ch).width || M.fontPx * 0.5;
    if (cursor + w > view.width - M.margin) carriage();
    const t = now();
    lastType = t;
    if (onKey) onKey();
    if (ch.trim()) {
      const dep = Math.max(t + M.wait, lastDep + M.gap);
      lastDep = dep;
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.15;
      letters.push({
        ch, x0: cursor + w / 2, y0: lineY(), t0: t, dep,
        to: [Math.cos(a) * r, 0.32 + Math.random() * 0.18, Math.sin(a) * r],
        rot: (Math.random() - 0.5) * 0.09, ink: 0.78 + Math.random() * 0.22, sw: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 25),
        ph: Math.random() * 6, burst: false,
      });
    }
    cursor += w;
  };

  // 입력 칸: 조합이 끝난 글자만 찍는다(조합 중인 마지막 글자는 미리 보기). 칸은 가끔 비워 둔다
  let spawned = 0, composing = false;
  const sync = () => {
    const arr = [...input.value], done = composing ? Math.max(0, arr.length - 1) : arr.length;
    if (done < spawned) spawned = done; // 지웠어도 이미 친 글자는 그대로 (되돌릴 수 없음)
    for (let i = spawned; i < done; i++) stamp(arr[i]);
    spawned = done;
    preview = composing ? arr[arr.length - 1] || '' : '';
    if (!composing && arr.length > 24) { input.value = ''; spawned = 0; }
  };
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; sync(); });
  input.addEventListener('input', e => { if (e.isComposing) composing = true; sync(); });
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    carriage();
    input.value = '';
    spawned = 0;
    preview = '';
  });

  const glyph = (c, x, y, px, rot, color, alpha) => {
    const ctx = view.ctx;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    setFont(px);
    ctx.fillText(c, 0, 0);
    ctx.restore();
  };

  return {
    // 타자 줄·날아가는 글자 그리기 (물체·불 위, 안개 아래)
    draw() {
      const t = now(), ctx = view.ctx, y = lineY();
      if (t - lastType > M.idleReturn && cursor > M.margin && !preview) carriage(true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = letters.length - 1; i >= 0; i--) {
        const L = letters[i];
        if (reduce) { // 날지 않고 그 자리에서 사라짐
          const a = 1 - (t - L.dep) / 1.5;
          if (a <= 0) { if (onBurn) onBurn(); fire.burst(0, 0, 0); letters.splice(i, 1); continue; }
          glyph(L.ch, L.x0, L.y0, M.fontPx, L.rot, burnColor(t < L.dep ? 0 : (1 - a) * 0.5), L.ink * Math.min(1, a));
          continue;
        }
        if (t < L.dep) { // 줄 위: 찍히는 순간 살짝 눌림
          const k = Math.min(1, (t - L.t0) / 0.06);
          glyph(L.ch, L.x0, L.y0 - 3 * (1 - k), M.fontPx, L.rot, burnColor(0), L.ink);
          continue;
        }
        const [ex, ey, dz] = view.project(...L.to);
        const top = view.project(L.to[0], L.to[1] + 0.15, L.to[2]);
        const endPx = Math.max(7, Math.min(M.fontPx, Math.abs(top[1] - ey)));
        const u = (t - L.dep) / M.fly;
        if (u < 1) { // 날아감: 곡선을 그리며 작아짐, 불 가까이서 그을림
          const e = u * u * (3 - 2 * u), arc = Math.sin(u * Math.PI);
          glyph(L.ch, L.x0 + (ex - L.x0) * e + arc * L.sw, L.y0 + (ey - L.y0) * e - arc * 40, M.fontPx + (endPx - M.fontPx) * e,
            L.rot * (1 + u * 3), burnColor(u < 0.6 ? 0 : (u - 0.6) / 0.4 * 0.35), L.ink);
          continue;
        }
        const b = (t - L.dep - M.fly) / M.burn;
        if (!L.burst) { L.burst = true; fire.burst(L.to[0], L.to[2]); if (onBurn) onBurn(); }
        if (b < 1) { // 불 속에서 탐: 떨리며 검게, 작아짐
          if (dz > 0.3) glyph(L.ch, ex + Math.sin(t * 30 + L.ph) * 0.8, ey + Math.cos(t * 27 + L.ph) * 0.8, endPx * (1 - 0.4 * b), L.rot, burnColor(0.35 + 0.65 * b), 1 - b * 0.4);
          continue;
        }
        smoke.add(L.to[0], L.to[1] + 0.2, L.to[2]);
        letters.splice(i, 1);
      }
      // 타자 줄: 흐린 밑줄 · 조합 중인 글자 · 깜빡이는 커서
      ctx.textAlign = 'left';
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = burnColor(0);
      ctx.fillRect(M.margin, y + M.fontPx * 0.7, view.width - M.margin * 2, 1);
      ctx.globalAlpha = 1;
      let cx = cursor;
      if (preview) {
        setFont(M.fontPx);
        const pw = ctx.measureText(preview).width;
        ctx.globalAlpha = 0.55;
        ctx.fillText(preview, cursor, y);
        ctx.fillRect(cursor, y + M.fontPx * 0.55, pw, 1);
        ctx.globalAlpha = 1;
        cx += pw;
      }
      if (Math.floor(t * 2) % 2 === 0 || t - lastType < 0.6) {
        ctx.globalAlpha = 0.7;
        ctx.fillRect(cx + 1, y + M.fontPx * 0.42, M.fontPx * 0.5, 1.5);
        ctx.globalAlpha = 1;
      }
      ctx.textBaseline = 'top';
    },
  };
}
