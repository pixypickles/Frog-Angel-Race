'use strict';


// ===== v1.5 meta game / field map =====
const VERSION='v2.49';
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
 Kawazu:{jp:'カワズさん',color:'#329451',wing:'red'},
 Azazel:{jp:'アザゼルさん',color:'#8c5a9e'},
 Leviathan:{jp:'リヴァイアさん',color:'#d65a48'},
 Asmodeus:{jp:'アスモデウスさん',color:'#d64b35'},
 Belial:{jp:'ベリアルさん',color:'#49324f'},
 Takumi:{jp:'タクミさん',color:'#f4f3ec',wing:'special'}
};
const TOURNAMENT_ROSTER=['Gabriel','Raphael','Uriel','Lucifer','Lilith'];
function randomTournamentOpponent(exclude=[]){
 const pool=TOURNAMENT_ROSTER.filter(n=>!exclude.includes(n));
 return pool[Math.floor(Math.random()*pool.length)]||'Gabriel';
}
function buildTournament(place){
 if(place==='master')return ['Beelzebub'];if(place==='kawazu')return ['Kawazu'];if(place==='akina')return ['Takumi'];
 if(place==='arena4'||place==='arena5'){let a=randomTournamentOpponent(),b=randomTournamentOpponent([a]);return ['Plain',a,b];}
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
  kawazuSkillA:'burningWing',
  kawazuSkillB:'highJump',
  unlockedSkills:['punch','bubble'],encountered:['Plain'],
  wins:0,
  arenaWins:0,
  tournamentWins:{},masterUnlocked:false,kawazuUnlocked:false,takumiUnlocked:false,timeLagUnlocked:false,timeStopUnlocked:false
};

