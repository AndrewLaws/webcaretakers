const { test, expect } = require('@playwright/test');

test.describe('UK Mortgage Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/finance/uk-mortgage-calculator/');
  });

  test('has the expected h1 starting with UK', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'UK Mortgage Calculator' })).toBeVisible();
  });

  test('has an indicative-estimate notice above the form', async ({ page }) => {
    const notice = page.locator('.indicative-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('Indicative estimate only');
    await expect(notice).toContainText('UK mortgage broker');
  });

  test('has a broker-referral CTA with a placeholder link (no live broker yet)', async ({ page }) => {
    const cta = page.locator('.broker-cta');
    await expect(cta).toBeVisible();
    await expect(cta).toContainText('UK mortgage broker');
    await expect(page.locator('[data-broker-placeholder]')).toBeVisible();
  });

  test('cross-links to the US version', async ({ page }) => {
    const link = page.locator('.country-switch a');
    await expect(link).toHaveAttribute('href', '/calculators/finance/mortgage-calculator/');
    await expect(link).toContainText('US version');
  });

  test('breadcrumb routes through Calculators > Finance', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators', includeHidden: true })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Finance', includeHidden: true })).toHaveAttribute('href', '/calculators/finance/');
  });

  test('default inputs (£300k, £30k deposit, 5y fix) compute fix and SVR monthlies', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const fix = await page.locator('[data-line-fix]').textContent();
    const svr = await page.locator('[data-line-svr]').textContent();
    expect(fix).toMatch(/£[\d,]+\.\d{2}/);
    expect(svr).toMatch(/£[\d,]+\.\d{2}/);
    await expect(page.locator('[data-breakdown]')).toBeVisible();
  });

  test('shows stamp duty for a standard £300k purchase (£5,000)', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    // £300k standard: 0 + 2% of £125k + 5% of £50k = 2,500 + 2,500 = £5,000
    await expect(page.locator('[data-line-sdlt]')).toContainText('5,000');
  });

  test('first-time buyer on £300k pays £0 stamp duty', async ({ page }) => {
    await page.selectOption('[data-ftb]', 'yes');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-line-sdlt]')).toContainText('0.00');
  });

  test('fee added to loan increases the principal line', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const principalUpfront = await page.locator('[data-line-principal]').textContent();
    await page.selectOption('[data-fee-mode]', 'loan');
    await page.locator('[data-calculate]').click();
    const principalInLoan = await page.locator('[data-line-principal]').textContent();
    expect(principalInLoan).not.toBe(principalUpfront);
  });

  test('pushes calculator_result event to dataLayer with UK fields', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('UK Mortgage Calculator');
    expect(typeof event.loan_principal).toBe('number');
    expect(typeof event.initial_rate_percent).toBe('number');
    expect(typeof event.svr_rate_percent).toBe('number');
    expect(typeof event.fix_years).toBe('number');
    expect(typeof event.stamp_duty).toBe('number');
  });

  test('has SoftwareApplication JSON-LD with en-GB and GB countriesSupported', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const software = blocks.map(b => JSON.parse(b)).find(j => j['@type'] === 'SoftwareApplication');
    expect(software).toBeTruthy();
    expect(software.inLanguage).toBe('en-GB');
    expect(software.countriesSupported).toBe('GB');
    expect(software.offers.priceCurrency).toBe('GBP');
  });

  test('has en-GB, en-US and x-default hreflang tags', async ({ page }) => {
    await expect(page.locator('link[rel="alternate"][hreflang="en-GB"]')).toHaveAttribute('href', /uk-mortgage-calculator/);
    await expect(page.locator('link[rel="alternate"][hreflang="en-US"]')).toHaveAttribute('href', /finance\/mortgage-calculator/);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', /mortgage-calculator/);
  });

  test('long-form copy uses words like "indication" / "indicative", not "advice" or "recommend"', async ({ page }) => {
    const main = page.locator('main');
    const text = (await main.textContent() || '').toLowerCase();
    // It's OK for the word "advice" to appear in the phrase "not financial advice" etc.
    // We want to confirm the page does NOT say "we advise" or "we recommend"
    expect(text).not.toMatch(/\bwe advise\b/);
    expect(text).not.toMatch(/\bwe recommend\b/);
  });

  test('primary nav contains Finance link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Finance', includeHidden: true })).toHaveAttribute('href', '/calculators/finance/');
  });
});

test.describe('US Mortgage page retrofitted for UK sibling', () => {
  test('US page has en-GB hreflang pointing at UK sibling', async ({ page }) => {
    await page.goto('/calculators/finance/mortgage-calculator/');
    await expect(page.locator('link[rel="alternate"][hreflang="en-GB"]')).toHaveAttribute('href', /uk-mortgage-calculator/);
  });

  test('US page links to UK version at the top', async ({ page }) => {
    await page.goto('/calculators/finance/mortgage-calculator/');
    const link = page.locator('.country-switch a');
    await expect(link).toHaveAttribute('href', '/calculators/finance/uk-mortgage-calculator/');
  });
});

test.describe('Finance category hub (with UK + US mortgages)', () => {
  test('lists both US and UK mortgage calculators', async ({ page }) => {
    await page.goto('/calculators/finance/');
    await expect(page.getByRole('link', { name: 'US Mortgage Calculator', includeHidden: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'UK Mortgage Calculator', includeHidden: true })).toBeVisible();
  });
});
