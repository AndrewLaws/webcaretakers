const { test, expect } = require('@playwright/test');

const PATH = '/calculators/broadband/cloud-backup-time-estimator/';

test.describe('Cloud backup time estimator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Cloud Backup Time Estimator/i);
  });

  test('breadcrumb routes through Calculators > Broadband', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Broadband', 'Cloud Backup Time Estimator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /cloud-backup-time-estimator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="dataValue"]')).toHaveCount(1);
    await expect(page.locator('[name="dataUnit"]')).toHaveCount(1);
    await expect(page.locator('[name="speedValue"]')).toHaveCount(1);
    await expect(page.locator('[name="speedUnit"]')).toHaveCount(1);
    await expect(page.locator('[name="efficiency"]')).toHaveCount(1);
    await expect(page.locator('[name="overnightOnly"]')).toHaveCount(1);
  });

  test('shows a result with a day/hour/minute breakdown when calculate is clicked', async ({ page }) => {
    await page.fill('[name="dataValue"]', '500');
    await page.selectOption('[name="dataUnit"]', 'GB');
    await page.fill('[name="speedValue"]', '50');
    await page.selectOption('[name="speedUnit"]', 'Mbps');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-summary]')).toBeVisible();
    const continuous = await page.locator('[data-result-continuous]').innerText();
    expect(continuous).toMatch(/day|hour|minute/i);
  });

  test('overnight-only mode reveals the second result row', async ({ page }) => {
    await page.fill('[name="dataValue"]', '500');
    await page.fill('[name="speedValue"]', '50');
    await page.check('[name="overnightOnly"]');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-overnight-row]')).toBeVisible();
    await expect(page.locator('[data-result-overnight]')).toContainText(/day|hour|minute/i);
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="dataValue"]', '1');
    await page.selectOption('[name="dataUnit"]', 'TB');
    await page.fill('[name="speedValue"]', '100');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('total bits');
  });

  test('pushes calculator_result to dataLayer with overnight flag', async ({ page }) => {
    await page.fill('[name="dataValue"]', '500');
    await page.fill('[name="speedValue"]', '50');
    await page.check('[name="overnightOnly"]');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'cloud-backup-time-estimator')
    );
    expect(event).toBeTruthy();
    expect(event.overnight_only).toBe(true);
    expect(event.wall_clock_seconds).toBeGreaterThan(0);
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="dataValue"]', '500');
    await page.fill('[name="speedValue"]', '50');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'cloud-backup-time-estimator')
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

  test('mentions Backblaze and iDrive in long-form prose', async ({ page }) => {
    const prose = await page.locator('.long-form').innerText();
    expect(prose).toMatch(/Backblaze/);
    expect(prose).toMatch(/iDrive/);
  });

  test('appears on the broadband category page', async ({ page }) => {
    await page.goto('/calculators/broadband/');
    await expect(page.locator('a[href="/calculators/broadband/cloud-backup-time-estimator/"]')).toHaveCount(1);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/broadband/cloud-backup-time-estimator/"]')).toHaveCount(1);
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
