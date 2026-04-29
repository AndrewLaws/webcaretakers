'use strict';

// Common race distances in metres
var RACE_DISTANCES = {
  '5k':         { label: '5K',           metres: 5000 },
  '10k':        { label: '10K',          metres: 10000 },
  'half':       { label: 'Half Marathon', metres: 21097.5 },
  'marathon':   { label: 'Marathon',     metres: 42195 },
};

/**
 * Parse a time string "H:MM:SS" or "MM:SS" into total seconds.
 * Returns NaN if the format is invalid.
 */
function parseTime(str) {
  if (typeof str !== 'string') return NaN;
  var parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return NaN;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return NaN;
}

/**
 * Format total seconds as "H:MM:SS" or "M:SS" if < 1 hour.
 */
function formatTime(seconds) {
  var s = Math.round(seconds);
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  if (h > 0) {
    return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }
  return m + ':' + String(sec).padStart(2, '0');
}

/**
 * Format a pace in seconds/km as "M:SS /km".
 */
function formatPace(secsPerKm) {
  var m   = Math.floor(secsPerKm / 60);
  var sec = Math.round(secsPerKm % 60);
  if (sec === 60) { m++; sec = 0; }
  return m + ':' + String(sec).padStart(2, '0');
}

/**
 * Calculate any one of {pace, distance, time} from the other two.
 *
 * Inputs — provide exactly two of:
 * @param {number|null} opts.paceSecsPerKm  - Pace in seconds per km
 * @param {number|null} opts.distanceKm     - Distance in kilometres
 * @param {number|null} opts.timeSecs       - Total time in seconds
 *
 * All three may be provided; if so, pace is recalculated from time and distance.
 */
function calculateRunningPace({ paceSecsPerKm, distanceKm, timeSecs }) {
  var hasPace     = paceSecsPerKm != null && !isNaN(paceSecsPerKm);
  var hasDistance = distanceKm    != null && !isNaN(distanceKm);
  var hasTime     = timeSecs      != null && !isNaN(timeSecs);

  // Validate provided values
  if (hasPace     && paceSecsPerKm <= 0)  throw new Error('pace must be positive');
  if (hasDistance && distanceKm <= 0)     throw new Error('distance must be positive');
  if (hasTime     && timeSecs <= 0)       throw new Error('time must be positive');

  var pace, distance, time;

  if (hasDistance && hasTime) {
    // Calculate pace from distance and time
    distance = distanceKm;
    time     = timeSecs;
    pace     = time / distance;
  } else if (hasPace && hasTime) {
    // Calculate distance from pace and time
    pace     = paceSecsPerKm;
    time     = timeSecs;
    distance = time / pace;
  } else if (hasPace && hasDistance) {
    // Calculate time from pace and distance
    pace     = paceSecsPerKm;
    distance = distanceKm;
    time     = pace * distance;
  } else {
    throw new Error('Provide exactly two of: pace, distance, time');
  }

  // Pace per mile (1 mile = 1.60934 km)
  var pacePerMile = pace * 1.60934;
  // Speed in km/h
  var speedKmh = 3600 / pace;
  // Speed in mph
  var speedMph = speedKmh / 1.60934;

  // Race time predictions based on calculated pace
  var predictions = {};
  Object.keys(RACE_DISTANCES).forEach(function (key) {
    var d = RACE_DISTANCES[key];
    var distKm   = d.metres / 1000;
    var raceSecs = pace * distKm;
    predictions[key] = {
      label:   d.label,
      metres:  d.metres,
      distKm:  Math.round(distKm * 100) / 100,
      timeSecs: Math.round(raceSecs),
      timeFormatted: formatTime(raceSecs),
    };
  });

  return {
    paceSecsPerKm:  Math.round(pace * 10) / 10,
    distanceKm:     Math.round(distance * 1000) / 1000,
    timeSecs:       Math.round(time),
    paceFormatted:      formatPace(pace),       // "M:SS /km"
    pacePerMileFormatted: formatPace(pacePerMile), // "M:SS /mi"
    timeFormatted:      formatTime(time),
    speedKmh:       Math.round(speedKmh * 100) / 100,
    speedMph:       Math.round(speedMph * 100) / 100,
    predictions,
  };
}

// --- Riegel race-prediction helpers (with race conditions and training factors) ---

// Base Riegel exponent by sex assigned at birth.
// Women fade less than men over the half-to-marathon stretch, so the female
// exponent is slightly lower (faster relative falloff). 1.05 is the classic
// neutral default.
function kBaseForSex(sex) {
  if (sex === 'male') return 1.06;
  if (sex === 'female') return 1.04;
  return 1.05;
}

// Weekly training mileage modifier added to k_base. Higher mileage runners
// hold pace better at marathon distance, so their effective exponent drops.
// Only applies when predicting marathon-ish distances (≥ 21 km in the caller).
function mileageModifier(weeklyKm) {
  if (!isFinite(weeklyKm) || weeklyKm < 0) return 0;
  if (weeklyKm <= 16) return 0.06;
  if (weeklyKm <= 32) return 0.04;
  if (weeklyKm <= 48) return 0.02;
  if (weeklyKm <= 64) return 0.01;
  if (weeklyKm <= 96) return 0;
  if (weeklyKm <= 128) return -0.005;
  return -0.01;
}

