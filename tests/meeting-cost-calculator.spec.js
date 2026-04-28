const { test, expect } = require('@playwright/test');

test.describe('Meeting Cost Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/productivity/meeting-cost-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Meeting Cost Calculator' })).toBeVisible();
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

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication JSON-LD has BusinessApplication category', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('Meeting Cost Calculator');
    expect(sa.applicationCategory).toBe('BusinessApplication');
    expect(sa.offers).toBeTruthy();
  });

  test('FAQPage has at least three Q&As', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faq = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'FAQPage');
    expect(faq).toBeTruthy();
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
  });

  test('mode toggle swaps simple and detailed panels', async ({ page }) => {
    await expect(page.locator('[data-simple-panel]')).toBeVisible();
    await expect(page.locator('[data-detailed-panel]')).toBeHidden();
    await page.locator('input[data-mode][value="detailed"]').check();
    await expect(page.locator('[data-simple-panel]')).toBeHidden();
    await expect(page.locator('[data-detailed-panel]')).toBeVisible();
  });

  test('simple mode: 6 attendees x £55,000 x 60 min produces a sensible total', async ({ page }) => {
    await page.fill('[data-simple-attendees]', '6');
    await page.fill('[data-simple-salary]', '55000');
    await page.fill('[data-duration]', '60');
    await page.fill('[data-overheads]', '1.3');
    await page.locator('[data-calculate]').click();
    // 6 * 55000 * 1.3 / 1800 = 238.333... per hour total
    const totalText = await page.locator('[data-result-total]').textContent();
    expect(totalText).toContain('£238');
  });

  test('annualised cost equals total × 52', async ({ page }) => {
    await page.fill('[data-simple-attendees]', '4');
    await page.fill('[data-simple-salary]', '50000');
    await page.fill('[data-duration]', '30');
    await page.fill('[data-overheads]', '1.0');
    await page.locator('[data-calculate]').click();
    // hourly = 50000/1800 = 27.7778; 30 min = 13.8889; * 4 = 55.5555... → £55.56
    // annual = 55.5555... * 52 = 2888.89
    const annual = await page.locator('[data-result-annual]').textContent();
    expect(annual).toContain('£2,888');
  });

  test('zero duration produces £0 total', async ({ page }) => {
    await page.fill('[data-simple-attendees]', '5');
    await page.fill('[data-simple-salary]', '60000');
    await page.fill('[data-duration]', '0');
    await page.locator('[data-calculate]').click();
    const totalText = await page.locator('[data-result-total]').textContent();
    expect(totalText).toContain('£0.00');
  });

  test('person-hours: 6 attendees x 60 min = 6 person-hours', async ({ page }) => {
    await page.fill('[data-simple-attendees]', '6');
    await page.fill('[data-simple-salary]', '50000');
    await page.fill('[data-duration]', '60');
    await page.locator('[data-calculate]').click();
    const hoursText = await page.locator('[data-result-hours]').textContent();
    expect(hoursText).toContain('6');
    expect(hoursText).toContain('person-hours');
  });

  test('currency selector swaps display symbol without recomputing', async ({ page }) => {
    await page.fill('[data-simple-attendees]', '2');
    await page.fill('[data-simple-salary]', '45000');
    await page.fill('[data-duration]', '60');
    await page.fill('[data-overheads]', '1.0');
    await page.locator('[data-calculate]').click();
    // total = 2 * 45000/1800 = 50.00
    const totalGbp = await page.locator('[data-result-total]').textContent();
    expect(totalGbp).toContain('£50.00');
    await page.selectOption('[data-currency]', 'USD');
    const totalUsd = await page.locator('[data-result-total]').textContent();
    expect(totalUsd).toContain('$50.00');
    await page.selectOption('[data-currency]', 'EUR');
    const totalEur = await page.locator('[data-result-total]').textContent();
    expect(totalEur).toContain('€50.00');
  });

  test('detailed mode: adding a row works', async ({ page }) => {
    await page.locator('input[data-mode][value="detailed"]').check();
    const before = await page.locator('[data-detailed-row]').count();
    await page.locator('[data-add-row]').click();
    const after = await page.locator('[data-detailed-row]').count();
    expect(after).toBe(before + 1);
  });

  test('detailed mode: produces a breakdown row per role', async ({ page }) => {
    await page.locator('input[data-mode][value="detailed"]').check();
    await page.locator('[data-calculate]').click();
    const rows = await page.locator('[data-breakdown-body] tr').count();
    expect(rows).toBeGreaterThanOrEqual(2);
  });

  test('prove-it panel exists and lists working hours assumption', async ({ page }) => {
    const prove = page.locator('[data-prove-it]');
    await expect(prove).toBeVisible();
    await prove.locator('summary').click();
    await expect(prove).toContainText('1,800');
    await expect(prove).toContainText('Hourly rate');
  });

  test('prove-it open fires prove_it dataLayer event', async ({ page }) => {
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it' && e.calculator_name === 'Meeting Cost Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.fill('[data-simple-attendees]', '7');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Meeting Cost Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event with total_cost field', async ({ page }) => {
    await page.fill('[data-simple-attendees]', '5');
    await page.fill('[data-simple-salary]', '60000');
    await page.fill('[data-duration]', '45');
    await page.locator('[data-calculate]').click();
    const evt = await page.evaluate(() => {
      const all = window.dataLayer.filter(e => e.event === 'calculator_result' && e.calculator_name === 'Meeting Cost Calculator');
      return all[all.length - 1];
    });
    expect(evt).toBeTruthy();
    expect(typeof evt.total_cost).toBe('number');
    expect(typeof evt.annual_cost).toBe('number');
    expect(typeof evt.person_hours).toBe('number');
    expect(evt.duration_minutes).toBe(45);
    expect(evt.currency).toBe('GBP');
  });

  test('window.MeetingCostCalculator exposes pure-logic helpers', async ({ page }) => {
    const exposed = await page.evaluate(() => {
      const lib = window.MeetingCostCalculator;
      return {
        hasMeetingCost: typeof lib.meetingCost === 'function',
        hasHourlyRate: typeof lib.hourlyRate === 'function',
        hasLiveTickerCost: typeof lib.liveTickerCost === 'function',
        wHours: lib.WORKING_HOURS_PER_YEAR,
      };
    });
    expect(exposed.hasMeetingCost).toBe(true);
    expect(exposed.hasHourlyRate).toBe(true);
    expect(exposed.hasLiveTickerCost).toBe(true);
    expect(exposed.wHours).toBe(1800);
  });

  test('live ticker starts and shows non-zero cost after a moment', async ({ page }) => {
    await page.fill('[data-simple-attendees]', '5');
    await page.fill('[data-simple-salary]', '60000');
    await page.fill('[data-duration]', '60');
    await page.locator('[data-calculate]').click();
    await page.locator('[data-ticker-start]').click();
    await page.waitForTimeout(700);
    const status = await page.locator('[data-ticker-status]').textContent();
    expect(status.toLowerCase()).toContain('running');
    const cost = await page.locator('[data-ticker-cost]').textContent();
    // Should not still be £0.00
    expect(cost).not.toBe('£0.00');
  });

  test('live ticker pauses and resumes without drifting backwards', async ({ page }) => {
    await page.fill('[data-simple-attendees]', '5');
    await page.fill('[data-simple-salary]', '60000');
    await page.fill('[data-duration]', '60');
    await page.locator('[data-calculate]').click();
    await page.locator('[data-ticker-start]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-ticker-pause]').click();
    const beforeText = await page.locator('[data-ticker-time]').textContent();
    await page.waitForTimeout(400);
    const afterText = await page.locator('[data-ticker-time]').textContent();
    expect(afterText).toBe(beforeText);
  });

  test('live ticker reset returns to 00:00', async ({ page }) => {
    await page.fill('[data-simple-attendees]', '5');
    await page.fill('[data-simple-salary]', '60000');
    await page.fill('[data-duration]', '60');
    await page.locator('[data-calculate]').click();
    await page.locator('[data-ticker-start]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-ticker-reset]').click();
    const t = await page.locator('[data-ticker-time]').textContent();
    expect(t).toBe('00:00');
  });

  test('long-form covers meeting culture honestly', async ({ page }) => {
    const lf = page.locator('.long-form');
    await expect(lf).toContainText('overheads');
    await expect(lf).toContainText('context-switch');
  });
});

test.describe('Meeting Cost Calculator hub registration', () => {
  test('Productivity hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/productivity/');
    await expect(page.getByRole('link', { name: 'Meeting Cost Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('Productivity hub ItemList JSON-LD includes the new calculator', async ({ page }) => {
    await page.goto('/calculators/productivity/');
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(jsonLd);
    const names = parsed.mainEntity.itemListElement.map(i => i.name);
    expect(names).toContain('Meeting Cost Calculator');
  });

  test('All-calculators hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Meeting Cost Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
