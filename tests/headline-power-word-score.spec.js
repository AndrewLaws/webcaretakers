const { test, expect } = require('@playwright/test');

const PATH = '/calculators/writing/headline-power-word-score/';

test.describe('Headline Power-Word Score page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Headline Power-Word Score/i);
  });

  test('breadcrumb routes through Calculators > Writing', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Writing', 'Headline Power-Word Score']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /headline-power-word-score/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="headline"]')).toHaveCount(1);
    await expect(page.locator('[name="audience"]')).toHaveCount(1);
    await expect(page.locator('[data-calculate]')).toHaveCount(1);
  });

  test('shows a score, label, breakdown and suggestions when calculate is clicked', async ({ page }) => {
    await page.fill('[name="headline"]', '7 Proven Secrets to Win Today');
    await page.selectOption('[name="audience"]', 'general');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-score]')).toBeVisible();
    await expect(page.locator('[data-result-label]')).toBeVisible();
    const score = await page.locator('[data-result-score]').innerText();
    expect(parseInt(score, 10)).toBeGreaterThanOrEqual(60);
    const label = await page.locator('[data-result-label]').innerText();
    expect(['Strong', 'Killer']).toContain(label.trim());
    await expect(page.locator('[data-result-breakdown]')).toContainText(/Word count/i);
    await expect(page.locator('[data-result-suggestions]')).toBeVisible();
  });

  test('weak headline gets a Weak label', async ({ page }) => {
    await page.fill('[name="headline"]', 'A note');
    await page.click('[data-calculate]');
    const label = await page.locator('[data-result-label]').innerText();
    expect(label.trim()).toBe('Weak');
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="headline"]', 'How to Win 7 Shocking Free Proven Secrets Today');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('total');
  });

  test('pushes calculator_result to dataLayer with the slug name', async ({ page }) => {
    await page.fill('[name="headline"]', '7 Proven Secrets to Win Today');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'headline-power-word-score')
    );
    expect(event).toBeTruthy();
    expect(event.score).toBeGreaterThan(0);
    expect(typeof event.label).toBe('string');
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="headline"]', '7 Proven Secrets to Win Today');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'headline-power-word-score')
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

  test('has disclaimer in footer', async ({ page }) => {
    await expect(page.locator('footer [data-disclaimer]')).toHaveCount(1);
  });

  test('has cookie banner present on fresh visit', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(PATH);
    await expect(page.locator('[data-cookie-banner]')).toBeVisible();
  });
});
