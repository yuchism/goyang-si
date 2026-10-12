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
 {n:'hw_eve',url:'',vp:[1300,900],steps:[{h:20},{js:"__goyang.setOverride('holiday','halloween')"},{s:200,shot:1}]},
 {n:'hw_late',url:'',vp:[1300,900],steps:[{h:21},{js:"__goyang.setOverride('holiday','halloween')"},{h:2.5},{s:300,shot:1}]},
 {n:'hw_bats',url:'',vp:[1300,900],steps:[{h:21},{js:"__goyang.setOverride('holiday','halloween')"},{s:30},{js:"document.getElementById('dBat').click()"},{s:40,shot:1},{s:30,shot:1},{s:30,shot:1}]},
 {n:'hw_witch',url:'',vp:[1300,900],steps:[{h:21},{js:"__goyang.setOverride('holiday','halloween')"},{s:30},{js:"__goyang.world.witch=null;__goyang.world.curtainShadow=null"},{js:"window.__sw&&0"},{js:"(async()=>{const m=await import('/js/halloween.js');m.startWitch(false)})()"},{s:200,shot:1},{s:150,shot:1},{s:150,shot:1}]},
 {n:'hw_shadow',url:'',vp:[1300,900],steps:[{h:21},{js:"__goyang.setOverride('holiday','halloween')"},{s:30},{js:"(async()=>{const m=await import('/js/halloween.js');m.startWitch(true)})()"},{s:30,shot:1},{s:30,shot:1},{s:30,shot:1},{s:150,shot:1}]},
 {n:'hw_ghost',url:'',vp:[1300,900],steps:[{h:21},{js:"__goyang.setOverride('holiday','halloween')"},{s:30},{js:"(async()=>{const m=await import('/js/halloween.js');m.startGhost()})()"},{s:30,shot:1},{s:45,shot:1},{s:45,shot:1},{s:60,shot:1},{s:120,shot:1},{s:150,shot:1}]},
 {n:'hw_tv',url:'',vp:[1300,900],steps:[{h:22.25},{js:"__goyang.setOverride('holiday','halloween')"},{s:30},{js:"(()=>{const g=__goyang;g.world.tv.st=null;g.cat.x=900;g.cat.y=660;g.tvWatchB()})()"},{s:150,shot:1},{js:"document.getElementById('dTv').click()"},{s:8,shot:1},{s:20,shot:1},{js:"document.getElementById('aTv').click()"},{s:5,page:1}]},
];
(async()=>{const port=process.argv[2],out=process.argv[3],only=process.argv[4];fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch();const errs={};
 for(const sc of SCEN){if(only&&!only.split(',').includes(sc.n))continue;
  const ctx=await b.newContext({viewport:{width:sc.vp[0],height:sc.vp[1]},deviceScaleFactor:sc.dpr||1,timezoneId:'Australia/Sydney',locale:'ko-KR'});
  const p=await ctx.newPage();errs[sc.n]=[];p.on('pageerror',e=>errs[sc.n].push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs[sc.n].push(m.text())});
  await p.addInitScript(INIT);await p.route(/goatcounter|zgo\.at|fonts\.(googleapis|gstatic)/,r=>r.abort());
  await p.goto(`http://localhost:${port}/index.html${sc.url}`);
  for(let i=0;i<100;i++){if(await p.evaluate(()=>!!(window.__ready&&window.__ready())))break;await new Promise(r=>setTimeout(r,200))}await new Promise(r=>setTimeout(r,300));
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
