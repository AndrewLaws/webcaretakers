// Image Compressor: pure-logic helpers. The DOM/canvas glue lives in the page
// script. Anything that needs to be unit-testable lives here.

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function isSupportedImageType(mimeType) {
  if (!mimeType) return false;
  return SUPPORTED_TYPES.indexOf(mimeType) !== -1;
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

// Parse a human target like "2 MB", "500 KB", "100kb" into bytes.
// Returns null on garbage so the UI can complain politely.
function parseTargetBytes(input) {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  if (!s) return null;
  const m = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*(b|kb|mb|kib|mib)?$/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!isFinite(value) || value <= 0) return null;
  const unit = m[2] || 'b';
  if (unit === 'b') return Math.round(value);
  if (unit === 'kb' || unit === 'kib') return Math.round(value * 1024);
  if (unit === 'mb' || unit === 'mib') return Math.round(value * 1024 * 1024);
  return null;
}

// Decide what MIME type to encode as. PNG inputs default to PNG output, but
// the user can force JPEG for much smaller files when transparency does not
// matter. Anything with a known JPEG/WebP input keeps its format unless
// overridden.
function outputMimeFor(inputType, override) {
  if (override === 'image/jpeg' || override === 'image/png' || override === 'image/webp') {
    return override;
  }
  if (inputType === 'image/png') return 'image/png';
  if (inputType === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

function extensionFor(mimeType) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'img';
}

// Binary-search a JPEG/WebP quality value until the encoder produces a blob
// at or under targetBytes, or run out of attempts.
//
// encode(quality) MUST return a Promise that resolves to { size: number }.
// We never look at the blob itself here; this function just picks the number.
//
// Returns { quality, size, hit } where hit indicates whether we got under
// targetBytes within the iteration budget.
async function searchQualityForTarget({ encode, targetBytes, minQ = 0.4, maxQ = 0.95, maxIter = 8 }) {
  let lo = minQ;
  let hi = maxQ;
  let bestUnder = null; // best result that fits the target (highest quality under)
  let bestAny = null;   // closest we have seen, even if over target

  // Try the high end first. If max quality already fits, done.
  let topResult = await encode(hi);
  bestAny = { quality: hi, size: topResult.size };
  if (topResult.size <= targetBytes) {
    return { quality: hi, size: topResult.size, hit: true };
  }

  // Try the low end. If even minQ overshoots, we cannot win on quality alone.
  let lowResult = await encode(lo);
  if (lowResult.size > targetBytes) {
    // Caller will need to scale dimensions down.
    return { quality: lo, size: lowResult.size, hit: false };
  }
  bestUnder = { quality: lo, size: lowResult.size };

  // Now binary search between lo (under) and hi (over).
  for (let i = 0; i < maxIter - 2; i++) {
    const mid = (lo + hi) / 2;
    const r = await encode(mid);
    if (r.size <= targetBytes) {
      bestUnder = { quality: mid, size: r.size };
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return { quality: bestUnder.quality, size: bestUnder.size, hit: true };
}

// Produce a sequence of dimension scale factors for the "shrink the image"
// fallback. Each step is 90% of the last, capped at maxSteps. Useful when
// even minQ-quality re-encoding overshoots the target file size.
function dimensionScaleSteps(maxSteps = 4, factor = 0.9) {
  const out = [];
  let s = 1;
  for (let i = 0; i < maxSteps; i++) {
    s = s * factor;
    out.push(Math.round(s * 1000) / 1000);
  }
  return out;
}

// Percent saved versus original size. Negative means we made it bigger.
function percentSaved(originalBytes, newBytes) {
  if (!originalBytes) return 0;
  return Math.round((1 - newBytes / originalBytes) * 100);
}

const exported = {
  SUPPORTED_TYPES,
  isSupportedImageType,
  formatFileSize,
  parseTargetBytes,
  outputMimeFor,
  extensionFor,
  searchQualityForTarget,
  dimensionScaleSteps,
  percentSaved,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.ImageCompressor = exported;
}
