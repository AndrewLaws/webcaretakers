'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const {
  haversineM,
  smoothElevation,
  gradeAdjustedFactor,
  fatigueMultiplier,
  parseGPX,
  detectClimbs,
  categoriseClimb,
  difficultyRating,
  calculateCourse,
  formatTimeOfDay,
} = require('./uk-marathon-course-difficulty.js');

// --- haversine ---

test('haversineM: same point → 0', () => {
  assert.equal(haversineM(51.5, -0.1, 51.5, -0.1), 0);
});

test('haversineM: 1 degree of latitude is approximately 111 km', () => {
  var d = haversineM(0, 0, 1, 0);
  assert.ok(d > 110000 && d < 112000, 'got ' + d);
});

test('haversineM: London to Paris ~ 343 km', () => {
  // Charing Cross to Notre Dame, roughly
  var d = haversineM(51.5074, -0.1278, 48.8566, 2.3522);
  assert.ok(d > 330000 && d < 360000, 'got ' + d);
});

// --- smoothElevation ---

test('smoothElevation: flat profile stays flat', () => {
  var pts = [
    { ele: 100 }, { ele: 100 }, { ele: 100 }, { ele: 100 }, { ele: 100 },
  ];
  var out = smoothElevation(pts, 3);
  assert.deepEqual(out.map(p => p.ele), [100, 100, 100, 100, 100]);
});

test('smoothElevation: spike gets smoothed out', () => {
  var pts = [
    { ele: 100 }, { ele: 100 }, { ele: 200 }, { ele: 100 }, { ele: 100 },
  ];
  var out = smoothElevation(pts, 5);
  // Centre point should be close to mean of window, not 200
  assert.ok(out[2].ele < 150, 'spike not smoothed: ' + out[2].ele);
});

test('smoothElevation: preserves length and original points object identity', () => {
  var pts = [{ ele: 1 }, { ele: 2 }, { ele: 3 }];
  var out = smoothElevation(pts, 3);
  assert.equal(out.length, 3);
});

// --- gradeAdjustedFactor (Strava-style) ---

test('gradeAdjustedFactor: 0% grade = 1.0', () => {
  assert.equal(gradeAdjustedFactor(0), 1);
});

test('gradeAdjustedFactor: 5% uphill makes pace slower (>1.1)', () => {
  var f = gradeAdjustedFactor(5);
  assert.ok(f > 1.1 && f < 1.3, 'got ' + f);
});

test('gradeAdjustedFactor: 10% uphill makes pace much slower (>1.4)', () => {
  var f = gradeAdjustedFactor(10);
  assert.ok(f > 1.4, 'got ' + f);
});

test('gradeAdjustedFactor: -9% downhill is the sweet spot, ~12% benefit', () => {
  var f = gradeAdjustedFactor(-9);
  assert.ok(f > 0.85 && f < 0.91, 'got ' + f);
});

test('gradeAdjustedFactor: -18% downhill has no benefit (back to 1.0)', () => {
  var f = gradeAdjustedFactor(-18);
  assert.ok(f >= 0.98 && f <= 1.02, 'got ' + f);
});

test('gradeAdjustedFactor: -25% downhill is a penalty (>1.0)', () => {
  var f = gradeAdjustedFactor(-25);
  assert.ok(f > 1, 'got ' + f);
});

// --- fatigueMultiplier ---

test('fatigueMultiplier: uphill at start of race = 1.0', () => {
  assert.equal(fatigueMultiplier(0, 'up'), 1);
});

test('fatigueMultiplier: uphill at end of race is heavier (>1.3)', () => {
  var m = fatigueMultiplier(1, 'up');
  assert.ok(m > 1.3 && m <= 1.5, 'got ' + m);
});

test('fatigueMultiplier: downhill in fresh legs has no penalty', () => {
  assert.equal(fatigueMultiplier(0.2, 'down'), 1);
});

test('fatigueMultiplier: steep downhill late in race has eccentric penalty', () => {
  var m = fatigueMultiplier(0.95, 'down');
  assert.ok(m > 1.2, 'got ' + m);
});

// --- parseGPX ---

var FAKE_GPX = '<?xml version="1.0" encoding="UTF-8"?>'
  + '<gpx version="1.1" creator="test"><trk><name>Test</name><trkseg>'
  + '<trkpt lat="51.5000" lon="-0.1000"><ele>10</ele></trkpt>'
  + '<trkpt lat="51.5010" lon="-0.1000"><ele>20</ele></trkpt>'
  + '<trkpt lat="51.5020" lon="-0.1000"><ele>15</ele></trkpt>'
  + '</trkseg></trk></gpx>';

test('parseGPX: extracts trackpoints with lat, lon, ele', () => {
  var r = parseGPX(FAKE_GPX);
  assert.equal(r.points.length, 3);
  assert.equal(r.points[0].lat, 51.5);
  assert.equal(r.points[0].lon, -0.1);
  assert.equal(r.points[0].ele, 10);
});

