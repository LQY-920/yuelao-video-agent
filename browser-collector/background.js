import {readDouyinPage} from './extract.js';
const running=new Set();
const origins=new Set(['http://localhost:4173','http://127.0.0.1:4173']);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function urlAllowed(value,kind){try{const u=new URL(value);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&['www.douyin.com','douyin.com'].includes(u.hostname)&&(kind==='profile'?/^\/user\/[^/]+$/:/^\/video\/\d+$/).test(u.pathname);}catch{return false;}}
function count(v){const n=parseFloat(v);return Number.isFinite(n)?n*(v.endsWith('万')?10000:v.endsWith('亿')?100000000:1):-1;}
async function readTab(tabId,mode,check,attempts=25){
 for(let i=0;i<attempts;i++){
  await check();
  try{const tab=await chrome.tabs.get(tabId);if(!urlAllowed(tab.url,mode==='profile'?'profile':'video')){await sleep(1500);continue;}
   const result=(await chrome.scripting.executeScript({target:{tabId},func:readDouyinPage,args:[mode]}))[0]?.result;
   if(result&&!result.blocked&&(mode==='profile'||result.chapters||i>7))return result;
  }catch{/* page may be navigating; keep permission failures visible at timeout */}
  await sleep(1500);
 }throw new Error('尚未读取到页面。请在抖音完成登录或验证码，再回工作台重试；没有跳过验证。');
}
async function collectProfile(url,check){
 await check();
 const tab=await chrome.tabs.create({url,active:true});
 // Keep the profile tab for the user to handle login/captcha. Only temporary video tabs are closed.
 const capture=await readTab(tab.id,'profile',check);capture.requestedUrl=url;
 const works=capture.works.filter(w=>urlAllowed(w.url,'video')&&count(w.likesLabel)>=0).sort((a,b)=>count(b.likesLabel)-count(a.likesLabel));
 const chosen=[...new Map([works[0],works[1],works.at(-1)].filter(Boolean).map(w=>[w.url,w])).values()];
 for(const work of chosen){
  await check();
  const detail=await chrome.tabs.create({url:work.url,active:false});
  try{const video=await readTab(detail.id,'video',check,10);capture.videos.push(video);}
  catch(e){if(e.message==='任务已取消或采集超时。')throw e;capture.missing.push('未取得作品章节：'+work.url);}
  finally{await chrome.tabs.remove(detail.id).catch(()=>{});}
 }
 if(capture.videos.some(v=>!v.authorUrl))capture.missing.push('部分视频未读取独立作者标识，归属依据是主页作品链接。');
 capture.missing.push('平台章节摘要不是完整逐字稿；没有完整视频转录。');return capture;
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message?.type!=='capture'||!sender.tab?.url)return;
 let senderOrigin;try{senderOrigin=new URL(sender.tab.url).origin;}catch{return;}
 if(!origins.has(senderOrigin)||message.origin!==senderOrigin)return;
 if(running.has(message.jobId)){respond({error:'这次采集正在进行，请先处理抖音页面上的验证。'});return;}
 if(!/^[a-f0-9-]{36}$/.test(message.jobId)||!/^[a-f0-9]{64}$/.test(message.token))return;
 running.add(message.jobId);
 (async()=>{
  const request=async(path,body)=>{const r=await fetch(senderOrigin+path,{method:body?'POST':'GET',signal:AbortSignal.timeout(10000),headers:{'X-Local-Token':message.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error||'本地工作台拒绝了请求。');return data;};
  const deadline=Date.now()+210000;
  const check=async()=>{if(Date.now()>deadline)throw Error('任务已取消或采集超时。');const j=await request('/api/jobs/'+message.jobId);if(j.status!=='needs_browser')throw Error('任务已取消或采集超时。');};
  const job=await request('/api/jobs/'+message.jobId);if(job.status!=='needs_browser')throw Error('任务目前不需要采集。');
  for(const [role,url]of [['benchmark',job.input.url],['self',job.input.ownUrl]]){
   if(!url||job.captures.some(c=>c.role===role))continue;if(!urlAllowed(url,'profile'))throw Error('任务包含不支持的主页链接。');
   const current=await request('/api/jobs/'+job.id);if(current.status!=='needs_browser')throw Error('任务已经取消或进入分析。');
   const capture=await collectProfile(url,check);
   await request('/api/jobs/'+job.id+'/capture',{role,inputFingerprint:job.fingerprint,capture});
  }
  respond({ok:true});
 })().catch(error=>respond({error:error.message})).finally(()=>running.delete(message.jobId));
 return true;
});
