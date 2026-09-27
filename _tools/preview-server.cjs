// Local preview only: do not serve Git history, tooling or arbitrary files.
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || 4178);
if(!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid preview port');
const mime = {'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((req,res) => {
  let url;
  try { url = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname); } catch { res.writeHead(400).end(); return; }
  const demo = url === '/review-demo';
  const rel = url === '/' || demo ? 'index.html' : url.slice(1);
  if (!['index.html','manifest.json','sw.js'].includes(rel) && !/^images\/[a-zA-Z0-9_.-]+$/.test(rel)) { res.writeHead(404).end(); return; }
  fs.readFile(path.join(root,rel),(error,data)=>{
    if(error){res.writeHead(404).end();return;}
    if(demo){
      const now=Date.now();
      const sample={introDone:true,review:[
        {stageId:'s13',q:{type:'deg',root:60,cls:8,off:-4,down:true,noRoot:false},playMode:'melodic',misses:4,streak:0,lastMiss:now,updated:now},
        {stageId:'m1',q:{type:'mel',root:48,cls:[0,3],offs:[0,3],scale:'aeo'},playMode:'melodic',misses:2,streak:0,lastMiss:now,updated:now},
        {stageId:'c2',q:{type:'chord',root:48,chord:'dim'},playMode:'melodic',misses:3,streak:0,lastMiss:now,updated:now}
      ]};
      data=Buffer.from(data.toString('utf8')
        .replace("const LS_KEY = 'tsg-ear-v1';","const LS_KEY = 'tsg-ear-review-demo';")
        .replace('let progress = loadProgress();','let progress = validateProgress('+JSON.stringify(sample)+');')
        .replace('<main>', '<main><p style="padding:12px;background:#fff3d9;border-radius:12px;font-size:13px">確認用サンプル：3種類の間違いを入れています。本番の成績とは別です。再読み込みでサンプルに戻ります。</p>'));
    }
    res.writeHead(200,{'Content-Type':mime[path.extname(rel)]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});
    res.end(data);
  });
}).listen(port,'127.0.0.1',()=>console.log('Ear Trainer preview: http://127.0.0.1:' + port + '/?mute=1'));
