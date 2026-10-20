export function makeDemo(){
const url='https://www.douyin.com/user/MS4wLjABAAAAhoG2XR5Hx6IfHlJqWxEKYws4afijl98eXChTuyr5OsZULn9vQc-a1Go3aY9gHcNr';
const profile={direction:'用 AI 把想法做成作品，把重复工作变成可复用流程。',skills:'软件开发与 AI 工具实践',audience:'有想法，希望借助 AI 完成实际工作的人'};
const materials=[
{id:'visual',title:'主页视觉观察摘要',kind:'note',sourceUrl:url,observedAt:'2026-10-19',text:'历史研究记录：作品封面反复使用米白与绿色、固定白发插画人物、大字标题及工具或成品画面。完整原始截图包尚未归档。',coverage:'历史观察摘要，未附原始截图，非本次抓取。'},
{id:'topics',title:'作品选题观察摘要',kind:'note',sourceUrl:url,observedAt:'2026-10-19',text:'历史记录中的主题包括 AI 视频剪辑、角色资产、广告制作、工作流与 Skills。浏览过部分作品画面与平台章节，未取得所有视频的完整口播。',coverage:'主题层面摘要；完整逐字稿、镜头时序与后台指标缺失。'}];
const report={id:'sample-report-1',version:1,inputRevision:1,origin:'sample',createdAt:'2026-10-20T00:00:00Z',profile:structuredClone(profile),materials:structuredClone(materials),limitations:'根据 2026-10-19 的历史研究摘要展示报告形态。原始证据包尚未完整归档；未重新获取主页、完整口播或后台数据，不能据此解释爆款成因。',
insights:[
{dimension:'账号定位',type:'inference',text:'从已记录的题材看，重心是把 AI 用在具体创作任务上。可以借鉴“先展示产物，再说明怎样完成”的表达思路；具体视频是否采用这个结构，仍需逐条核验。',sourceIds:['topics']},
{dimension:'选题方向',type:'observation',text:'剪辑、角色资产、广告等题材围绕具体产物展开，工具名称与要完成的任务经常一起出现。',sourceIds:['topics']},
{dimension:'视觉表达',type:'observation',text:'固定人物、重复配色与大字标题形成系列感。借鉴时可以保持自己的人物与配色，随主题改变动作、道具和结果画面。',sourceIds:['visual']}],
ideas:[
{id:'idea-1',title:'同一个人物，怎样做出三张统一封面？',reason:'把“统一视觉”变成能演示结果的任务。准备人物参考、风格参考和真实成图，再讲清哪些保持不变、哪些随主题调整。',sourceIds:['visual']},
{id:'idea-2',title:'把一个模糊想法，整理成 AI 能执行的任务',reason:'结合开发经验，用一份真实需求展示整理前后的变化，让步骤和判断可以被看见。',sourceIds:['topics']},
{id:'idea-3',title:'AI 做完了，我会怎样检查结果？',reason:'把开发判断转成可复用的验收方法。先有真实产物与检查过程，再说明发现和限制。',sourceIds:['topics']} ]};
return {id:'sample-xilo-v1',mode:'sample',title:'Xilo今天Ai了吗',url,profile,revision:1,createdAt:'2026-10-20T00:00:00Z',updatedAt:'2026-10-20T00:00:00Z',materials,reports:[report],cards:[]};
}
