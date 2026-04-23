const { test, expect } = require('@playwright/test');

test.describe('Photo Resizer page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/images/photo-resizer/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Photo Resizer' })).toBeVisible();
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

  test('form is hidden until a file is chosen', async ({ page }) => {
    await expect(page.locator('[data-form]')).toBeHidden();
  });

  test('dropzone is visible on initial load', async ({ page }) => {
    await expect(page.locator('[data-dropzone]')).toBeVisible();
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('primary nav contains Images link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Images', includeHidden: true })).toHaveAttribute('href', '/calculators/images/');
  });

  test('download filename carries the webcaretakers brand trail', async ({ page }) => {
    // We can't exercise the full resize flow without a real file upload
    // (which is awkward in a headless browser run), so this test checks the
    // page script contains the branded filename template. If someone strips
    // it out, this fails loudly.
    const source = await page.content();
    expect(source).toContain('-resized-webcaretakers.');
  });
});

test.describe('Images category hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/images/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Image tools' })).toBeVisible();
  });

  test('lists the Photo Resizer', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Photo Resizer', includeHidden: true }).first()).toBeVisible();
  });

  test('has CollectionPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('CollectionPage');
  });
});
