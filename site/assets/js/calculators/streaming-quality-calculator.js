(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StreamingQualityCalculator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  // Tier order from lowest to highest. Order matters: best-tier search walks it descending.
  var TIERS = ['480p', '720p', '1080p', '4k-hdr', '4k-dv'];

  var TIER_LABELS = {
    '480p': '480p SD',
    '720p': '720p HD',
    '1080p': '1080p Full HD',
    '4k-hdr': '4K HDR',
    '4k-dv': '4K Dolby Vision',
  };

  // Per-stream Mbps required at each tier, by service. Figures cribbed from each provider's
  // public help docs. Netflix and Disney+ publish recommendations; Prime sits a touch lower;
  // YouTube uses VP9/AV1 so its 4K is meaningfully lighter; "generic" is a sensible fallback.
  var SERVICES = {
    'netflix':     { '480p': 3,   '720p': 5,   '1080p': 8,   '4k-hdr': 25, '4k-dv': 40 },
    'disney-plus': { '480p': 3,   '720p': 5,   '1080p': 8,   '4k-hdr': 25, '4k-dv': 25 },
    'prime-video': { '480p': 2.5, '720p': 4.5, '1080p': 7.5, '4k-hdr': 22, '4k-dv': 22 },
    'youtube':     { '480p': 2,   '720p': 4,   '1080p': 6,   '4k-hdr': 20, '4k-dv': 20 },
    'generic':     { '480p': 3,   '720p': 5,   '1080p': 8,   '4k-hdr': 25, '4k-dv': 40 },
  };

  function getBitrateForTier(service, tier) {
    if (!SERVICES[service]) {
      throw new Error('Unknown service: ' + service);
    }
    if (!(tier in SERVICES[service])) {
      throw new Error('Unknown quality tier: ' + tier);
    }
    return SERVICES[service][tier];
  }

  function evaluateStreamingQuality(input) {
    var linkSpeed = Number(input.linkSpeed);
    var concurrent = Number(input.concurrent);
    var headroom = Number(input.headroom);
    var service = input.service;
    var targetQuality = input.targetQuality;

    if (!Number.isFinite(linkSpeed) || linkSpeed <= 0) {
      throw new Error('Link speed must be greater than zero.');
    }
    if (!Number.isInteger(concurrent) || concurrent < 1) {
      throw new Error('Concurrent streams must be a whole number of at least 1.');
    }
    if (!Number.isFinite(headroom) || headroom < 0 || headroom > 90) {
      throw new Error('Headroom must be between 0 and 90 percent.');
    }

    var perStreamMbps = getBitrateForTier(service, targetQuality);
    var totalDemandMbps = perStreamMbps * concurrent;
    var usableMbps = linkSpeed * (1 - headroom / 100);
    var surplusMbps = usableMbps - totalDemandMbps;

    // Verdict bands. Comfortable: at least 25% headroom over demand. Tight: positive but
    // under that. Insufficient: cannot meet the demand at all.
    var verdict;
    if (surplusMbps < 0) {
      verdict = 'Insufficient';
    } else if (totalDemandMbps > 0 && surplusMbps / totalDemandMbps < 0.25) {
      verdict = 'Tight';
    } else {
      verdict = 'Comfortable';
    }

    // Best tier the link can sustain at the chosen concurrency. Walk highest to lowest.
    var perStreamCap = usableMbps / concurrent;
    var bestTier = null;
    for (var i = TIERS.length - 1; i >= 0; i--) {
      var t = TIERS[i];
      if (getBitrateForTier(service, t) <= perStreamCap) {
        bestTier = t;
        break;
      }
    }

    return {
      perStreamMbps: perStreamMbps,
      totalDemandMbps: totalDemandMbps,
      usableMbps: usableMbps,
      surplusMbps: surplusMbps,
      verdict: verdict,
      bestTier: bestTier,
      bestTierLabel: bestTier ? TIER_LABELS[bestTier] : null,
      perStreamCap: perStreamCap,
      tierLabel: TIER_LABELS[targetQuality],
      service: service,
      concurrent: concurrent,
      linkSpeed: linkSpeed,
      headroom: headroom,
    };
  }

  return {
    evaluateStreamingQuality: evaluateStreamingQuality,
    getBitrateForTier: getBitrateForTier,
    TIERS: TIERS,
    TIER_LABELS: TIER_LABELS,
    SERVICES: SERVICES,
  };
}));
