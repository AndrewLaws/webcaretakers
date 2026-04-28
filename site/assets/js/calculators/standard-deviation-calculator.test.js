const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseNumbers,
  welford,
  median,
  summarise,
  deviationTable,
  histogramBins,
} = require('./standard-deviation-calculator.js');

// --- parseNumbers ---------------------------------------------------------

test('parseNumbers: empty string returns empty values', () => {
  assert.deepEqual(parseNumbers(''), { values: [], invalid: [] });
});

test('parseNumbers: null and undefined are tolerated', () => {
  assert.deepEqual(parseNumbers(null), { values: [], invalid: [] });
  assert.deepEqual(parseNumbers(undefined), { values: [], invalid: [] });
});

test('parseNumbers: comma-separated', () => {
  assert.deepEqual(parseNumbers('1,2,3,4').values, [1, 2, 3, 4]);
});

test('parseNumbers: space-separated', () => {
  assert.deepEqual(parseNumbers('1 2 3 4').values, [1, 2, 3, 4]);
});

test('parseNumbers: newline-separated', () => {
  assert.deepEqual(parseNumbers('1\n2\n3\n4').values, [1, 2, 3, 4]);
});

test('parseNumbers: mixed delimiters in one input', () => {
  assert.deepEqual(parseNumbers('1, 2; 3\n4 5').values, [1, 2, 3, 4, 5]);
});

test('parseNumbers: decimals and negatives', () => {
  assert.deepEqual(parseNumbers('-1.5, 0, 2.25, -.5').values, [-1.5, 0, 2.25, -0.5]);
});

test('parseNumbers: scientific notation', () => {
  assert.deepEqual(parseNumbers('1e3, 2.5e-2').values, [1000, 0.025]);
});

test('parseNumbers: invalid tokens collected separately', () => {
  const r = parseNumbers('1, 2, foo, 3, ##');
  assert.deepEqual(r.values, [1, 2, 3]);
  assert.deepEqual(r.invalid, ['foo', '##']);
});

// --- welford / median -----------------------------------------------------

