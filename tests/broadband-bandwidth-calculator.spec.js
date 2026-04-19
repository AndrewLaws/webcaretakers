const { test, expect } = require('@playwright/test');

const PATH = '/calculators/broadband/broadband-bandwidth-calculator/';

test.describe('Broadband bandwidth calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    const text = (await h1.innerText()).toLowerCase();
    expect(text).toMatch(/broadband|bandwidth/);
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /broadband-bandwidth-calculator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="users"]')).toHaveCount(1);
    await expect(page.locator('[name="streaming"]')).toHaveCount(1);
    await expect(page.locator('[name="videoCalls"]')).toHaveCount(1);
    await expect(page.locator('[name="gaming"]')).toHaveCount(1);
    await expect(page.locator('[name="smartDevices"]')).toHaveCount(1);
    await expect(page.locator('[name="workFromHome"]')).toHaveCount(1);
  });

  test('shows a result when calculate is clicked', async ({ page }) => {
    await page.selectOption('[name="streaming"]', 'hd');
    await page.fill('[name="users"]', '2');
    await page.fill('[name="smartDevices"]', '3');
    await page.click('[data-calculate]');

    const result = page.locator('[data-result-download]');
    await expect(result).toBeVisible();
    const text = await result.innerText();
    expect(text).toMatch(/\d+\s*Mbps/i);

    await expect(page.locator('[data-result-upload]')).toBeVisible();
    await expect(page.locator('[data-result-tier]')).toBeVisible();
  });

  test('pushes calculator_result to dataLayer after calculation', async ({ page }) => {
    await page.selectOption('[name="streaming"]', 'hd');
    await page.fill('[name="users"]', '2');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator === 'broadband-bandwidth')
    );
    expect(event).toBeTruthy();
    expect(event.download_mbps).toBeGreaterThan(0);
  });

  test('has SoftwareApplication JSON-LD', async ({ page }) => {
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().innerText();
    expect(jsonLd).toContain('SoftwareApplication');
  });

  test('has FAQ schema', async ({ page }) => {
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    const combined = scripts.join(' ');
    expect(combined).toContain('FAQPage');
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
