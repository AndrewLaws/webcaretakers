const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  assessLatency,
  tcpThroughputMbps,
  qualityScore,
  USE_CASES,
} = require('./latency-impact-calculator.js');

test('TCP-window throughput formula: window / RTT (Mathis-lite)', () => {
  // 64 KB window, 100 ms RTT => 64 * 1024 * 8 / 0.1 = 5,242,880 bps = 5.24288 Mbps.
  const cap = tcpThroughputMbps({ tcpWindowKB: 64, rttMs: 100 });
  assert.ok(Math.abs(cap - 5.24288) < 0.001, 'expected ~5.24 Mbps, got ' + cap);
});

test('TCP cap is bounded by the link speed', () => {
  // 64 KB / 1 ms RTT would be ~524 Mbps, but link is 100 Mbps.
  const cap = tcpThroughputMbps({ tcpWindowKB: 64, rttMs: 1, linkSpeedMbps: 100 });
  assert.equal(cap, 100);
});

test('TCP cap returns Infinity-style large number with zero RTT guarded', () => {
  // RTT of 0 should not divide by zero. Should fall back to the link speed cap or a sentinel.
  const cap = tcpThroughputMbps({ tcpWindowKB: 64, rttMs: 0, linkSpeedMbps: 100 });
  assert.equal(cap, 100);
});

test('FPS gaming: low ping, low jitter, no loss => Excellent', () => {
  const r = assessLatency({
    rtt: 15, jitter: 2, packetLoss: 0, useCase: 'fps-gaming', linkSpeed: 100, tcpWindow: 64,
  });
  assert.equal(r.verdict, 'Excellent');
  assert.ok(r.score >= 90, 'score >= 90, got ' + r.score);
});

test('FPS gaming: 90 ms ping is borderline (Playable or Poor)', () => {
  const r = assessLatency({
    rtt: 90, jitter: 5, packetLoss: 0, useCase: 'fps-gaming', linkSpeed: 100, tcpWindow: 64,
  });
  assert.ok(['Playable', 'Poor'].includes(r.verdict), 'got ' + r.verdict);
  assert.ok(r.reasons.some((s) => /RTT|ping|latency/i.test(s)));
});

test('FPS gaming: 200 ms ping is Unusable', () => {
  const r = assessLatency({
    rtt: 200, jitter: 5, packetLoss: 0, useCase: 'fps-gaming', linkSpeed: 100, tcpWindow: 64,
  });
  assert.equal(r.verdict, 'Unusable');
});

test('Cloud gaming: tighter than FPS, 80 ms is already Poor', () => {
  const r = assessLatency({
    rtt: 80, jitter: 5, packetLoss: 0, useCase: 'cloud-gaming', linkSpeed: 100, tcpWindow: 64,
  });
  assert.ok(['Poor', 'Unusable'].includes(r.verdict));
});

test('MMO gaming: tolerates higher RTT than FPS, 120 ms is still Playable', () => {
  const r = assessLatency({
    rtt: 120, jitter: 10, packetLoss: 0, useCase: 'mmo-gaming', linkSpeed: 100, tcpWindow: 64,
  });
  assert.ok(['Good', 'Playable'].includes(r.verdict), 'got ' + r.verdict);
});

test('Video call: 30 ms jitter triggers an audio dropout reason', () => {
  const r = assessLatency({
    rtt: 50, jitter: 35, packetLoss: 0.5, useCase: 'video-call', linkSpeed: 100, tcpWindow: 64,
  });
  assert.ok(r.reasons.some((s) => /jitter/i.test(s)));
  assert.ok(['Poor', 'Unusable', 'Playable'].includes(r.verdict));
});

test('Video call: 2% packet loss is bad news', () => {
  const r = assessLatency({
    rtt: 50, jitter: 5, packetLoss: 2, useCase: 'video-call', linkSpeed: 100, tcpWindow: 64,
  });
  assert.ok(r.reasons.some((s) => /loss/i.test(s)));
  assert.ok(['Poor', 'Unusable'].includes(r.verdict));
});

