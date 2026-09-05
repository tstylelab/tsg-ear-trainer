// ヘッドレス検証ハーネス：DOMをスタブして index.html の本体スクリプトを読み込み、内部関数を直接叩く
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const els = new Map();
function mkEl(id){
  const set = new Set();
  const el = {
    id, hidden:false, _tc:'', innerHTML:'', className:'', value:'', disabled:false, onclick:null,
    style:{setProperty(){}}, dataset:{}, children:[], offsetHeight:50, scrollWidth:0, clientWidth:0, scrollHeight:0, clientHeight:0, scrollTop:0, firstChild:null,
    classList:{add(...c){c.forEach(x=>set.add(x))}, remove(...c){c.forEach(x=>set.delete(x))},
      toggle(c,f){ if(f===undefined) f=!set.has(c); f?set.add(c):set.delete(c); return f; }, contains(c){return set.has(c)}},
    appendChild(c){ this.children.push(c); return c; }, removeChild(c){ return c; }, insertBefore(c){ return c; }, remove(){},
    addEventListener(){}, removeEventListener(){}, setAttribute(){}, setAttributeNS(){}, getAttribute(){return null}, removeAttribute(){},
    querySelector(sel){ return mkEl('q:' + sel); }, querySelectorAll(){ return []; },
    getBoundingClientRect(){ return {top:0,bottom:0,left:0,right:0,width:0,height:0}; },
    scrollIntoView(){}, focus(){}, click(){}, closest(){ return null; }
  };
  // 本物と同じく textContent を代入したら子要素は消える
  Object.defineProperty(el, 'textContent', { get(){ return el._tc; }, set(v){ el._tc = String(v); el.children.length = 0; } });
  return el;
}
const $id = id => { if(!els.has(id)) els.set(id, mkEl(id)); return els.get(id); };
const document = {
  getElementById: $id, querySelector: sel => $id('sel:' + sel), querySelectorAll: () => [],
  createElement: tag => mkEl('new:' + tag), createElementNS: (ns, tag) => mkEl('ns:' + tag),
  createTextNode: t => ({textContent: t}), addEventListener(){}, removeEventListener(){},
  documentElement: mkEl('html'), body: mkEl('body'), visibilityState: 'visible', title: ''
};
const window = { addEventListener(){}, removeEventListener(){}, innerWidth:375, innerHeight:667, scrollTo(){}, scrollY:0,
  location:{search:'', pathname:'/', href:'file:///x'}, history:{replaceState(){}}, matchMedia:()=>({matches:false, addEventListener(){}}),
  requestAnimationFrame: fn => setTimeout(fn, 0), navigator:{} };
const localStorage = { m:new Map(), getItem(k){ return this.m.has(k)?this.m.get(k):null; }, setItem(k,v){ this.m.set(k,String(v)); }, removeItem(k){ this.m.delete(k); } };
const fn = new Function('document','window','localStorage','navigator','location','history','confirm','alert','getComputedStyle','requestAnimationFrame','matchMedia',
  code + '\n;return { ev: (src) => eval(src) };');
const app = fn(document, window, localStorage, window.navigator, window.location, window.history, () => true, () => {}, () => ({getPropertyValue(){return ''}}), window.requestAnimationFrame, window.matchMedia);
const ev = app.ev;
globalThis.__notes = [];
ev(`ensureAudio = () => { audioCtx = {currentTime: 0, state: 'running'}; masterGain = {}; };`);
ev(`playNote = (m, t, g, d) => { globalThis.__notes.push([m, +Number(t).toFixed(2), +Number(d).toFixed(2)]); };`);
ev(`later = () => {}; advance = () => {}; clearAdv = () => {}; startDrone = () => {}; stopDrone = () => {};`);
module.exports = { ev, els, notes: globalThis.__notes, $: $id };
if(require.main === module){ console.log('loaded OK; STAGES=' + ev('STAGES.length')); }
