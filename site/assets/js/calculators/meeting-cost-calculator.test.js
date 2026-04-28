'use strict';

// Unit tests for the Meeting Cost Calculator pure-function maths.
// All money figures are calculated against a documented working-hours-per-year
// constant so the maths is auditable.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  WORKING_HOURS_PER_YEAR,
  DEFAULT_OVERHEADS_MULTIPLIER,
  CURRENCIES,
  hourlyRate,
  attendeeCost,
  meetingCost,
  annualisedWeeklyCost,
  totalPersonHours,
  liveTickerCost,
  formatMoney,
} = require('./meeting-cost-calculator.js');

// ── constants ─────────────────────────────────────────────────────────────

test('WORKING_HOURS_PER_YEAR is 1800 (37.5h x 48 weeks)', () => {
  assert.equal(WORKING_HOURS_PER_YEAR, 1800);
});

test('DEFAULT_OVERHEADS_MULTIPLIER is 1.3', () => {
  assert.equal(DEFAULT_OVERHEADS_MULTIPLIER, 1.3);
});

test('CURRENCIES includes GBP, USD, EUR with symbols', () => {
  assert.equal(CURRENCIES.GBP, '£');
  assert.equal(CURRENCIES.USD, '$');
  assert.equal(CURRENCIES.EUR, '€');
});

// ── hourlyRate ────────────────────────────────────────────────────────────

test('hourlyRate: £60,000 salary, 1.3 overheads → £43.33/hr', () => {
  const r = hourlyRate(60000, 1.3);
  // (60000 * 1.3) / 1800 = 78000 / 1800 = 43.333...
  assert.ok(Math.abs(r - 43.3333333) < 0.001);
});

test('hourlyRate: overheads of 1.0 means raw salary cost', () => {
  // £45,000 / 1800 = £25/hr
  assert.equal(hourlyRate(45000, 1.0), 25);
});

test('hourlyRate: zero salary → zero', () => {
  assert.equal(hourlyRate(0, 1.3), 0);
});

test('hourlyRate: rejects negative salary', () => {
  assert.throws(() => hourlyRate(-1, 1.3));
});

test('hourlyRate: rejects non-positive overheads', () => {
  assert.throws(() => hourlyRate(50000, 0));
  assert.throws(() => hourlyRate(50000, -0.5));
});

test('hourlyRate: handles decimal salaries', () => {
  // £52,500.50 * 1 / 1800 ≈ 29.166944
  const r = hourlyRate(52500.50, 1.0);
  assert.ok(Math.abs(r - (52500.50 / 1800)) < 1e-9);
});

// ── attendeeCost ──────────────────────────────────────────────────────────

test('attendeeCost: £60k salary, 1.3 overheads, 60 minutes → ~£43.33', () => {
  const r = attendeeCost({ salary: 60000, overheads: 1.3, durationMinutes: 60 });
  assert.ok(Math.abs(r - 43.3333333) < 0.001);
});

test('attendeeCost: zero duration → 0 (no division by zero)', () => {
  assert.equal(attendeeCost({ salary: 60000, overheads: 1.3, durationMinutes: 0 }), 0);
});

test('attendeeCost: 30 minutes is half the hourly cost', () => {
  const hour = attendeeCost({ salary: 60000, overheads: 1.3, durationMinutes: 60 });
  const half = attendeeCost({ salary: 60000, overheads: 1.3, durationMinutes: 30 });
  assert.ok(Math.abs(half * 2 - hour) < 1e-9);
});

// ── meetingCost (simple and detailed) ─────────────────────────────────────

test('meetingCost simple: 5 attendees x £50,000 x 1.3 x 30 min', () => {
  // hourly = 50000*1.3/1800 = 36.1111
  // 30 min cost per person = 18.0555
  // 5 people = 90.2777
  const r = meetingCost({
    rows: [{ count: 5, salary: 50000 }],
    overheads: 1.3,
    durationMinutes: 30,
  });
  assert.ok(Math.abs(r.total - (5 * 50000 * 1.3 * 30) / (1800 * 60)) < 0.001);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].count, 5);
});

test('meetingCost detailed: multi-row totals match sum of rows', () => {
  const r = meetingCost({
    rows: [
      { label: 'Engineer', count: 3, salary: 80000 },
      { label: 'Designer', count: 2, salary: 60000 },
      { label: 'PM', count: 1, salary: 95000 },
    ],
    overheads: 1.3,
    durationMinutes: 60,
  });
  const sum = r.rows.reduce((acc, row) => acc + row.cost, 0);
  assert.ok(Math.abs(r.total - sum) < 1e-9);
});

