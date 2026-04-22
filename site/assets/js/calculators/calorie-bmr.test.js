'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateCalorieBMR, bmrMifflinStJeor, ACTIVITY_LEVELS, GOALS } = require('./calorie-bmr.js');

// ─── Raw BMR formula ────────────────────────────────────────────────────────

test('BMR for 30-year-old male 80 kg 180 cm = 1780', () => {
  // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
  assert.equal(Math.round(bmrMifflinStJeor('male', 80, 180, 30)), 1780);
});

test('BMR for 25-year-old female 65 kg 165 cm = 1395', () => {
  // 10*65 + 6.25*165 - 5*25 - 161 = 650 + 1031.25 - 125 - 161 = 1395.25 → 1395
  assert.equal(Math.round(bmrMifflinStJeor('female', 65, 165, 25)), 1395);
});

// ─── TDEE calculation ───────────────────────────────────────────────────────

test('TDEE for sedentary male = BMR × 1.2', () => {
  const r = calculateCalorieBMR({
    sex: 'male', age: 30, weightKg: 80, heightCm: 180,
    activityLevel: 'sedentary', goal: 'maintain'
  });
  assert.equal(r.bmr, 1780);
  assert.equal(r.tdee, Math.round(1780 * 1.2)); // 2136
});

test('TDEE for moderately active female', () => {
  const r = calculateCalorieBMR({
    sex: 'female', age: 25, weightKg: 65, heightCm: 165,
    activityLevel: 'moderately_active', goal: 'maintain'
  });
  assert.equal(r.tdee, Math.round(1395 * 1.55)); // 2162
});

// ─── Goal adjustments ───────────────────────────────────────────────────────

test('lose goal reduces target by 500 kcal', () => {
  const r = calculateCalorieBMR({
    sex: 'male', age: 30, weightKg: 80, heightCm: 180,
    activityLevel: 'sedentary', goal: 'lose'
  });
  assert.equal(r.targetCalories, r.tdee - 500);
});

test('gain goal adds 250 kcal', () => {
  const r = calculateCalorieBMR({
    sex: 'male', age: 30, weightKg: 80, heightCm: 180,
    activityLevel: 'sedentary', goal: 'gain'
  });
  assert.equal(r.targetCalories, r.tdee + 250);
});

test('maintain goal has zero adjustment', () => {
  const r = calculateCalorieBMR({
    sex: 'male', age: 30, weightKg: 80, heightCm: 180,
    activityLevel: 'sedentary', goal: 'maintain'
  });
  assert.equal(r.targetCalories, r.tdee);
});

// ─── Safety floor ───────────────────────────────────────────────────────────

test('caps female lose_fast below 1200 kcal minimum', () => {
  // Very short/light female, sedentary, aggressive loss
  const r = calculateCalorieBMR({
    sex: 'female', age: 60, weightKg: 45, heightCm: 150,
    activityLevel: 'sedentary', goal: 'lose'
  });
  assert.ok(r.safeTargetCalories >= 1200);
  if (r.targetCalories < 1200) {
    assert.equal(r.cappedAtMinimum, true);
    assert.equal(r.safeTargetCalories, 1200);
  }
});

test('male minimum floor is 1500', () => {
  assert.equal(
    calculateCalorieBMR({
      sex: 'male', age: 30, weightKg: 80, heightCm: 180,
      activityLevel: 'sedentary', goal: 'maintain'
    }).minimumCalories, 1500
  );
});

// ─── Macros ─────────────────────────────────────────────────────────────────

test('macros sum to roughly target calories', () => {
  const r = calculateCalorieBMR({
    sex: 'male', age: 30, weightKg: 80, heightCm: 180,
    activityLevel: 'moderately_active', goal: 'maintain'
  });
  const total = r.macros.proteinCals + r.macros.carbCals + r.macros.fatCals;
  // Rounding may cause ±2 kcal difference
  assert.ok(Math.abs(total - r.safeTargetCalories) <= 3);
});

test('protein grams = protein cals / 4', () => {
  const r = calculateCalorieBMR({
    sex: 'female', age: 25, weightKg: 65, heightCm: 165,
    activityLevel: 'lightly_active', goal: 'maintain'
  });
  assert.equal(r.macros.proteinG, Math.round(r.macros.proteinCals / 4));
});

// ─── Weeks to goal ──────────────────────────────────────────────────────────

test('weeksToGoal is null for maintain', () => {
  const r = calculateCalorieBMR({
    sex: 'male', age: 30, weightKg: 80, heightCm: 180,
    activityLevel: 'sedentary', goal: 'maintain', weightGoalKg: 5
  });
  assert.equal(r.weeksToGoal, null);
});

test('weeksToGoal calculated for lose goal with 10 kg target', () => {
  const r = calculateCalorieBMR({
    sex: 'male', age: 30, weightKg: 80, heightCm: 180,
    activityLevel: 'moderately_active', goal: 'lose', weightGoalKg: 10
  });
  // 10 kg / 0.45 kg/week ≈ 22 weeks
  assert.ok(r.weeksToGoal > 0);
  assert.equal(r.weeksToGoal, Math.round(10 / 0.45));
});

// ─── Validation ─────────────────────────────────────────────────────────────

test('throws on invalid sex', () => {
  assert.throws(() => calculateCalorieBMR({
    sex: 'other', age: 30, weightKg: 80, heightCm: 180,
    activityLevel: 'sedentary', goal: 'maintain'
  }), /sex must be/);
});

test('throws on age out of range', () => {
  assert.throws(() => calculateCalorieBMR({
    sex: 'male', age: 10, weightKg: 80, heightCm: 180,
    activityLevel: 'sedentary', goal: 'maintain'
  }), /age must be/);
});

test('throws on invalid activity level', () => {
  assert.throws(() => calculateCalorieBMR({
    sex: 'male', age: 30, weightKg: 80, heightCm: 180,
    activityLevel: 'olympic_athlete', goal: 'maintain'
  }), /invalid activityLevel/);
});
