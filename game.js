'use strict';
const C=document.querySelector('#game'),ctx=C.getContext('2d'),W=C.width,H=C.height;
const ui={who:$('#who'),speed:$('#speed'),lap:$('#lap'),status:$('#status'),jump:$('#jump'),tongue:$('#tongue'),a:$('#skillA'),b:$('#skillB'),swap:$('#swap'),stick:$('#stick')};
function $(s){return document.querySelector(s)}
const world={w:6000,h:4400};
// A long pond circuit with real hairpins and S-bends. The camera only sees a small section at once.
const path=[
 {x:700,y:700},{x:2500,y:500},{x:4700,y:700},{x:5200,y:1400},
 {x:4800,y:1900},{x:3150,y:1900},{x:2650,y:2300},{x:3150,y:2700},
 {x:5000,y:2700},{x:5350,y:3400},{x:4550,y:3900},{x:2200,y:3900},
 {x:900,y:3450},{x:600,y:2700},{x:900,y:2200},{x:1850,y:2200},
 {x:2250,y:1750},{x:1800,y:1300},{x:800,y:1300}
];
// Every major corner has an inside post/tree for tongue cornering, including both hairpins.
const anchors=[
 {x:2500,y:760},{x:4560,y:990},{x:4850,y:1450},{x:4540,y:1660},
 {x:3180,y:2160},{x:2860,y:2300},{x:3180,y:2440},{x:4820,y:2960},
 {x:4920,y:3370},{x:4490,y:3620},{x:2230,y:3630},{x:1110,y:3280},
 {x:860,y:2700},{x:1090,y:2400},{x:1850,y:1940},{x:1970,y:1740},
 {x:1760,y:1560},{x:920,y:1560}
];
const lilies=[
 {x:420,y:420,r:76},{x:1100,y:420,r:54},{x:3600,y:360,r:70},{x:5450,y:750,r:82},
 {x:5600,y:1900,r:62},{x:4050,y:1450,r:58},{x:2400,y:1450,r:74},{x:1500,y:1800,r:54},
 {x:3900,y:2350,r:88},{x:5600,y:2950,r:66},{x:3900,y:3450,r:64},{x:2850,y:4250,r:82},
 {x:1450,y:4100,r:58},{x:400,y:3450,r:72},{x:350,y:2200,r:56},{x:1200,y:2700,r:70}
];
const checkpoints=path.map((p,i)=>({x:p.x,y:p.y,r:240,i}));
let controlledIndex=0, camera={x:0,y:0}, joy={id:null,x:0,y:0},keys={},tongueHeld=false,last=performance.now(),finished=false;
const racers=[makeRacer('Michael','#49a94f',0,720,680),makeRacer('Gabriel','#3188e6',1,720,740)];
function makeRacer(name,color,index,x,y){return {name,color,index,x,y,vx:0,vy:0,face:0,speed:0,r:25,flight:0,glideClock:0,glideGrace:0,onGround:true,tongue:null,cp:1,lap:1,finished:false,hitSlow:0,boost:0,bump:0,skillCdA:0,skillCdB:0,ai:index===1,wing:0};}
const maxSpeed=585,groundSpeed=255,flapSpeed=405,glideAccel=690,turnGround=2.85,turnFast=1.05;
function reset(){racers.splice(0,2,makeRacer('Michael','#49a94f',0,720,680),makeRacer('Gabriel','#3188e6',1,720,740));racers[controlledIndex].ai=false;racers[1-controlledIndex].ai=true;finished=false;ui.status.textContent='ジャンプ3回で最高速！'}
function pressJump(r){if(r.finished)return;if(r.flight===0){r.flight=1;r.onGround=false;r.speed=Math.max(r.speed,285);r.wing=.2;msg('ジャンプ！ もう一度で羽ばたき');}
else if(r.flight===1){r.flight=2;r.speed=Math.max(r.speed,405);r.wing=.55;msg('羽ばたき加速！ もう一度で滑空');}
else if(r.flight===2){r.flight=3;r.glideClock=0;r.glideGrace=0;r.speed=Math.max(r.speed,520);r.wing=1;msg('滑空！ 最高速へ');}
else { // maintenance: generous window centered around five seconds
 if(r.glideClock>=3.8&&r.glideClock<=5.9){r.glideClock=0;r.glideGrace=0;r.speed=Math.max(r.speed,550);r.wing=.45;msg('羽ばたき成功！ 滑空延長');}
 else if(r.glideClock>5.9){r.glideClock=0;r.glideGrace=0;r.speed=Math.max(r.speed,510);r.wing=.45;msg('遅めの羽ばたき。少し速度ロス');}
 else {r.wing=.2;msg('まだ羽ばたきには早い');}
}}
function desiredInput(r){if(!r.ai){let kx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),ky=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);let x=joy.x||kx,y=joy.y||ky,m=Math.hypot(x,y);return m>.08?{x:x/m,y:y/m,m:Math.min(1,m)}:{x:Math.cos(r.face),y:Math.sin(r.face),m:0};}
 let target=path[r.cp%path.length],dx=target.x-r.x,dy=target.y-r.y,m=Math.hypot(dx,dy)||1;return {x:dx/m,y:dy/m,m:1};}
