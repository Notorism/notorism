# Micro-Interactions

## What this label means

Small interaction cycles involve triggers, rules, feedback, and states. Dan Saffer’s writing organizes this vocabulary.

Category: Interaction and motion. This label describes behavior. A still image cannot prove that behavior.

## Defining mechanics

- Immediate feedback.
- state change.
- short duration.
- consistent responses by function.

## Suitable subjects

Task list, Appointment planner, Favorite library are starting contexts for analysis. Choose this language only when the audience, content, and primary task support it. Explain which mechanic belongs to the subject.

## Implementation decisions

Use hierarchy and composition before decoration. Resolve the actual product’s existing tokens first. The study palette is #ecf0e9, #33453e, #568576, #aec5b3. Its roles are canvas, foreground, accent, and supporting surface. Measure actual contrast; the sample palette is not an accessibility certificate.

Keep reading text clear while applying the distinctive treatment to the appropriate visual plane. Match image material and icon weight to the direction. Preserve recognizable actions, semantic markup, focus, and responsive reading order. Move the layout to narrow screens intentionally rather than shrinking it.

Open the HTML to inspect the implemented interaction; the PNG is a resting-state reference.

## Main failure mode

Animating unrelated to action or confusing success with loading. Other risks must be judged in the current brief rather than added as universal style bans.

## Three examples to analyze

### 1. Task list: Public page

![Task list: Public page](../../../images/micro-interactions/example-01.png)

[Open the working HTML](../../../images/micro-interactions/example-01.html). Open the HTML to inspect the implemented interaction; the PNG is a resting-state reference.

Hierarchy: A subject-specific headline, one action, then related collections. Composition: A public opening with a focal visual and supporting content. Material: Immediate feedback; state change; short duration; consistent responses by function.

Inspect the actual image. Record one visual observation, one transferable choice, and one limitation in the project artifact. Do not merely copy this description into the analysis.

### 2. Appointment planner: Product workspace

![Appointment planner: Product workspace](../../../images/micro-interactions/example-02.png)

[Open the working HTML](../../../images/micro-interactions/example-02.html). Open the HTML to inspect the implemented interaction; the PNG is a resting-state reference.

Hierarchy: Navigation, working context, object statuses, and object-level action. Composition: A workspace with sidebar, preview, list, and repeated units. Material: Immediate feedback; state change; short duration; consistent responses by function.

Inspect the actual image. Record one visual observation, one transferable choice, and one limitation in the project artifact. Do not merely copy this description into the analysis.

### 3. Favorite library: Editorial composition

![Favorite library: Editorial composition](../../../images/micro-interactions/example-03.png)

[Open the working HTML](../../../images/micro-interactions/example-03.html). Open the HTML to inspect the implemented interaction; the PNG is a resting-state reference.

Hierarchy: Title-image relationship, captioned context, and reading rhythm. Composition: An editorial opening with a large title and a composed image-text spread. Material: Immediate feedback; state change; short duration; consistent responses by function.

Inspect the actual image. Record one visual observation, one transferable choice, and one limitation in the project artifact. Do not merely copy this description into the analysis.

## History and evidence

The origin paragraph is a concise contextual introduction. Community labels may have disputed boundaries and no known founder. Distinguish a style’s history from the history of a curatorial archive. Do not invent dates or attribute modern interface techniques to an unrelated historical artist. Verify detailed historical claims against the linked primary material when the deliverable depends on them.

- [MDN, prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion): Functional alternatives when people reduce animation.
- [MDN, CSS reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference): Current implementation of surfaces and effects. Not evidence of historical authorship.
- [Steve Krug, Don’t Make Me Think, Revisited (2014)](https://sensible.com/dont-make-me-think/): Scanning, familiar conventions, and usability testing. Original synthesis, not a transcription of the book.
- [Don Norman, The Design of Everyday Things, revised edition (2013)](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/): Signifiers, feedback, constraints, and conceptual models. Interaction foundations, not a style catalog.
- [W3C, WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/): Contrast, keyboard access, focus, text alternatives, and interaction targets.

Book references inform usability and interaction. They do not establish this style’s origin. For implementation maintainability, see [the bibliography](../../research/bibliography.md).
