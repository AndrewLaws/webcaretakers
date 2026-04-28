(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LatencyImpactCalculator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  // Per-use-case thresholds for RTT (ms), jitter (ms) and packet loss (%).
  // The four numbers in each band are the upper edge of Excellent, Good, Playable, Poor.
  // Anything beyond the Poor edge is Unusable.
  var USE_CASES = [
    {
      slug: 'cloud-gaming',
      name: 'Cloud gaming',
      rtt:    { excellent: 20,  good: 35,  playable: 60,  poor: 80  },
      jitter: { excellent: 3,   good: 8,   playable: 15,  poor: 25  },
      loss:   { excellent: 0.1, good: 0.3, playable: 0.7, poor: 1.5 },
    },
    {
      slug: 'fps-gaming',
      name: 'Competitive FPS / online gaming',
      rtt:    { excellent: 30,  good: 50,  playable: 80,  poor: 120 },
      jitter: { excellent: 5,   good: 10,  playable: 20,  poor: 35  },
      loss:   { excellent: 0.2, good: 0.5, playable: 1,   poor: 2   },
    },
    {
      slug: 'mmo-gaming',
      name: 'MMO / casual online gaming',
      rtt:    { excellent: 60,  good: 100, playable: 150, poor: 250 },
      jitter: { excellent: 10,  good: 20,  playable: 35,  poor: 60  },
      loss:   { excellent: 0.5, good: 1,   playable: 2,   poor: 4   },
    },
    {
      slug: 'video-call',
      name: 'Video call (Zoom, Teams, Meet)',
      rtt:    { excellent: 50,  good: 100, playable: 150, poor: 250 },
      jitter: { excellent: 10,  good: 20,  playable: 30,  poor: 50  },
      loss:   { excellent: 0.3, good: 1,   playable: 1.5, poor: 3   },
    },
    {
      slug: 'web-browsing',
      name: 'Web browsing',
      rtt:    { excellent: 50,  good: 100, playable: 200, poor: 400 },
      jitter: { excellent: 30,  good: 60,  playable: 120, poor: 250 },
      loss:   { excellent: 0.5, good: 1,   playable: 3,   poor: 6   },
    },
    {
      slug: 'ssh-remote-desktop',
      name: 'SSH and remote desktop',
      rtt:    { excellent: 30,  good: 60,  playable: 100, poor: 180 },
      jitter: { excellent: 5,   good: 12,  playable: 20,  poor: 40  },
      loss:   { excellent: 0.1, good: 0.5, playable: 1,   poor: 3   },
    },
  ];

  var VERDICTS = ['Excellent', 'Good', 'Playable', 'Poor', 'Unusable'];

  function findUseCase(slug) {
    for (var i = 0; i < USE_CASES.length; i++) {
      if (USE_CASES[i].slug === slug) return USE_CASES[i];
    }
    throw new Error('Unknown use case: ' + slug);
  }

  // Map a metric value to a band index 0..4 using the use case's thresholds.
  // 0 = Excellent, 4 = Unusable.
  function bandIndex(value, thresholds) {
    if (value <= thresholds.excellent) return 0;
    if (value <= thresholds.good) return 1;
    if (value <= thresholds.playable) return 2;
    if (value <= thresholds.poor) return 3;
    return 4;
  }

  // TCP-window throughput cap. Window in KB, RTT in ms, output in Mbps.
  // Mathis-lite: max throughput = window / RTT, ignoring loss.
  // Bounded by the link speed when supplied.
  function tcpThroughputMbps(opts) {
    var windowBytes = (Number(opts.tcpWindowKB) || 64) * 1024;
    var rttMs = Number(opts.rttMs);
    var linkMbps = Number(opts.linkSpeedMbps);
    var cap;
    if (!Number.isFinite(rttMs) || rttMs <= 0) {
      cap = Number.isFinite(linkMbps) && linkMbps > 0 ? linkMbps : Infinity;
    } else {
      var rttSeconds = rttMs / 1000;
      var bps = (windowBytes * 8) / rttSeconds;
      cap = bps / 1e6;
    }
    if (Number.isFinite(linkMbps) && linkMbps > 0 && cap > linkMbps) {
      cap = linkMbps;
    }
    return cap;
  }

  // Pure quality score 0-100 based on the worst band across rtt/jitter/loss for the use case.
  function qualityScore(input) {
    var uc = findUseCase(input.useCase);
    var rttBand = bandIndex(Number(input.rtt), uc.rtt);
    var jitterBand = bandIndex(Number(input.jitter), uc.jitter);
    var lossBand = bandIndex(Number(input.packetLoss), uc.loss);

    // Score per band: 0 -> 100, 1 -> 80, 2 -> 60, 3 -> 35, 4 -> 10.
    var bandScores = [100, 80, 60, 35, 10];
    var rttScore = bandScores[rttBand];
    var jitterScore = bandScores[jitterBand];
    var lossScore = bandScores[lossBand];

    // Weighted average. RTT and loss matter most for real-time, jitter close behind.
    var score = (rttScore * 0.4) + (jitterScore * 0.3) + (lossScore * 0.3);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function verdictFor(rttBand, jitterBand, lossBand) {
    // Verdict tracks the worst of the three bands. One bad metric ruins the experience.
    var worst = Math.max(rttBand, jitterBand, lossBand);
    return VERDICTS[worst];
  }

  function assessLatency(input) {
    var rtt = Number(input.rtt);
    var jitter = Number(input.jitter);
    var loss = Number(input.packetLoss);

    if (!Number.isFinite(rtt) || rtt < 0) {
      throw new Error('RTT (ping) must be zero or positive.');
    }
    if (!Number.isFinite(jitter) || jitter < 0) {
      throw new Error('Jitter must be zero or positive.');
    }
    if (!Number.isFinite(loss) || loss < 0 || loss > 100) {
      throw new Error('Packet loss must be a percentage between 0 and 100.');
    }

    var uc = findUseCase(input.useCase);
    var rttBand = bandIndex(rtt, uc.rtt);
    var jitterBand = bandIndex(jitter, uc.jitter);
    var lossBand = bandIndex(loss, uc.loss);

    var verdict = verdictFor(rttBand, jitterBand, lossBand);
    var score = qualityScore(input);

    var tcpCapMbps = tcpThroughputMbps({
      tcpWindowKB: input.tcpWindow,
      rttMs: rtt,
      linkSpeedMbps: input.linkSpeed,
    });

    var reasons = [];
    if (rttBand === 0) {
      reasons.push('RTT of ' + rtt + ' ms is well within the comfortable range for ' + uc.name + '.');
    } else if (rttBand === 1) {
      reasons.push('RTT of ' + rtt + ' ms is fine, not flawless, for ' + uc.name + '.');
    } else if (rttBand === 2) {
      reasons.push('RTT of ' + rtt + ' ms is borderline for ' + uc.name + '.');
    } else if (rttBand === 3) {
      reasons.push('RTT of ' + rtt + ' ms is too high for comfortable ' + uc.name + '.');
    } else {
      reasons.push('RTT of ' + rtt + ' ms is well past the limit for ' + uc.name + '.');
    }

    if (jitterBand >= 2) {
      var jitterMsg = 'Jitter of ' + jitter + ' ms ';
      if (input.useCase === 'video-call') {
        jitterMsg += jitterBand >= 3 ? 'will cause audible audio dropouts and frozen frames.' : 'risks the occasional audio dropout.';
      } else if (input.useCase === 'ssh-remote-desktop') {
        jitterMsg += jitterBand >= 3 ? 'makes typing feel rubbery and laggy.' : 'will make typing feel uneven.';
      } else {
        jitterMsg += jitterBand >= 3 ? 'is high enough to cause stuttering and rubber-banding.' : 'is borderline and may cause stutters.';
      }
      reasons.push(jitterMsg);
    } else if (jitterBand === 0) {
      reasons.push('Jitter of ' + jitter + ' ms is comfortably low.');
    }

    if (lossBand >= 2) {
      var lossMsg = 'Packet loss of ' + loss + '% ';
      if (lossBand >= 3) {
        lossMsg += 'is high enough to cause obvious problems: dropouts, retransmits, and stalls.';
      } else {
        lossMsg += 'is borderline and will degrade the experience under load.';
      }
      reasons.push(lossMsg);
    } else if (lossBand === 0 && loss === 0) {
      reasons.push('No packets dropped, which is the ideal.');
    }

    if (input.useCase === 'web-browsing') {
      var linkMbps = Number(input.linkSpeed);
      if (Number.isFinite(linkMbps) && linkMbps > 0 && tcpCapMbps < linkMbps * 0.5) {
        reasons.push('TCP window of ' + (Number(input.tcpWindow) || 64) + ' KB at ' + rtt + ' ms RTT caps single-flow throughput at about ' + tcpCapMbps.toFixed(2) + ' Mbps, well below your ' + linkMbps + ' Mbps link.');
      }
    }

    return {
      verdict: verdict,
      score: score,
      tcpCapMbps: tcpCapMbps,
      reasons: reasons,
      rttBand: rttBand,
      jitterBand: jitterBand,
      lossBand: lossBand,
      useCase: uc,
    };
  }

  return {
    assessLatency: assessLatency,
    qualityScore: qualityScore,
    tcpThroughputMbps: tcpThroughputMbps,
    USE_CASES: USE_CASES,
    VERDICTS: VERDICTS,
  };
}));
