
"use strict";

/* =====================================================================
   CANVAS & CONSTANTS
   ===================================================================== */
const CV = document.getElementById("game");
const ctx = CV.getContext("2d");
const W = 256, H = 240, TILE = 16;
const FIELD_ROWS = 14;      // rows 0..13 (HUD is drawn over the top)
const GROUND_TOP = 12;      // row where the ground surface is
const VIEW_W = W;
const FPS = 60;

const PAL = {
  sky:'#5c94fc', ground:'#dc8e5c', groundTop:'#e8a878', groundDark:'#c87e48',
  brick:'#c84c0c', brickLite:'#e8a878', brickDark:'#802808',
  block:'#ffb848', blockLite:'#ffd878', blockDark:'#d87818', blockShine:'#ffe8a0',
  pipe:'#00b800', pipeLite:'#48e800', pipeDark:'#00a000',
  coin:'#ffc800', coinDark:'#d89000', white:'#ffffff', black:'#000000'
};

/* =====================================================================
   SPRITE / TILE HELPERS
   ===================================================================== */
function makeSprite(rows, palette){
  const h=rows.length, w=rows[0].length;
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const g=c.getContext('2d');
  const img=g.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const col=palette[rows[y][x]];
    if(col){ const i=(y*w+x)*4;
      img.data[i]=col[0];img.data[i+1]=col[1];img.data[i+2]=col[2];img.data[i+3]=col[3]; }
  }
  g.putImageData(img,0,0);
  return c;
}
function tileCanvas(w,h,fn){ const c=document.createElement('canvas'); c.width=w; c.height=h; fn(c.getContext('2d')); return c; }
function px(g,x,y,w,h,col){ g.fillStyle=col; g.fillRect(x,y,w,h); }
function flipCanvas(c){
  const o=document.createElement('canvas'); o.width=c.width; o.height=c.height;
  const g=o.getContext('2d'); g.imageSmoothingEnabled=false;
  g.translate(c.width,0); g.scale(-1,1); g.drawImage(c,0,0);
  return o;
}

/* ---- Static 16x16 tile graphics ---- */
const RES = {};
function buildTiles(){
  RES.ground = tileCanvas(16,16,g=>{
    px(g,0,0,16,16,PAL.ground);
    px(g,0,0,16,4,PAL.groundTop);
    px(g,0,5,2,2,'#b06030');px(g,6,8,2,2,'#b06030');px(g,12,5,2,2,'#b06030');
  });
  RES.brick = tileCanvas(16,16,g=>{
    for(let gy=0;gy<16;gy+=8)for(let gx=0;gx<16;gx+=8){
      const off=((gx/8)+(gy/8))%2, base=off?PAL.brickDark:PAL.brick;
      px(g,gx,gy,8,8,base);
      px(g,gx+1,gy+1,6,6,off?PAL.brick:PAL.brickLite);
      px(g,gx,gy,8,1,PAL.brickDark);px(g,gx,gy+7,8,1,PAL.brickDark);
      px(g,gx,gy,1,8,PAL.brickDark);px(g,gx+7,gy,1,8,PAL.brickDark);
    }
  });
  RES.question = tileCanvas(16,16,g=>{
    px(g,0,0,16,16,PAL.block);px(g,1,1,14,14,PAL.blockLite);px(g,3,3,10,10,PAL.block);
    px(g,0,0,16,1,PAL.blockDark);px(g,0,15,16,1,PAL.blockDark);
    px(g,0,1,1,14,PAL.blockDark);px(g,15,1,1,14,PAL.blockDark);
    px(g,2,2,2,2,PAL.blockShine);px(g,12,2,2,2,PAL.blockShine);
    px(g,2,12,2,2,PAL.blockShine);px(g,12,12,2,2,PAL.blockShine);
    const q=PAL.blockDark;
    px(g,6,5,4,2,q);px(g,9,5,1,1,q);
    px(g,6,7,2,2,q);px(g,7,9,2,2,q);px(g,7,11,2,2,q);px(g,7,13,2,2,q);
  });
  RES.used = tileCanvas(16,16,g=>{
    px(g,0,0,16,16,PAL.brick);px(g,2,2,12,12,PAL.brickDark);
    px(g,4,4,8,8,PAL.brick);px(g,4,4,8,1,'#c08040');px(g,4,11,8,1,'#a06030');
    px(g,4,4,1,8,'#c08040');px(g,11,4,1,8,'#a06030');
  });
  RES.pipeTopL=tileCanvas(16,16,g=>{px(g,0,0,16,16,PAL.pipe);px(g,0,0,15,5,PAL.pipeLite);px(g,0,0,4,16,PAL.pipeLite);px(g,14,5,2,11,PAL.pipeDark);});
  RES.pipeTopR=tileCanvas(16,16,g=>{px(g,0,0,16,16,PAL.pipe);px(g,0,0,16,5,PAL.pipeLite);px(g,0,5,2,11,PAL.pipeLite);px(g,14,0,2,16,PAL.pipeDark);});
  RES.pipeBodyL=tileCanvas(16,16,g=>{px(g,0,0,16,16,PAL.pipe);px(g,0,0,4,16,PAL.pipeLite);px(g,14,0,2,16,PAL.pipeDark);});
  RES.pipeBodyR=tileCanvas(16,16,g=>{px(g,0,0,16,16,PAL.pipe);px(g,3,0,2,16,'#00a000');px(g,13,0,3,16,PAL.pipeDark);});
  RES.coin0=tileCanvas(14,16,g=>{px(g,4,2,6,12,PAL.coin);px(g,6,1,2,14,PAL.coin);px(g,6,2,2,12,PAL.coinDark);});
  RES.coin1=tileCanvas(14,16,g=>{px(g,1,3,12,10,PAL.coin);px(g,3,5,8,6,PAL.coinDark);px(g,1,4,12,1,PAL.coinDark);});
}

/* =====================================================================
   MARIO SPRITES (small + big, each with stand/walk/jump poses)
   ===================================================================== */
const MCOL = {
  R:[0xC8,0x34,0x28,255], r:[0x9C,0x24,0x18,255],
  B:[0x08,0x50,0xF8,255], b:[0x08,0x38,0xB8,255],
  S:[0xFC,0xB8,0x88,255], s:[0xE8,0x98,0x58,255],
  K:[0x50,0x28,0x00,255], W:[0xF8,0xF8,0xF8,255], Y:[0xF8,0xD8,0x00,255], '_':null
};
const SMALL_HEAD = [
  "............",
  ".....RRRR...",
  "....RRRRRR..",
  "...RRSSSSR..",
  "...RSKSSSR..",
  "...RSKSSSR..",
  "....SSSSSR..",
  ".....SSSR...",
  "....WRRBR...",
  "...WRRBBRR..",
  "...WRRBBRR..",
  "....BBBBBB.."
];
const SMALL_LEGS = {
  stand:["....BB.BB...","...wBBwBB...","...wKKwKK...","..wwKKwwKK.."],
  walk2:[".....BB.B...","....wBBwB...","....wKKwK...","...wwKKwK..."],
  walk1:["...BB.....B.","..wBB....wB.","..wKK....wK.","..wwKK...wK."],
  jump: ["....BBBB....","...wwBBww...","...wKKwKK...","..wwKKwwKK.."]
};
function marioSprite(headRows, legRows){ return makeSprite(headRows.concat(legRows), MCOL); }
function buildMarioSprites(){
  const s={};
  for(const pose in SMALL_LEGS){
    s["small_"+pose]=marioSprite(SMALL_HEAD, SMALL_LEGS[pose]);
    s["smallflip_"+pose]=flipCanvas(s["small_"+pose]);
  }
  return s;
}
function buildBigMarioSprites(){
  const s={}, small=buildMarioSprites();
  for(const pose in SMALL_LEGS){
    const c=document.createElement('canvas'); c.width=16; c.height=32;
    const g=c.getContext('2d'); g.imageSmoothingEnabled=false;
    g.scale(16/12,1.6); g.drawImage(small["small_"+pose],0,2);
    s["big_"+pose]=c; s["bigflip_"+pose]=flipCanvas(c);
  }
  return s;
}

