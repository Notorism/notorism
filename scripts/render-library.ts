import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve('payload/library');
const catalog=JSON.parse(await readFile(path.join(root,'catalog.json'),'utf8'));
const selected=process.argv.slice(2);
const selectedStyles=selected.length?catalog.styles.filter((s:any)=>selected.includes(s.slug)):catalog.styles;
if(selected.length&&selectedStyles.length!==new Set(selected).size)throw new Error('A requested style slug is unknown');
const expected=selectedStyles.length*3;
const browser=await chromium.launch({headless:true});
const issues: {file:string;issue:string}[]=[];
let complete=0;
try {
  // Independent pages can render concurrently; each has its own context.
  const queue=selectedStyles.flatMap((s:any)=>s.examples);
  await Promise.all(Array.from({length:4},async()=>{
    const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});
    const page=await context.newPage();
    while(queue.length){
      const example=queue.shift();if(!example)break;
      const errors:string[]=[];
      const onError=(e:Error)=>errors.push(e.message);page.on('pageerror',onError);
      await page.goto(pathToFileURL(path.join(root,example.html)).href,{waitUntil:'load'});
      await page.evaluate(async()=>{await document.fonts.ready;document.documentElement.dataset.capture='true'});
      const metrics=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,heading:document.querySelector('h1')?.getBoundingClientRect().bottom,font:document.fonts.check('16px Body')}));
      if(metrics.width>metrics.viewport+1)issues.push({file:example.html,issue:`Horizontal overflow: ${metrics.width}px`});
      if(!metrics.font)issues.push({file:example.html,issue:'Body font failed to load'});
      for(const error of errors)issues.push({file:example.html,issue:error});
      await page.screenshot({path:path.join(root,example.image),fullPage:false});
      page.off('pageerror',onError);
      complete++;if(complete%30===0)console.log(`Rendered ${complete}/${expected} references`);
    }
    await context.close();
  }));
}finally{await browser.close()}
await mkdir(path.join(root,'docs/research'),{recursive:true});
const reportFile=path.join(root,'docs/research/render-report.json');
const previous=await readFile(reportFile,'utf8').then(text=>JSON.parse(text)).catch(()=>undefined);
const history=previous?.history??(previous?[{screenshots:previous.screenshots,issues:previous.issues}]:[]);
history.push({completedAt:new Date().toISOString(),styles:selected.length?selected:'all',screenshots:complete,issues});
await writeFile(reportFile,JSON.stringify({viewport:{width:1440,height:960},screenshots:complete,totalReferenceImages:330,issues,history},null,2)+'\n');
if(issues.length)throw new Error(`Rendering found ${issues.length} issues; inspect render-report.json`);
// Bind images to metadata only after rendering succeeded.
for(const style of catalog.styles){
  for(const example of style.examples){
    const bytes=await readFile(path.join(root,example.image));
    example.sha256=createHash('sha256').update(bytes).digest('hex');
    example.width=1440;example.height=960;
  }
  await writeFile(path.join(root,'docs/styles',style.slug,'references.json'),JSON.stringify(style.examples,null,2)+'\n');
}
await writeFile(path.join(root,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
console.log(`${complete} PNG references rendered; all 330 image checksums refreshed.`);
