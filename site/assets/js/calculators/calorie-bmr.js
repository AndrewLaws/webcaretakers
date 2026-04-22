'use strict';

// Mifflin-St Jeor equation for BMR, Harris-Benedict activity multipliers

var ACTIVITY_LEVELS = {
  sedentary:         { label: 'Sedentary (little or no exercise)',          multiplier: 1.2   },
  lightly_active:    { label: 'Lightly active (1-3 days/week)',             multiplier: 1.375 },
  moderately_active: { label: 'Moderately active (3-5 days/week)',          multiplier: 1.55  },
  very_active:       { label: 'Very active (hard exercise 6-7 days/week)',  multiplier: 1.725 },
  extra_active:      { label: 'Extra active (physical job + daily exercise)',multiplier: 1.9   }
};

var GOALS = {
  lose_slow: { label: 'Lose weight gradually (~0.25 kg/week)',   adjustment: -250, kgPerWeek: -0.23 },
  lose:      { label: 'Lose weight steadily (~0.5 kg/week)',     adjustment: -500, kgPerWeek: -0.45 },
  maintain:  { label: 'Maintain weight',                          adjustment:    0, kgPerWeek:  0    },
  gain:      { label: 'Gain weight gradually (~0.25 kg/week)',   adjustment:  250, kgPerWeek:  0.23 },
  gain_fast: { label: 'Gain weight faster (~0.5 kg/week)',       adjustment:  500, kgPerWeek:  0.45 }
};

// Rough calorie minimum to avoid health risks
var MIN_CALORIES = { male: 1500, female: 1200 };

function r0(n) { return Math.round(n); }

function bmrMifflinStJeor(sex, weightKg, heightCm, age) {
  // Male:   10W + 6.25H - 5A + 5
  // Female: 10W + 6.25H - 5A - 161
  var base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return sex === 'male' ? base + 5 : base - 161;
}

function calculateCalorieBMR(opts) {
  if (!opts || typeof opts !== 'object') throw new Error('opts is required');

  var sex           = opts.sex;            // 'male' | 'female'
  var age           = Number(opts.age);
  var weightKg      = Number(opts.weightKg);
  var heightCm      = Number(opts.heightCm);
  var activityLevel = opts.activityLevel;
  var goal          = opts.goal;

  if (sex !== 'male' && sex !== 'female') {
    throw new Error('sex must be "male" or "female"');
  }
  if (!isFinite(age) || age < 15 || age > 120) {
    throw new Error('age must be between 15 and 120');
  }
  if (!isFinite(weightKg) || weightKg < 20 || weightKg > 300) {
    throw new Error('weightKg must be between 20 and 300');
  }
  if (!isFinite(heightCm) || heightCm < 100 || heightCm > 250) {
    throw new Error('heightCm must be between 100 and 250');
  }
  if (!ACTIVITY_LEVELS[activityLevel]) {
    throw new Error('invalid activityLevel: ' + activityLevel);
  }
  if (!GOALS[goal]) {
    throw new Error('invalid goal: ' + goal);
  }

  var bmr        = r0(bmrMifflinStJeor(sex, weightKg, heightCm, age));
  var multiplier = ACTIVITY_LEVELS[activityLevel].multiplier;
  var tdee       = r0(bmr * multiplier);

  var goalData        = GOALS[goal];
  var targetCalories  = tdee + goalData.adjustment;
  var minCalories     = MIN_CALORIES[sex];
  var safeTarget      = Math.max(targetCalories, minCalories);
  var cappedAtMinimum = safeTarget !== targetCalories;

  // Rough macros: 30 % protein, 40 % carbs, 30 % fat
  var proteinCals = r0(safeTarget * 0.30);
  var carbCals    = r0(safeTarget * 0.40);
  var fatCals     = r0(safeTarget * 0.30);

  // Time to reach a weight-change target (optional)
  var weeksToGoal = null;
  if (opts.weightGoalKg != null && goalData.kgPerWeek !== 0) {
    var changeKg = Math.abs(Number(opts.weightGoalKg));
    if (isFinite(changeKg) && changeKg > 0) {
      weeksToGoal = r0(changeKg / Math.abs(goalData.kgPerWeek));
    }
  }

  return {
    sex:              sex,
    age:              age,
    weightKg:         weightKg,
    heightCm:         heightCm,
    activityLevel:    activityLevel,
    activityLabel:    ACTIVITY_LEVELS[activityLevel].label,
    goal:             goal,
    goalLabel:        goalData.label,
    bmr:              bmr,
    tdee:             tdee,
    targetCalories:   targetCalories,
    safeTargetCalories: safeTarget,
    cappedAtMinimum:  cappedAtMinimum,
    minimumCalories:  minCalories,
    macros: {
      proteinCals: proteinCals,
      proteinG:    r0(proteinCals / 4),
      carbCals:    carbCals,
      carbG:       r0(carbCals   / 4),
      fatCals:     fatCals,
      fatG:        r0(fatCals    / 9)
    },
    weeklyRateKg: goalData.kgPerWeek,
    weeksToGoal:  weeksToGoal
  };
}

if (typeof module !== 'undefined') {
  module.exports = { calculateCalorieBMR, bmrMifflinStJeor, ACTIVITY_LEVELS, GOALS };
}
if (typeof window !== 'undefined') {
  window.CalorieBMR = { calculateCalorieBMR, ACTIVITY_LEVELS, GOALS };
}