function loadSave(){
  try{
    const raw=localStorage.getItem('angelFrogRaceSave');
    if(raw) saveData={...saveData,...JSON.parse(raw)};
    saveData.encountered=saveData.encountered||['Plain'];
    saveData.unlockedSkills=saveData.unlockedSkills||['punch','bubble'];
    if(!saveData.kawazuSkillA||saveData.kawazuSkillA==='airSwim')saveData.kawazuSkillA='burningWing';
    if(!saveData.kawazuSkillB||saveData.kawazuSkillB==='wallKick')saveData.kawazuSkillB='highJump';
    saveData.takumiUnlocked=!!saveData.takumiUnlocked;saveData.timeLagUnlocked=!!saveData.timeLagUnlocked;saveData.timeStopUnlocked=!!saveData.timeStopUnlocked;
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
  ['#titleScreen','#storyScreen','#tutorialScreen','#fieldScreen','#homePanel','#placePanel','#raceUi'].forEach(id=>document.querySelector(id)?.classList.add('hidden'));
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
  let ab=document.querySelector('.mapSpot.akina');
  if(!ab){
    ab=document.createElement('button');ab.className='mapSpot akina';ab.dataset.place='akina';
    ab.addEventListener('click',()=>showPlace('akina'));document.querySelector('#fieldMap')?.appendChild(ab);
  }
  ab.innerHTML=saveData.takumiUnlocked?'🍁<b>アキナ山</b><small>一本道・峠バトル</small>':'❓<b>？？？</b><small>謎の一本道</small>';
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
 const base={punch:'パンチ',bubble:'泡弾',airSwim:'エアースイム',wallKick:'壁キック',normalHighJump:'ハイジャンプ',burningWing:'バーニングウィング',highJump:'バーニングクライム',timeLag:'タイムラグ（禁断・周囲50% / 6秒）',timeStop:'時間停止（禁断・3秒）',gutterRun:'溝走り',cornerExit:'コーナー脱出加速（パッシブ）'};if(base[id])return base[id];
 for(const [who,list] of Object.entries(LEARNABLE_SKILLS)){let x=list.find(v=>v[0]===id);if(x)return x[1]+'（'+CHARACTER_DATA[who].jp+'）';}
 return id;
}
function rebuildSkillSelects(){
 const a=document.querySelector('#skillASelect'),b=document.querySelector('#skillBSelect');if(!a||!b)return;
 const isKawazu=saveData.selectedCharacter==='Kawazu',isTakumi=saveData.selectedCharacter==='Takumi';
 if(isTakumi){a.innerHTML='<option value="gutterRun">溝走り</option>';b.innerHTML='<option value="cornerExit">コーナー脱出加速（パッシブ）</option>';a.value='gutterRun';b.value='cornerExit';a.disabled=true;b.disabled=true;const heading=document.querySelector('#skillSetupTitle');if(heading)heading.textContent='タクミ 固定スキル';const note=document.querySelector('#skillSetupNote');if(note)note.textContent='A：溝走り。B：コーナー脱出時に自動加速するパッシブ。付け替え不可。';return;}else{a.disabled=false;b.disabled=false;}
 let ids=isKawazu
   ?['burningWing','highJump','airSwim','wallKick','punch','bubble','normalHighJump',...(saveData.unlockedSkills||[]).filter(x=>!['punch','bubble','normalHighJump','burningWing','highJump'].includes(x))]
   :['punch','bubble','normalHighJump',...(saveData.unlockedSkills||[]).filter(x=>!['punch','bubble','normalHighJump'].includes(x))];
 ids=[...new Set(ids)];
 const html=ids.map(id=>`<option value="${id}">${skillLabel(id)}</option>`).join('');
 a.innerHTML=html;b.innerHTML=html;
 let ka=isKawazu?'kawazuSkillA':'michaelSkillA',kb=isKawazu?'kawazuSkillB':'michaelSkillB';
 if(!ids.includes(saveData[ka]))saveData[ka]=isKawazu?'burningWing':'punch';
 if(!ids.includes(saveData[kb]))saveData[kb]=isKawazu?'highJump':'bubble';
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
  document.querySelector('#takumiCharBtn')?.classList.toggle('hidden',!saveData.takumiUnlocked);
  if(!saveData.kawazuUnlocked&&saveData.selectedCharacter==='Kawazu')saveData.selectedCharacter='Michael';if(!saveData.takumiUnlocked&&saveData.selectedCharacter==='Takumi')saveData.selectedCharacter='Michael';
  rebuildSkillSelects();
  document.querySelectorAll('.charBtn').forEach(b=>b.classList.toggle('selected',b.dataset.char===saveData.selectedCharacter));
  const a=document.querySelector('#skillASelect'),b=document.querySelector('#skillBSelect'),isK=saveData.selectedCharacter==='Kawazu';
  if(saveData.selectedCharacter!=='Takumi'){if(a)a.value=isK?saveData.kawazuSkillA:saveData.michaelSkillA;if(b)b.value=isK?saveData.kawazuSkillB:saveData.michaelSkillB;}
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
    arena1:['🏟️ 風の競技場','第1戦は道幅の広い木立の大回廊。木を使う舌ターン中心。'],
    arena2:['🏟️ 水辺の競技場','第1戦から二股の水路ツインルート。左右の選択が重要。'],
    arena3:['🏟️ 森の競技場','第1戦は大きなカーブ中心の森リング。見通しのよい入門型。'],
    arena4:['☁️ 天空の競技場','第1戦は分岐する天使のリボン。3回戦の高速大会。'],
    arena5:['🗿 遺跡の競技場','第1戦は四角い遺跡スクエア。3回戦の変則大会。'],
    practice:['🎯 練習場','ジャンプ3段階、舌アンカー、スキルを自由に練習できます。'],
    forest:['🌲 森','トンボのアザゼルさん、クモのベリアルさんがいる森。'],
    pond:['🪷 池','ピラニアのリヴァイアさん、ザリガニのアスモデウスさんがいる池。'],
    master:['👑 マスタークラス','ベルゼブブさんが待つ高難度クラス。'],
    kawazu:['🐸 カワズさん','クリア後に現れる謎の高速カエル。'],
    akina:saveData.takumiUnlocked?['🍁 アキナ山','左下原点10000×10000の座標第一稿。近接する道路が十字路に見えないよう、アキナ山だけ道幅を細く調整しています。']:['❓ ？？？','地図に名前のない一本道。白黒の翼を持つ速いカエルが待っている……。']
  }[place];
  document.querySelector('#placeTitle').textContent=data[0];
  document.querySelector('#placeDesc').textContent=data[1];
  const actions=document.querySelector('#placeActions');actions.innerHTML='';
  if(place==='practice'){const guide=document.createElement('button');guide.className='menuBtn';guide.textContent='📖 操作・加速システムの説明を見る';guide.onclick=()=>showTutorial('practice');actions.appendChild(guide);const box=document.createElement('div');box.className='homeBox';box.innerHTML='<b>練習相手を選択</b><p class="panelNote">これまで大会で対戦した相手から選べます。</p>';for(const n of (saveData.encountered||['Plain'])){const q=document.createElement('button');q.className='menuBtn';q.textContent=CHARACTER_DATA[n]?.jp||n;q.onclick=()=>{tournament=null;startRaceRound(n,true)};box.appendChild(q)}actions.appendChild(box);}else if(place.startsWith('arena')||place==='master'||place==='kawazu'||place==='akina'){
    const b=document.createElement('button');b.className='menuBtn';b.textContent=place==='practice'?'練習を始める':(place==='master'?'ベルゼブブさんに挑戦':(place==='kawazu'?'カワズさんに挑戦':(place==='akina'?(saveData.takumiUnlocked?'タクミさんと峠バトル':'？？？に挑戦'):((place==='arena4'||place==='arena5')?'3回戦大会に参加':'2回戦大会に参加'))));
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
  camera.x=Math.max(0,Math.min(world.w-W,racers[controlledIndex].x-W/2));
  camera.y=Math.max(0,Math.min(world.h-H,racers[controlledIndex].y-H/2));
  raceStartDelay=1.15;
  saveData.encountered=saveData.encountered||['Plain'];if(!saveData.encountered.includes(opponent)){saveData.encountered.push(opponent);saveGame();}
  racers.forEach(r=>{r.lap=1;r.cp=1;r.finished=false;r.speed=0;});if(activeCourse.pointToPoint)ui.lap.textContent='POINT TO POINT';
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
 if(tournament.place==='akina'&&!saveData.takumiUnlocked){saveData.takumiUnlocked=true;saveGame();msg('タクミさんが使用可能になった！');}
 saveData.wins=(saveData.wins||0)+1;saveData.arenaWins=(saveData.arenaWins||0)+1;
 tournament.round++;
 if(tournament.round<tournament.opponents.length){
   const next=tournament.opponents[tournament.round];
   setTimeout(()=>startRaceRound(next,false),450);
 }else{
   saveData.tournamentWins=saveData.tournamentWins||{};
   saveData.tournamentWins[tournament.place]=(saveData.tournamentWins[tournament.place]||0)+1;
   const cleared=Object.keys(saveData.tournamentWins).filter(k=>k.startsWith('arena')&&saveData.tournamentWins[k]>0).length;
   if(cleared>=5)saveData.masterUnlocked=true;
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
 {v:'🐸🔴　🪽　✨',t:'河津一郎、いや――\n\nカワズさん参戦！'}
];
let tutorialReturn='field';
function showTutorial(returnTo='field'){
 tutorialReturn=returnTo;appState='tutorial';hideAllScreens();
 document.querySelector('#tutorialScreen')?.classList.remove('hidden');
}
function closeTutorial(){
 document.querySelector('#tutorialScreen')?.classList.add('hidden');
 if(tutorialReturn==='practice')showPlace('practice');else showField();
}
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
 else showTutorial('field');
}

function setupMetaUi(){
  loadSave();
  document.querySelector('#storyNext')?.addEventListener('click',nextStory);
  document.querySelector('#tutorialClose')?.addEventListener('click',closeTutorial);
  document.querySelector('#continueBtn')?.addEventListener('click',()=>{loadSave();showField();});
  document.querySelector('#newBtn')?.addEventListener('click',()=>{
    saveData={started:true,selectedCharacter:'Michael',michaelSkillA:'punch',michaelSkillB:'bubble',kawazuSkillA:'burningWing',kawazuSkillB:'highJump',unlockedSkills:['punch','bubble'],encountered:['Plain'],wins:0,arenaWins:0,tournamentWins:{},masterUnlocked:false,kawazuUnlocked:false,takumiUnlocked:false,timeLagUnlocked:false,timeStopUnlocked:false};
    saveGame();playStory('opening');
  });
  document.querySelector('#saveBtn')?.addEventListener('click',saveGame);
  document.querySelectorAll('.mapSpot').forEach(b=>b.addEventListener('click',()=>{
    const p=b.dataset.place;p==='home'?showHome():showPlace(p);
  }));
  document.querySelectorAll('.backFieldBtn').forEach(b=>b.addEventListener('click',showField));
  document.querySelectorAll('.charBtn').forEach(b=>b.addEventListener('click',()=>{
    if(b.dataset.char==='Kawazu'&&!saveData.kawazuUnlocked)return;if(b.dataset.char==='Takumi'&&!saveData.takumiUnlocked)return;saveData.selectedCharacter=b.dataset.char;
    document.querySelectorAll('.charBtn').forEach(x=>x.classList.toggle('selected',x===b));
    saveGame();updateFieldUi();rebuildSkillSelects();
  }));
  document.querySelector('#skillASelect')?.addEventListener('change',e=>{if(saveData.selectedCharacter==='Takumi')return;let isK=saveData.selectedCharacter==='Kawazu',ka=isK?'kawazuSkillA':'michaelSkillA',kb=isK?'kawazuSkillB':'michaelSkillB',old=saveData[ka];if(e.target.value===saveData[kb])saveData[kb]=old;saveData[ka]=e.target.value;saveGame();rebuildSkillSelects();});
  document.querySelector('#skillBSelect')?.addEventListener('change',e=>{if(saveData.selectedCharacter==='Takumi')return;let isK=saveData.selectedCharacter==='Kawazu',ka=isK?'kawazuSkillA':'michaelSkillA',kb=isK?'kawazuSkillB':'michaelSkillB',old=saveData[kb];if(e.target.value===saveData[ka])saveData[ka]=old;saveData[kb]=e.target.value;saveGame();rebuildSkillSelects();});
  document.querySelector('#quitRace')?.addEventListener('click',showField);
  showTitle();
}

const C=document.querySelector('#game'),ctx=C.getContext('2d'),W=C.width,H=C.height;
const ui={who:$('#who'),speed:$('#speed'),lap:$('#lap'),status:$('#status'),jump:$('#jump'),tongue:$('#tongue'),a:$('#skillA'),b:$('#skillB'),stick:$('#stick')};
function $(s){return document.querySelector(s)}
const world={w:6000,h:4400};const DEFAULT_WORLD={w:6000,h:4400};
const COURSE_SETS={
 arena1:[
  {name:'木立の大回廊',theme:'wind',halfWidth:300,extraAnchors:[[1250,760],[1850,560],[2650,760],[3500,600],[4450,900],[4750,1600],[4300,2200],[3400,2500],[2450,2250],[1650,2650],[1050,3300],[1900,3650],[3000,3500],[4100,3650],[4850,3150],[5050,2450]],path:[[700,900],[1800,520],[3200,520],[4700,850],[5200,1650],[4750,2450],[5000,3300],[4100,3900],[2700,3750],[1500,3950],[650,3250],[850,2400],[600,1650]]},
  {name:'風の輪',theme:'wind',path:[[700,700],[2450,520],[4650,700],[5200,1450],[4700,2050],[3000,1950],[2550,2350],[3150,2800],[5050,2800],[5250,3550],[4300,3900],[1900,3800],[700,3150],[700,2050],[1900,1750],[800,1300]]},
  {name:'空原オープン',theme:'wind',noWalls:true,path:[[750,750],[2800,500],[5000,900],[5250,2200],[4850,3500],[3000,3900],[1100,3500],[550,2300]]},
  {name:'風車スラローム',theme:'wind',halfWidth:230,path:[[700,700],[1800,520],[3000,900],[4200,520],[5150,1050],[4500,1650],[3300,1350],[2400,1850],[3300,2350],[4700,2200],[5200,3100],[4200,3850],[2600,3600],[1200,3900],[600,3000],[1050,2200],[650,1450]]}
 ],
 arena2:[
  {name:'水路ツインルート',theme:'water',branches:[[[2050,700],[2700,1250],[3350,1650],[4050,1250],[4550,900]],[[2050,700],[2350,1900],[3200,2450],[4100,2050],[4550,900]]],path:[[700,700],[2050,700],[4550,900],[5200,1600],[5000,3000],[4300,3800],[2600,3900],[900,3400],[600,2200]]},
  {name:'蓮の大回廊',theme:'water',path:[[650,850],[1700,500],[3300,500],[4850,850],[5300,1650],[4750,2300],[3550,2150],[3000,2650],[3800,3100],[5100,3000],[5250,3650],[3900,3950],[2200,3850],[850,3400],[550,2500],[950,1800],[2050,1650],[1550,1150]]},
  {name:'水上フリーライン',theme:'water',noWalls:true,path:[[700,650],[3000,500],[5200,1100],[5000,3300],[3200,3900],[1000,3550],[550,2000]]},
  {name:'蓮花ショートカット',theme:'water',halfWidth:255,path:[[700,800],[2500,520],[4800,800],[5150,1700],[4300,2300],[5100,3000],[4500,3800],[2800,3500],[1500,3950],[600,3100],[1100,2450],[600,1700]]}
 ],
 arena3:[
  {name:'はじめの森リング',theme:'forest',simple:true,path:[[900,850],[2800,550],[4700,850],[5150,2200],[4650,3500],[2800,3900],[950,3450],[550,2200]]},
  {name:'森の牙',theme:'forest',path:[[700,700],[1800,500],[3000,800],[4200,520],[5150,1050],[4550,1500],[3400,1350],[2850,1850],[3400,2300],[4900,2200],[5250,3000],[4500,3550],[3100,3300],[2550,3850],[1250,3700],[600,2950],[1050,2400],[1850,2500],[2200,1950],[1600,1500],[700,1550]]},
  {name:'外壁なし・トンボ原',theme:'forest',noWalls:true,path:[[750,700],[2500,500],[4800,700],[5250,1800],[4600,2600],[5100,3500],[3200,3900],[1500,3700],[600,2800],[900,1700]]},
  {name:'巨木の８の字',theme:'forest',halfWidth:250,extraAnchors:[[1850,900],[3000,1350],[4200,900],[4200,3100],[3000,2700],[1750,3200]],path:[[700,800],[1900,500],[3100,1300],[4300,500],[5200,1100],[4300,2100],[5200,3200],[4200,3900],[3000,3000],[1800,3900],[650,3200],[1600,2200],[650,1400]]}
 ],
 arena4:[
  {name:'雲海グランリング',theme:'wind',halfWidth:270,path:[[700,700],[2800,450],[5000,800],[5300,2200],[4850,3600],[3000,4000],[1000,3500],[500,2100]]},
  {name:'天使のリボン',theme:'wind',branches:[[[1800,650],[2700,1200],[3500,1650],[4400,900]],[[1800,650],[2400,2400],[3500,2850],[4550,2200],[4400,900]]],path:[[650,650],[1800,650],[4400,900],[5200,1700],[5000,3400],[3500,3900],[1500,3650],[550,2500]]},
  {name:'急降下スパイラル',theme:'wind',halfWidth:220,path:[[700,700],[2200,480],[4100,550],[5200,1200],[4700,1900],[3500,1600],[2800,2200],[3600,2750],[5000,2500],[5250,3400],[4100,3950],[2200,3700],[900,3200],[600,2200],[1400,1600]]},
  {name:'青空フリー８',theme:'wind',path:[[700,750],[2200,500],[3400,1500],[4900,650],[5250,1700],[3900,2300],[5100,3400],[3500,3950],[2500,2900],[900,3800],[550,2700],[1800,2100],[600,1400]]}
 ],
 arena5:[
  {name:'遺跡スクエア',theme:'master',halfWidth:260,path:[[700,700],[4700,700],[5200,1200],[5200,3300],[4700,3800],[1000,3800],[550,3300],[550,1200]]},
  {name:'石門ツインパス',theme:'master',branches:[[[1700,700],[2300,1300],[3200,1500],[4200,850]],[[1700,700],[2100,2600],[3200,3100],[4400,2500],[4200,850]]],path:[[650,700],[1700,700],[4200,850],[5200,1600],[5000,3400],[3500,3950],[1400,3650],[550,2500]]},
  {name:'崩れた回廊',theme:'master',path:[[700,650],[2600,500],[4700,850],[5200,1800],[4400,2400],[5100,3300],[3900,3900],[2500,3400],[1100,3900],[550,2900],[1200,2100],[600,1400]]},
  {name:'古代迷走路',theme:'master',halfWidth:215,extraAnchors:[[1900,800],[3000,1100],[4300,850],[4450,1900],[3500,2350],[4600,3150],[3000,3500],[1600,3300],[1050,2300]],path:[[700,700],[1900,500],[3000,1050],[4300,500],[5100,1100],[4500,1850],[3300,1500],[2700,2200],[3500,2700],[4900,2400],[5200,3300],[4000,3900],[2600,3500],[1300,3900],[600,3000],[1100,2300],[600,1500]]},
  {name:'遺跡ダウンヒル',theme:'master',pointToPoint:true,halfWidth:225,extraAnchors:[[1450,800],[2150,1150],[1700,1600],[2750,1950],[2200,2400],[3400,2750],[2950,3250],[4200,3500]],path:[[650,550],[1500,550],[2200,900],[1650,1250],[2450,1600],[1800,2050],[2900,2350],[2250,2800],[3500,3100],[3000,3550],[4300,3800],[5200,3450]]}
 ],
 akina:[{name:'アキナ山・下り（113点精密稿）',theme:'akina',pointToPoint:true,halfWidth:190,
 worldOverride:{w:40000,h:40000},originBottomLeft:true,courseDraft:true,courseScale:2,
 spline:'centripetal',splineAlpha:.5,splineTension:.38,splineSteps:7,extraAnchors:[],
 path:[
  [2662,1000],[2762,1615],[3609,3078],[3659,3410],[3510,3643],[2712,4274],
  [2197,4906],[2064,5471],[2263,5986],[2446,5903],[2429,5421],[2629,5055],
  [3360,4391],[4191,4058],[4324,3842],[4374,3460],[4524,3443],[4590,3510],
  [4540,4025],[4158,4706],[3925,6285],[4058,6501],[4590,6917],[5139,7848],
  [5288,7947],[5488,7898],[5321,7332],[5504,7332],[8263,9078],[9676,9476],
  [10008,9693],[10125,9875],[10008,10141],[9576,10391],[9443,10740],[9327,10839],
  [8546,10640],[7798,10740],[7183,10573],[6867,10573],[6418,10673],[6069,11072],
  [5837,11172],[5521,11039],[5321,10756],[5155,10839],[5305,11222],[5604,11404],
  [6285,11488],[6784,11720],[7233,11820],[8778,11720],[9643,11920],[10474,11471],
  [11155,11321],[11620,11039],[11853,11055],[11687,11371],[11188,11670],[10424,11953],
  [10224,12119],[10158,12285],[10208,13116],[10091,13283],[8911,13432],[8629,13798],
  [8546,15011],[8596,15593],[8745,15659],[8911,15560],[8994,15859],[9161,15925],
  [9343,15343],[9526,15310],[9576,15593],[9443,16357],[9875,17321],[10125,17338],
  [10141,16789],[10208,16640],[10357,16640],[10623,17371],[11338,18019],[11271,18235],
  [10274,18452],[9842,18668],[9759,18751],[9759,18900],[9925,19000],[10524,19000],
  [13349,18468],[13565,18269],[13648,17870],[13233,17321],[13183,16640],[13266,16307],
  [13399,16224],[13748,16224],[14463,16773],[14795,16740],[15028,16557],[15609,15460],
  [15792,15294],[15942,15310],[16075,15460],[16141,16075],[16640,17105],[16839,17105],
  [17139,15975],[17338,15792],[17488,15776],[17687,15892],[17936,16540]
 ]}],
 master:[
  {name:'魔王環状路',theme:'master',path:[[2800,500],[3800,520],[5100,900],[5300,1700],[4700,2250],[3600,1900],[2900,2350],[3550,3000],[5000,3000],[5200,3450],[4100,3950],[2600,3850],[1250,3500],[600,2800],[700,1850],[1350,1250],[700,700],[2100,480]]},
  {name:'魔王の二択',theme:'master',branches:[[[1800,650],[2400,1450],[3300,1750],[4200,1150]],[[1800,650],[2100,2500],[3300,3000],[4450,2350],[4200,1150]]],path:[[700,650],[1800,650],[4200,1150],[5200,1800],[5000,3400],[3500,3950],[1600,3700],[600,2600]]}
 ],
 kawazu:[{name:'カワズ水脈',theme:'water',noWalls:true,path:[[700,700],[2700,500],[5000,850],[5150,1800],[4200,2200],[2850,1900],[2400,2450],[3300,2900],[5100,2850],[5000,3650],[3400,3900],[1700,3600],[600,3000],[800,2050],[2100,1650],[700,1300]]}]
};
let activeCourse=COURSE_SETS.arena1[0],courseTheme=activeCourse.theme,courseHalfWidth=activeCourse.halfWidth||195,courseNoWalls=false,courseBranches=[];
let courseControlPath=[];
let path=activeCourse.path.map(([x,y])=>({x,y})),anchors=[],lilies=[],checkpoints=[];
function rebuildCourseObjects(){
 anchors=[];
 const cornerPath=(courseTheme==='akina'&&courseControlPath.length)?courseControlPath:path;
 const start=activeCourse.pointToPoint?1:0,end=activeCourse.pointToPoint?cornerPath.length-1:cornerPath.length;
 let lastAkinaTree=null;
 for(let i=start;i<end;i++){
   let a=cornerPath[(i-1+cornerPath.length)%cornerPath.length],b=cornerPath[i],c=cornerPath[(i+1)%cornerPath.length];
   let ix=b.x-a.x,iy=b.y-a.y,ox=c.x-b.x,oy=c.y-b.y,il=Math.hypot(ix,iy)||1,ol=Math.hypot(ox,oy)||1;
   ix/=il;iy/=il;ox/=ol;oy/=ol;
   let cross=ix*oy-iy*ox,dot=ix*ox+iy*oy,angle=Math.acos(Math.max(-1,Math.min(1,dot)));
   const threshold=courseTheme==='akina'?.72:.38;
   if(angle>threshold){
     let side=Math.sign(cross)||1;
     // Inside of the bend, just beyond the apex. Akina trees are visual/tongue aids only at real hairpins.
     let bisx=ix+ox,bisy=iy+oy,bl=Math.hypot(bisx,bisy);
     if(bl<.12){bisx=-iy*side;bisy=ix*side;bl=1;}
     bisx/=bl;bisy/=bl;
     // For a left turn, inside is left of travel; for right turn, right of travel.
     let nx=-bisy*side,ny=bisx*side;
     let inward=courseTheme==='akina'?Math.max(120,courseHalfWidth*.72):(angle>1.05?255:225);
     let forward=courseTheme==='akina'?35:(angle>1.05?300:245);
     const ax=b.x+bisx*forward+nx*inward,ay=b.y+bisy*forward+ny*inward;
     if(Math.hypot(ax-path[0].x,ay-path[0].y)>360){
       if(courseTheme!=='akina'||!lastAkinaTree||Math.hypot(ax-lastAkinaTree.x,ay-lastAkinaTree.y)>520){
         anchors.push({x:ax,y:ay,corner:i});if(courseTheme==='akina')lastAkinaTree={x:ax,y:ay};
       }
     }
   }
 }
 if(activeCourse.extraAnchors)for(const [x,y] of activeCourse.extraAnchors)anchors.push({x,y,manual:true});
 lilies=[];
 if(courseTheme!=='akina'){for(let i=0;i<15;i++){let x=350+(i*977)%5300,y=300+(i*613)%3800;if(trackDistance(x,y)>330)lilies.push({x,y,r:48+(i%4)*10});}}
 checkpoints=path.map((q,i)=>({x:q.x,y:q.y,r:240,i}));
}
const COURSE_ORDER={
 arena1:[0,1,3,2],
 arena2:[0,3,1,2],
 arena3:[0,3,1,2],
 arena4:[1,2,0,3],
 arena5:[0,1,4,3,2],
 master:[0,1],
 kawazu:[0],
 akina:[0]
};

function sampleCentripetalPath(ctrl,steps=7,alpha=.5,tension=.38){
  if(!ctrl||ctrl.length<2)return ctrl||[];
  const out=[];
  const distPow=(a,b)=>Math.pow(Math.max(1e-6,Math.hypot(b.x-a.x,b.y-a.y)),alpha);
  const lerpPt=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  for(let i=0;i<ctrl.length-1;i++){
    const p0=ctrl[Math.max(0,i-1)],p1=ctrl[i],p2=ctrl[i+1],p3=ctrl[Math.min(ctrl.length-1,i+2)];
    const t0=0,t1=t0+distPow(p0,p1),t2=t1+distPow(p1,p2),t3=t2+distPow(p2,p3);
    if(i===0)out.push({x:p1.x,y:p1.y});
    for(let k=1;k<=steps;k++){
      const u=k/steps,t=t1+(t2-t1)*u;
      const A1=(t1-t0)<1e-8?{...p1}:lerpPt(p0,p1,(t-t0)/(t1-t0));
      const A2=lerpPt(p1,p2,(t-t1)/(t2-t1));
      const A3=(t3-t2)<1e-8?{...p2}:lerpPt(p2,p3,(t-t2)/(t3-t2));
      const B1=lerpPt(A1,A2,(t-t0)/(t2-t0));
      const B2=lerpPt(A2,A3,(t-t1)/(t3-t1));
      let C=lerpPt(B1,B2,(t-t1)/(t2-t1));
      // Blend back toward the original chord to limit overshoot in tight hairpins.
      const chord=lerpPt(p1,p2,u),blend=Math.max(0,Math.min(1,tension));
      C={x:chord.x+(C.x-chord.x)*blend,y:chord.y+(C.y-chord.y)*blend};
      out.push(C);
    }
  }
  return out;
}
function selectCourse(place,round=0){
 let set=COURSE_SETS[place]||COURSE_SETS.arena1,order=COURSE_ORDER[place]||set.map((_,i)=>i),idx=order[round%order.length]%set.length;
 activeCourse=set[idx];courseTheme=activeCourse.theme;courseHalfWidth=activeCourse.halfWidth||195;courseNoWalls=false;
 world.w=activeCourse.worldOverride?.w||DEFAULT_WORLD.w;world.h=activeCourse.worldOverride?.h||DEFAULT_WORLD.h;
 const cs=activeCourse.courseScale||1,sourceH=activeCourse.originBottomLeft?(world.h/cs):world.h;
 const cv=([x,y])=>({x:x*cs,y:(activeCourse.originBottomLeft?(sourceH-y):y)*cs});
 courseBranches=(activeCourse.branches||[]).map(br=>br.map(cv));
 const control=activeCourse.path.map(cv);
 courseControlPath=control;
 path=activeCourse.spline==='centripetal'
   ?sampleCentripetalPath(control,activeCourse.splineSteps||7,activeCourse.splineAlpha??.5,activeCourse.splineTension??.38)
   :control;
 rebuildCourseObjects();
}
rebuildCourseObjects();
let controlledIndex=0, camera={x:0,y:0}, joy={id:null,x:0,y:0},keys={},tongueHeld=false,last=performance.now(),finished=false,raceStartDelay=0;
const racers=[makeRacer('Michael','#49a94f',0,720,680),makeRacer('Gabriel','#3188e6',1,720,740)];
let globalTimeStop=0,globalTimeLag=0;
function makeRacer(name,color,index,x,y){return {name,color,index,x,y,vx:0,vy:0,face:0,speed:0,r:25,flight:0,glideClock:0,glideGrace:0,onGround:true,tongue:null,cp:1,lap:1,finished:false,hitSlow:0,boost:0,bump:0,skillCdA:0,skillCdB:0,ai:index===1,wing:0,jumpAge:0,flapAge:0,landAge:0,airBarrier:0,airBoostUses:3,power:1,rockImmuneSlow:false,character:name,confuse:0,charge:0,charging:false,burningWing:0,highJump:0,highJumpTotal:0,highJumpDir:0,normalHighJump:0,burnWingUses:3,burnClimbUses:3,startLineLong:null,lapPrevX:null,lapPrevY:null,wallGrace:0,wallEscape:0,courseWalk:0,timeStopUsed:false,takumiCornering:false,takumiPassiveCd:0,aiPathIndex:0,aiWallHits:0,aiWallHitTimer:0,aiBend:0,aiAssist:0};}
const maxSpeed=585,groundSpeed=255,flapSpeed=405,glideAccel=690,turnGround=2.85,turnFast=1.05;
function reset(opponentName='Plain'){
 globalTimeStop=0;globalTimeLag=0;
 let playerName=saveData.selectedCharacter||'Michael',pc=CHARACTER_DATA[playerName]?.color||'#49a94f',oc=CHARACTER_DATA[opponentName]?.color||'#78a83c';
 const g=activeCourse.pointToPoint?startGate():finishGate(),p0=g.p0,tx=g.tx,ty=g.ty,nx=g.nx,ny=g.ny,a=Math.atan2(ty,tx);
 racers.splice(0,2,
   makeRacer(playerName,pc,0,p0.x+tx*150+nx*34,p0.y+ty*150+ny*34),
   makeRacer(opponentName,oc,1,p0.x+tx*150-nx*34,p0.y+ty*150-ny*34)
 );
 controlledIndex=0;racers[0].ai=false;racers[1].ai=true;racers[0].face=a;racers[1].face=a;
 racers[0].startLineLong=150;racers[1].startLineLong=150;
 racers[0].lapPrevX=racers[0].x;racers[0].lapPrevY=racers[0].y;racers[1].lapPrevX=racers[1].x;racers[1].lapPrevY=racers[1].y;
 if(playerName==='Uriel')racers[0].power=1.2;if(opponentName==='Uriel')racers[1].power=1.2;
 if(playerName==='Kawazu'){racers[0].burnWingUses=Infinity;racers[0].burnClimbUses=Infinity;racers[0].timeStopUsed=false;}
 if(opponentName==='Kawazu'){racers[1].burnWingUses=Infinity;racers[1].burnClimbUses=Infinity;racers[1].timeStopUsed=false;}
 finished=false;ui.status.textContent='ジャンプ3回で最高速！';
}
function pressJump(r){if(appState==='race'&&raceStartDelay>0)return;if(r.finished)return;if(r.flight===0){r.flight=1;r.onGround=false;r.speed=Math.max(r.speed,285);r.wing=.2;r.jumpAge=0;r.flapAge=0;msg('ジャンプ！ もう一度で羽ばたき');}
else if(r.flight===1){r.flight=2;r.speed=Math.max(r.speed,405);r.wing=.55;r.flapAge=0;msg('羽ばたき加速！ もう一度で滑空');}
else if(r.flight===2){r.flight=3;r.glideClock=0;r.glideGrace=0;r.speed=Math.max(r.speed,520);r.wing=1;r.flapAge=0;msg('滑空！ 最高速へ');}
else { // maintenance: generous window centered around five seconds
 if(r.glideClock>=3.8&&r.glideClock<=5.9){r.glideClock=0;r.glideGrace=0;r.speed=Math.max(r.speed,550);r.wing=.45;r.flapAge=0;msg('羽ばたき成功！ 滑空延長');}
 else if(r.glideClock>5.9){r.glideClock=0;r.glideGrace=0;r.speed=Math.max(r.speed,510);r.wing=.45;r.flapAge=0;msg('遅めの羽ばたき。少し速度ロス');}
 else {r.wing=.2;msg('まだ羽ばたきには早い');}
}}

function aiForwardSegment(r){
  const n=path.length,closed=!activeCourse.pointToPoint,base=Math.max(0,Math.min(n-2,r.aiPathIndex||0));
  let best={i:base,t:0,d:1e9,qx:path[base].x,qy:path[base].y};
  // Search mostly forward. This prevents close parallel roads / forks from making the CPU
  // jump to a geometrically-near but logically-wrong segment.
  for(let off=-2;off<=14;off++){
    let i=base+off;
    if(closed){i=(i%(n)+n)%n;}else if(i<0||i>=n-1)continue;
    let a=path[i],b=path[(i+1)%n],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy||1;
    let t=Math.max(0,Math.min(1,((r.x-a.x)*vx+(r.y-a.y)*vy)/l2)),qx=a.x+t*vx,qy=a.y+t*vy,d=Math.hypot(r.x-qx,r.y-qy);
    // Small forward bias on ties so progress wins over a nearby old segment.
    let score=d-off*2.5;
    if(score<best.d){best={i,t,d:score,rawD:d,qx,qy};}
  }
  if(activeCourse.pointToPoint)r.aiPathIndex=Math.max(base,best.i);
  else{
    let advance=(best.i-base+n)%n;
    if(advance<=14)r.aiPathIndex=best.i;
  }
  return best;
}
function aiLookTarget(r,seg){
  const n=path.length;
  // Use distance-based lookahead instead of a fixed +2 point jump.
  let i=seg.i,remain=150+r.speed*.34,x=path[(i+1)%n].x,y=path[(i+1)%n].y;
  const i1=activeCourse.pointToPoint?Math.min(n-2,seg.i):seg.i;
  const i2=activeCourse.pointToPoint?Math.min(n-2,i1+5):(i1+5)%n;
  const a1=path[i1],b1=path[(i1+1)%n],a2=path[i2],b2=path[(i2+1)%n];
  r.aiBend=Math.abs(norm(Math.atan2(b2.y-a2.y,b2.x-a2.x)-Math.atan2(b1.y-a1.y,b1.x-a1.x)));
  while(remain>0){
    let a=path[i],ni=activeCourse.pointToPoint?Math.min(n-1,i+1):(i+1)%n,b=path[ni];
    let len=Math.hypot(b.x-a.x,b.y-a.y)||1;
    if(remain<=len){let t=remain/len;x=a.x+(b.x-a.x)*t;y=a.y+(b.y-a.y)*t;break;}
    remain-=len;i=ni;
    if(activeCourse.pointToPoint&&i>=n-1){x=path[n-1].x;y=path[n-1].y;break;}
  }
  return {x,y};
}
function desiredInput(r){if(!r.ai){let kx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),ky=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);let x=joy.x||kx,y=joy.y||ky;if(r.confuse>0){x=-x;y=-y;}let m=Math.hypot(x,y);return m>.08?{x:x/m,y:y/m,m:Math.min(1,m)}:{x:Math.cos(r.face),y:Math.sin(r.face),m:0};}
 let near=aiForwardSegment(r),target=aiLookTarget(r,near);
 if(activeCourse.pointToPoint&&r.aiPathIndex>=path.length-3){let g=finishGate();target={x:g.p0.x+g.tx*650,y:g.p0.y+g.ty*650};}
 let dx=target.x-r.x,dy=target.y-r.y,m=Math.hypot(dx,dy)||1;return {x:dx/m,y:dy/m,m:1};}
