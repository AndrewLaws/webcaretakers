'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const lib = require('./roman-numeral-converter.js');

// numberToRoman: subtractive forms
test('numberToRoman: 1 -> I', () => {
  assert.equal(lib.numberToRoman(1), 'I');
});
test('numberToRoman: 4 -> IV', () => {
  assert.equal(lib.numberToRoman(4), 'IV');
});
test('numberToRoman: 9 -> IX', () => {
  assert.equal(lib.numberToRoman(9), 'IX');
});
test('numberToRoman: 40 -> XL', () => {
  assert.equal(lib.numberToRoman(40), 'XL');
});
test('numberToRoman: 90 -> XC', () => {
  assert.equal(lib.numberToRoman(90), 'XC');
});
test('numberToRoman: 400 -> CD', () => {
  assert.equal(lib.numberToRoman(400), 'CD');
});
test('numberToRoman: 900 -> CM', () => {
  assert.equal(lib.numberToRoman(900), 'CM');
});

// numberToRoman: representative values
test('numberToRoman: 1984 -> MCMLXXXIV', () => {
  assert.equal(lib.numberToRoman(1984), 'MCMLXXXIV');
});
test('numberToRoman: 2024 -> MMXXIV', () => {
  assert.equal(lib.numberToRoman(2024), 'MMXXIV');
});
test('numberToRoman: 3999 -> MMMCMXCIX (max)', () => {
  assert.equal(lib.numberToRoman(3999), 'MMMCMXCIX');
});

// numberToRoman: rejections
test('numberToRoman rejects 0', () => {
  assert.throws(() => lib.numberToRoman(0), /start at 1|whole number/i);
});
test('numberToRoman rejects negative', () => {
  assert.throws(() => lib.numberToRoman(-3), /start at 1/i);
});
test('numberToRoman rejects 4000', () => {
  assert.throws(() => lib.numberToRoman(4000), /3,?999/);
});
test('numberToRoman rejects 1.5', () => {
  assert.throws(() => lib.numberToRoman(1.5), /whole/i);
});
test('numberToRoman rejects NaN', () => {
  assert.throws(() => lib.numberToRoman(NaN), /whole number/i);
});

// romanToNumber: parses
test('romanToNumber: I -> 1', () => {
  assert.equal(lib.romanToNumber('I'), 1);
});
test('romanToNumber: IV -> 4', () => {
  assert.equal(lib.romanToNumber('IV'), 4);
});
test('romanToNumber: MCMLXXXIV -> 1984', () => {
  assert.equal(lib.romanToNumber('MCMLXXXIV'), 1984);
});
test('romanToNumber: MMMCMXCIX -> 3999', () => {
  assert.equal(lib.romanToNumber('MMMCMXCIX'), 3999);
});
test('romanToNumber: lowercase mcmlxxxiv -> 1984', () => {
  assert.equal(lib.romanToNumber('mcmlxxxiv'), 1984);
});
test('romanToNumber: trims whitespace', () => {
  assert.equal(lib.romanToNumber('  XIV  '), 14);
});

// romanToNumber: rejections
test('romanToNumber rejects empty string', () => {
  assert.throws(() => lib.romanToNumber(''), /Enter a Roman/i);
});
test('romanToNumber rejects IIII (non-canonical)', () => {
  assert.throws(() => lib.romanToNumber('IIII'), /not a standard|canonical/i);
});
test('romanToNumber rejects VV', () => {
  assert.throws(() => lib.romanToNumber('VV'), /not a standard|canonical/i);
});
test('romanToNumber rejects IC (illegal subtractive)', () => {
  assert.throws(() => lib.romanToNumber('IC'), /not a standard|canonical/i);
});
test('romanToNumber rejects mixed valid + extra chars X1', () => {
  assert.throws(() => lib.romanToNumber('X1'), /letters/i);
});
test('romanToNumber rejects gibberish', () => {
  assert.throws(() => lib.romanToNumber('hello'), /letters/i);
});

// Round-trip property: every integer 1..3999 round-trips cleanly.
test('round-trip: numberToRoman / romanToNumber stable for every n in 1..3999', () => {
  for (let n = 1; n <= 3999; n++) {
    const r = lib.numberToRoman(n);
    const back = lib.romanToNumber(r);
    assert.equal(back, n);
  }
});

// Steps: working out shape
test('numberToRomanSteps for 1984 starts with M', () => {
  const steps = lib.numberToRomanSteps(1984);
  assert.equal(steps[0].token, 'M');
  assert.equal(steps[0].value, 1000);
  assert.equal(steps[0].before, 1984);
  assert.equal(steps[0].after, 984);
});

test('romanToNumberSteps marks IV as subtract then add', () => {
  const steps = lib.romanToNumberSteps('IV');
  assert.equal(steps[0].op, 'subtract');
  assert.equal(steps[1].op, 'add');
});
