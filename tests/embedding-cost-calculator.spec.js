const { test, expect } = require('@playwright/test');

const PATH = '/calculators/ai/embedding-cost-calculator/';

test.describe('Embedding Cost Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Embedding Cost Calculator/i);
  });

  test('breadcrumb routes through Calculators > AI', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'AI', 'Embedding Cost Calculator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /embedding-cost-calculator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="docCount"]')).toHaveCount(1);
    await expect(page.locator('[name="avgWords"]')).toHaveCount(1);
    await expect(page.locator('[name="wordsToTokens"]')).toHaveCount(1);
    await expect(page.locator('[name="model"]')).toHaveCount(1);
    await expect(page.locator('[name="refresh"]')).toHaveCount(1);
    await expect(page.locator('[name="months"]')).toHaveCount(1);
  });

  test('words-to-tokens default is 1.3', async ({ page }) => {
    await expect(page.locator('[name="wordsToTokens"]')).toHaveValue('1.3');
  });

  test('clicking calculate populates the result fields', async ({ page }) => {
    await page.fill('[name="docCount"]', '10000');
    await page.fill('[name="avgWords"]', '500');
    await page.selectOption('[name="model"]', 'text-embedding-3-small');
    await page.selectOption('[name="refresh"]', 'monthly');
    await page.fill('[name="months"]', '12');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-total-tokens]')).toContainText(/[0-9]/);
    await expect(page.locator('[data-result-oneoff]')).toContainText(/\$/);
    await expect(page.locator('[data-result-monthly]')).toContainText(/\$/);
    await expect(page.locator('[data-result-total]')).toContainText(/\$/);
    await expect(page.locator('[data-result-per-1000]')).toContainText(/\$/);
  });

  test('Custom model reveals the custom price field', async ({ page }) => {
    await page.selectOption('[name="model"]', 'custom');
    await expect(page.locator('[name="customPrice"]')).toBeVisible();
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="docCount"]', '5000');
    await page.fill('[name="avgWords"]', '400');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it] ul li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it]').innerText();
    expect(body.toLowerCase()).toContain('tokens');
  });

  test('pushes calculator_result to dataLayer with embedding-cost-calculator name', async ({ page }) => {
    await page.fill('[name="docCount"]', '10000');
    await page.fill('[name="avgWords"]', '500');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'embedding-cost-calculator')
    );
    expect(event).toBeTruthy();
    expect(event.total_cost).toBeGreaterThan(0);
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="docCount"]', '10000');
    await page.fill('[name="avgWords"]', '500');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() =>
      window.dataLayer.some((e) => e.event === 'prove_it' && e.calculator_name === 'embedding-cost-calculator')
    );
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'embedding-cost-calculator')
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

  test('appears on the AI category page', async ({ page }) => {
    await page.goto('/calculators/ai/');
    await expect(page.locator('a[href="/calculators/ai/embedding-cost-calculator/"]')).not.toHaveCount(0);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/ai/embedding-cost-calculator/"]')).not.toHaveCount(0);
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
