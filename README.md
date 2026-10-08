# Notorism

Notorism gives AI design work a real point of view.

[Explore the visual campaign](https://notorism.github.io/notorism/) ·
[Browse the source](https://github.com/Notorism/notorism)

It is a local design library and installer for people who want an agent to
make better websites, interfaces, and visual systems. You get 110 documented
design styles, 330 visual studies, practical design guidance, and a working
artifact process that keeps decisions visible from the first brief to the
final review.

## Install

You do not need to clone the repository to use Notorism:

```sh
npx -y notorism
```

The installer is interactive. Choose the agent you use, review the destination,
and confirm the installation. On Windows, the library is installed at:

```text
C:\Users\<your-name>\.notorism
```

To install without prompts:

```sh
npx -y notorism install --yes --agent codex
npx -y notorism install --yes --agent claude
npx -y notorism install --yes --agent both
```

The command installs the Notorism router for the selected agent and keeps the
full reference library in `.notorism`. Existing settings are backed up before
the installer adds its optional SessionStart integration.

## What you get

- 110 visual languages, from Swiss Design and Brutalism to WebGL, editorial
  layouts, motion systems, and texture techniques.
- Three original visual studies for every style, with editable HTML and local
  PNG references.
- Clear guidance for choosing a direction, writing interface copy, using
  images and icons, handling responsive behavior, and reviewing the result.
- An artifact-first workflow with a brief, reference observations, design
  decisions, desktop and mobile artboards, and review evidence.
- A SessionStart loader that makes the core protocol and design contracts
  available to the agent. The host still controls trust and execution.
- Apache-2.0 licensing for the Notorism code and library.

## How to use it

After installation, ask your agent for a design task in ordinary language:

```text
Create a landing page for Notorism using Swiss Design.
Use black, white, and blue. Keep the type precise, show the artifact plan,
and make the mobile version intentional.
```

For an existing project, point the agent at the repository and describe the
change you actually want. Notorism is designed to extend an existing visual
system instead of replacing it without permission.

When the task is a substantial visual change, the agent should create a local
artifact first. That artifact is the working design, not a decorative report.
It records the audience, direction, references, tokens, responsive decisions,
implementation, and the evidence used in review.

Useful commands after installation:

```sh
notorism doctor
notorism hooks status
notorism hooks preview
```

## SessionStart integration

Notorism can register a small local loader with Codex or Claude Code. It loads
the design protocol and contracts at session start so the agent can route to
the right local documents when a design task begins.

The loader does not read your conversation history, project files, secrets, or
images. It does not deploy anything, change permissions, or certify the quality
of a finished design. Review and trust the hook through the host interface
before relying on it.

## For contributors

The repository contains the installer source, payload builder, style studies,
tests, and the presentation site.

```sh
npm ci
npm run build
npm test
npm run check
npm run verify:browser
```

The presentation site is published to GitHub Pages by the **Verify and deploy**
workflow after checks pass on Windows and Linux. Changes pushed to `main`
update the site. Pull requests run checks without deploying.

## Publishing a release

The npm package contains the CLI and its reference library. The site, research
downloads, test output, and local credentials are excluded.

```sh
npm login
npm publish --access public
```

Publishing runs the build, installer tests, library verification and package
content check first. Approve the npm sign-in and any publishing verification
in your browser. GitHub Pages uses the workflow token, not an npm token.

Node.js 22 or newer is required. The package exposes the `notorism` command
through its `bin` entry, so the same command works through `npx` after the
package is published.

## License

Notorism is released under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE)
for attribution and source notes. The visual studies are original teaching
materials and are included under the same license.
