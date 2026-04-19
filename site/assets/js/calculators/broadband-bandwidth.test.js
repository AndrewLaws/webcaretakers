const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateBandwidth } = require('./broadband-bandwidth.js');

test('single user, HD streaming only, no other use', () => {
  const r = calculateBandwidth({
    users: 1,
    streaming: 'hd',
    videoCalls: 'none',
    gaming: false,
    smartDevices: 0,
    workFromHome: false,
  });
  assert.ok(r.downloadMbps >= 5);
  assert.ok(r.downloadMbps <= 15);
  assert.ok(r.uploadMbps <= 5);
});

test('4K streaming scales with users', () => {
  const one = calculateBandwidth({
    users: 1, streaming: '4k', videoCalls: 'none', gaming: false, smartDevices: 0, workFromHome: false,
  });
  const four = calculateBandwidth({
    users: 4, streaming: '4k', videoCalls: 'none', gaming: false, smartDevices: 0, workFromHome: false,
  });
  assert.ok(four.downloadMbps >= one.downloadMbps * 3);
});

test('video calls lift upload demand', () => {
  const none = calculateBandwidth({
    users: 1, streaming: 'none', videoCalls: 'none', gaming: false, smartDevices: 0, workFromHome: false,
  });
  const daily = calculateBandwidth({
    users: 1, streaming: 'none', videoCalls: 'daily', gaming: false, smartDevices: 0, workFromHome: false,
  });
  assert.ok(daily.uploadMbps > none.uploadMbps);
});

test('working from home bumps both download and upload', () => {
  const off = calculateBandwidth({
    users: 1, streaming: 'none', videoCalls: 'none', gaming: false, smartDevices: 0, workFromHome: false,
  });
  const on = calculateBandwidth({
    users: 1, streaming: 'none', videoCalls: 'none', gaming: false, smartDevices: 0, workFromHome: true,
  });
  assert.ok(on.downloadMbps > off.downloadMbps);
  assert.ok(on.uploadMbps > off.uploadMbps);
});

test('smart devices add to download demand', () => {
  const zero = calculateBandwidth({
    users: 1, streaming: 'none', videoCalls: 'none', gaming: false, smartDevices: 0, workFromHome: false,
  });
  const ten = calculateBandwidth({
    users: 1, streaming: 'none', videoCalls: 'none', gaming: false, smartDevices: 10, workFromHome: false,
  });
  assert.ok(ten.downloadMbps > zero.downloadMbps);
});

test('tier label reflects download band', () => {
  const entry = calculateBandwidth({
    users: 1, streaming: 'sd', videoCalls: 'none', gaming: false, smartDevices: 0, workFromHome: false,
  });
  assert.match(entry.tier, /entry/i);

  const heavy = calculateBandwidth({
    users: 5, streaming: '4k', videoCalls: 'daily', gaming: true, smartDevices: 15, workFromHome: true,
  });
  assert.match(heavy.tier, /full fibre|ultrafast/i);
});

test('result always includes a 20% headroom buffer', () => {
  const r = calculateBandwidth({
    users: 2, streaming: 'hd', videoCalls: 'none', gaming: false, smartDevices: 0, workFromHome: false,
  });
  // Raw = 2 * 5 = 10. With 20% headroom = 12. Rounded up to 15.
  assert.ok(r.downloadMbps >= 12);
});

test('invalid streaming quality throws', () => {
  assert.throws(() => calculateBandwidth({
    users: 1, streaming: 'ultra-mega', videoCalls: 'none', gaming: false, smartDevices: 0, workFromHome: false,
  }));
});

test('users must be at least 1', () => {
  assert.throws(() => calculateBandwidth({
    users: 0, streaming: 'hd', videoCalls: 'none', gaming: false, smartDevices: 0, workFromHome: false,
  }));
});
