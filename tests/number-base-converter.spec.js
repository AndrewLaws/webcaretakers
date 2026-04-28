// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/conversions/number-base-converter/';

test.describe('Number Base Converter page', () => {
  test('has the expected h1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Number Base Converter' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Conversions', async ({ page }) => {
    await page.goto(URL);
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Conversions', 'Number Base Converter']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.eli5')).toBeVisible();
    await expect(page.locator('.eli5')).toContainText(/alphabet/i);
  });

  test('all four standard fields are present', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('[data-nbc-field="bin"]')).toBeVisible();
    await expect(page.locator('[data-nbc-field="oct"]')).toBeVisible();
    await expect(page.locator('[data-nbc-field="dec"]')).toBeVisible();
    await expect(page.locator('[data-nbc-field="hex"]')).toBeVisible();
  });

  test('typing decimal 255 fills the other three fields with the canonical values', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-nbc-field="dec"]', '255');
    await expect(page.locator('[data-nbc-field="bin"]')).toHaveValue('11111111');
    await expect(page.locator('[data-nbc-field="oct"]')).toHaveValue('377');
    await expect(page.locator('[data-nbc-field="hex"]')).toHaveValue('ff');
  });

  test('typing hex deadbeef gives decimal 3735928559', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-nbc-field="hex"]', 'deadbeef');
    await expect(page.locator('[data-nbc-field="dec"]')).toHaveValue('3735928559');
  });

  test('typing 2 in the binary field surfaces a validation error', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-nbc-field="bin"]', '2');
    await expect(page.locator('[data-nbc-error="bin"]')).toContainText(/binary/i);
    await expect(page.locator('[data-nbc-field="bin"]')).toHaveAttribute('aria-invalid', 'true');
  });

  test('typing g in hex surfaces a validation error', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-nbc-field="hex"]', 'g');
    await expect(page.locator('[data-nbc-error="hex"]')).toContainText(/hex/i);
  });

  test('clearing the source field clears the others', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-nbc-field="dec"]', '255');
    await expect(page.locator('[data-nbc-field="hex"]')).toHaveValue('ff');
    await page.fill('[data-nbc-field="dec"]', '');
    await expect(page.locator('[data-nbc-field="hex"]')).toHaveValue('');
    await expect(page.locator('[data-nbc-field="bin"]')).toHaveValue('');
  });

  test('arbitrary base 36 with value zz fills the four standard fields', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-nbc-arb-base]', '36');
    await page.fill('[data-nbc-arb-value]', 'zz');
    await expect(page.locator('[data-nbc-field="dec"]')).toHaveValue('1295');
    await expect(page.locator('[data-nbc-field="hex"]')).toHaveValue('50f');
  });

  test('large value triggers the MAX_SAFE_INTEGER safety note', async ({ page }) => {
    await page.goto(URL);
    // 2^60 = 1152921504606846976, well past MAX_SAFE_INTEGER (2^53 - 1).
    await page.fill('[data-nbc-field="dec"]', '1152921504606846976');
    await expect(page.locator('[data-nbc-safety]')).toBeVisible();
    await expect(page.locator('[data-nbc-field="hex"]')).toHaveValue('1000000000000000');
  });

  test('zero in decimal shows zero in every base', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-nbc-field="dec"]', '0');
    await expect(page.locator('[data-nbc-field="bin"]')).toHaveValue('0');
    await expect(page.locator('[data-nbc-field="oct"]')).toHaveValue('0');
    await expect(page.locator('[data-nbc-field="hex"]')).toHaveValue('0');
  });

  test('prove-it panel renders the canonical decimal value and the BigInt call', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-nbc-field="dec"]', '255');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it]')).toContainText('Canonical decimal value');
    await expect(page.locator('[data-prove-it]')).toContainText('BigInt(255).toString(16)');
  });

  test('pushes calculator_interaction on input', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-nbc-field="dec"]', '42');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Number Base Converter')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result on conversion', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-nbc-field="hex"]', 'ff');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'Number Base Converter')
    );
    expect(evt).toBeTruthy();
    expect(evt.source_field).toBe('hex');
    expect(String(evt.decimal_value)).toBe('255');
  });

  test('pushes prove_it event when details opened', async ({ page }) => {
    await page.goto(URL);
    await page.waitForFunction(() => !!window.NumberBaseConverter);
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it]')).toHaveAttribute('open', '');
    await page.waitForFunction(() =>
      !!window.dataLayer && window.dataLayer.some(e => e.event === 'prove_it' && e.calculator_name === 'Number Base Converter')
    );
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it' && e.calculator_name === 'Number Base Converter')
    );
    expect(evt).toBeTruthy();
  });

  function parseLdBlocks(blocks) {
    return blocks.map(b => { try { return JSON.parse(b); } catch (_) { return null; } }).filter(Boolean);
  }

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = parseLdBlocks(blocks).map(b => b['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication JSON-LD names the calculator and is UtilitiesApplication', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = parseLdBlocks(blocks).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('Number Base Converter');
    expect(sa.applicationCategory).toBe('UtilitiesApplication');
  });
});

test.describe('Number Base Converter hub registration', () => {
  test('Conversions hub lists the Number Base Converter', async ({ page }) => {
    await page.goto('/calculators/conversions/');
    await expect(page.getByRole('link', { name: 'Number Base Converter', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the Number Base Converter', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Number Base Converter', includeHidden: true }).first()).toBeVisible();
  });
});
