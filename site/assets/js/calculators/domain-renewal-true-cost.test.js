'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCost } = require('./domain-renewal-true-cost.js');

test('simple 5-year total with no add-ons', () => {
  const r = calculateCost({ firstYearPrice: 1, renewalPrice: 15, years: 5 });
  // 1 + 15 + 15 + 15 + 15 = 61
  assert.equal(r.totalDomain, 61);
  assert.equal(r.totalAddons, 0);
  assert.equal(r.totalNYear, 61);
});

test('year breakdown has the right shape and first year discount', () => {
  const r = calculateCost({ firstYearPrice: 1, renewalPrice: 15, years: 3 });
  assert.equal(r.yearBreakdown.length, 3);
  assert.equal(r.yearBreakdown[0].year, 1);
  assert.equal(r.yearBreakdown[0].domain, 1);
  assert.equal(r.yearBreakdown[1].domain, 15);
  assert.equal(r.yearBreakdown[2].domain, 15);
});

test('email add-on is monthly × 12 × mailboxes × years', () => {
  const r = calculateCost({
    firstYearPrice: 10, renewalPrice: 10, years: 2,
    emailMonthlyPerMailbox: 6, mailboxes: 2,
  });
  // email annual = 6 * 12 * 2 = 144; over 2 yrs = 288
  assert.equal(r.addonsAnnual, 144);
  assert.equal(r.totalAddons, 288);
  assert.equal(r.totalNYear, 10 * 2 + 288);
});

test('all add-ons combined', () => {
  const r = calculateCost({
    firstYearPrice: 10, renewalPrice: 10, years: 1,
    privacyAnnual: 5, dnsAnnual: 20, sslAnnual: 50,
    emailMonthlyPerMailbox: 6, mailboxes: 1,
  });
  // 5 + 72 + 20 + 50 = 147
  assert.equal(r.addonsAnnual, 147);
});

test('average annual and effective monthly are derived from total', () => {
  const r = calculateCost({ firstYearPrice: 0, renewalPrice: 120, years: 5 });
  // total = 0 + 120*4 = 480; avg = 96; monthly = 8
  assert.equal(r.totalNYear, 480);
  assert.equal(r.avgAnnual, 96);
  assert.equal(r.effectiveMonthly, 8);
});

test('first year discount is renewal minus first year', () => {
  const r = calculateCost({ firstYearPrice: 1, renewalPrice: 25, years: 2 });
  assert.equal(r.firstYearDiscount, 24);
});

test('alternative comparison includes same add-ons', () => {
  const r = calculateCost({
    firstYearPrice: 1, renewalPrice: 20, years: 5,
    privacyAnnual: 5, alternativeAnnual: 10,
  });
  // current: (1 + 4*20) + 5*5 = 81 + 25 = 106
  // alt: (10 + 5) * 5 = 75
  // savings = 106 - 75 = 31
  assert.equal(r.totalNYear, 106);
  assert.equal(r.alternativeNYearTotal, 75);
  assert.equal(r.savingsIfSwitched, 31);
});

test('no alternative fields when alternativeAnnual omitted', () => {
  const r = calculateCost({ firstYearPrice: 1, renewalPrice: 15, years: 5 });
  assert.equal(r.alternativeAnnual, undefined);
  assert.equal(r.savingsIfSwitched, undefined);
});

test('savingsIfSwitched can be negative (current is already cheaper)', () => {
  const r = calculateCost({
    firstYearPrice: 5, renewalPrice: 5, years: 5,
    alternativeAnnual: 20,
  });
  // current 25, alt 100, savings = -75 (switching would cost more)
  assert.equal(r.savingsIfSwitched, -75);
});

test('defaults years to 5 when omitted', () => {
  const r = calculateCost({ firstYearPrice: 1, renewalPrice: 15 });
  assert.equal(r.years, 5);
  assert.equal(r.yearBreakdown.length, 5);
});

test('one-year case: only the promo first-year price', () => {
  const r = calculateCost({ firstYearPrice: 1, renewalPrice: 15, years: 1 });
  assert.equal(r.totalDomain, 1);
  assert.equal(r.yearBreakdown.length, 1);
});

test('validates firstYearPrice non-negative', () => {
  assert.throws(() => calculateCost({ firstYearPrice: -1, renewalPrice: 15 }), /firstYearPrice/);
});

test('validates renewalPrice non-negative', () => {
  assert.throws(() => calculateCost({ firstYearPrice: 1, renewalPrice: -1 }), /renewalPrice/);
});

test('validates years >= 1', () => {
  assert.throws(() => calculateCost({ firstYearPrice: 1, renewalPrice: 15, years: 0 }), /years/);
});

test('validates add-on costs non-negative', () => {
  assert.throws(() => calculateCost({ firstYearPrice: 1, renewalPrice: 15, privacyAnnual: -1 }), /add-on/);
});

test('outputs rounded to 2dp', () => {
  const r = calculateCost({ firstYearPrice: 0.999, renewalPrice: 14.997, years: 3 });
  // total = 0.999 + 14.997*2 = 30.993 -> 30.99
  assert.equal(r.totalNYear, 30.99);
});
