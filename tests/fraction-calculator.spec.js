const { test, expect } = require('@playwright/test');

test.describe('Fraction Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/math/fraction-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Fraction Calculator' })).toBeVisible();
  });

  test('has an ELI5 block', async ({ page }) => {
    const eli5 = page.locator('.eli5');
    await expect(eli5).toBeVisible();
    await expect(eli5).toContainText("Explain like I'm 5");
  });

  test('breadcrumb routes through Calculators > Math', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators' })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Math' })).toHaveAttribute('href', '/calculators/math/');
  });

  test('default values give 1/2 + 1/3 = 5/6', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('5/6');
  });

  test('shows the decimal equivalent', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result-decimal]')).toContainText('Decimal');
    await expect(page.locator('[data-result-decimal]')).toContainText('0.833');
  });

  test('multiplication 2/3 x 3/4 = 1/2', async ({ page }) => {
    await page.locator('[data-a-numer]').fill('2');
    await page.locator('[data-a-denom]').fill('3');
    await page.locator('[data-b-numer]').fill('3');
    await page.locator('[data-b-denom]').fill('4');
    await page.selectOption('[data-op]', '*');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('1/2');
  });

  test('division by zero fraction is rejected with a clear message', async ({ page }) => {
    await page.locator('[data-b-numer]').fill('0');
    await page.locator('[data-b-denom]').fill('5');
    await page.selectOption('[data-op]', '/');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText(/divide by zero/i);
  });

  test('zero denominator is rejected', async ({ page }) => {
    await page.locator('[data-a-denom]').fill('0');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText(/[Dd]enominator/);
  });

  test('mixed-number input: 1 1/2 + 2 1/3 = 23/6 (3 5/6)', async ({ page }) => {
    await page.locator('[data-a-whole]').fill('1');
    await page.locator('[data-a-numer]').fill('1');
    await page.locator('[data-a-denom]').fill('2');
    await page.locator('[data-b-whole]').fill('2');
    await page.locator('[data-b-numer]').fill('1');
    await page.locator('[data-b-denom]').fill('3');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('23/6');
    await expect(page.locator('[data-result]')).toContainText('3 5/6');
  });

  test('whole-number result is shown without /1', async ({ page }) => {
    await page.locator('[data-a-numer]').fill('1');
    await page.locator('[data-a-denom]').fill('2');
    await page.locator('[data-b-numer]').fill('1');
    await page.locator('[data-b-denom]').fill('2');
    await page.locator('[data-calculate]').click();
    // 1/2 + 1/2 = 1
    await expect(page.locator('[data-result]')).toContainText(/=\s*1\b/);
    await expect(page.locator('[data-result]')).not.toContainText('1/1');
  });

  test('Prove it panel shows the working after calculating', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).toContainText('Common denominator');
    await expect(body).toContainText('Decimal');
  });

  test('pushes calculator_result event to dataLayer', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Fraction Calculator');
    expect(event.calculator_op).toBe('+');
  });

  test('opening Prove it pushes a prove_it event', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await page.evaluate(() => {
      var d = document.querySelector('[data-prove-it]');
      d.open = true;
      d.dispatchEvent(new Event('toggle'));
    });
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Fraction Calculator');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication uses EducationalApplication category', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa.applicationCategory).toBe('EducationalApplication');
  });
});

test.describe('Fraction Calculator hub registration', () => {
  test('appears on /calculators/math/', async ({ page }) => {
    await page.goto('/calculators/math/');
    await expect(page.getByRole('link', { name: 'Fraction Calculator', exact: true }).first()).toBeVisible();
  });

  test('appears on /calculators/', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Fraction Calculator', exact: true }).first()).toBeVisible();
  });
});
