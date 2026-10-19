const assert=require('node:assert/strict');
const {ev,$,notes}=require('./headless.js');
const originalRandom=Math.random;
let seed=10414;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
try{
  assert.equal(ev('LIS_SRC.filter(s=>s.mel).length'),18);
  for(const id of ['me1','me2','m1','me3','me4','m2','me5','me6','m4','me7','me8','m5'])for(const scale of ['ion','aeo']){
    ev(`progress=validateProgress({lis:{pick:['${id}'],melodyScale:'${scale}'}});lisRoot=48;lisScale=pickLisScale(lisPicks());recentMel=[];`);
    assert.equal(ev('lisScale'),scale);
    const pool=ev('melodyPool(lisPicks()[0],lisScale)'),seen=new Set();let adjacent=0;
    for(let i=0;i<400;i++){
      const q=ev('lisMakeItem().q');
      assert.equal(q.scale,scale);assert.equal(q.cls.length,ev('lisPicks()[0].mel'));
      for(const c of q.cls){assert.ok(pool.includes(c));seen.add(c);}
      if(id.startsWith('me')){
        for(let j=1;j<q.cls.length;j++){
          const gap=Math.abs(pool.indexOf(q.cls[j-1])-pool.indexOf(q.cls[j]));
          assert.ok(gap===1||gap===2);assert.ok(Math.abs(q.offs[j]-q.offs[j-1])<=4);
          if(gap===1)adjacent++;
        }
      }
    }
    assert.equal(seen.size,ev('lisPicks()[0].melRange || 7'));
    if(id.startsWith('me'))assert.ok(adjacent>220*(ev('lisPicks()[0].mel')-1));
    ev('saveProgress()');assert.equal(ev('loadProgress().lis.melodyScale'),scale);
    assert.deepEqual(ev('loadProgress().lis.pick'),[id]);
  }
  ev(`progress=validateProgress({melodyScale:'aeo',lis:{pick:['me1'],melodyScale:'mix'}});`);
  assert.equal(ev('progress.melodyScale'),'aeo');
  const scales=new Set(Array.from({length:40},()=>ev('pickLisScale(lisPicks())')));
  assert.deepEqual([...scales].sort(),['aeo','ion']);
  assert.equal(ev('lisMelodyScales(LIS_SRC.find(s=>s.id==="m3")).length'),5);
  // Marks from harder courses must not leak wide intervals, extra degrees, or another scale into easy practice.
  ev(`progress=validateProgress({lis:{pick:['me1'],melodyScale:'aeo',focusOn:true,focus:[
    {srcId:'m1',q:{type:'mel',cls:[0,7],scale:'aeo'}},
    {srcId:'m1',q:{type:'mel',cls:[7,8],scale:'aeo'}},
    {srcId:'m1',q:{type:'mel',cls:[0,2],scale:'ion'}},
    {srcId:'me1',q:{type:'mel',cls:[0,2],scale:'aeo'}}]}});lisScale='aeo';lisRoot=48;`);
  assert.deepEqual(ev('progress.lis.focus.map(f=>lisFocusMatches(f,lisPicks()[0],true))'),[false,false,false,true]);
  assert.equal(ev(`lisCleanFocus([{srcId:'me1',q:{type:'mel',cls:[0,7],scale:'aeo'}}]).length`),0);
  const qs=Array.from({length:1000},()=>ev('lisMakeItem().q'));
  assert.ok(qs.every(q=>q.scale==='aeo'&&q.cls.every(c=>[0,2,3,5,7].includes(c))&&Math.abs(q.offs[0]-q.offs[1])<=4));
  assert.ok(qs.filter(q=>q.cls.join() === '0,2').length>200,'mark boosts compatible phrase');
  // The actual resolution audio follows the recorded scale, independent of quiz/listening preferences.
  notes.length=0;ev(`ensureAudio();lisPlayItem({type:'mel',cls:[5,7],offs:[5,7],root:48,scale:'aeo'},0,'down')`);
  assert.deepEqual(notes.slice(-4).map(n=>n[0]-48),[7,8,10,12]);
  // Drive the real scheduler with a fake clock so cancellation and the four-phrase boundary are observable.
  const oldSet=global.setTimeout,oldClear=global.clearTimeout;
  let clock=0,tid=0;const tasks=new Map();
  global.setTimeout=(fn,ms)=>{tasks.set(++tid,{fn,at:clock+ms});return tid;};
  global.clearTimeout=id=>tasks.delete(id);
  const tick=()=>{const [id,t]=[...tasks.entries()].sort((a,b)=>a[1].at-b[1].at)[0]||[];assert.ok(t);tasks.delete(id);clock=t.at;t.fn();};
  try{
    ev(`progress=validateProgress({melodyScale:'aeo',lis:{pick:['me1'],melodyScale:'aeo',fixedKey:true,keyEvery:4}});showListen();ensureAudio();lisOn=true;`);
    notes.length=0;ev('lisStep()');
    assert.deepEqual(notes.slice(-8).map(n=>n[0]-60),[0,2,3,5,7,8,10,12],'full minor scale at key start');
    tick();tick(); // first melody and answer reveal
    assert.equal(ev('lisHist.length'),1);
    ev('lisToggleFocus(lisCurrent)');
    assert.equal(ev('loadProgress().lis.focus[0].srcId'),'me1');
    assert.equal(ev('reviewCandidates()[0].stageId'),'me1','mark is available in answer-based review');
    assert.equal(ev('reviewCandidates()[0].q.scale'),'aeo');
    for(let i=0;i<3;i++){tick();tick();}
    assert.equal(ev('lisHist.length'),4);
    notes.length=0;tick();
    assert.deepEqual(notes.slice(-8).map(n=>n[0]-60),[0,2,3,5,7,8,10,12],'next key anchor after four phrases');
    ev('setLisMelodyScale("ion")');assert.equal(tasks.size,0,'changing scale cancels pending phrase and reveal');
    assert.equal(ev('lisOn'),false);assert.equal(ev('lisScale'),null);assert.equal(ev('lisCount'),0);
    assert.equal(ev('progress.lis.focus.length'),1,'changing scale preserves weakness');
    assert.equal(ev('progress.melodyScale'),'aeo','quiz preference preserved');
    notes.length=0;ev('lisOn=true;lisStep()');
    assert.deepEqual(notes.slice(-8).map(n=>n[0]-60),[0,2,4,5,7,9,11,12]);
    tick();tick();assert.equal(ev('lisHist[0].q.scale'),'ion');
    notes.length=0;ev('lisReplay(1)');assert.equal(tasks.size,0);
    assert.equal(notes[1][0]-60,3,'history replay establishes its original minor key');
    ev('lisSetPick(["me2"])');assert.equal(ev('lisCount'),0);assert.equal($('lisMelodyLevel').value,'me2');
    ev('startReviewListening()');
    assert.equal($('lisMelodyQuick').hidden,true,'review cannot be confused with preset selection');
    assert.equal(ev('Object.keys(progress.stats).length'),0,'listening never invents quiz results');
    ev('lisStop();showListen();lisSetPick([])');assert.equal(ev('progress.lis.pick.length'),0);
  }finally{global.setTimeout=oldSet;global.clearTimeout=oldClear;}
}finally{Math.random=originalRandom;}
console.log('PASS: all melody levels/scales, constrained focus, persistence, minor resolution, scale anchors, timer cancellation, history replay and shared review');
