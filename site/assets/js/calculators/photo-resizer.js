// Photo Resizer: pure-logic helpers. The actual canvas/DOM work happens in
// the page script; this module exists so the maths is unit-testable.

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function isSupportedImageType(mimeType) {
  if (!mimeType) return false;
  return SUPPORTED_TYPES.indexOf(mimeType) !== -1;
}

function calculateResizedDimensions({
  origWidth, origHeight,
  targetWidth, targetHeight,
  keepAspectRatio,
}) {
  // Aspect ratio off: caller wants exact target dimensions, full stop.
  if (!keepAspectRatio) {
    return {
      width: Math.max(1, Math.round(targetWidth || origWidth)),
      height: Math.max(1, Math.round(targetHeight || origHeight)),
    };
  }

  // Aspect locked: work out a scale factor.
  let scale;
  if (targetWidth && targetHeight) {
    // Fit inside the target box (contain). Use the smaller scale.
    scale = Math.min(targetWidth / origWidth, targetHeight / origHeight);
  } else if (targetWidth) {
    scale = targetWidth / origWidth;
  } else if (targetHeight) {
    scale = targetHeight / origHeight;
  } else {
    // No target -> no change.
    return { width: origWidth, height: origHeight };
  }

  return {
    width: Math.max(1, Math.round(origWidth * scale)),
    height: Math.max(1, Math.round(origHeight * scale)),
  };
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const KB = 1024;
  const MB = KB * 1024;
  if (bytes >= MB) return stripTrailingZero(bytes / MB) + ' MB';
  if (bytes >= KB) return stripTrailingZero(bytes / KB) + ' KB';
  return Math.round(bytes) + ' B';
}

function stripTrailingZero(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

const exported = {
  calculateResizedDimensions,
  formatFileSize,
  isSupportedImageType,
  SUPPORTED_TYPES,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.PhotoResizer = exported;
}
