// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/writing/flesch-reading-ease-calculator/';

test.describe('Flesch Reading Ease Score Calculator page', () => {
  test('has the expected h1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Flesch Reading Ease Score Calculator' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Writing', async ({ page }) => {
    await page.goto(URL);
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Writing', 'Flesch Reading Ease Score Calculator']);
  });

  test('has an ELI5 section', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.eli5')).toBeVisible();
    await expect(page.locator('.eli5')).toContainText(/Rudolf Flesch|harder to read/i);
  });

  test('typing simple text shows scores live', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fre-input]', 'The cat sat on the mat.');
    // Wait for debounce
    await expect(page.locator('[data-fre-words]')).toHaveText('6');
    await expect(page.locator('[data-fre-sentences]')).toHaveText('1');
    await expect(page.locator('[data-fre-syllables]')).toHaveText('6');
    await expect(page.locator('[data-fre-ease]')).toContainText(/116|115/);
    await expect(page.locator('[data-fre-band]')).toContainText(/Very easy/i);
  });

  test('empty input keeps counts at zero', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fre-input]', '');
    await expect(page.locator('[data-fre-words]')).toHaveText('0');
    await expect(page.locator('[data-fre-sentences]')).toHaveText('0');
  });

  test('prove-it panel shows the working', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fre-input]', 'The cat sat on the mat.');
    await expect(page.locator('[data-fre-words]')).toHaveText('6');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-body]')).toContainText(/Reading Ease/i);
    await expect(page.locator('[data-prove-it-body]')).toContainText(/Grade Level/i);
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fre-input]', 'Hello there.');
    await page.waitForTimeout(250);
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Flesch Reading Ease Score Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event after typing', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fre-input]', 'The cat sat on the mat.');
    await page.waitForTimeout(250);
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'Flesch Reading Ease Score Calculator')
    );
    expect(evt).toBeTruthy();
    expect(evt.words).toBe(6);
    expect(evt.sentences).toBe(1);
  });

  test('pushes prove_it event when details opened', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-prove-it] summary').click();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it' && e.calculator_name === 'Flesch Reading Ease Score Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication JSON-LD names the calculator and is BusinessApplication', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('Flesch Reading Ease Score Calculator');
    expect(sa.applicationCategory).toBe('BusinessApplication');
  });
});

test.describe('Flesch Reading Ease Score Calculator hub registration', () => {
  test('Writing hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/writing/');
    await expect(page.getByRole('link', { name: 'Flesch Reading Ease Score Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Flesch Reading Ease Score Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
