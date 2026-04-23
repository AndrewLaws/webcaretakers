const { test, expect } = require('@playwright/test');

test.describe('Loan Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/finance/loan-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Loan Calculator' })).toBeVisible();
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

  test('default inputs produce a monthly payment and amortisation snapshot', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const monthly = await page.locator('[data-line-monthly]').textContent();
    expect(monthly).toMatch(/£[\d,]+\.\d{2}/);
    await expect(page.locator('[data-line-first-principal]')).not.toHaveText('—');
    await expect(page.locator('[data-line-last-principal]')).not.toHaveText('—');
  });

  test('currency toggle switches symbols on labels and results', async ({ page }) => {
    await page.selectOption('[data-currency]', 'USD');
    // Label symbol updates immediately
    const symbols = await page.locator('[data-currency-symbol]').allTextContents();
    expect(symbols.every(s => s === '$')).toBe(true);
    await page.locator('[data-calculate]').click();
    const monthly = await page.locator('[data-line-monthly]').textContent();
    expect(monthly).toMatch(/\$[\d,]+\.\d{2}/);
  });

  test('euro currency option works', async ({ page }) => {
    await page.selectOption('[data-currency]', 'EUR');
    await page.locator('[data-calculate]').click();
    const monthly = await page.locator('[data-line-monthly]').textContent();
    expect(monthly).toContain('€');
  });

  test('extra payment shows savings summary', async ({ page }) => {
    await page.fill('[data-extra]', '100');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-extra-summary]')).toBeVisible();
    const saved = await page.locator('[data-line-extra-saved]').textContent();
    expect(saved).toMatch(/\d+ months?/);
    const interestSaved = await page.locator('[data-line-extra-interest]').textContent();
    expect(interestSaved).toMatch(/£[\d,]+\.\d{2}/);
  });

  test('zero extra payment hides the savings block', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-extra-summary]')).toBeHidden();
  });

  test('pushes calculator_result event to dataLayer with currency and extra flag', async ({ page }) => {
    await page.selectOption('[data-currency]', 'USD');
    await page.fill('[data-extra]', '50');
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Loan Calculator');
    expect(event.currency).toBe('USD');
    expect(event.has_extra_payment).toBe(true);
    expect(typeof event.loan_principal).toBe('number');
    expect(typeof event.apr_percent).toBe('number');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('Prove-it panel populates after calculating', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).not.toBeEmpty();
  });

  test('primary nav contains Finance link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Finance', includeHidden: true })).toHaveAttribute('href', '/calculators/finance/');
  });
});

test.describe('Finance hub lists the Loan Calculator', () => {
  test('Loan Calculator shows on the Finance hub', async ({ page }) => {
    await page.goto('/calculators/finance/');
    await expect(page.getByRole('link', { name: 'Loan Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
