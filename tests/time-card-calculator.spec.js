const { test, expect } = require('@playwright/test');

test.describe('Time Card Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/productivity/time-card-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Time Card Calculator' })).toBeVisible();
  });

  test('has an ELI5 block', async ({ page }) => {
    const eli5 = page.locator('.eli5');
    await expect(eli5).toBeVisible();
    await expect(eli5).toContainText("Explain like I'm 5");
  });

  test('breadcrumb routes through Calculators > Productivity', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators', includeHidden: true })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Productivity', includeHidden: true })).toHaveAttribute('href', '/calculators/productivity/');
  });

  test('starts with five default rows for Mon to Fri', async ({ page }) => {
    const rows = page.locator('[data-rows] tr');
    await expect(rows).toHaveCount(5);
    const firstDay = await page.locator('[data-rows] tr').first().locator('[data-day]').inputValue();
    expect(firstDay).toBe('Mon');
  });

  test('basic week with 09:00-17:00 and 30 min break gives 7.5 hours', async ({ page }) => {
    const firstRow = page.locator('[data-rows] tr').first();
    await firstRow.locator('[data-start]').fill('09:00');
    await firstRow.locator('[data-end]').fill('17:00');
    await firstRow.locator('[data-break]').fill('30');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-line-hours]')).toContainText('7.50');
  });

  test('overnight shift 22:00 to 06:00 gives 8 hours', async ({ page }) => {
    const firstRow = page.locator('[data-rows] tr').first();
    await firstRow.locator('[data-start]').fill('22:00');
    await firstRow.locator('[data-end]').fill('06:00');
    await firstRow.locator('[data-break]').fill('0');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-line-hours]')).toContainText('8.00');
  });

  test('hourly rate produces a pay line', async ({ page }) => {
    const firstRow = page.locator('[data-rows] tr').first();
    await firstRow.locator('[data-start]').fill('09:00');
    await firstRow.locator('[data-end]').fill('17:00');
    await firstRow.locator('[data-break]').fill('0');
    await page.locator('[data-rate]').fill('12.50');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-pay-line]')).toBeVisible();
    await expect(page.locator('[data-line-pay]')).toContainText('100.00');
  });

  test('without a rate, pay line stays hidden', async ({ page }) => {
    const firstRow = page.locator('[data-rows] tr').first();
    await firstRow.locator('[data-start]').fill('09:00');
    await firstRow.locator('[data-end]').fill('17:00');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-pay-line]')).toBeHidden();
  });

  test('add row button extends the table', async ({ page }) => {
    await page.locator('[data-add-row]').click();
    const rows = page.locator('[data-rows] tr');
    await expect(rows).toHaveCount(6);
  });

  test('clear button resets the table to defaults', async ({ page }) => {
    const firstRow = page.locator('[data-rows] tr').first();
    await firstRow.locator('[data-start]').fill('09:00');
    await page.locator('[data-rate]').fill('20');
    await page.locator('[data-clear]').click();
    await expect(firstRow.locator('[data-start]')).toHaveValue('');
    await expect(page.locator('[data-rate]')).toHaveValue('');
  });

  test('bad input on one row does not break the others', async ({ page }) => {
    const rows = page.locator('[data-rows] tr');
    await rows.nth(0).locator('[data-start]').fill('09:00');
    await rows.nth(0).locator('[data-end]').fill('17:00');
    await rows.nth(0).locator('[data-break]').fill('0');
    // Mistype the time on row 2 entirely.
    await rows.nth(1).locator('[data-start]').fill('banana');
    await rows.nth(1).locator('[data-end]').fill('17:00');
    await rows.nth(2).locator('[data-start]').fill('08:00');
    await rows.nth(2).locator('[data-end]').fill('12:00');
    await page.locator('[data-calculate]').click();
    // Mon (8) + Wed (4) = 12
    await expect(page.locator('[data-line-hours]')).toContainText('12.00');
  });

  test('Prove-it panel populates after calculating', async ({ page }) => {
    const firstRow = page.locator('[data-rows] tr').first();
    await firstRow.locator('[data-start]').fill('09:00');
    await firstRow.locator('[data-end]').fill('17:00');
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).toContainText(/Mon/);
    await expect(body).toContainText(/Total/);
  });

  test('pushes calculator_result event to dataLayer', async ({ page }) => {
    const firstRow = page.locator('[data-rows] tr').first();
    await firstRow.locator('[data-start]').fill('09:00');
    await firstRow.locator('[data-end]').fill('17:00');
    await page.locator('[data-rate]').fill('15');
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Time Card Calculator');
    expect(typeof event.total_hours).toBe('number');
    expect(event.has_rate).toBe(true);
  });

  test('prove_it event fires when the panel is opened', async ({ page }) => {
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Time Card Calculator');
  });

  test('has SoftwareApplication and FAQPage JSON-LD with GBP offer', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map(b => JSON.parse(b));
    const types = parsed.map(p => p['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
    const sw = parsed.find(p => p['@type'] === 'SoftwareApplication');
    expect(sw.applicationCategory).toBe('BusinessApplication');
    expect(sw.offers.priceCurrency).toBe('GBP');
    expect(sw.offers.price).toBe('0');
    expect(sw.inLanguage).toBe('en-GB');
  });

  test('primary nav contains Productivity link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Productivity', includeHidden: true })).toHaveAttribute('href', '/calculators/productivity/');
  });
});

test.describe('Productivity hub lists the Time Card Calculator', () => {
  test('shows on the Productivity hub', async ({ page }) => {
    await page.goto('/calculators/productivity/');
    await expect(page.getByRole('link', { name: 'Time Card Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('hub ItemList JSON-LD includes the calculator', async ({ page }) => {
    await page.goto('/calculators/productivity/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const found = blocks.some(b => {
      try {
        const parsed = JSON.parse(b);
        const items = parsed.mainEntity && parsed.mainEntity.itemListElement;
        if (!items) return false;
        return items.some(it => it.name === 'Time Card Calculator');
      } catch (e) { return false; }
    });
    expect(found).toBe(true);
  });

  test('all-calculators index hasPart includes the calculator', async ({ page }) => {
    await page.goto('/calculators/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const found = blocks.some(b => {
      try {
        const parsed = JSON.parse(b);
        const has = parsed.hasPart || [];
        return has.some(it => it.name === 'Time Card Calculator');
      } catch (e) { return false; }
    });
    expect(found).toBe(true);
  });

  test('all-calculators visible Productivity section lists the calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Time Card Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
