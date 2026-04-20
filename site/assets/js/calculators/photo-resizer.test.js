const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateResizedDimensions,
  formatFileSize,
  isSupportedImageType,
  SUPPORTED_TYPES,
} = require('./photo-resizer.js');

test('returns target dimensions verbatim when aspect ratio is not locked', () => {
  const out = calculateResizedDimensions({
    origWidth: 4000, origHeight: 3000,
    targetWidth: 800, targetHeight: 600,
    keepAspectRatio: false,
  });
  assert.deepEqual(out, { width: 800, height: 600 });
});

test('scales height from width when aspect ratio is locked and only width is set', () => {
  const out = calculateResizedDimensions({
    origWidth: 4000, origHeight: 3000,
    targetWidth: 800, targetHeight: null,
    keepAspectRatio: true,
  });
  assert.deepEqual(out, { width: 800, height: 600 });
});

test('scales width from height when aspect ratio is locked and only height is set', () => {
  const out = calculateResizedDimensions({
    origWidth: 4000, origHeight: 3000,
    targetWidth: null, targetHeight: 600,
    keepAspectRatio: true,
  });
  assert.deepEqual(out, { width: 800, height: 600 });
});

test('fits within both target dimensions (contain) when aspect ratio is locked and both set', () => {
  // 4000x3000 into 800x800 -> fits to 800x600
  const out = calculateResizedDimensions({
    origWidth: 4000, origHeight: 3000,
    targetWidth: 800, targetHeight: 800,
    keepAspectRatio: true,
  });
  assert.deepEqual(out, { width: 800, height: 600 });
});

test('fits within both target dimensions when source is portrait', () => {
  // 3000x4000 into 800x800 -> fits to 600x800
  const out = calculateResizedDimensions({
    origWidth: 3000, origHeight: 4000,
    targetWidth: 800, targetHeight: 800,
    keepAspectRatio: true,
  });
  assert.deepEqual(out, { width: 600, height: 800 });
});

test('rounds to whole pixels', () => {
  // 1000x667 scaled to width 500 -> height 333.5 -> 334
  const out = calculateResizedDimensions({
    origWidth: 1000, origHeight: 667,
    targetWidth: 500, targetHeight: null,
    keepAspectRatio: true,
  });
  assert.equal(out.width, 500);
  assert.equal(out.height, 334);
});

test('falls back to original dimensions when neither target is provided', () => {
  const out = calculateResizedDimensions({
    origWidth: 1200, origHeight: 800,
    targetWidth: null, targetHeight: null,
    keepAspectRatio: true,
  });
  assert.deepEqual(out, { width: 1200, height: 800 });
});

test('never returns a zero or negative dimension', () => {
  const out = calculateResizedDimensions({
    origWidth: 1000, origHeight: 1,
    targetWidth: 10, targetHeight: null,
    keepAspectRatio: true,
  });
  assert.ok(out.width >= 1);
  assert.ok(out.height >= 1);
});

test('formatFileSize returns human-readable bytes/KB/MB', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2 KB');
  assert.equal(formatFileSize(1536), '1.5 KB');
  assert.equal(formatFileSize(2 * 1024 * 1024), '2 MB');
  assert.equal(formatFileSize(1.5 * 1024 * 1024), '1.5 MB');
});

test('isSupportedImageType accepts jpeg, png, webp and rejects others', () => {
  assert.equal(isSupportedImageType('image/jpeg'), true);
  assert.equal(isSupportedImageType('image/png'), true);
  assert.equal(isSupportedImageType('image/webp'), true);
  assert.equal(isSupportedImageType('image/gif'), false);
  assert.equal(isSupportedImageType('image/svg+xml'), false);
  assert.equal(isSupportedImageType('application/pdf'), false);
  assert.equal(isSupportedImageType(''), false);
});

test('SUPPORTED_TYPES lists the allowed MIME types', () => {
  assert.ok(Array.isArray(SUPPORTED_TYPES));
  assert.ok(SUPPORTED_TYPES.includes('image/jpeg'));
  assert.ok(SUPPORTED_TYPES.includes('image/png'));
  assert.ok(SUPPORTED_TYPES.includes('image/webp'));
});
