const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  estimateVpnThroughput,
  PROTOCOL_OVERHEAD_BYTES,
  CIPHER_CPU_MBPS,
  RTT_MS,
} = require('./vpn-throughput-calculator.js');

const baseInput = {
  linkSpeed: 100,
  protocol: 'WireGuard',
  cipher: 'ChaCha20-Poly1305',
  cpuClass: 'mid',
  mtu: 1500,
  serverDistance: 'same-country',
};

test('protocol overhead bytes match published per-packet figures', () => {
  assert.equal(PROTOCOL_OVERHEAD_BYTES.WireGuard, 60);
  assert.equal(PROTOCOL_OVERHEAD_BYTES['IPsec/IKEv2'], 73);
  assert.equal(PROTOCOL_OVERHEAD_BYTES['OpenVPN-UDP'], 78);
  assert.equal(PROTOCOL_OVERHEAD_BYTES['OpenVPN-TCP'], 94);
  assert.equal(PROTOCOL_OVERHEAD_BYTES['L2TP/IPsec'], 85);
});

test('effective MTU is MTU minus protocol overhead', () => {
  const r = estimateVpnThroughput(Object.assign({}, baseInput, { protocol: 'WireGuard', mtu: 1500 }));
  assert.equal(r.effectiveMtu, 1500 - 60);
  const r2 = estimateVpnThroughput(Object.assign({}, baseInput, { protocol: 'OpenVPN-TCP', mtu: 1500 }));
  assert.equal(r2.effectiveMtu, 1500 - 94);
});

test('low CPU class caps OpenVPN-TCP throughput well below a fast link', () => {
  // 1 Gbps link, low CPU, OpenVPN-TCP, AES-256-CBC: encryption-bound by a wide margin.
  const r = estimateVpnThroughput({
    linkSpeed: 1000,
    protocol: 'OpenVPN-TCP',
    cipher: 'AES-256-CBC',
    cpuClass: 'low',
    mtu: 1500,
    serverDistance: 'same-country',
  });
  assert.equal(r.bottleneck, 'encryption-bound');
  assert.ok(r.throughputMbps < 100, 'expected throughput well below the link');
});

test('high CPU class with AES-NI lets WireGuard hit close to a fast link', () => {
  const r = estimateVpnThroughput({
    linkSpeed: 1000,
    protocol: 'WireGuard',
    cipher: 'AES-256-GCM',
    cpuClass: 'high',
    mtu: 1500,
    serverDistance: 'same-country',
  });
  assert.equal(r.bottleneck, 'link-bound');
  assert.ok(r.throughputMbps > 800, 'high-CPU WireGuard should be link-bound near 1 Gbps');
});

test('OpenVPN-TCP on a transcontinental RTT is RTT-bound (TCP receive window cap)', () => {
  // 1 Gbps link, high CPU, transcontinental ~120ms RTT.
  // Default 64 KB receive window: cap = 65536 bytes * 8 / 0.120s = ~4.37 Mbps.
  const r = estimateVpnThroughput({
    linkSpeed: 1000,
    protocol: 'OpenVPN-TCP',
    cipher: 'AES-128-GCM',
    cpuClass: 'high',
    mtu: 1500,
    serverDistance: 'transcontinental',
  });
  assert.equal(r.bottleneck, 'rtt-bound');
  assert.ok(r.throughputMbps < 10, 'TCP RTT cap should crater throughput');
  assert.ok(r.throughputMbps > 3, 'but it should still be ~4 Mbps, not zero');
});

test('UDP-based protocols are not subject to the TCP receive-window cap', () => {
  // Same scenario but OpenVPN-UDP: should be link-bound or encryption-bound, never rtt-bound.
  const r = estimateVpnThroughput({
    linkSpeed: 100,
    protocol: 'OpenVPN-UDP',
    cipher: 'AES-128-GCM',
    cpuClass: 'high',
    mtu: 1500,
    serverDistance: 'transcontinental',
  });
  assert.notEqual(r.bottleneck, 'rtt-bound');
});

test('latency overhead matches the chosen distance bucket', () => {
  const near = estimateVpnThroughput(Object.assign({}, baseInput, { serverDistance: 'same-country' }));
  const mid = estimateVpnThroughput(Object.assign({}, baseInput, { serverDistance: 'same-continent' }));
  const far = estimateVpnThroughput(Object.assign({}, baseInput, { serverDistance: 'transcontinental' }));
  assert.equal(near.latencyMs, RTT_MS['same-country']);
  assert.equal(mid.latencyMs, RTT_MS['same-continent']);
  assert.equal(far.latencyMs, RTT_MS['transcontinental']);
  assert.ok(far.latencyMs > mid.latencyMs && mid.latencyMs > near.latencyMs);
});

test('throughput percent of raw link is between 0 and 100', () => {
  const r = estimateVpnThroughput(baseInput);
  assert.ok(r.percentOfLink > 0 && r.percentOfLink <= 100);
});

test('link-bound case reports the link as the bottleneck', () => {
  // Very slow link, high CPU, WireGuard: nothing else can be the bottleneck.
  const r = estimateVpnThroughput({
    linkSpeed: 10,
    protocol: 'WireGuard',
    cipher: 'ChaCha20-Poly1305',
    cpuClass: 'high',
    mtu: 1500,
    serverDistance: 'same-country',
  });
  assert.equal(r.bottleneck, 'link-bound');
  assert.ok(r.throughputMbps <= 10);
});

test('CIPHER_CPU_MBPS table has every cpu class and cipher combination', () => {
  const classes = ['low', 'mid', 'high'];
  const ciphers = ['AES-128-GCM', 'AES-256-GCM', 'ChaCha20-Poly1305', 'AES-256-CBC'];
  for (const c of classes) {
    for (const ci of ciphers) {
      assert.ok(CIPHER_CPU_MBPS[c][ci] > 0, c + '/' + ci + ' missing');
    }
  }
});

test('low CPU prefers ChaCha20 over AES on a non-AES-NI device', () => {
  // ChaCha20 should beat AES-256-GCM on a low-CPU device (the whole reason ChaCha exists).
  assert.ok(CIPHER_CPU_MBPS.low['ChaCha20-Poly1305'] > CIPHER_CPU_MBPS.low['AES-256-GCM']);
});

test('high CPU prefers AES (AES-NI) over ChaCha20', () => {
  assert.ok(CIPHER_CPU_MBPS.high['AES-256-GCM'] > CIPHER_CPU_MBPS.high['ChaCha20-Poly1305']);
});

test('zero or negative link speed throws', () => {
  assert.throws(() => estimateVpnThroughput(Object.assign({}, baseInput, { linkSpeed: 0 })), /link/i);
  assert.throws(() => estimateVpnThroughput(Object.assign({}, baseInput, { linkSpeed: -10 })), /link/i);
});

test('unknown protocol throws', () => {
  assert.throws(() => estimateVpnThroughput(Object.assign({}, baseInput, { protocol: 'PPTP' })));
});

test('unknown cipher throws', () => {
  assert.throws(() => estimateVpnThroughput(Object.assign({}, baseInput, { cipher: 'DES' })));
});

test('MTU smaller than protocol overhead throws', () => {
  assert.throws(() => estimateVpnThroughput(Object.assign({}, baseInput, { mtu: 50 })), /mtu/i);
});

test('default MTU of 1500 is applied when omitted', () => {
  const r = estimateVpnThroughput({
    linkSpeed: 100,
    protocol: 'WireGuard',
    cipher: 'ChaCha20-Poly1305',
    cpuClass: 'mid',
    serverDistance: 'same-country',
  });
  assert.equal(r.mtu, 1500);
});
