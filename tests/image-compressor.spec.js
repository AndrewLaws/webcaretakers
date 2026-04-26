const { test, expect } = require('@playwright/test');

test.describe('Image Compressor page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/images/image-compressor/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Image Compressor' })).toBeVisible();
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

  test('accepts the right MIME types on the file input', async ({ page }) => {
    const input = page.locator('[data-file]');
    const accept = await input.getAttribute('accept');
    expect(accept).toContain('image/jpeg');
    expect(accept).toContain('image/png');
    expect(accept).toContain('image/webp');
  });

  test('file input takes multiple files', async ({ page }) => {
    await expect(page.locator('[data-file]')).toHaveAttribute('multiple', '');
  });

  test('mode selector lists target-size and quality options', async ({ page }) => {
    const select = page.locator('[data-mode]');
    await expect(select).toBeVisible();
    const options = await select.locator('option').allTextContents();
    expect(options.join(' ')).toMatch(/Target file size/i);
    expect(options.join(' ')).toMatch(/Quality/i);
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication is multimedia, free, en-GB', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(o => o['@type'] === 'SoftwareApplication');
    expect(sa.applicationCategory).toBe('MultimediaApplication');
    expect(sa.operatingSystem).toBe('Any');
    expect(sa.inLanguage).toBe('en-GB');
    expect(sa.offers.price).toBe('0');
  });

  test('FAQ JSON-LD contains target file-size and email questions', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faq = blocks.map(b => JSON.parse(b)).find(o => o['@type'] === 'FAQPage');
    const names = faq.mainEntity.map(q => q.name).join(' | ');
    expect(names).toMatch(/under 2MB/i);
    expect(names).toMatch(/email/i);
  });

  test('uses class="calculator-card" without a data-calculator attribute', async ({ page }) => {
    const card = page.locator('.calculator-card');
    await expect(card).toBeVisible();
    await expect(card).not.toHaveAttribute('data-calculator', /.*/);
  });

  test('primary nav contains Images link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Images', includeHidden: true })).toHaveAttribute('href', '/calculators/images/');
  });

  test('mentions the file-never-leaves-browser privacy line', async ({ page }) => {
    await expect(page.locator('main')).toContainText(/never leaves your (device|browser)/i);
  });

  test('lists what the tool does NOT do (RAW, PDF, GIF)', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toContainText(/RAW/);
    await expect(main).toContainText(/PDF/);
    await expect(main).toContainText(/GIF/);
  });

  test('contains no em-dash glyph in the rendered prose', async ({ page }) => {
    const main = await page.locator('main').innerText();
    expect(main).not.toContain('\u2014');
  });
});

test.describe('Images category hub lists Image Compressor', () => {
  test('Images hub links to the Image Compressor', async ({ page }) => {
    await page.goto('/calculators/images/');
    await expect(
      page.getByRole('link', { name: 'Image Compressor', includeHidden: true }).first()
    ).toHaveAttribute('href', '/calculators/images/image-compressor/');
  });
});

test.describe('All-calculators hub lists Image Compressor', () => {
  // This is the regression people miss. Adding a calculator without
  // listing it on /calculators/ makes it functionally invisible.
  test('All calculators hub links to the Image Compressor', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(
      page.getByRole('link', { name: 'Image Compressor', includeHidden: true }).first()
    ).toHaveAttribute('href', '/calculators/images/image-compressor/');
  });
});
