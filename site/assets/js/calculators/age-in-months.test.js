'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateAgeInMonths, parseYMD, daysInMonth } = require('./age-in-months.js');

// --- parseYMD ---

test('parseYMD: valid date → { y, m, d }', () => {
  const r = parseYMD('1990-06-20');
  assert.deepEqual(r, { y: 1990, m: 6, d: 20 });
});

test('parseYMD: invalid format → null', () => {
  assert.equal(parseYMD('not-a-date'), null);
  assert.equal(parseYMD('1990/06/20'), null);
  assert.equal(parseYMD(''), null);
  assert.equal(parseYMD(123), null);
});

test('parseYMD: impossible day → null', () => {
  assert.equal(parseYMD('2025-02-30'), null);  // Feb doesn't have 30 days
  assert.equal(parseYMD('2025-13-01'), null);  // no month 13
  assert.equal(parseYMD('2025-04-31'), null);  // April has 30 days
});

test('parseYMD: leap day accepted only in leap years', () => {
  assert.deepEqual(parseYMD('2024-02-29'), { y: 2024, m: 2, d: 29 });
  assert.equal(parseYMD('2025-02-29'), null);
});

// --- daysInMonth ---

test('daysInMonth: standard months', () => {
  assert.equal(daysInMonth(2025, 1), 31);  // Jan
  assert.equal(daysInMonth(2025, 4), 30);  // Apr
  assert.equal(daysInMonth(2025, 12), 31); // Dec
});

test('daysInMonth: February leap vs non-leap', () => {
  assert.equal(daysInMonth(2024, 2), 29);  // leap
  assert.equal(daysInMonth(2025, 2), 28);  // non-leap
  assert.equal(daysInMonth(2000, 2), 29);  // divisible by 400 → leap
  assert.equal(daysInMonth(1900, 2), 28);  // divisible by 100 not 400 → not leap
});

// --- calculateAgeInMonths ---

test('newborn: born today → 0 months, 0 days', () => {
  const r = calculateAgeInMonths({ dob: '2026-04-22', today: '2026-04-22' });
  assert.equal(r.totalMonths, 0);
  assert.equal(r.years, 0);
  assert.equal(r.monthsOnly, 0);
  assert.equal(r.days, 0);
  assert.equal(r.totalDays, 0);
});

test('exactly one month old', () => {
  const r = calculateAgeInMonths({ dob: '2026-03-22', today: '2026-04-22' });
  assert.equal(r.totalMonths, 1);
  assert.equal(r.monthsOnly, 1);
  assert.equal(r.days, 0);
});

test('exactly one year old → 12 months', () => {
  const r = calculateAgeInMonths({ dob: '2025-04-22', today: '2026-04-22' });
  assert.equal(r.totalMonths, 12);
  assert.equal(r.years, 1);
  assert.equal(r.monthsOnly, 0);
  assert.equal(r.days, 0);
});

test('2 years 6 months → 30 months', () => {
  const r = calculateAgeInMonths({ dob: '2023-10-22', today: '2026-04-22' });
  assert.equal(r.totalMonths, 30);
  assert.equal(r.years, 2);
  assert.equal(r.monthsOnly, 6);
  assert.equal(r.days, 0);
});

test('adult: 1985-06-15 to 2026-04-22 → 40y 10m 7d = 490 months', () => {
  const r = calculateAgeInMonths({ dob: '1985-06-15', today: '2026-04-22' });
  assert.equal(r.years, 40);
  assert.equal(r.monthsOnly, 10);
  assert.equal(r.days, 7);
  assert.equal(r.totalMonths, 490);
});

test('birthday has not yet arrived this month → borrow a month', () => {
  // Born June 20; today is June 15 — not yet had this year's birthday
  const r = calculateAgeInMonths({ dob: '1990-06-20', today: '2026-06-15' });
  assert.equal(r.years, 35);
  assert.equal(r.monthsOnly, 11);
  assert.equal(r.days, 26);  // 15 + (30 - 20) + ... = 26 days into the month
  assert.equal(r.totalMonths, 35 * 12 + 11);  // 431
});

test('birthday has arrived this month → no borrow', () => {
  // Born June 20; today is June 25 — just had this year's birthday
  const r = calculateAgeInMonths({ dob: '1990-06-20', today: '2026-06-25' });
  assert.equal(r.years, 36);
  assert.equal(r.monthsOnly, 0);
  assert.equal(r.days, 5);
});

test('cross-year borrow: January today, December birthday', () => {
  // Born Dec 15 1999, today Jan 10 2026
  const r = calculateAgeInMonths({ dob: '1999-12-15', today: '2026-01-10' });
  assert.equal(r.years, 26);
  assert.equal(r.monthsOnly, 0);
  assert.equal(r.days, 26);  // 10 + (31 - 15) = 26
});

test('totalDays > 0 and roughly 365 × years for adult', () => {
  const r = calculateAgeInMonths({ dob: '1985-06-15', today: '2026-04-22' });
  assert.ok(r.totalDays > 14800);
  assert.ok(r.totalDays < 15000);
});

test('totalWeeks = floor(totalDays / 7)', () => {
  const r = calculateAgeInMonths({ dob: '2025-04-22', today: '2026-04-22' });
  assert.equal(r.totalWeeks, Math.floor(r.totalDays / 7));
});

test('totalHours = totalDays × 24', () => {
  const r = calculateAgeInMonths({ dob: '2025-04-22', today: '2026-04-22' });
  assert.equal(r.totalHours, r.totalDays * 24);
});

test('echoes dob and today in result', () => {
  const r = calculateAgeInMonths({ dob: '1990-06-20', today: '2026-04-22' });
  assert.equal(r.dob, '1990-06-20');
  assert.equal(r.today, '2026-04-22');
});

// --- Validation ---

test('throws when DOB is in the future', () => {
  assert.throws(
    () => calculateAgeInMonths({ dob: '2030-01-01', today: '2026-04-22' }),
    /future/
  );
});

test('throws on invalid DOB string', () => {
  assert.throws(() => calculateAgeInMonths({ dob: 'not-a-date', today: '2026-04-22' }));
  assert.throws(() => calculateAgeInMonths({ dob: '2026-13-45', today: '2026-04-22' }));
});

test('throws on missing DOB', () => {
  assert.throws(() => calculateAgeInMonths({ today: '2026-04-22' }));
  assert.throws(() => calculateAgeInMonths({}));
});

test('without today, uses current date', () => {
  // Born 100 years ago — should give around 1200 months
  const dob = '1926-04-22';
  const r = calculateAgeInMonths({ dob });
  assert.ok(r.totalMonths > 1000);
  assert.ok(r.totalMonths < 1400);
});
