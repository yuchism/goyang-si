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
];
(async()=>{const port=process.argv[2],out=process.argv[3],only=process.argv[4];fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch();const errs={};
 for(const sc of SCEN){if(only&&!only.split(',').includes(sc.n))continue;
  const ctx=await b.newContext({viewport:{width:sc.vp[0],height:sc.vp[1]},deviceScaleFactor:sc.dpr||1,timezoneId:'Australia/Sydney',locale:process.env.VC_LOCALE||'ko-KR'});
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
   if(st.shot)await p.locator('#cv').screenshot({path:`${out}/${sc.n}_${k++}.png`,animations:'disabled'});
   if(st.page)await p.screenshot({path:`${out}/${sc.n}_${k++}.png`,animations:'disabled'});
  }
  await ctx.close()}
 fs.writeFileSync(`${out}/errors.json`,JSON.stringify(errs,null,1));console.log(JSON.stringify(errs));await b.close()})();
