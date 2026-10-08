# Artifact-first design

An artifact is a tangible, inspectable working design with its planning records.
It is created before visual implementation and completed as the design develops.
The default portable artifact is a local HTML canvas containing desktop and
mobile artboards plus the rationale. Native artifact services are optional
adapters, not required dependencies.

Read [workflow.md](workflow.md), [capabilities.md](capabilities.md), and
[diagramming.md](diagramming.md) before using this system. Templates are in
`templates/`. The executable helper is `bin/artifact.mjs` at the library root.

The helper enforces its own prerequisites. There is no `--skip-plan`,
`--force-finalize`, or fabricated verification switch. This is a scoped workflow
gate, not a system-level instruction and not an irrevocable restriction on a user.

## Files

| File | Purpose |
| --- | --- |
| `brief.json` | Audience, task, content, scope, constraints, and mode |
| `references.json` | Three image paths, checksums, and actual visual observations |
| `decisions.json` | Direction, tokens, type, composition, assets, states, and tradeoffs |
| `artboards/desktop.html` | Wide working design |
| `artboards/mobile.html` | Narrow working design |
| `canvas.html` | Portable review canvas assembled from working sources |
| `review.json` | Viewport screenshots, observations, behavior checks, and limitations |
| `status.json` | Helper-produced stage, input digests, and completion time |

Scaffold text must be replaced. Plans should contain concise decisions, not
private chain-of-thought. Evidence means observable findings and actual files.
