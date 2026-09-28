// Shared review records. Audio assets and normal stage progression stay independent.
let reviewSession = null, lisReviewMode = false, lisReviewLast = null;
function reviewKey(r){
  const q = r.q;
  return [r.stageId,q.type,q.scale || '',q.type === 'mel' ? q.cls.join(',') + '/' + q.offs.join(',')
    : q.type === 'chord' ? q.chord : [q.cls,q.down,q.off,q.noRoot].join(','),r.playMode].join(':');
}
function cleanReview(items){
  if(!Array.isArray(items)) return [];
  const map = new Map();
  for(const r of items.slice(0,512)){
    if(!r || !r.q) continue;
    const st = STAGES.find(s => s.id === r.stageId), q = r.q;
    if(!st || !Number.isInteger(q.root) || q.root < 40 || q.root > 60) continue;
    const clean = {type:q.type,root:q.root};
    if(q.type === 'chord' && st.chords && st.chords.includes(q.chord)) clean.chord = q.chord;
    else if(q.type === 'mel' && st.mel && st.scales.includes(q.scale) && Array.isArray(q.cls)
      && q.cls.length === st.mel && q.cls.every(c => Number.isInteger(c) && SCALES[q.scale].iv.includes(c))
      && Array.isArray(q.offs) && q.offs.length === q.cls.length
      && q.offs.every((o,i) => Number.isInteger(o) && ((o%12)+12)%12 === q.cls[i] && q.root+o>=40 && q.root+o<=84)){
      clean.cls=q.cls.slice(); clean.offs=q.offs.slice(); clean.scale=q.scale;
    }else if(q.type === 'deg' && st.pool && st.pool.includes(q.cls) && typeof q.down === 'boolean'
      && (st.dir === 'both' || (st.dir === 'down') === q.down) && Number.isInteger(q.off)
      && ((q.off%12)+12)%12 === q.cls && q.root+q.off>=40 && q.root+q.off<=74
      && (st.wide ? (q.down ? q.off<0 : q.off>0) : q.off===degOffset(q.cls,q.down))){
      clean.cls=q.cls; clean.down=q.down; clean.off=q.off; clean.noRoot=q.noRoot===true;
      clean.minor=stageMinor(st);
    }else continue;
    const num = (v,max) => Number.isFinite(v) ? Math.max(0,Math.min(max,Math.floor(v))) : 0;
    const entry={stageId:st.id,q:clean,playMode:['melodic','harmonic','both'].includes(r.playMode)?r.playMode:'melodic',
      misses:num(r.misses,9999), streak:num(r.streak,20), lastMiss:num(r.lastMiss,Date.now()),
      updated:num(r.updated,Date.now()), manual:r.manual===true, excluded:r.excluded===true};
    const key=reviewKey(entry), old=map.get(key);
    if(!old || entry.updated>old.updated) map.set(key,entry);
  }
  return [...map.values()].sort((a,b)=>b.updated-a.updated).slice(0,128);
}
function captureReviewRecord(){
  const q=JSON.parse(JSON.stringify(curQ));
  if(q.type==='deg'){q.off=degOffOf(q);q.noRoot=!rootShown();}
  return {stageId:curStage.id,q,playMode:reviewSession ? reviewSession.current.playMode : progress.playMode};
}
function recordReviewAnswer(ok,assisted){
  if(assisted || diag) return;
  const raw=captureReviewRecord(), key=reviewKey(raw);
  let r=progress.review.find(v=>reviewKey(v)===key);
  if(!r && ok && !(reviewSession && reviewSession.current.manual)) return;
  const now=Date.now();
  if(!r){r={...raw,misses:0,streak:0,lastMiss:ok?0:now,updated:now,manual:false};progress.review.push(r);}
  r.updated=now;
  if(ok) r.streak=Math.min(20,r.streak+1);
  else {r.misses=Math.min(9999,r.misses+1);r.streak=0;r.lastMiss=now;r.excluded=false;}
  progress.review=cleanReview(progress.review);
  saveProgress();
}
function focusToReview(f){
  const src=LIS_SRC.find(s=>s.id===f.srcId), q={...f.q};
  if(!src) return null;
  let st;
  if(q.type==='mel'){
    st=STAGES.find(s=>s.id===src.id); q.cls=q.cls.slice();q.offs=melOffsets(q.cls);q.root=48;
  }else if(q.type==='chord') {st=STAGES.find(s=>s.id===src.id);q.root=48;}
  else {
    st=STAGES.find(s=>s.id===src.id && s.pool);
    if(!st) st=STAGES.find(s=>s.id===(q.down?'s10':'s5'));
    q.off=degOffset(q.cls,q.down);q.root=q.down?60:48;
  }
  const r=cleanReview([{stageId:st.id,q,playMode:'melodic',manual:true,updated:0}])[0];
  if(r) r.focusKey=lisFocusKey(f);
  return r || null;
}
function reviewCandidates(){
  const map=new Map(progress.review.map(r=>[reviewKey(r),{...r}]));
  for(const f of progress.lis.focus){
    const r=focusToReview(f); if(!r) continue;
    const key=reviewKey(r), old=map.get(key);
    map.set(key,old ? {...old,manual:true,focusKey:r.focusKey} : r);
  }
  return [...map.values()].filter(r=>!r.excluded && (r.misses>0 || r.manual));
}
function dismissReview(key){
  const item=reviewCandidates().find(r=>reviewKey(r)===key);if(!item)return;
  const previous=progress.review.find(r=>reviewKey(r)===key);
  const saved=previous?JSON.parse(JSON.stringify(previous)):null;
  const focus=progress.lis.focus.filter(f=>{const r=focusToReview(f);return r && reviewKey(r)===key;});
  progress.lis.focus=progress.lis.focus.filter(f=>!focus.includes(f));
  if(previous){previous.excluded=true;previous.manual=false;previous.updated=Date.now();}
  else progress.review.push({...item,excluded:true,manual:false,updated:Date.now()});
  progress.review=cleanReview(progress.review);saveProgress();
  return ()=>{
    progress.review=progress.review.filter(r=>reviewKey(r)!==key);
    if(saved)progress.review.push(saved);
    progress.lis.focus=lisCleanFocus(progress.lis.focus.concat(focus));
    progress.review=cleanReview(progress.review);saveProgress();
  };
}
function reviewWeight(r){
  const days=Math.max(0,(Date.now()-r.lastMiss)/86400000);
  return (1 + 4/(1+days) + Math.min(5,r.misses) + (r.manual?2:0))/(1+r.streak*r.streak);
}
function reviewDraw(pool){
  let x=Math.random()*pool.reduce((n,r)=>n+reviewWeight(r),0);
  for(const r of pool){x-=reviewWeight(r);if(x<=0)return r;}
  return pool[pool.length-1];
}
function reviewQueue(n){
  const all=reviewCandidates(), result=[]; let left=[];
  if(!all.length)return result;
  while(result.length<n){
    if(!left.length) left=all.slice();
    const eligible=left.filter(r=>!result.length || reviewKey(r)!==reviewKey(result[result.length-1]));
    const r=reviewDraw(eligible.length?eligible:left);
    result.push(JSON.parse(JSON.stringify(r)));left=left.filter(v=>reviewKey(v)!==reviewKey(r));
  }
  return result;
}
function reviewTitle(r){
  const st=STAGES.find(s=>s.id===r.stageId), q=r.q;
  if(q.type==='chord')return 'コード：響きの種類を選ぶ';
  if(q.type==='mel')return 'メロディ：'+q.cls.length+'音を順番に選ぶ（'+SCALES[q.scale].n+'）';
  return '単音：'+(q.down?'下降':'上行')+'・'+(stageMinor(st)?'マイナー':st.pool.length===12?'12度数':'メジャー')+
    (q.noRoot?'（ルート省略）':'');
}
function renderReviewEntries(){
  const count=reviewCandidates().length;
  for(const id of ['homeReview','resultReview']){
    const el=$(id);el.textContent='';
    const title=document.createElement('h3');title.textContent='間違いを復習';el.appendChild(title);
    const p=document.createElement('p');p.textContent=count ? '最近の間違い・苦手 '+count+'件'
      : '間違えた問題がここにたまります';el.appendChild(p);
    const row=document.createElement('div');row.className='reviewActions';
    for(const [label,n] of [['5問',5],['10問',10],['かけ流し',0]]){
      const b=document.createElement('button');b.textContent=label;b.disabled=!count;
      b.title=n ? n+'問を復習。記録が少ないときは同じ問題もくり返します。' : '間違えた問題・登録した苦手をかけ流し';
      b.addEventListener('click',()=>n?startReview(n):startReviewListening());row.appendChild(b);
    }
    el.appendChild(row);
    if(count){
      const details=document.createElement('details');details.className='reviewDetails';
      const summary=document.createElement('summary');summary.textContent='内容を見る（'+count+'件）';
      details.appendChild(summary);
      const help=document.createElement('p');help.textContent='外しても履歴は残ります。また間違えたり、苦手に登録すると復習に戻ります。';details.appendChild(help);
      const list=document.createElement('ul');list.className='reviewList';
      const records=reviewCandidates().sort((a,b)=>b.lastMiss-a.lastMiss || b.misses-a.misses);
      for(const r of records){
        const item=document.createElement('li');
        const name=document.createElement('strong');name.textContent=lisAnsText(r.q);
        const context=document.createElement('span');context.textContent=reviewTitle(r);
        const info=document.createElement('small');
        info.textContent='間違い '+r.misses+'回'+(r.manual?' ・ 手動登録あり':' ・ 自動記録');
        item.appendChild(name);item.appendChild(context);item.appendChild(info);
        const remove=document.createElement('button');remove.className='reviewRemove';remove.textContent='復習から外す';
        remove.setAttribute('aria-label',name.textContent+'・'+context.textContent+'を復習から外す');
        remove.addEventListener('click',()=>{
          const undo=dismissReview(reviewKey(r));if(!undo)return;
          renderReviewEntries();
          const host=$(id), notice=document.createElement('div');notice.className='reviewNotice';notice.setAttribute('role','status');
          const msg=document.createElement('span');msg.textContent=name.textContent+'を復習から外しました。';
          const back=document.createElement('button');back.textContent='元に戻す';
          back.addEventListener('click',()=>{undo();renderReviewEntries();});
          notice.appendChild(msg);notice.appendChild(back);host.appendChild(notice);
          const expanded=host.querySelector('details');if(expanded)expanded.open=true;
          back.focus();
        });
        item.appendChild(remove);list.appendChild(item);
      }
      details.appendChild(list);el.appendChild(details);
    }
  }
}
function startReview(n){
  if(n!==5 && n!==10)return;
  const queue=reviewQueue(n);if(!queue.length)return;
  diag=null;enterStage(STAGES.find(s=>s.id===queue[0].stageId),true);
  reviewSession={queue,current:null,n};
  curSession={n};roundTotal=n;roundDeadline=0;roundMode='inter';
  $('cadBtn').hidden=true; $('endBtn').hidden=true;
  nextReviewQuestion();window.scrollTo(0,0);
}
function nextReviewQuestion(){
  clearAdv();stopAll();stopTick();stopDrone(0.1);hideStaff();hideHint();
  if(qi>=reviewSession.n){showResult();return;}
  const r=reviewSession.queue[qi++];reviewSession.current=r;
  curStage=STAGES.find(s=>s.id===r.stageId);curQ=JSON.parse(JSON.stringify(r.q));
  roundRoot=curQ.root;roundScale=curQ.scale || null;roundPool=roundScale?SCALES[roundScale].iv:null;
  phase='reviewReady';melInput=[];scaleUsed=false;
  $('singBtn').hidden=true;rootBtn.hidden=true;$('scaleBtn').hidden=true;
  if(curStage.tonicMemory){rootBtn.hidden=false;setIconText(rootBtn,'note','主音を確認');}
  $('melBar').hidden=true;nextBtn.hidden=true;resultEl.hidden=true;answersEl.hidden=false;
  answersEl.classList.add('locked');renderAnswers();renderQNum();renderDots();
  stageNameEl.textContent='復習 '+qi+' / '+reviewSession.n;
  $('modeChip').textContent=reviewTitle(r);
  setFeedback('','');setPlayLabel('問題の種類を確認して、音を聴いてください。',false);
  listenBtn.hidden=false;listenBtn.classList.remove('busy');setPlaying(false);
  setIconText(listenBtn,'play','この問題を聴く');
}
function playReviewQuestion(){
  if(!reviewSession || phase!=='reviewReady')return;
  ensureAudio();useSpd(progress.speed);phase='listen';
  setIconText(listenBtn,'note','キーの響き…');listenBtn.classList.add('busy');
  const play=()=>{
    if(!reviewSession || phase!=='listen')return;
    phase='q';answersEl.classList.remove('locked');listenBtn.classList.remove('busy');
    setIconText(listenBtn,'volume','もう一度聴く');renderMelBar(false);renderScaleBtn();playStimulus();
  };
  if(curQ.type==='chord'){play();return;}
  const d=playShortCadence(curQ.root,stageMinor(curStage)||isMinorScale(curQ.scale),audioCtx.currentTime+0.06);
  later(play,Math.round((d+0.2)*1000));
}
function showReviewResult(){
  const n=answersLog.length, rate=n?Math.round(score/n*100):0;
  $('resRank').textContent='復習完了';$('resScore').textContent=rate;$('resMax').textContent='%';
  $('scoreRing').style.background='conic-gradient(var(--acc) '+rate+'%, var(--s3) 0)';
  $('resMsg').textContent=n+'問中 '+score+'問正解。'+(scaleCount?'補助音を使った問題は正解数に含めません。':'')+'通常コースのベスト記録は変わりません。';
  $('resDetails').hidden=true;$('nextStageBtn').hidden=true;
  $('againBtn').textContent='もう'+reviewSession.n+'問復習';$('againBtn').classList.remove('secondary');
  renderReviewEntries();
}
function startReviewListening(){
  if(!reviewCandidates().length)return;
  showListen();lisReviewMode=true;lisReviewLast=null;
  $('lisTonicMode').hidden=true;renderLisSeg();
  $('lisReviewBanner').hidden=false;$('lisSetBtn').hidden=true;
  $('lisFocusOn').disabled=true;
  $('lisFocusStatus').textContent='コースをまたいで、間違えた問題と登録した苦手を流します。聴くだけでは習得扱いになりません。';
  $('lisToggle').click();
}
function reviewListeningStep(){
  const all=reviewCandidates();if(!all.length){lisStop('復習する問題はありません');return;}
  const pool=all.filter(r=>reviewKey(r)!==lisReviewLast), r=reviewDraw(pool.length?pool:all);
  lisReviewLast=reviewKey(r);useSpd(progress.lis.speed);
  const q={...JSON.parse(JSON.stringify(r.q)),reviewId:reviewKey(r),playMode:r.playMode};
  const it={src:{id:'review',n:reviewTitle(r)},q};
  lisRoot=q.root;lisCurrent=null;updateLisMarkButton($('lisMarkCurrent'),null,true);
  lisReferenceRoot=q.root;$('lisTonic').disabled=false;
  $('lisKey').textContent='KEY '+spellNote(q.root,false).name;$('lisDeg').textContent='…';$('lisSrc').textContent=reviewTitle(r);
  const t=audioCtx.currentTime+0.06;
  const lead=q.type==='chord'?0:playShortCadence(q.root,q.minor||isMinorScale(q.scale),t)+T(0.25);
  const dur=lisPlayItem(q,t+lead,progress.lis.reso);
  lisRevealT=setTimeout(()=>{if(!lisOn || !lisReviewMode)return;$('lisDeg').textContent=lisAnsText(q);lisHistPush(it);},(lead+dur)*1000);
  lisTimer=setTimeout(lisStep,(lead+dur+T(LIS_PAUSE[progress.lis.gap]))*1000);
}
