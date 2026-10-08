import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,symlink} from 'node:fs/promises';
import path from 'node:path';
import {install,doctor,resolveTargets,verifyPayload} from '../src/installer.js';
import {runArtifact} from '../src/artifact.js';
import {styles} from '../src/catalog.js';

const payload=path.resolve('payload');const library=path.join(payload,'library');
const tempRoot=path.resolve('.test-output');await mkdir(tempRoot,{recursive:true});
const home=await mkdtemp(path.join(tempRoot,'installation-'));
const root=path.join(home,'.notorism');

test('catalog has exactly the requested 110 styles and three different subjects each',()=>{
  assert.equal(styles.length,110);assert.equal(new Set(styles.map(s=>s.id)).size,110);
  for(const style of styles){assert.equal(style.contexts.length,3);assert.equal(new Set(style.contexts).size,3)}
});

test('installation rejects broad and overlapping destinations',()=>{
  assert.throws(()=>resolveTargets({home,root:home,agents:['codex']}),/own directory/);
  assert.throws(()=>resolveTargets({home,root:path.join(home,'.codex'),agents:['codex']}),/overlap/);
  assert.throws(()=>resolveTargets({home,agents:[]}),/Select/);
});

test('payload rejects path traversal before any write',async()=>{
  const fixture=await mkdtemp(path.join(tempRoot,'unsafe-path-fixture-'));await mkdir(path.join(fixture,'library'));
  const manifest=JSON.parse(await readFile(path.join(library,'manifest.json'),'utf8'));
  manifest.files[0].path='../outside.txt';await writeFile(path.join(fixture,'library/manifest.json'),JSON.stringify(manifest));
  await assert.rejects(verifyPayload(fixture),/Unsafe payload path/);
});

test('install, reinstall, backup, rollback, and lock preserve user files',async()=>{
  await mkdir(root,{recursive:true});await writeFile(path.join(root,'user-notes.txt'),'User-owned notes stay here.');
  const codexHooks=path.join(home,'.codex/hooks.json'),claudeSettings=path.join(home,'.claude/settings.json');
  await mkdir(path.dirname(codexHooks),{recursive:true});await mkdir(path.dirname(claudeSettings),{recursive:true});
  const otherHook={type:'command',command:'node user-session-note.mjs'};
  await writeFile(codexHooks,JSON.stringify({description:'User-owned hook configuration',hooks:{SessionStart:[{matcher:'startup',hooks:[otherHook]}],Stop:[{hooks:[{type:'command',command:'node user-stop.mjs'}]}]}}));
  await writeFile(claudeSettings,JSON.stringify({permissions:{allow:['Read']},hooks:{SessionStart:[{matcher:'resume',hooks:[otherHook]}]}}));
  const initial=await install({home,agents:['codex','claude'],payload});
  assert.equal(initial.agents.length,2);assert.equal(await readFile(path.join(root,'user-notes.txt'),'utf8'),'User-owned notes stay here.');
  assert.equal(initial.hookFiles.length,2);assert.equal(initial.hookReviewRequired,true);
  const installedHooks=JSON.parse(await readFile(codexHooks,'utf8'));
  assert.equal(installedHooks.description,'User-owned hook configuration');assert.deepEqual(installedHooks.hooks.SessionStart[0].hooks,[otherHook]);assert.equal(installedHooks.hooks.Stop.length,1);
  assert.equal(installedHooks.hooks.SessionStart.length,2);
  assert.deepEqual(JSON.parse(await readFile(claudeSettings,'utf8')).permissions,{allow:['Read']});
  const hookSnapshot=await readFile(codexHooks,'utf8');
  assert.match(await readFile(path.join(home,'.codex/skills/notorism-design/LICENSE'),'utf8'),/Apache License/);
  assert.match(await doctor(root),/330 images/);
  const router=await readFile(path.join(home,'.codex/skills/notorism-design/SKILL.md'),'utf8');assert.ok(router.includes(root.split(path.sep).join('/')));assert.ok(!router.includes('{{NOTORISM_ROOT}}'));
  const repeated=await install({home,agents:['codex','claude'],payload});assert.equal(repeated.changed,0);
  const edited=path.join(root,'docs/foundations/copywriting.md');await writeFile(edited,'User-adjusted copy guide.');
  const replaced=await install({home,agents:['codex','claude'],payload});assert.ok(replaced.backup);
  const journal=JSON.parse(await readFile(path.join(replaced.backup!,'journal.json'),'utf8'));
  const entry=journal.files.find((item:any)=>item.target===edited);assert.equal(await readFile(entry.backup,'utf8'),'User-adjusted copy guide.');
  await writeFile(edited,'Keep this version if an install fails.');
  await assert.rejects(install({home,agents:['codex'],payload,onProgress:step=>{if(step==='Check installed files')throw new Error('Simulated verification failure')}}),/Simulated verification failure/);
  assert.equal(await readFile(edited,'utf8'),'Keep this version if an install fails.');
  assert.equal(await readFile(codexHooks,'utf8'),hookSnapshot,'Rollback must preserve the original hook configuration');
  await writeFile(path.join(root,'.install.lock'),'Active installation');
  await assert.rejects(install({home,agents:['codex'],payload}),/Another installation/);
  assert.equal(await readFile(path.join(root,'user-notes.txt'),'utf8'),'User-owned notes stay here.');
});

