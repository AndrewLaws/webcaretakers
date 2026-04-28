const { test, expect } = require('@playwright/test');

const PATH = '/calculators/fun/magic-8-ball/';

test.describe('Magic 8-Ball Generator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Magic 8-Ball Generator/i);
  });

  test('breadcrumb routes through Calculators > Fun', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Fun', 'Magic 8-Ball']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /magic-8-ball/);
  });

  test('has the ask button and question input', async ({ page }) => {
    await expect(page.locator('[data-ask]')).toHaveCount(1);
    await expect(page.locator('[data-question]')).toHaveCount(1);
  });

  test('shake reveals one of the canonical answers with a tone', async ({ page }) => {
    await page.fill('[data-question]', 'Should I order pizza tonight?');
    await page.click('[data-ask]');
    // The answer reveal is delayed by the shake animation; allow time.
    await expect(page.locator('[data-result-tone]')).toHaveAttribute('data-tone', /^(Affirmative|Non-committal|Negative)$/, { timeout: 5000 });
    const answer = await page.locator('[data-result-answer]').innerText();
    expect(answer.length).toBeGreaterThan(0);
    expect(answer).not.toMatch(/Ask a question and shake/);
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('total bits');
  });

  test('pushes calculator_result to dataLayer with tone', async ({ page }) => {
    await page.click('[data-ask]');
    await page.waitForFunction(() =>
      window.dataLayer.some((e) => e.event === 'calculator_result' && e.calculator_name === 'magic-8-ball')
    );
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'magic-8-ball')
    );
    expect(event).toBeTruthy();
    expect(['Affirmative', 'Non-committal', 'Negative']).toContain(event.tone);
    expect(typeof event.answer).toBe('string');
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'magic-8-ball')
    );
    expect(event).toBeTruthy();
  });

  test('has SoftwareApplication JSON-LD with GameApplication category', async ({ page }) => {
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().innerText();
    expect(jsonLd).toContain('SoftwareApplication');
    expect(jsonLd).toContain('GameApplication');
  });

  test('has FAQ schema', async ({ page }) => {
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    const combined = scripts.join(' ');
    expect(combined).toContain('FAQPage');
  });

  test('mentions Mattel in long-form prose', async ({ page }) => {
    const prose = await page.locator('.long-form').innerText();
    expect(prose).toMatch(/Mattel/);
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
