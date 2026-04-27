const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateOverpayment,
  simulate,
  monthlyPayment,
} = require('./uk-mortgage-overpayment.js');

// --- monthlyPayment formula sanity ---

test('monthlyPayment: zero rate gives even split', () => {
  // £12,000 over 12 months at 0% = £1,000/month
  assert.equal(monthlyPayment(12000, 0, 12), 1000);
});

test('monthlyPayment: classic example (£200k, 5%, 25y) ~ £1,169.18', () => {
  const m = monthlyPayment(200000, 5, 300);
  assert.ok(Math.abs(m - 1169.18) < 0.5, `expected ~1169.18, got ${m}`);
});

test('monthlyPayment: returns 0 if balance is zero', () => {
  assert.equal(monthlyPayment(0, 4.5, 300), 0);
});

// --- simulate: amortisation behaviour ---

test('simulate: baseline runs to ~zero across full term', () => {
  const r = simulate({
    balance: 200000,
    annualRatePercent: 5,
    termMonths: 300,
    monthlyOverpayment: 0,
    oneOffOverpayment: 0,
  });
  assert.equal(r.months, 300);
  assert.ok(r.schedule[r.schedule.length - 1].balance < 0.01);
  // Total interest on a 25y, £200k, 5% loan is roughly £150,754
  assert.ok(Math.abs(r.totalInterest - 150754) < 100, `interest ${r.totalInterest}`);
});

test('simulate: monthly overpayment shaves time and interest off', () => {
  const baseline = simulate({
    balance: 200000,
    annualRatePercent: 5,
    termMonths: 300,
    monthlyOverpayment: 0,
  });
  const withOver = simulate({
    balance: 200000,
    annualRatePercent: 5,
    termMonths: 300,
    monthlyOverpayment: 200,
  });
  assert.ok(withOver.months < baseline.months, 'should finish earlier');
  assert.ok(withOver.totalInterest < baseline.totalInterest, 'should pay less interest');
});

test('simulate: one-off overpayment in month 1 reduces interest', () => {
  const baseline = simulate({
    balance: 200000,
    annualRatePercent: 5,
    termMonths: 300,
  });
  const withOneOff = simulate({
    balance: 200000,
    annualRatePercent: 5,
    termMonths: 300,
    oneOffOverpayment: 10000,
  });
  assert.ok(withOneOff.months < baseline.months);
  assert.ok(withOneOff.totalInterest < baseline.totalInterest);
  // The one-off lump in month 1 should be applied: schedule[0].overpayment >= 10,000
  assert.ok(withOneOff.schedule[0].overpayment >= 10000);
});

test('simulate: total overpayment cannot push balance below zero', () => {
  const r = simulate({
    balance: 1000,
    annualRatePercent: 5,
    termMonths: 12,
    oneOffOverpayment: 5000, // way more than balance
  });
  // Final balance is zero, schedule is short
  assert.equal(r.schedule[r.schedule.length - 1].balance, 0);
  assert.ok(r.months <= 1);
});

test('simulate: zero-rate loan still amortises cleanly', () => {
  const r = simulate({
    balance: 12000,
    annualRatePercent: 0,
    termMonths: 12,
  });
  assert.equal(r.months, 12);
  assert.ok(Math.abs(r.totalInterest) < 0.01);
});

// --- calculateOverpayment: end-to-end ---

test('calculateOverpayment: baseline matches simulate baseline', () => {
  const r = calculateOverpayment({
    balance: 200000,
    annualRatePercent: 5,
    termYears: 25,
    monthlyOverpayment: 0,
  });
  assert.equal(r.baseline.months, 300);
  assert.equal(r.withOverpayment.months, 300);
  assert.equal(r.interestSaved, 0);
  assert.equal(r.monthsSaved, 0);
});

