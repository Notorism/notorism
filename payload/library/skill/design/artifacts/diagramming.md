# Artifact diagrams

A diagram earns space when it makes a relationship easier to understand than
prose. Show the mechanism relevant to the decision: data flow, boundaries,
component interactions, transitions, or an actual before-and-after difference.

Keep the claim focused. Label arrows with actions or data and include a caption.
Use a table for repeated attributes. Draw only the parts the decision turns on.
An inventory of unrelated boxes is not a flow, and two labeled options without
their changed relationships are not a meaningful comparison.

For small static diagrams, use native SVG shapes and text, a content-sized
`viewBox`, inherited `currentColor`, readable labels, and a meaningful accessible
name. Leave room for arrowheads and labels. Keep elaborate decorative graphics
out of the mechanism diagram. Do not add a visualization to a simple fact that
is already clear in a sentence.
