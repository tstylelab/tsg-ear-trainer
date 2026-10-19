const assert=require('node:assert/strict');
const {ev,$,notes}=require('./headless.js');
ev(`globalThis.pending=[];later=fn=>globalThis.pending.push(fn);clearAdv=()=>{globalThis.pending=[];};
globalThis.flush=()=>{let n=0;while(globalThis.pending.length){if(++n>40)throw Error('timer loop');globalThis.pending.shift()();}};`);
const ids=ev('STAGES.filter(melodyScaleSelectable).map(s=>s.id)');
assert.equal(ids.length,12);
for(const id of ids){
  ev(`progress=validateProgress({sessionLen:'q15',bestRate:{'${id}':93}});`);
  assert.equal(ev(`stageDone('${id}')`),false,'old aggregate is not evidence of all scales');
  for(const mode of ['ion','aeo','mix']){
    ev(`progress.melodyScale='${mode}';enterStage(STAGES.find(s=>s.id==='${id}'));startRound();flush();`);
    const scales=[];
    for(let i=0;i<15;i++){
      scales.push(ev('curQ.scale'));
      assert.equal(ev('phase'),'q');
      assert.ok(ev('curQ.cls.every(c=>poolOf().includes(c))'));
      notes.length=0;
      ev('melInput=curQ.cls.slice();melJudge();nextQuestion();');
      if(mode==='mix' && i<14 && (i+1)%3===0){
        assert.equal(ev('phase'),'listen','answer gate during new tonal reference');
        assert.ok(notes.length>=8,'audible scale context at switch');
      }
      ev('flush()');
    }
    assert.equal(ev('phase'),'result');
    assert.equal(ev(`loadProgress().melodyBest['${id}']['${mode}']`),100);
    assert.equal(ev(`stageDone('${id}')`),mode==='mix');
    if(mode==='mix'){
      assert.equal(new Set(scales).size,2);
      for(let i=1;i<15;i++)assert.equal(scales[i]===scales[i-1],i%3!==0);
      assert.equal(ev(`melodyNext('${id}')`),undefined);
    }
  }
}
ev(`progress=validateProgress({sessionLen:'q15',melodyScale:'mix'});enterStage(STAGES.find(s=>s.id==='me1'));startRound();flush();`);
// 100% major and 67% minor can average >=80%; mix must still fail.
ev(`answersLog=Array.from({length:9},()=>({ok:true,q:{scale:'ion'}})).concat(Array.from({length:6},(_,i)=>({ok:i<4,q:{scale:'aeo'}})));`);
assert.equal(ev('melodyRoundResult().cleared'),false);
assert.equal(ev('melodyRoundResult().value'),66);
ev(`answersLog=Array.from({length:15},()=>({ok:true,q:{scale:'ion'}}));`);
assert.equal(ev('melodyRoundResult().eligible'),false,'one scale cannot pass mixed');
ev(`progress=validateProgress({unlockMode:'seq',unlockChosen:true,bestRate:{me1:93,m1:87},mastered:{m4:true},melodyBest:{me1:{ion:100,aeo:80,mix:80},bad:{ion:100},me2:{ion:101,aeo:-2,mix:'100'}}});saveProgress();`);
assert.equal(ev('loadProgress().bestRate.m1'),87);
assert.equal(ev('loadProgress().mastered.m4'),true);
assert.equal(ev('loadProgress().melodyBest.me1.mix'),80);
assert.equal(ev('loadProgress().melodyBest.me2'),undefined);
assert.equal(ev('isUnlocked(STAGES.find(s=>s.id==="me2"))'),true);
ev('delete progress.melodyBest.me1.mix');
assert.equal(ev('isUnlocked(STAGES.find(s=>s.id==="me2"))'),false);
assert.equal(ev('isUnlocked(STAGES.find(s=>s.id==="m1"))'),true,'old completed courses remain accessible');
ev("progress.unlockChosen=true;progress.unlockMode='free'");
assert.equal(ev('isUnlocked(STAGES.find(s=>s.id==="me2"))'),true,'explicit free practice retained');
ev("progress.unlockMode='seq';progress.mastered.me1=true");
assert.equal(ev('isUnlocked(STAGES.find(s=>s.id==="me2"))'),true,'self mastery retained');
console.log('PASS: 12 melody courses, separate scale scores, alternating mixed context, mixed lower-score gate, legacy preservation and progression');
