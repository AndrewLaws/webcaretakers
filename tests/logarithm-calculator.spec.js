const { test, expect } = require('@playwright/test');

const PATH = '/calculators/math/logarithm-calculator/';

test.describe('Logarithm Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 named Logarithm Calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Logarithm Calculator/i);
  });

  test('breadcrumb routes through Calculators > Math', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Math', 'Logarithm Calculator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /logarithm-calculator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="value"]')).toHaveCount(1);
    await expect(page.locator('[name="base"]')).toHaveCount(1);
    await expect(page.locator('[name="customBase"]')).toHaveCount(1);
    await expect(page.locator('[name="mode"]')).toHaveCount(1);
    await expect(page.locator('[name="logResult"]')).toHaveCount(1);
  });

  test('log10(1000) returns 3 with inverse 10^3 = 1000', async ({ page }) => {
    await page.selectOption('[name="mode"]', 'log');
    await page.selectOption('[name="base"]', '10');
    await page.fill('[name="value"]', '1000');
    await page.click('[data-calculate]');

    const value = await page.locator('[data-result-value]').innerText();
    expect(value).toMatch(/3(\.0+)?/);
    const inverse = await page.locator('[data-result-inverse]').innerText();
    expect(inverse).toContain('10');
    expect(inverse).toContain('1000');
  });

  test('log2(8) returns 3', async ({ page }) => {
    await page.selectOption('[name="base"]', '2');
    await page.fill('[name="value"]', '8');
    await page.click('[data-calculate]');
    const value = await page.locator('[data-result-value]').innerText();
    expect(value).toMatch(/3(\.0+)?/);
  });

  test('ln(e) returns 1', async ({ page }) => {
    await page.selectOption('[name="base"]', 'e');
    await page.fill('[name="value"]', String(Math.E));
    await page.click('[data-calculate]');
    const value = await page.locator('[data-result-value]').innerText();
    expect(value).toMatch(/1(\.0+)?/);
  });

  test('custom base 5 of 25 returns 2', async ({ page }) => {
    await page.selectOption('[name="base"]', 'custom');
    await page.fill('[name="customBase"]', '5');
    await page.fill('[name="value"]', '25');
    await page.click('[data-calculate]');
    const value = await page.locator('[data-result-value]').innerText();
    expect(value).toMatch(/2(\.0+)?/);
  });

  test('inverse mode: solve for x given base 2 and result 5 returns 32', async ({ page }) => {
    await page.selectOption('[name="mode"]', 'value');
    await page.selectOption('[name="base"]', '2');
    await page.fill('[name="logResult"]', '5');
    await page.click('[data-calculate]');
    const value = await page.locator('[data-result-value]').innerText();
    expect(value).toMatch(/32(\.0+)?/);
  });

  test('solve for base: given value 1000 and result 3 returns base 10', async ({ page }) => {
    await page.selectOption('[name="mode"]', 'base');
    await page.fill('[name="value"]', '1000');
    await page.fill('[name="logResult"]', '3');
    await page.click('[data-calculate]');
    const value = await page.locator('[data-result-value]').innerText();
    expect(value).toMatch(/10(\.0+)?/);
  });

  test('rejects non-positive value with a clear message', async ({ page }) => {
    await page.selectOption('[name="mode"]', 'log');
    await page.fill('[name="value"]', '-5');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-value]')).toContainText(/positive/i);
  });

  test('shows step-by-step working using change-of-base', async ({ page }) => {
    await page.selectOption('[name="base"]', '2');
    await page.fill('[name="value"]', '8');
    await page.click('[data-calculate]');
    const working = await page.locator('[data-result-working]').innerText();
    expect(working.toLowerCase()).toContain('change');
  });

  test('prove-it panel opens and shows the working list', async ({ page }) => {
    await page.selectOption('[name="base"]', '10');
    await page.fill('[name="value"]', '1000');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.length).toBeGreaterThan(0);
  });

  test('pushes calculator_result to dataLayer with calculator_name logarithm-calculator', async ({ page }) => {
    await page.selectOption('[name="base"]', '10');
    await page.fill('[name="value"]', '1000');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'logarithm-calculator')
    );
    expect(event).toBeTruthy();
  });

  test('pushes prove_it event when prove-it panel opens', async ({ page }) => {
    await page.selectOption('[name="base"]', '10');
    await page.fill('[name="value"]', '1000');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'logarithm-calculator')
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

  test('has long-form prose with identities reminder', async ({ page }) => {
    const prose = await page.locator('.long-form').innerText();
    expect(prose.toLowerCase()).toMatch(/identit/);
  });

  test('appears on the math category page', async ({ page }) => {
    await page.goto('/calculators/math/');
    await expect(page.locator('a[href="/calculators/math/logarithm-calculator/"]')).not.toHaveCount(0);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/math/logarithm-calculator/"]')).not.toHaveCount(0);
  });

  test('has disclaimer in footer', async ({ page }) => {
    await expect(page.locator('footer [data-disclaimer]')).toHaveCount(1);
  });

  test('has cookie banner present on fresh visit', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(PATH);
    await expect(page.locator('[data-cookie-banner]')).toBeVisible();
  });

  test('has primary nav', async ({ page }) => {
    await expect(page.locator('.primary-nav')).toBeVisible();
  });

  test('has GTM container script', async ({ page }) => {
    const html = await page.content();
    expect(html).toContain('GTM-PBCD82L6');
  });
});
