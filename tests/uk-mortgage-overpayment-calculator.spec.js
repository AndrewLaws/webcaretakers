const { test, expect } = require('@playwright/test');

test.describe('UK Mortgage Overpayment Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/property/uk-mortgage-overpayment-calculator/');
  });

  test('has the expected h1 starting with UK', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: 'UK Mortgage Overpayment Calculator' })
    ).toBeVisible();
  });

  test('has the ELI5 explainer', async ({ page }) => {
    await expect(page.locator('.eli5')).toContainText('Explain like I');
  });

  test('breadcrumb routes through Calculators > Property', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    await expect(crumbs.getByRole('link', { name: 'Calculators' })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Property' })).toHaveAttribute('href', '/calculators/property/');
    await expect(crumbs).toContainText('UK Mortgage Overpayment Calculator');
  });

  test('UK convention callout is visible at the top', async ({ page }) => {
    const cs = page.locator('.country-switch');
    await expect(cs).toBeVisible();
    await expect(cs).toContainText('UK conventions');
  });

  test('default inputs (£200k, 4.5%, 25y, £200/mo overpay) compute a real saving', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-breakdown]')).toBeVisible();
    const interestSaved = await page.locator('[data-line-interest-saved]').textContent();
    expect(interestSaved).toMatch(/£[\d,]+\.\d{2}/);
    const time = await page.locator('[data-line-time-saved]').textContent();
    expect(time).toMatch(/year/);
  });

  test('zero overpayment shows the no-saving message', async ({ page }) => {
    await page.fill('[data-monthly-over]', '0');
    await page.fill('[data-oneoff]', '0');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('No overpayment');
  });

  test('snapshot table has at least one row after calculation', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const rows = page.locator('[data-snapshots-body] tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('prove-it shows the formula and the 12-month worked example after calculation', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const proveIt = page.locator('[data-prove-it]');
    await proveIt.locator('summary').click();
    const body = proveIt.locator('[data-prove-it-body]');
    await expect(body).toContainText('Contractual monthly payment');
    await expect(body).toContainText('First 12 months, no overpayment');
    await expect(body).toContainText('First 12 months, with overpayment');
  });

  test('pushes calculator_result event with overpayment fields', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('UK Mortgage Overpayment Calculator');
    expect(typeof event.interest_saved).toBe('number');
    expect(typeof event.months_saved).toBe('number');
    expect(typeof event.term_months).toBe('number');
  });

  test('pushes prove_it event when the prove-it details panel is opened', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await page.locator('[data-prove-it] summary').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('UK Mortgage Overpayment Calculator');
  });

  test('pushes calculator_interaction event on input change', async ({ page }) => {
    await page.fill('[data-monthly-over]', '300');
    const events = await page.evaluate(() =>
      window.dataLayer.filter(e => e.event === 'calculator_interaction')
    );
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].calculator_name).toBe('UK Mortgage Overpayment Calculator');
  });

  test('has SoftwareApplication JSON-LD with en-GB and GB countriesSupported', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map(b => JSON.parse(b));
    const software = parsed.find(j => j['@type'] === 'SoftwareApplication');
    expect(software).toBeTruthy();
    expect(software.inLanguage).toBe('en-GB');
    expect(software.countriesSupported).toBe('GB');
    expect(software.applicationCategory).toBe('FinanceApplication');
    expect(software.offers.priceCurrency).toBe('GBP');
  });

  test('has FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('FAQPage');
  });

  test('has en-GB and x-default hreflang', async ({ page }) => {
    await expect(page.locator('link[rel="alternate"][hreflang="en-GB"]')).toHaveAttribute(
      'href',
      /uk-mortgage-overpayment-calculator/
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      'href',
      /uk-mortgage-overpayment-calculator/
    );
  });

  test('long-form copy is present and over 250 words', async ({ page }) => {
    const text = (await page.locator('.long-form').textContent()) || '';
    const words = text.trim().split(/\s+/).length;
    expect(words).toBeGreaterThan(250);
  });

  test('FAQ section has at least three details elements', async ({ page }) => {
    const faqDetails = page.locator('section.faq details');
    const count = await faqDetails.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('a one-off lump sum changes the interest saved figure', async ({ page }) => {
    // Run with default monthly overpayment, no one-off
    await page.fill('[data-oneoff]', '0');
    await page.locator('[data-calculate]').click();
    const without = await page.locator('[data-line-interest-saved]').textContent();
    // Add a £10k lump
    await page.fill('[data-oneoff]', '10000');
    await page.locator('[data-calculate]').click();
    const withLump = await page.locator('[data-line-interest-saved]').textContent();
    expect(withLump).not.toBe(without);
  });
});

test.describe('Property hub registration', () => {
  test('Property hub lists the UK Mortgage Overpayment Calculator', async ({ page }) => {
    await page.goto('/calculators/property/');
    await expect(
      page.getByRole('link', { name: 'UK Mortgage Overpayment Calculator', includeHidden: true }).first()
    ).toBeVisible();
  });

  test('All-calculators hub lists the UK Mortgage Overpayment Calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(
      page.getByRole('link', { name: 'UK Mortgage Overpayment Calculator', includeHidden: true }).first()
    ).toBeVisible();
  });
});
