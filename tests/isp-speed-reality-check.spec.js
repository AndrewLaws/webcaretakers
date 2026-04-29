const { test, expect } = require('@playwright/test');

const PATH = '/calculators/broadband/isp-speed-reality-check/';

test.describe('ISP speed reality check page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test('has a single h1 naming the calculator', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/ISP Speed Reality Check/i);
  });

  test('breadcrumb routes through Calculators > Broadband', async ({ page }) => {
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map((s) => s.trim())).toEqual(['Home', 'Calculators', 'Broadband', 'ISP Speed Reality Check']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('has meta description and canonical', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /isp-speed-reality-check/);
  });

  test('has all required inputs', async ({ page }) => {
    await expect(page.locator('[name="advertisedSpeed"]')).toHaveCount(1);
    await expect(page.locator('[name="connectionType"]')).toHaveCount(1);
    await expect(page.locator('[name="distanceFromCabinet"]')).toHaveCount(1);
    await expect(page.locator('[name="lineQuality"]')).toHaveCount(1);
    await expect(page.locator('[name="routerLocation"]')).toHaveCount(1);
    await expect(page.locator('[name="routerStandard"]')).toHaveCount(1);
    await expect(page.locator('[name="peakHour"]')).toHaveCount(1);
  });

  test('shows wired, wifi, percent, bottleneck and recommendation when calculate is clicked', async ({ page }) => {
    await page.fill('[name="advertisedSpeed"]', '500');
    await page.selectOption('[name="connectionType"]', 'fttp');
    await page.selectOption('[name="lineQuality"]', 'good');
    await page.selectOption('[name="routerLocation"]', 'one-wall');
    await page.selectOption('[name="routerStandard"]', 'wifi5');
    await page.click('[data-calculate]');

    await expect(page.locator('[data-result-wired]')).toBeVisible();
    await expect(page.locator('[data-result-wifi]')).toBeVisible();
    await expect(page.locator('[data-result-percent]')).toBeVisible();
    await expect(page.locator('[data-result-bottleneck]')).toBeVisible();
    await expect(page.locator('[data-result-recommendation]')).toBeVisible();
  });

  test('FTTC line with long distance from cabinet flags line attenuation as bottleneck', async ({ page }) => {
    await page.fill('[name="advertisedSpeed"]', '80');
    await page.selectOption('[name="connectionType"]', 'fttc');
    await page.fill('[name="distanceFromCabinet"]', '1500');
    await page.selectOption('[name="lineQuality"]', 'poor');
    await page.selectOption('[name="routerLocation"]', 'next-to-device');
    await page.selectOption('[name="routerStandard"]', 'wifi6');
    await page.click('[data-calculate]');

    const bottleneck = (await page.locator('[data-result-bottleneck]').innerText()).toLowerCase();
    expect(bottleneck).toContain('line');
  });

  test('older wifi standard caps wifi-end speed below wired sync', async ({ page }) => {
    await page.fill('[name="advertisedSpeed"]', '900');
    await page.selectOption('[name="connectionType"]', 'fttp');
    await page.selectOption('[name="lineQuality"]', 'excellent');
    await page.selectOption('[name="routerLocation"]', 'two-walls');
    await page.selectOption('[name="routerStandard"]', 'wifi4');
    await page.click('[data-calculate]');

    const wired = parseFloat((await page.locator('[data-result-wired]').innerText()).replace(/[^\d.]/g, ''));
    const wifi = parseFloat((await page.locator('[data-result-wifi]').innerText()).replace(/[^\d.]/g, ''));
    expect(wifi).toBeLessThan(wired);
  });

  test('peak hour reduces percent of advertised', async ({ page }) => {
    await page.fill('[name="advertisedSpeed"]', '300');
    await page.selectOption('[name="connectionType"]', 'cable-docsis31');
    await page.selectOption('[name="lineQuality"]', 'good');
    await page.selectOption('[name="routerLocation"]', 'same-room');
    await page.selectOption('[name="routerStandard"]', 'wifi6');
    await page.click('[data-calculate]');
    const offPeak = parseFloat((await page.locator('[data-result-percent]').innerText()).replace(/[^\d.]/g, ''));

    await page.check('[name="peakHour"]');
    await page.click('[data-calculate]');
    const onPeak = parseFloat((await page.locator('[data-result-percent]').innerText()).replace(/[^\d.]/g, ''));

    expect(onPeak).toBeLessThan(offPeak);
  });

  test('prove-it panel opens and shows the working', async ({ page }) => {
    await page.fill('[name="advertisedSpeed"]', '200');
    await page.selectOption('[name="connectionType"]', 'fttp');
    await page.selectOption('[name="lineQuality"]', 'good');
    await page.selectOption('[name="routerLocation"]', 'same-room');
    await page.selectOption('[name="routerStandard"]', 'wifi6');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-list] li')).not.toHaveCount(0);
    const body = await page.locator('[data-prove-it-body]').innerText();
    expect(body.toLowerCase()).toContain('advertised');
  });

  test('pushes calculator_result to dataLayer with calculator_name isp-speed-reality-check', async ({ page }) => {
    await page.fill('[name="advertisedSpeed"]', '500');
    await page.selectOption('[name="connectionType"]', 'fttp');
    await page.selectOption('[name="lineQuality"]', 'good');
    await page.selectOption('[name="routerLocation"]', 'same-room');
    await page.selectOption('[name="routerStandard"]', 'wifi6');
    await page.click('[data-calculate]');
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'calculator_result' && e.calculator_name === 'isp-speed-reality-check')
    );
    expect(event).toBeTruthy();
    expect(event.advertised_speed).toBe(500);
    expect(typeof event.estimated_wifi_mbps).toBe('number');
  });

  test('pushes prove_it event when prove-it panel is opened', async ({ page }) => {
    await page.fill('[name="advertisedSpeed"]', '100');
    await page.selectOption('[name="connectionType"]', 'fttp');
    await page.selectOption('[name="lineQuality"]', 'good');
    await page.selectOption('[name="routerLocation"]', 'same-room');
    await page.selectOption('[name="routerStandard"]', 'wifi6');
    await page.click('[data-calculate]');
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find((e) => e.event === 'prove_it' && e.calculator_name === 'isp-speed-reality-check')
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
    await expect(page.locator('a[href="/calculators/broadband/isp-speed-reality-check/"]')).not.toHaveCount(0);
  });

  test('appears on the all-calculators hub', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.locator('a[href="/calculators/broadband/isp-speed-reality-check/"]')).not.toHaveCount(0);
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
