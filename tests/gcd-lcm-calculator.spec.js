const { test, expect } = require('@playwright/test');

test.describe('GCD and LCM Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/math/gcd-lcm-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'GCD and LCM Calculator' })).toBeVisible();
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

  test('classic 12 and 18 gives GCD 6 and LCM 36', async ({ page }) => {
    await page.locator('[data-gcd-lcm-input]').fill('12, 18');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('GCD = 6');
    await expect(page.locator('[data-result]')).toContainText('LCM = 36');
  });

  test('coprime pair gives GCD 1 and LCM equal to product', async ({ page }) => {
    await page.locator('[data-gcd-lcm-input]').fill('7, 11');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('GCD = 1');
    await expect(page.locator('[data-result]')).toContainText('LCM = 77');
  });

  test('three inputs reduce correctly', async ({ page }) => {
    await page.locator('[data-gcd-lcm-input]').fill('12, 18, 24');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('GCD = 6');
    await expect(page.locator('[data-result]')).toContainText('LCM = 72');
  });

  test('single input is rejected with a clear message', async ({ page }) => {
    await page.locator('[data-gcd-lcm-input]').fill('12');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText(/at least two/i);
  });

  test('decimals and zero are rejected', async ({ page }) => {
    await page.locator('[data-gcd-lcm-input]').fill('12, 0, 3.5');
    await page.locator('[data-calculate]').click();
    // Only 12 remains, single input -> rejected, with invalid tokens reported.
    await expect(page.locator('[data-result]')).toContainText(/at least two/i);
    await expect(page.locator('[data-result]')).toContainText(/Ignored/);
  });

  test('Prove it panel shows Euclidean trail and factorisation tables', async ({ page }) => {
    await page.locator('[data-gcd-lcm-input]').fill('48, 18');
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).toContainText('Euclidean algorithm');
    await expect(body).toContainText(/prime factorisation/i);
    // At least two prove-it tables expected (Euclidean + factorisations + combined).
    await expect(body.locator('table.prove-it-table')).toHaveCount(3);
  });

  test('large coprime primes give GCD 1', async ({ page }) => {
    await page.locator('[data-gcd-lcm-input]').fill('999983, 999979');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText('GCD = 1');
  });

  test('pushes calculator_result event to dataLayer', async ({ page }) => {
    await page.locator('[data-gcd-lcm-input]').fill('12, 18');
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('GCD and LCM Calculator');
    expect(event.gcd).toBe(6);
    expect(event.lcm).toBe(36);
  });

  test('opening Prove it pushes a prove_it event', async ({ page }) => {
    await page.locator('[data-gcd-lcm-input]').fill('12, 18');
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
    expect(event.calculator_name).toBe('GCD and LCM Calculator');
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

test.describe('GCD and LCM Calculator hub registration', () => {
  test('appears on /calculators/math/', async ({ page }) => {
    await page.goto('/calculators/math/');
    await expect(page.getByRole('link', { name: 'GCD and LCM Calculator', exact: true }).first()).toBeVisible();
  });

  test('appears on /calculators/', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'GCD and LCM Calculator', exact: true }).first()).toBeVisible();
  });
});
