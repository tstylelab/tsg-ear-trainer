const assert=require('node:assert/strict');
const {ev,$,notes}=require('./headless.js');
ev(`progress=validateProgress(null);ensureAudio();globalThis.pending=[];
later=fn=>globalThis.pending.push(fn);clearAdv=()=>{globalThis.pending=[];};
globalThis.drones=0;startDrone=()=>globalThis.drones++;
globalThis.flush=()=>{let n=0;while(globalThis.pending.length){if(++n>30)throw Error('timer loop');globalThis.pending.shift()();}};`);
assert.equal(ev('validateProgress({lis:{tonicMode:"junk"}}).lis.tonicMode'),'each');
assert.equal(ev('validateProgress({lis:{tonicMode:"memory"}}).lis.tonicMode'),'memory');
// All three new courses ignore conflicting global aids without overwriting preferences.
for(const id of ['t1','t2','t3']){
  ev(`progress=validateProgress({scaffold:4,rootEvery:1,cadEvery:'each',traceAns:'on',playMode:'both'});
  enterStage(STAGES.find(s=>s.id==='${id}'));startRound();`);
  assert.equal(ev('phase'),'listen');
  assert.equal(ev('globalThis.drones'),0,'no drone during memory course');
  assert.equal($('rootBtn').hidden,false);
  ev('globalThis.flush()');
  const root=ev('roundRoot');
  for(let i=1;i<=9;i++){
    if(i>1){notes.length=0;ev('nextQuestion()');}
    if(i===5||i===9){
      assert.equal(ev('phase'),'listen','new anchor at four-question boundary');
      const count=ev('answersLog.length');ev('answer(curQ.cls)');
      assert.equal(ev('answersLog.length'),count,'answer locked during anchor');
      assert.ok(notes.length>1,'cadence precedes boundary question');
      ev('globalThis.flush()');
    }else if(i>1)assert.equal(notes.length,1,'no hidden root/cadence between anchors');
    assert.equal(ev('phase'),'q');assert.equal(ev('rootShown()'),false);
    assert.equal(ev('roundRoot'),root,'key retained within round');
    notes.length=0;ev('playStimulus()');assert.equal(notes.length,1,'replay has only target even in harmonic mode');
    assert.equal($('scaleBtn').hidden,true);
    notes.length=0;ev('answer(curQ.cls);globalThis.flush()');assert.equal(notes.length,0,'correct feedback never gives tonic away');
  }
  ev('nextQuestion();confirmQuizTonic();confirmQuizTonic()');
  assert.equal(ev('scaleCount'),1,'one assisted question despite repeated confirmation');
  const score=ev('score');ev('answer(curQ.cls)');assert.equal(ev('score'),score,'manual tonic is assisted');
  assert.equal(ev('progress.review.length'),0,'assisted answer does not create weakness');
  ev('nextQuestion();answer((curQ.cls+1)%12);globalThis.flush()');
  assert.equal(ev('progress.review[0].stageId'),id);
  assert.equal(ev('progress.review[0].q.noRoot'),true,'memory condition saved');
  assert.equal(ev('loadProgress().review[0].q.noRoot'),true);
  assert.equal(ev('progress.rootEvery'),1);assert.equal(ev('progress.scaffold'),4);
  ev('showSelect()');
}
// Fake clock runs the actual listening scheduler, including stop and resume.
const oldSet=global.setTimeout,oldClear=global.clearTimeout;
let clock=0,tid=0;const tasks=new Map();
global.setTimeout=(fn,ms)=>{tasks.set(++tid,{fn,at:clock+ms});return tid;};
global.clearTimeout=id=>tasks.delete(id);
function tick(){const [id,t]=[...tasks.entries()].sort((a,b)=>a[1].at-b[1].at)[0]||[];assert.ok(t,'scheduled task');tasks.delete(id);clock=t.at;t.fn();}
try{
  ev(`progress=validateProgress({lis:{cad:'each',reso:'both',keyEvery:8,pick:['s13']}});showListen();setLisTonicMode('memory');`);
  assert.equal(ev('loadProgress().lis.tonicMode'),'memory');
  assert.equal($('lisTonic').disabled,true,'no reference before first key');
  notes.length=0;ev('lisOn=true;lisStep()');assert.ok(notes.length>1,'initial anchor');
  assert.equal($('lisTonic').disabled,false);
  notes.length=0;tick();assert.equal(notes.length,1,'first target without root or resolution');
  for(let i=0;i<4;i++){
    tick(); // answer reveal
    assert.equal(ev('lisHist[0].q.noRoot'),true);
    notes.length=0;tick(); // next item / next anchor
    assert.equal(notes.length>1,i===3,'anchor only after fourth item');
  }
  ev('confirmLisTonic()');assert.equal(tasks.size,0,'manual reference cancels both timers');
  assert.equal(ev('lisOn'),false);assert.equal(ev('progress.stats.d8'),undefined,'listening does not fabricate scores');
  ev('lisOn=true;lisStep();lisStop()');assert.equal(tasks.size,0,'stop cancels timers after resume');
  ev(`lisToggleFocus({srcId:'s13',q:{type:'deg',cls:8,down:true,minor:true,noRoot:true}})`);
  assert.equal(ev('loadProgress().lis.focus.length'),1,'memory marks survive validation/reload');
  assert.equal(ev('reviewCandidates()[0].q.noRoot'),true,'memory listening feeds shared review');
  assert.equal(ev('lisFocusMatches(progress.lis.focus[0],LIS_SRC.find(s=>s.id==="s13"),true)'),true);
  ev('setLisTonicMode("each")');
  assert.equal(ev('lisFocusMatches(progress.lis.focus[0],LIS_SRC.find(s=>s.id==="s13"),true)'),false,'does not mix supported and unsupported conditions');
  assert.deepEqual(ev('[progress.lis.cad,progress.lis.reso,progress.lis.keyEvery]'),['each','both',8],'original settings retained');
  notes.length=0;ev('lisPlayItem(lisMakeItem().q,0,"off")');assert.equal(notes.length,2,'normal mode root restored');
  ev('lisReviewMode=true;progress.lis.tonicMode="memory"');assert.equal(ev('lisMemoryMode()'),false,'mixed review preserves recorded conditions');
}finally{global.setTimeout=oldSet;global.clearTimeout=oldClear;}
console.log('PASS: 3 memory courses, four-question anchors, answer gate, assistance, stored conditions, listening scheduler, reference/pause, mode restoration and focus matching');
