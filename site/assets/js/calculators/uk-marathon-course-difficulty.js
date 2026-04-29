'use strict';

/**
 * Marathon Course Difficulty Calculator: pure-functional core.
 *
 * Takes a parsed GPX trace and a flat-pace target, returns an adjusted finish
 * time and a list of tough sections. Implements:
 *   - Strava-style empirical Grade-Adjusted Pace (capped downhill benefit)
 *   - Position-in-race fatigue weighting (uphills heavier late, eccentric
 *     downhill penalty late in the race)
 *   - Climb detection using the Strava length × grade formula
 *   - Smoothing pass over raw elevation to kill GPS micro-noise
 *
 * No DOM. Browser code in the page wires this up to a file input.
 */

var EARTH_RADIUS_M = 6371000;

// --- distance ---

function toRad(deg) { return deg * Math.PI / 180; }

function haversineM(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

// --- elevation smoothing ---

/**
 * Moving-average smoother over a window of ±k points.
 * Returns a new array of points with .ele replaced by the smoothed value.
 * Original lat/lon/distM are preserved.
 */
function smoothElevation(points, windowSize) {
  if (!points || points.length === 0) return [];
  var k = Math.max(1, Math.floor((windowSize || 5) / 2));
  var out = new Array(points.length);
  for (var i = 0; i < points.length; i++) {
    var lo = Math.max(0, i - k);
    var hi = Math.min(points.length - 1, i + k);
    var sum = 0;
    var count = 0;
    for (var j = lo; j <= hi; j++) {
      sum += points[j].ele;
      count++;
    }
    var copy = {};
    for (var key in points[i]) { if (Object.prototype.hasOwnProperty.call(points[i], key)) copy[key] = points[i][key]; }
    copy.ele = sum / count;
    out[i] = copy;
  }
  return out;
}

// --- Grade-Adjusted Pace ---

/**
 * Strava-style empirical GAP factor.
 *
 * Returns a multiplier on flat pace given a gradient in percent.
 *   1.0  = no change
 *   >1.0 = slower than flat
 *   <1.0 = faster than flat
 *
 * Behaviour:
 *   uphill:        polynomial increase (5%≈1.20, 10%≈1.45, 15%≈1.78)
 *   0% to -9%:     linear benefit, capped at ~12% faster at -9%
 *   -9% to -18%:   benefit decays back to 1.0 (braking forces dominate)
 *   < -18%:        steady penalty (1% slower per extra % of grade)
 *
 * Source: Strava Engineering "An Improved GAP Model" (Lin & Yates),
 * with downhill cap behaviour preserved over the academic Minetti curve
 * which overstates downhill benefit by up to 3x for road running.
 */
function gradeAdjustedFactor(gradePct) {
  if (gradePct >= 0) {
    return 1 + 0.033 * gradePct + 0.0011 * gradePct * gradePct;
  }
  if (gradePct >= -9) {
    // -9% → 0.88, 0% → 1.0
    return 1 + (gradePct / 9) * 0.12;
  }
  if (gradePct >= -18) {
    // -9 → 0.88, -18 → 1.00
    return 0.88 + ((-9 - gradePct) / 9) * 0.12;
  }
  // beyond -18%, you are actively braking
  return 1.0 + (-18 - gradePct) * 0.01;
}

// --- fatigue weighting ---

/**
 * Multiplier applied on top of the GAP factor based on where in the race the
 * effort happens.
 *
 *   raceFrac: 0 (start) to 1 (finish)
 *   direction: 'up' | 'down' | 'flat'
 *
 * Uphill: quadratic ramp from 1.0 to ~1.4 across the race. A climb at km 38
 * is roughly 1.32x the metabolic cost of the same climb at km 4.
 *
 * Downhill: no penalty in the first 60% of the race. After that an eccentric
 * damage penalty grows quadratically, peaking at ~1.4 in the final km. This
 * is the "Comrades Down Run" effect the coach described: late steep descents
 * hurt because the quads are already cooked, and runners actually slow on the
 * downhills near the end.
 */
function fatigueMultiplier(raceFrac, direction) {
  var f = Math.max(0, Math.min(1, raceFrac));
  if (direction === 'up')   return 1 + 0.4 * f * f;
  if (direction === 'down') {
    if (f <= 0.6) return 1;
    var late = (f - 0.6) / 0.4; // 0 to 1 across last 40%
    return 1 + 0.4 * late * late;
  }
  return 1;
}

// --- GPX parsing ---

/**
 * Parse a GPX XML string into an array of { lat, lon, ele, distM } points.
 * distM is cumulative distance from the start in metres.
 */
function parseGPX(xmlString) {
  if (typeof xmlString !== 'string' || xmlString.indexOf('<gpx') === -1) {
    throw new Error('That does not look like a GPX file. The file should start with a <gpx> tag.');
  }

  // Match every <trkpt> tag, including its <ele> child.
  // We do this with regex rather than DOMParser because this module also runs
  // under node --test, where there is no DOM.
  var pts = [];
  var trkptRe = /<trkpt\s[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  var trkptSelfRe = /<trkpt\s[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*\/>/g;
  var match;

  while ((match = trkptRe.exec(xmlString)) !== null) {
    var lat = parseFloat(match[1]);
    var lon = parseFloat(match[2]);
    var inner = match[3];
    var eleMatch = /<ele>\s*([\-0-9.]+)\s*<\/ele>/.exec(inner);
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

  // cumulative distance
  pts[0].distM = 0;
  for (var i = 1; i < pts.length; i++) {
    var d = haversineM(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
    pts[i].distM = pts[i - 1].distM + d;
  }

  // ascent/descent on the raw (unsmoothed) profile
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

// --- climb detection ---

/**
 * Score a candidate climb using Strava's category formula:
 * length (m) × average gradient (%) → if > 8000 it is a categorised climb.
 *
 *   8000  – Cat 4
 *   16000 – Cat 3
 *   32000 – Cat 2
 *   64000 – Cat 1
 *   80000+ – HC (hors catégorie)
 *
 * For marathons we lower the floor to 4000 because anything sustained at 3%
 * for 1.3km is worth flagging to a runner, even if a cyclist would shrug.
 */
function categoriseClimb(climb) {
  var score = climb.lengthM * climb.avgGradePct;
  if (score < 4000) return null;
  if (score >= 80000) return 'HC';
  if (score >= 64000) return '1';
  if (score >= 32000) return '2';
  if (score >= 16000) return '3';
  if (score >= 8000)  return '4';
  return '5'; // sub-category: a hill worth pacing for, but minor
}

/**
 * Walk the smoothed profile looking for sustained climbs (>= 2% over >= 200m).
 * Returns an array of { startM, endM, lengthM, ascentM, avgGradePct, score, category }.
 */
function detectClimbs(points) {
  var MIN_GRADE_PCT  = 2;
  var MIN_LENGTH_M   = 200;
  var MAX_DIP_M      = 5;   // tolerate a 5m dip without breaking the climb

  var climbs = [];
  var i = 0;
  while (i < points.length - 1) {
    // find the start of an uphill section
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
          // shallow dip or plateau, keep walking but don't extend the peak
          stalled++;
          j++;
          // give up after a long plateau: a flat section after the peak
          // is the end of this climb, not part of it.
          if (stalled > 3 && points[j - 1].ele <= points[peakIdx].ele) break;
        } else {
          break;
        }
      }
      var lengthM  = points[peakIdx].distM - points[startIdx].distM;
      var ascentM  = points[peakIdx].ele - points[startIdx].ele;
      var gradePct = lengthM > 0 ? (ascentM / lengthM) * 100 : 0;
      if (lengthM >= MIN_LENGTH_M && gradePct >= MIN_GRADE_PCT) {
        var climb = {
          startM:      points[startIdx].distM,
          endM:        points[peakIdx].distM,
          lengthM:     lengthM,
          ascentM:     ascentM,
          avgGradePct: gradePct,
        };
        climb.category = categoriseClimb(climb);
        climb.score    = Math.round(lengthM * gradePct);
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

/**
 * Verdict on a course based on ascent per km and how much the GAP+fatigue
 * model slows the runner versus flat. Both signals matter: a course can have
 * modest ascent but place every climb in the final 5km, and that is harder
 * than the same climbs spread evenly.
 */
function difficultyRating(metrics) {
  var ascentPerKm = metrics.ascentPerKm;  // m / km
  var slowdownPct = metrics.slowdownPct;  // % slower than flat
  if (ascentPerKm < 5  && slowdownPct < 1) return 'flat';
  if (ascentPerKm < 12 && slowdownPct < 3) return 'rolling';
  if (ascentPerKm < 25 && slowdownPct < 6) return 'hilly';
  return 'brutal';
}

// --- main calculation ---

/**
 * Run the full course adjustment.
 *
 * opts:
 *   points: array of { lat, lon, ele, distM }
 *   flatPaceSecsPerKm: target flat pace
 *   experience: 'first-timer' | 'recreational' | 'experienced' (optional)
 *
 * Experience scales the late-race fatigue multiplier. Experienced marathoners
 * fade less; first-timers fade more. Default is 'recreational'.
 */
function calculateCourse(opts) {
  var points = opts.points;
  var flatPace = opts.flatPaceSecsPerKm;
  var experience = opts.experience || 'recreational';

  var fatigueScale = experience === 'first-timer'   ? 1.25
                   : experience === 'experienced'   ? 0.75
                   : 1.0;

  // smooth before computing grades to kill GPS noise
  var smooth = smoothElevation(points, 9);
  var totalDistM = smooth[smooth.length - 1].distM;

  // ascent/descent on the smoothed profile (the noise-free version is what
  // the runner's body actually experiences over the macro profile)
  var totalAscent = 0, totalDescent = 0;
  for (var i = 1; i < smooth.length; i++) {
    var de = smooth[i].ele - smooth[i - 1].ele;
    if (de > 0) totalAscent += de;
    else        totalDescent += -de;
  }

  // Walk segment by segment. Each segment is one trkpt-to-trkpt link.
  var segments = [];
  var cumulativeTimeSecs = 0;
  var flatTimeSecs = (totalDistM / 1000) * flatPace;

  for (i = 1; i < smooth.length; i++) {
    var dM = smooth[i].distM - smooth[i - 1].distM;
    if (dM <= 0) continue;
    var dE = smooth[i].ele - smooth[i - 1].ele;
    var grade = (dE / dM) * 100;
    var dir = grade > 0.5 ? 'up' : (grade < -0.5 ? 'down' : 'flat');

    var raceFrac = (smooth[i - 1].distM + dM / 2) / totalDistM;
    var fatigue = 1 + (fatigueMultiplier(raceFrac, dir) - 1) * fatigueScale;
    var gapFactor = gradeAdjustedFactor(grade);

    var segPace = flatPace * gapFactor * fatigue;
    var segTime = (dM / 1000) * segPace;
    cumulativeTimeSecs += segTime;

    segments.push({
      startM:    smooth[i - 1].distM,
      endM:      smooth[i].distM,
      gradePct:  grade,
      gapFactor: gapFactor,
      fatigue:   fatigue,
      paceSecsPerKm: segPace,
      timeSecs:  segTime,
      cumulativeTimeSecs: cumulativeTimeSecs,
    });
  }

  var adjustedTimeSecs = cumulativeTimeSecs;
  var slowdownSecs = adjustedTimeSecs - flatTimeSecs;
  var slowdownPct = (slowdownSecs / flatTimeSecs) * 100;

  var totalKm = totalDistM / 1000;
  var ascentPerKm = totalAscent / totalKm;
  var rating = difficultyRating({ ascentPerKm: ascentPerKm, slowdownPct: slowdownPct });

  // climbs
  var climbs = detectClimbs(smooth);
  // attach predicted time-of-arrival to each climb
  for (var ci = 0; ci < climbs.length; ci++) {
    var c = climbs[ci];
    var seg = nearestSegment(segments, c.startM);
    c.predictedArrivalSecs = seg ? seg.cumulativeTimeSecs - seg.timeSecs : 0;
    c.predictedArrival = formatTimeOfDay(c.predictedArrivalSecs);
  }

  // tough sections: top 5 by score
  var toughSections = climbs
    .slice()
    .sort(function (a, b) { return b.score - a.score; })
    .slice(0, 5);

  return {
    totalDistM:       totalDistM,
    totalDistKm:      Math.round(totalKm * 100) / 100,
    totalAscentM:     Math.round(totalAscent),
    totalDescentM:    Math.round(totalDescent),
    ascentPerKm:      Math.round(ascentPerKm * 10) / 10,
    flatTimeSecs:     Math.round(flatTimeSecs),
    adjustedTimeSecs: Math.round(adjustedTimeSecs),
    slowdownSecs:     Math.round(slowdownSecs),
    slowdownPct:      Math.round(slowdownPct * 10) / 10,
    difficultyRating: rating,
    segments:         segments,
    climbs:           climbs,
    toughSections:    toughSections,
    smoothed:         smooth,
  };
}

function nearestSegment(segments, distM) {
  for (var i = 0; i < segments.length; i++) {
    if (segments[i].endM >= distM) return segments[i];
  }
  return segments[segments.length - 1] || null;
}

// --- formatting ---

function formatTimeOfDay(seconds) {
  var s = Math.max(0, Math.round(seconds));
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function formatPace(secsPerKm) {
  var m   = Math.floor(secsPerKm / 60);
  var sec = Math.round(secsPerKm % 60);
  if (sec === 60) { m++; sec = 0; }
  return m + ':' + String(sec).padStart(2, '0');
}

function parsePace(str) {
  if (typeof str !== 'string') return NaN;
  var parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return NaN;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return NaN;
}

function parseFinishTime(str) {
  if (typeof str !== 'string') return NaN;
  var parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return NaN;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return NaN;
}

var _exports = {
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
  formatPace,
  parsePace,
  parseFinishTime,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  window.MarathonCourseDifficulty = _exports;
}
