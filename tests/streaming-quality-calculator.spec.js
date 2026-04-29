const { test, expect } = require('@playwright/test');

const PATH = '/calculators/broadband/streaming-quality-calculator/';

test.describe('Streaming quality calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Streaming Quality Calculator/i);
  });

  test('breadcrumb routes through Calculators > Broadband', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Broadband', 'Streaming Quality Calculator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /streaming-quality-calculator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="linkSpeed"]')).toHaveCount(1);
    await expect(page.locator('[name="concurrent"]')).toHaveCount(1);
    await expect(page.locator('[name="service"]')).toHaveCount(1);
    await expect(page.locator('[name="targetQuality"]')).toHaveCount(1);
    await expect(page.locator('[name="headroom"]')).toHaveCount(1);
  });

  test('shows result fields after calculate is clicked', async ({ page }) => {
    await page.fill('[name="linkSpeed"]', '200');
    await page.fill('[name="concurrent"]', '2');
    await page.selectOption('[name="service"]', 'netflix');
    await page.selectOption('[name="targetQuality"]', '1080p');
    await page.fill('[name="headroom"]', '20');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-per-stream]')).toContainText(/Mbps/i);
    await expect(page.locator('[data-result-total]')).toContainText(/Mbps/i);
    await expect(page.locator('[data-result-surplus]')).toContainText(/Mbps/i);
    await expect(page.locator('[data-result-verdict]')).toContainText(/Comfortable|Tight|Insufficient/);
    await expect(page.locator('[data-result-best-tier]')).not.toBeEmpty();
  });

  test('shows Insufficient verdict when link cannot meet demand', async ({ page }) => {
    await page.fill('[name="linkSpeed"]', '20');
    await page.fill('[name="concurrent"]', '2');
    await page.selectOption('[name="service"]', 'netflix');
    await page.selectOption('[name="targetQuality"]', '4k-hdr');
    await page.fill('[name="headroom"]', '20');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-verdict]')).toContainText(/Insufficient/);
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="linkSpeed"]', '200');
    await page.fill('[name="concurrent"]', '2');
    await page.selectOption('[name="service"]', 'netflix');
    await page.selectOption('[name="targetQuality"]', '1080p');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('per stream');
  });

  test('pushes calculator_result to dataLayer', async ({ page }) => {
    await page.fill('[name="linkSpeed"]', '200');
    await page.fill('[name="concurrent"]', '2');
    await page.selectOption('[name="service"]', 'netflix');
    await page.selectOption('[name="targetQuality"]', '1080p');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'streaming-quality-calculator')
    );
    expect(event).toBeTruthy();
    expect(event.link_speed).toBe(200);
    expect(event.concurrent).toBe(2);
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="linkSpeed"]', '200');
    await page.fill('[name="concurrent"]', '2');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'streaming-quality-calculator')
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

  test('mentions Netflix and Disney+ in long-form prose', async ({ page }) => {
    const prose = await page.locator('.long-form').innerText();
    expect(prose).toMatch(/Netflix/);
    expect(prose).toMatch(/Disney\+/);
  });

  test('appears on the broadband category page', async ({ page }) => {
    await page.goto('/calculators/broadband/');
    await expect(page.locator('a[href="/calculators/broadband/streaming-quality-calculator/"]')).not.toHaveCount(0);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/broadband/streaming-quality-calculator/"]')).not.toHaveCount(0);
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
