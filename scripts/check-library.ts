import {readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve('payload/library');
const catalog=JSON.parse(await readFile(path.join(root,'catalog.json'),'utf8'));
if(catalog.version!=='1.0.0'||catalog.language!=='en'||catalog.styles.length!==110)throw new Error('Expected 110 English style entries in version 1.0.0');
const ids=new Set<number>(),slugs=new Set<string>();let imageCount=0;
for(const style of catalog.styles){
  if(ids.has(style.id)||slugs.has(style.slug))throw new Error('Duplicate catalog entry');
  ids.add(style.id);slugs.add(style.slug);
  if(style.examples.length!==3)throw new Error(`${style.name} must have three examples`);
  await readFile(path.join(root,style.documentation));
  await readFile(path.join(root,'docs/styles',style.slug,'README.md'));
  for(const example of style.examples){
    if(example.license!=='Apache-2.0')throw new Error(`Unexpected original study license: ${example.id}`);
    const image=await readFile(path.join(root,example.image));
    if(image.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(`Invalid PNG: ${example.image}`);
    if(image.readUInt32BE(16)!==1440||image.readUInt32BE(20)!==960)throw new Error('Unexpected reference dimensions');
    if(createHash('sha256').update(image).digest('hex')!==example.sha256)throw new Error(`Image checksum mismatch: ${example.image}`);
    await readFile(path.join(root,example.html));imageCount++;
  }
}
for(let id=1;id<=110;id++)if(!ids.has(id))throw new Error(`Missing style ${id}`);
const files:{path:string;sha256:string;size:number}[]=[];
async function walk(directory:string){for(const entry of await readdir(directory,{withFileTypes:true})){
  const full=path.join(directory,entry.name);const stats=await lstat(full);
  if(stats.isSymbolicLink())throw new Error('Payload must not contain symbolic links');
  if(entry.isDirectory())await walk(full);else if(entry.isFile()&&full!==path.join(root,'manifest.json')){
    const data=await readFile(full);const relative=path.relative(root,full).split(path.sep).join('/');
    if(/\.(md|json|html|mjs)$/.test(relative)&&/\b(?:Direção|tipografia|pasta|usuário|exemplos|referências|conteúdo|instalação|documentação|estilos|família)\b/i.test(data.toString('utf8')))throw new Error(`Non-English content detected: ${relative}`);
    files.push({path:relative,sha256:createHash('sha256').update(data).digest('hex'),size:data.length});
  }
}}
await walk(root);files.sort((a,b)=>a.path.localeCompare(b.path));
await writeFile(path.join(root,'manifest.json'),JSON.stringify({schemaVersion:1,version:'1.0.0',license:'Apache-2.0',language:'en',styleCount:110,imageCount,files},null,2)+'\n');
console.log(`Verified ${ids.size} styles, ${imageCount} PNGs, and ${files.length} payload files. Integrity manifest written.`);
