(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VpnThroughputCalculator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  // Per-packet protocol overhead in bytes. Figures are the realistic worst-case header stack
  // each packet carries: outer IPv4/IPv6 + transport (UDP/TCP) + the protocol's own framing.
  // WireGuard 60 (IP+UDP+WG header+auth tag), IPsec/IKEv2 ~73 (ESP+UDP encap+IV+ICV),
  // OpenVPN-UDP ~78, OpenVPN-TCP ~94 (extra TCP header overhead), L2TP/IPsec ~85 (PPP+L2TP+ESP).
  var PROTOCOL_OVERHEAD_BYTES = {
    'WireGuard': 60,
    'IPsec/IKEv2': 73,
    'OpenVPN-UDP': 78,
    'OpenVPN-TCP': 94,
    'L2TP/IPsec': 85,
  };

  // Approximate sustained encryption throughput in Mbps by CPU class and cipher.
  // Low: cheap router or old phone, no AES-NI. ChaCha20 wins easily.
  // Mid: modern phone or laptop, AES-NI present but not screaming.
  // High: desktop CPU with AES-NI, or a server-class router. AES-GCM wins.
  // These are realistic single-tunnel sustained figures, not synthetic benchmark peaks.
  var CIPHER_CPU_MBPS = {
    low: {
      'AES-128-GCM': 100,
      'AES-256-GCM': 80,
      'ChaCha20-Poly1305': 250,
      'AES-256-CBC': 60,
    },
    mid: {
      'AES-128-GCM': 600,
      'AES-256-GCM': 500,
      'ChaCha20-Poly1305': 700,
      'AES-256-CBC': 250,
    },
    high: {
      'AES-128-GCM': 3000,
      'AES-256-GCM': 2500,
      'ChaCha20-Poly1305': 2000,
      'AES-256-CBC': 1200,
    },
  };

  // Protocol implementation efficiency multiplier on top of raw cipher throughput.
  // WireGuard runs in-kernel and is small enough to JIT well. OpenVPN is userspace and largely
  // single-threaded, so it pays a real penalty. IPsec is in-kernel on most platforms.
  // L2TP/IPsec wraps IPsec around L2TP, which adds a touch of overhead.
  var PROTOCOL_CPU_MULTIPLIER = {
    'WireGuard': 1.20,
    'IPsec/IKEv2': 1.10,
    'OpenVPN-UDP': 0.75,
    'OpenVPN-TCP': 0.65,
    'L2TP/IPsec': 0.90,
  };

  // Round-trip time buckets in milliseconds. Realistic ballpark figures, not measured.
  var RTT_MS = {
    'same-country': 15,
    'same-continent': 40,
    'transcontinental': 140,
  };

  // VPN tunnel adds its own latency overhead on top of the underlying RTT: encryption,
  // queueing on the VPN endpoint, the extra hop. ~5ms is a reasonable round figure.
  var VPN_LATENCY_OVERHEAD_MS = 5;

  // Default TCP receive window for the OpenVPN-TCP RTT cap. 128 KB is a realistic figure for
  // a window-scaled TCP session through an OpenVPN-TCP tunnel: bigger than the unscaled 64 KB
  // ceiling, but well short of what a modern fat-pipe stack would advertise on the bare network.
  // Long-RTT tunnels frequently sit at this ceiling because the inner TCP can't scale cleanly
  // through the outer encrypted stream, which is one of the standing arguments for UDP-based VPNs.
  var DEFAULT_TCP_WINDOW_BYTES = 131072;

  function isTcp(protocol) {
    return protocol === 'OpenVPN-TCP';
  }

  function estimateVpnThroughput(input) {
    var linkSpeed = Number(input.linkSpeed);
    var protocol = input.protocol;
    var cipher = input.cipher;
    var cpuClass = input.cpuClass;
    var mtu = input.mtu == null ? 1500 : Number(input.mtu);
    var serverDistance = input.serverDistance;

    if (!Number.isFinite(linkSpeed) || linkSpeed <= 0) {
      throw new Error('Link speed must be greater than zero.');
    }
    if (!(protocol in PROTOCOL_OVERHEAD_BYTES)) {
      throw new Error('Unknown protocol: ' + protocol);
    }
    if (!CIPHER_CPU_MBPS[cpuClass]) {
      throw new Error('Unknown CPU class: ' + cpuClass);
    }
    if (!(cipher in CIPHER_CPU_MBPS[cpuClass])) {
      throw new Error('Unknown cipher: ' + cipher);
    }
    if (!(serverDistance in RTT_MS)) {
      throw new Error('Unknown server distance: ' + serverDistance);
    }
    var overheadBytes = PROTOCOL_OVERHEAD_BYTES[protocol];
    if (!Number.isFinite(mtu) || mtu <= overheadBytes) {
      throw new Error('MTU must be larger than the protocol overhead (' + overheadBytes + ' bytes).');
    }

    var effectiveMtu = mtu - overheadBytes;
    // Payload efficiency: how much of every packet is actual user data vs framing.
    var payloadEfficiency = effectiveMtu / mtu;

    // Encryption ceiling for this CPU + cipher + protocol combination.
    var rawCipherMbps = CIPHER_CPU_MBPS[cpuClass][cipher];
    var protocolMultiplier = PROTOCOL_CPU_MULTIPLIER[protocol];
    var encryptionCapMbps = rawCipherMbps * protocolMultiplier;

    // Link ceiling after stripping per-packet overhead from the user's payload.
    var linkPayloadCapMbps = linkSpeed * payloadEfficiency;

    // Underlying RTT plus VPN overhead.
    var rttMs = RTT_MS[serverDistance];
    var totalLatencyMs = rttMs + VPN_LATENCY_OVERHEAD_MS;

    // TCP receive-window cap, only meaningful for OpenVPN over TCP. UDP-based protocols
    // are not subject to this because they don't carry an outer reliable stream.
    var tcpCapMbps = Infinity;
    if (isTcp(protocol)) {
      // throughput (bps) = window (bytes) * 8 / RTT (s); convert RTT ms to seconds.
      var capBps = (DEFAULT_TCP_WINDOW_BYTES * 8) / (totalLatencyMs / 1000);
      tcpCapMbps = capBps / 1e6;
    }

    // The actual throughput is the smallest ceiling.
    var throughputMbps = Math.min(linkPayloadCapMbps, encryptionCapMbps, tcpCapMbps);

    var bottleneck;
    if (throughputMbps === tcpCapMbps && isTcp(protocol)) {
      bottleneck = 'rtt-bound';
    } else if (throughputMbps === encryptionCapMbps && encryptionCapMbps <= linkPayloadCapMbps) {
      bottleneck = 'encryption-bound';
    } else {
      bottleneck = 'link-bound';
    }

    var percentOfLink = (throughputMbps / linkSpeed) * 100;

    return {
      linkSpeed: linkSpeed,
      protocol: protocol,
      cipher: cipher,
      cpuClass: cpuClass,
      mtu: mtu,
      effectiveMtu: effectiveMtu,
      payloadEfficiency: payloadEfficiency,
      overheadBytes: overheadBytes,
      encryptionCapMbps: encryptionCapMbps,
      linkPayloadCapMbps: linkPayloadCapMbps,
      tcpCapMbps: tcpCapMbps === Infinity ? null : tcpCapMbps,
      latencyMs: rttMs,
      totalLatencyMs: totalLatencyMs,
      throughputMbps: throughputMbps,
      percentOfLink: percentOfLink,
      bottleneck: bottleneck,
    };
  }

  return {
    estimateVpnThroughput: estimateVpnThroughput,
    PROTOCOL_OVERHEAD_BYTES: PROTOCOL_OVERHEAD_BYTES,
    PROTOCOL_CPU_MULTIPLIER: PROTOCOL_CPU_MULTIPLIER,
    CIPHER_CPU_MBPS: CIPHER_CPU_MBPS,
    RTT_MS: RTT_MS,
    DEFAULT_TCP_WINDOW_BYTES: DEFAULT_TCP_WINDOW_BYTES,
  };
}));
