const { test, expect } = require('@playwright/test');

const PATH = '/calculators/property/uk-leasehold-ground-rent-service-charge-calculator/';

test.describe('UK Leasehold Ground Rent & Service Charge Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('UK Leasehold Ground Rent & Service Charge Calculator');
  });

  test('breadcrumb routes through Calculators > Property', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual([
      'Home',
      'Calculators',
      'Property',
      'UK Leasehold Ground Rent & Service Charge Calculator',
    ]);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has a long-form section', async ({ page }) => {
    await expect(page.locator('.long-form')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /uk-leasehold-ground-rent-service-charge-calculator/
    );
  });

  test('SoftwareApplication JSON-LD has en-GB and GB country signals', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map((b) => JSON.parse(b));
    const software = parsed.find((j) => j['@type'] === 'SoftwareApplication');
    expect(software).toBeTruthy();
    expect(software.inLanguage).toBe('en-GB');
    expect(software.countriesSupported).toBe('GB');
    expect(software.applicationCategory).toBe('FinanceApplication');
  });

  test('FAQPage JSON-LD has at least three Q&As', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map((b) => JSON.parse(b));
    const faq = parsed.find((j) => j['@type'] === 'FAQPage');
    expect(faq).toBeTruthy();
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
  });

  test('shows result summary, total and monthly average after calculate', async ({ page }) => {
    await page.fill('[name="currentGroundRent"]', '250');
    await page.selectOption('[name="escalationType"]', 'doublingEvery10');
    await page.fill('[name="currentServiceCharge"]', '2000');
    await page.fill('[name="serviceChargeInflation"]', '3');
    await page.fill('[name="years"]', '20');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-summary]')).toBeVisible();
    const total = await page.locator('[data-result-total]').innerText();
    expect(total).toMatch(/£/);
    const monthly = await page.locator('[data-result-monthly-avg]').innerText();
    expect(monthly).toMatch(/£/);
  });

  test('renders a year-by-year table with the requested number of rows', async ({ page }) => {
    await page.fill('[name="currentGroundRent"]', '100');
    await page.selectOption('[name="escalationType"]', 'fixed');
    await page.fill('[name="currentServiceCharge"]', '1500');
    await page.fill('[name="serviceChargeInflation"]', '2');
    await page.fill('[name="years"]', '15');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-year-table] tbody tr')).toHaveCount(15);
  });

  test('peppercorn checkbox forces ground rent to zero in the table', async ({ page }) => {
    await page.fill('[name="currentGroundRent"]', '500');
    await page.selectOption('[name="escalationType"]', 'doublingEvery10');
    await page.fill('[name="currentServiceCharge"]', '1000');
    await page.fill('[name="serviceChargeInflation"]', '0');
    await page.fill('[name="years"]', '10');
    await page.check('[name="peppercorn"]');
    await page.click('[data-calculate]');
    const firstRowGround = await page
      .locator('[data-year-table] tbody tr')
      .first()
      .locator('td')
      .nth(1)
      .innerText();
    expect(firstRowGround).toMatch(/£0/);
    const summary = await page.locator('[data-result-summary]').innerText();
    expect(summary.toLowerCase()).toContain('peppercorn');
  });

  test('rpi-linked option reveals the rpi assumption input', async ({ page }) => {
    await page.selectOption('[name="escalationType"]', 'rpiLinked');
    await expect(page.locator('[name="rpiAssumption"]')).toBeVisible();
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="currentGroundRent"]', '300');
    await page.selectOption('[name="escalationType"]', 'fixed');
    await page.fill('[name="currentServiceCharge"]', '1800');
    await page.fill('[name="serviceChargeInflation"]', '3');
    await page.fill('[name="years"]', '10');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('ground rent');
  });

  test('pushes calculator_result to dataLayer', async ({ page }) => {
    await page.fill('[name="currentGroundRent"]', '250');
    await page.selectOption('[name="escalationType"]', 'fixed');
    await page.fill('[name="currentServiceCharge"]', '2000');
    await page.fill('[name="serviceChargeInflation"]', '3');
    await page.fill('[name="years"]', '10');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find(
        (e) =>
          e.event === 'calculator_result' &&
          e.calculator_name === 'uk-leasehold-ground-rent-service-charge-calculator'
      )
    );
    expect(event).toBeTruthy();
    expect(typeof event.total_combined).toBe('number');
    expect(event.total_combined).toBeGreaterThan(0);
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="currentGroundRent"]', '250');
    await page.fill('[name="currentServiceCharge"]', '2000');
    await page.fill('[name="serviceChargeInflation"]', '3');
    await page.fill('[name="years"]', '10');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find(
        (e) =>
          e.event === 'prove_it' &&
          e.calculator_name === 'uk-leasehold-ground-rent-service-charge-calculator'
      )
    );
    expect(event).toBeTruthy();
  });

  test('has disclaimer in footer', async ({ page }) => {
    await expect(page.locator('footer [data-disclaimer]')).toHaveCount(1);
  });

  test('has cookie banner present on fresh visit', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(PATH);
    await expect(page.locator('[data-cookie-banner]')).toBeVisible();
  });

  test('appears on the Property hub page', async ({ page }) => {
    await page.goto('/calculators/property/');
    await expect(
      page.locator('a[href="/calculators/property/uk-leasehold-ground-rent-service-charge-calculator/"]')
    ).toHaveCount(1);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(
      page.locator('a[href="/calculators/property/uk-leasehold-ground-rent-service-charge-calculator/"]')
    ).toHaveCount(1);
  });
});
