// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {sessionStartGroup,mergeSessionStartHook,isNotorismHook,windowsSessionCommand,describeHookRegistration} from '../src/hooks.js';
import {buildSessionContext,sessionStartOutput} from '../src/session-start.js';

const library=path.resolve('payload/library'),sha=(data:Buffer|string)=>createHash('sha256').update(data).digest('hex');
const manifestBytes=await readFile(path.join(library,'manifest.json'));
const fingerprint=sha(manifestBytes);

test('hook merge preserves unrelated settings, events, empty groups, and shared handlers',()=>{
  const root=path.resolve('.test-output/hook user space/.notorism'),directory=path.resolve('.test-output/hook user space/.codex/skills/notorism-design');
  const old=sessionStartGroup('codex',root,directory,'0'.repeat(64));
  const unrelated={type:'command',command:'node my-session-notes.mjs'};
  const input={description:'Keep this description',permissions:{allow:['Read']},hooks:{Stop:[{hooks:[unrelated]}],SessionStart:[{matcher:'resume',description:'Shared group',hooks:[...old.hooks,unrelated]},{matcher:'clear',hooks:[]}]}};
  const snapshot=JSON.stringify(input);
  const merged=mergeSessionStartHook(input,sessionStartGroup('codex',root,directory,fingerprint)) as any;
  assert.equal(JSON.stringify(input),snapshot,'Merge must not mutate its input');
  assert.deepEqual(merged.permissions,input.permissions);assert.deepEqual(merged.hooks.Stop,input.hooks.Stop);
  assert.equal(merged.hooks.SessionStart[0].description,'Shared group');assert.deepEqual(merged.hooks.SessionStart[0].hooks,[unrelated]);
  assert.deepEqual(merged.hooks.SessionStart[1],{matcher:'clear',hooks:[]});
  assert.equal(merged.hooks.SessionStart.flatMap((g:any)=>g.hooks).filter(isNotorismHook).length,1);
  assert.deepEqual(mergeSessionStartHook(merged,sessionStartGroup('codex',root,directory,fingerprint)),merged,'Registration is idempotent');
  assert.match(describeHookRegistration(merged),/Runtime trust/);
  assert.throws(()=>mergeSessionStartHook({hooks:{SessionStart:{}}},old),/array/);
});

