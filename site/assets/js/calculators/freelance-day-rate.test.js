'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateFreelanceDayRate, DEFAULTS } = require('./freelance-day-rate.js');

test('DEFAULTS are sane', () => {
  assert.equal(DEFAULTS.workingDaysPerYear, 260);
  assert.equal(DEFAULTS.nonBillableDays, 40);
  assert.equal(DEFAULTS.pensionPercent, 5);
  assert.equal(DEFAULTS.downtimePercent, 15);
});

test('basic calculation with all defaults — £50k income target', () => {
  const r = calculateFreelanceDayRate({ annualIncomeTarget: 50000 });
  assert.equal(r.billableDays, 220);           // 260 - 40
  assert.equal(r.pensionAmount, 2500);         // 5% of 50k
  assert.equal(r.subtotal, 52500);             // 50k + 0 expenses + 2.5k pension
  // totalRequired = 52500 / 0.85 = 61764.71
  assert.ok(r.totalRequired > 61000 && r.totalRequired < 62000);
  // day rate = totalRequired / 220
  assert.ok(r.dayRate > 280 && r.dayRate < 290);
  assert.equal(r.annualIncomeTarget, 50000);
});

test('manual verification: £60k income, no expenses, 5% pension, 15% downtime, 220 billable days', () => {
  const r = calculateFreelanceDayRate({ annualIncomeTarget: 60000 });
  const pension   = 3000;   // 5% of 60k
  const subtotal  = 63000;  // 60k + 0 + 3k
  const total     = Math.round(63000 / 0.85 * 100) / 100;
  const dayRate   = Math.round(total / 220 * 100) / 100;
  assert.equal(r.pensionAmount, pension);
  assert.equal(r.subtotal, subtotal);
  assert.equal(r.totalRequired, total);
  assert.equal(r.dayRate, dayRate);
});

test('hourly rate is dayRate / 8', () => {
  const r = calculateFreelanceDayRate({ annualIncomeTarget: 50000 });
  assert.equal(r.hourlyRate, Math.round(r.dayRate / 8 * 100) / 100);
});

test('weekly rate is dayRate × 5', () => {
  const r = calculateFreelanceDayRate({ annualIncomeTarget: 50000 });
  assert.equal(r.weeklyRate, Math.round(r.dayRate * 5 * 100) / 100);
});

test('with £3000 annual expenses increases day rate', () => {
  const base     = calculateFreelanceDayRate({ annualIncomeTarget: 50000 });
  const withCost = calculateFreelanceDayRate({ annualIncomeTarget: 50000, annualExpenses: 3000 });
  assert.ok(withCost.dayRate > base.dayRate);
  assert.equal(withCost.annualExpenses, 3000);
});

test('zero pension percent removes pension amount', () => {
  const r = calculateFreelanceDayRate({ annualIncomeTarget: 50000, pensionPercent: 0 });
  assert.equal(r.pensionAmount, 0);
});

test('zero downtime percent reduces totalRequired to subtotal', () => {
  const r = calculateFreelanceDayRate({ annualIncomeTarget: 50000, downtimePercent: 0 });
  assert.equal(r.totalRequired, r.subtotal);
  assert.equal(r.downtimeBuffer, 0);
});

test('more non-billable days → higher day rate', () => {
  const fewer = calculateFreelanceDayRate({ annualIncomeTarget: 50000, nonBillableDays: 30 });
  const more  = calculateFreelanceDayRate({ annualIncomeTarget: 50000, nonBillableDays: 60 });
  assert.ok(more.dayRate > fewer.dayRate);
});

test('billableDays = workingDaysPerYear - nonBillableDays', () => {
  const r = calculateFreelanceDayRate({
    annualIncomeTarget: 50000,
    workingDaysPerYear: 250,
    nonBillableDays: 30,
  });
  assert.equal(r.billableDays, 220);
});

test('throws on missing or zero income', () => {
  assert.throws(() => calculateFreelanceDayRate({ annualIncomeTarget: 0 }), /annualIncomeTarget/);
  assert.throws(() => calculateFreelanceDayRate({ annualIncomeTarget: -1000 }), /annualIncomeTarget/);
  assert.throws(() => calculateFreelanceDayRate({}), /annualIncomeTarget/);
});

test('throws when nonBillableDays >= workingDaysPerYear', () => {
  assert.throws(() => calculateFreelanceDayRate({
    annualIncomeTarget: 50000,
    workingDaysPerYear: 260,
    nonBillableDays: 260,
  }), /nonBillableDays/);
});

test('throws on negative expenses', () => {
  assert.throws(() => calculateFreelanceDayRate({
    annualIncomeTarget: 50000,
    annualExpenses: -100,
  }), /annualExpenses/);
});

test('throws on pension >= 100', () => {
  assert.throws(() => calculateFreelanceDayRate({
    annualIncomeTarget: 50000,
    pensionPercent: 100,
  }), /pensionPercent/);
});

test('throws on downtime >= 100', () => {
  assert.throws(() => calculateFreelanceDayRate({
    annualIncomeTarget: 50000,
    downtimePercent: 100,
  }), /downtimePercent/);
});
