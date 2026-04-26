// HEIC to JPG Converter: pure-logic helpers. The actual canvas/DOM and
// heic2any decode work happens in the page script. The helpers below are
// extracted so the maths and routing decisions are unit-testable.

// Input MIME types the tool accepts. HEIC/HEIF go through the heic2any
// fallback path. JPEG/PNG/WebP pass straight through to the canvas re-encode.
const SUPPORTED_INPUT_TYPES = [
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
];

// Output formats the user can pick.
const OUTPUT_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

function isHeic(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  // Many browsers (notably Chrome on Windows) report an empty MIME for HEIC.
  // Fall back to the file extension.
  const name = (file.name || '').toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif');
}

function isSupportedInput(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  if (SUPPORTED_INPUT_TYPES.indexOf(type) !== -1) return true;
  // Allow extension-based detection for HEIC/HEIF on browsers with no MIME.
  return isHeic(file);
}

function clampQuality(q) {
  const n = Number(q);
  if (!isFinite(n)) return 0.92;
  if (n < 0.6) return 0.6;
  if (n > 1.0) return 1.0;
  return n;
}

// Work out target dimensions when an optional max-width or max-height is set.
// Aspect ratio is always preserved when resizing.
function calculateResize({ origWidth, origHeight, maxWidth, maxHeight }) {
  const w = Math.max(1, Math.round(origWidth || 1));
  const h = Math.max(1, Math.round(origHeight || 1));
  let scale = 1;
  if (maxWidth && w > maxWidth) scale = Math.min(scale, maxWidth / w);
  if (maxHeight && h > maxHeight) scale = Math.min(scale, maxHeight / h);
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const KB = 1024;
  const MB = KB * 1024;
  if (bytes >= MB) return stripTrailingZero(bytes / MB) + ' MB';
  if (bytes >= KB) return stripTrailingZero(bytes / KB) + ' KB';
  return Math.round(bytes) + ' B';
}

function stripTrailingZero(n) {
  const rounded = Math.round(n * 10) / 10;
  return String(rounded);
}

function extensionForMime(mime) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

function targetFilename(originalName, outputMime) {
  const base = (originalName || 'image').replace(/\.[^.]+$/, '');
  return base + '-webcaretakers.' + extensionForMime(outputMime);
}

// Translate an EXIF orientation flag (1-8) into a canvas transform applied
// before the source image is drawn. Orientations 5-8 swap the canvas
// dimensions because the image is rotated 90 or 270 degrees.
function applyOrientation(ctx, orientation, width, height) {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;          // flip horizontal
    case 3: ctx.transform(-1, 0, 0, -1, width, height); break;    // 180
    case 4: ctx.transform(1, 0, 0, -1, 0, height); break;         // flip vertical
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;               // transpose
    case 6: ctx.transform(0, 1, -1, 0, height, 0); break;         // 90 CW
    case 7: ctx.transform(0, -1, -1, 0, height, width); break;    // transverse
    case 8: ctx.transform(0, -1, 1, 0, 0, width); break;          // 90 CCW
    default: break;                                                // 1: no-op
  }
}

function orientationSwapsAxes(orientation) {
  return orientation >= 5 && orientation <= 8;
}

const exported = {
  SUPPORTED_INPUT_TYPES,
  OUTPUT_FORMATS,
  isHeic,
  isSupportedInput,
  clampQuality,
  calculateResize,
  formatFileSize,
  extensionForMime,
  targetFilename,
  applyOrientation,
  orientationSwapsAxes,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.HeicToJpg = exported;
}
