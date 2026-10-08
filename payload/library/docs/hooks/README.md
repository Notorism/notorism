# SessionStart hooks

NotorismDesign 1.0.0 includes a native session-start integration for Codex and
Claude Code. The installer registers the hook for the selected agents while
preserving unrelated settings and hook handlers. Changed files receive backups
and participate in installation rollback.

## What startup loads

The loader reads `modules/registry.json`, verifies its listed files against the
installed integrity manifest, and injects the actual core agent protocol plus
all six design contracts from `contracts/`. It registers the other fifteen
modules as explicit on-demand routes. Their bytes are checked at startup, but
their full text is not injected until the agent reads the relevant document.
The 110 style guides and 330 images remain task-specific resources.

The output uses `hookSpecificOutput.hookEventName: SessionStart` and
`hookSpecificOutput.additionalContext`. It stays below 9,500 characters for
portable delivery. Codex's handler also requests untruncated additional context.
This keeps the router short while making the protocol and contracts available
before the first design request and after compaction.

## Registration and trust

- Codex configuration: `~/.codex/hooks.json`.
- Claude Code configuration: `~/.claude/settings.json`.
- Codex events: `startup`, `resume`, `clear`, and `compact`.
- Claude Code also supports `fork`.

Codex requires review and trust for non-managed hooks. Open `/hooks` in the
Codex CLI, inspect the NotorismDesign definition, trust it, and start a new
session. Installation does not bypass trust, alter policy-managed settings,
or claim that a running session already received context. Hook definitions
include the current library fingerprint, so a changed installation may require
another review. If an administrator disabled hooks, contact the administrator.

The integration targets supported local runtimes. Local command hooks do not
run in cloud-orchestrated Work sessions merely because tools execute locally.
Host support, enabled features, and trust remain real prerequisites.

## Inspect and test

```sh
npm start -- hooks status
npm start -- hooks preview
npm start -- hooks preview --json
```

The preview validates the installed modules and contracts and returns the same
context envelope as the native hook. It does not change host trust or start a
new agent session. Registration status distinguishes configured hooks from
actual execution; it cannot determine trust from a JSON settings file.

## Runtime behavior

The hook is read-only. It does not inspect conversation transcripts, project
files, credentials, environment secrets, or all reference images. It does not
make network requests, install dependencies, launch a design, or modify agent
permissions. It validates the event shape and reads only the declared library
files. Missing modules, changed bytes, invalid contracts, or a stale fingerprint
produce an explicit hook error instead of claiming successful loading.

On Windows, Codex uses a readable inline PowerShell command registered through
`commandWindows`, without changing execution policy or encoding its source.
Claude Code uses its native executable-and-arguments form.
Both use the Node executable that ran the installer. Keep that runtime available;
if its location changes, rerun installation with the new runtime.

Scope and authority contracts apply to design work. Session-start delivery is
not permission to take over unrelated requests or override user authority.

## Official implementation references

- [OpenAI, Hooks](https://learn.chatgpt.com/docs/hooks): configuration layers,
  SessionStart output, startup sources, Windows commands, and trust review.
- [Anthropic, Hooks reference](https://code.claude.com/docs/en/hooks): settings,
  SessionStart sources, executable arguments, and additional context.

These sources describe host behavior. NotorismDesign owns its original loader,
registry, contracts, and documentation under Apache-2.0.
