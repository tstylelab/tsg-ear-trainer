const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'index.html');
let html = fs.readFileSync(file, 'utf8');
const eol = html.includes('\r\n') ? '\r\n' : '\n';
function replaceOnce(from, to) {
  from = from.replace(/\r?\n/g, eol);
  to = to.replace(/\r?\n/g, eol);
  if (html.split(from).length !== 2) throw new Error('Expected one match: ' + from.slice(0, 100));
  html = html.replace(from, to);
}
const keyboard = `<svg class="heroArt" viewBox="0 0 190 160" fill="none" aria-hidden="true">
  <circle cx="110" cy="88" r="64" fill="#d4ecfc"/>
  <path d="M27 100a72 72 0 0 1 68-66M43 102a56 56 0 0 1 52-51" stroke="#65ade0" stroke-width="5" stroke-linecap="round"/>
  <g transform="translate(85 56) rotate(14 48 52)"><rect width="102" height="105" rx="13" fill="#b6d7ed"/>
    <rect x="0" y="-4" width="31" height="100" rx="7" fill="white"/><rect x="35" y="-4" width="31" height="100" rx="7" fill="white"/><rect x="70" y="-4" width="31" height="100" rx="7" fill="white"/>
    <rect x="22" y="-4" width="20" height="57" rx="5" fill="#1b3048"/><rect x="57" y="-4" width="20" height="57" rx="5" fill="#1b3048"/>
  </g><path d="M48 42V15l23-5v26" stroke="#f36c5c" stroke-width="6" stroke-linejoin="round"/><ellipse cx="40" cy="43" rx="10" ry="7" fill="#f36c5c"/><ellipse cx="63" cy="37" rx="10" ry="7" fill="#f36c5c"/>
  <circle cx="113" cy="18" r="4" fill="white"/><circle cx="24" cy="125" r="4" fill="#87c0e8"/>
</svg>`;
const courseIcons = {
  mono: '<circle cx="28" cy="28" r="23" stroke="#afd6ef"/><circle cx="28" cy="28" r="16" stroke="#6aaee0"/><circle cx="28" cy="28" r="9" fill="#f36c5c" stroke="none"/>',
  mel: '<path d="M18 38V16l24-5v23" stroke="#559bd1" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="12" cy="40" rx="8" ry="6" fill="#69aee0" stroke="none"/><ellipse cx="36" cy="36" rx="8" ry="6" fill="#69aee0" stroke="none"/>',
  chord: '<circle cx="28" cy="19" r="15" fill="#91c5e9" stroke="none"/><circle cx="18" cy="35" r="15" fill="#70b0df" fill-opacity=".8" stroke="none"/><circle cx="38" cy="35" r="15" fill="#347eae" fill-opacity=".8" stroke="none"/>'
};
const cards = [['mono','単音','1音ずつ聴き分ける','15ステージ'],['mel','メロディ','音の流れをつかむ','6ステージ'],['chord','コード','響きの違いを聴く','3ステージ']].map(([key,title,desc,count]) => `<button class="courseCard" data-course="${key}" aria-controls="courseStages"><svg viewBox="0 0 56 56" fill="none" stroke-width="3" aria-hidden="true">${courseIcons[key]}</svg><span class="courseCopy"><strong>${title}</strong><span>${desc}</span></span><span class="courseCount">${count}</span><svg class="ic"><use href="#i-right"/></svg></button>`).join('\n');
replaceOnce(`    <div class="hero">\n      <div class="heroEyebrow">Ear Training</div>\n      <div class="heroTitle">音あてゲームで、<b>いい耳</b>を育てよう</div>\n      <p class="heroSub">音を聴いて、ドレミのどれかを当てるだけ。</p>\n      <div class="heroStats" id="heroStats"></div>\n      <button id="heroCta" hidden></button>\n      <button id="diagBtn" class="heroGhost"><svg class="ic"><use href="#i-target"/></svg>レベル診断で、自分に合うステージを知る</button>\n    </div>\n    <div id="stageList"></div>`,
`    <div class="homeIntro">
      <div class="hero">
        <h1 class="heroTitle">相対音感<br>トレーニング</h1>
        <p class="heroSub">度数・メロディ・コードをマスター！</p>
        ${keyboard}
      </div>
      <div class="todayCard">
        <h2>今日のトレーニング</h2>
        <p id="heroStageName"></p>
        <button id="heroCta" hidden></button>
        <button id="diagBtn" class="heroGhost"><svg class="ic"><use href="#i-target"/></svg>レベル診断で、おすすめを知る</button>
      </div>
      <div class="heroStats" id="heroStats" aria-label="これまでの練習記録"></div>
    </div>
    <div class="coursePanel">
      <div id="courseChooser"><h2 class="sectionTitle">練習を選ぶ</h2><p class="sectionLead">気になる練習から、はじめよう。</p><div class="courseCards">${cards}</div></div>
      <div id="courseStages" hidden>
        <button id="courseBack" class="courseBack"><svg class="ic"><use href="#i-left"/></svg>練習の種類を選ぶ</button>
        <h2 id="courseTitle" class="sectionTitle" tabindex="-1"></h2>
        <div id="stageList"></div>
      </div>
    </div>`);