/* =====================================================================
   ENEMY / ITEM SPRITES
   ===================================================================== */
const GOOMBA = [
  "................",
  ".....BBBBBB.....",
  "....BBBBBBBB....",
  "...BBBBBBBBBB...",
  "...BSSSSSSSB....",
  "..BSSSSSSSSSB...",
  "..BSSKSSSSKSSB..",
  "..BSSS..SSSSSB..",
  "...BSSSSSSSSB...",
  "...BBBBBBBBBB...",
  "..b.B..bb..B.b..",
  "..bb.bbbbbb.bb..",
  "..b..b....b..b..",
  "................"
];
const KOOPA = [
  "................",
  "......GGGG......",
  ".....GGGGGG.....",
  "....GYYYYYYG....",
  "....GYSKKSYG....",
  "....GSKKKKSG....",
  "....GSSKSSG.....",
  "....GGGGGGGG....",
  "....GYYGYYGG....",
  ".....GG..GG.....",
  "....g..g..g.....",
  "................"
];
const SHELL = [
  "................",
  "....GGGGGGGG....",
  "...GGGGGGGGGG...",
  "...GSSGGGGSSG...",
  "..GSSSGGGSSSG...",
  "..GGGSGGGSGGG...",
  "..GSSSGGGSSSG...",
  "..GGGGGGGGGGG...",
  "..GGGGGGGGGGG...",
  "...GGGGGGGGGG...",
  "....GGGGGGGG....",
  "................"
];
const MUSHROOM = [
  "................",
  "....rrrrrrrr....",
  "...rrWrrrrWrr...",
  "..rrWrrWrrWrrr..",
  "..rrrrrrrrrrrr..",
  "..rrWrrrrrWrrr..",
  "..rrrrrrrrrrrr..",
  ".....C..C.......",
  "....CCCCCC......",
  "....CCCCCC......",
  "...BCCCCCCB.....",
  "...BBBBBBBB.....",
  "...BB..BB.......",
  "....BB.BB.......",
  "................"
];
const FLOWER = [
  "................",
  "....RRRRRRR.....",
  "...RRYRYYRYRR...",
  "..RRYYRRRRYYRR..",
  "..RRYRRRRRRYRR..",
  "...RRRYRRYRRR...",
  "....RRYRRYRR....",
  ".....GG..GG.....",
  "......GGGG......",
  ".....GGGGGG.....",
  ".....G....G.....",
  "....GG....GG....",
  "................"
];
const STAR = [
  "................",
  ".....yyyyyy.....",
  "...yYYYYYYYYy...",
  "..yYYKYYYYKYYy..",
  "..YKKYYYYYYKKY..",
  "..YYYYyyyyYYYY..",
  "..YYyy..yyYY....",
  "..Yy.......yY...",
  "..Yy.......yY...",
  "..YYyyyyyyYY....",
  "..YYYYYYYYYY....",
  "..yYYYYYYYYy....",
  "...yYYYYYYy.....",
  "....yyyyyy......",
  "................"
];
const ONEMUSH = [
  "................",
  "....gggggggg....",
  "...ggWggggWgg...",
  "..ggWggWggWggg..",
  "..gggggggggggg..",
  "..ggWgggggWggg..",
  "..gggggggggggg..",
  ".....C..C.......",
  "....CCCCCC......",
  "....CCCCCC......",
  "...BCCCCCCB.....",
  "...BBBBBBBB.....",
  "...BB..BB.......",
  "....BB.BB.......",
  "................"
];
const ECO={B:[0xA0,0x50,0x30,255],b:[0x68,0x2C,0x18,255],S:[0xF0,0x9C,0x5C,255],K:[0x20,0x10,0x08,255],W:[0xFF,0xFF,0xFF,255],'_':null};
const KCO={G:[0x30,0xB0,0x28,255],g:[0x18,0x78,0x18,255],Y:[0xF8,0xC8,0x38,255],S:[0xF0,0xB8,0x70,255],K:[0x20,0x20,0x20,255],W:[0xFF,0xFF,0xFF,255],'_':null};
const NCO={R:[0xE0,0x20,0x08,255],r:[0x90,0x08,0x00,255],W:[0xFF,0xFF,0xFF,255],C:[0xF8,0x9C,0x5C,255],B:[0x50,0x28,0x10,255],'_':null};
const GCO={g:[0x18,0x80,0x18,255],G:[0x30,0xB0,0x28,255],W:[0xFF,0xFF,0xFF,255],C:[0xF0,0x98,0x50,255],B:[0x50,0x28,0x10,255],'_':null};
function buildEnemySprites(){
  const s={};
  s.goomba=makeSprite(GOOMBA,ECO); s.goombaFlip=flipCanvas(s.goomba);
  s.goombaDead=tileCanvas(16,12,g=>{g.imageSmoothingEnabled=false;g.drawImage(s.goomba,0,8,16,8,0,0,16,12);});
  s.koopaWalk=makeSprite(KOOPA,KCO); s.koopaWalkFlip=flipCanvas(s.koopaWalk);
  s.shell=makeSprite(SHELL,KCO);
  s.mushroom=makeSprite(MUSHROOM,NCO);
  s.onemush=makeSprite(ONEMUSH,GCO);
  s.flower=makeSprite(FLOWER,{R:[0xE0,0x20,0x08,255],Y:[0xF8,0x90,0x18,255],G:[0x20,0xA0,0x20,255],r:[0x90,0x08,0x00,255],'_':null});
  s.star=makeSprite(STAR,{Y:[0xF8,0xC8,0x00,255],y:[0xF8,0x9C,0x18,255],K:[0x00,0x00,0x00,255],W:[0xFF,0xFF,0xFF,255],'_':null});
  return s;
}
const SPR = Object.assign({}, buildMarioSprites(), buildBigMarioSprites(), buildEnemySprites());


/* =====================================================================
   LEVEL BUILDER — faithful World 1-1 layout
   codes: '.' empty 'X' ground 'B' brick '?' coin 'M' powerup 'F' flower
          'S' star '1' oneup 'u' used 'H' hidden 1up 'c' 10-coin brick
          '#' hard block 'P' pipe cell
   ===================================================================== */
