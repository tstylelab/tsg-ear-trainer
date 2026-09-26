const assert = require('node:assert/strict');
const {ev,$} = require('./headless.js');
const labels=['1','Shift+2','2','Shift+3','3','4','Shift+5','5','Shift+6','6','Shift+7','7'];
for(let c=0;c<12;c++){
  const digit=labels[c].slice(-1), shiftKey=labels[c].startsWith('Shift');
  for(const prefix of ['Digit','Numpad']){
    const e={code:prefix+digit,key:shiftKey?'!':digit,shiftKey};
    assert.equal(ev(`answerShortcutValue(${JSON.stringify(e)},STAGES[0])`),c);
  }
}
assert.equal(ev("answerShortcutValue({code:'Numpad6',key:'ArrowRight',shiftKey:false,getModifierState:()=>true},STAGES[0])"),8);
for(const code of ['Digit1','Digit4']) assert.equal(ev(`answerShortcutValue({code:'${code}',shiftKey:true},STAGES[0])`),null);
for(const flag of ['ctrlKey','altKey','metaKey','isComposing','repeat'])
  assert.equal(ev(`answerShortcutValue({code:'Digit5',${flag}:true},STAGES[0])`),null);

// Exercise actual keydown handler, rendered data values, pool exclusion, and phases.
ev(`globalThis.hit = [];
  globalThis.fire = e => {
    const event = {key:'',code:'',target:{closest:()=>null},preventDefault(){this.prevented=true},...e};
    document.listeners.keydown.forEach(fn=>fn(event)); return !!event.prevented;
  };
  globalThis.prepare = id => {
    enterStage(STAGES.find(s=>s.id===id));
    $('scrListen').hidden=true; scrQuiz.hidden=false;
    for(const id of ['helpModal','setModal','scSheet']) $(id).hidden=true;
    phase='q'; globalThis.hit=[];
    answersEl.querySelectorAll=()=>answersEl.children;
    for(const b of answersEl.children) b.click=()=>globalThis.hit.push(b.dataset.val);
  };
`);
for(const id of ['s1','s3','s5','s13','m1']){
  ev(`globalThis.prepare('${id}')`);
  const pool=ev('poolOf()');
  for(let c=0;c<12;c++){
    const label=labels[c];
    const before=ev('globalThis.hit.length');
    ev(`globalThis.fire({code:'Numpad${label.slice(-1)}',key:'${label.slice(-1)}',shiftKey:${label.startsWith('Shift')}})`);
    assert.equal(ev('globalThis.hit.length'),before+(pool.includes(c)?1:0),id+' '+label);
    if(pool.includes(c)) assert.equal(ev('globalThis.hit.at(-1)'),String(c));
    assert.equal($('answers').children[c].children.at(-1).textContent,label);
  }
}
ev("globalThis.prepare('s5'); phase='reveal'; globalThis.fire({code:'Digit5',key:'5'})");
assert.equal(ev('globalThis.hit.length'),0);
ev("globalThis.prepare('s5'); globalThis.fire({code:'Digit5',key:'5',target:{closest:()=>({})}})");
assert.equal(ev('globalThis.hit.length'),0);
ev("globalThis.prepare('c1'); globalThis.fire({code:'Numpad2',key:'2'})");
assert.equal(ev('globalThis.hit[0]'),'min');
ev("globalThis.fire({code:'Numpad2',key:'2',shiftKey:true})");
assert.equal(ev('globalThis.hit.length'),1);
console.log('PASS: all 12 degrees, Digit/Numpad, Windows navigation events, labels, pools, melody, chord, phases, modifiers and editable controls');
