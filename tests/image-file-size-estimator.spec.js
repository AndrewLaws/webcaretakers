// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/images/image-file-size-estimator/';

test.describe('Image File Size Estimator page', () => {
  test('has the expected h1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Image File Size Estimator' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Images', async ({ page }) => {
    await page.goto(URL);
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Images', 'Image File Size Estimator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.eli5')).toBeVisible();
    await expect(page.locator('.eli5')).toContainText(/pixels|kilobytes|estimate/i);
  });

  test('shows a default estimate on first load', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('[data-ifse-result]')).toBeVisible();
    await expect(page.locator('[data-ifse-result-value]')).toContainText(/KB|MB|B/);
  });

  test('updates the estimate when dimensions change', async ({ page }) => {
    await page.goto(URL);
    const before = await page.locator('[data-ifse-result-value]').textContent();
    await page.fill('[data-ifse-width]', '4000');
    await page.fill('[data-ifse-height]', '3000');
    const after = await page.locator('[data-ifse-result-value]').textContent();
    expect(before).not.toEqual(after);
  });

  test('shows the comparison table for all five formats', async ({ page }) => {
    await page.goto(URL);
    const rows = page.locator('[data-ifse-comparison] tbody tr');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBe(5);
    const text = await page.locator('[data-ifse-comparison]').textContent();
    expect(text).toContain('JPEG');
    expect(text).toContain('PNG');
    expect(text).toContain('WebP');
    expect(text).toContain('AVIF');
    expect(text).toContain('HEIC');
  });

  test('switches to PNG content toggle when PNG is selected', async ({ page }) => {
    await page.goto(URL);
    await page.selectOption('[data-ifse-format]', 'PNG');
    await expect(page.locator('[data-ifse-png-row]')).toBeVisible();
    await expect(page.locator('[data-ifse-quality-row]')).toBeHidden();
  });

  test('rejects zero width with an error', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-ifse-width]', '0');
    await expect(page.locator('[data-ifse-error]')).toContainText(/width|greater than zero/i);
    await expect(page.locator('[data-ifse-result]')).toBeHidden();
  });

  test('prove-it panel shows the formula and pixel multiplication', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-prove-it] summary').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).toContainText(/W \* H/);
    await expect(body).toContainText(/pixels/i);
    await expect(body).toContainText(/coefficient/i);
    await expect(body).toContainText(/30 percent|±30|plus or minus 30/i);
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-ifse-width]', '2000');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Image File Size Estimator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event after a successful estimate', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-ifse-width]', '1280');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'Image File Size Estimator')
    );
    expect(evt).toBeTruthy();
    expect(evt.format).toBe('JPEG');
  });

  test('pushes prove_it event when details opened', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-prove-it] summary').click();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it' && e.calculator_name === 'Image File Size Estimator')
    );
    expect(evt).toBeTruthy();
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication JSON-LD has MultimediaApplication category', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('Image File Size Estimator');
    expect(sa.applicationCategory).toBe('MultimediaApplication');
  });
});

test.describe('Image File Size Estimator hub registration', () => {
  test('Images hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/images/');
    await expect(page.getByRole('link', { name: 'Image File Size Estimator', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Image File Size Estimator', includeHidden: true }).first()).toBeVisible();
  });
});
