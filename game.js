'use strict';


// ===== v1.5 meta game / field map =====
const VERSION='v2.21';
const RACE_LAPS=3;

const CHARACTER_DATA={
 Michael:{jp:'ミカエルさん',color:'#49a94f',wing:'special'},
 Gabriel:{jp:'ガブリエルさん',color:'#3188e6'},
 Plain:{jp:'もぶさん',color:'#78a83c'},
 Raphael:{jp:'ラファエルさん',color:'#e6c83e'},
 Uriel:{jp:'ウリエルさん',color:'#e88735'},
 Lucifer:{jp:'ルシファーさん',color:'#666a70'},
 Lilith:{jp:'リリスさん',color:'#ef78ad'},
 Beelzebub:{jp:'ベルゼブブさん',color:'#101515'},
 Kawazu:{jp:'カワズさん',color:'#3f9d52',wing:'red'},
 Azazel:{jp:'アザゼルさん',color:'#8c5a9e'},
 Leviathan:{jp:'リヴァイアさん',color:'#d65a48'},
 Asmodeus:{jp:'アスモデウスさん',color:'#d64b35'},
 Belial:{jp:'ベリアルさん',color:'#49324f'}
};
const TOURNAMENT_ROSTER=['Gabriel','Raphael','Uriel','Lucifer','Lilith'];
function randomTournamentOpponent(exclude=[]){
 const pool=TOURNAMENT_ROSTER.filter(n=>!exclude.includes(n));
 return pool[Math.floor(Math.random()*pool.length)]||'Gabriel';
}
function buildTournament(place){
 // Standard course tournament: two rounds. Round 1 teaches the baseline, round 2 is a personality matchup.
 if(place==='master')return ['Beelzebub'];if(place==='kawazu')return ['Kawazu'];
 return ['Plain',randomTournamentOpponent()];
}

let appState='title';
let currentPlace='field';
let tournament=null;
let saveData={
  started:false,
  selectedCharacter:'Michael',
  michaelSkillA:'punch',
  michaelSkillB:'bubble',
  kawazuSkillA:'airSwim',
  kawazuSkillB:'wallKick',
  unlockedSkills:['punch','bubble'],encountered:['Plain'],
  wins:0,
  arenaWins:0,
  tournamentWins:{},masterUnlocked:false,kawazuUnlocked:false,timeLagUnlocked:false,timeStopUnlocked:false
};

function loadSave(){
  try{
    const raw=localStorage.getItem('angelFrogRaceSave');
    if(raw) saveData={...saveData,...JSON.parse(raw)};
    saveData.encountered=saveData.encountered||['Plain'];
    saveData.unlockedSkills=saveData.unlockedSkills||['punch','bubble'];
    saveData.kawazuSkillA=saveData.kawazuSkillA||'airSwim';saveData.kawazuSkillB=saveData.kawazuSkillB||'wallKick';
    saveData.timeLagUnlocked=!!saveData.timeLagUnlocked;saveData.timeStopUnlocked=!!saveData.timeStopUnlocked;
    if(!saveData.timeStopUnlocked)saveData.unlockedSkills=saveData.unlockedSkills.filter(x=>x!=='timeStop');
    if(saveData.timeLagUnlocked&&!saveData.unlockedSkills.includes('timeLag'))saveData.unlockedSkills.push('timeLag');
    if(saveData.timeStopUnlocked&&!saveData.unlockedSkills.includes('timeStop'))saveData.unlockedSkills.push('timeStop');
  }catch(e){}
}
function saveGame(){
  saveData.started=true;
  try{localStorage.setItem('angelFrogRaceSave',JSON.stringify(saveData));}catch(e){}
  const st=document.querySelector('#status'); if(st) st.textContent='セーブしました';
}
function hideAllScreens(){
  ['#titleScreen','#storyScreen','#fieldScreen','#homePanel','#placePanel','#raceUi'].forEach(id=>document.querySelector(id)?.classList.add('hidden'));
}
function showTitle(){
  appState='title';hideAllScreens();document.querySelector('#titleScreen')?.classList.remove('hidden');
  document.querySelector('#versionBadge')?.classList.remove('hidden');
}
function showField(){
  appState='field';hideAllScreens();document.querySelector('#fieldScreen')?.classList.remove('hidden');
  document.querySelector('#versionBadge')?.classList.remove('hidden');
  updateFieldUi();
  let kb=document.querySelector('.mapSpot.kawazu');
  if(saveData.kawazuUnlocked&&!kb){
    kb=document.createElement('button');kb.className='mapSpot kawazu';kb.dataset.place='kawazu';kb.innerHTML='🐸<b>カワズさん</b><small>クリア後</small>';
    kb.addEventListener('click',()=>showPlace('kawazu'));document.querySelector('#fieldMap')?.appendChild(kb);
  }
}
function updateFieldUi(){
  const n=CHARACTER_DATA[saveData.selectedCharacter]?.jp?.replace('さん','')||saveData.selectedCharacter;
  const el=document.querySelector('#fieldPlayer');if(el)el.textContent='操作：'+n;
}
const MICHAEL_ORIGINAL_SKILLS=[['normalHighJump','ハイジャンプ'],['burningWing','バーニングウィング'],['highJump','バーニングクライム'],['timeLag','タイムラグ'],['timeStop','時間停止']];
const LEARNABLE_SKILLS={
 Gabriel:[['waterBoost','水ブースト'],['waterLaser','水レーザー']],
 Raphael:[['airBarrier','エアバリア'],['airBoost','エアブースト']],
 Uriel:[['tackle','タックル'],['rockFall','ロックフォール']],
 Lucifer:[['smashDown','叩き落とし'],['chargeBoost','チャージブースト']],
 Lilith:[['kick','キック'],['bewitch','惑いの瘴気']],
 Beelzebub:[['poisonShot','毒液'],['poisonBoost','ポイズンブースト']]
};
function skillLabel(id){
 const base={punch:'パンチ',bubble:'泡弾',airSwim:'エアースイム',wallKick:'壁キック',normalHighJump:'ハイジャンプ',burningWing:'バーニングウィング',highJump:'バーニングクライム',timeLag:'タイムラグ（禁断・周囲50% / 6秒）',timeStop:'時間停止（禁断・1レース1回）'};if(base[id])return base[id];
 for(const [who,list] of Object.entries(LEARNABLE_SKILLS)){let x=list.find(v=>v[0]===id);if(x)return x[1]+'（'+CHARACTER_DATA[who].jp+'）';}
 return id;
}
function rebuildSkillSelects(){
 const a=document.querySelector('#skillASelect'),b=document.querySelector('#skillBSelect');if(!a||!b)return;
 const isKawazu=saveData.selectedCharacter==='Kawazu';
 let ids=isKawazu
   ?['airSwim','wallKick','punch','bubble','normalHighJump',...(saveData.unlockedSkills||[]).filter(x=>!['punch','bubble','normalHighJump'].includes(x))]
   :['punch','bubble','normalHighJump',...(saveData.unlockedSkills||[]).filter(x=>!['punch','bubble','normalHighJump'].includes(x))];
 ids=[...new Set(ids)];
 const html=ids.map(id=>`<option value="${id}">${skillLabel(id)}</option>`).join('');
 a.innerHTML=html;b.innerHTML=html;
 let ka=isKawazu?'kawazuSkillA':'michaelSkillA',kb=isKawazu?'kawazuSkillB':'michaelSkillB';
 if(!ids.includes(saveData[ka]))saveData[ka]=isKawazu?'airSwim':'punch';
 if(!ids.includes(saveData[kb]))saveData[kb]=isKawazu?'wallKick':'bubble';
 if(saveData[ka]===saveData[kb])saveData[kb]=ids.find(x=>x!==saveData[ka])||saveData[kb];
 a.value=saveData[ka];b.value=saveData[kb];
 const heading=document.querySelector('#skillSetupTitle');
 if(heading)heading.textContent=(isKawazu?'カワズ':'ミカエル')+' スキル設定';
 const note=document.querySelector('#skillSetupNote');
 if(note)note.textContent=isKawazu?'カワズさんも習得済みスキルを自由に付け替えできます。バーニング系は回数無制限。':'イベントをクリアするとスキルを習得できます。';
}
function learnFromOpponent(name){
 const list=LEARNABLE_SKILLS[name];if(!list)return false;let learned=[];
 for(const [id,label] of list)if(!saveData.unlockedSkills.includes(id)){saveData.unlockedSkills.push(id);learned.push(label);}
 if(learned.length){saveGame();return learned;}return false;
}

