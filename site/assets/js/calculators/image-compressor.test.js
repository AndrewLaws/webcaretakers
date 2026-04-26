const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  SUPPORTED_TYPES,
  isSupportedImageType,
  formatFileSize,
  parseTargetBytes,
  outputMimeFor,
  extensionFor,
  searchQualityForTarget,
  dimensionScaleSteps,
  percentSaved,
} = require('./image-compressor.js');

test('SUPPORTED_TYPES covers JPEG, PNG, WebP', () => {
  assert.ok(SUPPORTED_TYPES.includes('image/jpeg'));
  assert.ok(SUPPORTED_TYPES.includes('image/png'));
  assert.ok(SUPPORTED_TYPES.includes('image/webp'));
});

test('isSupportedImageType rejects GIF, SVG, PDF, empty', () => {
  assert.equal(isSupportedImageType('image/jpeg'), true);
  assert.equal(isSupportedImageType('image/gif'), false);
  assert.equal(isSupportedImageType('image/svg+xml'), false);
  assert.equal(isSupportedImageType('application/pdf'), false);
  assert.equal(isSupportedImageType(''), false);
  assert.equal(isSupportedImageType(null), false);
});

test('formatFileSize formats bytes, KB and MB', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(900), '900 B');
  assert.equal(formatFileSize(2048), '2 KB');
  assert.equal(formatFileSize(1.5 * 1024 * 1024), '1.5 MB');
});

test('parseTargetBytes accepts plain MB, KB and case variations', () => {
  assert.equal(parseTargetBytes('2MB'), 2 * 1024 * 1024);
  assert.equal(parseTargetBytes('500 KB'), 500 * 1024);
  assert.equal(parseTargetBytes('500kb'), 500 * 1024);
  assert.equal(parseTargetBytes('100 kb'), 100 * 1024);
  assert.equal(parseTargetBytes('1.5mb'), Math.round(1.5 * 1024 * 1024));
  assert.equal(parseTargetBytes('1024'), 1024);
});

test('parseTargetBytes rejects garbage', () => {
  assert.equal(parseTargetBytes(''), null);
  assert.equal(parseTargetBytes('abc'), null);
  assert.equal(parseTargetBytes('-1 MB'), null);
  assert.equal(parseTargetBytes('0 KB'), null);
  assert.equal(parseTargetBytes(null), null);
});

test('outputMimeFor keeps original when no override', () => {
  assert.equal(outputMimeFor('image/jpeg'), 'image/jpeg');
  assert.equal(outputMimeFor('image/png'), 'image/png');
  assert.equal(outputMimeFor('image/webp'), 'image/webp');
});

test('outputMimeFor honours a sensible override', () => {
  assert.equal(outputMimeFor('image/png', 'image/jpeg'), 'image/jpeg');
  assert.equal(outputMimeFor('image/jpeg', 'image/webp'), 'image/webp');
});

test('outputMimeFor falls back to JPEG for unknown input', () => {
  assert.equal(outputMimeFor('image/heic'), 'image/jpeg');
  assert.equal(outputMimeFor(undefined), 'image/jpeg');
});

test('extensionFor returns the standard extensions', () => {
  assert.equal(extensionFor('image/jpeg'), 'jpg');
  assert.equal(extensionFor('image/png'), 'png');
  assert.equal(extensionFor('image/webp'), 'webp');
});

test('dimensionScaleSteps returns 4 shrinking steps by default', () => {
  const steps = dimensionScaleSteps();
  assert.equal(steps.length, 4);
  assert.ok(steps[0] < 1);
  assert.ok(steps[1] < steps[0]);
  assert.ok(steps[3] < steps[2]);
  assert.equal(steps[0], 0.9);
});

test('percentSaved returns positive when smaller, negative when larger', () => {
  assert.equal(percentSaved(1000, 500), 50);
  assert.equal(percentSaved(1000, 1200), -20);
  assert.equal(percentSaved(0, 100), 0);
});

test('searchQualityForTarget hits target on max quality immediately', async () => {
  let calls = 0;
  const encode = async (q) => { calls++; return { size: 1000 }; };
  const out = await searchQualityForTarget({ encode, targetBytes: 2000 });
  assert.equal(out.hit, true);
  assert.equal(out.quality, 0.95);
  assert.equal(calls, 1);
});

test('searchQualityForTarget reports miss when even minQ overshoots', async () => {
  // Pretend the encoder always produces a 5MB blob no matter the quality.
  // Caller is then expected to scale dimensions down.
  const encode = async () => ({ size: 5 * 1024 * 1024 });
  const out = await searchQualityForTarget({ encode, targetBytes: 1024 * 1024 });
  assert.equal(out.hit, false);
  assert.equal(out.quality, 0.4);
});

test('searchQualityForTarget binary-searches when target sits between min and max', async () => {
  // Linear model: size = 1000 * quality. Target 700 -> best q is 0.7-ish.
  let calls = 0;
  const encode = async (q) => { calls++; return { size: Math.round(1000 * q) }; };
  const out = await searchQualityForTarget({ encode, targetBytes: 700 });
  assert.equal(out.hit, true);
  assert.ok(out.size <= 700);
  assert.ok(out.quality >= 0.4 && out.quality <= 0.95);
  // Should not exceed the iteration budget (8 by default).
  assert.ok(calls <= 8);
});
