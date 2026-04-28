const { test, expect } = require('@playwright/test');

const PATH = '/calculators/cybersecurity/data-breach-cost-estimator/';

test.describe('Data breach cost estimator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Data Breach Cost Estimator/i);
  });

  test('breadcrumb routes through Calculators > Cybersecurity', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Cybersecurity', 'Data Breach Cost Estimator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /data-breach-cost-estimator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="records"]')).toHaveCount(1);
    await expect(page.locator('[name="sector"]')).toHaveCount(1);
    await expect(page.locator('[name="region"]')).toHaveCount(1);
    await expect(page.locator('[name="sensitivity"]')).toHaveCount(1);
    await expect(page.locator('[name="regulatory"]')).toHaveCount(1);
    await expect(page.locator('[name="revenue"]')).toHaveCount(1);
    await expect(page.locator('[name="reported72h"]')).toHaveCount(1);
  });

  test('shows direct cost, fine, total, range and per-record output when calculate is clicked', async ({ page }) => {
    await page.fill('[name="records"]', '10000');
    await page.selectOption('[name="sector"]', 'tech');
    await page.selectOption('[name="region"]', 'us');
    await page.selectOption('[name="sensitivity"]', 'pii');
    await page.selectOption('[name="regulatory"]', 'none');
    await page.fill('[name="revenue"]', '50000000');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-direct]')).toBeVisible();
    await expect(page.locator('[data-result-fine]')).toBeVisible();
    await expect(page.locator('[data-result-total]')).toBeVisible();
    await expect(page.locator('[data-result-range]')).toBeVisible();
    await expect(page.locator('[data-result-per-record]')).toBeVisible();
  });

  test('healthcare with GDPR shows a non-zero regulatory fine', async ({ page }) => {
    await page.fill('[name="records"]', '50000');
    await page.selectOption('[name="sector"]', 'healthcare');
    await page.selectOption('[name="region"]', 'eu');
    await page.selectOption('[name="sensitivity"]', 'health');
    await page.selectOption('[name="regulatory"]', 'gdpr');
    await page.fill('[name="revenue"]', '100000000');
    await page.click('[data-calculate]');
    const fine = await page.locator('[data-result-fine]').innerText();
    expect(fine).toMatch(/[1-9]/);
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="records"]', '10000');
    await page.selectOption('[name="sector"]', 'tech');
    await page.selectOption('[name="region"]', 'us');
    await page.selectOption('[name="sensitivity"]', 'pii');
    await page.selectOption('[name="regulatory"]', 'none');
    await page.fill('[name="revenue"]', '0');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('per-record');
  });

  test('pushes calculator_result to dataLayer with sector and total', async ({ page }) => {
    await page.fill('[name="records"]', '5000');
    await page.selectOption('[name="sector"]', 'financial');
    await page.selectOption('[name="region"]', 'uk');
    await page.selectOption('[name="sensitivity"]', 'financial');
    await page.selectOption('[name="regulatory"]', 'gdpr');
    await page.fill('[name="revenue"]', '20000000');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'data-breach-cost-estimator')
    );
    expect(event).toBeTruthy();
    expect(event.sector).toBe('financial');
    expect(typeof event.total).toBe('number');
    expect(event.total).toBeGreaterThan(0);
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="records"]', '1000');
    await page.selectOption('[name="sector"]', 'tech');
    await page.selectOption('[name="region"]', 'us');
    await page.selectOption('[name="sensitivity"]', 'pii');
    await page.selectOption('[name="regulatory"]', 'none');
    await page.fill('[name="revenue"]', '0');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'data-breach-cost-estimator')
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
    await expect(page.locator('a[href="/calculators/cybersecurity/data-breach-cost-estimator/"]')).toHaveCount(1);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/cybersecurity/data-breach-cost-estimator/"]')).toHaveCount(1);
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
