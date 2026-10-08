// SPDX-License-Identifier: Apache-2.0
import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
const hash = (data) => createHash('sha256').update(data).digest('hex');
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
async function trustedFile(root, relative, manifest) {
    if (!relative || relative.includes('\\') || relative.split('/').some(part => part === '..' || part === '.' || !part) || path.isAbsolute(relative))
        throw new Error('Invalid module path');
    const target = path.resolve(root, relative), within = path.relative(root, target);
    if (within.startsWith('..') || path.isAbsolute(within))
        throw new Error('Module path leaves the library');
    let current = target;
    for (;;) {
        if ((await lstat(current)).isSymbolicLink())
            throw new Error('Module paths must not use symbolic links');
        const parent = path.dirname(current);
        if (parent === current)
            break;
        current = parent;
    }
    const entry = manifest.files.find(file => file.path === relative);
    if (!entry)
        throw new Error(`Module is missing from the integrity manifest: ${relative}`);
    const data = await readFile(target);
    if (data.length !== entry.size || hash(data) !== entry.sha256)
        throw new Error(`Module integrity failed: ${relative}`);
    return data.toString('utf8');
}
export async function buildSessionContext(libraryRoot, expectedManifestSha256) {
    const root = path.resolve(libraryRoot);
    const manifestFile = path.join(root, 'manifest.json');
    let current = manifestFile;
    for (;;) {
        if ((await lstat(current)).isSymbolicLink())
            throw new Error('Library paths must not use symbolic links');
        const parent = path.dirname(current);
        if (parent === current)
            break;
        current = parent;
    }
    const raw = await readFile(manifestFile);
    if (expectedManifestSha256 && (!/^[a-f0-9]{64}$/.test(expectedManifestSha256) || hash(raw) !== expectedManifestSha256))
        throw new Error('Library changed since hook registration. Reinstall to register the current fingerprint.');
    const manifest = JSON.parse(raw.toString('utf8'));
    if (manifest.schemaVersion !== 1 || manifest.version !== '1.0.0' || manifest.license !== 'Apache-2.0' || !Array.isArray(manifest.files))
        throw new Error('Unsupported NotorismDesign library manifest');
    await trustedFile(root, 'bin/notorism-session-start.mjs', manifest);
    const registry = JSON.parse(await trustedFile(root, 'modules/registry.json', manifest));
    if (registry.schemaVersion !== 1 || registry.version !== '1.0.0' || registry.language !== 'en' || !Array.isArray(registry.modules) || !Array.isArray(registry.contracts))
        throw new Error('Invalid module registry');
    const sections = [
        '# NotorismDesign 1.0.0 session context',
        'Apply this guidance when creating or substantially changing a design. Ordinary non-design tasks stay in their requested scope. Respect higher-priority instructions, user authority, and permission boundaries.',
        `Library root: ${root.split(path.sep).join('/')}. All relative module paths below resolve inside this root.`,
        '## Loaded core modules',
    ];
    const identifiers = new Set();
    const conditional = [];
    for (const module of registry.modules) {
        if (!isObject(module) || typeof module.id !== 'string' || typeof module.path !== 'string' || typeof module.purpose !== 'string' || !['session-start', 'on-demand'].includes(module.load))
            throw new Error('Invalid module definition');
        if (identifiers.has(module.id))
            throw new Error('Duplicate module ID');
        identifiers.add(module.id);
        const content = await trustedFile(root, module.path, manifest);
        if (module.load === 'session-start')
            sections.push(`### ${module.id}\n${content.trim()}`);
        else
            conditional.push(`- ${module.id}: ${module.path}. ${module.purpose}`);
    }
    if (!registry.modules.some(module => module.id === 'agent-protocol' && module.load === 'session-start'))
        throw new Error('The core agent protocol is required');
    sections.push('## Loaded design contracts');
    const contractIds = new Set();
    for (const filename of registry.contracts) {
        const contract = JSON.parse(await trustedFile(root, filename, manifest));
        if (contract.schemaVersion !== 1 || !contract.id || typeof contract.appliesTo !== 'string' || !Array.isArray(contract.rules) || !contract.rules.length || contract.rules.some(rule => typeof rule !== 'string' || !rule.trim()))
            throw new Error('Invalid design contract');
        if (contractIds.has(contract.id))
            throw new Error('Duplicate contract ID');
        contractIds.add(contract.id);
        sections.push(`### ${contract.id}\nApplies to: ${contract.appliesTo}\n${contract.rules.map(rule => `- ${rule}`).join('\n')}`);
    }
    for (const id of ['scope-contract', 'artifact-contract', 'visual-direction-contract', 'copy-contract', 'assets-contract', 'review-contract'])
        if (!contractIds.has(id))
            throw new Error(`Required design contract is missing: ${id}`);
    sections.push('## Registered on-demand modules', conditional.join('\n'), 'Before visual implementation, follow the artifact workflow and art-direction modules, choose the appropriate style, then inspect its three actual PNG references. Load conditional modules when their named concern is relevant. Do not claim that registered modules have already been injected or that reference images were inspected at startup.', 'Startup validated module bytes and loaded the core protocol and contracts. It did not read the conversation transcript, project files, secrets, or the 330 image references. It did not create an artifact, change permissions, or certify a finished design.');
    const context = sections.join('\n\n');
    if (context.length > 9500)
        throw new Error('Startup context exceeds the portable budget. Keep conditional detail in on-demand modules.');
    return context;
}
export async function sessionStartOutput(input, root, expectedManifestSha256) {
    if (!isObject(input) || input.hook_event_name !== 'SessionStart' || typeof input.source !== 'string' || !['startup', 'resume', 'clear', 'compact', 'fork'].includes(input.source))
        throw new Error('Expected a supported SessionStart event');
    return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: await buildSessionContext(root, expectedManifestSha256) } };
}
async function main() {
    const args = process.argv.slice(2), value = (name) => args[args.indexOf(name) + 1];
    if (!args.includes('--root') || !args.includes('--manifest-sha256'))
        throw new Error('The hook requires --root and --manifest-sha256');
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
        const data = Buffer.from(chunk);
        size += data.length;
        if (size > 1048576)
            throw new Error('Hook input exceeds 1 MiB');
        chunks.push(data);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, ''));
    process.stdout.write(JSON.stringify(await sessionStartOutput(input, value('--root'), value('--manifest-sha256'))) + '\n');
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href) {
    main().catch(error => { process.stderr.write(`NotorismDesign SessionStart: ${error.message}\n`); process.exitCode = 1; });
}
