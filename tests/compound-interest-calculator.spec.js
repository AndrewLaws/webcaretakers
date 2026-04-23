const { test, expect } = require('@playwright/test');

test.describe('Compound Interest Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/finance/compound-interest-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Compound Interest Calculator' })).toBeVisible();
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

  test('default inputs produce a final balance', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const result = await page.locator('[data-result]').textContent();
    expect(result).toMatch(/£[\d,]+\.\d{2}/);
    await expect(page.locator('[data-line-final]')).not.toHaveText('—');
    await expect(page.locator('[data-line-interest]')).not.toHaveText('—');
  });

  test('currency toggle switches symbols', async ({ page }) => {
    await page.selectOption('[data-currency]', 'USD');
    const symbols = await page.locator('[data-currency-symbol]').allTextContents();
    expect(symbols.every(s => s === '$')).toBe(true);
    await page.locator('[data-calculate]').click();
    const final = await page.locator('[data-line-final]').textContent();
    expect(final).toContain('$');
  });

  test('inflation toggle shows real balance block', async ({ page }) => {
    await page.fill('[data-inflation]', '2');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-real-block]')).toBeVisible();
    await expect(page.locator('[data-line-real]')).not.toHaveText('—');
  });

  test('zero inflation hides real balance block', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-real-block]')).toBeHidden();
  });

  test('year-by-year table populates with rows', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const rows = await page.locator('[data-year-rows] tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('Prove-it panel populates after calculating', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).not.toBeEmpty();
  });

  test('pushes calculator_result event to dataLayer', async ({ page }) => {
    await page.fill('[data-inflation]', '2');
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Compound Interest Calculator');
    expect(typeof event.result_value).toBe('number');
    expect(event.has_inflation).toBe(true);
    expect(event.currency).toBe('GBP');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('primary nav contains Finance link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Finance', includeHidden: true })).toHaveAttribute('href', '/calculators/finance/');
  });
});

test.describe('Finance hub lists the Compound Interest Calculator', () => {
  test('Compound Interest Calculator shows on the Finance hub', async ({ page }) => {
    await page.goto('/calculators/finance/');
    await expect(page.getByRole('link', { name: 'Compound Interest Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
