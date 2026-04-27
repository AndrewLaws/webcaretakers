const { test, expect } = require('@playwright/test');

test.describe('Password Generator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/cybersecurity/password-generator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Password Generator' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Cybersecurity', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators', includeHidden: true })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Cybersecurity', includeHidden: true })).toHaveAttribute('href', '/calculators/cybersecurity/');
  });

  test('primary nav contains Cybersecurity link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Cybersecurity', includeHidden: true })).toHaveAttribute('href', '/calculators/cybersecurity/');
  });

  test('generate produces a password of the requested length', async ({ page }) => {
    await page.locator('[data-length]').fill('32');
    // Trigger input so the slider value handler runs in browsers that don't fire change.
    await page.locator('[data-length]').dispatchEvent('input');
    await page.locator('[data-generate]').click();
    const pw = await page.locator('[data-password]').textContent();
    expect(pw.trim().length).toBe(32);
  });

  test('toggling charset options changes the character pool', async ({ page }) => {
    // Turn off everything except lowercase, generate; should be all lowercase letters.
    await page.locator('[data-toggle-uppercase]').uncheck();
    await page.locator('[data-toggle-digits]').uncheck();
    await page.locator('[data-toggle-symbols]').uncheck();
    await page.locator('[data-length]').fill('40');
    await page.locator('[data-length]').dispatchEvent('input');
    await page.locator('[data-generate]').click();
    const pw = (await page.locator('[data-password]').textContent()).trim();
    expect(pw).toMatch(/^[a-z]+$/);
  });

  test('two consecutive generates produce different passwords', async ({ page }) => {
    await page.locator('[data-length]').fill('24');
    await page.locator('[data-length]').dispatchEvent('input');
    await page.locator('[data-generate]').click();
    const a = (await page.locator('[data-password]').textContent()).trim();
    await page.locator('[data-generate]').click();
    const b = (await page.locator('[data-password]').textContent()).trim();
    expect(a).not.toBe(b);
  });

  test('copy button calls clipboard API', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('[data-generate]').click();
    // Stub writeText so we can confirm it was invoked even where clipboard is restricted.
    await page.evaluate(() => {
      window.__copied = null;
      navigator.clipboard.writeText = (txt) => { window.__copied = txt; return Promise.resolve(); };
    });
    await page.locator('[data-copy]').click();
    const copied = await page.evaluate(() => window.__copied);
    expect(typeof copied).toBe('string');
    expect(copied.length).toBeGreaterThan(0);
  });

  test('entropy display updates with length', async ({ page }) => {
    await page.locator('[data-length]').fill('12');
    await page.locator('[data-length]').dispatchEvent('input');
    const low = await page.locator('[data-entropy]').textContent();
    await page.locator('[data-length]').fill('64');
    await page.locator('[data-length]').dispatchEvent('input');
    const high = await page.locator('[data-entropy]').textContent();
    const lowBits = parseFloat(low.replace(/[^0-9.]/g, ''));
    const highBits = parseFloat(high.replace(/[^0-9.]/g, ''));
    expect(highBits).toBeGreaterThan(lowBits);
  });

  test('passphrase mode produces multiple words separated by chosen separator', async ({ page }) => {
    await page.locator('[data-toggle-passphrase]').check();
    await page.locator('[data-passphrase-separator]').selectOption('-');
    await page.locator('[data-passphrase-words]').fill('5');
    await page.locator('[data-passphrase-words]').dispatchEvent('input');
    await page.locator('[data-generate]').click();
    const pw = (await page.locator('[data-password]').textContent()).trim();
    const parts = pw.split('-').filter(Boolean);
    expect(parts.length).toBe(5);
    parts.forEach(p => expect(p).toMatch(/^[a-z]+$/));
  });

  test('prove-it populates with charset and entropy maths', async ({ page }) => {
    await page.locator('[data-generate]').click();
    const proveBody = await page.locator('[data-prove-it-body]').innerHTML();
    expect(proveBody.length).toBeGreaterThan(0);
    expect(proveBody.toLowerCase()).toContain('charset');
  });

  test('pushes calculator_interaction on first toggle change', async ({ page }) => {
    await page.locator('[data-toggle-symbols]').uncheck();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Password Generator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result on first Generate click', async ({ page }) => {
    await page.locator('[data-generate]').click();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'Password Generator')
    );
    expect(evt).toBeTruthy();
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('makes no network requests when generating', async ({ page }) => {
    const requests = [];
    page.on('request', (req) => {
      const u = req.url();
      // Ignore the initial document/asset loads; we only care about runtime API hits.
      if (/\/calculators\/cybersecurity\/password-generator\//.test(u)) return;
      if (/\/assets\//.test(u)) return;
      if (/googletagmanager|google-analytics|gstatic|doubleclick/.test(u)) return;
      if (u.startsWith('data:') || u.startsWith('about:')) return;
      requests.push(u);
    });
    await page.locator('[data-generate]').click();
    await page.locator('[data-generate]').click();
    expect(requests).toEqual([]);
  });
});

test.describe('Cybersecurity hub registration', () => {
  test('Cybersecurity hub lists the Password Generator', async ({ page }) => {
    await page.goto('/calculators/cybersecurity/');
    await expect(page.getByRole('link', { name: 'Password Generator', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the Password Generator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Password Generator', includeHidden: true }).first()).toBeVisible();
  });
});
