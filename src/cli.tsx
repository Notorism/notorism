#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {install,doctor,resolveTargets,type Agent} from './installer.js';
import {InstallerApp} from './install-ui.js';
import {runArtifact} from './artifact.js';
import {findStyle,styles,families} from './catalog.js';
import {buildSessionContext} from './session-start.js';
import {describeHookRegistration} from './hooks.js';

const args=process.argv.slice(2);
const value=(name:string)=>{const index=args.indexOf(name);return index<0?undefined:args[index+1]};
const packageRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const payload=path.join(packageRoot,'payload');
const home=value('--home')??os.homedir();
const root=value('--root')??path.join(home,'.notorism');
const agentArg=value('--agent')??'codex';
const agents:Agent[]=agentArg==='both'?['codex','claude']:[agentArg as Agent];
const options={home,root,agents,payload};

async function main(){
  if(!['codex','claude','both'].includes(agentArg))throw new Error('--agent must be codex, claude, or both');
  const command=args[0]??'install';
  if(command==='install'){
    resolveTargets(options);
    if(args.includes('--yes')){
      const result=await install({...options,onProgress:(step,completed)=>console.log(`[${completed}/4] ${step}`)});
      console.log(`Installed NotorismDesign: ${result.root}\n110 styles / 330 PNG references\n${result.agents.join('\n')}`);
      console.log(`SessionStart configurations:\n${result.hookFiles.join('\n')}`);
      if(result.hookReviewRequired)console.log('Codex: open /hooks, review and trust NotorismDesign, then start a new session. Installation does not bypass hook trust.');
      if(result.backup)console.log(`Backups: ${result.backup}`);
    }else{
      if(!process.stdin.isTTY)throw new Error('Interactive installation requires a terminal. Use install --yes --agent codex for unattended installation.');
      await render(<InstallerApp options={options}/>).waitUntilExit();
    }
    return;
  }
  if(command==='preview'){
    const app=render(<InstallerApp options={options} previewOnly/>,{isScreenReaderEnabled:false});
    app.unmount();return;
  }
  if(command==='doctor'){console.log(await doctor(path.resolve(root)));return}
  if(command==='hooks'){
    const action=args[1]??'status';
    if(action==='preview'){
      const context=await buildSessionContext(root);
      console.log(args.includes('--json')?JSON.stringify({hookSpecificOutput:{hookEventName:'SessionStart',additionalContext:context}}):context);return;
    }
    if(action!=='status')throw new Error('Use hooks status or hooks preview [--json]');
    for(const agent of agents){
      const filename=path.join(home,agent==='codex'?'.codex/hooks.json':'.claude/settings.json');
      const settings=await readFile(filename,'utf8').then(text=>JSON.parse(text.replace(/^\uFEFF/,''))).catch(error=>{if(error.code==='ENOENT')return {};throw error});
      console.log(`${agent}: ${describeHookRegistration(settings)}\n${filename}`);
    }
    return;
  }
  if(command==='styles'){
    const query=args[1]?.toLowerCase();
    for(const style of styles.filter(s=>!query||(s.name+' '+s.contexts.join(' ')).toLowerCase().includes(query)))console.log(`${String(style.id).padStart(3,' ')}  ${style.name.padEnd(32)} ${families[style.family]}`);
    return;
  }
  if(command==='style'){
    const style=findStyle(args[1]??'');if(!style)throw new Error('Choose a style slug or catalog number');
    console.log(await readFile(path.join(root,'docs/styles',style.slug,'guide.md'),'utf8'));return;
  }
  if(command==='artifact'){console.log(await runArtifact(args.slice(1),path.resolve(root)));return}
  if(command==='copy-check'){
    const filename=args[1];if(!filename)throw new Error('Provide a text or HTML file');
    const text=(await readFile(filename,'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ');
    const findings=[];
    if(/[—–]/.test(text))findings.push('Review rhetorical dash punctuation; use direct sentences. Literal source data may be an exception.');
    if(/\b(?:it[’']?s\s+)?not about\b[\s\S]{0,120}\b(?:it[’']?s|but)\b/i.test(text)||/\bnot\b[^.!?]{1,90},?\s+but\b/i.test(text))findings.push('Review contrast framing; state the useful outcome directly.');
    if(/\b(seamless|game-changing|revolutionary|unlock your potential)\b/i.test(text))findings.push('Review generic claims and replace them with substantiated product information.');
    console.log(findings.length?findings.join('\n'):'No configured copy patterns found. Editorial review is still required.');return;
  }
console.log(`NotorismDesign 1.0.0\n\n  notorism install [--agent codex|claude|both] [--yes]\n  notorism preview\n  notorism hooks status\n  notorism hooks preview [--json]\n  notorism doctor\n  notorism styles [search]\n  notorism style <slug|number>\n  notorism artifact init --project <path> --name <name> --style <slug>\n  notorism artifact check|assemble|finalize --directory <path>\n  notorism copy-check <file>\n\nOptions: --root <library-path>, --home <profile-path>\nNo command publishes a site or sends external messages.`);
}
main().catch(error=>{console.error(`NotorismDesign: ${error.message}`);process.exitCode=1});
