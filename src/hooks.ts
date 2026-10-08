// SPDX-License-Identifier: Apache-2.0
import path from 'node:path';
import type {Agent} from './installer.js';

type HookDocument=Record<string,unknown>;
const record=(value:unknown):value is HookDocument=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
export const hookMarker='--notorism-session-start';
export const hookStatus='Loading NotorismDesign modules and contracts';
const shellQuote=(value:string)=>`'${value.replaceAll("'","'\\''")}'`;
const psQuote=(value:string)=>`'${value.replaceAll("'","''")}'`;

export function windowsSessionCommand(root:string,nodeExecutable:string,manifestSha256:string):string{
  for(const value of [root,nodeExecutable])if(/["$%`\r\n]/.test(value))throw new Error('Windows hook paths must not contain shell-expansion characters');
  if(!/^[a-f0-9]{64}$/.test(manifestSha256))throw new Error('Invalid hook library fingerprint');
  const script=path.join(root,'bin/notorism-session-start.mjs');
  const argumentsText=[script,'--root',root,'--manifest-sha256',manifestSha256,hookMarker].map(psQuote).join(' ');
  // An ordinary inline command works without changing PowerShell script policy.
  const body=`[Console]::In.ReadToEnd() | & ${psQuote(nodeExecutable)} ${argumentsText}`;
  return `powershell.exe -NoLogo -NoProfile -NonInteractive -Command "${body}"`;
}

export function sessionStartGroup(agent:Agent,root:string,agentDirectory:string,manifestSha256:string,nodeExecutable=process.execPath){
  if(!/^[a-f0-9]{64}$/.test(manifestSha256))throw new Error('Invalid hook library fingerprint');
  const script=path.join(root,'bin/notorism-session-start.mjs');
  if(agent==='claude')return {matcher:'^(startup|resume|clear|compact|fork)$',hooks:[{type:'command',command:nodeExecutable,args:[script,'--root',root,'--manifest-sha256',manifestSha256,hookMarker],timeout:15,statusMessage:hookStatus}]};
  const command=[nodeExecutable,script,'--root',root,'--manifest-sha256',manifestSha256,hookMarker].map(shellQuote).join(' ');
  const commandWindows=windowsSessionCommand(root,nodeExecutable,manifestSha256);
  return {matcher:'^(startup|resume|clear|compact)$',hooks:[{type:'command',command,commandWindows,timeout:15,statusMessage:hookStatus,additionalContextLimit:0}]};
}

export function isNotorismHook(handler:unknown):boolean{
  return record(handler)&&handler.type==='command'&&(
    (typeof handler.command==='string'&&handler.command.includes(hookMarker))||
    (typeof handler.commandWindows==='string'&&(handler.commandWindows.includes(hookMarker)||handler.commandWindows.includes('-NotorismSessionStart')))||
    (Array.isArray(handler.args)&&handler.args.includes(hookMarker)));
}

export function mergeSessionStartHook(existing:unknown,group:ReturnType<typeof sessionStartGroup>):HookDocument{
  if(!record(existing))throw new Error('Hook settings must be a JSON object');
  if(existing.hooks!==undefined&&!record(existing.hooks))throw new Error('The existing hooks field must be an object');
  const hooks={...(existing.hooks as HookDocument|undefined)};
  const previous=hooks.SessionStart??[];
  if(!Array.isArray(previous))throw new Error('The existing SessionStart hooks must be an array');
  const kept:unknown[]=[];
  for(const entry of previous){
    if(!record(entry)||!Array.isArray(entry.hooks))throw new Error('Invalid existing SessionStart matcher group');
    if(!entry.hooks.some(isNotorismHook)){kept.push(entry);continue}
    const unrelated=entry.hooks.filter(handler=>!isNotorismHook(handler));
    if(unrelated.length)kept.push({...entry,hooks:unrelated});
  }
  hooks.SessionStart=[...kept,group];
  return {...existing,hooks};
}

export function describeHookRegistration(settings:unknown):string{
  if(!record(settings)||!record(settings.hooks)||!Array.isArray(settings.hooks.SessionStart))return 'No NotorismDesign SessionStart hook registered.';
  const count=settings.hooks.SessionStart.flatMap(group=>record(group)&&Array.isArray(group.hooks)?group.hooks:[]).filter(isNotorismHook).length;
  return count===1?'One NotorismDesign SessionStart hook is registered. Runtime trust and execution are controlled by the host.':`${count} NotorismDesign SessionStart hooks registered; review duplicate registrations.`;
}
