let connection;
export function openStore(){
  if(!connection) connection=new Promise((resolve,reject)=>{
    const request=indexedDB.open('yuelao-benchmark-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('tasks',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{connection=null;reject(new Error('浏览器存储不可用，请检查隐私或磁盘设置。'));};
    request.onblocked=()=>{connection=null;reject(new Error('请关闭其他旧版工作台页面后重试。'));};
  });return connection;
}
export async function listTasks(){
  const db=await openStore();return new Promise((resolve,reject)=>{const request=db.transaction('tasks').objectStore('tasks').getAll();request.onsuccess=()=>resolve(request.result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));request.onerror=()=>reject(request.error);});
}
export async function persistTask(task){
  const db=await openStore();return new Promise((resolve,reject)=>{
    const tx=db.transaction('tasks','readwrite'),store=tx.objectStore('tasks');let failure,saved;
    const request=store.get(task.id);
    request.onsuccess=()=>{
      if((request.result?.storageVersion||0)!==(task.storageVersion||0)){
        failure=new Error('另一个页面已更新此任务，本次修改没有覆盖它。请先复制未保存文字，再刷新页面。');tx.abort();return;
      }
      saved={...task,storageVersion:(task.storageVersion||0)+1,updatedAt:new Date().toISOString()};
      store.put(saved);
    };
    tx.oncomplete=()=>resolve(saved);
    tx.onerror=()=>reject(failure||new Error('保存失败，可能是本机存储空间不足；本次修改尚未保存。'));
    tx.onabort=()=>reject(failure||new Error('保存已中断，本次修改尚未保存。'));
  });
}
