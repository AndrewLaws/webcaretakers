const { test, expect } = require('@playwright/test');

test.describe('Password Strength Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/cybersecurity/password-strength-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Password Strength Calculator' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Cybersecurity', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators', includeHidden: true })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Cybersecurity', includeHidden: true })).toHaveAttribute('href', '/calculators/cybersecurity/');
  });

  test('reassurance line about local-only is visible near the input', async ({ page }) => {
    await expect(page.locator('[data-privacy-line]')).toContainText('Nothing you type is sent anywhere');
  });

  test('show/hide toggle flips the input type', async ({ page }) => {
    const input = page.locator('[data-pw-input]');
    const toggle = page.locator('[data-pw-toggle]');
    await expect(input).toHaveAttribute('type', 'password');
    await toggle.click();
    await expect(input).toHaveAttribute('type', 'text');
    await expect(toggle).toHaveText('Hide');
    await toggle.click();
    await expect(input).toHaveAttribute('type', 'password');
    await expect(toggle).toHaveText('Show');
  });

  test('"password" gets Very Weak rating and breach-list warning', async ({ page }) => {
    await page.fill('[data-pw-input]', 'password');
    await expect(page.locator('[data-result]')).toContainText('Very Weak', { timeout: 2000 });
    await expect(page.locator('[data-result]')).toContainText(/breach lists/i);
  });

  test('"123456" gets Very Weak and breach-list warning', async ({ page }) => {
    await page.fill('[data-pw-input]', '123456');
    await expect(page.locator('[data-result]')).toContainText('Very Weak', { timeout: 2000 });
    await expect(page.locator('[data-result]')).toContainText(/breach lists/i);
  });

  test('long random password gets Strong or Very Strong rating', async ({ page }) => {
    await page.fill('[data-pw-input]', 'xK7$pQ2!mN9@vR3#wL5tH8');
    await expect(page.locator('[data-result]')).toContainText(/Strong/, { timeout: 2000 });
  });

  test('entropy increases with length', async ({ page }) => {
    await page.fill('[data-pw-input]', 'Abcdef1!');
    await page.waitForTimeout(250);
    const e1 = await page.locator('[data-line-raw-entropy]').textContent();
    await page.fill('[data-pw-input]', 'Abcdef1!Abcdef1!');
    await page.waitForTimeout(250);
    const e2 = await page.locator('[data-line-raw-entropy]').textContent();
    const v1 = parseFloat(e1);
    const v2 = parseFloat(e2);
    expect(v2).toBeGreaterThan(v1);
  });

  test('prove-it (workings) details block exists and populates', async ({ page }) => {
    const details = page.locator('[data-prove-it]');
    await expect(details.locator('summary')).toContainText(/Show the workings/i);
    await page.fill('[data-pw-input]', 'Bx7!qP2#mZ9$Lk4');
    await page.waitForTimeout(250);
    await expect(page.locator('[data-prove-it-body]')).toContainText('Adjusted entropy');
  });

  test('strength bar fill adopts a colour', async ({ page }) => {
    await page.fill('[data-pw-input]', 'Bx7!qP2#mZ9$Lk4&Wn');
    await page.waitForTimeout(250);
    const style = await page.locator('[data-strength-fill]').getAttribute('style');
    expect(style).toMatch(/background:/);
  });

  test('crack-time table shows three threat models', async ({ page }) => {
    await page.fill('[data-pw-input]', 'Bx7!qP2#mZ9$Lk4');
    await page.waitForTimeout(250);
    const rows = await page.locator('[data-crack-body] tr').count();
    expect(rows).toBe(3);
  });

  test('pushes calculator_interaction event on first keystroke', async ({ page }) => {
    await page.fill('[data-pw-input]', 'a');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Password Strength Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event after typing', async ({ page }) => {
    await page.fill('[data-pw-input]', 'Bx7!qP2#mZ9$Lk4');
    await page.waitForTimeout(300);
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'Password Strength Calculator')
    );
    expect(evt).toBeTruthy();
    expect(typeof evt.entropy_bits).toBe('number');
    expect(typeof evt.rating).toBe('string');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication JSON-LD names the calculator', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('Password Strength Calculator');
  });

  test('window.PasswordStrength exposes pure-logic helpers', async ({ page }) => {
    const exposed = await page.evaluate(() => {
      const lib = window.PasswordStrength;
      return {
        hasAssess: typeof lib.assess === 'function',
        hasRate: typeof lib.rate === 'function',
        hasEntropy: typeof lib.rawEntropyBits === 'function'
      };
    });
    expect(exposed.hasAssess).toBe(true);
    expect(exposed.hasRate).toBe(true);
    expect(exposed.hasEntropy).toBe(true);
  });

  test('page makes no outbound network requests after load', async ({ page }) => {
    // Watch from a fresh navigation.
    const requests = [];
    page.on('request', r => {
      const u = r.url();
      // Allow data: and the page itself, plus same-origin assets.
      if (u.startsWith('data:')) return;
      const url = new URL(u);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;
      // Ignore GTM/GA since they're part of the base template, not the calculator.
      if (url.hostname.includes('googletagmanager.com')) return;
      if (url.hostname.includes('google-analytics.com')) return;
      if (url.hostname.includes('googletagmanager')) return;
      if (url.hostname.endsWith('.doubleclick.net')) return;
      requests.push(u);
    });
    await page.goto('/calculators/cybersecurity/password-strength-calculator/');
    await page.fill('[data-pw-input]', 'Bx7!qP2#mZ9$Lk4');
    await page.waitForTimeout(400);
    expect(requests).toEqual([]);
  });
});

test.describe('Cybersecurity hub registration', () => {
  test('Cybersecurity hub lists the Password Strength Calculator', async ({ page }) => {
    await page.goto('/calculators/cybersecurity/');
    await expect(page.getByRole('link', { name: 'Password Strength Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the Password Strength Calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Password Strength Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('primary nav has a Cybersecurity link', async ({ page }) => {
    await page.goto('/calculators/cybersecurity/password-strength-calculator/');
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Cybersecurity', includeHidden: true })).toHaveAttribute('href', '/calculators/cybersecurity/');
  });
});
