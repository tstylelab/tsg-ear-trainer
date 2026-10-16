const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {ev,actualPlayNote}=require('./headless.js');
const manifest=JSON.parse(fs.readFileSync('_tools/piano-manifest.json','utf8'));
assert.equal(manifest.length,17);
for(const m of manifest){
  const bytes=Buffer.from(ev(`PIANO_B64[${m.midi}]`),'base64');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),m.embeddedSha256);
}
const sources=[],gains=[];
function param(){return {value:0,events:[],setValueAtTime(v,t){this.events.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.events.push(['linear',v,t]);},exponentialRampToValueAtTime(v,t){this.events.push(['exp',v,t]);},cancelScheduledValues(){}};}
function node(){return {connect(){},disconnect(){this.disconnected=true;}};}
globalThis.__pianoContext={currentTime:0,destination:{},
  createBiquadFilter(){return Object.assign(node(),{frequency:param(),gain:param()});},
  createGain(){const g=Object.assign(node(),{gain:param()});gains.push(g);return g;},
  createDynamicsCompressor(){return Object.assign(node(),Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,param()])));},
  createBufferSource(){const s=Object.assign(node(),{playbackRate:param(),start(t){this.startAt=t;},stop(t){this.stopAt=t;}});sources.push(s);return s;}
};
ev('audioCtx=globalThis.__pianoContext;connectPianoOutput(audioCtx);PIANO_KEYS.forEach(k=>sampleCache[k]={midi:k})');
for(let midi=40;midi<=84;midi++){
  actualPlayNote(midi,1,.9,.7);
  const s=sources.at(-1),g=gains.at(-1);
  assert(Math.abs(s.buffer.midi-midi)<=1,'at most a semitone of resampling');
  assert(Math.abs(s.playbackRate.value-Math.pow(2,(midi-s.buffer.midi)/12))<1e-12);
  assert.equal(s.startAt,1);assert.equal(s.stopAt,1.75);
  assert.deepEqual(g.gain.events.at(-1),['exp',.0001,1.7]);
  assert.equal(ev('liveNodes.length'),1);s.onended();
  assert.equal(ev('liveNodes.length'),0,'finished voices are released during long listening');
  assert(s.disconnected && g.disconnected);
}
(async()=>{
  ev('delete sampleCache[60];sampleLoads[60]=Promise.resolve({});pianoGeneration=0');
  const before=sources.length;
  actualPlayNote(60,1,1,.7);ev('stopAll()');await Promise.resolve();
  assert.equal(sources.length,before,'leaving while decode is pending must not produce delayed audio');
  delete globalThis.__pianoContext;
  console.log('PASS: embedded sample hashes, pitch mapping, envelopes, voice cleanup and pending-decode cancellation');
})().catch(e=>{console.error(e);process.exitCode=1;});
