# Responsive behavior and accessibility

Treat access as part of the selected style. Follow relevant WCAG 2.2 criteria
and the product’s platform conventions. A checklist or screenshot alone cannot
certify WCAG conformance.

Use semantic headings, links for navigation, and buttons for actions. Associate
labels with controls. Make errors readable and tied to the relevant field.
Keyboard users need a logical order, visible focus, reachable actions, and a
way to leave overlays. Do not suppress native outlines without a replacement.

Normal-size text generally needs at least 4.5:1 contrast; large text generally
needs 3:1. Necessary non-text control boundaries and state cues generally need
3:1 against adjacent colors. Measure actual pairings, including translucent
materials over their worst-case backgrounds. Do not treat a sample palette as
prevalidated. Status requires text or shape in addition to color.

WCAG 2.2’s minimum target criterion generally uses 24 by 24 CSS pixels with
documented exceptions. Prefer larger comfortable targets, often around 44px,
when the task and platform permit. This recommendation is not a claim that
44px is the universal WCAG AA requirement.

Test narrow and wide viewports with real content. Use flexible tracks and
content-driven height. Stack relationships deliberately rather than shrinking
everything. Preserve meaningful document order when grids break or items vary
in height. Contain genuinely wide tables or code in their own scrolling area.
The body should not acquire accidental horizontal scrolling.

Support text zoom and long labels. Supply text alternatives to meaningful
imagery and charts. Reduced motion should preserve functionality and complete
content. Decorative 3D needs a static fallback, and essential data needs an
ordinary accessible representation.
