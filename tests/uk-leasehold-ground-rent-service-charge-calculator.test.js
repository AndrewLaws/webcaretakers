'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateLeasehold,
  projectGroundRent,
  projectServiceCharge,
} = require('../site/assets/js/calculators/uk-leasehold-ground-rent-service-charge-calculator.js');

// --- Ground rent escalation methods ---

test('projectGroundRent: fixed escalation keeps the same figure each year', () => {
  const series = projectGroundRent({
    currentGroundRent: 250,
    escalationType: 'fixed',
    years: 5,
  });
  assert.equal(series.length, 5);
  series.forEach((amt) => assert.equal(amt, 250));
});

test('projectGroundRent: doublingEvery10 doubles after every 10 years', () => {
  const series = projectGroundRent({
    currentGroundRent: 250,
    escalationType: 'doublingEvery10',
    years: 25,
  });
  // year 1: £250, year 10: £250, year 11: £500, year 20: £500, year 21: £1000
  assert.equal(series[0], 250);
  assert.equal(series[9], 250);
  assert.equal(series[10], 500);
  assert.equal(series[19], 500);
  assert.equal(series[20], 1000);
});

test('projectGroundRent: doublingEvery25 doubles after every 25 years', () => {
  const series = projectGroundRent({
    currentGroundRent: 100,
    escalationType: 'doublingEvery25',
    years: 50,
  });
  assert.equal(series[0], 100);
  assert.equal(series[24], 100);
  assert.equal(series[25], 200);
  assert.equal(series[49], 200);
});

test('projectGroundRent: rpiLinked compounds annually', () => {
  const series = projectGroundRent({
    currentGroundRent: 200,
    escalationType: 'rpiLinked',
    rpiAssumption: 3,
    years: 3,
  });
  assert.equal(series[0], 200);
  // Year 2: 200 * 1.03 = 206
  assert.ok(Math.abs(series[1] - 206) < 0.01, `got ${series[1]}`);
  // Year 3: 206 * 1.03 = 212.18
  assert.ok(Math.abs(series[2] - 212.18) < 0.01, `got ${series[2]}`);
});

test('projectGroundRent: peppercorn override forces every year to zero', () => {
  const series = projectGroundRent({
    currentGroundRent: 250,
    escalationType: 'doublingEvery10',
    years: 25,
    peppercorn: true,
  });
  assert.equal(series.length, 25);
  series.forEach((amt) => assert.equal(amt, 0));
});

// --- Service charge ---

test('projectServiceCharge: zero inflation leaves the figure flat', () => {
  const series = projectServiceCharge({
    currentServiceCharge: 1800,
    serviceChargeInflation: 0,
    years: 4,
  });
  assert.deepEqual(series, [1800, 1800, 1800, 1800]);
});

test('projectServiceCharge: 5% inflation compounds yearly', () => {
  const series = projectServiceCharge({
    currentServiceCharge: 1000,
    serviceChargeInflation: 5,
    years: 3,
  });
  assert.equal(series[0], 1000);
  assert.ok(Math.abs(series[1] - 1050) < 0.01);
  assert.ok(Math.abs(series[2] - 1102.5) < 0.01);
});

// --- Top-level calculateLeasehold ---

test('calculateLeasehold: combined totals and monthly average for a fixed rent', () => {
  const r = calculateLeasehold({
    currentGroundRent: 300,
    escalationType: 'fixed',
    rpiAssumption: 0,
    currentServiceCharge: 2000,
    serviceChargeInflation: 0,
    years: 10,
    peppercorn: false,
  });
  assert.equal(r.years.length, 10);
  // Each year combined = 2300, total = 23000
  assert.equal(r.totalGroundRent, 3000);
  assert.equal(r.totalServiceCharge, 20000);
  assert.equal(r.totalCombined, 23000);
  // Monthly avg = 23000 / 10 / 12 = 191.666...
  assert.ok(Math.abs(r.averageMonthly - (23000 / 120)) < 0.01);
});

test('calculateLeasehold: peppercorn flag zeroes ground rent in the table and totals', () => {
  const r = calculateLeasehold({
    currentGroundRent: 500,
    escalationType: 'doublingEvery10',
    rpiAssumption: 0,
    currentServiceCharge: 1500,
    serviceChargeInflation: 0,
    years: 20,
    peppercorn: true,
  });
  assert.equal(r.totalGroundRent, 0);
  assert.equal(r.totalServiceCharge, 30000);
  assert.equal(r.totalCombined, 30000);
  r.years.forEach((row) => assert.equal(row.groundRent, 0));
  assert.equal(r.peppercorn, true);
});

test('calculateLeasehold: doubling and RPI together produce a sensible total', () => {
  const r = calculateLeasehold({
    currentGroundRent: 250,
    escalationType: 'doublingEvery10',
    rpiAssumption: 0,
    currentServiceCharge: 2000,
    serviceChargeInflation: 4,
    years: 30,
    peppercorn: false,
  });
  // 30 years: years 1-10 £250 (=2500), 11-20 £500 (=5000), 21-30 £1000 (=10000) = 17500
  assert.equal(r.totalGroundRent, 17500);
  // Service charge total = sum of geometric series; just sanity check above 60k and below 200k
  assert.ok(r.totalServiceCharge > 60000);
  assert.ok(r.totalServiceCharge < 200000);
  assert.equal(r.years[0].year, 1);
  assert.equal(r.years[29].year, 30);
});

test('calculateLeasehold: rejects years out of range', () => {
  assert.throws(() => calculateLeasehold({
    currentGroundRent: 100,
    escalationType: 'fixed',
    currentServiceCharge: 1000,
    serviceChargeInflation: 0,
    years: 0,
  }));
  assert.throws(() => calculateLeasehold({
    currentGroundRent: 100,
    escalationType: 'fixed',
    currentServiceCharge: 1000,
    serviceChargeInflation: 0,
    years: 51,
  }));
});

test('calculateLeasehold: rejects unknown escalation type', () => {
  assert.throws(() => calculateLeasehold({
    currentGroundRent: 100,
    escalationType: 'wibble',
    currentServiceCharge: 1000,
    serviceChargeInflation: 0,
    years: 5,
  }));
});
