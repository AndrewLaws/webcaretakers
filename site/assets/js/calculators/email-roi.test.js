'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateEmailROI } = require('./email-roi.js');

function approx(actual, expected, tolerance = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

// ── Core profitable scenario ──────────────────────────────────────────────────
// List: 5,000 | Sends: 4/mo | Open: 22% | Click: 2.5% | Conv: 2% | £50/conv | £80 ESP
// Monthly sends = 20,000 | Clicks = 500 | Conversions = 10 | Revenue = £500
test('basic profitable scenario', () => {
  const r = calculateEmailROI({
    listSize: 5000,
    sendsPerMonth: 4,
    openRate: 22,
    clickRate: 2.5,
    conversionRate: 2,
    revenuePerConversion: 50,
    monthlyEspCost: 80,
    monthlyContentCost: 0,
    periodMonths: 12,
  });

  assert.equal(r.monthlyEmailsSent, 20000);
  approx(r.monthlyOpens, 4400);           // 20000 × 0.22
  approx(r.monthlyClicks, 500);           // 20000 × 0.025
  approx(r.monthlyConversions, 10);       // 500 × 0.02
  approx(r.monthlyRevenue, 500);          // 10 × £50
  approx(r.monthlyCost, 80);
  approx(r.monthlyNetProfit, 420);        // 500 − 80
  approx(r.totalRevenue, 6000);           // 500 × 12
  approx(r.totalCost, 960);              // 80 × 12
  approx(r.totalNetProfit, 5040);         // 420 × 12
  approx(r.roiPercent, 525);             // 5040 / 960 × 100
  assert.equal(r.isProfitable, true);
  assert.equal(r.periodMonths, 12);
});

// ── Revenue per unit invested ──────────────────────────────────────────────
test('revenue per unit invested', () => {
  const r = calculateEmailROI({
    listSize: 5000,
    sendsPerMonth: 4,
    openRate: 22,
    clickRate: 2.5,
    conversionRate: 2,
    revenuePerConversion: 50,
    monthlyEspCost: 80,
    monthlyContentCost: 0,
    periodMonths: 12,
  });
  // monthly revenue 500 / monthly cost 80 = 6.25
  approx(r.revenuePerUnitInvested, 6.25);
});

// ── Cost per conversion ────────────────────────────────────────────────────
test('cost per conversion', () => {
  const r = calculateEmailROI({
    listSize: 5000,
    sendsPerMonth: 4,
    openRate: 22,
    clickRate: 2.5,
    conversionRate: 2,
    revenuePerConversion: 50,
    monthlyEspCost: 80,
    monthlyContentCost: 0,
    periodMonths: 12,
  });
  // cost 80 / conversions 10 = £8
  approx(r.costPerConversion, 8);
});

// ── Break-even list size ───────────────────────────────────────────────────
// Revenue per subscriber per month = 4 × 0.025 × 0.02 × £50 = £0.10
// Break-even = ceil(£80 / £0.10) = 800
test('break-even list size', () => {
  const r = calculateEmailROI({
    listSize: 5000,
    sendsPerMonth: 4,
    openRate: 22,
    clickRate: 2.5,
    conversionRate: 2,
    revenuePerConversion: 50,
    monthlyEspCost: 80,
    monthlyContentCost: 0,
    periodMonths: 12,
  });
  assert.equal(r.breakEvenListSize, 800);
});

// ── Content cost included ──────────────────────────────────────────────────
test('content cost is added to monthly cost', () => {
  const r = calculateEmailROI({
    listSize: 5000,
    sendsPerMonth: 4,
    openRate: 22,
    clickRate: 2.5,
    conversionRate: 2,
    revenuePerConversion: 50,
    monthlyEspCost: 80,
    monthlyContentCost: 200,
    periodMonths: 12,
  });
  approx(r.monthlyCost, 280);        // 80 + 200
  approx(r.monthlyNetProfit, 220);   // 500 − 280
});

// ── Loss scenario ──────────────────────────────────────────────────────────
// Small list, low conversion rate, high cost
test('loss scenario', () => {
  const r = calculateEmailROI({
    listSize: 500,
    sendsPerMonth: 2,
    openRate: 15,
    clickRate: 1,
    conversionRate: 1,
    revenuePerConversion: 20,
    monthlyEspCost: 100,
    monthlyContentCost: 0,
    periodMonths: 12,
  });
  // Monthly sends = 1000 | Clicks = 10 | Conversions = 0.1 | Revenue = £2
  approx(r.monthlyRevenue, 2);
  approx(r.monthlyNetProfit, -98);
  assert.ok(r.roiPercent < 0);
  assert.equal(r.isProfitable, false);
});

// ── Default period ─────────────────────────────────────────────────────────
test('periodMonths defaults to 12', () => {
  const r = calculateEmailROI({
    listSize: 5000,
    sendsPerMonth: 4,
    openRate: 22,
    clickRate: 2.5,
    conversionRate: 2,
    revenuePerConversion: 50,
    monthlyEspCost: 80,
  });
  assert.equal(r.periodMonths, 12);
  approx(r.totalCost, 960);   // 80 × 12
});

// ── Default content cost ───────────────────────────────────────────────────
test('monthlyContentCost defaults to 0', () => {
  const r = calculateEmailROI({
    listSize: 5000,
    sendsPerMonth: 4,
    openRate: 22,
    clickRate: 2.5,
    conversionRate: 2,
    revenuePerConversion: 50,
    monthlyEspCost: 80,
  });
  approx(r.monthlyCost, 80);
});

// ── Validation ────────────────────────────────────────────────────────────
test('rejects zero list size', () => {
  assert.throws(() => calculateEmailROI({
    listSize: 0, sendsPerMonth: 4, openRate: 22, clickRate: 2.5,
    conversionRate: 2, revenuePerConversion: 50, monthlyEspCost: 80,
  }));
});

test('rejects zero sends per month', () => {
  assert.throws(() => calculateEmailROI({
    listSize: 5000, sendsPerMonth: 0, openRate: 22, clickRate: 2.5,
    conversionRate: 2, revenuePerConversion: 50, monthlyEspCost: 80,
  }));
});

test('rejects open rate above 100', () => {
  assert.throws(() => calculateEmailROI({
    listSize: 5000, sendsPerMonth: 4, openRate: 101, clickRate: 2.5,
    conversionRate: 2, revenuePerConversion: 50, monthlyEspCost: 80,
  }));
});

test('rejects zero click rate', () => {
  assert.throws(() => calculateEmailROI({
    listSize: 5000, sendsPerMonth: 4, openRate: 22, clickRate: 0,
    conversionRate: 2, revenuePerConversion: 50, monthlyEspCost: 80,
  }));
});

test('rejects click rate above 100', () => {
  assert.throws(() => calculateEmailROI({
    listSize: 5000, sendsPerMonth: 4, openRate: 22, clickRate: 101,
    conversionRate: 2, revenuePerConversion: 50, monthlyEspCost: 80,
  }));
});

test('rejects zero conversion rate', () => {
  assert.throws(() => calculateEmailROI({
    listSize: 5000, sendsPerMonth: 4, openRate: 22, clickRate: 2.5,
    conversionRate: 0, revenuePerConversion: 50, monthlyEspCost: 80,
  }));
});

test('rejects zero revenue per conversion', () => {
  assert.throws(() => calculateEmailROI({
    listSize: 5000, sendsPerMonth: 4, openRate: 22, clickRate: 2.5,
    conversionRate: 2, revenuePerConversion: 0, monthlyEspCost: 80,
  }));
});

test('rejects negative ESP cost', () => {
  assert.throws(() => calculateEmailROI({
    listSize: 5000, sendsPerMonth: 4, openRate: 22, clickRate: 2.5,
    conversionRate: 2, revenuePerConversion: 50, monthlyEspCost: -10,
  }));
});

test('rejects negative content cost', () => {
  assert.throws(() => calculateEmailROI({
    listSize: 5000, sendsPerMonth: 4, openRate: 22, clickRate: 2.5,
    conversionRate: 2, revenuePerConversion: 50, monthlyEspCost: 80,
    monthlyContentCost: -50,
  }));
});
