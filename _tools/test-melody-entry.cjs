const assert = require('node:assert/strict');
const {ev,$,notes}=require('./headless.js');
const originalRandom=Math.random;
let seed=1426;
Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
ev(`globalThis.pending=[];later=fn=>globalThis.pending.push(fn);
clearAdv=()=>{globalThis.pending=[];};
globalThis.flush=()=>{let n=0;while(globalThis.pending.length){if(++n>40)throw Error('timer loop');globalThis.pending.shift()();}};`);
try{
  assert.equal(ev('validateProgress({melodyScale:"invalid"}).melodyScale'),'ion');
  ev(`progress=validateProgress({bestRate:{m1:90,m2:80},mastered:{m4:true},melodyScale:'aeo'});saveProgress();`);
  assert.equal(ev('loadProgress().bestRate.m1'),90);
  assert.equal(ev('loadProgress().bestRate.m2'),80);
  assert.equal(ev('loadProgress().mastered.m4'),true);
  assert.equal(ev('loadProgress().melodyScale'),'aeo');
  for(const scale of ['ion','aeo'])for(const id of ['me1','me2','m1','me3','me4','m2','me5','me6','m4','me7','me8','m5']){
    ev(`progress=validateProgress({melodyScale:'${scale}'});enterStage(STAGES.find(s=>s.id==='${id}'));`);
    assert.equal($('quizMelodyChoice').hidden,false);
    assert.equal($('answers').children.filter(b=>!b.disabled).length,ev('curStage.melRange || 7'));
    notes.length=0;ev('startRound();globalThis.flush()');
    assert.equal(ev('roundScale'),scale);
    assert.equal($('quizMelodyChoice').hidden,true,'hide choices during a round');
    assert.equal(ev('phase'),'q');
    const root=ev('roundRoot');
    assert.equal(notes[1][0]-root,scale==='aeo'?3:4,'initial tonic chord matches scale');
    const pool=ev('poolOf()'), seen=new Set();let small=0;
    assert.equal(ev('scalePoolFor().length'),7,'scale aid gives full tonal context even with five answer choices');
    for(let i=0;i<600;i++){
      const q=ev('makeQuestion()');assert.equal(q.scale,scale);
      assert.equal(q.cls.length,ev('curStage.mel'));
      for(const c of q.cls){assert.ok(pool.includes(c));seen.add(c);}
      if(id.startsWith('me')){
        for(let j=1;j<q.cls.length;j++){
          const step=Math.abs(pool.indexOf(q.cls[j])-pool.indexOf(q.cls[j-1]));
          assert.ok(step>=1 && step<=2,'at most one skipped scale tone');
          assert.ok(Math.abs(q.offs[j]-q.offs[j-1])<=4,'audible interval stays small');
          if(step===1)small++;
        }
      }
    }
    assert.equal(seen.size,pool.length,'all offered notes reachable');
    if(id.startsWith('me'))assert.ok(small>330*(ev('curStage.mel')-1),'mostly adjacent after repeat avoidance');
    notes.length=0;ev('nextQuestion()');
    assert.equal(notes[1][0]-root,scale==='aeo'?3:4,'second-question tonic chord matches scale');
    ev(`setMelodyScale('${scale==='ion'?'aeo':'ion'}')`);
    assert.equal(ev('progress.melodyScale'),scale,'cannot change tonality mid-round');
    ev('globalThis.flush()');
  }
  ev(`progress=validateProgress({melodyScale:'mix'});enterStage(STAGES.find(s=>s.id==='m1'));`);
  const scales=new Set();for(let i=0;i<25;i++){ev('startRound();globalThis.flush()');scales.add(ev('roundScale'));}
  assert.deepEqual([...scales].sort(),['aeo','ion']);
  ev(`progress.melodyScale='aeo';enterStage(STAGES.find(s=>s.id==='m3'));`);
  assert.equal($('quizMelodyChoice').hidden,true,'mode courses have their own scales');
  assert.equal(ev('melodyScales(curStage).length'),5);
  // Wrong-answer confirmation must also use minor, not slip back to major.
  ev(`enterStage(STAGES.find(s=>s.id==='m1'));roundScale='aeo';roundRoot=48;`);
  notes.length=0;ev('playResolution(48,7,0)');
  assert.deepEqual(notes.map(n=>n[0]-48),[7,8,10,12]);
  notes.length=0;ev('playApproach(48,5,0)');
  assert.deepEqual(notes.map(n=>n[0]-48),[0,2,3,5]);
  // Easy-course errors survive persistence and play back with their original scale and range.
  ev(`progress=validateProgress({melodyScale:'aeo'});enterStage(STAGES.find(s=>s.id==='me1'));startRound();globalThis.flush();
      melInput=curQ.cls.map(()=>11);melJudge();globalThis.flush();`);
  assert.equal(ev('progress.review.length'),1);
  assert.equal(ev('loadProgress().review[0].q.scale'),'aeo');
  ev(`progress.melodyScale='ion';startReview(5);`);
  assert.equal(ev('roundScale'),'aeo');
  assert.equal(ev('poolOf().length'),5);
  assert.equal($('quizMelodyChoice').hidden,true);
  ev('playReviewQuestion();globalThis.flush()');assert.equal(ev('phase'),'q');
  ev('showSelect();chooseCourse("mel");setMelodyScale("ion")');
  assert.equal($('courseMelodyChoice').hidden,false);
  assert.equal(ev('loadProgress().melodyScale'),'ion');
  ev('chooseCourse("mono")');assert.equal($('courseMelodyChoice').hidden,true);
  ev(`progress=validateProgress({melodyScale:'aeo',sessionLen:'q15'});enterStage(STAGES.find(s=>s.id==='me1'));startRound();globalThis.flush();`);
  for(let i=0;i<15;i++)ev('melInput=curQ.cls.slice();melJudge();nextQuestion();globalThis.flush();');
  assert.equal(ev('phase'),'result');
  assert.equal(ev('bestOf("me1")'),100);
  assert.equal($('nextStageBtn').hidden,false);
  $('nextStageBtn').onclick();
  assert.equal(ev('curStage.id'),'me2');
  assert.equal(ev('progress.melodyScale'),'aeo','next stage retains selected tonality');
  for(const id of ['me3','me4','me5','me6','me7','me8']){
    ev(`progress=validateProgress({melodyScale:'aeo'});enterStage(STAGES.find(s=>s.id==='${id}'));startRound();globalThis.flush();melInput=curQ.cls.map(()=>11);melJudge();globalThis.flush();`);
    assert.equal(ev('loadProgress().review[0].stageId'),id);
    ev('showSelect();startReview(5)');
    assert.equal(ev('curQ.cls.length'),id==='me3'||id==='me4'?3:id==='me5'||id==='me6'?4:5);
    assert.equal(ev('roundScale'),'aeo');
    assert.equal(ev('poolOf().length'),['me3','me5','me7'].includes(id)?5:7);
    ev('showSelect()');
  }
  ev(`progress=validateProgress({unlockMode:'seq',unlockChosen:true,bestRate:{m2:90,m4:90},mastered:{m1:true}})`);
  assert.equal(ev('isUnlocked(STAGES.find(s=>s.id==="m2"))'),true,'existing completed standard stays available');
  assert.equal(ev('isUnlocked(STAGES.find(s=>s.id==="m4"))'),true);
}finally{Math.random=originalRandom;}
console.log('PASS: melody progression, range/motion, major/minor cadence, preference persistence, old scores, mode isolation and shared review');
