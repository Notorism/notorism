// SPDX-License-Identifier: Apache-2.0
// Read-only native discovery. Never approves hooks or starts a model session.
import {spawn} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const args=process.argv.slice(2),index=args.indexOf('--codex');
const executable=index<0?undefined:args[index+1];
if(!executable)throw new Error('Provide --codex with the local Codex executable path');
const child=spawn(executable,['app-server','--stdio'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
let buffer='';
const pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
const rejectPending=(error:Error)=>{for(const item of pending.values())item.reject(error);pending.clear()};
child.on('error',rejectPending);child.on('close',code=>rejectPending(new Error(`Local Codex server closed with code ${code}`)));
// Host diagnostic logs are not copied into the project or sent to the model.
child.stderr.on('data',()=>{});
child.stdout.on('data',chunk=>{
  buffer+=chunk.toString('utf8');
  let newline;
  while((newline=buffer.indexOf('\n'))>=0){
    const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);if(!line.trim())continue;
    let message:any;try{message=JSON.parse(line)}catch{rejectPending(new Error('Unexpected local Codex protocol output'));return}
    const request=pending.get(message.id);if(!request)continue;pending.delete(message.id);
    if(message.error)request.reject(new Error(`Local Codex request failed: ${message.error.message}`));else request.resolve(message.result);
  }
});
let sequence=0;
function request(method:string,params:unknown){const id=++sequence;return new Promise<any>((resolve,reject)=>{pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({id,method,params})+'\n')})}
const timer=setTimeout(()=>{rejectPending(new Error('Local hook discovery timed out'));child.kill()},20000);
try{
  await request('initialize',{clientInfo:{name:'notorism-hook-verification',version:'1.0.0'},capabilities:{experimentalApi:true}});
  child.stdin.write(JSON.stringify({method:'initialized'})+'\n');
  const response=await request('hooks/list',{cwds:[process.cwd()]});
  const entries=response.data??[];
  assert.ok(entries.length,'Codex returned no configuration entry');
  const own=entries.flatMap((entry:any)=>entry.hooks??[]).filter((hook:any)=>hook.statusMessage==='Loading NotorismDesign modules and contracts');
  assert.equal(own.length,1,'Exactly one NotorismDesign native hook should be discovered');
  const hook=own[0];
  assert.equal(hook.eventName,'sessionStart');assert.equal(hook.additionalContextLimit,0);assert.equal(hook.timeoutSec,15);
  const errors=entries.flatMap((entry:any)=>entry.errors??[]).filter((error:any)=>error.path===hook.sourcePath);
  assert.deepEqual(errors,[],'Codex must parse the registered file without errors');
  const report={checkedAt:new Date().toISOString(),nativeDiscovery:true,event:hook.eventName,source:hook.source,configuration:hook.sourcePath,enabled:hook.enabled,trustStatus:hook.trustStatus,contextLimit:hook.additionalContextLimit,modelSessionStarted:false,trustModified:false};
  await mkdir(path.resolve('artifacts'),{recursive:true});
  await writeFile(path.resolve('artifacts/native-hook-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{clearTimeout(timer);child.stdin.end();child.kill()}
