const { test } = require('node:test');
const assert = require('node:assert/strict');
const lib = require('./file-download-time-calculator.js');

const { calculateDownloadTime, formatDuration, OVERHEAD } = lib;

test('overhead constant is 5 percent', () => {
  assert.equal(OVERHEAD, 0.05);
});

test('Mbps to MB per second conversion (decimal, not binary)', () => {
  // 100 Mbps = 100,000,000 bits/s = 12,500,000 bytes/s = 12.5 MB/s
  const r = calculateDownloadTime({ size: 1, sizeUnit: 'GB', speed: 100, speedUnit: 'Mbps' });
  // bitsPerSecond should be 100,000,000
  assert.equal(r.bitsPerSecond, 100000000);
  // 1 GB = 1,000,000,000 bytes = 8,000,000,000 bits
  assert.equal(r.totalBits, 8000000000);
  // raw seconds = 80, with 5% overhead = 84
  assert.equal(r.rawSeconds, 80);
  assert.ok(Math.abs(r.seconds - 84) < 1e-9);
});

test('Gbps speed unit converts correctly', () => {
  // 1 Gbps = 1,000,000,000 bits/s
  const r = calculateDownloadTime({ size: 1, sizeUnit: 'GB', speed: 1, speedUnit: 'Gbps' });
  assert.equal(r.bitsPerSecond, 1000000000);
  // 8 seconds raw, 8.4 with overhead
  assert.equal(r.rawSeconds, 8);
  assert.ok(Math.abs(r.seconds - 8.4) < 1e-9);
});

test('TB size unit handled correctly', () => {
  // 1 TB = 1,000,000,000,000 bytes = 8e12 bits
  const r = calculateDownloadTime({ size: 1, sizeUnit: 'TB', speed: 1, speedUnit: 'Gbps' });
  assert.equal(r.totalBits, 8000000000000);
});

test('overhead is applied on top of raw transfer time', () => {
  const r = calculateDownloadTime({ size: 100, sizeUnit: 'MB', speed: 80, speedUnit: 'Mbps' });
  // 100 MB = 800,000,000 bits, at 80 Mbps = 10s raw, 10.5s with 5% overhead
  assert.equal(r.rawSeconds, 10);
  assert.ok(Math.abs(r.seconds - 10.5) < 1e-9);
  assert.ok(r.seconds > r.rawSeconds);
});

test('formatDuration returns d/h/m/s for large values', () => {
  // 1 day, 3 hours, 12 minutes, 5 seconds
  const seconds = 24 * 3600 + 3 * 3600 + 12 * 60 + 5;
  assert.equal(formatDuration(seconds), '1d 3h 12m 5s');
});

test('formatDuration omits leading zero units', () => {
  assert.equal(formatDuration(125), '2m 5s');
  assert.equal(formatDuration(45), '45s');
  assert.equal(formatDuration(3600), '1h 0m 0s');
});

test('formatDuration handles sub-second values', () => {
  const out = formatDuration(0.5);
  // Should still be human-readable, not blank
  assert.ok(/\d/.test(out));
});

test('formatDuration on calculate output gives 1d 3h shape', () => {
  // 100 GB at 8 Mbps. 100 GB = 8e11 bits. /8e6 = 100,000s raw = 27h 46m 40s
  // With overhead = 105,000s = 29h 10m, formatted as 1d 5h 10m 0s
  const r = calculateDownloadTime({ size: 100, sizeUnit: 'GB', speed: 8, speedUnit: 'Mbps' });
  const text = formatDuration(r.seconds);
  assert.match(text, /^\d+d \d+h \d+m \d+s$/);
});

test('handles file sizes greater than 100 GB', () => {
  const r = calculateDownloadTime({ size: 500, sizeUnit: 'GB', speed: 100, speedUnit: 'Mbps' });
  assert.ok(r.seconds > 0);
  assert.ok(Number.isFinite(r.seconds));
});

test('zero size is invalid', () => {
  assert.throws(() => calculateDownloadTime({ size: 0, sizeUnit: 'GB', speed: 100, speedUnit: 'Mbps' }), /size/i);
});

test('zero speed is invalid', () => {
  assert.throws(() => calculateDownloadTime({ size: 1, sizeUnit: 'GB', speed: 0, speedUnit: 'Mbps' }), /speed/i);
});

test('negative size is invalid', () => {
  assert.throws(() => calculateDownloadTime({ size: -5, sizeUnit: 'GB', speed: 100, speedUnit: 'Mbps' }));
});

test('unknown size unit throws', () => {
  assert.throws(() => calculateDownloadTime({ size: 1, sizeUnit: 'KB', speed: 100, speedUnit: 'Mbps' }));
});

test('unknown speed unit throws', () => {
  assert.throws(() => calculateDownloadTime({ size: 1, sizeUnit: 'GB', speed: 100, speedUnit: 'kbps' }));
});

test('result includes the breakdown fields the prove-it panel needs', () => {
  const r = calculateDownloadTime({ size: 10, sizeUnit: 'GB', speed: 200, speedUnit: 'Mbps' });
  assert.ok('bitsPerSecond' in r);
  assert.ok('totalBytes' in r);
  assert.ok('totalBits' in r);
  assert.ok('rawSeconds' in r);
  assert.ok('seconds' in r);
  assert.ok('overheadSeconds' in r);
  assert.ok('overhead' in r);
  assert.equal(r.overhead, 0.05);
});
