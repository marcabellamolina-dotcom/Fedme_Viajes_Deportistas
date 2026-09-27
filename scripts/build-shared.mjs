import {build} from 'esbuild';
import {readdir,cp,mkdir,writeFile,readFile} from 'node:fs/promises';
await build({entryPoints:['client/clerk-locale.mjs'],outfile:'dist/clerk-locale.mjs',bundle:true,format:'esm',platform:'browser',minify:true});
await mkdir('dist/client',{recursive:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
for(const e of await readdir('dist',{withFileTypes:true})){if(['client','server','.openai'].includes(e.name)||e.name.startsWith('.'))continue;await cp('dist/'+e.name,'dist/client/'+e.name,{recursive:true});}
await build({entryPoints:['server/worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',loader:{'.html':'text'},minify:true});
await cp('.openai/hosting.json','dist/.openai/hosting.json');await cp('drizzle','dist/.openai/drizzle',{recursive:true});
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'equip-viatges',main:'index.js',compatibility_date:'2026-09-01',assets:{directory:'../client',binding:'ASSETS',run_worker_first:true},d1_databases:[{binding:'DB',database_name:'equip-viatges'}]},null,2));
console.log('Shared travel Worker and assets built.');
