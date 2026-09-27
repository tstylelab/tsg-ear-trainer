const assert=require('node:assert/strict');
const {ev,$,notes}=require('./headless.js');
ev(`progress=validateProgress(null); ensureAudio();
  globalThis.defer=later; later=fn=>fn();
  globalThis.fixtures=[
    {stageId:'s13',q:{type:'deg',root:60,cls:8,off:-4,down:true,noRoot:false},playMode:'melodic',misses:3,lastMiss:Date.now(),updated:Date.now(),streak:0},
    {stageId:'c2',q:{type:'chord',root:48,chord:'dim'},playMode:'melodic',misses:2,lastMiss:Date.now(),updated:Date.now()},
    {stageId:'m1',q:{type:'mel',root:48,cls:[0,3],offs:[0,3],scale:'aeo'},playMode:'melodic',misses:1,lastMiss:Date.now(),updated:Date.now()},
    {stageId:'s11',q:{type:'deg',root:52,cls:7,off:19,down:false,noRoot:true},playMode:'harmonic',misses:1,lastMiss:Date.now(),updated:Date.now()}
  ];
`);
assert.equal(ev('cleanReview(globalThis.fixtures).length'),4);
assert.equal(ev('cleanReview([{},null,{stageId:"bad",q:{}}]).length'),0);
ev(`globalThis.bulk=[];
for(const st of STAGES.filter(s=>s.pool))for(const cls of st.pool)for(const down of [false,true])for(const noRoot of [false,true])for(const playMode of ['melodic','harmonic','both'])
  globalThis.bulk.push({stageId:st.id,q:{type:'deg',root:down?60:48,cls,down,noRoot,off:degOffset(cls,down)},playMode,misses:1,updated:Date.now()});`);
assert.equal(ev('cleanReview(globalThis.bulk).length'),128,'bounded persistent records');
assert.equal(ev('cleanReview([{...globalThis.fixtures[0],q:{...globalThis.fixtures[0].q,root:999}}]).length'),0);
ev('progress.review=cleanReview(globalThis.fixtures);saveProgress()');
assert.deepEqual(ev('loadProgress().review'),ev('progress.review'));
assert.equal(ev('cleanReview(progress.review.concat(progress.review)).length'),4,'idempotent import');
assert.ok(ev('reviewWeight({...progress.review[0],streak:3}) < reviewWeight(progress.review[0])'));
const queue=ev('reviewQueue(10)');assert.equal(queue.length,10);
assert.equal(new Set(queue.slice(0,4).map(x=>x.stageId)).size,4,'first cycle covers different items');
assert.ok(queue.every((x,i)=>!i||x.stageId!==queue[i-1].stageId),'no immediate repeats with alternatives');
ev('progress.bestRate={s13:90};progress.best={s13:9};progress.lastStage="s1";');
for(const n of [5,10]){
  ev(`startReview(${n})`);
  assert.equal(ev('phase'),'reviewReady');
  assert.equal(ev('progress.lastStage'),'s1');
  for(let i=0;i<n;i++){
    const before=ev('answersLog.length');ev('onAnswerTap(0)');
    assert.equal(ev('answersLog.length'),before,'cannot answer before playback');
    ev('playReviewQuestion()');assert.equal(ev('phase'),'q');
    ev(`if(curQ.type==='mel')curQ.cls.forEach(c=>onAnswerTap(c));else onAnswerTap(curQ.type==='chord'?curQ.chord:curQ.cls);`);
    assert.equal(ev('phase'),'reveal');ev('onNext()');
  }
  assert.equal(ev('phase'),'result');assert.equal(ev('score'),n);
  assert.deepEqual(ev('progress.bestRate'),{s13:90});
  assert.deepEqual(ev('progress.best'),{s13:9});
  assert.equal($('nextStageBtn').hidden,true);
}
ev('showSelect(); enterStage(STAGES.find(s=>s.id==="s13")); curQ={type:"deg",root:60,cls:8,off:-4,down:true};phase="q";scaleUsed=false;');
const misses=ev('progress.review.find(r=>r.stageId==="s13").misses');
ev('answer(7)');assert.equal(ev('progress.review.find(r=>r.stageId==="s13").misses'),misses+1);
ev('phase="q"; scaleUsed=true; answer(7)');
assert.equal(ev('progress.review.find(r=>r.stageId==="s13").misses'),misses+1,'assisted attempts excluded');
ev('showSelect(); progress=validateProgress(null);progress.lis.focus=lisCleanFocus([{srcId:"s13",q:{type:"deg",cls:8,down:true,minor:true,noRoot:false}}]);');
assert.equal(ev('reviewCandidates().length'),1,'existing manual focus participates');
ev('startReview(5);playReviewQuestion();answer(8)');
assert.equal(ev('reviewCandidates()[0].streak'),1,'manual focus also learns from correct answers');
ev('startReview(5);playReviewQuestion();answer(7)');assert.equal(ev('progress.review.length'),1);
assert.equal(ev('reviewCandidates().length'),1,'manual + automatic deduplicated');

