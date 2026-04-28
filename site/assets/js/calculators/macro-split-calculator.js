'use strict';

// Macro Split Calculator
// Splits a daily calorie target across protein, carbs and fat using a goal
// preset or a custom ratio. Calorie factors: protein 4 kcal/g, carbs 4 kcal/g,
// fat 9 kcal/g (Atwater values).

var KCAL_PER_GRAM = {
  protein: 4,
  carbs:   4,
  fat:     9
};

var PRESETS = {
  balanced:         { label: 'Standard balanced',     protein: 30, carbs: 40, fat: 30 },
  high_protein_cut: { label: 'High-protein cut',      protein: 40, carbs: 35, fat: 25 },
  endurance:        { label: 'Endurance',             protein: 20, carbs: 60, fat: 20 },
  keto:             { label: 'Keto',                  protein: 25, carbs:  5, fat: 70 }
  // 'custom' is handled separately and reads opts.custom
};

function r0(n) { return Math.round(n); }

function validateCustomRatio(custom) {
  if (!custom) return false;
  var p = Number(custom.protein);
  var c = Number(custom.carbs);
  var f = Number(custom.fat);
  if (![p, c, f].every(function (v) { return isFinite(v) && v >= 0 && v <= 100; })) return false;
  var sum = p + c + f;
  return Math.abs(sum - 100) <= 1;
}

// When the user moves one slider, scale the other two so the total stays at
// 100. If the other two are both zero, split the freed share evenly.
function redistributeRatio(current, changedKey, newValue) {
  var keys = ['protein', 'carbs', 'fat'];
  if (keys.indexOf(changedKey) === -1) throw new Error('changedKey must be protein, carbs or fat');

  newValue = Math.max(0, Math.min(100, Number(newValue) || 0));
  var others = keys.filter(function (k) { return k !== changedKey; });
  var remaining = 100 - newValue;
  var otherSum = Number(current[others[0]]) + Number(current[others[1]]);

  var out = {};
  out[changedKey] = newValue;

  if (otherSum <= 0) {
    out[others[0]] = remaining / 2;
    out[others[1]] = remaining / 2;
  } else {
    out[others[0]] = remaining * (Number(current[others[0]]) / otherSum);
    out[others[1]] = remaining * (Number(current[others[1]]) / otherSum);
  }

  // Round to whole percentages and absorb any rounding drift into the larger
  // of the two non-changed slices.
  out.protein = r0(out.protein);
  out.carbs   = r0(out.carbs);
  out.fat     = r0(out.fat);
  var drift = 100 - (out.protein + out.carbs + out.fat);
  if (drift !== 0) {
    var biggerOther = (Number(current[others[0]]) >= Number(current[others[1]])) ? others[0] : others[1];
    out[biggerOther] += drift;
  }
  return out;
}

function ratioFor(preset, custom) {
  if (preset === 'custom') {
    if (!validateCustomRatio(custom)) {
      throw new Error('custom ratio must sum to 100 (±1) and each value 0-100');
    }
    return { protein: Number(custom.protein), carbs: Number(custom.carbs), fat: Number(custom.fat) };
  }
  if (!PRESETS[preset]) throw new Error('unknown preset: ' + preset);
  var p = PRESETS[preset];
  return { protein: p.protein, carbs: p.carbs, fat: p.fat };
}

function calculateMacroSplit(opts) {
  if (!opts || typeof opts !== 'object') throw new Error('opts is required');

  var calories = Number(opts.calories);
  if (!isFinite(calories) || calories < 0 || calories > 10000) {
    throw new Error('calories must be between 0 and 10000');
  }

  var meals = opts.mealsPerDay == null ? 4 : Number(opts.mealsPerDay);
  if (!isFinite(meals) || meals < 1 || meals > 10 || meals !== Math.floor(meals)) {
    throw new Error('mealsPerDay must be a whole number between 1 and 10');
  }

  var ratio = ratioFor(opts.preset, opts.custom);

  var proteinKcal = r0(calories * (ratio.protein / 100));
  var carbsKcal   = r0(calories * (ratio.carbs   / 100));
  var fatKcal     = r0(calories * (ratio.fat     / 100));

  var proteinG = r0(proteinKcal / KCAL_PER_GRAM.protein);
  var carbsG   = r0(carbsKcal   / KCAL_PER_GRAM.carbs);
  var fatG     = r0(fatKcal     / KCAL_PER_GRAM.fat);

  return {
    calories:    calories,
    preset:      opts.preset,
    presetLabel: opts.preset === 'custom' ? 'Custom' : (PRESETS[opts.preset] && PRESETS[opts.preset].label),
    ratio:       ratio,
    macros: {
      protein: { percent: ratio.protein, kcal: proteinKcal, grams: proteinG },
      carbs:   { percent: ratio.carbs,   kcal: carbsKcal,   grams: carbsG   },
      fat:     { percent: ratio.fat,     kcal: fatKcal,     grams: fatG     }
    },
    mealsPerDay: meals,
    perMeal: {
      kcal:    r0(calories / meals),
      protein: { grams: r0(proteinG / meals) },
      carbs:   { grams: r0(carbsG   / meals) },
      fat:     { grams: r0(fatG     / meals) }
    }
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calculateMacroSplit: calculateMacroSplit,
    validateCustomRatio: validateCustomRatio,
    redistributeRatio:   redistributeRatio,
    PRESETS:             PRESETS,
    KCAL_PER_GRAM:       KCAL_PER_GRAM
  };
}
if (typeof window !== 'undefined') {
  window.MacroSplit = {
    calculateMacroSplit: calculateMacroSplit,
    validateCustomRatio: validateCustomRatio,
    redistributeRatio:   redistributeRatio,
    PRESETS:             PRESETS,
    KCAL_PER_GRAM:       KCAL_PER_GRAM
  };
}
