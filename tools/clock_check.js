// 시계 점검 (CLOCK_PLAN.md 10장): 가짜 기기 시계로 화면 끄기·뒤 탭·서머타임·빨리 감기를 흉내 내고 결과를 확인한다
// 쓰는 법: (web 폴더를 서버로 띄운 뒤) node tools/clock_check.js 8000   → 항목마다 OK/FAIL
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const port = process.argv[2];
const INIT = T0 => `(()=>{let t=0;const T0=${T0};const RD=Date;
class FD extends RD{constructor(...a){if(a.length===0)super(T0+t);else super(...a)}static now(){return T0+t}}window.Date=FD;
performance.now=()=>t;let q=[];window.requestAnimationFrame=cb=>{q.push(cb);return q.length};
let timers=[],tid=1;window.setTimeout=(f,ms=0,...a)=>{timers.push({id:tid,at:t+(+ms||0),f,a});return tid++};window.clearTimeout=id=>{timers=timers.filter(x=>x.id!==id)};
let seed=12345;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
window.__step=(n,dt=1000/30)=>{for(let i=0;i<n;i++){t+=dt;const due=timers.filter(x=>x.at<=t).sort((a,b)=>a.at-b.at);timers=timers.filter(x=>x.at>t);due.forEach(x=>x.f(...x.a));const cbs=q;q=[];cbs.forEach(cb=>cb(t))}};
window.__off=ms=>{t+=ms};  // 화면 꺼짐: 그리기 없이 시간만 흐른다 (타이머도 멈춘 것으로)
window.__visible=()=>{Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});document.dispatchEvent(new Event('visibilitychange'))};
window.__ready=()=>q.length>0;})();`;
// 시드니 현지 시각 → ms
const L = (y, mo, d, h, mi = 0) => { process.env.TZ = 'Australia/Sydney'; return new Date(y, mo - 1, d, h, mi).getTime(); };
const results = [];
const ok = (name, cond, info) => { results.push([cond ? 'OK ' : 'FAIL', name, info]); };
async function page(b, T0) {
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 }, timezoneId: 'Australia/Sydney', locale: 'ko-KR' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(INIT(T0)); await p.route(/goatcounter|zgo\.at|fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto(`http://localhost:${port}/index.html?dev=1`);
  for (let i = 0; i < 100; i++) { if (await p.evaluate(() => !!(window.__ready && window.__ready()))) break; await new Promise(r => setTimeout(r, 200)); }
  await p.evaluate(() => __step(30));
  p.errs = errs; p.ctx = ctx; return p;
}
const st = p => p.evaluate(() => { const g = __goyang, d = g.now(); return { lag: Date.now() - d.getTime(), hm: d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'), jumps: g.world.jumps || 0, lamp: g.world.lampOn, bowl: g.world.bowlFull, cup: g.world.cup.state, tag: g.cat.tag, man: !!g.world.manduk, done: Object.keys(g.world.doneToday).join(','), visits: g.world.visitsToday, fade: !!g.world.jumpFade, tz: d.getTimezoneOffset(), status: document.getElementById('status').textContent }; });
(async () => {
  const b = await chromium.launch();
  let p, s;
  // 1. 화면을 30분 끄고 다시 켜면 방 시계 = 기기 시계, 연출 있음, 고양이는 자연스러운 자세
  p = await page(b, L(2026, 10, 13, 12, 0));
  await p.evaluate(() => { __off(30 * 60e3); __step(1); });
  s = await st(p);
  ok('화면 30분 끄기 → 시계 맞음', Math.abs(s.lag) < 200 && s.hm === '12:30', s);
  ok('  점프 1번 + 연출', s.jumps === 1 && s.fade, s);
  ok('  고양이 자세', ['nap', 'loaf'].includes(s.tag), s.tag);
  await p.evaluate(() => __step(30)); s = await st(p); ok('  연출 0.6초 뒤 끝', !s.fade, s.fade);
  // 1-2. visibilitychange 경로 (그리기 전에 맞춤)
  await p.evaluate(() => { __off(20 * 60e3); __visible(); });
  s = await st(p); ok('다시 보일 때 확인 (그리기 전)', s.jumps === 2, s.jumps);
  await p.evaluate(() => __step(2)); s = await st(p); ok('  그다음 장면에서 두 번 잡지 않음', s.jumps === 2 && Math.abs(s.lag) < 200, s);
  // 2. 다른 창 뒤 10분 (초당 1번 그리기)
  await p.evaluate(() => __step(600, 1000)); s = await st(p);
  ok('뒤 탭 10분 → 시계 맞음, 점프 아님', Math.abs(s.lag) < 1000 && s.jumps === 2, s);
  ok('오류 없음 (1~2)', !p.errs.length, p.errs); await p.ctx.close();
  // 3. 해 질 무렵 직전에 끄고 1시간 뒤 → 스탠드 켜짐 (시드니 기기: 봄, 해 지는 시각 18.6 → 스탠드 18:18)
  p = await page(b, L(2026, 10, 13, 18, 5));
  s = await st(p); const before = s.lamp;
  await p.evaluate(() => { __off(60 * 60e3); __step(2); }); s = await st(p);
  ok('해 질 무렵 1시간 꺼짐 → 스탠드 켜짐', before === false && s.lamp === true && s.done.includes('lampOn') && !s.man, s);
  ok('  18:36 퇴근 방문은 장면 없이 지남, 밥그릇은 30분 안이라 참', s.done.includes('ret') && s.bowl === true, s);
  await p.ctx.close();
  // 4. 22:50에 끄고 23:30에 켜면 스탠드 꺼짐
  p = await page(b, L(2026, 10, 13, 22, 50));
  s = await st(p); const lb = s.lamp;
  await p.evaluate(() => { __off(40 * 60e3); __step(2); }); s = await st(p);
  ok('22:50 → 23:30 스탠드 꺼짐, 불 끄기 방문 없음', lb === true && s.lamp === false && !s.man && s.done.includes('lights'), s);
  await p.ctx.close();
  // 5. 컵·밥그릇: 07:00 컵 바닥 → 09:00 (밥 7:24 지남) → 컵 탁자, 밥그릇 빔
  p = await page(b, L(2026, 10, 13, 7, 0));
  await p.evaluate(() => { __goyang.world.cup.state = 'floor'; __goyang.world.cup.fy = 640; __off(2 * 3600e3); __step(2); }); s = await st(p);
  ok('밥 시간 지나 켜면 컵 탁자, 밥그릇 빔', s.cup === 'table' && s.bowl === false, s);
  await p.ctx.close();
  // 5-2. 밥 시각 직후(07:35)에 켜면 찬 그릇, 컵 바닥은 방문이 없었으면 그대로
  p = await page(b, L(2026, 10, 13, 6, 0));
  await p.evaluate(() => { __goyang.world.cup.state = 'floor'; __goyang.world.cup.fy = 640; __off(60 * 60e3); __step(2); }); s = await st(p);
  ok('07:00 (방문 전) 컵은 바닥 그대로', s.cup === 'floor', s);
  await p.evaluate(() => { __off(35 * 60e3); __step(2); }); s = await st(p);
  ok('07:35 밥 직후 → 찬 그릇, 컵 탁자', s.bowl === true && s.cup === 'table', s);
  await p.ctx.close();
  // 6. 만득 씨 방문 중 점프 → 바로 끝, 남은 타이머가 나중에 결과를 덮지 않음
  p = await page(b, L(2026, 10, 13, 22, 59));
  await p.evaluate(() => __step(30 * 70)); s = await st(p); const midVisit = s.man;  // 23:00 불 끄기 방문 시작
  await p.evaluate(() => { __off(30 * 60e3); __step(1); }); s = await st(p);
  ok('방문 중 점프 → 방문 끝, 스탠드 꺼짐', midVisit && !s.man && s.lamp === false, s);
  await p.evaluate(() => __step(300)); s = await st(p);
  ok('  이후 이상 없음', !s.man && s.lamp === false && !p.errs.length, { s, e: p.errs });
  await p.ctx.close();
  // 7. 빨리 감기에서는 점프 처리가 일어나지 않고 일정은 그대로 일어남
  p = await page(b, L(2026, 10, 13, 6, 0));
  await p.evaluate(() => { document.getElementById('sp60').click(); __step(30 * 60 * 3); }); s = await st(p);
  ok('1분=1시간으로 3시간 → 점프 0, 밥 방문 일어남', s.jumps === 0 && s.done.includes('feed') && s.visits >= 1, s);
  await p.evaluate(() => { document.getElementById('sp1440').click(); __step(30 * 60); }); s = await st(p);
  ok('1분=하루로 하루 → 점프 0', s.jumps === 0, s);
  await p.evaluate(() => document.getElementById('devNow').click()); s = await st(p);
  ok('"지금으로" → 기기 시계', Math.abs(s.lag) < 50, s);
  ok('오류 없음 (7)', !p.errs.length, p.errs); await p.ctx.close();
  // 8. 서머타임 시작 (2026-10-04 02:00 → 03:00): 점프 1번, 사건 중복·누락 없음
  p = await page(b, L(2026, 10, 4, 1, 58));
  const tz0 = (await st(p)).tz;
  await p.evaluate(() => __step(30 * 60 * 5)); s = await st(p);
  ok('서머타임 시작: 점프 1번, 시각 03:0x', s.jumps === 1 && s.tz !== tz0 && s.hm.startsWith('3:0') && s.visits === 0, s);
  await p.ctx.close();
  // 9. 서머타임 끝 (2026-04-05 03:00 → 02:00)
  p = await page(b, L(2026, 4, 5, 2, 58));
  await p.evaluate(() => __step(30 * 60 * 5)); s = await st(p);
  ok('서머타임 끝: 점프 1번, 02:0x, 사건 없음', s.jumps === 1 && s.hm.startsWith('2:0') && s.visits === 0, s);
  await p.ctx.close();
  // 10. 같은 시각 두 기기: 한쪽은 1시간 꺼 두었다가 → 같은 고양.방송
  const T = L(2026, 10, 13, 20, 0);
  const p1 = await page(b, T), p2 = await page(b, T + 3600e3 + 1000);
  await p1.evaluate(() => { __off(3600e3); __step(1); });
  const tv = pp => pp.evaluate(() => { const s = __goyang.world.tv.st; return s && [s.mode, s.p, s.key, Math.floor(s.tIn || 0)].join('|'); });
  const [a1, a2] = [await tv(p1), await tv(p2)];
  ok('두 기기 같은 방송 (한쪽 1시간 꺼짐)', a1 === a2, [a1, a2]);
  await p1.ctx.close(); await p2.ctx.close();
  // 11. +1시간 점프 버튼
  p = await page(b, L(2026, 10, 13, 18, 0));
  await p.evaluate(() => document.getElementById('devJump').click()); s = await st(p);
  ok('+1시간 점프 버튼 → 19:00, 스탠드 켜짐, 연출', s.hm === '19:00' && s.lamp && s.fade, s);
  await p.ctx.close();
  await b.close();
  for (const r of results) console.log(r[0], r[1], r[0] === 'FAIL' ? JSON.stringify(r[2]) : '');
  console.log(results.filter(r => r[0] === 'FAIL').length + ' fail / ' + results.length);
})();
