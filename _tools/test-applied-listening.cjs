const assert=require('node:assert/strict');
const {ev,$,notes}=require('./headless.js');
const oldRandom=Math.random,oldSet=global.setTimeout,oldClear=global.clearTimeout;
let seed=1019,clock=0,tid=0;const tasks=new Map();
Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
global.setTimeout=(fn,ms)=>{tasks.set(++tid,{fn,at:clock+ms});return tid;};
global.clearTimeout=id=>tasks.delete(id);
const tick=()=>{const [id,t]=[...tasks.entries()].sort((a,b)=>a[1].at-b[1].at)[0]||[];assert(t);tasks.delete(id);clock=t.at;t.fn();};
try{
  for(const id of ['t1','t2','t3','t4','t5']){
    const every=id==='t4'?6:4;
    ev(`progress=validateProgress({lis:{pick:['s3'],cad:'each',reso:'both',fixedKey:true,keyEvery:8}});showListen();lisSetPick(['${id}']);ensureAudio();`);
    assert.equal($('lisMelodyLevel').value,id,'quick picker selects the same named course');
    assert.equal($('lisTonicMode').hidden,true,'no conflicting reference controls');
    assert($('lisTonicNote').textContent.includes(every+'問'));
    assert.equal(ev('loadProgress().lis.pick[0]'),id);
    assert.equal(ev('lisMemoryEvery()'),every);
    notes.length=0;ev('lisOn=true;lisStep()');
    assert(notes.length>1,'initial key anchor');
    notes.length=0;tick();assert.equal(notes.length,1);
    const root=ev('lisRoot');assert(root>=52&&root<=60);
    for(let i=0;i<every;i++){
      tick();assert.equal(ev('lisHist[0].q.root'),root);
      assert.equal(ev('lisHist[0].q.noRoot'),true);
      notes.length=0;tick();
      assert.equal(notes.length>1,i===every-1,'anchor follows exactly the chosen number of questions');
      if(i<every-1)assert.equal(notes.length,1,'no hidden reference or resolution');
    }
    ev('confirmLisTonic()');assert.equal(tasks.size,0);
    ev("lisSetPick(['s3'])");assert.equal(tasks.size,0);
    assert.equal(ev('lisMemoryMode()'),false);
    assert.equal($('lisTonicMode').hidden,false);
    assert.deepEqual(ev('[progress.lis.cad,progress.lis.reso,progress.lis.fixedKey,progress.lis.keyEvery]'),['each','both',true,8]);
  }
  // A wide target keeps its octave through history, marks, persistence and shared review.
  ev("progress=validateProgress({lis:{pick:['t5']}});showListen();ensureAudio();lisRoot=60");
  const offsets=new Set();
  for(let i=0;i<1000;i++){
    const it=ev('lisMakeItem()');offsets.add(it.q.off);
    assert(it.q.root+it.q.off>=40&&it.q.root+it.q.off<=84);
    notes.length=0;ev(`lisPlayItem(${JSON.stringify(it.q)},0,'off')`);
    assert.equal(notes.length,1);assert.equal(notes[0][0],it.q.root+it.q.off);
  }
  assert([...offsets].some(o=>o>12)&&[...offsets].some(o=>o<0));
  ev("globalThis.wideItem={src:LIS_SRC.find(s=>s.id==='t5'),q:{type:'deg',cls:7,off:19,root:60,down:false,noRoot:true,minor:false}};lisHistPush(globalThis.wideItem);lisToggleFocus(globalThis.wideItem)");
  assert.equal(ev('loadProgress().lis.focus[0].q.off'),19);
  assert.equal(ev('reviewCandidates()[0].q.off'),19);
  assert.equal(ev('reviewCandidates()[0].stageId'),'t5');
  notes.length=0;ev("lisReplay(0)");assert.equal(notes[1][0],79,'history preserves exact pitch');
  ev("startReview(5)");assert.equal(ev('curQ.off'),19);assert.equal(ev('curQ.noRoot'),true);
  ev('showSelect()');
  assert.equal(ev("lisFocusMatches(progress.lis.focus[0],LIS_SRC.find(s=>s.id==='t4'),true)"),false,'wide marks do not leak into narrow courses');
  assert.equal(ev("lisCleanFocus([{srcId:'t5',q:{type:'deg',cls:7,off:18,down:false,noRoot:true,minor:false}}]).length"),0);
  assert.deepEqual(ev("validateProgress({lis:{pick:['s3','t4','t5']}}).lis.pick"),['t5'],'exclusive presets survive reload');
  ev("progress=validateProgress({unlockMode:'seq',unlockChosen:true,bestRate:{t3:100}})");
  assert.equal(ev("isUnlocked(STAGES.find(s=>s.id==='t4'))"),true);
  assert.equal(ev("isUnlocked(STAGES.find(s=>s.id==='t5'))"),false);
  ev('progress.bestRate.t4=100');assert.equal(ev("isUnlocked(STAGES.find(s=>s.id==='t5'))"),true);
}finally{ev('lisStop()');Math.random=oldRandom;global.setTimeout=oldSet;global.clearTimeout=oldClear;}
console.log('PASS: applied listening presets, exact 4/6 timing, wide pitches, history, shared review, incompatible marks, persistence and progression');
