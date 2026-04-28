const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  estimateBackupTime,
  toBytes,
  toBitsPerSecond,
} = require('./cloud-backup-time-estimator.js');

test('Mbps and GB convert correctly into a sensible duration', () => {
  // 100 GB at 100 Mbps, 100% efficiency, 0% protocol overhead reference:
  // bytes = 100 * 1e9 = 1e11 bytes; bits = 8e11; bps = 1e8.
  // raw seconds = 8000s = ~2.22 hours. With 10% protocol overhead it bumps up by ~11%.
  const r = estimateBackupTime({
    dataValue: 100,
    dataUnit: 'GB',
    speedValue: 100,
    speedUnit: 'Mbps',
    efficiency: 1.0,
    overnightOnly: false,
  });
  assert.equal(r.totalBits, 8e11);
  // effective bps = 100 Mbps * 1.0 = 1e8, with 10% overhead the effective payload bps is lower.
  // Effective payload bps = 1e8 / 1.1
  const expectedSeconds = 8e11 / (1e8 / 1.1);
  assert.ok(Math.abs(r.totalSeconds - expectedSeconds) < 1, 'expected ' + expectedSeconds + ' got ' + r.totalSeconds);
});

test('efficiency haircut increases the wall-clock time', () => {
  const full = estimateBackupTime({
    dataValue: 1, dataUnit: 'TB', speedValue: 200, speedUnit: 'Mbps', efficiency: 1.0, overnightOnly: false,
  });
  const eighty = estimateBackupTime({
    dataValue: 1, dataUnit: 'TB', speedValue: 200, speedUnit: 'Mbps', efficiency: 0.8, overnightOnly: false,
  });
  const seventy = estimateBackupTime({
    dataValue: 1, dataUnit: 'TB', speedValue: 200, speedUnit: 'Mbps', efficiency: 0.7, overnightOnly: false,
  });
  // 80% efficiency should be ~25% longer than 100% (1/0.8 = 1.25)
  assert.ok(eighty.totalSeconds > full.totalSeconds);
  assert.ok(seventy.totalSeconds > eighty.totalSeconds);
  const ratio = eighty.totalSeconds / full.totalSeconds;
  assert.ok(Math.abs(ratio - 1.25) < 0.001, 'expected ratio ~1.25, got ' + ratio);
});

test('overnight-only doubles the wall-clock days (12h vs 24h backup window)', () => {
  const continuous = estimateBackupTime({
    dataValue: 5, dataUnit: 'TB', speedValue: 100, speedUnit: 'Mbps', efficiency: 0.8, overnightOnly: false,
  });
  const overnight = estimateBackupTime({
    dataValue: 5, dataUnit: 'TB', speedValue: 100, speedUnit: 'Mbps', efficiency: 0.8, overnightOnly: true,
  });
  // overnight-only runs 12h out of 24h, so wall-clock should be exactly 2x continuous.
  const ratio = overnight.wallClockSeconds / continuous.wallClockSeconds;
  assert.ok(Math.abs(ratio - 2) < 0.0001, 'expected wall-clock ratio of 2, got ' + ratio);
});

test('Gbps converts correctly and is faster than Mbps', () => {
  const mbps = estimateBackupTime({
    dataValue: 500, dataUnit: 'GB', speedValue: 1000, speedUnit: 'Mbps', efficiency: 1.0, overnightOnly: false,
  });
  const gbps = estimateBackupTime({
    dataValue: 500, dataUnit: 'GB', speedValue: 1, speedUnit: 'Gbps', efficiency: 1.0, overnightOnly: false,
  });
  // 1 Gbps == 1000 Mbps, so the two should match exactly.
  assert.equal(mbps.totalSeconds, gbps.totalSeconds);
});

test('TB converts to 1000 GB worth of bits', () => {
  const tb = estimateBackupTime({
    dataValue: 1, dataUnit: 'TB', speedValue: 100, speedUnit: 'Mbps', efficiency: 1.0, overnightOnly: false,
  });
  const gb = estimateBackupTime({
    dataValue: 1000, dataUnit: 'GB', speedValue: 100, speedUnit: 'Mbps', efficiency: 1.0, overnightOnly: false,
  });
  assert.equal(tb.totalBits, gb.totalBits);
});

test('zero data size returns zero time', () => {
  const r = estimateBackupTime({
    dataValue: 0, dataUnit: 'GB', speedValue: 100, speedUnit: 'Mbps', efficiency: 0.8, overnightOnly: false,
  });
  assert.equal(r.totalBits, 0);
  assert.equal(r.totalSeconds, 0);
  assert.equal(r.wallClockSeconds, 0);
});

test('zero or negative speed throws a clear error', () => {
  assert.throws(() => estimateBackupTime({
    dataValue: 100, dataUnit: 'GB', speedValue: 0, speedUnit: 'Mbps', efficiency: 0.8, overnightOnly: false,
  }), /speed/i);
  assert.throws(() => estimateBackupTime({
    dataValue: 100, dataUnit: 'GB', speedValue: -10, speedUnit: 'Mbps', efficiency: 0.8, overnightOnly: false,
  }), /speed/i);
});

test('day/hour/minute breakdown sums to total seconds', () => {
  const r = estimateBackupTime({
    dataValue: 2, dataUnit: 'TB', speedValue: 50, speedUnit: 'Mbps', efficiency: 0.8, overnightOnly: false,
  });
  const sum = r.breakdown.days * 86400 + r.breakdown.hours * 3600 + r.breakdown.minutes * 60 + r.breakdown.seconds;
  // Allow 1 second of rounding slack.
  assert.ok(Math.abs(sum - Math.round(r.wallClockSeconds)) <= 1);
});

test('toBytes converts GB and TB using decimal SI (1000-based)', () => {
  assert.equal(toBytes(1, 'GB'), 1e9);
  assert.equal(toBytes(1, 'TB'), 1e12);
  assert.equal(toBytes(2.5, 'GB'), 2.5e9);
});

test('toBitsPerSecond converts Mbps and Gbps', () => {
  assert.equal(toBitsPerSecond(100, 'Mbps'), 1e8);
  assert.equal(toBitsPerSecond(1, 'Gbps'), 1e9);
});

test('invalid units throw', () => {
  assert.throws(() => estimateBackupTime({
    dataValue: 100, dataUnit: 'KB', speedValue: 100, speedUnit: 'Mbps', efficiency: 0.8, overnightOnly: false,
  }));
  assert.throws(() => estimateBackupTime({
    dataValue: 100, dataUnit: 'GB', speedValue: 100, speedUnit: 'kbps', efficiency: 0.8, overnightOnly: false,
  }));
});
