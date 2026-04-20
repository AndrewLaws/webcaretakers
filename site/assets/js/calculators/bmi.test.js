const { test } = require('node:test');
const assert = require('node:assert/strict');

const { calculateBMI, classifyBMI } = require('./bmi');

// --- Metric ---

test('metric: 70 kg at 1.75 m → BMI 22.9 (normal)', () => {
  const r = calculateBMI({ units: 'metric', weightKg: 70, heightM: 1.75 });
  assert.equal(r.bmi, 22.9);
  assert.equal(r.category, 'Normal');
});

test('metric: 50 kg at 1.75 m → underweight', () => {
  const r = calculateBMI({ units: 'metric', weightKg: 50, heightM: 1.75 });
  assert.equal(r.category, 'Underweight');
});

test('metric: 85 kg at 1.75 m → overweight', () => {
  const r = calculateBMI({ units: 'metric', weightKg: 85, heightM: 1.75 });
  assert.equal(r.category, 'Overweight');
});

test('metric: 100 kg at 1.75 m → obese', () => {
  const r = calculateBMI({ units: 'metric', weightKg: 100, heightM: 1.75 });
  assert.equal(r.category, 'Obese');
});

// --- Imperial ---

test('imperial: 154 lb at 69 in → ~22.7 (normal)', () => {
  const r = calculateBMI({ units: 'imperial', weightLb: 154, heightIn: 69 });
  // 154 * 703 / 69^2 = 22.74...
  assert.ok(r.bmi >= 22.7 && r.bmi <= 22.8, `expected ~22.7 got ${r.bmi}`);
  assert.equal(r.category, 'Normal');
});

test('imperial: supports feet+inches input via heightIn total', () => {
  // 5ft 9in = 69in. 200 lb. BMI = 200 * 703 / 69^2 = 29.54 → overweight
  const r = calculateBMI({ units: 'imperial', weightLb: 200, heightIn: 69 });
  assert.ok(r.bmi >= 29.5 && r.bmi <= 29.6, `expected ~29.5 got ${r.bmi}`);
  assert.equal(r.category, 'Overweight');
});

// --- Category boundaries (WHO cut-offs) ---

test('classifyBMI boundary values', () => {
  assert.equal(classifyBMI(18.4), 'Underweight');
  assert.equal(classifyBMI(18.5), 'Normal');
  assert.equal(classifyBMI(24.9), 'Normal');
  assert.equal(classifyBMI(25.0), 'Overweight');
  assert.equal(classifyBMI(29.9), 'Overweight');
  assert.equal(classifyBMI(30.0), 'Obese');
  assert.equal(classifyBMI(45.0), 'Obese');
});

// --- Input validation ---

test('throws on zero or negative weight', () => {
  assert.throws(() => calculateBMI({ units: 'metric', weightKg: 0, heightM: 1.75 }));
  assert.throws(() => calculateBMI({ units: 'metric', weightKg: -10, heightM: 1.75 }));
});

test('throws on zero or negative height', () => {
  assert.throws(() => calculateBMI({ units: 'metric', weightKg: 70, heightM: 0 }));
  assert.throws(() => calculateBMI({ units: 'imperial', weightLb: 150, heightIn: -10 }));
});

test('throws on unknown units', () => {
  assert.throws(() => calculateBMI({ units: 'furlongs', weightKg: 70, heightM: 1.75 }));
});

test('throws when required fields missing', () => {
  assert.throws(() => calculateBMI({ units: 'metric', weightKg: 70 }));
  assert.throws(() => calculateBMI({ units: 'imperial', weightLb: 150 }));
});

// --- Rounding ---

test('BMI rounds to one decimal place', () => {
  const r = calculateBMI({ units: 'metric', weightKg: 70, heightM: 1.7 });
  // 70 / 2.89 = 24.2214... → 24.2
  assert.equal(r.bmi, 24.2);
});
