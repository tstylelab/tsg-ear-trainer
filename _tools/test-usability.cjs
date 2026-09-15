const assert = require('node:assert/strict');
const {ev, $} = require('./headless.js');
ev(`progress = validateProgress({bestRate:{s1:90},stats:{d4:[5,8]},unlockMode:'seq',unlockChosen:true,mastered:{s2:true,s7:true,s3:'true',bogus:true}})`);
assert.equal(ev('JSON.stringify(progress.mastered)'),'{"s2":true}');
assert.equal(ev('setMasteredThrough("s3")'),1);
assert.equal(ev('bestOf("s1")'),90);
assert.equal(ev('bestOf("s3")'),-1);
assert.equal(ev('JSON.stringify(progress.stats)'),'{"d4":[5,8]}');
assert.equal(ev('isUnlocked(STAGES.find(s=>s.id==="s8"))'),true);
ev('progress = validateProgress(JSON.parse(JSON.stringify(progress))); renderHeroCta()');
$('heroCta').onclick();
assert.equal(ev('curStage.id'),'s8','Home skips cleared and self-mastered stages');
ev('undoMastered("s3")');
assert.equal(ev('isUnlocked(STAGES.find(s=>s.id==="s8"))'),false);
assert.equal(ev('bestOf("s1")'),90,'Undo leaves actual scores intact');
assert.equal(ev('setMasteredThrough("unknown")'),0);
ev('progress = validateProgress(null); setMasteredThrough("s16")');
assert.equal(ev('Object.keys(progress.mastered).length'),15);
assert.equal(ev('stageDone("m1")'),false,'Bulk range stays in selected course');
ev('renderHeroCta()'); $('heroCta').onclick();
assert.equal(ev('curStage.id'),'m1');
ev('setMasteredThrough("m6");setMasteredThrough("c3");renderHeroCta()');
assert.equal($('heroCta').hidden,false,'All done still offers practice');
assert.equal(ev('Object.keys(progress.bestRate).length'),0,'No manufactured scores');
const originalRandom = Math.random;
let seed = 492;
Math.random = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
try{
  for(const id of ['c1','c2','c3','s1']){
    ev(`progress=validateProgress(null);enterStage(STAGES.find(s=>s.id==='${id}'));startRound()`);
    const values = Array.from({length:150},()=>ev('(() => {const q=makeQuestion(); return q.chord || q.cls;})()'));
    const repeats = values.slice(1).filter((v,i)=>v===values[i]).length;
    if(id==='c1'){
      assert(repeats>20 && repeats<130,'Two-choice course permits both repeated and changing answers');
    }else assert.equal(repeats,0,id+' retains existing no-repeat rule');
  }
}finally{ Math.random=originalRandom; }
ev('progress=validateProgress({introDone:true});');
assert.equal(ev('validateProgress(JSON.parse(JSON.stringify(progress))).introDone'),true);
assert.equal(ev('validateProgress(null).introDone'),false);
ev('progress=validateProgress(null);setMasteredThrough("s3");enterStage(STAGES.find(s=>s.id==="s1"));score=15;answersLog=Array.from({length:15},()=>({ok:true}));showResult()');
assert.equal(ev('bestOf("s1")'),100);
assert.equal($('resDetails').open,false);
assert.equal($('nextStageBtn').hidden,false);
$('nextStageBtn').onclick();
assert.equal(ev('curStage.id'),'s8','Result recommendation skips mastered stages');
console.log('PASS: mastery validation, persistence, score preservation, recommendation, undo, sequential unlock, course boundaries and c1-only repetition');