test('artifact gates reject missing analysis, scaffolds, missing review, stale sources, and modified canvas',async()=>{
  const project=await mkdtemp(path.join(tempRoot,'artifact-'));
  await runArtifact(['init','--project',project,'--name','collection-preview','--style','brutalism'],library);
  const directory=path.join(project,'.notorism/artifacts/collection-preview');
  await assert.rejects(runArtifact(['check','--directory',directory],library),/Planning is incomplete/);
  const brief=JSON.parse(await readFile(path.join(directory,'brief.json'),'utf8'));
  Object.assign(brief,{audience:'Visitors exploring architecture',objective:'Find a collection and save an item for later.',primaryTask:'Browse and save an architecture collection.',content:['Fictional collection title and a labeled demonstration item.'],scope:'A responsive collection page with one save action.'});
  await writeFile(path.join(directory,'brief.json'),JSON.stringify(brief));
  const refs=JSON.parse(await readFile(path.join(directory,'references.json'),'utf8'));
  for(const reference of refs)Object.assign(reference,{observation:'A large heading establishes the first reading level.',transfer:'Keep the title dominant and place the action close to it.',limitation:'Replace fictional subjects with the actual collection content.'});
  await writeFile(path.join(directory,'references.json'),JSON.stringify(refs));
  const decisions={visualThesis:'Expose the collection structure with strong type and explicit actions.',palette:{canvas:'#deded8',text:'#151515',accent:'#a92c23',surface:'#8f918b'},typography:{display:'system-ui, sans-serif',body:'system-ui, sans-serif',rationale:'Use the installed system family with scale and weight distinction.'},composition:'Open with the collection title and follow it with the available action.',responsiveBehavior:'Stack the content at narrow widths and keep controls reachable.',images:'No photography is needed for this interaction fixture.',icons:'The save action uses a visible text label instead of an icon.',motion:'No animation is needed for the collection task.',states:'Saving changes the button label and its pressed state.',tradeoff:'The restrained fixture prioritizes interaction clarity over visual depth.'};
  await writeFile(path.join(directory,'decisions.json'),JSON.stringify(decisions));
  assert.match(await runArtifact(['check','--directory',directory],library),/validated/);
  await assert.rejects(runArtifact(['assemble','--directory',directory],library),/still a scaffold/);
  const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Collection preview</title><style>body{margin:0;padding:32px;background:#deded8;color:#151515;font:18px system-ui}h1{font-size:clamp(35px,6vw,72px)}button{padding:16px;background:#151515;color:#deded8;border:0}button:focus-visible{outline:3px solid #a92c23;outline-offset:4px}</style></head><body><h1>Architecture collection</h1><p>Fictional demonstration content.</p><button type="button" aria-pressed="false" onclick="this.textContent=\'Saved\';this.setAttribute(\'aria-pressed\',\'true\')">Save collection</button></body></html>';
  for(const size of ['desktop','mobile'])await writeFile(path.join(directory,'artboards',`${size}.html`),html);
  await runArtifact(['assemble','--directory',directory],library);
  await assert.rejects(runArtifact(['finalize','--directory',directory],library),/screenshot|observations|dimensions/);
  // Actual browser evidence is created by the separate browser verification script.
  await writeFile(path.join(directory,'artboards/mobile.html'),html+'\n');
  await assert.rejects(runArtifact(['finalize','--directory',directory],library),/Inputs changed/);
  await runArtifact(['assemble','--directory',directory],library);
  await writeFile(path.join(directory,'canvas.html'),'Altered canvas');
  await assert.rejects(runArtifact(['finalize','--directory',directory],library),/Canvas changed/);
  await assert.rejects(runArtifact(['init','--project',project,'--name','collection-preview','--style','brutalism'],library),/EEXIST/);
  assert.ok((await readdir(directory)).includes('brief.json'));
});
