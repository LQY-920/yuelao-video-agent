import {spawnSync} from 'node:child_process';
import {readdir} from 'node:fs/promises';
const dirs=['dist','server','scripts','browser-collector'];let count=0;
for(const dir of dirs)for(const file of await readdir(dir)){if(!/\.(mjs|js)$/.test(file))continue;const r=spawnSync(process.execPath,['--check',dir+'/'+file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);count++;}
console.log('Syntax checked '+count+' source files.');
