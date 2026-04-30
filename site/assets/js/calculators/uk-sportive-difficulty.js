'use strict';

/**
 * UK Sportive Difficulty Calculator: pure-functional core.
 *
 * Physics-based cycling time predictor. Takes a GPX trace and either a
 * target flat-road speed or a sustained power output, returns a per-segment
 * speed via the standard cycling-power equation:
 *
 *   P × η = (m·g·sin(θ) + m·g·cos(θ)·Crr) × v + 0.5·ρ·CdA·v³
 *
 * where:
 *   m   = total mass (rider + bike) in kg
 *   g   = 9.8067 m/s²
 *   θ   = slope angle, atan(grade/100)
 *   Crr = rolling resistance coefficient (~0.005 for road)
 *   ρ   = air density (1.225 kg/m³ at sea level, 15°C)
 *   CdA = drag area (frontal area × drag coefficient, m²)
 *   η   = drivetrain efficiency (~0.97)
 *
 * Differences from the marathon version:
 *   - No fatigue weighting. Sportive riders refuel on the bike, the late-race
 *     "wall" doesn't apply the same way. (For 200km+ audaxes we'd reconsider.)
 *   - Strava's *original* cycling categorisation thresholds (8000+ score),
 *     not the lowered 4000 floor we used for runners.
 *   - Descents are uncapped except for a safety ceiling (80 km/h), reflecting
 *     that there's no eccentric-damage equivalent for cyclists.
 */

var EARTH_RADIUS_M = 6371000;
var G              = 9.8067;
var RHO            = 1.225;          // sea level, 15°C
var ETA            = 0.97;           // drivetrain efficiency
var MAX_SAFE_MS    = 80 / 3.6;       // 80 km/h descent safety cap
var COAST_GRADE    = -1.5;           // grade below which rider stops pedalling

var RIDER_PRESETS = {
  recreational: { CdA: 0.40, Crr: 0.006, label: 'Recreational (upright, basic tyres)' },
  club:         { CdA: 0.32, Crr: 0.005, label: 'Club rider (drops occasionally, decent road tyres)' },
  racer:        { CdA: 0.27, Crr: 0.004, label: 'Racer (in the drops, racing tyres)' },
};

// --- distance ---

function toRad(deg) { return deg * Math.PI / 180; }

