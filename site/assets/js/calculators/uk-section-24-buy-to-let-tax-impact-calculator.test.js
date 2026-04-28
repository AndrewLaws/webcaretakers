'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const {
  calculateSection24Impact,
  calcIncomeTax,
  effectivePersonalAllowance,
  calcCorporationTax
} = require('./uk-section-24-buy-to-let-tax-impact-calculator.js');

// ─── Personal allowance taper ──────────────────────────────────────────────
test('PA full below £100k', () => {
  assert.equal(effectivePersonalAllowance(50000), 12570);
  assert.equal(effectivePersonalAllowance(100000), 12570);
});

test('PA tapers above £100k: £110k → £7,570', () => {
  assert.equal(effectivePersonalAllowance(110000), 7570);
});

test('PA hits zero at £125,140', () => {
  assert.equal(effectivePersonalAllowance(125140), 0);
  assert.equal(effectivePersonalAllowance(200000), 0);
});

// ─── Income tax band maths ─────────────────────────────────────────────────
test('no income tax under PA', () => {
  assert.equal(calcIncomeTax(10000).totalTax, 0);
});

test('basic-rate only at £30,000', () => {
  // (30000-12570)*0.20 = 3486
  assert.equal(calcIncomeTax(30000).totalTax, 3486);
});

test('higher-rate at £60,000', () => {
  // basic = (50270-12570)*0.20 = 7540; higher = (60000-50270)*0.40 = 3892
  assert.equal(calcIncomeTax(60000).totalTax, 11432);
});

// ─── Corporation tax (2025/26 rates) ───────────────────────────────────────
test('CT 19% small profits at £40,000', () => {
  assert.equal(calcCorporationTax(40000), 7600);
});

test('CT 25% main rate at £300,000', () => {
  assert.equal(calcCorporationTax(300000), 75000);
});

test('CT marginal relief at £150,000', () => {
  // 150000*0.25 - (250000-150000)*0.015 = 37500 - 1500 = 36000
  assert.equal(calcCorporationTax(150000), 36000);
});

test('CT zero on zero profit', () => {
  assert.equal(calcCorporationTax(0), 0);
});

// ─── Section 24 impact: higher-rate landlord ────────────────────────────────
test('higher-rate landlord: £30k other income, £20k rent, £10k MI, £3k expenses', () => {
  const r = calculateSection24Impact({
    rentalIncome: 20000,
    mortgageInterest: 10000,
    otherExpenses: 3000,
    otherIncome: 30000,
    isLimitedCompany: false
  });
  // Pre-2017: rental profit = 20000-10000-3000 = 7000.
  //   Total income = 30000 + 7000 = 37000. Tax = (37000-12570)*0.20 = 4886.
  // Section 24: adjusted profit = 20000-3000 = 17000.
  //   Total income = 30000 + 17000 = 47000. Tax pre-credit = (47000-12570)*0.20 = 6886.
  //   Credit = 20% * min(10000, 17000, 47000-12570=34430) = 20% * 10000 = 2000.
  //   Tax post-credit = 6886 - 2000 = 4886.
  // BUT: Section 24 pushes some income past £50,270 only when total > 50270.
  //   Here 47000 is still all basic rate, so no higher-rate hit.
  //   Difference = 4886 - 4886 = 0 in this specific case.
  assert.equal(r.preSection24.incomeTax, 4886);
  assert.equal(r.postSection24.incomeTaxAfterCredit, 4886);
  assert.equal(r.section24Hit, 0);
});