function makeLevel(){
  const Wc=140, R=FIELD_ROWS;
  const map=[]; for(let r=0;r<R;r++) map.push(new Array(Wc).fill('.'));
  const pipes=[];
  const set=(r,c,ch)=>{ if(r>=0&&r<R&&c>=0&&c<Wc) map[r][c]=ch; };
  const ground=(c0,c1)=>{ for(let c=c0;c<=c1;c++){ set(12,c,'X'); set(13,c,'X'); } };
  const cut=(c)=>{ set(12,c,'.'); set(13,c,'.'); };
  const brick=(c,r)=>set(r,c,'B');
  const pipe=(c,height)=>{
    for(let h=0;h<height;h++){ const rr=GROUND_TOP-1-h; set(rr,c,'P'); set(rr,c+1,'P'); }
    pipes.push({x:c*TILE,left:c,height});
  };
  const setBlock=(c,r,ch)=>set(r,c,ch);

  ground(0,Wc-1);
  cut(38); cut(39);        // first pit (2 wide)
  cut(79);                 // pit in middle of the 2nd pyramid pair

  // --- start ---
  setBlock(16,10,'?');
  [18,19,20,21].forEach(c=>brick(c,10));
  setBlock(18,9,'M'); setBlock(20,8,'?');
  pipe(24,2); pipe(28,4); pipe(32,2);

  // --- middle ---
  setBlock(37,10,'H');                 // hidden 1-up
  setBlock(42,10,'M');                 // power-up after pit
  for(let c=44;c<=50;c++) set(6,c,'B');// high brick row (goombas fall from here)
  setBlock(47,10,'c');                 // 10-coin brick
  setBlock(51,8,'B'); setBlock(52,8,'S');
  setBlock(55,8,'F'); setBlock(54,9,'?'); setBlock(56,9,'?');
  setBlock(62,10,'?'); setBlock(64,9,'B');

  // --- first pyramid set (gap in middle) ---
  set(11,66,'#'); set(10,66,'#'); set(9,66,'#'); set(8,66,'#');
  set(10,67,'#'); set(9,67,'#'); set(8,67,'#');
  set(9,68,'#'); set(8,68,'#'); set(8,69,'#');
  set(11,74,'#'); set(10,74,'#'); set(9,74,'#'); set(8,74,'#');
  set(10,73,'#'); set(9,73,'#'); set(8,73,'#');
  set(9,72,'#'); set(8,72,'#'); set(8,71,'#');
  // --- second pyramid set (pit in middle) ---
  set(11,76,'#'); set(10,76,'#'); set(9,76,'#'); set(8,76,'#');
  set(10,77,'#'); set(9,77,'#'); set(8,77,'#');
  set(9,78,'#'); set(8,78,'#');
  set(11,82,'#'); set(10,82,'#'); set(9,82,'#'); set(8,82,'#');
  set(10,81,'#'); set(9,81,'#'); set(8,81,'#');
  set(9,80,'#'); set(8,80,'#');

  pipe(85,2);
  setBlock(89,9,'B'); setBlock(90,9,'B'); setBlock(91,9,'B'); setBlock(92,9,'?');
  pipe(95,3);

  // --- ending staircase + flag + castle ---
  for(let c=99;c<=105;c++){ const h=Math.min(7,c-99+2); for(let k=0;k<h;k++) set(GROUND_TOP-1-k,c,'#'); }
  for(let c=105;c<=106;c++) for(let k=0;k<6;k++) set(11-k,c,'#');
  const flagTile=108, castleTile=124;

  const enemies=[
    {t:'goomba',x:18},{t:'goomba',x:23},{t:'goomba',x:26},
    {t:'goomba',x:30},{t:'goomba',x:34},
    {t:'goomba',x:45,fall:true},{t:'goomba',x:47,fall:true},{t:'goomba',x:49,fall:true},
    {t:'koopa',x:59},{t:'goomba',x:63},{t:'goomba',x:65},
    {t:'koopa',x:75},
    {t:'goomba',x:87},{t:'goomba',x:88},
    {t:'koopa',x:102}
  ];
  return { map, pipes, Wc, enemies, flagTile, castleTile };
}


/* =====================================================================
   AUDIO — synthesized SFX + Overworld theme loop
   ===================================================================== */
const AudioM = (function(){
  let ac=null, master=null, musicTimer=null, musicOn=false;
  const BPM=92, BEAT=60/BPM, S16=BEAT/4;
  function ensure(){ if(!ac){ try{ ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} if(ac){ master=ac.createGain(); master.gain.value=0.5; master.connect(ac.destination); } } if(ac&&ac.state==='suspended') ac.resume(); return ac; }
  function note(name){
    if(name==='_'||name==='-'||name==='0'||!name) return 0;
    const N={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
    const oct=+name.slice(-1), p=name.slice(0,-1);
    const semi=N[p[0]] + (p[1]==='#'?1:0);
    const midi=12*(oct+1)+semi;
    return 440*Math.pow(2,(midi-69)/12);
  }
  function tone(freq,dur,type,vol,when,slideTo){
    if(!ac||!freq) return;
    const t0=ac.currentTime + (when||0);
    const o=ac.createOscillator(), g=ac.createGain();
    o.type=type||'square';
    o.frequency.setValueAtTime(freq,t0);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1,slideTo), t0+dur);
    g.gain.setValueAtTime(vol==null?0.15:vol,t0);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0+dur+0.02);
  }
  const SFX={
    coin(){ tone(988,0.09,'square',0.12); tone(1319,0.28,'square',0.12,0.09); },
    jump(){ tone(260,0.18,'square',0.14,0,400); },
    stomp(){ tone(180,0.12,'square',0.16,0,80); },
    kick(){ tone(150,0.10,'square',0.16,0,70); },
    bump(){ tone(120,0.08,'square',0.14,0,60); },
    break(){ for(let i=0;i<4;i++) tone(300+i*80,0.06,'square',0.08,i*0.05); },
    powerup(){ [523,659,784,1046,1319].forEach((f,i)=>tone(f,0.11,'square',0.12,i*0.09)); },
    oneup(){ [523,659,784,1046,1319,1568].forEach((f,i)=>tone(f,0.12,'square',0.13,i*0.11)); },
    flag(){ [660,523,392,523,392,262].forEach((f,i)=>tone(f,0.12,'square',0.12,i*0.09)); },
    death(){ [440,392,330,262,196].forEach((f,i)=>tone(f,0.16,'triangle',0.14,i*0.13)); },
    castle(){ [262,330,392,523,659,784,1046].forEach((f,i)=>tone(f,0.12,'triangle',0.14,i*0.1)); }
  };
  const LEAD=[
    "E4,2","E4,2","E4,4","C4,2","E4,2","G4,4",
    "G4,1","_1","G4,1","_1","G4,1","_1","C4,1","_1","E4,1","_1","G4,1","_1","A4,2","B4,4",
    "C5,4","A4,2","G4,2","E4,2","C4,2","D4,2","E4,2","_2","E4,2","F4,1","E4,1","D4,2","C4,2","B3,2","_8"
  ];
  const BASS=[
    "C3,4","C3,4","C3,4","C3,4","F3,4","F3,4","G3,4","G3,4",
    "C3,4","C3,4","C3,4","C3,4","F3,4","F3,4","G3,4","G3,4",
    "A3,4","A3,4","G3,4","G3,4","F3,4","F3,4","C3,4","C3,4",
    "G3,4","G3,4","C3,8","_8"
  ];
  const leadSeq = LEAD.map(s=>{const p=s.split(',');return [p[0],+p[1]];});
  function schedule(){
    if(!musicOn||!ac) return;
    const now=ac.currentTime;
    let t=now+0.02, i=0;
    const seq=leadSeq;
    while(i<seq.length){
      const [n,d]=seq[i];
      if(n!=='_'&&n!=='-'&&n!=='0') tone(note(n), d*S16*0.7, 'square', 0.07, t-now);
      t+=d*S16; i++;
    }
  }
  function startMusic(){
    if(!ensure()) return;
    if(musicOn) return;
    musicOn=true;
    musicTimer=setInterval(schedule, 120);
  }
  function stopMusic(){ musicOn=false; if(musicTimer){clearInterval(musicTimer); musicTimer=null;} }
  return { ensure, resume:ensure, sfx:n=>{ if(ac&&SFX[n]) SFX[n](); }, startMusic, stopMusic };
})();