function haversineM(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- elevation smoothing ---

function smoothElevation(points, windowSize) {
  if (!points || points.length === 0) return [];
  var k = Math.max(1, Math.floor((windowSize || 9) / 2));
  var out = new Array(points.length);
  for (var i = 0; i < points.length; i++) {
    var lo = Math.max(0, i - k);
    var hi = Math.min(points.length - 1, i + k);
    var sum = 0, count = 0;
    for (var j = lo; j <= hi; j++) { sum += points[j].ele; count++; }
    var copy = {};
    for (var key in points[i]) { if (Object.prototype.hasOwnProperty.call(points[i], key)) copy[key] = points[i][key]; }
    copy.ele = sum / count;
    out[i] = copy;
  }
  return out;
}

// --- GPX parsing ---

function parseGPX(xmlString) {
  if (typeof xmlString !== 'string' || xmlString.indexOf('<gpx') === -1) {
    throw new Error('That does not look like a GPX file. The file should start with a <gpx> tag.');
  }
  var pts = [];
  var trkptRe     = /<trkpt\s[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  var trkptSelfRe = /<trkpt\s[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*\/>/g;
  var match;
  while ((match = trkptRe.exec(xmlString)) !== null) {
    var lat = parseFloat(match[1]);
    var lon = parseFloat(match[2]);
    var eleMatch = /<ele>\s*([\-0-9.]+)\s*<\/ele>/.exec(match[3]);
    var ele = eleMatch ? parseFloat(eleMatch[1]) : NaN;
    if (!isNaN(lat) && !isNaN(lon)) {
      pts.push({ lat: lat, lon: lon, ele: isNaN(ele) ? 0 : ele });
    }
  }
  while ((match = trkptSelfRe.exec(xmlString)) !== null) {
    pts.push({ lat: parseFloat(match[1]), lon: parseFloat(match[2]), ele: 0 });
  }
  if (pts.length < 2) {
    throw new Error('Found fewer than 2 trackpoints in the GPX file. Is this an activity or a route, not just a waypoint list?');
  }
  pts[0].distM = 0;
  for (var i = 1; i < pts.length; i++) {
    pts[i].distM = pts[i - 1].distM + haversineM(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
  }
  var ascent = 0, descent = 0;
  for (i = 1; i < pts.length; i++) {
    var de = pts[i].ele - pts[i - 1].ele;
    if (de > 0) ascent += de;
    else        descent += -de;
  }
  return {
    points: pts,
    totalDistM:    pts[pts.length - 1].distM,
    totalAscentM:  ascent,
    totalDescentM: descent,
  };
}

// --- physics: power → speed ---

/**
 * Solve the cycling power equation P·η = B·v + A·v³ for v, given power P,
 * grade in %, and rider params { totalMassKg, CdA, Crr }.
 *
 * Bisection over v in [0, 30 m/s]. Always converges because the function is
 * monotonically increasing in v for B ≥ 0 (flat or uphill), and we handle
 * downhills separately via coastingSpeedMs.
 */
function speedAtGrade(powerW, gradePct, params) {
  var m = params.totalMassKg;
  var CdA = params.CdA;
  var Crr = params.Crr;
  var theta = Math.atan(gradePct / 100);
  var sinT = Math.sin(theta);
  var cosT = Math.cos(theta);

  // On a meaningful descent the rider stops pedalling — use coasting speed.
  if (gradePct <= COAST_GRADE) {
    var coast = coastingSpeedMs(gradePct, params);
    return Math.min(coast, MAX_SAFE_MS);
  }

  var A = 0.5 * RHO * CdA;
  var B = m * G * sinT + m * G * cosT * Crr;
  var rhs = powerW * ETA;

  // f(v) = A·v³ + B·v − rhs
  function f(v) { return A * v * v * v + B * v - rhs; }

  // Bisection
  var lo = 0;
  var hi = 30; // 108 km/h, well above any pedalling speed
  // Ensure root is bracketed
  if (f(hi) < 0) {
    return MAX_SAFE_MS;
  }
  for (var iter = 0; iter < 60; iter++) {
    var mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else            lo = mid;
    if (hi - lo < 1e-5) break;
  }
  var v = (lo + hi) / 2;
  return Math.min(v, MAX_SAFE_MS);
}

/**
 * Terminal velocity coasting (P = 0) on a given grade.
 * 0 = m·g·sin(θ) + m·g·cos(θ)·Crr·v + 0.5·ρ·CdA·v² (after dividing by v)
 *
 * Wait — at coast equilibrium, gravity along slope = drag forces:
 *   −m·g·sin(θ) = m·g·cos(θ)·Crr + 0.5·ρ·CdA·v²
 * (negative sin because grade is negative downhill)
 *
 * v² = (−2·m·g·sin(θ) − 2·m·g·cos(θ)·Crr) / (ρ·CdA)
 * Only positive when slope is steep enough to overcome rolling resistance.
 */
function coastingSpeedMs(gradePct, params) {
  if (gradePct >= 0) return 0;
  var theta = Math.atan(gradePct / 100);
  var num = -2 * params.totalMassKg * G * Math.sin(theta)
          -  2 * params.totalMassKg * G * Math.cos(theta) * params.Crr;
  if (num <= 0) return 0;
  var v2 = num / (RHO * params.CdA);
  return Math.sqrt(v2);
}

/**
 * Inverse: given a target flat-road speed in km/h, what sustained power does
 * the rider need to be putting out? Used when the user supplies speed instead
 * of power.
 */
function flatSpeedToPower(speedKmh, params) {
  var v = speedKmh / 3.6;
  var A = 0.5 * RHO * params.CdA;
  var B = params.totalMassKg * G * params.Crr;
  // grade = 0, so sin(θ) = 0
  return (A * v * v * v + B * v) / ETA;
}

// --- climb detection (shared shape with marathon, cycling thresholds) ---

function categoriseClimb(climb) {
  var score = climb.lengthM * climb.avgGradePct;
  if (score < 8000)   return null;
  if (score >= 80000) return 'HC';
  if (score >= 64000) return '1';
  if (score >= 32000) return '2';
  if (score >= 16000) return '3';
  return '4';
}

function detectClimbs(points) {
  var MIN_GRADE_PCT = 2;
  var MIN_LENGTH_M  = 200;
  var MAX_DIP_M     = 5;

  var climbs = [];
  var i = 0;
  while (i < points.length - 1) {
    if (points[i + 1].ele > points[i].ele) {
      var startIdx = i;
      var peakIdx  = i;
      var j = i + 1;
      var stalled = 0;
      while (j < points.length) {
        if (points[j].ele > points[peakIdx].ele) {
          peakIdx = j;
          stalled = 0;
          j++;
        } else if (points[peakIdx].ele - points[j].ele <= MAX_DIP_M) {
          stalled++;
          j++;
          if (stalled > 3 && points[j - 1].ele <= points[peakIdx].ele) break;
        } else {
          break;
        }
      }
      var lengthM = points[peakIdx].distM - points[startIdx].distM;
      var ascentM = points[peakIdx].ele - points[startIdx].ele;
      var grade   = lengthM > 0 ? (ascentM / lengthM) * 100 : 0;
      if (lengthM >= MIN_LENGTH_M && grade >= MIN_GRADE_PCT) {
        var climb = {
          startM:      points[startIdx].distM,
          endM:        points[peakIdx].distM,
          lengthM:     lengthM,
          ascentM:     ascentM,
          avgGradePct: grade,
        };
        climb.category = categoriseClimb(climb);
        climb.score    = Math.round(lengthM * grade);
        climbs.push(climb);
      }
      i = peakIdx + 1;
    } else {
      i++;
    }
  }
  return climbs;
}

// --- difficulty rating ---

function difficultyRating(metrics) {
  var ascentPerKm = metrics.ascentPerKm;
  var totalAscent = metrics.totalAscentM;
  if (ascentPerKm < 5  && totalAscent < 500)  return 'flat';
  if (ascentPerKm < 12 && totalAscent < 1500) return 'rolling';
  if (ascentPerKm < 25 && totalAscent < 3000) return 'hilly';
  return 'brutal';
}

// --- main calculation ---

function calculateRoute(opts) {
  var preset = RIDER_PRESETS[opts.riderType] || RIDER_PRESETS.club;
  var params = {
    totalMassKg: opts.totalMassKg,
    CdA: preset.CdA,
    Crr: preset.Crr,
  };

  // Power: explicit if given, else inferred from target flat speed.
  var powerW;
  if (opts.powerW && opts.powerW > 0) {
    powerW = opts.powerW;
  } else if (opts.flatSpeedKmh && opts.flatSpeedKmh > 0) {
    powerW = flatSpeedToPower(opts.flatSpeedKmh, params);
  } else {
    throw new Error('Provide either a target flat-road speed or a sustained power output.');
  }

  var smooth = smoothElevation(opts.points, 9);
  var totalDistM = smooth[smooth.length - 1].distM;

  var totalAscent = 0, totalDescent = 0;
  for (var i = 1; i < smooth.length; i++) {
    var de = smooth[i].ele - smooth[i - 1].ele;
    if (de > 0) totalAscent += de;
    else        totalDescent += -de;
  }

  var totalTimeSecs = 0;
  var maxDescentMs = 0;
  var maxClimbGrade = 0;
  var segments = [];

  for (i = 1; i < smooth.length; i++) {
    var dM = smooth[i].distM - smooth[i - 1].distM;
    if (dM <= 0) continue;
    var dE = smooth[i].ele - smooth[i - 1].ele;
    var grade = (dE / dM) * 100;
    var v = speedAtGrade(powerW, grade, params);
    if (v <= 0.1) v = 0.1; // never stall to zero
    var segTime = dM / v;
    totalTimeSecs += segTime;

    if (grade < 0 && v > maxDescentMs) maxDescentMs = v;
    if (grade > maxClimbGrade) maxClimbGrade = grade;

    segments.push({
      startM: smooth[i - 1].distM,
      endM:   smooth[i].distM,
      gradePct: grade,
      speedMs: v,
      timeSecs: segTime,
      cumulativeTimeSecs: totalTimeSecs,
    });
  }

  var totalKm = totalDistM / 1000;
  var avgSpeedKmh = totalKm / (totalTimeSecs / 3600);

  var climbs = detectClimbs(smooth);
  for (var ci = 0; ci < climbs.length; ci++) {
    var c = climbs[ci];
    var seg = nearestSegment(segments, c.startM);
    c.predictedArrivalSecs = seg ? seg.cumulativeTimeSecs - seg.timeSecs : 0;
    c.predictedArrival = formatTimeOfDay(c.predictedArrivalSecs);
  }
  var toughClimbs = climbs.slice().sort(function (a, b) { return b.score - a.score; }).slice(0, 5);

  var ascentPerKm = totalAscent / totalKm;
  var rating = difficultyRating({ ascentPerKm: ascentPerKm, totalAscentM: totalAscent });

  return {
    totalDistM:        totalDistM,
    totalDistKm:       Math.round(totalKm * 100) / 100,
    totalAscentM:      Math.round(totalAscent),
    totalDescentM:     Math.round(totalDescent),
    ascentPerKm:       Math.round(ascentPerKm * 10) / 10,
    timeSecs:          Math.round(totalTimeSecs),
    avgSpeedKmh:       Math.round(avgSpeedKmh * 10) / 10,
    maxDescentSpeedKmh: Math.round(maxDescentMs * 3.6 * 10) / 10,
    maxClimbGradePct:  Math.round(maxClimbGrade * 10) / 10,
    powerW:            Math.round(powerW),
    riderType:         opts.riderType || 'club',
    riderPreset:       preset,
    difficultyRating:  rating,
    climbs:            climbs,
    toughClimbs:       toughClimbs,
    segments:          segments,
    smoothed:          smooth,
  };
}

function nearestSegment(segments, distM) {
  for (var i = 0; i < segments.length; i++) {
    if (segments[i].endM >= distM) return segments[i];
  }
  return segments[segments.length - 1] || null;
}

// --- formatting / parsing ---

function formatTimeOfDay(seconds) {
  var s = Math.max(0, Math.round(seconds));
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function parseSpeedKmh(str) {
  if (typeof str !== 'string') str = String(str);
  var v = parseFloat(str);
  return isNaN(v) ? NaN : v;
}

function parsePowerW(str) {
  if (typeof str !== 'string') str = String(str);
  var v = parseFloat(str);
  return isNaN(v) ? NaN : v;
}

var _exports = {
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
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  window.SportiveDifficulty = _exports;
}
