/* 무대: 낮은 해상도 그림판과 카메라 (CAMPSITE_PLAN.md 4장, tasks/campsite-7-stack.md)
   - 모든 것을 작은 그림판(한 픽셀 = 화면 STACK.px)에 그린 뒤, 흐림 없이 키워 화면 캔버스로 옮긴다(present)
   - 카메라는 불을 가운데 두고 돎(angle). 바닥은 SQ만큼 납작한 원, 높이는 판 하나에 ZS배 — 둘이 '세운' 정도
   - 모형 좌표는 복셀(voxels.js N칸), 기억 태우기·연기는 예전 '세계' 단위(불 반지름 약 0.4) — VPU로 바꿈
   - 화면 캔버스 위에는 화면 픽셀(CSS px)로 그리는 것(기억 태우기 글자)만 얹음 */
export const STACK = {
  px: 2,          // 한 픽셀 = 화면 2px (회의 2026-11-25)
  SQ: 0.24,       // 바닥 원이 납작한 정도 (작을수록 옆에서 봄) — 거의 눈높이, 배경 산·호수와 시야를 맞춤 (주인 2026-11-26)
  ZS: 1.65,       // 판 하나 높이 배
  VPU: 39,        // 세계 1 = 복셀 39칸 (돌 둘레 반지름 약 0.66)
  fireY: 0.68,    // 불 자리 (화면 높이 비율) — 물가(shore)를 알기 전까지만
  onGround: 0.42, // 불 자리 = 물가와 화면 아래 사이의 이 비율 (주인 2026-11-26: 노트북에서 불이 물 위로 솟아 보임)
  fit: [0.95, 0.62], // 모형 폭 = min(화면 폭 × [0], 화면 높이 × [1])
};

export function makeStage(canvas, N) {
  const vctx = canvas.getContext('2d'), low = document.createElement('canvas'), ctx = low.getContext('2d');
  let S = STACK.px, W = 0, H = 0, w = 0, h = 0, dpr = 1, sc = 1, zs = 1, kp = 1, gen = 0;
  let ca = 1, sa = 0, angle = 0, shore = null;
  const resize = () => {
    w = innerWidth;
    h = innerHeight;
    dpr = devicePixelRatio || 1;
    W = Math.ceil(w / S);
    H = Math.ceil(h / S);
    low.width = W;
    low.height = H;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    fitScale();
    gen++;
  };
  // 모형 크기: 화면에 맞추되, 물가를 알면 뒤쪽 끝이 물가 아래·앞쪽 끝이 타자 줄 위에 오게 줄임
  //  (주인 2026-11-26: 창이 낮으면 모닥불이 물 위로 솟아 보임)
  function fitScale() {
    sc = Math.min(w * STACK.fit[0], h * STACK.fit[1]) / S / N; // 복셀 하나 → 그림판 픽셀
    if (shore !== null) {
      const c = cy(), half = N / 2 * STACK.SQ;
      sc = Math.max(0.5, Math.min(sc, (c - shore - 2) / half, (H - 90 / S - c) / half));
    }
    zs = sc * STACK.ZS;
    kp = sc * 2;          // 바닷가 POC(48칸, 1배)에서 맞춘 입자 숫자를 이 크기로
  }
  resize();
  addEventListener('resize', resize);
  const cx = () => Math.round(W / 2), cy = () => Math.round(shore === null ? H * STACK.fireY : shore + (H - shore) * STACK.onGround);
  // 복셀 좌표(가운데 기준 u·v, 높이 z) → 그림판 픽셀
  const lowAt = (u, v, z) => {
    const ru = u * ca - v * sa, rv = u * sa + v * ca;
    return [cx() + ru * sc, cy() + rv * sc * STACK.SQ - z * zs, rv];
  };
  return {
    ctx, low,
    get W() { return W; }, get H() { return H; }, get S() { return S; },
    get width() { return w; }, get height() { return h; },
    get sc() { return sc; }, get zs() { return zs; }, get kp() { return kp; }, get gen() { return gen; },
    get cx() { return cx(); }, get cy() { return cy(); },
    get angle() { return angle; },
    set angle(a) { angle = a; ca = Math.cos(a); sa = Math.sin(a); },
    lowAt,
    // 배경의 가까운 물가 높이(그림판 픽셀) — 불을 그 아래 땅 위에 놓음
    ground(y) { if (y !== shore) { shore = y; fitScale(); } },
    // 세계 좌표(x 옆, y 위, z 앞뒤) → 화면 픽셀 [x, y, 깊이(앞일수록 큼, 늘 양수)] — memory.js·smoke.js가 씀
    project(x, y, z) {
      const [lx, ly, rv] = lowAt(x * STACK.VPU, z * STACK.VPU, y * STACK.VPU);
      return [lx * S, ly * S, 2 + rv / N];
    },
    // 그림판을 화면으로. 그 뒤 vctx는 화면 픽셀 좌표(CSS px)
    present() {
      vctx.setTransform(1, 0, 0, 1, 0, 0);
      vctx.imageSmoothingEnabled = false;
      vctx.drawImage(low, 0, 0, Math.round(W * S * dpr), Math.round(H * S * dpr));
      vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    screen: vctx,
  };
}
