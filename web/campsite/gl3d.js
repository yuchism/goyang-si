/* WebGL로 그리는 아스키 3D 캠핑장 (CAMPSITE_PLAN.md 4장, tasks/campsite-6-webgl.md)
   두 번 그린다:
   ① 장면 셰이더 — 글자 칸 하나마다 색·밝기를 계산해 작은 그림판(칸 수만큼)에
      - 모닥불: 3D 잡음으로 만든 부피 있는 불 (불빛 일렁임·글자가 들어올 때 솟음 uGlow)
      - 돌·장작·앉는 통나무: 거리 함수(SDF), 불빛·숯불·달빛
      - 땅: 카메라 시선이 땅에 닿는 자리로 풀밭·호수·개울(scenery.js가 구운 땅 표). 호수엔 하늘·산·별이 잔물결로 비치고 달빛 길
      - 하늘: scenery.js가 구운 360도 하늘 표(산·달·은하수) + 별(방향 해시, 은하수 쪽에 더 많이)
   ② 글자 셰이더 — 칸의 밝기로 글자를 골라 글자 그림(아틀라스)에서 찍음. 글자 크기는 GLYPH_PX 하나
   카메라 셈은 ascii3d.js와 같다(project) — 위에 얹는 2D 그림(기억 태우기·연기·불씨·안개)이 같은 자리에 오게.
   WebGL이 안 되거나 셰이더가 실패하면 makeGLView가 null → campsite.js가 캔버스 그리기(ascii3d.js)로 */
