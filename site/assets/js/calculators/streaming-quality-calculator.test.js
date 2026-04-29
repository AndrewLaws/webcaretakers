const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateStreamingQuality,
  getBitrateForTier,
  TIERS,
  SERVICES,
} = require('./streaming-quality-calculator.js');

test('Netflix 4K HDR per-stream bitrate is around 25 Mbps', () => {
  const r = evaluateStreamingQuality({
    linkSpeed: 200,
    concurrent: 1,
    service: 'netflix',
    targetQuality: '4k-hdr',
    headroom: 20,
  });
  assert.equal(r.perStreamMbps, 25);
});

test('Netflix 4K Dolby Vision per-stream bitrate is around 40 Mbps', () => {
  const r = evaluateStreamingQuality({
    linkSpeed: 500,
    concurrent: 1,
    service: 'netflix',
    targetQuality: '4k-dv',
    headroom: 20,
  });
  assert.equal(r.perStreamMbps, 40);
});

test('total demand is per-stream times concurrent streams', () => {
  const r = evaluateStreamingQuality({
    linkSpeed: 200,
    concurrent: 3,
    service: 'netflix',
    targetQuality: '1080p',
    headroom: 20,
  });
  assert.equal(r.totalDemandMbps, r.perStreamMbps * 3);
});

test('headroom reduces the usable speed and surplus reflects it', () => {
  const r = evaluateStreamingQuality({
    linkSpeed: 100,
    concurrent: 1,
    service: 'netflix',
    targetQuality: '1080p',
    headroom: 20,
  });
  // 100 Mbps with 20% headroom => 80 Mbps usable.
  assert.equal(r.usableMbps, 80);
  // 1080p Netflix is ~8 Mbps per stream.
  assert.equal(r.surplusMbps, 80 - 8);
});

test('verdict is Comfortable when usable is well above demand', () => {
  const r = evaluateStreamingQuality({
    linkSpeed: 1000,
    concurrent: 2,
    service: 'netflix',
    targetQuality: '1080p',
    headroom: 20,
  });
  assert.equal(r.verdict, 'Comfortable');
});

test('verdict is Insufficient when demand exceeds usable', () => {
  const r = evaluateStreamingQuality({
    linkSpeed: 30,
    concurrent: 2,
    service: 'netflix',
    targetQuality: '4k-hdr',
    headroom: 20,
  });
  // 30 Mbps with 20% headroom = 24 usable; 2x 25 = 50 demand. Deficit.
  assert.equal(r.verdict, 'Insufficient');
  assert.ok(r.surplusMbps < 0);
});

test('verdict is Tight when demand is close to usable but not over', () => {
  const r = evaluateStreamingQuality({
    linkSpeed: 60,
    concurrent: 2,
    service: 'netflix',
    targetQuality: '1080p',
    headroom: 20,
  });
  // usable = 48, demand = 16, surplus = 32. Comfortable here, not Tight.
  assert.equal(r.verdict, 'Comfortable');

  const tight = evaluateStreamingQuality({
    linkSpeed: 25,
    concurrent: 1,
    service: 'netflix',
    targetQuality: '4k-hdr',
    headroom: 20,
  });
  // usable = 20, demand = 25 => Insufficient. Try slightly above.
  const tight2 = evaluateStreamingQuality({
    linkSpeed: 35,
    concurrent: 1,
    service: 'netflix',
    targetQuality: '4k-hdr',
    headroom: 20,
  });
  // usable = 28, demand = 25 => surplus 3, Tight.
  assert.equal(tight2.verdict, 'Tight');
});

test('best tier reflects the highest sustainable quality at the chosen concurrency', () => {
  const r = evaluateStreamingQuality({
    linkSpeed: 50,
    concurrent: 2,
    service: 'netflix',
    targetQuality: '4k-hdr',
    headroom: 20,
  });
  // usable = 40 Mbps, 2 streams => 20 Mbps per stream cap.
  // 1080p (8) fits, 4k-hdr (25) does not. Best tier = 1080p.
  assert.equal(r.bestTier, '1080p');
});

test('best tier returns null when even SD does not fit', () => {
  const r = evaluateStreamingQuality({
    linkSpeed: 4,
    concurrent: 4,
    service: 'netflix',
    targetQuality: '480p',
    headroom: 20,
  });
  // usable ~3.2 Mbps, 4 streams => 0.8 Mbps each, less than SD 3 Mbps.
  assert.equal(r.bestTier, null);
});

test('service ladder differs: YouTube 4K HDR is lower than Netflix 4K HDR', () => {
  const yt = getBitrateForTier('youtube', '4k-hdr');
  const nf = getBitrateForTier('netflix', '4k-hdr');
  assert.ok(yt < nf, 'YouTube 4K HDR should be lower than Netflix 4K HDR');
});

test('zero or negative link speed throws', () => {
  assert.throws(() => evaluateStreamingQuality({
    linkSpeed: 0, concurrent: 1, service: 'netflix', targetQuality: '1080p', headroom: 20,
  }), /link/i);
});

test('concurrent must be at least 1', () => {
  assert.throws(() => evaluateStreamingQuality({
    linkSpeed: 100, concurrent: 0, service: 'netflix', targetQuality: '1080p', headroom: 20,
  }), /concurrent/i);
});

test('headroom outside 0-90 throws', () => {
  assert.throws(() => evaluateStreamingQuality({
    linkSpeed: 100, concurrent: 1, service: 'netflix', targetQuality: '1080p', headroom: 95,
  }), /headroom/i);
});

test('unknown service throws', () => {
  assert.throws(() => evaluateStreamingQuality({
    linkSpeed: 100, concurrent: 1, service: 'spotify', targetQuality: '1080p', headroom: 20,
  }));
});

test('TIERS and SERVICES are exposed for the UI', () => {
  assert.ok(Array.isArray(TIERS));
  assert.ok(TIERS.length >= 5);
  assert.ok(SERVICES.netflix);
  assert.ok(SERVICES['disney-plus']);
  assert.ok(SERVICES['prime-video']);
  assert.ok(SERVICES.youtube);
  assert.ok(SERVICES.generic);
});