/* =====================================================================
   PIXEL FONT (5x7) for the NES-style HUD
   ===================================================================== */
const FONT = {
 A:[" # ","# #","# #","###","# #","# #","# #"],
 B:["## ","# #","# #","## ","# #","# #","## "],
 C:[" ##","#  ","#  ","#  ","#  ","#  "," ##"],
 D:["## ","# #","# #","# #","# #","# #","## "],
 E:["###","#  ","#  ","## ","#  ","#  ","###"],
 F:["###","#  ","#  ","## ","#  ","#  ","#  "],
 G:[" ##","#  ","#  ","# #","# #","# #"," ##"],
 H:["# #","# #","# #","###","# #","# #","# #"],
 I:["###"," # "," # "," # "," # "," # ","###"],
 J:["  #","  #","  #","  #","  #","# #"," # "],
 K:["# #","# #","# #","## ","# #","# #","# #"],
 L:["#  ","#  ","#  ","#  ","#  ","#  ","###"],
 M:["# #","###","###","# #","# #","# #","# #"],
 N:["# #","## #","## #","# ##","# ##","#  #","# #"],
 O:[" # ","# #","# #","# #","# #","# #"," # "],
 P:["## ","# #","# #","## ","#  ","#  ","#  "],
 Q:[" # ","# #","# #","# #","# #","# #"," ##"],
 R:["## ","# #","# #","## ","# #","# #","# #"],
 S:[" ##","#  ","#  "," # ","  #","  #","## "],
 T:["###"," # "," # "," # "," # "," # "," # "],
 U:["# #","# #","# #","# #","# #","# #","###"],
 V:["# #","# #","# #","# #","# #","# #"," # "],
 W:["# #","# #","# #","# #","###","###","# #"],
 X:["# #","# #","# #"," # ","# #","# #","# #"],
 Y:["# #","# #","# #"," # "," # "," # "," # "],
 Z:["###","  #","  #"," # ","#  ","#  ","###"],
 "0":["###","# #","# #","# #","# #","# #","###"],
 "1":[".#.","##.","#.","#.","#.","#.","###"],
 "2":["###","..#","..#",".#.","#..","#..","###"],
 "3":["###","..#","..#",".##","..#","..#","###"],
 "4":["#.#","#.#","#.#","###","..#","..#","..#"],
 "5":["###","#..","#..","##.","..#","..#","###"],
 "6":["###","#..","#..","###","#.#","#.#","###"],
 "7":["###","..#","..#",".#.","#..","#..","#.."],
 "8":["###","#.#","#.#","###","#.#","#.#","###"],
 "9":["###","#.#","#.#","###","..#","..#","###"],
 "-":["...","...","...","###","...","...","..."],
 "x":[".....",".....",".##.","#..#",".##.",".....","....."],
 " ":[".....",".....",".....",".....",".....",".....","....."]
};
function drawText(s,x,y,col,scale){
  scale=scale||2;
  let cx=x;
  for(const c of s){
    const g=FONT[c]||FONT[' '];
    for(let r=0;r<7;r++)for(let cc=0;cc<5;cc++)
      if(g[r] && g[r][cc]==='#'){ ctx.fillStyle=col; ctx.fillRect(cx+cc*scale, y+r*scale, scale, scale); }
    cx += 6*scale;
  }
}
function textW(s){ return s.length*6; }

/* =====================================================================
   INPUT
   ===================================================================== */