// Use fake timers to verify scheduling and stop paths without waiting for audio.
ev('showListen();progress.review=cleanReview(globalThis.fixtures);progress.lis.focus=[];');
const snapshot=ev('JSON.stringify(progress.review)');
const oldSet=global.setTimeout,oldClear=global.clearTimeout;
let tasks=new Map(),tid=0;
global.setTimeout=(fn,ms)=>{tasks.set(++tid,{fn,ms});return tid;};
global.clearTimeout=id=>tasks.delete(id);
try{
  ev('lisReviewMode=true;lisOn=true;reviewListeningStep()');
  assert.equal(tasks.size,2);
  const reveal=[...tasks.values()].sort((a,b)=>a.ms-b.ms)[0];reveal.fn();
  assert.equal(ev('lisHist.length'),1);
  assert.ok(ev('lisHist[0].q.reviewId'));
  assert.equal(ev('JSON.stringify(progress.review)'),snapshot,'listening is not a correct answer');
  ev('lisToggleFocus(lisHist[0])');assert.equal(ev('progress.review.filter(r=>r.manual).length'),1);
  ev('lisToggleFocus(lisHist[0])');assert.equal(ev('progress.review.filter(r=>r.manual).length'),0);
  ev('lisPause()');assert.equal(tasks.size,0,'pause cancels review timers');
  ev('showListen()');assert.equal(ev('lisReviewMode'),false);
}finally{global.setTimeout=oldSet;global.clearTimeout=oldClear;}
ev(`showSelect();progress=validateProgress(null);progress.review=cleanReview([globalThis.fixtures[0]]);
progress.lis.focus=lisCleanFocus([{srcId:'s13',q:{type:'deg',cls:8,down:true,minor:true,noRoot:false}}]);
globalThis.restoreReview=dismissReview(reviewKey(progress.review[0]));`);
assert.equal(ev('reviewCandidates().length'),0,'dismiss removes merged automatic and manual review');
assert.equal(ev('progress.lis.focus.length'),0,'ordinary listening focus also removed');
assert.equal(ev('progress.review[0].misses'),3,'history preserved');
assert.equal(ev('loadProgress().review[0].excluded'),true,'dismissal persists');
assert.equal(ev('reviewQueue(10).length'),0,'dismissed problems cannot enter answer queue');
ev('globalThis.restoreReview()');
assert.equal(ev('reviewCandidates().length'),1,'undo restores review');
assert.equal(ev('progress.lis.focus.length'),1,'undo restores manual focus');
ev(`dismissReview(reviewKey(progress.review[0]));
enterStage(STAGES.find(s=>s.id==='s13'));curQ={type:'deg',root:60,cls:8,off:-4,down:true};
phase='q';scaleUsed=false;answer(8);`);
assert.equal(ev('reviewCandidates().length'),0,'correct answer does not reactivate');
ev('phase="q";answer(7)');
assert.equal(ev('reviewCandidates().length'),1,'new mistake reactivates');
assert.equal(ev('progress.review[0].misses'),4,'old mistake history retained');
ev(`dismissReview(reviewKey(progress.review[0]));lisToggleFocus({src:{id:'s13'},q:{type:'deg',cls:8,down:true,minor:true,noRoot:false}});`);
assert.equal(ev('reviewCandidates().length'),1,'explicit manual registration reactivates');
ev('progress=validateProgress(null);renderReviewEntries()');
assert.ok($('homeReview').children[2].children.every(b=>b.disabled),'empty state never invents failures');
console.log('PASS: exact conditions, persistence/import, priority decay, cross-course 5/10, score isolation, manual merge, listening/stop, empty state');
