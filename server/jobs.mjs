import {mkdir,readFile,writeFile,readdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {validateInput,fingerprint,validateCapture,makeMaterials,coverage} from './evidence.mjs';
import {runModel} from './provider.mjs';
export class AnalysisJobs{
 constructor(root,provider=runModel){this.root=root;this.dir=path.join(root,'.local','analysis-jobs');this.jobs=new Map();this.controllers=new Map();this.provider=provider;this.active=null;this.writes=new Map();}
 async init(){await mkdir(this.dir,{recursive:true});for(const f of await readdir(this.dir)){if(!/^[a-f0-9-]{36}\.json$/.test(f))continue;try{const j=JSON.parse(await readFile(path.join(this.dir,f),'utf8'));if(j.status==='analyzing'){j.status='failed';j.error='本地服务已重启，材料已保留，请重新生成。';}this.jobs.set(j.id,j);}catch{/* corrupted local job does not stop the workspace */}}}
 async save(j){j.updatedAt=new Date().toISOString();this.jobs.set(j.id,j);const serialized=JSON.stringify(j),target=path.join(this.dir,j.id+'.json'),temp=target+'.'+randomUUID()+'.tmp';
 const write=(this.writes.get(j.id)||Promise.resolve()).catch(()=>{}).then(async()=>{await writeFile(temp,serialized);await rename(temp,target);});this.writes.set(j.id,write);await write;return j;}
 get(id){const j=this.jobs.get(id);if(!j)throw new Error('找不到本次分析，请重新发起。');return j;}
 async create(raw){const input=validateInput(raw);const key=fingerprint(input);const existing=[...this.jobs.values()].find(j=>j.fingerprint===key&&['needs_browser','analyzing'].includes(j.status));if(existing)return existing;
 const j={id:randomUUID(),input,fingerprint:key,status:'needs_browser',message:'等待浏览器采集公开主页；完成验证后可以继续。',captures:[],createdAt:new Date().toISOString(),error:''};return this.save(j);}
 async capture(id,raw){const j=this.get(id);if(j.status!=='needs_browser')throw new Error('该任务目前不接受新的采集材料。');
 if(raw.inputFingerprint!==j.fingerprint)throw new Error('输入已变更，拒绝旧任务的采集结果。');
 const role=raw.role;if(!['benchmark','self'].includes(role))throw new Error('缺少明确的账号角色。');
 const expected=role==='benchmark'?j.input.url:j.input.ownUrl;if(!expected)throw new Error('本次没有请求这个账号。');
 const capture=validateCapture(raw.capture,expected,role);j.captures=[...j.captures.filter(c=>c.role!==role),capture];j.message='已读取 '+capture.name+' 的 '+capture.works.length+' 条作品。';await this.save(j);
 if(j.captures.some(c=>c.role==='benchmark')&&(!j.input.ownUrl||j.captures.some(c=>c.role==='self')))await this.start(id);return this.get(id);
 }
 async start(id){const j=this.get(id);if(j.status==='analyzing'||j.status==='complete')return j;if(this.active)throw new Error('另一个任务正在生成，请等它完成后重试。');
 if(!j.captures.some(c=>c.role==='benchmark'))throw new Error('还未取得对标账号材料，不能生成报告。');
 if(j.input.ownUrl&&!j.captures.some(c=>c.role==='self'))throw new Error('还未取得你的账号主页，请先完成采集。');
 const materials=makeMaterials(j.captures),cov=coverage(j.captures);j.status='analyzing';j.message='正在启动本机分析引擎';j.error='';
 const controller=new AbortController();this.controllers.set(id,controller);this.active=id;
 const release=()=>{if(this.controllers.get(id)===controller)this.controllers.delete(id);if(this.active===id)this.active=null;};
 try{await this.save(j);}catch(e){release();throw e;}if(controller.signal.aborted||j.status==='cancelled'){release();return j;}
 void Promise.resolve().then(()=>this.provider({input:j.input,materials,coverage:cov,root:this.root,jobId:j.id,signal:controller.signal,onProgress:message=>{j.message=message;}})).then(async result=>{
  if(controller.signal.aborted)return;j.status='complete';j.message='报告已生成；请查看证据覆盖范围。';j.result={...result,materials,coverage:cov,input:j.input,jobId:j.id};await this.save(j);
 }).catch(async e=>{if(j.status!=='cancelled'){j.status='failed';j.error=e.message;j.message='生成未完成，材料已保留。';await this.save(j);}}).finally(release);
 return j;
 }
 async cancel(id){const j=this.get(id);if(j.status==='complete')return j;j.status='cancelled';j.message='分析已取消。';this.controllers.get(id)?.abort();return this.save(j);}
}
