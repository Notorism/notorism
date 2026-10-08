// SPDX-License-Identifier: Apache-2.0
// Update nonvisual release metadata without rerendering unchanged studies.
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const project=process.cwd(),root=path.resolve('payload/library');
const catalog=JSON.parse(await readFile(path.join(root,'catalog.json'),'utf8'));
if(catalog.version!=='1.0.0'||catalog.styles.length!==110)throw new Error('Expected the complete 1.0.0 catalog');
for(const style of catalog.styles){
  if(!/^[a-z0-9-]+$/.test(style.slug)||style.examples.length!==3)throw new Error('Invalid style entry');
  for(const example of style.examples)example.license='Apache-2.0';
  const directory=path.join(root,'docs/styles',style.slug);
  const readme=path.join(directory,'README.md');
  await writeFile(readme,(await readFile(readme,'utf8')).replace('under MIT','under Apache-2.0'));
  await writeFile(path.join(directory,'references.json'),JSON.stringify(style.examples,null,2)+'\n');
}
await writeFile(path.join(root,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
await mkdir(path.join(root,'bin'),{recursive:true});
await copyFile(path.join(project,'dist/session-start.js'),path.join(root,'bin/notorism-session-start.mjs'));
for(const filename of ['LICENSE','NOTICE'])await copyFile(path.join(project,filename),path.join(root,filename));
console.log('Synchronized Apache-2.0 metadata and the SessionStart loader. Original study images were preserved.');
