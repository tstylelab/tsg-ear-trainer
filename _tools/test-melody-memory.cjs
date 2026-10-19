const assert=require('node:assert/strict');
const {ev,$,notes}=require('./headless.js');
ev(`globalThis.pending=[];later=fn=>pending.push(fn);clearAdv=()=>{pending=[];};globalThis.flush=()=>{let n=0;while(pending.length){if(++n>40)throw Error('timer loop');pending.shift()();}};`);
for(const n of [2,3,4,5])for(const mode of ['ion','aeo','mix']){
  const id='mm'+n;
  ev(`progress=validateProgress({sessionLen:'q15',melodyScale:'${mode}',cadEvery:'each',reso:'both',scaffold:4});enterStage(STAGES.find(s=>s.id==='${id}'));startRound();flush();`);
  const first=ev('roundScale');
  assert.equal($('cadBtn').hidden,true);
  for(let i=1;i<=13;i++){
    assert.equal(ev('phase'),'q');
    assert.equal(ev('curQ.cls.length'),n);
    const expected=mode==='mix' && Math.floor((i-1)/4)%2?(first==='ion'?'aeo':'ion'):first;
    assert.equal(ev('roundScale'),expected);
    notes.length=0;ev('replayForReveal()');
    assert.equal(notes.length,n,'reveal plays only the melody without hidden key cues');
    if(i===13)break;
    notes.length=0;ev('nextQuestion()');
    if(i%4===0){
      assert.equal(ev('phase'),'listen');
      assert(notes.length>n,'key confirmation at question 5/9/13');
      assert.equal(notes[1][0]-ev('roundRoot'),expected=== 'aeo' && mode!=='mix'?3:ev('currentMinor()')?3:4,'new key anchor has correct third');
    }else assert.equal(notes.length,n,'only target melody between four-question boundaries');
    ev('flush()');
  }
  ev('confirmQuizTonic();melInput=curQ.cls.slice();melJudge()');
  assert.equal(ev('answersLog.at(-1).assisted'),true,'manual tonic check cannot earn unassisted credit');
  assert.equal(ev('answersLog.at(-1).ok'),false);
}
const oldSet=global.setTimeout,oldClear=global.clearTimeout;
let clock=0,tid=0;const tasks=new Map();
global.setTimeout=(fn,ms)=>{tasks.set(++tid,{fn,at:clock+ms});return tid;};
global.clearTimeout=id=>tasks.delete(id);
const tick=()=>{const [id,t]=[...tasks.entries()].sort((a,b)=>a[1].at-b[1].at)[0]||[];assert(t);tasks.delete(id);clock=t.at;t.fn();};
try{
  for(const n of [2,3,4,5])for(const mode of ['ion','aeo','mix']){
    ev(`progress=validateProgress({lis:{pick:['mm${n}'],melodyScale:'${mode}',cad:'each',reso:'both'}});saveProgress();showListen();ensureAudio();lisOn=true;`);
    assert.equal(ev('lisMemoryMode()'),true);
    assert.equal($('lisTonicMode').hidden,true);
    assert.equal(ev('loadProgress().lis.pick[0]'),'mm'+n);
    notes.length=0;ev('lisStep()');assert(notes.length>n);
    const first=ev('lisScale');
    for(let block=0;block<2;block++){
      for(let q=0;q<4;q++){
        notes.length=0;tick();assert.equal(notes.length,n,'listening only plays n notes');
        tick();assert.equal(ev('lisHist[0].q.cls.length'),n);
        assert.equal(ev('lisHist[0].q.scale'),mode==='mix'&&block===1?(first==='ion'?'aeo':'ion'):first);
      }
      notes.length=0;tick();assert(notes.length>n,'new key before fifth phrase');
    }
    ev('lisToggleFocus(lisHist[0])');
    assert.equal(ev('loadProgress().lis.focus[0].srcId'),'mm'+n);
    assert.equal(ev('reviewCandidates()[0].stageId'),'mm'+n);
    ev('setLisMelodyScale("'+(mode==='aeo'?'ion':'aeo')+'")');
    assert.equal(tasks.size,0,'changing mode stops pending playback');
    ev('lisSetPick(["m1"])');assert.equal(ev('lisMemoryMode()'),false);
    assert.equal(ev('progress.lis.reso'),'both','normal settings restored');
    ev('lisStop()');
  }
}finally{ev('lisStop()');global.setTimeout=oldSet;global.clearTimeout=oldClear;}
for(const [n,std] of [[2,'m1'],[3,'m2'],[4,'m4'],[5,'m5']]){
  ev(`progress=validateProgress({unlockMode:'seq',unlockChosen:true,bestRate:{${std}:100},melodyBest:{${std}:{ion:100,aeo:100,mix:100}}})`);
  assert.equal(ev(`isUnlocked(STAGES.find(s=>s.id==='mm${n}'))`),true);
  ev(`delete progress.melodyBest.${std}.mix`);
  assert.equal(ev(`isUnlocked(STAGES.find(s=>s.id==='mm${n}'))`),false);
  assert.equal(ev(`progress.bestRate.${std}`),100);
}
console.log('PASS: four advanced melody courses, 4-question/phrase anchors, alternating tonality, no hidden cues, assistance, listening persistence and existing scores');
