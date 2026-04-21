const { test, expect } = require('@playwright/test');

test.describe('iCal Event Generator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/productivity/ical-event-generator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'iCal Event Generator' })).toBeVisible();
  });

  test('has an ELI5 block', async ({ page }) => {
    const eli5 = page.locator('.eli5');
    await expect(eli5).toBeVisible();
    await expect(eli5).toContainText("Explain like I'm 5");
  });

  test('breadcrumb routes through Calculators > Productivity', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators' })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Productivity' })).toHaveAttribute('href', '/calculators/productivity/');
  });

  test('start and end date fields are pre-filled with today', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await expect(page.locator('[data-start-date]')).toHaveValue(today);
    await expect(page.locator('[data-end-date]')).toHaveValue(today);
  });

  test('time rows are hidden when all-day is checked', async ({ page }) => {
    const timeRow = page.locator('[data-time-row]').first();
    await expect(timeRow).toBeVisible();
    await page.check('[data-all-day]');
    await expect(timeRow).toBeHidden();
  });

  test('recurrence count row is hidden by default', async ({ page }) => {
    await expect(page.locator('[data-recurrence-count-row]')).toBeHidden();
  });

  test('recurrence count row appears when recurrence is set', async ({ page }) => {
    await page.selectOption('[data-recurrence]', 'weekly');
    await expect(page.locator('[data-recurrence-count-row]')).toBeVisible();
  });

  test('submitting with a title shows confirmation and iCal source', async ({ page }) => {
    await page.fill('[data-title]', 'Test event');
    await page.locator('[data-generate]').click();
    const results = page.locator('[data-generator-results]');
    await expect(results).toBeVisible();
    const resultText = await page.locator('[data-result]').textContent();
    expect(resultText).toContain('Test event');
  });

  test('iCal source block contains BEGIN:VCALENDAR after generation', async ({ page }) => {
    await page.fill('[data-title]', 'Source check');
    await page.locator('[data-generate]').click();
    // Open the details
    await page.locator('[data-prove-it] summary').click();
    const source = await page.locator('[data-ical-source]').textContent();
    expect(source).toContain('BEGIN:VCALENDAR');
    expect(source).toContain('SUMMARY:Source check');
    expect(source).toContain('END:VCALENDAR');
  });

  test('iCal source includes DTSTART and DTEND', async ({ page }) => {
    await page.fill('[data-title]', 'Date check');
    await page.locator('[data-generate]').click();
    await page.locator('[data-prove-it] summary').click();
    const source = await page.locator('[data-ical-source]').textContent();
    expect(source).toContain('DTSTART');
    expect(source).toContain('DTEND');
  });

  test('all-day event iCal source uses VALUE=DATE', async ({ page }) => {
    await page.fill('[data-title]', 'All day test');
    await page.check('[data-all-day]');
    await page.locator('[data-generate]').click();
    await page.locator('[data-prove-it] summary').click();
    const source = await page.locator('[data-ical-source]').textContent();
    expect(source).toContain('VALUE=DATE');
  });

  test('recurrence produces RRULE in iCal source', async ({ page }) => {
    await page.fill('[data-title]', 'Recurring');
    await page.selectOption('[data-recurrence]', 'weekly');
    await page.locator('[data-generate]').click();
    await page.locator('[data-prove-it] summary').click();
    const source = await page.locator('[data-ical-source]').textContent();
    expect(source).toContain('RRULE:FREQ=WEEKLY');
  });

  test('pushes calculator_result event to dataLayer', async ({ page }) => {
    await page.fill('[data-title]', 'DataLayer test');
    await page.locator('[data-generate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('iCal Event Generator');
    expect(event.event_title).toBe('DataLayer test');
    expect(typeof event.all_day).toBe('boolean');
    expect(typeof event.recurrence).toBe('string');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('primary nav contains Productivity link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Productivity' })).toHaveAttribute('href', '/calculators/productivity/');
  });

  test('submitting without a title shows an error', async ({ page }) => {
    // Clear the title field (should be empty by default but ensure)
    await page.fill('[data-title]', '');
    await page.locator('[data-generate]').click();
    const results = page.locator('[data-generator-results]');
    await expect(results).toBeVisible();
    const resultText = await page.locator('[data-result]').textContent();
    expect(resultText).toContain('title');
  });
});

test.describe('Productivity hub', () => {
  test('lists the iCal Event Generator', async ({ page }) => {
    await page.goto('/calculators/productivity/');
    await expect(page.getByRole('link', { name: 'iCal Event Generator' }).first()).toBeVisible();
  });

  test('has ItemList JSON-LD', async ({ page }) => {
    await page.goto('/calculators/productivity/');
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(jsonLd);
    expect(parsed['@type']).toBe('CollectionPage');
    expect(parsed.mainEntity['@type']).toBe('ItemList');
  });
});
