const send=data=>window.postMessage({source:'yuelao-collector',...data},location.origin);
window.addEventListener('message',event=>{
 if(event.source!==window||event.origin!==location.origin||event.data?.source!=='yuelao-web')return;
 const data=event.data;
 if(data.type==='ping')send({type:'ready'});
 if(data.type==='capture'&&/^[a-f0-9-]{36}$/.test(data.jobId)&&/^[a-f0-9]{64}$/.test(data.token)){
  chrome.runtime.sendMessage({type:'capture',jobId:data.jobId,token:data.token,origin:location.origin}).then(result=>{if(result?.error)send({type:'error',message:result.error});}).catch(()=>send({type:'error',message:'采集桥连接中断，请刷新工作台。'}));
 }
});
send({type:'ready'});
