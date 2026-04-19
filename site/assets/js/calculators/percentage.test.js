const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  percentageOf,
  whatPercentIs,
  percentageChange,
  calculate,
} = require('./percentage.js');

test('percentageOf: what is 15% of 200 is 30', () => {
  assert.equal(percentageOf(15, 200), 30);
});

test('percentageOf: what is 0% of anything is 0', () => {
  assert.equal(percentageOf(0, 500), 0);
});

test('percentageOf: negatives are handled', () => {
  assert.equal(percentageOf(-10, 200), -20);
});

test('whatPercentIs: 50 is 25% of 200', () => {
  assert.equal(whatPercentIs(50, 200), 25);
});

test('whatPercentIs: throws for division by zero', () => {
  assert.throws(() => whatPercentIs(50, 0), /zero/i);
});

test('percentageChange: 100 to 150 is +50%', () => {
  assert.equal(percentageChange(100, 150), 50);
});

test('percentageChange: 200 to 100 is -50%', () => {
  assert.equal(percentageChange(200, 100), -50);
});

test('percentageChange: unchanged is 0%', () => {
  assert.equal(percentageChange(100, 100), 0);
});

test('percentageChange: throws when starting from zero', () => {
  assert.throws(() => percentageChange(0, 50), /zero/i);
});

test('calculate dispatches to the right mode', () => {
  assert.equal(calculate({ mode: 'percent-of', a: 20, b: 150 }), 30);
  assert.equal(calculate({ mode: 'what-percent', a: 25, b: 200 }), 12.5);
  assert.equal(calculate({ mode: 'change', a: 80, b: 100 }), 25);
});

test('calculate throws for unknown mode', () => {
  assert.throws(() => calculate({ mode: 'bogus', a: 1, b: 2 }), /mode/i);
});

test('calculate rounds to a sensible precision', () => {
  // 1/3 of 100 is 33.333... — expect at most 2 decimal places in the displayed result
  const result = calculate({ mode: 'percent-of', a: 33.333333, b: 100 });
  assert.equal(Math.round(result * 100) / 100, result);
});
