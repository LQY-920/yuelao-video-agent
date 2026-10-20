// Only rendered public DOM is read. No cookies, storage, scripts or network interception.
export function readDouyinPage(mode){
 const visible=e=>!!e&&e.getClientRects().length>0;
 const clean=s=>(s||'').trim();
 if(!['www.douyin.com','douyin.com'].includes(location.hostname))return {blocked:true,message:'当前页面不是抖音。'};
 if(mode==='profile'){
  const info=document.querySelector('[data-e2e="user-info"]'),list=document.querySelector('[data-e2e="user-post-list"]');
  if(!visible(info))return {blocked:true,message:'等待主页加载，或需要你完成登录/验证码。'};
  const name=clean(info.querySelector('h1')?.innerText||document.querySelector('h1')?.innerText);
  const profileText=clean(info.innerText);
  if(/编辑资料|编辑主页|私密账号/.test(profileText))return {blocked:true,message:'当前为本人管理视图或私密账号，请从公开访客视图读取。'};
  if(!name||!profileText)return {blocked:true,message:'尚未读到账号信息。'};
  const works=[...(list?.querySelectorAll('a[href]')||[])].filter(a=>visible(a)&&!/私密|仅自己可见|仅我可见|审核中|草稿/.test(a.closest('li')?.innerText||a.innerText)&&/^https:\/\/(www\.)?douyin\.com\/(video|note)\/\d+/.test(a.href)).map(a=>{
   const lines=a.innerText.split('\n').map(clean).filter(Boolean),pinned=lines[0]==='置顶';if(pinned)lines.shift();
   const label=clean(a.querySelector('.author-card-user-video-like')?.innerText);const likesLabel=/^\d+(\.\d+)?[万亿]?$/.test(label)?label:'';
   if(likesLabel&&lines[0]===likesLabel)lines.shift();
   return {url:a.href.split('?')[0],title:lines.join('\n'),likesLabel,pinned};
  }).filter((w,i,all)=>w.title&&all.findIndex(x=>x.url===w.url)===i).slice(0,30);
  const empty=/作品\s*0/.test(document.querySelector('[data-e2e="user-detail"]')?.innerText||'');
  if(!works.length&&!empty)return {blocked:true,message:'主页已打开，作品列表仍在加载。'};
  return {url:location.href.split('?')[0],name,profileText,works,capturedAt:new Date().toISOString(),method:'browser_extension',videos:[],missing:[...(/更多/.test(profileText)?['简介可能折叠，未展开部分没有采集。']:[]),'仅采集当前已加载的最多30条作品，不保证覆盖完整历史。','没有读取头像或封面像素，视觉细节仍需补图确认。']};
 }
 const root=document.querySelector('[data-e2e="feed-active-video"]')||document.querySelector('[data-e2e="video-detail"]');
 if(!root)return {blocked:true,message:'未识别作品正文容器，未采集页面其他区域。'};
 const description=clean(root.querySelector('[data-e2e="video-desc"]')?.innerText||document.querySelector('h1')?.innerText);
 if(!description)return {blocked:true,message:'等待作品页面加载。'};
 let chapters='';
 const candidates=[...root.querySelectorAll('.LookModalFrameFast')].filter(visible);
 for(const section of candidates){const text=clean(section.innerText);if(text.startsWith('章节要点')&&(text.match(/\d{2}:\d{2}/g)||[]).length>=3&&text.length<14000){chapters=text;break;}}
 const author=root.querySelector('[data-e2e="video-avatar"]')?.href||document.querySelector('[data-e2e="user-info"] a[href*="/user/"]')?.href||'';
 return {url:location.pathname.startsWith('/video/')?location.origin+location.pathname:'https://www.douyin.com/video/'+new URL(location.href).searchParams.get('modal_id'),description,chapters,authorUrl:author,transcript:'',visualNotes:''};
}
