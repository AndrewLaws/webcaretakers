'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateDebtPayoff } = require('./debt-payoff.js');

// --- Basic payoff calculations ---

test('zero APR: £1200 balance, £100/month → 12 months, £0 interest', () => {
  const r = calculateDebtPayoff({ balance: 1200, apr: 0, monthlyPayment: 100 });
  assert.equal(r.months, 12);
  assert.equal(r.totalInterest, 0);
  assert.equal(r.totalPaid, 1200);
});

test('zero APR with odd amount: £1000, £300/month → 4 months (ceil)', () => {
  // 1000 / 300 = 3.33 → ceil = 4
  const r = calculateDebtPayoff({ balance: 1000, apr: 0, monthlyPayment: 300 });
  assert.equal(r.months, 4);
  assert.equal(r.totalInterest, 0);
});

test('standard: £5000 at 18% APR, £150/month → 47 months', () => {
  const r = calculateDebtPayoff({ balance: 5000, apr: 18, monthlyPayment: 150 });
  // monthly rate = 1.5%; n = -ln(1 - 0.015×5000/150) / ln(1.015) = -ln(0.5) / ln(1.015) ≈ 46.6 → 47
  assert.equal(r.months, 47);
  assert.ok(r.totalInterest > 0);
  assert.equal(r.totalPaid, round2(r.balance + r.totalInterest));
});

test('£3000 at 20% APR, £200/month — manual cross-check', () => {
  const r = calculateDebtPayoff({ balance: 3000, apr: 20, monthlyPayment: 200 });
  // monthly rate = 20/12/100 = 0.016667
  // n = -ln(1 - 0.016667×3000/200) / ln(1.016667)
  // = -ln(1 - 0.25) / ln(1.016667) = -ln(0.75) / 0.016529 = 0.2877 / 0.016529 ≈ 17.4 → 18 months
  assert.equal(r.months, 18);
  assert.ok(r.totalInterest > 0);
});

test('totalPaid = balance + totalInterest', () => {
  const r = calculateDebtPayoff({ balance: 5000, apr: 15, monthlyPayment: 200 });
  assert.ok(Math.abs(r.totalPaid - (r.balance + r.totalInterest)) < 0.02);
});

test('first month interest = balance × monthly rate', () => {
  const r = calculateDebtPayoff({ balance: 5000, apr: 12, monthlyPayment: 200 });
  // monthly rate = 1% → interest = £50
  assert.equal(r.firstMonthInterest, 50);
  assert.equal(r.firstMonthPrincipal, 150);
});

test('years and remainingMonths decompose months correctly', () => {
  const r = calculateDebtPayoff({ balance: 10000, apr: 18, monthlyPayment: 250 });
  assert.equal(r.months, r.years * 12 + r.remainingMonths);
});

// --- Extra payment ---

test('extra payment reduces months and interest', () => {
  const base  = calculateDebtPayoff({ balance: 5000, apr: 18, monthlyPayment: 150 });
  const extra = calculateDebtPayoff({ balance: 5000, apr: 18, monthlyPayment: 150, extraPayment: 50 });
  assert.ok(extra.withExtra !== null);
  assert.ok(extra.withExtra.months < base.months);
  assert.ok(extra.withExtra.totalInterest < base.totalInterest);
  assert.ok(extra.withExtra.interestSaved > 0);
  assert.ok(extra.withExtra.monthsSaved > 0);
});

test('extra payment: monthsSaved = base months − new months', () => {
  const r = calculateDebtPayoff({ balance: 5000, apr: 18, monthlyPayment: 150, extraPayment: 50 });
  assert.equal(r.withExtra.monthsSaved, r.months - r.withExtra.months);
});

test('extra payment: interestSaved = base interest − new interest', () => {
  const r = calculateDebtPayoff({ balance: 5000, apr: 18, monthlyPayment: 150, extraPayment: 50 });
  assert.ok(Math.abs(r.withExtra.interestSaved - (r.totalInterest - r.withExtra.totalInterest)) < 0.02);
});

test('no extra payment → withExtra is null', () => {
  const r = calculateDebtPayoff({ balance: 5000, apr: 18, monthlyPayment: 150 });
  assert.equal(r.withExtra, null);
});

test('zero extra payment → withExtra is null', () => {
  const r = calculateDebtPayoff({ balance: 5000, apr: 18, monthlyPayment: 150, extraPayment: 0 });
  assert.equal(r.withExtra, null);
});

// --- Validation ---

test('throws when payment does not cover interest', () => {
  // £10k at 24% APR = £200/month interest; paying £100 never reduces balance
  assert.throws(
    () => calculateDebtPayoff({ balance: 10000, apr: 24, monthlyPayment: 100 }),
    /does not cover interest/
  );
});

test('throws on non-positive balance', () => {
  assert.throws(() => calculateDebtPayoff({ balance: 0, apr: 15, monthlyPayment: 100 }), /balance/);
  assert.throws(() => calculateDebtPayoff({ balance: -500, apr: 15, monthlyPayment: 100 }), /balance/);
});

test('throws on negative APR', () => {
  assert.throws(() => calculateDebtPayoff({ balance: 1000, apr: -1, monthlyPayment: 100 }), /apr/);
});

test('throws on non-positive monthly payment', () => {
  assert.throws(() => calculateDebtPayoff({ balance: 1000, apr: 15, monthlyPayment: 0 }), /monthlyPayment/);
  assert.throws(() => calculateDebtPayoff({ balance: 1000, apr: 15, monthlyPayment: -50 }), /monthlyPayment/);
});

function round2(n) { return Math.round(n * 100) / 100; }
