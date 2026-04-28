(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FileDownloadTime = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Decimal multipliers, not binary, because that is what ISPs and storage
  // vendors actually advertise. 1 MB = 1,000,000 bytes, not 1,048,576.
  var SIZE_UNITS = {
    MB: 1000000,
    GB: 1000000000,
    TB: 1000000000000
  };

  // Speeds advertised in bits, not bytes. 1 Mbps = 1,000,000 bits per second.
  var SPEED_UNITS = {
    Mbps: 1000000,
    Gbps: 1000000000
  };

  // Real-world TCP/IP and TLS overhead sits in the 3 to 8 percent range
  // depending on packet size, retransmits and congestion. 5 percent is a
  // sensible single number for an estimate.
  var OVERHEAD = 0.05;

  function calculateDownloadTime(input) {
    var size = Number(input.size);
    var speed = Number(input.speed);

    if (!Number.isFinite(size) || size <= 0) {
      throw new Error('size must be a positive number');
    }
    if (!Number.isFinite(speed) || speed <= 0) {
      throw new Error('speed must be a positive number');
    }
    if (!Object.prototype.hasOwnProperty.call(SIZE_UNITS, input.sizeUnit)) {
      throw new Error('unknown size unit: ' + input.sizeUnit);
    }
    if (!Object.prototype.hasOwnProperty.call(SPEED_UNITS, input.speedUnit)) {
      throw new Error('unknown speed unit: ' + input.speedUnit);
    }

    var totalBytes = size * SIZE_UNITS[input.sizeUnit];
    var totalBits = totalBytes * 8;
    var bitsPerSecond = speed * SPEED_UNITS[input.speedUnit];

    var rawSeconds = totalBits / bitsPerSecond;
    var overheadSeconds = rawSeconds * OVERHEAD;
    var seconds = rawSeconds + overheadSeconds;

    return {
      sizeInput: size,
      sizeUnit: input.sizeUnit,
      speedInput: speed,
      speedUnit: input.speedUnit,
      totalBytes: totalBytes,
      totalBits: totalBits,
      bitsPerSecond: bitsPerSecond,
      bytesPerSecond: bitsPerSecond / 8,
      rawSeconds: rawSeconds,
      overhead: OVERHEAD,
      overheadSeconds: overheadSeconds,
      seconds: seconds
    };
  }

  function formatDuration(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
      return '—';
    }
    if (totalSeconds < 1) {
      // Round to a sensible decimal place for sub-second times.
      return totalSeconds.toFixed(2) + 's';
    }

    var rounded = Math.round(totalSeconds);
    var days = Math.floor(rounded / 86400);
    var hours = Math.floor((rounded % 86400) / 3600);
    var minutes = Math.floor((rounded % 3600) / 60);
    var secs = rounded % 60;

    var parts = [];
    if (days > 0) {
      parts.push(days + 'd');
      parts.push(hours + 'h');
      parts.push(minutes + 'm');
      parts.push(secs + 's');
    } else if (hours > 0) {
      parts.push(hours + 'h');
      parts.push(minutes + 'm');
      parts.push(secs + 's');
    } else if (minutes > 0) {
      parts.push(minutes + 'm');
      parts.push(secs + 's');
    } else {
      parts.push(secs + 's');
    }
    return parts.join(' ');
  }

  // Reference file sizes for the "real-world comparisons" panel.
  // All in bytes, decimal.
  var COMPARISONS = [
    { label: 'A 4K movie (about 25 GB)', bytes: 25 * 1000000000 },
    { label: 'A AAA Steam game install (about 80 GB)', bytes: 80 * 1000000000 },
    { label: 'A Windows 11 ISO (about 6 GB)', bytes: 6 * 1000000000 },
    { label: 'A macOS installer (about 14 GB)', bytes: 14 * 1000000000 },
    { label: 'A 1080p film (about 4 GB)', bytes: 4 * 1000000000 },
    { label: 'An album of lossless FLAC (about 500 MB)', bytes: 500 * 1000000 }
  ];

  function comparisonsAtSpeed(bitsPerSecond) {
    if (!Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) return [];
    return COMPARISONS.map(function (c) {
      var bits = c.bytes * 8;
      var raw = bits / bitsPerSecond;
      var seconds = raw * (1 + OVERHEAD);
      return { label: c.label, bytes: c.bytes, seconds: seconds };
    });
  }

  return {
    calculateDownloadTime: calculateDownloadTime,
    formatDuration: formatDuration,
    comparisonsAtSpeed: comparisonsAtSpeed,
    OVERHEAD: OVERHEAD,
    SIZE_UNITS: SIZE_UNITS,
    SPEED_UNITS: SPEED_UNITS,
    COMPARISONS: COMPARISONS
  };
}));
