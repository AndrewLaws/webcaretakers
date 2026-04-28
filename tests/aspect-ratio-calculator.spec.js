// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/images/aspect-ratio-calculator/';

test.describe('Aspect Ratio Calculator page', () => {
  test('has the expected h1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Aspect Ratio Calculator' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Images', async ({ page }) => {
    await page.goto(URL);
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Images', 'Aspect Ratio Calculator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('typing target width fills target height (1920x1080, target W=800 -> H=450)', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-ar-original-w]', '1920');
    await page.fill('[data-ar-original-h]', '1080');
    await page.fill('[data-ar-target-w]', '800');
    await expect(page.locator('[data-ar-target-h]')).toHaveValue('450');
  });

  test('typing target height fills target width (1920x1080, target H=600 -> W=1067)', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-ar-original-w]', '1920');
    await page.fill('[data-ar-original-h]', '1080');
    await page.fill('[data-ar-target-h]', '600');
    await expect(page.locator('[data-ar-target-w]')).toHaveValue('1067');
  });

  test('shows simplified ratio 16:9 for 1920x1080', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-ar-original-w]', '1920');
    await page.fill('[data-ar-original-h]', '1080');
    await page.fill('[data-ar-target-w]', '800');
    await expect(page.locator('[data-ar-ratio]')).toContainText('16:9');
  });

  test('clicking a 4:3 preset applies it from current target width', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-ar-original-w]', '1920');
    await page.fill('[data-ar-original-h]', '1080');
    await page.fill('[data-ar-target-w]', '800');
    await page.click('[data-ar-preset="4:3"]');
    await expect(page.locator('[data-ar-target-h]')).toHaveValue('600');
    await expect(page.locator('[data-ar-ratio]')).toContainText('4:3');
  });

  test('rejects 0 width with a clear message', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-ar-original-w]', '0');
    await page.fill('[data-ar-original-h]', '1080');
    await page.fill('[data-ar-target-w]', '800');
    await expect(page.locator('[data-ar-error]')).toContainText(/positive/i);
  });

  test('rejects negative input', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-ar-original-w]', '1920');
    await page.fill('[data-ar-original-h]', '-10');
    await page.fill('[data-ar-target-w]', '800');
    await expect(page.locator('[data-ar-error]')).toContainText(/positive|whole/i);
  });

  test('prove-it panel shows GCD and scale factor', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-ar-original-w]', '1920');
    await page.fill('[data-ar-original-h]', '1080');
    await page.fill('[data-ar-target-w]', '800');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-body]')).toContainText(/GCD/i);
    await expect(page.locator('[data-prove-it-body]')).toContainText('120');
    await expect(page.locator('[data-prove-it-body]')).toContainText(/scale/i);
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-ar-original-w]', '1920');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Aspect Ratio Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event after a successful calculation', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-ar-original-w]', '1920');
    await page.fill('[data-ar-original-h]', '1080');
    await page.fill('[data-ar-target-w]', '800');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'Aspect Ratio Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes prove_it event when details opened', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it' && e.calculator_name === 'Aspect Ratio Calculator')
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

  test('SoftwareApplication JSON-LD names the calculator and is MultimediaApplication', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('Aspect Ratio Calculator');
    expect(sa.applicationCategory).toBe('MultimediaApplication');
  });
});

test.describe('Aspect Ratio Calculator hub registration', () => {
  test('Images hub lists the Aspect Ratio Calculator', async ({ page }) => {
    await page.goto('/calculators/images/');
    await expect(page.getByRole('link', { name: 'Aspect Ratio Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the Aspect Ratio Calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Aspect Ratio Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
