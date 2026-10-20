import {api,getEngine,requestBrowser,pingBrowser} from './analysis.js';
import {createTask,updateProfile,addMaterial,saveReport,selectIdea,reportStale,exportTask,exportCandidate,markdownReport,copy,applyGeneratedReport} from './domain.js';
import {listTasks,persistTask} from './storage.js';
import {makeDemo} from './demo.js';
const app=document.querySelector('#app'),state={tasks:[],task:null,tab:'materials',reportId:null,editing:false,draft:null,storageError:'',drafts:new Map(),formDirty:false,jobs:new Map(),engine:null,bridge:false};
let blobs=[],timer,busy=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+({plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',file:'<path d="M14 3H5v18h14V8l-5-5Z"/><path d="M14 3v5h5M8 12h8M8 16h5"/>',check:'<path d="m5 12 4 4L19 6"/>',box:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h4"/>',out:'<path d="M14 4h6v6m0-6-9 9M10 4H4v16h16v-6"/>',download:'<path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4"/>'}[name]||'')+'</svg>';
function toast(text,error=false){const el=document.querySelector('#notice');el.textContent=text;el.className='toast'+(error?' error':'');el.hidden=false;clearTimeout(timer);timer=setTimeout(()=>el.hidden=true,error?9000:3500);}
function fileUrl(blob){const url=URL.createObjectURL(blob);blobs.push(url);return url;}
function route(){rememberDraft();state.formDirty=false;let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{id='';}state.task=id==='sample'?state.tasks.find(t=>t.id==='sample-xilo-v1')||makeDemo():state.tasks.find(t=>t.id===id)||null;state.tab='report';state.reportId=null;state.editing=false;state.draft=null;render();window.scrollTo({top:0,behavior:'instant'});}
function navigate(id=''){if(location.hash==='#'+id||(!location.hash&&!id))route();else location.hash=id;}
function currentReport(){return state.task?.reports.find(r=>r.id===state.reportId)||state.task?.reports.at(-1);}
async function store(task){const saved=await persistTask(task);state.tasks=[saved,...state.tasks.filter(t=>t.id!==saved.id)];state.task=saved;}
function profileFields(p={}){return '<div class="field full"><label for="ownUrl">我的抖音主页 <span class="optional">选填</span></label><input id="ownUrl" name="ownUrl" type="url" value="'+esc(state.task?.ownUrl||'')+'" placeholder="用于生成适合我的账号搭建方案"></div>'+ '<div class="field full"><label for="direction">我想做什么账号</label><textarea id="direction" name="direction" required maxlength="600" placeholder="例如：分享怎样用 AI 完成真实工作，帮助有想法的人做出自己的作品。">'+esc(p.direction)+'</textarea></div><div class="field"><label for="skills">我擅长什么 <span class="optional">选填</span></label><input id="skills" name="skills" maxlength="400" value="'+esc(p.skills)+'" placeholder="例如：软件开发、设计、门店经营"></div><div class="field"><label for="audience">希望谁关注我 <span class="optional">选填</span></label><input id="audience" name="audience" maxlength="400" value="'+esc(p.audience)+'" placeholder="不确定也可以，后续继续调整"></div>';}
function newPage(){
return '<section class="start"><h1>对标账号分析</h1><p class="intro">看看好账号怎么做，再找到适合你的做法。</p>'+
'<form id="new-task"><div class="field"><label for="url">对标账号主页</label><input id="url" name="url" type="url" required placeholder="粘贴抖音账号主页链接" maxlength="1500"></div>'+
'<div class="field"><label for="direction">你想做什么账号？</label><textarea id="direction" name="direction" required maxlength="600" placeholder="例如：分享怎样用 AI 构建自己的工作，记录真实项目和工具实践。"></textarea></div>'+
'<div class="field"><label for="ownUrl">我的账号主页 <span class="optional">选填</span></label><input id="ownUrl" name="ownUrl" type="url" maxlength="1500" placeholder="加入你的抖音主页，一起生成账号搭建建议"></div>'+
'<details class="optional-fields"><summary>补充个人背景 <span class="optional">选填</span></summary><div class="form-grid"><div class="field"><label for="skills">我擅长什么</label><input id="skills" name="skills" maxlength="400" placeholder="开发、设计、门店经营…"></div><div class="field"><label for="audience">希望谁关注我</label><input id="audience" name="audience" maxlength="400" placeholder="不确定可以留空"></div></div></details>'+
'<button class="btn primary start-button" type="submit">开始分析 '+icon('arrow')+'</button>'+
'<p class="capability-note">当前支持抖音。首次读取主页需连接浏览器或由当前会话辅助。</p></form>'+
'<button class="text-button sample-link" data-action="sample">先看一份历史样例 '+icon('arrow')+'</button></section>';
}
function taskPage(){
const t=state.task,sample=t.mode==='sample',r=currentReport();
const versions=t.reports.length>1?'<label class="version-label" for="report-version">报告版本</label><select id="report-version" aria-label="报告版本">'+t.reports.map(v=>'<option value="'+v.id+'" '+(r.id===v.id?'selected':'')+'>v'+v.version+' · '+(v.origin==='sample'?'历史样例':v.origin==='model'?'AI 生成':'人工整理')+'</option>').join('')+'</select>':'';
return '<div class="task-heading"><h1>'+esc(t.title)+'</h1><details class="menu task-menu"><summary>更多 '+icon('box')+'</summary><div class="menu-items">'+
(!sample?'<button data-action="edit-profile">调整账号方向</button>':'')+
'<button data-action="tab" data-tab="materials">查看与补充材料</button><button data-action="tab" data-tab="cards">已选选题'+(t.cards.length?' · '+t.cards.length:'')+'</button>'+
(!sample&&r?'<button data-action="analyze">重新分析</button>':'')+
'<a href="'+esc(t.url)+'" target="_blank" rel="noopener noreferrer">打开对标主页 ↗</a><button data-action="export-json">导出研究数据</button>'+
(!sample&&t.materials.length&&r?.origin!=='model'?'<button data-action="edit-report">人工整理报告</button>':'')+versions+'</div></details></div>'+
(sample?'<p class="context-note">历史样例，非实时分析。 <button class="text-button" data-action="new">开始我的分析 ↗</button></p>':'')+
(!sample?'<details class="profile-summary" id="profile-settings" hidden><summary>调整账号方向</summary><form id="profile"><div class="form-grid">'+profileFields(t.profile)+'</div><div class="form-actions"><span class="muted">保存后，已有报告会保留原背景。</span><button class="btn primary small" type="submit">保存方向</button></div></form></details>'+analysisPanel():'')+
(r?'<div class="result-navigation"><nav class="tabs" aria-label="分析结果">'+[['report','对标拆解'],['build','我的账号搭建']].map(([id,label])=>'<button aria-pressed="'+(state.tab===id)+'" class="tab '+(state.tab===id?'active':'')+'" data-action="tab" data-tab="'+id+'">'+label+'</button>').join('')+'</nav><button class="text-button export-report" data-action="export-md">'+icon('download')+' 导出报告</button></div>':'')+
(['materials','cards'].includes(state.tab)?'<div class="secondary-heading"><button class="text-button" data-action="tab" data-tab="report">← 返回分析结果</button></div>':'')+
(state.tab==='materials'?materialsPage():state.tab==='build'?buildPage():state.tab==='cards'?cardsPage():reportPage());
}
function materialCard(m,index,prefix='source'){let preview='';if(m.blob){const url=fileUrl(m.blob);if(m.mime?.startsWith('image/'))preview='<img src="'+url+'" alt="'+esc(m.title)+'">';else if(m.mime?.startsWith('video/'))preview='<video src="'+url+'" controls preload="metadata"></video>';preview+='<p><a href="'+url+'" download="'+esc(m.fileName||m.title)+'">下载原文件</a></p>';}
return '<article class="material" id="'+prefix+'-'+esc(m.id)+'"><div class="material-header"><div class="material-icon">'+icon('file')+'</div><div><h3>'+String(index+1).padStart(2,'0')+' / '+esc(m.title)+'</h3><span class="muted">'+(m.kind==='file'?'文件材料':'文字记录')+' · '+esc(m.observedAt||'观察日期未填写')+'</span></div></div><p>'+esc(m.text||'尚无文字观察记录。')+'</p><div class="source">'+(m.sourceUrl?'<a href="'+esc(m.sourceUrl)+'" target="_blank" rel="noopener noreferrer">打开来源 ↗</a>':'<span>用户补充，无公开链接</span>')+'</div><p class="muted">'+esc(m.coverage)+'</p>'+(preview?'<details><summary>查看已保存的文件</summary>'+preview+'</details>':'')+'</article>';}
function materialsPage(){const t=state.task;return '<div class="section-grid"><section><div class="section-title"><h2>本次研究的材料</h2><span class="muted">'+t.materials.length+' 份材料</span></div>'+(t.materials.length?t.materials.map((m,i)=>materialCard(m,i)).join(''):'<div class="empty"><div class="empty-icon">'+icon('file')+'</div><h3>从一份真实材料开始</h3><p>可先补充主页截图或观察记录。只有封面时，完整口播与分镜仍保持未知。</p></div>')+'<div class="notice-box neutral"><strong>当前缺口</strong><br>'+esc(currentReport()?.coverage?.missing?.join(' ')||'尚无完整口播、镜头时序或后台留存数据。上传文件只表示材料已保存。')+'</div></section>'+(t.mode==='sample'?'<section class="panel"><div class="eyebrow">EVIDENCE FIRST</div><h2>为什么要保留来源？</h2><p class="subtitle">每条分析都应能回答：看到了什么，依据在哪，还有什么不知道。</p><p class="subtitle">这个样例只保留了历史观察摘要，因此不会展示虚构的逐字稿、时间戳或后台指标。</p><div class="form-actions"><button class="btn primary" data-action="tab" data-tab="report">查看拆解报告 '+icon('arrow')+'</button></div></section>':'<section class="panel"><div class="panel-title"><h2>补充一份材料</h2><span class="badge outline">可选补充</span></div><form id="material"><div class="form-grid"><div class="field full"><label for="material-title">材料名称</label><input id="material-title" name="title" maxlength="120" placeholder="例如：主页截图 / 代表作品的观察"></div><div class="field full"><label for="material-source">来源链接 <span class="optional">选填</span></label><input id="material-source" name="sourceUrl" type="url" value="'+esc(t.url)+'" maxlength="1500"></div><div class="field full"><label for="material-text">我实际看到了什么 <span class="optional">文字或文件至少提供一项</span></label><textarea id="material-text" name="text" maxlength="20000" placeholder="记录实际看到的标题、画面或口播。没有取得的部分请写明。"></textarea></div><div class="field full"><label for="material-file">截图、视频或文稿 <span class="optional">单个文件不超过 50 MB</span></label><input id="material-file" name="file" type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,text/plain,.md"></div><div class="field full"><label for="observedAt">观察日期 <span class="optional">未知可留空</span></label><input id="observedAt" name="observedAt" type="date"></div></div><div class="form-actions"><span class="muted">原文件只保存在当前浏览器。</span><button class="btn primary" type="submit">'+icon('plus')+' 保存材料</button></div></form></section>')+'</div>';}
function citation(m){return '<button class="citation" data-action="source" data-id="'+esc(m.id)+'">'+icon('file')+' '+esc(m.title)+'</button>';}
function evidenceLinks(ids,r){
const sources=ids.map(id=>r.materials.find(m=>m.id===id)).filter(Boolean);
return '<details class="citations"><summary>来源 · '+sources.length+'</summary><div>'+sources.map(citation).join('')+'</div></details>';
}
function reportSources(r){
return '<details class="profile-summary" id="report-sources"><summary>分析依据与范围 <span class="optional">'+r.materials.length+' 份材料</span></summary><div class="evidence-detail"><p>'+esc(r.limitations||'依据当前材料整理，未覆盖完整视频和后台数据。')+'</p><p class="muted">本次账号方向：'+esc(r.profile.direction)+'</p>'+r.materials.map((m,i)=>materialCard(m,i,'report-source')).join('')+'</div></details>';
}
function reportPage(){
if(state.editing)return editorPage();const t=state.task,r=currentReport();if(!r)return '';
const stale=reportStale(t,r),groups=[...new Set(r.insights.map(i=>i.dimension))];
return (stale?'<p class="notice-box">你的方向或材料有更新，这份报告仍基于旧输入。可在「更多」中重新分析。</p>':'')+
(r.summary?'<section class="report-summary"><p>'+esc(r.summary)+'</p></section>':'')+coverageBadges(r)+
'<div class="insight-groups">'+groups.map((dimension,n)=>'<section class="insight-group"><h2><span>'+String(n+1).padStart(2,'0')+'</span>'+esc(dimension)+'</h2><div>'+r.insights.filter(i=>i.dimension===dimension).map(i=>'<article class="insight"><span class="insight-type '+(i.type==='proposal'?'proposal':'')+'">'+(i.type==='proposal'?'建议':i.type==='inference'?'推测':'观察')+'</span><div><p>'+esc(i.text)+'</p>'+evidenceLinks(i.sourceIds,r)+'</div></article>').join('')+'</div></section>').join('')+'</div>'+
(r.ideas.length?'<section class="ideas-section"><h2>适合你的选题</h2>'+r.ideas.map((i,index)=>{const picked=t.cards.some(c=>c.reportId===r.id&&c.ideaId===i.id);return '<details class="idea" '+(state.expandedIdea===i.id?'open':'')+'><summary><span class="index">'+String(index+1).padStart(2,'0')+'</span><h3>'+esc(i.title)+'</h3><span class="fold-mark" aria-hidden="true">＋</span></summary><div class="idea-content"><p>'+esc(i.reason)+'</p>'+evidenceLinks(i.sourceIds,r)+'<button class="btn small" data-action="pick" data-id="'+i.id+'" '+(stale||picked?'disabled':'')+'>'+(picked?'已加入候选':'保留这个选题')+'</button></div></details>';}).join('')+'</section>':'')+
reportSources(r);
}

