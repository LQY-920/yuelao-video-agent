import {fileURLToPath} from 'node:url';
import {AnalysisJobs} from '../server/jobs.mjs';
import {createApp} from '../server/http.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),port=Number(process.env.PORT||4173);
const jobs=new AnalysisJobs(root);await jobs.init();
const server=createApp({root,jobs,port});
server.listen(port,'127.0.0.1',()=>console.log('Local: http://localhost:'+port));
