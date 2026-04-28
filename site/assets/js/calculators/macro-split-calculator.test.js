'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const {
  calculateMacroSplit,
  PRESETS,
  KCAL_PER_GRAM,
  validateCustomRatio,
  redistributeRatio
} = require('./macro-split-calculator.js');

// ─── Calorie-per-gram constants ─────────────────────────────────────────────

test('kcal-per-gram constants are protein 4, carbs 4, fat 9', () => {
  assert.equal(KCAL_PER_GRAM.protein, 4);
  assert.equal(KCAL_PER_GRAM.carbs,   4);
  assert.equal(KCAL_PER_GRAM.fat,     9);
});

// ─── Standard balanced preset, 2000 kcal ────────────────────────────────────

test('balanced preset for 2000 kcal returns 150g P / 200g C / 67g F', () => {
  const r = calculateMacroSplit({ calories: 2000, preset: 'balanced' });
  assert.equal(r.macros.protein.grams, 150); // 30% × 2000 = 600 kcal / 4 = 150g
  assert.equal(r.macros.carbs.grams,   200); // 40% × 2000 = 800 kcal / 4 = 200g
  assert.equal(r.macros.fat.grams,      67); // 30% × 2000 = 600 kcal / 9 = 66.67 → 67g
});

test('balanced preset for 2000 kcal returns correct kcal per macro', () => {
  const r = calculateMacroSplit({ calories: 2000, preset: 'balanced' });
  assert.equal(r.macros.protein.kcal, 600);
  assert.equal(r.macros.carbs.kcal,   800);
  assert.equal(r.macros.fat.kcal,     600);
});

// ─── Other presets sanity-check ─────────────────────────────────────────────

test('keto preset has 70% fat', () => {
  assert.equal(PRESETS.keto.fat, 70);
  const r = calculateMacroSplit({ calories: 2000, preset: 'keto' });
  // 70% × 2000 = 1400 kcal / 9 = 155.56 → 156g
  assert.equal(r.macros.fat.grams, 156);
});

test('high-protein cut preset has 40% protein', () => {
  assert.equal(PRESETS.high_protein_cut.protein, 40);
});

test('endurance preset has 60% carbs', () => {
  assert.equal(PRESETS.endurance.carbs, 60);
});

// ─── Custom ratio validation ────────────────────────────────────────────────

test('custom ratio summing to 100 validates', () => {
  assert.equal(validateCustomRatio({ protein: 35, carbs: 40, fat: 25 }), true);
});

test('custom ratio summing to 99 validates (within ±1 tolerance)', () => {
  assert.equal(validateCustomRatio({ protein: 33, carbs: 33, fat: 33 }), true);
});

test('custom ratio summing to 90 fails validation', () => {
  assert.equal(validateCustomRatio({ protein: 30, carbs: 30, fat: 30 }), false);
});

test('custom ratio summing to 110 fails validation', () => {
  assert.equal(validateCustomRatio({ protein: 50, carbs: 40, fat: 20 }), false);
});

test('throws when custom ratio does not sum to 100 ±1', () => {
  assert.throws(() => calculateMacroSplit({
    calories: 2000,
    preset: 'custom',
    custom: { protein: 30, carbs: 30, fat: 30 }
  }), /sum to 100/);
});

// ─── Custom ratio redistribution ────────────────────────────────────────────

test('redistributeRatio adjusts the other two pro-rata when one slider moves', () => {
  // Starting from 30/40/30, move protein to 50.
  // Carbs+fat must absorb the extra 20% pro-rata: carbs was 40/70, fat was 30/70.
  const r = redistributeRatio({ protein: 30, carbs: 40, fat: 30 }, 'protein', 50);
  assert.equal(r.protein, 50);
  assert.equal(r.protein + r.carbs + r.fat, 100);
  // carbs should still be larger than fat after redistribution
  assert.ok(r.carbs > r.fat);
});

test('redistributeRatio handles edge case where the other two are both zero', () => {
  // If protein is 100 and we drop it to 50, carbs and fat were both 0.
  // Split the freed 50 evenly.
  const r = redistributeRatio({ protein: 100, carbs: 0, fat: 0 }, 'protein', 50);
  assert.equal(r.protein, 50);
  assert.equal(r.protein + r.carbs + r.fat, 100);
  assert.equal(r.carbs, 25);
  assert.equal(r.fat,   25);
});

// ─── Per-meal breakdown ─────────────────────────────────────────────────────

test('per-meal divides correctly for 4 meals on balanced 2000 kcal', () => {
  const r = calculateMacroSplit({ calories: 2000, preset: 'balanced', mealsPerDay: 4 });
  assert.equal(r.perMeal.protein.grams, Math.round(150 / 4)); // 38
  assert.equal(r.perMeal.carbs.grams,   Math.round(200 / 4)); // 50
  assert.equal(r.perMeal.fat.grams,     Math.round( 67 / 4)); // 17
  assert.equal(r.perMeal.kcal,          Math.round(2000 / 4)); // 500
  assert.equal(r.mealsPerDay, 4);
});

test('per-meal defaults to 4 meals/day', () => {
  const r = calculateMacroSplit({ calories: 2000, preset: 'balanced' });
  assert.equal(r.mealsPerDay, 4);
});

test('per-meal handles 3 meals/day', () => {
  const r = calculateMacroSplit({ calories: 1800, preset: 'balanced', mealsPerDay: 3 });
  assert.equal(r.mealsPerDay, 3);
  assert.equal(r.perMeal.kcal, 600);
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

test('zero calories returns 0g of everything', () => {
  const r = calculateMacroSplit({ calories: 0, preset: 'balanced' });
  assert.equal(r.macros.protein.grams, 0);
  assert.equal(r.macros.carbs.grams,   0);
  assert.equal(r.macros.fat.grams,     0);
  assert.equal(r.macros.protein.kcal,  0);
  assert.equal(r.macros.carbs.kcal,    0);
  assert.equal(r.macros.fat.kcal,      0);
});

test('throws on negative calories', () => {
  assert.throws(() => calculateMacroSplit({ calories: -100, preset: 'balanced' }),
    /calories/);
});

test('throws on absurdly high calories', () => {
  assert.throws(() => calculateMacroSplit({ calories: 100000, preset: 'balanced' }),
    /calories/);
});

test('throws on unknown preset', () => {
  assert.throws(() => calculateMacroSplit({ calories: 2000, preset: 'paleolithic' }),
    /preset/);
});

test('throws on invalid mealsPerDay', () => {
  assert.throws(() => calculateMacroSplit({ calories: 2000, preset: 'balanced', mealsPerDay: 0 }),
    /meals/);
  assert.throws(() => calculateMacroSplit({ calories: 2000, preset: 'balanced', mealsPerDay: 15 }),
    /meals/);
});

// ─── Custom calculation ────────────────────────────────────────────────────

test('custom 40/40/20 split for 2500 kcal', () => {
  const r = calculateMacroSplit({
    calories: 2500,
    preset: 'custom',
    custom: { protein: 40, carbs: 40, fat: 20 }
  });
  assert.equal(r.macros.protein.kcal, 1000);
  assert.equal(r.macros.carbs.kcal,   1000);
  assert.equal(r.macros.fat.kcal,      500);
  assert.equal(r.macros.protein.grams, 250); // 1000/4
  assert.equal(r.macros.carbs.grams,   250);
  assert.equal(r.macros.fat.grams,      56); // 500/9 = 55.56 → 56
});
