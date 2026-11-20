/* 모닥불만 WebGL로 (CAMPSITE_PLAN.md 4장, tasks/campsite-6-webgl.md)
   - 풍경·돌·장작·통나무는 캔버스(ascii3d.js, 6px 모양 글자) 그대로. 불꽃만 셰이더로 계산해 같은 칸에 얹는다
   - 셰이더가 화면 글자 칸 하나마다(칸 수만큼 작은 그림판) 불 세기와 깊이를 구움 → 읽어 와서 ascii3d setFire로
     깊이는 캔버스 z-버퍼와 같은 셈이라 앞의 돌·통나무가 불을 가린다. 글자·색은 캔버스 불과 같은 사다리(FIRE_CH·fireColor)
   - 불: 3D 잡음(fbm)으로 만든 부피 있는 불꽃. 글자가 들어와 솟는 정도(glow)만큼 높고 넓게
   - WebGL이 안 되거나 셰이더가 실패하면 makeGLFire가 null → campsite.js가 캔버스 불꽃 입자(campfire.js)로
   - 3px로 장면 전부를 WebGL로 그려 봤다가 접음(6fd384e) — 주변이 밝고 뭉개져 불이 덜 돋보였음 (주인 2026-11-21) */

// 불 모양 숫자
export const GLFIRE = {
  radius: 0.46,  // 밑동 반지름
  height: 1.8,   // 불꽃 키
  rise: 3,       // 잡음이 올라가는 빠르기
  thresh: 0.5,   // 잡음 문턱(작을수록 불이 뭉텅)
  gain: 0.9,     // 칸의 불 세기 배
};

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FS = `precision highp float;
uniform vec2 uGrid,uCell,uScreen;uniform float uFpx,uHorizon,uPitch,uDist,uLookY,uYaw,uTime,uGlow,uFlick;
uniform vec4 uShape;uniform float uGain;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*noise(p);p*=2.03;a*=.5;}return s;}
float fall(float a,float b,float x){return 1.-smoothstep(a,b,x);} // a 아래 1 → b 위 0 (a<b)
void main(){
 // 칸 (u, v: 위에서부터) → ascii3d rayAt와 같은 셈
 float u=floor(gl_FragCoord.x),v=uGrid.y-1.-floor(gl_FragCoord.y);
 float cp=cos(uPitch),sp=sin(uPitch),ca=cos(uYaw),sa=sin(uYaw);
 float x1=((u+.5)*uCell.x-uScreen.x*.5)/uFpx,y2=-((v+.5)*uCell.y-uScreen.y*uHorizon)/uFpx;
 vec3 d0=normalize(vec3(x1,y2*cp-sp,y2*sp+cp));
 vec3 rd=vec3(d0.x*ca+d0.z*sa,d0.y,-d0.x*sa+d0.z*ca);
 vec3 ro=vec3(-uDist*cp*sa,uLookY+uDist*sp,-uDist*cp*ca);
 float R=uShape.x*1.6*(1.+uGlow*.15),H=uShape.y*(1.+uGlow*.5);
 float b=dot(ro.xz,rd.xz),c=dot(ro.xz,ro.xz)-R*R,a2=dot(rd.xz,rd.xz),disc=b*b-a2*c;
 if(disc<=0.){gl_FragColor=vec4(0.);return;}
 float t0=max(0.,(-b-sqrt(disc))/a2),t1=(-b+sqrt(disc))/a2;
 float tg=rd.y<0.?-ro.y/rd.y:1e9;t1=min(t1,tg); // 땅 밑은 없음
 if(t1<=t0){gl_FragColor=vec4(0.);return;}
 float dt=(t1-t0)/28.,sum=0.,zf=0.;
 for(int i=0;i<28;i++){
  float tt=t0+dt*(float(i)+.5);vec3 p=ro+rd*tt;float h=p.y;
  if(h<.06||h>H+.2)continue;
  vec3 q=vec3(p.x*2.1,p.y*1.6-uTime*uShape.z*.6,p.z*2.1);vec2 sway=(vec2(noise(q),noise(q+7.3))-.5)*.5*h;
  float rr=length(p.xz+sway)*(.8+.5*noise(vec3(p.xz*5.,p.y*3.-uTime*uShape.z))),w=uShape.x*(1.-h/H*.84)*(1.+uGlow*.15);
  float shape=fall(0.,max(w,.01),rr)*fall(.25,H,h)*smoothstep(.04,.16,h);
  float nz=fbm(vec3(p.x*4.2,p.y*2.8-uTime*uShape.z,p.z*4.2));
  float dens=shape*smoothstep(uShape.w,uShape.w+.26,nz+.32*(1.-h/H))*(.85+.15*uFlick);
  if(dens>.02&&zf==0.){float yy=h-uLookY,z1=p.x*sa+p.z*ca;zf=-yy*sp+z1*cp+uDist;} // 처음 닿은 불의 깊이 (ascii3d project의 z2)
  sum+=dens*dt;
 }
 float lv=1.-exp(-sum*7.*uGain);
 gl_FragColor=vec4(lv,clamp(zf/8.,0.,1.),0.,1.);
}`;

// opt: ascii3d와 같은 카메라 숫자 (fontPx, dist, zoom, pitch, lookY, horizon). 그림판은 화면에 붙이지 않음
export function makeGLFire(opt) {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, preserveDrawingBuffer: true });
  if (!gl) return null;
  let P;
  try {
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    P = gl.createProgram();
    gl.attachShader(P, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(P, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(P);
    if (!gl.getProgramParameter(P, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(P));
  }
  catch (e) {
    console.warn('캠핑장 WebGL 불 셰이더 실패 → 캔버스 불로', e);
    return null;
  }
  gl.useProgram(P);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(P, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  const u = n => U[n] ?? (U[n] = gl.getUniformLocation(P, n));
  const fs = opt.fontPx, cw = fs * 0.6;
  let px = new Uint8Array(4), cols = 0, rows = 0;

  return {
    // view: ascii3d makeView. 불 세기·깊이를 구워 view.setFire로 넘긴다. 그림판을 잃으면 false
    render(view, yaw, T, light, glow) {
      if (gl.isContextLost()) return false;
      if (view.cols !== cols || view.rows !== rows) {
        cols = view.cols;
        rows = view.rows;
        canvas.width = cols;
        canvas.height = rows;
        px = new Uint8Array(cols * rows * 4);
      }
      const w = view.width, h = view.height;
      gl.viewport(0, 0, cols, rows);
      gl.uniform2f(u('uGrid'), cols, rows);
      gl.uniform2f(u('uCell'), cw, fs);
      gl.uniform2f(u('uScreen'), w, h);
      gl.uniform1f(u('uFpx'), Math.min(h * 0.75, w * 1.1) * opt.zoom); // ascii3d resize와 같은 셈
      gl.uniform1f(u('uHorizon'), opt.horizon);
      gl.uniform1f(u('uPitch'), opt.pitch);
      gl.uniform1f(u('uDist'), opt.dist);
      gl.uniform1f(u('uLookY'), opt.lookY);
      gl.uniform1f(u('uYaw'), yaw);
      gl.uniform1f(u('uTime'), T);
      gl.uniform1f(u('uGlow'), glow);
      gl.uniform1f(u('uFlick'), light.flick);
      gl.uniform4f(u('uShape'), GLFIRE.radius, GLFIRE.height, GLFIRE.rise, GLFIRE.thresh);
      gl.uniform1f(u('uGain'), GLFIRE.gain);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.readPixels(0, 0, cols, rows, gl.RGBA, gl.UNSIGNED_BYTE, px);
      view.setFire(px);
      return true;
    },
  };
}
