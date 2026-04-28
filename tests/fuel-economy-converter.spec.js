// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/conversions/fuel-economy-converter/';

test.describe('Fuel Economy Converter page', () => {
  test('has the expected h1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Fuel Economy Converter' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Conversions', async ({ page }) => {
    await page.goto(URL);
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Conversions', 'Fuel Economy Converter']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.eli5')).toBeVisible();
    await expect(page.locator('.eli5')).toContainText(/different countries/i);
  });

  test('all four input fields are present', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('[data-fec-field="mpgUk"]')).toBeVisible();
    await expect(page.locator('[data-fec-field="mpgUs"]')).toBeVisible();
    await expect(page.locator('[data-fec-field="l100km"]')).toBeVisible();
    await expect(page.locator('[data-fec-field="kml"]')).toBeVisible();
  });

  test('typing MPG-UK fills the other three fields', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fec-field="mpgUk"]', '30');
    await expect(page.locator('[data-fec-field="l100km"]')).toHaveValue('9.42');
    const mpgUs = await page.locator('[data-fec-field="mpgUs"]').inputValue();
    expect(parseFloat(mpgUs)).toBeGreaterThan(24);
    expect(parseFloat(mpgUs)).toBeLessThan(26);
    const kml = await page.locator('[data-fec-field="kml"]').inputValue();
    expect(parseFloat(kml)).toBeGreaterThan(10);
    expect(parseFloat(kml)).toBeLessThan(11);
  });

  test('typing L/100km fills the other three fields', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fec-field="l100km"]', '5');
    await expect(page.locator('[data-fec-field="kml"]')).toHaveValue('20');
    const mpgUk = await page.locator('[data-fec-field="mpgUk"]').inputValue();
    expect(parseFloat(mpgUk)).toBeGreaterThan(56);
    expect(parseFloat(mpgUk)).toBeLessThan(57);
  });

  test('typing km/L fills the other three fields', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fec-field="kml"]', '20');
    await expect(page.locator('[data-fec-field="l100km"]')).toHaveValue('5');
  });

  test('zero input clears the other fields with no crash', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fec-field="mpgUk"]', '0');
    await expect(page.locator('[data-fec-field="l100km"]')).toHaveValue('');
    await expect(page.locator('[data-fec-field="mpgUs"]')).toHaveValue('');
    await expect(page.locator('[data-fec-field="kml"]')).toHaveValue('');
  });

  test('negative input clears the other fields', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fec-field="mpgUs"]', '-5');
    await expect(page.locator('[data-fec-field="mpgUk"]')).toHaveValue('');
  });

  test('empty input keeps everything empty', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fec-field="mpgUk"]', '40');
    await page.fill('[data-fec-field="mpgUk"]', '');
    await expect(page.locator('[data-fec-field="l100km"]')).toHaveValue('');
  });

  test('round-trip MPG-UK to L/100km back to MPG-UK is stable', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fec-field="mpgUk"]', '40');
    const l100 = await page.locator('[data-fec-field="l100km"]').inputValue();
    expect(l100).not.toBe('');
    await page.fill('[data-fec-field="mpgUk"]', '');
    await page.fill('[data-fec-field="l100km"]', l100);
    const back = await page.locator('[data-fec-field="mpgUk"]').inputValue();
    expect(parseFloat(back)).toBeCloseTo(40, 0);
  });

  test('very high MPG produces a small L/100km', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fec-field="mpgUk"]', '100');
    const l100 = await page.locator('[data-fec-field="l100km"]').inputValue();
    expect(parseFloat(l100)).toBeLessThan(3);
  });

  test('very low MPG-US produces a large L/100km', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fec-field="mpgUs"]', '5');
    const l100 = await page.locator('[data-fec-field="l100km"]').inputValue();
    expect(parseFloat(l100)).toBeGreaterThan(40);
  });

  test('source-of-truth marker highlights the last edited card', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fec-field="kml"]', '15');
    await expect(page.locator('[data-fec-card="kml"]')).toHaveClass(/fec-card--source/);
    await expect(page.locator('[data-fec-card="mpgUk"]')).not.toHaveClass(/fec-card--source/);
    await page.fill('[data-fec-field="mpgUk"]', '40');
    await expect(page.locator('[data-fec-card="mpgUk"]')).toHaveClass(/fec-card--source/);
  });

  test('prove-it panel shows the conversion factors', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it]')).toContainText(/4\.54609/);
    await expect(page.locator('[data-prove-it]')).toContainText(/3\.785411784/);
    await expect(page.locator('[data-prove-it]')).toContainText(/1\.609344/);
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fec-field="mpgUk"]', '40');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Fuel Economy Converter')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event after a conversion', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-fec-field="mpgUk"]', '30');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'Fuel Economy Converter')
    );
    expect(evt).toBeTruthy();
    expect(evt.source_field).toBe('mpgUk');
  });

  test('pushes prove_it event when details opened', async ({ page }) => {
    await page.goto(URL);
    // Ensure the page JS has had a chance to attach the toggle listener.
    await page.waitForFunction(() => !!window.FuelEconomyConverter);
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it]')).toHaveAttribute('open', '');
    await page.waitForFunction(() =>
      !!window.dataLayer && window.dataLayer.some(e => e.event === 'prove_it' && e.calculator_name === 'Fuel Economy Converter')
    );
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it' && e.calculator_name === 'Fuel Economy Converter')
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
    expect(sa.name).toBe('Fuel Economy Converter');
    expect(sa.applicationCategory).toBe('UtilitiesApplication');
  });
});

test.describe('Fuel Economy Converter hub registration', () => {
  test('Conversions hub lists the Fuel Economy Converter', async ({ page }) => {
    await page.goto('/calculators/conversions/');
    await expect(page.getByRole('link', { name: 'Fuel Economy Converter', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the Fuel Economy Converter', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Fuel Economy Converter', includeHidden: true }).first()).toBeVisible();
  });
});
