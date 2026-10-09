// Visits each candidate in a headless browser and records measurable design
// facts (fonts, palette, layout and technique signals). Nothing is copied
// from the sites: no markup, copy, images or code. Output is resumable.
// Usage: node scripts/web-analyze.mjs [limit]
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const limit = Number(process.argv[2] ?? 100000);
const candidates = JSON.parse(await readFile('.research/web/candidates.json', 'utf8'));
const outFile = '.research/web/analysis.json';
let done = {};
try { done = JSON.parse(await readFile(outFile, 'utf8')); } catch {}

const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']}).catch(() => chromium.launch());

const probe = () => {
  const px = n => parseFloat(n) || 0;
  const rgb = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,\/]+/).map(Number); return a < 0.1 ? null : {r, g, b}; };
  const hex = c => c && '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const sat = c => { const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b); return mx ? (mx - mn) / mx : 0; };
  const fam = s => s.split(',')[0].replace(/["']/g, '').trim();
  const body = document.body, root = document.documentElement;
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c) return c; } return {r: 255, g: 255, b: 255}; };

  const tally = new Map();
  const bump = (k, w) => tally.set(k, (tally.get(k) ?? 0) + w);
  const fonts = new Map(), sizes = [];
  let all = [...document.querySelectorAll('body *')].slice(0, 4000);
  const feats = {uppercase: 0, blend: 0, backdrop: 0, filter: 0, shadowSharp: 0, shadowSoft: 0, radius0: 0, radiusBig: 0, borders: 0, gradients: 0, textEls: 0, mono: 0, serif: 0, italic: 0, rotated: 0, sticky: 0, fixedEls: 0, clipPath: 0, animated: 0, bgImages: 0};
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    const area = Math.max(0, Math.min(r.width, 1440)) * Math.max(0, Math.min(r.height, 4000));
    if (area < 400) continue;
    const bg = rgb(cs.backgroundColor);
    if (bg) bump(hex(bg), area);
    const direct = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (direct) {
      const f = fam(cs.fontFamily); fonts.set(f, (fonts.get(f) ?? 0) + area);
      sizes.push(px(cs.fontSize));
      const c = rgb(cs.color); if (c) bump('t' + hex(c), 0);
      feats.textEls++;
      if (cs.textTransform === 'uppercase') feats.uppercase++;
      if (/mono|courier|consolas|menlo/i.test(cs.fontFamily)) feats.mono++;
      if (/serif/i.test(cs.fontFamily) && !/sans-serif/i.test(cs.fontFamily.split(',').slice(-1)[0])) feats.serif++;
      if (cs.fontStyle === 'italic') feats.italic++;
    }
    if (cs.mixBlendMode !== 'normal') feats.blend++;
    if (cs.backdropFilter && cs.backdropFilter !== 'none') feats.backdrop++;
    if (cs.filter && cs.filter !== 'none') feats.filter++;
    if (cs.boxShadow !== 'none') { /\d+px\s+\d+px\s+0px/.test(cs.boxShadow) ? feats.shadowSharp++ : feats.shadowSoft++; }
    if (px(cs.borderTopLeftRadius) >= 24) feats.radiusBig++;
    if (px(cs.borderTopWidth) >= 2 && cs.borderTopStyle !== 'none') feats.borders++;
    if (/gradient/.test(cs.backgroundImage)) feats.gradients++;
    else if (cs.backgroundImage !== 'none') feats.bgImages++;
    if (cs.transform !== 'none' && /matrix\(([^,]+),([^,]+)/.test(cs.transform)) { const m = cs.transform.match(/matrix\(([^,]+),([^,]+)/); if (Math.abs(+m[2]) > .05 && Math.abs(+m[2]) < .9) feats.rotated++; }
    if (cs.position === 'sticky') feats.sticky++;
    if (cs.position === 'fixed') feats.fixedEls++;
    if (cs.clipPath !== 'none') feats.clipPath++;
    if (cs.animationName !== 'none') feats.animated++;
  }
  const h1 = document.querySelector('h1');
  const h1cs = h1 && getComputedStyle(h1);
  const bodyCs = getComputedStyle(body);
  const bodyBg = rgb(bodyCs.backgroundColor) ?? rgb(getComputedStyle(root).backgroundColor) ?? {r: 255, g: 255, b: 255};
  const text = rgb(bodyCs.color) ?? {r: 0, g: 0, b: 0};
  const palette = [...tally.entries()].filter(([k]) => k[0] === '#').sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
  const accents = [...tally.entries()].filter(([k]) => k[0] === '#').map(([k, w]) => { const n = parseInt(k.slice(1), 16); const c = {r: n >> 16, g: n >> 8 & 255, b: n & 255}; return {k, w, s: sat(c)}; }).filter(x => x.s > .45).sort((a, b) => b.w - a.w).slice(0, 2).map(x => x.k);
  const scripts = [...document.scripts].map(s => s.src).join(' ');
  const html = root.outerHTML.length;
  const w = window;
  const tech = [];
  const hasLib = (re) => re.test(scripts);
  if (w.gsap || hasLib(/gsap/i)) tech.push('gsap');
  if (w.Lenis || hasLib(/lenis/i)) tech.push('lenis');
  if (hasLib(/locomotive/i)) tech.push('locomotive-scroll');
  if (w.THREE || hasLib(/three(\.min)?\.js|three@|\/three\//i)) tech.push('three.js');
  if (document.querySelector('canvas')) tech.push('canvas');
  if ([...document.querySelectorAll('canvas')].some(c => { try { return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })) tech.push('webgl');
  if (document.querySelector('video')) tech.push('video');
  if (document.querySelector('svg')) tech.push('svg');
  if (document.querySelectorAll('svg').length > 20) tech.push('svg-heavy');
  if (w.__NEXT_DATA__ || document.getElementById('__next')) tech.push('next.js');
  if (w.Webflow) tech.push('webflow');
  if (document.querySelector('[data-framer-name],[data-framer-component-type]') || /framer/i.test(scripts)) tech.push('framer');
  if (/shopify/i.test(scripts)) tech.push('shopify');
  const gridEls = all.filter(el => getComputedStyle(el).display === 'grid').length;
  const flexEls = all.filter(el => getComputedStyle(el).display === 'flex').length;
  const imgs = document.images.length;
  const sorted = sizes.sort((a, b) => b - a);
  const fontList = [...fonts.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f).filter(f => !/^(-apple-system|system-ui|blinkmacsystemfont|sans-serif|serif|monospace|inherit|initial)$/i.test(f)).slice(0, 4);
  return {
    title: document.title.slice(0, 140),
    description: (document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || '').slice(0, 220),
    lang: root.lang || '',
    bg: hex(bodyBg), fg: hex(text), dark: lum(bodyBg) < .18,
    palette, accents,
    fonts: fontList,
    h1Font: h1cs ? fam(h1cs.fontFamily) : null,
    h1Size: h1cs ? px(h1cs.fontSize) : null,
    h1Weight: h1cs ? h1cs.fontWeight : null,
    h1Case: h1cs ? h1cs.textTransform : null,
    h1Tracking: h1cs ? h1cs.letterSpacing : null,
    maxFont: sorted[0] ?? 0, bodyFont: px(bodyCs.fontSize),
    feats, tech, gridEls, flexEls, imgs,
    pageHeight: Math.round(root.scrollHeight),
    textLen: body.innerText.length,
    colorSpread: palette.length,
  };
};

const ANIM = new Set(['gsap', 'lenis', 'locomotive-scroll', 'three.js', 'webgl']);
const redo = h => process.env.REDO && (process.env.REDO === 'all' || done[h]?.ok && (done[h].tech ?? []).some(t => ANIM.has(t)) || /^seed/.test(process.env.REDO) && candidates.find(c => c.host === h)?.sources.includes('seed'));
const todo = candidates.filter(c => !done[c.host] || (done[c.host].motion?.v !== 2 && redo(c.host))).slice(0, limit);
let n = 0;
async function worker(queue) {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', ignoreHTTPSErrors: true});
  await ctx.route('**/*', r => ['media', 'websocket'].includes(r.request().resourceType()) ? r.abort() : r.continue());
  while (queue.length) {
    const c = queue.shift();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__raf = 0;
      const o = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = cb => o(t => { window.__raf++; cb(t); });
    });
    try {
      const res = await page.goto(c.url, {waitUntil: 'domcontentloaded', timeout: 25000});
      await page.waitForLoadState('load', {timeout: 8000}).catch(() => {});
      await page.waitForTimeout(1800);
      const status = res?.status() ?? 0;
      if (status >= 400) throw new Error('http ' + status);
      await page.evaluate(() => window.scrollTo(0, 900)).catch(() => {});
      await page.waitForTimeout(500);
      const data = await page.evaluate(probe);
      // Motion: rAF callbacks per second, running CSS/Web animations, canvases covering the viewport.
      // Heavy WebGL scenes need time to boot; settle before sampling frames.
      await page.bringToFront().catch(() => {});
      const heavy = c.sources.includes('seed') || (data.tech ?? []).some(t => ANIM.has(t) || t === 'canvas');
      if (heavy) await page.waitForTimeout(Number(process.env.SETTLE ?? 5000));
      const r0 = await page.evaluate(() => window.__raf);
      await page.waitForTimeout(1000);
      const motion = await page.evaluate(r0 => {
        const vw = innerWidth, vh = innerHeight;
        const cv = [...document.querySelectorAll('canvas')].map(c => { const r = c.getBoundingClientRect(); return Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / (vw * vh); });
        return {rafPerSec: window.__raf - r0, running: document.getAnimations().filter(a => a.playState === 'running').length, canvasCoverage: Number(Math.max(0, ...cv).toFixed(2)), canvases: cv.length};
      }, r0).catch(() => ({rafPerSec: 0, running: 0, canvasCoverage: 0, canvases: 0}));
      // Scroll-linked motion: does a long scroll move sampled elements at different rates?
      const probeY = () => page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 80 && r.height > 40 && r.top > 0 && r.top < innerHeight; }).slice(0, 30).map(e => e.getBoundingClientRect().top));
      const y0 = await probeY();
      await page.mouse.wheel(0, 500); await page.waitForTimeout(900);
      const y1 = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 80 && r.height > 40; }).length);
      motion.scrollY = await page.evaluate(() => Math.round(scrollY));
      motion.smoothScrollLag = motion.scrollY > 0 && motion.scrollY < 480;
      motion.v = 2;
      if (heavy) { const d2 = await page.evaluate(probe).catch(() => null); if (d2 && d2.textLen > data.textLen) Object.assign(data, {textLen: d2.textLen, tech: d2.tech}); }
      done[c.host] = {ok: true, status, finalUrl: page.url(), ...data, motion};
    } catch (e) {
      done[c.host] = {ok: false, error: String(e.message).slice(0, 80)};
    }
    await page.close().catch(() => {});
    if (++n % 20 === 0) { await writeFile(outFile, JSON.stringify(done)); console.log(`${n}/${todo.length}`); }
  }
  await ctx.close();
}
await mkdir('.research/web', {recursive: true});
const queue = [...todo];
await Promise.all(Array.from({length: Number(process.env.WORKERS ?? 6)}, () => worker(queue)));
await writeFile(outFile, JSON.stringify(done));
await browser.close();
const ok = Object.values(done).filter(d => d.ok).length;
console.log(`analyzed ${Object.keys(done).length}, ok ${ok}`);
