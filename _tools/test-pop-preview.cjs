const assert = require('node:assert/strict');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const html = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');
const before = execFileSync('git', ['show', 'backup/pre-pop-20260914:index.html'], {encoding:'utf8', maxBuffer:8*1024*1024}).replace(/\r\n/g, '\n');
const code = doc => doc.match(/<script>([\s\S]*?)<\/script>/)[1];
const unchanged = doc => code(doc).split('function renderHeroStats(){')[0];
assert.equal(unchanged(html), unchanged(before), 'Stage definitions, audio engine/assets and storage logic must match backup');
const logo = doc => doc.slice(doc.indexOf('<div class="brand-main">'), doc.indexOf('id="setBtn"'));
assert(logo(html).length > 100, 'Logo found');
assert.equal(logo(html), logo(before), 'Original logo retained');
new Function(code(html));
const {ev, $} = require('./headless.js');
for(const [course, count] of [['mono',15],['mel',6],['chord',3]]){
  ev(`chooseCourse('${course}')`);
  assert.equal($('courseChooser').hidden, true);
  assert.equal($('courseStages').hidden, false);
  const rows = $('stageList').children.filter(e=>e.className === 'stageRow');
  assert.equal(rows.length,count);
}
ev('chooseCourse(null)');
assert.equal($('courseChooser').hidden,false);
assert.equal($('courseStages').hidden,true);
ev("enterStage(STAGES.find(s=>s.id==='s1'))");
assert.equal($('answers').children.length,12);
assert.equal($('answers').children.filter(e=>!e.disabled).length,3);
console.log('PASS: original audio/storage/stages, original logo, 3 course routes, fixed 12 answer slots, disabled out-of-pool answers');
