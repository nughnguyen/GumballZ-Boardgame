// 🎏 Render banner hồ sơ (patch -151): port từ file mẫu 55_banner_h__s__GumballZ.html (42 banner + 13 banner anime).
// Class/keyframe đều tiền tố b42- để không đụng CSS web (.sk = skeleton, .pt = hạt huy hiệu...).
// Dữ liệu thuần nằm ở shared/js/avatar-rewards.js (BANNERS[].spec); module này chỉ render + rồng canvas.
// Rồng canvas: port nguyên hàm dragon() của mẫu (thân 64 đốt, vảy, cánh phượng, 4 chân, đầu chi tiết),
// chỉ vẽ khi banner trong màn hình (IntersectionObserver), reduced-motion thì vẽ 1 khung tĩnh rồi dừng.
// Vị trí ngẫu nhiên (sao, mưa, hạt...) được seed theo id banner nên không xáo trộn mỗi lần vẽ lại.
// Banner "Rồng Bay" (patch -158): Scene CodePen port ở shared/ui/dragon-frame.js (createCpScene).
import { createCpScene } from './dragon-frame.js?v=4';
let R = Math.random;
const r1 = (x, n = 1) => (+x).toFixed(n);
const j = (a, b) => a + R() * (b - a);
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/* HTML banner đầy đủ hiệu ứng từ spec (BANNERS[].spec) — banner cũ (5 banner, không có spec) trả '' để dùng CSS cũ. */
export function bannerHTML42(b) {
  const spec = b && b.spec ? b.spec : b;
  if (!spec || !spec.bg) return '';
  const prev = R; R = mulberry32(hashStr(String((b && b.id) || spec.bg)));
  try { return bannerInner(spec); } finally { R = prev; }
}
/* Đăng ký canvas rồng + tắt animation banner ngoài màn hình trong một gốc (hộp Hồ sơ / đầu Hồ sơ / modal thành viên).
   WeakSet để vẽ lại nhiều lần (draw() của Hồ sơ) không đăng ký trùng / rò rỉ observer. */
