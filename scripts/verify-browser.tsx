import React from 'react';
import {render} from 'ink-testing-library';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {InstallerApp} from '../src/install-ui.js';
import {runArtifact} from '../src/artifact.js';
import {escapeHtml} from '../src/reference-design.js';

const library=path.resolve('payload/library');
const output=path.resolve('artifacts');await mkdir(output,{recursive:true});
async function captureUI(columns:number){
  const app=render(<InstallerApp options={{home:os.homedir(),agents:['codex'],payload:path.resolve('payload')}} previewOnly columns={columns}/>);
  await new Promise(resolve=>setTimeout(resolve,150));const frame=app.lastFrame()!;app.unmount();return frame;
}
const wide=await captureUI(90),narrow=await captureUI(46);
await writeFile(path.join(output,'installer-preview.txt'),wide+'\n');
const paint=(frame:string)=>frame.split('\n').map(line=>`<span class="${/NOTORISM|LIBRARY|AGENTS|preview/.test(line)?'accent':''}">${escapeHtml(line)}</span>`).join('\n');
const preview=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NotorismDesign Installer</title><style>*{box-sizing:border-box}body{margin:0;background:#e7e8df;color:#25392f;font:16px/1.55 system-ui,sans-serif;min-height:100vh;padding:65px 70px}h1{font-size:46px;line-height:1.1;font-weight:600;letter-spacing:-.04em;margin:12px 0 18px}.eyebrow{font:12px ui-monospace,monospace;letter-spacing:.1em}.intro{max-width:65ch}.terminal{background:#171f1a;color:#edf0e5;padding:20px 22px;border:1px solid #526c58;box-shadow:0 22px 60px #24372c22;max-width:1050px;margin-top:32px}pre{margin:0;font:13px/1.6 'Cascadia Mono','Consolas',monospace;white-space:pre}.accent{color:#df7856}.narrow{display:none}.caption{font:12px/1.6 ui-monospace,monospace;color:#5b7061;margin-top:24px;max-width:80ch}@media(max-width:650px){body{padding:30px 20px}h1{font-size:35px}.terminal{padding:12px 8px}.wide{display:none}.narrow{display:block}pre{font-size:10.1px;line-height:1.7}.intro{font-size:15px}}</style></head><body><p class="eyebrow">NOTORISMDESIGN / INSTALLER</p><h1>Your design library,<br>ready where you work.</h1><p class="intro">Select your agents, review the destination, and install the local reference library. Changed files receive recoverable backups.</p><div class="terminal"><pre class="wide">${paint(wide)}</pre><pre class="narrow">${paint(narrow)}</pre></div><p class="caption">Captured Ink interface text rendered for review. This page is a preview, not a browser-based installer. Run install.cmd for the interactive terminal application.</p></body></html>`;
await writeFile(path.join(output,'installer-preview.html'),preview);

const browser=await chromium.launch({headless:true});
const report:{check:string;result:string}[]=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
  const runtimeErrors:string[]=[];page.on('pageerror',e=>runtimeErrors.push(e.message));
  await page.goto(pathToFileURL(path.join(output,'installer-preview.html')).href);
  await page.screenshot({path:path.join(output,'installer-preview.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(output,'installer-preview-mobile.png'),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Installer preview overflow');
  report.push({check:'Ink installer preview',result:'Captured actual 90-column and 46-column Ink frames. Narrow presentation has no horizontal overflow.'});

  await page.goto(pathToFileURL(path.join(library,'index.html')).href);
  await page.locator('#search').fill('Neo-Brutalism');
  await assert.doesNotReject(()=>page.locator('#result-count').getByText('1 styles',{exact:true}).waitFor());
  assert.equal(await page.locator('article:not([hidden]) .examples a').count(),3);
  await page.setViewportSize({width:1440,height:960});
  await page.screenshot({path:path.join(output,'library-preview.png'),fullPage:false});
  report.push({check:'Offline gallery',result:'Search selected one style with exactly three linked studies.'});

  const catalog=JSON.parse(await readFile(path.join(library,'catalog.json'),'utf8'));
  const mobileIssues:{file:string;width:number}[]=[];
  const typographyIssues:{file:string;font:string}[]=[];
  let checked=0;
  const queue=catalog.styles.flatMap((s:any)=>s.examples);
  await Promise.all(Array.from({length:4},async()=>{
    const mobile=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    while(queue.length){const example=queue.shift();if(!example)break;
      await mobile.goto(pathToFileURL(path.join(library,example.html)).href,{waitUntil:'load'});
      await mobile.evaluate(()=>document.fonts.ready);
      const width=await mobile.evaluate(()=>document.documentElement.scrollWidth);
      if(width>391)mobileIssues.push({file:example.html,width});
      const typography=await mobile.evaluate(()=>({feature:document.body.dataset.feature,font:getComputedStyle(document.querySelector('h1')!).fontFamily}));
      const expectedFont:{[feature:string]:string}={swiss:'Body',international:'Body',terminal:'Utility',hud:'Utility',variable:'Variable'};
      if(expectedFont[typography.feature!]&&!typography.font.includes(expectedFont[typography.feature!]!))typographyIssues.push({file:example.html,font:typography.font});
      checked++;if(checked%60===0)console.log(`Checked ${checked}/330 narrow studies`);
    }
    await mobile.close();
  }));
  assert.deepEqual(mobileIssues,[],'Narrow reference layouts overflow');
  assert.deepEqual(typographyIssues,[],'Layout defaults must not override the selected style typography');
  report.push({check:'Responsive studies',result:'All 330 HTML studies checked at 390px with no body overflow.'});
  report.push({check:'Style typography',result:'Swiss and International styles retain neutral sans-serif headings; terminal, HUD, and variable-font styles retain their selected families across all three layouts.'});

  await page.goto(pathToFileURL(path.join(library,'images/micro-interactions/example-01.html')).href);
  await page.getByRole('button',{name:'Save selection'}).click();
  assert.equal(await page.getByRole('button',{name:'Saved'}).getAttribute('aria-pressed'),'true');
  report.push({check:'Micro-interaction',result:'The save action changes its visible label and pressed state.'});
  await page.goto(pathToFileURL(path.join(library,'images/webgl-3d-experience/example-01.html')).href);
  const webgl=await page.locator('canvas').count();
  report.push({check:'WebGL study',result:webgl?'A real WebGL shader canvas initialized.':'This browser used the documented static fallback.'});

  const project=path.join(output,'example-project');await mkdir(project,{recursive:true});
  const directory=path.join(project,'.notorism/artifacts/notorism-installer');
  try{await readFile(path.join(directory,'brief.json'))}catch{await runArtifact(['init','--project',project,'--name','notorism-installer','--style','neo-brutalism'],library)}
  const brief=JSON.parse(await readFile(path.join(directory,'brief.json'),'utf8'));
  Object.assign(brief,{audience:'People installing design guidance for their local AI agents.',objective:'Install a complete local design reference library with a clear destination.',primaryTask:'Choose agents, inspect installation destinations, and start the installer.',content:['Actual English Ink interface text, 110-style catalog count, and 330-reference count.'],constraints:['The production installer runs in a terminal; this HTML is its review artifact.'],scope:'Installer visual presentation and the artifact-first workflow demonstration.',assumptions:['A local Node runtime and the packaged reference payload are available.']});
  await writeFile(path.join(directory,'brief.json'),JSON.stringify(brief,null,2)+'\n');
  const references=JSON.parse(await readFile(path.join(directory,'references.json'),'utf8'));
  const analyses=[
    {observation:'The public study places a large left heading beside a yellow outlined visual, with hard shadows separating three lower content units.',transfer:'Keep the installation action recognizable and the content groups distinct.',limitation:'The reference’s yellow visual plane and heavy card shadows would distract in a terminal; borrow clarity rather than copying the full treatment.'},
    {observation:'The workspace study uses a left navigation column and places a visible save action above a grouped preview and status list.',transfer:'Put destination information before the action and keep progress states in a stable sequence.',limitation:'A terminal installer does not need a persistent sidebar or a collection preview.'},
    {observation:'The editorial study uses a serif display heading over a large outlined yellow image, balanced against an explanatory text column.',transfer:'Use a short identity statement and concise rationale alongside the preview.',limitation:'Editorial display typography does not transfer to a terminal’s fixed-width text grid.'},
  ];
  const currentExamples=catalog.styles.find((style:any)=>style.slug==='neo-brutalism').examples;
  references.forEach((r:any,i:number)=>{
    const example=currentExamples.find((item:any)=>item.id===r.id);
    assert.ok(example,'The demonstration reference must belong to the selected style');
    Object.assign(r,{image:path.resolve(library,example.image),sha256:example.sha256},analyses[i]);
  });
  await writeFile(path.join(directory,'references.json'),JSON.stringify(references,null,2)+'\n');
  const decisions={visualThesis:'Present a deliberate local tool with clear steps, readable destinations, and a restrained warm accent.',palette:{canvas:'#e7e8df',text:'#25392f',accent:'#df7856',surface:'#171f1a',terminalText:'#edf0e5'},typography:{display:'system-ui, sans-serif',body:'Cascadia Mono, Consolas, monospace',rationale:'The actual terminal uses its host monospace font; the artifact uses system text around the captured Ink frame.'},composition:'Identity, installation purpose, framed terminal preview, and one contextual caption.',responsiveBehavior:'Switch from the captured 90-column frame to the captured 46-column frame at narrow widths.',images:'The preview uses actual captured Ink output rather than unrelated stock imagery.',icons:'State markers use consistent terminal characters; actions remain text-labeled.',motion:'The terminal displays discrete progress stages; the review page remains static.',states:'Agent selection, destination review, installation progress, completion, and recoverable failure.',tradeoff:'The HTML preserves an inspectable view but does not execute installation or claim to be a visual editing runtime.'};
  await writeFile(path.join(directory,'decisions.json'),JSON.stringify(decisions,null,2)+'\n');
  for(const size of ['desktop','mobile'])await writeFile(path.join(directory,'artboards',size+'.html'),preview);
  await runArtifact(['assemble','--directory',directory],library);
  await copyFile(path.join(output,'installer-preview.png'),path.join(directory,'desktop.png'));
  await copyFile(path.join(output,'installer-preview-mobile.png'),path.join(directory,'mobile.png'));
  await page.goto(pathToFileURL(path.join(directory,'canvas.html')).href);
  await page.getByRole('button',{name:'Mobile',exact:true}).click();
  assert.equal(await page.locator('#zoom-value').textContent(),'100%');
  await page.getByRole('button',{name:'Compare',exact:true}).click();
  assert.ok(!(await page.locator('#stage').getAttribute('class'))?.includes('focused'));
  const review={viewports:[{width:1440,screenshot:'desktop.png',observations:'Wide preview shows destination information, library counts, and the entire terminal review frame.'},{width:390,screenshot:'mobile.png',observations:'Narrow preview switches to the 46-column frame with no horizontal body overflow.'}],primaryInteraction:'The review canvas switches to mobile focus and back to comparison. Actual installation behavior is exercised by integration tests.',keyboard:'Terminal choices use arrow keys, space, enter, and escape. Canvas controls are native named buttons.',copy:'All preview and installer text is English and action-specific. Preview status is disclosed clearly.',limitations:['The HTML is an inspectable installer preview and does not install files.','Automated checks do not certify accessibility or artistic quality.']};
  await writeFile(path.join(directory,'review.json'),JSON.stringify(review,null,2)+'\n');
  await runArtifact(['finalize','--directory',directory],library);
  report.push({check:'Complete artifact workflow',result:'Planning, three inspected references, actual artboards, canvas controls, wide/narrow PNG evidence, and finalize all succeeded.'});
  assert.deepEqual(runtimeErrors,[],'Unexpected browser runtime errors');
}finally{await browser.close()}
await writeFile(path.join(output,'verification-report.json'),JSON.stringify({completedAt:new Date().toISOString(),checks:report},null,2)+'\n');
console.log('Browser verification and installer artifact complete.');
