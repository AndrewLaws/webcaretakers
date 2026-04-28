'use strict';

/**
 * Standard Deviation Calculator: pure-logic library.
 *
 * Runs entirely in the user's browser. No fetch, no I/O, no server.
 *
 * Implementation note: Welford's online algorithm is used for the running
 * mean and the sum of squared deviations (M2). Welford's avoids the
 * catastrophic cancellation that bites a naive two-pass implementation when
 * values are large and close together, e.g. [1e9, 1e9 + 1, 1e9 + 2]. With the
 * naive Σx² − (Σx)²/n form, the two large terms can subtract to give a
 * negative number due to floating-point error, which then breaks sqrt. With
 * Welford, we never accumulate Σx² directly; we update M2 by the change in
 * deviation each step, so the running quantities stay small.
 *
 * References: Welford 1962; Knuth TAOCP vol. 2, 4.2.2.
 */

function parseNumbers(input) {
  // Accept comma, whitespace (space, tab, newline) and semicolon as delimiters.
  // Empty input returns []. Non-numeric tokens are reported in `invalid`.
  if (input === null || input === undefined) {
    return { values: [], invalid: [] };
  }
  var text = String(input).trim();
  if (text === '') {
    return { values: [], invalid: [] };
  }
  var tokens = text.split(/[\s,;]+/).filter(function (t) { return t !== ''; });
  var values = [];
  var invalid = [];
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    // Allow a leading + or -, decimals, and scientific notation.
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) {
      var n = Number(t);
      if (Number.isFinite(n)) {
        values.push(n);
      } else {
        invalid.push(t);
      }
    } else {
      invalid.push(t);
    }
  }
  return { values: values, invalid: invalid };
}

function welford(values) {
  // Welford's online algorithm for mean and M2 (sum of squared deviations).
  // M2 = Σ(x_i − x̄)² for the final mean. Numerically stable because each
  // step updates a running mean by a small delta and accumulates a small
  // squared change rather than a large Σx² that has to be subtracted later.
  var n = 0;
  var mean = 0;
  var M2 = 0;
  for (var i = 0; i < values.length; i++) {
    n += 1;
    var x = values[i];
    var delta = x - mean;
    mean += delta / n;
    var delta2 = x - mean;
    M2 += delta * delta2;
  }
  return { n: n, mean: mean, M2: M2 };
}

function median(sortedAsc) {
  var n = sortedAsc.length;
  if (n === 0) return null;
  if (n % 2 === 1) return sortedAsc[(n - 1) / 2];
  return (sortedAsc[n / 2 - 1] + sortedAsc[n / 2]) / 2;
}

function summarise(values) {
  // Returns the full descriptive-stats summary for a list of numbers.
  // Sample variance and SD are null when n < 2 (undefined by definition,
  // because the Bessel correction divides by n − 1).
  if (!Array.isArray(values) || values.length === 0) {
    return {
      n: 0, sum: 0, mean: null, median: null, min: null, max: null,
      range: null, sumSquaredDeviations: 0,
      populationVariance: null, populationStdDev: null,
      sampleVariance: null, sampleStdDev: null,
    };
  }
  var w = welford(values);
  var n = w.n;
  var mean = w.mean;
  var M2 = w.M2;

  // Floating-point safety: M2 should never be negative mathematically.
  // If a tiny negative value sneaks in, clamp to 0.
  if (M2 < 0) M2 = 0;

  var sum = 0;
  var min = values[0];
  var max = values[0];
  for (var i = 0; i < values.length; i++) {
    sum += values[i];
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }

  var sorted = values.slice().sort(function (a, b) { return a - b; });
  var med = median(sorted);

  var popVar = M2 / n;
  var popSD = Math.sqrt(popVar);
  var sampleVar = n > 1 ? M2 / (n - 1) : null;
  var sampleSD = sampleVar === null ? null : Math.sqrt(sampleVar);

  return {
    n: n,
    sum: sum,
    mean: mean,
    median: med,
    min: min,
    max: max,
    range: max - min,
    sumSquaredDeviations: M2,
    populationVariance: popVar,
    populationStdDev: popSD,
    sampleVariance: sampleVar,
    sampleStdDev: sampleSD,
  };
}

function deviationTable(values, mean, limit) {
  // First `limit` rows of (x_i − x̄, (x_i − x̄)²), for the Prove-it panel.
  var rows = [];
  var max = Math.min(values.length, limit || 10);
  for (var i = 0; i < max; i++) {
    var d = values[i] - mean;
    rows.push({ index: i + 1, value: values[i], deviation: d, squared: d * d });
  }
  return rows;
}

function histogramBins(values, binCount) {
  // Build evenly-spaced histogram bins. Returns [] for empty input or when
  // all values are identical (a single-bar histogram is not informative; the
  // page handles that case with a message instead).
  if (!Array.isArray(values) || values.length === 0) return [];
  var min = values[0];
  var max = values[0];
  for (var i = 0; i < values.length; i++) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }
  if (min === max) return [];
  var k = Math.max(2, Math.min(binCount || 10, values.length));
  var width = (max - min) / k;
  var bins = [];
  for (var b = 0; b < k; b++) {
    bins.push({
      from: min + b * width,
      to: min + (b + 1) * width,
      count: 0,
    });
  }
  for (var j = 0; j < values.length; j++) {
    var v = values[j];
    var idx = Math.floor((v - min) / width);
    if (idx >= k) idx = k - 1; // the maximum value falls into the last bin
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  }
  return bins;
}

var exported = {
  parseNumbers: parseNumbers,
  welford: welford,
  median: median,
  summarise: summarise,
  deviationTable: deviationTable,
  histogramBins: histogramBins,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.StdDevCalc = exported;
}