export const GLYPH_PX = 3; // 글자 크기(CSS px) — 회의 2026-11-21: 3px (옛날 비디오 게임 느낌)
const RAMP = ' .,:;-=+*#%@';

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const SCENE = `precision highp float;
uniform vec2 uGrid,uCellDev,uScreen;uniform float uDevH,uDpr,uFpx,uHorizon,uPitch,uDist,uLookY,uYaw,uTime;
uniform vec3 uLight;uniform float uFlick,uLightPow,uFalloff,uGlow;
uniform vec3 uMoonDir,uMW;uniform float uMoonPow,uFront,uMoonRel,uLit;
uniform sampler2D uPano,uGround;uniform vec4 uPanoInfo,uGroundInfo;
const float TAU=6.2831853;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*noise(p);p*=2.03;a*=.5;}return s;}
float cap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
float ell(vec3 p,vec3 r){float k0=length(p/r),k1=length(p/(r*r));return k0*(k0-1.)/k1;}
// 돌 열둘·장작 셋·앉는 통나무 셋 (props.js와 같은 자리)
vec2 map(vec3 p){
 float d=1e9,m=-1.;
 for(int i=0;i<12;i++){float a=float(i)/12.*TAU+.1*sin(float(i)*3.);vec3 c=vec3(cos(a)*.66,.03,sin(a)*.66);float s=ell(p-c,vec3(.14,.1,.11));if(s<d){d=s;m=1.;}}
 float l=min(cap(p,vec3(-.48,.04,-.18),vec3(.42,.2,.12),.065),min(cap(p,vec3(.3,.04,-.46),vec3(-.16,.22,.38),.06),cap(p,vec3(.1,.04,.5),vec3(-.05,.24,-.42),.058)));
 if(l<d){d=l;m=2.;}
 for(int i=0;i<3;i++){float a=i==0?.55:(i==1?3.4:5.3);vec3 c=vec3(cos(a),0.,sin(a))*1.75;vec3 t=vec3(-sin(a),0.,cos(a))*.6;
  float s=cap(p,c-t+vec3(0,.17,0),c+t+vec3(0,.17,0),.17);if(s<d){d=s;m=3.;}}
 return vec2(d,m);}
vec3 nrm(vec3 p){vec2 e=vec2(.002,0);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
vec3 fireCol(float t){t=clamp(t,0.,1.);
 vec3 a=vec3(.43,.07,.02),b=vec3(.82,.24,.05),c=vec3(.99,.55,.14),d=vec3(1.,.84,.43),e=vec3(1.,.98,.89);
 return t<.3?mix(a,b,t/.3):t<.55?mix(b,c,(t-.3)/.25):t<.8?mix(c,d,(t-.55)/.25):mix(d,e,(t-.8)/.2);}
float wrapA(float a){return mod(a+3.14159265,TAU)-3.14159265;}
float azOf(vec3 d){return mod(atan(d.x,d.z),TAU);}
// 하늘 표: 산·달·은하수 색, a(0 하늘 / 은하수 짙기 / 1 산·달)
vec4 pano(float az,float el){
 float v=(el-uPanoInfo.x)/(uPanoInfo.y*uPanoInfo.z);
 if(v<0.||v>1.)return vec4(0.);
 return texture2D(uPano,vec2(fract(az/TAU),v));}
// 별: 방향 해시. 은하수 띠 안은 더 많이
vec3 stars(vec3 d,float k){
 float band=exp(-pow(dot(d,uMW)/.08,2.));
 vec3 sc=floor(d*300.);float h=hash(sc);float thr=.9935-.006*band;
 if(h<thr)return vec3(0.);
 float tw=.3+.7*abs(sin(uTime*(.5+fract(h*91.)*.8)+h*40.));
 return vec3(.8,.84,1.)*tw*k*min(1.,(h-thr)/(1.-thr)*2.+.25);}
vec3 sky(vec3 d){
 float el=asin(clamp(d.y,-1.,1.)),az=azOf(d);
 vec4 p=pano(az,el);
 vec3 c=vec3(.004,.006,.014)+p.rgb;
 if(p.a<.99)c+=stars(d,1.);
 return c;}
void main(){
 vec2 cellCss=uCellDev/uDpr;
 vec2 sp=vec2((floor(gl_FragCoord.x)+.5)*cellCss.x,(uDevH-(floor(gl_FragCoord.y)+.5)*uCellDev.y)/uDpr);
 float cp=cos(uPitch),spn=sin(uPitch),ca=cos(uYaw),sa=sin(uYaw);
 float x1=(sp.x-uScreen.x*.5)/uFpx,y2=-(sp.y-uScreen.y*uHorizon)/uFpx;
 float ry=y2*cp-spn,z1=y2*spn+cp;
 vec3 rd=normalize(vec3(x1*ca+z1*sa,ry,-x1*sa+z1*ca));
 vec3 ro=vec3(-uDist*cp*sa,uLookY+uDist*spn,-uDist*cp*ca);
 vec3 moon=uMoonDir;
 vec3 fl3=vec3(1.,.59,.24)*uFlick*uLightPow*.6;
 // 땅 평면
 float tg=rd.y<-1e-4?-ro.y/rd.y:1e9;
 // 가까운 물체: 둘레 공(반지름 2.3)에 닿는 광선만 걸음
 float t=0.,m=-1.;
 float bb=dot(ro,rd),bc=dot(ro,ro)-5.3,bd=bb*bb-bc;
 if(bd>0.){t=max(0.,-bb-sqrt(bd));float te=min(tg,-bb+sqrt(bd));
  for(int i=0;i<64;i++){vec3 p=ro+rd*t;vec2 h=map(p);if(h.x<.002){m=h.y;break;}t+=h.x;if(t>te)break;}}
 vec3 col;
 if(m>0.){
  vec3 p=ro+rd*t,n=nrm(p);
  vec3 alb=m==1.?vec3(.47,.46,.44):m==2.?vec3(.18,.12,.09):vec3(.43,.28,.16);
  vec3 L=uLight-p;float dd=length(L);L/=dd;
  col=alb*(fl3*(max(dot(n,L),0.)+.15)/(1.+dd*dd*uFalloff)+vec3(.41,.49,.75)*(max(dot(n,moon),0.)*uMoonPow+.02));
  float r=length(p.xz);
  if(m==2.&&r<.38){float g=(1.-r/.38)*(.6+.4*sin(uTime*5.+p.x*20.+p.z*13.))*uFlick;col+=fireCol(.35+g*.5)*g*.9;}
 }else if(tg<1e8){
  vec3 g=ro+rd*tg;float r=length(g.xz);
  float gaz=azOf(vec3(g.x,0.,g.z));
  float k=log(max(r,uGroundInfo.x)/uGroundInfo.x)/uGroundInfo.y;
  vec4 gt=texture2D(uGround,vec2(fract(gaz/TAU),(min(k,uGroundInfo.z-1.)+.5)/uGroundInfo.z));
  float type=floor(gt.r*255.+.5);
  vec3 L=uLight-vec3(g.x,0.,g.z);float dd=length(L);
  float fire=1./(1.+dd*dd*uFalloff);
  if(r<.78){ // 재: 가운데는 숯불처럼 숨 쉼
   col=vec3(.29,.27,.24)*(fl3*(L.y/dd+.15)*fire+vec3(.41,.49,.75)*uMoonPow*.7);
   if(r<.45){float e=(1.-r/.45)*.5*(.5+.5*noise(vec3(g.xz*12.,uTime*2.)));col+=fireCol(.3+e*.6)*e*.8;}
  }else if(type==2.){ // 호수: 비친 하늘·산·별 + 잔물결 + 달빛 길
   float rip=.006*sin(tg*1.3-uTime*1.4+gaz*72.)+.004*sin(tg*2.9+uTime*.9);
   vec3 rr=normalize(vec3(rd.x,-rd.y+rip,rd.z));
   float el=asin(rr.y),az=azOf(rr)+rip*.6;
   vec4 p=pano(az,el);
   float wv=sin(tg*2.3+gaz*90.-uTime*.8)*sin(tg*.7-gaz*40.+uTime*.5);col=vec3(.03,.04,.07)*(.4+1.2*max(0.,wv))+vec3(.03,.035,.06)*uMoonPow+p.rgb*.45;
   if(p.a<.99)col+=stars(rr,.45);
   float mp=abs(wrapA(azOf(rd)-uFront-uMoonRel));
   float pw=.022*uLit+.003;if(mp<pw&&hash(vec3(floor(tg*2.),floor(uTime*2.5),floor(gaz*260.)))<.22*uLit*(1.-mp/pw))col+=vec3(.7,.72,.66)*(.25+.35*uLit);
  }else if(type==3.){ // 개울: 흐름을 따라 물결이 내려감
   float s=gt.g*40.;
   col=vec3(.2,.3,.46)*(.35+.4*max(0.,sin(s*9.-uTime*3.2)));
   if(hash(vec3(floor(s*12.),floor(uTime*4.),0.))<.06)col+=vec3(.6,.65,.75)*(.5+.5*uLit);
  }else{ // 풀밭
   float tex=.6+.5*gt.b*noise(vec3(g.xz*4.,0.));
   col=vec3(.2,.32,.17)*tex*(fl3*(L.y/dd*.6+.15)*fire+vec3(.41,.49,.75)*(uMoonPow*.75+.02))+vec3(.05,.07,.07)*tex*(.8+uMoonPow)*step(.5,fract(gt.b*7.+floor(g.x*9.)*.37+floor(g.z*9.)*.61));
  }
  col*=exp(-max(0.,tg-12.)*.03);
 }else col=sky(rd);
 // 모닥불 (부피) — 물체·땅 앞의 것만
 float tmax=m>0.?t:min(tg,40.),tr=1.;vec3 acc=vec3(0);
 float b=dot(ro.xz,rd.xz),c=dot(ro.xz,ro.xz)-.36,a2=dot(rd.xz,rd.xz),disc=b*b-a2*c;
 if(disc>0.){
  float t0=max(0.,(-b-sqrt(disc))/a2),t1=min(tmax,(-b+sqrt(disc))/a2);
  if(t1>t0){
   float dt=(t1-t0)/32.,gl=1.+uGlow*.5;
   for(int i=0;i<32;i++){
    float tt=t0+dt*(float(i)+.5);vec3 p=ro+rd*tt;float h=p.y;
    if(h<.1||h>1.7)continue;
    float rr=length(p.xz),w=.38*(1.-h*.58)*(1.+uGlow*.15);
    float shape=smoothstep(w,0.,rr)*smoothstep(1.45*gl,.2,h)*smoothstep(.08,.2,h);
    float nz=fbm(vec3(p.x*4.2,p.y*2.8-uTime*3.,p.z*4.2));
    float dens=shape*smoothstep(.5,.82,nz+.3*(1.-h/1.6))*1.7*(.85+.15*uFlick);
    if(dens>0.){acc+=fireCol(dens*.75+.12)*dens*dt*12.*tr;tr*=exp(-dens*dt*4.);}
   }
  }
 }
 col=col*tr+acc*vec3(1.,.86,.62);
 col=1.-exp(-col*1.6);
 gl_FragColor=vec4(col,1.);
}`;

