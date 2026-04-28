const { test, expect } = require('@playwright/test');

test.describe('AI Fine-Tuning Cost Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/ai/fine-tuning-cost-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'AI Fine-Tuning Cost Calculator' })).toBeVisible();
  });

  test('has an ELI5 block', async ({ page }) => {
    const eli5 = page.locator('.eli5');
    await expect(eli5).toBeVisible();
    await expect(eli5).toContainText("Explain like I'm 5");
  });

  test('breadcrumb routes through Calculators > AI', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators', includeHidden: true })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'AI', includeHidden: true })).toHaveAttribute('href', '/calculators/ai/');
  });

  test('model dropdown lists the five required presets', async ({ page }) => {
    const values = await page.locator('[data-model] option').evaluateAll(opts => opts.map(o => o.value));
    expect(values).toEqual(expect.arrayContaining([
      'gpt-4o-mini',
      'gpt-4o',
      'llama-3-8b-together',
      'llama-3-70b-together',
      'mistral-7b',
    ]));
  });

  test('default epoch input is 3', async ({ page }) => {
    await expect(page.locator('[data-epochs]')).toHaveValue('3');
  });

  test('Last verified caption shows an ISO date', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const txt = await page.locator('[data-last-verified]').textContent();
    expect(txt.trim()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('submitting renders training and inference costs', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-breakdown]')).toBeVisible();
    const training = await page.locator('[data-line-training-cost]').textContent();
    const inference = await page.locator('[data-line-inference-1000]').textContent();
    expect(training).toMatch(/^\$/);
    expect(inference).toMatch(/^\$/);
  });

  test('words input auto-converts to tokens shown beside the field', async ({ page }) => {
    await page.fill('[data-data-words]', '1000');
    // The page shows the converted token count for transparency.
    const hint = await page.locator('[data-words-token-hint]').textContent();
    // Rendered with locale grouping (en-GB), so 1,330 not 1330.
    expect(hint).toMatch(/1[,\s]?330/);
  });

  test('prove-it details opens with training and inference math sections', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const prove = page.locator('[data-prove-it]');
    await prove.locator('summary').click();
    await expect(prove.locator('[data-prove-it-training]')).toBeVisible();
    await expect(prove.locator('[data-prove-it-inference]')).toBeVisible();
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.fill('[data-data-tokens]', '500000');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'AI Fine-Tuning Cost Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event with cost fields', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'AI Fine-Tuning Cost Calculator')
    );
    expect(evt).toBeTruthy();
    expect(typeof evt.training_cost).toBe('number');
    expect(typeof evt.inference_per_1000).toBe('number');
    expect(typeof evt.model).toBe('string');
  });

  test('pushes prove_it event when prove-it details opens', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await page.locator('[data-prove-it] summary').click();
    await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'prove_it' && e.calculator_name === 'AI Fine-Tuning Cost Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication JSON-LD has the BusinessApplication category and offers', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('AI Fine-Tuning Cost Calculator');
    expect(sa.applicationCategory).toBe('BusinessApplication');
    expect(sa.offers).toBeTruthy();
  });

  test('window.FineTuningCost exposes pure-logic helpers', async ({ page }) => {
    const exposed = await page.evaluate(() => {
      const lib = window.FineTuningCost;
      return {
        hasEstimate: typeof lib.estimate === 'function',
        hasTrainingCost: typeof lib.trainingCost === 'function',
        modelCount: lib.TUNING_MODELS.length,
      };
    });
    expect(exposed.hasEstimate).toBe(true);
    expect(exposed.hasTrainingCost).toBe(true);
    expect(exposed.modelCount).toBeGreaterThanOrEqual(5);
  });

  test('FAQ has at least three questions', async ({ page }) => {
    const faq = page.locator('.faq');
    await expect(faq).toBeVisible();
    const detailsCount = await faq.locator('details').count();
    expect(detailsCount).toBeGreaterThanOrEqual(3);
  });

  test('long-form links to the LLM Token Usage Calculator', async ({ page }) => {
    const link = page.locator('.long-form a[href="/calculators/ai/llm-token-usage-calculator/"]').first();
    await expect(link).toBeVisible();
  });
});

test.describe('AI hub registration for Fine-Tuning calculator', () => {
  test('AI hub lists the AI Fine-Tuning Cost Calculator', async ({ page }) => {
    await page.goto('/calculators/ai/');
    await expect(page.getByRole('link', { name: 'AI Fine-Tuning Cost Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the AI Fine-Tuning Cost Calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'AI Fine-Tuning Cost Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
