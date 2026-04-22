'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateWeddingCatering } = require('./wedding-catering.js');

test('returns all expected top-level keys', () => {
  const r = calculateWeddingCatering({ guestCount: 80 });
  for (const k of ['guestCount','eveningGuests','totalEveningGuests','mealStyle','courses','canapes','weddingBreakfast','eveningFood','teaAndCoffee']) {
    assert.ok(k in r, `missing key: ${k}`);
  }
});

test('3-course formal: 80 starter, 80 main, 80 dessert portions', () => {
  const r = calculateWeddingCatering({ guestCount: 80, mealStyle: 'formal', courses: 3 });
  assert.equal(r.weddingBreakfast.starterPortions, 80);
  assert.equal(r.weddingBreakfast.mainPortions, 80);
  assert.equal(r.weddingBreakfast.dessertPortions, 80);
});

test('2-course formal: 0 starters, 80 main, 80 dessert', () => {
  const r = calculateWeddingCatering({ guestCount: 80, mealStyle: 'formal', courses: 2 });
  assert.equal(r.weddingBreakfast.starterPortions, 0);
  assert.equal(r.weddingBreakfast.mainPortions, 80);
  assert.equal(r.weddingBreakfast.dessertPortions, 80);
});

test('canapes: 80 guests × 6 pieces = 480 total pieces', () => {
  const r = calculateWeddingCatering({ guestCount: 80, includeCanapes: true });
  assert.equal(r.canapes.totalPieces, 480);
});

test('canapes excluded when includeCanapes is false', () => {
  const r = calculateWeddingCatering({ guestCount: 80, includeCanapes: false });
  assert.equal(r.canapes.totalPieces, 0);
  assert.equal(r.canapes.approximateWeightKg, 0);
});

test('evening food covers day + evening guests', () => {
  const r = calculateWeddingCatering({ guestCount: 80, eveningGuests: 40 });
  assert.equal(r.totalEveningGuests, 120);
  assert.equal(r.eveningFood.portions, 120);
});

test('main protein weight: 80 guests × 200g = 16kg', () => {
  const r = calculateWeddingCatering({ guestCount: 80 });
  assert.equal(r.weddingBreakfast.mainProteinKg, 16);
});

test('tea and coffee servings equals day guest count', () => {
  const r = calculateWeddingCatering({ guestCount: 80, eveningGuests: 30 });
  assert.equal(r.teaAndCoffee.servings, 80);
});

test('buffet style returns portions and totalWeightKg', () => {
  const r = calculateWeddingCatering({ guestCount: 80, mealStyle: 'buffet' });
  assert.equal(r.weddingBreakfast.style, 'buffet');
  assert.equal(r.weddingBreakfast.portions, 80);
  assert.ok(r.weddingBreakfast.totalWeightKg > 0);
  // courses should be null for buffet
  assert.equal(r.courses, null);
});

test('buffet total weight: 80 guests × 500g = 40kg', () => {
  const r = calculateWeddingCatering({ guestCount: 80, mealStyle: 'buffet' });
  assert.equal(r.weddingBreakfast.totalWeightKg, 40);
});

test('all weight values are positive numbers', () => {
  const r = calculateWeddingCatering({ guestCount: 80 });
  assert.ok(r.canapes.approximateWeightKg > 0);
  assert.ok(r.weddingBreakfast.mainProteinKg > 0);
  assert.ok(r.eveningFood.approximateWeightKg > 0);
});

test('custom canapesPerPerson is respected', () => {
  const r = calculateWeddingCatering({ guestCount: 80, canapesPerPerson: 10 });
  assert.equal(r.canapes.totalPieces, 800);
  assert.equal(r.canapes.piecesPerPerson, 10);
});

test('throws if guestCount < 2', () => {
  assert.throws(() => calculateWeddingCatering({ guestCount: 1 }), /guestCount/);
});

test('throws if eveningGuests < 0', () => {
  assert.throws(() => calculateWeddingCatering({ guestCount: 80, eveningGuests: -1 }), /eveningGuests/);
});

test('throws if mealStyle is invalid', () => {
  assert.throws(() => calculateWeddingCatering({ guestCount: 80, mealStyle: 'tasting' }), /mealStyle/);
});

test('throws if courses is not 2 or 3 for formal', () => {
  assert.throws(() => calculateWeddingCatering({ guestCount: 80, mealStyle: 'formal', courses: 4 }), /courses/);
});
