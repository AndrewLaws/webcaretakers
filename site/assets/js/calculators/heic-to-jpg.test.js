const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isHeic,
  isSupportedInput,
  clampQuality,
  calculateResize,
  formatFileSize,
  extensionForMime,
  targetFilename,
  orientationSwapsAxes,
  SUPPORTED_INPUT_TYPES,
  OUTPUT_FORMATS,
} = require('./heic-to-jpg.js');

test('isHeic detects HEIC/HEIF by MIME type', () => {
  assert.equal(isHeic({ type: 'image/heic', name: 'a.heic' }), true);
  assert.equal(isHeic({ type: 'image/heif', name: 'a.heif' }), true);
  assert.equal(isHeic({ type: 'IMAGE/HEIC', name: 'a.HEIC' }), true);
});

test('isHeic falls back to extension when MIME is missing', () => {
  // Chrome on Windows often reports empty type for HEIC.
  assert.equal(isHeic({ type: '', name: 'IMG_1234.HEIC' }), true);
  assert.equal(isHeic({ type: '', name: 'IMG_1234.heif' }), true);
});

test('isHeic rejects non-HEIC files', () => {
  assert.equal(isHeic({ type: 'image/jpeg', name: 'a.jpg' }), false);
  assert.equal(isHeic({ type: 'image/png', name: 'a.png' }), false);
  assert.equal(isHeic(null), false);
});

test('isSupportedInput accepts HEIC, HEIF, JPEG, PNG, WebP', () => {
  assert.equal(isSupportedInput({ type: 'image/heic', name: 'a.heic' }), true);
  assert.equal(isSupportedInput({ type: 'image/heif', name: 'a.heif' }), true);
  assert.equal(isSupportedInput({ type: 'image/jpeg', name: 'a.jpg' }), true);
  assert.equal(isSupportedInput({ type: 'image/png',  name: 'a.png' }), true);
  assert.equal(isSupportedInput({ type: 'image/webp', name: 'a.webp' }), true);
});

test('isSupportedInput rejects video and other types', () => {
  assert.equal(isSupportedInput({ type: 'video/quicktime', name: 'IMG_1234.MOV' }), false);
  assert.equal(isSupportedInput({ type: 'application/pdf', name: 'a.pdf' }), false);
  assert.equal(isSupportedInput({ type: 'image/gif', name: 'a.gif' }), false);
});

test('clampQuality holds within 0.6 to 1.0 range', () => {
  assert.equal(clampQuality(0.92), 0.92);
  assert.equal(clampQuality(0.6), 0.6);
  assert.equal(clampQuality(1.0), 1.0);
  assert.equal(clampQuality(0.1), 0.6);
  assert.equal(clampQuality(2), 1.0);
  assert.equal(clampQuality('not a number'), 0.92);
});

test('calculateResize leaves image untouched when no max dims set', () => {
  const out = calculateResize({ origWidth: 4000, origHeight: 3000, maxWidth: null, maxHeight: null });
  assert.deepEqual(out, { width: 4000, height: 3000 });
});

test('calculateResize scales down by max-width preserving aspect ratio', () => {
  const out = calculateResize({ origWidth: 4000, origHeight: 3000, maxWidth: 2000, maxHeight: null });
  assert.deepEqual(out, { width: 2000, height: 1500 });
});

test('calculateResize scales down by max-height preserving aspect ratio', () => {
  const out = calculateResize({ origWidth: 4000, origHeight: 3000, maxWidth: null, maxHeight: 1500 });
  assert.deepEqual(out, { width: 2000, height: 1500 });
});

test('calculateResize uses the more restrictive of width and height', () => {
  const out = calculateResize({ origWidth: 4000, origHeight: 3000, maxWidth: 2000, maxHeight: 1000 });
  // Height is the binding constraint -> scale by 1/3.
  assert.deepEqual(out, { width: 1333, height: 1000 });
});

test('calculateResize never enlarges an image already smaller than the cap', () => {
  const out = calculateResize({ origWidth: 800, origHeight: 600, maxWidth: 2000, maxHeight: 2000 });
  assert.deepEqual(out, { width: 800, height: 600 });
});

test('extensionForMime maps formats to file extensions', () => {
  assert.equal(extensionForMime('image/jpeg'), 'jpg');
  assert.equal(extensionForMime('image/png'), 'png');
  assert.equal(extensionForMime('image/webp'), 'webp');
});

test('targetFilename strips the original extension and adds the brand trail', () => {
  assert.equal(targetFilename('IMG_1234.HEIC', 'image/jpeg'), 'IMG_1234-webcaretakers.jpg');
  assert.equal(targetFilename('holiday.heif', 'image/png'), 'holiday-webcaretakers.png');
  assert.equal(targetFilename('no-extension', 'image/jpeg'), 'no-extension-webcaretakers.jpg');
  assert.equal(targetFilename('', 'image/jpeg'), 'image-webcaretakers.jpg');
});

test('orientationSwapsAxes flags rotated EXIF orientations', () => {
  assert.equal(orientationSwapsAxes(1), false);
  assert.equal(orientationSwapsAxes(3), false);
  assert.equal(orientationSwapsAxes(5), true);
  assert.equal(orientationSwapsAxes(6), true);
  assert.equal(orientationSwapsAxes(7), true);
  assert.equal(orientationSwapsAxes(8), true);
});

test('formatFileSize is sane', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(2048), '2 KB');
  assert.equal(formatFileSize(2 * 1024 * 1024), '2 MB');
});

test('SUPPORTED_INPUT_TYPES and OUTPUT_FORMATS are exported as arrays', () => {
  assert.ok(Array.isArray(SUPPORTED_INPUT_TYPES));
  assert.ok(SUPPORTED_INPUT_TYPES.includes('image/heic'));
  assert.ok(SUPPORTED_INPUT_TYPES.includes('image/heif'));
  assert.ok(Array.isArray(OUTPUT_FORMATS));
  assert.deepEqual(OUTPUT_FORMATS, ['image/jpeg', 'image/png', 'image/webp']);
});
