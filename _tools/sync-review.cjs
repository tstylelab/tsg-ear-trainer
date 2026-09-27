const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'..','index.html');
let html=fs.readFileSync(file,'utf8');
const start='// BEGIN SHARED REVIEW',end='// END SHARED REVIEW';
const code=start+'\n'+fs.readFileSync(path.join(__dirname,'shared-review.js'),'utf8')+'\n'+end+'\n';
if(html.includes(start)) html=html.slice(0,html.indexOf(start))+code+html.slice(html.indexOf(end)+end.length+1);
else html=html.replace('function degreeShortcut(c){',code+'function degreeShortcut(c){');
fs.writeFileSync(file,html);
