'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const {
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
} = require('./running-pace.js');

// --- parseTime ---

test('parseTime: "5:30" → 330 seconds', () => {
  assert.equal(parseTime('5:30'), 330);
});

test('parseTime: "1:05:30" → 3930 seconds', () => {
  assert.equal(parseTime('1:05:30'), 3930);
});

test('parseTime: "0:45" → 45 seconds', () => {
  assert.equal(parseTime('0:45'), 45);
});

test('parseTime: invalid string → NaN', () => {
  assert.ok(isNaN(parseTime('abc')));
  assert.ok(isNaN(parseTime('')));
  assert.ok(isNaN(parseTime('5')));
});

// --- formatTime ---

test('formatTime: 330s → "5:30"', () => {
  assert.equal(formatTime(330), '5:30');
});

test('formatTime: 3930s → "1:05:30"', () => {
  assert.equal(formatTime(3930), '1:05:30');
});

test('formatTime: 600s → "10:00"', () => {
  assert.equal(formatTime(600), '10:00');
});

test('formatTime: 3600s → "1:00:00"', () => {
  assert.equal(formatTime(3600), '1:00:00');
});

// --- formatPace ---

test('formatPace: 330 s/km → "5:30"', () => {
  assert.equal(formatPace(330), '5:30');
});

test('formatPace: 360 s/km → "6:00"', () => {
  assert.equal(formatPace(360), '6:00');
});

// --- calculateRunningPace: find pace from distance + time ---

test('pace from 5km in 25:00 → 5:00 /km', () => {
  const r = calculateRunningPace({ distanceKm: 5, timeSecs: 25 * 60 });
  assert.equal(r.paceFormatted, '5:00');
  assert.equal(r.timeSecs, 1500);
  assert.ok(Math.abs(r.distanceKm - 5) < 0.01);
});

test('pace from 10km in 50:00 → 5:00 /km', () => {
  const r = calculateRunningPace({ distanceKm: 10, timeSecs: 50 * 60 });
  assert.equal(r.paceFormatted, '5:00');
});

test('pace from half marathon (21.0975km) in 1:45:00', () => {
  const r = calculateRunningPace({ distanceKm: 21.0975, timeSecs: 105 * 60 });
  // pace = 6300 / 21.0975 ≈ 298.6 s/km ≈ 4:59
  assert.ok(r.paceSecsPerKm > 295 && r.paceSecsPerKm < 305);
});

// --- calculateRunningPace: find time from pace + distance ---

test('time from 5:00 /km pace over 10km → 50:00', () => {
  const r = calculateRunningPace({ paceSecsPerKm: 300, distanceKm: 10 });
  assert.equal(r.timeFormatted, '50:00');
  assert.equal(r.timeSecs, 3000);
});

test('time from 6:00 /km over 42.195km (marathon)', () => {
  const r = calculateRunningPace({ paceSecsPerKm: 360, distanceKm: 42.195 });
  // 360 × 42.195 = 15190.2 → 4:13:10
  assert.ok(r.timeSecs > 15000 && r.timeSecs < 15300);
  assert.ok(r.timeFormatted.startsWith('4:'));
});

// --- calculateRunningPace: find distance from pace + time ---

test('distance from 5:00 /km in 25:00 → 5km', () => {
  const r = calculateRunningPace({ paceSecsPerKm: 300, timeSecs: 25 * 60 });
  assert.ok(Math.abs(r.distanceKm - 5) < 0.01);
});

// --- Speed conversions ---

test('5:00 /km pace → 12 km/h', () => {
  const r = calculateRunningPace({ paceSecsPerKm: 300, distanceKm: 5 });
  assert.equal(r.speedKmh, 12);
});

test('speedKmh and speedMph are consistent (×1.60934)', () => {
  const r = calculateRunningPace({ paceSecsPerKm: 360, distanceKm: 10 });
  assert.ok(Math.abs(r.speedKmh / r.speedMph - 1.60934) < 0.01);
});

// --- Race predictions ---

test('predictions include 5k, 10k, half, marathon', () => {
  const r = calculateRunningPace({ paceSecsPerKm: 300, distanceKm: 5 });
  assert.ok(r.predictions['5k']);
  assert.ok(r.predictions['10k']);
  assert.ok(r.predictions['half']);
  assert.ok(r.predictions['marathon']);
});

test('5:00 /km → 5k prediction is 25:00', () => {
  const r = calculateRunningPace({ paceSecsPerKm: 300, distanceKm: 5 });
  assert.equal(r.predictions['5k'].timeFormatted, '25:00');
});

test('5:00 /km → 10k prediction is 50:00', () => {
  const r = calculateRunningPace({ paceSecsPerKm: 300, distanceKm: 5 });
  assert.equal(r.predictions['10k'].timeFormatted, '50:00');
});

