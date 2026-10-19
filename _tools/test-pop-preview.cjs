const assert = require('node:assert/strict');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const html = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');
const before = execFileSync('git', ['show', 'backup/pre-pop-20260914:index.html'], {encoding:'utf8', maxBuffer:8*1024*1024}).replace(/\r\n/g, '\n');
const code = doc => doc.match(/<script>([\s\S]*?)<\/script>/)[1];
// Audio changes are authorized as of 2026-10-15 and covered by test-piano.cjs.
const stages = doc => code(doc).split('const STAGES = [')[1].split('const LIS_SRC = [')[0]
  .split('\n').filter(line=>!line.includes('tonicMemory:true') && !line.includes('melodyMemory:true') && !line.includes('chromatic:') && !/id:'me[1-8]'/.test(line)).join('\n')
  .replace(/(?:grp|lv|name|desc):'[^']*',?/g,'').replace(/\s+/g,'');
assert.equal(stages(html),stages(before),'Existing stage identities and question conditions retained; new entry courses are additive');
const logo = doc => doc.slice(doc.indexOf('<div class="brand-main">'), doc.indexOf('<div class="hbtns">')).replace(/\s*<\/(?:a|div)>\s*$/, '');
assert(logo(html).length > 100, 'Logo found');
assert.equal(logo(html), logo(before), 'Original logo retained');
new Function(code(html));
const {ev, $} = require('./headless.js');
for(const [course, count] of [['mono',20],['mel',26],['chord',3]]){
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
console.log('PASS: original stage conditions/logo, 3 course routes, fixed 12 answer slots, disabled out-of-pool answers');
