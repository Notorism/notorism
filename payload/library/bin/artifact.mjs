import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const digest = (data) => createHash('sha256').update(data).digest('hex');
const escape = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function json(file) { return JSON.parse(await readFile(file, 'utf8')); }
async function writeJson(file, data) { await writeFile(file, JSON.stringify(data, null, 2) + '\n'); }
function argument(args, name) { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; }
function meaningful(value, minimum = 15) {
    return typeof value === 'string' && value.trim().length >= minimum && !/^(todo|tbd|pending|replace me|describe here|fill in)\b/i.test(value.trim());
}
function contained(root, file) { const result = path.resolve(root, file); const relative = path.relative(root, result); if (relative.startsWith('..') || path.isAbsolute(relative))
    throw new Error('Artifact file paths must stay inside the artifact directory'); return result; }
async function noLinks(root, target) { let current = path.resolve(target); const boundary = path.resolve(root); for (;;) {
    const stats = await lstat(current).catch(() => undefined);
    if (stats?.isSymbolicLink())
        throw new Error(`Symbolic links are not allowed in artifacts: ${current}`);
    if (current === boundary)
        break;
    const parent = path.dirname(current);
    if (parent === current)
        throw new Error('Artifact boundary is invalid');
    current = parent;
} }
export async function validatePlanning(directory, library) {
    for (const name of ['brief.json', 'references.json', 'decisions.json'])
        await noLinks(directory, path.join(directory, name));
    const brief = await json(path.join(directory, 'brief.json'));
    const references = JSON.parse(await readFile(path.join(directory, 'references.json'), 'utf8'));
    const decisions = await json(path.join(directory, 'decisions.json'));
    const errors = [];
    for (const key of ['audience', 'objective', 'primaryTask', 'scope'])
        if (!meaningful(brief[key], key === 'audience' ? 8 : 15))
            errors.push(`brief.${key} needs a concrete description`);
    if (!Array.isArray(brief.content) || brief.content.length === 0 || brief.content.some((v) => !meaningful(v, 3)))
        errors.push('brief.content needs supplied or explicitly identified demonstration content');
    if (!Array.isArray(brief.constraints) || !Array.isArray(brief.assumptions))
        errors.push('brief constraints and assumptions must be arrays');
    const catalog = await json(path.join(library, 'catalog.json'));
    const style = catalog.styles.find((s) => s.slug === brief.style);
    if (!style)
        errors.push('brief.style must identify a catalog style');
    if (!Array.isArray(references) || references.length !== 3)
        errors.push('Exactly three visual reference analyses are required');
    else {
        const unique = new Set();
        for (const reference of references) {
            unique.add(reference.id);
            const example = style?.examples.find((e) => e.id === reference.id);
            if (!example) {
                errors.push('A reference does not belong to the selected style');
                continue;
            }
            if (path.resolve(reference.image ?? '') !== path.resolve(library, example.image))
                errors.push(`Reference image path changed: ${reference.id}`);
            const data = await readFile(path.join(library, example.image));
            if (digest(data) !== reference.sha256 || reference.sha256 !== example.sha256)
                errors.push(`Reference image integrity failed: ${reference.id}`);
            for (const key of ['observation', 'transfer', 'limitation'])
                if (!meaningful(reference[key]))
                    errors.push(`reference ${reference.id}.${key} needs visual analysis`);
        }
        if (unique.size !== 3)
            errors.push('The three references must be distinct');
    }
    for (const key of ['visualThesis', 'composition', 'responsiveBehavior', 'images', 'icons', 'motion', 'states', 'tradeoff'])
        if (!meaningful(decisions[key]))
            errors.push(`decisions.${key} needs a concrete decision`);
    const palette = decisions.palette;
    if (!palette || typeof palette !== 'object' || Array.isArray(palette) || Object.keys(palette).length < 4 || Object.keys(palette).length > 10)
        errors.push('Palette needs 4 to 10 named roles');
    else {
        for (const role of ['canvas', 'text', 'accent', 'surface'])
            if (!/^#[0-9a-f]{6}$/i.test(palette[role] ?? ''))
                errors.push(`Palette role ${role} needs a six-digit hex value`);
        if (Object.values(palette).some(value => typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)))
            errors.push('All palette values must be six-digit hex values');
    }
    for (const key of ['display', 'body', 'rationale'])
        if (!meaningful(decisions.typography?.[key], key === 'rationale' ? 15 : 3))
            errors.push(`typography.${key} needs a value`);
    if (errors.length)
        throw new Error('Planning is incomplete:\n' + errors.map(e => '  - ' + e).join('\n'));
    return { brief, references, decisions };
}
function portableDocument(html, name) {
    if (!/<!doctype html/i.test(html) || !/<html\b/i.test(html) || !/<title>[^<]+<\/title>/i.test(html))
        throw new Error(`${name} needs a complete named HTML document`);
    if (/data-notorism-scaffold/i.test(html))
        throw new Error(`${name} is still a scaffold`);
    if (/\b(?:src|srcset)\s*=\s*["'](?!data:|#)[^"']+["']/i.test(html) || /url\(\s*["']?(?!data:|#)[^\s)"']+/i.test(html) || /<link[^>]+rel=["']stylesheet/i.test(html))
        throw new Error(`${name} contains external or relative resources. Inline assets for the portable canvas.`);
}
function canvasDocument(brief, decisions, desktop, mobile) {
    const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; frame-src 'self' data: blob:; connect-src 'none'; media-src data:; base-uri 'none'; form-action 'none'";
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${escape(csp)}"><title>${escape(brief.name)}</title><style>*{box-sizing:border-box}body{margin:0;background:#dfe3dc;color:#23352b;font:14px/1.5 system-ui,sans-serif}.toolbar{position:sticky;top:0;z-index:5;display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:16px 24px;background:#23352b;color:#f1f3eb}.toolbar strong{margin-right:auto}.toolbar button{font:13px system-ui;padding:8px 12px;border:1px solid #7b9180;background:transparent;color:inherit;border-radius:4px;cursor:pointer}.toolbar button:focus-visible{outline:3px solid #d2b087;outline-offset:3px}.rationale{padding:25px;max-width:85ch}.rationale h1{font-size:28px;line-height:1.15}.swatches{display:flex;gap:14px;flex-wrap:wrap}.swatch{font:11px ui-monospace}.swatch i{display:block;width:55px;height:24px;border:1px solid #89998b;margin-bottom:5px}.viewport{overflow:auto;padding:25px}.stage{display:flex;gap:50px;align-items:start;width:max-content;transform-origin:top left}.board{margin:0}.board figcaption{font:12px ui-monospace;margin:0 0 12px}.board iframe{display:block;width:1440px;height:960px;border:0;background:white;box-shadow:0 15px 50px #23352b25}.board.mobile iframe{width:390px;height:844px}.focused .board{display:none}.focused .board.active{display:block}.notice{font-size:12px;color:#536957}@media print{.toolbar,.rationale{display:none}.viewport{padding:0;overflow:visible}.stage{display:block;transform:none!important;width:auto}.board{break-after:page}.board iframe{max-width:100%;box-shadow:none}.focused .board{display:block}}</style></head><body><header class="toolbar"><strong>NotorismDesign / ${escape(brief.name)}</strong><button id="zoom-out" aria-label="Zoom out">−</button><output id="zoom-value">75%</output><button id="zoom-in" aria-label="Zoom in">+</button><button id="compare">Compare</button><button id="desktop">Desktop</button><button id="mobile">Mobile</button><button id="print">Print / PDF</button></header><section class="rationale"><h1>${escape(brief.objective)}</h1><p>${escape(decisions.visualThesis)}</p><div class="swatches">${Object.entries(decisions.palette).map(([role, color]) => `<span class="swatch"><i style="background:${escape(String(color))}"></i>${escape(role)} / ${escape(String(color))}</span>`).join('')}</div><p>Composition: ${escape(decisions.composition)}</p><p>Responsive behavior: ${escape(decisions.responsiveBehavior)}</p><p class="notice">Local review canvas. Edit the working HTML sources and reassemble to revise. No cloud save or collaborative editor is implied.</p></section><div class="viewport"><div class="stage" id="stage" style="transform:scale(.75)"><figure class="board active" id="desktop-board"><figcaption>Desktop / 1440 × 960</figcaption><iframe title="Desktop design" sandbox="allow-scripts" srcdoc="${escape(desktop)}"></iframe></figure><figure class="board mobile" id="mobile-board"><figcaption>Mobile / 390 × 844</figcaption><iframe title="Mobile design" sandbox="allow-scripts" srcdoc="${escape(mobile)}"></iframe></figure></div></div><script>let zoom=.75;const stage=document.querySelector('#stage');function setZoom(value){zoom=Math.max(.25,Math.min(1.5,value));stage.style.transform='scale('+zoom+')';document.querySelector('#zoom-value').textContent=Math.round(zoom*100)+'%'}document.querySelector('#zoom-out').onclick=()=>setZoom(zoom-.1);document.querySelector('#zoom-in').onclick=()=>setZoom(zoom+.1);document.querySelector('#compare').onclick=()=>stage.classList.remove('focused');['desktop','mobile'].forEach(name=>document.querySelector('#'+name).onclick=()=>{stage.classList.add('focused');document.querySelectorAll('.board').forEach(b=>b.classList.toggle('active',b.id===name+'-board'));setZoom(name==='mobile'?1:.75)});document.querySelector('#print').onclick=()=>print();</script></body></html>`;
}
async function inputDigests(directory) { const files = ['brief.json', 'references.json', 'decisions.json', 'artboards/desktop.html', 'artboards/mobile.html']; const result = {}; for (const file of files) {
    const target = contained(directory, file);
    await noLinks(directory, target);
    result[file] = digest(await readFile(target));
} return result; }
export async function runArtifact(args, library = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')) {
    const command = args[0];
    if (command === 'init') {
        const project = path.resolve(argument(args, '--project') ?? process.cwd());
        const name = argument(args, '--name');
        const styleName = argument(args, '--style');
        if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 80)
            throw new Error('Use --name with a specific lowercase hyphenated name');
        const catalog = await json(path.join(library, 'catalog.json'));
        const style = catalog.styles.find((s) => s.slug === styleName || String(s.id) === styleName);
        if (!style)
            throw new Error('Use --style with an installed style slug or catalog number');
        const directory = contained(project, path.join('.notorism', 'artifacts', name));
        await noLinks(project, directory);
        await mkdir(directory, { recursive: true });
        // Exclusive writes preserve an existing artifact, even if initialization is repeated.
        const brief = await json(path.join(library, 'skill/design/artifacts/templates/brief.json'));
        brief.name = name;
        brief.style = style.slug;
        await writeFile(path.join(directory, 'brief.json'), JSON.stringify(brief, null, 2) + '\n', { flag: 'wx' });
        const references = style.examples.map((example) => ({ id: example.id, image: path.resolve(library, example.image), sha256: example.sha256, observation: '', transfer: '', limitation: '' }));
        await writeJson(path.join(directory, 'references.json'), references);
        for (const template of ['decisions.json', 'review.json'])
            await writeFile(path.join(directory, template), await readFile(path.join(library, 'skill/design/artifacts/templates', template)), { flag: 'wx' });
        await mkdir(path.join(directory, 'artboards'), { recursive: true });
        const scaffold = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Working artboard</title></head><body data-notorism-scaffold><h1>Design belongs here</h1><p>Complete planning, then replace this scaffold with the actual design.</p></body></html>\n';
        for (const size of ['desktop', 'mobile'])
            await writeFile(path.join(directory, 'artboards', size + '.html'), scaffold, { flag: 'wx' });
        await writeJson(path.join(directory, 'status.json'), { stage: 'scaffold', createdAt: new Date().toISOString() });
        return `Artifact initialized: ${directory}\nComplete planning and analyze the three PNG references before designing.`;
    }
    const directory = path.resolve(argument(args, '--directory') ?? '');
    if (!argument(args, '--directory'))
        throw new Error('Provide --directory for check, assemble, or finalize');
    await noLinks(directory, directory);
    const { brief, decisions } = await validatePlanning(directory, library);
    if (command === 'check')
        return 'Planning validated. This does not certify visual quality or prove image inspection.';
    if (command === 'assemble') {
        const desktop = await readFile(path.join(directory, 'artboards/desktop.html'), 'utf8');
        const mobile = await readFile(path.join(directory, 'artboards/mobile.html'), 'utf8');
        portableDocument(desktop, 'Desktop artboard');
        portableDocument(mobile, 'Mobile artboard');
        const html = canvasDocument(brief, decisions, desktop, mobile);
        await noLinks(directory, path.join(directory, 'canvas.html'));
        await noLinks(directory, path.join(directory, 'status.json'));
        await writeFile(path.join(directory, 'canvas.html'), html);
        await writeJson(path.join(directory, 'status.json'), { stage: 'assembled', assembledAt: new Date().toISOString(), inputs: await inputDigests(directory), canvasSha256: digest(html) });
        return `Canvas assembled: ${path.join(directory, 'canvas.html')}\nInspect wide and narrow views, capture screenshots, and complete review.json.`;
    }
    if (command === 'finalize') {
        await noLinks(directory, path.join(directory, 'status.json'));
        await noLinks(directory, path.join(directory, 'review.json'));
        await noLinks(directory, path.join(directory, 'canvas.html'));
        const state = await json(path.join(directory, 'status.json'));
        const current = await inputDigests(directory);
        if (!state.inputs || JSON.stringify(state.inputs) !== JSON.stringify(current))
            throw new Error('Inputs changed or the canvas was never assembled. Reassemble before finalizing.');
        if (digest(await readFile(path.join(directory, 'canvas.html'))) !== state.canvasSha256)
            throw new Error('Canvas changed after assembly. Reassemble from working sources.');
        const review = await json(path.join(directory, 'review.json'));
        if (!Array.isArray(review.viewports) || !review.viewports.some((v) => v.width <= 500) || !review.viewports.some((v) => v.width >= 1024))
            throw new Error('Review needs wide and narrow viewport evidence');
        for (const viewport of review.viewports) {
            if (!Number.isInteger(viewport.width) || !meaningful(viewport.observations) || typeof viewport.screenshot !== 'string' || !viewport.screenshot)
                throw new Error('Every viewport needs dimensions, a screenshot, and concrete observations');
            const filename = contained(directory, viewport.screenshot);
            await noLinks(directory, filename);
            const data = await readFile(filename);
            if (data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || data.readUInt32BE(16) !== viewport.width)
                throw new Error('Screenshot must be a PNG matching the recorded viewport width');
        }
        for (const key of ['primaryInteraction', 'keyboard', 'copy'])
            if (!meaningful(review[key]))
                throw new Error(`Review ${key} needs concrete findings`);
        if (!Array.isArray(review.limitations))
            throw new Error('Review limitations must be an array');
        await writeJson(path.join(directory, 'status.json'), { ...state, stage: 'complete', completedAt: new Date().toISOString(), reviewSha256: digest(await readFile(path.join(directory, 'review.json'))) });
        return `Artifact complete: ${path.join(directory, 'canvas.html')}\nRecorded checks validate evidence files and input integrity; they do not certify taste or WCAG conformance.`;
    }
    throw new Error('Artifact commands: init, check, assemble, finalize');
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
    runArtifact(process.argv.slice(2)).then(result => console.log(result)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
