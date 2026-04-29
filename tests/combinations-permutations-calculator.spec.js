const { test, expect } = require('@playwright/test');

const PATH = '/calculators/math/combinations-permutations-calculator/';

test.describe('Combinations and Permutations Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Combinations\s*&\s*Permutations Calculator/i);
  });

  test('breadcrumb routes through Calculators > Math', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Math', 'Combinations & Permutations Calculator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /combinations-permutations-calculator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="n"]')).toHaveCount(1);
    await expect(page.locator('[name="r"]')).toHaveCount(1);
    await expect(page.locator('[name="mode"]')).toHaveCount(1);
    await expect(page.locator('[name="repetition"]')).toHaveCount(1);
    await expect(page.locator('[name="multinomialGroups"]')).toHaveCount(1);
  });

  test('default combinations mode: 5C2 = 10', async ({ page }) => {
    await page.fill('[name="n"]', '5');
    await page.fill('[name="r"]', '2');
    await page.selectOption('[name="mode"]', 'combinations');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-nCr]')).toContainText('10');
  });

  test('permutations mode: 5P2 = 20', async ({ page }) => {
    await page.fill('[name="n"]', '5');
    await page.fill('[name="r"]', '2');
    await page.selectOption('[name="mode"]', 'permutations');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-nPr]')).toContainText('20');
  });

  test('both mode shows both nCr and nPr', async ({ page }) => {
    await page.fill('[name="n"]', '6');
    await page.fill('[name="r"]', '3');
    await page.selectOption('[name="mode"]', 'both');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-nCr]')).toContainText('20');
    await expect(page.locator('[data-result-nPr]')).toContainText('120');
  });

  test('factorial-only mode: 7! = 5040', async ({ page }) => {
    await page.fill('[name="n"]', '7');
    await page.selectOption('[name="mode"]', 'factorial-only');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-factorial]')).toContainText('5,040');
  });

  test('repetition flag changes combinations to stars-and-bars', async ({ page }) => {
    await page.fill('[name="n"]', '5');
    await page.fill('[name="r"]', '3');
    await page.selectOption('[name="mode"]', 'combinations');
    await page.check('[name="repetition"]');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-nCr]')).toContainText('35');
  });

  test('multinomial mode: 1,4,4,2 returns 34,650', async ({ page }) => {
    await page.selectOption('[name="mode"]', 'multinomial');
    await page.fill('[name="multinomialGroups"]', '1,4,4,2');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-working]')).toContainText('34,650');
  });

  test('large n uses BigInt cleanly: 100C50 fits exactly', async ({ page }) => {
    await page.fill('[name="n"]', '100');
    await page.fill('[name="r"]', '50');
    await page.selectOption('[name="mode"]', 'combinations');
    await page.click('[data-calculate]');
    // 100C50 = 100891344545564193334812497256
    await expect(page.locator('[data-result-nCr]')).toContainText('100,891,344,545,564,193,334,812,497,256');
  });

  test('rejects n above the cap with a clear message', async ({ page }) => {
    await page.fill('[name="n"]', '5000');
    await page.fill('[name="r"]', '2');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-working]')).toContainText(/500/);
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="n"]', '5');
    await page.fill('[name="r"]', '2');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('factorial');
  });

  test('pushes calculator_result to dataLayer with calculator name', async ({ page }) => {
    await page.fill('[name="n"]', '5');
    await page.fill('[name="r"]', '2');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'combinations-permutations-calculator')
    );
    expect(event).toBeTruthy();
    expect(event.mode).toBe('combinations');
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="n"]', '5');
    await page.fill('[name="r"]', '2');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'combinations-permutations-calculator')
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

  test('appears on the math category page', async ({ page }) => {
    await page.goto('/calculators/math/');
    await expect(page.locator('a[href="/calculators/math/combinations-permutations-calculator/"]')).not.toHaveCount(0);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/math/combinations-permutations-calculator/"]')).not.toHaveCount(0);
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
