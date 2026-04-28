const { test, expect } = require('@playwright/test');

test.describe('Quadratic Equation Solver page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/math/quadratic-equation-solver/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Quadratic Equation Solver' })).toBeVisible();
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

  test('x^2 - 3x + 2 = 0 gives roots x = 1 and x = 2', async ({ page }) => {
    await page.locator('[data-quad-a]').fill('1');
    await page.locator('[data-quad-b]').fill('-3');
    await page.locator('[data-quad-c]').fill('2');
    await page.locator('[data-calculate]').click();
    const result = page.locator('[data-result]');
    await expect(result).toContainText('Two distinct real roots');
    await expect(result).toContainText('x = 1');
    await expect(result).toContainText('x = 2');
  });

  test('repeated root case x^2 - 2x + 1 = 0', async ({ page }) => {
    await page.locator('[data-quad-a]').fill('1');
    await page.locator('[data-quad-b]').fill('-2');
    await page.locator('[data-quad-c]').fill('1');
    await page.locator('[data-calculate]').click();
    const result = page.locator('[data-result]');
    await expect(result).toContainText(/repeated/i);
    await expect(result).toContainText('x = 1');
  });

  test('complex roots case x^2 + 2x + 5 = 0 prints p +/- qi', async ({ page }) => {
    await page.locator('[data-quad-a]').fill('1');
    await page.locator('[data-quad-b]').fill('2');
    await page.locator('[data-quad-c]').fill('5');
    await page.locator('[data-calculate]').click();
    const result = page.locator('[data-result]');
    await expect(result).toContainText('complex conjugate');
    await expect(result).toContainText('-1 + 2i');
    await expect(result).toContainText('-1 - 2i');
  });

  test('a = 0 is rejected with a clear message', async ({ page }) => {
    await page.locator('[data-quad-a]').fill('0');
    await page.locator('[data-quad-b]').fill('2');
    await page.locator('[data-quad-c]').fill('3');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toContainText(/a must be non-zero/i);
  });

  test('Prove it panel shows the working', async ({ page }) => {
    await page.locator('[data-quad-a]').fill('1');
    await page.locator('[data-quad-b]').fill('-3');
    await page.locator('[data-quad-c]').fill('2');
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).toContainText('Step 1: discriminant');
    await expect(body).toContainText(/quadratic formula/i);
    await expect(body).toContainText('Vertex h');
    await expect(body).toContainText('Vertex k');
    await expect(body).toContainText('Axis of symmetry');
  });

  test('pushes calculator_result event to dataLayer', async ({ page }) => {
    await page.locator('[data-quad-a]').fill('1');
    await page.locator('[data-quad-b]').fill('-3');
    await page.locator('[data-quad-c]').fill('2');
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Quadratic Equation Solver');
    expect(event.root_kind).toBe('real-distinct');
  });

  test('opening Prove it pushes a prove_it event', async ({ page }) => {
    await page.locator('[data-quad-a]').fill('1');
    await page.locator('[data-quad-b]').fill('-3');
    await page.locator('[data-quad-c]').fill('2');
    await page.locator('[data-calculate]').click();
    await page.evaluate(() => {
      var d = document.querySelector('[data-prove-it]');
      d.open = true;
      d.dispatchEvent(new Event('toggle'));
    });
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Quadratic Equation Solver');
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

test.describe('Quadratic Equation Solver hub registration', () => {
  test('appears on /calculators/math/', async ({ page }) => {
    await page.goto('/calculators/math/');
    await expect(page.getByRole('link', { name: 'Quadratic Equation Solver', exact: true }).first()).toBeVisible();
  });

  test('appears on /calculators/', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Quadratic Equation Solver', exact: true }).first()).toBeVisible();
  });
});
