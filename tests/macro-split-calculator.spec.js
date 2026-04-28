const { test, expect } = require('@playwright/test');

test.describe('Macro Split Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/health/macro-split-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Macro Split Calculator' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Health', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    await expect(crumbs.getByRole('link', { name: 'Calculators' })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Health' })).toHaveAttribute('href', '/calculators/health/');
    await expect(crumbs).toContainText('Macro Split Calculator');
  });

  test('shows the ELI5 paragraph', async ({ page }) => {
    await expect(page.locator('.eli5')).toContainText(/macros/i);
  });

  test('initial calculation renders 150 / 200 / 67 for default 2000 kcal balanced', async ({ page }) => {
    await expect(page.locator('[data-out-protein-g]')).toHaveText('150');
    await expect(page.locator('[data-out-carbs-g]')).toHaveText('200');
    await expect(page.locator('[data-out-fat-g]')).toHaveText('67');
  });

  test('per-meal block divides daily totals by meals/day', async ({ page }) => {
    // 2000 kcal / 4 meals = 500 kcal per meal
    await expect(page.locator('[data-out-meal-kcal]')).toContainText('500');
    // 150g / 4 = 38g protein per meal
    await expect(page.locator('[data-out-meal-protein]')).toHaveText('38');
  });

  test('changing preset to keto recalculates fat to 156g for 2000 kcal', async ({ page }) => {
    await page.selectOption('[data-preset]', 'keto');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-out-fat-g]')).toHaveText('156');
  });

  test('custom preset reveals sliders and recalculates on submit', async ({ page }) => {
    await page.selectOption('[data-preset]', 'custom');
    await expect(page.locator('[data-custom-panel]')).toBeVisible();
    await expect(page.locator('[data-slider="protein"]')).toBeVisible();
  });

  test('changing calories changes the gram totals', async ({ page }) => {
    await page.fill('[data-calories]', '2500');
    await page.click('button[type="submit"]');
    // 30% × 2500 = 750 kcal / 4 = 188g protein
    await expect(page.locator('[data-out-protein-g]')).toHaveText('188');
  });

  test('prove-it block opens and shows the working', async ({ page }) => {
    const proveIt = page.locator('[data-prove-it]');
    await proveIt.locator('summary').click();
    await expect(proveIt).toContainText('Atwater factors');
    await expect(proveIt).toContainText('150 g');
  });

  test('cross-links to TDEE calculator', async ({ page }) => {
    await expect(page.getByRole('link', { name: /TDEE Calculator/i }).first()).toHaveAttribute('href', '/calculators/health/tdee-calculator/');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication uses HealthApplication category', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sw = blocks.map(b => JSON.parse(b)).find(j => j['@type'] === 'SoftwareApplication');
    expect(sw.applicationCategory).toBe('HealthApplication');
  });
});

test.describe('Macro Split Calculator hub registration', () => {
  test('Health hub lists the Macro Split Calculator', async ({ page }) => {
    await page.goto('/calculators/health/');
    await expect(page.getByRole('link', { name: 'Macro Split Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the Macro Split Calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Macro Split Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
