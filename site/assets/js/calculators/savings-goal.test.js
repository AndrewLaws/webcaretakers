'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateSavingsGoal, monthsBetween } = require('./savings-goal.js');

test('zero interest: $12000 over 12 months = $1000/mo', () => {
  const r = calculateSavingsGoal({ targetAmount: 12000, months: 12 });
  assert.equal(r.monthlyContribution, 1000);
  assert.equal(r.totalContributions, 12000);
  assert.equal(r.interestEarned, 0);
});

test('zero interest with starting balance', () => {
  const r = calculateSavingsGoal({ targetAmount: 12000, startingBalance: 2000, months: 10 });
  assert.equal(r.monthlyContribution, 1000);
});

test('with 5% APR, same target should require less per month', () => {
  const noInt  = calculateSavingsGoal({ targetAmount: 12000, months: 12, annualInterestRate: 0 });
  const withInt = calculateSavingsGoal({ targetAmount: 12000, months: 12, annualInterestRate: 5 });
  assert.ok(withInt.monthlyContribution < noInt.monthlyContribution);
});

test('interest earned is positive when APR > 0', () => {
  const r = calculateSavingsGoal({ targetAmount: 12000, months: 24, annualInterestRate: 5 });
  assert.ok(r.interestEarned > 0);
});

test('final balance ≈ target amount', () => {
  const r = calculateSavingsGoal({ targetAmount: 50000, months: 60, annualInterestRate: 4, startingBalance: 5000 });
  assert.ok(Math.abs(r.finalBalance - 50000) < 1);
});

test('throws when target not greater than zero', () => {
  assert.throws(() => calculateSavingsGoal({ targetAmount: 0, months: 12 }));
  assert.throws(() => calculateSavingsGoal({ targetAmount: -100, months: 12 }));
});

test('throws when already at target', () => {
  assert.throws(() => calculateSavingsGoal({ targetAmount: 1000, startingBalance: 1000, months: 12 }));
  assert.throws(() => calculateSavingsGoal({ targetAmount: 1000, startingBalance: 2000, months: 12 }));
});

test('throws when months < 1', () => {
  assert.throws(() => calculateSavingsGoal({ targetAmount: 100, months: 0 }));
});

test('throws when neither months nor dates provided', () => {
  assert.throws(() => calculateSavingsGoal({ targetAmount: 1000 }));
});

test('from dates: 2026-04-22 → 2027-04-22 = 12 months', () => {
  assert.equal(monthsBetween({ y: 2026, m: 4, d: 22 }, { y: 2027, m: 4, d: 22 }), 12);
});

test('from dates: 2026-04-22 → 2026-05-21 = 0 months (not a full month)', () => {
  assert.equal(monthsBetween({ y: 2026, m: 4, d: 22 }, { y: 2026, m: 5, d: 21 }), 0);
});

test('date-based input: year apart', () => {
  const r = calculateSavingsGoal({
    targetAmount: 12000,
    startDate:    '2026-04-22',
    targetDate:   '2027-04-22',
  });
  assert.equal(r.months, 12);
  assert.equal(r.monthlyContribution, 1000);
});

test('years field matches months/12', () => {
  const r = calculateSavingsGoal({ targetAmount: 6000, months: 36 });
  assert.equal(r.years, 3);
});
