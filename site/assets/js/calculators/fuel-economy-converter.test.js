'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const lib = require('./fuel-economy-converter.js');

// Constants exposed for auditing
test('exposes the documented conversion constants', () => {
  assert.equal(lib.IMP_GAL_LITRES, 4.54609);
  assert.equal(lib.US_GAL_LITRES, 3.785411784);
  assert.equal(lib.MILE_KM, 1.609344);
});

// MPG-UK <-> L/100km
test('30 MPG-UK is roughly 9.42 L/100km', () => {
  const v = lib.mpgUkToL100km(30);
  assert.ok(Math.abs(v - 9.416) < 0.01, 'got ' + v);
});
test('9.4163 L/100km back to MPG-UK is roughly 30', () => {
  const v = lib.l100kmToMpgUk(9.4160333);
  assert.ok(Math.abs(v - 30) < 0.01, 'got ' + v);
});

// MPG-US <-> L/100km
test('25 MPG-US is roughly 9.41 L/100km', () => {
  const v = lib.mpgUsToL100km(25);
  assert.ok(Math.abs(v - 9.4086) < 0.01, 'got ' + v);
});
test('round-trip MPG-US 30 through L/100km', () => {
  const back = lib.l100kmToMpgUs(lib.mpgUsToL100km(30));
  assert.ok(Math.abs(back - 30) < 1e-9, 'got ' + back);
});

// km/L <-> L/100km
test('10 km/L is exactly 10 L/100km', () => {
  assert.equal(lib.kmlToL100km(10), 10);
});
test('20 km/L is 5 L/100km', () => {
  assert.equal(lib.kmlToL100km(20), 5);
});
test('5 L/100km is 20 km/L', () => {
  assert.equal(lib.l100kmToKml(5), 20);
});

// Round-trip stability: MPG-UK -> L/100km -> MPG-UK
test('round-trip MPG-UK 40 returns to within tolerance', () => {
  const back = lib.l100kmToMpgUk(lib.mpgUkToL100km(40));
  assert.ok(Math.abs(back - 40) < 1e-9, 'got ' + back);
});

// computeFromField returns all four values from a single source
test('computeFromField with mpgUk=30 returns all four values', () => {
  const out = lib.computeFromField('mpgUk', 30);
  assert.equal(out.mpgUk, 30);
  assert.ok(Math.abs(out.l100km - 9.416) < 0.01);
  assert.ok(Math.abs(out.mpgUs - 24.98) < 0.5);
  assert.ok(Math.abs(out.kml - 10.62) < 0.5);
});

test('computeFromField with l100km=5 returns all four values', () => {
  const out = lib.computeFromField('l100km', 5);
  assert.equal(out.l100km, 5);
  assert.equal(out.kml, 20);
  assert.ok(out.mpgUk > 0);
  assert.ok(out.mpgUs > 0);
});

// Edge cases: zero / negative / non-finite => all blanks
test('computeFromField with zero returns nulls', () => {
  const out = lib.computeFromField('mpgUk', 0);
  assert.equal(out.mpgUk, null);
  assert.equal(out.mpgUs, null);
  assert.equal(out.l100km, null);
  assert.equal(out.kml, null);
});

test('computeFromField with negative returns nulls', () => {
  const out = lib.computeFromField('mpgUs', -5);
  assert.equal(out.mpgUk, null);
});

test('computeFromField with NaN returns nulls', () => {
  const out = lib.computeFromField('kml', NaN);
  assert.equal(out.kml, null);
});

test('computeFromField with empty string returns nulls', () => {
  const out = lib.computeFromField('l100km', '');
  assert.equal(out.l100km, null);
});

// Very high MPG (small L/100km)
test('100 MPG-UK gives small L/100km', () => {
  const out = lib.computeFromField('mpgUk', 100);
  assert.ok(out.l100km < 3, 'expected < 3, got ' + out.l100km);
});

// Very low MPG (large L/100km)
test('5 MPG-US gives large L/100km', () => {
  const out = lib.computeFromField('mpgUs', 5);
  assert.ok(out.l100km > 40, 'expected > 40, got ' + out.l100km);
});

// Rounding helpers for display
test('roundMpg gives 1 decimal', () => {
  assert.equal(lib.roundMpg(24.978), 25.0);
  assert.equal(lib.roundMpg(24.949), 24.9);
});
test('roundL100 gives 2 decimals', () => {
  assert.equal(lib.roundL100(9.4163), 9.42);
});
test('roundKml gives 2 decimals', () => {
  assert.equal(lib.roundKml(10.6189), 10.62);
});

// Unknown field rejected
test('computeFromField with unknown field returns nulls', () => {
  const out = lib.computeFromField('mph', 30);
  assert.equal(out.mpgUk, null);
});
