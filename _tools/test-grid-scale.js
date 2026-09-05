const H = require('./headless.js');
const { ev, $, notes } = H;
const fails = [], info = {};
const ok = (cond, msg) => { if(!cond) fails.push(msg); };
const J = x => JSON.stringify(x);

// ── 1. ステージの格子 ──
const mono = ev(`STAGES.filter(s => s.gk === 'mono').map(s => ({id:s.id, lv:s.lv, name:s.name, dir:s.dir||'up', fk:!!s.fixedKey, wide:!!s.wide, minor: stageMinor(s), cls: lvClass(s.lv)}))`);
info.mono = mono.map(m => `${m.id}:${m.lv}:${m.dir}${m.fk?':C':''}${m.wide?':wide':''}${m.minor?':min':''}:${m.cls}`);
ok(mono.length === 15, 'mono count ' + mono.length);
ok(J(mono.map(m=>m.id)) === J(['s1','s2','s3','s8','s9','s12','s13','s4','s5','s10','s6','s11','s14','s15','s16']), 'mono order');
ok(mono.filter(m=>m.minor).map(m=>m.id).join() === 's12,s13,s4,s15', 'minor detection ' + mono.filter(m=>m.minor).map(m=>m.id));
ok(mono.slice(0,12).every(m=>m.fk||m.wide) && mono.slice(12).every(m=>!m.fk), 'fixedKey pattern');
ok(mono.filter(m=>m.cls==='lv-e').length === 3 && mono.filter(m=>m.cls==='lv-d').length === 4, 'lv classes');
ok(ev(`STAGES.length`) === 24, 'total stages');
ok(ev(`DIAG_UP.every(id => STAGES.some(s => s.id === id))`), 'DIAG_UP ids exist');
ok(!ev(`STAGES.some(s => s.id === 's7')`), 's7 removed');

// ── 2. 解放チェーン・旧データ ──
ev(`progress = validateProgress({unlockMode:'seq', bestRate:{s1:100,s2:100,s3:100}})`);
const chain = ev(`STAGES.filter(s=>s.gk==='mono').map(s => s.id + (isUnlocked(s)?'o':'x')).join(' ')`);
info.chain = chain;
ok(chain === 's1o s2o s3o s8o s9x s12x s13x s4x s5x s10x s6x s11x s14x s15x s16x', 'unlock chain');
const old = ev(`(() => { const p = validateProgress({bestRate:{s4:90, s7:100, s6:85}, lastStage:'s7', diagUnlock:'s7'}); return {s4:p.bestRate.s4, s7:p.bestRate.s7, s6:p.bestRate.s6, last:p.lastStage, du:p.diagUnlock, sb:p.scaleBtn, tr:p.traceAns, re:p.rootEvery}; })()`);
ok(old.s4 === 90 && old.s7 === undefined && old.s6 === 85 && old.last === null && old.du === null, 'old data ' + J(old));
ok(old.sb === 'on' && old.tr === 'off' && old.re === 1, 'defaults ' + J(old));
const junk = ev(`(() => { const p = validateProgress({scaleBtn:'zz', traceAns:'zz', rootEvery:9}); return [p.scaleBtn, p.traceAns, p.rootEvery]; })()`);
ok(J(junk) === J(['on','off',1]), 'junk ' + J(junk));
ok(ev(`validateProgress({scaleBtn:'off', traceAns:'on'}).scaleBtn`) === 'off' && ev(`validateProgress({traceAns:'on'}).traceAns`) === 'on', 'setting persist');

// ── 3. 全単音ステージ：方向・音域・キー ──
ev(`progress = validateProgress({unlockMode:'free', scaffold:3, blockRep:0, sessionLen:'q20'})`);
const ranges = {};
for(const m of mono){
  const roots = new Set(); let lo = 999, hi = -999, up = 0, down = 0, wide = 0, bad = 0;
  for(let r = 0; r < 6; r++){
    notes.length = 0;
    ev(`enterStage(STAGES.find(s => s.id === '${m.id}')); startRound(); qi = 0;`);
    roots.add(ev('roundRoot'));
    for(let q = 0; q < 8; q++){
      ev('nextQuestion()');
      if(ev(`phase`) === 'result') break;
      const off = ev('degOffOf(curQ)');
      if(off > 0) up++; else down++;
      if(Math.abs(off) > 12) wide++;
      ev(`playScaleWalk(roundRoot, scalePoolFor(), !!curQ.down, 0)`);
      ev('answer(curQ.cls)');
    }
    for(const [midi] of notes){ lo = Math.min(lo, midi); hi = Math.max(hi, midi); if(midi < 40 || midi > 74) bad++; }
  }
  ranges[m.id] = {roots:[...roots].sort((a,b)=>a-b), lo, hi, up, down, wide, bad};
  ok(bad === 0, `${m.id} out of range lo=${lo} hi=${hi}`);
  if(m.dir === 'up') ok(down === 0, `${m.id} should be up-only`);
  if(m.dir === 'down') ok(up === 0, `${m.id} should be down-only`);
  if(m.dir === 'both') ok(up > 0 && down > 0, `${m.id} should mix`);
  if(m.fk && !m.wide) ok(roots.size === 1, `${m.id} fixed key roots=${[...roots]}`);
  if(!m.fk && !m.wide) ok(roots.size > 1, `${m.id} random key roots=${[...roots]}`);
  if(m.wide) ok(wide > 0 && roots.size === 1 && [...roots][0] === 52, `${m.id} wide`);
}
info.ranges = ranges;