function updateRacer(r,dt){if(r.finished)return;r.skillCdA=Math.max(0,r.skillCdA-dt);r.skillCdB=Math.max(0,r.skillCdB-dt);r.hitSlow=Math.max(0,r.hitSlow-dt);r.boost=Math.max(0,r.boost-dt);r.bump=Math.max(0,r.bump-dt);r.wing=Math.max(0,r.wing-dt);
 const inp=desiredInput(r),want=Math.atan2(inp.y,inp.x),diff=norm(want-r.face),ratio=Math.min(1,r.speed/maxSpeed),turn=(turnGround*(1-ratio)+turnFast*ratio)*dt;
 if(Math.abs(diff)<turn)r.face=want;else r.face+=Math.sign(diff)*turn;
 // AI flight rhythm
 if(r.ai){if(r.flight<3&&Math.random()<dt*2.8)pressJumpSilent(r);if(r.flight===3&&r.glideClock>4.55&&r.glideClock<5.45)pressJumpSilent(r);}
 if(r.flight===0){r.speed=approach(r.speed,groundSpeed*inp.m,380*dt);}else if(r.flight===1){r.speed=approach(r.speed,330,230*dt);}else if(r.flight===2){r.speed=approach(r.speed,455,260*dt);}else {r.glideClock+=dt;if(r.glideClock<5.65)r.speed=approach(r.speed,maxSpeed,glideAccel*dt);else{r.glideGrace+=dt;r.speed=approach(r.speed,245,82*dt);if(r.speed<300){r.flight=0;r.onGround=true;r.glideClock=0;}}}
 if(r.hitSlow>0)r.speed*=Math.pow(.78,dt*4);if(r.boost>0)r.speed=Math.min(maxSpeed+45,r.speed+210*dt);if(r.bump>0)r.speed=Math.min(r.speed,360);
 // Tongue anchor overrides ordinary turn. Player/rival overlap never affects anchor tongue.
 if(r.tongue?.kind==='anchor'){let a=r.tongue.target,dx=a.x-r.x,dy=a.y-r.y,d=Math.hypot(dx,dy)||1,tan=Math.atan2(dy,dx)+(r.tongue.side>0?Math.PI/2:-Math.PI/2);let hold=(performance.now()-r.tongue.started)/1000;r.face=lerpAngle(r.face,tan,Math.min(1,dt*7.5));if(hold>1.05)r.speed=Math.max(220,r.speed-250*dt);else r.speed=Math.max(r.speed,Math.min(maxSpeed,520));}
 r.vx=Math.cos(r.face)*r.speed;r.vy=Math.sin(r.face)*r.speed;r.x+=r.vx*dt;r.y+=r.vy*dt;
 // Guard-grass wall: lose speed, but reflect back into the course instead of sticking to it.
 let hit=trackInfo(r.x,r.y);
 if(hit.d>198){
   let nx=(r.x-hit.qx)/(hit.d||1),ny=(r.y-hit.qy)/(hit.d||1);
   let dot=r.vx*nx+r.vy*ny;
   let rvx=r.vx-2*dot*nx,rvy=r.vy-2*dot*ny;
   r.speed=Math.max(175,Math.hypot(rvx,rvy)*.68);
   r.face=Math.atan2(rvy,rvx);
   // place the racer just inside the wall so the next frame does not collide again
   r.x=hit.qx+nx*188;r.y=hit.qy+ny*188;
   r.bump=.26;if(!r.ai)msg('ガード草に激突！ 減速して跳ね返った');
 }
 r.x=Math.max(90,Math.min(world.w-90,r.x));r.y=Math.max(90,Math.min(world.h-90,r.y));
 updateCheckpoint(r);
 if(r.ai)aiSkills(r,dt);
}
function pressJumpSilent(r){if(r.flight===0){r.flight=1;r.speed=Math.max(r.speed,285)}else if(r.flight===1){r.flight=2;r.speed=Math.max(r.speed,405)}else if(r.flight===2){r.flight=3;r.glideClock=0;r.speed=Math.max(r.speed,520)}else if(r.glideClock>3.8){r.glideClock=0;r.speed=Math.max(r.speed,550)}}
function aiSkills(r,dt){if(r.name!=='Gabriel')return;let t=path[r.cp%path.length],to=Math.atan2(t.y-r.y,t.x-r.x),bend=Math.abs(norm(to-r.face));if(bend>.56&&r.skillCdB<=0&&Math.random()<dt*3){waterSkill(r,true,true)}else if(bend>.3&&r.skillCdA<=0&&Math.random()<dt*2){waterSkill(r,false,true)}}
function updateCheckpoint(r){let cp=checkpoints[r.cp%checkpoints.length];if(Math.hypot(r.x-cp.x,r.y-cp.y)<cp.r){r.cp++;if(r.cp>=checkpoints.length){r.finished=true;r.speed=0;if(!finished){finished=true;msg((r===racers[controlledIndex]?'YOU WIN! ':'')+r.name+' ゴール！');}}}}
function startTongue(r){if(r.finished)return;let anchor=nearestAnchor(r,330);if(anchor){let cross=Math.sin(norm(Math.atan2(anchor.y-r.y,anchor.x-r.x)-r.face));r.tongue={kind:'anchor',target:anchor,started:performance.now(),side:cross>0?-1:1};msg('アンカーに舌！ 離すタイミングで脱出');return;}
 let other=racers[1-r.index],d=Math.hypot(other.x-r.x,other.y-r.y);if(d<270){r.tongue={kind:'rival',target:other,started:performance.now()};other.hitSlow=.42;r.boost=.28;msg('ライバルを舌で絡めた！ 一瞬加速');}}
