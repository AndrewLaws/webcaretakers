// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/fun/decision-wheel/';

test.describe('Decision Wheel page', () => {
  test('has the expected h1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Decision Wheel' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Fun', async ({ page }) => {
    await page.goto(URL);
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Fun', 'Decision Wheel']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.eli5')).toBeVisible();
    await expect(page.locator('.eli5')).toContainText(/slice/i);
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication JSON-LD names the calculator and is GameApplication', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('Decision Wheel');
    expect(sa.applicationCategory).toBe('GameApplication');
  });

  test('renders wedges when options are entered', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-wheel-options]', 'Pizza\nCurry\nSushi\nTacos');
    // Four wedges plus the outer ring circle.
    await expect(page.locator('[data-wheel-rotor] path[data-wedge-index]')).toHaveCount(4);
    await expect(page.locator('[data-wheel-count]')).toContainText('4 options');
  });

  test('spin produces a winner from the list', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-wheel-options]', 'Pizza\nCurry\nSushi\nTacos');
    await page.click('[data-wheel-spin]');
    // Wait for the animation and announcement.
    const winner = await page.locator('[data-wheel-winner]').waitFor({ state: 'visible', timeout: 6000 });
    const text = await page.locator('[data-wheel-winner]').textContent();
    expect(['Pizza', 'Curry', 'Sushi', 'Tacos']).toContain(text.trim());
  });

  test('single option shows warning and resolves to that option', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-wheel-options]', 'Only one');
    await page.click('[data-wheel-spin]');
    await expect(page.locator('[data-wheel-warning]')).toContainText(/only entered one option/i);
    await expect(page.locator('[data-wheel-winner]')).toHaveText('Only one');
  });

  test('empty input blocks the spin with a clear message', async ({ page }) => {
    await page.goto(URL);
    await page.click('[data-wheel-spin]');
    await expect(page.locator('[data-wheel-error]')).toContainText(/at least one option/i);
  });

  test('remove winner mode shrinks the list after a spin', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-wheel-options]', 'A\nB\nC\nD');
    await page.check('[data-wheel-remove-winner]');
    await page.click('[data-wheel-spin]');
    await page.locator('[data-wheel-winner]').waitFor({ state: 'visible', timeout: 6000 });
    // Textarea now has three options.
    const value = await page.locator('[data-wheel-options]').inputValue();
    const lines = value.split('\n').filter(s => s.trim().length > 0);
    expect(lines.length).toBe(3);
  });

  test('prove-it panel shows the algorithm', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it]')).toContainText(/rejection sampling/i);
    await expect(page.locator('[data-prove-it]')).toContainText(/getRandomValues/);
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-wheel-options]', 'Pizza');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Decision Wheel')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event after a spin', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-wheel-options]', 'Pizza\nCurry\nSushi');
    await page.click('[data-wheel-spin]');
    await page.locator('[data-wheel-winner]').waitFor({ state: 'visible', timeout: 6000 });
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'Decision Wheel')
    );
    expect(evt).toBeTruthy();
    expect(evt.option_count).toBe(3);
    expect(['Pizza', 'Curry', 'Sushi']).toContain(evt.winner);
  });

  test('pushes prove_it event when details opened', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-prove-it] summary').click();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it' && e.calculator_name === 'Decision Wheel')
    );
    expect(evt).toBeTruthy();
  });
});

test.describe('Decision Wheel hub registration', () => {
  test('Fun hub lists the Decision Wheel', async ({ page }) => {
    await page.goto('/calculators/fun/');
    await expect(page.getByRole('link', { name: 'Decision Wheel', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the Decision Wheel', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Decision Wheel', includeHidden: true }).first()).toBeVisible();
  });
});
