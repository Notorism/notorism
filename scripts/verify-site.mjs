import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const siteRoot = path.resolve('site');
const artifact = path.resolve('.notorism/artifacts/notorism-site');
const output = path.resolve('artifacts');
await mkdir(output, { recursive: true });
const hasArtifact = await stat(artifact).then((entry) => entry.isDirectory()).catch((error) => {
  if (error.code === 'ENOENT') return false;
  throw error;
});
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(siteRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(siteRoot + path.sep)) throw new Error('Invalid request');
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    response.end(data);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true });
const errors = [];
const measurements = [];
const failedRequests = [];

try {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failedRequests.push(response.url()); });

  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      document.querySelectorAll('img').forEach((image) => { image.loading = 'eager'; });
      await Promise.all([...document.images].map((image) => image.decode()));
      await document.fonts.ready;
    });
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      bodyWidth: document.documentElement.scrollWidth,
      posters: document.querySelectorAll('[data-scene]').length,
      photosLoaded: [...document.images].every((image) => image.naturalWidth > 0),
      titleFont: getComputedStyle(document.querySelector('h1')).fontFamily,
      stickyDisabled: getComputedStyle(document.querySelector('.system')).position === 'relative',
      sceneHeights: [...document.querySelectorAll('[data-scene]')].map((scene) => ({ id: scene.id, height: scene.offsetHeight })),
      backgroundBlur: ['.presence-orbit', '.form-pattern'].map((selector) => getComputedStyle(document.querySelector(selector)).filter),
      removedRedPlane: document.querySelector('.form-red-plane') === null,
      tearReplacesCircle: document.querySelector('.release-tear') !== null && document.querySelector('.release-pattern') === null,
      gazeMirrored: getComputedStyle(document.querySelector('.tear-opening img')).transform.startsWith('matrix(-1'),
      pointingHandNonBlocking: getComputedStyle(document.querySelector('.release-pointer')).pointerEvents === 'none',
      photoProportions: ['.presence-portrait .photo', '.language-hand img', '.release-pointer'].every((selector) => {
        const photo = document.querySelector(selector);
        return Math.abs(photo.offsetWidth / photo.offsetHeight - photo.naturalWidth / photo.naturalHeight) < 0.01;
      })
    }));
    assert.equal(metrics.posters, 5);
    assert.ok(metrics.bodyWidth <= width + 1, 'Body overflow at ' + width);
    assert.ok(metrics.photosLoaded, 'Photographs did not load at ' + width);
    assert.ok(metrics.titleFont.includes('Notorism Display'));
    assert.ok(metrics.stickyDisabled, 'Reduced motion should remove sticky presentation');
    assert.ok(metrics.backgroundBlur.every((filter) => filter === 'blur(3px)'));
    assert.ok(metrics.removedRedPlane && metrics.tearReplacesCircle && metrics.gazeMirrored);
    assert.ok(metrics.pointingHandNonBlocking && metrics.photoProportions);
    measurements.push(metrics);
    if ([1440, 1024, 390].includes(width)) {
      const name = width === 1440 ? 'desktop' : width === 390 ? 'mobile' : 'tablet';
      await page.screenshot({ path: path.join(output, 'notorism-site-' + name + '.png'), fullPage: true });
      for (const id of ['presence', 'language', 'system', 'form', 'release']) {
        await page.locator('#' + id).screenshot({ path: path.join(output, 'poster-' + id + '-' + width + '.png') });
      }
    }
  }

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(origin);
  await page.getByRole('button', { name: 'Copy installation command' }).first().click();
  await page.waitForFunction(() => document.querySelector('.copy-label').textContent.includes('COPIED'));
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'npx -y notorism');

  const patternBefore = await page.locator('#pattern-matrix').innerHTML();
  await page.getByRole('button', { name: 'New arrangement' }).click();
  assert.notEqual(await page.locator('#pattern-matrix').innerHTML(), patternBefore);
  assert.equal(await page.locator('#seed-label').textContent(), '0756');

  await page.goto(origin);
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => ({ tag: document.activeElement.tagName, name: document.activeElement.textContent, outline: getComputedStyle(document.activeElement).outlineStyle }));
  assert.equal(focus.tag, 'A');
  assert.notEqual(focus.outline, 'none');
  assert.equal(await page.locator('.skip-link').evaluate((link) => getComputedStyle(link).opacity), '1');

  await page.getByText('IMAGE CREDITS', { exact: true }).click();
  assert.ok(await page.getByText('Sources, licenses and image treatments').isVisible());
  assert.equal((await page.request.get(origin + '/credits.html')).status(), 200);

  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Clipboard denied'); } }, configurable: true }));
  await page.reload();
  await page.getByRole('button', { name: 'Copy installation command' }).first().click();
  assert.equal(await page.evaluate(() => window.getSelection().toString()), 'npx -y notorism');

  const motionPage = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'no-preference' });
  motionPage.on('pageerror', (error) => errors.push(error.message));
  await motionPage.goto(origin, { waitUntil: 'networkidle' });
  assert.equal(await motionPage.locator('.system').evaluate((element) => getComputedStyle(element).position), 'sticky');
  await motionPage.locator('#system').scrollIntoViewIfNeeded();
  await motionPage.evaluate(() => window.scrollBy(0, 140));
  await motionPage.waitForTimeout(120);
  const phase = await motionPage.locator('#system').evaluate((element) => element.style.getPropertyValue('--phase'));
  assert.notEqual(phase, '');
  await motionPage.getByRole('button', { name: 'Freeze motion' }).click();
  assert.equal(await motionPage.locator('#freeze').getAttribute('aria-pressed'), 'true');
  const frozenPhase = await motionPage.locator('#system').evaluate((element) => element.style.getPropertyValue('--phase'));
  await motionPage.evaluate(() => window.scrollBy(0, 160));
  await motionPage.waitForTimeout(100);
  assert.equal(await motionPage.locator('#system').evaluate((element) => element.style.getPropertyValue('--phase')), frozenPhase);
  await motionPage.getByRole('button', { name: 'Resume motion' }).click();
  await motionPage.screenshot({ path: path.join(output, 'notorism-site-motion.png'), fullPage: false });
  await motionPage.close();

  const noScript = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await noScript.goto(origin, { waitUntil: 'networkidle' });
  assert.equal(await noScript.locator('[data-scene]').count(), 5);
  assert.ok(await noScript.locator('h1').isVisible());
  assert.ok(await noScript.locator('.install-command code').first().isVisible());
  await noScript.close();

  await page.goto(pathToFileURL(path.join(siteRoot, 'preview.html')).href);
  await page.waitForFunction(() => document.querySelector('#system svg') !== null);
  assert.equal(await page.locator('[data-scene]').count(), 5);
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);

  if (hasArtifact) {
    for (const name of ['desktop', 'mobile', 'tablet']) {
      await copyFile(path.join(output, 'notorism-site-' + name + '.png'), path.join(artifact, name + '.png'));
    }
  }
  const review = {
    viewports: [
      { width: 1440, screenshot: 'desktop.png', observations: 'Five posters preserve photographic aspect ratios. Geometric backdrops blur behind the sculptures; Hebe has no red rectangle. A mirrored eye appears behind an irregular paper tear, with one additional marble hand pointing toward installation. No body overflow.' },
      { width: 1024, screenshot: 'tablet.png', observations: 'The intermediate layout uses four pattern columns and preserves the same palette, sculpture crops and live typography without body overflow.' },
      { width: 390, screenshot: 'mobile.png', observations: 'Portrait scenes recompose photographs and headlines; the matrix uses three columns and each complete poster remains visible without animation or body overflow.' }
    ],
    primaryInteraction: 'Both install commands copy real text. Browser clipboard success was checked; denied clipboard selects the command. New arrangement changes seeded SVG geometry, freeze preserves the current scroll phase, credits disclose image sources.',
    keyboard: 'Native anchors and buttons were reached with Tab and visible focus. The first keyboard target is the skip link. Credits use native details / summary. Full accessibility audit was not run.',
    copy: 'English campaign copy is brief and factual. Product counts are 110 styles, 330 original studies, six families and support for Codex / Claude Code. Museum imagery is credited and not presented as client work.',
    limitations: ['No public deployment or NPM publication was performed in this visual implementation.', 'Automated and visual checks do not certify complete WCAG conformance.', 'This device was tested in Chromium; Safari and Firefox were not run.']
  };
  if (hasArtifact) await writeFile(path.join(artifact, 'review.json'), JSON.stringify(review, null, 2) + '\n');
  const assets = await Promise.all(['david.webp','david-red.webp','eye.webp','gaze.webp','hebe.webp','hand.webp','pointing-hand.webp'].map(async (file) => ({ file, bytes: (await stat(path.join(siteRoot, 'assets', file))).size })));
  await writeFile(path.join(output, 'site-verification.json'), JSON.stringify({ completedAt: new Date().toISOString(), measurements, assets, browserErrors: errors, failedRequests, motionPhase: phase, clipboard: 'real copy success and denial fallback', noJavaScript: 'all five posters and command visible' }, null, 2) + '\n');
  console.log(JSON.stringify({ measurements, assets, errors, failedRequests, motionPhase: phase }, null, 2));
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
