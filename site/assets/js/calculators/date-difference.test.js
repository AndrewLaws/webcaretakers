'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateDateDifference, countBusinessDays, parseYMD } = require('./date-difference.js');

test('same day → 0 everything', () => {
  const r = calculateDateDifference({ from: '2026-04-22', to: '2026-04-22' });
  assert.equal(r.totalDays, 0);
  assert.equal(r.totalMonths, 0);
  assert.equal(r.years, 0);
  assert.equal(r.monthsOnly, 0);
  assert.equal(r.days, 0);
  assert.equal(r.reversed, false);
});

test('one day apart', () => {
  const r = calculateDateDifference({ from: '2026-04-22', to: '2026-04-23' });
  assert.equal(r.totalDays, 1);
  assert.equal(r.days, 1);
});

test('one month exactly', () => {
  const r = calculateDateDifference({ from: '2026-03-22', to: '2026-04-22' });
  assert.equal(r.totalMonths, 1);
  assert.equal(r.monthsOnly, 1);
  assert.equal(r.days, 0);
});

test('exactly one year', () => {
  const r = calculateDateDifference({ from: '2025-04-22', to: '2026-04-22' });
  assert.equal(r.totalMonths, 12);
  assert.equal(r.years, 1);
  assert.equal(r.days, 0);
  assert.equal(r.totalDays, 365);
});

test('one year across a leap day', () => {
  const r = calculateDateDifference({ from: '2024-01-01', to: '2025-01-01' });
  assert.equal(r.totalDays, 366);
});

test('borrow across month', () => {
  // Mar 31 2026 → Apr 1 2026: 1 day
  const r = calculateDateDifference({ from: '2026-03-31', to: '2026-04-01' });
  assert.equal(r.totalDays, 1);
  assert.equal(r.years, 0);
  assert.equal(r.monthsOnly, 0);
  assert.equal(r.days, 1);
});

test('reversed dates auto-flip and set flag', () => {
  const r = calculateDateDifference({ from: '2026-04-22', to: '2020-01-01' });
  assert.equal(r.reversed, true);
  assert.equal(r.years, 6);
  assert.equal(r.from, '2020-01-01'); // from becomes the earlier one
  assert.equal(r.to,   '2026-04-22');
});

test('decades apart', () => {
  const r = calculateDateDifference({ from: '1985-06-15', to: '2026-04-22' });
  assert.equal(r.years, 40);
  assert.equal(r.monthsOnly, 10);
  assert.equal(r.days, 7);
});

test('totalWeeks is floor(totalDays / 7)', () => {
  const r = calculateDateDifference({ from: '2026-01-01', to: '2026-01-10' });
  assert.equal(r.totalDays, 9);
  assert.equal(r.totalWeeks, 1);
});

test('totalHours = totalDays × 24', () => {
  const r = calculateDateDifference({ from: '2026-01-01', to: '2026-01-05' });
  assert.equal(r.totalHours, 96);
});

test('business days: Mon-Fri only in a single week', () => {
  // 2026-04-20 is a Monday, 2026-04-24 is a Friday. 5 business days.
  const r = calculateDateDifference({ from: '2026-04-20', to: '2026-04-24' });
  assert.equal(r.businessDays, 5);
});

test('business days: include weekend → still 5', () => {
  // Mon 20 Apr to Sun 26 Apr
  const r = calculateDateDifference({ from: '2026-04-20', to: '2026-04-26' });
  assert.equal(r.businessDays, 5);
});

test('business days: Sat-only range → 0', () => {
  const r = calculateDateDifference({ from: '2026-04-25', to: '2026-04-25' });
  assert.equal(r.businessDays, 0);
});

test('business days: two weeks', () => {
  // Mon 20 Apr to Fri 1 May: 10 business days
  const r = calculateDateDifference({ from: '2026-04-20', to: '2026-05-01' });
  assert.equal(r.businessDays, 10);
});

test('throws on bad input', () => {
  assert.throws(() => calculateDateDifference({ from: 'xyz', to: '2026-04-22' }));
  assert.throws(() => calculateDateDifference({ from: '2026-04-22' }));
  assert.throws(() => calculateDateDifference({}));
});

test('echoes from and to (after any flip)', () => {
  const r = calculateDateDifference({ from: '2026-04-22', to: '2026-12-31' });
  assert.equal(r.from, '2026-04-22');
  assert.equal(r.to, '2026-12-31');
});
