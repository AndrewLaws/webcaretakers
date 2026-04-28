// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/productivity/project-deadline-countdown-calculator/';

test.describe('Project Deadline Countdown Calculator page', () => {
  test('has the expected h1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Project Deadline Countdown Calculator' })).toBeVisible();
  });

  test('breadcrumb routes through Calculators > Productivity', async ({ page }) => {
    await page.goto(URL);
    const items = await page.locator('.breadcrumbs li').allTextContents();
    expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Productivity', 'Project Deadline Countdown Calculator']);
  });

  test('has an ELI5 explanation section', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.eli5')).toBeVisible();
    await expect(page.locator('.eli5')).toContainText(/deadline date/i);
  });

  test('calculate flow returns numbers for a future deadline', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-pdc-start]', '2026-04-27');
    await page.fill('[data-pdc-deadline]', '2026-05-01');
    await page.click('[data-pdc-calc]');
    await expect(page.locator('[data-pdc-results]')).toBeVisible();
    await expect(page.locator('[data-pdc-cal-days]')).toHaveText('4');
    await expect(page.locator('[data-pdc-work-days]')).toHaveText('4');
    await expect(page.locator('[data-pdc-work-hours]')).toHaveText('30');
  });

  test('past deadline shows a clear warning', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-pdc-start]', '2026-04-27');
    await page.fill('[data-pdc-deadline]', '2026-04-20');
    await page.click('[data-pdc-calc]');
    await expect(page.locator('[data-pdc-past-flag]')).toBeVisible();
    await expect(page.locator('[data-pdc-summary]')).toContainText(/Deadline was/i);
  });

  test('all days unchecked shows the no-working-days flag', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-pdc-start]', '2026-04-27');
    await page.fill('[data-pdc-deadline]', '2026-05-30');
    for (const v of ['0','1','2','3','4','5','6']) {
      const box = page.locator(`[data-pdc-day][value="${v}"]`);
      if (await box.isChecked()) await box.uncheck();
    }
    await page.click('[data-pdc-calc]');
    await expect(page.locator('[data-pdc-no-work-flag]')).toBeVisible();
    await expect(page.locator('[data-pdc-work-days]')).toHaveText('0');
  });

  test('UK 2026 bank holidays button populates the textarea', async ({ page }) => {
    await page.goto(URL);
    await page.click('[data-pdc-add-uk]');
    const text = await page.locator('[data-pdc-holidays]').inputValue();
    expect(text).toContain('2026-04-03');
    expect(text).toContain('2026-12-25');
    expect(text).toContain('2026-12-28');
  });

  test('holiday on a weekday is excluded from the working-day count', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-pdc-start]', '2026-04-27');
    await page.fill('[data-pdc-deadline]', '2026-05-04');
    // 2026-05-04 is the Early May Bank Holiday (a Monday).
    await page.fill('[data-pdc-holidays]', '2026-05-04');
    await page.click('[data-pdc-calc]');
    // 27 Apr Mon (start, excluded). 28-30 Apr + 1 May = 4 weekdays. Mon 4 May would normally count, but is a holiday.
    // Total working days = 4.
    await expect(page.locator('[data-pdc-work-days]')).toHaveText('4');
  });

  test('prove-it panel reveals the working after calculate', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-pdc-start]', '2026-04-27');
    await page.fill('[data-pdc-deadline]', '2026-05-01');
    await page.click('[data-pdc-calc]');
    await page.locator('[data-prove-it] summary').click();
    await expect(page.locator('[data-prove-it-body]')).toContainText(/algorithm/i);
    await expect(page.locator('[data-prove-it-body]')).toContainText(/Calendar days between them/i);
  });

  test('invalid deadline shows an error', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-pdc-start]', '2026-04-27');
    // Leave deadline blank.
    await page.click('[data-pdc-calc]');
    await expect(page.locator('[data-pdc-error]')).toContainText(/valid deadline/i);
  });

  test('mini-calendar renders a cell per day', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-pdc-start]', '2026-04-27');
    await page.fill('[data-pdc-deadline]', '2026-05-01');
    await page.click('[data-pdc-calc]');
    const cells = await page.locator('.pdc-mini-cal__cell').count();
    expect(cells).toBeGreaterThan(0);
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-pdc-deadline]', '2026-05-01');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Project Deadline Countdown Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event after calculate', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-pdc-start]', '2026-04-27');
    await page.fill('[data-pdc-deadline]', '2026-05-01');
    await page.click('[data-pdc-calc]');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'Project Deadline Countdown Calculator')
    );
    expect(evt).toBeTruthy();
    expect(evt.calendar_days).toBe(4);
    expect(evt.working_days).toBe(4);
  });

  test('pushes prove_it event when details opened', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-prove-it] summary').click();
    await expect.poll(() => page.evaluate(() =>
      !!window.dataLayer.find(e => e.event === 'prove_it' && e.calculator_name === 'Project Deadline Countdown Calculator')
    )).toBe(true);
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication JSON-LD names the calculator and is BusinessApplication', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('Project Deadline Countdown Calculator');
    expect(sa.applicationCategory).toBe('BusinessApplication');
  });
});

test.describe('Project Deadline Countdown Calculator hub registration', () => {
  test('Productivity hub lists the Project Deadline Countdown Calculator', async ({ page }) => {
    await page.goto('/calculators/productivity/');
    await expect(page.getByRole('link', { name: 'Project Deadline Countdown Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the Project Deadline Countdown Calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Project Deadline Countdown Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