test('meetingCost: single attendee handled', () => {
  const r = meetingCost({
    rows: [{ count: 1, salary: 60000 }],
    overheads: 1.3,
    durationMinutes: 60,
  });
  assert.equal(r.rows[0].count, 1);
  assert.ok(Math.abs(r.total - (60000 * 1.3) / 1800) < 1e-9);
});

test('meetingCost: zero duration → £0 total', () => {
  const r = meetingCost({
    rows: [{ count: 5, salary: 60000 }],
    overheads: 1.3,
    durationMinutes: 0,
  });
  assert.equal(r.total, 0);
});

test('meetingCost: rejects empty rows', () => {
  assert.throws(() => meetingCost({ rows: [], overheads: 1.3, durationMinutes: 30 }));
});

test('meetingCost: rejects negative duration', () => {
  assert.throws(() => meetingCost({
    rows: [{ count: 1, salary: 50000 }],
    overheads: 1.3,
    durationMinutes: -5,
  }));
});

test('meetingCost: rejects negative count', () => {
  assert.throws(() => meetingCost({
    rows: [{ count: -1, salary: 50000 }],
    overheads: 1.3,
    durationMinutes: 30,
  }));
});

test('meetingCost: overheads of 1.0 gives raw salary cost', () => {
  const r = meetingCost({
    rows: [{ count: 2, salary: 45000 }],
    overheads: 1.0,
    durationMinutes: 60,
  });
  // 2 x (45000/1800) = 50
  assert.equal(r.total, 50);
});

test('meetingCost: decimal salary handled', () => {
  const r = meetingCost({
    rows: [{ count: 1, salary: 52500.50 }],
    overheads: 1.0,
    durationMinutes: 60,
  });
  assert.ok(Math.abs(r.total - 52500.50 / 1800) < 1e-9);
});

// ── annualisedWeeklyCost ──────────────────────────────────────────────────

test('annualisedWeeklyCost: multiplies by 52', () => {
  assert.equal(annualisedWeeklyCost(100), 5200);
});

test('annualisedWeeklyCost: zero stays zero', () => {
  assert.equal(annualisedWeeklyCost(0), 0);
});

// ── totalPersonHours ──────────────────────────────────────────────────────

test('totalPersonHours: 5 attendees, 30 minutes = 2.5 person-hours', () => {
  const r = totalPersonHours({
    rows: [{ count: 5, salary: 1 }],
    durationMinutes: 30,
  });
  assert.equal(r, 2.5);
});

test('totalPersonHours: multi-row sums counts then multiplies', () => {
  const r = totalPersonHours({
    rows: [{ count: 3, salary: 1 }, { count: 2, salary: 1 }],
    durationMinutes: 60,
  });
  assert.equal(r, 5);
});

test('totalPersonHours: zero duration → 0', () => {
  const r = totalPersonHours({
    rows: [{ count: 5, salary: 1 }],
    durationMinutes: 0,
  });
  assert.equal(r, 0);
});

// ── liveTickerCost ────────────────────────────────────────────────────────

test('liveTickerCost: half elapsed → half total', () => {
  assert.equal(liveTickerCost(100, 30, 60), 50);
});

test('liveTickerCost: clamped at total once elapsed exceeds duration', () => {
  assert.equal(liveTickerCost(100, 90, 60), 100);
});

test('liveTickerCost: zero total seconds → zero (no NaN)', () => {
  assert.equal(liveTickerCost(100, 5, 0), 0);
});

test('liveTickerCost: zero elapsed → zero', () => {
  assert.equal(liveTickerCost(100, 0, 60), 0);
});

// ── formatMoney ───────────────────────────────────────────────────────────

test('formatMoney: GBP shows £ and two decimals', () => {
  assert.equal(formatMoney(1234.5, 'GBP'), '£1,234.50');
});

test('formatMoney: USD shows $', () => {
  assert.equal(formatMoney(1234.5, 'USD'), '$1,234.50');
});

test('formatMoney: EUR shows €', () => {
  assert.equal(formatMoney(1234.5, 'EUR'), '€1,234.50');
});

test('formatMoney: zero formatted with two decimals', () => {
  assert.equal(formatMoney(0, 'GBP'), '£0.00');
});

test('formatMoney: large numbers get thousands separators', () => {
  assert.equal(formatMoney(1234567.89, 'GBP'), '£1,234,567.89');
});
