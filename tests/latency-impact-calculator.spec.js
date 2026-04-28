const { test, expect } = require('@playwright/test');

const PATH = '/calculators/broadband/latency-impact-calculator/';

test.describe('Latency impact calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Latency Impact Calculator/i);
  });

  test('breadcrumb routes through Calculators > Broadband', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Broadband', 'Latency Impact Calculator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /latency-impact-calculator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="rtt"]')).toHaveCount(1);
    await expect(page.locator('[name="jitter"]')).toHaveCount(1);
    await expect(page.locator('[name="packetLoss"]')).toHaveCount(1);
    await expect(page.locator('[name="useCase"]')).toHaveCount(1);
    await expect(page.locator('[name="linkSpeed"]')).toHaveCount(1);
    await expect(page.locator('[name="tcpWindow"]')).toHaveCount(1);
  });

  test('shows verdict, score, TCP cap and reasons when calculate is clicked', async ({ page }) => {
    await page.fill('[name="rtt"]', '90');
    await page.fill('[name="jitter"]', '8');
    await page.fill('[name="packetLoss"]', '0.5');
    await page.selectOption('[name="useCase"]', 'fps-gaming');
    await page.fill('[name="linkSpeed"]', '100');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-verdict]')).toBeVisible();
    await expect(page.locator('[data-result-score]')).toBeVisible();
    await expect(page.locator('[data-result-tcp-cap]')).toBeVisible();
    const reasons = await page.locator('[data-result-reasons] li').count();
    expect(reasons).toBeGreaterThan(0);
  });

  test('verdict reflects the use case (cloud gaming is stricter than MMO)', async ({ page }) => {
    await page.fill('[name="rtt"]', '120');
    await page.fill('[name="jitter"]', '10');
    await page.fill('[name="packetLoss"]', '0');
    await page.selectOption('[name="useCase"]', 'mmo-gaming');
    await page.fill('[name="linkSpeed"]', '100');
    await page.click('[data-calculate]');
    const mmo = (await page.locator('[data-result-verdict]').innerText()).trim();

    await page.selectOption('[name="useCase"]', 'cloud-gaming');
    await page.click('[data-calculate]');
    const cloud = (await page.locator('[data-result-verdict]').innerText()).trim();

    const order = ['Excellent', 'Good', 'Playable', 'Poor', 'Unusable'];
    expect(order.indexOf(cloud)).toBeGreaterThanOrEqual(order.indexOf(mmo));
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="rtt"]', '60');
    await page.fill('[name="jitter"]', '5');
    await page.fill('[name="packetLoss"]', '0');
    await page.selectOption('[name="useCase"]', 'web-browsing');
    await page.fill('[name="linkSpeed"]', '1000');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('rtt');
  });

  test('pushes calculator_result to dataLayer with use case and score', async ({ page }) => {
    await page.fill('[name="rtt"]', '40');
    await page.fill('[name="jitter"]', '3');
    await page.fill('[name="packetLoss"]', '0');
    await page.selectOption('[name="useCase"]', 'fps-gaming');
    await page.fill('[name="linkSpeed"]', '100');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'latency-impact-calculator')
    );
    expect(event).toBeTruthy();
    expect(event.use_case).toBe('fps-gaming');
    expect(typeof event.score).toBe('number');
    expect(event.score).toBeGreaterThan(0);
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="rtt"]', '40');
    await page.fill('[name="jitter"]', '3');
    await page.fill('[name="packetLoss"]', '0');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'latency-impact-calculator')
    );
    expect(event).toBeTruthy();
  });

  test('has SoftwareApplication JSON-LD with UtilitiesApplication category', async ({ page }) => {
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().innerText();
    expect(jsonLd).toContain('SoftwareApplication');
    expect(jsonLd).toContain('UtilitiesApplication');
  });

  test('has FAQ schema', async ({ page }) => {
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    const combined = scripts.join(' ');
    expect(combined).toContain('FAQPage');
  });

  test('appears on the broadband category page', async ({ page }) => {
    await page.goto('/calculators/broadband/');
    await expect(page.locator('a[href="/calculators/broadband/latency-impact-calculator/"]')).toHaveCount(1);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/broadband/latency-impact-calculator/"]')).toHaveCount(1);
  });

  test('has disclaimer in footer', async ({ page }) => {
    await expect(page.locator('footer [data-disclaimer]')).toHaveCount(1);
  });

  test('has cookie banner present on fresh visit', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(PATH);
    await expect(page.locator('[data-cookie-banner]')).toBeVisible();
  });
});
