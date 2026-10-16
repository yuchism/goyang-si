// 화면 점검: 시계·무작위·타이머·애니메이션 프레임을 가짜로 바꿔 매번 똑같이 진행시키고, 정해진 장면을 찍는다.
// 코드를 고친 전후로 찍어 compare.py로 비교하면 동작이 바뀌었는지 픽셀 단위로 알 수 있다.
// 쓰는 법: (web 폴더를 서버로 띄운 뒤) node tools/visual_check.js 8000 shots_before [장면이름,...]
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const fs=require('fs');
const INIT=`(()=>{let t=0;const T0=${Date.UTC(2026,9,13,3,0,0)};const RD=Date;
class FD extends RD{constructor(...a){if(a.length===0)super(T0+t);else super(...a)}static now(){return T0+t}}window.Date=FD;
performance.now=()=>t;let q=[];window.requestAnimationFrame=cb=>{q.push(cb);return q.length};
let timers=[],tid=1;window.setTimeout=(f,ms=0,...a)=>{timers.push({id:tid,at:t+(+ms||0),f,a});return tid++};window.clearTimeout=id=>{timers=timers.filter(x=>x.id!==id)};
let seed=12345;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
window.__reseed=s=>{seed=s>>>0};
window.__step=(n,dt=1000/30)=>{for(let i=0;i<n;i++){t+=dt;const due=timers.filter(x=>x.at<=t).sort((a,b)=>a.at-b.at);timers=timers.filter(x=>x.at>t);due.forEach(x=>x.f(...x.a));const cbs=q;q=[];cbs.forEach(cb=>cb(t))}};
window.__ready=()=>q.length>0;})();`;
const SCEN=[
 {n:'day',url:'',vp:[1300,900],steps:[{h:14},{s:300,shot:1},{s:1800,shot:1}]},
 {n:'night',url:'',vp:[1300,900],steps:[{h:21.5},{s:900,shot:1}]},
 {n:'late',url:'',vp:[1300,900],steps:[{h:1+1/60},{s:60,shot:1},{h:1+2/60},{s:15,shot:1},{s:60,shot:1},{h:3},{s:60,shot:1},{h:5},{s:12,shot:1},{s:60,shot:1},{h:5+7/60},{s:60,shot:1}]},
 {n:'tvacts',url:'',vp:[1300,900],steps:[{h:15},{s:30},{js:"(()=>{const g=__goyang;g.cat.x=480;g.cat.y=700;g.tvWatchB()})()"},{s:150,shot:1},{js:"document.getElementById('dTv').click()"},{s:60,shot:1},{js:"(()=>{const g=__goyang;g.cat.x=620;g.cat.y=645;g.tvTopB()})()"},{s:200,shot:1},{js:"(()=>{const g=__goyang;g.cat.x=640;g.cat.y=600;g.tvPeekB()})()"},{s:150,shot:1}]},
 {n:'party',url:'?birthday=만득',vp:[1300,900],steps:[{h:21},{s:30},{js:"document.getElementById('birthday').click()"},{s:20,shot:1},{s:150,shot:1},{s:300,shot:1},{s:150,shot:1},{s:300,shot:1}]},
 {n:'xmas',url:'',vp:[1300,900],steps:[{h:22},{js:"document.getElementById('dXmas').click();document.getElementById('dSanta').click()"},{s:240,shot:1}]},
 {n:'visit',url:'',vp:[1300,900],steps:[{h:19},{js:"document.getElementById('dMan').click()"},{s:120,shot:1},{s:150,shot:1}]},
 {n:'misc',url:'',vp:[1300,900],steps:[{h:13},{js:"['dRain','dBox','dMouse'].forEach(i=>document.getElementById(i).click())"},{s:200,shot:1},{js:"document.getElementById('dSeason').click();document.getElementById('dBfly').click()"},{s:300,shot:1},{h:22},{js:"document.getElementById('dUfo').click()"},{s:200,shot:1},{js:"document.getElementById('dSecret').click()"},{s:400,shot:1},{js:"document.getElementById('dKnock').click()"},{s:400,shot:1}]},
 {n:'ui',url:'',vp:[1300,900],steps:[{h:19},{s:30},{js:"document.getElementById('aTv').click()"},{s:5,page:1},{js:"document.getElementById('aTv').blur();document.querySelector('#tvg .x').click();document.getElementById('aNote').click()"},{s:5,page:1},{js:"document.getElementById('aShelf').click()"},{s:5,page:1}]},
 {n:'mobile',url:'',vp:[390,780],dpr:2,steps:[{h:14},{s:300,page:1}]},
 {n:'long',url:'',vp:[1300,900],steps:[{h:6},{js:"document.getElementById('sp60').click()"},{s:9000,shot:1},{s:9000,shot:1},{s:9000,shot:1}]},
 // 창밖 풍경 (WINDOW_PLAN.md): 난간의 새 + 채터링, 검은 고양이 빼꼼(밤 눈), 밤 비행기 불빛, 무지개, 천둥 번쩍임. 창 불빛은 night·late 장면
 // 3차 창밖 풍경 (WINDOW_PLAN_3.md 12장): 풍경 날짜를 옮겨 가며 산·계절 (10-13, 11-01, 11-25, 01-15, 03-20, 04-12, 05-05, 07-15, 09-30), 노을·동틀 녘, 밤 번개
 {n:'scenery',url:'',vp:[1300,900],steps:[{h:14},{js:"__goyang.setOverride('scenery',0.780822)"},{s:20,shot:1},{js:"__goyang.setOverride('scenery',0.832877)"},{s:20,shot:1},{js:"__goyang.setOverride('scenery',0.898630)"},{s:20,shot:1},{js:"__goyang.setOverride('scenery',0.038356)"},{s:20,shot:1},{js:"__goyang.setOverride('scenery',0.213699)"},{s:20,shot:1},{js:"__goyang.setOverride('scenery',0.276712)"},{s:20,shot:1},{js:"__goyang.setOverride('scenery',0.339726)"},{s:20,shot:1},{js:"__goyang.setOverride('scenery',0.534247)"},{s:20,shot:1},{js:"__goyang.setOverride('scenery',0.745205)"},{s:20,shot:1}]},
 {n:'dusk',url:'',vp:[1300,900],steps:[{h:17.85},{s:30,shot:1},{h:6.75},{s:30,shot:1},{h:7.5},{s:30,shot:1}]},
 {n:'nightwx',url:'',vp:[1300,900],steps:[{h:21.5},{js:"document.getElementById('dThunder').click()"},{s:3,shot:1},{js:"__goyang.setOverride('scenery',0.0384)"},{s:60,shot:1}]},
 // 3차 계절 손님 (seasons.js): 낙엽(난간 앉기), 철새, 벚꽃잎, 잠자리, 미세먼지, 난간 눈·성에(겨울 아침), 첫눈
 {n:'seasons',url:'',vp:[1300,900],steps:[{h:14},{js:"document.getElementById('dLeaves').click()"},{s:90,shot:1},{s:150,shot:1},{js:"document.getElementById('dGeese').click()"},{s:300,shot:1},{js:"__goyang.setOverride('scenery',0.276712)"},{js:"document.getElementById('dBlossom').click()"},{s:30,shot:1},{js:"document.getElementById('dBlossom').click()"},{js:"__goyang.setOverride('scenery',0.646575)"},{js:"document.getElementById('dDragonfly').click()"},{s:200,shot:1},{js:"__goyang.setOverride('scenery',0.312329)"},{js:"document.getElementById('dDust').click()"},{s:20,shot:1},{js:"document.getElementById('dDust').click()"},{h:7.6},{js:"__goyang.setOverride('scenery',0.038356)"},{js:"document.getElementById('dRailSnow').click()"},{js:"document.getElementById('dFrost').click()"},{s:20,shot:1},{js:"document.getElementById('dRailSnow').click()"},{js:"document.getElementById('dFrost').click()"},{h:14},{js:"document.getElementById('dFirstSnow').click()"},{s:600,shot:1}]},
 {n:'window',url:'',vp:[1300,900],steps:[{h:14},{js:"(()=>{const g=__goyang;g.run(g.cat,[g.hold(60,'loaf')],'loaf');g.cat.closed=false})()"},{js:"document.getElementById('dBird').click()"},{s:150,shot:1},{h:21},{js:"document.getElementById('dBlackcat').click()"},{s:80,shot:1},{js:"document.getElementById('dPlane').click()"},{s:300,shot:1},{h:15},{js:"document.getElementById('dRainbow').click()"},{s:60,shot:1},{js:"document.getElementById('dThunder').click()"},{s:3,shot:1}]},
];
(async()=>{const port=process.argv[2],out=process.argv[3],only=process.argv[4];fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch();const errs={};
 for(const sc of SCEN){if(only&&!only.split(',').includes(sc.n))continue;
  const ctx=await b.newContext({viewport:{width:sc.vp[0],height:sc.vp[1]},deviceScaleFactor:sc.dpr||1,timezoneId:process.env.VC_TZ||'Asia/Seoul',locale:process.env.VC_LOCALE||'ko-KR'});
  const p=await ctx.newPage();errs[sc.n]=[];p.on('pageerror',e=>errs[sc.n].push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs[sc.n].push(m.text())});
  await p.addInitScript(INIT);await p.route(/goatcounter|zgo\.at|fonts\.(googleapis|gstatic)/,r=>r.abort());
  await p.goto(`http://localhost:${port}/index.html${sc.url}`);
  for(let i=0;i<100;i++){if(await p.evaluate(()=>!!(window.__ready&&window.__ready())))break;await new Promise(r=>setTimeout(r,200))}await new Promise(r=>setTimeout(r,300));
  // TV 프로그램 그림은 필요할 때 받는다(TV_STABILITY_PLAN.md 4장). 점검에서는 처음에 모두 받아 두고 시작한다 (받는 속도에 따라 화면이 달라지지 않게)
  await p.evaluate(()=>{const g=window.__goyang;if(g&&g.tvNeed)Object.keys(g.TVP).forEach(g.tvNeed)});
  for(let i=0;i<100;i++){if(await p.evaluate(()=>!(window.__goyang&&__goyang.lazyPending&&__goyang.lazyPending())))break;await new Promise(r=>setTimeout(r,100))}
  await p.evaluate(()=>{document.getElementById('bDev').click()});await p.evaluate(()=>{__reseed(777);__step(1)});
  let k=0;
  for(const st of sc.steps){
   if(st.h!=null)await p.evaluate(h=>{const e=document.getElementById('hour');e.step='any';e.value=h;e.dispatchEvent(new Event('input'))},st.h);
   if(st.js)await p.evaluate(st.js);
   if(st.s)await p.evaluate(n=>__step(n),st.s);
   // 필요할 때 받는 그림(산 그림 등)이 아직 오는 중이면 기다렸다가 한 장면 더 그린 뒤 찍는다 (받는 속도에 따라 화면이 달라지지 않게)
   if(st.shot||st.page){let w=0;for(let i=0;i<100;i++){if(await p.evaluate(()=>!(__goyang.lazyPending&&__goyang.lazyPending())))break;w=1;await new Promise(r=>setTimeout(r,100))}if(w)await p.evaluate(()=>__step(1))}
   if(st.shot)await p.locator('#cv').screenshot({path:`${out}/${sc.n}_${k++}.png`,animations:'disabled'});
   if(st.page)await p.screenshot({path:`${out}/${sc.n}_${k++}.png`,animations:'disabled'});
  }
  await ctx.close()}
 fs.writeFileSync(`${out}/errors.json`,JSON.stringify(errs,null,1));console.log(JSON.stringify(errs));await b.close()})();