function updateRacer(r,dt){
  if(globalTimeStop>0&&r!==racers[controlledIndex])return;
  r.tongueBoostFx=Math.max(0,(r.tongueBoostFx||0)-dt);
  r.tongueBoostTimer=Math.max(0,(r.tongueBoostTimer||0)-dt);
  if(r.tongueBoostTimer>0)r.speed=Math.min(maxSpeed+130,r.speed+360*dt);
r.takumiPassiveCd=Math.max(0,(r.takumiPassiveCd||0)-dt);r.aiWallHitTimer=Math.max(0,(r.aiWallHitTimer||0)-dt);if(r.aiWallHitTimer<=0)r.aiWallHits=0;r.airBarrier=Math.max(0,(r.airBarrier||0)-dt);r.wallGrace=Math.max(0,(r.wallGrace||0)-dt);r.wallEscape=Math.max(0,(r.wallEscape||0)-dt);r.highJump=Math.max(0,(r.highJump||0)-dt);r.normalHighJump=Math.max(0,(r.normalHighJump||0)-dt);r.confuse=Math.max(0,(r.confuse||0)-dt);r.burningWing=Math.max(0,(r.burningWing||0)-dt);if(r.charging)r.charge=Math.min(1.8,(r.charge||0)+dt);if(r.finished)return;r.skillCdA=Math.max(0,r.skillCdA-dt);r.skillCdB=Math.max(0,r.skillCdB-dt);r.hitSlow=Math.max(0,r.hitSlow-dt);r.boost=Math.max(0,r.boost-dt);r.bump=Math.max(0,r.bump-dt);r.wing=Math.max(0,r.wing-dt);r.jumpAge+=dt;r.flapAge+=dt;r.landAge=Math.max(0,r.landAge-dt);
 const inp=desiredInput(r),want=Math.atan2(inp.y,inp.x),diff=norm(want-r.face),ratio=Math.min(1,r.speed/maxSpeed),aiTurn=r.ai?(1.28+Math.min(.55,(r.aiBend||0)*.42)):1,turn=(turnGround*(1-ratio)+turnFast*ratio)*dt*(r.name==='Raphael'?1.22:1)*(r.highJump>0?.28:1)*aiTurn;
 if(Math.abs(diff)<turn)r.face=want;else r.face+=Math.sign(diff)*turn;
 // AI flight rhythm
 if(r.ai){if(r.flight<3&&Math.random()<dt*2.8)pressJumpSilent(r);if(r.flight===3&&r.glideClock>4.55&&r.glideClock<5.45)pressJumpSilent(r);}
 if(r.flight===0){r.speed=approach(r.speed,groundSpeed*inp.m*(r.name==='Kawazu'?1.14:1),380*dt);}else if(r.flight===1){r.speed=approach(r.speed,330,230*dt);}else if(r.flight===2){r.speed=approach(r.speed,455,260*dt);}else {r.glideClock+=dt;if(r.glideClock<5.65)r.speed=approach(r.speed,r.name==='Kawazu'?maxSpeed+65:maxSpeed,glideAccel*dt);else{r.glideGrace+=dt;r.speed=approach(r.speed,245,82*dt);if(r.speed<300){r.flight=0;r.onGround=true;r.glideClock=0;r.landAge=.28;}}}
 if(r.hitSlow>0)r.speed*=Math.pow(.78,dt*4);
 if(r.burningWing>0)r.speed=approach(r.speed,maxSpeed+205,720*dt);
 else if(r.highJump>0)r.speed=approach(r.speed,maxSpeed+70,300*dt);
 else if(r.boost>0)r.speed=Math.min(maxSpeed+45,r.speed+210*dt);
 if(r.bump>0)r.speed=Math.min(r.speed,360);
 if(r.ai){
   const bend=r.aiBend||0;
   if(bend>.95)r.speed=Math.min(r.speed,335);
   else if(bend>.62)r.speed=Math.min(r.speed,400);
   else if(bend>.38)r.speed=Math.min(r.speed,470);
 }
 if(r.name==='Takumi'){
   let ns=nearestTrackSegment(r.x,r.y),i=ns.i,n1=path[Math.min(path.length-1,i+1)],n2=path[Math.min(path.length-1,i+2)];
   if(!activeCourse.pointToPoint){n1=path[(i+1)%path.length];n2=path[(i+2)%path.length];}
   let bend=Math.abs(norm(Math.atan2(n2.y-n1.y,n2.x-n1.x)-Math.atan2(n1.y-r.y,n1.x-r.x)));
   if(bend>.48)r.takumiCornering=true;
   else if(r.takumiCornering&&bend<.22&&r.takumiPassiveCd<=0){r.takumiCornering=false;r.takumiPassiveCd=1.25;r.speed=Math.min(maxSpeed+145,Math.max(r.speed+115,560));r.boost=.5;if(!r.ai)msg('コーナー脱出加速！');}
 }
 // Tongue anchor overrides ordinary turn. Player/rival overlap never affects anchor tongue.
 if(r.tongue&&(r.tongue.kind==='anchor'||r.tongue.kind==='gutter')){let a=r.tongue.target,dx=a.x-r.x,dy=a.y-r.y,d=Math.hypot(dx,dy)||1,tan=Math.atan2(dy,dx)+(r.tongue.side>0?Math.PI/2:-Math.PI/2);let hold=(performance.now()-r.tongue.started)/1000,gutter=r.tongue.kind==='gutter';r.face=lerpAngle(r.face,tan,Math.min(1,dt*(gutter?13.5:7.5)));if(gutter){r.speed=Math.max(r.speed,Math.min(maxSpeed+35,555));}else if(hold>1.05)r.speed=Math.max(220,r.speed-250*dt);else r.speed=Math.max(r.speed,Math.min(maxSpeed,520));}
 r.vx=Math.cos(r.face)*r.speed;r.vy=Math.sin(r.face)*r.speed;r.x+=r.vx*dt;r.y+=r.vy*dt;
 if(r.ai){
   let rs=aiForwardSegment(r),dx=rs.qx-r.x,dy=rs.qy-r.y,d=Math.hypot(dx,dy)||1;
   // Invisible CPU-only lane assist. It is a small continuous force, never a position snap.
   // Stronger only when the CPU has drifted close to/outside the corridor.
   const soft=Math.max(0,d-courseHalfWidth*.36),assist=Math.min(d,soft*1.9*dt);
   if(assist>0){r.x+=dx/d*assist;r.y+=dy/d*assist;}
 }
 if(r.ai&&r.wallEscape>0){
   let rs=aiForwardSegment(r),dx=rs.qx-r.x,dy=rs.qy-r.y,d=Math.hypot(dx,dy)||1;
   let nudge=Math.min(d,150*dt);r.x+=dx/d*nudge;r.y+=dy/d*nudge;
 }
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
 }else if(r.highJump<=0&&hit.d>courseHalfWidth+3){
   // A Burning Climb can cross the grass. If it expires outside, walk back as before.
   if((r.wasHighJump||0)>0){
     if(r.ai){
       r.courseWalk=0;r.flight=1;r.onGround=false;r.speed=Math.max(170,Math.min(r.speed,235));r.wallEscape=.7;r.tongue=null;
     }else{
       r.courseWalk=6;r.flight=0;r.onGround=true;r.speed=105;r.tongue=null;msg('コースアウト！ 歩いて復帰…');
     }
   }else{
     let aiSeg=r.ai?aiForwardSegment(r):null;
     const seg=r.ai?aiSeg.i:(hit.i??nearestTrackSegment(hit.qx,hit.qy).i);
     const look=r.ai?aiLookTarget(r,aiSeg):path[activeCourse.pointToPoint?Math.min(path.length-1,seg+2):(seg+2)%path.length],toLook=Math.atan2(look.y-r.y,look.x-r.x);
     if(r.ai){
       r.aiWallHits=(r.aiWallHits||0)+1;r.aiWallHitTimer=.9;
       // Never teleport the CPU back to the route. Steer and pull it smoothly toward the
       // logical forward segment over several frames so recovery remains visible/natural.
       let rdx=aiSeg.qx-r.x,rdy=aiSeg.qy-r.y,rd=Math.hypot(rdx,rdy)||1;
       let pull=Math.min(rd,420*dt);
       r.x+=rdx/rd*pull;r.y+=rdy/rd*pull;
       r.face=lerpAngle(r.face,toLook,Math.min(1,dt*8.5));
       r.wallEscape=.48;
       if(r.aiWallHits>=2){r.speed=Math.min(Math.max(r.speed,175),235);r.flight=1;r.onGround=false;}
       if(r.aiWallHits>=5){r.speed=145;r.aiWallHits=2;} // stubborn corner: slow down rather than warp
     }else{
       // Move only from the penetrated wall edge to a safe position inside the corridor.
       let nx=(r.x-hit.qx)/(hit.d||1),ny=(r.y-hit.qy)/(hit.d||1);
       const safeD=Math.max(105,courseHalfWidth-70);
       r.x=hit.qx+nx*safeD;r.y=hit.qy+ny*safeD;
       r.face=lerpAngle(r.face,toLook,.80);
       r.wallEscape=.42;
     }
     if(r.wallGrace<=0){
       // A hard wall hit kills the airborne momentum. These frogs settle to the ground once speed is lost.
       r.speed=r.ai?Math.max(r.speed,185):70;
       r.flight=r.ai?1:0;r.onGround=!r.ai;r.glideClock=0;r.glideGrace=0;r.landAge=.28;r.tongue=null;
       r.wallGrace=r.ai?.44:.40;r.bump=.08;
       if(!r.ai)msg('ガード草に激突！ 勢いを失って着地');
     }else{
       // While escaping the acute corner, stay slow and grounded instead of rebounding.
       r.speed=Math.min(r.speed,r.ai?220:85);
       r.flight=r.ai?1:0;r.onGround=!r.ai;
     }
   }
 }
 r.wasHighJump=r.highJump;
 r.x=Math.max(90,Math.min(world.w-90,r.x));r.y=Math.max(90,Math.min(world.h-90,r.y));
 if(r.courseWalk<=0)updateCheckpoint(r);
 if(r.ai)aiSkills(r,dt);
}
function pressJumpSilent(r){if(r.flight===0){r.flight=1;r.speed=Math.max(r.speed,285)}else if(r.flight===1){r.flight=2;r.speed=Math.max(r.speed,405)}else if(r.flight===2){r.flight=3;r.glideClock=0;r.speed=Math.max(r.speed,520)}else if(r.glideClock>3.8){r.glideClock=0;r.speed=Math.max(r.speed,550)}}
function aiSkills(r,dt){if(r.name==='Takumi'){let ns=nearestTrackSegment(r.x,r.y),i=ns.i,n1=path[Math.min(path.length-1,i+1)],n2=path[Math.min(path.length-1,i+2)],bend=Math.abs(norm(Math.atan2(n2.y-n1.y,n2.x-n1.x)-r.face));if(bend>.55&&r.skillCdA<=0&&Math.random()<dt*4)useA(r);return;}if(r.name!=='Gabriel')return;let ns=nearestTrackSegment(r.x,r.y),t=path[(ns.i+2)%path.length],to=Math.atan2(t.y-r.y,t.x-r.x),bend=Math.abs(norm(to-r.face));if(bend>.56&&r.skillCdB<=0&&Math.random()<dt*3){waterSkill(r,true,true)}else if(bend>.3&&r.skillCdA<=0&&Math.random()<dt*2){waterBoost(r,true)}}
function nearestTrackSegment(px,py){
 let best={i:0,t:0,d:1e9};for(let i=0;i<(activeCourse.pointToPoint?path.length-1:path.length);i++){let a=path[i],b=path[(i+1)%path.length],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy,t=Math.max(0,Math.min(1,((px-a.x)*vx+(py-a.y)*vy)/l2)),qx=a.x+t*vx,qy=a.y+t*vy,d=Math.hypot(px-qx,py-qy);if(d<best.d)best={i,t,d};}return best;
}
function startGate(){const p0=path[0],next=path[1];let tx=next.x-p0.x,ty=next.y-p0.y,l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;return {p0,tx,ty,nx:-ty,ny:tx};}
function finishGate(){
 if(activeCourse.pointToPoint){const p0=path[path.length-1],prev=path[path.length-2];let tx=p0.x-prev.x,ty=p0.y-prev.y,l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;return {p0,tx,ty,nx:-ty,ny:tx};}
 const p0=path[0],prev=path[path.length-1],next=path[1];let inx=p0.x-prev.x,iny=p0.y-prev.y,outx=next.x-p0.x,outy=next.y-p0.y;let il=Math.hypot(inx,iny)||1,ol=Math.hypot(outx,outy)||1;inx/=il;iny/=il;outx/=ol;outy/=ol;let tx=inx+outx,ty=iny+outy,tl=Math.hypot(tx,ty);if(tl<.2){tx=outx;ty=outy;tl=1}tx/=tl;ty/=tl;return {p0,tx,ty,nx:-ty,ny:tx};
}
function updateCheckpoint(r){
 const g=finishGate(),p0=g.p0,tx=g.tx,ty=g.ty,nx=g.nx,ny=g.ny,x0=r.lapPrevX??r.x,y0=r.lapPrevY??r.y,x1=r.x,y1=r.y;r.lapPrevX=x1;r.lapPrevY=y1;
 const long0=(x0-p0.x)*tx+(y0-p0.y)*ty,long1=(x1-p0.x)*tx+(y1-p0.y)*ty;
 if(activeCourse.pointToPoint){
   let crossed=false;
   if(long0<=0&&long1>0){let den=long1-long0,u=Math.abs(den)<1e-6?0:-long0/den,cx=x0+(x1-x0)*u,cy=y0+(y1-y0)*u,lat=(cx-p0.x)*nx+(cy-p0.y)*ny;crossed=Math.abs(lat)<=Math.max(520,courseHalfWidth+260);}
   // CPU-only finish tolerance: reaching the last route section is enough. This prevents a
   // competent CPU from circling the final gate forever due to a tiny lateral miss.
   if(r.ai&&!crossed&&r.aiPathIndex>=path.length-5&&Math.hypot(r.x-p0.x,r.y-p0.y)<Math.max(760,courseHalfWidth*2.8))crossed=true;
   if(crossed){r.finished=true;r.speed=0;if(!finished){finished=true;msg((r===racers[controlledIndex]?'YOU WIN! ':'')+(CHARACTER_DATA[r.name]?.jp||r.name)+' アキナ山ゴール！');setTimeout(()=>showRaceResult(r===racers[controlledIndex]),1300);}}
   return;
 }
 if((long0<=0&&long1>0)||(long0>=0&&long1<0)){const denom=long1-long0,u=Math.abs(denom)<1e-6?0:(-long0/denom),crossX=x0+(x1-x0)*u,crossY=y0+(y1-y0)*u,lateral=(crossX-p0.x)*nx+(crossY-p0.y)*ny,gateHalf=Math.max(520,courseHalfWidth+260);if(Math.abs(lateral)<=gateHalf){if(long0<=0&&long1>0){r.lap++;if(r.lap>RACE_LAPS){r.finished=true;r.speed=0;if(!finished){finished=true;msg((r===racers[controlledIndex]?'YOU WIN! ':'')+(CHARACTER_DATA[r.name]?.jp||r.name)+' ゴール！');setTimeout(()=>showRaceResult(r===racers[controlledIndex]),1300);}}else if(r===racers[controlledIndex])msg('LAP '+r.lap+' / '+RACE_LAPS);}else{const before=r.lap;r.lap=Math.max(1,r.lap-1);if(r===racers[controlledIndex]&&r.lap<before)msg('逆走でゴール通過：LAP -1 → '+r.lap+'/'+RACE_LAPS);}}}r.startLineLong=long1;
}
function startTongue(r){if(appState==='race'&&raceStartDelay>0)return;if(r.finished)return;const TONGUE_ANCHOR_RANGE=330;let anchor=nearestAnchor(r,TONGUE_ANCHOR_RANGE);if(anchor){let cross=Math.sin(norm(Math.atan2(anchor.y-r.y,anchor.x-r.x)-r.face));r.tongue={kind:'anchor',target:anchor,started:performance.now(),side:cross>0?-1:1};msg('アンカーに舌！ 離すタイミングで脱出');return;}
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
 if(id==='timeStop'){if(r.name!=='Kawazu'&&r.timeStopUsed){msg('時間停止は1レースに一度だけ！');return true;}if(r.name!=='Kawazu')r.timeStopUsed=true;r[cdKey]=r.name==='Kawazu'?4.0:99;globalTimeStop=3;msg(r.name==='Kawazu'?'時間停止！ 3秒！':'禁断スキル――時間停止！ 3秒！');return true;}
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
function useA(r){if(appState==='race'&&raceStartDelay>0)return;if(r.name==='Takumi'){if(r.skillCdA>0)return;
   let ns=nearestTrackSegment(r.x,r.y),i=ns.i;
   let a=path[i],b=path[Math.min(path.length-1,i+1)],c=path[Math.min(path.length-1,i+2)];
   if(!activeCourse.pointToPoint){b=path[(i+1)%path.length];c=path[(i+2)%path.length];}
   if(!b||!c){msg('溝走り：コーナーがない');return;}
   let iang=Math.atan2(b.y-a.y,b.x-a.x),oang=Math.atan2(c.y-b.y,c.x-b.x),turn=norm(oang-iang);
   if(Math.abs(turn)<.22){msg('溝走り：コーナー内側へ近づけ！');return;}
   let side=Math.sign(turn)||1,ox=Math.cos(oang+side*Math.PI/2),oy=Math.sin(oang+side*Math.PI/2);
   // Virtual grab point is on the inside guard wall, slightly after the apex. No tree is required.
   let target={x:b.x+Math.cos(oang)*150+ox*(courseHalfWidth+18),y:b.y+Math.sin(oang)*150+oy*(courseHalfWidth+18),virtualWall:true};
   r.skillCdA=.65;r.tongue={kind:'gutter',target,started:performance.now()-320,side:side>0?-1:1};
   r.speed=Math.max(r.speed,555);msg('溝走り！ 内側の壁を舌で掴んだ！');
   setTimeout(()=>{if(r.tongue?.kind==='gutter'&&r.tongue.target===target){r.boost=.34;r.tongue=null;}},560);
   return;}if(r.name==='Michael'||r.name==='Kawazu'){useMichaelSkill(r,r.customSkillA||(r.name==='Kawazu'?'airSwim':'punch'),'A');return;}if(r.skillCdA>0)return;if(r.name==='Beelzebub'){let o=racers[1-r.index];if(o.tongue?.kind==='rival'&&o.tongue.target===r){forceFall(o);o.tongue=null;msg('毒反撃！ 舌を掴んだ相手が落下');}}
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
function useB(r){if(appState==='race'&&raceStartDelay>0)return;if(r.name==='Takumi'){msg('コーナー脱出加速は自動発動！');return;}if(r.name==='Michael'||r.name==='Kawazu'){useMichaelSkill(r,r.customSkillB||(r.name==='Kawazu'?'wallKick':'bubble'),'B');return;}if(r.skillCdB>0)return;if(r.name==='Beelzebub'){let o=racers[1-r.index];if(o.tongue?.kind==='rival'&&o.tongue.target===r){forceFall(o);o.tongue=null;msg('毒反撃！ 舌を掴んだ相手が落下');}}
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
function trackInfo(px,py){let best={d:1e9,qx:0,qy:0,i:0,t:0,branch:false};const scan=(pts,closed,isBranch)=>{let lim=closed?pts.length:pts.length-1;for(let i=0;i<lim;i++){let a=pts[i],b=pts[(i+1)%pts.length],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((px-a.x)*vx+(py-a.y)*vy)/l2)),qx=a.x+t*vx,qy=a.y+t*vy,d=Math.hypot(px-qx,py-qy);if(d<best.d)best={d,qx,qy,i,t,branch:isBranch}}};scan(path,!activeCourse.pointToPoint,false);for(const br of courseBranches)scan(br,false,true);return best}
function trackDistance(px,py){return trackInfo(px,py).d}
function draw(){
 let me=racers[controlledIndex],timeFx=globalTimeStop>0?'stop':(globalTimeLag>0?'lag':'');
 camera.x=approach(camera.x,me.x-W/2,.16*W);camera.y=approach(camera.y,me.y-H/2,.16*H);camera.x=Math.max(0,Math.min(world.w-W,camera.x));camera.y=Math.max(0,Math.min(world.h-H,camera.y));ctx.clearRect(0,0,W,H);
 ctx.save();ctx.translate(-camera.x,-camera.y);
 if(timeFx){
   // Do NOT use Canvas ctx.filter here. On large courses (especially Akina) filter
   // forces expensive full-scene raster processing and makes the controllable racer
   // appear to move in frame-steps. Draw the frozen/slowed world normally instead.
   drawWorld();
   for(const e of effects)if(e.owner!==me)drawEffect(e);
   for(const r of racers)if(r!==me)drawRacer(r);

   // Tint only the already-drawn surroundings/opponent. The player is drawn AFTER
   // this veil, so its color and animation remain completely normal and smooth.
   ctx.save();
   ctx.fillStyle=timeFx==='stop'?'rgba(24,73,130,.30)':'rgba(45,96,145,.18)';
   ctx.fillRect(camera.x,camera.y,W,H);
   ctx.restore();

   for(const e of effects)if(e.owner===me)drawEffect(e);
   drawRacer(me);
 }else{
   drawWorld();for(const e of effects)drawEffect(e);for(const r of racers)drawRacer(r);
 }
 ctx.restore();
 if(timeFx)drawTimeEffectOverlay(timeFx);
 drawMini();updateHud(me);
 if(raceStartDelay>0){ctx.save();ctx.fillStyle='rgba(8,35,31,.72)';ctx.fillRect(W/2-92,H/2-46,184,92);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 30px sans-serif';ctx.fillText(raceStartDelay>.65?'READY':'GO!',W/2,H/2+10);ctx.restore();}
}
function drawTimeEffectOverlay(mode){
 ctx.save();
 const stop=mode==='stop';
 ctx.strokeStyle=stop?'rgba(205,235,255,.68)':'rgba(210,240,255,.38)';ctx.lineWidth=stop?5:3;
 ctx.strokeRect(7,7,W-14,H-14);
 ctx.font=stop?'bold 28px sans-serif':'bold 21px sans-serif';ctx.textAlign='center';ctx.textBaseline='top';
 ctx.fillStyle=stop?'rgba(235,248,255,.96)':'rgba(232,247,255,.78)';
 ctx.fillText(stop?'TIME STOP':'TIME LAG',W/2,18);
 ctx.restore();
}
function drawWorld(){
 // The race is airborne: below the racers is a pond, not a road surface.
 const pal=courseTheme==='akina'?{water:'#4f8a43',grass:'#275d31',inner:'#777b7d'}:courseTheme==='autumn'?{water:'#d8b46a',grass:'#713d25',inner:'#d9c39a'}:courseTheme==='wind'?{water:'#9edee8',grass:'#55995b',inner:'#b7e4e7'}:courseTheme==='forest'?{water:'#77b8a5',grass:'#245f38',inner:'#86c3ae'}:courseTheme==='master'?{water:'#77758d',grass:'#403d52',inner:'#8b879d'}:{water:'#58bdd5',grass:'#397e48',inner:'#70c8d9'};ctx.fillStyle=pal.water;ctx.fillRect(0,0,world.w,world.h);
 // soft scenery texture; Akina is land, not pond.
 if(courseTheme==='akina'){
   // Akina: intentionally plain green outside the asphalt for performance and readability.
 }else{
   for(let y=240;y<world.h;y+=620){for(let x=260;x<world.w;x+=760){let n=((x*13+y*7)%190)-95;ctx.fillStyle='rgba(255,255,255,.055)';ctx.beginPath();ctx.ellipse(x+n,y-n*.35,170,72,.18,0,Math.PI*2);ctx.fill();}}
   for(const l of lilies)drawLily(l.x,l.y,l.r);
 }
 if(courseTheme==='wind'){ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle='#ffffff';ctx.lineWidth=10;for(let i=0;i<12;i++){let x=300+(i*487)%5400,y=250+(i*811)%3900;ctx.beginPath();ctx.arc(x,y,55,0,Math.PI*1.5);ctx.stroke();}ctx.restore();}
 if(courseTheme==='forest'){ctx.save();for(let i=0;i<20;i++){let x=220+(i*701)%5550,y=180+(i*997)%4000;if(trackDistance(x,y)>330){ctx.fillStyle='#174b2b';ctx.beginPath();ctx.arc(x,y,42,0,Math.PI*2);ctx.fill();}}ctx.restore();}
 if(courseTheme==='master'){ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#c7a7ff';for(let i=0;i<14;i++){let x=300+(i*839)%5300,y=260+(i*541)%3800;ctx.beginPath();ctx.arc(x,y,35+(i%3)*14,0,Math.PI*2);ctx.fill();}ctx.restore();}

 ctx.lineCap='round';ctx.lineJoin='round';
 const drawRoute=(pts,closed=true)=>{ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);if(closed)ctx.closePath();ctx.stroke();};
 // Every race corridor has a visible inner frame. Courses that were "open" are framed again
 // because losing the inside boundary makes the route unreadable and creates accidental cuts.
 ctx.strokeStyle=pal.grass;ctx.lineWidth=courseHalfWidth*2+(courseTheme==='akina'?24:70);drawRoute(path,!activeCourse.pointToPoint);for(const br of courseBranches)drawRoute(br,false);
 ctx.strokeStyle=pal.inner;ctx.lineWidth=courseHalfWidth*2;drawRoute(path,!activeCourse.pointToPoint);for(const br of courseBranches)drawRoute(br,false);
 if(courseTheme!=='akina')drawGrassBlades();
 ctx.strokeStyle=courseTheme==='akina'?'rgba(245,245,235,.72)':'rgba(255,255,255,.16)';ctx.lineWidth=courseTheme==='akina'?5:3;ctx.setLineDash(courseTheme==='akina'?[34,42]:[18,46]);drawRoute(path,!activeCourse.pointToPoint);for(const br of courseBranches)drawRoute(br,false);ctx.setLineDash([]);
 for(const a of anchors)drawTree(a.x,a.y);
 // start gate across the water corridor
 {const gates=activeCourse.pointToPoint?[startGate(),finishGate()]:[finishGate()];for(const g of gates){ctx.save();ctx.translate(g.p0.x,g.p0.y);ctx.rotate(Math.atan2(g.ty,g.tx)+Math.PI/2);let gh=Math.max(190,courseHalfWidth+55);for(let i=-4;i<=4;i++){ctx.fillStyle=i%2?'#fff':'#252525';ctx.fillRect(i*20,-gh,20,gh*2)}ctx.restore();}}
}
function strokeLoop(){ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);ctx.closePath();ctx.stroke()}
function drawGrassBlades(){
 const edge=courseHalfWidth+(courseTheme==='akina'?2:6),blade=courseTheme==='akina'?20:28,spacing=courseTheme==='akina'?78:34;
 ctx.fillStyle='#2f8a43';
 const margin=180,x0=camera.x-margin,x1=camera.x+W+margin,y0=camera.y-margin,y1=camera.y+H+margin;
 for(let i=0;i<(activeCourse.pointToPoint?path.length-1:path.length);i++){
  const a=path[i],b=path[(i+1)%path.length];
  if(courseTheme==='akina'&&(Math.max(a.x,b.x)<x0||Math.min(a.x,b.x)>x1||Math.max(a.y,b.y)<y0||Math.min(a.y,b.y)>y1))continue;
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,tx=dx/len,ty=dy/len,nx=-ty,ny=tx,count=Math.max(1,Math.floor(len/spacing));
  for(let j=0;j<=count;j++){
   const d=Math.min(len,j*spacing),wob=((j+i)&1)?7:-7,cx=a.x+tx*d,cy=a.y+ty*d;
   if(courseTheme==='akina'&&(cx<x0||cx>x1||cy<y0||cy>y1))continue;
   for(const side of [-1,1]){
    const bx=cx+nx*edge*side,by=cy+ny*edge*side,tipx=bx+nx*blade*side+tx*wob,tipy=by+ny*blade*side+ty*wob;
    ctx.beginPath();ctx.moveTo(bx-tx*11,by-ty*11);ctx.lineTo(tipx,tipy);ctx.lineTo(bx+tx*11,by+ty*11);ctx.closePath();ctx.fill();
   }
  }
 }
}
function drawLily(x,y,r){ctx.save();ctx.translate(x,y);ctx.fillStyle='#4aa74c';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.lineTo(0,0);ctx.arc(0,0,r,-.48,.48,true);ctx.closePath();ctx.fill();ctx.fillStyle='#8cd45d';ctx.beginPath();ctx.arc(-r*.22,-r*.18,r*.22,0,Math.PI*2);ctx.fill();if(r>65){ctx.fillStyle='#f5bfd4';for(let i=0;i<6;i++){let a=i*Math.PI/3;ctx.beginPath();ctx.ellipse(Math.cos(a)*r*.18,Math.sin(a)*r*.18,r*.16,r*.07,a,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#ffd86b';ctx.beginPath();ctx.arc(0,0,r*.08,0,Math.PI*2);ctx.fill()}ctx.restore()}
function drawTree(x,y){ctx.fillStyle='#714624';ctx.fillRect(x-10,y-8,20,72);ctx.fillStyle='#247b3c';ctx.beginPath();ctx.arc(x,y-20,34,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8bd85d';ctx.beginPath();ctx.arc(x-10,y-30,14,0,Math.PI*2);ctx.fill()}
let currentWingSpecial=false,currentWingRed=false,currentWingBurning=false,currentWingTakumi=false;
function angelWing(x,y,side,scale=1,tilt=0){
 // One connected angel-wing silhouette. Broad at the shoulder, tapered into layered feather tips.
 ctx.save();ctx.translate(x,y);ctx.scale(side*scale,scale);ctx.rotate(tilt);
 ctx.fillStyle=currentWingBurning?'#d51f2f':(currentWingRed?'#d74c57':(currentWingTakumi?'#f7f5e9':(currentWingSpecial?'#fff9d8':'#fffdf5')));ctx.strokeStyle=currentWingBurning?'#78131d':(currentWingRed?'#7e2530':(currentWingTakumi?'#242424':(currentWingSpecial?'#e4b94f':'#c9d9dc')));ctx.lineWidth=2.2;ctx.lineJoin='round';
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
 ctx.strokeStyle=currentWingBurning?'#ff5964':(currentWingRed?'#f19a9f':(currentWingTakumi?'#88857e':(currentWingSpecial?'#fff0a6':'#e2ecee')));ctx.lineWidth=1.8;
 for(const pts of [[[9,3],[33,-13],[55,-16]],[[10,9],[34,1],[59,1]],[[10,15],[31,13],[55,18]],[[9,21],[25,25],[41,31]]]){
  ctx.beginPath();ctx.moveTo(...pts[0]);ctx.quadraticCurveTo(...pts[1],...pts[2]);ctx.stroke();
 }
 if(currentWingTakumi&&!currentWingBurning){
   ctx.fillStyle='#171717';
   for(const tip of [[[58,-22],[72,-2],[55,2],[46,-7]],[[55,3],[69,20],[49,20],[38,12]],[[43,20],[50,34],[29,30],[20,23]]]){
     ctx.beginPath();ctx.moveTo(...tip[0]);for(let i=1;i<tip.length;i++)ctx.lineTo(...tip[i]);ctx.closePath();ctx.fill();
   }
   ctx.strokeStyle='#171717';ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(13,17);ctx.quadraticCurveTo(32,19,52,22);ctx.stroke();ctx.beginPath();ctx.moveTo(15,21);ctx.quadraticCurveTo(31,23,45,26);ctx.stroke();
   ctx.fillStyle='#171717';ctx.font='bold 7px sans-serif';ctx.textAlign='center';ctx.fillText('TOFU',35,9);
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

function tongueMouthPoint(r){
  // Visual-only mouth origin. Tongue physics / racer center of mass are unchanged.
  // This keeps steering and anchor-turn balance identical while making the tongue
  // visibly leave the frog's mouth in every facing direction.
  const now=performance.now()/1000;
  let lift=0,lean=0,poseScale=1;
  if(r.highJump>0){let hp=1-r.highJump/Math.max(.001,r.highJumpTotal||1.05);lift=118*Math.sin(Math.PI*Math.max(0,Math.min(1,hp)));poseScale=.96-.10*Math.sin(Math.PI*hp);}
  else if(r.normalHighJump>0){let hp=1-r.normalHighJump/.72;lift=72*Math.sin(Math.PI*Math.max(0,Math.min(1,hp)));poseScale=.98-.05*Math.sin(Math.PI*hp);}
  else if(r.flight===1){let t=Math.min(1,r.jumpAge/.42);lift=30*Math.sin(t*Math.PI*.92)+10;poseScale=1+.08*Math.sin(t*Math.PI);}
  else if(r.flight===2){lift=35+5*Math.sin(now*12);poseScale=1+.035*Math.sin(now*12);}
  else if(r.flight===3){lift=30;lean=13;poseScale=.98;}
  if(r.landAge>0)poseScale=1-.08*Math.sin((r.landAge/.28)*Math.PI);
  const charScale=courseTheme==='akina'?.58:1;
  const sc=poseScale*charScale;
  let a=norm(r.face),dir=Math.abs(a)<Math.PI/4?'right':Math.abs(a)>Math.PI*3/4?'left':a<0?'up':'down';
  // Match the cardinal character art rather than using the raw continuous face angle.
  let ox=0,oy=0;
  if(dir==='right'){ox=27;oy=-12;}
  else if(dir==='left'){ox=-27;oy=-12;}
  else if(dir==='up'){ox=0;oy=-27;}
  else {ox=0;oy=-17;}
  return {
    x:r.x+Math.cos(r.face)*lean+ox*sc,
    y:r.y+Math.sin(r.face)*lean-lift+oy*sc
  };
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

 if(r.tongue){
   let t=r.tongue.target,m=tongueMouthPoint(r);
   ctx.strokeStyle='#e86a91';ctx.lineWidth=9;ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(m.x,m.y);
   ctx.quadraticCurveTo((m.x+t.x)/2,(m.y+t.y)/2+18,t.x,t.y);ctx.stroke();
   ctx.lineCap='butt';
 }
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
 const courseCharScale=courseTheme==='akina'?.58:1;
 ctx.scale(poseScale*courseCharScale,poseScale*courseCharScale);
 let a=norm(r.face),dir=Math.abs(a)<Math.PI/4?'right':Math.abs(a)>Math.PI*3/4?'left':a<0?'up':'down';
 // During the second jump, make the entire wing/body silhouette pulse with rapid flaps.
 if(r.flight===2){let flap=Math.sin(now*18);ctx.scale(1+.035*flap,1-.025*flap);}
 // Glide: slight forward pitch / streamlined squash.
 if(r.flight===3){ctx.transform(1,0,-Math.sin(r.face)*.045,1,0,0);}
 currentWingSpecial=r.name==='Michael';currentWingRed=r.name==='Kawazu';currentWingTakumi=r.name==='Takumi';currentWingBurning=r.burningWing>0||r.highJump>0;if(dir==='down')frogFront(r);else if(dir==='up')frogBack(r);else frogSide(r,dir==='left');currentWingBurning=false;currentWingTakumi=false;if(r.name==='Takumi'){ctx.save();
 const black='#151515',white='#f5f3eb';
 if(dir==='down'){
   ctx.fillStyle=black;ctx.beginPath();ctx.ellipse(0,-23,30,23,0,Math.PI,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-14,-38,13,0,Math.PI*2);ctx.arc(14,-38,13,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=white;ctx.beginPath();ctx.roundRect(-28,-22,56,21,9);ctx.fill();
   ctx.fillStyle=black;ctx.beginPath();ctx.roundRect(-18,17,36,21,10);ctx.fill();ctx.beginPath();ctx.ellipse(-23,11,7,16,.35,0,Math.PI*2);ctx.ellipse(23,11,7,16,-.35,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(-11,30,9,13,.28,0,Math.PI*2);ctx.ellipse(11,30,9,13,-.28,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(-14,-39,10,0,Math.PI*2);ctx.arc(14,-39,10,0,Math.PI*2);ctx.fill();ctx.fillStyle=black;ctx.beginPath();ctx.arc(-12,-39,4,0,Math.PI*2);ctx.arc(12,-39,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle=black;ctx.lineWidth=3.2;ctx.beginPath();ctx.arc(0,-17,10,.18,Math.PI-.18);ctx.stroke();
 }else if(dir==='up'){
   ctx.fillStyle=black;ctx.beginPath();ctx.ellipse(0,-22,31,25,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-14,-38,13,0,Math.PI*2);ctx.arc(14,-38,13,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.roundRect(-18,12,36,26,12);ctx.fill();ctx.beginPath();ctx.ellipse(-23,10,7,16,.35,0,Math.PI*2);ctx.ellipse(23,10,7,16,-.35,0,Math.PI*2);ctx.fill();ctx.fillStyle=white;ctx.fillRect(-17,-9,34,7);
 }else{
   ctx.scale(dir==='left'?-1:1,1);
   ctx.fillStyle=black;ctx.beginPath();ctx.ellipse(4,-24,27,21,0,Math.PI,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(13,-38,13,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.roundRect(-14,18,36,19,9);ctx.fill();ctx.beginPath();ctx.ellipse(-20,9,7,15,.28,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=white;ctx.beginPath();ctx.roundRect(-12,-12,35,22,9);ctx.fill();ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(15,-39,10,0,Math.PI*2);ctx.fill();ctx.fillStyle=black;ctx.beginPath();ctx.arc(18,-39,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle=black;ctx.lineWidth=3;ctx.beginPath();ctx.arc(22,-17,7,.35,Math.PI-.5);ctx.stroke();
 }
 ctx.restore();}if(r.name==='Kawazu'){ctx.save();
 const eyeRed='#f2383d',eyeDark='#352b2b',belly='#f7f7f2',sideBlue='#1689d5',orange='#ff7a32';
 if(dir==='down'){
   // Corrected Kawazu palette: red eyes with dark pupils, white belly, blue side marks, orange hands/feet.
   ctx.fillStyle=belly;ctx.beginPath();ctx.ellipse(0,13,12,17,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=eyeRed;ctx.beginPath();ctx.arc(-14,-39,10,0,Math.PI*2);ctx.arc(14,-39,10,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=eyeDark;ctx.beginPath();ctx.arc(-12,-39,4,0,Math.PI*2);ctx.arc(12,-39,4,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=sideBlue;ctx.fillRect(-18,5,5,23);ctx.fillRect(13,5,5,23);
   // Keep every orange pad as an independent path. Consecutive arc() calls in one
   // path draw connector polygons between the circles, which caused the mystery
   // orange triangle/lines across Kawazu's body.
   ctx.fillStyle=orange;
   for(const [px,py,pr] of [[-23,12,7],[23,12,7],[-12,40,7],[12,40,7]]){ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.fill();}
 }else if(dir==='up'){
   // Back view: only the foot soles should show orange.
   ctx.fillStyle=orange;
   ctx.beginPath();ctx.ellipse(-11,40,9,5,.18,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.ellipse(11,40,9,5,-.18,0,Math.PI*2);ctx.fill();
 }else if(dir==='left'||dir==='right'){
   const d=dir==='left'?-1:1;ctx.scale(d,1);
   ctx.fillStyle=belly;ctx.beginPath();ctx.ellipse(8,13,10,17,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=eyeRed;ctx.beginPath();ctx.arc(15,-39,10,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=eyeDark;ctx.beginPath();ctx.arc(18,-39,4,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=sideBlue;ctx.beginPath();ctx.roundRect(-17,5,7,24,3);ctx.fill();
   ctx.fillStyle=orange;
   ctx.beginPath();ctx.arc(-20,12,7,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.ellipse(-8,40,9,5,-.15,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.ellipse(12,40,9,5,.15,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();}
 // Wing-flap speed lines on stage 2 and on successful maintenance taps.
 if(r.flight===2 || r.wing>0){ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle='#ffffff';ctx.lineWidth=4;for(const side of [-1,1]){for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(side*(35+i*5),-12+i*8);ctx.lineTo(side*(52+i*7),-17+i*8);ctx.stroke()}}ctx.restore();}
 // Glide-maintenance warning: starts before the ideal window, becomes fast near expiry.
 if(r.flight===3 && r.glideClock>=3.55){let urgency=Math.min(1,(r.glideClock-3.55)/2.05),blink=Math.sin(now*(7+urgency*13))>.05; if(blink){ctx.save();ctx.globalAlpha=.35+.35*urgency;ctx.strokeStyle=urgency>.72?'#ffca4a':'#fff29a';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-5,48+5*urgency,0,Math.PI*2);ctx.stroke();ctx.restore();}}
 ctx.restore();
 // readable text stays fixed instead of bobbing with the character
 ctx.fillStyle='#17352d';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText(CHARACTER_DATA[r.name]?.jp||r.name,r.x,r.y-68-lift*.45);
}
function drawEffect(e){if(e.kind==='poisonMist'){ctx.save();ctx.globalAlpha=.18+.25*(e.t/e.max);ctx.fillStyle='#9b4bd1';for(let i=0;i<8;i++){let a=i*.9+(e.age||0)*.35,rr=20+(i%3)*17;ctx.beginPath();ctx.arc(e.x+Math.cos(a)*rr,e.y+Math.sin(a)*rr,24+(i%2)*12,0,Math.PI*2);ctx.fill();}ctx.restore();}else if(e.kind==='poison'){ctx.fillStyle='#9e49d6';ctx.strokeStyle='#d6a4ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,18,0,Math.PI*2);ctx.fill();ctx.stroke();}else if(e.kind==='airball'){ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle='#e9ffff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(e.x,e.y,16,0,Math.PI*2);ctx.stroke();ctx.restore();}else if(e.kind==='bewitch'){ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=.75;ctx.fillStyle='#f04478';for(let i=0;i<4;i++){let a=(e.age||0)*5+i*Math.PI/2;ctx.beginPath();ctx.arc(Math.cos(a)*12,Math.sin(a)*12,8,0,Math.PI*2);ctx.fill();}ctx.restore();}else if(e.kind==='rock'){let h=Math.sin(Math.min(1,(e.age||0)/1.1)*Math.PI)*38;ctx.save();ctx.translate(e.x,e.y-h);ctx.rotate((e.age||0)*7);ctx.fillStyle='#8a765e';ctx.strokeStyle='#493f34';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-20,-11);ctx.lineTo(-5,-23);ctx.lineTo(18,-14);ctx.lineTo(22,8);ctx.lineTo(4,20);ctx.lineTo(-18,13);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}else if(e.kind==='bubble'){ctx.fillStyle='#bcecffaa';ctx.strokeStyle='#4eaeeb';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,17,0,Math.PI*2);ctx.fill();ctx.stroke()}else{let len=e.kind==='laser'?640:(e.kind==='waterBoost'?175:120);ctx.strokeStyle=e.kind==='laser'?'#baf5ff':'#7bd7ff';ctx.lineWidth=e.kind==='laser'?7:(e.kind==='waterBoost'?20:15);ctx.globalAlpha=Math.max(.15,e.t/e.max);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(e.a)*len,e.y+Math.sin(e.a)*len);ctx.stroke();ctx.globalAlpha=1}}
function drawMini(){
 const ox=18,oy=58,mw=185,mh=118,pad=9;
 ctx.fillStyle='#102820c9';ctx.fillRect(ox,oy,mw,mh);
 // Fit the ACTUAL path bounds with one common scale. The old mini-map used separate X/Y
 // scales from the whole world size, which stretched Akina and made its shape look different.
 let xs=path.map(p=>p.x),ys=path.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 for(const br of courseBranches)for(const p of br){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y)}
 let bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY),scale=Math.min((mw-pad*2)/bw,(mh-pad*2)/bh);
 let drawW=bw*scale,drawH=bh*scale,baseX=ox+(mw-drawW)/2-minX*scale,baseY=oy+(mh-drawH)/2-minY*scale;
 const mx=x=>baseX+x*scale,my=y=>baseY+y*scale;
 const route=(pts,closed)=>{ctx.beginPath();ctx.moveTo(mx(pts[0].x),my(pts[0].y));for(let i=1;i<pts.length;i++)ctx.lineTo(mx(pts[i].x),my(pts[i].y));if(closed)ctx.closePath();ctx.stroke();};
 ctx.strokeStyle=courseTheme==='akina'?'#27633b':'#2f713c';ctx.lineWidth=8;route(path,!activeCourse.pointToPoint);for(const br of courseBranches)route(br,false);
 ctx.strokeStyle=courseTheme==='akina'?'#9a9da0':'#78d1df';ctx.lineWidth=4;route(path,!activeCourse.pointToPoint);for(const br of courseBranches)route(br,false);
 if(activeCourse.pointToPoint){
   ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(mx(path[0].x),my(path[0].y),4.5,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#ffd45a';ctx.beginPath();ctx.arc(mx(path[path.length-1].x),my(path[path.length-1].y),4.5,0,Math.PI*2);ctx.fill();
 }
 for(const r of racers){ctx.fillStyle=r.color;ctx.beginPath();ctx.arc(mx(r.x),my(r.y),4,0,Math.PI*2);ctx.fill()}
}
function updateHud(r){ui.lap.textContent=activeCourse.pointToPoint?'POINT TO POINT':('LAP '+Math.min(r.lap,RACE_LAPS)+'/'+RACE_LAPS);ui.who.textContent='操作：'+(CHARACTER_DATA[r.name]?.jp||r.name);ui.speed.textContent=Math.round(r.speed*.56)+' km/h';let al='パンチ',bl='泡弾';if(r.name==='Takumi'){al='溝走り';bl='コーナー脱出加速（AUTO）'}else if(r.name==='Gabriel'){al='水ブースト';bl='水レーザー'}else if(r.name==='Raphael'){al='エアバリア';bl='エアブースト '+(r.airBoostUses||0)+'/3'}else if(r.name==='Uriel'){al='タックル';bl='ロックフォール'}else if(r.name==='Lucifer'){al='叩き落とし';bl=r.charging?'チャージ '+Math.round(Math.min(1,r.charge/1.8)*100)+'%':'チャージブースト'}else if(r.name==='Lilith'){al='キック';bl='惑いの瘴気'}else if(r.name==='Beelzebub'){al='毒液';bl='ポイズンブースト'}else if(r.name==='Kawazu'){let aid=r.customSkillA||'airSwim',bid=r.customSkillB||'wallKick';al=skillLabel(aid)+' ∞';bl=skillLabel(bid)+' ∞'}else if(r.name==='Michael'){let aid=r.customSkillA||'punch',bid=r.customSkillB||'bubble';al=skillLabel(aid)+(aid==='burningWing'?' '+r.burnWingUses+'/3':aid==='highJump'?' '+r.burnClimbUses+'/3':'');bl=skillLabel(bid)+(bid==='burningWing'?' '+r.burnWingUses+'/3':bid==='highJump'?' '+r.burnClimbUses+'/3':'')}ui.a.innerHTML='A<small>'+al+'</small>';ui.b.innerHTML='B<small>'+bl+'</small>';let phase=['地上','ジャンプ','羽ばたき','滑空'][r.flight];if(r.flight===3){let remain=Math.max(0,5.65-r.glideClock);phase+=(r.glideClock>=3.55?' ⚠ '+remain.toFixed(1)+'s':' '+r.glideClock.toFixed(1)+'s');}ui.jump.innerHTML='ジャンプ<small>'+phase+'</small>'}
function msg(t){ui.status.textContent=t;clearTimeout(msg.timer);msg.timer=setTimeout(()=>ui.status.textContent='ジャンプ3回＋舌ターンで最速を狙え！',2200)}
function loop(now){let dt=Math.min(.033,(now-last)/1000);last=now;if(appState==='race'){
 if(raceStartDelay>0){raceStartDelay=Math.max(0,raceStartDelay-dt);draw();}
 else{
   if(globalTimeStop>0)globalTimeStop=Math.max(0,globalTimeStop-dt);
   if(globalTimeLag>0)globalTimeLag=Math.max(0,globalTimeLag-dt);
   for(const r of racers){let rd=(globalTimeLag>0&&r!==racers[controlledIndex])?dt*.5:dt;updateRacer(r,rd);}
   updateEffects(dt);draw();
 }
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
