import {createHash} from 'node:crypto';
import {normalizeUrl} from '../dist/domain.js';
export function profileUrl(value){const u=new URL(normalizeUrl(value,true));if(u.port)throw new Error('账号链接不能带端口。');u.search='';u.hash='';return u.href;}
export const fingerprint=input=>createHash('sha256').update(JSON.stringify(input)).digest('hex');
const str=(v,max=20000)=>typeof v==='string'?v.trim().slice(0,max):'';
export function validateInput(raw){
 const input={taskId:str(raw.taskId,80),inputRevision:raw.inputRevision,url:profileUrl(raw.url),ownUrl:raw.ownUrl?profileUrl(raw.ownUrl):'',profile:{direction:str(raw.profile?.direction,600),skills:str(raw.profile?.skills,800),audience:str(raw.profile?.audience,800)}};
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(input.taskId)||!Number.isInteger(input.inputRevision)||input.inputRevision<1||!input.profile.direction)throw new Error('请提供任务、方向和有效的输入版本。');
 if(new URL(input.url).hostname==='v.douyin.com'||input.ownUrl&&new URL(input.ownUrl).hostname==='v.douyin.com')throw new Error('自动采集请粘贴打开后的完整抖音账号主页链接。');
 return input;
}
function workUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!['www.douyin.com','douyin.com'].includes(u.hostname)||!/^\/(video|note)\/\d+$/.test(u.pathname))throw new Error('作品来源必须是抖音作品链接。');return 'https://www.douyin.com'+u.pathname;}
export function parseCount(label){if(typeof label!=='string'||!/^\d+(\.\d+)?[万亿]?$/.test(label.trim()))return null;const value=parseFloat(label);return Math.round(value*(label.endsWith('万')?10000:label.endsWith('亿')?100000000:1));}
export function validateCapture(raw,expectedUrl,role){
 if(!raw||typeof raw!=='object'||profileUrl(raw.requestedUrl)!==expectedUrl||profileUrl(raw.url)!==expectedUrl)throw new Error('采集结果与本任务账号不匹配。');
 const name=str(raw.name,150),profileText=str(raw.profileText,6000);
 if(!name||!profileText||/验证码|验证后|完成验证/.test(name))throw new Error('尚未读到账号主页，请在抖音完成验证后重试。');
 if(!raw.capturedAt||!Number.isFinite(Date.parse(raw.capturedAt))||Math.abs(Date.now()-Date.parse(raw.capturedAt))>86400000)throw new Error('采集记录已超过 24 小时，请重新读取。');
 if(!['browser_extension','host_browser'].includes(raw.method))throw new Error('未知的采集来源。');
 const works=(Array.isArray(raw.works)?raw.works:[]).slice(0,30).map(w=>({url:workUrl(w.url),title:str(w.title,4000),likesLabel:str(w.likesLabel,40),likes:parseCount(str(w.likesLabel,40)),pinned:!!w.pinned})).filter(w=>w.title);
 if(new Set(works.map(w=>w.url)).size!==works.length)throw new Error('作品列表存在重复来源。');
 const videos=(Array.isArray(raw.videos)?raw.videos:[]).slice(0,5).map(v=>{
  const url=workUrl(v.url);if(!works.some(w=>w.url===url))throw new Error('视频材料未出现在本次账号作品列表中。');
  if(v.authorUrl&&profileUrl(v.authorUrl)!==expectedUrl)throw new Error('视频作者与采集账号不符。');
  return {url,description:str(v.description,5000),chapters:str(v.chapters,12000),visualNotes:str(v.visualNotes,5000),transcript:str(v.transcript,20000)};
 });
 if(new Set(videos.map(v=>v.url)).size!==videos.length)throw new Error('视频详情来源重复。');
 return {role,url:expectedUrl,name,profileText,capturedAt:raw.capturedAt,method:raw.method,works,videos,visualNotes:str(raw.visualNotes,5000),missing:(raw.missing||[]).map(x=>str(x,600)).slice(0,12)};
}
export function makeMaterials(captures){
 const materials=[];
 for(const c of captures){
  const base={kind:'capture',blob:null,observedAt:c.capturedAt,addedAt:c.capturedAt,subjectRole:c.role,collectionMethod:c.method};
  const add=(suffix,title,text,sourceUrl,coverage)=>materials.push({...base,id:c.role+'-'+suffix,title,text,sourceUrl,coverage});
  add('profile',c.name+' · 主页资料',c.profileText,c.url,'浏览器公开页面文字；不是后台数据。');
  if(c.visualNotes)add('visual',c.name+' · 主页视觉观察',c.visualNotes,c.url,'宿主实际截图观察；不等于视频镜头分析。');
  for(const w of c.works){const id=new URL(w.url).pathname.split('/').at(-1);add('work-'+id,w.title.split('#')[0].slice(0,100),w.title+'\n主页点赞显示：'+(w.likesLabel||'未取得')+(w.pinned?'\n主页置顶':''),w.url,'作品标题与主页点赞；数值可能为平台四舍五入显示，不代表播放量。');}
  for(const v of c.videos){const id=new URL(v.url).pathname.split('/').at(-1);if(v.chapters||v.transcript||v.visualNotes)add('detail-'+id,c.name+' · 作品内容 '+id,[v.description,v.chapters?'平台章节摘要（可能含识别错误，非逐字稿）：\n'+v.chapters:'',v.visualNotes?'实际画面观察：\n'+v.visualNotes:'',v.transcript?'已取得的正文：\n'+v.transcript:''].filter(Boolean).join('\n\n'),v.url,v.transcript?'已提供正文，完整性仍以来源说明为准。':'仅页面章节摘要或局部画面；没有完整口播、逐镜头时序。');}
 }
 if(new Set(materials.map(m=>m.id)).size!==materials.length)throw new Error('材料引用标识重复。');
 return materials;
}
export function coverage(captures){
 const b=captures.find(c=>c.role==='benchmark'),own=captures.find(c=>c.role==='self');
 const values=(b?.works||[]).map(w=>w.likes).filter(x=>x!==null).sort((a,b)=>a-b);
 const median=values.length?(values[Math.floor((values.length-1)/2)]+values[Math.floor(values.length/2)])/2:null;
 return {benchmarkName:b?.name||'',ownName:own?.name||'',workCount:b?.works.length||0,ownWorkCount:own?.works.length||0,chapterCount:b?.videos.filter(v=>v.chapters).length||0,transcriptCount:b?.videos.filter(v=>v.transcript).length||0,likesMedian:median,collectionMethods:[...new Set(captures.map(c=>c.method))],capturedAt:b?.capturedAt||'',missing:[...new Set(captures.flatMap(c=>c.missing)),'无后台播放、留存、转化或收入数据。',...(!b?.videos.some(v=>v.transcript)?['未取得完整视频逐字稿；章节摘要只支持章节层面的结构判断。']:[])]};
}
