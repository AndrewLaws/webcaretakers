(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CloudBackupTimeEstimator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  // Decimal SI: most cloud providers and ISPs quote in base-10 units, so we follow suit.
  var BYTE_UNITS = { GB: 1e9, TB: 1e12 };
  var BPS_UNITS = { Mbps: 1e6, Gbps: 1e9 };
  // Backup providers (Backblaze, iDrive, Carbonite) wrap data in TLS plus their own
  // chunking and metadata. ~10% protocol/encryption overhead is the realistic round figure.
  var PROTOCOL_OVERHEAD = 0.10;
  var SECONDS_PER_DAY = 86400;

  function toBytes(value, unit) {
    if (!(unit in BYTE_UNITS)) {
      throw new Error('Unknown data unit: ' + unit);
    }
    return value * BYTE_UNITS[unit];
  }

  function toBitsPerSecond(value, unit) {
    if (!(unit in BPS_UNITS)) {
      throw new Error('Unknown speed unit: ' + unit);
    }
    return value * BPS_UNITS[unit];
  }

  function breakdownSeconds(seconds) {
    var s = Math.round(seconds);
    var days = Math.floor(s / SECONDS_PER_DAY);
    s -= days * SECONDS_PER_DAY;
    var hours = Math.floor(s / 3600);
    s -= hours * 3600;
    var minutes = Math.floor(s / 60);
    s -= minutes * 60;
    return { days: days, hours: hours, minutes: minutes, seconds: s };
  }

  function estimateBackupTime(input) {
    var dataValue = Number(input.dataValue);
    var speedValue = Number(input.speedValue);
    var efficiency = Number(input.efficiency);

    if (!Number.isFinite(dataValue) || dataValue < 0) {
      throw new Error('Data size must be zero or positive.');
    }
    if (!Number.isFinite(speedValue) || speedValue <= 0) {
      throw new Error('Upload speed must be greater than zero.');
    }
    if (!Number.isFinite(efficiency) || efficiency <= 0 || efficiency > 1) {
      throw new Error('Efficiency must be between 0 and 1.');
    }

    var totalBytes = toBytes(dataValue, input.dataUnit);
    var totalBits = totalBytes * 8;
    var advertisedBps = toBitsPerSecond(speedValue, input.speedUnit);

    // Effective line bps after the realistic haircut (uploads usually run at 70-80% of advertised).
    var effectiveLineBps = advertisedBps * efficiency;
    // Of that, a chunk goes to TLS, framing, the provider's own metadata. The payload share is
    // line / (1 + overhead). So a 100 Mbps line at 10% overhead carries ~90.9 Mbps of payload.
    var payloadBps = effectiveLineBps / (1 + PROTOCOL_OVERHEAD);

    var totalSeconds = totalBits === 0 ? 0 : totalBits / payloadBps;

    // Overnight-only assumes the user backs up between 8pm and 8am, i.e. 12 hours per 24.
    // Wall-clock time stretches by the inverse duty cycle (24/12 = 2).
    var dutyCycle = input.overnightOnly ? 0.5 : 1;
    var wallClockSeconds = totalSeconds / dutyCycle;

    return {
      totalBytes: totalBytes,
      totalBits: totalBits,
      advertisedBps: advertisedBps,
      effectiveLineBps: effectiveLineBps,
      payloadBps: payloadBps,
      protocolOverhead: PROTOCOL_OVERHEAD,
      efficiency: efficiency,
      totalSeconds: totalSeconds,
      wallClockSeconds: wallClockSeconds,
      overnightOnly: !!input.overnightOnly,
      dutyCycle: dutyCycle,
      breakdown: breakdownSeconds(wallClockSeconds),
      continuousBreakdown: breakdownSeconds(totalSeconds),
    };
  }

  function formatDuration(b) {
    if (b.days === 0 && b.hours === 0 && b.minutes === 0 && b.seconds === 0) {
      return '0 minutes';
    }
    var parts = [];
    if (b.days) parts.push(b.days + (b.days === 1 ? ' day' : ' days'));
    if (b.hours) parts.push(b.hours + (b.hours === 1 ? ' hour' : ' hours'));
    if (b.minutes) parts.push(b.minutes + (b.minutes === 1 ? ' minute' : ' minutes'));
    if (parts.length === 0 && b.seconds) parts.push(b.seconds + (b.seconds === 1 ? ' second' : ' seconds'));
    return parts.join(', ');
  }

  return {
    estimateBackupTime: estimateBackupTime,
    toBytes: toBytes,
    toBitsPerSecond: toBitsPerSecond,
    breakdownSeconds: breakdownSeconds,
    formatDuration: formatDuration,
    PROTOCOL_OVERHEAD: PROTOCOL_OVERHEAD,
  };
}));