replaceOnce(`  if(!target){ btn.hidden = true; return; } // 全ステージクリア済み`, `  if(!target){ $('heroStageName').textContent = '全ステージクリア！ 練習を選んで復習しよう。'; btn.hidden = true; return; } // 全ステージクリア済み`);
replaceOnce(`  setIconText(btn, 'play', (started ? 'つづきから：' : 'はじめる：') + target.lv + ' ' + target.name +\n    (drec && target === drec ? '（おすすめ）' : ''));`, `  $('heroStageName').textContent = target.lv + ' ' + target.name + (drec && target === drec ? '（おすすめ）' : '');
  setIconText(btn, 'play', started || last ? 'つづきから' : 'はじめる');
  btn.setAttribute('aria-label', (started || last ? 'つづきから：' : 'はじめる：') + target.lv + ' ' + target.name);`);
replaceOnce(`function renderStageList(){`, `let selectedCourse = null;
const courseLabels = {mono:'単音のトレーニング', mel:'メロディのトレーニング', chord:'コードのトレーニング'};
function chooseCourse(course){
  selectedCourse = Object.prototype.hasOwnProperty.call(courseLabels, course) ? course : null;
  renderStageList();
  if(selectedCourse) $('courseTitle').focus();
  else document.querySelector('[data-course="mono"]').focus();
}
document.querySelectorAll('[data-course]').forEach(btn => btn.addEventListener('click', () => chooseCourse(btn.dataset.course)));
$('courseBack').addEventListener('click', () => chooseCourse(null));
function renderStageList(){
  $('courseChooser').hidden = selectedCourse !== null;
  $('courseStages').hidden = selectedCourse === null;
  $('courseTitle').textContent = courseLabels[selectedCourse] || '';
  scrSelect.classList.toggle('choosing', selectedCourse !== null);`);
replaceOnce(`  const nextMarked = {}; // グループごとに「次に挑むステージ」を1つだけ光らせる\n  for(const st of STAGES){`, `  const nextMarked = {}; // グループごとに「次に挑むステージ」を1つだけ光らせる
  for(const st of STAGES){
    if(selectedCourse && st.gk !== selectedCourse) continue;`);
replaceOnce(`if(!scrQuiz.hidden) return; lisStop(); showSelect();`, `if(!scrQuiz.hidden) return; selectedCourse = null; lisStop(); showSelect();`);
const wave = [7,12,19,28,18,33,42,27,47,35,25,39,29,19,27,16,9].map((h,i)=>`<rect x="${i*10}" y="${(50-h)/2}" width="5" height="${h}" rx="2.5"/>`).join('');
replaceOnce(`      <div class="ringWrap">\n        <div class="ring"></div><div class="ring"></div><div class="ring"></div>\n        <div class="ringCore"><svg class="ic"><use href="#i-note"/></svg></div>\n      </div>`, `<svg class="soundWave" viewBox="0 0 165 50" aria-hidden="true">${wave}</svg>`);
replaceOnce(`      if(!poolOf().includes(c)) b.classList.add('off');`, `      if(!poolOf().includes(c)){ b.classList.add('off'); b.disabled = true; }`);
const css = fs.readFileSync(path.join(__dirname,'pop-design.css'),'utf8');
replaceOnce('</style>', '\n/* Approved POP preview — isolated visual layer, original behaviour retained. */\n'+css+'\n</style>');
fs.writeFileSync(file, html);
console.log('POP design applied');
