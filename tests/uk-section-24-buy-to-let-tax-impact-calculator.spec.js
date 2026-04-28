const { test, expect } = require('@playwright/test');

const PAGE_URL = '/calculators/property/uk-section-24-buy-to-let-tax-impact-calculator/';

test.describe('UK Section 24 Buy-to-Let Tax Impact Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
  });

  test('has the expected H1 starting with UK', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: 'UK Section 24 Buy-to-Let Tax Impact Calculator' })
    ).toBeVisible();
  });

  test('has the ELI5 explainer', async ({ page }) => {
    await expect(page.locator('.eli5')).toContainText('Explain like I');
  });

  test('breadcrumbs route through Calculators > Property', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    await expect(crumbs.getByRole('link', { name: 'Calculators' })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Property' })).toHaveAttribute('href', '/calculators/property/');
    await expect(crumbs).toContainText('UK Section 24 Buy-to-Let Tax Impact Calculator');
  });

  test('UK convention callout is at the top', async ({ page }) => {
    const cs = page.locator('.country-switch');
    await expect(cs).toBeVisible();
    await expect(cs).toContainText('UK only');
  });

  test('default inputs (£20k rent, £10k MI, £3k exp, £30k other) compute and show the breakdown', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-breakdown]')).toBeVisible();
    const pre = await page.locator('[data-line-pre-tax]').textContent();
    const post = await page.locator('[data-line-post-tax]').textContent();
    expect(pre).toMatch(/£[\d,]+\.\d{2}/);
    expect(post).toMatch(/£[\d,]+\.\d{2}/);
  });

  test('basic-rate landlord with low rental shows zero hit', async ({ page }) => {
    await page.fill('[data-rental-income]', '8000');
    await page.fill('[data-mortgage-interest]', '4000');
    await page.fill('[data-other-expenses]', '1000');
    await page.fill('[data-other-income]', '15000');
    await page.locator('[data-calculate]').click();
    const hit = await page.locator('[data-line-hit]').textContent();
    expect(hit).toContain('£0.00');
  });

  test('Section 24 pushes a basic-rate landlord into the higher band', async ({ page }) => {
    await page.fill('[data-rental-income]', '30000');
    await page.fill('[data-mortgage-interest]', '20000');
    await page.fill('[data-other-expenses]', '2000');
    await page.fill('[data-other-income]', '40000');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-line-band]')).toHaveText('Yes');
    const hit = await page.locator('[data-line-hit]').textContent();
    expect(hit).not.toContain('£0.00');
  });

  test('limited company toggle shows corporation tax messaging', async ({ page }) => {
    await page.locator('[data-ownership][value="company"]').check();
    await page.locator('[data-calculate]').click();
    const result = await page.locator('[data-result]').textContent();
    expect(result).toContain('Limited company');
    expect(result).toContain('corporation tax');
  });

  test('prove-it shows full step-by-step working after calculation', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const proveIt = page.locator('[data-prove-it]');
    await proveIt.locator('summary').click();
    const body = proveIt.locator('[data-prove-it-body]');
    await expect(body).toContainText('Pre-2017 rules');
    await expect(body).toContainText('Section 24 rules');
    await expect(body).toContainText('Limited company route');
    await expect(body).toContainText('Tax credit base');
  });

  test('pushes calculator_result event with Section 24 fields', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('UK Section 24 Buy-to-Let Tax Impact Calculator');
    expect(typeof event.section_24_hit).toBe('number');
    expect(typeof event.pre_section_24_tax).toBe('number');
    expect(typeof event.post_section_24_tax).toBe('number');
    expect(typeof event.corporation_tax).toBe('number');
  });

  test('pushes prove_it event when the prove-it details panel is opened', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await page.locator('[data-prove-it] summary').click();
    // toggle event fires asynchronously after the summary click
    await page.waitForFunction(() =>
      window.dataLayer && window.dataLayer.some(e => e.event === 'prove_it')
    );
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('UK Section 24 Buy-to-Let Tax Impact Calculator');
  });

  test('pushes calculator_interaction event on input change', async ({ page }) => {
    await page.fill('[data-rental-income]', '25000');
    const events = await page.evaluate(() =>
      window.dataLayer.filter(e => e.event === 'calculator_interaction')
    );
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].calculator_name).toBe('UK Section 24 Buy-to-Let Tax Impact Calculator');
  });

  test('SoftwareApplication JSON-LD has en-GB and GB country signals', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map(b => JSON.parse(b));
    const software = parsed.find(j => j['@type'] === 'SoftwareApplication');
    expect(software).toBeTruthy();
    expect(software.inLanguage).toBe('en-GB');
    expect(software.countriesSupported).toBe('GB');
    expect(software.applicationCategory).toBe('FinanceApplication');
  });

  test('FAQPage JSON-LD has at least three Q&As', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map(b => JSON.parse(b));
    const faq = parsed.find(j => j['@type'] === 'FAQPage');
    expect(faq).toBeTruthy();
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
  });

  test('appears on the Property hub page', async ({ page }) => {
    await page.goto('/calculators/property/');
    const link = page.getByRole('link', { name: 'UK Section 24 Buy-to-Let Tax Impact Calculator' });
    await expect(link).toBeVisible();
  });

  test('appears on the All Calculators index', async ({ page }) => {
    await page.goto('/calculators/');
    const link = page.getByRole('link', { name: 'UK Section 24 Buy-to-Let Tax Impact Calculator' });
    await expect(link).toBeVisible();
  });
});