function showHome(){
  appState='home';hideAllScreens();document.querySelector('#fieldScreen')?.classList.remove('hidden');document.querySelector('#homePanel')?.classList.remove('hidden');
  document.querySelector('#kawazuCharBtn')?.classList.toggle('hidden',!saveData.kawazuUnlocked);
  if(!saveData.kawazuUnlocked&&saveData.selectedCharacter==='Kawazu')saveData.selectedCharacter='Michael';
  rebuildSkillSelects();
  document.querySelectorAll('.charBtn').forEach(b=>b.classList.toggle('selected',b.dataset.char===saveData.selectedCharacter));
  const a=document.querySelector('#skillASelect'),b=document.querySelector('#skillBSelect'),isK=saveData.selectedCharacter==='Kawazu';
  if(a)a.value=isK?saveData.kawazuSkillA:saveData.michaelSkillA;if(b)b.value=isK?saveData.kawazuSkillB:saveData.michaelSkillB;
}
let eventChallenge=null;
function startLearningRace(name,place){
  eventChallenge={opponent:name,place,racePlace:place==='forest'?'arena3':'arena2'};
  tournament=null;
  startRaceRound(name,true);
}
function showPlace(place){
  appState='place';currentPlace=place;hideAllScreens();document.querySelector('#fieldScreen')?.classList.remove('hidden');document.querySelector('#placePanel')?.classList.remove('hidden');
  const data={
    arena1:['🏟️ 風の競技場','草原と池を抜ける基本コース。ヘアピンあり。'],
    arena2:['🏟️ 水辺の競技場','池・蓮の葉・水面が多い高速コース。'],
    arena3:['🏟️ 森の競技場','木々と連続ヘアピンが多いテクニカルコース。'],
    practice:['🎯 練習場','ジャンプ3段階、舌アンカー、スキルを自由に練習できます。'],
    forest:['🌲 森','トンボのアザゼルさん、クモのベリアルさんがいる森。'],
    pond:['🪷 池','ピラニアのリヴァイアさん、ザリガニのアスモデウスさんがいる池。'],
    master:['👑 マスタークラス','ベルゼブブさんが待つ高難度クラス。'],
    kawazu:['🐸 カワズさん','クリア後に現れる謎の高速カエル。']
  }[place];
  document.querySelector('#placeTitle').textContent=data[0];
  document.querySelector('#placeDesc').textContent=data[1];
  const actions=document.querySelector('#placeActions');actions.innerHTML='';
  if(place==='practice'){const box=document.createElement('div');box.className='homeBox';box.innerHTML='<b>練習相手を選択</b><p class="panelNote">これまで大会で対戦した相手から選べます。</p>';for(const n of (saveData.encountered||['Plain'])){const q=document.createElement('button');q.className='menuBtn';q.textContent=CHARACTER_DATA[n]?.jp||n;q.onclick=()=>{tournament=null;startRaceRound(n,true)};box.appendChild(q)}actions.appendChild(box);}else if(place.startsWith('arena')||place==='master'||place==='kawazu'){
    const b=document.createElement('button');b.className='menuBtn';b.textContent=place==='practice'?'練習を始める':(place==='master'?'ベルゼブブさんに挑戦':(place==='kawazu'?'カワズさんに挑戦':'2回戦大会に参加'));
    b.onclick=()=>startRace(place==='practice');
    actions.appendChild(b);
  }else{
    const p=document.createElement('div');p.className='homeBox';
    p.innerHTML='<b>'+(place==='forest'?'森':'池')+'の交流イベント</b><p>対戦したことのある相手とイベントレースをして、勝つとその相手のスキルを教わります。</p>';
    let any=false;for(const n of (saveData.encountered||[])){if(!LEARNABLE_SKILLS[n])continue;any=true;const q=document.createElement('button');q.className='menuBtn';let list=LEARNABLE_SKILLS[n],done=list.every(x=>saveData.unlockedSkills.includes(x[0]));q.textContent=(CHARACTER_DATA[n]?.jp||n)+(done?'（習得済み）':'とレースして教わる');q.disabled=done;q.onclick=()=>startLearningRace(n,place);p.appendChild(q)}if(!any)p.innerHTML+='<p>まだスキルを教えてくれる相手と対戦していません。</p>';
    if(place==='pond'){
      const sep=document.createElement('div');sep.className='panelNote';
      if(!saveData.kawazuUnlocked)sep.textContent='池の奥には、まだ入れない場所があるようだ……（クリア後に解禁）';
      else if(!saveData.timeLagUnlocked){
        sep.textContent='アスモデウスさんが、時間の流れを乱す射撃訓練を待っている。';
        const q=document.createElement('button');q.className='menuBtn';q.textContent='アスモデウスさんとシューティング：タイムラグ';
        q.onclick=()=>startShootingSkillEvent('pond','timeLag');p.appendChild(q);
      }else sep.textContent='池の時間イベント：タイムラグ習得済み。';
      p.appendChild(sep);
    }
    if(place==='forest'&&saveData.kawazuUnlocked&&saveData.timeLagUnlocked&&!saveData.timeStopUnlocked){
      const sep=document.createElement('div');sep.className='panelNote';
      if(saveData.selectedCharacter==='Kawazu'){
        sep.textContent='ベリアルさんの糸の間だけ、時間が止まって見える……。';
        const q=document.createElement('button');q.className='menuBtn';q.textContent='ベリアルさんとシューティング：時間停止';
        q.onclick=()=>startShootingSkillEvent('forest','timeStop');p.appendChild(q);
      }else sep.textContent='タイムラグの先に、カワズさんだけが気づける何かが森にあるようだ。';
      p.appendChild(sep);
    }else if(place==='forest'&&saveData.timeStopUnlocked){
      const sep=document.createElement('div');sep.className='panelNote';sep.textContent='森の時間イベント：時間停止習得済み。';p.appendChild(sep);
    }
    if(place==='forest'&&!saveData.unlockedSkills.includes('burningWing')){const q=document.createElement('button');q.className='menuBtn';q.textContent='森のシューティングイベント：バーニングウィング';q.onclick=()=>startShootingSkillEvent('forest','burningWing');p.appendChild(q);}
    if(place==='pond'&&!saveData.unlockedSkills.includes('highJump')){const q=document.createElement('button');q.className='menuBtn';q.textContent='池のシューティングイベント：バーニングクライム';q.onclick=()=>startShootingSkillEvent('pond','highJump');p.appendChild(q);}
    actions.appendChild(p);
  }
}
let shootingEvent=null;
function makeShootingCourse(place){
  return place==='forest'
    ?[{x:900,y:850},{x:5100,y:850},{x:5100,y:3550},{x:900,y:3550}]
    :[{x:1000,y:2200},{x:1350,y:1050},{x:3000,y:650},{x:4650,y:1050},{x:5000,y:2200},{x:4650,y:3350},{x:3000,y:3750},{x:1350,y:3350}];
}
function buildObjectsForPath(pp){
  let aa=[];for(let i=1;i<pp.length;i++){let a=pp[i-1],b=pp[i],c=pp[(i+1)%pp.length],v1={x:a.x-b.x,y:a.y-b.y},v2={x:c.x-b.x,y:c.y-b.y},l1=Math.hypot(v1.x,v1.y)||1,l2=Math.hypot(v2.x,v2.y)||1,bx=v1.x/l1+v2.x/l2,by=v1.y/l1+v2.y/l2,bl=Math.hypot(bx,by)||1;aa.push({x:b.x+bx/bl*250,y:b.y+by/bl*250});}
  let ll=[];for(let i=0;i<14;i++)ll.push({x:360+(i*977)%5250,y:330+(i*613)%3700,r:48+(i%4)*10});
  return {anchors:aa,lilies:ll};
}
function startShootingSkillEvent(place,skillId){
  const forest=place==='forest',enemyName=skillId==='timeLag'?'Asmodeus':skillId==='timeStop'?'Belial':forest?'Azazel':'Leviathan';
  const pp=makeShootingCourse(place),objs=buildObjectsForPath(pp);
  shootingEvent={
    place,skillId,title:skillId==='burningWing'?'バーニングウィング':skillId==='highJump'?'バーニングクライム':skillId==='timeLag'?'タイムラグ':'時間停止',
    enemyName,hits:0,time:18,enemyClock:.7,shots:[],enemyShots:[],ended:false,
    path:pp,anchors:objs.anchors,lilies:objs.lilies,theme:forest?'forest':'water',
    player:makeRacer((skillId==='timeStop'&&saveData.kawazuUnlocked)?'Kawazu':'Michael',CHARACTER_DATA[(skillId==='timeStop'&&saveData.kawazuUnlocked)?'Kawazu':'Michael'].color,0,1500,2200),
    enemy:makeRacer(enemyName,CHARACTER_DATA[enemyName].color,1,4450,2200)
  };
  const q=shootingEvent;q.player.ai=false;q.enemy.ai=true;q.player.flight=3;q.player.onGround=false;q.player.speed=0;q.player.face=0;q.enemy.flight=3;q.enemy.onGround=false;q.enemy.speed=0;q.enemy.face=Math.PI;
  appState='shooting';hideAllScreens();document.querySelector('#raceUi')?.classList.remove('hidden');
  ui.lap.textContent=forest?'FOREST SHOOT':'POND SHOOT';ui.who.textContent='操作：'+(CHARACTER_DATA[q.player.name]?.jp||q.player.name);ui.a.textContent='泡弾';ui.b.textContent='泡弾';ui.jump.textContent='泡弾';ui.tongue.textContent='泡弾';
  msg((CHARACTER_DATA[enemyName]?.jp||enemyName)+'との空中射撃！ 泡弾を6発当てろ');
}
function shootingFire(){
  const q=shootingEvent;if(!q||q.ended)return;const r=q.player,o=q.enemy,aim=Math.atan2(o.y-r.y,o.x-r.x);
  q.shots.push({kind:'bubble',x:r.x,y:r.y,vx:Math.cos(aim)*1250,vy:Math.sin(aim)*1250,owner:r,t:1.65});
}
function endShootingEvent(ok){
  const q=shootingEvent;if(!q||q.ended)return;q.ended=true;
  if(ok){if(!saveData.unlockedSkills.includes(q.skillId))saveData.unlockedSkills.push(q.skillId);if(q.skillId==='timeLag')saveData.timeLagUnlocked=true;if(q.skillId==='timeStop')saveData.timeStopUnlocked=true;saveGame();rebuildSkillSelects();msg(q.title+' 習得！');setTimeout(()=>{ui.jump.textContent='ジャンプ';ui.tongue.textContent='舌';shootingEvent=null;showPlace(q.place)},900);}
  else{msg('時間切れ！');setTimeout(()=>{ui.jump.textContent='ジャンプ';ui.tongue.textContent='舌';shootingEvent=null;showPlace(q.place)},800);}
}
function updateShooting(dt){
  const q=shootingEvent;if(!q||q.ended)return;q.time-=dt;if(q.time<=0){endShootingEvent(false);return;}
  const r=q.player,o=q.enemy;let kx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),ky=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0),dx=joy.x||kx,dy=joy.y||ky,m=Math.hypot(dx,dy);
  if(m>.08){dx/=m;dy/=m;r.face=Math.atan2(dy,dx);r.x+=dx*1200*dt;r.y+=dy*1200*dt;}
  r.x=Math.max(350,Math.min(world.w-350,r.x));r.y=Math.max(350,Math.min(world.h-350,r.y));
  let t=performance.now()/1000;o.x=4050+Math.cos(t*.85)*900;o.y=2200+Math.sin(t*1.15)*1200;o.face=Math.atan2(r.y-o.y,r.x-o.x);
  q.enemyClock-=dt;if(q.enemyClock<=0){q.enemyClock=.9+Math.random()*.55;let ax=Math.atan2(r.y-o.y,r.x-o.x);q.enemyShots.push({kind:'bubble',x:o.x,y:o.y,vx:Math.cos(ax)*780,vy:Math.sin(ax)*780,owner:o,t:2.2});}
  for(let i=q.shots.length-1;i>=0;i--){let e=q.shots[i];e.x+=e.vx*dt;e.y+=e.vy*dt;e.t-=dt;if(Math.hypot(e.x-o.x,e.y-o.y)<120){q.shots.splice(i,1);q.hits++;if(q.hits>=6){endShootingEvent(true);return;}}else if(e.t<=0)q.shots.splice(i,1);}
  for(let i=q.enemyShots.length-1;i>=0;i--){let e=q.enemyShots[i];e.x+=e.vx*dt;e.y+=e.vy*dt;e.t-=dt;if(Math.hypot(e.x-r.x,e.y-r.y)<110){q.enemyShots.splice(i,1);q.time=Math.max(0,q.time-.8);}else if(e.t<=0)q.enemyShots.splice(i,1);}
}
function drawEventCreature(r,name){
 ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.face||0);ctx.lineWidth=5;ctx.strokeStyle='#263c37';
 if(name==='Leviathan'){ // piranha
   ctx.fillStyle='#e45a4f';ctx.beginPath();ctx.ellipse(0,0,58,37,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.moveTo(-48,0);ctx.lineTo(-92,-38);ctx.lineTo(-88,38);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(28,-14,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(32,-14,4,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fff';for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(45,-13+i*9);ctx.lineTo(62,-8+i*9);ctx.lineTo(46,-3+i*9);ctx.fill();}
 }else if(name==='Asmodeus'){ // crayfish
   ctx.fillStyle='#d64b35';ctx.beginPath();ctx.ellipse(0,0,52,27,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   for(const sy of [-1,1]){ctx.beginPath();ctx.moveTo(35,sy*18);ctx.lineTo(72,sy*42);ctx.lineTo(91,sy*29);ctx.lineTo(78,sy*12);ctx.closePath();ctx.fill();ctx.stroke();}
   for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(-10+i*12,-22);ctx.lineTo(-22+i*12,-45);ctx.moveTo(-10+i*12,22);ctx.lineTo(-22+i*12,45);ctx.stroke();}
 }else if(name==='Azazel'){ // dragonfly
   ctx.fillStyle='#52a96b';ctx.beginPath();ctx.ellipse(0,0,55,14,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.fillStyle='rgba(210,245,255,.9)';for(const sy of [-1,1])for(const bx of [-8,20]){ctx.beginPath();ctx.ellipse(bx,sy*28,37,13,sy*.45,0,Math.PI*2);ctx.fill();ctx.stroke();}
   ctx.fillStyle='#73c95f';ctx.beginPath();ctx.arc(48,0,20,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#172';ctx.beginPath();ctx.arc(55,-8,5,0,Math.PI*2);ctx.arc(55,8,5,0,Math.PI*2);ctx.fill();
 }else{ // Belial: spider
   ctx.fillStyle='#49324f';ctx.beginPath();ctx.arc(0,0,34,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(38,0,24,0,Math.PI*2);ctx.fill();ctx.stroke();
   for(const sy of [-1,1])for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-18+i*18,sy*22);ctx.lineTo(-35+i*22,sy*(42+i*5));ctx.lineTo(-18+i*25,sy*62);ctx.stroke();}
   ctx.fillStyle='#f3eaff';ctx.beginPath();ctx.arc(48,-8,5,0,Math.PI*2);ctx.arc(48,8,5,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function drawShooting(){
  const q=shootingEvent;if(!q)return;
  const oldPath=path,oldAnchors=anchors,oldLilies=lilies,oldTheme=courseTheme;
  path=q.path;anchors=q.anchors;lilies=q.lilies;courseTheme=q.theme;
  // Keep the exact race renderer, but use a closer camera instead of shrinking the whole 6000x4400 world.
  const viewW=2700,viewH=viewW*(H/W),scale=W/viewW;
  let cx=Math.max(0,Math.min(world.w-viewW,q.player.x-viewW/2));
  let cy=Math.max(0,Math.min(world.h-viewH,q.player.y-viewH/2));
  ctx.clearRect(0,0,W,H);ctx.save();ctx.scale(scale,scale);ctx.translate(-cx,-cy);
  drawWorld();for(const e of q.shots)drawEffect(e);for(const e of q.enemyShots)drawEffect(e);drawRacer(q.player);drawEventCreature(q.enemy,q.enemyName);ctx.restore();
  path=oldPath;anchors=oldAnchors;lilies=oldLilies;courseTheme=oldTheme;
  ctx.fillStyle='rgba(15,38,34,.84)';ctx.fillRect(W/2-155,14,310,46);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 19px sans-serif';ctx.fillText(`HIT ${q.hits}/6　TIME ${Math.max(0,q.time).toFixed(1)}`,W/2,44);
}
function applySelectedCharacter(){
  controlledIndex=saveData.selectedCharacter==='Michael'?0:1;
  racers.forEach((r,i)=>r.ai=i!==controlledIndex);
}
function applyMichaelSkills(){
  const michael=racers.find(r=>r.name==='Michael');
  if(michael){michael.customSkillA=saveData.michaelSkillA;michael.customSkillB=saveData.michaelSkillB;}
  const kawazu=racers.find(r=>r.name==='Kawazu');
  if(kawazu){kawazu.customSkillA=saveData.kawazuSkillA;kawazu.customSkillB=saveData.kawazuSkillB;}
}
function startRace(practice=false){
  if(practice){tournament=null;startRaceRound('Plain',true);return;}
  tournament={place:currentPlace,round:0,opponents:buildTournament(currentPlace)};
  startRaceRound(tournament.opponents[0],false);
}
function startRaceRound(opponent,practice=false){
  appState='race';hideAllScreens();document.querySelector('#raceUi')?.classList.remove('hidden');
  selectCourse(tournament?.place||eventChallenge?.racePlace||'arena1',tournament?.round||0);reset(opponent);applyMichaelSkills();finished=false;
  saveData.encountered=saveData.encountered||['Plain'];if(!saveData.encountered.includes(opponent)){saveData.encountered.push(opponent);saveGame();}
  racers.forEach(r=>{r.lap=1;r.cp=1;r.finished=false;r.speed=0;});
  msg(practice?('練習開始！ '+activeCourse.name):('大会 '+(tournament.round+1)+'回戦 / '+tournament.opponents.length+'　'+activeCourse.name+'　VS '+(CHARACTER_DATA[opponent]?.jp||opponent)));
}
function showRaceResult(win){
 if(eventChallenge){
   const ev=eventChallenge;eventChallenge=null;
   if(win){const got=learnFromOpponent(ev.opponent);msg(got&&got.length?(got.join('・')+'を習得！'):'習得済み');setTimeout(()=>showPlace(ev.place),950);}
   else{msg('イベントレース敗北。もう一度挑戦できます。');setTimeout(()=>showPlace(ev.place),750);}
   return;
 }
 if(!tournament){showField();return;}
 if(!win){msg('大会敗退');setTimeout(showField,450);return;}
 saveData.wins=(saveData.wins||0)+1;saveData.arenaWins=(saveData.arenaWins||0)+1;
 tournament.round++;
 if(tournament.round<tournament.opponents.length){
   const next=tournament.opponents[tournament.round];
   setTimeout(()=>startRaceRound(next,false),450);
 }else{
   saveData.tournamentWins=saveData.tournamentWins||{};
   saveData.tournamentWins[tournament.place]=(saveData.tournamentWins[tournament.place]||0)+1;
   const cleared=Object.keys(saveData.tournamentWins).filter(k=>k.startsWith('arena')&&saveData.tournamentWins[k]>0).length;
   if(cleared>=3)saveData.masterUnlocked=true;
   saveGame();let wasMaster=tournament.place==='master';tournament=null;if(wasMaster&&!saveData.endingSeen){saveData.endingSeen=true;saveGame();setTimeout(()=>playStory('ending'),450);}else setTimeout(showField,450);
 }
}

const OPENING_STORY=[
 {v:'🪷　🌿　🐸',t:'河津一郎は、池を眺めていた。'},
 {v:'🪷　🐸　　🐸',t:'池では、カエルたちが思い思いに過ごしている。'},
 {v:'💭　🐸　🪷',t:'「いいよなー、あいつらは気楽で。」'},
 {v:'💭　🐸💨🐸　🌿',t:'「いや、あいつらはあいつらで、厳しい世界を生きてるのかもしれない。」'},
 {v:'💭　🐸🪽　🏁　🐸🪽　💭',t:'河津一郎は妄想をはじめた。'}
];
const ENDING_STORY=[
 {v:'🌇　🐸　🪷',t:'長いレースの妄想を終え、河津一郎はもう一度、池を見た。'},
 {v:'🐸✨　　🪷',t:'「おれも負けてられないな。」'},
 {v:'🐸　➡️　🌊',t:'河津一郎は池へと飛び込んだ。'},
 {v:'🌊　🐸💨💨💨',t:'河津一郎の小さな緑の体の泳ぎは、この池のどのカエルよりも速かった。'},
 {v:'🐸🔴　🪽　✨',t:'河津一郎、いや――\\n\\nカワズさん参戦！'}
];
let storyMode='',storyIndex=0;
function playStory(mode){
 storyMode=mode;storyIndex=0;appState='story';hideAllScreens();
 document.querySelector('#storyScreen')?.classList.remove('hidden');showStoryPage();
}
function showStoryPage(){
 const arr=storyMode==='ending'?ENDING_STORY:OPENING_STORY,p=arr[storyIndex];
 document.querySelector('#storyVisual').textContent=p.v;
 document.querySelector('#storyText').textContent=p.t;
 document.querySelector('#storyNext').textContent=storyIndex===arr.length-1?(storyMode==='ending'?'カワズさん解禁！':'妄想の世界へ'):'次へ';
}
function nextStory(){
 const arr=storyMode==='ending'?ENDING_STORY:OPENING_STORY;
 storyIndex++;
 if(storyIndex<arr.length){showStoryPage();return;}
 if(storyMode==='ending'){saveData.kawazuUnlocked=true;saveGame();showField();}
 else showField();
}

function setupMetaUi(){
  loadSave();
  document.querySelector('#storyNext')?.addEventListener('click',nextStory);
  document.querySelector('#continueBtn')?.addEventListener('click',()=>{loadSave();showField();});
  document.querySelector('#newBtn')?.addEventListener('click',()=>{
    saveData={started:true,selectedCharacter:'Michael',michaelSkillA:'punch',michaelSkillB:'bubble',kawazuSkillA:'airSwim',kawazuSkillB:'wallKick',unlockedSkills:['punch','bubble'],encountered:['Plain'],wins:0,arenaWins:0,tournamentWins:{},masterUnlocked:false,kawazuUnlocked:false,timeLagUnlocked:false,timeStopUnlocked:false};
    saveGame();playStory('opening');
  });
  document.querySelector('#saveBtn')?.addEventListener('click',saveGame);
  document.querySelectorAll('.mapSpot').forEach(b=>b.addEventListener('click',()=>{
    const p=b.dataset.place;p==='home'?showHome():showPlace(p);
  }));
  document.querySelectorAll('.backFieldBtn').forEach(b=>b.addEventListener('click',showField));
  document.querySelectorAll('.charBtn').forEach(b=>b.addEventListener('click',()=>{
    if(b.dataset.char==='Kawazu'&&!saveData.kawazuUnlocked)return;saveData.selectedCharacter=b.dataset.char;
    document.querySelectorAll('.charBtn').forEach(x=>x.classList.toggle('selected',x===b));
    saveGame();updateFieldUi();rebuildSkillSelects();
  }));
  document.querySelector('#skillASelect')?.addEventListener('change',e=>{let isK=saveData.selectedCharacter==='Kawazu',ka=isK?'kawazuSkillA':'michaelSkillA',kb=isK?'kawazuSkillB':'michaelSkillB',old=saveData[ka];if(e.target.value===saveData[kb])saveData[kb]=old;saveData[ka]=e.target.value;saveGame();rebuildSkillSelects();});
  document.querySelector('#skillBSelect')?.addEventListener('change',e=>{let isK=saveData.selectedCharacter==='Kawazu',ka=isK?'kawazuSkillA':'michaelSkillA',kb=isK?'kawazuSkillB':'michaelSkillB',old=saveData[kb];if(e.target.value===saveData[ka])saveData[ka]=old;saveData[kb]=e.target.value;saveGame();rebuildSkillSelects();});
  document.querySelector('#quitRace')?.addEventListener('click',showField);
  showTitle();
}

const C=document.querySelector('#game'),ctx=C.getContext('2d'),W=C.width,H=C.height;
const ui={who:$('#who'),speed:$('#speed'),lap:$('#lap'),status:$('#status'),jump:$('#jump'),tongue:$('#tongue'),a:$('#skillA'),b:$('#skillB'),stick:$('#stick')};
function $(s){return document.querySelector(s)}
const world={w:6000,h:4400};
const COURSE_SETS={
 arena1:[
  {name:'風の輪',theme:'wind',path:[[700,700],[2450,520],[4650,700],[5200,1450],[4700,2050],[3000,1950],[2550,2350],[3150,2800],[5050,2800],[5250,3550],[4300,3900],[1900,3800],[700,3150],[700,2050],[1900,1750],[800,1300]]},
  {name:'三日月ヘアピン',theme:'wind',path:[[700,850],[1900,520],[3500,520],[5000,850],[5250,1550],[4550,2050],[3450,1750],[2850,2200],[3450,2850],[4900,2750],[5250,3250],[4450,3850],[2850,3950],[1450,3650],[650,3050],[650,2100],[1050,1500]]},
  {name:'風車スラローム',theme:'wind',path:[[700,650],[1900,500],[3000,850],[4200,500],[5200,900],[4700,1450],[3600,1250],[3000,1750],[3650,2200],[5000,2050],[5250,2850],[4300,3300],[5000,3750],[3300,3950],[2100,3500],[900,3800],[550,2850],[1250,2400],[650,1850],[1700,1300]]}
 ],
 arena2:[
  {name:'蓮の大回廊',theme:'water',path:[[650,850],[1700,500],[3300,500],[4850,850],[5300,1650],[4750,2300],[3550,2150],[3000,2650],[3800,3100],[5100,3000],[5250,3650],[3900,3950],[2200,3850],[850,3400],[550,2500],[950,1800],[2050,1650],[1550,1150]]},
  {name:'水蛇Sライン',theme:'water',path:[[650,700],[2100,500],[4000,650],[5150,1100],[4550,1550],[3000,1400],[2500,1900],[3550,2200],[5000,2050],[5250,2700],[4300,3000],[2750,2850],[2200,3300],[3400,3800],[1850,3900],[700,3400],[1000,2800],[1900,2500],[1100,2100],[600,1450]]},
  {name:'渦潮ツインヘアピン',theme:'water',path:[[700,700],[2200,500],[4000,550],[5200,1000],[5250,1850],[4550,2250],[3500,1950],[2850,2350],[3450,3000],[4850,2950],[5250,3350],[4400,3900],[2750,3900],[1400,3550],[600,2850],[650,1900],[1250,1350]]}
 ],
 arena3:[
  {name:'森の牙',theme:'forest',path:[[700,700],[1800,500],[3000,800],[4200,520],[5150,1050],[4550,1500],[3400,1350],[2850,1850],[3400,2300],[4900,2200],[5250,3000],[4500,3550],[3100,3300],[2550,3850],[1250,3700],[600,2950],[1050,2400],[1850,2500],[2200,1950],[1600,1500],[700,1550]]},
  {name:'蜘蛛の針路',theme:'forest',path:[[650,650],[2350,500],[4550,650],[5200,1250],[4750,1800],[3650,1600],[3150,2050],[3700,2500],[5000,2450],[5250,3300],[4300,3900],[2750,3550],[1750,3950],[700,3450],[550,2600],[1200,2200],[700,1750],[1750,1250]]},
  {name:'トンボ尾根',theme:'forest',path:[[700,800],[1750,500],[3200,600],[4550,500],[5250,1100],[5000,1900],[4300,2350],[5000,2950],[4750,3650],[3500,3950],[2400,3500],[1350,3900],[600,3350],[650,2500],[1300,2100],[750,1550]]}
 ],
 master:[{name:'魔王環状路',theme:'master',path:[[2800,500],[3800,520],[5100,900],[5300,1700],[4700,2250],[3600,1900],[2900,2350],[3550,3000],[5000,3000],[5200,3450],[4100,3950],[2600,3850],[1250,3500],[600,2800],[700,1850],[1350,1250],[700,700],[2100,480]]}],
 kawazu:[{name:'カワズ水脈',theme:'water',path:[[700,700],[2700,500],[5000,850],[5150,1800],[4200,2200],[2850,1900],[2400,2450],[3300,2900],[5100,2850],[5000,3650],[3400,3900],[1700,3600],[600,3000],[800,2050],[2100,1650],[700,1300]]}]
};
let activeCourse=COURSE_SETS.arena1[0],courseTheme=activeCourse.theme;
let path=activeCourse.path.map(([x,y])=>({x,y})),anchors=[],lilies=[],checkpoints=[];
function rebuildCourseObjects(){
 anchors=[];
 for(let i=0;i<path.length;i++){
   let a=path[(i-1+path.length)%path.length],b=path[i],c=path[(i+1)%path.length];
   let ix=b.x-a.x,iy=b.y-a.y,ox=c.x-b.x,oy=c.y-b.y,il=Math.hypot(ix,iy)||1,ol=Math.hypot(ox,oy)||1;
   ix/=il;iy/=il;ox/=ol;oy/=ol;
   let cross=ix*oy-iy*ox,dot=ix*ox+iy*oy,angle=Math.acos(Math.max(-1,Math.min(1,dot)));
   if(angle>.38){
     // Put the tree AFTER the apex, on the inside of the outgoing leg.
     // This makes the tongue pull the racer around the corner instead of aiming them into the sharp tip.
     let side=Math.sign(cross)||1;
     let inx=-oy*side,iny=ox*side;
     let forward=angle>1.05?300:245;
     let inward=angle>1.05?255:225;
     const ax=b.x+ox*forward+inx*inward,ay=b.y+oy*forward+iny*inward;
     // Keep only enough clearance from the start line itself; do not suppress a useful corner tree far down the approach.
     if(Math.hypot(ax-path[0].x,ay-path[0].y)>360)anchors.push({x:ax,y:ay,corner:i});
   }
 }
 lilies=[];for(let i=0;i<15;i++){let x=350+(i*977)%5300,y=300+(i*613)%3800;if(trackDistance(x,y)>330)lilies.push({x,y,r:48+(i%4)*10});}
 checkpoints=path.map((q,i)=>({x:q.x,y:q.y,r:240,i}));
}
function selectCourse(place,round=0){let set=COURSE_SETS[place]||COURSE_SETS.arena1;activeCourse=set[round%set.length];courseTheme=activeCourse.theme;path=activeCourse.path.map(([x,y])=>({x,y}));rebuildCourseObjects();}
rebuildCourseObjects();
let controlledIndex=0, camera={x:0,y:0}, joy={id:null,x:0,y:0},keys={},tongueHeld=false,last=performance.now(),finished=false;
const racers=[makeRacer('Michael','#49a94f',0,720,680),makeRacer('Gabriel','#3188e6',1,720,740)];
let globalTimeStop=0,globalTimeLag=0;
function makeRacer(name,color,index,x,y){return {name,color,index,x,y,vx:0,vy:0,face:0,speed:0,r:25,flight:0,glideClock:0,glideGrace:0,onGround:true,tongue:null,cp:1,lap:1,finished:false,hitSlow:0,boost:0,bump:0,skillCdA:0,skillCdB:0,ai:index===1,wing:0,jumpAge:0,flapAge:0,landAge:0,airBarrier:0,airBoostUses:3,power:1,rockImmuneSlow:false,character:name,confuse:0,charge:0,charging:false,burningWing:0,highJump:0,highJumpTotal:0,highJumpDir:0,normalHighJump:0,burnWingUses:3,burnClimbUses:3,startLineLong:null,lapPrevX:null,lapPrevY:null,wallGrace:0,wallEscape:0,courseWalk:0,timeStopUsed:false};}
const maxSpeed=585,groundSpeed=255,flapSpeed=405,glideAccel=690,turnGround=2.85,turnFast=1.05;
function reset(opponentName='Plain'){
 globalTimeStop=0;globalTimeLag=0;
 let playerName=saveData.selectedCharacter||'Michael',pc=CHARACTER_DATA[playerName]?.color||'#49a94f',oc=CHARACTER_DATA[opponentName]?.color||'#78a83c';
 let p0=path[0],p1=path[1],a=Math.atan2(p1.y-p0.y,p1.x-p0.x),tx=Math.cos(a),ty=Math.sin(a),nx=-ty,ny=tx;
 // Start just beyond the line. A lap is counted only after circling back and crossing it forward.
 racers.splice(0,2,
   makeRacer(playerName,pc,0,p0.x+tx*150+nx*34,p0.y+ty*150+ny*34),
   makeRacer(opponentName,oc,1,p0.x+tx*150-nx*34,p0.y+ty*150-ny*34)
 );
 controlledIndex=0;racers[0].ai=false;racers[1].ai=true;racers[0].face=a;racers[1].face=a;
 racers[0].startLineLong=150;racers[1].startLineLong=150;racers[0].lapPrevX=racers[0].x;racers[0].lapPrevY=racers[0].y;racers[1].lapPrevX=racers[1].x;racers[1].lapPrevY=racers[1].y;
 if(playerName==='Uriel')racers[0].power=1.2;if(opponentName==='Uriel')racers[1].power=1.2;
 finished=false;ui.status.textContent='ジャンプ3回で最高速！';
}
function pressJump(r){if(r.finished)return;if(r.flight===0){r.flight=1;r.onGround=false;r.speed=Math.max(r.speed,285);r.wing=.2;r.jumpAge=0;r.flapAge=0;msg('ジャンプ！ もう一度で羽ばたき');}
else if(r.flight===1){r.flight=2;r.speed=Math.max(r.speed,405);r.wing=.55;r.flapAge=0;msg('羽ばたき加速！ もう一度で滑空');}
else if(r.flight===2){r.flight=3;r.glideClock=0;r.glideGrace=0;r.speed=Math.max(r.speed,520);r.wing=1;r.flapAge=0;msg('滑空！ 最高速へ');}
else { // maintenance: generous window centered around five seconds
 if(r.glideClock>=3.8&&r.glideClock<=5.9){r.glideClock=0;r.glideGrace=0;r.speed=Math.max(r.speed,550);r.wing=.45;r.flapAge=0;msg('羽ばたき成功！ 滑空延長');}
 else if(r.glideClock>5.9){r.glideClock=0;r.glideGrace=0;r.speed=Math.max(r.speed,510);r.wing=.45;r.flapAge=0;msg('遅めの羽ばたき。少し速度ロス');}
 else {r.wing=.2;msg('まだ羽ばたきには早い');}
}}
function desiredInput(r){if(!r.ai){let kx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),ky=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);let x=joy.x||kx,y=joy.y||ky;if(r.confuse>0){x=-x;y=-y;}let m=Math.hypot(x,y);return m>.08?{x:x/m,y:y/m,m:Math.min(1,m)}:{x:Math.cos(r.face),y:Math.sin(r.face),m:0};}
 let near=nearestTrackSegment(r.x,r.y),look=(near.i+2)%path.length,target=path[look],dx=target.x-r.x,dy=target.y-r.y,m=Math.hypot(dx,dy)||1;return {x:dx/m,y:dy/m,m:1};}
function updateRacer(r,dt){
  if(globalTimeStop>0&&r!==racers[controlledIndex])return;
  r.tongueBoostFx=Math.max(0,(r.tongueBoostFx||0)-dt);
  r.tongueBoostTimer=Math.max(0,(r.tongueBoostTimer||0)-dt);
  if(r.tongueBoostTimer>0)r.speed=Math.min(maxSpeed+130,r.speed+360*dt);
r.airBarrier=Math.max(0,(r.airBarrier||0)-dt);r.wallGrace=Math.max(0,(r.wallGrace||0)-dt);r.wallEscape=Math.max(0,(r.wallEscape||0)-dt);r.highJump=Math.max(0,(r.highJump||0)-dt);r.normalHighJump=Math.max(0,(r.normalHighJump||0)-dt);r.confuse=Math.max(0,(r.confuse||0)-dt);r.burningWing=Math.max(0,(r.burningWing||0)-dt);if(r.charging)r.charge=Math.min(1.8,(r.charge||0)+dt);if(r.finished)return;r.skillCdA=Math.max(0,r.skillCdA-dt);r.skillCdB=Math.max(0,r.skillCdB-dt);r.hitSlow=Math.max(0,r.hitSlow-dt);r.boost=Math.max(0,r.boost-dt);r.bump=Math.max(0,r.bump-dt);r.wing=Math.max(0,r.wing-dt);r.jumpAge+=dt;r.flapAge+=dt;r.landAge=Math.max(0,r.landAge-dt);
 const inp=desiredInput(r),want=Math.atan2(inp.y,inp.x),diff=norm(want-r.face),ratio=Math.min(1,r.speed/maxSpeed),turn=(turnGround*(1-ratio)+turnFast*ratio)*dt*(r.name==='Raphael'?1.22:1)*(r.highJump>0?.28:1);
 if(Math.abs(diff)<turn)r.face=want;else r.face+=Math.sign(diff)*turn;
 // AI flight rhythm
 if(r.ai){if(r.flight<3&&Math.random()<dt*2.8)pressJumpSilent(r);if(r.flight===3&&r.glideClock>4.55&&r.glideClock<5.45)pressJumpSilent(r);}
 if(r.flight===0){r.speed=approach(r.speed,groundSpeed*inp.m*(r.name==='Kawazu'?1.14:1),380*dt);}else if(r.flight===1){r.speed=approach(r.speed,330,230*dt);}else if(r.flight===2){r.speed=approach(r.speed,455,260*dt);}else {r.glideClock+=dt;if(r.glideClock<5.65)r.speed=approach(r.speed,r.name==='Kawazu'?maxSpeed+65:maxSpeed,glideAccel*dt);else{r.glideGrace+=dt;r.speed=approach(r.speed,245,82*dt);if(r.speed<300){r.flight=0;r.onGround=true;r.glideClock=0;r.landAge=.28;}}}
 if(r.hitSlow>0)r.speed*=Math.pow(.78,dt*4);
 if(r.burningWing>0)r.speed=approach(r.speed,maxSpeed+205,720*dt);
 else if(r.highJump>0)r.speed=approach(r.speed,maxSpeed+70,300*dt);
 else if(r.boost>0)r.speed=Math.min(maxSpeed+45,r.speed+210*dt);
 if(r.bump>0)r.speed=Math.min(r.speed,360);
 // Tongue anchor overrides ordinary turn. Player/rival overlap never affects anchor tongue.
 if(r.tongue?.kind==='anchor'){let a=r.tongue.target,dx=a.x-r.x,dy=a.y-r.y,d=Math.hypot(dx,dy)||1,tan=Math.atan2(dy,dx)+(r.tongue.side>0?Math.PI/2:-Math.PI/2);let hold=(performance.now()-r.tongue.started)/1000;r.face=lerpAngle(r.face,tan,Math.min(1,dt*7.5));if(hold>1.05)r.speed=Math.max(220,r.speed-250*dt);else r.speed=Math.max(r.speed,Math.min(maxSpeed,520));}
 r.vx=Math.cos(r.face)*r.speed;r.vy=Math.sin(r.face)*r.speed;r.x+=r.vx*dt;r.y+=r.vy*dt;
 // After a wall hit, bias a few frames toward the course center so acute V-corners cannot trap the racer.
 if(r.wallEscape>0&&r.highJump<=0){
   let pre=trackInfo(r.x,r.y),dx=pre.qx-r.x,dy=pre.qy-r.y,d=Math.hypot(dx,dy)||1,pull=Math.min(d,310*dt);
   r.x+=dx/d*pull;r.y+=dy/d*pull;
 }
 // Guard-grass wall.
 let hit=trackInfo(r.x,r.y);
 if(r.courseWalk>0){
   r.courseWalk-=dt;let a=Math.atan2(hit.qy-r.y,hit.qx-r.x);r.face=a;r.flight=0;r.onGround=true;r.speed=105;
   r.x+=Math.cos(a)*105*dt;r.y+=Math.sin(a)*105*dt;
   if(hit.d<150){r.courseWalk=0;r.x=hit.qx;r.y=hit.qy;r.speed=0;if(!r.ai)msg('コース復帰！ もう一度ジャンプから');}
 }else if(r.highJump<=0&&hit.d>198){
   // A Burning Climb can cross the grass. If it expires outside, walk back as before.
   if((r.wasHighJump||0)>0){
     r.courseWalk=6;r.flight=0;r.onGround=true;r.speed=105;r.tongue=null;
     if(!r.ai)msg('コースアウト！ 歩いて復帰…');
   }else{
     const seg=hit.i??nearestTrackSegment(hit.qx,hit.qy).i;
     const look=path[(seg+2)%path.length],toLook=Math.atan2(look.y-r.y,look.x-r.x);
     // Move only from the penetrated wall edge to a safe position inside the corridor.
     let nx=(r.x-hit.qx)/(hit.d||1),ny=(r.y-hit.qy)/(hit.d||1);
     const safeD=125;
     r.x=hit.qx+nx*safeD;r.y=hit.qy+ny*safeD;
     r.face=lerpAngle(r.face,toLook,r.ai?.92:.80);
     r.wallEscape=r.ai?.48:.42;
     if(r.wallGrace<=0){
       // A hard wall hit kills the airborne momentum. These frogs settle to the ground once speed is lost.
       r.speed=r.ai?135:70;
       r.flight=0;r.onGround=true;r.glideClock=0;r.glideGrace=0;r.landAge=.28;r.tongue=null;
       r.wallGrace=r.ai?.44:.40;r.bump=.08;
       if(!r.ai)msg('ガード草に激突！ 勢いを失って着地');
     }else{
       // While escaping the acute corner, stay slow and grounded instead of rebounding.
       r.speed=Math.min(r.speed,r.ai?150:85);
       r.flight=0;r.onGround=true;
     }
   }
 }
 r.wasHighJump=r.highJump;
 r.x=Math.max(90,Math.min(world.w-90,r.x));r.y=Math.max(90,Math.min(world.h-90,r.y));
 if(r.courseWalk<=0)updateCheckpoint(r);
 if(r.ai)aiSkills(r,dt);
}
function pressJumpSilent(r){if(r.flight===0){r.flight=1;r.speed=Math.max(r.speed,285)}else if(r.flight===1){r.flight=2;r.speed=Math.max(r.speed,405)}else if(r.flight===2){r.flight=3;r.glideClock=0;r.speed=Math.max(r.speed,520)}else if(r.glideClock>3.8){r.glideClock=0;r.speed=Math.max(r.speed,550)}}
function aiSkills(r,dt){if(r.name!=='Gabriel')return;let ns=nearestTrackSegment(r.x,r.y),t=path[(ns.i+2)%path.length],to=Math.atan2(t.y-r.y,t.x-r.x),bend=Math.abs(norm(to-r.face));if(bend>.56&&r.skillCdB<=0&&Math.random()<dt*3){waterSkill(r,true,true)}else if(bend>.3&&r.skillCdA<=0&&Math.random()<dt*2){waterBoost(r,true)}}
function nearestTrackSegment(px,py){
 let best={i:0,t:0,d:1e9};for(let i=0;i<path.length;i++){let a=path[i],b=path[(i+1)%path.length],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy,t=Math.max(0,Math.min(1,((px-a.x)*vx+(py-a.y)*vy)/l2)),qx=a.x+t*vx,qy=a.y+t*vy,d=Math.hypot(px-qx,py-qy);if(d<best.d)best={i,t,d};}return best;
}
function updateCheckpoint(r){
  // Shortcuts are legal. The only lap gate is the start/finish line.
  // Use the racer's swept movement segment, so a fast tongue-turn cannot skip the line between frames.
  const p0=path[0],p1=path[1],dx=p1.x-p0.x,dy=p1.y-p0.y,len=Math.hypot(dx,dy)||1;
  const tx=dx/len,ty=dy/len,nx=-ty,ny=tx;
  const x0=r.lapPrevX??r.x,y0=r.lapPrevY??r.y,x1=r.x,y1=r.y;
  r.lapPrevX=x1;r.lapPrevY=y1;
  const ax=x0-p0.x,ay=y0-p0.y,bx=x1-p0.x,by=y1-p0.y;
  const long0=ax*tx+ay*ty,long1=bx*tx+by*ty;
  // Interpolate where the movement crosses longitudinal=0, then test the lateral position.
  if((long0<=0&&long1>0)||(long0>=0&&long1<0)){
    const denom=long1-long0;
    const u=Math.abs(denom)<1e-6?0:(-long0/denom);
    const crossX=x0+(x1-x0)*u,crossY=y0+(y1-y0)*u;
    const lateral=(crossX-p0.x)*nx+(crossY-p0.y)*ny;
    // The finish sits beside a very tight tongue corner. Keep this gate intentionally broad:
    // if the racer physically gets around that corner and crosses the finish plane, it counts.
    if(Math.abs(lateral)<=1500){
      if(long0<=0&&long1>0){
        r.lap++;
        if(r.lap>RACE_LAPS){
          r.finished=true;r.speed=0;
          if(!finished){finished=true;msg((r===racers[controlledIndex]?'YOU WIN! ':'')+(CHARACTER_DATA[r.name]?.jp||r.name)+' ゴール！');setTimeout(()=>showRaceResult(r===racers[controlledIndex]),1300);}
        }else if(r===racers[controlledIndex])msg('LAP '+r.lap+' / '+RACE_LAPS);
      }else{
        const before=r.lap;r.lap=Math.max(1,r.lap-1);
        if(r===racers[controlledIndex]&&r.lap<before)msg('逆走でゴール通過：LAP -1 → '+r.lap+'/'+RACE_LAPS);
      }
    }
  }
  r.startLineLong=long1;
}
function startTongue(r){if(r.finished)return;const TONGUE_ANCHOR_RANGE=330;let anchor=nearestAnchor(r,TONGUE_ANCHOR_RANGE);if(anchor){let cross=Math.sin(norm(Math.atan2(anchor.y-r.y,anchor.x-r.x)-r.face));r.tongue={kind:'anchor',target:anchor,started:performance.now(),side:cross>0?-1:1};msg('アンカーに舌！ 離すタイミングで脱出');return;}
 let other=racers[1-r.index],d=Math.hypot(other.x-r.x,other.y-r.y);if(d<((r.name==='Lilith'||r.name==='Beelzebub')?390:270)){if(other.highJump>0){msg('バーニングクライム！ 舌が届かない');return;}
 if(other.burningWing>0){r.hitSlow=.45;msg('熱い！ バーニングウィングで舌を弾かれた');return;}
 if(other.airBarrier>0){msg('エアバリア！ 舌を弾かれた');return;}r.tongue={kind:'rival',target:other,started:performance.now()};let behind=Math.cos(norm(r.face-other.face))>.35;if(!(other.name==='Uriel'&&behind))other.hitSlow=.55;tongueSlipstreamBoost(r);msg(other.name==='Uriel'&&behind?'舌ヒット！ ウリエルは減速しない':'舌ヒット！ スリップ加速！');return;}
 let near=nearestAnchor(r,560);if(near){msg('アンカーが遠い！ 外へ膨らみすぎて舌が届かない');}else msg('舌を伸ばしたが対象なし');}
function endTongue(r){if(!r.tongue)return;if(r.tongue.kind==='anchor'){let held=(performance.now()-r.tongue.started)/1000;if(held<.35)msg('舌を離すのが早い！ 外へ膨らむ');else if(held>.98){r.speed*=.82;msg('離すのが遅い！ 木に引かれて減速');}else{r.boost=.18;msg('ナイス舌ターン！');}}r.tongue=null;}
function nearestAnchor(r,range){let best=null,bd=1e9;for(const a of anchors){let d=Math.hypot(a.x-r.x,a.y-r.y),front=Math.cos(norm(Math.atan2(a.y-r.y,a.x-r.x)-r.face));if(d<range&&d<bd&&front>-.25){best=a;bd=d}}return best;}
function forceFall(o){forceFall(o);}
function useMichaelSkill(r,id,slot){
 let cdKey=slot==='A'?'skillCdA':'skillCdB';if(r[cdKey]>0)return true;
 let o=racers[1-r.index];
 if(id==='punch'){r[cdKey]=1.35;let d=Math.hypot(o.x-r.x,o.y-r.y);if(d<90){pushRival(o,r.face,78);msg('パンチ！ 相手を横へ弾いた');}else msg('パンチ！');return true;}
 if(id==='bubble'){r[cdKey]=.9;let aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'bubble',x:r.x,y:r.y,vx:Math.cos(aim)*1250,vy:Math.sin(aim)*1250,owner:r,t:1.65});msg('泡弾！ 自動照準');return true;}
 if(id==='burningWing'){if(r.name!=='Kawazu'){if(r.burnWingUses<=0){msg('バーニングウィングは1レース3回まで！');return true;}r.burnWingUses--;}r[cdKey]=.45;r.burningWing=1.8;r.speed=Math.min(maxSpeed+230,Math.max(r.speed+265,maxSpeed+85));r.boost=1.35;msg(r.name==='Kawazu'?'バーニングウィング！':'バーニングウィング！ 残り '+r.burnWingUses+'/3');return true;}
 if(id==='highJump'){if(r.name!=='Kawazu'){if(r.burnClimbUses<=0){msg('バーニングクライムは1レース3回まで！');return true;}r.burnClimbUses--;}r[cdKey]=.45;r.highJump=1.05;r.highJumpTotal=1.05;r.highJumpDir=r.face;r.tongue=null;r.flight=3;r.onGround=false;r.speed=Math.max(535,Math.min(r.speed+90,610));msg(r.name==='Kawazu'?'バーニングクライム！':'バーニングクライム！ 残り '+r.burnClimbUses+'/3');return true;} 
 if(id==='normalHighJump'){r[cdKey]=1.15;r.normalHighJump=.72;r.tongue=null;r.flight=2;r.onGround=false;r.speed=Math.max(r.speed,420);msg('ハイジャンプ！');return true;} 
 if(id==='airSwim'){r[cdKey]=1.15;r.speed=Math.min(maxSpeed+155,r.speed+105);r.boost=.42;effects.push({kind:'airball',x:r.x-Math.cos(r.face)*20,y:r.y-Math.sin(r.face)*20,vx:-Math.cos(r.face)*850,vy:-Math.sin(r.face)*850,owner:r,t:.9,age:0});msg('エアースイム！');return true;}
 if(id==='wallKick'){r[cdKey]=1.25;let ti=trackInfo(r.x,r.y);if(ti.d>150){let seg=ti.i??nearestTrackSegment(r.x,r.y).i,next=path[(seg+1)%path.length],a=Math.atan2(next.y-r.y,next.x-r.x);r.face=a;r.speed=Math.min(maxSpeed+170,Math.max(r.speed+155,520));r.flight=2;r.onGround=false;r.wallEscape=.18;msg('壁キック！ 壁を蹴って再加速！');}else{let o=racers[1-r.index],dx=o.x-r.x,dy=o.y-r.y,d=Math.hypot(dx,dy),behind=Math.cos(norm(Math.atan2(dy,dx)-r.face))<-.15;if(d<135&&behind){pushRival(o,r.face+Math.PI,105);r.speed=Math.min(maxSpeed+90,r.speed+70);}msg('エアキック！');}return true;}
 if(id==='timeLag'){r[cdKey]=8;globalTimeLag=6;msg('タイムラグ！ 6秒間、周囲の時間が半分に！');return true;}
 if(id==='timeStop'){if(r.timeStopUsed){msg('時間停止は1レースに一度だけ！');return true;}r.timeStopUsed=true;r[cdKey]=99;globalTimeStop=3;msg('禁断スキル――時間停止！ 3秒！');return true;}
 if(id==='waterBoost'){r[cdKey]=1.15;r.speed=Math.min(maxSpeed+65,r.speed+58);r.boost=Math.max(r.boost||0,.34);effects.push({kind:'waterBoost',x:r.x-Math.cos(r.face)*18,y:r.y-Math.sin(r.face)*18,a:r.face+Math.PI,t:.32,max:.32,owner:r});msg('後方放水ブースト！');return true;}
 if(id==='waterLaser'){r[cdKey]=2.25;let inp=desiredInput(r),desired=Math.atan2(inp.y,inp.x),side=Math.sign(norm(desired-r.face)||1),recoil=r.face+side*Math.PI/2;r.face=norm(r.face+side*.62);r.x+=Math.cos(recoil)*48;r.y+=Math.sin(recoil)*48;r.speed=Math.min(maxSpeed+20,r.speed+36);effects.push({kind:'laser',x:r.x,y:r.y,a:recoil+Math.PI,t:.23,max:.23,owner:r});msg('水レーザー反動！');return true;}
 if(id==='airBarrier'){r[cdKey]=4.2;r.airBarrier=2;msg('エアバリア！');return true;}
 if(id==='airBoost'){r[cdKey]=1.2;r.speed=Math.min(maxSpeed+150,r.speed+150);r.boost=.7;msg('エアブースト！');return true;}
 if(id==='tackle'){r[cdKey]=2.4;let inp=desiredInput(r),side=Math.sign(Math.sin(norm(Math.atan2(inp.y,inp.x)-r.face))||1),a=r.face+side*Math.PI/2;r.x+=Math.cos(a)*82;r.y+=Math.sin(a)*82;if(Math.hypot(o.x-r.x,o.y-r.y)<105)pushRival(o,a,145);msg('タックル！');return true;}
 if(id==='rockFall'){r[cdKey]=2.1;let aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'rock',x:r.x,y:r.y,vx:Math.cos(aim)*760,vy:Math.sin(aim)*760,owner:r,t:1.4,age:0});msg('ロックフォール！');return true;}
 if(id==='smashDown'){r[cdKey]=2.1;if(Math.hypot(o.x-r.x,o.y-r.y)<105){forceFall(o);msg('叩き落とし！')}else msg('叩き落とし！');return true;}
 if(id==='chargeBoost'){startChargeBoost(r);return true;}
 if(id==='kick'){r[cdKey]=1.8;let dx=o.x-r.x,dy=o.y-r.y,d=Math.hypot(dx,dy),behind=Math.cos(norm(Math.atan2(dy,dx)-r.face))<-.15;if(d<135&&behind){pushRival(o,r.face+Math.PI,105);o.hitSlow=.55;r.speed=Math.min(maxSpeed+85,r.speed+95);r.boost=.4;msg('キック！')}else msg('キック！');return true;}
 if(id==='bewitch'){r[cdKey]=2;let aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'bewitch',x:r.x,y:r.y,vx:Math.cos(aim)*900,vy:Math.sin(aim)*900,owner:r,t:1.55,age:0});msg('惑いの瘴気！');return true;}
 if(id==='poisonShot'){r[cdKey]=1.45;let aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'poison',x:r.x,y:r.y,vx:Math.cos(aim)*980,vy:Math.sin(aim)*980,owner:r,t:1.65,age:0});msg('毒液！');return true;}
 if(id==='poisonBoost'){r[cdKey]=2.5;r.speed=Math.min(maxSpeed+155,r.speed+150);r.boost=.72;effects.push({kind:'poisonMist',x:r.x-Math.cos(r.face)*35,y:r.y-Math.sin(r.face)*35,owner:r,t:4,max:4});msg('ポイズンブースト！');return true;}
 return false;
}
function useA(r){if(r.name==='Michael'||r.name==='Kawazu'){useMichaelSkill(r,r.customSkillA||(r.name==='Kawazu'?'airSwim':'punch'),'A');return;}if(r.skillCdA>0)return;if(r.name==='Beelzebub'){let o=racers[1-r.index];if(o.tongue?.kind==='rival'&&o.tongue.target===r){forceFall(o);o.tongue=null;msg('毒反撃！ 舌を掴んだ相手が落下');}}
 if(r.name==='Gabriel'){waterBoost(r,false);return;}
 if(r.name==='Beelzebub'){r.skillCdA=1.45;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'poison',x:r.x,y:r.y,vx:Math.cos(aim)*980,vy:Math.sin(aim)*980,owner:r,t:1.65,age:0});msg('毒液！');return;}
 if(r.name==='Kawazu'){r.skillCdA=1.15;r.speed=Math.min(maxSpeed+155,r.speed+105);r.boost=.42;effects.push({kind:'airball',x:r.x-Math.cos(r.face)*20,y:r.y-Math.sin(r.face)*20,vx:-Math.cos(r.face)*850,vy:-Math.sin(r.face)*850,owner:r,t:.9,age:0});msg('エアースイム！');return;}
 if(r.name==='Raphael'){r.skillCdA=4.2;r.airBarrier=2.0;msg('エアバリア！ 舌・壁減速を無効');return;}
 if(r.name==='Lucifer'){r.skillCdA=2.1;let o=racers[1-r.index];if(o.burningWing>0){pushRival(r,o.face,115);msg('炎に弾かれた！');return;}let d=Math.hypot(o.x-r.x,o.y-r.y);if(d<105){o.flight=0;o.onGround=true;o.glideClock=0;o.speed=Math.min(o.speed,300);o.landAge=.28;msg('叩き落とし！ 相手を地上へ！')}else msg('叩き落とし！');return;}
 if(r.name==='Lilith'){r.skillCdA=1.8;let o=racers[1-r.index];if(o.burningWing>0){pushRival(r,o.face,115);msg('炎に弾かれた！');return;}let dx=o.x-r.x,dy=o.y-r.y,d=Math.hypot(dx,dy),behind=Math.cos(norm(Math.atan2(dy,dx)-r.face))<-.15;if(d<135&&behind){pushRival(o,r.face+Math.PI,105);o.hitSlow=.55;r.speed=Math.min(maxSpeed+85,r.speed+95);r.boost=.4;msg('キック！ 蹴って加速！')}else msg('キック！ 後ろの相手を狙う');return;}
 if(r.name==='Uriel'){r.skillCdA=2.4;let o=racers[1-r.index];if(o.burningWing>0){pushRival(r,o.face,130);msg('炎に弾かれた！');return;}let inp=desiredInput(r),side=Math.sign(Math.sin(norm(Math.atan2(inp.y,inp.x)-r.face))||1),a=r.face+side*Math.PI/2;r.x+=Math.cos(a)*82;r.y+=Math.sin(a)*82;if(Math.hypot(o.x-r.x,o.y-r.y)<105)pushRival(o,a,145);msg('タックル！ 横へ強く踏み込む');return;}
 if(r.name==='Michael'&&r.customSkillA!=='punch'){let id=r.customSkillA;if(id==='burningWing'){r.skillCdA=3.0;r.burningWing=1.25;r.speed=Math.min(maxSpeed+145,r.speed+150);r.boost=1.0;msg('バーニングウィング！');return;}
 if(id==='waterBoost'){waterBoost(r,false);return;}if(id==='airBarrier'){r.skillCdA=4.2;r.airBarrier=2;msg('エアバリア！');return;}
 if(id==='tackle'){r.skillCdA=2.4;let inp=desiredInput(r),side=Math.sign(Math.sin(norm(Math.atan2(inp.y,inp.x)-r.face))||1),a=r.face+side*Math.PI/2;r.x+=Math.cos(a)*82;r.y+=Math.sin(a)*82;msg('タックル！');return;}
 if(id==='smashDown'){r.skillCdA=2.1;let o=racers[1-r.index];if(Math.hypot(o.x-r.x,o.y-r.y)<105)forceFall(o);msg('叩き落とし！');return;}
 if(id==='kick'){r.skillCdA=1.8;r.speed=Math.min(maxSpeed+85,r.speed+80);msg('キック！');return;}
 if(id==='poisonShot'){r.skillCdA=1.45;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'poison',x:r.x,y:r.y,vx:Math.cos(aim)*980,vy:Math.sin(aim)*980,owner:r,t:1.65,age:0});msg('毒液！');return;}
 }
 if(r.customSkillA==='dash'&&r.name==='Michael'){r.skillCdA=2.6;r.speed=Math.min(maxSpeed+105,r.speed+105);r.boost=.45;msg('天使ダッシュ！');return;}
 r.skillCdA=1.35;let o=racers[1-r.index],d=Math.hypot(o.x-r.x,o.y-r.y);if(d<90){pushRival(o,r.face,78*(r.power||1));msg('パンチ！ 相手を横へ弾いた');}else msg('パンチ！');
}
function useB(r){if(r.name==='Michael'||r.name==='Kawazu'){useMichaelSkill(r,r.customSkillB||(r.name==='Kawazu'?'wallKick':'bubble'),'B');return;}if(r.skillCdB>0)return;if(r.name==='Beelzebub'){let o=racers[1-r.index];if(o.tongue?.kind==='rival'&&o.tongue.target===r){forceFall(o);o.tongue=null;msg('毒反撃！ 舌を掴んだ相手が落下');}}
 if(r.name==='Gabriel'){waterSkill(r,true,false);return;}
 if(r.name==='Beelzebub'){r.skillCdB=2.5;r.speed=Math.min(maxSpeed+155,r.speed+150);r.boost=.72;let bx=r.x-Math.cos(r.face)*35,by=r.y-Math.sin(r.face)*35;effects.push({kind:'poisonMist',x:bx,y:by,owner:r,t:4.0,max:4.0});msg('ポイズンブースト！');return;}
 if(r.name==='Kawazu'){r.skillCdB=1.25;let ti=trackInfo(r.x,r.y);if(ti.d>165){let a=Math.atan2(r.y-ti.qy,r.x-ti.qx)+Math.PI;r.face=norm(a);r.x=ti.qx+Math.cos(a)*150;r.y=ti.qy+Math.sin(a)*150;r.speed=Math.min(maxSpeed+145,r.speed+90);r.boost=.35;msg('壁キック！')}else{let o=racers[1-r.index],dx=o.x-r.x,dy=o.y-r.y,d=Math.hypot(dx,dy),behind=Math.cos(norm(Math.atan2(dy,dx)-r.face))<-.15;if(d<135&&behind){pushRival(o,r.face+Math.PI,105);r.speed=Math.min(maxSpeed+90,r.speed+70);}msg('エアキック！')}return;}
 if(r.name==='Raphael'){if((r.airBoostUses||0)<=0){msg('エアブーストは使い切った！');return;}r.airBoostUses--;r.skillCdB=.7;r.speed=Math.min(maxSpeed+150,r.speed+165);r.boost=.75;msg('エアブースト！ 残り'+r.airBoostUses+'回');return;}
 if(r.name==='Lucifer'){startChargeBoost(r);return;}
 if(r.name==='Lilith'){r.skillCdB=2.0;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'bewitch',x:r.x,y:r.y,vx:Math.cos(aim)*900,vy:Math.sin(aim)*900,owner:r,t:1.55,age:0});msg('惑いの瘴気！');return;}
 if(r.name==='Uriel'){r.skillCdB=2.1;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'rock',x:r.x,y:r.y,vx:Math.cos(aim)*760,vy:Math.sin(aim)*760,owner:r,t:1.4,age:0});msg('ロックフォール！');return;}
 if(r.name==='Michael'&&r.customSkillB!=='bubble'){let id=r.customSkillB;
 if(id==='waterLaser'){waterSkill(r,true,false);return;}if(id==='airBoost'){r.skillCdB=1.2;r.speed=Math.min(maxSpeed+150,r.speed+150);r.boost=.7;msg('エアブースト！');return;}
 if(id==='rockFall'){r.skillCdB=2.1;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'rock',x:r.x,y:r.y,vx:Math.cos(aim)*760,vy:Math.sin(aim)*760,owner:r,t:1.4,age:0});msg('ロックフォール！');return;}
 if(id==='chargeBoost'){startChargeBoost(r);return;}if(id==='bewitch'){r.skillCdB=2;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'bewitch',x:r.x,y:r.y,vx:Math.cos(aim)*900,vy:Math.sin(aim)*900,owner:r,t:1.55,age:0});msg('惑いの瘴気！');return;}
 if(id==='poisonBoost'){r.skillCdB=2.5;r.speed=Math.min(maxSpeed+155,r.speed+150);r.boost=.72;effects.push({kind:'poisonMist',x:r.x-Math.cos(r.face)*35,y:r.y-Math.sin(r.face)*35,owner:r,t:4,max:4});msg('ポイズンブースト！');return;}
 }
 if(r.customSkillB==='feather'&&r.name==='Michael'){r.skillCdB=3.0;r.speed=Math.min(maxSpeed+120,r.speed+125);r.boost=.55;msg('羽根ブースト！');return;}
 r.skillCdB=.9;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'bubble',x:r.x,y:r.y,vx:Math.cos(aim)*1250,vy:Math.sin(aim)*1250,owner:r,t:1.65});msg('泡弾！ 自動照準');
}
function startChargeBoost(r){if(r.skillCdB>0||r.charging)return;r.charging=true;r.charge=0;msg('チャージ中… Bを離して加速');}
function releaseChargeBoost(r){if(!r.charging)return;r.charging=false;let p=Math.min(1,r.charge/1.8);r.skillCdB=1.2;r.speed=Math.min(maxSpeed+165,r.speed+70+180*p);r.boost=.35+.65*p;msg('チャージブースト '+Math.round(p*100)+'%！');r.charge=0;}
let effects=[];
function waterBoost(r,silent){if(r.skillCdA>0)return;r.skillCdA=1.15;let jetAng=r.face+Math.PI;r.speed=Math.min(maxSpeed+65,r.speed+58);r.boost=Math.max(r.boost||0,.34);effects.push({kind:'waterBoost',x:r.x-Math.cos(r.face)*18,y:r.y-Math.sin(r.face)*18,a:jetAng,t:.32,max:.32,owner:r});if(!silent)msg('後方放水ブースト！');}
function waterSkill(r,laser,silent){let key=laser?'skillCdB':'skillCdA';if(r[key]>0)return;r[key]=laser?2.25:1.05;let inp=desiredInput(r),desired=Math.atan2(inp.y,inp.x),steer=norm(desired-r.face);let turnSide=Math.sign(steer||1); // recoil goes toward desired turn, jet fires opposite side
 let recoilAng=r.face+turnSide*Math.PI/2,jetAng=recoilAng+Math.PI;r.face=norm(r.face+turnSide*(laser?.62:.24));r.x+=Math.cos(recoilAng)*(laser?48:19);r.y+=Math.sin(recoilAng)*(laser?48:19);r.speed=Math.min(maxSpeed+20,r.speed+(laser?36:12));effects.push({kind:laser?'laser':'water',x:r.x,y:r.y,a:jetAng,t:laser?.23:.34,max:laser?.23:.34,owner:r});if(!silent)msg(laser?'水レーザー反動！ 舌なし急旋回':'水弾反動！ 横へスライド');}

