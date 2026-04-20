'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateSEOROI } = require('./seo-roi.js');

function approx(actual, expected, tolerance = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

// ── Core profitable scenario ──────────────────────────────────────────────────
// £1,000/mo cost, 10k → 15k sessions, 2% conversion, £50/conversion
test('basic profitable scenario', () => {
  const r = calculateSEOROI({
    monthlyCost: 1000,
    currentSessions: 10000,
    projectedSessions: 15000,
    conversionRate: 2,
    valuePerConversion: 50,
    periodMonths: 12,
  });

  assert.equal(r.additionalSessions, 5000);
  approx(r.additionalMonthlyConversions, 100);     // 5000 × 0.02
  approx(r.additionalMonthlyRevenue, 5000);         // 100 × £50
  approx(r.monthlyNetProfit, 4000);                 // 5000 − 1000
  approx(r.totalInvestment, 12000);                 // 1000 × 12
  approx(r.totalAdditionalRevenue, 60000);          // 5000 × 12
  approx(r.totalNetProfit, 48000);                  // 4000 × 12
  approx(r.roiPercent, 400);                        // 48000 / 12000 × 100
  assert.equal(r.isProfitable, true);
});

// ── Revenue per £1 invested ───────────────────────────────────────────────────
test('revenue per unit invested', () => {
  const r = calculateSEOROI({
    monthlyCost: 1000,
    currentSessions: 10000,
    projectedSessions: 15000,
    conversionRate: 2,
    valuePerConversion: 50,
    periodMonths: 12,
  });
  // additional revenue 5000 / cost 1000 = 5
  approx(r.revenuePerUnitInvested, 5);
});

// ── Break-even sessions ───────────────────────────────────────────────────────
// min sessions = cost / (rate × value) = 1000 / (0.02 × 50) = 1000
test('break-even sessions per month', () => {
  const r = calculateSEOROI({
    monthlyCost: 1000,
    currentSessions: 0,
    projectedSessions: 0,
    conversionRate: 2,
    valuePerConversion: 50,
    periodMonths: 12,
  });
  approx(r.breakEvenSessionsPerMonth, 1000);
});

// ── Current and projected monthly figures ────────────────────────────────────
test('current and projected monthly revenue split correctly', () => {
  const r = calculateSEOROI({
    monthlyCost: 500,
    currentSessions: 5000,
    projectedSessions: 8000,
    conversionRate: 1,
    valuePerConversion: 100,
  });
  approx(r.currentMonthlyConversions, 50);           // 5000 × 0.01
  approx(r.projectedMonthlyConversions, 80);         // 8000 × 0.01
  approx(r.currentMonthlyRevenue, 5000);             // 50 × 100
  approx(r.projectedMonthlyRevenue, 8000);           // 80 × 100
});

// ── Loss scenario ─────────────────────────────────────────────────────────────
// £1,000/mo cost, 10k → 11k sessions, 1% conversion, £20/conversion
// Additional revenue = 1000 × 0.01 × 20 = £200 < £1000 cost → loss
test('loss scenario', () => {
  const r = calculateSEOROI({
    monthlyCost: 1000,
    currentSessions: 10000,
    projectedSessions: 11000,
    conversionRate: 1,
    valuePerConversion: 20,
    periodMonths: 12,
  });
  approx(r.additionalMonthlyRevenue, 200);
  approx(r.monthlyNetProfit, -800);
  assert.ok(r.roiPercent < 0);
  assert.equal(r.isProfitable, false);
});

// ── Zero additional traffic ───────────────────────────────────────────────────
test('no additional sessions gives zero additional revenue', () => {
  const r = calculateSEOROI({
    monthlyCost: 1000,
    currentSessions: 5000,
    projectedSessions: 5000,
    conversionRate: 3,
    valuePerConversion: 100,
    periodMonths: 12,
  });
  assert.equal(r.additionalSessions, 0);
  approx(r.additionalMonthlyRevenue, 0);
  approx(r.monthlyNetProfit, -1000);
  approx(r.roiPercent, -100);
});

// ── Default period ────────────────────────────────────────────────────────────
test('periodMonths defaults to 12', () => {
  const r = calculateSEOROI({
    monthlyCost: 500,
    currentSessions: 1000,
    projectedSessions: 2000,
    conversionRate: 2,
    valuePerConversion: 50,
  });
  assert.equal(r.periodMonths, 12);
  approx(r.totalInvestment, 6000);   // 500 × 12
});

// ── New site (zero current sessions) ─────────────────────────────────────────
test('new site with zero current sessions', () => {
  const r = calculateSEOROI({
    monthlyCost: 750,
    currentSessions: 0,
    projectedSessions: 3000,
    conversionRate: 2.5,
    valuePerConversion: 80,
  });
  approx(r.currentMonthlyRevenue, 0);
  approx(r.additionalMonthlyConversions, 75);    // 3000 × 0.025
  approx(r.additionalMonthlyRevenue, 6000);      // 75 × 80
  assert.equal(r.isProfitable, true);
});

// ── Validation ────────────────────────────────────────────────────────────────
test('rejects zero monthly cost', () => {
  assert.throws(() => calculateSEOROI({
    monthlyCost: 0, currentSessions: 1000, projectedSessions: 2000,
    conversionRate: 2, valuePerConversion: 50,
  }));
});

test('rejects negative monthly cost', () => {
  assert.throws(() => calculateSEOROI({
    monthlyCost: -500, currentSessions: 1000, projectedSessions: 2000,
    conversionRate: 2, valuePerConversion: 50,
  }));
});

test('rejects zero conversion rate', () => {
  assert.throws(() => calculateSEOROI({
    monthlyCost: 1000, currentSessions: 1000, projectedSessions: 2000,
    conversionRate: 0, valuePerConversion: 50,
  }));
});

test('rejects conversion rate above 100', () => {
  assert.throws(() => calculateSEOROI({
    monthlyCost: 1000, currentSessions: 1000, projectedSessions: 2000,
    conversionRate: 101, valuePerConversion: 50,
  }));
});

test('rejects zero value per conversion', () => {
  assert.throws(() => calculateSEOROI({
    monthlyCost: 1000, currentSessions: 1000, projectedSessions: 2000,
    conversionRate: 2, valuePerConversion: 0,
  }));
});

test('rejects negative sessions', () => {
  assert.throws(() => calculateSEOROI({
    monthlyCost: 1000, currentSessions: -100, projectedSessions: 2000,
    conversionRate: 2, valuePerConversion: 50,
  }));
});
