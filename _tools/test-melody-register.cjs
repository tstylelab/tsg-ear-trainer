const assert=require('node:assert/strict');
const {ev,notes}=require('./headless.js');
const originalRandom=Math.random;
let seed=1016;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
try{
  assert.equal(ev('melodyRoot(true)'),60,'fixed C is middle C, not C3');
  const roots=new Set(Array.from({length:600},()=>ev('melodyRoot(false)')));
  assert.deepEqual([...roots].sort((a,b)=>a-b),Array.from({length:12},(_,i)=>55+i));
  for(const id of ev('STAGES.filter(s=>s.mel).map(s=>s.id)')){
    ev(`progress=validateProgress({melodyScale:'aeo'});enterStage(STAGES.find(s=>s.id==='${id}'));startRound();`);
    const root=ev('roundRoot');assert(root>=55&&root<=66);
    for(let i=0;i<100;i++){
      const q=ev('makeQuestion()');assert.equal(q.root,root,'no pitch jumps within a round');
      assert(q.offs.every(o=>q.root+o>=51&&q.root+o<=78));
    }
  }
  for(const id of ['me7','me8','m5'])for(const scale of ['ion','aeo']){
    ev(`progress=validateProgress({lis:{pick:['${id}'],fixedKey:false,melodyScale:'${scale}'}});lisRoot=66;lisScale='${scale}';`);
    assert(ev('lisPickRoot(lisPicks())')>=55);
    const q=ev('lisMakeItem().q');assert.equal(q.cls.length,5);
    ev(`progress.review=[{stageId:'${id}',q:${JSON.stringify(q)},misses:1,lastMiss:Date.now(),updated:Date.now()}];saveProgress()`);
    assert.equal(ev('loadProgress().review[0].q.root'),66,'higher phrases survive persistence');
    ev('startReview(5)');assert.equal(ev('roundRoot'),66);
    assert.equal(ev('roundScale'),scale);
    assert.equal(ev('curQ.cls.length'),5);
    ev('showSelect()');
  }
  // Cadence and scale aids stay inside the recorded range at the highest new root.
  notes.length=0;ev("ensureAudio();playCadence(66,false,0);playScaleWalk(66,MAJ7,false,5)");
  assert(notes.every(n=>n[0]>=36&&n[0]<=84));
  // Single-note, mixed listening and legacy reviews retain their original register.
  ev("progress=validateProgress({lis:{pick:['s1'],fixedKey:true}})");
  assert.equal(ev('lisPickRoot(lisPicks())'),48);
  ev("progress.lis.pick=['me7','s8']");assert.equal(ev('lisPickRoot(lisPicks())'),60);
  ev("progress=validateProgress({unlockMode:'seq',unlockChosen:true,bestRate:{m5:90}})");
  assert.equal(ev('isUnlocked(STAGES.find(s=>s.id==="m5"))'),true);
}finally{Math.random=originalRandom;}
console.log('PASS: middle/high melody register, full key coverage, stable rounds, five-note review persistence and old-course compatibility');
