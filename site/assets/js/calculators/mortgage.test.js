const { test } = require('node:test');
const assert = require('node:assert/strict');

const { calculateMortgage, monthlyPAndI } = require('./mortgage');

// --- Core P&I formula ---

test('monthlyPAndI: $300,000 at 6% for 30 years → ~$1,798.65', () => {
  const pi = monthlyPAndI({ principal: 300000, aprPercent: 6, termYears: 30 });
  assert.ok(Math.abs(pi - 1798.65) < 0.5, `expected ~1798.65, got ${pi}`);
});

test('monthlyPAndI: $200,000 at 7% for 15 years → ~$1,797.66', () => {
  const pi = monthlyPAndI({ principal: 200000, aprPercent: 7, termYears: 15 });
  assert.ok(Math.abs(pi - 1797.66) < 0.5, `expected ~1797.66, got ${pi}`);
});

test('monthlyPAndI: zero interest rate → straight division', () => {
  const pi = monthlyPAndI({ principal: 120000, aprPercent: 0, termYears: 10 });
  // 120000 / 120 months = 1000
  assert.equal(pi, 1000);
});

test('monthlyPAndI throws on zero or negative principal', () => {
  assert.throws(() => monthlyPAndI({ principal: 0, aprPercent: 6, termYears: 30 }));
  assert.throws(() => monthlyPAndI({ principal: -100, aprPercent: 6, termYears: 30 }));
});

test('monthlyPAndI throws on zero or negative term', () => {
  assert.throws(() => monthlyPAndI({ principal: 100000, aprPercent: 6, termYears: 0 }));
});

// --- Full calculator: PITI + HOA + PMI ---

test('calculateMortgage: basic $400k home, 20% down, 6.5%/30y, no extras', () => {
  const r = calculateMortgage({
    homePrice: 400000,
    downPayment: 80000,
    aprPercent: 6.5,
    termYears: 30,
  });
  assert.equal(r.principal, 320000);
  assert.equal(r.loanToValue, 0.8); // 80%
  assert.equal(r.numberOfPayments, 360);
  assert.ok(Math.abs(r.monthlyPI - 2022.62) < 0.5, `PI off, got ${r.monthlyPI}`);
  // No extras, so monthlyTotal = monthlyPI
  assert.equal(r.monthlyTotal, r.monthlyPI);
  assert.equal(r.monthlyTax, 0);
  assert.equal(r.monthlyInsurance, 0);
  assert.equal(r.monthlyHoa, 0);
  assert.equal(r.monthlyPmi, 0);
});

test('calculateMortgage: PITI sums tax and insurance monthly from annual', () => {
  const r = calculateMortgage({
    homePrice: 400000,
    downPayment: 80000,
    aprPercent: 6.5,
    termYears: 30,
    propertyTaxYearly: 4800,   // → $400/mo
    insuranceYearly: 1200,     // → $100/mo
    hoaMonthly: 50,
    pmiMonthly: 0,
  });
  assert.equal(r.monthlyTax, 400);
  assert.equal(r.monthlyInsurance, 100);
  assert.equal(r.monthlyHoa, 50);
  const expected = r.monthlyPI + 400 + 100 + 50;
  assert.ok(Math.abs(r.monthlyTotal - expected) < 0.01);
});

test('calculateMortgage: PMI flows through when down payment is under 20%', () => {
  const r = calculateMortgage({
    homePrice: 400000,
    downPayment: 40000,        // 10% down, should be PMI territory
    aprPercent: 6.5,
    termYears: 30,
    pmiMonthly: 180,
  });
  assert.equal(r.loanToValue, 0.9);
  assert.equal(r.monthlyPmi, 180);
  assert.ok(r.monthlyTotal > r.monthlyPI, 'total should include PMI');
});

test('calculateMortgage: total interest over life = monthly PI * N - principal', () => {
  const r = calculateMortgage({
    homePrice: 400000,
    downPayment: 80000,
    aprPercent: 6.5,
    termYears: 30,
  });
  const expectedTotalInterest = r.monthlyPI * r.numberOfPayments - r.principal;
  assert.ok(Math.abs(r.totalInterest - expectedTotalInterest) < 0.01);
  // Total cost (P&I only) = principal + totalInterest
  assert.ok(Math.abs(r.totalCost - (r.principal + r.totalInterest)) < 0.01);
});

test('calculateMortgage: accepts down payment as a percent via downPaymentPercent', () => {
  const r = calculateMortgage({
    homePrice: 500000,
    downPaymentPercent: 20,   // should resolve to 100000
    aprPercent: 6.5,
    termYears: 30,
  });
  assert.equal(r.principal, 400000);
  assert.equal(r.loanToValue, 0.8);
});

test('calculateMortgage: throws on down payment >= home price', () => {
  assert.throws(() => calculateMortgage({
    homePrice: 300000,
    downPayment: 300000,
    aprPercent: 6,
    termYears: 30,
  }));
});

test('calculateMortgage: throws on negative inputs', () => {
  assert.throws(() => calculateMortgage({
    homePrice: -100000, downPayment: 0, aprPercent: 6, termYears: 30,
  }));
  assert.throws(() => calculateMortgage({
    homePrice: 300000, downPayment: 0, aprPercent: -1, termYears: 30,
  }));
});

test('calculateMortgage: rounds money fields to 2 decimals', () => {
  const r = calculateMortgage({
    homePrice: 333333,
    downPayment: 33333,
    aprPercent: 5.875,
    termYears: 30,
  });
  // Every money field should have at most 2 decimals
  const hasTwoDecimalsOrFewer = (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
  assert.ok(hasTwoDecimalsOrFewer(r.monthlyPI));
  assert.ok(hasTwoDecimalsOrFewer(r.monthlyTotal));
  assert.ok(hasTwoDecimalsOrFewer(r.totalInterest));
  assert.ok(hasTwoDecimalsOrFewer(r.totalCost));
});