test('native definitions use fingerprinted commands and readable Windows or executable forms',()=>{
  const root=path.resolve('.test-output/hook user space/.notorism'),directory=path.resolve('.test-output/hook user space/.codex/skills/notorism-design');
  const codex=sessionStartGroup('codex',root,directory,fingerprint) as any;
  assert.equal(codex.hooks[0].additionalContextLimit,0);assert.ok(codex.hooks[0].commandWindows.includes(fingerprint));
  assert.match(codex.hooks[0].commandWindows,/-Command "/);
  assert.ok(new RegExp(codex.matcher).test('compact'));assert.ok(!new RegExp(codex.matcher).test('fork'));
  const claude=sessionStartGroup('claude',root,directory,fingerprint) as any;
  assert.equal(claude.hooks[0].command,process.execPath);assert.ok(claude.hooks[0].args.includes(root));assert.ok(new RegExp(claude.matcher).test('fork'));
  const launcher=windowsSessionCommand("C:\\Users\\O'Brien\\.notorism",process.execPath,fingerprint);
  assert.ok(launcher.includes("O''Brien"),'PowerShell literals escape apostrophes');
  assert.ok(!launcher.includes('ExecutionPolicy')&&!launcher.includes('EncodedCommand'),'The launcher does not change execution policy or hide its source');
});

test('Windows native command works with real stdin and propagates loader failures',{skip:process.platform!=='win32'},async()=>{
  const run=async(expected:string)=>{
    const command=windowsSessionCommand(library,process.execPath,expected);
    const body=command.slice(command.indexOf('-Command "')+10,-1);
    const child=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',body],{stdio:['pipe','pipe','pipe'],windowsHide:true});
    let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.stdin.end(JSON.stringify({hook_event_name:'SessionStart',source:'startup'}));
    const code=await new Promise<number|null>((resolve,reject)=>{child.on('error',reject);child.on('close',resolve)});
    return {code,stdout,stderr};
  };
  const valid=await run(fingerprint);assert.equal(valid.code,0,valid.stderr);assert.equal(JSON.parse(valid.stdout).hookSpecificOutput.hookEventName,'SessionStart');
  assert.equal(JSON.parse(valid.stdout).hookSpecificOutput.additionalContext,await buildSessionContext(library,fingerprint),'Windows delivery must preserve the exact Unicode module content');
  const stale=await run('0'.repeat(64));assert.notEqual(stale.code,0);assert.equal(stale.stdout.trim(),'');assert.match(stale.stderr,/changed since hook registration/);
});

test('SessionStart loads actual core content and all contracts within the portable budget',async()=>{
  const registry=JSON.parse(await readFile(path.join(library,'modules/registry.json'),'utf8'));
  const context=await buildSessionContext(library,fingerprint);
  assert.ok(context.length<9500);
  const protocol=(await readFile(path.join(library,'docs/foundations/agent-protocol.md'),'utf8')).trim();
  assert.ok(context.includes(protocol),'The core module is actual document content, not a filename');
  for(const filename of registry.contracts){const contract=JSON.parse(await readFile(path.join(library,filename),'utf8'));for(const rule of contract.rules)assert.ok(context.includes(rule))}
  assert.equal(registry.modules.filter((m:any)=>m.load==='session-start').length,1);assert.equal(registry.contracts.length,6);
  for(const source of ['startup','resume','clear','compact','fork']){
    const output=await sessionStartOutput({hook_event_name:'SessionStart',source,transcript_path:'A transcript must not be read',cwd:'A project must not be inspected'},library,fingerprint);
    assert.equal(output.hookSpecificOutput.hookEventName,'SessionStart');assert.equal(output.hookSpecificOutput.additionalContext,context);
  }
  await assert.rejects(sessionStartOutput({hook_event_name:'Stop',source:'startup'},library,fingerprint),/SessionStart/);
  await assert.rejects(buildSessionContext(library,'0'.repeat(64)),/changed since hook registration/);
});

async function fixture(){
  const parent=path.resolve('.test-output');await mkdir(parent,{recursive:true});
  const root=await mkdtemp(path.join(parent,'hook-library-fixture-'));
  const registry=JSON.parse(await readFile(path.join(library,'modules/registry.json'),'utf8'));
  const files=['modules/registry.json','bin/notorism-session-start.mjs',...registry.modules.map((m:any)=>m.path),...registry.contracts];
  for(const filename of files){const destination=path.join(root,filename);await mkdir(path.dirname(destination),{recursive:true});await copyFile(path.join(library,filename),destination)}
  await writeFile(path.join(root,'manifest.json'),manifestBytes);
  return root;
}
async function changeDeclaredFile(root:string,relative:string,value:unknown){
  const bytes=Buffer.from(JSON.stringify(value));await writeFile(path.join(root,relative),bytes);
  const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
  const entry=manifest.files.find((f:any)=>f.path===relative);entry.sha256=sha(bytes);entry.size=bytes.length;
  await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest));
}

test('bootstrap rejects changed module bytes, unsafe paths, and invalid contracts',async()=>{
  const root=await fixture();
  await writeFile(path.join(root,'docs/foundations/agent-protocol.md'),'Changed without updating its checksum.');
  await assert.rejects(buildSessionContext(root),/Module integrity failed/);
  await copyFile(path.join(library,'docs/foundations/agent-protocol.md'),path.join(root,'docs/foundations/agent-protocol.md'));
  await changeDeclaredFile(root,'contracts/copy.json',{schemaVersion:1,id:'copy-contract',appliesTo:'Copy',rules:[]});
  await assert.rejects(buildSessionContext(root),/Invalid design contract/);
  await changeDeclaredFile(root,'contracts/copy.json',JSON.parse(await readFile(path.join(library,'contracts/copy.json'),'utf8')));
  const registry=JSON.parse(await readFile(path.join(root,'modules/registry.json'),'utf8'));registry.modules[0].path='../outside.md';
  await changeDeclaredFile(root,'modules/registry.json',registry);
  await assert.rejects(buildSessionContext(root),/Invalid module path/);
});

test('standalone native hook process emits only the supported JSON context envelope',async()=>{
  const script=path.join(library,'bin/notorism-session-start.mjs');
  const child=spawn(process.execPath,[script,'--root',library,'--manifest-sha256',fingerprint,'--notorism-session-start'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
  child.stdin.end(JSON.stringify({hook_event_name:'SessionStart',source:'compact',transcript_path:'Do not read this path',cwd:'Do not inspect this project'}));
  const exitCode=await new Promise<number|null>((resolve,reject)=>{child.on('error',reject);child.on('close',resolve)});
  assert.equal(exitCode,0,stderr);assert.equal(stderr,'');
  const output=JSON.parse(stdout);assert.deepEqual(Object.keys(output),['hookSpecificOutput']);assert.equal(output.hookSpecificOutput.hookEventName,'SessionStart');
  assert.ok(output.hookSpecificOutput.additionalContext.includes('artifact-contract'));
});
