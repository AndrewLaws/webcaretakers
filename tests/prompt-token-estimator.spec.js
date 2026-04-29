const { test, expect } = require('@playwright/test');

const PATH = '/calculators/ai/prompt-token-estimator/';

test.describe('Prompt Token Estimator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Prompt Token Estimator/i);
  });

  test('breadcrumb routes through Calculators > AI', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'AI', 'Prompt Token Estimator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /prompt-token-estimator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="prompt"]')).toHaveCount(1);
    await expect(page.locator('[name="model"]')).toHaveCount(1);
    await expect(page.locator('[name="pricePer1k"]')).toHaveCount(1);
    await expect(page.locator('[data-calculate]')).toHaveCount(1);
  });

  test('shows tokens, words, chars when calculate is clicked', async ({ page }) => {
    await page.fill('[name="prompt"]', 'The quick brown fox jumps over the lazy dog.');
    await page.selectOption('[name="model"]', 'gpt-4o');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-tokens]')).toBeVisible();
    const tokens = await page.locator('[data-result-tokens]').innerText();
    expect(parseInt(tokens, 10)).toBeGreaterThan(0);
    const words = await page.locator('[data-result-words]').innerText();
    expect(parseInt(words, 10)).toBe(9);
    const chars = await page.locator('[data-result-chars]').innerText();
    expect(parseInt(chars, 10)).toBe(44);
  });

  test('cost field shows a value when pricePer1k is set', async ({ page }) => {
    await page.fill('[name="prompt"]', 'a'.repeat(1000));
    await page.selectOption('[name="model"]', 'gpt-4o');
    await page.fill('[name="pricePer1k"]', '0.01');
    await page.click('[data-calculate]');
    const cost = await page.locator('[data-result-cost]').innerText();
    // 1000 chars / 4 = 250 tokens, 250/1000 * 0.01 = 0.0025
    expect(cost).toMatch(/\$?0\.00/);
  });

  test('switching model changes the token estimate', async ({ page }) => {
    await page.fill('[name="prompt"]', 'a'.repeat(380));
    await page.selectOption('[name="model"]', 'gpt-4o');
    await page.click('[data-calculate]');
    const gptTokens = parseInt(await page.locator('[data-result-tokens]').innerText(), 10);
    await page.selectOption('[name="model"]', 'llama-3');
    await page.click('[data-calculate]');
    const llamaTokens = parseInt(await page.locator('[data-result-tokens]').innerText(), 10);
    expect(llamaTokens).toBeGreaterThan(gptTokens);
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="prompt"]', 'Hello there, this is a test prompt.');
    await page.selectOption('[name="model"]', 'claude-3-7-sonnet');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it] [data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it] [data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('token');
  });

  test('pushes calculator_result to dataLayer with the slug name', async ({ page }) => {
    await page.fill('[name="prompt"]', 'A reasonable test prompt for the estimator.');
    await page.selectOption('[name="model"]', 'gpt-4o');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'prompt-token-estimator')
    );
    expect(event).toBeTruthy();
    expect(event.tokens).toBeGreaterThan(0);
    expect(typeof event.model).toBe('string');
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="prompt"]', 'Quick test prompt.');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'prompt-token-estimator')
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

  test('has FAQ section', async ({ page }) => {
    await expect(page.locator('.faq')).toBeVisible();
  });

  test('appears on the AI category page', async ({ page }) => {
    await page.goto('/calculators/ai/');
    await expect(page.locator('a[href="/calculators/ai/prompt-token-estimator/"]')).not.toHaveCount(0);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/ai/prompt-token-estimator/"]')).not.toHaveCount(0);
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
    await expect(page.locator('nav.primary-nav')).toBeVisible();
  });

  test('has GTM script', async ({ page }) => {
    const html = await page.content();
    expect(html).toContain('googletagmanager.com');
  });
});
