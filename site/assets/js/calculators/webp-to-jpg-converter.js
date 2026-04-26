// WebP to JPG Converter: pure-logic helpers. The DOM/canvas work happens in
// the page script; this module exists so the format-sniffing maths is
// unit-testable without a real WebP file.

const SUPPORTED_TYPES = ['image/webp', 'image/jpeg', 'image/png'];

function isSupportedImageType(mimeType) {
  if (!mimeType) return false;
  return SUPPORTED_TYPES.indexOf(mimeType) !== -1;
}

// Detect animated WebP by sniffing the file header. WebP is a RIFF container:
// bytes 0-3 are "RIFF", 8-11 are "WEBP", 12-15 are the first chunk's FourCC.
// Animated files always start with a VP8X chunk, and bit 1 (0x02) of the
// flags byte at offset 20 is the animation flag. We also accept an explicit
// "ANIM" chunk anywhere in the first 1 KiB as a belt-and-braces check.
function isAnimatedWebp(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength < 21) return false;
  const view = new Uint8Array(arrayBuffer);
  const fourCC = (offset) => String.fromCharCode(view[offset], view[offset + 1], view[offset + 2], view[offset + 3]);
  if (fourCC(0) !== 'RIFF') return false;
  if (fourCC(8) !== 'WEBP') return false;
  if (fourCC(12) === 'VP8X') {
    const flags = view[20];
    if ((flags & 0x02) !== 0) return true;
  }
  // Scan the first 1 KiB for an ANIM chunk header just in case.
  const limit = Math.min(view.length - 4, 1024);
  for (let i = 12; i < limit; i++) {
    if (view[i] === 0x41 && view[i + 1] === 0x4E && view[i + 2] === 0x49 && view[i + 3] === 0x4D) {
      return true;
    }
  }
  return false;
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

function calculateResizeDimensions(origWidth, origHeight, maxWidth, maxHeight) {
  if (!maxWidth && !maxHeight) return { width: origWidth, height: origHeight };
  let scale = 1;
  if (maxWidth && origWidth > maxWidth) scale = Math.min(scale, maxWidth / origWidth);
  if (maxHeight && origHeight > maxHeight) scale = Math.min(scale, maxHeight / origHeight);
  return {
    width: Math.max(1, Math.round(origWidth * scale)),
    height: Math.max(1, Math.round(origHeight * scale)),
  };
}

const exported = {
  isAnimatedWebp,
  isSupportedImageType,
  formatFileSize,
  calculateResizeDimensions,
  SUPPORTED_TYPES,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.WebpToJpg = exported;
}
