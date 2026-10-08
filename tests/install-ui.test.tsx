import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {render} from 'ink-testing-library';
import {InstallerApp} from '../src/install-ui.js';
import path from 'node:path';

test('Ink preview displays destinations and library counts without installation',async()=>{
  const app=render(<InstallerApp options={{home:path.resolve('.test-output/ui-home'),agents:['codex'],payload:path.resolve('payload')}} previewOnly/>);
  try {
    await new Promise(resolve=>setTimeout(resolve,100));
    const frame=app.lastFrame()!;
    assert.match(frame,/NOTORISM/);assert.match(frame,/330 visual references/);
    assert.match(frame,/no changes made/);
    assert.ok(frame.replace(/[\s│]/g,'').includes('notorism-design'), 'The complete skill folder remains visible across wrapped lines');
  } finally { app.unmount(); }
});

test('keyboard selection rejects an empty choice and reviews only the chosen agent',async()=>{
  const app=render(<InstallerApp options={{home:path.resolve('.test-output/ui-home'),agents:['codex'],payload:path.resolve('payload')}}/>);
  try {
    const settle=()=>new Promise(resolve=>setTimeout(resolve,80));
    await settle();app.stdin.write(' ');await settle();app.stdin.write('\r');await settle();
    assert.match(app.lastFrame()!,/Choose your agents/);
    app.stdin.write('\u001B[B');await settle();app.stdin.write(' ');await settle();app.stdin.write('\r');await settle();
    assert.match(app.lastFrame()!,/Your design library/);
    assert.match(app.lastFrame()!,/\.claude/);
    assert.doesNotMatch(app.lastFrame()!,/\.codex/);
  } finally { app.unmount(); }
});
