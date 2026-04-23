const { test, expect } = require('@playwright/test');

test.describe('US Mortgage Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/finance/mortgage-calculator/');
  });

  test('has the expected h1 starting with US', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'US Mortgage Calculator' })).toBeVisible();
  });

  test('has an ELI5 block', async ({ page }) => {
    const eli5 = page.locator('.eli5');
    await expect(eli5).toBeVisible();
    await expect(eli5).toContainText("Explain like I'm 5");
  });

  test('breadcrumb routes through Calculators > Finance', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators', includeHidden: true })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Finance', includeHidden: true })).toHaveAttribute('href', '/calculators/finance/');
  });

  test('default inputs produce a monthly total and breakdown', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const total = await page.locator('[data-line-total]').textContent();
    expect(total).toMatch(/\$[\d,]+\.\d{2}/);
    await expect(page.locator('[data-breakdown]')).toBeVisible();
  });

  test('pushes calculator_result event to dataLayer with loan details', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('US Mortgage Calculator');
    expect(typeof event.loan_principal).toBe('number');
    expect(typeof event.loan_term_years).toBe('number');
    expect(typeof event.apr_percent).toBe('number');
  });

  test('has SoftwareApplication JSON-LD with en-US and US countriesSupported', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const software = blocks.map(b => JSON.parse(b)).find(j => j['@type'] === 'SoftwareApplication');
    expect(software).toBeTruthy();
    expect(software.inLanguage).toBe('en-US');
    expect(software.countriesSupported).toBe('US');
  });

  test('has en-US and x-default hreflang tags', async ({ page }) => {
    const enUs = page.locator('link[rel="alternate"][hreflang="en-US"]');
    const xDefault = page.locator('link[rel="alternate"][hreflang="x-default"]');
    await expect(enUs).toHaveAttribute('href', /mortgage-calculator/);
    await expect(xDefault).toHaveAttribute('href', /mortgage-calculator/);
  });

  test('Prove-it panel shows the working after calculating', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).not.toBeEmpty();
  });

  test('primary nav contains Finance link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Finance', includeHidden: true })).toHaveAttribute('href', '/calculators/finance/');
  });
});

test.describe('Finance category hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/finance/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Finance calculators' })).toBeVisible();
  });

  test('lists the US Mortgage Calculator', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'US Mortgage Calculator', includeHidden: true })).toBeVisible();
  });

  test('has CollectionPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('CollectionPage');
  });
});
