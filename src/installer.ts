import {readFile,writeFile,mkdir,copyFile,readdir,lstat,unlink,open} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {mergeSessionStartHook,sessionStartGroup} from './hooks.js';

export type Agent = 'codex' | 'claude';
export type InstallOptions = {home?:string;root?:string;agents:Agent[];payload:string;onProgress?:(step:string,completed:number,total:number)=>void};
export type InstallResult = {root:string;agents:string[];hookFiles:string[];hookReviewRequired:boolean;fileCount:number;changed:number;unchanged:number;backup:string|undefined};
export type Manifest = {schemaVersion:number;version:string;license:string;language:string;styleCount:number;imageCount:number;files:{path:string;sha256:string;size:number}[]};
const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');

export function resolveTargets(options:Pick<InstallOptions,'home'|'root'|'agents'>){
  const home=path.resolve(options.home??os.homedir());
  const root=path.resolve(options.root??path.join(home,'.notorism'));
  if(root===path.parse(root).root||root===home||root===path.resolve(process.cwd()))throw new Error('The library needs its own directory, such as ~/.notorism');
  if(!options.agents.length||options.agents.some(agent=>!['codex','claude'].includes(agent)))throw new Error('Select Codex, Claude Code, or both');
  const agents=[...new Set(options.agents)].map(agent=>({agent,directory:path.join(home,agent==='codex'?'.codex':'.claude','skills','notorism-design')}));
  for(const target of agents){
    const relative=path.relative(root,target.directory),reverse=path.relative(target.directory,root);
    if(relative===''||(!relative.startsWith('..')&&!path.isAbsolute(relative))||(!reverse.startsWith('..')&&!path.isAbsolute(reverse)))throw new Error('Library and agent skill directories must not overlap');
  }
  return {home,root,agents};
}

async function ensureNoLinks(target:string){
  let current=path.resolve(target);
  for(;;){const stats=await lstat(current).catch(error=>{if(error.code==='ENOENT')return undefined;throw error});
    if(stats?.isSymbolicLink())throw new Error(`Refusing a symbolic-link installation path: ${current}`);
    const parent=path.dirname(current);if(parent===current)break;current=parent;
  }
}
function relativeFile(root:string,relative:string){
  const file=path.resolve(root,relative);const actual=path.relative(root,file);
  if(!relative||actual.startsWith('..')||path.isAbsolute(actual)||actual==='')throw new Error(`Unsafe payload path: ${relative}`);
  return file;
}

export async function verifyPayload(payload:string):Promise<Manifest>{
  const library=path.join(payload,'library');
  const manifest=JSON.parse(await readFile(path.join(library,'manifest.json'),'utf8')) as Manifest;
  if(manifest.schemaVersion!==1||manifest.version!=='1.0.0'||manifest.license!=='Apache-2.0'||manifest.language!=='en'||manifest.styleCount!==110||manifest.imageCount!==330||!Array.isArray(manifest.files))throw new Error('Build and verify the complete English Apache-2.0 library before installation');
  const seen=new Set<string>();
  for(const item of manifest.files){
    if(seen.has(item.path))throw new Error(`Duplicate manifest path: ${item.path}`);seen.add(item.path);
    const file=relativeFile(library,item.path);await ensureNoLinks(file);
    const data=await readFile(file);if(data.length!==item.size||sha(data)!==item.sha256)throw new Error(`Payload integrity failed: ${item.path}`);
  }
  const catalog=JSON.parse(await readFile(path.join(library,'catalog.json'),'utf8'));
  if(catalog.styles.length!==110||catalog.styles.some((s:any)=>s.examples.length!==3))throw new Error('Incomplete style catalog');
  if(manifest.files.filter(item=>item.path.endsWith('.png')).length!==330)throw new Error('The manifest must include all 330 PNG references');
  for(const style of catalog.styles){
    for(const filename of [style.documentation,`docs/styles/${style.slug}/README.md`,...style.examples.flatMap((e:any)=>[e.image,e.html])])if(!seen.has(filename))throw new Error(`Catalog resource is missing from manifest: ${filename}`);
  }
  await readFile(path.join(payload,'skill/SKILL.md'));
  return manifest;
}