const regCanvas = new WeakSet(), regVis = new WeakSet();
export function initBanners(root) {
  if (!root || typeof document === 'undefined' || !ensureObs()) return;
  root.querySelectorAll('canvas.b42-dr').forEach(c => { if (regCanvas.has(c)) return; try { c._d = JSON.parse(c.dataset.d); } catch (e) { return; } regCanvas.add(c); CV.add(c); fit(c); ro.observe(c); io2.observe(c); });
  /* 🐉 banner Rồng Bay (patch -158): Scene CodePen — bấm canvas đổi theme, theme nhớ theo banner id */
  root.querySelectorAll('canvas.b42-cp').forEach(c => {
    if (regCp.has(c)) return; regCp.add(c);
    try { c._sc = createCpScene(c); } catch (e) { return; }
    const t0 = cpTheme.get(c.dataset.bid || '');
    if (t0) { while (c._sc.theme !== t0) c._sc.setTheme(); }
    CP.add(c); fit(c); ro.observe(c); io2.observe(c);
    c.addEventListener('click', () => {
      const sc = c._sc; if (!sc) return;
      sc.setTheme(); cpTheme.set(c.dataset.bid || '', sc.theme);
    });
  });
  root.querySelectorAll('.lk-bcard, .pf-banner.b42-head').forEach(el => { if (regVis.has(el)) return; regVis.add(el); visIO.observe(el); });
  if (!tickStarted && typeof requestAnimationFrame === 'function') { tickStarted = true; requestAnimationFrame(tick); }
}
const SHU='<svg viewBox="-10 -10 20 20" style="width:2.4em;height:2.4em"><path d="M0-9L2-2L9 0L2 2L0 9L-2 2L-9 0L-2-2Z" fill="#dfe6f2" stroke="#8a96ab" stroke-width=".6"/><circle r="1.4" fill="#444"/></svg>';
function sil([ty,c,h,wc]){let b='';
 if(ty=='mount'){let p='M0 30';for(let x=0;x<=100;x+=7+R()*5)p+=`L${r1(x)} ${r1(30-h*.4-R()*h*1.2)}`;b=`<path d="${p}L100 30Z" fill="${c}"/>`}
 else if(ty=='pine'){for(let x=-2;x<102;x+=3+R()*2){const t=h*(.8+R()*.8)*1.2;b+=`<path d="M${r1(x)} 30L${r1(x+2.2)} ${r1(30-t)}L${r1(x+4.4)} 30Z" fill="${c}"/>`}}
 else if(ty=='bamboo'){for(let x=3;x<100;x+=6+R()*5){const top=j(0,6);b+=`<g class="b42-sy" style="animation-delay:${r1(-R()*4)}s"><rect x="${r1(x)}" y="${r1(top)}" width="1" height="${r1(30-top)}" fill="${c}"/>`;for(let y=top+5;y<28;y+=5)b+=`<rect x="${r1(x-.25)}" y="${r1(y)}" width="1.5" height=".3" fill="${wc||'#000'}"/><path d="M${r1(x+1)} ${r1(y)}q4 -1 6 2q-4 1 -6 -2Z" fill="${c}"/>`;b+='</g>'}}
 else if(ty=='dune'){const y=()=>r1(30-h*.5-R()*h*.5);b=`<path d="M0 30V${y()}Q25 ${r1(30-h*1.3)} 50 ${y()}T100 ${y()}V30Z" fill="${c}"/>`}
 else{for(let x=0;x<100;){const w=4+R()*5,t=h*(.45+R()*.55);b+=`<rect x="${r1(x)}" y="${r1(30-t)}" width="${r1(w)}" height="${r1(t)}" fill="${c}"/>`;for(let k=0;k<6;k++)if(R()<.55)b+=`<rect class="b42-wn" x="${r1(x+.6+R()*(w-1.6))}" y="${r1(30-t+1+R()*(t-3))}" width=".7" height="1" fill="${wc}" style="animation-delay:${r1(-R()*4)}s"/>`;x+=w+.4}}
 return `<svg class="b42-sv" viewBox="0 0 100 30" preserveAspectRatio="none">${b}</svg>`}
