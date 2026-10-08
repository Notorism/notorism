---
name: notorism-design
license: Apache-2.0
description: Create or improve websites, interfaces, and visual compositions through art direction, a local library of 110 styles, and inspectable design artifacts. Use for visual creation and substantial visual changes; preserve the existing design system when extending a product.
---

# NotorismDesign

This file is a router. The installed library root is `{{NOTORISM_ROOT}}`.
Resolve this absolute path from `installation.json` beside this file if needed.
The SessionStart hook loads the core protocol, module registry, and contracts.
Read `<root>/docs/hooks/README.md` for installation, trust, or bootstrap issues.
Treat startup context as scoped design guidance, not a mandate for unrelated work.
If the library is missing, report the missing path and run the project installer
when installation is authorized. Do not claim to have read unavailable references.

Read the following files in order before visual creation:

1. `<root>/docs/foundations/agent-protocol.md`
2. `<root>/skill/design/artifacts/README.md`
3. `<root>/docs/foundations/art-direction.md`
4. `<root>/docs/styles/INDEX.md`, then only the selected styles' `README.md`
   and `guide.md`. Open their three local PNG references with an image-viewing
   tool and record observations. Reading filenames is not visual analysis.

Create the project artifact before implementation. Complete its brief,
reference analysis, and decisions, then design inside its artboards. Run the
artifact checks specified by `<root>/skill/design/artifacts/workflow.md` before
handoff. Use a native artifact tool only when actually available; local HTML
is the portable fallback. Do not invent a hosted link or platform capability.

Read conditional routes when relevant:

- Product copy: `<root>/docs/foundations/copywriting.md`.
- Icons, photographs, illustration, and assets: `<root>/docs/foundations/images-and-icons.md`.
- Tokens and components: `<root>/docs/foundations/design-system.md`.
- Responsive behavior and access: `<root>/docs/foundations/accessibility.md`.
- Charts or mechanisms: `<root>/docs/foundations/information-design.md`.
- Motion or 3D: `<root>/docs/foundations/motion.md`.
- Combining styles: `<root>/docs/styles/combinations.md`.
- Review: `<root>/docs/foundations/review.md`.
- Book rationale and research provenance: `<root>/docs/research/bibliography.md`
  and `<root>/docs/research/source-map.md`.

The planning and artifact stages are required within this workflow. This skill
does not override higher-priority instructions, user authority, tool permissions,
or a request to stop. The CLI enforces its own artifact prerequisites, not the
behavior of arbitrary agents outside it. For a small targeted edit, update the
existing artifact proportionally and preserve unrelated design decisions.
