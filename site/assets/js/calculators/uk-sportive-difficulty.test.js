'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const {
  haversineM,
  smoothElevation,
  parseGPX,
  RIDER_PRESETS,
  flatSpeedToPower,
  speedAtGrade,
  coastingSpeedMs,
  detectClimbs,
  categoriseClimb,
  difficultyRating,
  calculateRoute,
  formatTimeOfDay,
  parseSpeedKmh,
  parsePowerW,
} = require('./uk-sportive-difficulty.js');

// --- haversine sanity ---

test('haversineM: same point → 0', () => {
  assert.equal(haversineM(51.5, -0.1, 51.5, -0.1), 0);
});

test('haversineM: 1 degree of latitude is ~111 km', () => {
  var d = haversineM(0, 0, 1, 0);
  assert.ok(d > 110000 && d < 112000);
});

// --- rider presets ---

test('RIDER_PRESETS: club rider has CdA between recreational and racer', () => {
  assert.ok(RIDER_PRESETS.club.CdA < RIDER_PRESETS.recreational.CdA);
  assert.ok(RIDER_PRESETS.club.CdA > RIDER_PRESETS.racer.CdA);
});

// --- power from flat speed ---

test('flatSpeedToPower: 30 km/h, club rider, 80 kg total → ~170 W', () => {
  var p = flatSpeedToPower(30, { totalMassKg: 80, CdA: 0.32, Crr: 0.005 });
  assert.ok(p > 140 && p < 200, 'got ' + p);
});

test('flatSpeedToPower: 40 km/h costs roughly 2x more than 30 km/h (cubic in v)', () => {
  var p30 = flatSpeedToPower(30, { totalMassKg: 80, CdA: 0.32, Crr: 0.005 });
  var p40 = flatSpeedToPower(40, { totalMassKg: 80, CdA: 0.32, Crr: 0.005 });
  var ratio = p40 / p30;
  assert.ok(ratio > 1.8 && ratio < 2.5, 'ratio ' + ratio);
});

// --- speed at grade ---

test('speedAtGrade: 200 W on flat club rider → roughly 31-34 km/h', () => {
  var v = speedAtGrade(200, 0, { totalMassKg: 80, CdA: 0.32, Crr: 0.005 });
  var kmh = v * 3.6;
  assert.ok(kmh > 30 && kmh < 35, 'got ' + kmh);
});

test('speedAtGrade: 200 W on 5% climb is much slower than flat', () => {
  var vFlat = speedAtGrade(200, 0, { totalMassKg: 80, CdA: 0.32, Crr: 0.005 });
  var vClimb = speedAtGrade(200, 5, { totalMassKg: 80, CdA: 0.32, Crr: 0.005 });
  assert.ok(vClimb < vFlat * 0.5, 'climb ' + (vClimb * 3.6) + ', flat ' + (vFlat * 3.6));
});

test('speedAtGrade: 200 W on 10% climb = walking pace (5-9 km/h)', () => {
  var v = speedAtGrade(200, 10, { totalMassKg: 80, CdA: 0.32, Crr: 0.005 });
  var kmh = v * 3.6;
  assert.ok(kmh > 4 && kmh < 12, 'got ' + kmh);
});

test('speedAtGrade: -5% descent makes you fast even at zero power', () => {
  var v = speedAtGrade(0, -5, { totalMassKg: 80, CdA: 0.32, Crr: 0.005 });
  var kmh = v * 3.6;
  assert.ok(kmh > 35 && kmh <= 80, 'got ' + kmh);
});

test('speedAtGrade: caps at 80 km/h on extreme descent', () => {
  var v = speedAtGrade(300, -15, { totalMassKg: 80, CdA: 0.32, Crr: 0.005 });
  var kmh = v * 3.6;
  assert.ok(kmh <= 80.01, 'got ' + kmh);
});

// --- coasting ---

test('coastingSpeedMs: shallow downhill (-1%) reaches modest speed', () => {
  var v = coastingSpeedMs(-1, { totalMassKg: 80, CdA: 0.32, Crr: 0.005 });
  var kmh = v * 3.6;
  assert.ok(kmh > 10 && kmh < 30, 'got ' + kmh);
});

test('coastingSpeedMs: flat = 0 (no gravity to drive you)', () => {
  var v = coastingSpeedMs(0, { totalMassKg: 80, CdA: 0.32, Crr: 0.005 });
  assert.ok(v <= 0.01, 'got ' + v);
});

// --- GPX parsing (minimal, since we share the logic with the marathon module) ---

var FAKE_GPX = '<?xml version="1.0"?>'
  + '<gpx version="1.1"><trk><trkseg>'
  + '<trkpt lat="51.5000" lon="-0.1000"><ele>10</ele></trkpt>'
  + '<trkpt lat="51.5010" lon="-0.1000"><ele>20</ele></trkpt>'
  + '<trkpt lat="51.5020" lon="-0.1000"><ele>15</ele></trkpt>'
  + '</trkseg></trk></gpx>';

test('parseGPX: extracts trackpoints and assigns cumulative distance', () => {
  var r = parseGPX(FAKE_GPX);
  assert.equal(r.points.length, 3);
  assert.equal(r.points[0].distM, 0);
  assert.ok(r.points[2].distM > 100);
});

test('parseGPX: throws on non-GPX input', () => {
  assert.throws(() => parseGPX('not a gpx'));
});

// --- climb detection ---