function tongueSlipstreamBoost(r){
  if(!r)return;
  r.speed=Math.min(maxSpeed+130,Math.max(r.speed+145,maxSpeed*.92));
  r.tongueBoostTimer=.52;
  r.tongueBoostFx=.52;
}
function pushRival(o,face,amt){let side=Math.random()<.5?-1:1;o.x+=Math.cos(face+side*Math.PI/2)*amt;o.y+=Math.sin(face+side*Math.PI/2)*amt;}
function updateEffects(dt){for(const e of effects){if(globalTimeStop>0&&e.owner!==racers[controlledIndex])continue;let edt=(globalTimeLag>0&&e.owner!==racers[controlledIndex])?dt*.5:dt;e.t-=edt;e.age=(e.age||0)+edt;
 if(['bubble','rock','bewitch','poison','airball'].includes(e.kind)){e.x+=e.vx*edt;e.y+=e.vy*edt;let o=racers[1-e.owner.index],rad=e.kind==='rock'?23:21;if(Math.hypot(o.x-e.x,o.y-e.y)<o.r+rad){if(o.highJump>0){continue;}if(o.airBarrier>0&&e.kind!=='bewitch'){e.t=0;if(e.owner===racers[controlledIndex])msg('エアバリアに弾かれた！');continue;}if(e.kind==='bewitch'){o.confuse=2.2;if(e.owner===racers[controlledIndex])msg('惑いの瘴気ヒット！ 操作反転！');}else if(e.kind==='poison'){forceFall(o);if(e.owner===racers[controlledIndex])msg('毒液ヒット！ 相手が落下！');}else if(e.kind==='airball'){pushRival(o,Math.atan2(e.vy,e.vx),105);if(e.owner===racers[controlledIndex])msg('空気弾ヒット！');}else{pushRival(o,Math.atan2(e.vy,e.vx),e.kind==='rock'?175:70);if(e.owner===racers[controlledIndex])msg(e.kind==='rock'?'岩ヒット！ 大きく弾いた！':'泡弾ヒット！ 壁に押し出せ！');}e.t=0;}}
 if(e.kind==='poisonMist'){let o=racers[1-e.owner.index];if(Math.hypot(o.x-e.x,o.y-e.y)<70){if(o.highJump>0)continue;if(o.airBarrier>0)continue;forceFall(o);e.t=0;if(e.owner===racers[controlledIndex])msg('毒霧ヒット！ 相手が落下！');}}
 }effects=effects.filter(e=>e.t>0)}
