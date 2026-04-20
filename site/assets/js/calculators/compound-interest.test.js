'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateCompoundInterest } = require('./compound-interest.js');

function approx(actual, expected, tolerance = 0.5) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test('lump sum, annual compounding matches P(1+r)^t', () => {
  const r = calculateCompoundInterest({
    principal: 10000,
    annualRatePercent: 5,
    years: 10,
    compoundingFrequency: 'annually',
  });
  approx(r.finalBalance, 16288.95, 0.01);
  assert.equal(r.totalContributions, 0);
  approx(r.totalInterest, 6288.95, 0.01);
});

test('lump sum, monthly compounding', () => {
  const r = calculateCompoundInterest({
    principal: 10000,
    annualRatePercent: 5,
    years: 10,
    compoundingFrequency: 'monthly',
  });
  approx(r.finalBalance, 16470.09, 0.05);
});

test('lump sum, daily compounding', () => {
  const r = calculateCompoundInterest({
    principal: 10000,
    annualRatePercent: 5,
    years: 10,
    compoundingFrequency: 'daily',
  });
  approx(r.finalBalance, 16486.65, 1);
});

test('zero rate just sums deposits', () => {
  const r = calculateCompoundInterest({
    principal: 1000,
    annualRatePercent: 0,
    years: 5,
    compoundingFrequency: 'monthly',
    contribution: 100,
    contributionFrequency: 'monthly',
  });
  // 1000 + 100 * 60 = 7000
  approx(r.finalBalance, 7000, 0.01);
  approx(r.totalContributions, 6000, 0.01);
  approx(r.totalInterest, 0, 0.01);
});

test('monthly contribution + monthly compounding (annuity FV)', () => {
  // P=0, PMT=200/month, r=6%/yr => rm=0.005, n=120
  // FV = 200 * ((1.005^120 - 1)/0.005) ≈ 32775.87
  const r = calculateCompoundInterest({
    principal: 0,
    annualRatePercent: 6,
    years: 10,
    compoundingFrequency: 'monthly',
    contribution: 200,
    contributionFrequency: 'monthly',
    contributionTiming: 'end',
  });
  approx(r.finalBalance, 32775.87, 1);
  approx(r.totalContributions, 24000, 0.01);
});

test('beginning-of-period timing yields more than end-of-period', () => {
  const end = calculateCompoundInterest({
    principal: 0,
    annualRatePercent: 6,
    years: 10,
    compoundingFrequency: 'monthly',
    contribution: 200,
    contributionFrequency: 'monthly',
    contributionTiming: 'end',
  });
  const start = calculateCompoundInterest({
    principal: 0,
    annualRatePercent: 6,
    years: 10,
    compoundingFrequency: 'monthly',
    contribution: 200,
    contributionFrequency: 'monthly',
    contributionTiming: 'start',
  });
  assert.ok(start.finalBalance > end.finalBalance);
});

test('inflation-adjusted real balance reduces nominal', () => {
  const r = calculateCompoundInterest({
    principal: 10000,
    annualRatePercent: 5,
    years: 10,
    compoundingFrequency: 'annually',
    inflationRatePercent: 2,
  });
  // real = 16288.95 / 1.02^10 ≈ 13362.69
  approx(r.realBalance, 13362.69, 1);
});

test('year-by-year last entry equals finalBalance', () => {
  const r = calculateCompoundInterest({
    principal: 5000,
    annualRatePercent: 4,
    years: 20,
    compoundingFrequency: 'monthly',
    contribution: 150,
    contributionFrequency: 'monthly',
  });
  assert.equal(r.yearByYear.length, 20);
  assert.equal(r.yearByYear[0].year, 1);
  assert.equal(r.yearByYear[19].year, 20);
  approx(r.yearByYear[19].balance, r.finalBalance, 0.01);
});

test('totalContributions matches PMT * periods', () => {
  const r = calculateCompoundInterest({
    principal: 0,
    annualRatePercent: 3,
    years: 15,
    compoundingFrequency: 'monthly',
    contribution: 500,
    contributionFrequency: 'monthly',
  });
  approx(r.totalContributions, 500 * 12 * 15, 0.01);
});

test('annual contributions + annual compounding', () => {
  // P=0, PMT=1000/yr, r=5%, 10yr, end => FV = 1000 * ((1.05^10 - 1)/0.05) ≈ 12577.89
  const r = calculateCompoundInterest({
    principal: 0,
    annualRatePercent: 5,
    years: 10,
    compoundingFrequency: 'annually',
    contribution: 1000,
    contributionFrequency: 'annually',
    contributionTiming: 'end',
  });
  approx(r.finalBalance, 12577.89, 0.5);
  approx(r.totalContributions, 10000, 0.01);
});

test('rejects negative principal', () => {
  assert.throws(() =>
    calculateCompoundInterest({
      principal: -100,
      annualRatePercent: 5,
      years: 10,
      compoundingFrequency: 'monthly',
    })
  );
});

test('rejects zero years', () => {
  assert.throws(() =>
    calculateCompoundInterest({
      principal: 1000,
      annualRatePercent: 5,
      years: 0,
      compoundingFrequency: 'monthly',
    })
  );
});
