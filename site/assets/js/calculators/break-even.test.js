'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateBreakEven } = require('./break-even.js');

// --- Basic break-even ---

test('classic example: £10k fixed, £5 varCost, £15 price → 1000 units break-even', () => {
  const r = calculateBreakEven({ fixedCosts: 10000, variableCostPerUnit: 5, sellingPricePerUnit: 15 });
  assert.equal(r.contributionMargin, 10);
  assert.equal(r.breakEvenUnits, 1000);
  assert.equal(r.breakEvenRevenue, 15000);
});

test('contribution margin percent: (£10 / £15) × 100 = 66.67%', () => {
  const r = calculateBreakEven({ fixedCosts: 10000, variableCostPerUnit: 5, sellingPricePerUnit: 15 });
  assert.equal(r.contributionMarginPct, 66.67);
});

test('non-exact break-even rounds up to next whole unit', () => {
  // fixedCosts 1000, margin 3 → 333.33 → ceil = 334
  const r = calculateBreakEven({ fixedCosts: 1000, variableCostPerUnit: 7, sellingPricePerUnit: 10 });
  assert.equal(r.contributionMargin, 3);
  assert.equal(r.breakEvenUnits, 334);
});

test('breakEvenRevenue = breakEvenUnits × sellingPrice', () => {
  const r = calculateBreakEven({ fixedCosts: 5000, variableCostPerUnit: 10, sellingPricePerUnit: 25 });
  assert.equal(r.breakEvenRevenue, r.breakEvenUnits * 25);
});

test('zero fixed costs → 0 break-even units', () => {
  const r = calculateBreakEven({ fixedCosts: 0, variableCostPerUnit: 5, sellingPricePerUnit: 20 });
  assert.equal(r.breakEvenUnits, 0);
  assert.equal(r.breakEvenRevenue, 0);
});

test('zero variable cost → contributionMargin equals sellingPrice', () => {
  const r = calculateBreakEven({ fixedCosts: 5000, variableCostPerUnit: 0, sellingPricePerUnit: 20 });
  assert.equal(r.contributionMargin, 20);
  assert.equal(r.breakEvenUnits, 250);
});

// --- Target profit ---

test('with targetProfit: (fixedCosts + profit) / contribution', () => {
  // (10000 + 5000) / 10 = 1500 units
  const r = calculateBreakEven({
    fixedCosts: 10000, variableCostPerUnit: 5, sellingPricePerUnit: 15,
    targetProfit: 5000,
  });
  assert.equal(r.targetUnits, 1500);
  assert.equal(r.targetRevenue, 22500);
});

test('targetProfit = 0 gives same units as break-even', () => {
  const r = calculateBreakEven({
    fixedCosts: 10000, variableCostPerUnit: 5, sellingPricePerUnit: 15,
    targetProfit: 0,
  });
  assert.equal(r.targetUnits, r.breakEvenUnits);
});

test('no targetProfit → targetUnits and targetRevenue are null', () => {
  const r = calculateBreakEven({ fixedCosts: 10000, variableCostPerUnit: 5, sellingPricePerUnit: 15 });
  assert.equal(r.targetUnits, null);
  assert.equal(r.targetRevenue, null);
});

// --- Scenario table ---

test('scenario table has 5 entries', () => {
  const r = calculateBreakEven({ fixedCosts: 10000, variableCostPerUnit: 5, sellingPricePerUnit: 15 });
  assert.equal(r.scenarios.length, 5);
});

test('scenario table factors are 0.5, 0.75, 1.0, 1.25, 1.5', () => {
  const r = calculateBreakEven({ fixedCosts: 10000, variableCostPerUnit: 5, sellingPricePerUnit: 15 });
  const factors = r.scenarios.map(s => s.factor);
  assert.deepEqual(factors, [0.5, 0.75, 1.0, 1.25, 1.5]);
});

test('at 100% of break-even, profit is zero or marginally positive (ceil rounding)', () => {
  const r = calculateBreakEven({ fixedCosts: 10000, variableCostPerUnit: 5, sellingPricePerUnit: 15 });
  const atBreakEven = r.scenarios.find(s => s.factor === 1.0);
  assert.ok(atBreakEven.profit >= 0);
});

test('at 150% of break-even, profit is positive', () => {
  const r = calculateBreakEven({ fixedCosts: 10000, variableCostPerUnit: 5, sellingPricePerUnit: 15 });
  const above = r.scenarios.find(s => s.factor === 1.5);
  assert.ok(above.profit > 0);
});

test('at 50% of break-even, profit is negative (loss)', () => {
  const r = calculateBreakEven({ fixedCosts: 10000, variableCostPerUnit: 5, sellingPricePerUnit: 15 });
  const below = r.scenarios.find(s => s.factor === 0.5);
  assert.ok(below.profit < 0);
});

test('scenario profit = revenue - variableCosts - fixedCosts', () => {
  const r = calculateBreakEven({ fixedCosts: 10000, variableCostPerUnit: 5, sellingPricePerUnit: 15 });
  for (const s of r.scenarios) {
    const expected = Math.round((s.revenue - s.variableCosts - 10000) * 100) / 100;
    assert.equal(s.profit, expected);
  }
});

// --- Validation ---

test('throws when price <= variable cost', () => {
  assert.throws(() => calculateBreakEven({
    fixedCosts: 5000, variableCostPerUnit: 20, sellingPricePerUnit: 15,
  }), /sellingPricePerUnit/);
  assert.throws(() => calculateBreakEven({
    fixedCosts: 5000, variableCostPerUnit: 15, sellingPricePerUnit: 15,
  }), /sellingPricePerUnit/);
});

test('throws on non-positive selling price', () => {
  assert.throws(() => calculateBreakEven({
    fixedCosts: 5000, variableCostPerUnit: 5, sellingPricePerUnit: 0,
  }), /sellingPricePerUnit/);
});

test('throws on negative fixed costs', () => {
  assert.throws(() => calculateBreakEven({
    fixedCosts: -1000, variableCostPerUnit: 5, sellingPricePerUnit: 15,
  }), /fixedCosts/);
});

test('throws on negative variable cost', () => {
  assert.throws(() => calculateBreakEven({
    fixedCosts: 5000, variableCostPerUnit: -1, sellingPricePerUnit: 15,
  }), /variableCostPerUnit/);
});