export async function install(options:InstallOptions):Promise<InstallResult>{
  const {home,root,agents}=resolveTargets(options);
  options.onProgress?.('Verify the reference library',0,4);
  const manifest=await verifyPayload(options.payload);
  const router=await readFile(path.join(options.payload,'skill/SKILL.md'),'utf8');
  const metadata=await readFile(path.join(options.payload,'skill/agents/openai.yaml'));
  await ensureNoLinks(root);for(const target of agents)await ensureNoLinks(target.directory);
  await mkdir(root,{recursive:true});
  const lockFile=path.join(root,'.install.lock');await ensureNoLinks(lockFile);
  const lock=await open(lockFile,'wx').catch(error=>{if(error.code==='EEXIST')throw new Error('Another installation is active. If it stopped unexpectedly, inspect .install.lock before removing that exact file.');throw error});
  await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
  const installationId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8);
  const backup=path.join(root,'backups',installationId);
  const operations:{target:string;data:Buffer;label:string;guardExisting?:boolean;expectedExisting?:Buffer}[]=[];
  const hookFiles:string[]=[];
  const journal:{target:string;backup?:string}[]=[];
  let changed=0,unchanged=0;
  try{
    options.onProgress?.('Prepare documents and images',1,4);
    for(const file of [...manifest.files,{path:'manifest.json',sha256:'',size:0}])operations.push({target:relativeFile(root,file.path),data:await readFile(relativeFile(path.join(options.payload,'library'),file.path)),label:file.path});
    for(const target of agents){
      operations.push({target:path.join(target.directory,'SKILL.md'),data:Buffer.from(router.replaceAll('{{NOTORISM_ROOT}}',root.split(path.sep).join('/'))),label:`${target.agent}/SKILL.md`});
      operations.push({target:path.join(target.directory,'agents/openai.yaml'),data:metadata,label:`${target.agent}/agents/openai.yaml`});
      for(const filename of ['LICENSE','NOTICE'])operations.push({target:path.join(target.directory,filename),data:await readFile(path.join(options.payload,'library',filename)),label:`${target.agent}/${filename}`});
      const hookFile=path.join(home,target.agent==='codex'?'.codex/hooks.json':'.claude/settings.json');
      await ensureNoLinks(hookFile);
      const existingSettings=await readFile(hookFile).catch(error=>{if(error.code==='ENOENT')return undefined;throw error});
      let settings:unknown={};
      if(existingSettings)try{settings=JSON.parse(existingSettings.toString('utf8').replace(/^\uFEFF/,''))}catch{throw new Error(`Existing hook settings are invalid JSON and were left untouched: ${hookFile}`)}
      const manifestSha256=sha(await readFile(path.join(options.payload,'library/manifest.json')));
      const group=sessionStartGroup(target.agent,root,target.directory,manifestSha256);
      const merged=mergeSessionStartHook(settings,group);
      operations.push({target:hookFile,data:Buffer.from(JSON.stringify(merged,null,2)+'\n'),label:`${target.agent}/SessionStart`,guardExisting:true,expectedExisting:existingSettings});
      hookFiles.push(hookFile);
      operations.push({target:path.join(target.directory,'installation.json'),data:Buffer.from(JSON.stringify({schemaVersion:1,libraryRoot:root,version:manifest.version,license:manifest.license,language:'en',sessionStart:{configuration:hookFile,manifestSha256,trustRequired:target.agent==='codex'}},null,2)+'\n'),label:`${target.agent}/installation.json`});
    }
    options.onProgress?.('Install with recoverable backups',2,4);
    for(const operation of operations){
      await ensureNoLinks(operation.target);
      const existing=await readFile(operation.target).catch(error=>{if(error.code==='ENOENT')return undefined;throw error});
      if(operation.guardExisting&&((existing===undefined)!==(operation.expectedExisting===undefined)||(existing&&operation.expectedExisting&&sha(existing)!==sha(operation.expectedExisting))))throw new Error(`Hook settings changed during installation and were left untouched: ${operation.target}`);
      if(existing&&sha(existing)===sha(operation.data)){unchanged++;continue}
      const entry:{target:string;backup?:string}={target:operation.target};
      if(existing){
        entry.backup=path.join(backup,`${String(journal.length).padStart(5,'0')}.bak`);
        await ensureNoLinks(entry.backup);await mkdir(path.dirname(entry.backup),{recursive:true});
        await copyFile(operation.target,entry.backup);
      }
      journal.push(entry);
      await mkdir(path.dirname(operation.target),{recursive:true});
      await writeFile(operation.target,operation.data);changed++;
    }
    if(journal.some(item=>item.backup))await writeFile(path.join(backup,'journal.json'),JSON.stringify({installationId,files:journal.filter(item=>item.backup)},null,2)+'\n');
    options.onProgress?.('Check installed files',3,4);
    for(const operation of operations)if(sha(await readFile(operation.target))!==sha(operation.data))throw new Error(`Installed integrity failed: ${operation.label}`);
    options.onProgress?.('Installation complete',4,4);
    return {root,agents:agents.map(target=>target.directory),hookFiles,hookReviewRequired:agents.some(target=>target.agent==='codex'),fileCount:operations.length,changed,unchanged,backup:journal.some(item=>item.backup)?backup:undefined};
  }catch(error){
    const rollbackErrors:string[]=[];
    for(const item of journal.reverse())try{if(item.backup)await copyFile(item.backup,item.target);else await unlink(item.target).catch(e=>{if(e.code!=='ENOENT')throw e})}catch(rollbackError){rollbackErrors.push(`${item.target}: ${String(rollbackError)}`)}
    if(rollbackErrors.length)throw new Error(`${String(error)}\nRollback needs attention:\n${rollbackErrors.join('\n')}\nBackups: ${backup}`);
    throw error;
  }finally{await lock.close();await unlink(lockFile)}
}

export async function doctor(root:string):Promise<string>{
  const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8')) as Manifest;
  let count=0;
  for(const file of manifest.files){const target=relativeFile(root,file.path);await ensureNoLinks(target);const data=await readFile(target);if(sha(data)!==file.sha256)throw new Error(`Installed file changed or corrupted: ${file.path}`);count++}
  return `Library healthy: ${manifest.styleCount} styles, ${manifest.imageCount} images, ${count} verified files.\n${root}`;
}
