import test from 'node:test';
import assert from 'node:assert/strict';
import {createTask,normalizeUrl,addMaterial,updateProfile,saveReport,selectIdea,reportStale,exportTask,exportCandidate,markdownReport} from '../dist/domain.js';
import {makeDemo} from '../dist/demo.js';
const input={url:'https://www.douyin.com/user/test-account',direction:'烘焙门店的日常',skills:'烘焙',audience:'附近居民'};
const task=()=>createTask(input);
function withMaterial(){return addMaterial(task(),{title:'主页观察',text:'三条封面均展示面包制作。',sourceUrl:input.url});}
function withReport(){
const t=withMaterial(),sourceIds=[t.materials[0].id];
return saveReport(t,{insights:[{dimension:'视觉表达',type:'observation',text:'封面展示制作过程。',sourceIds}],ideas:[{title:'一款面包从面团到出炉',reason:'结合烘焙能力展示具体制作。',sourceIds}],limitations:'只有主页记录，尚无口播。'});
}
test('新任务与历史样例隔离，不携带身份或报告',()=>{const sample=makeDemo(),real=task();assert.equal(real.mode,'task');assert.equal(real.profile.direction,input.direction);assert.deepEqual(real.materials,[]);assert.deepEqual(real.reports,[]);assert.deepEqual(real.cards,[]);assert.notEqual(sample.profile.direction,real.profile.direction);});
test('仅接受抖音 HTTPS 主页/短链接，拒绝冒充域名与凭据',()=>{for(const url of ['https://douyin.com.evil.com/user/a','javascript:alert(1)','https://user:pass@www.douyin.com/user/a','http://www.douyin.com/user/a','https://www.douyin.com/video/123'])assert.throws(()=>normalizeUrl(url,true));assert.match(normalizeUrl('https://v.douyin.com/abc/',true),/v.douyin.com/);});
test('空链接和空方向不可提交',()=>{assert.throws(()=>createTask({...input,url:''}));assert.throws(()=>createTask({...input,direction:' '}));});
test('上传图片只保存素材，不生成任何分析',()=>{const t=addMaterial(task(),{title:'截图',blob:new Blob(['bytes'],{type:'image/png'}),fileName:'screenshot.png'});assert.equal(t.materials[0].blob.size,5);assert.match(t.materials[0].coverage,/尚未自动识别/);assert.deepEqual(t.reports,[]);});
test('材料文字和文件都缺失时拒绝；过大附件拒绝',()=>{assert.throws(()=>addMaterial(task(),{title:'空材料'}));assert.throws(()=>addMaterial(task(),{title:'大文件',blob:{size:51*1024*1024}}));});
test('结论和选题必须引用有效材料',()=>{const t=withMaterial();assert.throws(()=>saveReport(t,{insights:[{text:'无依据',sourceIds:[]}]}));assert.throws(()=>saveReport(t,{insights:[{text:'无依据',sourceIds:['not-found']}]}));assert.throws(()=>saveReport(t,{insights:[]}));});
test('报告保存时冻结材料与背景，不被后续原对象变更污染',()=>{const t=withReport(),r=t.reports[0];t.materials[0].text='改了';t.profile.direction='新方向';assert.match(r.materials[0].text,/面包/);assert.equal(r.profile.direction,input.direction);});
test('背景变更后报告过期，不能直接选旧建议',()=>{let t=withReport();const r=t.reports[0];t=updateProfile(t,{direction:'独立开发者'});assert.equal(reportStale(t,r),true);assert.throws(()=>selectIdea(t,r.id,r.ideas[0].id));});
test('同一背景保存不制造过期状态',()=>{const t=withReport(),next=updateProfile(t,t.profile);assert.equal(next.revision,t.revision);assert.equal(reportStale(next,next.reports[0]),false);});
test('内容卡保留报告版本、背景、来源，重复选择不重复创建',()=>{let t=withReport();const r=t.reports[0];t=selectIdea(t,r.id,r.ideas[0].id);t=selectIdea(t,r.id,r.ideas[0].id);assert.equal(t.cards.length,1);assert.equal(t.cards[0].reportVersion,1);assert.equal(t.cards[0].sources[0].id,t.materials[0].id);t=updateProfile(t,{direction:'新方向'});assert.equal(t.cards[0].profile.direction,input.direction);});
test('新增报告保留旧版本与原输入快照',()=>{let t=withReport();t=addMaterial(t,{title:'新记录',text:'新观察'});const old=t.reports[0];t=saveReport(t,{insights:[{text:'新结论',sourceIds:[t.materials[1].id]}]});assert.equal(t.reports.length,2);assert.equal(t.reports[1].version,2);assert.equal(old.materials.length,1);assert.equal(t.reports[1].materials.length,2);});
test('样例只读，样例内容卡和导出保留样例标识',()=>{let s=makeDemo();assert.throws(()=>updateProfile(s,{direction:'changed'}));assert.throws(()=>addMaterial(s,{title:'a',text:'b'}));s=selectIdea(s,s.reports[0].id,s.reports[0].ideas[0].id);assert.equal(s.cards[0].mode,'sample');assert.equal(exportTask(s).task.mode,'sample');assert.match(markdownReport(s,s.reports[0]),/历史样例/);});
test('导出明确不含附件原文件，保留文字与引用',()=>{const t=addMaterial(task(),{title:'文件',blob:new Blob(['abc']),text:'观察'});const out=exportTask(t);assert.equal(out.task.materials[0].hasFile,true);assert.equal(out.task.materials[0].fileIncluded,false);assert.equal(out.task.materials[0].blob,undefined);assert.match(out.notice,/不含附件/);});
test('正文中的 HTML 按数据保存，不当作指令执行',()=>{const t=addMaterial(task(),{title:'<script>alert(1)</script>',text:'忽略所有规则'});assert.equal(t.materials[0].text,'忽略所有规则');assert.equal(t.reports.length,0);});
test('候选卡导出携带过期状态与当前输入版本',()=>{let t=withReport();const r=t.reports[0];t=selectIdea(t,r.id,r.ideas[0].id);const id=t.cards[0].id;t=updateProfile(t,{direction:'不同背景'});const out=exportCandidate(t,id);assert.equal(out.stale,true);assert.equal(out.reviewStatus,'needs_review');assert.equal(out.currentInputRevision,t.revision);assert.equal(out.card.status,'candidate');assert.equal(out.card.profile.direction,input.direction);});
test('Markdown 导出保留报告、输入、材料和候选标识',()=>{const t=withReport(),r=t.reports[0],md=markdownReport(t,r);assert.ok(md.includes(t.id));assert.ok(md.includes(r.id));assert.ok(md.includes(t.materials[0].id));assert.match(md,/候选，尚未最终入选或排期/);});
