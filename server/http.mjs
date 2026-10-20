import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {findCodex} from './provider.mjs';
export function createApp({root,jobs,port=4173}){
 const token=randomBytes(32).toString('hex'),dist=path.join(root,'dist'),origins=new Set(['http://localhost:'+port,'http://127.0.0.1:'+port]);
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
 const validToken=v=>typeof v==='string'&&v.length===token.length&&timingSafeEqual(Buffer.from(v),Buffer.from(token));
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 return http.createServer(async(req,res)=>{
  try{
   if(!['localhost:'+port,'127.0.0.1:'+port].includes(req.headers.host)){res.writeHead(403);return res.end('Forbidden host');}
   const route=new URL(req.url,'http://localhost').pathname,origin=req.headers.origin,extension=origin&&/^chrome-extension:\/\/[a-p]{32}$/.test(origin);
   if(origin&&!origins.has(origin)&&!extension)return json(res,403,{error:'不允许来自其他网站的请求。'});
   if(extension){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','content-type,x-local-token');}
   if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
   if(route==='/api/session'&&req.method==='GET'){
    if(extension||req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'请从本机工作台建立连接。'});
    return json(res,200,{token,engine:!!findCodex(),collector:'browser-bridge',version:'0.3'});
   }
   if(route.startsWith('/api/')){
    if(!validToken(req.headers['x-local-token']))return json(res,403,{error:'本地连接已更新，请刷新页面后重试。'});
    let body={};
    if(req.method==='POST'){if(!String(req.headers['content-type']).startsWith('application/json'))return json(res,415,{error:'需要 JSON 请求。'});let size=0,parts=[];for await(const part of req){size+=part.length;if(size>350000)return json(res,413,{error:'材料过大，请减少本次采集范围。'});parts.push(part);}try{body=JSON.parse(Buffer.concat(parts).toString());}catch{return json(res,400,{error:'无效的 JSON 请求。'});}}
    if(route==='/api/jobs'&&req.method==='POST')return json(res,201,await jobs.create(body));
    const match=route.match(/^\/api\/jobs\/([a-f0-9-]{36})(?:\/(capture|generate|cancel))?$/);
    if(match){const [,id,action]=match;if(req.method==='GET'&&!action)return json(res,200,jobs.get(id));if(req.method==='POST'&&action==='capture')return json(res,200,await jobs.capture(id,body));if(req.method==='POST'&&action==='generate')return json(res,200,await jobs.start(id));if(req.method==='POST'&&action==='cancel')return json(res,200,await jobs.cancel(id));}
    return json(res,404,{error:'没有这个分析接口。'});
   }
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
   const target=path.resolve(dist,'.'+decodeURIComponent(route==='/'?'/index.html':route));
   const relative=path.relative(dist,target);if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);return res.end();}
   let data;try{data=await readFile(target);}catch{res.writeHead(404);return res.end('Not found');}
   res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
   res.end(req.method==='HEAD'?undefined:data);
  }catch(error){json(res,400,{error:error.message||'本次操作未完成。'});}
 });
}
