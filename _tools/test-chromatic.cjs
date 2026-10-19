const assert=require('node:assert/strict');
const {ev,$,notes}=require('./headless.js');
let seed=173;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
ev(`globalThis.pending=[];later=fn=>pending.push(fn);clearAdv=()=>{pending=[];};globalThis.flush=()=>{let n=0;while(pending.length){if(++n>40)throw Error('timer loop');pending.shift()();}};`);
for(const n of [2,3,4,5])for(const kind of ['one','all'])for(const mode of ['ion','aeo','mix']){
 const id=`mc${n}${kind}`;
 ev(`progress=validateProgress({bestRate:{m1:95},melodyBest:{m1:{ion:90}},melodyScale:'${mode}',scaffold:0,cadEvery:'first'});enterStage(STAGES.find(s=>s.id==='${id}'));startRound();flush();`);
 assert.equal(ev('progress.bestRate.m1'),95);assert.equal(ev('progress.melodyBest.m1.ion'),90);
 const seen=new Set();
 for(let i=0;i<120;i++){
  const q=ev('makeQuestion()');
  assert.equal(q.cls.length,n);q.cls.forEach(c=>seen.add(c));
  assert.deepEqual(q.offs,q.cls,'12 pitch classes remain within one octave');
  if(kind==='one')assert.equal(ev(`(${JSON.stringify(q.cls)}).filter(c=>!SCALES[roundScale].iv.includes(c)).length`),1);
 }
 assert.equal(seen.size,12,'all twelve classes can appear even in the entry course');
 for(let i=0;i<5;i++){
  notes.length=0;ev('nextQuestion()');assert.equal(ev('phase'),'listen');assert(notes.length>n);
  assert.equal($('cadBtn').hidden,true);ev('flush()');assert.equal(ev('phase'),'q');
 }
 ev('melInput=curQ.cls.map(c=>(c+1)%12);melJudge();');
 assert.equal(ev(`reviewCandidates().some(r=>r.stageId==='${id}')`),true);
 ev(`progress.lis.pick=['${id}'];progress.lis.melodyScale='${mode}';progress.lis.tonicMode='memory';progress.lis.cad='off';showListen();ensureAudio();lisRoot=60;lisScale='ion';`);
 assert.equal(ev('lisMemoryMode()'),false,'old memory preference cannot suppress chromatic reference');
 assert.equal($('lisTonicMode').hidden,true);
 const item=ev('lisMakeItem()');assert.equal(item.src.id,id);assert.equal(item.q.cls.length,n);
 ev(`lisHistPush(${JSON.stringify(item)});lisToggleFocus(lisHist[0]);saveProgress();`);
 assert.equal(ev('loadProgress().lis.focus.length'),1);
}
// Every listening phrase receives a fresh reference, including with cad=off saved.
ev(`globalThis.refs=[];playChromaticKey=(root,scale,t)=>{refs.push(scale);return 1;};progress=validateProgress({lis:{pick:['mc2one'],cad:'off',tonicMode:'memory'}});showListen();ensureAudio();lisOn=true;lisCount=1;lisSince=0;lisRoot=60;lisScale='ion';lisStep();lisStop();`);
assert.equal(ev('refs.length'),1);
ev(`progress=validateProgress({unlockMode:'seq',unlockChosen:true,melodyBest:{mc2one:{ion:100,aeo:100,mix:100}}});`);
assert.equal(ev(`isUnlocked(STAGES.find(s=>s.id==='mc2all'))`),true);
assert.equal(ev(`isUnlocked(STAGES.find(s=>s.id==='mc3one'))`),false);
console.log('PASS: eight chromatic courses, 12-class coverage, exactly one outside tone, per-question reference, listening, review and preserved records');
