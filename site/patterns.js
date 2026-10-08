/**
 * Deterministic print geometry. Image treatments are prepared separately.
 * Every generated mark uses the element's currentColor and existing paper plane.
 */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function patternMarkup(kind, seed) {
  const random = seededRandom(seed);
  const rotation = Math.floor(random() * 4) * 90;
  const center = 100;
  let marks = '';

  if (kind === 'rays') {
    const count = 48 + Math.floor(random() * 3) * 8;
    const inner = 22 + random() * 10;
    for (let index = 0; index < count; index++) {
      const angle = index * Math.PI * 2 / count;
      const x1 = center + Math.cos(angle) * inner;
      const y1 = center + Math.sin(angle) * inner;
      const x2 = center + Math.cos(angle) * 93;
      const y2 = center + Math.sin(angle) * 93;
      marks += '<path d="M' + x1.toFixed(2) + ' ' + y1.toFixed(2) + 'L' + x2.toFixed(2) + ' ' + y2.toFixed(2) + '"/>';
    }
    marks += '<circle cx="100" cy="100" r="' + inner.toFixed(2) + '" fill="currentColor" stroke="none"/>';
  } else {
    const spacing = kind === 'half' ? 5.5 : 4.1;
    const y = kind === 'half' ? 195 : 100;
    for (let radius = 5; radius <= 137; radius += spacing) {
      marks += '<circle cx="100" cy="' + y + '" r="' + radius.toFixed(2) + '"/>';
    }
    if (kind === 'half') marks += '<path d="M0 100H200V200H0Z" fill="currentColor" stroke="none" opacity=".08"/>';
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">' +
    '<g transform="rotate(' + rotation + ' 100 100)"><g class="pattern-turn" fill="none" stroke="currentColor" stroke-width="' +
    (kind === 'rays' ? '1.2' : '1.3') + '">' + marks + '</g></g></svg>';
}

export function paintPatterns(root, seed) {
  root.querySelectorAll('[data-pattern]').forEach((element, index) => {
    element.innerHTML = patternMarkup(element.dataset.pattern, seed + index * 149);
  });
}
