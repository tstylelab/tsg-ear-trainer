"""Embed a compact Salamander piano. Input: downloaded Tonejs/audio/salamander files.
Run: python _tools/build-piano.py <source-directory>
Source/license and processing are documented in PIANO-CREDITS.md.
"""
import base64, hashlib, json, re, subprocess, sys, tempfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
names = ['C','Ds','Fs','A']
samples, manifest = {}, []
with tempfile.TemporaryDirectory(prefix='tsg-piano-encode-') as tmp:
    for midi in range(36,85,3):
        name = names[(midi % 12)//3] + str(midi//12-1)
        src, dest = source/(name+'.mp3'), Path(tmp)/(name+'.mp3')
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-t','4.2',
            '-af','afade=t=out:st=4.05:d=0.15','-c:a','libmp3lame','-q:a','3',
            '-map_metadata','-1',str(dest)],check=True)
        data = dest.read_bytes()
        samples[midi] = base64.b64encode(data).decode('ascii')
        manifest.append(dict(midi=midi,name=name,sourceSha256=hashlib.sha256(src.read_bytes()).hexdigest(),
            embeddedSha256=hashlib.sha256(data).hexdigest(),bytes=len(data)))
html = (root/'index.html').read_text(encoding='utf-8')
payload = 'const PIANO_B64 = {\n' + ',\n'.join(f'  "{k}":"{v}"' for k,v in samples.items()) + '\n};'
html, count = re.subn(r'const PIANO_B64 = \{[\s\S]*?\n\};',lambda _:payload,html,count=1)
assert count == 1
(root/'index.html').write_text(html,encoding='utf-8')
(root/'_tools/piano-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f'Embedded {len(samples)} stereo samples, {sum(m["bytes"] for m in manifest):,} bytes')