const dimensions=['账号定位','受众判断','选题方向','视觉表达','作品结构'];
function sourceOptions(id){return '<option value="">选择材料依据</option>'+state.task.materials.map(m=>'<option value="'+m.id+'" '+(m.id===id?'selected':'')+'>'+esc(m.title)+'</option>').join('');}
function readDraft(){const form=document.querySelector('#report-editor');if(!form)return;const data=new FormData(form);state.draft.insights=state.draft.insights.map((_,n)=>({dimension:data.get('dimension-'+n),type:data.get('type-'+n),text:data.get('insight-'+n),sourceIds:[data.get('source-'+n)].filter(Boolean)}));state.draft.ideas=state.draft.ideas.map((_,n)=>({title:data.get('idea-title-'+n),reason:data.get('idea-reason-'+n),sourceIds:[data.get('idea-source-'+n)].filter(Boolean)}));state.draft.limitations=data.get('limitations');}
function editorPage(){const d=state.draft;return '<section class="panel"><div class="panel-title"><div><h2>人工整理拆解报告</h2><p class="muted">草稿暂存在当前页面；保存后才会保留为独立报告版本。</p></div><button class="btn quiet small" data-action="cancel-editor">返回报告</button></div><form id="report-editor">'+d.insights.map((i,n)=>'<div class="editor-row"><div class="form-grid"><div class="field"><label for="dimension-'+n+'">分析维度</label><select id="dimension-'+n+'" name="dimension-'+n+'">'+dimensions.map(v=>'<option '+(v===i.dimension?'selected':'')+'>'+v+'</option>').join('')+'</select></div><div class="field"><label for="type-'+n+'">判断类型</label><select id="type-'+n+'" name="type-'+n+'"><option value="observation" '+(i.type==='observation'?'selected':'')+'>观察记录</option><option value="inference" '+(i.type==='inference'?'selected':'')+'>推测 · 待验证</option></select></div><div class="field full"><label for="insight-'+n+'">结论 '+(n+1)+'</label><textarea id="insight-'+n+'" name="insight-'+n+'" maxlength="4000" placeholder="具体观察或判断">'+esc(i.text)+'</textarea></div><div class="field full"><label for="source-'+n+'">材料依据</label><select id="source-'+n+'" name="source-'+n+'">'+sourceOptions(i.sourceIds?.[0])+'</select></div></div></div>').join('')+'<div class="editor-actions"><button type="button" class="btn small" data-action="add-insight">'+icon('plus')+' 再记一条结论</button></div><div class="section-title"><h2>可以开始制作的选题</h2><span class="muted">选填</span></div>'+d.ideas.map((i,n)=>'<div class="editor-row"><div class="form-grid"><div class="field full"><label for="idea-title-'+n+'">选题标题</label><input id="idea-title-'+n+'" name="idea-title-'+n+'" value="'+esc(i.title)+'" maxlength="160" placeholder="给一个具体任务或结果起标题"></div><div class="field full"><label for="idea-reason-'+n+'">为什么适合我的方向</label><textarea id="idea-reason-'+n+'" name="idea-reason-'+n+'" maxlength="2000">'+esc(i.reason)+'</textarea></div><div class="field full"><label for="idea-source-'+n+'">借鉴来源</label><select id="idea-source-'+n+'" name="idea-source-'+n+'">'+sourceOptions(i.sourceIds?.[0])+'</select></div></div></div>').join('')+'<div class="editor-actions"><button type="button" class="btn small" data-action="add-idea">'+icon('plus')+' 再加一个选题</button></div><div class="field full"><label for="limitations">这份报告还缺什么</label><textarea id="limitations" name="limitations" maxlength="2000" placeholder="例如：只有主页截图，尚未取得完整视频口播。">'+esc(d.limitations)+'</textarea></div><div class="form-actions"><span class="muted">报告 v'+(state.task.reports.length+1)+' · 保留当前输入 v'+state.task.revision+'</span><button class="btn primary" type="submit">'+icon('check')+' 保存报告</button></div></form></section>';}
function cardsPage(){const t=state.task;if(!t.cards.length)return '<div class="empty"><div class="empty-icon">'+icon('box')+'</div><h3>保留候选，交给下一步筛选</h3><p>在拆解报告中选取候选建议，保存来源、适配理由和背景，交给后续选题模块。</p><button class="btn primary" data-action="tab" data-tab="report">去报告里选一条 '+icon('arrow')+'</button></div>';
return '<div class="section-title"><h2>候选选题交接</h2><span class="muted">仅为候选，尚未最终入选或排期</span></div>'+t.cards.map(c=>'<article class="card-detail"><span class="badge '+(c.mode==='sample'?'sample':'')+'">'+(c.mode==='sample'?'样例候选卡 · 预览':'候选 · 尚未入选或排期')+'</span><h2>'+esc(c.title)+'</h2><p>'+esc(c.reason)+'</p>'+(c.inputRevision!==t.revision?'<div class="notice-box">此卡片保留了旧版背景，请结合最新方向重新确认。</div>':'')+'<dl><dt>账号方向</dt><dd>'+esc(c.profile.direction)+'</dd><dt>借鉴来源</dt><dd>'+c.sources.map(m=>esc(m.title)).join('、')+'</dd><dt>报告版本</dt><dd>v'+c.reportVersion+' · 输入 v'+c.inputRevision+'</dd><dt>接下来准备</dt><dd>真实操作结果、关键步骤及仍缺失的素材。</dd></dl><div class="form-actions"><span class="muted">背景与来源已随卡片保存。</span><button class="btn small" data-action="export-card" data-id="'+c.id+'">'+icon('download')+' 导出内容卡</button></div></article>').join('');}
function render(){
blobs.forEach(URL.revokeObjectURL);blobs=[];const t=state.task,history=state.tasks.filter(x=>x.mode!=='sample');
app.innerHTML='<header class="site-header"><button class="brand" data-action="new" aria-label="月老首页"><span class="brand-icon">◔</span>月老<span class="brand-feature">对标账号分析</span></button><nav aria-label="页面导航">'+
'<details class="menu history-menu"><summary>历史记录</summary><div class="menu-items">'+(history.length?history.map(x=>'<button class="'+(x.id===t?.id?'selected':'')+'" data-action="open" data-id="'+x.id+'"><span>'+esc(x.title)+'</span><small>'+x.reports.length+' 份报告</small></button>').join(''):'<p class="muted">还没有分析记录。</p>')+'</div></details>'+
(t?'<button class="btn small" data-action="new">'+icon('plus')+' 新分析</button>':'')+'</nav></header>'+
'<main class="content '+(t?'research-content':'home-content')+'">'+(state.storageError?'<div class="notice-box">'+esc(state.storageError)+'</div>':'')+(t?taskPage():newPage())+'</main>';
}