function bannerInner(f){
 let h='';
 if(f.rays)h+=`<i class="b42-ry" style="--c:${f.rays}"></i>`;
 (f.blobs||[]).forEach(([c,x,y,w,hh,d])=>h+=`<i class="b42-bl" style="left:${x}%;top:${y}%;width:${w}em;height:${hh}em;margin:${-hh/2}em 0 0 ${-w/2}em;background:radial-gradient(closest-side,${c},transparent);animation-duration:${d}s;animation-delay:${r1(-R()*d)}s"></i>`);
 if(f.pat)h+=`<i class="b42-pa b42-p-${f.pat}"></i>`;
 if(f.stars)for(let i=0;i<f.stars[0];i++)h+=`<i class="b42-st" style="--c:${f.stars[1]};left:${r1(j(0,100))}%;top:${r1(j(0,85))}%;animation-delay:${r1(-R()*2.4)}s;transform:scale(${r1(j(.5,1.4))})"></i>`;
 for(let i=0;i<(f.shoot||0);i++)h+=`<i class="b42-sk" style="left:${r1(j(0,60))}%;top:${r1(j(0,40))}%;animation-duration:${r1(j(4,8))}s;animation-delay:${r1(-R()*8)}s"></i>`;
 (f.orb||[]).forEach(([x,y,s,c1,c2])=>h+=`<i class="b42-or" style="left:${x}%;top:${y}%;width:${s}em;height:${s}em;margin:${-s/2}em 0 0 ${-s/2}em;background:radial-gradient(circle at 35% 35%,${c1},${c2});box-shadow:0 0 ${s*.5}em ${c2}"></i>`);
 if(f.grid)h+='<i class="b42-gf"></i>';
 (f.torii||[]).forEach(([x,z,c,o,b])=>h+=`<svg class="b42-to" viewBox="0 0 100 80" style="left:${x}%;width:${z}em;height:${z*.8}em;bottom:${b||0}em;opacity:${o||1}"><g fill="${c}"><path d="M0 12Q50 0 100 12L97 21Q50 11 3 21Z"/><rect x="10" y="26" width="80" height="7"/><rect x="20" y="14" width="8" height="66"/><rect x="72" y="14" width="8" height="66"/><rect x="47" y="12" width="6" height="14"/></g></svg>`);
 (f.beam||[]).forEach(([x,c,T,d])=>h+=`<i class="b42-bm" style="left:${x}%;--c:${c};animation-duration:${T}s;animation-delay:${-d}s"></i>`);
 (f.magic||[]).forEach(([x,y,z,c,rx])=>h+=`<svg class="b42-mg" viewBox="-50 -50 100 100" style="--c:${c};left:${x}%;top:${y}%;width:${z}em;height:${z}em;margin:${-z/2}em 0 0 ${-z/2}em"><g fill="none" stroke="${c}" stroke-width=".8"><circle r="48"/><circle r="44" stroke-dasharray="1.2 3"/><g class="b42-mr1"><circle r="38" stroke-dasharray="6 3"/><path d="M0-36L31.2 18H-31.2Z"/><path d="M0 36L31.2-18H-31.2Z"/></g><g class="b42-mr2"><circle r="22"/><circle r="14" stroke-dasharray="2 2"/><path d="M0-22L19 11H-19Z" opacity=".7"/></g></g><g fill="${c}"><circle cy="-48" r="1.8"/><circle cy="48" r="1.8"/><circle cx="-48" r="1.8"/><circle cx="48" r="1.8"/></g></svg>`);
 (f.isl||[]).forEach(([x,y,w,ch,d])=>h+=`<div class="b42-is" style="left:${x}%;top:${y}%;width:${w}em;height:${w*.6}em;animation-delay:${-d}s"><svg viewBox="0 0 100 60"><path d="M4 18Q50 30 96 18Q80 42 56 58Q50 62 44 58Q20 42 4 18Z" fill="#8a6a4a"/><ellipse cx="50" cy="17" rx="46" ry="9" fill="#7ad86a"/></svg><b style="font-size:${w*.38}em">${ch}</b></div>`);
 if(f.train){const[b,T,c]=f.train;let q='';for(let k=0;k<5;k++){const x=k*12;q+=`<rect x="${x}" y="1" width="11.4" height="5" rx="1" fill="${c}"/>`;for(let w=0;w<4;w++)q+=`<rect x="${x+1+w*2.6}" y="2" width="1.8" height="1.8" fill="#ffe27a"/>`}h+=`<svg class="b42-sv" viewBox="0 0 100 30" preserveAspectRatio="none" style="z-index:2"><path d="M0 9Q25 12 50 9T100 9M0 11Q25 14 50 11T100 11" stroke="#1a1030" fill="none" stroke-width=".25"/><rect x="18" y="8" width=".7" height="22" fill="#1a1030"/><rect x="68" y="8" width=".7" height="22" fill="#1a1030"/></svg><svg class="b42-tr" viewBox="0 0 60 7" style="left:0;bottom:${b}em;width:60em;height:7em;animation-duration:${T}s">${q}</svg>`}
 (f.sil||[]).forEach(s=>h+=sil(s));
 (f.wave||[]).forEach(([c,hh,t],i)=>h+=`<svg class="b42-wv" viewBox="0 0 200 20" preserveAspectRatio="none" style="height:${hh}em;bottom:${i*2.2}em;animation-duration:${t}s;animation-delay:${r1(-R()*t)}s"><path d="M0 8Q12.5 0 25 8T50 8T75 8T100 8T125 8T150 8T175 8T200 8V20H0Z" fill="${c}"/></svg>`);
 if(f.rain)for(let i=0;i<f.rain[0];i++)h+=`<i class="b42-rn" style="--c:${f.rain[1]};left:${r1(j(-10,110))}%;animation-duration:${r1(j(.6,1.2)*f.rain[2])}s;animation-delay:${r1(-R()*2)}s"></i>`;
 if(f.flash)h+='<i class="b42-fh"></i>';
 if(f.bolt){let p='';for(let i=0;i<f.bolt[0];i++){let x=j(8,92),d=`M${r1(x)} 0`;const L=j(12,24);for(let k=1;k<=7;k++)d+=`L${r1(x+(k<7?j(-3,3):0))} ${r1(L*k/7)}`;p+=`<path class="b42-bz" d="${d}" style="animation-delay:${r1(-R()*2.4)}s;animation-duration:${r1(j(1.6,3.2))}s"/>`}h+=`<svg class="b42-sv" viewBox="0 0 100 30" preserveAspectRatio="none" style="--bc:${f.bolt[1]};z-index:4">${p}</svg>`}
 (f.fly||[]).forEach(([ch,z,y,T,d,dir])=>h+=`<i class="b42-fs ${dir<0?'b42-r':''}" style="top:${y}%;animation-duration:${T}s;animation-delay:${-d}s"><b style="font-size:${z}em;${ch=='@shu'?'animation:b42-spin .5s linear infinite':dir<0?'':'transform:scaleX(-1)'}">${ch=='@shu'?SHU:ch}</b></i>`);
 if(f.dr)h+=`<canvas class="b42-dr" data-d='${JSON.stringify(f.dr)}'></canvas>`;
 if(f.cp)h+=`<canvas class="b42-cp" data-cp="1" data-bid="${f.bid||''}"></canvas>`;
 if(f.kira)for(let i=0;i<f.kira[0];i++){const z=r1(j(.8,2.6));h+=`<i class="b42-kr" style="--c:${f.kira[1]};width:${z}em;height:${z}em;left:${r1(j(0,98))}%;top:${r1(j(0,88))}%;animation-delay:${r1(-R()*2.2)}s"></i>`}
 (f.slash||[]).forEach(([x,y,r,d])=>h+=`<i class="b42-sl2" style="left:${x}%;top:${y}%;--r:${r}deg;animation-delay:${-d}s"></i>`);
 if(f.speed)for(let i=0;i<f.speed;i++)h+=`<i class="b42-spd" style="top:${r1(j(2,98))}%;width:${r1(j(15,40))}em;animation-duration:${r1(j(.35,.8))}s;animation-delay:${r1(-R())}s"></i>`;
 if(f.crowd)for(let i=0;i<f.crowd;i++)h+=`<i class="b42-gs" style="left:${r1(i*100/f.crowd+j(-1,1))}%;--c:${['#ff4dc3','#4dc3ff','#ffd23c','#7aff9a'][i%4]};animation-duration:${r1(j(.6,1.2))}s;animation-delay:${r1(-R())}s"></i>`;
 if(f.fall){const[n,ch,d,up]=f.fall;for(let i=0;i<n;i++)h+=`<i class="b42-fl ${up?'b42-u':''}" style="left:${r1(j(0,100))}%;font-size:${r1(j(1.8,3.2))}em;--dx:${r1(j(-5,5))}em;animation-duration:${r1(d*j(.7,1.3))}s;animation-delay:${r1(-R()*d)}s">${ch[i%ch.length]}</i>`}
 if(f.eq)for(let i=0;i<f.eq;i++)h+=`<i class="b42-eb" style="left:${r1(i*100/f.eq)}%;width:${r1(100/f.eq-.4)}%;background:linear-gradient(to top,hsl(${i*360/f.eq},95%,60%),transparent);animation-duration:${r1(j(.4,.9))}s;animation-delay:${r1(-R())}s"></i>`;
 if(f.em)for(let i=0;i<f.em[0];i++)h+=`<i class="b42-pt" style="--c:${f.em[1]};left:${r1(j(0,100))}%;top:${r1(j(70,100))}%;--dx:${r1(j(-5,5))}em;animation-duration:${r1(j(3,6))}s;animation-delay:${r1(-R()*6)}s"></i>`;
 (f.fw||[]).forEach(([x,y,c,l])=>{h+=`<i class="b42-fw" style="left:${x}%;top:${y}%;--c:${c};--l:${l}s">`;for(let i=0;i<12;i++)h+=`<b style="transform:rotate(${i*30}deg)"><u></u></b>`;h+='</i>'});
 if(f.lights)for(let i=0;i<20;i++)h+=`<i class="b42-lb" style="left:${i*5+1.5}%;margin-top:${i%2?.8:0}em;background:${['#ff4d4d','#ffd23c','#4dff88','#4dc3ff'][i%4]};box-shadow:0 0 1.5em ${['#ff4d4d','#ffd23c','#4dff88','#4dc3ff'][i%4]};animation-delay:${i%2?'-.7s':'0s'}"></i>`;
 (f.deco||[]).forEach(([ch,z,x,y,an])=>h+=`<i class="b42-dc ${an=='bob'?'':an.replace(/\bsw\b/g,'b42-sw').replace(/\bb\b/g,'b42-b')}" style="left:${x}%;top:${y}%;font-size:${z}em${an=='bob'?';animation:b42-bob2 2.4s ease-in-out infinite alternate':''}">${ch}</i>`);
 if(f.glitch){for(let i=0;i<5;i++)h+=`<i class="b42-gb" style="top:${r1(j(5,90))}%;left:${r1(j(0,50))}%;width:${r1(j(20,50))}%;animation-delay:${r1(-R()*3)}s"></i>`}
 if(f.scan)h+='<i class="b42-sc"></i>';
 if(f.shine)h+='<i class="b42-sh"></i>';
 return `<div class="b42-bw" style="--bc:${f.bc||'transparent,transparent'};--bp:${f.bc?'3px':'0px'}"><div class="b42-bn ${f.flow?'b42-flow':''}${f.cp?' b42-cpbn':''}" style="--bg2:${f.bg}">${h}</div></div>`}

