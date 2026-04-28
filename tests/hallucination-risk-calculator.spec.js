const { test, expect } = require('@playwright/test');

test.describe('AI Hallucination Risk Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/ai/hallucination-risk-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'AI Hallucination Risk Calculator' })).toBeVisible();
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

  test('all five select inputs are present', async ({ page }) => {
    await expect(page.locator('[data-model-class]')).toBeVisible();
    await expect(page.locator('[data-task-type]')).toBeVisible();
    await expect(page.locator('[data-grounding]')).toBeVisible();
    await expect(page.locator('[data-verification]')).toBeVisible();
    await expect(page.locator('[data-stakes]')).toBeVisible();
  });

  test('result panel is hidden until calculate is clicked', async ({ page }) => {
    await expect(page.locator('[data-result]')).toBeHidden();
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-result]')).toBeVisible();
  });

  test('default mid-tier + general Q&A + no grounding + no verification yields 42 (Moderate)', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-score]')).toHaveText('42');
    await expect(page.locator('[data-band]')).toHaveText('Moderate');
  });

  test('switching to small model + citation + no grounding + no verification caps at 100 (Critical)', async ({ page }) => {
    await page.selectOption('[data-model-class]', 'small');
    await page.selectOption('[data-task-type]', 'citation');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-score]')).toHaveText('100');
    await expect(page.locator('[data-band]')).toHaveText('Critical');
  });

  test('breakdown lists each multiplier and the product', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const breakdown = page.locator('[data-breakdown]');
    await expect(breakdown).toContainText('Base risk');
    await expect(breakdown).toContainText('Model class');
    await expect(breakdown).toContainText('Grounding');
    await expect(breakdown).toContainText('Verification');
  });

  test('prove-it details block is present', async ({ page }) => {
    await expect(page.locator('[data-prove-it]')).toBeVisible();
    await expect(page.locator('[data-prove-it] summary')).toContainText('Prove it');
  });

  test('pushes calculator_interaction event on input change', async ({ page }) => {
    await page.selectOption('[data-task-type]', 'citation');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'AI Hallucination Risk Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event with score and band fields', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'AI Hallucination Risk Calculator')
    );
    expect(evt).toBeTruthy();
    expect(typeof evt.risk_score).toBe('number');
    expect(typeof evt.band).toBe('string');
    expect(typeof evt.model_class).toBe('string');
    expect(typeof evt.task_type).toBe('string');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication JSON-LD names the calculator and uses BusinessApplication', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('AI Hallucination Risk Calculator');
    expect(sa.applicationCategory).toBe('BusinessApplication');
  });

  test('window.HallucinationRiskCalculator exposes pure-logic helpers', async ({ page }) => {
    const exposed = await page.evaluate(() => {
      const lib = window.HallucinationRiskCalculator;
      return {
        hasScore: typeof lib.score === 'function',
        hasBandFor: typeof lib.bandFor === 'function',
        hasRecommend: typeof lib.recommend === 'function',
        modelKeys: Object.keys(lib.MODEL_CLASSES).length,
        taskKeys: Object.keys(lib.TASK_TYPES).length,
      };
    });
    expect(exposed.hasScore).toBe(true);
    expect(exposed.hasBandFor).toBe(true);
    expect(exposed.hasRecommend).toBe(true);
    expect(exposed.modelKeys).toBe(4);
    expect(exposed.taskKeys).toBe(6);
  });

  test('safety-critical stakes recommendation flags the stakes even at low score', async ({ page }) => {
    await page.selectOption('[data-model-class]', 'fineTunedDomain');
    await page.selectOption('[data-task-type]', 'creative');
    await page.selectOption('[data-grounding]', 'knowledgeGraph');
    await page.selectOption('[data-verification]', 'programmatic');
    await page.selectOption('[data-stakes]', 'safetyCritical');
    await page.locator('[data-calculate]').click();
    const recText = await page.locator('[data-recommendation]').textContent();
    expect(recText.toLowerCase()).toMatch(/safety[- ]critical|sign[- ]off|domain expert/);
  });

  test('FAQ section contains the citation question', async ({ page }) => {
    const faq = page.locator('.faq');
    await expect(faq).toContainText('citation generation rated highest');
  });

  test('long-form covers when to use it and common mistakes', async ({ page }) => {
    const longForm = page.locator('.long-form');
    await expect(longForm).toContainText('When to use this');
    await expect(longForm).toContainText('Common mistakes');
  });
});

test.describe('AI Hallucination Risk Calculator hub registration', () => {
  test('AI hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/ai/');
    await expect(page.getByRole('link', { name: 'AI Hallucination Risk Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('AI hub ItemList JSON-LD includes the new calculator', async ({ page }) => {
    await page.goto('/calculators/ai/');
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(jsonLd);
    const names = parsed.mainEntity.itemListElement.map(i => i.name);
    expect(names).toContain('AI Hallucination Risk Calculator');
  });

  test('All-calculators hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'AI Hallucination Risk Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
