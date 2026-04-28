'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const lib = require('./number-base-converter.js');

// Validation
test('validates a binary string of only 0 and 1', () => {
  assert.equal(lib.isValidForBase('1011', 2), true);
  assert.equal(lib.isValidForBase('1012', 2), false);
  assert.equal(lib.isValidForBase('2', 2), false);
});

test('validates octal strictly (digits 0 to 7)', () => {
  assert.equal(lib.isValidForBase('755', 8), true);
  assert.equal(lib.isValidForBase('758', 8), false);
});

test('validates hex case-insensitively', () => {
  assert.equal(lib.isValidForBase('deadbeef', 16), true);
  assert.equal(lib.isValidForBase('DEADBEEF', 16), true);
  assert.equal(lib.isValidForBase('deadg', 16), false);
  assert.equal(lib.isValidForBase('g', 16), false);
});

test('rejects empty strings as invalid', () => {
  assert.equal(lib.isValidForBase('', 10), false);
  assert.equal(lib.isValidForBase('   ', 10), false);
});

test('arbitrary base 36 accepts 0-9 and a-z', () => {
  assert.equal(lib.isValidForBase('zz', 36), true);
  assert.equal(lib.isValidForBase('z0a9', 36), true);
});

test('arbitrary base 5 rejects digit 5 or above', () => {
  assert.equal(lib.isValidForBase('1234', 5), true);
  assert.equal(lib.isValidForBase('1235', 5), false);
});

// Core canonical conversions: decimal 255
test('decimal 255 converts to binary 11111111', () => {
  assert.equal(lib.fromDecimal(255n, 2), '11111111');
});
test('decimal 255 converts to octal 377', () => {
  assert.equal(lib.fromDecimal(255n, 8), '377');
});
test('decimal 255 converts to hex ff', () => {
  assert.equal(lib.fromDecimal(255n, 16), 'ff');
});

// Hex deadbeef to decimal
test('hex deadbeef converts to decimal 3735928559', () => {
  assert.equal(lib.toDecimal('deadbeef', 16), 3735928559n);
});

// convertAll from any field returns all four standard bases
test('convertAll from decimal 255 fills all four bases', () => {
  const out = lib.convertAll('dec', '255');
  assert.equal(out.ok, true);
  assert.equal(out.bin, '11111111');
  assert.equal(out.oct, '377');
  assert.equal(out.dec, '255');
  assert.equal(out.hex, 'ff');
});

test('convertAll from hex deadbeef fills all four bases', () => {
  const out = lib.convertAll('hex', 'DEADBEEF');
  assert.equal(out.ok, true);
  assert.equal(out.dec, '3735928559');
  assert.equal(out.hex, 'deadbeef');
  assert.equal(out.bin, '11011110101011011011111011101111');
});

// Validation rejection through convertAll
test('convertAll rejects "2" in binary field', () => {
  const out = lib.convertAll('bin', '2');
  assert.equal(out.ok, false);
  assert.ok(out.error && /binary/i.test(out.error));
});

test('convertAll rejects "g" in hex field', () => {
  const out = lib.convertAll('hex', 'g');
  assert.equal(out.ok, false);
  assert.ok(out.error && /hex/i.test(out.error));
});

// BigInt round-trip for 2^60 (well beyond Number.MAX_SAFE_INTEGER for many ops)
test('BigInt round-trip for 2 to the power of 60', () => {
  const big = 1n << 60n; // 1152921504606846976
  const hex = lib.fromDecimal(big, 16);
  const back = lib.toDecimal(hex, 16);
  assert.equal(back, big);
  assert.equal(lib.fromDecimal(big, 2).length, 61);
  assert.equal(lib.fromDecimal(big, 2)[0], '1');
});

// Arbitrary base 36 conversion
test('arbitrary base 36 "zz" equals decimal 1295', () => {
  assert.equal(lib.toDecimal('zz', 36), 1295n);
  assert.equal(lib.fromDecimal(1295n, 36), 'zz');
});

test('convertAll from arbitrary base 36 with value zz', () => {
  const out = lib.convertAllFromArbitrary('zz', 36);
  assert.equal(out.ok, true);
  assert.equal(out.dec, '1295');
  assert.equal(out.hex, '50f');
  assert.equal(out.oct, '2417');
  assert.equal(out.bin, '10100001111');
});

// Edge case: zero in all bases
test('zero in every base is "0"', () => {
  assert.equal(lib.fromDecimal(0n, 2), '0');
  assert.equal(lib.fromDecimal(0n, 8), '0');
  assert.equal(lib.fromDecimal(0n, 10), '0');
  assert.equal(lib.fromDecimal(0n, 16), '0');
  assert.equal(lib.fromDecimal(0n, 36), '0');
  const out = lib.convertAll('dec', '0');
  assert.equal(out.ok, true);
  assert.equal(out.bin, '0');
  assert.equal(out.oct, '0');
  assert.equal(out.dec, '0');
  assert.equal(out.hex, '0');
});

// Base range validation for arbitrary base
test('arbitrary base outside 2 to 36 is rejected', () => {
  const tooLow = lib.convertAllFromArbitrary('1', 1);
  assert.equal(tooLow.ok, false);
  const tooHigh = lib.convertAllFromArbitrary('1', 37);
  assert.equal(tooHigh.ok, false);
});

// MAX_SAFE_INTEGER detection
test('exceedsMaxSafeInteger flags values above 2^53 - 1', () => {
  assert.equal(lib.exceedsMaxSafeInteger(BigInt(Number.MAX_SAFE_INTEGER)), false);
  assert.equal(lib.exceedsMaxSafeInteger(BigInt(Number.MAX_SAFE_INTEGER) + 1n), true);
  assert.equal(lib.exceedsMaxSafeInteger(0n), false);
});

// No leading zeros in decimal output, but preserve the lowercase hex norm
test('hex output is normalised lowercase', () => {
  assert.equal(lib.fromDecimal(2748n, 16), 'abc');
});

// Field name passthrough: source value preserved verbatim where possible
test('convertAll preserves a hex source value as the lowercased typed input', () => {
  const out = lib.convertAll('hex', 'FF');
  assert.equal(out.ok, true);
  assert.equal(out.hex, 'ff');
});
