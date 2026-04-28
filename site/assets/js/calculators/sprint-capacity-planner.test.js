'use strict';

// Unit tests for the Sprint Capacity Planner pure-function maths.
// Capacity is built up per person from sprint days, holidays, ceremonies and
// a focus factor, then totalled across the team and converted to story points
// via a velocity figure (story points per person-day).

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_SPRINT_DAYS,
  DEFAULT_HOURS_PER_DAY,
  DEFAULT_FOCUS_FACTOR,
  DEFAULT_VELOCITY,
  DEFAULT_CONFIDENCE_BAND,
  personHours,
  personDays,
  teamCapacity,
  forecastStoryPoints,
  confidenceBand,
} = require('./sprint-capacity-planner.js');

// ── constants ─────────────────────────────────────────────────────────────

test('DEFAULT_SPRINT_DAYS is 10', () => {
  assert.equal(DEFAULT_SPRINT_DAYS, 10);
});

test('DEFAULT_HOURS_PER_DAY is 6', () => {
  assert.equal(DEFAULT_HOURS_PER_DAY, 6);
});

test('DEFAULT_FOCUS_FACTOR is 0.7', () => {
  assert.equal(DEFAULT_FOCUS_FACTOR, 0.7);
});

test('DEFAULT_VELOCITY is 0.6 story points per person-day', () => {
  assert.equal(DEFAULT_VELOCITY, 0.6);
});

test('DEFAULT_CONFIDENCE_BAND is 0.2 (±20%)', () => {
  assert.equal(DEFAULT_CONFIDENCE_BAND, 0.2);
});

// ── personHours ───────────────────────────────────────────────────────────
// Required test 1: single person with no holiday and no ceremony returns
// sprintDays × hoursPerDay × focus.

test('personHours: single person, no holiday, no ceremonies, focus 1.0 → sprintDays × hoursPerDay', () => {
  const r = personHours({
    sprintDays: 10,
    hoursPerDay: 6,
    holidayDays: 0,
    ceremoniesPercent: 0,
    focusFactor: 1.0,
  });
  assert.equal(r, 60);
});

test('personHours: focus 0.7 trims hours by the focus factor', () => {
  const r = personHours({
    sprintDays: 10,
    hoursPerDay: 6,
    holidayDays: 0,
    ceremoniesPercent: 0,
    focusFactor: 0.7,
  });
  // 10 × 6 × 0.7 = 42
  assert.equal(r, 42);
});

// Required test 2: holiday subtracts correctly.

test('personHours: 2 holiday days subtracts from sprint days before applying focus', () => {
  const r = personHours({
    sprintDays: 10,
    hoursPerDay: 6,
    holidayDays: 2,
    ceremoniesPercent: 0,
    focusFactor: 1.0,
  });
  // (10 - 2) × 6 × 1.0 = 48
  assert.equal(r, 48);
});

test('personHours: holiday clamped so it never exceeds sprint days', () => {
  const r = personHours({
    sprintDays: 10,
    hoursPerDay: 6,
    holidayDays: 99,
    ceremoniesPercent: 0,
    focusFactor: 1.0,
  });
  assert.equal(r, 0);
});

// Required test 3: ceremonies % applied.

test('personHours: 25% ceremonies haircut removes a quarter of remaining hours', () => {
  const r = personHours({
    sprintDays: 10,
    hoursPerDay: 6,
    holidayDays: 0,
    ceremoniesPercent: 25,
    focusFactor: 1.0,
  });
  // 10 × 6 × 1.0 × (1 - 0.25) = 45
  assert.equal(r, 45);
});

test('personHours: ceremonies of 100% leaves zero capacity', () => {
  const r = personHours({
    sprintDays: 10,
    hoursPerDay: 6,
    holidayDays: 0,
    ceremoniesPercent: 100,
    focusFactor: 1.0,
  });
  assert.equal(r, 0);
});

test('personHours: combined holidays, ceremonies and focus all apply', () => {
  // (10 - 2) days × 6 hours × 0.7 focus × (1 - 0.10 ceremonies) = 30.24
  const r = personHours({
    sprintDays: 10,
    hoursPerDay: 6,
    holidayDays: 2,
    ceremoniesPercent: 10,
    focusFactor: 0.7,
  });
  assert.ok(Math.abs(r - 30.24) < 1e-9);
});

test('personHours: rejects negative holiday days', () => {
  assert.throws(() => personHours({
    sprintDays: 10, hoursPerDay: 6, holidayDays: -1, ceremoniesPercent: 0, focusFactor: 1.0,
  }));
});

test('personHours: rejects focus factor outside 0-1', () => {
  assert.throws(() => personHours({
    sprintDays: 10, hoursPerDay: 6, holidayDays: 0, ceremoniesPercent: 0, focusFactor: 1.5,
  }));
  assert.throws(() => personHours({
    sprintDays: 10, hoursPerDay: 6, holidayDays: 0, ceremoniesPercent: 0, focusFactor: -0.1,
  }));
});

