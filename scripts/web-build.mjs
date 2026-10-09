// SPDX-License-Identifier: Apache-2.0
// Builds the Web Datacenter from harvested candidates and measured analysis.
// The datacenter stores links, gallery attribution and measured design facts.
// It does not redistribute screenshots, markup, copy or code from the sites.
import {readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import path from 'node:path';

const TARGET = Number(process.env.TARGET ?? 300);
const root = path.resolve('payload/library');
const candidates = JSON.parse(await readFile('.research/web/candidates.json', 'utf8'));
const analysis = JSON.parse(await readFile('.research/web/analysis.json', 'utf8'));
const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8'));
const styleName = Object.fromEntries(catalog.styles.map(s => [s.slug, s.name]));

const GROTESQUE = /helvetica|grotesk|grotesque|akzidenz|neue|inter|suisse|aktiv|univers|haas|arial|dm sans|manrope|geist|söhne|sohne|gt america|favorit|pp neue|pp mori|general sans|satoshi/i;
const SERIF = /serif|georgia|times|garamond|playfair|canela|tiempos|freight|caslon|bodoni|didone|editorial|newsreader|ivar|gt sectra|cormorant|ogg|reckless|signifier|fraunces/i;
const MONO = /mono|courier|consolas|menlo|code|typewriter|space grotesk mono|berkeley|jetbrains|ibm plex mono/i;
const BAD_TITLE = /just a moment|access denied|attention required|403|404|not found|error|cloudflare|captcha|domain|for sale|parked|coming soon|under construction|casino|porn|xxx|escort|bet(ting)?\b/i;

const rule = (slug, score, why) => ({slug, score, why});

function classify(c, a) {
  const f = a.feats, n = Math.max(1, f.textEls);
  const out = [];
  const tags = c.tags.map(t => t.replace('httpster:', ''));
  const has = t => tags.includes(t);
  const fonts = [a.h1Font, ...a.fonts].filter(Boolean).join(' ');
  const light = !a.dark;
  const nColors = a.palette.length;
  const big = Math.max(a.maxFont, a.h1Size ?? 0);
  const upperShare = f.uppercase / n;
  const mono = (f.mono / n) > .25 || MONO.test(fonts);
  const serif = (f.serif / n) > .3 || SERIF.test(a.h1Font ?? '');
  const grot = GROTESQUE.test(fonts);
  const calm = nColors <= 3 && a.accents.length === 0;

  // Swiss / International Typographic: grotesque type on a quiet palette, a real grid, flat surfaces.
  if (grot && calm && a.gridEls >= 2 && f.shadowSoft + f.gradients + f.backdrop < 4 && !mono)
    out.push(rule('swiss-design', 2.6 + (light ? .3 : 0) + (a.gridEls > 6 ? .3 : 0), 'grotesque sans, restrained palette, grid layout, flat surfaces'));
  if (grot && calm && upperShare > .25 && a.gridEls >= 1 && f.shadowSoft < 3)
    out.push(rule('international-typographic-style', 2.2, 'grotesque type, uppercase labels, modular alignment'));
  // Brutalist family
  if (has('brutalist') || (mono && f.borders >= 3 && f.radiusBig < 2))
    out.push(rule('brutalism', has('brutalist') ? 3.2 : 2.1, has('brutalist') ? 'tagged brutalist by the source gallery' : 'monospaced type, heavy rules, no rounding'));
  if (f.shadowSharp >= 2 && f.borders >= 2 && a.accents.length)
    out.push(rule('neo-brutalism', 2.8, 'hard offset shadows, thick outlines, saturated accent'));
  if (has('non-standard-layout'))
    out.push(rule('anti-design', 2.3, 'non-standard layout per the source gallery'));
  if (has('minimal') || c.sources.includes('minimal.gallery') && calm)
    out.push(rule('minimalism', 2.4 + (a.textLen < 1200 ? .4 : 0), 'few colors, little copy, generous space'));
  if (calm && a.textLen < 350 && a.pageHeight < 2200 && f.uppercase < 5)
    out.push(rule('japanese-minimalism', 1.6, 'very little copy, one quiet palette'));
  if (big >= 110 || (a.h1Size ?? 0) >= 100)
    out.push(rule('big-typography', 2.4 + Math.min(1, (big - 110) / 200), `display type reaches ${Math.round(big)}px`));
  if (has('typographic'))
    out.push(rule('typography-first', 3, 'tagged typographic by the source gallery'));
  if (serif && light && a.accents.length < 2)
    out.push(rule('editorial-layout', 2.5, 'serif display type on a quiet light page'));
  if (serif && f.italic / n > .04)
    out.push(rule('variable-typography', 1.6, 'serif with italic contrast'));
  if (a.tech.includes('webgl') || a.tech.includes('three.js'))
    out.push(rule('webgl-3d-experience', 2.9, 'renders a WebGL canvas'));
  if (a.tech.some(t => ['gsap', 'lenis', 'locomotive-scroll'].includes(t)))
    out.push(rule('scroll-driven-animation', 2 + (a.tech.includes('lenis') ? .3 : 0), `scroll motion stack: ${a.tech.filter(t => ['gsap', 'lenis', 'locomotive-scroll'].includes(t)).join(', ')}`));
  if (a.tech.includes('gsap') && big >= 90 && a.pageHeight > 3500)
    out.push(rule('kinetic-typography', 1.9, 'GSAP with display-scale type'));
  if (has('scrolling-behaviour') && a.pageHeight > 4000)
    out.push(rule('scrollytelling', 2, 'scrolling behaviour tag, long narrative page'));
  if (f.backdrop >= 3)
    out.push(rule('glassmorphism', 2.5, `${f.backdrop} elements use backdrop blur`));
  if (f.gradients >= 6 && f.backdrop < 3)
    out.push(rule('gradient-design', 2, `${f.gradients} gradient surfaces`));
  if (a.dark && a.accents.length && f.gradients >= 3 && f.backdrop >= 1)
    out.push(rule('aurora-ui', 1.9, 'dark field, luminous gradients, translucent planes'));
  if (a.dark && a.accents.length && (mono || f.blend >= 2) && f.gradients >= 2)
    out.push(rule('neon-glow', 1.8, 'dark field with luminous saturated accents'));
  if (a.dark && mono && a.accents.length >= 1 && f.textEls >= 40)
    out.push(rule('terminal-hacker-ui', 2.3, 'dark page, monospaced type, signal accent, dense text'));
  if (calm && f.textEls < 30 && a.pageHeight < 2200)
    out.push(rule('minimalism', 2.2, 'very few elements, quiet palette, single screen'));
  if (a.dark && calm && !mono && nColors <= 2)
    out.push(rule('monochromatic-design', 1.3, 'dark page, single value family'));
  if (has('monotone'))
    out.push(rule('monochromatic-design', 2.8, 'tagged monotone by the source gallery'));
  if (has('retro'))
    out.push(rule('vintage-analog', 2.4, 'tagged retro by the source gallery'));
  if (has('retro') && mono)
    out.push(rule('retro-futurism', 1.8, 'retro tag with technical monospace'));
  if (has('retro') && (f.gradients >= 2 || f.backdrop))
    out.push(rule('y2k-aesthetic', 1.6, 'retro tag with glossy surfaces'));
  if (has('colourful') && nColors >= 5)
    out.push(rule('maximalism', 2.1, 'colourful tag and a wide palette'));
  if (has('colourful') && f.radiusBig >= 2 && f.shadowSoft < 4)
    out.push(rule('flat-design-2-0', 1.7, 'colourful flat planes with rounded corners'));
  if (has('illustrative'))
    out.push(rule('hand-drawn-design', 2.1, 'tagged illustrative by the source gallery'));
  if (has('print'))
    out.push(rule('editorial-layout', 2.2, 'print-inspired per the source gallery'));
  if (has('fullscreen') || (a.imgs >= 12 && f.textEls < 90 && a.pageHeight > 3000))
    out.push(rule('full-bleed-design', has('fullscreen') ? 2.3 : 1.4, 'image-led, full-viewport sections'));
  if (has('photographic'))
    out.push(rule('immersive-storytelling', 1.7, 'photography-led per the source gallery'));
  if (a.gridEls >= 16 && f.radiusBig >= 6)
    out.push(rule('bento-grid', 2.2, `${a.gridEls} CSS grid containers with large radii`));
  if (has('grid') && a.gridEls >= 4)
    out.push(rule('modular-grid', 2.3, 'grid-led composition'));
  if (f.radiusBig >= 4 && f.shadowSoft >= 4)
    out.push(rule('card-based-design', 1.9, 'rounded cards with soft elevation'));
  if (f.rotated >= 3 || f.clipPath >= 3)
    out.push(rule('collage-design', 1.7, 'rotated or clipped pieces'));
  if (f.filter >= 4 && f.blend >= 2)
    out.push(rule('chromatic-aberration', 1.2, 'filters and blend modes'));
  if (a.accents.length && f.blend >= 4)
    out.push(rule('duotone', 1.5, 'blend-mode color treatment'));
  
  const best = new Map();
  for (const o of out) if (!best.has(o.slug) || best.get(o.slug).score < o.score) best.set(o.slug, o);
  return [...best.values()].filter(o => styleName[o.slug]).sort((a, b) => b.score - a.score).slice(0, 4);
}

function describe(a) {
  const bits = [];
  bits.push(a.dark ? 'dark page' : 'light page');
  if (a.accents.length) bits.push(`accent ${a.accents.join(' / ')}`);
  else bits.push(a.palette.length <= 2 ? 'two-value palette' : `${a.palette.length}-colour palette`);
  const big = Math.max(a.maxFont, a.h1Size ?? 0);
  if (big >= 110) bits.push(`display type up to ${Math.round(big)}px`);
  if (a.fonts[0]) bits.push(`type: ${a.fonts.slice(0, 2).join(' + ')}`);
  if (a.tech.length) bits.push(a.tech.filter(t => !['svg', 'canvas', 'video'].includes(t)).slice(0, 3).join(', ') || null);
  return bits.filter(Boolean).join('; ');
}

// ---- assemble
const pool = [];
for (const c of candidates) {
  const a = analysis[c.host];
  if (!a?.ok || BAD_TITLE.test(a.title) || a.textLen < 60 || !/^https?:/.test(c.url)) continue;
  const styles = classify(c, a);
  if (!styles.length) continue;
  const quality = styles[0].score + (c.sources.length > 1 ? .8 : 0) + (a.accents.length ? .1 : 0) + Math.min(.5, a.tech.length * .1);
  pool.push({c, a, styles, quality});
}
pool.sort((x, y) => y.quality - x.quality);

// Balanced selection: round-robin over primary styles so one aesthetic cannot dominate.
const byPrimary = new Map();
for (const p of pool) { const k = p.styles[0].slug; (byPrimary.get(k) ?? byPrimary.set(k, []).get(k)).push(p); }
const picked = [], used = new Set();
const cap = Number(process.env.CAP ?? 14);
for (let round = 0; round < cap && picked.length < TARGET; round++) {
  for (const [, list] of [...byPrimary.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const p = list[round];
    if (p && !used.has(p.c.host) && picked.length < TARGET) { picked.push(p); used.add(p.c.host); }
  }
}
for (const p of pool) if (picked.length < TARGET && !used.has(p.c.host)) { picked.push(p); used.add(p.c.host); }

// Short brand name: the shortest title segment that looks like a name, else the host.
const brand = p => {
  const segs = p.a.title.split(/\s*[|–—:·•]\s*|\s-\s/).map(x => x.trim()).filter(Boolean);
  const ok = segs.filter(x => /[a-z]{3}/i.test(x) && x.length <= 32 && !/^(home(page)?|welcome|index|official|portfolio|about)\b|\b(agency|studio) (in|based)\b|\bin [A-Z][a-z]+$/i.test(x) && x.split(/\s+/).length <= 4);
  return ok.sort((a, b) => a.length - b.length)[0] ?? p.c.host;
};
const slugify = h => h.replace(/^www\./, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sites = picked.sort((x, y) => x.c.host.localeCompare(y.c.host)).map((p, i) => ({
  id: i + 1,
  slug: slugify(p.c.host),
  name: brand(p),
  url: p.a.finalUrl.replace(/[?#].*$/, ''),
  host: p.c.host,
  language: p.a.lang || null,
  curatedBy: p.c.sources,
  galleryTags: p.c.tags.map(t => t.replace('httpster:', '')),
  styles: p.styles.map(s => ({slug: s.slug, confidence: Number(Math.min(.99, s.score / 3.6).toFixed(2)), because: s.why})),
  observed: {
    mode: p.a.dark ? 'dark' : 'light',
    background: p.a.bg, text: p.a.fg, palette: p.a.palette, accents: p.a.accents,
    fonts: p.a.fonts, displayFont: p.a.h1Font, displaySizePx: Math.round(Math.max(p.a.maxFont, p.a.h1Size ?? 0)),
    displayCase: p.a.h1Case, tracking: p.a.h1Tracking,
    tech: p.a.tech, pageHeightPx: p.a.pageHeight,
    summary: describe(p.a),
  },
  capturedAt: '2026-10-09',
}));

const outDir = path.join(root, 'web');
await rm(outDir, {recursive: true, force: true});
await mkdir(outDir, {recursive: true});
await writeFile(path.join(outDir, 'sites.json'), JSON.stringify({
  schemaVersion: 1, count: sites.length, capturedAt: '2026-10-09', viewport: '1440x900',
  method: 'Public design galleries were harvested for URLs; each site was opened in a headless browser and measured. Style tags are heuristic and carry a confidence value. Measurements can be skewed by cookie banners or interstitials. No screenshots, markup, copy or code are redistributed.',
  sites,
}, null, 1) + '\n');

// Docs: index and per-style lists (only styles that have at least one site).
const docDir = path.join(root, 'docs/web');
await rm(docDir, {recursive: true, force: true});
await mkdir(path.join(docDir, 'by-style'), {recursive: true});
const perStyle = new Map();
for (const s of sites) for (const st of s.styles) (perStyle.get(st.slug) ?? perStyle.set(st.slug, []).get(st.slug)).push({s, st});
const row = ({s, st}) => `- [${s.name}](${s.url}) — ${st.because}; ${s.observed.summary}. _confidence ${st.confidence}_`;
for (const [slug, list] of perStyle) {
  list.sort((a, b) => b.st.confidence - a.st.confidence);
  await writeFile(path.join(docDir, 'by-style', `${slug}.md`),
    `# ${styleName[slug]}: real websites\n\n${list.length} live sites measured as examples of [${styleName[slug]}](../../styles/${slug}/README.md). Open the live site to study it; do not copy its code, copy, images or brand.\n\n${list.map(row).join('\n')}\n`);
}
const idx = [...perStyle.entries()].sort((a, b) => b[1].length - a[1].length);
await writeFile(path.join(docDir, 'INDEX.md'), `# Web Datacenter

${sites.length} real, live websites curated by public design galleries and measured in a 1440x900 headless browser. Use them as evidence of how a visual language is actually built: type, palette, density, motion stack. They are references to study, not templates to copy.

How to use:

1. Pick the style in [docs/styles/INDEX.md](../styles/INDEX.md).
2. Open \`docs/web/by-style/<style>.md\` for live sites that express it.
3. Read \`web/sites.json\` for measured facts (fonts, palette, display size, tech) and the reason each style tag was given.
4. Open the live URL, observe, then write your own original design. Never reuse the site's markup, copy, imagery, logo or brand.

Style tags are heuristic. Check the \`confidence\` and \`because\` fields, and trust your own eyes on the live page.

## Styles with live references

${idx.map(([slug, l]) => `- [${styleName[slug]}](by-style/${slug}.md): ${l.length}`).join('\n')}

## All sites

${sites.map(s => `- [${s.name}](${s.url}) — ${s.styles.map(x => styleName[x.slug]).join(', ')}`).join('\n')}
`);

// Register the module.
const regPath = path.join(root, 'modules/registry.json');
const reg = JSON.parse(await readFile(regPath, 'utf8'));
reg.modules = reg.modules.filter(m => m.id !== 'web-datacenter');
const at = reg.modules.findIndex(m => m.id === 'style-combinations');
reg.modules.splice(at + 1, 0, {id: 'web-datacenter', path: 'docs/web/INDEX.md', load: 'on-demand', purpose: 'Study live, curated websites per style: measured type, palette, density and motion stack.'});
await writeFile(regPath, JSON.stringify(reg, null, 2).replace(/\{\s+"id": ("[^"]+"),\s+"path": ("[^"]+"),\s+"load": ("[^"]+"),\s+"purpose": ("[^"]+")\s+\}/g, '{"id":$1,"path":$2,"load":$3,"purpose":$4}').replace(/\[\s+("contracts\/[^\]]+)\]/, m => m) + '\n');

console.log(`pool ${pool.length}, selected ${sites.length}, styles covered ${perStyle.size}`);
console.log(idx.map(([s, l]) => `${s}:${l.length}`).join(' '));