test('pace per mile is pace per km × 1.60934', () => {
  const r = calculateRunningPace({ paceSecsPerKm: 300, distanceKm: 5 });
  // 300 × 1.60934 = 482.8 s/mile ≈ 8:03
  assert.ok(r.paceSecsPerKm * 1.60934 > 480 && r.paceSecsPerKm * 1.60934 < 485);
});

// --- Validation ---

test('throws when fewer than two inputs', () => {
  assert.throws(() => calculateRunningPace({ paceSecsPerKm: 300 }), /Provide exactly two/);
  assert.throws(() => calculateRunningPace({ distanceKm: 5 }), /Provide exactly two/);
  assert.throws(() => calculateRunningPace({ timeSecs: 1500 }), /Provide exactly two/);
});

test('throws on non-positive values', () => {
  assert.throws(() => calculateRunningPace({ paceSecsPerKm: 0, distanceKm: 5 }), /pace/);
  assert.throws(() => calculateRunningPace({ paceSecsPerKm: 300, distanceKm: 0 }), /distance/);
  assert.throws(() => calculateRunningPace({ paceSecsPerKm: 300, timeSecs: -1 }), /time/);
});

// --- RACE_DISTANCES constant ---

test('RACE_DISTANCES has four entries with correct metres', () => {
  assert.equal(RACE_DISTANCES['5k'].metres, 5000);
  assert.equal(RACE_DISTANCES['10k'].metres, 10000);
  assert.equal(RACE_DISTANCES['half'].metres, 21097.5);
  assert.equal(RACE_DISTANCES['marathon'].metres, 42195);
});

// --- kBaseForSex ---

test('kBaseForSex: male → 1.06', () => {
  assert.equal(kBaseForSex('male'), 1.06);
});

test('kBaseForSex: female → 1.04', () => {
  assert.equal(kBaseForSex('female'), 1.04);
});

test('kBaseForSex: prefer not to say → 1.05', () => {
  assert.equal(kBaseForSex('prefer-not-to-say'), 1.05);
  assert.equal(kBaseForSex(undefined), 1.05);
});

// --- mileageModifier (boundary values) ---

test('mileageModifier: 10 km/week → +0.06', () => {
  assert.equal(mileageModifier(10), 0.06);
});

test('mileageModifier: 16 km/week → +0.06 (upper edge of band 1)', () => {
  assert.equal(mileageModifier(16), 0.06);
});

test('mileageModifier: 17 km/week → +0.04', () => {
  assert.equal(mileageModifier(17), 0.04);
});

test('mileageModifier: 32 km/week → +0.04', () => {
  assert.equal(mileageModifier(32), 0.04);
});

test('mileageModifier: 33 km/week → +0.02', () => {
  assert.equal(mileageModifier(33), 0.02);
});

test('mileageModifier: 48 km/week → +0.02', () => {
  assert.equal(mileageModifier(48), 0.02);
});

test('mileageModifier: 49 km/week → +0.01', () => {
  assert.equal(mileageModifier(49), 0.01);
});

test('mileageModifier: 64 km/week → +0.01', () => {
  assert.equal(mileageModifier(64), 0.01);
});

test('mileageModifier: 65 km/week → 0', () => {
  assert.equal(mileageModifier(65), 0);
});

test('mileageModifier: 96 km/week → 0', () => {
  assert.equal(mileageModifier(96), 0);
});

test('mileageModifier: 97 km/week → -0.005', () => {
  assert.equal(mileageModifier(97), -0.005);
});

test('mileageModifier: 128 km/week → -0.005', () => {
  assert.equal(mileageModifier(128), -0.005);
});

test('mileageModifier: 129 km/week → -0.01', () => {
  assert.equal(mileageModifier(129), -0.01);
});

test('mileageModifier: 200 km/week → -0.01', () => {
  assert.equal(mileageModifier(200), -0.01);
});

// --- heatPenaltyPerKm ---

test('heatPenaltyPerKm: training=15, race=15, delta=0 → no penalty', () => {
  assert.equal(heatPenaltyPerKm(15, 15), 0);
});

test('heatPenaltyPerKm: race 4°C above training → no penalty (under threshold)', () => {
  assert.equal(heatPenaltyPerKm(15, 19), 0);
});

test('heatPenaltyPerKm: race 5°C above training → 0 (delta floor)', () => {
  assert.equal(heatPenaltyPerKm(15, 20), 0);
});

test('heatPenaltyPerKm: race 10°C above training → 45 s/km', () => {
  assert.equal(heatPenaltyPerKm(15, 25), 45);
});

test('heatPenaltyPerKm: race 15°C above training → 90 s/km', () => {
  assert.equal(heatPenaltyPerKm(15, 30), 90);
});

test('heatPenaltyPerKm: race 50°C above training → capped at 180 s/km', () => {
  assert.equal(heatPenaltyPerKm(15, 65), 180);
});

// --- raceSizeMultiplier ---