// ── 4. scalePoolFor ──
const sp = {};
for(const id of ['s2','s3','s13','s5','s11','m2','m3']){
  ev(`enterStage(STAGES.find(s => s.id === '${id}')); startRound();`);
  sp[id] = ev('scalePoolFor().join()') + (ev('roundScale') ? ' (' + ev('roundScale') + ')' : '');
}
info.scalePool = sp;
ok(sp.s2 === '0,2,4,5,7,9,11' && sp.s5 === '0,2,4,5,7,9,11' && sp.s13 === '0,2,3,5,7,8,10', 'scalePoolFor ' + J(sp));

// ── 5. スケールなぞりの音列 ──
const walk = (root, down) => { notes.length = 0; ev(`playScaleWalk(${root}, MAJ7, ${down}, 0)`); return notes.map(n=>n[0]); };
ok(J(walk(48,false)) === J([48,50,52,53,55,57,59,60]), 'walk up ' + J(walk(48,false)));
ok(J(walk(60,true)) === J([60,59,57,55,53,52,50,48]), 'walk down ' + J(walk(60,true)));
const trace = (root, off) => { notes.length = 0; ev(`playTrace(${root}, MAJ7, ${off}, 0)`); return notes.map(n=>n[0]); };
ok(J(trace(48,7)) === J([48,50,52,53,55]), 'trace +7 ' + J(trace(48,7)));
ok(J(trace(60,-5)) === J([60,59,57,55]), 'trace -5 ' + J(trace(60,-5)));
ok(J(trace(48,3)) === J([48,50,51]), 'trace b3 ' + J(trace(48,3)));
ok(J(trace(48,12)) === J([48,50,52,53,55,57,59,60]), 'trace +12 ' + J(trace(48,12)));
ok(J(trace(60,-12)) === J([60,59,57,55,53,52,50,48]), 'trace -12 ' + J(trace(60,-12)));
ok(J(trace(52,15)) === J([52,54,56,57,59,61,63,64,67]), 'trace wide +15 ' + J(trace(52,15)));
notes.length = 0; ev('playTrace(48, MAJ7, 7, 0)');
ok(notes[notes.length-1][2] === 1.5 && notes[0][2] === 0.4, 'trace accent durations ' + J(notes));

// ── 6. スケール使用は正解扱いにしない ──
ev(`progress = validateProgress({unlockMode:'free', scaffold:3, blockRep:0, sessionLen:'q10'})`);
ev(`enterStage(STAGES.find(s => s.id === 's3')); startRound(); qi = 0; nextQuestion();`);
ok(ev(`$('scaleBtn').hidden`) === false, 'scaleBtn shown on mono');
ev(`scaleUsed = true; scaleCount++;`);
const c1 = ev('curQ.cls');
ev(`answer(${c1})`);
const a1 = ev(`({score, log: answersLog[0], st: progress.stats['d${c1}'], phase, miss: progress.recentMiss.length})`);
ok(a1.score === 0 && a1.log.ok === false && a1.log.assisted === true && a1.st === undefined && a1.phase === 'reveal', 'assisted correct ' + J(a1));
ev(`nextQuestion()`);
ok(ev('scaleUsed') === false, 'scaleUsed reset per question');
ev(`answer(curQ.cls)`);
ok(ev('score') === 1 && ev('answersLog[1].ok') === true, 'normal correct counts');
ev(`nextQuestion(); scaleUsed = true; scaleCount++; answer((curQ.cls + 1) % 12);`);
const a3 = ev(`({log: answersLog[2], miss: progress.recentMiss.length})`);
ok(a3.log.ok === false && a3.log.assisted === true && a3.miss === 0, 'assisted wrong: no stats ' + J(a3));
ev(`roundTotal = 10; renderDots();`);
const dots = $('dots').children.map(c => c.className);
ok(J(dots.slice(0,3)) === J(['as','ok','as']), 'dots ' + J(dots));
ev(`showResult()`);
const msg = $('resMsg').textContent;
info.resMsg = msg;
ok(msg.indexOf('スケール2回使用') >= 0 && msg.indexOf('3問中 1問正解') >= 0, 'resMsg ' + msg);
ok(ev(`$('scaleBtn').hidden`) === true, 'scaleBtn hidden on result');
ev(`enterStage(STAGES.find(s => s.id === 'm2')); startRound(); qi = 0; nextQuestion(); scaleUsed = true;`);
ev(`curQ.cls.forEach(c => melTap(c))`);
const mel = ev(`({score, log: answersLog[0]})`);
ok(mel.score === 0 && mel.log.assisted === true && mel.log.ok === false, 'melody assisted ' + J(mel));
ev(`enterStage(STAGES.find(s => s.id === 'c1')); startRound(); qi = 0; nextQuestion();`);
ok(ev(`$('scaleBtn').hidden`) === true, 'scaleBtn hidden on chord');
ev(`progress.scaleBtn = 'off'; enterStage(STAGES.find(s => s.id === 's3')); startRound(); qi = 0; nextQuestion();`);
ok(ev(`$('scaleBtn').hidden`) === true, 'scaleBtn hidden when off');
ev(`progress.scaleBtn = 'on'; startDiag();`);
ok(ev(`$('scaleBtn').hidden`) === true && ev('!!diag'), 'scaleBtn hidden in diag');
ev(`diag = null`);

