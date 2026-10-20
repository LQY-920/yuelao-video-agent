const text={type:'string'};
const array=items=>({type:'array',items});
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const sources=array(text);
export const reportSchema=object({
 title:text, summary:text,
 insights:array(object({dimension:{type:'string',enum:['账号定位','选题方向','爆款结构','借鉴建议']},type:{type:'string',enum:['observation','inference','proposal']},text,sourceIds:sources})),
 ideas:array(object({title:text,reason:text,sourceIds:sources})),
 accountBuild:array(object({step:text,title:text,content:text,copyText:text,sourceIds:sources})),
 limitations:text
});
export function validateReport(report,materials){
 if(!report||typeof report!=='object')throw new Error('模型没有返回有效报告。');
 const check=(v,s)=>{
  if(s.type==='string'){if(typeof v!=='string'||!v.trim()||v.length>12000||s.enum&&!s.enum.includes(v))throw new Error('报告字段不符合约定。');}
  if(s.type==='array'){if(!Array.isArray(v)||v.length>40)throw new Error('报告列表不符合约定。');v.forEach(x=>check(x,s.items));}
  if(s.type==='object'){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!s.properties[k]))throw new Error('报告结构不符合约定。');for(const k of s.required)check(v[k],s.properties[k]);}
 };check(report,reportSchema);
 const ids=new Set(materials.map(m=>m.id));
 for(const item of [...report.insights,...report.ideas,...report.accountBuild]){
  if(!item.sourceIds.length||item.sourceIds.some(id=>!ids.has(id)))throw new Error('模型引用了不存在的材料，本次报告未保存。');
 }
 for(const dimension of ['账号定位','选题方向','爆款结构','借鉴建议'])if(report.insights.filter(i=>i.dimension===dimension).length<2)throw new Error('报告缺少必要分析维度。');
 for(const step of ['定位','昵称','头像','简介','背景','搭建流程'])if(!report.accountBuild.some(i=>i.step===step))throw new Error('报告缺少账号搭建步骤。');
 if(report.ideas.length<3)throw new Error('模型没有生成可借鉴的选题。');
 return report;
}
