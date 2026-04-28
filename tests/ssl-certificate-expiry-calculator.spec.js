const { test, expect } = require('@playwright/test');

test.describe('SSL Certificate Expiry Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/cybersecurity/ssl-certificate-expiry-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'SSL Certificate Expiry Calculator' })).toBeVisible();
  });

  test('has an ELI5 block', async ({ page }) => {
    const eli5 = page.locator('.eli5');
    await expect(eli5).toBeVisible();
    await expect(eli5).toContainText("Explain like I'm 5");
  });

  test('breadcrumb routes through Calculators > Cybersecurity', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators' })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Cybersecurity' })).toHaveAttribute('href', '/calculators/cybersecurity/');
  });

  test('makes clear it does not contact the server', async ({ page }) => {
    await expect(page.locator('.calculator-card')).toContainText(/does not contact your server|No network call/i);
  });

  test('calculates from a date input and shows days remaining and a band', async ({ page }) => {
    // Pick a date well in the future so the band is Healthy regardless of when CI runs.
    await page.locator('[data-expiry-date]').fill('2099-01-01');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-results]')).toBeVisible();
    await expect(page.locator('[data-band-label]')).toHaveText('Healthy');
    const days = await page.locator('[data-days-remaining]').textContent();
    expect(parseInt(days, 10)).toBeGreaterThan(60);
  });

  test('expired date is flagged with a negative days remaining', async ({ page }) => {
    await page.locator('[data-expiry-date]').fill('2000-01-01');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-band-label]')).toHaveText('Expired');
    const days = await page.locator('[data-days-remaining]').textContent();
    expect(parseInt(days, 10)).toBeLessThan(0);
  });

  test('PEM mode extracts the Not After line', async ({ page }) => {
    await page.locator('input[data-mode][value="pem"]').check();
    const sample = [
      '        Validity',
      '            Not Before: Apr 28 12:00:00 2025 GMT',
      '            Not After : Apr 28 12:00:00 2099 GMT',
      '-----BEGIN CERTIFICATE-----',
      'MIIBmock'
    ].join('\n');
    await page.locator('[data-pem-text]').fill(sample);
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-results]')).toBeVisible();
    await expect(page.locator('[data-parsed-expiry]')).toContainText('2099');
  });

  test('Prove it panel shows the working after a calculation', async ({ page }) => {
    await page.locator('[data-expiry-date]').fill('2099-01-01');
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).toContainText('Days remaining');
    await expect(body).toContainText('Recommended renewal');
  });

  test('pushes calculator_result event to dataLayer', async ({ page }) => {
    await page.locator('[data-expiry-date]').fill('2099-01-01');
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('SSL Certificate Expiry Calculator');
    expect(event.band).toBe('healthy');
  });

  test('opening Prove it pushes a prove_it event', async ({ page }) => {
    await page.evaluate(() => {
      var d = document.querySelector('[data-prove-it]');
      d.open = true;
      d.dispatchEvent(new Event('toggle'));
    });
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('SSL Certificate Expiry Calculator');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication uses SecurityApplication category', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa.applicationCategory).toBe('SecurityApplication');
  });
});

test.describe('SSL Certificate Expiry Calculator hub registration', () => {
  test('appears on /calculators/cybersecurity/', async ({ page }) => {
    await page.goto('/calculators/cybersecurity/');
    await expect(page.getByRole('link', { name: 'SSL Certificate Expiry Calculator', exact: true }).first()).toBeVisible();
  });

  test('appears on /calculators/', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'SSL Certificate Expiry Calculator', exact: true }).first()).toBeVisible();
  });
});