function download(data,name,type='application/json'){const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function rememberDraft(){if(state.editing&&state.task){readDraft();state.drafts.set(state.task.id,copy(state.draft));}}
function startEditor(){const r=currentReport();if(r?.origin==='model')throw new Error('AI 报告保留完整来源与搭建方案，请更新背景后重新分析。');state.draft=state.drafts.has(state.task.id)?copy(state.drafts.get(state.task.id)):r?{insights:copy(r.insights),ideas:copy(r.ideas),limitations:r.limitations}:{insights:[{dimension:'账号定位',type:'observation',text:'',sourceIds:[]}],ideas:[{title:'',reason:'',sourceIds:[]}],limitations:'仅依据当前材料人工整理，尚未取得完整视频和后台数据。'};state.editing=true;state.tab='report';render();}
app.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b||busy)return;const menu=b.closest('details.menu');if(menu)menu.open=false;try{switch(b.dataset.action){
case 'edit-profile':{const el=document.querySelector('#profile-settings');el.hidden=false;el.open=true;el.querySelector('textarea')?.focus();break;}
case 'show-sources':{const el=document.querySelector('#report-sources');if(el){el.open=true;el.scrollIntoView({block:'start'});}break;}
case 'new':navigate();break;
case 'sample':navigate('sample');break;
case 'open':navigate(b.dataset.id);break;
case 'tab':rememberDraft();state.tab=b.dataset.tab;state.editing=false;render();break;
case 'source':{const group=document.querySelector('#report-sources');if(group){group.open=true;const el=document.getElementById('report-source-'+b.dataset.id);el?.scrollIntoView({block:'center'});el?.classList.add('source-focus');}break;}
case 'resume-analysis':networkFailures.delete(state.task.id);await pollJob(state.task.id);break;
case 'analyze':busy=true;await startAnalysis();break;
case 'collect':requestBrowser(state.task.analysis.id);toast('已请求浏览器采集。遇到验证时请在抖音页面完成。');break;
case 'retry-generate':await api('/api/jobs/'+state.task.analysis.id+'/generate',{});await pollJob(state.task.id);break;
case 'cancel-analysis':await api('/api/jobs/'+state.task.analysis.id+'/cancel',{});await pollJob(state.task.id);break;
case 'copy-build':{const step=currentReport().accountBuild[Number(b.dataset.index)];await navigator.clipboard.writeText(step.copyText);toast('已复制，可按需修改后使用。');break;}
case 'edit-report':startEditor();break;
case 'cancel-editor':rememberDraft();state.editing=false;render();break;
case 'add-insight':readDraft();state.draft.insights.push({dimension:'选题方向',type:'observation',text:'',sourceIds:[]});render();break;
case 'add-idea':readDraft();state.draft.ideas.push({title:'',reason:'',sourceIds:[]});render();break;
case 'pick':{busy=true;await store(selectIdea(state.task,currentReport().id,b.dataset.id));state.expandedIdea=b.dataset.id;render();toast(state.task.mode==='sample'?'已保存样例候选':'已保留，可在「更多 → 已选选题」查看');break;}
case 'export-json':download(exportTask(state.task),'对标研究-'+state.task.id+'.json');toast('已导出文字与来源；附件原文件不包含在内。');break;
case 'export-md':download(markdownReport(state.task,currentReport()),'拆解报告-v'+currentReport().version+'.md','text/markdown;charset=utf-8');break;
case 'export-card':{download(exportCandidate(state.task,b.dataset.id),'内容卡-'+b.dataset.id+'.json');break;}
}}catch(error){toast(error.message,true);}finally{busy=false;}});
app.addEventListener('input',e=>{if(e.target.closest('#profile,#material'))state.formDirty=true;if(e.target.closest('#report-editor'))rememberDraft();});
app.addEventListener('change',e=>{if(e.target.closest('#profile,#material'))state.formDirty=true;if(e.target.closest('#report-editor'))rememberDraft();if(e.target.id==='report-version'){rememberDraft();state.reportId=e.target.value;state.editing=false;state.tab='report';render();}});
app.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const form=e.target,data=Object.fromEntries(new FormData(form)),submit=form.querySelector('[type=submit]');busy=true;if(submit)submit.disabled=true;
try{
if(form.id==='new-task'){for(const value of [data.url,data.ownUrl].filter(Boolean)){const u=new URL(value);if(u.hostname==='v.douyin.com')throw new Error('请先打开分享短链接，再复制完整抖音账号主页链接。');}const task=createTask(data);await store(task);navigate(task.id);toast('研究任务已保存，正在准备分析。');await startAnalysis();}
if(form.id==='profile'){state.formDirty=false;await store(updateProfile(state.task,data));render();toast('账号背景已保存。');}
if(form.id==='material'){const file=data.file?.size?data.file:null;if(file && !(/^(image\/(png|jpeg|webp)|video\/(mp4|webm)|text\/plain)$/.test(file.type)||/\.(txt|md)$/i.test(file.name)))throw new Error('请选择 PNG、JPG、WebP、MP4、WebM 或文本文件。');await store(addMaterial(state.task,{...data,title:data.title||file?.name,blob:file,fileName:file?.name}));state.formDirty=false;render();toast('材料已保存，尚未自动分析内容。');}
if(form.id==='report-editor'){readDraft();const d=state.draft;await store(saveReport(state.task,{insights:d.insights.filter(i=>i.text?.trim()),ideas:d.ideas.filter(i=>i.title?.trim()||i.reason?.trim()),limitations:d.limitations}));state.drafts.delete(state.task.id);state.draft=null;state.editing=false;state.reportId=null;render();toast('报告已保存，来源和背景已随版本保留。');}
}catch(error){toast(error.message,true);}finally{busy=false;if(submit)submit.disabled=false;}});
window.addEventListener('beforeunload',e=>{if(state.drafts.size||state.formDirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('hashchange',route);
app.innerHTML='<div class="loading">正在打开分析…</div>';
try{state.tasks=await listTasks();}catch(e){state.storageError=e.message;}
route();

function coverageBadges(r){
const c=r.coverage;if(!c)return '<p class="coverage-note">依据已保存材料整理。 <button class="text-button" data-action="show-sources">查看依据</button></p>';
return '<p class="coverage-note">依据 '+c.workCount+' 条对标作品'+(c.chapterCount?'、'+c.chapterCount+' 条章节摘要':'')+'。'+(!c.transcriptCount?'未取得完整口播。':'含 '+c.transcriptCount+' 条逐字稿。')+' <button class="text-button" data-action="show-sources">查看依据</button></p>';
}

function analysisPanel(){
const t=state.task,j=state.jobs.get(t.analysis?.id),s=j?.status||t.analysis?.status,r=currentReport(),pending=['needs_browser','analyzing'].includes(s);
if(r&&(!s||s==='complete'||s==='cancelled')&&!state.formDirty&&!state.editing)return '<div id="analysis-status"></div>';
if(s==='complete')return '<div id="analysis-status"><p class="context-note" aria-live="polite">新的分析报告已保存。 <button class="text-button" data-action="tab" data-tab="report">查看结果</button></p></div>';
const title=s==='analyzing'?'正在生成分析报告':s==='needs_browser'?'等待读取抖音主页':s==='connection_error'?'本地连接暂时中断':s==='failed'?'这次分析未完成':s==='cancelled'?'分析已取消':'准备分析这个账号';
const explanation=s==='analyzing'?'正在整理定位、选题和适合你的建议。':s==='needs_browser'?(state.bridge?'请在打开的抖音页面完成登录或验证。':'当前浏览器还未连接采集工具，需要连接后读取，或由当前会话辅助采集。'):s==='cancelled'?'已有报告和材料仍保留。':s==='failed'?'材料已保留，可以重试。':'';
return '<div id="analysis-status"><section class="analysis-panel" aria-live="polite"><div><h2>'+title+'</h2>'+(explanation?'<p class="muted">'+explanation+'</p>':'')+(j?.error?'<p class="error-text">'+esc(j.error)+'</p>':'')+'</div><div class="button-row">'+
(!pending&&s!=='connection_error'?'<button class="btn primary small" data-action="analyze">'+(s==='failed'?'重新分析':'开始分析')+'</button>':'')+
(s==='needs_browser'&&state.bridge?'<button class="btn primary small" data-action="collect">读取主页</button>':'')+
(s==='failed'||s==='needs_browser'&&j?.captures?.length>=(t.ownUrl?2:1)?'<button class="btn small" data-action="retry-generate">用已有材料重试</button>':'')+
(s==='connection_error'?'<button class="btn primary small" data-action="resume-analysis">继续检查</button>':'')+
(pending?'<button class="text-button" data-action="cancel-analysis">取消</button>':'')+'</div></section>'+
(s==='needs_browser'&&!state.bridge?'<details class="bridge-help"><summary>查看连接方式</summary><p>在 Chrome 或 Edge 加载项目 browser-collector 扩展，再在同一浏览器打开本页。扩展只读取指定的公开页面，登录和验证由你完成。独立采集尚未完成安装验收；当前会话可辅助采集。</p></details>':'')+'</div>';
}

function buildPage(){
const r=currentReport();if(!r?.accountBuild?.length)return '<div class="empty"><h3>这份报告还没有账号搭建方案</h3><p>新建分析时，加入你的方向和个人主页即可一起生成。</p><button class="btn" data-action="new">新建分析</button></div>';
return '<p class="build-intro">'+(r.ownUrl?'结合你的主页与方向，按下面六步设置账号。':'根据你的方向给出的搭建建议，未进行个人主页诊断。')+'内容可复制后调整。</p>'+
(reportStale(state.task,r)?'<p class="notice-box">方向已有更新，此方案保留旧输入，建议重新分析。</p>':'')+
'<div class="build-list">'+r.accountBuild.map((item,index)=>'<details class="build-card" '+(index===0?'open':'')+'><summary><span class="build-step">'+String(index+1).padStart(2,'0')+' / '+esc(item.step)+'</span><h3>'+esc(item.title)+'</h3><span class="fold-mark" aria-hidden="true">＋</span></summary><div class="build-content"><p>'+esc(item.content)+'</p><div class="copy-block"><pre>'+esc(item.copyText)+'</pre><button class="btn small" data-action="copy-build" data-index="'+index+'">复制'+esc(item.step==='头像'||item.step==='背景'?'提示词与建议':'内容')+'</button></div>'+evidenceLinks(item.sourceIds,r)+'</div></details>').join('')+'</div>'+reportSources(r);
}


const starting=new Set(),polling=new Set(),networkFailures=new Map();
function refreshAnalysisPanel(){
 const panel=document.querySelector('#analysis-status');if(!panel||!state.task)return;
 const j=state.jobs.get(state.task.analysis?.id),key=JSON.stringify({id:j?.id,status:j?.status,message:j?.message,error:j?.error,bridge:state.bridge});
 if(panel.dataset.key===key)return;
 const helpOpen=!!panel.querySelector('details[open]');panel.outerHTML=analysisPanel();
 const next=document.querySelector('#analysis-status');next.dataset.key=key;if(helpOpen&&next.querySelector('details'))next.querySelector('details').open=true;
}
async function startAnalysis(){
 const t=state.task;if(!t||t.mode==='sample'||starting.has(t.id))return;starting.add(t.id);
 try{
  const j=await api('/api/jobs',{taskId:t.id,inputRevision:t.revision,url:t.url,ownUrl:t.ownUrl||'',profile:t.profile});
  const saved=await persistTask({...t,analysis:{id:j.id,status:j.status}});
  state.tasks=[saved,...state.tasks.filter(x=>x.id!==saved.id)];state.jobs.set(j.id,j);
  if(state.task?.id===t.id){state.task=saved;refreshAnalysisPanel();}
  if(state.bridge)requestBrowser(j.id);void pollJob(t.id);
 }finally{starting.delete(t.id);}
}
async function pollJob(taskId){
 if(polling.has(taskId))return;const t=state.tasks.find(x=>x.id===taskId);if(!t?.analysis?.id)return;
 const id=t.analysis.id;polling.add(taskId);let repeat=false;
 try{
  const j=await api('/api/jobs/'+id);state.jobs.set(id,j);networkFailures.delete(taskId);
  const latest=state.tasks.find(x=>x.id===taskId);if(latest.analysis?.id!==id)return;
  if(j.status==='complete'&&!latest.reports.some(r=>r.jobId===id)){
   const saved=await persistTask(applyGeneratedReport(latest,j.result));
   state.tasks=[saved,...state.tasks.filter(x=>x.id!==saved.id)];
   if(state.task?.id===taskId){state.task=saved;if(!state.formDirty&&!state.editing){state.tab='report';state.reportId=null;render();}}
   toast('AI 报告与账号搭建方案已保存。');
  }
  if(state.task?.id===taskId)refreshAnalysisPanel();
  repeat=['needs_browser','analyzing'].includes(j.status);
 }catch(e){
  const fails=(networkFailures.get(taskId)||0)+1;networkFailures.set(taskId,fails);
  repeat=fails<4;if(!repeat){const old=state.jobs.get(id)||{};state.jobs.set(id,{...old,status:'connection_error',message:'本地连接暂时中断',error:'恢复服务后点击继续检查；报告不会丢失。'});if(state.task?.id===taskId)refreshAnalysisPanel();toast(e.message,true);}
 }finally{polling.delete(taskId);if(repeat)setTimeout(()=>void pollJob(taskId),networkFailures.has(taskId)?5000:2500);}
}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==window||e.data?.source!=='yuelao-collector')return;if(e.data.type==='ready'){state.bridge=true;const panel=document.querySelector('.bridge-help');if(panel)refreshAnalysisPanel();}if(e.data.type==='error')toast(e.data.message||'浏览器采集未完成。',true);});
getEngine().then(engine=>{state.engine=engine;pingBrowser();state.tasks.filter(t=>t.analysis?.id&&!t.reports.some(r=>r.jobId===t.analysis.id)).forEach(t=>void pollJob(t.id));}).catch(()=>{state.engine={engine:false};});
