'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateRunningPace, parseTime, formatTime, formatPace, RACE_DISTANCES } = require('./running-pace.js');

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
