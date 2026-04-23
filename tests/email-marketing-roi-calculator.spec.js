const { test, expect } = require('@playwright/test');

test.describe('Email Marketing ROI Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/business/email-marketing-roi-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Email Marketing ROI Calculator' })).toBeVisible();
  });

  test('has an ELI5 block', async ({ page }) => {
    const eli5 = page.locator('.eli5');
    await expect(eli5).toBeVisible();
    await expect(eli5).toContainText("Explain like I'm 5");
  });

  test('breadcrumb routes through Calculators > Business', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators', includeHidden: true })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Business', includeHidden: true })).toHaveAttribute('href', '/calculators/business/');
  });

  test('default inputs produce an ROI result', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const result = await page.locator('[data-result]').textContent();
    expect(result).toMatch(/ROI: [+-]?\d+\.?\d*%/);
  });

  test('results panel shows all key lines', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-line-emails-sent]')).not.toHaveText('—');
    await expect(page.locator('[data-line-clicks]')).not.toHaveText('—');
    await expect(page.locator('[data-line-conversions]')).not.toHaveText('—');
    await expect(page.locator('[data-line-monthly-revenue]')).not.toHaveText('—');
    await expect(page.locator('[data-line-monthly-profit]')).not.toHaveText('—');
    await expect(page.locator('[data-line-roi]')).not.toHaveText('—');
    await expect(page.locator('[data-line-breakeven]')).not.toHaveText('—');
    await expect(page.locator('[data-line-status]')).not.toHaveText('—');
  });

  test('currency toggle switches symbols on labels and results', async ({ page }) => {
    await page.selectOption('[data-currency]', 'USD');
    const symbols = await page.locator('[data-currency-symbol]').allTextContents();
    expect(symbols.every(s => s === '$')).toBe(true);
    await page.locator('[data-calculate]').click();
    const revenue = await page.locator('[data-line-monthly-revenue]').textContent();
    expect(revenue).toContain('$');
  });

  test('profitable scenario shows positive status', async ({ page }) => {
    // Default inputs produce a profitable scenario (list 5000, 4 sends, 2.5% CTR, 2% conv, £50/conv, £80 cost)
    await page.locator('[data-calculate]').click();
    const status = await page.locator('[data-line-status]').textContent();
    expect(status).toContain('Profitable');
  });

  test('loss scenario shows not-yet-profitable status', async ({ page }) => {
    await page.fill('[data-list-size]', '100');
    await page.fill('[data-click-rate]', '0.5');
    await page.fill('[data-conversion-rate]', '0.5');
    await page.fill('[data-revenue-per-conversion]', '10');
    await page.locator('[data-calculate]').click();
    const status = await page.locator('[data-line-status]').textContent();
    expect(status).toContain('Not yet profitable');
  });

  test('period label in heading updates to match input', async ({ page }) => {
    await page.fill('[data-period]', '6');
    await page.locator('[data-calculate]').click();
    const periodLabel = await page.locator('[data-label-period]').textContent();
    expect(periodLabel).toBe('6');
  });

  test('Prove-it panel populates after calculating', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).not.toBeEmpty();
  });

  test('pushes calculator_result event to dataLayer', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Email Marketing ROI Calculator');
    expect(typeof event.list_size).toBe('number');
    expect(typeof event.monthly_revenue).toBe('number');
    expect(typeof event.is_profitable).toBe('boolean');
    expect(event.currency).toBe('GBP');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('primary nav contains Business link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Business', includeHidden: true })).toHaveAttribute('href', '/calculators/business/');
  });
});

test.describe('Business hub lists the Email Marketing ROI Calculator', () => {
  test('Email Marketing ROI Calculator shows on the Business hub', async ({ page }) => {
    await page.goto('/calculators/business/');
    await expect(page.getByRole('link', { name: 'Email Marketing ROI Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
