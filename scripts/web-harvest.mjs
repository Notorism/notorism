// Collects candidate sites from public, curated web-design galleries.
// Output: .research/web/candidates.json (git-ignored). Only URLs and the
// gallery's own tags are stored here; nothing from the sites is copied.
import {mkdir, writeFile, readFile} from 'node:fs/promises';

const UA = 'Mozilla/5.0 (compatible; NotorismWebDatacenter/1.0; +https://github.com/Notorism/notorism)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pages = {httpster: Number(process.env.HTTPSTER_PAGES ?? 45), minimal: Number(process.env.MINIMAL_PAGES ?? 25)};

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {headers: {'user-agent': UA}, redirect: 'follow', signal: AbortSignal.timeout(30000)});
      if (res.ok) return await res.text();
      if (res.status === 404) return '';
    } catch {}
    await sleep(1500 * (attempt + 1));
  }
  return '';
}

const candidates = new Map();
if (process.env.SEEDS_ONLY) for (const c of JSON.parse(await readFile('.research/web/candidates.json', 'utf8'))) candidates.set(c.host, c);
function add(url, name, source, tags = []) {
  let u;
  try { u = new URL(url); } catch { return; }
  u.search = ''; u.hash = '';
  const host = u.hostname.replace(/^www\./, '');
  if (/(httpster|minimal\.gallery|bsky|linkedin|instagram|twitter|facebook)/.test(host)) return;
  const entry = candidates.get(host) ?? {host, url: u.origin + (u.pathname === '/' ? '/' : u.pathname), name, sources: [], tags: []};
  if (!entry.sources.includes(source)) entry.sources.push(source);
  for (const t of tags) if (!entry.tags.includes(t)) entry.tags.push(t);
  candidates.set(host, entry);
}

if (!process.env.SEEDS_ONLY) {
// Httpster: style pages carry the gallery's own style tag.
const httpsterStyles = ['brutalist', 'colourful', 'dark', 'fullscreen', 'grid', 'illustrative', 'interactive', 'light', 'minimal', 'monotone', 'non-standard-layout', 'non-standard-navigation', 'photographic', 'print', 'retro', 'scrolling-behaviour', 'typographic'];
const parseHttpster = (html, tags) => {
  const re = /class="Preview__title" href="\/website\/([^"]+)\/">([\s\S]*?)<\/a>[\s\S]*?class="Preview__ext" href="([^"]+)"/g;
  let m, n = 0;
  while ((m = re.exec(html))) { add(m[3], m[2].replace(/<[^>]+>/g, '').trim() || m[1], 'httpster', tags); n++; }
  return n;
};
for (const style of httpsterStyles) {
  const html = await get(`https://httpster.net/style/${style}/`);
  parseHttpster(html, [`httpster:${style}`]);
  await sleep(300);
}
for (let p = 1; p <= pages.httpster; p++) {
  const html = await get(p === 1 ? 'https://httpster.net/' : `https://httpster.net/page/${p}/`);
  if (!parseHttpster(html, [])) break;
  await sleep(300);
}

// Minimal Gallery: listing pages link to external sites with ?ref=minimal.gallery.
for (let p = 1; p <= pages.minimal; p++) {
  const html = await get(p === 1 ? 'https://minimal.gallery/' : `https://minimal.gallery/page/${p}/`);
  const re = /href="(https?:\/\/[^"]+?)\?ref=minimal\.gallery"/g;
  let m, n = 0;
  while ((m = re.exec(html))) { add(m[1], '', 'minimal.gallery'); n++; }
  if (!n) break;
  await sleep(300);
}

}

// Curated anchors (scripts/web-seeds.json): hand-picked, always analyzed and prioritized.
const seeds = JSON.parse(await readFile('scripts/web-seeds.json', 'utf8'));
for (const [collection, hosts] of Object.entries(seeds)) for (const h of hosts) {
  add('https://' + h + '/', '', 'seed', [`anchor:${collection}`]);
}

await mkdir('.research/web', {recursive: true});
const list = [...candidates.values()];
await writeFile('.research/web/candidates.json', JSON.stringify(list, null, 1));
const by = {};
for (const c of list) for (const s of c.sources) by[s] = (by[s] ?? 0) + 1;
console.log(`${list.length} unique candidate hosts`, by);
