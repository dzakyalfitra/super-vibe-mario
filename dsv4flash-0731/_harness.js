// Node runtime smoke-test harness with browser API stubs
const fs = require('fs');

function makeCtx(){
  return {
    fillStyle:'', globalAlpha:1, globalCompositeOperation:'source-over', imageSmoothingEnabled:false,
    fillRect(){}, drawImage(){}, beginPath(){}, moveTo(){}, quadraticCurveTo(){}, closePath(){}, fill(){},
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),
    putImageData(){}, translate(){}, scale(){}, strokeRect(){}, stroke(){}, clearRect(){},
    save(){}, restore(){}
  };
}
function makeCanvas(){
  return { width:256,height:240, style:{}, addEventListener(){}, getContext:()=>makeCtx() };
}
global.document = { getElementById:()=>makeCanvas(), createElement:()=>makeCanvas() };
global.window = global;
global.performance = { now:()=>Date.now() };
global.requestAnimationFrame = ()=>{};
global.addEventListener = ()=>{};
class FakeAC {
  constructor(){ this.state='running'; this.currentTime=0; this.destination={}; }
  createGain(){ return { gain:{value:1}, connect:()=>{} } }
  createOscillator(){ return { type:'', frequency:{ setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect:()=>{}, start(){}, stop(){} } }
  resume(){}
}
global.AudioContext = FakeAC; global.webkitAudioContext=FakeAC;
global.setInterval=()=>0; global.clearInterval=()=>{};

const html = fs.readFileSync(__dirname+'/index.html','utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if(!m){ console.log('no script found'); process.exit(2); }
const src = m[1] + "\n";
const epilogue = `
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
`;
fs.writeFileSync(__dirname+'/_bundle.js', src + epilogue);
require(__dirname+'/_bundle.js');