/* ===== RỒNG VẼ BẰNG CANVAS: thân thon, vảy, bụng, vây lưng, 4 chân, sừng, bờm, râu ===== */
const CV=new Set(),RM=(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion:reduce)').matches)||false;
const CP=new Set(), regCp=new WeakSet(), cpTheme=new Map(); /* banner Rồng Bay: scene đang chạy + theme đã chọn theo banner id (giữ qua lần vẽ lại) */
const sh=(h,k)=>{const n=parseInt(h.slice(1),16),f=x=>Math.max(0,Math.min(255,Math.round(x*(1+k))));return`rgb(${f(n>>16)},${f(n>>8&255)},${f(n&255)})`};
function dragon(g,t,[c1,c2,,T,y,A,ph,dir,s,wg]){
 const N=64,L=44*s,st=L/N,D=dir>0?1:-1,PI=Math.PI,u=(t/T+ph)%1,xh=D>0?-8+u*(116+L):108-u*(116+L),base=y*.3,S=A*1.5;
 const yf=(x,i)=>Math.min(26,Math.max(4,base+S*Math.sin(x*.085+ph*6.28)))+A*.5*(.3+.7*i/N)*Math.sin(i*.3-t*4.2);
 const X=[xh],Y=[yf(xh,0)],NX=[],NY=[],TX=[],TY=[],W=[];
 for(let i=1;i<=N;i++){let x=X[i-1]-D*st,yy=yf(x,i);const dy=yy-Y[i-1];if(Math.abs(dy)<st){x=X[i-1]-D*Math.sqrt(st*st-dy*dy);yy=yf(x,i)}X.push(x);Y.push(yy)}
 for(let i=0;i<=N;i++){const a=Math.max(i-1,0),b=Math.min(i+1,N);let tx=X[a]-X[b],ty=Y[a]-Y[b];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;TX.push(tx);TY.push(ty);NX.push(-ty*D);NY.push(tx*D);W.push(s*(.25+2*Math.pow(1-i/N,.75))*(i<5?.7+.06*i:1))}
 const dk=sh(c2,-.4),P=(i,m)=>[X[i]+NX[i]*W[i]*m,Y[i]+NY[i]*W[i]*m];
 const strip=(m1,m2,from=0,to=N)=>{g.beginPath();for(let i=from;i<=to;i++){const p=P(i,m1);i==from?g.moveTo(p[0],p[1]):g.lineTo(p[0],p[1])}for(let i=to;i>=from;i--){const p=P(i,m2);g.lineTo(p[0],p[1])}g.closePath()};
 // cánh (phượng)
 if(wg){const i=7,bx=X[i]-NX[i]*W[i]*.4,by=Y[i]-NY[i]*W[i]*.4,fl=Math.sin(t*4.5);[.18,0].forEach((o,w)=>{for(let k=0;k<6;k++){const a=-PI/2-D*(.12+k*.3+o)+D*.5*fl*(1-k*.08),len=(11.5-1.3*k)*s,tx=bx+Math.cos(a)*len,ty=by+Math.sin(a)*len;g.beginPath();g.moveTo(bx,by);g.quadraticCurveTo(bx+Math.cos(a+.2)*len*.55,by+Math.sin(a+.2)*len*.55,tx,ty);g.quadraticCurveTo(bx+Math.cos(a-.2)*len*.55,by+Math.sin(a-.2)*len*.55,bx,by);g.fillStyle=w?c1:sh(c1,-.25);g.globalAlpha=.85;g.fill();g.globalAlpha=1;g.strokeStyle=c2;g.lineWidth=.14;g.stroke()}})}
 // chân xa
 const leg=(i,p,col)=>{const bx=X[i]+NX[i]*W[i]*.6,by=Y[i]+NY[i]*W[i]*.6,sw=Math.sin(t*5+p),a1=PI/2+D*(.45+.4*sw),a2=a1-D*(1+.3*Math.sin(t*5+p+1.2)),ex=bx+Math.cos(a1)*3.1*s,ey=by+Math.sin(a1)*3.1*s,fx=ex+Math.cos(a2)*2.8*s,fy=ey+Math.sin(a2)*2.8*s;g.lineCap='round';g.strokeStyle=col;g.lineWidth=.95*s;g.beginPath();g.moveTo(bx,by);g.lineTo(ex,ey);g.stroke();g.lineWidth=.62*s;g.beginPath();g.moveTo(ex,ey);g.lineTo(fx,fy);g.stroke();g.strokeStyle=c1;g.lineWidth=.22*s;for(let k=-1;k<=1;k++){g.beginPath();g.moveTo(fx,fy);g.lineTo(fx+Math.cos(a2+D*k*.55)*1.3*s,fy+Math.sin(a2+D*k*.55)*1.3*s);g.stroke()}};
 leg(15,2,dk);leg(40,0,dk);
 // đuôi: chùm lông
 {const i=N,a0=Math.atan2(-TY[i],-TX[i]);g.lineCap='round';for(let k=-2;k<=2;k++){const a=a0+k*.36+.25*Math.sin(t*4+k),ex=X[i]+Math.cos(a)*5.5*s,ey=Y[i]+Math.sin(a)*5.5*s;g.strokeStyle=k%2?c1:sh(c1,-.2);g.lineWidth=.42*s;g.beginPath();g.moveTo(X[i],Y[i]);g.quadraticCurveTo(X[i]+Math.cos(a+.5)*3*s,Y[i]+Math.sin(a+.5)*3*s,ex,ey);g.stroke()}}
 // thân
 g.save();g.shadowColor=c2;g.shadowBlur=14;strip(1,-1);g.fillStyle=c2;g.fill();g.restore();
 g.save();strip(1,-1);g.clip();
 strip(.22,1.05);g.fillStyle=c1;g.globalAlpha=.92;g.fill();g.globalAlpha=1;
 g.strokeStyle='rgba(90,40,0,.28)';g.lineWidth=.1;for(let i=2;i<N;i+=2){const a=P(i,.22),b=P(i,1);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke()}
 strip(-1.05,-.55);g.fillStyle='rgba(255,255,255,.2)';g.fill();
 g.strokeStyle='rgba(0,0,0,.2)';g.lineWidth=.1;for(let i=2;i<N-2;i+=2){const th=Math.atan2(TY[i],TX[i]);for(const m of[-.6,-.05]){const p=P(i,m);g.beginPath();g.arc(p[0],p[1],W[i]*.42,th+PI-1.3,th+PI+1.3);g.stroke()}}
 g.restore();
 strip(1,-1);g.strokeStyle=dk;g.lineWidth=.15;g.stroke();
 // vây lưng
 for(let i=3;i<N-3;i+=2){const h=(.7+1.1*(1-i/N))*s,e=P(i,-1),b1=[e[0]+TX[i]*.45*s,e[1]+TY[i]*.45*s],b2=[e[0]-TX[i]*.45*s,e[1]-TY[i]*.45*s];g.beginPath();g.moveTo(b1[0],b1[1]);g.lineTo(e[0]-NX[i]*h-TX[i]*h*.8,e[1]-NY[i]*h-TY[i]*h*.8);g.lineTo(b2[0],b2[1]);g.closePath();g.fillStyle=c1;g.globalAlpha=.9;g.fill();g.globalAlpha=1;g.strokeStyle=dk;g.lineWidth=.08;g.stroke()}
 leg(14,0,c2);leg(39,2,c2);
 // đầu
 const th=Math.atan2(Y[0]-Y[2],X[0]-X[2]);g.save();g.translate(X[0],Y[0]);g.rotate(th);if(D<0)g.scale(1,-1);g.scale(s,s);
 g.lineCap='round';
 for(let k=0;k<8;k++){const y0=-1.5+k*.2,w=Math.sin(t*3+k*.7);g.strokeStyle=k%2?c1:sh(c1,-.15);g.globalAlpha=.85;g.lineWidth=.38;g.beginPath();g.moveTo(-.2,y0);g.bezierCurveTo(-2,y0-1.1-w,-4-k*.5,y0+.6*w,-6.5-k*.8,y0+.4+w*.8);g.stroke()}g.globalAlpha=1;
 g.fillStyle=c1;g.beginPath();g.moveTo(.2,-1.9);g.bezierCurveTo(-1,-3.4,-3.2,-3.8,-5,-3);g.bezierCurveTo(-3.3,-3,-1.7,-2.6,.8,-1.4);g.fill();
 g.fillStyle=sh(c1,-.15);g.beginPath();g.moveTo(.8,-2.1);g.bezierCurveTo(.2,-3.4,-.8,-4.2,-2,-4.5);g.bezierCurveTo(-1,-3.6,.2,-2.8,1.3,-1.8);g.fill();
 g.fillStyle='#6a0a22';g.beginPath();g.moveTo(-.8,.1);g.lineTo(6.3,-.1);g.lineTo(5.2,1.3);g.lineTo(-.2,1.1);g.fill();
 const jw=.14+.1*Math.sin(t*2.2);g.save();g.translate(-.6,.2);g.rotate(jw);g.fillStyle=sh(c2,-.2);g.beginPath();g.moveTo(0,-.1);g.bezierCurveTo(1.8,.1,4.2,.1,6,.2);g.bezierCurveTo(4.6,1.1,1.8,1.1,0,.6);g.fill();g.strokeStyle=c1;g.lineWidth=.12;g.beginPath();g.moveTo(3.5,.9);g.quadraticCurveTo(2.4,2.3+Math.sin(t*3),.4,2.1);g.stroke();g.restore();
 g.fillStyle=c2;g.beginPath();g.moveTo(-1.4,-1.7);g.bezierCurveTo(.5,-2.6,3.2,-2.4,5,-1.7);g.bezierCurveTo(5.9,-1.5,6.7,-1.2,7,-.7);g.lineTo(6.6,-.1);g.bezierCurveTo(4.5,.05,2,.15,-1.2,.25);g.closePath();g.fill();g.strokeStyle=dk;g.lineWidth=.1;g.stroke();
 g.fillStyle='#fff';for(let k=0;k<4;k++){const x=2+k*1.15;g.beginPath();g.moveTo(x,0);g.lineTo(x+.38,0);g.lineTo(x+.18,.6);g.fill()}
 g.fillStyle=c1;g.globalAlpha=.35;g.beginPath();g.arc(2.4,-1.15,.95,0,7);g.fill();g.globalAlpha=1;
 g.fillStyle='#fff3a6';g.beginPath();g.ellipse(2.4,-1.15,.55,.38,-.35,0,7);g.fill();g.fillStyle='#200';g.beginPath();g.ellipse(2.5,-1.15,.12,.32,0,0,7);g.fill();
 g.strokeStyle=dk;g.lineWidth=.28;g.beginPath();g.moveTo(1.3,-1.8);g.lineTo(3.5,-1.5);g.stroke();
 g.fillStyle=dk;g.beginPath();g.ellipse(6.4,-.9,.14,.1,0,0,7);g.fill();
 g.strokeStyle=c1;g.lineWidth=.16;g.globalAlpha=.9;for(const q of[0,1]){const w=Math.sin(t*3+q*1.3);g.beginPath();g.moveTo(6.2,-.4+q*.2);g.bezierCurveTo(5,1.8+q+w,1,2.8+q,-3,1.8+q+Math.sin(t*3+1+q));g.stroke()}g.globalAlpha=1;
 g.restore()}
