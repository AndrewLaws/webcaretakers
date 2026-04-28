const { test, expect } = require('@playwright/test');

const PATH = '/calculators/broadband/vpn-throughput-calculator/';

test.describe('VPN throughput calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/VPN Throughput Calculator/i);
  });

  test('breadcrumb routes through Calculators > Broadband', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Broadband', 'VPN Throughput Calculator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /vpn-throughput-calculator/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="linkSpeed"]')).toHaveCount(1);
    await expect(page.locator('[name="protocol"]')).toHaveCount(1);
    await expect(page.locator('[name="cipher"]')).toHaveCount(1);
    await expect(page.locator('[name="cpuClass"]')).toHaveCount(1);
    await expect(page.locator('[name="mtu"]')).toHaveCount(1);
    await expect(page.locator('[name="serverDistance"]')).toHaveCount(1);
  });

  test('shows throughput, percent, latency and bottleneck when calculate is clicked', async ({ page }) => {
    await page.fill('[name="linkSpeed"]', '1000');
    await page.selectOption('[name="protocol"]', 'WireGuard');
    await page.selectOption('[name="cipher"]', 'AES-256-GCM');
    await page.selectOption('[name="cpuClass"]', 'high');
    await page.selectOption('[name="serverDistance"]', 'same-country');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-summary]')).toBeVisible();
    await expect(page.locator('[data-result-throughput]')).toContainText(/Mbps/);
    await expect(page.locator('[data-result-percent]')).toContainText(/%/);
    await expect(page.locator('[data-result-bottleneck]')).toContainText(/link-bound/);
    await expect(page.locator('[data-result-latency]')).toContainText(/ms/);
  });

  test('OpenVPN-TCP across a transcontinental link reports rtt-bound', async ({ page }) => {
    await page.fill('[name="linkSpeed"]', '1000');
    await page.selectOption('[name="protocol"]', 'OpenVPN-TCP');
    await page.selectOption('[name="cipher"]', 'AES-128-GCM');
    await page.selectOption('[name="cpuClass"]', 'high');
    await page.selectOption('[name="serverDistance"]', 'transcontinental');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-bottleneck]')).toContainText(/rtt-bound/);
  });

  test('low CPU on OpenVPN-TCP with AES-256-CBC is encryption-bound', async ({ page }) => {
    await page.fill('[name="linkSpeed"]', '1000');
    await page.selectOption('[name="protocol"]', 'OpenVPN-TCP');
    await page.selectOption('[name="cipher"]', 'AES-256-CBC');
    await page.selectOption('[name="cpuClass"]', 'low');
    await page.selectOption('[name="serverDistance"]', 'same-country');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-result-bottleneck]')).toContainText(/encryption-bound/);
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="linkSpeed"]', '500');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('effective mtu');
  });

  test('pushes calculator_result to dataLayer with calculator_name', async ({ page }) => {
    await page.fill('[name="linkSpeed"]', '500');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'vpn-throughput-calculator')
    );
    expect(event).toBeTruthy();
    expect(event.throughput_mbps).toBeGreaterThan(0);
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="linkSpeed"]', '500');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'vpn-throughput-calculator')
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

  test('mentions WireGuard and OpenVPN in long-form prose', async ({ page }) => {
    const prose = await page.locator('.long-form').innerText();
    expect(prose).toMatch(/WireGuard/);
    expect(prose).toMatch(/OpenVPN/);
  });

  test('appears on the broadband category page', async ({ page }) => {
    await page.goto('/calculators/broadband/');
    await expect(page.locator('a[href="/calculators/broadband/vpn-throughput-calculator/"]')).toHaveCount(1);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/broadband/vpn-throughput-calculator/"]')).toHaveCount(1);
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