test('detectClimbs: 1km 5% climb is detected', () => {
  var pts = [];
  for (var i = 0; i <= 10; i++) pts.push({ distM: i * 100, ele: 50 });
  for (i = 1; i <= 10; i++) pts.push({ distM: 1000 + i * 100, ele: 50 + i * 5 });
  for (i = 1; i <= 10; i++) pts.push({ distM: 2000 + i * 100, ele: 100 });
  var climbs = detectClimbs(pts);
  assert.ok(climbs.length >= 1);
  assert.ok(climbs[0].avgGradePct >= 4 && climbs[0].avgGradePct <= 6);
});

// --- climb categorisation (Strava cycling thresholds, original 8000) ---

test('categoriseClimb: a 1.5km 5% climb (score 7500) is uncategorised for cyclists', () => {
  assert.equal(categoriseClimb({ lengthM: 1500, avgGradePct: 5 }), null);
});

test('categoriseClimb: a 2km 5% climb (score 10000) is Cat 4', () => {
  assert.equal(categoriseClimb({ lengthM: 2000, avgGradePct: 5 }), '4');
});

test('categoriseClimb: a long Pyrenean climb (score > 80000) is HC', () => {
  // 16 km at 7% = 112,000
  assert.equal(categoriseClimb({ lengthM: 16000, avgGradePct: 7 }), 'HC');
});

// --- difficulty rating ---

test('difficultyRating: a flat 100km route is "flat"', () => {
  assert.equal(difficultyRating({ ascentPerKm: 2, totalAscentM: 200 }), 'flat');
});

test('difficultyRating: a route with 3000m+ ascent is "brutal"', () => {
  assert.equal(difficultyRating({ ascentPerKm: 30, totalAscentM: 3500 }), 'brutal');
});

// --- end-to-end ---

function buildFlatGPX(distKm) {
  var n = Math.round(distKm * 10);
  var parts = ['<gpx version="1.1"><trk><trkseg>'];
  for (var i = 0; i <= n; i++) {
    parts.push('<trkpt lat="51.5" lon="' + (-0.1 + i * 0.0014) + '"><ele>50</ele></trkpt>');
  }
  parts.push('</trkseg></trk></gpx>');
  return parts.join('');
}

test('calculateRoute: a flat 100 km route at 30 km/h flat-pace finishes in ~3h20m', () => {
  var gpx = buildFlatGPX(100);
  var parsed = parseGPX(gpx);
  var r = calculateRoute({
    points: parsed.points,
    flatSpeedKmh: 30,
    totalMassKg: 80,
    riderType: 'club',
  });
  // Expect approx 100 km / 30 km/h = 3.33h = 12000 s, within 5%
  var diff = Math.abs(r.timeSecs - 12000) / 12000;
  assert.ok(diff < 0.05, 'flat route off by ' + (diff * 100).toFixed(1) + '%');
});

test('calculateRoute: a hilly route is slower than the flat-pace target', () => {
  var pts = [];
  var n = 1000;
  for (var i = 0; i <= n; i++) {
    pts.push({ lat: 51.5, lon: -0.1, ele: 50 + 30 * Math.sin(i / 8), distM: i * 100 });
  }
  var r = calculateRoute({
    points: pts,
    flatSpeedKmh: 30,
    totalMassKg: 80,
    riderType: 'club',
  });
  var flatExpected = 100 * 3600 / 30; // 100 km at 30 km/h
  assert.ok(r.timeSecs > flatExpected, 'hilly should be slower than flat');
});

test('calculateRoute: power input takes precedence over flat speed when both supplied', () => {
  var gpx = buildFlatGPX(50);
  var parsed = parseGPX(gpx);
  var rPower = calculateRoute({
    points: parsed.points,
    powerW: 250,
    totalMassKg: 80,
    riderType: 'club',
  });
  var rSpeed = calculateRoute({
    points: parsed.points,
    flatSpeedKmh: 25,
    powerW: 250,
    totalMassKg: 80,
    riderType: 'club',
  });
  assert.equal(rPower.timeSecs, rSpeed.timeSecs);
});

test('calculateRoute: surfaces max descent speed and biggest climb', () => {
  var pts = [];
  for (var i = 0; i <= 100; i++) {
    pts.push({ lat: 51.5, lon: -0.1, ele: 50, distM: i * 100 });
  }
  // 5km climb at 4% (200m gain), then 5km descent. Steep enough to survive smoothing.
  for (i = 1; i <= 100; i++) {
    pts.push({ lat: 51.5, lon: -0.1, ele: 50 + i * 2, distM: 10000 + i * 50 });
  }
  for (i = 1; i <= 100; i++) {
    pts.push({ lat: 51.5, lon: -0.1, ele: 250 - i * 2, distM: 15000 + i * 50 });
  }
  var r = calculateRoute({
    points: pts,
    flatSpeedKmh: 30,
    totalMassKg: 80,
    riderType: 'club',
  });
  assert.ok(r.maxDescentSpeedKmh > 30, 'max descent ' + r.maxDescentSpeedKmh);
  assert.ok(r.climbs.length >= 1);
});

// --- input parsing ---

test('parseSpeedKmh: "32.5" → 32.5', () => {
  assert.equal(parseSpeedKmh('32.5'), 32.5);
});

test('parsePowerW: "250" → 250', () => {
  assert.equal(parsePowerW('250'), 250);
});

test('formatTimeOfDay: 7325 seconds → 2:02:05', () => {
  assert.equal(formatTimeOfDay(7325), '2:02:05');
});
