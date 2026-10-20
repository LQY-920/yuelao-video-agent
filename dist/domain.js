export const copy = value => structuredClone(value);
export const uid = () => crypto.randomUUID();
export function normalizeUrl(value, douyinOnly=false) {
  if (!value?.trim()) return '';
  let url; try {url = new URL(value.trim());} catch {throw new Error('请输入完整链接，例如 https://www.douyin.com/user/…');}
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('请使用不含登录信息的 HTTPS 链接。');
  if (douyinOnly && (!['www.douyin.com','douyin.com','v.douyin.com'].includes(url.hostname) || (url.hostname !== 'v.douyin.com' && !url.pathname.startsWith('/user/')))) throw new Error('请输入抖音账号主页链接，或抖音分享短链接。');
  url.hash=''; return url.href;
}
export function createTask(input) {
  const url=normalizeUrl(input.url,true);
  if(!url) throw new Error('先填写要研究的账号链接。');
  if(!input.direction?.trim()) throw new Error('写一句你想做的账号方向，建议才有依据。');
  const now=new Date().toISOString();
  return {id:uid(),mode:'task',title:input.title?.trim() || '未命名对标',url,profile:{direction:input.direction.trim(),skills:input.skills?.trim()||'',audience:input.audience?.trim()||''},revision:1,createdAt:now,updatedAt:now,materials:[],reports:[],cards:[]};
}
function editable(task) {if(task.mode==='sample') throw new Error('历史样例只用于预览，请新建自己的任务。');}
export function updateProfile(task,input) {
  editable(task); const next=copy(task);
  if(!input.direction?.trim()) throw new Error('账号方向不能为空。');
  next.profile={direction:input.direction.trim(),skills:input.skills?.trim()||'',audience:input.audience?.trim()||''};
  if(JSON.stringify(next.profile)!==JSON.stringify(task.profile)){next.revision++;next.updatedAt=new Date().toISOString();}
  return next;
}
export function addMaterial(task,input) {
  editable(task);
  if(!input.title?.trim()) throw new Error('请填写材料名称。');
  if(!input.text?.trim() && !input.blob) throw new Error('请填写观察记录，或选择一个文件。');
  if(input.blob && input.blob.size>50*1024*1024) throw new Error('单个文件请控制在 50 MB 内。');
  const next=copy(task);
  next.materials.push({id:uid(),title:input.title.trim(),text:input.text?.trim()||'',sourceUrl:normalizeUrl(input.sourceUrl),observedAt:input.observedAt||'',addedAt:new Date().toISOString(),kind:input.blob?'file':'note',blob:input.blob||null,mime:input.blob?.type||'',fileName:input.fileName||'',coverage:input.blob?'仅保存文件，尚未自动识别内容':'用户提供的观察记录，尚未独立核验'});
  next.revision++;next.updatedAt=new Date().toISOString();return next;
}
export function saveReport(task,{insights,ideas=[],limitations=''}) {
  editable(task);
  if(!insights?.length) throw new Error('至少记录一条有材料依据的结论。');
  const validIds=new Set(task.materials.map(m=>m.id));
  for(const insight of insights){
    if(!insight.text?.trim() || !insight.sourceIds?.length || insight.sourceIds.some(id=>!validIds.has(id))) throw new Error('每条结论都需要内容及有效的材料引用。');
  }
  for(const idea of ideas){
    if(!idea.title?.trim() || !idea.reason?.trim() || !idea.sourceIds?.length || idea.sourceIds.some(id=>!validIds.has(id))) throw new Error('选题需要标题、借鉴理由及有效的材料引用。');
  }
  const next=copy(task);
  next.reports.push({id:uid(),version:next.reports.length+1,inputRevision:task.revision,createdAt:new Date().toISOString(),origin:'manual',profile:copy(task.profile),materials:copy(task.materials),insights:copy(insights),ideas:ideas.map(i=>({...copy(i),id:uid()})),limitations});
  next.updatedAt=new Date().toISOString();return next;
}
export const reportStale=(task,report)=>task.revision!==report.inputRevision;
export function selectIdea(task,reportId,ideaId){
  const report=task.reports.find(r=>r.id===reportId);
  if(!report) throw new Error('找不到报告。');
  if(reportStale(task,report)) throw new Error('背景或材料已有更新，请先保存新报告，再选题。');
  const idea=report.ideas.find(i=>i.id===ideaId);
  if(!idea) throw new Error('找不到选题。');
  const next=copy(task);
  const existing=next.cards.find(c=>c.reportId===reportId&&c.ideaId===ideaId);
  if(existing)return next;
  next.cards.push({id:uid(),taskId:task.id,mode:task.mode,status:'candidate',targetModule:'topics-and-scheduling',reportId,reportVersion:report.version,inputRevision:report.inputRevision,ideaId,createdAt:new Date().toISOString(),title:idea.title,reason:idea.reason,profile:copy(report.profile),sourceUrl:task.url,sources:copy(report.materials.filter(m=>idea.sourceIds.includes(m.id)))});
  return next;
}
function cleanMaterial(m){const {blob,...rest}=m;return {...rest,hasFile:!!blob,fileIncluded:false};}
export function exportTask(task){
  const next=copy(task);next.materials=next.materials.map(cleanMaterial);
  next.reports=next.reports.map(r=>({...r,materials:r.materials.map(cleanMaterial)}));
  next.cards=next.cards.map(c=>({...c,sources:c.sources.map(cleanMaterial)}));
  return {schemaVersion:1,exportedAt:new Date().toISOString(),notice:'导出包含文字和来源，不含附件原始文件；样例不代表实时分析。',task:next};
}
export function markdownReport(task,report){
  const lines=['# '+task.title,'','状态：'+(task.mode==='sample'?'历史样例，非实时分析':'人工整理报告'),'任务 ID：'+task.id,'报告 ID：'+report.id,'选题状态：候选，尚未最终入选或排期','主页：'+task.url,'报告版本：v'+report.version,'输入版本：'+report.inputRevision,'账号方向：'+report.profile.direction,'','## 分析覆盖范围',report.limitations||'仅依据下列材料；不包含后台留存、收入或未获取的视频内容。','','## 拆解结论'];
  for(const i of report.insights){lines.push('', '### '+i.dimension+' · '+(i.type==='inference'?'推测':'观察'),i.text,'依据：'+i.sourceIds.map(id=>report.materials.find(m=>m.id===id)?.title||'未知').join('、'));}
  lines.push('','## 下一步选题');for(const i of report.ideas)lines.push('',i.title,i.reason,'选题 ID：'+i.id,'材料引用：'+i.sourceIds.join('、'));
  lines.push('','## 材料来源');for(const m of report.materials)lines.push('',m.title,'材料 ID：'+m.id,m.sourceUrl||'用户补充，无公开链接','观察时间：'+(m.observedAt||'未知'),m.coverage,m.text||'附件未包含在本导出中。');
  return lines.join('\n');
}
export function exportCandidate(task,cardId){
  const exported=exportTask(task);
  const card=exported.task.cards.find(c=>c.id===cardId);
  if(!card)throw new Error('找不到候选交接卡。');
  return {schemaVersion:1,exportedAt:exported.exportedAt,notice:exported.notice,currentInputRevision:task.revision,reviewStatus:card.inputRevision===task.revision?'candidate':'needs_review',stale:card.inputRevision!==task.revision,card};
}
