const { test, expect } = require('@playwright/test');

test.describe('Standard Deviation Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/math/standard-deviation-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Standard Deviation Calculator' })).toBeVisible();
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

  test('classic dataset 2,4,4,4,5,5,7,9 gives population SD 2', async ({ page }) => {
    await page.locator('[data-sd-input]').fill('2, 4, 4, 4, 5, 5, 7, 9');
    await page.locator('[data-sd-mode][value="population"]').check();
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('Population standard deviation');
    await expect(page.locator('[data-result]')).toContainText('= 2');
  });

  test('mixed delimiters parse correctly', async ({ page }) => {
    await page.locator('[data-sd-input]').fill('1, 2; 3\n4 5');
    await page.locator('[data-calculate]').click();
    const grid = page.locator('[data-stats-grid]');
    await expect(grid).toContainText('Count');
    await expect(grid).toContainText('5');
  });

  test('single value flags sample SD as undefined', async ({ page }) => {
    await page.locator('[data-sd-input]').fill('42');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('undefined');
  });

  test('all identical values give SD of zero', async ({ page }) => {
    await page.locator('[data-sd-input]').fill('5, 5, 5, 5');
    await page.locator('[data-calculate]').click();
    const grid = page.locator('[data-stats-grid]');
    await expect(grid).toContainText('Population SD');
    await expect(grid).toContainText('Sample SD');
  });

  test('Welford stability: large nearly-equal numbers', async ({ page }) => {
    await page.locator('[data-sd-input]').fill('1000000000, 1000000001, 1000000002');
    await page.locator('[data-sd-mode][value="population"]').check();
    await page.locator('[data-calculate]').click();
    const grid = page.locator('[data-stats-grid]');
    // Population SD should be sqrt(2/3) ~ 0.8165
    await expect(grid).toContainText('0.8164');
  });

  test('empty input shows a clear message', async ({ page }) => {
    await page.locator('[data-sd-input]').fill('');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText(/at least one number/i);
  });

  test('Prove it panel shows the working with deviation table', async ({ page }) => {
    await page.locator('[data-sd-input]').fill('2, 4, 4, 4, 5, 5, 7, 9');
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).toContainText('Step 1');
    await expect(body).toContainText('Step 2');
    await expect(body).toContainText(/sum of squared deviations/i);
    await expect(body.locator('table.prove-it-table')).toHaveCount(1);
  });

  test('pushes calculator_result event to dataLayer', async ({ page }) => {
    await page.locator('[data-sd-input]').fill('1, 2, 3, 4, 5');
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Standard Deviation Calculator');
    expect(event.n).toBe(5);
  });

  test('opening Prove it pushes a prove_it event', async ({ page }) => {
    await page.locator('[data-sd-input]').fill('1, 2, 3');
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
    expect(event.calculator_name).toBe('Standard Deviation Calculator');
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

test.describe('Standard Deviation Calculator hub registration', () => {
  test('appears on /calculators/math/', async ({ page }) => {
    await page.goto('/calculators/math/');
    await expect(page.getByRole('link', { name: 'Standard Deviation Calculator', exact: true }).first()).toBeVisible();
  });

  test('appears on /calculators/', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Standard Deviation Calculator', exact: true }).first()).toBeVisible();
  });
});
