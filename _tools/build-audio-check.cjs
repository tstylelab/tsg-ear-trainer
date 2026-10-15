// Local-only comparison using the real Chromium OfflineAudioContext.
const fs=require('node:fs'),cp=require('node:child_process');
const current=fs.readFileSync('index.html','utf8');
const before=cp.execFileSync('git',['show','dbd42a4:index.html'],{encoding:'utf8',maxBuffer:8*1024*1024});
function engine(html){return html.slice(html.indexOf('let audioCtx = null;'),html.indexOf('const scrSelect'));}
function unit(html){return `(()=>{const window={},document={addEventListener(){},getElementById(){return {}}},location={search:''},SPEEDS=[1,1.25,1.5];function setPlaying(){};${engine(html)}
return async()=>{audioCtx=new OfflineAudioContext(2,44100*19,44100);
if(typeof connectPianoOutput==='function')connectPianoOutput(audioCtx);
else{masterGain=audioCtx.createGain();masterGain.gain.value=.9;limiterNode=audioCtx.createDynamicsCompressor();limiterNode.threshold.value=-6;limiterNode.knee.value=4;limiterNode.ratio.value=12;limiterNode.attack.value=.002;limiterNode.release.value=.15;masterGain.connect(limiterNode);limiterNode.connect(audioCtx.destination);}
await Promise.all(Object.entries(PIANO_B64).map(async([k,v])=>{const b=Uint8Array.from(atob(v),c=>c.charCodeAt(0));sampleCache[k]=await audioCtx.decodeAudioData(b.buffer);}));
[48,50,51,53,55,56,58,60].forEach((m,i)=>playNote(m,.2+i*.55,.92,.65));
[60,63,65,62].forEach((m,i)=>playNote(m,5+i*.62,.92,i===3?1.5:.72));
[[48,52,55,60],[53,57,60],[55,59,62],[48,51,55,60]].forEach((c,i)=>c.forEach((m,j)=>playNote(m,9+i*.85+j*.06,.68,i===3?1.8:.95)));
[40,44,69,73,77,81,84].forEach((m,i)=>playNote(m,14+i*.5,.9,.65));
const b=await audioCtx.startRendering();let peak=0,sum=0,invalid=0;for(let ch=0;ch<2;ch++)for(const v of b.getChannelData(ch)){peak=Math.max(peak,Math.abs(v));sum+=v*v;if(!Number.isFinite(v))invalid++;}
return {buffer:b,metrics:{samples:Object.keys(sampleCache).length,peak,rms:Math.sqrt(sum/(b.length*2)),invalid,seconds:b.duration}};
};})()`;}
const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><title>ピアノ音色の比較</title><style>body{font:16px system-ui;max-width:720px;margin:40px auto;padding:20px;background:#f4f9fd;color:#192f48}button{padding:16px;background:#245c80;color:white;border:0;border-radius:10px}audio{width:100%}pre{white-space:pre-wrap}</style><h1>ピアノ音色の比較</h1><p>同じマイナースケール・メロディ・和音・音域確認です。再生ボタンで聴き比べられます。</p><button id="render">比較音声を作る</button><h2>これまで</h2><audio id="old" controls></audio><h2>新しいグランドピアノ</h2><audio id="new" controls></audio><pre id="metrics">未実行</pre><script>
const oldRender=${unit(before)},newRender=${unit(current)};
function wav(b){const d=new DataView(new ArrayBuffer(44+b.length*4)),str=(p,s)=>{for(let i=0;i<s.length;i++)d.setUint8(p+i,s.charCodeAt(i));};str(0,'RIFF');d.setUint32(4,36+b.length*4,true);str(8,'WAVEfmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,2,true);d.setUint32(24,44100,true);d.setUint32(28,176400,true);d.setUint16(32,4,true);d.setUint16(34,16,true);str(36,'data');d.setUint32(40,b.length*4,true);for(let i=0;i<b.length;i++)for(let ch=0;ch<2;ch++)d.setInt16(44+(i*2+ch)*2,Math.max(-1,Math.min(1,b.getChannelData(ch)[i]))*32767,true);return new Blob([d],{type:'audio/wav'});}
document.querySelector('#render').onclick=async()=>{document.querySelector('#metrics').textContent='作成中';try{const old=await oldRender(),fresh=await newRender();document.querySelector('#old').src=URL.createObjectURL(wav(old.buffer));document.querySelector('#new').src=URL.createObjectURL(wav(fresh.buffer));document.querySelector('#metrics').textContent=JSON.stringify({old:old.metrics,new:fresh.metrics,pass:fresh.metrics.peak<.99&&fresh.metrics.peak>.1&&fresh.metrics.invalid===0},null,2);}catch(e){document.querySelector('#metrics').textContent='ERROR '+e.stack;}};
</script></html>`;
fs.writeFileSync('_tools/audio-check.html',html);
console.log('Created local-only /audio-check');