function endTongue(r){if(!r.tongue)return;if(r.tongue.kind==='anchor'){let held=(performance.now()-r.tongue.started)/1000;if(held<.35)msg('舌を離すのが早い！ 外へ膨らむ');else if(held>.98){r.speed*=.82;msg('離すのが遅い！ 木に引かれて減速');}else{r.boost=.18;msg('ナイス舌ターン！');}}r.tongue=null;}
function nearestAnchor(r,range){let best=null,bd=1e9;for(const a of anchors){let d=Math.hypot(a.x-r.x,a.y-r.y),front=Math.cos(norm(Math.atan2(a.y-r.y,a.x-r.x)-r.face));if(d<range&&d<bd&&front>-.25){best=a;bd=d}}return best;}
function useA(r){if(r.skillCdA>0)return;if(r.name==='Gabriel'){waterSkill(r,false,false);return;}r.skillCdA=1.35;let o=racers[1-r.index],d=Math.hypot(o.x-r.x,o.y-r.y);if(d<90){pushRival(o,r.face,78);msg('パンチ！ 相手を横へ弾いた');}else msg('パンチ！');}
function useB(r){if(r.skillCdB>0)return;if(r.name==='Gabriel'){waterSkill(r,true,false);return;}r.skillCdB=1.7;effects.push({kind:'bubble',x:r.x,y:r.y,vx:Math.cos(r.face)*620,vy:Math.sin(r.face)*620,owner:r,t:1.45});msg('泡弾！');}
let effects=[];
function waterSkill(r,laser,silent){let key=laser?'skillCdB':'skillCdA';if(r[key]>0)return;r[key]=laser?2.25:1.05;let inp=desiredInput(r),desired=Math.atan2(inp.y,inp.x),steer=norm(desired-r.face);let turnSide=Math.sign(steer||1); // recoil goes toward desired turn, jet fires opposite side
 let recoilAng=r.face+turnSide*Math.PI/2,jetAng=recoilAng+Math.PI;r.face=norm(r.face+turnSide*(laser?.62:.24));r.x+=Math.cos(recoilAng)*(laser?48:19);r.y+=Math.sin(recoilAng)*(laser?48:19);r.speed=Math.min(maxSpeed+20,r.speed+(laser?36:12));effects.push({kind:laser?'laser':'water',x:r.x,y:r.y,a:jetAng,t:laser?.23:.34,max:laser?.23:.34,owner:r});if(!silent)msg(laser?'水レーザー反動！ 舌なし急旋回':'水弾反動！ 横へスライド');}
