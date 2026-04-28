const { test } = require('node:test');
const assert = require('node:assert/strict');
const lib = require('./image-file-size-estimator.js');

const { estimate, compareFormats, FORMATS, VARIANCE } = lib;

test('exposes the five supported formats', () => {
  assert.deepEqual(FORMATS.slice().sort(), ['AVIF', 'HEIC', 'JPEG', 'PNG', 'WebP'].sort());
});

test('declares a heuristic variance band', () => {
  // Real-world variance is +/-30%; the prove-it panel must say so honestly.
  assert.equal(VARIANCE, 0.3);
});

test('JPEG 1920x1080 at quality 85 lands in the 250-500 KB range', () => {
  const r = estimate({ width: 1920, height: 1080, format: 'JPEG', quality: 85 });
  // Returned size is in bytes.
  assert.ok(r.bytes >= 250 * 1000, 'bytes >= 250 KB, got ' + r.bytes);
  assert.ok(r.bytes <= 500 * 1000, 'bytes <= 500 KB, got ' + r.bytes);
  assert.equal(r.format, 'JPEG');
  assert.equal(r.pixels, 1920 * 1080);
});

test('PNG photo content is bigger than PNG graphic content at same dimensions', () => {
  const photo = estimate({ width: 1000, height: 1000, format: 'PNG', pngContent: 'photo' });
  const graphic = estimate({ width: 1000, height: 1000, format: 'PNG', pngContent: 'graphic' });
  assert.ok(photo.bytes > graphic.bytes, 'photo PNG should be larger than graphic PNG');
  // Photo deflate ratio ~0.55, graphic ~0.20; ratio between them should be ~2.75x
  const ratio = photo.bytes / graphic.bytes;
  assert.ok(ratio > 2 && ratio < 4, 'photo/graphic ratio should be roughly 2x-4x, got ' + ratio);
});

test('AVIF estimate is smaller than JPEG at the same quality', () => {
  const j = estimate({ width: 1920, height: 1080, format: 'JPEG', quality: 85 });
  const a = estimate({ width: 1920, height: 1080, format: 'AVIF', quality: 85 });
  assert.ok(a.bytes < j.bytes, 'AVIF should be smaller than JPEG');
  // AVIF coefficient is 0.45 of JPEG; expect roughly 0.4-0.5x.
  const ratio = a.bytes / j.bytes;
  assert.ok(ratio > 0.4 && ratio < 0.5, 'AVIF/JPEG ratio should be ~0.45, got ' + ratio);
});

test('WebP and HEIC estimates sit between AVIF and JPEG', () => {
  const j = estimate({ width: 1920, height: 1080, format: 'JPEG', quality: 85 });
  const w = estimate({ width: 1920, height: 1080, format: 'WebP', quality: 85 });
  const h = estimate({ width: 1920, height: 1080, format: 'HEIC', quality: 85 });
  const a = estimate({ width: 1920, height: 1080, format: 'AVIF', quality: 85 });
  assert.ok(w.bytes < j.bytes && w.bytes > a.bytes);
  assert.ok(h.bytes < j.bytes && h.bytes > a.bytes);
});

test('compareFormats returns one row per format with consistent shape', () => {
  const rows = compareFormats({ width: 1920, height: 1080, quality: 85, pngContent: 'photo' });
  assert.equal(rows.length, 5);
  const formats = rows.map(r => r.format).sort();
  assert.deepEqual(formats, ['AVIF', 'HEIC', 'JPEG', 'PNG', 'WebP'].sort());
  rows.forEach(r => {
    assert.ok(typeof r.format === 'string');
    assert.ok(Number.isFinite(r.bytes) && r.bytes > 0);
    assert.ok(typeof r.note === 'string');
  });
});

test('estimate exposes the prove-it breakdown fields', () => {
  const r = estimate({ width: 1920, height: 1080, format: 'JPEG', quality: 85 });
  assert.ok('width' in r);
  assert.ok('height' in r);
  assert.ok('pixels' in r);
  assert.ok('bytesPerPixel' in r);
  assert.ok('coefficient' in r);
  assert.ok('formula' in r);
  assert.ok('bytes' in r);
  assert.equal(r.pixels, 1920 * 1080);
  assert.ok(r.bytesPerPixel > 0);
});

test('zero width is rejected', () => {
  assert.throws(() => estimate({ width: 0, height: 1080, format: 'JPEG', quality: 85 }), /width/i);
});

test('zero height is rejected', () => {
  assert.throws(() => estimate({ width: 1920, height: 0, format: 'JPEG', quality: 85 }), /height/i);
});

test('negative dimensions are rejected', () => {
  assert.throws(() => estimate({ width: -10, height: 1080, format: 'JPEG', quality: 85 }));
  assert.throws(() => estimate({ width: 1920, height: -10, format: 'JPEG', quality: 85 }));
});

test('missing format is rejected', () => {
  assert.throws(() => estimate({ width: 1920, height: 1080, quality: 85 }), /format/i);
});

test('unknown format is rejected', () => {
  assert.throws(() => estimate({ width: 1920, height: 1080, format: 'BMP', quality: 85 }), /format/i);
});

test('JPEG quality outside 1-100 is rejected', () => {
  assert.throws(() => estimate({ width: 1920, height: 1080, format: 'JPEG', quality: 0 }), /quality/i);
  assert.throws(() => estimate({ width: 1920, height: 1080, format: 'JPEG', quality: 150 }), /quality/i);
});

test('higher JPEG quality produces a larger file', () => {
  const low = estimate({ width: 1920, height: 1080, format: 'JPEG', quality: 50 });
  const high = estimate({ width: 1920, height: 1080, format: 'JPEG', quality: 95 });
  assert.ok(high.bytes > low.bytes, 'q95 should be larger than q50');
});

test('PNG ignores quality and uses content type instead', () => {
  // PNG output does not depend on the lossy quality value.
  const a = estimate({ width: 1000, height: 1000, format: 'PNG', quality: 50, pngContent: 'photo' });
  const b = estimate({ width: 1000, height: 1000, format: 'PNG', quality: 95, pngContent: 'photo' });
  assert.equal(a.bytes, b.bytes);
});