test('calculateOverpayment: £200/mo overpayment on £200k/5%/25y saves real money', () => {
  const r = calculateOverpayment({
    balance: 200000,
    annualRatePercent: 5,
    termYears: 25,
    monthlyOverpayment: 200,
  });
  // Should knock years off and save tens of thousands.
  assert.ok(r.monthsSaved > 36, `saved ${r.monthsSaved} months`);
  assert.ok(r.interestSaved > 20000, `saved £${r.interestSaved}`);
  assert.ok(r.withOverpayment.months < r.baseline.months);
});

test('calculateOverpayment: term in years + extra months', () => {
  const r = calculateOverpayment({
    balance: 100000,
    annualRatePercent: 4,
    termYears: 20,
    termExtraMonths: 6,
    monthlyOverpayment: 0,
  });
  assert.equal(r.termMonths, 246);
  assert.equal(r.baseline.months, 246);
});

test('calculateOverpayment: produces yearly snapshots covering both scenarios', () => {
  const r = calculateOverpayment({
    balance: 200000,
    annualRatePercent: 5,
    termYears: 25,
    monthlyOverpayment: 200,
  });
  assert.ok(Array.isArray(r.snapshots));
  assert.ok(r.snapshots.length > 0);
  // Year 1 baseline balance should be slightly less than starting balance.
  assert.ok(r.snapshots[0].baselineBalance < 200000);
  assert.ok(r.snapshots[0].baselineBalance > 190000);
  // Year 1 overpayment balance should be lower than baseline.
  assert.ok(r.snapshots[0].overpaymentBalance < r.snapshots[0].baselineBalance);
});

test('calculateOverpayment: finish dates are calculated when a start date is supplied', () => {
  const start = new Date(Date.UTC(2026, 3, 1)); // 1 April 2026
  const r = calculateOverpayment({
    balance: 200000,
    annualRatePercent: 5,
    termYears: 25,
    monthlyOverpayment: 0,
    startDate: start,
  });
  assert.ok(r.finishBaseline instanceof Date);
  assert.equal(r.finishBaseline.getUTCFullYear(), 2051);
  assert.equal(r.finishBaseline.getUTCMonth(), 3); // April
});

test('calculateOverpayment: throws on zero or negative balance', () => {
  assert.throws(() =>
    calculateOverpayment({
      balance: 0,
      annualRatePercent: 5,
      termYears: 25,
      monthlyOverpayment: 0,
    })
  );
});

test('calculateOverpayment: throws on zero term', () => {
  assert.throws(() =>
    calculateOverpayment({
      balance: 100000,
      annualRatePercent: 5,
      termYears: 0,
      termExtraMonths: 0,
    })
  );
});

test('calculateOverpayment: rounds money fields to <= 2 decimals', () => {
  const r = calculateOverpayment({
    balance: 173456,
    annualRatePercent: 4.37,
    termYears: 22,
    termExtraMonths: 7,
    monthlyOverpayment: 137,
    oneOffOverpayment: 1234.56,
  });
  const fields = [
    r.monthlyPayment,
    r.interestSaved,
    r.baseline.totalInterest,
    r.baseline.totalPaid,
    r.withOverpayment.totalInterest,
    r.withOverpayment.totalPaid,
  ];
  fields.forEach((v) => {
    if (typeof v === 'number' && !Number.isInteger(v)) {
      const decimals = String(v).split('.')[1] || '';
      assert.ok(decimals.length <= 2, `decimals: ${v}`);
    }
  });
});

test('calculateOverpayment: first-year worked example exposes 12 rows for both scenarios', () => {
  const r = calculateOverpayment({
    balance: 200000,
    annualRatePercent: 5,
    termYears: 25,
    monthlyOverpayment: 200,
    oneOffOverpayment: 5000,
  });
  assert.equal(r.firstYearBaseline.length, 12);
  assert.equal(r.firstYearWithOverpayment.length, 12);
  // Month 1 in the overpayment scenario should reflect the £5,000 one-off.
  assert.ok(r.firstYearWithOverpayment[0].overpayment >= 5000);
});
