const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateColorDepth,
  resolveBitsPerPixel,
  formatBytes,
  formatColorCount,
} = require('./color-depth-calculator.js');

test('24-bit RGB image at 1920x1080 has the expected raw size', () => {
  // 1920 * 1080 * 24 bits = 49,766,400 bits = 6,220,800 bytes ~= 5.93 MiB
  const r = calculateColorDepth({
    pixelsWide: 1920,
    pixelsHigh: 1080,
    bitDepth: '24',
    frames: 1,
  });
  assert.equal(r.bitsPerPixel, 24);
  assert.equal(r.totalPixels, 1920 * 1080);
  assert.equal(r.totalBits, 1920 * 1080 * 24);
  assert.equal(r.totalBytes, (1920 * 1080 * 24) / 8);
});

test('24-bit RGB has 16,777,216 representable colours', () => {
  const r = calculateColorDepth({ pixelsWide: 100, pixelsHigh: 100, bitDepth: '24', frames: 1 });
  assert.equal(r.totalColors, Math.pow(2, 24));
  assert.equal(formatColorCount(r.totalColors), '16,777,216');
});

test('1-bit pixel produces two colours', () => {
  const r = calculateColorDepth({ pixelsWide: 100, pixelsHigh: 100, bitDepth: '1', frames: 1 });
  assert.equal(r.bitsPerPixel, 1);
  assert.equal(r.totalColors, 2);
});

test('grayscale 8 and indexed 8 both resolve to 8 bits per pixel', () => {
  const gray = calculateColorDepth({ pixelsWide: 100, pixelsHigh: 100, bitDepth: '8-grayscale', frames: 1 });
  const indexed = calculateColorDepth({ pixelsWide: 100, pixelsHigh: 100, bitDepth: '8-indexed', frames: 1 });
  assert.equal(gray.bitsPerPixel, 8);
  assert.equal(indexed.bitsPerPixel, 8);
  assert.equal(gray.totalColors, 256);
  assert.equal(indexed.totalColors, 256);
});

test('48-bit deep colour produces 2^48 representable colours', () => {
  const r = calculateColorDepth({ pixelsWide: 10, pixelsHigh: 10, bitDepth: '48', frames: 1 });
  assert.equal(r.bitsPerPixel, 48);
  assert.equal(r.totalColors, Math.pow(2, 48));
});

test('frames multiplier scales total bytes linearly', () => {
  const single = calculateColorDepth({ pixelsWide: 1000, pixelsHigh: 1000, bitDepth: '24', frames: 1 });
  const ten = calculateColorDepth({ pixelsWide: 1000, pixelsHigh: 1000, bitDepth: '24', frames: 10 });
  assert.equal(ten.totalBytes, single.totalBytes * 10);
  assert.equal(ten.frames, 10);
});

test('custom bit depth is honoured', () => {
  const r = calculateColorDepth({
    pixelsWide: 100, pixelsHigh: 100, bitDepth: 'custom', customBits: 12, frames: 1,
  });
  assert.equal(r.bitsPerPixel, 12);
  assert.equal(r.totalColors, Math.pow(2, 12));
});

test('JPEG estimate is roughly 10:1 of raw', () => {
  const r = calculateColorDepth({ pixelsWide: 1920, pixelsHigh: 1080, bitDepth: '24', frames: 1 });
  assert.equal(r.jpegEstimateBytes, r.totalBytes / 10);
});

test('PNG estimate is roughly 2:1 of raw', () => {
  const r = calculateColorDepth({ pixelsWide: 1920, pixelsHigh: 1080, bitDepth: '24', frames: 1 });
  assert.equal(r.pngEstimateBytes, r.totalBytes / 2);
});

test('zero or negative pixel counts throw', () => {
  assert.throws(() => calculateColorDepth({ pixelsWide: 0, pixelsHigh: 100, bitDepth: '24', frames: 1 }), /pixel/i);
  assert.throws(() => calculateColorDepth({ pixelsWide: 100, pixelsHigh: -10, bitDepth: '24', frames: 1 }), /pixel/i);
});

test('frames must be a positive integer', () => {
  assert.throws(() => calculateColorDepth({ pixelsWide: 100, pixelsHigh: 100, bitDepth: '24', frames: 0 }), /frame/i);
  assert.throws(() => calculateColorDepth({ pixelsWide: 100, pixelsHigh: 100, bitDepth: '24', frames: -2 }), /frame/i);
});

test('custom bits must be 1 to 64', () => {
  assert.throws(() => calculateColorDepth({ pixelsWide: 10, pixelsHigh: 10, bitDepth: 'custom', customBits: 0, frames: 1 }), /custom/i);
  assert.throws(() => calculateColorDepth({ pixelsWide: 10, pixelsHigh: 10, bitDepth: 'custom', customBits: 200, frames: 1 }), /custom/i);
});

test('resolveBitsPerPixel handles every preset', () => {
  assert.equal(resolveBitsPerPixel('1'), 1);
  assert.equal(resolveBitsPerPixel('8-grayscale'), 8);
  assert.equal(resolveBitsPerPixel('8-indexed'), 8);
  assert.equal(resolveBitsPerPixel('16-grayscale'), 16);
  assert.equal(resolveBitsPerPixel('24'), 24);
  assert.equal(resolveBitsPerPixel('30'), 30);
  assert.equal(resolveBitsPerPixel('32'), 32);
  assert.equal(resolveBitsPerPixel('36'), 36);
  assert.equal(resolveBitsPerPixel('48'), 48);
  assert.equal(resolveBitsPerPixel('custom', 12), 12);
});

test('formatBytes picks the right unit', () => {
  assert.match(formatBytes(500), /B$/);
  assert.match(formatBytes(50_000), /KB$/);
  assert.match(formatBytes(50_000_000), /MB$/);
  assert.match(formatBytes(50_000_000_000), /GB$/);
});

test('formatColorCount adds thousand separators', () => {
  assert.equal(formatColorCount(2), '2');
  assert.equal(formatColorCount(256), '256');
  assert.equal(formatColorCount(16777216), '16,777,216');
});
