const { test, expect } = require('@playwright/test');

test.describe('BMI Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/health/bmi-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'BMI Calculator' })).toBeVisible();
  });

  test('has an ELI5 block', async ({ page }) => {
    const eli5 = page.locator('.eli5');
    await expect(eli5).toBeVisible();
    await expect(eli5).toContainText("Explain like I'm 5");
  });

  test('breadcrumb routes through Calculators > Health', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators', includeHidden: true })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Health', includeHidden: true })).toHaveAttribute('href', '/calculators/health/');
  });

  test('default metric inputs (70 kg, 175 cm) calculate to 22.9 (Normal)', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('22.9');
    await expect(page.locator('[data-category]')).toContainText('Normal');
  });

  test('imperial toggle swaps the height row', async ({ page }) => {
    await page.selectOption('[data-units]', 'imperial');
    await expect(page.locator('[data-row-height-metric]')).toBeHidden();
    await expect(page.locator('[data-row-height-imperial]')).toBeVisible();
  });

  test('imperial inputs (154 lb, 5ft 9in) calculate to ~22.7 (Normal)', async ({ page }) => {
    await page.selectOption('[data-units]', 'imperial');
    await page.locator('[data-weight]').fill('154');
    await page.locator('[data-height-ft]').fill('5');
    await page.locator('[data-height-in]').fill('9');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('22.7');
    await expect(page.locator('[data-category]')).toContainText('Normal');
  });

  test('obese category is shown for 110 kg at 170 cm', async ({ page }) => {
    await page.locator('[data-weight]').fill('110');
    await page.locator('[data-height-cm]').fill('170');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-category]')).toContainText('Obese');
  });

  test('pushes calculator_result event to dataLayer with category and units', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('BMI Calculator');
    expect(event.calculator_category).toBe('Normal');
    expect(event.calculator_units).toBe('metric');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('Prove-it panel shows the working and category after calculating', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).toContainText('70');
    await expect(body).toContainText('Normal');
  });

  test('primary nav contains Health link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Health', includeHidden: true })).toHaveAttribute('href', '/calculators/health/');
  });
});

test.describe('Health category hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/health/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Health calculators' })).toBeVisible();
  });

  test('lists the BMI Calculator', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'BMI Calculator', includeHidden: true })).toBeVisible();
  });

  test('has CollectionPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('CollectionPage');
  });
});
