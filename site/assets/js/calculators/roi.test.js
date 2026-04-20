'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateROI } = require('./roi.js');

function approx(actual, expected, tolerance = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

// Basic ROI
test('simple ROI: 1000 in, 1500 out => 50%', () => {
  const r = calculateROI({ initialInvestment: 1000, finalValue: 1500 });
  approx(r.roiPercent, 50);
  approx(r.netProfit, 500);
  approx(r.multiple, 1.5, 0.001);
  assert.equal(r.annualisedROIPercent, null);
});

test('ROI of zero: no gain', () => {
  const r = calculateROI({ initialInvestment: 1000, finalValue: 1000 });
  approx(r.roiPercent, 0);
  approx(r.netProfit, 0);
});

test('negative ROI: loss', () => {
  const r = calculateROI({ initialInvestment: 2000, finalValue: 1200 });
  approx(r.roiPercent, -40);
  approx(r.netProfit, -800);
});

test('100% ROI: double your money', () => {
  const r = calculateROI({ initialInvestment: 5000, finalValue: 10000 });
  approx(r.roiPercent, 100);
  approx(r.multiple, 2, 0.001);
});

// Annualised ROI (CAGR)
test('annualised: 1000 -> 1610.51 over 5 years => ~10%', () => {
  // 1000 * 1.1^5 = 1610.51
  const r = calculateROI({ initialInvestment: 1000, finalValue: 1610.51, periodYears: 5 });
  approx(r.annualisedROIPercent, 10, 0.02);
});

test('annualised: 5-year double => ~14.87%', () => {
  // 2^(1/5) - 1 = 0.14869
  const r = calculateROI({ initialInvestment: 10000, finalValue: 20000, periodYears: 5 });
  approx(r.annualisedROIPercent, 14.87, 0.05);
});

test('annualised with months: 18-month period', () => {
  // 1.5 years: (2000/1000)^(1/1.5) - 1 ≈ 58.74%
  const r = calculateROI({ initialInvestment: 1000, finalValue: 2000, periodYears: 1, periodMonths: 6 });
  assert.ok(r.annualisedROIPercent !== null);
  approx(r.annualisedROIPercent, 58.74, 0.1);
  approx(r.totalPeriodYears, 1.5, 0.001);
});

test('zero period means no annualised ROI', () => {
  const r = calculateROI({ initialInvestment: 1000, finalValue: 2000 });
  assert.equal(r.annualisedROIPercent, null);
  assert.equal(r.totalPeriodYears, null);
});

// Break-even
test('breakEvenPercent: how much more needed from current loss', () => {
  // bought at 100, now worth 80. Need +25% gain from 80 to break even.
  const r = calculateROI({ initialInvestment: 100, finalValue: 80 });
  // to recover: need (100/80 - 1) = 25%
  approx(r.breakEvenGainPercent, 25, 0.01);
});

test('breakEvenGainPercent is 0 if already in profit', () => {
  const r = calculateROI({ initialInvestment: 100, finalValue: 120 });
  approx(r.breakEvenGainPercent, 0);
});

// Validation
test('rejects zero initial investment', () => {
  assert.throws(() => calculateROI({ initialInvestment: 0, finalValue: 1000 }));
});

test('rejects negative initial investment', () => {
  assert.throws(() => calculateROI({ initialInvestment: -500, finalValue: 1000 }));
});

test('rejects negative final value', () => {
  assert.throws(() => calculateROI({ initialInvestment: 1000, finalValue: -1 }));
});
