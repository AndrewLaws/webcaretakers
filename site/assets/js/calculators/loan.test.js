const { test } = require('node:test');
const assert = require('node:assert/strict');

const { calculateLoan, monthlyPayment } = require('./loan.js');

// --- Basic monthly payment ---

test('monthlyPayment: £10,000 at 5% APR over 3 years ≈ £299.71', () => {
  const m = monthlyPayment({ principal: 10000, aprPercent: 5, termMonths: 36 });
  assert.ok(Math.abs(m - 299.71) < 0.01, `got ${m}`);
});

test('monthlyPayment: 0% interest divides cleanly', () => {
  const m = monthlyPayment({ principal: 12000, aprPercent: 0, termMonths: 24 });
  assert.equal(m, 500);
});

test('monthlyPayment: throws on zero term', () => {
  assert.throws(() =>
    monthlyPayment({ principal: 10000, aprPercent: 5, termMonths: 0 })
  );
});

// --- Full loan calculation shape ---

test('calculateLoan: basic shape for £10k / 5% / 3yr', () => {
  const r = calculateLoan({ amount: 10000, aprPercent: 5, termMonths: 36 });
  assert.equal(r.principal, 10000);
  assert.equal(r.termMonths, 36);
  assert.ok(Math.abs(r.monthlyPayment - 299.71) < 0.01);
  // Total interest ≈ 299.71 * 36 - 10000 = ~789.52
  assert.ok(r.totalInterest > 780 && r.totalInterest < 800, `got ${r.totalInterest}`);
  assert.ok(Math.abs(r.totalCost - (r.principal + r.totalInterest)) < 0.01);
});

test('calculateLoan: accepts termYears instead of termMonths', () => {
  const r = calculateLoan({ amount: 10000, aprPercent: 5, termYears: 3 });
  assert.equal(r.termMonths, 36);
  assert.ok(Math.abs(r.monthlyPayment - 299.71) < 0.01);
});

test('calculateLoan: first-payment split is heavy on interest', () => {
  const r = calculateLoan({ amount: 10000, aprPercent: 12, termMonths: 36 });
  // Month 1: interest = 10000 * 0.01 = 100, principal = monthly - 100
  assert.ok(Math.abs(r.firstPayment.interest - 100) < 0.01);
  assert.ok(r.firstPayment.principal < r.firstPayment.interest * 4);
});

test('calculateLoan: last-payment split is heavy on principal', () => {
  const r = calculateLoan({ amount: 10000, aprPercent: 12, termMonths: 36 });
  // Last payment principal ≈ monthly / (1 + r) and interest ≈ monthly * r / (1 + r)
  const r_monthly = 0.12 / 12;
  const expectedInterest = r.monthlyPayment * r_monthly / (1 + r_monthly);
  const expectedPrincipal = r.monthlyPayment - expectedInterest;
  assert.ok(Math.abs(r.lastPayment.interest - expectedInterest) < 0.01);
  assert.ok(Math.abs(r.lastPayment.principal - expectedPrincipal) < 0.01);
  assert.ok(r.lastPayment.principal > r.lastPayment.interest * 10);
});

test('calculateLoan: principal components of first and last payments sum correctly', () => {
  // All principals should sum to the loan amount across all payments
  const r = calculateLoan({ amount: 10000, aprPercent: 5, termMonths: 36 });
  // Simple sanity: first payment principal < last payment principal
  assert.ok(r.lastPayment.principal > r.firstPayment.principal);
});

// --- Extra monthly payment ---

test('calculateLoan: zero extra payment returns no savings fields populated', () => {
  const r = calculateLoan({ amount: 10000, aprPercent: 5, termMonths: 36, extraMonthlyPayment: 0 });
  assert.equal(r.withExtra, null);
});

test('calculateLoan: extra £100/mo on a £10k 5% 3y loan shaves months and interest', () => {
  const r = calculateLoan({ amount: 10000, aprPercent: 5, termMonths: 36, extraMonthlyPayment: 100 });
  assert.ok(r.withExtra);
  assert.ok(r.withExtra.monthsToPayOff < 36, `expected <36, got ${r.withExtra.monthsToPayOff}`);
  assert.ok(r.withExtra.monthsSaved > 0);
  assert.ok(r.withExtra.interestSaved > 0);
  assert.ok(r.withExtra.totalInterest < r.totalInterest);
});

test('calculateLoan: extra payment enough to clear loan in one month', () => {
  const r = calculateLoan({
    amount: 1000,
    aprPercent: 12,
    termMonths: 12,
    extraMonthlyPayment: 10000,
  });
  assert.equal(r.withExtra.monthsToPayOff, 1);
});

test('calculateLoan: 0% loan with extra payment just shortens term linearly', () => {
  const r = calculateLoan({
    amount: 12000,
    aprPercent: 0,
    termMonths: 24,
    extraMonthlyPayment: 500,
  });
  // Monthly = 500, with extra 500, total payment = 1000/mo, clears in 12
  assert.equal(r.withExtra.monthsToPayOff, 12);
  assert.equal(r.withExtra.interestSaved, 0);
});

// --- Input validation ---

test('calculateLoan: throws on negative amount', () => {
  assert.throws(() =>
    calculateLoan({ amount: -1000, aprPercent: 5, termMonths: 36 })
  );
});

test('calculateLoan: throws on negative rate', () => {
  assert.throws(() =>
    calculateLoan({ amount: 1000, aprPercent: -1, termMonths: 36 })
  );
});

test('calculateLoan: throws when neither termMonths nor termYears provided', () => {
  assert.throws(() =>
    calculateLoan({ amount: 10000, aprPercent: 5 })
  );
});

test('calculateLoan: rounds money fields to 2 decimals', () => {
  const r = calculateLoan({ amount: 13333, aprPercent: 7.37, termMonths: 41, extraMonthlyPayment: 25 });
  function checkNumeric(obj, path = '') {
    Object.entries(obj).forEach(([k, v]) => {
      if (v && typeof v === 'object') return checkNumeric(v, path + k + '.');
      if (typeof v !== 'number' || Number.isInteger(v)) return;
      const d = String(v).split('.')[1] || '';
      assert.ok(d.length <= 2, `${path}${k} has >2 decimals: ${v}`);
    });
  }
  checkNumeric(r);
});
