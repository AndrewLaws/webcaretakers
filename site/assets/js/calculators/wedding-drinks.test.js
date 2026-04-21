'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateWeddingDrinks } = require('./wedding-drinks.js');

function approx(actual, expected, tolerance) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

function defaultArgs(overrides) {
  return Object.assign({
    guestCount: 100,
    preReceptionHours: 1.5,
    mealHours: 2.5,
    eveningHours: 4,
    drinkingStyle: 'moderate',
    includeToast: true,
  }, overrides);
}

// ── Structure ─────────────────────────────────────────────────────────────

test('returns all expected keys', () => {
  const r = calculateWeddingDrinks(defaultArgs());
  const keys = ['guestCount', 'drinkingStyle', 'includeToast', 'glassesPerPerson',
    'totalGlasses', 'whiteWineBottles', 'redWineBottles', 'proseccoBottles',
    'beerAndCiderCans', 'spiritBottles', 'softDrinkLitres'];
  for (const k of keys) {
    assert.ok(k in r, `missing key: ${k}`);
  }
});

test('all bottle/unit counts are positive integers', () => {
  const r = calculateWeddingDrinks(defaultArgs());
  assert.ok(r.whiteWineBottles > 0 && Number.isInteger(r.whiteWineBottles));
  assert.ok(r.redWineBottles > 0 && Number.isInteger(r.redWineBottles));
  assert.ok(r.proseccoBottles > 0 && Number.isInteger(r.proseccoBottles));
  assert.ok(r.beerAndCiderCans > 0 && Number.isInteger(r.beerAndCiderCans));
  assert.ok(r.spiritBottles > 0 && Number.isInteger(r.spiritBottles));
  assert.ok(r.softDrinkLitres > 0 && Number.isInteger(r.softDrinkLitres));
});

// ── Toast ─────────────────────────────────────────────────────────────────

test('more prosecco bottles when includeToast is true vs false', () => {
  const withToast    = calculateWeddingDrinks(defaultArgs({ includeToast: true }));
  const withoutToast = calculateWeddingDrinks(defaultArgs({ includeToast: false }));
  assert.ok(withToast.proseccoBottles > withoutToast.proseccoBottles,
    `expected more prosecco with toast: ${withToast.proseccoBottles} vs ${withoutToast.proseccoBottles}`);
});

// ── Drinking style ────────────────────────────────────────────────────────

test('heavy style produces more bottles than moderate', () => {
  const moderate = calculateWeddingDrinks(defaultArgs({ drinkingStyle: 'moderate' }));
  const heavy    = calculateWeddingDrinks(defaultArgs({ drinkingStyle: 'heavy' }));
  assert.ok(heavy.whiteWineBottles > moderate.whiteWineBottles);
  assert.ok(heavy.beerAndCiderCans > moderate.beerAndCiderCans);
});

test('light style produces fewer bottles than moderate', () => {
  const moderate = calculateWeddingDrinks(defaultArgs({ drinkingStyle: 'moderate' }));
  const light    = calculateWeddingDrinks(defaultArgs({ drinkingStyle: 'light' }));
  assert.ok(light.whiteWineBottles < moderate.whiteWineBottles);
  assert.ok(light.beerAndCiderCans < moderate.beerAndCiderCans);
});

// ── Guest count scaling ───────────────────────────────────────────────────

test('doubling guestCount roughly doubles wine bottles', () => {
  const r100 = calculateWeddingDrinks(defaultArgs({ guestCount: 100 }));
  const r200 = calculateWeddingDrinks(defaultArgs({ guestCount: 200 }));
  // Due to ceiling, exact double isn't guaranteed but should be close
  approx(r200.whiteWineBottles, r100.whiteWineBottles * 2, 2);
  approx(r200.redWineBottles, r100.redWineBottles * 2, 2);
});

test('totalGlasses = glassesPerPerson × guestCount (approx)', () => {
  const r = calculateWeddingDrinks(defaultArgs({ guestCount: 50 }));
  approx(r.totalGlasses, r.glassesPerPerson * r.guestCount, 5);
});

// ── Duration effects ──────────────────────────────────────────────────────

test('longer evening increases beer and wine', () => {
  const short = calculateWeddingDrinks(defaultArgs({ eveningHours: 2 }));
  const long  = calculateWeddingDrinks(defaultArgs({ eveningHours: 6 }));
  assert.ok(long.beerAndCiderCans > short.beerAndCiderCans);
  assert.ok(long.whiteWineBottles > short.whiteWineBottles);
});

test('zero evening hours reduces beer significantly', () => {
  const withEvening    = calculateWeddingDrinks(defaultArgs({ eveningHours: 4 }));
  const withoutEvening = calculateWeddingDrinks(defaultArgs({ eveningHours: 0 }));
  assert.ok(withoutEvening.beerAndCiderCans < withEvening.beerAndCiderCans);
});

// ── Validation ────────────────────────────────────────────────────────────

test('rejects guestCount of 0', () => {
  assert.throws(() => calculateWeddingDrinks(defaultArgs({ guestCount: 0 })), /guestCount/);
});

test('rejects guestCount of 1', () => {
  assert.throws(() => calculateWeddingDrinks(defaultArgs({ guestCount: 1 })), /guestCount/);
});

test('rejects negative preReceptionHours', () => {
  assert.throws(() => calculateWeddingDrinks(defaultArgs({ preReceptionHours: -1 })), /preReceptionHours/);
});
