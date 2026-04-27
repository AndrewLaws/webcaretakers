const { test, expect } = require('@playwright/test');

const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const ABC_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

test.describe('Hash Generator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/cybersecurity/hash-generator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Hash Generator' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Cybersecurity', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    await expect(crumbs.getByRole('link', { name: 'Calculators' })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Cybersecurity' })).toHaveAttribute('href', '/calculators/cybersecurity/');
    await expect(crumbs).toContainText('Hash Generator');
  });

  test('primary nav has Cybersecurity', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Cybersecurity', includeHidden: true })).toHaveAttribute('href', '/calculators/cybersecurity/');
  });

  test('empty-string SHA-256 produces canonical e3b0c44 value', async ({ page }) => {
    // text mode default; with empty input the page should display the canonical empty hash
    const row = page.locator('[data-hash-row="SHA-256"]');
    await expect(row.locator('[data-hash-value]')).toHaveText(EMPTY_SHA256, { timeout: 5000 });
  });

  test('"abc" SHA-256 produces ba7816bf...', async ({ page }) => {
    await page.fill('[data-hash-text]', 'abc');
    const row = page.locator('[data-hash-row="SHA-256"]');
    await expect(row.locator('[data-hash-value]')).toHaveText(ABC_SHA256, { timeout: 5000 });
  });

  test('changing input changes the hash', async ({ page }) => {
    await page.fill('[data-hash-text]', 'abc');
    const row = page.locator('[data-hash-row="SHA-256"]');
    await expect(row.locator('[data-hash-value]')).toHaveText(ABC_SHA256, { timeout: 5000 });
    await page.fill('[data-hash-text]', 'abcd');
    await expect(row.locator('[data-hash-value]')).not.toHaveText(ABC_SHA256, { timeout: 5000 });
    const v = await row.locator('[data-hash-value]').textContent();
    expect(v.length).toBeGreaterThan(0);
    expect(v).not.toBe(ABC_SHA256);
  });

  test('hex/base64 toggle changes representation', async ({ page }) => {
    await page.fill('[data-hash-text]', 'abc');
    const row = page.locator('[data-hash-row="SHA-256"]');
    await expect(row.locator('[data-hash-value]')).toHaveText(ABC_SHA256, { timeout: 5000 });
    await page.locator('[data-format][value="base64"]').check();
    await expect(row.locator('[data-hash-value]')).not.toHaveText(ABC_SHA256, { timeout: 5000 });
    const b64 = await row.locator('[data-hash-value]').textContent();
    // base64 of the hex bytes for "abc" SHA-256 is ungWdAjxz+pBQUDeXa4iI7ADYaOWF3qcvWEP9h8gAVrQ=
    expect(b64).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(b64.length).toBeLessThan(ABC_SHA256.length);
  });

  test('compare mode highlights a match', async ({ page }) => {
    await page.fill('[data-hash-text]', 'abc');
    const row = page.locator('[data-hash-row="SHA-256"]');
    await expect(row.locator('[data-hash-value]')).toHaveText(ABC_SHA256, { timeout: 5000 });
    await row.locator('[data-compare-input]').fill(ABC_SHA256);
    await expect(row).toHaveClass(/hash-row--match/, { timeout: 2000 });
  });

  test('compare mode highlights a mismatch', async ({ page }) => {
    await page.fill('[data-hash-text]', 'abc');
    const row = page.locator('[data-hash-row="SHA-256"]');
    await expect(row.locator('[data-hash-value]')).toHaveText(ABC_SHA256, { timeout: 5000 });
    await row.locator('[data-compare-input]').fill('deadbeef');
    await expect(row).toHaveClass(/hash-row--mismatch/, { timeout: 2000 });
  });

  test('prove-it block shows known test vectors', async ({ page }) => {
    const proveIt = page.locator('[data-prove-it]');
    await expect(proveIt).toContainText(EMPTY_SHA256);
    await expect(proveIt).toContainText(ABC_SHA256);
  });

  test('page does not exfiltrate the typed input', async ({ page }) => {
    // The guarantee is "nothing you type leaves the device". GTM/analytics
    // pixels are allowed (they don't see the input); what matters is that no
    // request URL or post body contains the user's text.
    const SECRET = 'unique-secret-marker-9f3a2b';
    const offending = [];
    page.on('request', (req) => {
      const u = req.url();
      const body = req.postData() || '';
      if (u.includes(SECRET) || body.includes(SECRET)) {
        offending.push(u);
      }
    });
    await page.fill('[data-hash-text]', SECRET);
    await page.waitForTimeout(400);
    expect(offending).toEqual([]);
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });
});

test.describe('Cybersecurity hub registration', () => {
  test('Cybersecurity hub lists the Hash Generator', async ({ page }) => {
    await page.goto('/calculators/cybersecurity/');
    await expect(page.getByRole('link', { name: 'Hash Generator', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the Hash Generator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Hash Generator', includeHidden: true }).first()).toBeVisible();
  });
});
