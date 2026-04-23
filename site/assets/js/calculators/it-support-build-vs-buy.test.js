'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { compare } = require('./it-support-build-vs-buy.js');

// Baseline scenario used in several tests
const BASE = {
  employees: 25,
  salary: 45000,
  employmentLoadingPct: 25,
  trainingBudget: 2000,
  toolingInHouse: 3000,
  equipmentAnnualised: 1000,
  managedMonthlyPerUser: 75,
  managedSetupFee: 500,
  contractMonths: 12,
};

test('in-house annual = loaded salary + extras', () => {
  const r = compare(BASE);
  // 45000 * 1.25 = 56250 + 2000 + 3000 + 1000 = 62250
  assert.equal(r.loadedSalary, 56250);
  assert.equal(r.inHouseAnnual, 62250);
});

test('managed annual = perUser * 12 * users + amortised setup', () => {
  const r = compare(BASE);
  // 75 * 12 * 25 = 22500; setup 500 / 12 * 12 = 500
  assert.equal(r.managedVariableAnnual, 22500);
  assert.equal(r.setupAmortisedAnnual, 500);
  assert.equal(r.managedAnnual, 23000);
});

test('difference and verdict: managed cheaper at 25 users', () => {
  const r = compare(BASE);
  // managed 23000 - inHouse 62250 = -39250, so managed is cheaper
  assert.equal(r.difference, -39250);
  assert.equal(r.verdict, 'managed');
});

test('in-house wins once headcount is large enough', () => {
  const r = compare(Object.assign({}, BASE, { employees: 100 }));
  // managed = 75 * 12 * 100 + 500 = 90500 > 62250
  assert.equal(r.verdict, 'in_house');
});

test('break-even users is computed from fixed in-house vs per-user managed', () => {
  const r = compare(BASE);
  // (62250 - 500) / (75 * 12) = 61750 / 900 = 68.611...
  assert.ok(r.breakEvenUsers >= 68.6 && r.breakEvenUsers <= 68.7);
});

test('break-even users is zero when in-house already costs less than setup amortised', () => {
  const r = compare(Object.assign({}, BASE, { salary: 0, trainingBudget: 0, toolingInHouse: 0, equipmentAnnualised: 0, managedSetupFee: 10000 }));
  // inHouseAnnual 0, setupAmortised 10000 -> negative numerator -> clamp to 0
  assert.equal(r.breakEvenUsers, 0);
});

test('break-even users is null when managedMonthlyPerUser is zero', () => {
  const r = compare(Object.assign({}, BASE, { managedMonthlyPerUser: 0 }));
  assert.equal(r.breakEvenUsers, null);
});

test('setup amortised over longer contract is smaller per year', () => {
  const short = compare(Object.assign({}, BASE, { managedSetupFee: 3600, contractMonths: 12 }));
  const long  = compare(Object.assign({}, BASE, { managedSetupFee: 3600, contractMonths: 36 }));
  assert.equal(short.setupAmortisedAnnual, 3600);
  assert.equal(long.setupAmortisedAnnual, 1200);
  assert.ok(long.managedAnnual < short.managedAnnual);
});

test('verdict is tie when the two totals match within 50p', () => {
  // engineer a scenario: inHouse 62250, find perUser that matches
  // managedAnnual = perUser * 12 * 25 + 500 = 62250 -> perUser = 61750 / 300 = 205.833...
  const r = compare(Object.assign({}, BASE, { managedMonthlyPerUser: 205.8333 }));
  assert.equal(r.verdict, 'tie');
});

test('monthly figures are annual / 12', () => {
  const r = compare(BASE);
  assert.equal(r.inHouseMonthly, round2(62250 / 12));
  assert.equal(r.managedMonthly, round2(23000 / 12));
});

test('validates employees >= 1', () => {
  assert.throws(() => compare(Object.assign({}, BASE, { employees: 0 })), /employees/);
});

test('validates salary not negative', () => {
  assert.throws(() => compare(Object.assign({}, BASE, { salary: -1 })), /salary/);
});

test('validates managedMonthlyPerUser not negative', () => {
  assert.throws(() => compare(Object.assign({}, BASE, { managedMonthlyPerUser: -5 })), /managedMonthlyPerUser/);
});

test('validates contractMonths positive', () => {
  assert.throws(() => compare(Object.assign({}, BASE, { contractMonths: 0 })), /contractMonths/);
});

test('outputs are rounded to two decimals', () => {
  const r = compare(Object.assign({}, BASE, { salary: 45000.678 }));
  // loadedSalary = 45000.678 * 1.25 = 56250.8475 -> 56250.85
  assert.equal(r.loadedSalary, 56250.85);
});

function round2(n) { return Math.round(n * 100) / 100; }