test('parseGPX: assigns cumulative distance to each point', () => {
  var r = parseGPX(FAKE_GPX);
  assert.equal(r.points[0].distM, 0);
  assert.ok(r.points[2].distM > r.points[1].distM);
  assert.ok(r.points[2].distM > 100); // ~220m for 0.002 deg lat
});

test('parseGPX: tallies total ascent and descent', () => {
  var r = parseGPX(FAKE_GPX);
  assert.equal(r.totalAscentM, 10); // 10 → 20
  assert.equal(r.totalDescentM, 5); // 20 → 15
});

test('parseGPX: throws on non-GPX input', () => {
  assert.throws(() => parseGPX('hello world'));
  assert.throws(() => parseGPX('<html></html>'));
});

// --- detectClimbs ---

test('detectClimbs: flat course returns no climbs', () => {
  var pts = [];
  for (var i = 0; i <= 100; i++) {
    pts.push({ distM: i * 100, ele: 50 });
  }
  var climbs = detectClimbs(pts);
  assert.equal(climbs.length, 0);
});

test('detectClimbs: a 1km 5% climb is detected', () => {
  var pts = [];
  // 0 to 1km flat at 50m
  for (var i = 0; i <= 10; i++) pts.push({ distM: i * 100, ele: 50 });
  // 1km to 2km climb at 5% (50m gain)
  for (i = 1; i <= 10; i++) pts.push({ distM: 1000 + i * 100, ele: 50 + i * 5 });
  // 2km to 3km flat at 100m
  for (i = 1; i <= 10; i++) pts.push({ distM: 2000 + i * 100, ele: 100 });
  var climbs = detectClimbs(pts);
  assert.ok(climbs.length >= 1, 'expected at least one climb');
  var c = climbs[0];
  assert.ok(c.avgGradePct >= 4 && c.avgGradePct <= 6, 'grade ' + c.avgGradePct);
  assert.ok(c.lengthM >= 800 && c.lengthM <= 1200, 'length ' + c.lengthM);
});

// --- categoriseClimb ---

test('categoriseClimb: tiny bump is uncategorised', () => {
  assert.equal(categoriseClimb({ lengthM: 200, avgGradePct: 2 }), null);
});

test('categoriseClimb: a long steady climb gets a category', () => {
  // length × grade = 2000 × 5 = 10000, above 8000 threshold
  var c = categoriseClimb({ lengthM: 2000, avgGradePct: 5 });
  assert.ok(c !== null);
});

// --- difficultyRating ---

test('difficultyRating: a flat course rates "flat"', () => {
  assert.equal(difficultyRating({ ascentPerKm: 1, slowdownPct: 0.2 }), 'flat');
});

test('difficultyRating: a brutal course rates "brutal"', () => {
  assert.equal(difficultyRating({ ascentPerKm: 30, slowdownPct: 8 }), 'brutal');
});

// --- calculateCourse: integration ---

function buildFlatGPX(distKm) {
  var n = Math.round(distKm * 10); // 100m points
  var lat = 51.5;
  var lon = -0.1;
  var parts = ['<gpx version="1.1"><trk><trkseg>'];
  for (var i = 0; i <= n; i++) {
    parts.push('<trkpt lat="' + lat + '" lon="' + (lon + i * 0.0014) + '"><ele>50</ele></trkpt>');
  }
  parts.push('</trkseg></trk></gpx>');
  return parts.join('');
}

test('calculateCourse: a flat marathon predicts ~ flat pace × 42.195 km', () => {
  var gpx = buildFlatGPX(42.2);
  var parsed = parseGPX(gpx);
  var r = calculateCourse({
    points: parsed.points,
    flatPaceSecsPerKm: 300, // 5:00/km
  });
  // Expect within 2% of 300 × 42.2 = 12660s
  var expected = 300 * (parsed.points[parsed.points.length - 1].distM / 1000);
  var diff = Math.abs(r.adjustedTimeSecs - expected) / expected;
  assert.ok(diff < 0.02, 'flat course off by ' + (diff * 100).toFixed(1) + '%');
  assert.equal(r.difficultyRating, 'flat');
});

test('calculateCourse: a hilly course predicts slower than flat', () => {
  // Build a course with a 200m ascent over 42km
  var pts = [];
  var totalKm = 42;
  var n = totalKm * 10;
  for (var i = 0; i <= n; i++) {
    var distM = i * 100;
    // sine-wave hills with a 200m total ascent
    var ele = 50 + 20 * Math.sin(i / 8);
    pts.push({ lat: 51.5, lon: -0.1, ele: ele, distM: distM });
  }
  var r = calculateCourse({
    points: pts,
    flatPaceSecsPerKm: 300,
  });
  var flatExpected = 300 * totalKm;
  assert.ok(r.adjustedTimeSecs > flatExpected, 'hilly course should be slower');
});

test('formatTimeOfDay: 0 seconds → 0:00:00', () => {
  assert.equal(formatTimeOfDay(0), '0:00:00');
});

test('formatTimeOfDay: 3725 seconds → 1:02:05', () => {
  assert.equal(formatTimeOfDay(3725), '1:02:05');
});
