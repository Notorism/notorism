import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const research=path.resolve(process.argv[2]??'.research');
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:research,encoding:'utf8'}).trim();
const targets=['Anthropic/claude-design','Anthropic/claude-code/skills/artifact-design','Anthropic/claude-code/skills/artifact-capabilities','Anthropic/claude-code/skills/artifact-diagramming','Anthropic/claude-code/skills/design','Anthropic/claude-opus-5.5.md'];
const records:{path:string;bytes:number;sha256:string;headings:string[];kind:string}[]=[];
async function processFile(relative:string){
  const bytes=await readFile(path.join(research,relative));
  const text=bytes.toString('utf8');
  records.push({path:relative.split(path.sep).join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),headings:text.split(/\r?\n/).filter(line=>/^#{1,4}\s/.test(line)).map(line=>line.replace(/^#+\s/,'')),kind:relative.endsWith('.md')?'prompt-or-skill':relative.endsWith('.d.ts')?'capability-contract':'supporting-implementation'});
}
async function walk(relative:string){for(const item of await readdir(path.join(research,relative),{withFileTypes:true})){const next=path.join(relative,item.name);if(item.isDirectory())await walk(next);else if(/\.(md|ts|js|mjs|jsx)$/.test(item.name))await processFile(next)}}
for(const target of targets){if(target.endsWith('.md'))await processFile(target);else await walk(target)}
await writeFile('payload/library/docs/research/source-inventory.json',JSON.stringify({repository:'https://github.com/asgeirtj/system_prompts_leaks',revision,retrievedAt:new Date().toISOString(),method:'Complete UTF-8 reads and source indexing; design guidance synthesized separately. Raw source text is not redistributed.',files:records},null,2)+'\n');
console.log(`Indexed ${records.length} source files at ${revision}. Raw source text is excluded from the payload.`);
