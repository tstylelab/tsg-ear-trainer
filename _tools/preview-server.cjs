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
  const rel = url === '/' ? 'index.html' : url.slice(1);
  if (!['index.html','manifest.json','sw.js'].includes(rel) && !/^images\/[a-zA-Z0-9_.-]+$/.test(rel)) { res.writeHead(404).end(); return; }
  fs.readFile(path.join(root,rel),(error,data)=>{
    if(error){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(rel)]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});
    res.end(data);
  });
}).listen(port,'127.0.0.1',()=>console.log('Ear Trainer preview: http://127.0.0.1:' + port + '/?mute=1'));
