const { test } = require('node:test');
const assert = require('node:assert');
const {
  classifyTemplate,
  aggregateByTemplate,
  checkBudgets,
} = require('./measure-cwv');

test('classifyTemplate identifies the homepage', () => {
  assert.strictEqual(classifyTemplate('/'), 'homepage');
});

test('classifyTemplate identifies the all-calculators index', () => {
  assert.strictEqual(classifyTemplate('/calculators/'), 'all-index');
});

test('classifyTemplate identifies a category hub', () => {
  assert.strictEqual(classifyTemplate('/calculators/health/'), 'hub');
});

test('classifyTemplate identifies a calculator page', () => {
  assert.strictEqual(
    classifyTemplate('/calculators/health/bmi-calculator/'),
    'calculator'
  );
});

test('classifyTemplate falls back to "other" for unknown paths', () => {
  assert.strictEqual(classifyTemplate('/about/'), 'other');
});

test('aggregateByTemplate computes per-template medians', () => {
  const measurements = [
    { url: '/calculators/health/bmi-calculator/', template: 'calculator', lcp: 1000, cls: 0.01, transferKb: 100 },
    { url: '/calculators/math/percentage-calculator/', template: 'calculator', lcp: 1500, cls: 0.02, transferKb: 110 },
    { url: '/calculators/finance/uk-mortgage-calculator/', template: 'calculator', lcp: 2000, cls: 0.03, transferKb: 120 },
    { url: '/', template: 'homepage', lcp: 800, cls: 0.0, transferKb: 90 },
  ];
  const agg = aggregateByTemplate(measurements);
  assert.strictEqual(agg.calculator.count, 3);
  assert.strictEqual(agg.calculator.lcp.median, 1500);
  assert.strictEqual(agg.calculator.cls.median, 0.02);
  assert.strictEqual(agg.homepage.count, 1);
  assert.strictEqual(agg.homepage.lcp.median, 800);
});

test('aggregateByTemplate also reports max so we can spot the worst page', () => {
  const measurements = [
    { url: '/a/', template: 'calculator', lcp: 1000, cls: 0.01, transferKb: 100 },
    { url: '/b/', template: 'calculator', lcp: 3000, cls: 0.05, transferKb: 200 },
  ];
  const agg = aggregateByTemplate(measurements);
  assert.strictEqual(agg.calculator.lcp.max, 3000);
  assert.strictEqual(agg.calculator.cls.max, 0.05);
  assert.strictEqual(agg.calculator.transferKb.max, 200);
});

test('checkBudgets returns no failures when all metrics are within budget', () => {
  const baseline = {
    calculator: { lcp: { median: 1500, max: 2000 }, cls: { median: 0.02, max: 0.05 }, transferKb: { median: 100, max: 150 } },
  };
  const budgets = {
    calculator: { lcp: 2500, cls: 0.1, transferKb: 200 },
  };
  assert.deepStrictEqual(checkBudgets(baseline, budgets), []);
});

test('checkBudgets flags a template that breaches LCP budget on the worst page', () => {
  const baseline = {
    calculator: { lcp: { median: 1500, max: 3000 }, cls: { median: 0.02, max: 0.05 }, transferKb: { median: 100, max: 150 } },
  };
  const budgets = {
    calculator: { lcp: 2500, cls: 0.1, transferKb: 200 },
  };
  const failures = checkBudgets(baseline, budgets);
  assert.strictEqual(failures.length, 1);
  assert.match(failures[0], /calculator.*lcp.*3000.*2500/);
});

test('checkBudgets ignores templates with no budget defined', () => {
  const baseline = {
    other: { lcp: { median: 9999, max: 9999 }, cls: { median: 0.5, max: 0.5 }, transferKb: { median: 999, max: 999 } },
  };
  const budgets = {
    calculator: { lcp: 2500, cls: 0.1, transferKb: 200 },
  };
  assert.deepStrictEqual(checkBudgets(baseline, budgets), []);
});