test('welford: simple set [2,4,4,4,5,5,7,9] gives mean 5 and M2 32', () => {
  const w = welford([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.equal(w.n, 8);
  assert.ok(Math.abs(w.mean - 5) < 1e-12);
  assert.ok(Math.abs(w.M2 - 32) < 1e-9);
});

test('welford: stable on large nearly-equal numbers', () => {
  // The textbook case for testing numerical stability. The naive
  // Σx² − (Σx)²/n form goes wrong here because each Σx² term is ~1e18 and
  // the difference is tiny, so floating-point precision destroys it.
  const w = welford([1e9, 1e9 + 1, 1e9 + 2]);
  // True mean is 1e9 + 1, true M2 is 2 (deviations -1, 0, 1; squares 1+0+1).
  assert.ok(Math.abs(w.mean - (1e9 + 1)) < 1e-3);
  assert.ok(Math.abs(w.M2 - 2) < 1e-6);
});

test('median: odd count returns middle', () => {
  assert.equal(median([1, 2, 3, 4, 5]), 3);
});

test('median: even count averages two middles', () => {
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test('median: empty returns null', () => {
  assert.equal(median([]), null);
});

// --- summarise ------------------------------------------------------------

test('summarise: empty input is safe and returns nulls for stats', () => {
  const s = summarise([]);
  assert.equal(s.n, 0);
  assert.equal(s.mean, null);
  assert.equal(s.populationStdDev, null);
  assert.equal(s.sampleStdDev, null);
});

test('summarise: single value, sample SD undefined, population SD = 0', () => {
  const s = summarise([42]);
  assert.equal(s.n, 1);
  assert.equal(s.mean, 42);
  assert.equal(s.median, 42);
  assert.equal(s.min, 42);
  assert.equal(s.max, 42);
  assert.equal(s.range, 0);
  assert.equal(s.populationVariance, 0);
  assert.equal(s.populationStdDev, 0);
  assert.equal(s.sampleVariance, null);
  assert.equal(s.sampleStdDev, null);
});

test('summarise: identical values, SD is zero', () => {
  const s = summarise([5, 5, 5, 5]);
  assert.equal(s.populationStdDev, 0);
  assert.equal(s.sampleStdDev, 0);
  assert.equal(s.range, 0);
});

test('summarise: two values gives a defined sample SD', () => {
  const s = summarise([10, 20]);
  // mean 15, deviations -5 and 5, sum of squared dev = 50.
  // population variance 50/2 = 25, population SD 5.
  // sample variance 50/1 = 50, sample SD sqrt(50).
  assert.equal(s.populationVariance, 25);
  assert.equal(s.populationStdDev, 5);
  assert.equal(s.sampleVariance, 50);
  assert.ok(Math.abs(s.sampleStdDev - Math.sqrt(50)) < 1e-12);
});

test('summarise: classic [2,4,4,4,5,5,7,9] gives population SD 2 and sample SD ~2.138', () => {
  const s = summarise([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.equal(s.n, 8);
  assert.equal(s.sum, 40);
  assert.equal(s.mean, 5);
  assert.equal(s.min, 2);
  assert.equal(s.max, 9);
  assert.equal(s.range, 7);
  assert.equal(s.sumSquaredDeviations, 32);
  assert.equal(s.populationVariance, 4);
  assert.equal(s.populationStdDev, 2);
  // Sample variance = 32/7
  assert.ok(Math.abs(s.sampleVariance - (32 / 7)) < 1e-12);
  assert.ok(Math.abs(s.sampleStdDev - Math.sqrt(32 / 7)) < 1e-12);
});

test('summarise: large nearly-equal numbers stays correct (Welford stability)', () => {
  const s = summarise([1e9, 1e9 + 1, 1e9 + 2]);
  // True population variance = ((-1)^2 + 0^2 + 1^2) / 3 = 2/3
  // True population SD = sqrt(2/3)
  assert.ok(Math.abs(s.populationVariance - 2 / 3) < 1e-6);
  assert.ok(Math.abs(s.populationStdDev - Math.sqrt(2 / 3)) < 1e-6);
});

test('summarise: negative numbers handled', () => {
  const s = summarise([-2, -1, 0, 1, 2]);
  assert.equal(s.mean, 0);
  assert.equal(s.sumSquaredDeviations, 10);
  assert.equal(s.populationVariance, 2);
  assert.ok(Math.abs(s.populationStdDev - Math.sqrt(2)) < 1e-12);
});

test('summarise: decimals handled', () => {
  const s = summarise([1.5, 2.5, 3.5, 4.5]);
  assert.equal(s.mean, 3);
  assert.equal(s.sumSquaredDeviations, 5);
  // population variance 5/4 = 1.25, sample variance 5/3
  assert.equal(s.populationVariance, 1.25);
  assert.ok(Math.abs(s.sampleVariance - 5 / 3) < 1e-12);
});

// --- deviationTable -------------------------------------------------------

test('deviationTable: limited to first N rows', () => {
  const rows = deviationTable([10, 12, 14, 16, 18], 12.0, 3);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].value, 10);
  assert.equal(rows[0].deviation, -2);
  assert.equal(rows[0].squared, 4);
});

test('deviationTable: defaults to first 10 if limit not supplied', () => {
  const v = [];
  for (let i = 0; i < 20; i++) v.push(i);
  const rows = deviationTable(v, 9.5);
  assert.equal(rows.length, 10);
});

// --- histogramBins --------------------------------------------------------

test('histogramBins: empty input returns empty array', () => {
  assert.deepEqual(histogramBins([]), []);
});

test('histogramBins: identical values returns empty (no informative range)', () => {
  assert.deepEqual(histogramBins([3, 3, 3, 3]), []);
});

test('histogramBins: counts add up to input length', () => {
  const bins = histogramBins([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
  const total = bins.reduce((acc, b) => acc + b.count, 0);
  assert.equal(total, 10);
  assert.equal(bins.length, 5);
});

test('histogramBins: max value lands in the last bin', () => {
  const bins = histogramBins([0, 5, 10], 5);
  assert.equal(bins[bins.length - 1].count >= 1, true);
});