test('Section 24 pushes basic-rate landlord into higher band', () => {
  // £40k other income, £30k rent, £20k MI, £2k expenses
  const r = calculateSection24Impact({
    rentalIncome: 30000,
    mortgageInterest: 20000,
    otherExpenses: 2000,
    otherIncome: 40000,
    isLimitedCompany: false
  });
  // Pre-2017: rental profit = 30000-20000-2000 = 8000.
  //   Total income = 40000 + 8000 = 48000. Tax = (48000-12570)*0.20 = 7086.
  // Section 24: adjusted profit = 30000-2000 = 28000.
  //   Total income = 40000 + 28000 = 68000. Tax pre-credit:
  //     basic = (50270-12570)*0.20 = 7540
  //     higher = (68000-50270)*0.40 = 7092
  //     total pre-credit = 14632
  //   Credit = 20% * min(20000, 28000, 68000-12570=55430) = 20% * 20000 = 4000
  //   Tax post-credit = 14632 - 4000 = 10632
  // Difference = 10632 - 7086 = 3546
  assert.equal(r.preSection24.incomeTax, 7086);
  assert.equal(r.postSection24.incomeTaxAfterCredit, 10632);
  assert.equal(r.section24Hit, 3546);
  assert.equal(r.pushedIntoHigherBand, true);
});

test('pure basic-rate landlord: small or zero hit', () => {
  // Low-income landlord with rental that stays well within basic rate
  const r = calculateSection24Impact({
    rentalIncome: 8000,
    mortgageInterest: 4000,
    otherExpenses: 1000,
    otherIncome: 15000,
    isLimitedCompany: false
  });
  // Pre: profit = 3000. Total = 18000. Tax = (18000-12570)*0.20 = 1086
  // Post: adjusted profit = 7000. Total = 22000. Tax pre-credit = (22000-12570)*0.20 = 1886
  //   Credit = 20% * min(4000, 7000, 22000-12570=9430) = 20% * 4000 = 800
  //   Tax post-credit = 1086. Difference = 0.
  assert.equal(r.section24Hit, 0);
});

test('limited company route uses corporation tax on full deduction', () => {
  const r = calculateSection24Impact({
    rentalIncome: 30000,
    mortgageInterest: 20000,
    otherExpenses: 2000,
    otherIncome: 40000,
    isLimitedCompany: true
  });
  // Profit = 30000 - 20000 - 2000 = 8000. CT at 19% = 1520.
  assert.equal(r.limitedCompany.profit, 8000);
  assert.equal(r.limitedCompany.corporationTax, 1520);
});

test('credit is capped by adjusted total income above PA when income is low', () => {
  // Low total income case where the "income above PA" cap bites
  const r = calculateSection24Impact({
    rentalIncome: 15000,
    mortgageInterest: 12000,
    otherExpenses: 1000,
    otherIncome: 5000, // total post-S24 adjusted = 5000+14000 = 19000, above PA = 6430
    isLimitedCompany: false
  });
  // adjusted rental profit = 14000. mortgage interest = 12000.
  // Adjusted total income above PA = 19000-12570 = 6430.
  // Credit base = min(12000, 14000, 6430) = 6430. Credit = 1286.
  assert.equal(r.postSection24.creditBase, 6430);
  assert.equal(r.postSection24.taxCredit, 1286);
});

test('rental loss: pre-2017 reduces other income tax', () => {
  // Big mortgage interest creates a rental loss under pre-2017 rules
  const r = calculateSection24Impact({
    rentalIncome: 10000,
    mortgageInterest: 15000,
    otherExpenses: 2000,
    otherIncome: 50000,
    isLimitedCompany: false
  });
  // Pre-2017: rental profit = 10000-15000-2000 = -7000. HMRC: rental losses cannot
  // offset other income (carried forward). So pre-2017 tax = tax on £50k other.
  // Adjusted profit (S24) = 10000-2000 = 8000. Total = 58000.
  assert.ok(r.preSection24.rentalProfit <= 0);
  assert.equal(r.preSection24.totalIncome, 50000); // rental loss not offset against other income
});

test('throws on negative inputs', () => {
  assert.throws(() => calculateSection24Impact({
    rentalIncome: -1, mortgageInterest: 0, otherExpenses: 0, otherIncome: 0
  }), /non-negative/);
});

test('tax year is 2025/26', () => {
  const r = calculateSection24Impact({
    rentalIncome: 10000, mortgageInterest: 5000, otherExpenses: 1000, otherIncome: 30000
  });
  assert.equal(r.taxYear, '2025/26');
});
