import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const siteRoot = path.resolve('site');
const artifactRoot = path.resolve('.notorism/artifacts/notorism-site');

const mimeTypes = { '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
async function dataUrl(relativePath) {
  const file = path.resolve(siteRoot, relativePath);
  if (!file.startsWith(siteRoot + path.sep)) throw new Error('Asset escapes site directory');
  const mime = mimeTypes[path.extname(file)];
  if (!mime) throw new Error('Unknown asset type: ' + relativePath);
  const bytes = await readFile(file);
  return 'data:' + mime + ';base64,' + bytes.toString('base64');
}

async function replaceAsync(input, pattern, replacer) {
  const matches = [...input.matchAll(pattern)];
  const replacements = await Promise.all(matches.map(replacer));
  let output = input;
  for (let index = matches.length - 1; index >= 0; index--) {
    const match = matches[index];
    output = output.slice(0, match.index) + replacements[index] + output.slice(match.index + match[0].length);
  }
  return output;
}

let html = await readFile(path.join(siteRoot, 'index.html'), 'utf8');
let css = await readFile(path.join(siteRoot, 'styles.css'), 'utf8');
css = await replaceAsync(css, /url\("([^"]+)"\)/g, async (match) => 'url("' + await dataUrl(match[1]) + '")');
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>' + css + '</style>');
html = html.replace(/<link rel="icon"[^>]+>/, '');
html = await replaceAsync(html, /\bsrc="(assets\/[^"]+)"/g, async (match) => 'src="' + await dataUrl(match[1]) + '"');

const patterns = (await readFile(path.join(siteRoot, 'patterns.js'), 'utf8')).replaceAll('export function', 'function');
const main = (await readFile(path.join(siteRoot, 'main.js'), 'utf8')).replace("import { paintPatterns } from './patterns.js';", '');
html = html.replace('<script type="module" src="main.js"></script>', '<script>\n(() => {\n' + patterns + '\n' + main + '\n})();\n</script>');
await writeFile(path.join(siteRoot, 'preview.html'), html);
const hasArtboards = await stat(path.join(artifactRoot, 'artboards')).then((entry) => entry.isDirectory()).catch((error) => {
  if (error.code === 'ENOENT') return false;
  throw error;
});
if (hasArtboards) {
  await writeFile(path.join(artifactRoot, 'artboards/desktop.html'), html);
  await writeFile(path.join(artifactRoot, 'artboards/mobile.html'), html);
}
console.log('Portable campaign: ' + (Buffer.byteLength(html) / 1024 / 1024).toFixed(2) + ' MB. Five responsive posters.');
