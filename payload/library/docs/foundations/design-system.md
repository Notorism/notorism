# Design systems

Inspect the real theme, component source, font files, icons, and neighboring
screens. Resolve semantic aliases to actual values when matching an existing
product. Preserve nonstandard values when they are intentional. Do not replace
a 5px spacing value with 4px merely because a framework prefers it.

Establish roles for color, spacing, type, radius, border, shadow, and motion.
Use semantic names where the role matters: `text-primary`, `surface-raised`,
`status-critical`. A status hue has meaning independent of the brand accent.
Document state behavior for focus, hover, press, disabled, pending, error,
empty, and success where those states exist.

Make repeated units consistent in anatomy, alignment, and action placement.
Variation must correspond to different functions. Border, fill, radius, and
shadow all suggest separateness; avoid applying all four to every region.
Group related information with spacing before adding a new container.

Support both themes when required by the product. Define all tokens in the base
theme, respect explicit theme choices over system preferences, and give the body
an explicit background. A deliberate single-theme art direction is acceptable
when the brief supports it. Do not invert colors mechanically.

Extract reusable components when repetition, state, or a stable API makes it
useful. Prefer clear local code over speculative abstraction. Clean Code informs
maintainability; it does not choose visual style or excuse incomplete interactions.
