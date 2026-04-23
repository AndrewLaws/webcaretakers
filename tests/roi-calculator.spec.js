const { test, expect } = require('@playwright/test');

test.describe('ROI Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/business/roi-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'ROI Calculator' })).toBeVisible();
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
    const roi = await page.locator('[data-line-roi]').textContent();
    expect(roi).toMatch(/[+-]?\d+\.?\d*%/);
    await expect(page.locator('[data-line-profit]')).not.toHaveText('—');
    await expect(page.locator('[data-line-multiple]')).not.toHaveText('—');
  });

  test('shows net profit in GBP by default', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const profit = await page.locator('[data-line-profit]').textContent();
    expect(profit).toContain('£');
  });

  test('currency toggle switches symbol', async ({ page }) => {
    await page.selectOption('[data-currency]', 'USD');
    const symbols = await page.locator('[data-currency-symbol]').allTextContents();
    expect(symbols.every(s => s === '$')).toBe(true);
    await page.locator('[data-calculate]').click();
    const profit = await page.locator('[data-line-profit]').textContent();
    expect(profit).toContain('$');
  });

  test('with period shows annualised CAGR block', async ({ page }) => {
    await page.fill('[data-period-years]', '5');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-annualised-block]')).toBeVisible();
    const cagr = await page.locator('[data-line-cagr]').textContent();
    expect(cagr).toMatch(/[+-]?\d+\.?\d*% per year/);
  });

  test('without period hides annualised block', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-annualised-block]')).toBeHidden();
  });

  test('loss shows break-even gain block', async ({ page }) => {
    await page.fill('[data-cost]', '1000');
    await page.fill('[data-final]', '700');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-breakeven-block]')).toBeVisible();
    const be = await page.locator('[data-line-breakeven]').textContent();
    expect(be).toMatch(/\+\d+\.?\d*%/);
  });

  test('profit hides break-even block', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-breakeven-block]')).toBeHidden();
  });

  test('Prove-it panel populates after calculating', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).not.toBeEmpty();
  });

  test('pushes calculator_result event to dataLayer', async ({ page }) => {
    await page.fill('[data-period-years]', '3');
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('ROI Calculator');
    expect(typeof event.roi_percent).toBe('number');
    expect(event.has_period).toBe(true);
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

test.describe('Business hub lists the ROI Calculator', () => {
  test('ROI Calculator shows on the Business hub', async ({ page }) => {
    await page.goto('/calculators/business/');
    await expect(page.getByRole('link', { name: 'ROI Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
