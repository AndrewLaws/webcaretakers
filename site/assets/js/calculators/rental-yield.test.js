'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateYield } = require('./rental-yield.js');

test('gross yield is annual rent over property value as a percentage', () => {
  const r = calculateYield({ propertyValue: 250000, monthlyRent: 1000, annualCosts: 0 });
  // annual rent 12000, value 250000 => 4.80%
  assert.equal(r.grossYield, 4.8);
  assert.equal(r.annualRent, 12000);
});

test('net yield subtracts annual costs before dividing by value', () => {
  const r = calculateYield({ propertyValue: 250000, monthlyRent: 1000, annualCosts: 2000 });
  // (12000 - 2000) / 250000 = 4%
  assert.equal(r.netYield, 4);
  assert.equal(r.netAnnualIncome, 10000);
});

test('gross and net are equal when annual costs are zero', () => {
  const r = calculateYield({ propertyValue: 300000, monthlyRent: 1500, annualCosts: 0 });
  assert.equal(r.grossYield, r.netYield);
});

test('higher costs reduce net yield but never gross', () => {
  const a = calculateYield({ propertyValue: 250000, monthlyRent: 1000, annualCosts: 1000 });
  const b = calculateYield({ propertyValue: 250000, monthlyRent: 1000, annualCosts: 5000 });
  assert.equal(a.grossYield, b.grossYield);
  assert.ok(a.netYield > b.netYield);
});

test('net yield can be negative if costs exceed rent', () => {
  const r = calculateYield({ propertyValue: 250000, monthlyRent: 500, annualCosts: 10000 });
  // 6000 - 10000 = -4000 / 250000 = -1.6%
  assert.ok(r.netYield < 0);
  assert.equal(r.netYield, -1.6);
});

test('cash-on-cash fields only appear when deposit is provided', () => {
  const without = calculateYield({ propertyValue: 250000, monthlyRent: 1000, annualCosts: 2000 });
  assert.equal(without.roiOnDeposit, undefined);
  assert.equal(without.monthlyCashFlow, undefined);

  const withDep = calculateYield({
    propertyValue: 250000, monthlyRent: 1000, annualCosts: 2000,
    deposit: 50000, monthlyMortgagePayment: 600,
  });
  assert.equal(typeof withDep.roiOnDeposit, 'number');
  assert.equal(typeof withDep.monthlyCashFlow, 'number');
});

test('cash flow is net rent minus mortgage, annualised', () => {
  const r = calculateYield({
    propertyValue: 250000, monthlyRent: 1200, annualCosts: 2400,
    deposit: 50000, monthlyMortgagePayment: 800,
  });
  // annual rent 14400, costs 2400, net 12000. mortgage 9600. cash flow 2400/yr = 200/mo.
  assert.equal(r.annualCashFlow, 2400);
  assert.equal(r.monthlyCashFlow, 200);
});

test('ROI on deposit is annual cash flow over deposit', () => {
  const r = calculateYield({
    propertyValue: 250000, monthlyRent: 1200, annualCosts: 2400,
    deposit: 50000, monthlyMortgagePayment: 800,
  });
  // 2400 / 50000 = 4.8%
  assert.equal(r.roiOnDeposit, 4.8);
});

test('ROI on deposit can be negative if cash flow is negative', () => {
  const r = calculateYield({
    propertyValue: 250000, monthlyRent: 900, annualCosts: 2000,
    deposit: 50000, monthlyMortgagePayment: 800,
  });
  // annual rent 10800, net 8800, mortgage 9600, cash flow -800 => -1.6%
  assert.ok(r.roiOnDeposit < 0);
});

test('throws on non-positive property value', () => {
  assert.throws(() => calculateYield({ propertyValue: 0, monthlyRent: 1000 }));
  assert.throws(() => calculateYield({ propertyValue: -100, monthlyRent: 1000 }));
});

test('throws on negative rent', () => {
  assert.throws(() => calculateYield({ propertyValue: 250000, monthlyRent: -100 }));
});

test('throws on negative annual costs', () => {
  assert.throws(() => calculateYield({ propertyValue: 250000, monthlyRent: 1000, annualCosts: -1 }));
});

test('handles zero rent cleanly', () => {
  const r = calculateYield({ propertyValue: 250000, monthlyRent: 0, annualCosts: 0 });
  assert.equal(r.grossYield, 0);
  assert.equal(r.netYield, 0);
  assert.equal(r.annualRent, 0);
});

test('rounds results to two decimal places', () => {
  const r = calculateYield({ propertyValue: 333333, monthlyRent: 1111, annualCosts: 500 });
  // grossYield = 13332/333333*100 = 3.9996... => 4.00 after round
  assert.ok(Number.isFinite(r.grossYield));
  // ensure two dp at most
  assert.equal(r.grossYield, Math.round(r.grossYield * 100) / 100);
  assert.equal(r.netYield, Math.round(r.netYield * 100) / 100);
});