function trackInfo(px,py){let best={d:1e9,qx:0,qy:0,i:0,t:0};for(let i=0;i<path.length;i++){let a=path[i],b=path[(i+1)%path.length],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy,t=Math.max(0,Math.min(1,((px-a.x)*vx+(py-a.y)*vy)/l2)),qx=a.x+t*vx,qy=a.y+t*vy,d=Math.hypot(px-qx,py-qy);if(d<best.d)best={d,qx,qy,i,t}}return best}
function trackDistance(px,py){return trackInfo(px,py).d}
function draw(){
 let me=racers[controlledIndex],timeFx=globalTimeStop>0?'stop':(globalTimeLag>0?'lag':'');
 camera.x=approach(camera.x,me.x-W/2,.16*W);camera.y=approach(camera.y,me.y-H/2,.16*H);camera.x=Math.max(0,Math.min(world.w-W,camera.x));camera.y=Math.max(0,Math.min(world.h-H,camera.y));ctx.clearRect(0,0,W,H);
 ctx.save();ctx.translate(-camera.x,-camera.y);
 if(timeFx){ctx.save();ctx.filter=timeFx==='stop'?'grayscale(88%) saturate(45%) hue-rotate(165deg) brightness(.88)':'grayscale(45%) saturate(65%) hue-rotate(155deg) brightness(.94)';drawWorld();for(const e of effects)if(e.owner!==me)drawEffect(e);for(const r of racers)if(r!==me)drawRacer(r);ctx.restore();for(const e of effects)if(e.owner===me)drawEffect(e);drawRacer(me);}
 else{drawWorld();for(const e of effects)drawEffect(e);for(const r of racers)drawRacer(r);}
 ctx.restore();
 if(timeFx)drawTimeEffectOverlay(timeFx);
 drawMini();updateHud(me)
}
function drawTimeEffectOverlay(mode){
 ctx.save();
 const stop=mode==='stop',pulse=.5+.5*Math.sin(performance.now()/(stop?90:150));
 ctx.fillStyle=stop?`rgba(30,90,160,${.12+.06*pulse})`:`rgba(65,125,185,${.07+.035*pulse})`;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle=stop?`rgba(205,235,255,${.52+.25*pulse})`:`rgba(210,240,255,${.26+.14*pulse})`;ctx.lineWidth=stop?5:3;
 ctx.strokeRect(7,7,W-14,H-14);
 ctx.font=stop?'bold 28px sans-serif':'bold 21px sans-serif';ctx.textAlign='center';ctx.textBaseline='top';
 ctx.fillStyle=stop?'rgba(235,248,255,.94)':'rgba(232,247,255,.72)';
 ctx.fillText(stop?'TIME STOP':'TIME LAG',W/2,18);
 if(stop){
   ctx.globalAlpha=.22+.12*pulse;
   for(let i=0;i<7;i++){let y=70+i*(H-140)/6;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
 }
 ctx.restore();
}
function drawWorld(){
 // The race is airborne: below the racers is a pond, not a road surface.
 const pal=courseTheme==='wind'?{water:'#9edee8',grass:'#55995b',inner:'#b7e4e7'}:courseTheme==='forest'?{water:'#77b8a5',grass:'#245f38',inner:'#86c3ae'}:courseTheme==='master'?{water:'#77758d',grass:'#403d52',inner:'#8b879d'}:{water:'#58bdd5',grass:'#397e48',inner:'#70c8d9'};ctx.fillStyle=pal.water;ctx.fillRect(0,0,world.w,world.h);
 // soft water patches make different sections feel like pond / puddle zones
 for(let y=240;y<world.h;y+=620){for(let x=260;x<world.w;x+=760){let n=((x*13+y*7)%190)-95;ctx.fillStyle='rgba(255,255,255,.055)';ctx.beginPath();ctx.ellipse(x+n,y-n*.35,170,72,.18,0,Math.PI*2);ctx.fill();}}
 for(const l of lilies)drawLily(l.x,l.y,l.r);
 if(courseTheme==='wind'){ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle='#ffffff';ctx.lineWidth=10;for(let i=0;i<12;i++){let x=300+(i*487)%5400,y=250+(i*811)%3900;ctx.beginPath();ctx.arc(x,y,55,0,Math.PI*1.5);ctx.stroke();}ctx.restore();}
 if(courseTheme==='forest'){ctx.save();for(let i=0;i<20;i++){let x=220+(i*701)%5550,y=180+(i*997)%4000;if(trackDistance(x,y)>330){ctx.fillStyle='#174b2b';ctx.beginPath();ctx.arc(x,y,42,0,Math.PI*2);ctx.fill();}}ctx.restore();}
 if(courseTheme==='master'){ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#c7a7ff';for(let i=0;i<14;i++){let x=300+(i*839)%5300,y=260+(i*541)%3800;ctx.beginPath();ctx.arc(x,y,35+(i%3)*14,0,Math.PI*2);ctx.fill();}ctx.restore();}

 ctx.lineCap='round';ctx.lineJoin='round';
 // thick outer stroke = tall guard grass. Inner stroke returns to water, leaving only grass walls at both sides.
 ctx.strokeStyle=pal.grass;ctx.lineWidth=460;strokeLoop();
 ctx.strokeStyle=pal.inner;ctx.lineWidth=390;strokeLoop();
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
let currentWingSpecial=false,currentWingRed=false,currentWingBurning=false;
function angelWing(x,y,side,scale=1,tilt=0){
 // One connected angel-wing silhouette. Broad at the shoulder, tapered into layered feather tips.
 ctx.save();ctx.translate(x,y);ctx.scale(side*scale,scale);ctx.rotate(tilt);
 ctx.fillStyle=currentWingBurning?'#d51f2f':(currentWingRed?'#d74c57':(currentWingSpecial?'#fff9d8':'#fffdf5'));ctx.strokeStyle=currentWingBurning?'#78131d':(currentWingRed?'#7e2530':(currentWingSpecial?'#e4b94f':'#c9d9dc'));ctx.lineWidth=2.2;ctx.lineJoin='round';
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
 ctx.strokeStyle=currentWingBurning?'#ff5964':(currentWingRed?'#f19a9f':(currentWingSpecial?'#fff0a6':'#e2ecee'));ctx.lineWidth=1.8;
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
function drawRacer(r){
 if(r.highJump>0){ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle='#ff5964';ctx.lineWidth=5;ctx.beginPath();ctx.arc(r.x,r.y,62,0,Math.PI*2);ctx.stroke();ctx.restore();}
 if(r.burningWing>0||r.highJump>0){
   ctx.save();let a=r.face||0,pulse=.5+.5*Math.sin(performance.now()/48);
   for(let i=1;i<=5;i++){let back=30+i*22,spread=26+i*4,alpha=(.34-i*.045)+pulse*.05;ctx.globalAlpha=Math.max(.06,alpha);ctx.strokeStyle=i<3?'#ff3348':'#b51225';ctx.lineWidth=Math.max(3,12-i*1.6);
     for(const side of [-1,1]){let bx=r.x-Math.cos(a)*back+Math.cos(a+Math.PI/2)*side*spread,by=r.y-Math.sin(a)*back+Math.sin(a+Math.PI/2)*side*spread;ctx.beginPath();ctx.moveTo(r.x-Math.cos(a)*18+Math.cos(a+Math.PI/2)*side*24,r.y-Math.sin(a)*18+Math.sin(a+Math.PI/2)*side*24);ctx.quadraticCurveTo(bx+Math.cos(a+Math.PI/2)*side*9,by,bx,by);ctx.stroke();}}
   ctx.restore();
 }
 if(r.airBarrier>0){ctx.save();ctx.globalAlpha=.38+.12*Math.sin(performance.now()/90);ctx.strokeStyle='#dffcff';ctx.lineWidth=7;ctx.beginPath();ctx.arc(r.x,r.y-10,48,0,Math.PI*2);ctx.stroke();ctx.restore();}

  if(r.tongueBoostFx>0){
    ctx.save();
    ctx.globalAlpha=Math.min(1,r.tongueBoostFx*3);
    ctx.strokeStyle='#d8fff2';
    ctx.lineWidth=4;
    let a=r.face||0;
    for(let i=-1;i<=1;i++){
      let ox=Math.cos(a+Math.PI/2)*i*12,oy=Math.sin(a+Math.PI/2)*i*12;
      ctx.beginPath();
      ctx.moveTo(r.x- Math.cos(a)*20 + ox,r.y- Math.sin(a)*20 + oy);
      ctx.lineTo(r.x- Math.cos(a)*58 + ox,r.y- Math.sin(a)*58 + oy);
      ctx.stroke();
    }
    ctx.restore();
  }

 if(r.tongue){let t=r.tongue.target;ctx.strokeStyle='#e86a91';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(r.x,r.y+2);ctx.quadraticCurveTo((r.x+t.x)/2,(r.y+t.y)/2+18,t.x,t.y);ctx.stroke()}
 const now=performance.now()/1000;
 // Jump reads as actual lift in this top-down view: body rises away from its shadow.
 let lift=0,lean=0,poseScale=1;
 if(r.highJump>0){let hp=1-r.highJump/Math.max(.001,r.highJumpTotal||1.05);lift=118*Math.sin(Math.PI*Math.max(0,Math.min(1,hp)));poseScale=.96-.10*Math.sin(Math.PI*hp);}else if(r.normalHighJump>0){let hp=1-r.normalHighJump/.72;lift=72*Math.sin(Math.PI*Math.max(0,Math.min(1,hp)));poseScale=.98-.05*Math.sin(Math.PI*hp);}else if(r.flight===1){let t=Math.min(1,r.jumpAge/.42);lift=30*Math.sin(t*Math.PI*.92)+10;poseScale=1+.08*Math.sin(t*Math.PI);}
 else if(r.flight===2){lift=35+5*Math.sin(now*12);poseScale=1+.035*Math.sin(now*12);}
 else if(r.flight===3){lift=30;lean=13;poseScale=.98;}
 if(r.landAge>0)poseScale=1-.08*Math.sin((r.landAge/.28)*Math.PI);
 // stable shadow remains on the course while the frog rises/leans forward
 ctx.save();ctx.globalAlpha=r.flight===0?.18:.11;ctx.fillStyle='#163e35';ctx.beginPath();ctx.ellipse(r.x,r.y+27,28+(r.flight?4:0),11,0,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();
 ctx.translate(r.x + Math.cos(r.face)*lean, r.y + Math.sin(r.face)*lean - lift);
 ctx.scale(poseScale,poseScale);
 let a=norm(r.face),dir=Math.abs(a)<Math.PI/4?'right':Math.abs(a)>Math.PI*3/4?'left':a<0?'up':'down';
 // During the second jump, make the entire wing/body silhouette pulse with rapid flaps.
 if(r.flight===2){let flap=Math.sin(now*18);ctx.scale(1+.035*flap,1-.025*flap);}
 // Glide: slight forward pitch / streamlined squash.
 if(r.flight===3){ctx.transform(1,0,-Math.sin(r.face)*.045,1,0,0);}
 currentWingSpecial=r.name==='Michael';currentWingRed=r.name==='Kawazu';currentWingBurning=r.burningWing>0||r.highJump>0;if(dir==='down')frogFront(r);else if(dir==='up')frogBack(r);else frogSide(r,dir==='left');currentWingBurning=false;if(r.name==='Kawazu'){ctx.save();if(dir==='down'){ctx.fillStyle='#f5eee1';ctx.beginPath();ctx.ellipse(0,13,9,15,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d8232e';ctx.beginPath();ctx.arc(-12,-39,5,0,Math.PI*2);ctx.arc(12,-39,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2975a8';ctx.fillRect(-18,5,5,23);ctx.fillRect(13,5,5,23);ctx.fillStyle='#f28a28';ctx.beginPath();ctx.arc(-12,40,7,0,Math.PI*2);ctx.arc(12,40,7,0,Math.PI*2);ctx.fill();}ctx.restore();}
 // Wing-flap speed lines on stage 2 and on successful maintenance taps.
 if(r.flight===2 || r.wing>0){ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle='#ffffff';ctx.lineWidth=4;for(const side of [-1,1]){for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(side*(35+i*5),-12+i*8);ctx.lineTo(side*(52+i*7),-17+i*8);ctx.stroke()}}ctx.restore();}
 // Glide-maintenance warning: starts before the ideal window, becomes fast near expiry.
 if(r.flight===3 && r.glideClock>=3.55){let urgency=Math.min(1,(r.glideClock-3.55)/2.05),blink=Math.sin(now*(7+urgency*13))>.05; if(blink){ctx.save();ctx.globalAlpha=.35+.35*urgency;ctx.strokeStyle=urgency>.72?'#ffca4a':'#fff29a';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-5,48+5*urgency,0,Math.PI*2);ctx.stroke();ctx.restore();}}
 ctx.restore();
 // readable text stays fixed instead of bobbing with the character
 ctx.fillStyle='#17352d';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText(CHARACTER_DATA[r.name]?.jp||r.name,r.x,r.y-68-lift*.45);
}
function drawEffect(e){if(e.kind==='poisonMist'){ctx.save();ctx.globalAlpha=.18+.25*(e.t/e.max);ctx.fillStyle='#9b4bd1';for(let i=0;i<8;i++){let a=i*.9+(e.age||0)*.35,rr=20+(i%3)*17;ctx.beginPath();ctx.arc(e.x+Math.cos(a)*rr,e.y+Math.sin(a)*rr,24+(i%2)*12,0,Math.PI*2);ctx.fill();}ctx.restore();}else if(e.kind==='poison'){ctx.fillStyle='#9e49d6';ctx.strokeStyle='#d6a4ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,18,0,Math.PI*2);ctx.fill();ctx.stroke();}else if(e.kind==='airball'){ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle='#e9ffff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(e.x,e.y,16,0,Math.PI*2);ctx.stroke();ctx.restore();}else if(e.kind==='bewitch'){ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=.75;ctx.fillStyle='#f04478';for(let i=0;i<4;i++){let a=(e.age||0)*5+i*Math.PI/2;ctx.beginPath();ctx.arc(Math.cos(a)*12,Math.sin(a)*12,8,0,Math.PI*2);ctx.fill();}ctx.restore();}else if(e.kind==='rock'){let h=Math.sin(Math.min(1,(e.age||0)/1.1)*Math.PI)*38;ctx.save();ctx.translate(e.x,e.y-h);ctx.rotate((e.age||0)*7);ctx.fillStyle='#8a765e';ctx.strokeStyle='#493f34';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-20,-11);ctx.lineTo(-5,-23);ctx.lineTo(18,-14);ctx.lineTo(22,8);ctx.lineTo(4,20);ctx.lineTo(-18,13);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}else if(e.kind==='bubble'){ctx.fillStyle='#bcecffaa';ctx.strokeStyle='#4eaeeb';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,17,0,Math.PI*2);ctx.fill();ctx.stroke()}else{let len=e.kind==='laser'?640:(e.kind==='waterBoost'?175:120);ctx.strokeStyle=e.kind==='laser'?'#baf5ff':'#7bd7ff';ctx.lineWidth=e.kind==='laser'?7:(e.kind==='waterBoost'?20:15);ctx.globalAlpha=Math.max(.15,e.t/e.max);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(e.a)*len,e.y+Math.sin(e.a)*len);ctx.stroke();ctx.globalAlpha=1}}
function drawMini(){let sx=185/world.w,sy=118/world.h,ox=18,oy=58;ctx.fillStyle='#102820c9';ctx.fillRect(ox,oy,185,118);ctx.strokeStyle='#2f713c';ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(ox+path[0].x*sx,oy+path[0].y*sy);for(let i=1;i<path.length;i++)ctx.lineTo(ox+path[i].x*sx,oy+path[i].y*sy);ctx.closePath();ctx.stroke();ctx.strokeStyle='#78d1df';ctx.lineWidth=10;ctx.stroke();for(const r of racers){ctx.fillStyle=r.color;ctx.beginPath();ctx.arc(ox+r.x*sx,oy+r.y*sy,5,0,Math.PI*2);ctx.fill()}}
function updateHud(r){ui.lap.textContent='LAP '+Math.min(r.lap,RACE_LAPS)+'/'+RACE_LAPS;ui.who.textContent='操作：'+(CHARACTER_DATA[r.name]?.jp||r.name);ui.speed.textContent=Math.round(r.speed*.56)+' km/h';let al='パンチ',bl='泡弾';if(r.name==='Gabriel'){al='水ブースト';bl='水レーザー'}else if(r.name==='Raphael'){al='エアバリア';bl='エアブースト '+(r.airBoostUses||0)+'/3'}else if(r.name==='Uriel'){al='タックル';bl='ロックフォール'}else if(r.name==='Lucifer'){al='叩き落とし';bl=r.charging?'チャージ '+Math.round(Math.min(1,r.charge/1.8)*100)+'%':'チャージブースト'}else if(r.name==='Lilith'){al='キック';bl='惑いの瘴気'}else if(r.name==='Beelzebub'){al='毒液';bl='ポイズンブースト'}else if(r.name==='Kawazu'){let aid=r.customSkillA||'airSwim',bid=r.customSkillB||'wallKick';al=skillLabel(aid)+(aid==='burningWing'||aid==='highJump'?' ∞':'');bl=skillLabel(bid)+(bid==='burningWing'||bid==='highJump'?' ∞':'')}else if(r.name==='Michael'){let aid=r.customSkillA||'punch',bid=r.customSkillB||'bubble';al=skillLabel(aid)+(aid==='burningWing'?' '+r.burnWingUses+'/3':aid==='highJump'?' '+r.burnClimbUses+'/3':'');bl=skillLabel(bid)+(bid==='burningWing'?' '+r.burnWingUses+'/3':bid==='highJump'?' '+r.burnClimbUses+'/3':'')}ui.a.innerHTML='A<small>'+al+'</small>';ui.b.innerHTML='B<small>'+bl+'</small>';let phase=['地上','ジャンプ','羽ばたき','滑空'][r.flight];if(r.flight===3){let remain=Math.max(0,5.65-r.glideClock);phase+=(r.glideClock>=3.55?' ⚠ '+remain.toFixed(1)+'s':' '+r.glideClock.toFixed(1)+'s');}ui.jump.innerHTML='ジャンプ<small>'+phase+'</small>'}
function msg(t){ui.status.textContent=t;clearTimeout(msg.timer);msg.timer=setTimeout(()=>ui.status.textContent='ジャンプ3回＋舌ターンで最速を狙え！',2200)}
function loop(now){let dt=Math.min(.033,(now-last)/1000);last=now;if(appState==='race'){
 if(globalTimeStop>0)globalTimeStop=Math.max(0,globalTimeStop-dt);
 if(globalTimeLag>0)globalTimeLag=Math.max(0,globalTimeLag-dt);
 for(const r of racers){let rd=(globalTimeLag>0&&r!==racers[controlledIndex])?dt*.5:dt;updateRacer(r,rd);}
 updateEffects(dt);draw();
}else if(appState==='shooting'){updateShooting(dt);drawShooting();
}else{ctx.clearRect(0,0,W,H);}requestAnimationFrame(loop)}
function norm(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a}function approach(a,b,d){return a<b?Math.min(b,a+d):Math.max(b,a-d)}function lerpAngle(a,b,t){return a+norm(b-a)*t}
// input
addEventListener('keydown',e=>{keys[e.key]=true;if(e.code==='Space'){e.preventDefault();if(appState==='shooting')shootingFire();else pressJump(racers[controlledIndex])}if(e.key==='e'){if(appState==='shooting')shootingFire();else startTongue(racers[controlledIndex]);}if(e.key==='j'){if(appState==='shooting')shootingFire();else useA(racers[controlledIndex]);}if(e.key==='k'){if(appState==='shooting')shootingFire();else{let r=racers[controlledIndex];if(r.name==='Lucifer')startChargeBoost(r);else useB(r);}}});addEventListener('keyup',e=>{keys[e.key]=false;if(e.key==='e')endTongue(racers[controlledIndex]);if(e.key==='k'&&racers[controlledIndex].name==='Lucifer')releaseChargeBoost(racers[controlledIndex])});
function bindPress(el,down,up){el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);down()});el.addEventListener('pointerup',e=>{e.preventDefault();up?.()});el.addEventListener('pointercancel',()=>up?.())}
bindPress(ui.jump,()=>appState==='shooting'?shootingFire():pressJump(racers[controlledIndex]));bindPress(ui.tongue,()=>appState==='shooting'?shootingFire():startTongue(racers[controlledIndex]),()=>{if(appState!=='shooting')endTongue(racers[controlledIndex])});bindPress(ui.a,()=>appState==='shooting'?shootingFire():useA(racers[controlledIndex]));bindPress(ui.b,()=>{if(appState==='shooting')shootingFire();else{let r=racers[controlledIndex];if(r.name==='Lucifer')startChargeBoost(r);else useB(r)}},()=>{if(appState!=='shooting'){let r=racers[controlledIndex];if(r.name==='Lucifer')releaseChargeBoost(r)}});
ui.stick.addEventListener('pointerdown',e=>{joy.id=e.pointerId;ui.stick.setPointerCapture(e.pointerId);setJoy(e)});ui.stick.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)setJoy(e)});ui.stick.addEventListener('pointerup',e=>{if(e.pointerId===joy.id){joy={id:null,x:0,y:0};moveKnob()}});ui.stick.addEventListener('pointercancel',()=>{joy={id:null,x:0,y:0};moveKnob()});
function setJoy(e){let r=ui.stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,m=Math.hypot(dx,dy),rad=r.width*.36;if(m>rad){dx*=rad/m;dy*=rad/m}joy.x=dx/rad;joy.y=dy/rad;moveKnob(dx,dy)}function moveKnob(dx=0,dy=0){let i=ui.stick.querySelector('i');i.style.transform=`translate(${dx}px,${dy}px)`}
requestAnimationFrame(loop);

window.addEventListener('load',setupMetaUi);
