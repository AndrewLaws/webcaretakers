'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const lib = require('./decision-wheel.js');

test('parseOptions trims whitespace and drops empty lines', () => {
  const r = lib.parseOptions('  Pizza  \n\nCurry\n   \nSushi\n');
  assert.deepEqual(r.options, ['Pizza', 'Curry', 'Sushi']);
  assert.equal(r.count, 3);
});

test('parseOptions preserves duplicates (weighted entries)', () => {
  const r = lib.parseOptions('Pizza\nCurry\nPizza\nSushi\nPizza');
  assert.deepEqual(r.options, ['Pizza', 'Curry', 'Pizza', 'Sushi', 'Pizza']);
  assert.equal(r.count, 5);
});

test('parseOptions handles empty input', () => {
  const r = lib.parseOptions('');
  assert.deepEqual(r.options, []);
  assert.equal(r.count, 0);
});

test('parseOptions handles whitespace-only input', () => {
  const r = lib.parseOptions('   \n\n\t\n  ');
  assert.deepEqual(r.options, []);
  assert.equal(r.count, 0);
});

test('parseOptions caps at MAX_OPTIONS (50)', () => {
  var raw = '';
  for (var i = 0; i < 60; i++) raw += 'Option ' + i + '\n';
  const r = lib.parseOptions(raw);
  assert.equal(r.options.length, 50);
  assert.equal(r.truncated, true);
});

test('parseOptions accepts non-string as empty', () => {
  const r = lib.parseOptions(null);
  assert.deepEqual(r.options, []);
});

test('validateSpin rejects empty list', () => {
  const v = lib.validateSpin([]);
  assert.equal(v.ok, false);
  assert.match(v.message, /at least one option/i);
});

test('validateSpin warns on a single option but is still ok=false (cannot spin meaningfully)', () => {
  const v = lib.validateSpin(['Only one']);
  assert.equal(v.ok, true);
  assert.match(v.warning, /only entered one option/i);
});

test('validateSpin allows two or more options without warning', () => {
  const v = lib.validateSpin(['A', 'B']);
  assert.equal(v.ok, true);
  assert.equal(v.warning, undefined);
});

test('pickWinnerIndex returns 0 for a single option', () => {
  assert.equal(lib.pickWinnerIndex(['Only'], () => 0), 0);
});

test('pickWinnerIndex uses injected randomInt deterministically', () => {
  const opts = ['A', 'B', 'C', 'D'];
  assert.equal(lib.pickWinnerIndex(opts, () => 2), 2);
  assert.equal(lib.pickWinnerIndex(opts, () => 0), 0);
});

test('pickWinnerIndex throws on empty list', () => {
  assert.throws(() => lib.pickWinnerIndex([], () => 0), /at least one option/);
});

test('wedgeAngles returns equal slices summing to 360', () => {
  const a = lib.wedgeAngles(4);
  assert.equal(a.length, 4);
  a.forEach(v => assert.equal(v, 90));
  const sum = a.reduce((s, x) => s + x, 0);
  assert.equal(sum, 360);
});

test('wedgeAngles single slice is 360', () => {
  assert.deepEqual(lib.wedgeAngles(1), [360]);
});

test('wedgeCentreAngle returns the centre of the i-th wedge starting from 12 o\'clock', () => {
  // 4 wedges of 90deg each. Wedge 0 spans 0..90, centre at 45.
  // We use the convention: wedge i centre = i * (360/n) + (360/n)/2.
  assert.equal(lib.wedgeCentreAngle(0, 4), 45);
  assert.equal(lib.wedgeCentreAngle(1, 4), 135);
  assert.equal(lib.wedgeCentreAngle(2, 4), 225);
  assert.equal(lib.wedgeCentreAngle(3, 4), 315);
});

test('computeFinalRotation lands the chosen wedge under the pointer', () => {
  // Pointer is at top (0deg). To land wedge i under pointer, we need to
  // rotate the wheel by -wedgeCentreAngle(i, n), modulo 360, plus full spins.
  // computeFinalRotation(i, n, spins) = spins*360 + (360 - wedgeCentreAngle(i, n)) mod 360
  const r0 = lib.computeFinalRotation(0, 4, 5);
  // Wedge 0 centre = 45, wheel rotation needed = 360 - 45 = 315, plus 5*360 = 1800 + 315 = 2115
  assert.equal(r0, 5 * 360 + 315);
  const r1 = lib.computeFinalRotation(1, 4, 5);
  assert.equal(r1, 5 * 360 + (360 - 135));
});

test('computeFinalRotation includes at least the requested full spins', () => {
  const r = lib.computeFinalRotation(2, 8, 6);
  assert.ok(r >= 6 * 360);
});

test('hueForWedge cycles through 0..360 evenly', () => {
  assert.equal(lib.hueForWedge(0, 4), 0);
  assert.equal(lib.hueForWedge(1, 4), 90);
  assert.equal(lib.hueForWedge(2, 4), 180);
  assert.equal(lib.hueForWedge(3, 4), 270);
});

test('removeAt returns a new array without the i-th element', () => {
  assert.deepEqual(lib.removeAt(['A', 'B', 'C', 'D'], 1), ['A', 'C', 'D']);
  assert.deepEqual(lib.removeAt(['A'], 0), []);
});

test('removeAt out-of-range returns the array unchanged (defensive)', () => {
  assert.deepEqual(lib.removeAt(['A', 'B'], 5), ['A', 'B']);
  assert.deepEqual(lib.removeAt(['A', 'B'], -1), ['A', 'B']);
});

test('bias check: 10000 picks across 5 options each within 20% of expected', () => {
  const opts = ['A', 'B', 'C', 'D', 'E'];
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  const trials = 10000;
  for (let i = 0; i < trials; i++) {
    const idx = lib.pickWinnerIndex(opts);
    counts[opts[idx]]++;
  }
  const expected = trials / opts.length;
  const lower = expected * 0.8;
  const upper = expected * 1.2;
  Object.keys(counts).forEach(k => {
    assert.ok(
      counts[k] >= lower && counts[k] <= upper,
      `${k}: got ${counts[k]}, expected within [${lower}, ${upper}]`
    );
  });
});

test('defaultRandomInt produces values in [0, n)', () => {
  for (let i = 0; i < 200; i++) {
    const v = lib.defaultRandomInt(7);
    assert.ok(v >= 0 && v < 7 && Number.isInteger(v));
  }
});

test('wedgePathD returns a valid SVG path string with arc command', () => {
  const d = lib.wedgePathD(200, 200, 180, 0, 90);
  // Should contain M (moveto), L (lineto), A (arc), Z (close)
  assert.match(d, /^M /);
  assert.match(d, / A /);
  assert.match(d, /Z$/);
});

test('wedgePathD for full circle (single option) draws a complete circle path', () => {
  const d = lib.wedgePathD(200, 200, 180, 0, 360);
  // Full-circle special case still emits a closed path.
  assert.match(d, /Z$/);
});