test('raceSizeMultiplier: small → 1.000', () => {
  assert.equal(raceSizeMultiplier('small'), 1.000);
});

test('raceSizeMultiplier: medium → 1.003', () => {
  assert.equal(raceSizeMultiplier('medium'), 1.003);
});

test('raceSizeMultiplier: large → 1.008', () => {
  assert.equal(raceSizeMultiplier('large'), 1.008);
});

test('raceSizeMultiplier: major → 1.015', () => {
  assert.equal(raceSizeMultiplier('major'), 1.015);
});

// --- predictRace: Riegel with adjustments ---

test('predictRace: defaults match plain Riegel scaling for half→10k', () => {
  // 1:30 half (5400s over 21.0975 km) predicting 10 km, no adjustments
  const out = predictRace({
    knownDistanceKm: 21.0975,
    knownTimeSecs: 5400,
    targetDistanceKm: 10,
    sex: 'prefer-not-to-say',
    weeklyMileageKm: 40,
    trainingTempC: 15,
    raceTempC: 15,
    raceSize: 'small',
  });
  // basic Riegel uses the canonical k=1.06: T2 = 5400 * (10/21.0975)^1.06
  const expected = 5400 * Math.pow(10 / 21.0975, 1.06);
  assert.ok(Math.abs(out.basicSecs - expected) < 1);
});

test('predictRace: AFAB high-mileage marathoner predicts faster than low-mileage', () => {
  // 1:30 half = 5400s
  const high = predictRace({
    knownDistanceKm: 21.0975,
    knownTimeSecs: 5400,
    targetDistanceKm: 42.195,
    sex: 'female',
    weeklyMileageKm: 70,
    trainingTempC: 15,
    raceTempC: 15,
    raceSize: 'small',
  });
  const low = predictRace({
    knownDistanceKm: 21.0975,
    knownTimeSecs: 5400,
    targetDistanceKm: 42.195,
    sex: 'female',
    weeklyMileageKm: 20,
    trainingTempC: 15,
    raceTempC: 15,
    raceSize: 'small',
  });
  // Both should be slower than 2x (Riegel pushes >2x), but high mileage should be faster than low
  assert.ok(high.adjustedSecs < low.adjustedSecs - 60, 'expected ≥60s gap, got ' + (low.adjustedSecs - high.adjustedSecs));
});

test('predictRace: mileage modifier ignored for sub-half-marathon target', () => {
  // 5k from 10k known time, vary mileage; should be identical (mileage off for <21 km)
  const high = predictRace({
    knownDistanceKm: 10,
    knownTimeSecs: 50 * 60,
    targetDistanceKm: 5,
    sex: 'male',
    weeklyMileageKm: 100,
    trainingTempC: 15,
    raceTempC: 15,
    raceSize: 'small',
  });
  const low = predictRace({
    knownDistanceKm: 10,
    knownTimeSecs: 50 * 60,
    targetDistanceKm: 5,
    sex: 'male',
    weeklyMileageKm: 10,
    trainingTempC: 15,
    raceTempC: 15,
    raceSize: 'small',
  });
  assert.equal(high.adjustedSecs, low.adjustedSecs);
  assert.equal(high.kTotal, 1.06);
  assert.equal(high.mileageMod, 0);
});

test('predictRace: heat differential of 10°C adds time', () => {
  const cool = predictRace({
    knownDistanceKm: 10,
    knownTimeSecs: 50 * 60,
    targetDistanceKm: 10,
    sex: 'male',
    weeklyMileageKm: 40,
    trainingTempC: 15,
    raceTempC: 15,
    raceSize: 'small',
  });
  const hot = predictRace({
    knownDistanceKm: 10,
    knownTimeSecs: 50 * 60,
    targetDistanceKm: 10,
    sex: 'male',
    weeklyMileageKm: 40,
    trainingTempC: 15,
    raceTempC: 25,
    raceSize: 'small',
  });
  // 45 s/km heat penalty over ~10 km = ~450s
  assert.ok(hot.adjustedSecs > cool.adjustedSecs + 400);
});

test('predictRace: race size adds distance', () => {
  const small = predictRace({
    knownDistanceKm: 21.0975,
    knownTimeSecs: 5400,
    targetDistanceKm: 42.195,
    sex: 'male',
    weeklyMileageKm: 40,
    trainingTempC: 15,
    raceTempC: 15,
    raceSize: 'small',
  });
  const major = predictRace({
    knownDistanceKm: 21.0975,
    knownTimeSecs: 5400,
    targetDistanceKm: 42.195,
    sex: 'male',
    weeklyMileageKm: 40,
    trainingTempC: 15,
    raceTempC: 15,
    raceSize: 'major',
  });
  assert.ok(major.effectiveDistanceKm > small.effectiveDistanceKm);
  assert.ok(Math.abs(major.effectiveDistanceKm - 42.195 * 1.015) < 0.001);
});
