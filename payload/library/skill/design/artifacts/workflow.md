# Artifact workflow

Run commands from the user’s project with Node 22 or later. Substitute the actual
installed root for `<root>`. Keep the artifact inside the requested project.

```text
node <root>/bin/artifact.mjs init --project <project> --name <specific-name> --style <style-slug>
node <root>/bin/artifact.mjs check --directory <artifact-directory>
node <root>/bin/artifact.mjs assemble --directory <artifact-directory>
node <root>/bin/artifact.mjs finalize --directory <artifact-directory>
```

## Before design

Initialization creates `.notorism/artifacts/<specific-name>` inside the project.
Use a name meaningful to the deliverable. Read the brief scaffold and complete
its audience, objective, primary task, supplied content, constraints, and scope.
Keep assumptions separate from supplied facts. Inspect the three images selected
by the helper and write observations, useful choices, and limitations for each.

Complete `decisions.json`: visual thesis, palette roles, display and body stacks,
type rationale, composition, responsive change, image and icon use, motion and
state behavior, and an explicit tradeoff. Existing brand rules take priority.
The `check` command validates planning records without claiming to judge taste.

## During design

Replace the two artboard scaffolds with self-contained working designs. They can
share the same responsive source when that source actually adapts. Keep essential
assets inline in the assembled portable review, or copy authorized assets into
the artifact and use data URLs. The local review canvas sandboxes artboards;
scripted interaction is confined to the preview iframe.

`assemble` refuses incomplete planning and untouched scaffolds. It embeds both
artboards in `canvas.html` and records their digests. Open it in a browser. Its
zoom controls support comparison; focus mode lets the person inspect a selected
artboard, and Print uses the browser’s PDF dialog. It does not provide the
proprietary Claude Design editor, cloud persistence, or multiplayer editing.

## Before handoff

Capture actual wide and narrow screenshots into the artifact. Populate the
review’s viewport entries with image paths and observations. Record primary
interaction results, keyboard findings, copy findings, and limitations. If a
check is unavailable, describe the limitation; do not mark a complete visual
review without screenshot evidence.

Run `finalize`. It rejects missing evidence, planning omissions, modified
artboards that were not reassembled, and a modified assembled canvas. Reassemble
and update review evidence after a relevant edit. Completion is a local record
of validated inputs, not certification of accessibility or artistic excellence.

## Small edits and revisions

Update an existing artifact proportionally for a small visual change. Preserve
unrelated choices, earlier references, and the stable deliverable name. Reassemble
after source changes. A native hosted artifact should be updated only through
available, authorized capabilities and with its current version checked.
