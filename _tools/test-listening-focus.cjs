const assert = require('node:assert/strict');
const {ev, $} = require('./headless.js');
ev(`
  progress = validateProgress(null);
  globalThis.focusFixture = {srcId:'s13',q:{type:'deg',cls:8,down:true,minor:true,noRoot:false,root:60}};
`);
const fixture = ev('globalThis.focusFixture');
ev('lisToggleFocus(globalThis.focusFixture)');
assert.equal(ev('progress.lis.focus.length'), 1);
assert.equal(ev('progress.lis.focusOn'), true);
assert.equal(ev('progress.lis.focus[0].q.root'), undefined, 'marks do not save absolute pitch');
assert.equal(ev('loadProgress().lis.focus.length'), 1, 'saved across reload');
assert.equal(ev('lisFocusMatches(progress.lis.focus[0], LIS_SRC.find(s=>s.id === "s4"))'), true);
assert.equal(ev('lisFocusMatches(progress.lis.focus[0], LIS_SRC.find(s=>s.id === "s12"))'), false);
assert.equal(ev('lisFocusMatches(progress.lis.focus[0], LIS_SRC.find(s=>s.id === "dn"))'), false);
assert.equal(ev('lisFocusMatches(progress.lis.focus[0], LIS_SRC.find(s=>s.id === "s3"))'), false);

// Deterministic sampling verifies distribution and exact normal-mode restoration.
ev(`
  globalThis.drawFocus = (on, picks, n=20000) => {
    progress.lis.pick = picks; progress.lis.focusOn = on; lisPrevCls = null; lisRoot = 57;
    let seed = 123456789; const old = Math.random;
    Math.random = () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; };
    try { return Array.from({length:n}, () => lisMakeItem().q); }
    finally { Math.random = old; }
  };
`);
const normal = ev('globalThis.drawFocus(false,["s13"])');
const focused = ev('globalThis.drawFocus(true,["s13"])');
const ratio = qs => qs.filter(q=>q.cls===8).length/qs.length;
assert.ok(ratio(focused) > ratio(normal) + .15, 'marked sound meaningfully more frequent');
assert.ok(ratio(focused) < .65, 'other sounds still get practice');
assert.ok(focused.every(q=>q.down && q.minor && q.root===57));
assert.deepEqual(ev('globalThis.drawFocus(false,["s13"])'), normal, 'OFF exactly restores usual sequence');
assert.deepEqual(ev('globalThis.drawFocus(true,["s3"])'), ev('globalThis.drawFocus(false,["s3"])'), 'unselected condition does not change draw');
ev('lisToggleFocus(globalThis.focusFixture)');
assert.equal(ev('loadProgress().lis.focus.length'), 0, 'unmark persists');
assert.deepEqual(ev('globalThis.drawFocus(true,["s13"])'), normal, 'removing last mark restores usual sequence');

const invalid = [null, {}, {...fixture,srcId:'__proto__'}, {...fixture,q:{...fixture.q,cls:100}},
  {...fixture,q:{...fixture.q,down:'false'}}, {...fixture,srcId:'s3'},
  {srcId:'m1',q:{type:'mel',cls:[0,99],scale:'ion'}}, {srcId:'c1',q:{type:'chord',chord:'__proto__'}}];
assert.equal(ev(`lisCleanFocus(${JSON.stringify(invalid)}).length`), 0);
assert.equal(ev(`lisCleanFocus(${JSON.stringify([fixture,fixture])}).length`), 1);
ev(`
  globalThis.allMarks = [];
  for(const srcId of ['s6','s4','s9','s7']) for(let cls=0;cls<12;cls++) for(const down of [false,true])
    globalThis.allMarks.push({srcId,q:{type:'deg',cls,down,minor:srcId==='s4',noRoot:srcId==='s7'}});
  for(let c=0;c<12;c++) globalThis.allMarks.push({srcId:'m1',q:{type:'mel',cls:[0,c],scale:'ion'}});
`);
assert.equal(ev('lisCleanFocus(globalThis.allMarks).length'), 64, 'bounded storage');
ev('progress.lis.focus = lisCleanFocus(globalThis.allMarks); saveProgress()');
assert.equal(ev('loadProgress().lis.focus.length'), 64);
// Worst-case selection cost stays bounded, using only valid content.
const start = performance.now();
const mixed = ev('globalThis.drawFocus(true,LIS_SRC.map(s=>s.id),2000)');
console.log('2000 mixed draws with 64 marks: ' + Math.round(performance.now()-start) + ' ms');
assert.equal(mixed.length, 2000);
ev(`progress = validateProgress(null); lisHist = []; lisRoot=48; progress.lis.pick=['s3'];
  for(let i=0;i<100;i++) lisHistPush(lisMakeItem());`);
assert.equal(ev('lisHist.length'), 20, 'history remains bounded');
assert.equal($('lisHist').children.length,20);
assert.equal($('lisMarkCurrent').disabled,false);
ev('lisToggleFocus(lisCurrent); showListen()');
assert.equal(ev('progress.lis.focus.length'),1,'opening listening retains marks');
assert.equal($('lisMarkCurrent').disabled,true,'no stale current question');

// Melodies preserve the selected scale and offsets; chords respect the chosen pool.
ev(`progress.lis.focus=lisCleanFocus([{srcId:'m1',q:{type:'mel',cls:[0,4],scale:'ion'}}]); lisScale='aeo';`);
assert.ok(ev('globalThis.drawFocus(true,["m1"],500)').every(q=>q.scale==='aeo'));
ev('lisScale="ion"');
const melodies=ev('globalThis.drawFocus(true,["m1"],500)');
assert.ok(melodies.every(q=>q.cls.length===2 && q.offs.length===2 && q.scale==='ion'));
ev('progress.lis.focus=lisCleanFocus([{srcId:"c3",q:{type:"chord",chord:"m7"}}])');
assert.ok(ev('globalThis.drawFocus(true,["c1"],500)').every(q=>['maj','min'].includes(q.chord)));
console.log(`PASS: persistence, exact context, scope, OFF/unmark restoration, validation, caps, melody/chord limits; target ${(ratio(normal)*100).toFixed(1)}% -> ${(ratio(focused)*100).toFixed(1)}%`);
