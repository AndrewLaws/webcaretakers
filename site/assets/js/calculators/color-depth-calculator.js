(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ColorDepthCalculator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  // Bit-depth presets. Keys map onto the dropdown values; numbers are bits per pixel.
  // The two "8-..." entries are deliberately different labels but the same bit count,
  // because indexed and grayscale 8-bit images store identically in bits, even if the
  // colour interpretation differs.
  var DEPTH_MAP = {
    '1': 1,
    '8-grayscale': 8,
    '8-indexed': 8,
    '16-grayscale': 16,
    '24': 24,
    '30': 30,
    '32': 32,
    '36': 36,
    '48': 48,
  };

  // Round-figure compression ratios used for the comparison panel. Real ratios depend on
  // content entropy and encoder settings, so these are planning numbers, not promises.
  var JPEG_RATIO = 10; // ~10:1 for typical photographic JPEG quality 80-85
  var PNG_RATIO = 2;   // ~2:1 for typical photographic PNG (lossless deflate)

  function resolveBitsPerPixel(bitDepth, customBits) {
    if (bitDepth === 'custom') {
      var bits = Number(customBits);
      if (!Number.isFinite(bits) || bits < 1 || bits > 64 || Math.floor(bits) !== bits) {
        throw new Error('Custom bits per pixel must be a whole number between 1 and 64.');
      }
      return bits;
    }
    if (!(bitDepth in DEPTH_MAP)) {
      throw new Error('Unknown bit depth preset: ' + bitDepth);
    }
    return DEPTH_MAP[bitDepth];
  }

  function calculateColorDepth(input) {
    var pixelsWide = Number(input.pixelsWide);
    var pixelsHigh = Number(input.pixelsHigh);
    var frames = input.frames === undefined || input.frames === null || input.frames === ''
      ? 1
      : Number(input.frames);

    if (!Number.isFinite(pixelsWide) || pixelsWide <= 0) {
      throw new Error('Pixels wide must be a positive number.');
    }
    if (!Number.isFinite(pixelsHigh) || pixelsHigh <= 0) {
      throw new Error('Pixels high must be a positive number.');
    }
    if (!Number.isFinite(frames) || frames <= 0 || Math.floor(frames) !== frames) {
      throw new Error('Frames must be a positive whole number.');
    }

    var bitsPerPixel = resolveBitsPerPixel(input.bitDepth, input.customBits);

    var totalPixels = pixelsWide * pixelsHigh;
    var singleFrameBits = totalPixels * bitsPerPixel;
    var totalBits = singleFrameBits * frames;
    var totalBytes = totalBits / 8;

    // Math.pow(2, n) is exact in IEEE-754 for n up to 53. Above that, the count is too
    // large to represent precisely as a number, so we fall back to a string label.
    var totalColors = bitsPerPixel <= 53 ? Math.pow(2, bitsPerPixel) : null;

    return {
      pixelsWide: pixelsWide,
      pixelsHigh: pixelsHigh,
      bitsPerPixel: bitsPerPixel,
      frames: frames,
      totalPixels: totalPixels,
      singleFrameBits: singleFrameBits,
      singleFrameBytes: singleFrameBits / 8,
      totalBits: totalBits,
      totalBytes: totalBytes,
      totalColors: totalColors,
      jpegEstimateBytes: totalBytes / JPEG_RATIO,
      pngEstimateBytes: totalBytes / PNG_RATIO,
      jpegRatio: JPEG_RATIO,
      pngRatio: PNG_RATIO,
    };
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + ' KB';
    return Math.round(bytes) + ' B';
  }

  function formatColorCount(n) {
    if (n === null || n === undefined) return 'too large to enumerate';
    // Math.round defends against the rare floating drift on Math.pow returns.
    return Math.round(n).toLocaleString('en-GB');
  }

  return {
    calculateColorDepth: calculateColorDepth,
    resolveBitsPerPixel: resolveBitsPerPixel,
    formatBytes: formatBytes,
    formatColorCount: formatColorCount,
    DEPTH_MAP: DEPTH_MAP,
    JPEG_RATIO: JPEG_RATIO,
    PNG_RATIO: PNG_RATIO,
  };
}));
