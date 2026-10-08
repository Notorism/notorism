import {mkdir, readFile, writeFile, copyFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {styles, sources, families} from '../src/catalog.js';
import {renderReference, escapeHtml, demoDescription} from '../src/reference-design.js';

const project = process.cwd();
const root = path.join(project, 'payload/library');
await mkdir(root, {recursive: true});
const modes = ['Public page', 'Product workspace', 'Editorial composition'];
const fontSpecs = [
  ['@fontsource-variable/dm-sans', 'dm-sans-latin-wght-normal.woff2', 'body.woff2'],
  ['@fontsource/barlow-condensed', 'barlow-condensed-latin-700-normal.woff2', 'display.woff2'],
  ['@fontsource-variable/source-serif-4', 'source-serif-4-latin-wght-normal.woff2', 'editorial.woff2'],
  ['@fontsource-variable/jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2', 'utility.woff2'],
  ['@fontsource-variable/roboto-flex', 'roboto-flex-latin-full-normal.woff2', 'variable.woff2'],
];
await mkdir(path.join(root, 'fonts'), {recursive:true});
for (const [pkg, filename, destination] of fontSpecs) {
  const filesRoot = path.join(project, 'node_modules', pkg!, 'files');
  const files = await readdir(filesRoot);
  const selected = files.includes(filename!) ? filename! : files.find(f => f.endsWith('.woff2') && f.includes('latin-') && f.includes('normal'));
  if (!selected) throw new Error(`No font found for ${pkg}`);
  await copyFile(path.join(filesRoot, selected), path.join(root, 'fonts', destination!));
  const license = await readFile(path.join(project, 'node_modules', pkg!, 'LICENSE'), 'utf8');
  await writeFile(path.join(root, 'fonts', `${destination!.replace('.woff2','')}.LICENSE.txt`), license);
}

const catalog = styles.map(style => {
  const examples = style.contexts.map((subject, index) => ({
    id: `${style.slug}-${index + 1}`,
    title: `${subject}: ${modes[index]}`,
    image: `images/${style.slug}/example-0${index + 1}.png`,
    html: `images/${style.slug}/example-0${index + 1}.html`,
    creator: 'NotorismDesign', origin: 'original-code-native-study', license: 'Apache-2.0',
    isRealClientScreenshot: false, description: demoDescription(style),
    analysis: {
      hierarchy: index === 0 ? 'A subject-specific headline, one action, then related collections.' : index === 1 ? 'Navigation, working context, object statuses, and object-level action.' : 'Title-image relationship, captioned context, and reading rhythm.',
      composition: index === 0 ? 'A public opening with a focal visual and supporting content.' : index === 1 ? 'A workspace with sidebar, preview, list, and repeated units.' : 'An editorial opening with a large title and a composed image-text spread.',
      treatment: style.grammar,
      transfer: 'Transfer relationships and material mechanics; replace all fictional content with the actual brief.',
      limitation: style.avoid,
    },
  }));
  return {...style, documentation: `docs/styles/${style.slug}/guide.md`, examples};
});

for (const style of catalog) {
  const docs = path.join(root, 'docs/styles', style.slug);
  const images = path.join(root, 'images', style.slug);
  await mkdir(docs, {recursive: true}); await mkdir(images, {recursive:true});
await writeFile(path.join(docs, 'README.md'), `# ${style.name}\n\nFamily: ${families[style.family]}. Catalog ID: ${style.id}.\n\nRead [guide.md](guide.md) before selecting this language. Then visually inspect all three PNGs; an image path alone is not an analysis. Open the HTML for interaction behavior.\n\n${style.examples.map((e,i) => `- [Example ${i+1}: ${e.title}](../../../${e.image}) · [HTML study](../../../${e.html})`).join('\n')}\n\nThese are original teaching studies under Apache-2.0, using fictional content. They are not screenshots of real clients or historical artifacts. Source links in the guide provide separate context.\n`);
  await writeFile(path.join(docs, 'guide.md'), `# ${style.name}\n\n## What this label means\n\n${style.origin}\n\nCategory: ${families[style.family]}. ${style.family === 'layout' ? 'This label describes organization rather than a complete visual identity.' : style.family === 'technique' ? 'This label describes a graphic treatment that can support different identities.' : style.family === 'interaction' ? 'This label describes behavior. A still image cannot prove that behavior.' : 'This entry supplies a visual vocabulary, not permission to change the user’s product or scope.'}\n\n## Defining mechanics\n\n${style.grammar.split('; ').map(s => `- ${s.replace(/\.$/, '')}.`).join('\n')}\n\n## Suitable subjects\n\n${style.contexts.join(', ')} are starting contexts for analysis. Choose this language only when the audience, content, and primary task support it. Explain which mechanic belongs to the subject.\n\n## Implementation decisions\n\nUse hierarchy and composition before decoration. Resolve the actual product’s existing tokens first. The study palette is ${style.palette.join(', ')}. Its roles are canvas, foreground, accent, and supporting surface. Measure actual contrast; the sample palette is not an accessibility certificate.\n\nKeep reading text clear while applying the distinctive treatment to the appropriate visual plane. Match image material and icon weight to the direction. Preserve recognizable actions, semantic markup, focus, and responsive reading order. Move the layout to narrow screens intentionally rather than shrinking it.\n\n${demoDescription(style)}\n\n## Main failure mode\n\n${style.avoid} Other risks must be judged in the current brief rather than added as universal style bans.\n\n## Three examples to analyze\n\n${style.examples.map((e,i) => `### ${i+1}. ${e.title}\n\n![${e.title}](../../../${e.image})\n\n[Open the working HTML](../../../${e.html}). ${e.description}\n\nHierarchy: ${e.analysis.hierarchy} Composition: ${e.analysis.composition} Material: ${e.analysis.treatment}\n\nInspect the actual image. Record one visual observation, one transferable choice, and one limitation in the project artifact. Do not merely copy this description into the analysis.\n`).join('\n')}\n## History and evidence\n\nThe origin paragraph is a concise contextual introduction. Community labels may have disputed boundaries and no known founder. Distinguish a style’s history from the history of a curatorial archive. Do not invent dates or attribute modern interface techniques to an unrelated historical artist. Verify detailed historical claims against the linked primary material when the deliverable depends on them.\n\n${style.sources.map(id => `- [${sources[id]!.title}](${sources[id]!.url}): ${sources[id]!.purpose}`).join('\n')}\n\nBook references inform usability and interaction. They do not establish this style’s origin. For implementation maintainability, see [the bibliography](../../research/bibliography.md).\n`);
  await writeFile(path.join(docs, 'references.json'), JSON.stringify(style.examples, null, 2) + '\n');
  for (let i=1;i<=3;i++) await writeFile(path.join(images, `example-0${i}.html`), renderReference(style, i));
}

await writeFile(path.join(root, 'catalog.json'), JSON.stringify({schemaVersion:1, version:'1.0.0', language:'en', styles:catalog},null,2) + '\n');
await writeFile(path.join(root, 'docs/styles/INDEX.md'), `# Style library\n\n110 entries, each with three original visual studies. Select by audience and purpose, then read only the relevant guide and inspect all three images. The categories distinguish appearance, historical context, layout, technique, and behavior; they are not an assertion that all labels are independent movements.\n\n${Object.entries(families).map(([key,label])=>`## ${label}\n\n${styles.filter(s=>s.family===key).map(s=>`- ${s.id}. [${s.name}](${s.slug}/README.md): ${s.grammar}`).join('\n')}\n`).join('\n')}\nSee [combinations.md](combinations.md) for intentional layering.\n`);
await mkdir(path.join(root, 'docs/research'),{recursive:true});
await writeFile(path.join(root, 'docs/research/bibliography.md'), `# Bibliography\n\nThese references support particular decisions. Descriptions are original paraphrases; no book passages or invented page citations are included.\n\n${Object.values(sources).map(s=>`## ${s.title}\n\n[Primary source](${s.url}). ${s.purpose}\n`).join('\n')}\nBooks guide usability, interaction, and implementation. They are not evidence that a visual style has a particular founder. Check editions and exact page numbers against the actual book before making direct citations.\n`);

const galleryItems = catalog.map(s=>`<article data-family="${s.family}" data-search="${escapeHtml((s.name+' '+s.contexts.join(' ')).toLowerCase())}"><div class="card-heading"><h2>${escapeHtml(s.name)}</h2><span>${String(s.id).padStart(3,'0')}</span></div><p class="family">${families[s.family]}</p><div class="examples">${s.examples.map((e,i)=>`<a href="${e.html}" title="${escapeHtml(e.title)}"><img src="${e.image}" width="1440" height="960" loading="lazy" alt="${escapeHtml(e.title)}"><span>${i+1} / ${modes[i]}</span></a>`).join('')}</div><p>${escapeHtml(s.grammar)}</p><a class="guide" href="docs/styles/${s.slug}/guide.md">Read the style guide</a></article>`).join('');
await writeFile(path.join(root, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NotorismDesign Reference Library</title><style>@font-face{font-family:Body;src:url('fonts/body.woff2');font-weight:100 900;font-display:swap}*{box-sizing:border-box}body{margin:0;background:#eeeee8;color:#202723;font:16px/1.5 Body,system-ui,sans-serif}header{padding:45px max(24px,5vw) 36px;background:#202723;color:#eeeee8;border-bottom:5px solid #ab4433}.wordmark{font-size:15px;letter-spacing:.08em}h1{font-size:clamp(40px,5vw,74px);line-height:1.05;letter-spacing:-.05em;font-weight:650;margin:30px 0 20px;max-width:14ch}.intro{max-width:62ch;color:#c9d0c8}.counts{font:12px ui-monospace,monospace;color:#c9d0c8;margin-top:30px}.controls{display:flex;gap:15px;flex-wrap:wrap;padding:25px max(24px,5vw);background:#eeeee8;position:sticky;top:0;z-index:2;border-bottom:1px solid #c9cec7}label{display:grid;gap:7px;font-size:12px}input,select{font:15px Body,system-ui;padding:11px 13px;border:1px solid #a3aea4;border-radius:0;background:#f7f8f2;color:#202723;min-width:220px}input:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid #ab4433;outline-offset:3px}#result-count{align-self:end;font:12px ui-monospace;padding:12px;color:#455649}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:45px 35px;padding:35px max(24px,5vw) 60px}article{min-width:0;border-top:1px solid #8d9d90;padding-top:20px}.card-heading{display:flex;justify-content:space-between;align-items:center;gap:20px}h2{font-size:26px;letter-spacing:-.035em;margin:0}.card-heading span,.family{font:11px ui-monospace;color:#5c6c5e}.examples{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:22px}.examples img{width:100%;height:auto;border:1px solid #c7ccc3;display:block}.examples a{color:inherit;text-decoration:none}.examples span{display:block;font:10px ui-monospace;margin-top:8px}.guide{color:#863c30;text-underline-offset:4px;font-size:14px}article p{font-size:14px;max-width:65ch}footer{padding:25px max(24px,5vw);border-top:1px solid #c9cec7;font-size:12px}article[hidden]{display:none}@media(max-width:850px){main{grid-template-columns:1fr}.controls{position:static}}@media(prefers-reduced-motion:no-preference){.examples img{transition:transform .18s}.examples a:hover img{transform:translateY(-3px)}}</style></head><body><header><div class="wordmark">NOTORISMDESIGN / REFERENCE LIBRARY</div><h1>A vocabulary<br>for deliberate design.</h1><p class="intro">Explore visual languages, composition, materials, and interaction. Each entry includes three original studies, a practical guide, and separate source context.</p><p class="counts">110 STYLES · 330 ORIGINAL IMAGES · 6 FAMILIES · OFFLINE LIBRARY</p></header><section class="controls" aria-label="Library filters"><label>Find a style<input id="search" type="search" placeholder="Style or subject"></label><label>Family<select id="family"><option value="all">All families</option>${Object.entries(families).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><span id="result-count" role="status">110 styles</span></section><main>${galleryItems}</main><footer>Original code-native studies with fictional content. These images are not real-client screenshots. Open the HTML for behavior and read the linked sources for context.</footer><script>const search=document.querySelector('#search'),family=document.querySelector('#family');function filter(){let count=0;document.querySelectorAll('article').forEach(item=>{const show=(family.value==='all'||item.dataset.family===family.value)&&item.dataset.search.includes(search.value.toLowerCase().trim());item.hidden=!show;if(show)count++});document.querySelector('#result-count').textContent=count+' styles'}search.addEventListener('input',filter);family.addEventListener('change',filter);</script></body></html>`);
await mkdir(path.join(root, 'bin'),{recursive:true});
await copyFile(path.join(project,'dist/artifact.js'),path.join(root,'bin/artifact.mjs'));
await copyFile(path.join(project,'dist/session-start.js'),path.join(root,'bin/notorism-session-start.mjs'));
console.log('Built 110 style documents and 330 editable HTML studies. Run library:render to create the PNG image database.');
