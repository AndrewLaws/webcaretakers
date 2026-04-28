// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/conversions/roman-numeral-converter/';

test.describe('Roman Numeral Converter page', () => {
  test('has the expected h1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Roman Numeral Converter' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Conversions', async ({ page }) => {
    await page.goto(URL);
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Conversions', 'Roman Numeral Converter']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.eli5')).toBeVisible();
    await expect(page.locator('.eli5')).toContainText(/Roman numerals are a way/i);
  });

  test('typing a number fills the Roman field', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-number]', '1984');
    await expect(page.locator('[data-rn-roman]')).toHaveValue('MCMLXXXIV');
    await expect(page.locator('[data-rn-result-value]')).toHaveText('MCMLXXXIV');
  });

  test('typing a Roman numeral fills the number field', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-roman]', 'MMXXIV');
    await expect(page.locator('[data-rn-number]')).toHaveValue('2024');
    await expect(page.locator('[data-rn-result-value]')).toHaveText('2024');
  });

  test('lowercase Roman input is normalised and parsed', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-roman]', 'mcmlxxxiv');
    await expect(page.locator('[data-rn-number]')).toHaveValue('1984');
  });

  test('rejects 4000 with a clear message', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-number]', '4000');
    await expect(page.locator('[data-rn-number-error]')).toContainText(/3,?999/);
    await expect(page.locator('[data-rn-roman]')).toHaveValue('');
  });

  test('rejects 0 with a clear message', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-number]', '0');
    await expect(page.locator('[data-rn-number-error]')).toContainText(/start at 1|whole number/i);
  });

  test('rejects decimal input', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-number]', '1.5');
    await expect(page.locator('[data-rn-number-error]')).toContainText(/whole number/i);
  });

  test('rejects IIII as non-canonical and offers IV', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-roman]', 'IIII');
    await expect(page.locator('[data-rn-roman-error]')).toContainText(/canonical|standard/i);
    await expect(page.locator('[data-rn-roman-error]')).toContainText('IV');
  });

  test('rejects mixed valid and invalid characters', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-roman]', 'X1');
    await expect(page.locator('[data-rn-roman-error]')).toContainText(/letters/i);
  });

  test('empty input clears the other field with no error', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-number]', '7');
    await expect(page.locator('[data-rn-roman]')).toHaveValue('VII');
    await page.fill('[data-rn-number]', '');
    await expect(page.locator('[data-rn-roman]')).toHaveValue('');
    await expect(page.locator('[data-rn-number-error]')).toHaveText('');
  });

  test('prove-it panel shows the working for number-to-Roman', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-number]', '1984');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-body]')).toContainText(/Greedy decomposition/i);
    await expect(page.locator('[data-prove-it-body] ol.working li')).not.toHaveCount(0);
  });

  test('prove-it panel shows the parse for Roman-to-number', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-roman]', 'XIV');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-body]')).toContainText(/Walk left to right/i);
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-number]', '5');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Roman Numeral Converter')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event after successful convert', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-rn-number]', '42');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'Roman Numeral Converter')
    );
    expect(evt).toBeTruthy();
    expect(evt.direction).toBe('number-to-roman');
    expect(evt.output_roman).toBe('XLII');
  });

  test('pushes prove_it event when details opened', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-prove-it] summary').click();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it' && e.calculator_name === 'Roman Numeral Converter')
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

  test('SoftwareApplication JSON-LD names the calculator and is EducationalApplication', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('Roman Numeral Converter');
    expect(sa.applicationCategory).toBe('EducationalApplication');
  });
});

test.describe('Roman Numeral Converter hub registration', () => {
  test('Conversions hub lists the Roman Numeral Converter', async ({ page }) => {
    await page.goto('/calculators/conversions/');
    await expect(page.getByRole('link', { name: 'Roman Numeral Converter', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the Roman Numeral Converter', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Roman Numeral Converter', includeHidden: true }).first()).toBeVisible();
  });
});