function reg(root){root.querySelectorAll('canvas.b42-dr').forEach(c=>{c._d=JSON.parse(c.dataset.d);CV.add(c);fit(c);ro.observe(c);io2.observe(c)})}
function fit(c){if(c.classList&&c.classList.contains('b42-cp'))return fitCp(c);const w=c.clientWidth||300,d=Math.min(devicePixelRatio||1,2);c.width=Math.round(w*d);c.height=Math.round(w*.3*d);c._k=w*d/100}
function fitCp(c){const w=c.clientWidth||300,h=c.clientHeight||225,d=Math.min(devicePixelRatio||1,2);c.width=Math.round(w*d);c.height=Math.round(h*d)}
let ro=null,io2=null,visIO=null,tickStarted=false;
function ensureObs(){if(ro)return true;if(typeof ResizeObserver==='undefined'||typeof IntersectionObserver==='undefined')return false;ro=new ResizeObserver(es=>es.forEach(e=>fit(e.target)));io2=new IntersectionObserver(es=>es.forEach(e=>e.target._v=e.isIntersecting),{rootMargin:'100px'});visIO=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle('b42-vis',e.isIntersecting)),{rootMargin:'200px'});return true;}
function tick(ms){CV.forEach(c=>{if(!c.isConnected){CV.delete(c);return}if(!c._v||(RM&&c._done))return;const g=c.getContext('2d');if(!g)return;g.setTransform(c._k,0,0,c._k,0,0);g.clearRect(0,0,100,30);c._d.forEach(d=>dragon(g,RM?3:ms/1000,d));c._done=1});CP.forEach(c=>{if(!c.isConnected){CP.delete(c);return}if(!c._v||(RM&&c._done))return;const sc=c._sc;if(!sc)return;sc.draw(RM?3:ms/1000);c._done=1});if(typeof requestAnimationFrame==='function')requestAnimationFrame(tick)}
