'use strict';

/**
 * SERP CTR Estimator by Position.
 *
 * Pure-function maths for forecasting clicks-per-month from a target SERP
 * position. Two industry curves are baked in:
 *
 *   - Advanced Web Ranking 2024 (non-branded desktop average)
 *   - Backlinko 2024 averages (study of 4 million SERPs)
 *
 * The estimator does not call any API. Numbers come from published studies
 * and from the user's own search-volume input. The output band is +/- 25%
 * to acknowledge the noise in any organic-CTR forecast.
 *
 * Formula:
 *   clicks = volume * (ctrForPosition / 100) * erosion * brandedMultiplier
 *
 *   - erosion is the product of (1 - erosionRate) for every SERP feature
 *     present (featured snippet, PAA, Maps pack, video carousel). Each
 *     feature shaves a configurable share of organic CTR, and they stack
 *     multiplicatively rather than adding, because each one steals a
 *     fraction of what is left rather than a fraction of the original.
 *   - brandedMultiplier defaults to 1.0 (off). When branded is true, the
 *     multiplier defaults to 1.5, because branded queries historically
 *     show ~50% higher CTR at the top of the SERP (the searcher already
 *     knows what they want).
 */

// Advanced Web Ranking 2024 (non-branded desktop). Positions 1 through 10
// are the published values; 11 through 20 decline linearly from P10's
// 1.6% down to 0.5% at P20, which is how AWR's tail looks in their charts.
var AWR_P1_TO_10 = [39.8, 18.7, 10.2, 7.2, 5.1, 4.4, 3.0, 2.1, 1.9, 1.6];

// Backlinko 2024 (Brian Dean / Backlinko, study of 4 million Google SERPs).
// Their reported numbers for the average organic CTR by position.
var BACKLINKO_P1_TO_10 = [27.6, 15.8, 11.0, 8.4, 6.3, 4.9, 3.9, 3.3, 2.7, 2.4];

var TAIL_P20 = 0.5; // both curves bottom out at roughly 0.5% by P20

function curveValues(curve) {
  if (curve === 'backlinko') return BACKLINKO_P1_TO_10;
  return AWR_P1_TO_10;
}

/**
 * Return the CTR (as a percentage, e.g. 39.8 for 39.8%) for a given
 * position 1..20 under the chosen curve. Returns NaN for out-of-range
 * positions so callers can flag the input as invalid.
 */
function ctrFor(position, curve) {
  var n = Number(position);
  if (!Number.isFinite(n)) return NaN;
  if (n < 1 || n > 20) return NaN;
  var p = Math.round(n);
  var values = curveValues(curve);
  if (p <= 10) return values[p - 1];
  // Linear taper from P10 to P20.
  var p10 = values[9];
  var span = p10 - TAIL_P20;
  var step = span / 10;
  return Math.max(TAIL_P20, p10 - step * (p - 10));
}

function safeNumber(n, fallback) {
  var v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Compute the combined erosion multiplier from the active SERP features.
 * Each active feature contributes (1 - rate); they multiply, so two 30%
 * erosions compound to 0.7 * 0.7 = 0.49.
 */
function erosionMultiplier(features, erosions) {
  if (!features) return 1;
  var defaults = {
    featuredSnippet: 0.30,
    peopleAlsoAsk:   0.10,
    maps:            0.20,
    video:           0.10
  };
  var rates = erosions || {};
  var mult = 1;
  var keys = ['featuredSnippet', 'peopleAlsoAsk', 'maps', 'video'];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (!features[key]) continue;
    var rate = safeNumber(rates[key], defaults[key]);
    if (rate < 0) rate = 0;
    if (rate > 1) rate = 1;
    mult *= (1 - rate);
  }
  return mult;
}

/**
 * Estimate clicks per month for one position. Returns an object with the
 * full breakdown so the prove-it panel can show the working.
 */
function estimate(opts) {
  opts = opts || {};
  var volume = safeNumber(opts.volume, NaN);
  var position = Number(opts.position);
  var curve = opts.curve === 'backlinko' ? 'backlinko' : 'awr';

  if (!Number.isFinite(volume) || volume <= 0) {
    return { valid: false, reason: 'volume must be a positive number' };
  }
  if (!Number.isFinite(position) || position < 1 || position > 20) {
    return { valid: false, reason: 'position must be between 1 and 20' };
  }

  var ctr = ctrFor(position, curve);
  var erosion = erosionMultiplier(opts.features, opts.erosions);
  var brandedMult = 1;
  if (opts.branded) {
    brandedMult = safeNumber(opts.brandedMultiplier, 1.5);
    if (brandedMult < 0) brandedMult = 0;
  }

  var expected = volume * (ctr / 100) * erosion * brandedMult;
  var low  = expected * 0.75;
  var high = expected * 1.25;

  return {
    valid: true,
    curve: curve,
    position: Math.round(position),
    volume: volume,
    ctrPercent: ctr,
    erosionMultiplier: erosion,
    brandedMultiplier: brandedMult,
    expected: expected,
    low: low,
    high: high
  };
}

/**
 * Build a comparison table of expected clicks for positions 1..10 under
 * the chosen curve, given the same volume and modifiers. Used in the UI
 * so users can see the cliff between, say, P3 and P5.
 */
function comparisonTable(opts) {
  opts = opts || {};
  var volume = safeNumber(opts.volume, 0);
  var curve = opts.curve === 'backlinko' ? 'backlinko' : 'awr';
  var erosion = erosionMultiplier(opts.features, opts.erosions);
  var brandedMult = opts.branded ? safeNumber(opts.brandedMultiplier, 1.5) : 1;
  var rows = [];
  for (var p = 1; p <= 10; p++) {
    var ctr = ctrFor(p, curve);
    var expected = volume > 0 ? volume * (ctr / 100) * erosion * brandedMult : 0;
    rows.push({
      position: p,
      ctrPercent: ctr,
      expected: expected,
      low:  expected * 0.75,
      high: expected * 1.25
    });
  }
  return rows;
}

var api = {
  estimate: estimate,
  comparisonTable: comparisonTable,
  ctrFor: ctrFor,
  erosionMultiplier: erosionMultiplier,
  curves: { awr: AWR_P1_TO_10, backlinko: BACKLINKO_P1_TO_10 }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  window.SerpCtrEstimator = api;
}