// Heat penalty in seconds per kilometre added to predicted pace.
// Threshold: race needs to be more than 5°C above training to incur penalty.
// Then 45 s/km per additional 5°C, capped at 180 s/km.
function heatPenaltyPerKm(trainingTempC, raceTempC) {
  var rawDelta = (raceTempC - trainingTempC) - 5;
  var delta = rawDelta > 0 ? rawDelta : 0;
  var penalty = (delta / 5) * 45;
  if (penalty > 180) penalty = 180;
  return penalty;
}

// Course distance multiplier by race size. Big-city marathons (London, Berlin,
// NYC) commonly clock 26.5 to 27 miles on a runner's GPS because the optimal
// racing line is impossible to hold in a crowd of 30,000+.
function raceSizeMultiplier(size) {
  switch (size) {
    case 'small':  return 1.000;
    case 'large':  return 1.008;
    case 'major':  return 1.015;
    case 'medium':
    default:       return 1.003;
  }
}

/**
 * Predict a race time using Riegel with optional condition adjustments.
 *
 * Returns both the basic prediction (no adjustments) and the adjusted one,
 * plus a breakdown of each factor's contribution in seconds.
 */
function predictRace(opts) {
  var knownDistanceKm  = opts.knownDistanceKm;
  var knownTimeSecs    = opts.knownTimeSecs;
  var targetDistanceKm = opts.targetDistanceKm;
  var sex              = opts.sex || 'prefer-not-to-say';
  var weeklyMileageKm  = opts.weeklyMileageKm != null ? opts.weeklyMileageKm : 40;
  var trainingTempC    = opts.trainingTempC != null ? opts.trainingTempC : 15;
  var raceTempC        = opts.raceTempC != null ? opts.raceTempC : 15;
  var raceSize         = opts.raceSize || 'medium';

  // Basic Riegel: neutral k = 1.06 (the classic published value).
  var basicSecs = knownTimeSecs * Math.pow(targetDistanceKm / knownDistanceKm, 1.06);

  // Adjusted: k_base by sex, plus mileage modifier when target ≥ 21 km.
  var kBase     = kBaseForSex(sex);
  var mileageMod = targetDistanceKm >= 21 ? mileageModifier(weeklyMileageKm) : 0;
  var kTotal    = kBase + mileageMod;

  var sizeMult         = raceSizeMultiplier(raceSize);
  var effectiveDistKm  = targetDistanceKm * sizeMult;

  var riegelSecs = knownTimeSecs * Math.pow(effectiveDistKm / knownDistanceKm, kTotal);

  var heatPerKm  = heatPenaltyPerKm(trainingTempC, raceTempC);
  var heatSecs   = heatPerKm * effectiveDistKm;

  var adjustedSecs = riegelSecs + heatSecs;

  // Baseline for the breakdown's sex-attribution: same maths but with k_base = 1.05
  // (neutral) and no mileage modifier, no heat, no size. This isolates each effect.
  var neutralRiegelSecs = knownTimeSecs * Math.pow(targetDistanceKm / knownDistanceKm, 1.05);

  // Sex contribution: difference between using kBase and using 1.05 (no mileage, no size, no heat).
  var sexOnlySecs = knownTimeSecs * Math.pow(targetDistanceKm / knownDistanceKm, kBase);
  var sexDeltaSecs = sexOnlySecs - neutralRiegelSecs;

  // Mileage contribution: kBase + mileageMod vs kBase alone (target distance, no size, no heat).
  var mileageDeltaSecs = (knownTimeSecs * Math.pow(targetDistanceKm / knownDistanceKm, kTotal)) - sexOnlySecs;

  // Race size contribution: kTotal at effective distance vs kTotal at target distance.
  var sizeDeltaSecs = riegelSecs - (knownTimeSecs * Math.pow(targetDistanceKm / knownDistanceKm, kTotal));

  // Added course metres
  var addedMetres = (effectiveDistKm - targetDistanceKm) * 1000;

  return {
    basicSecs:           Math.round(basicSecs),
    adjustedSecs:        Math.round(adjustedSecs),
    kBase:               kBase,
    kTotal:              Math.round(kTotal * 1000) / 1000,
    mileageMod:          mileageMod,
    sizeMult:            sizeMult,
    effectiveDistanceKm: Math.round(effectiveDistKm * 1000) / 1000,
    addedMetres:         Math.round(addedMetres),
    heatPenaltyPerKm:    Math.round(heatPerKm * 10) / 10,
    heatTotalSecs:       Math.round(heatSecs),
    heatDeltaC:          Math.max(0, (raceTempC - trainingTempC) - 5),
    breakdown: {
      sexDeltaSecs:     Math.round(sexDeltaSecs),
      mileageDeltaSecs: Math.round(mileageDeltaSecs),
      sizeDeltaSecs:    Math.round(sizeDeltaSecs),
      heatDeltaSecs:    Math.round(heatSecs),
    },
  };
}

var _exports = {
  calculateRunningPace,
  parseTime,
  formatTime,
  formatPace,
  RACE_DISTANCES,
  kBaseForSex,
  mileageModifier,
  heatPenaltyPerKm,
  raceSizeMultiplier,
  predictRace,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  window.RunningPace = _exports;
}
