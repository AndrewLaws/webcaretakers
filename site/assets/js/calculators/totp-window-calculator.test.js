const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  assessTotp,
  acceptanceWindowSeconds,
  guessSpace,
  recommendedDriftForSkew,
} = require('./totp-window-calculator.js');

test('acceptanceWindowSeconds: default 30s period, drift 1 => 90s window', () => {
  // (1 + 2*1) * 30 = 90
  assert.equal(acceptanceWindowSeconds({ period: 30, drift: 1 }), 90);
});

test('acceptanceWindowSeconds: drift 0 means a single step only', () => {
  assert.equal(acceptanceWindowSeconds({ period: 30, drift: 0 }), 30);
});

test('acceptanceWindowSeconds: drift 2 with 60s period => 300s window', () => {
  // (1 + 2*2) * 60 = 300
  assert.equal(acceptanceWindowSeconds({ period: 60, drift: 2 }), 300);
});

test('guessSpace: 6 digits, drift 1 => 1-in-N where N = 1,000,000 / 3', () => {
  // probability = 3 / 10^6, N = 10^6 / 3 ~= 333,333
  const r = guessSpace({ digits: 6, drift: 1 });
  assert.ok(Math.abs(r.probability - 3 / 1e6) < 1e-12);
  assert.ok(Math.abs(r.oneInN - 1e6 / 3) < 1);
});

test('guessSpace: 8 digits, drift 0 => 1-in-100,000,000', () => {
  const r = guessSpace({ digits: 8, drift: 0 });
  assert.ok(Math.abs(r.probability - 1 / 1e8) < 1e-15);
  assert.equal(Math.round(r.oneInN), 1e8);
});

test('guessSpace: 7 digits, drift 1 => probability is 3/10^7', () => {
  const r = guessSpace({ digits: 7, drift: 1 });
  assert.ok(Math.abs(r.probability - 3 / 1e7) < 1e-12);
});

test('recommendedDriftForSkew: 0s skew -> drift 0', () => {
  assert.equal(recommendedDriftForSkew({ skew: 0, period: 30 }), 0);
});

test('recommendedDriftForSkew: skew within one period rounds up to 1', () => {
  // 25s skew on 30s period => need at least 1 step of drift either side
  assert.equal(recommendedDriftForSkew({ skew: 25, period: 30 }), 1);
});

test('recommendedDriftForSkew: skew of 70s on 30s period => 3 steps', () => {
  // ceil(70/30) = 3
  assert.equal(recommendedDriftForSkew({ skew: 70, period: 30 }), 3);
});

test('assessTotp: defaults yield 90s window and warning flag at exactly 90s is false', () => {
  const r = assessTotp({ period: 30, digits: 6, algo: 'SHA1', drift: 1, skew: 0 });
  assert.equal(r.windowSeconds, 90);
  assert.equal(r.tooWide, false);
});

test('assessTotp: drift 2 on 30s period gives 150s window and tooWide=true', () => {
  const r = assessTotp({ period: 30, digits: 6, algo: 'SHA1', drift: 2, skew: 0 });
  assert.equal(r.windowSeconds, 150);
  assert.equal(r.tooWide, true);
});

test('assessTotp: attempts per second to 50% chance within one period', () => {
  // probability per attempt p, want N attempts so 1-(1-p)^N >= 0.5 inside `period` seconds
  // For 6 digits, drift 1, p = 3e-6. ln(0.5)/ln(1-p) ~= 231,049 attempts.
  // Per second over 30s period ~= 7,701.6
  const r = assessTotp({ period: 30, digits: 6, algo: 'SHA1', drift: 1, skew: 0 });
  assert.ok(r.attemptsPerSecondFor50pc > 7000 && r.attemptsPerSecondFor50pc < 8000,
    'expected ~7.7k, got ' + r.attemptsPerSecondFor50pc);
});

test('assessTotp: 8-digit codes raise the brute-force bar substantially', () => {
  const six = assessTotp({ period: 30, digits: 6, algo: 'SHA1', drift: 1, skew: 0 });
  const eight = assessTotp({ period: 30, digits: 8, algo: 'SHA1', drift: 1, skew: 0 });
  assert.ok(eight.oneInN > six.oneInN * 50);
});

test('assessTotp: recommendedDrift reflects skew input', () => {
  const r = assessTotp({ period: 30, digits: 6, algo: 'SHA1', drift: 1, skew: 65 });
  assert.equal(r.recommendedDrift, 3);
});

test('assessTotp: invalid digits throws', () => {
  assert.throws(() => assessTotp({ period: 30, digits: 5, algo: 'SHA1', drift: 1, skew: 0 }), /digits/i);
  assert.throws(() => assessTotp({ period: 30, digits: 9, algo: 'SHA1', drift: 1, skew: 0 }), /digits/i);
});

test('assessTotp: negative period throws', () => {
  assert.throws(() => assessTotp({ period: -10, digits: 6, algo: 'SHA1', drift: 1, skew: 0 }), /period/i);
});

test('assessTotp: negative drift throws', () => {
  assert.throws(() => assessTotp({ period: 30, digits: 6, algo: 'SHA1', drift: -1, skew: 0 }), /drift/i);
});

test('assessTotp: unknown algorithm throws', () => {
  assert.throws(() => assessTotp({ period: 30, digits: 6, algo: 'MD5', drift: 1, skew: 0 }), /algo/i);
});

test('assessTotp: probability and oneInN are reciprocals (within rounding)', () => {
  const r = assessTotp({ period: 30, digits: 6, algo: 'SHA256', drift: 1, skew: 0 });
  assert.ok(Math.abs(r.probability * r.oneInN - 1) < 1e-9);
});
