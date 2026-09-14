// Keep the single-file app's inline design CSS in sync with its editable source.
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(file, 'utf8');
const marker = '/* Approved POP preview — isolated visual layer, original behaviour retained. */';
const start = html.indexOf(marker);
if (start < 0 || html.indexOf(marker, start + 1) >= 0) throw new Error('Design marker must occur once');
const end = html.indexOf('</style>', start);
if (end < 0) throw new Error('Missing style end');
const css = fs.readFileSync(path.join(__dirname, 'pop-design.css'), 'utf8');
html = html.slice(0, start) + marker + '\n' + css + '\n' + html.slice(end);
fs.writeFileSync(file, html);
