import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this check with npm run pack:check.');

const execute = promisify(execFile);
const { stdout } = await execute(process.execPath, [
  npmCli, 'pack', '--dry-run', '--json', '--ignore-scripts'
], { maxBuffer: 5 * 1024 * 1024 });
const [archive] = JSON.parse(stdout);
const files = new Set(archive.files.map((file) => file.path));
const rootFiles = new Set(['package.json', 'README.md', 'LICENSE', 'NOTICE', 'install.cmd']);

assert.equal(archive.name, 'notorism');
assert.equal(archive.version, '1.0.0');
for (const file of files) {
  assert.ok(rootFiles.has(file) || file.startsWith('dist/') || file.startsWith('payload/'),
    'Unexpected published file: ' + file);
}
for (const file of ['dist/cli.js', 'payload/skill/SKILL.md', 'payload/library/manifest.json']) {
  assert.ok(files.has(file), 'Required published file missing: ' + file);
}
const manifest = JSON.parse(await readFile('payload/library/manifest.json', 'utf8'));
for (const file of manifest.files) {
  assert.ok(files.has('payload/library/' + file.path), 'Library file missing: ' + file.path);
}
assert.equal([...files].filter((file) => file.endsWith('.png')).length, 330);
assert.ok((await readFile('dist/cli.js', 'utf8')).startsWith('#!/usr/bin/env node'));
console.log('Verified notorism@1.0.0: ' + archive.entryCount + ' files, ' +
  (archive.size / 1024 / 1024).toFixed(2) + ' MB compressed. Installer and skill only.');
