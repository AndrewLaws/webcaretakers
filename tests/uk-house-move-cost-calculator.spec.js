const { test, expect } = require('@playwright/test');

test.describe('UK House Move Cost Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/property/uk-house-move-cost-calculator/');
  });

  test('has the expected h1 starting with UK', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: 'UK House Move Cost Calculator' })
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
    await expect(crumbs).toContainText('UK House Move Cost Calculator');
  });

  test('UK convention callout is visible at the top', async ({ page }) => {
    const cs = page.locator('.country-switch');
    await expect(cs).toBeVisible();
    await expect(cs).toContainText('UK only');
  });

  test('default inputs compute a real total', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-breakdown]')).toBeVisible();
    const result = await page.locator('[data-result]').textContent();
    expect(result).toMatch(/Estimated total: £[\d,]+/);
    const totalMid = await page.locator('[data-total-mid]').textContent();
    expect(totalMid).toMatch(/£[\d,]+/);
  });

  test('items table has rows after calculation', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const rows = page.locator('[data-items-body] tr');
    expect(await rows.count()).toBeGreaterThan(2);
  });

  test('not selling removes the estate agent line', async ({ page }) => {
    await page.locator('[data-selling]').uncheck();
    await page.locator('[data-calculate]').click();
    const tableText = await page.locator('[data-items-body]').textContent();
    expect(tableText).not.toContain('Estate agent');
    expect(tableText).not.toContain('EPC');
  });

  test('FTB at £290k in England gives £0 stamp duty in the breakdown', async ({ page }) => {
    await page.fill('[data-price]', '290000');
    await page.selectOption('[data-buyer]', 'first_time');
    await page.selectOption('[data-country]', 'england_ni');
    await page.locator('[data-calculate]').click();
    const tableText = await page.locator('[data-items-body]').textContent();
    expect(tableText).toContain('first-time buyer relief');
    // First row should be the stamp duty line at £0
    const firstRow = await page.locator('[data-items-body] tr').first().textContent();
    expect(firstRow).toMatch(/£0/);
  });

  test('Wales LTT shows the LTT label after calculation', async ({ page }) => {
    await page.fill('[data-price]', '300000');
    await page.selectOption('[data-country]', 'wales');
    await page.locator('[data-calculate]').click();
    const tableText = await page.locator('[data-items-body]').textContent();
    expect(tableText).toContain('LTT');
  });

  test('prove-it shows the band-by-band stamp duty table after calculation', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const proveIt = page.locator('[data-prove-it]');
    await proveIt.locator('summary').click();
    const body = proveIt.locator('[data-prove-it-body]');
    await expect(body).toContainText('band-by-band');
    await expect(body).toContainText('Every line that fed the total');
  });

  test('pushes calculator_result event with stamp_duty and totals', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('UK House Move Cost Calculator');
    expect(typeof event.stamp_duty).toBe('number');
    expect(typeof event.total_mid).toBe('number');
    expect(event.country).toBe('england_ni');
  });

  test('pushes prove_it event when the prove-it details panel is opened', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await page.locator('[data-prove-it] summary').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('UK House Move Cost Calculator');
  });

  test('pushes calculator_interaction event on input change', async ({ page }) => {
    await page.fill('[data-price]', '500000');
    const events = await page.evaluate(() =>
      window.dataLayer.filter(e => e.event === 'calculator_interaction')
    );
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].calculator_name).toBe('UK House Move Cost Calculator');
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

  test('has FAQPage JSON-LD with at least three questions', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map(b => JSON.parse(b));
    const faq = parsed.find(j => j['@type'] === 'FAQPage');
    expect(faq).toBeTruthy();
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
  });

  test('has en-GB and x-default hreflang', async ({ page }) => {
    await expect(page.locator('link[rel="alternate"][hreflang="en-GB"]')).toHaveAttribute(
      'href',
      /uk-house-move-cost-calculator/
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      'href',
      /uk-house-move-cost-calculator/
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
});

test.describe('Property hub registration', () => {
  test('Property hub lists the UK House Move Cost Calculator', async ({ page }) => {
    await page.goto('/calculators/property/');
    await expect(
      page.getByRole('link', { name: 'UK House Move Cost Calculator', includeHidden: true }).first()
    ).toBeVisible();
  });

  test('All-calculators hub lists the UK House Move Cost Calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(
      page.getByRole('link', { name: 'UK House Move Cost Calculator', includeHidden: true }).first()
    ).toBeVisible();
  });
});