// ── 7. なぞって止める（正解時） ──
ev(`progress = validateProgress({unlockMode:'free', scaffold:3, blockRep:0, traceAns:'on'})`);
ev(`enterStage(STAGES.find(s => s.id === 's3')); startRound(); qi = 0; nextQuestion();`);
notes.length = 0;
ev(`answer(curQ.cls)`);
const tr = {last: notes[notes.length-1], target: ev('curQ.root + degOffOf(curQ)'), n: notes.length};
ok(tr.last[0] === tr.target && tr.last[2] === 1.5, 'trace on correct ' + J(tr));

// ── 8. 全24ステージ通し（例外なし）＋かけ流しの整合 ──
ev(`progress = validateProgress({unlockMode:'free', scaffold:4, blockRep:0})`);
let thrown = [];
for(const id of ev(`STAGES.map(s => s.id)`)){
  try{
    ev(`enterStage(STAGES.find(s => s.id === '${id}')); startRound(); qi = 0;`);
    for(let q = 0; q < 4; q++){
      ev('nextQuestion()');
      ev(`(curQ.type === 'mel') ? curQ.cls.forEach(c => melTap(c)) : answer(curQ.type === 'chord' ? curQ.chord : curQ.cls)`);
    }
    ev('showResult(); showStaff();');
  }catch(e){ thrown.push(id + ': ' + e.message); }
}
ok(thrown.length === 0, 'stage loop threw ' + J(thrown));
ok(ev(`LIS_SRC.some(v => v.id === 's12') && LIS_SRC.some(v => v.id === 's13') && LIS_SRC.find(v => v.id === 's4').dir === 'both'`), 'LIS_SRC minor entries');
const lr = new Set(); for(let i=0;i<40;i++) lr.add(ev(`lisPickRoot(LIS_SRC.filter(v => v.id === 's13'))`));
ok([...lr].every(r => r >= 52 && r <= 59), 'lisPickRoot down range ' + [...lr]);
ok(ev(`typeof MIN7 !== 'undefined' && MIN7.join() === '0,2,3,5,7,8,10'`), 'MIN7');

// ── 9. HTML/ヘルプの断片 ──
const html = require('fs').readFileSync(process.argv[2], 'utf8');
for(const frag of ['id="scaleBtn"', 'id="scaleBtnSeg"', 'id="traceSeg"', '.lv-e{', 'スケールボタン（数えて探す支え）', '<b>S</b>＝スケールボタン', '〜<b>s16</b>（単音・s7は欠番）', '実戦（キーランダム）'])
  ok(html.indexOf(frag) >= 0, 'html missing ' + frag);

console.log('mono: ' + info.mono.join(' | '));
console.log('chain: ' + info.chain);
for(const [id, r] of Object.entries(info.ranges)) console.log(`${id} roots=${r.roots} range=${r.lo}-${r.hi} up=${r.up} down=${r.down} wide=${r.wide} bad=${r.bad}`);
console.log('scalePool: ' + JSON.stringify(info.scalePool));
console.log('resMsg: ' + info.resMsg);
console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL PASS (' + Object.keys(ranges).length + ' mono stages checked)');
process.exit(fails.length ? 1 : 0);
