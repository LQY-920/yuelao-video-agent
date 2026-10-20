let session;
export async function getEngine(){const res=await fetch('/api/session',{cache:'no-store'});if(!res.ok)throw new Error('本地分析服务未连接，请重新启动工作台。');session=await res.json();return session;}
export async function api(path,body,reconnected=false){
 if(!session)await getEngine();
 const res=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'X-Local-Token':session.token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await res.json();if(res.status===403&&!reconnected){await getEngine();return api(path,body,true);}if(!res.ok)throw new Error(data.error||'本地分析服务未完成请求。');return data;
}
export function requestBrowser(jobId){if(!session)throw new Error('本地连接尚未准备好。');window.postMessage({source:'yuelao-web',type:'capture',jobId,token:session.token},location.origin);}
export function pingBrowser(){window.postMessage({source:'yuelao-web',type:'ping'},location.origin);}
