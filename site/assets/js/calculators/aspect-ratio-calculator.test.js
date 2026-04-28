'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const lib = require('./aspect-ratio-calculator.js');

// gcd
test('gcd(1920, 1080) is 120', () => {
  assert.equal(lib.gcd(1920, 1080), 120);
});
test('gcd(0, 5) is 5', () => {
  assert.equal(lib.gcd(0, 5), 5);
});
test('gcd handles negatives', () => {
  assert.equal(lib.gcd(-12, 8), 4);
});

// simplifyRatio
test('simplifyRatio(1920, 1080) = 16:9', () => {
  const r = lib.simplifyRatio(1920, 1080);
  assert.equal(r.w, 16);
  assert.equal(r.h, 9);
  assert.equal(r.divisor, 120);
});
test('simplifyRatio(800, 600) = 4:3', () => {
  const r = lib.simplifyRatio(800, 600);
  assert.equal(r.w, 4);
  assert.equal(r.h, 3);
});
test('simplifyRatio(1080, 1920) = 9:16 (portrait)', () => {
  const r = lib.simplifyRatio(1080, 1920);
  assert.equal(r.w, 9);
  assert.equal(r.h, 16);
});
test('simplifyRatio(1, 1) = 1:1', () => {
  const r = lib.simplifyRatio(1, 1);
  assert.equal(r.w, 1);
  assert.equal(r.h, 1);
});

// scaleFromWidth: returns matching height for the target width
test('scaleFromWidth(1920, 1080, 800) -> height 450', () => {
  const out = lib.scaleFromWidth(1920, 1080, 800);
  assert.equal(out.height, 450);
  assert.equal(out.scale, 800 / 1920);
});
test('scaleFromWidth(4, 3, 800) -> height 600 (preset 4:3)', () => {
  const out = lib.scaleFromWidth(4, 3, 800);
  assert.equal(out.height, 600);
});

// scaleFromHeight: returns matching width for the target height
test('scaleFromHeight(1920, 1080, 600) -> width 1066.67', () => {
  const out = lib.scaleFromHeight(1920, 1080, 600);
  // 1920 * 600/1080 = 1066.666...
  assert.ok(Math.abs(out.width - (1920 * 600 / 1080)) < 1e-9);
  assert.equal(out.scale, 600 / 1080);
});
test('scaleFromHeight(16, 9, 1080) -> width 1920', () => {
  const out = lib.scaleFromHeight(16, 9, 1080);
  assert.equal(out.width, 1920);
});

// Edge cases: zero, negative, non-integer
test('simplifyRatio rejects 0 width', () => {
  assert.throws(() => lib.simplifyRatio(0, 1080), /positive/i);
});
test('simplifyRatio rejects negative height', () => {
  assert.throws(() => lib.simplifyRatio(1920, -10), /positive/i);
});
test('simplifyRatio rejects non-integer', () => {
  assert.throws(() => lib.simplifyRatio(1920.5, 1080), /whole|integer/i);
});
test('scaleFromWidth rejects 0 target width', () => {
  assert.throws(() => lib.scaleFromWidth(1920, 1080, 0), /positive/i);
});
test('scaleFromHeight rejects negative target height', () => {
  assert.throws(() => lib.scaleFromHeight(1920, 1080, -50), /positive/i);
});

// formatRatio: rounds to a sensible string for display
test('formatRatio(16, 9) = "16:9"', () => {
  assert.equal(lib.formatRatio(16, 9), '16:9');
});

// roundDim: helper that rounds to a whole pixel by default
test('roundDim(1066.67) = 1067', () => {
  assert.equal(lib.roundDim(1066.67), 1067);
});
test('roundDim(450) = 450', () => {
  assert.equal(lib.roundDim(450), 450);
});

// PRESETS export
test('PRESETS includes 16:9, 4:3, 1:1, 9:16, 21:9, 3:2', () => {
  const labels = lib.PRESETS.map(p => p.label);
  assert.ok(labels.includes('16:9'));
  assert.ok(labels.includes('4:3'));
  assert.ok(labels.includes('1:1'));
  assert.ok(labels.includes('9:16'));
  assert.ok(labels.includes('21:9'));
  assert.ok(labels.includes('3:2'));
});