test('Web browsing: throughput cap reflects RTT (Mathis-lite)', () => {
  const r = assessLatency({
    rtt: 200, jitter: 5, packetLoss: 0, useCase: 'web-browsing', linkSpeed: 1000, tcpWindow: 64,
  });
  // 64 KB / 200 ms = ~2.62 Mbps. Far below the 1 Gbps link.
  assert.ok(Math.abs(r.tcpCapMbps - 2.62144) < 0.01, 'got ' + r.tcpCapMbps);
  assert.ok(r.reasons.some((s) => /TCP|throughput|window/i.test(s)));
});

test('Web browsing: low RTT and big link gives Excellent', () => {
  const r = assessLatency({
    rtt: 10, jitter: 1, packetLoss: 0, useCase: 'web-browsing', linkSpeed: 100, tcpWindow: 64,
  });
  assert.equal(r.verdict, 'Excellent');
});

test('SSH/remote desktop: very sensitive to jitter, 25 ms jitter is Poor', () => {
  const r = assessLatency({
    rtt: 60, jitter: 25, packetLoss: 0, useCase: 'ssh-remote-desktop', linkSpeed: 100, tcpWindow: 64,
  });
  assert.ok(['Poor', 'Unusable'].includes(r.verdict));
});

test('Quality score is 0-100 and decreases monotonically with worse inputs', () => {
  const a = assessLatency({ rtt: 20, jitter: 2, packetLoss: 0, useCase: 'fps-gaming', linkSpeed: 100, tcpWindow: 64 });
  const b = assessLatency({ rtt: 60, jitter: 8, packetLoss: 0.5, useCase: 'fps-gaming', linkSpeed: 100, tcpWindow: 64 });
  const c = assessLatency({ rtt: 150, jitter: 30, packetLoss: 3, useCase: 'fps-gaming', linkSpeed: 100, tcpWindow: 64 });
  assert.ok(a.score >= b.score);
  assert.ok(b.score >= c.score);
  for (const r of [a, b, c]) {
    assert.ok(r.score >= 0 && r.score <= 100, 'score in range, got ' + r.score);
  }
});

test('qualityScore is a pure 0-100 helper', () => {
  const s = qualityScore({ rtt: 20, jitter: 2, packetLoss: 0, useCase: 'fps-gaming' });
  assert.ok(s >= 0 && s <= 100);
});

test('Unknown use case throws', () => {
  assert.throws(() => assessLatency({
    rtt: 20, jitter: 2, packetLoss: 0, useCase: 'badminton', linkSpeed: 100, tcpWindow: 64,
  }), /use case|useCase/i);
});

test('Negative RTT throws', () => {
  assert.throws(() => assessLatency({
    rtt: -5, jitter: 2, packetLoss: 0, useCase: 'fps-gaming', linkSpeed: 100, tcpWindow: 64,
  }), /RTT|ping/i);
});

test('Packet loss above 100 throws', () => {
  assert.throws(() => assessLatency({
    rtt: 20, jitter: 2, packetLoss: 150, useCase: 'fps-gaming', linkSpeed: 100, tcpWindow: 64,
  }), /loss/i);
});

test('USE_CASES export covers the six target use cases', () => {
  const slugs = USE_CASES.map((u) => u.slug);
  assert.ok(slugs.includes('cloud-gaming'));
  assert.ok(slugs.includes('fps-gaming'));
  assert.ok(slugs.includes('mmo-gaming'));
  assert.ok(slugs.includes('video-call'));
  assert.ok(slugs.includes('web-browsing'));
  assert.ok(slugs.includes('ssh-remote-desktop'));
});

test('Reasons array is empty (or only positives) for ideal inputs', () => {
  const r = assessLatency({ rtt: 5, jitter: 1, packetLoss: 0, useCase: 'fps-gaming', linkSpeed: 1000, tcpWindow: 64 });
  // No negative reasons should fire when everything is ideal.
  const negatives = r.reasons.filter((s) => /borderline|too high|dropout|loss|poor|unusable/i.test(s));
  assert.equal(negatives.length, 0, 'unexpected negative reasons: ' + JSON.stringify(r.reasons));
});
