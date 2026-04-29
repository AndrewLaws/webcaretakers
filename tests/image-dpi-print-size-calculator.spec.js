// @ts-check
const { test, expect } = require('@playwright/test');

const PATH = '/calculators/images/image-dpi-print-size-calculator/';

test.describe('Image DPI / Print Size Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Image DPI \/ Print Size Calculator/i);
  });

  test('breadcrumb routes through Calculators > Images', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Images', 'Image DPI / Print Size Calculator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /image-dpi-print-size-calculator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="pixelsWide"]')).toHaveCount(1);
    await expect(page.locator('[name="pixelsHigh"]')).toHaveCount(1);
    await expect(page.locator('[name="dpi"]')).toHaveCount(1);
    await expect(page.locator('[name="printWidth"]')).toHaveCount(1);
    await expect(page.locator('[name="printHeight"]')).toHaveCount(1);
    await expect(page.locator('[name="unit"]')).toHaveCount(1);
    await expect(page.locator('[name="mode"]')).toHaveCount(1);
  });

  test('size-from-pixels mode: 3000x2000 at 300 DPI prints at 10 x 6.67 inches', async ({ page }) => {
    await page.selectOption('[name="mode"]', 'size-from-pixels');
    await page.selectOption('[name="unit"]', 'inches');
    await page.fill('[name="pixelsWide"]', '3000');
    await page.fill('[name="pixelsHigh"]', '2000');
    await page.fill('[name="dpi"]', '300');
    await page.click('[data-calculate]');

    const printSize = await page.locator('[data-result-print-size]').innerText();
    expect(printSize).toMatch(/10/);
    expect(printSize).toMatch(/6\.6/);
    const quality = await page.locator('[data-result-quality]').innerText();
    expect(quality.toLowerCase()).toContain('photo');
  });

  test('dpi-from-print mode: 3000x2000 across 10 x 6.67 inches gives 300 DPI', async ({ page }) => {
    await page.selectOption('[name="mode"]', 'dpi-from-print');
    await page.selectOption('[name="unit"]', 'inches');
    await page.fill('[name="pixelsWide"]', '3000');
    await page.fill('[name="pixelsHigh"]', '2000');
    await page.fill('[name="printWidth"]', '10');
    await page.fill('[name="printHeight"]', '6.67');
    await page.click('[data-calculate]');

    const dpi = await page.locator('[data-result-dpi]').innerText();
    expect(dpi).toMatch(/300/);
  });

  test('pixels-needed mode: 6 x 4 inches at 300 DPI needs 1800 x 1200 pixels', async ({ page }) => {
    await page.selectOption('[name="mode"]', 'pixels-needed');
    await page.selectOption('[name="unit"]', 'inches');
    await page.fill('[name="printWidth"]', '6');
    await page.fill('[name="printHeight"]', '4');
    await page.fill('[name="dpi"]', '300');
    await page.click('[data-calculate]');

    const pixels = await page.locator('[data-result-pixels]').innerText();
    expect(pixels).toMatch(/1800/);
    expect(pixels).toMatch(/1200/);
  });

  test('quality verdict flags low DPI as visibly pixelated', async ({ page }) => {
    await page.selectOption('[name="mode"]', 'dpi-from-print');
    await page.selectOption('[name="unit"]', 'inches');
    await page.fill('[name="pixelsWide"]', '600');
    await page.fill('[name="pixelsHigh"]', '400');
    await page.fill('[name="printWidth"]', '10');
    await page.fill('[name="printHeight"]', '8');
    await page.click('[data-calculate]');

    const quality = await page.locator('[data-result-quality]').innerText();
    expect(quality.toLowerCase()).toMatch(/pixelat/);
  });

  test('cm unit works as expected: 30 x 20 cm at 300 DPI', async ({ page }) => {
    await page.selectOption('[name="mode"]', 'pixels-needed');
    await page.selectOption('[name="unit"]', 'cm');
    await page.fill('[name="printWidth"]', '30');
    await page.fill('[name="printHeight"]', '20');
    await page.fill('[name="dpi"]', '300');
    await page.click('[data-calculate]');

    // 30 cm = 11.811 inches, x300 = 3543 px (rounded)
    const pixels = await page.locator('[data-result-pixels]').innerText();
    expect(pixels).toMatch(/354[0-9]/);
    expect(pixels).toMatch(/236[0-9]/);
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.selectOption('[name="mode"]', 'size-from-pixels');
    await page.fill('[name="pixelsWide"]', '3000');
    await page.fill('[name="pixelsHigh"]', '2000');
    await page.fill('[name="dpi"]', '300');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toMatch(/dpi|pixel/);
  });

  test('pushes calculator_result to dataLayer with calculator_name', async ({ page }) => {
    await page.fill('[name="pixelsWide"]', '3000');
    await page.fill('[name="pixelsHigh"]', '2000');
    await page.fill('[name="dpi"]', '300');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'image-dpi-print-size-calculator')
    );
    expect(event).toBeTruthy();
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="pixelsWide"]', '3000');
    await page.fill('[name="pixelsHigh"]', '2000');
    await page.fill('[name="dpi"]', '300');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'image-dpi-print-size-calculator')
    );
    expect(event).toBeTruthy();
  });

  test('has SoftwareApplication JSON-LD with UtilitiesApplication category', async ({ page }) => {
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().innerText();
    expect(jsonLd).toContain('SoftwareApplication');
    expect(jsonLd).toContain('UtilitiesApplication');
  });

  test('has FAQ schema', async ({ page }) => {
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    const combined = scripts.join(' ');
    expect(combined).toContain('FAQPage');
  });

  test('has long-form prose section', async ({ page }) => {
    await expect(page.locator('.long-form')).toBeVisible();
  });

  test('appears on the images category page', async ({ page }) => {
    await page.goto('/calculators/images/');
    await expect(page.locator('a[href="/calculators/images/image-dpi-print-size-calculator/"]')).not.toHaveCount(0);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/images/image-dpi-print-size-calculator/"]')).not.toHaveCount(0);
  });

  test('has disclaimer in footer', async ({ page }) => {
    await expect(page.locator('footer [data-disclaimer]')).toHaveCount(1);
  });

  test('has cookie banner present on fresh visit', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(PATH);
    await expect(page.locator('[data-cookie-banner]')).toBeVisible();
  });
});
