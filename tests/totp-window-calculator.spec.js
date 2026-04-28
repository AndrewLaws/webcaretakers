const { test, expect } = require('@playwright/test');

const PATH = '/calculators/cybersecurity/totp-window-calculator/';

test.describe('2FA / TOTP Window Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/2FA \/ TOTP Window Calculator/i);
  });

  test('breadcrumb routes through Calculators > Cybersecurity', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Cybersecurity', '2FA / TOTP Window Calculator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /totp-window-calculator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="period"]')).toHaveCount(1);
    await expect(page.locator('[name="digits"]')).toHaveCount(1);
    await expect(page.locator('[name="algo"]')).toHaveCount(1);
    await expect(page.locator('[name="drift"]')).toHaveCount(1);
    await expect(page.locator('[name="skew"]')).toHaveCount(1);
  });

  test('shows window, probability, attempts and recommended drift when calculate is clicked', async ({ page }) => {
    await page.fill('[name="period"]', '30');
    await page.selectOption('[name="digits"]', '6');
    await page.selectOption('[name="algo"]', 'SHA1');
    await page.fill('[name="drift"]', '1');
    await page.fill('[name="skew"]', '0');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-window]')).toBeVisible();
    await expect(page.locator('[data-result-prob]')).toBeVisible();
    await expect(page.locator('[data-result-onein]')).toBeVisible();
    await expect(page.locator('[data-result-attempts]')).toBeVisible();
    await expect(page.locator('[data-result-recommended-drift]')).toBeVisible();
    await expect(page.locator('[data-result-window]')).toContainText(/90/);
  });

  test('drift 2 with 30s period flags too-wide warning (>90s)', async ({ page }) => {
    await page.fill('[name="period"]', '30');
    await page.selectOption('[name="digits"]', '6');
    await page.selectOption('[name="algo"]', 'SHA1');
    await page.fill('[name="drift"]', '2');
    await page.fill('[name="skew"]', '0');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-warning]')).toBeVisible();
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="period"]', '30');
    await page.selectOption('[name="digits"]', '6');
    await page.fill('[name="drift"]', '1');
    await page.fill('[name="skew"]', '0');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('window');
  });

  test('pushes calculator_result to dataLayer with calculator name and digits', async ({ page }) => {
    await page.fill('[name="period"]', '30');
    await page.selectOption('[name="digits"]', '6');
    await page.fill('[name="drift"]', '1');
    await page.fill('[name="skew"]', '0');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'totp-window-calculator')
    );
    expect(event).toBeTruthy();
    expect(event.digits).toBe(6);
    expect(event.window_seconds).toBe(90);
  });

  test('pushes prove_it event when prove-it panel is opened (flake-guarded)', async ({ page }) => {
    await page.fill('[name="period"]', '30');
    await page.fill('[name="drift"]', '1');
    await page.fill('[name="skew"]', '0');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'totp-window-calculator')
    );
    expect(event).toBeTruthy();
  });

  test('has SoftwareApplication JSON-LD with SecurityApplication category', async ({ page }) => {
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().innerText();
    expect(jsonLd).toContain('SoftwareApplication');
    expect(jsonLd).toContain('SecurityApplication');
  });

  test('has FAQ schema', async ({ page }) => {
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    const combined = scripts.join(' ');
    expect(combined).toContain('FAQPage');
  });

  test('appears on the cybersecurity category page', async ({ page }) => {
    await page.goto('/calculators/cybersecurity/');
    await expect(page.locator('a[href="/calculators/cybersecurity/totp-window-calculator/"]')).toHaveCount(1);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/cybersecurity/totp-window-calculator/"]')).toHaveCount(1);
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
