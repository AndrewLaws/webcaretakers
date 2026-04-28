const { test, expect } = require('@playwright/test');

test.describe('Sprint Capacity Planner page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/productivity/sprint-capacity-planner/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Sprint Capacity Planner' })).toBeVisible();
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

  test('SoftwareApplication JSON-LD is BusinessApplication', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('Sprint Capacity Planner');
    expect(sa.applicationCategory).toBe('BusinessApplication');
    expect(sa.offers).toBeTruthy();
  });

  test('FAQPage has at least three Q&As', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faq = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'FAQPage');
    expect(faq).toBeTruthy();
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
  });

  test('seeds three team rows by default', async ({ page }) => {
    const rows = await page.locator('[data-person-row]').count();
    expect(rows).toBe(3);
  });

  test('add team member adds a row', async ({ page }) => {
    const before = await page.locator('[data-person-row]').count();
    await page.locator('[data-add-person]').click();
    const after = await page.locator('[data-person-row]').count();
    expect(after).toBe(before + 1);
  });

  test('default inputs produce a sensible forecast', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    // Default: 10 days, 6 hr/day, 0.6 vel, 20% band
    // Alex: 10*6*0.7*0.9 = 37.8
    // Bel:  8*6*0.7*0.9  = 30.24
    // Cam:  10*6*0.65*0.85 = 33.15
    // total hours = 101.19, days = 16.865, points = 10.119
    const hoursText = await page.locator('[data-result-hours]').textContent();
    expect(hoursText).toMatch(/101/);
    const pointsText = await page.locator('[data-result-points]').textContent();
    expect(pointsText).toMatch(/10/);
    const bandText = await page.locator('[data-result-band]').textContent();
    expect(bandText).toContain('to');
  });

  test('single-person calculation matches the documented formula', async ({ page }) => {
    // Reduce to one person, no holidays, no ceremonies, full focus.
    await page.locator('[data-row-remove]').first().click();
    await page.locator('[data-row-remove]').first().click();
    await page.locator('[data-row-holiday]').first().fill('0');
    await page.locator('[data-row-ceremonies]').first().fill('0');
    await page.locator('[data-row-focus]').first().fill('100');
    await page.locator('[data-calculate]').click();
    // 10 * 6 = 60 hours, 10 days, 6 points
    const hours = await page.locator('[data-result-hours]').textContent();
    expect(hours).toContain('60');
    const days = await page.locator('[data-result-days]').textContent();
    expect(days).toContain('10');
    const points = await page.locator('[data-result-points]').textContent();
    expect(points).toContain('6');
  });

  test('breakdown table renders one row per team member', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const breakdownRows = await page.locator('[data-breakdown-body] tr').count();
    expect(breakdownRows).toBe(3);
  });

  test('prove-it panel exists and lists per-person workings', async ({ page }) => {
    const prove = page.locator('[data-prove-it]');
    await expect(prove).toBeVisible();
    await prove.locator('summary').click();
    await expect(prove).toContainText('hours per day');
    await expect(prove).toContainText('Person-days');
  });

  test('prove-it open fires prove_it dataLayer event', async ({ page }) => {
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it' && e.calculator_name === 'Sprint Capacity Planner')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.fill('[data-sprint-days]', '14');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Sprint Capacity Planner')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event with forecast_points field', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const evt = await page.evaluate(() => {
      const all = window.dataLayer.filter(e => e.event === 'calculator_result' && e.calculator_name === 'Sprint Capacity Planner');
      return all[all.length - 1];
    });
    expect(evt).toBeTruthy();
    expect(typeof evt.total_hours).toBe('number');
    expect(typeof evt.total_days).toBe('number');
    expect(typeof evt.forecast_points).toBe('number');
    expect(typeof evt.team_size).toBe('number');
    expect(evt.team_size).toBe(3);
  });

  test('window.SprintCapacityPlanner exposes pure-logic helpers', async ({ page }) => {
    const exposed = await page.evaluate(() => {
      const lib = window.SprintCapacityPlanner;
      return {
        hasPersonHours: typeof lib.personHours === 'function',
        hasTeamCapacity: typeof lib.teamCapacity === 'function',
        defaultSprintDays: lib.DEFAULT_SPRINT_DAYS,
      };
    });
    expect(exposed.hasPersonHours).toBe(true);
    expect(exposed.hasTeamCapacity).toBe(true);
    expect(exposed.defaultSprintDays).toBe(10);
  });

  test('long-form covers focus factor and velocity honestly', async ({ page }) => {
    const lf = page.locator('.long-form');
    await expect(lf).toContainText('focus factor');
    await expect(lf).toContainText('velocity');
  });
});

test.describe('Sprint Capacity Planner hub registration', () => {
  test('Productivity hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/productivity/');
    await expect(page.getByRole('link', { name: 'Sprint Capacity Planner', includeHidden: true }).first()).toBeVisible();
  });

  test('Productivity hub ItemList JSON-LD includes the new calculator', async ({ page }) => {
    await page.goto('/calculators/productivity/');
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(jsonLd);
    const names = parsed.mainEntity.itemListElement.map(i => i.name);
    expect(names).toContain('Sprint Capacity Planner');
  });

  test('All-calculators hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Sprint Capacity Planner', includeHidden: true }).first()).toBeVisible();
  });
});