const GLYPH = `precision mediump float;
uniform sampler2D uScene,uAtlas;uniform vec2 uGrid,uCellDev;uniform float uN;
void main(){vec2 fc=gl_FragCoord.xy;vec2 cell=floor(fc/uCellDev),lp=fract(fc/uCellDev);
 vec3 c=texture2D(uScene,(cell+.5)/uGrid).rgb;float l=max(c.r,max(c.g,c.b));
 float gi=floor(clamp(l*1.15,0.,.999)*uN);
 float a=texture2D(uAtlas,vec2((gi+lp.x)/uN,1.-lp.y)).a;
 gl_FragColor=vec4(c/max(l,.001)*min(1.,l*1.5+.25)*a,1.);}`;

// opt: ascii3d와 같은 카메라 숫자 (dist, zoom, pitch, lookY, horizon). data: scenery.forGL()
export function makeGLView(canvas, opt, data) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = fs => {
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    return { p, u: n => u[n] ?? (u[n] = gl.getUniformLocation(p, n)) };
  };
  const tex = (w, h, data, filter, img) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  let P1, P2;
  try {
    P1 = prog(SCENE);
    P2 = prog(GLYPH);
  }
  catch (e) {
    console.warn('캠핑장 WebGL 셰이더 실패 → 캔버스로', e);
    return null;
  }
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  const panoTex = tex(data.azN, data.elN, data.pano, gl.LINEAR);
  const groundTex = tex(data.azN, data.rN, data.ground, gl.NEAREST);

  let w = 0, h = 0, dpr = 1, fpx = 600, grid = [1, 1], cellDev = [1, 1], sceneTex = null, fb = null, atlas = null;
  const resize = () => {
    dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth || 360;
    h = canvas.clientHeight || 400;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    fpx = Math.min(h * 0.75, w * 1.1) * opt.zoom;
    const ch = Math.max(3, Math.round(GLYPH_PX * dpr));
    cellDev = [Math.max(2, Math.round(ch * 0.6)), ch];
    grid = [Math.ceil(canvas.width / cellDev[0]), Math.ceil(canvas.height / cellDev[1])];
    if (sceneTex) gl.deleteTexture(sceneTex);
    sceneTex = tex(grid[0], grid[1], null, gl.NEAREST);
    if (!fb) fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // 글자 그림: 밝기 사다리를 칸 크기 그대로 한 줄로
    const ac = document.createElement('canvas');
    ac.width = cellDev[0] * RAMP.length;
    ac.height = cellDev[1];
    const x = ac.getContext('2d');
    x.fillStyle = '#fff';
    x.font = `${Math.round(cellDev[1] * 0.95)}px ui-monospace,Menlo,monospace`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (let i = 0; i < RAMP.length; i++) x.fillText(RAMP[i], (i + 0.5) * cellDev[0], cellDev[1] * 0.55);
    if (atlas) gl.deleteTexture(atlas);
    atlas = tex(0, 0, null, gl.NEAREST, ac);
  };
  resize();
  window.addEventListener('resize', resize);

  const cp = Math.cos(opt.pitch), sp = Math.sin(opt.pitch);
  let ca = 1, sa = 0;
  const draw = P => {
    const loc = gl.getAttribLocation(P.p, 'p');
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  return {
    get width() { return w; },
    get height() { return h; },
    // ascii3d project와 같은 셈 (CSS px) — 위에 얹는 2D 그림용
    project(x, y, z) {
      y -= opt.lookY;
      const x1 = x * ca - z * sa, z1 = x * sa + z * ca;
      const y2 = y * cp + z1 * sp, z2 = -y * sp + z1 * cp + opt.dist;
      return [w / 2 + fpx * x1 / z2, h * opt.horizon - fpx * y2 / z2, z2];
    },
    // light: campfire.light(T), glow: 글자가 들어와 불이 솟는 정도
    render(yaw, T, light, glow) {
      ca = Math.cos(yaw);
      sa = Math.sin(yaw);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, grid[0], grid[1]);
      gl.useProgram(P1.p);
      const u = P1.u;
      gl.uniform2f(u('uGrid'), grid[0], grid[1]);
      gl.uniform2f(u('uCellDev'), cellDev[0], cellDev[1]);
      gl.uniform2f(u('uScreen'), w, h);
      gl.uniform1f(u('uDevH'), canvas.height);
      gl.uniform1f(u('uDpr'), dpr);
      gl.uniform1f(u('uFpx'), fpx);
      gl.uniform1f(u('uHorizon'), opt.horizon);
      gl.uniform1f(u('uPitch'), opt.pitch);
      gl.uniform1f(u('uDist'), opt.dist);
      gl.uniform1f(u('uLookY'), opt.lookY);
      gl.uniform1f(u('uYaw'), yaw);
      gl.uniform1f(u('uTime'), T);
      gl.uniform3f(u('uLight'), light.x, light.y, light.z);
      gl.uniform1f(u('uFlick'), light.flick);
      gl.uniform1f(u('uLightPow'), light.power);
      gl.uniform1f(u('uFalloff'), light.falloff);
      gl.uniform1f(u('uGlow'), glow);
      gl.uniform3f(u('uMoonDir'), ...data.moonDir);
      gl.uniform3f(u('uMW'), ...data.mw);
      gl.uniform1f(u('uMoonPow'), data.moonLight);
      gl.uniform1f(u('uFront'), data.front);
      gl.uniform1f(u('uMoonRel'), data.moonRel);
      gl.uniform1f(u('uLit'), data.lit);
      gl.uniform4f(u('uPanoInfo'), data.elMin, data.elStep, data.elN, 0);
      gl.uniform4f(u('uGroundInfo'), data.r0, data.rK, data.rN, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, panoTex);
      gl.uniform1i(u('uPano'), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, groundTex);
      gl.uniform1i(u('uGround'), 1);
      draw(P1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(P2.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.uniform1i(P2.u('uScene'), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.uniform1i(P2.u('uAtlas'), 1);
      gl.uniform2f(P2.u('uGrid'), grid[0], grid[1]);
      gl.uniform2f(P2.u('uCellDev'), cellDev[0], cellDev[1]);
      gl.uniform1f(P2.u('uN'), RAMP.length);
      draw(P2);
    },
    lost: () => gl.isContextLost(),
  };
}

// 위에 얹는 2D 그림판 (기억 태우기·연기·불씨·안개가 쓰는 ascii3d 모양의 작은 판). 칸은 예전처럼 6px
export function makeOverlay(canvas, glView) {
  const ctx = canvas.getContext('2d'), fs = 6, cw = fs * 0.6;
  let w = 0, h = 0, cols = 0, rows = 0;
  const resize = () => {
    const d = window.devicePixelRatio || 1;
    w = canvas.clientWidth || 360;
    h = canvas.clientHeight || 400;
    canvas.width = w * d;
    canvas.height = h * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    cols = Math.ceil(w / cw);
    rows = Math.ceil(h / fs);
  };
  resize();
  window.addEventListener('resize', resize);
  const cell = (sx, sy) => {
    const u = (sx / cw) | 0, v = (sy / fs) | 0;
    return u < 0 || u >= cols || v < 0 || v >= rows ? -1 : v * cols + u;
  };
  return {
    ctx, cell, cellW: cw, cellH: fs,
    get width() { return w; },
    get height() { return h; },
    get cols() { return cols; },
    get rows() { return rows; },
    project: (x, y, z) => glView.project(x, y, z),
    depthAt: () => 1e9, // 물체에 가려지는 셈은 하지 않음 (연기·불씨는 거의 불 위)
    begin() {
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${fs}px ui-monospace,Menlo,monospace`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
    },
    put(id, c, color, alpha = 1) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillText(c, (id % cols) * cw, ((id / cols) | 0) * fs);
      ctx.globalAlpha = 1;
    },
  };
}
