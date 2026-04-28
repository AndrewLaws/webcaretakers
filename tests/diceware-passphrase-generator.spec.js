const { test, expect } = require('@playwright/test');

test.describe('Diceware Passphrase Generator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/cybersecurity/diceware-passphrase-generator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Diceware Passphrase Generator' })).toBeVisible();
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

  test('auto-generates a passphrase on load with default 6 words', async ({ page }) => {
    const phrase = await page.locator('[data-passphrase]').textContent();
    // hyphen separator by default, 6 words
    const words = phrase.trim().split('-');
    expect(words.length).toBe(6);
    for (const w of words) expect(w.length).toBeGreaterThan(0);
  });

  test('changing word count to 4 produces a 4-word phrase', async ({ page }) => {
    await page.locator('[data-word-count]').fill('4');
    await page.locator('[data-generate]').click();
    const phrase = await page.locator('[data-passphrase]').textContent();
    expect(phrase.trim().split('-').length).toBe(4);
  });

  test('switching separator to dot uses dots between words', async ({ page }) => {
    await page.locator('[data-separator]').selectOption('dot');
    await page.locator('[data-generate]').click();
    const phrase = (await page.locator('[data-passphrase]').textContent()).trim();
    expect(phrase.split('.').length).toBe(6);
    expect(phrase.includes(' ')).toBe(false);
  });

  test('first-letter capitalisation produces six capitalised words', async ({ page }) => {
    await page.locator('[data-cap][value="first"]').check();
    await page.locator('[data-generate]').click();
    const phrase = (await page.locator('[data-passphrase]').textContent()).trim();
    const words = phrase.split('-');
    expect(words.length).toBe(6);
    for (const w of words) {
      expect(w[0]).toBe(w[0].toUpperCase());
    }
  });

  test('entropy stat reflects the word count', async ({ page }) => {
    // 6 words is roughly 62.0 bits.
    await page.locator('[data-word-count]').fill('6');
    await page.locator('[data-generate]').click();
    await expect(page.locator('[data-stat-entropy]')).toContainText('62.0 bits');
  });

  test('Prove it panel shows the entropy maths', async ({ page }) => {
    await page.locator('[data-generate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).toContainText('log');
    await expect(body).toContainText('1296');
    await expect(body).toContainText(/Total entropy/i);
  });

  test('pushes calculator_result event to dataLayer', async ({ page }) => {
    await page.locator('[data-generate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Diceware Passphrase Generator');
    expect(event.word_count).toBe(6);
  });

  test('opening Prove it pushes a prove_it event', async ({ page }) => {
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
    expect(event.calculator_name).toBe('Diceware Passphrase Generator');
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

test.describe('Diceware Passphrase Generator hub registration', () => {
  test('appears on /calculators/cybersecurity/', async ({ page }) => {
    await page.goto('/calculators/cybersecurity/');
    await expect(page.getByRole('link', { name: 'Diceware Passphrase Generator', exact: true }).first()).toBeVisible();
  });

  test('appears on /calculators/', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Diceware Passphrase Generator', exact: true }).first()).toBeVisible();
  });
});