test('personHours: rejects ceremonies outside 0-100', () => {
  assert.throws(() => personHours({
    sprintDays: 10, hoursPerDay: 6, holidayDays: 0, ceremoniesPercent: 150, focusFactor: 1.0,
  }));
});

// ── personDays ────────────────────────────────────────────────────────────

test('personDays: hours divided by hours-per-day', () => {
  // 42 hours over a 6-hour day = 7 person-days
  assert.equal(personDays(42, 6), 7);
});

test('personDays: zero hours → zero days', () => {
  assert.equal(personDays(0, 6), 0);
});

test('personDays: rejects non-positive hours-per-day (no division by zero)', () => {
  assert.throws(() => personDays(42, 0));
  assert.throws(() => personDays(42, -1));
});

// ── teamCapacity ──────────────────────────────────────────────────────────
// Required test 4: team total sums correctly across rows.

test('teamCapacity: totals sum correctly across multiple people', () => {
  const result = teamCapacity({
    sprintDays: 10,
    hoursPerDay: 6,
    velocity: 0.6,
    confidenceBand: 0.2,
    people: [
      { name: 'Alex', holidayDays: 0, ceremoniesPercent: 10, focusFactor: 0.7 },
      { name: 'Bel',  holidayDays: 2, ceremoniesPercent: 10, focusFactor: 0.7 },
      { name: 'Cam',  holidayDays: 0, ceremoniesPercent: 20, focusFactor: 0.5 },
    ],
  });
  // Alex: 10*6*0.7*(1-0.1) = 37.8
  // Bel:  8*6*0.7*(1-0.1)  = 30.24
  // Cam:  10*6*0.5*(1-0.2) = 24
  // Total hours = 92.04
  assert.ok(Math.abs(result.totalHours - 92.04) < 1e-9);
  // Sum of per-row hours equals total
  const sumRows = result.rows.reduce((acc, r) => acc + r.hours, 0);
  assert.ok(Math.abs(result.totalHours - sumRows) < 1e-9);
  // Days = 92.04 / 6 = 15.34
  assert.ok(Math.abs(result.totalDays - 15.34) < 1e-9);
  assert.equal(result.rows.length, 3);
});

test('teamCapacity: returns story-point forecast and confidence band', () => {
  const result = teamCapacity({
    sprintDays: 10,
    hoursPerDay: 6,
    velocity: 0.6,
    confidenceBand: 0.2,
    people: [
      { name: 'Solo', holidayDays: 0, ceremoniesPercent: 0, focusFactor: 1.0 },
    ],
  });
  // hours = 60, days = 10, points = 6, band ±20% = [4.8, 7.2]
  assert.equal(result.totalHours, 60);
  assert.equal(result.totalDays, 10);
  assert.equal(result.forecastPoints, 6);
  assert.ok(Math.abs(result.lowPoints - 4.8) < 1e-9);
  assert.ok(Math.abs(result.highPoints - 7.2) < 1e-9);
});

// Required test 5: edge case 0 team members invalid.

test('teamCapacity: rejects zero-length people array', () => {
  assert.throws(() => teamCapacity({
    sprintDays: 10,
    hoursPerDay: 6,
    velocity: 0.6,
    confidenceBand: 0.2,
    people: [],
  }));
});

test('teamCapacity: rejects non-array people input', () => {
  assert.throws(() => teamCapacity({
    sprintDays: 10,
    hoursPerDay: 6,
    velocity: 0.6,
    confidenceBand: 0.2,
    people: null,
  }));
});

test('teamCapacity: rejects negative velocity', () => {
  assert.throws(() => teamCapacity({
    sprintDays: 10,
    hoursPerDay: 6,
    velocity: -0.1,
    confidenceBand: 0.2,
    people: [{ holidayDays: 0, ceremoniesPercent: 0, focusFactor: 0.7 }],
  }));
});

test('teamCapacity: rejects non-positive sprint days', () => {
  assert.throws(() => teamCapacity({
    sprintDays: 0,
    hoursPerDay: 6,
    velocity: 0.6,
    confidenceBand: 0.2,
    people: [{ holidayDays: 0, ceremoniesPercent: 0, focusFactor: 0.7 }],
  }));
});

// ── forecastStoryPoints ───────────────────────────────────────────────────

test('forecastStoryPoints: person-days × velocity', () => {
  assert.equal(forecastStoryPoints(10, 0.6), 6);
});

test('forecastStoryPoints: zero days → zero', () => {
  assert.equal(forecastStoryPoints(0, 0.6), 0);
});

// ── confidenceBand ────────────────────────────────────────────────────────

test('confidenceBand: ±20% on 10 → [8, 12]', () => {
  const r = confidenceBand(10, 0.2);
  assert.equal(r.low, 8);
  assert.equal(r.high, 12);
});

test('confidenceBand: zero band returns same number both sides', () => {
  const r = confidenceBand(10, 0);
  assert.equal(r.low, 10);
  assert.equal(r.high, 10);
});
