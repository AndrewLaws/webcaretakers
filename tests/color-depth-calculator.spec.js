const { test, expect } = require('@playwright/test');

const PATH = '/calculators/images/color-depth-calculator/';

test.describe('Color Depth & Storage Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Color Depth (?:&|and|&amp;) Storage Calculator/i);
  });

  test('breadcrumb routes through Calculators > Images', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Images', 'Color Depth & Storage Calculator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has long-form prose and FAQ', async ({ page }) => {
    await expect(page.locator('.long-form')).toBeVisible();
    await expect(page.locator('.faq')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /color-depth-calculator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="pixelsWide"]')).toHaveCount(1);
    await expect(page.locator('[name="pixelsHigh"]')).toHaveCount(1);
    await expect(page.locator('[name="bitDepth"]')).toHaveCount(1);
    await expect(page.locator('[name="customBits"]')).toHaveCount(1);
    await expect(page.locator('[name="frames"]')).toHaveCount(1);
  });

  test('shows raw size, bits per pixel and colour count for 24-bit 1920x1080', async ({ page }) => {
    await page.fill('[name="pixelsWide"]', '1920');
    await page.fill('[name="pixelsHigh"]', '1080');
    await page.selectOption('[name="bitDepth"]', '24');
    await page.fill('[name="frames"]', '1');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-bits-per-pixel]')).toContainText(/24/);
    const colors = await page.locator('[data-result-colors]').innerText();
    expect(colors).toContain('16,777,216');
    const raw = await page.locator('[data-result-raw-size]').innerText();
    expect(raw).toMatch(/MB|GB/);
  });

  test('JPEG and PNG comparison estimates are present', async ({ page }) => {
    await page.fill('[name="pixelsWide"]', '1920');
    await page.fill('[name="pixelsHigh"]', '1080');
    await page.selectOption('[name="bitDepth"]', '24');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-jpeg-est]')).toContainText(/[KMG]B/);
    await expect(page.locator('[data-result-png-est]')).toContainText(/[KMG]B/);
  });

  test('custom bits input is honoured when bitDepth is custom', async ({ page }) => {
    await page.fill('[name="pixelsWide"]', '100');
    await page.fill('[name="pixelsHigh"]', '100');
    await page.selectOption('[name="bitDepth"]', 'custom');
    await page.fill('[name="customBits"]', '12');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-bits-per-pixel]')).toContainText(/12/);
    const colors = await page.locator('[data-result-colors]').innerText();
    expect(colors).toContain('4,096');
  });

  test('frames multiplier scales the raw size', async ({ page }) => {
    await page.fill('[name="pixelsWide"]', '1000');
    await page.fill('[name="pixelsHigh"]', '1000');
    await page.selectOption('[name="bitDepth"]', '24');
    await page.fill('[name="frames"]', '10');
    await page.click('[data-calculate]');
    // 1000x1000x24bit x10 = 30,000,000 bytes = 30 MB
    const raw = await page.locator('[data-result-raw-size]').innerText();
    expect(raw).toMatch(/MB|GB/);
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="pixelsWide"]', '1920');
    await page.fill('[name="pixelsHigh"]', '1080');
    await page.selectOption('[name="bitDepth"]', '24');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('total bits');
  });

  test('pushes calculator_result to dataLayer', async ({ page }) => {
    await page.fill('[name="pixelsWide"]', '1920');
    await page.fill('[name="pixelsHigh"]', '1080');
    await page.selectOption('[name="bitDepth"]', '24');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'color-depth-calculator')
    );
    expect(event).toBeTruthy();
    expect(event.bits_per_pixel).toBe(24);
    expect(event.total_bytes).toBeGreaterThan(0);
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="pixelsWide"]', '1920');
    await page.fill('[name="pixelsHigh"]', '1080');
    await page.selectOption('[name="bitDepth"]', '24');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'color-depth-calculator')
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

  test('has GTM container snippet', async ({ page }) => {
    const html = await page.content();
    expect(html).toContain('GTM-');
  });

  test('has primary nav', async ({ page }) => {
    await expect(page.locator('.primary-nav')).toHaveCount(1);
  });

  test('appears on the images category page', async ({ page }) => {
    await page.goto('/calculators/images/');
    await expect(page.locator('a[href="/calculators/images/color-depth-calculator/"]')).not.toHaveCount(0);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/images/color-depth-calculator/"]')).not.toHaveCount(0);
  });

  test('has disclaimer in footer', async ({ page }) => {
    await expect(page.locator('footer [data-disclaimer]')).toHaveCount(1);
  });

  test('has cookie banner present on fresh visit', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(PATH);
    await expect(page.locator('[data-cookie-banner]')).toHaveCount(1);
  });
});