function pushRival(o,face,amt){let side=Math.random()<.5?-1:1;o.x+=Math.cos(face+side*Math.PI/2)*amt;o.y+=Math.sin(face+side*Math.PI/2)*amt;}
function updateEffects(dt){for(const e of effects){e.t-=dt;if(e.kind==='bubble'){e.x+=e.vx*dt;e.y+=e.vy*dt;let o=racers[1-e.owner.index];if(Math.hypot(o.x-e.x,o.y-e.y)<o.r+18){pushRival(o,Math.atan2(e.vy,e.vx),70);e.t=0;if(e.owner===racers[controlledIndex])msg('泡弾ヒット！ 壁に押し出せ！')}}}effects=effects.filter(e=>e.t>0)}
function trackInfo(px,py){let best={d:1e9,qx:0,qy:0};for(let i=0;i<path.length;i++){let a=path[i],b=path[(i+1)%path.length],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy,t=Math.max(0,Math.min(1,((px-a.x)*vx+(py-a.y)*vy)/l2)),qx=a.x+t*vx,qy=a.y+t*vy,d=Math.hypot(px-qx,py-qy);if(d<best.d)best={d,qx,qy}}return best}
function trackDistance(px,py){return trackInfo(px,py).d}
function draw(){let me=racers[controlledIndex];camera.x=approach(camera.x,me.x-W/2,.16*W);camera.y=approach(camera.y,me.y-H/2,.16*H);camera.x=Math.max(0,Math.min(world.w-W,camera.x));camera.y=Math.max(0,Math.min(world.h-H,camera.y));ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(-camera.x,-camera.y);drawWorld();for(const e of effects)drawEffect(e);for(const r of racers)drawRacer(r);ctx.restore();drawMini();updateHud(me)}
function drawWorld(){
 // The race is airborne: below the racers is a pond, not a road surface.
 ctx.fillStyle='#69cbe0';ctx.fillRect(0,0,world.w,world.h);
 // soft water patches make different sections feel like pond / puddle zones
 for(let y=240;y<world.h;y+=620){for(let x=260;x<world.w;x+=760){let n=((x*13+y*7)%190)-95;ctx.fillStyle='rgba(255,255,255,.055)';ctx.beginPath();ctx.ellipse(x+n,y-n*.35,170,72,.18,0,Math.PI*2);ctx.fill();}}
 for(const l of lilies)drawLily(l.x,l.y,l.r);
 ctx.lineCap='round';ctx.lineJoin='round';
 // thick outer stroke = tall guard grass. Inner stroke returns to water, leaving only grass walls at both sides.
 ctx.strokeStyle='#2f713c';ctx.lineWidth=500;strokeLoop();
 ctx.strokeStyle='#78d1df';ctx.lineWidth=390;strokeLoop();
 // Visible blade tips on both edges: the guard wall should read as tall grass, not a smooth green rail.
 drawGrassBlades();
 // little highlights on the flying corridor; no asphalt / dirt road line.
 ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=3;ctx.setLineDash([18,46]);strokeLoop();ctx.setLineDash([]);
 for(const a of anchors)drawTree(a.x,a.y);
 // start gate across the water corridor
 ctx.save();ctx.translate(path[0].x,path[0].y);ctx.rotate(Math.atan2(path[1].y-path[0].y,path[1].x-path[0].x)+Math.PI/2);for(let i=-4;i<=4;i++){ctx.fillStyle=i%2?'#fff':'#252525';ctx.fillRect(i*20,-190,20,380)}ctx.restore();
}
function strokeLoop(){ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);ctx.closePath();ctx.stroke()}
function drawGrassBlades(){
 const edge=201, blade=28, spacing=34;
 ctx.fillStyle='#2f8a43';
 for(let i=0;i<path.length;i++){
  const a=path[i],b=path[(i+1)%path.length],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
  const tx=dx/len,ty=dy/len,nx=-ty,ny=tx;
  const count=Math.max(1,Math.floor(len/spacing));
  for(let j=0;j<=count;j++){
   const d=Math.min(len,j*spacing), wob=((j+i)&1)?7:-7;
   const cx=a.x+tx*d,cy=a.y+ty*d;
   for(const side of [-1,1]){
    const bx=cx+nx*edge*side,by=cy+ny*edge*side;
    const tipx=bx+nx*blade*side+tx*wob,tipy=by+ny*blade*side+ty*wob;
    ctx.beginPath();
    ctx.moveTo(bx-tx*11,by-ty*11);
    ctx.lineTo(tipx,tipy);
    ctx.lineTo(bx+tx*11,by+ty*11);
    ctx.closePath();ctx.fill();
   }
  }
 }
}
function drawLily(x,y,r){ctx.save();ctx.translate(x,y);ctx.fillStyle='#4aa74c';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.lineTo(0,0);ctx.arc(0,0,r,-.48,.48,true);ctx.closePath();ctx.fill();ctx.fillStyle='#8cd45d';ctx.beginPath();ctx.arc(-r*.22,-r*.18,r*.22,0,Math.PI*2);ctx.fill();if(r>65){ctx.fillStyle='#f5bfd4';for(let i=0;i<6;i++){let a=i*Math.PI/3;ctx.beginPath();ctx.ellipse(Math.cos(a)*r*.18,Math.sin(a)*r*.18,r*.16,r*.07,a,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#ffd86b';ctx.beginPath();ctx.arc(0,0,r*.08,0,Math.PI*2);ctx.fill()}ctx.restore()}
function drawTree(x,y){ctx.fillStyle='#714624';ctx.fillRect(x-10,y-8,20,72);ctx.fillStyle='#247b3c';ctx.beginPath();ctx.arc(x,y-20,34,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8bd85d';ctx.beginPath();ctx.arc(x-10,y-30,14,0,Math.PI*2);ctx.fill()}
function angelWing(x,y,side,scale=1,tilt=0){
 // One connected angel-wing silhouette. Broad at the shoulder, tapered into layered feather tips.
 ctx.save();ctx.translate(x,y);ctx.scale(side*scale,scale);ctx.rotate(tilt);
 ctx.fillStyle='#fffdf5';ctx.strokeStyle='#c9d9dc';ctx.lineWidth=2.2;ctx.lineJoin='round';
 ctx.beginPath();
 ctx.moveTo(0,2);
 ctx.bezierCurveTo(12,-17,32,-27,55,-25);
 ctx.bezierCurveTo(48,-18,43,-12,39,-8);
 ctx.bezierCurveTo(52,-11,64,-8,72,-2);
 ctx.bezierCurveTo(62,2,54,5,47,8);
 ctx.bezierCurveTo(57,9,65,14,69,20);
 ctx.bezierCurveTo(58,21,48,20,39,18);
 ctx.bezierCurveTo(47,23,51,28,50,34);
 ctx.bezierCurveTo(37,33,27,29,20,24);
 ctx.bezierCurveTo(24,31,23,37,18,41);
 ctx.bezierCurveTo(8,31,3,18,0,2);
 ctx.closePath();ctx.fill();ctx.stroke();
 // restrained feather separators: keep the wing reading as one mass, not insect wings
 ctx.strokeStyle='#e2ecee';ctx.lineWidth=1.8;
 for(const pts of [[[9,3],[33,-13],[55,-16]],[[10,9],[34,1],[59,1]],[[10,15],[31,13],[55,18]],[[9,21],[25,25],[41,31]]]){
  ctx.beginPath();ctx.moveTo(...pts[0]);ctx.quadraticCurveTo(...pts[1],...pts[2]);ctx.stroke();
 }
 ctx.restore();
}
function frogFront(r){
 // broad, friendly frog head and compact human-like body; wings emerge from the shoulders
 angelWing(-18,-3,-1,.94,-.03);angelWing(18,-3,1,.94,.03);
 ctx.fillStyle=r.color;
 // legs behind body
 ctx.beginPath();ctx.ellipse(-11,28,9,16,.28,0,Math.PI*2);ctx.ellipse(11,28,9,16,-.28,0,Math.PI*2);ctx.fill();
 // compact torso
 ctx.beginPath();ctx.roundRect(-18,-1,36,39,16);ctx.fill();
 // simple arms
 ctx.beginPath();ctx.ellipse(-23,10,7,16,.35,0,Math.PI*2);ctx.ellipse(23,10,7,16,-.35,0,Math.PI*2);ctx.fill();
 // oversized frog head
 ctx.beginPath();ctx.ellipse(0,-21,31,25,0,0,Math.PI*2);ctx.fill();
 // eye bumps integrated into head
 ctx.beginPath();ctx.arc(-14,-38,13,0,Math.PI*2);ctx.arc(14,-38,13,0,Math.PI*2);ctx.fill();
 // belly
 ctx.fillStyle='#e7f4c9';ctx.beginPath();ctx.ellipse(0,13,12,17,0,0,Math.PI*2);ctx.fill();
 // eyes
 ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(-14,-39,10,0,Math.PI*2);ctx.arc(14,-39,10,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#142019';ctx.beginPath();ctx.arc(-12,-39,4,0,Math.PI*2);ctx.arc(12,-39,4,0,Math.PI*2);ctx.fill();
 // smile, centered lower on the face like the original game character
 ctx.strokeStyle='#17352d';ctx.lineWidth=3.2;ctx.lineCap='round';ctx.beginPath();ctx.arc(0,-18,10,.18,Math.PI-.18);ctx.stroke();
}
function frogBack(r){
 // body first; wings are intentionally drawn afterwards so their roots sit on the viewer side of the upper back
 ctx.fillStyle=r.color;
 ctx.beginPath();ctx.ellipse(-11,28,9,16,.28,0,Math.PI*2);ctx.ellipse(11,28,9,16,-.28,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.roundRect(-18,-1,36,39,16);ctx.fill();
 ctx.beginPath();ctx.ellipse(-23,10,7,16,.35,0,Math.PI*2);ctx.ellipse(23,10,7,16,-.35,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.ellipse(0,-21,31,25,0,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.arc(-14,-38,13,0,Math.PI*2);ctx.arc(14,-38,13,0,Math.PI*2);ctx.fill();
 // wings overlap the upper back at the shoulder blades
 angelWing(-15,-7,-1,.98,-.03);angelWing(15,-7,1,.98,.03);
 // small green shoulder caps in front of the wing roots sell the attachment point
 ctx.fillStyle=r.color;ctx.beginPath();ctx.ellipse(-16,-3,8,10,-.45,0,Math.PI*2);ctx.ellipse(16,-3,8,10,.45,0,Math.PI*2);ctx.fill();
}
function frogSide(r,left){
 const d=left?-1:1;ctx.save();ctx.scale(d,1);
 // far wing peeks behind the body, main wing grows from the visible shoulder and sweeps backward
 ctx.globalAlpha=.78;angelWing(-10,-5,-1,.76,-.06);ctx.globalAlpha=1;
 ctx.fillStyle=r.color;
 ctx.beginPath();ctx.ellipse(-8,28,10,16,.28,0,Math.PI*2);ctx.ellipse(9,29,9,15,-.18,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.roundRect(-16,-1,34,39,15);ctx.fill();
 ctx.beginPath();ctx.ellipse(-20,9,7,15,.28,0,Math.PI*2);ctx.fill();
 // frog side-profile head: rounded rear, short projecting muzzle
 ctx.beginPath();ctx.ellipse(4,-21,28,24,0,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.arc(13,-38,13,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.ellipse(25,-18,13,12,0,0,Math.PI*2);ctx.fill();
 // visible wing on top of shoulder/body connection
 angelWing(-11,-7,-1,.96,-.04);
 ctx.fillStyle='#e7f4c9';ctx.beginPath();ctx.ellipse(8,13,10,17,0,0,Math.PI*2);ctx.fill();
 // one readable eye in profile
 ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(15,-39,10,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#142019';ctx.beginPath();ctx.arc(18,-39,4,0,Math.PI*2);ctx.fill();
 // tiny mouth curve near muzzle
 ctx.strokeStyle='#17352d';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.arc(22,-17,7,.35,Math.PI-.5);ctx.stroke();
 ctx.restore();
}
function drawRacer(r){if(r.tongue){let t=r.tongue.target;ctx.strokeStyle='#e86a91';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(r.x,r.y+2);ctx.quadraticCurveTo((r.x+t.x)/2,(r.y+t.y)/2+18,t.x,t.y);ctx.stroke()}
 ctx.save();ctx.translate(r.x,r.y);let a=norm(r.face),dir=Math.abs(a)<Math.PI/4?'right':Math.abs(a)>Math.PI*3/4?'left':a<0?'up':'down';
 if(dir==='down')frogFront(r);else if(dir==='up')frogBack(r);else frogSide(r,dir==='left');
 // flap feedback is a subtle scale pulse instead of extra detached feathers
 if(r.flight>0&&r.wing>0){ctx.globalAlpha=.14;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(0,-4,40+6*Math.sin(performance.now()/55),0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
 ctx.restore();ctx.fillStyle='#17352d';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText(r.name,r.x,r.y-68)}
function drawEffect(e){if(e.kind==='bubble'){ctx.fillStyle='#bcecffaa';ctx.strokeStyle='#4eaeeb';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,17,0,Math.PI*2);ctx.fill();ctx.stroke()}else{let len=e.kind==='laser'?640:120;ctx.strokeStyle=e.kind==='laser'?'#baf5ff':'#7bd7ff';ctx.lineWidth=e.kind==='laser'?7:15;ctx.globalAlpha=Math.max(.15,e.t/e.max);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(e.a)*len,e.y+Math.sin(e.a)*len);ctx.stroke();ctx.globalAlpha=1}}
function drawMini(){let sx=185/world.w,sy=118/world.h,ox=18,oy=58;ctx.fillStyle='#102820c9';ctx.fillRect(ox,oy,185,118);ctx.strokeStyle='#2f713c';ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(ox+path[0].x*sx,oy+path[0].y*sy);for(let i=1;i<path.length;i++)ctx.lineTo(ox+path[i].x*sx,oy+path[i].y*sy);ctx.closePath();ctx.stroke();ctx.strokeStyle='#78d1df';ctx.lineWidth=10;ctx.stroke();for(const r of racers){ctx.fillStyle=r.color;ctx.beginPath();ctx.arc(ox+r.x*sx,oy+r.y*sy,5,0,Math.PI*2);ctx.fill()}}
function updateHud(r){ui.who.textContent='操作：'+(r.name==='Michael'?'ミカエル':'ガブリエル');ui.speed.textContent=Math.round(r.speed*.56)+' km/h';ui.a.innerHTML='A<small>'+(r.name==='Gabriel'?'水弾':'パンチ')+'</small>';ui.b.innerHTML='B<small>'+(r.name==='Gabriel'?'水レーザー':'泡弾')+'</small>';let phase=['地上','ジャンプ','羽ばたき','滑空'][r.flight];if(r.flight===3)phase+=' '+Math.min(9.9,r.glideClock).toFixed(1)+'s';ui.jump.innerHTML='ジャンプ<small>'+phase+'</small>'}
function msg(t){ui.status.textContent=t;clearTimeout(msg.timer);msg.timer=setTimeout(()=>ui.status.textContent='ジャンプ3回＋舌ターンで最速を狙え！',2200)}
function loop(now){let dt=Math.min(.033,(now-last)/1000);last=now;for(const r of racers)updateRacer(r,dt);updateEffects(dt);draw();requestAnimationFrame(loop)}
function norm(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a}function approach(a,b,d){return a<b?Math.min(b,a+d):Math.max(b,a-d)}function lerpAngle(a,b,t){return a+norm(b-a)*t}
// input
addEventListener('keydown',e=>{keys[e.key]=true;if(e.code==='Space'){e.preventDefault();pressJump(racers[controlledIndex])}if(e.key==='e')startTongue(racers[controlledIndex]);if(e.key==='j')useA(racers[controlledIndex]);if(e.key==='k')useB(racers[controlledIndex]);if(e.key==='c')swapControl()});addEventListener('keyup',e=>{keys[e.key]=false;if(e.key==='e')endTongue(racers[controlledIndex])});
function bindPress(el,down,up){el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);down()});el.addEventListener('pointerup',e=>{e.preventDefault();up?.()});el.addEventListener('pointercancel',()=>up?.())}
bindPress(ui.jump,()=>pressJump(racers[controlledIndex]));bindPress(ui.tongue,()=>startTongue(racers[controlledIndex]),()=>endTongue(racers[controlledIndex]));bindPress(ui.a,()=>useA(racers[controlledIndex]));bindPress(ui.b,()=>useB(racers[controlledIndex]));ui.swap.addEventListener('click',swapControl);
function swapControl(){endTongue(racers[controlledIndex]);controlledIndex=1-controlledIndex;racers.forEach((r,i)=>r.ai=i!==controlledIndex);msg((controlledIndex?'ガブリエル':'ミカエル')+'を操作');}
ui.stick.addEventListener('pointerdown',e=>{joy.id=e.pointerId;ui.stick.setPointerCapture(e.pointerId);setJoy(e)});ui.stick.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)setJoy(e)});ui.stick.addEventListener('pointerup',e=>{if(e.pointerId===joy.id){joy={id:null,x:0,y:0};moveKnob()}});ui.stick.addEventListener('pointercancel',()=>{joy={id:null,x:0,y:0};moveKnob()});
function setJoy(e){let r=ui.stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,m=Math.hypot(dx,dy),rad=r.width*.36;if(m>rad){dx*=rad/m;dy*=rad/m}joy.x=dx/rad;joy.y=dy/rad;moveKnob(dx,dy)}function moveKnob(dx=0,dy=0){let i=ui.stick.querySelector('i');i.style.transform=`translate(${dx}px,${dy}px)`}
requestAnimationFrame(loop);
