import { paintPatterns } from './patterns.js';

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const narrowViewport = window.matchMedia('(max-width: 760px)');
const scenes = [...document.querySelectorAll('[data-scene]')];
const activeScenes = new Set();
const status = document.querySelector('#copy-status');
const freezeButton = document.querySelector('#freeze');
const matrix = document.querySelector('#pattern-matrix');
let seed = 619;
let frozen = false;
let pendingFrame = 0;

paintPatterns(document, seed);
document.documentElement.classList.add('effects-ready');

function sceneProgress(scene) {
  const track = scene.parentElement.classList.contains('scroll-track') ? scene.parentElement : scene;
  const box = track.getBoundingClientRect();
  return Math.max(0, Math.min(1, (window.innerHeight - box.top) / (box.height + window.innerHeight)));
}

function renderScroll() {
  pendingFrame = 0;
  if (document.hidden || frozen || motionPreference.matches) return;
  for (const scene of activeScenes) {
    const progress = sceneProgress(scene);
    scene.style.setProperty('--progress', progress.toFixed(4));
    scene.style.setProperty('--phase', ((progress - .5) * 36).toFixed(2) + 'deg');
    scene.querySelectorAll('[data-parallax]').forEach((element) => {
      const amplitude = narrowViewport.matches ? 0 : Number(element.dataset.parallax);
      element.style.setProperty('--parallax', ((progress - .5) * amplitude * 2).toFixed(2) + 'px');
    });
    const print = scene.querySelector('.print-pass');
    if (print) {
      const start = 18 + progress * 18;
      print.style.clipPath = 'polygon(0 ' + start + '%,100% ' + start + '%,100% ' + (start + 3.5) + '%,0 ' + (start + 3.5) + '%,0 65%,100% 65%,100% 67%,0 67%)';
    }
  }
}

function requestRender() {
  if (!pendingFrame && !frozen && !motionPreference.matches && !document.hidden) {
    pendingFrame = window.requestAnimationFrame(renderScroll);
  }
}

function updateMotionPreference() {
  const reduced = motionPreference.matches;
  freezeButton.disabled = reduced;
  freezeButton.textContent = reduced ? 'Motion reduced' : frozen ? 'Resume motion ↗' : 'Freeze motion Ⅱ';
  if (reduced) {
    for (const scene of scenes) {
      scene.style.setProperty('--phase', '0deg');
      scene.querySelectorAll('[data-parallax]').forEach((element) => element.style.setProperty('--parallax', '0px'));
    }
  } else requestRender();
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) activeScenes.add(entry.target);
      else activeScenes.delete(entry.target);
    }
    requestRender();
  }, { rootMargin: '80px' });
  scenes.forEach((scene) => observer.observe(scene));
} else scenes.forEach((scene) => activeScenes.add(scene));

window.addEventListener('scroll', requestRender, { passive: true });
window.addEventListener('resize', requestRender, { passive: true });
document.addEventListener('visibilitychange', requestRender);
motionPreference.addEventListener('change', updateMotionPreference);
narrowViewport.addEventListener('change', requestRender);

matrix.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch' || frozen || motionPreference.matches) return;
  const box = matrix.getBoundingClientRect();
  const phase = ((event.clientX - box.left) / box.width - .5) * 18;
  matrix.style.setProperty('--phase', phase.toFixed(2) + 'deg');
});
matrix.addEventListener('pointerleave', () => matrix.style.removeProperty('--phase'));

document.querySelector('#rearrange').addEventListener('click', () => {
  seed = (seed + 137) % 10000;
  document.querySelector('#seed-label').textContent = String(seed).padStart(4, '0');
  paintPatterns(matrix, seed);
  status.textContent = 'Arrangement changed. Seed ' + seed + '.';
});

freezeButton.addEventListener('click', () => {
  frozen = !frozen;
  freezeButton.setAttribute('aria-pressed', String(frozen));
  if (frozen && pendingFrame) {
    window.cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
  }
  updateMotionPreference();
});

document.querySelectorAll('[data-copy]').forEach((button) => {
  let resetTimer;
  button.addEventListener('click', async () => {
    const label = button.querySelector('.copy-label');
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      label.textContent = 'COPIED ✓';
      status.textContent = 'Installation command copied.';
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => { label.textContent = 'COPY ↗'; }, 2400);
    } catch {
      const command = button.querySelector('code');
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(command);
      selection.removeAllRanges();
      selection.addRange(range);
      label.textContent = 'SELECTED';
      status.textContent = 'Copy is unavailable here. The installation command is selected for manual copying.';
    }
  });
});

updateMotionPreference();
requestRender();
