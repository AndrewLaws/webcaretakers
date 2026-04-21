'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { estimateHosting } = require('./web-hosting-estimator.js');

function approx(actual, expected, tolerance = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

// Default args builder — override individual fields per test
function args(overrides) {
  return Object.assign({
    monthlyVisitors: 5000,
    pagesPerVisit: 3,
    pageWeightKB: 2000,
    mediaFiles: 0,
    mediaFileSizeKB: 0,
    downloadFiles: 0,
    downloadFileSizeMB: 0,
    monthlyDownloads: 0,
    bufferPercent: 0,
  }, overrides);
}

// ── Pageviews ─────────────────────────────────────────────────────────────
test('returns monthly pageviews = visitors × pages per visit', () => {
  const r = estimateHosting(args({ monthlyVisitors: 5000, pagesPerVisit: 4 }));
  assert.equal(r.monthlyPageviews, 20000);
});

// ── Page bandwidth ────────────────────────────────────────────────────────
// 5000 visitors × 3 pages × 2000 KB = 30,000,000 KB = 30,000 MB = 30 GB
test('page bandwidth in GB: visitors × pagesPerVisit × pageWeightKB / 1e6', () => {
  const r = estimateHosting(args({ monthlyVisitors: 5000, pagesPerVisit: 3, pageWeightKB: 2000 }));
  approx(r.pageBandwidthGB, 30, 0.01);
});

// ── Download bandwidth ────────────────────────────────────────────────────
// 50 downloads × 2 MB = 100 MB = 0.1 GB
test('download bandwidth in GB: monthlyDownloads × downloadFileSizeMB / 1000', () => {
  const r = estimateHosting(args({ monthlyDownloads: 50, downloadFileSizeMB: 2 }));
  approx(r.downloadBandwidthGB, 0.1, 0.001);
});

// ── Total bandwidth with buffer ───────────────────────────────────────────
// page 30 GB + download 0.1 GB = 30.1 GB; × 1.5 = 45.15 GB
test('total bandwidth = (page + download) × (1 + buffer/100)', () => {
  const r = estimateHosting(args({
    monthlyVisitors: 5000, pagesPerVisit: 3, pageWeightKB: 2000,
    monthlyDownloads: 50, downloadFileSizeMB: 2, bufferPercent: 50,
  }));
  approx(r.pageBandwidthGB, 30, 0.1);
  approx(r.downloadBandwidthGB, 0.1, 0.01);
  approx(r.totalBandwidthRawGB, 30.1, 0.1);
  approx(r.totalBandwidthWithBufferGB, 45.15, 0.1);
});

// ── Zero buffer ────────────────────────────────────────────────────────────
test('zero buffer: total equals raw', () => {
  const r = estimateHosting(args({ monthlyVisitors: 10000, pagesPerVisit: 2, pageWeightKB: 1000, bufferPercent: 0 }));
  approx(r.pageBandwidthGB, 20, 0.01);
  approx(r.totalBandwidthWithBufferGB, 20, 0.01);
});

// ── 100% buffer doubles total ─────────────────────────────────────────────
test('100% buffer doubles the total', () => {
  const r = estimateHosting(args({ monthlyVisitors: 1000, pagesPerVisit: 1, pageWeightKB: 1000, bufferPercent: 100 }));
  approx(r.pageBandwidthGB, 1, 0.01);
  approx(r.totalBandwidthWithBufferGB, 2, 0.01);
});

// ── Media storage ─────────────────────────────────────────────────────────
// 200 files × 500 KB = 100,000 KB = 0.1 GB
test('media storage in GB: mediaFiles × mediaFileSizeKB / 1e6', () => {
  const r = estimateHosting(args({ mediaFiles: 200, mediaFileSizeKB: 500 }));
  approx(r.mediaStorageGB, 0.1, 0.001);
});

// ── Download storage ──────────────────────────────────────────────────────
// 5 files × 2 MB = 10 MB = 0.01 GB
test('download storage in GB: downloadFiles × downloadFileSizeMB / 1000', () => {
  const r = estimateHosting(args({ downloadFiles: 5, downloadFileSizeMB: 2 }));
  approx(r.downloadStorageGB, 0.01, 0.001);
});

// ── Total storage with buffer ─────────────────────────────────────────────
// media 0.1 + downloads 0.01 = 0.11 GB; × 1.5 = 0.165 GB
test('total storage = (media + download) × (1 + buffer/100)', () => {
  const r = estimateHosting(args({
    mediaFiles: 200, mediaFileSizeKB: 500,
    downloadFiles: 5, downloadFileSizeMB: 2,
    bufferPercent: 50,
  }));
  approx(r.mediaStorageGB, 0.1, 0.001);
  approx(r.downloadStorageGB, 0.01, 0.001);
  approx(r.totalStorageRawGB, 0.11, 0.001);
  approx(r.totalStorageWithBufferGB, 0.165, 0.01);
});

// ── Hosting tier: shared ──────────────────────────────────────────────────
// bandwidth < 100 GB AND storage < 5 GB → shared
test('low traffic + small storage = shared tier', () => {
  const r = estimateHosting(args({
    monthlyVisitors: 1000, pagesPerVisit: 2, pageWeightKB: 1000,
    mediaFiles: 50, mediaFileSizeKB: 200,
    bufferPercent: 50,
  }));
  // bandwidth = 1000 × 2 × 1000/1e6 × 1.5 = 3 GB; storage = 50 × 200/1e6 × 1.5 = 0.015 GB
  assert.equal(r.tier, 'shared');
});

// ── Hosting tier: vps (high bandwidth) ───────────────────────────────────
test('high bandwidth (>100 GB) = vps or dedicated tier', () => {
  const r = estimateHosting(args({
    monthlyVisitors: 50000, pagesPerVisit: 3, pageWeightKB: 3000,
    bufferPercent: 50,
  }));
  // bandwidth = 50000 × 3 × 3000/1e6 × 1.5 = 675 GB → vps
  assert.ok(r.tier === 'vps' || r.tier === 'dedicated', `expected vps/dedicated, got ${r.tier}`);
  assert.ok(r.totalBandwidthWithBufferGB > 100);
});

// ── Hosting tier: vps (large storage) ────────────────────────────────────
test('large storage (>5 GB) = vps or dedicated tier', () => {
  const r = estimateHosting(args({
    mediaFiles: 20000, mediaFileSizeKB: 1000,
    bufferPercent: 0,
  }));
  // storage = 20000 × 1000/1e6 = 20 GB → vps
  assert.ok(r.tier === 'vps' || r.tier === 'dedicated', `expected vps/dedicated, got ${r.tier}`);
  approx(r.totalStorageRawGB, 20, 0.1);
});

// ── Hosting tier: dedicated (very high bandwidth) ─────────────────────────
test('very high bandwidth (>1000 GB) = dedicated tier', () => {
  const r = estimateHosting(args({
    monthlyVisitors: 500000, pagesPerVisit: 3, pageWeightKB: 3000,
    bufferPercent: 0,
  }));
  // bandwidth = 500000 × 3 × 3000/1e6 = 4500 GB → dedicated
  assert.equal(r.tier, 'dedicated');
});

// ── Validation ─────────────────────────────────────────────────────────────
test('rejects zero monthly visitors', () => {
  assert.throws(() => estimateHosting(args({ monthlyVisitors: 0 })), /monthlyVisitors/);
});

test('rejects zero pages per visit', () => {
  assert.throws(() => estimateHosting(args({ pagesPerVisit: 0 })), /pagesPerVisit/);
});

test('rejects zero page weight', () => {
  assert.throws(() => estimateHosting(args({ pageWeightKB: 0 })), /pageWeightKB/);
});

test('rejects negative buffer', () => {
  assert.throws(() => estimateHosting(args({ bufferPercent: -1 })), /bufferPercent/);
});
