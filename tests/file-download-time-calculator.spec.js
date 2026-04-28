// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/broadband/file-download-time-calculator/';

test.describe('File Download Time Calculator page', () => {
  test('has the expected h1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1, name: 'File Download Time Calculator' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Broadband', async ({ page }) => {
    await page.goto(URL);
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Broadband', 'File Download Time Calculator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.eli5')).toBeVisible();
    await expect(page.locator('.eli5')).toContainText(/megabits|megabytes/i);
  });

  test('calculates a download time when both inputs are filled', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fdt-size]', '1');
    await page.selectOption('[data-fdt-size-unit]', 'GB');
    await page.fill('[data-fdt-speed]', '100');
    await page.selectOption('[data-fdt-speed-unit]', 'Mbps');
    await expect(page.locator('[data-fdt-result]')).toBeVisible();
    // 1 GB at 100 Mbps with 5% overhead = 84 seconds = "1m 24s"
    await expect(page.locator('[data-fdt-result-value]')).toHaveText('1m 24s');
  });

  test('shows real-world comparison rows after calculate', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fdt-size]', '1');
    await page.fill('[data-fdt-speed]', '100');
    const rows = page.locator('[data-fdt-comparisons] tbody tr');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThanOrEqual(3);
  });

  test('handles file sizes greater than 100 GB', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fdt-size]', '500');
    await page.selectOption('[data-fdt-size-unit]', 'GB');
    await page.fill('[data-fdt-speed]', '100');
    await page.selectOption('[data-fdt-speed-unit]', 'Mbps');
    await expect(page.locator('[data-fdt-result-value]')).toContainText(/\d+h/);
  });

  test('rejects zero size with an error', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fdt-size]', '0');
    await page.fill('[data-fdt-speed]', '100');
    await expect(page.locator('[data-fdt-error]')).toContainText(/size|greater than zero/i);
    await expect(page.locator('[data-fdt-result]')).toBeHidden();
  });

  test('rejects zero speed with an error', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fdt-size]', '1');
    await page.fill('[data-fdt-speed]', '0');
    await expect(page.locator('[data-fdt-error]')).toContainText(/speed|greater than zero/i);
    await expect(page.locator('[data-fdt-result]')).toBeHidden();
  });

  test('prove-it panel shows the bits/bytes/seconds working', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fdt-size]', '1');
    await page.fill('[data-fdt-speed]', '100');
    await page.locator('[data-prove-it] summary').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).toContainText(/bits/i);
    await expect(body).toContainText(/bytes/i);
    await expect(body).toContainText(/overhead/i);
    await expect(body).toContainText(/5%|0\.05/);
  });

  test('changing speed unit updates the result', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fdt-size]', '1');
    await page.fill('[data-fdt-speed]', '1');
    await page.selectOption('[data-fdt-speed-unit]', 'Mbps');
    const slowText = await page.locator('[data-fdt-result-value]').textContent();
    await page.selectOption('[data-fdt-speed-unit]', 'Gbps');
    const fastText = await page.locator('[data-fdt-result-value]').textContent();
    expect(slowText).not.toEqual(fastText);
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fdt-size]', '5');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'File Download Time Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event after a successful calculate', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fdt-size]', '1');
    await page.fill('[data-fdt-speed]', '100');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'File Download Time Calculator')
    );
    expect(evt).toBeTruthy();
    expect(evt.size_unit).toBe('GB');
    expect(evt.speed_unit).toBe('Mbps');
  });

  test('pushes prove_it event when details opened', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it' && e.calculator_name === 'File Download Time Calculator')
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

  test('SoftwareApplication JSON-LD has UtilitiesApplication category', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('File Download Time Calculator');
    expect(sa.applicationCategory).toBe('UtilitiesApplication');
  });
});

test.describe('File Download Time Calculator hub registration', () => {
  test('Broadband hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/broadband/');
    await expect(page.getByRole('link', { name: 'File Download Time Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'File Download Time Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
