const { test, expect } = require('@playwright/test');

test.describe('Percentage Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/math/percentage-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Percentage Calculator' })).toBeVisible();
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

  test('default mode (percent-of) calculates 15% of 200 = 30', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('15% of 200 is 30');
  });

  test('what-percent mode calculates 50 is 25% of 200', async ({ page }) => {
    await page.selectOption('[data-mode]', 'what-percent');
    await page.locator('[name="a"]').fill('50');
    await page.locator('[name="b"]').fill('200');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('50 is 25% of 200');
  });

  test('change mode calculates 100 to 150 = +50%', async ({ page }) => {
    await page.selectOption('[data-mode]', 'change');
    await page.locator('[name="a"]').fill('100');
    await page.locator('[name="b"]').fill('150');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('+50%');
  });

  test('pushes calculator_result event to dataLayer with mode', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Percentage Calculator');
    expect(event.calculator_mode).toBe('percent-of');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('Prove-it panel shows the working after calculating', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).toContainText('15');
    await expect(body).toContainText('200');
    await expect(body).toContainText('30');
  });
});

test.describe('Homepage landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has an h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Free online calculators');
  });

  test('does not have an inline calculator', async ({ page }) => {
    await expect(page.locator('[data-calculator]')).toHaveCount(0);
  });

  test('all-calculators hub features every live calculator from categories.json', async ({ page }) => {
    await page.goto('/calculators/');
    const fs = require('fs');
    const path = require('path');
    const categories = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'categories.json'), 'utf8')
    );
    const tools = categories.categories.flatMap((c) => c.tools);
    for (const tool of tools) {
      await expect(page.getByRole('link', { name: tool.name, exact: true }).first()).toBeVisible();
    }
  });

  test('links to the all-calculators hub', async ({ page }) => {
    await expect(page.getByRole('link', { name: /See all calculators/ }).first()).toHaveAttribute('href', '/calculators/');
  });

  test('lists the site rules', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toContainText('No sign-up');
    await expect(main).toContainText('Show the workings');
  });
});
