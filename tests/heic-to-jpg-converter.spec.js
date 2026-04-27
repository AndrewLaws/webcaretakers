const { test, expect } = require('@playwright/test');

test.describe('HEIC to JPG Converter page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/images/heic-to-jpg-converter/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'HEIC to JPG Converter' })).toBeVisible();
  });

  test('has an ELI5 block', async ({ page }) => {
    const eli5 = page.locator('.eli5');
    await expect(eli5).toBeVisible();
    await expect(eli5).toContainText("Explain like I'm 5");
  });

  test('breadcrumb routes through Calculators > Images', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators', includeHidden: true })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Images', includeHidden: true })).toHaveAttribute('href', '/calculators/images/');
  });

  test('dropzone is visible on initial load', async ({ page }) => {
    await expect(page.locator('[data-dropzone]')).toBeVisible();
  });

  test('results list is hidden until a file is processed', async ({ page }) => {
    await expect(page.locator('[data-results-list]')).toBeHidden();
  });

  test('output controls expose JPG default with quality slider', async ({ page }) => {
    const formatSelect = page.locator('[data-format]');
    await expect(formatSelect).toHaveValue('image/jpeg');
    await expect(page.locator('[data-quality]')).toBeVisible();
  });

  test('does NOT load heic2any on initial render', async ({ page }) => {
    // Library must lazy-load only when a HEIC file is detected. On a cold
    // page load, no script tag pointing at heic2any should be present.
    const scripts = await page.locator('script[src*="heic2any"]').count();
    expect(scripts).toBe(0);
  });

  test('does NOT add data-calculator on the calculator card', async ({ page }) => {
    // Sitewide main.js no longer auto-binds to data-calculator. Adding it
    // back caused a regression elsewhere; this test guards the new page.
    const card = page.locator('section.calculator-card');
    await expect(card).toBeVisible();
    await expect(card).not.toHaveAttribute('data-calculator', /.*/);
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication has MultimediaApplication category and free offer', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sw = blocks.map(b => JSON.parse(b)).find(o => o['@type'] === 'SoftwareApplication');
    expect(sw.applicationCategory).toBe('MultimediaApplication');
    expect(sw.operatingSystem).toBe('Any');
    expect(sw.offers.price).toBe('0');
    expect(sw.inLanguage).toBe('en-GB');
  });

  test('FAQPage covers the core HEIC search-intent questions', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faq = blocks.map(b => JSON.parse(b)).find(o => o['@type'] === 'FAQPage');
    const names = faq.mainEntity.map(q => q.name.toLowerCase());
    expect(names.some(n => n.includes('how do i convert heic to jpg'))).toBe(true);
    expect(names.some(n => n.includes('windows'))).toBe(true);
    expect(names.some(n => n.includes('upload'))).toBe(true);
    expect(names.some(n => n.includes('heif'))).toBe(true);
  });

  test('mentions the iPhone Settings shortcut for Most Compatible', async ({ page }) => {
    await expect(page.locator('main')).toContainText('Most Compatible');
  });

  test('makes the privacy reassurance prominent', async ({ page }) => {
    await expect(page.locator('main')).toContainText(/never leave your browser/i);
  });

  test('primary nav contains Images link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Images', includeHidden: true })).toHaveAttribute('href', '/calculators/images/');
  });

  test('related calculators include Photo Resizer', async ({ page }) => {
    const related = page.locator('.related-calculators');
    await expect(related.getByRole('link', { name: /Photo Resizer/i })).toBeVisible();
  });

  test('download filename helper carries the webcaretakers brand trail', async ({ page }) => {
    // The brand trail is added by the targetFilename helper in heic-to-jpg.js.
    // Probe the loaded helper directly so we do not depend on a real upload.
    const filename = await page.evaluate(() => window.HeicToJpg.targetFilename('IMG_1234.HEIC', 'image/jpeg'));
    expect(filename).toContain('-webcaretakers.');
    expect(filename.endsWith('.jpg')).toBe(true);
  });
});

test.describe('Images category hub registration', () => {
  test('Images hub lists the HEIC to JPG Converter', async ({ page }) => {
    await page.goto('/calculators/images/');
    await expect(page.getByRole('link', { name: /HEIC to JPG Converter/i }).first()).toBeVisible();
  });
});

// Minimal 1x1 transparent PNG (67 bytes). Used as a stand-in upload because
// the converter accepts JPG/PNG/WebP as well as HEIC, and this lets us
// exercise the prove-it path without shipping a HEIC fixture.
const TINY_PNG = Buffer.from(
  '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D' +
  '49444154789C636000010000050001AAB6B0A40000000049454E44AE426082',
  'hex'
);

test.describe('Prove it panel', () => {
  test('button appears after a successful conversion', async ({ page }) => {
    await page.goto('/calculators/images/heic-to-jpg-converter/');
    await page.locator('[data-file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: TINY_PNG });
    await expect(page.locator('button[data-prove-it]')).toBeVisible({ timeout: 10000 });
  });

  test('clicking the button reveals the body', async ({ page }) => {
    await page.goto('/calculators/images/heic-to-jpg-converter/');
    await page.locator('[data-file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: TINY_PNG });
    const btn = page.locator('button[data-prove-it]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    const body = page.locator('[data-prove-body]');
    await expect(body).toBeHidden();
    await btn.click();
    await expect(body).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  test('body cites the user file name and a numeric output dimension', async ({ page }) => {
    await page.goto('/calculators/images/heic-to-jpg-converter/');
    await page.locator('[data-file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: TINY_PNG });
    const btn = page.locator('button[data-prove-it]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    const text = await page.locator('[data-prove-body]').textContent();
    expect(text).toMatch(/pixel\.png/);
    // 1x1 PNG re-encoded must produce a 1 px dimension reference somewhere.
    expect(text).toMatch(/1\s*[\u00d7x]\s*1/);
  });

  test('dataLayer captures prove_it action', async ({ page }) => {
    await page.goto('/calculators/images/heic-to-jpg-converter/');
    await page.locator('[data-file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: TINY_PNG });
    const btn = page.locator('button[data-prove-it]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    const dl = await page.evaluate(() => window.dataLayer);
    const hit = dl.find(e => e.event === 'calculator_interaction' && e.action === 'prove_it' && e.calculator_name === 'HEIC to JPG Converter');
    expect(hit).toBeTruthy();
  });
});

test.describe('All-calculators hub registration', () => {
  test('All-calculators hub links to the HEIC to JPG Converter', async ({ page }) => {
    await page.goto('/calculators/');
    const link = page.getByRole('link', { name: /HEIC to JPG Converter/i }).first();
    await expect(link).toHaveAttribute('href', '/calculators/images/heic-to-jpg-converter/');
  });
});