const Input = { left:false,right:false,up:false,down:false,jump:false,run:false, jumpPressed:false };
addEventListener('keydown', e=>{
  AudioM.ensure();
  if(!e.repeat){
    const k=e.key;
    if(k==='ArrowLeft'||k==='a'||k==='A') Input.left=true;
    else if(k==='ArrowRight'||k==='d'||k==='D') Input.right=true;
    else if(k==='ArrowUp'||k==='w'||k==='W') Input.up=true;
    else if(k==='ArrowDown'||k==='s'||k==='S') Input.down=true;
    else if(k===' '||k==='x'||k==='X'){ if(!Input.jump) Input.jumpPressed=true; Input.jump=true; }
    else if(k==='z'||k==='Z'||k==='Shift') Input.run=true;
    else if(k==='r'||k==='R'){ init(); }
    if([' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(k)) e.preventDefault();
  }
});
addEventListener('keyup', e=>{
  const k=e.key;
  if(k==='ArrowLeft'||k==='a'||k==='A') Input.left=false;
  else if(k==='ArrowRight'||k==='d'||k==='D') Input.right=false;
  else if(k==='ArrowUp'||k==='w'||k==='W') Input.up=false;
  else if(k==='ArrowDown'||k==='s'||k==='S') Input.down=false;
  else if(k===' '||k==='x'||k==='X') Input.jump=false;
  else if(k==='z'||k==='Z'||k==='Shift') Input.run=false;
});


/* =====================================================================
   GAME STATE / INIT
   ===================================================================== */
let G=null;
function newGame(){
  const level=makeLevel();
  const player={ x:2*TILE, y:GROUND_TOP*TILE-16, w:12, h:16, vx:0, vy:0, facing:1,
    onGround:false, running:false, crouch:false, form:'small', starTimer:0, invTimer:0 };
  return { level, player, entities:[], particles:[], pending:level.enemies.slice(),
    cam:{x:0}, score:0, coins:0, lives:3, time:400*60,
    state:'playing', stateTimer:0, bump:{}, coinBricks:{},
    flagAnim:0, flagStartY:0, remove:[] };
}
function init(){
  buildTiles();
  G=newGame();
  AudioM.stopMusic();
}

/* =====================================================================
   PHYSICS / COLLISION
   ===================================================================== */
const P={ GRAV:0.5, GRAV_HOLD:0.22, JUMP:6.4, ACCEL:0.14, FRICTION:0.2, MAXWALK:1.6, MAXRUN:2.9, MAXFALL:6.5 };
function tile(r,c){
  if(c<0||c>=G.level.Wc) return 'X';
  if(r<0||r>=FIELD_ROWS) return '.';
  return G.level.map[r][c];
}
function isSolid(t){ return t!=='.'&&t!=='-'; }
function solidAt(px,py){
  if(py<0) return false;
  return isSolid(tile(Math.floor(py/TILE), Math.floor(px/TILE)));
}
function moveEntity(e){
  e.hitWall=0; e.hitCeiling=0;
  e.x+=e.vx;
  if(e.vx>0){ const rx=e.x+e.w;
    if(solidAt(rx,e.y)||solidAt(rx,e.y+e.h-1)){ e.x=Math.floor(rx/TILE)*TILE-e.w-0.02; e.vx=0; e.hitWall=1; }
  } else if(e.vx<0){ const lx=e.x;
    if(solidAt(lx,e.y)||solidAt(lx,e.y+e.h-1)){ e.x=(Math.floor(lx/TILE)+1)*TILE+0.02; e.vx=0; e.hitWall=-1; }
  }
  e.y+=e.vy; e.onGround=false;
  if(e.vy>=0){ const by=e.y+e.h;
    if(solidAt(e.x+1,by)||solidAt(e.x+e.w-1,by)){ e.y=Math.floor(by/TILE)*TILE-e.h-0.02; e.vy=0; e.onGround=true; }
  } else { const ty=e.y;
    if(solidAt(e.x+1,ty)||solidAt(e.x+e.w-1,ty)){ e.y=(Math.floor(ty/TILE)+1)*TILE+0.02; e.vy=0; e.hitCeiling=1; }
  }
}
function overlap(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }

/* =====================================================================
   BLOCK BEHAVIOR
   ===================================================================== */
function bump(r,c){ G.bump[r+','+c]=8; }
function breakBrick(r,c){
  G.level.map[r][c]='.'; AudioM.sfx('break');
  const cx=c*TILE+8, cy=r*TILE+8;
  const cols=['#c84c0c','#e8a878','#802808','#b86030'];
  for(let i=0;i<4;i++) G.particles.push({kind:'shard',x:cx-4,y:cy-4,vx:(i%2?1:-1)*(0.8+i*0.3),vy:-(3+i*0.6),g:0.4,ttl:50,col:cols[i],w:8,h:8});
}
function addCoin(r,c){
  G.score+=200; G.coins++;
  if(G.coins%100===0){ G.lives++; AudioM.sfx('oneup'); }
  AudioM.sfx('coin');
  if(r!=null&&c!=null) G.particles.push({kind:'coin',x:c*TILE+1,y:r*TILE-16,vy:-2.2,g:0.12,ttl:40});
}
function spawnScorePop(x,y,val){ G.particles.push({kind:'score',x,y,vy:-0.9,ttl:50,val}); }
function spawnFromBlock(r,c,content){
  const x=c*TILE+1, y=r*TILE-16;
  G.entities.push({type:'power',content,x,y,w:14,h:16,vx:0,vy:0,dir:1,emerging:20,rising:true,bob:0,baseX:x,baseY:y});
}
function onBlockHit(r,c,ch){
  const key=r+','+c;
  if(ch==='B'||ch==='#'){
    if(ch==='B'&&G.player.form!=='small'){ breakBrick(r,c); return; }
    bump(r,c); AudioM.sfx('bump'); return;
  }
  if(ch==='c'){
    let left=G.coinBricks[key]; if(left===undefined) left=10;
    left--; G.coinBricks[key]=left;
    if(left<=0){ G.level.map[r][c]='B'; delete G.coinBricks[key]; }
    bump(r,c); addCoin(r,c); return;
  }
  if(ch==='u'){ bump(r,c); AudioM.sfx('bump'); return; }
  if(ch==='?'){ G.level.map[r][c]='u'; bump(r,c); addCoin(r,c); return; }
  let content = (ch==='M')?((G.player.form==='small')?'mushroom':'flower')
              : (ch==='F')?'flower' : (ch==='S')?'star' : (ch==='H'||ch==='1')?'oneup' : 'coin';
  G.level.map[r][c]='u'; bump(r,c);
  spawnFromBlock(r,c,content);
}


/* =====================================================================
   PLAYER
   ===================================================================== */
function setForm(f){ const p=G.player; p.form=f; p.h=(f==='small')?16:31; }
function updatePlayer(){
  const p=G.player;
  if(G.state==='dying'){ p.vy+=0.5; if(p.vy>5)p.vy=5; p.y+=p.vy; return; }
  if(G.state==='flag'){ updateFlagPlayer(p); return; }

  const dir=(Input.right?1:0)-(Input.left?1:0);
  const run=Input.run&&(Input.left||Input.right);
  p.running=run;
  if(dir!==0){
    p.facing=dir;
    const maxv=run?P.MAXRUN:P.MAXWALK;
    p.vx+=dir*P.ACCEL;
    if(Math.abs(p.vx)>maxv) p.vx=Math.sign(p.vx)*maxv;
  } else if(p.onGround){
    if(Math.abs(p.vx)<P.FRICTION) p.vx=0; else p.vx-=Math.sign(p.vx)*P.FRICTION;
  } else p.vx*=0.98;

  p.crouch=(Input.down&&p.onGround&&p.form!=='small');
  p.h=p.crouch?14:((p.form==='small')?16:31);
  if(p.crouch) p.vx=0;

  if(Input.jumpPressed&&p.onGround){ p.vy=-P.JUMP; p.onGround=false; AudioM.sfx('jump'); }
  Input.jumpPressed=false;

  if(!p.onGround){
    p.vy += (p.vy<0&&Input.jump)?P.GRAV_HOLD:P.GRAV;
    if(p.vy>P.MAXFALL) p.vy=P.MAXFALL;
  } else p.vy=0;

  moveEntity(p);
  if(p.hitCeiling){
    p.hitCeiling=0;
    const crow=Math.floor((p.y-1)/TILE);
    const c0=Math.floor((p.x+1)/TILE), c1=Math.floor((p.x+p.w-1)/TILE);
    for(let c=c0;c<=c1;c++){
      const t=tile(crow,c);
      if(isSolid(t)&&'B?MFS1#cuH'.includes(t)) onBlockHit(crow,c,t);
    }
  }
  if(p.starTimer>0) p.starTimer--;
  if(p.invTimer>0) p.invTimer--;
  if(p.y>H+12){ die(); }
}
function updateFlagPlayer(p){
  const groundY=GROUND_TOP*TILE-p.h;
  if(G.flagAnim<32){
    G.flagAnim++;
    p.y=G.flagStartY+(groundY-G.flagStartY)*(G.flagAnim/32);
    p.onGround=(G.flagAnim>=32);
    if(G.flagAnim===32){ addFlagBonus(); }
  } else {
    p.vx=1.2; p.facing=1; p.x+=p.vx;
    if(p.x>=G.level.castleTile*TILE-10){ G.state='castledone'; G.stateTimer=0; p.vx=0; AudioM.stopMusic(); AudioM.sfx('castle'); }
  }
}

/* =====================================================================
   ENEMIES
   ===================================================================== */
function spawnEnemies(){
  const camL=G.cam.x, camR=camL+VIEW_W;
  for(let i=G.pending.length-1;i>=0;i--){
    const e=G.pending[i], ex=e.x*TILE;
    if(ex<camR+16 && ex>camL-16){
      const y=e.fall?(6*TILE-16):(GROUND_TOP*TILE-16);
      const t=(e.t==='koopa')?'koopa':'goomba';
      G.entities.push({type:t,x:ex,y,w:16,h:16,vx:-0.55,vy:0,dir:-1,onGround:false,frame:0,anim:0,dead:0,ttl:0,squashed:false,shell:false});
      G.pending.splice(i,1);
    }
  }
}
function updateGoomba(e){
  if(e.dead){ e.vy+=0.5; e.y+=e.vy; e.ttl--; if(e.ttl<=0) G.remove.push(e); return; }
  e.anim++; e.vy+=P.GRAV; if(e.vy>P.MAXFALL)e.vy=P.MAXFALL;
  moveEntity(e);
  if(e.onGround&&e.hitWall){ e.dir*=-1; e.vx=e.dir*0.55; }
}
function updateKoopa(e){
  if(e.dead){ e.vy+=0.5; e.y+=e.vy; e.ttl--; if(e.ttl<=0) G.remove.push(e); return; }
  if(e.shell){
    e.vy+=P.GRAV; if(e.vy>P.MAXFALL)e.vy=P.MAXFALL; moveEntity(e);
    if(e.vx!==0&&e.hitWall) e.vx=-e.vx;
    return;
  }
  e.anim++; e.vy+=P.GRAV; if(e.vy>P.MAXFALL)e.vy=P.MAXFALL;
  moveEntity(e);
  if(e.onGround&&e.hitWall){ e.dir*=-1; e.vx=e.dir*0.8; }
}
function squashGoomba(e){ e.squashed=true; e.dead=true; e.ttl=40; e.y+=8; e.h=6; e.vx=0; G.score+=100; spawnScorePop(e.x,e.y,100); AudioM.sfx('stomp'); }
function toShell(e){ e.shell=true; e.vx=0; G.score+=100; spawnScorePop(e.x,e.y,100); AudioM.sfx('stomp'); }
function kickShell(e,p){ e.vx=(p.x+6<e.x+8)?4.5:-4.5; G.score+=400; spawnScorePop(e.x,e.y,400); AudioM.sfx('kick'); }
function updatePower(e){
  e.bob++;
  if(e.emerging>0){ e.y-=1.1; e.emerging--; if(e.emerging<=0){ e.rising=false; e.y=Math.round(e.y); } return; }
  if(e.content==='flower'){ e.x=e.baseX; e.y=e.baseY+Math.sin(e.bob*0.12)*2; return; }
  if(e.content==='star'){
    e.vy+=P.GRAV; if(e.vy>4)e.vy=4; moveEntity(e);
    if(e.onGround){ if(e.hitWall){ e.dir=-e.dir; e.vx=e.dir*1.6; } else e.vy=-3.6; }
    e.vx=e.dir*1.6;
  } else {
    e.vy+=P.GRAV; if(e.vy>P.MAXFALL)e.vy=P.MAXFALL; moveEntity(e);
    if(e.hitWall){ e.dir=-e.dir; e.vx=e.dir*1.2; } else e.vx=e.dir*1.2;
  }
}
function updateEntities(){
  for(const e of G.entities){
    if(e.type==='goomba') updateGoomba(e);
    else if(e.type==='koopa') updateKoopa(e);
    else if(e.type==='power') updatePower(e);
    else if(e.type==='coin'){ }
    if(e.y>H+40||e.x+e.w<G.cam.x-40) G.remove.push(e);
  }
  // moving shells squash enemies
  const moving=[];
  for(const a of G.entities) if(a.type==='koopa'&&a.shell&&a.vx!==0) moving.push(a);
  for(const s of moving) for(const b of G.entities){
    if(b===s) continue;
    if((b.type==='goomba'||(b.type==='koopa'&&!b.shell))&&overlap(s,b)&&!b.dead){
      if(b.type==='goomba') squashGoomba(b); else toShell(b);
    }
  }
}


/* =====================================================================
   INTERACTIONS & STATE
   ===================================================================== */
function collidePlayerEntities(){
  const p=G.player;
  for(const e of G.entities){
    if(!overlap(p,e)) continue;
    if(e.type==='power'){ if(e.emerging<=0) collectPower(e); continue; }
    if(p.starTimer>0){ killEnemyStar(e); continue; }
    if(e.type==='koopa'&&e.shell&&e.vx===0){ kickShell(e,p); p.vy=-P.JUMP*0.45; p.onGround=false; continue; }
    const stomped = p.vy>0 && (p.y+p.h-e.y)<e.h*0.6;
    if(stomped){
      if(e.type==='goomba') squashGoomba(e);
      else if(e.type==='koopa'){ if(e.shell) e.vx=0; else toShell(e); }
      p.vy=-P.JUMP*0.5; p.onGround=false;
      continue;
    }
    damagePlayer();
  }
}
function killEnemyStar(e){
  if(e.type==='goomba'){ squashGoomba(e); G.score+=200; }
  else if(e.type==='koopa'){ if(!e.shell) toShell(e); else { e.dead=true; e.ttl=30; G.score+=200; spawnScorePop(e.x,e.y,200); } }
}
function collectPower(e){
  const p=G.player;
  if(e.content==='mushroom'){ if(p.form==='small') setForm('big'); G.score+=1000; AudioM.sfx('powerup'); }
  else if(e.content==='flower'){ if(p.form==='small')setForm('big'); setForm('fire'); G.score+=1000; AudioM.sfx('powerup'); }
  else if(e.content==='star'){ p.starTimer=480; G.score+=1000; AudioM.sfx('powerup'); }
  else if(e.content==='oneup'){ G.lives++; AudioM.sfx('oneup'); }
  spawnScorePop(e.x,e.y,1000);
  G.remove.push(e);
}
function damagePlayer(){
  const p=G.player;
  if(p.starTimer>0||p.invTimer>0||G.state!=='playing') return;
  if(p.form!=='small'){ setForm('small'); p.invTimer=150; AudioM.sfx('bump'); }
  else die();
}
function die(){
  if(G.state!=='playing') return;
  AudioM.stopMusic(); AudioM.sfx('death');
  G.state='dying'; G.stateTimer=0; G.player.vy=-7; G.player.vx=0; G.lives--;
}
function respawn(){
  if(G.lives<0){ G.state='gameover'; return; }
  const s=G.score,c=G.coins,l=G.lives;
  G=newGame(); G.score=s; G.coins=c; G.lives=l; G.state='playing';
  AudioM.startMusic();
}
function addFlagBonus(){
  const p=G.player;
  const heightPts=Math.max(0,Math.floor((GROUND_TOP*TILE-p.y)/TILE));
  const pts=[5000,2000,800,400,200,100][heightPts]||100;
  G.score+=pts; spawnScorePop(p.x,p.y-20,pts);
  G.score+=Math.ceil(G.time/60)*50;
}
function completeLevel(){
  const s=G.score,c=G.coins,l=G.lives;
  G=newGame(); G.score=s; G.coins=c; G.lives=l; G.state='playing';
  AudioM.startMusic();
}

/* =====================================================================
   CAMERA / PARTICLES / UPDATE
   ===================================================================== */
function updateCamera(){
  const p=G.player;
  let tx=p.x+p.w/2-VIEW_W*0.42;
  if(p.running||Math.abs(p.vx)>1) tx+=p.facing*10;
  const maxX=G.level.Wc*TILE-VIEW_W;
  tx=Math.max(0,Math.min(maxX,tx));
  G.cam.x+=(tx-G.cam.x)*0.25;
  if(Math.abs(tx-G.cam.x)<0.05) G.cam.x=tx;
}
function updateParticles(){
  for(const pt of G.particles){ pt.x+=pt.vx; pt.y+=pt.vy; pt.vy+=pt.g||0; pt.ttl--; }
  G.particles=G.particles.filter(p=>p.ttl>0);
}
function update(){
  G.remove=[];
  if(G.state==='playing'){
    spawnEnemies();
    updatePlayer();
    updateEntities();
    collidePlayerEntities();
    updateParticles();
    updateCamera();
    G.time--;
    if(G.time<=0){ G.time=0; die(); }
    else{
      const p=G.player;
      if(p.x+p.w>=G.level.flagTile*TILE){
        G.state='flag'; G.flagAnim=0; G.flagStartY=p.y;
        p.x=G.level.flagTile*TILE+3; p.vx=0; p.vy=0; p.facing=1;
        AudioM.stopMusic(); AudioM.sfx('flag');
      }
    }
  } else if(G.state==='dying'){
    G.stateTimer++;
    if(G.stateTimer>=95){ respawn(); }
  } else if(G.state==='flag'){
    updatePlayer();
    updateEntities();
    updateParticles();
  } else if(G.state==='castledone'){
    G.stateTimer++;
    if(G.stateTimer>200){ completeLevel(); }
  }
  for(const k in G.bump){ G.bump[k]--; if(G.bump[k]<=0) delete G.bump[k]; }
  if(G.remove.length) G.entities=G.entities.filter(e=>!G.remove.includes(e));
}


/* =====================================================================
   RENDERING
   ===================================================================== */
const bgCloud=[]; for(let i=0;i<6;i++) bgCloud.push({x:i*80+40,y:28+ (i*19)%42,s:0.8+ (i%3)*0.25});
const bgHills=[]; for(let i=0;i<8;i++) bgHills.push({x:i*90+30,s:0.6+ (i%4)*0.2});
function drawBackground(){
  ctx.fillStyle=PAL.sky; ctx.fillRect(0,0,W,H);
  const par=0.5;
  for(const h of bgHills){
    const cx=(((h.x-G.cam.x*par)%(W+140)+W+140)%(W+140))-70;
    const baseY=GROUND_TOP*TILE+2, hh=34*h.s+16;
    ctx.fillStyle='#00a800';
    ctx.beginPath(); ctx.moveTo(cx,baseY);
    ctx.quadraticCurveTo(cx+30*h.s+8,baseY-hh-8,cx+60*h.s+16,baseY);
    ctx.closePath(); ctx.fill();
  }
  const par2=0.7;
  for(const cl of bgCloud){
    const cx=(((cl.x-G.cam.x*par2)%(W+90)+W+90)%(W+90))-45;
    const cy=cl.y, r=cl.s;
    ctx.fillStyle='#ffffff';
    ctx.fillRect(cx,cy+4*r,24*r,3*r);
    ctx.fillRect(cx+4*r,cy+2*r,16*r,3*r);
    ctx.fillRect(cx+8*r,cy,8*r,3*r);
  }
}
function drawTiles(){
  const c0=Math.max(0,Math.floor(G.cam.x/TILE));
  const c1=Math.min(G.level.Wc-1,Math.ceil((G.cam.x+VIEW_W)/TILE));
  for(let r=0;r<FIELD_ROWS;r++)for(let c=c0;c<=c1;c++){
    const t=G.level.map[r][c];
    if(t==='.'||t==='H'||t==='h') continue;
    const sx=c*TILE-G.cam.x, sy=r*TILE;
    if(t==='P'){ drawPipeCell(r,c,sx,sy); continue; }
    let img=null;
    if(t==='X') img=RES.ground;
    else if(t==='B'||t==='c') img=RES.brick;
    else if(['?','M','F','S','1'].includes(t)) img=RES.question;
    else if(t==='#'||t==='u') img=RES.used;
    if(!img) continue;
    let bumpY=0; if(G.bump[r+','+c]) bumpY=-G.bump[r+','+c]*0.6;
    ctx.drawImage(img,sx,sy+bumpY);
  }
}
function drawPipeCell(r,c,sx,sy){
  const left=(tile(r,c-1)==='P');
  const isTop=(tile(r-1,c)!=='P');
  const img=isTop?(left?RES.pipeTopR:RES.pipeTopL):(left?RES.pipeBodyR:RES.pipeBodyL);
  ctx.drawImage(img,sx,sy);
}
function drawFlagAndCastle(){
  const poleX=G.level.flagTile*TILE, sx=poleX-G.cam.x, groundY=GROUND_TOP*TILE;
  ctx.fillStyle='#d8d8d8'; ctx.fillRect(sx+7,8,2,groundY-8);
  ctx.fillStyle='#58d020'; ctx.fillRect(sx+5,5,6,5);
  let flagTop=8+(groundY-8-10)*((G.flagAnim||0)/32);
  if(G.state!=='playing'&&G.state!=='flag') flagTop=groundY-10;
  ctx.fillStyle='#00b800'; ctx.fillRect(sx+9,flagTop,14,8);
  ctx.fillStyle='#ffffff'; ctx.fillRect(sx+9,flagTop+2,14,2);
  const castX=G.level.castleTile*TILE-G.cam.x, cw=96, ch=96, cy=GROUND_TOP*TILE;
  for(let yy=cy-ch;yy<cy;yy+=16)for(let xx=castX;xx<castX+cw;xx+=16){
    ctx.fillStyle=(((xx/16)%2===0)===((yy/16)%2===0))?PAL.brick:PAL.brickDark;
    ctx.fillRect(xx,yy,16,16);
  }
  ctx.fillStyle=PAL.brick; ctx.fillRect(castX,cy-ch-10,cw,10);
  for(let xx=castX;xx<castX+cw;xx+=16) ctx.fillRect(xx,cy-ch-20,8,10);
  ctx.fillStyle='#00b800'; ctx.fillRect(castX,cy-ch-20,cw,3);
  ctx.fillStyle='#3a1800'; ctx.fillRect(castX+cw*0.42,cy-26,cw*0.16,26);
}
function drawEntities(){
  for(const e of G.entities){
    const sx=e.x-G.cam.x, sy=e.y;
    if(e.type==='goomba'){
      if(e.dead&&e.squashed) ctx.drawImage(SPR.goombaDead,sx,sy,16,12);
      else if(e.dead) ctx.drawImage(SPR.goomba,sx,sy);
      else if(e.dir>0) ctx.drawImage(SPR.goombaFlip,sx,sy); else ctx.drawImage(SPR.goomba,sx,sy);
      continue;
    }
    if(e.type==='koopa'){
      if(e.shell) ctx.drawImage(SPR.shell,sx,sy);
      else if(e.dir>0) ctx.drawImage(SPR.koopaWalkFlip,sx,sy); else ctx.drawImage(SPR.koopaWalk,sx,sy);
      continue;
    }
    if(e.type==='power'){
      const img=(e.content==='mushroom')?SPR.mushroom:(e.content==='flower')?SPR.flower:
                (e.content==='star')?SPR.star:SPR.onemush;
      ctx.drawImage(img,sx,sy);
    } else if(e.type==='coin') ctx.drawImage(RES.coin0,sx,sy);
  }
}
function drawPlayer(){
  const p=G.player;
  if(G.state==='dying'){ const sx=p.x-G.cam.x;
    (p.facing>0)?ctx.drawImage(SPR.small_jump,sx,p.y):ctx.drawImage(SPR.smallflip_jump,sx,p.y);
    return; }
  const blinkInv=p.invTimer>0&&(Math.floor(p.invTimer/6)%2===0);
  if(blinkInv&&!p.starTimer) return;
  const blinkStar=p.starTimer>0&&(Math.floor(Date.now()/80)%2===0);
  let pose='stand';
  if(!p.onGround) pose='jump';
  else if(Math.abs(p.vx)>0.1) pose=(Math.floor(Date.now()/90)%2===0)?'walk1':'walk2';
  const flip=p.facing<0;
  const base=(p.form==='small')?(flip?'smallflip_'+pose:'small_'+pose):(flip?'bigflip_'+pose:'big_'+pose);
  const img=SPR[base]||SPR.small_stand;
  const sx=p.x-G.cam.x;
  ctx.drawImage(img,sx,p.y);
  if(p.starTimer>0&&!blinkStar){ ctx.globalAlpha=0.6; ctx.drawImage(img,sx-2,p.y-2); ctx.globalAlpha=1; }
}
function drawParticles(){
  for(const pt of G.particles){
    const sx=pt.x-G.cam.x;
    if(pt.kind==='shard'){ ctx.fillStyle=pt.col; ctx.fillRect(sx,pt.y,pt.w,pt.h); }
    else if(pt.kind==='coin'){ ctx.drawImage((Math.floor(Date.now()/120)%2)?RES.coin1:RES.coin0,sx,pt.y); }
    else if(pt.kind==='score'){ drawText(String(pt.val),sx,pt.y,'#ffffff',1); }
  }
}
function drawHUD(){
  drawText("MARIO",8,6,'#ffffff',1);
  drawText(String(G.score).padStart(6,'0'),8,18,'#ffffff',2);
  ctx.drawImage(RES.coin0,W/2-24,15);
  ctx.fillStyle='#ffffff'; ctx.fillRect(W/2-12,20,10,2);
  drawText("x"+String(G.coins).padStart(2,'0'),W/2,18,'#ffffff',1);
  drawText("WORLD",W/2+8,6,'#ffffff',1);
  drawText("1-1",W/2+24,18,'#ffffff',1);
  drawText("TIME",W-48,6,'#ffffff',1);
  drawText(String(Math.max(0,Math.ceil(G.time/60))).padStart(3,'0'),W-40,18,'#ffffff',2);
}
function drawOverlays(){
  if(G.state==='gameover'){
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,W,H);
    const tw="GAME OVER"; drawText(tw,(W-textW(tw)*2)/2,100,'#ffffff',2);
  }
  if(G.state==='castledone'){
    const tw="COURSE CLEAR!"; drawText(tw,(W-textW(tw)*2)/2,70,'#ffffff',2);
  }
}
function render(){
  drawBackground();
  drawTiles();
  drawFlagAndCastle();
  drawEntities();
  drawPlayer();
  drawParticles();
  drawHUD();
  drawOverlays();
}


/* =====================================================================
   MAIN LOOP / BOOT
   ===================================================================== */
let last=performance.now(), acc=0;
function loop(now){
  acc+=now-last; last=now;
  let guard=0;
  while(acc>=1000/FPS && guard++<5){ update(); acc-=1000/FPS; }
  render();
  requestAnimationFrame(loop);
}
CV.addEventListener('click',()=>{ AudioM.ensure(); if(!AudioM.started){AudioM.startMusic();AudioM.started=true;} });
addEventListener('keydown', e=>{ if(!AudioM.started){ AudioM.ensure(); AudioM.startMusic(); AudioM.started=true; } });
init();
requestAnimationFrame(loop);


// ---- gameplay diagnostics ----
init();
console.log('spawn y='+G.player.y+' tile(12,2)='+tile(12,2)+' solidAt(192,32)='+solidAt(192,32));
for(let i=0;i<5;i++){ update(); console.log('f'+i+' onGround='+G.player.onGround+' y='+G.player.y.toFixed(2)+' vy='+G.player.vy.toFixed(2)); }
// 1) idle: player should settle on ground
for(let i=0;i<120;i++) update();
console.log('T1 grounded=',G.player.onGround,'y=',G.player.y,'cam=',G.cam.x.toFixed(1));
if(!G.player.onGround) throw new Error('FAIL: player not grounded after idle');
// 2) jump: player should leave ground then return
const y0=G.player.y; for(let i=0;i<8;i++) update();
G.player.onGround=true; Input.jumpPressed=true;
let maxUp=0;
for(let i=0;i<120;i++){ update(); maxUp=Math.max(maxUp,y0-G.player.y); }
console.log('T2 jumpHeight='+maxUp.toFixed(0)+' acmeReached='+(maxUp>16).toString());
if(maxUp<24) throw new Error('FAIL: jump too weak');
// 3) run right a long distance (level traversal, no crash)
Input.right=true; Input.run=true;
for(let i=0;i<2400;i++){ update(); if(G.state!=='playing') break; }
const reached=G.cam.x;
console.log('T3 camAfterRun='+reached.toFixed(0)+' state='+G.state+' score='+G.score);
Input.right=false; Input.run=false;
// 4) big mario breaks a brick above
G.player.form='big'; G.player.h=31; G.player.y=GROUND_TOP*TILE-31; G.player.vx=0;
G.entities=[];
const aboveCol=16; const aboveRow=10;
G.level.map[aboveRow][aboveCol]='B';
G.player.x=aboveCol*TILE+2; G.player.y=aboveRow*TILE+1; G.player.vy=-0.1;
Input.jump=false; Input.jumpPressed=false;
for(let i=0;i<10;i++) update();
const brickGone = G.level.map[aboveRow][aboveCol]==='.';
console.log('T4 bigBrokeBrickAbove=',brickGone);
if(!brickGone) throw new Error('FAIL: big mario did not break brick');
console.log('DIAG OK score='+G.score+' lives='+G.lives+' state='+G.state);
