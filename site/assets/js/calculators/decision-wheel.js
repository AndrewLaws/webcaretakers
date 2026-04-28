'use strict';

/**
 * Decision Wheel: pure-logic library.
 *
 * Runs entirely in the browser. No fetch, no XHR, no third-party endpoint.
 *
 * The wheel "spins" but the result is decided up front using
 * crypto.getRandomValues with rejection sampling, then the animation is
 * choreographed to land on the pre-chosen wedge. The animation itself is
 * theatre. The choice is fair and made before any visual movement starts.
 *
 * Pluggable randomInt: tests can substitute a deterministic source.
 */

var MAX_OPTIONS = 50;

function defaultRandomInt(n) {
  if (n <= 0) throw new Error('randomInt: n must be positive');
  var c = (typeof crypto !== 'undefined') ? crypto
        : (typeof globalThis !== 'undefined' && globalThis.crypto) ? globalThis.crypto
        : null;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('Web Crypto not available in this environment.');
  }
  var max = 0xFFFFFFFF;
  var limit = max - ((max + 1) % n);
  var buf = new Uint32Array(1);
  while (true) {
    c.getRandomValues(buf);
    if (buf[0] <= limit) return buf[0] % n;
  }
}

/**
 * Parse a raw textarea string into a list of options.
 *   - split on newlines
 *   - trim leading and trailing whitespace
 *   - drop empty lines
 *   - duplicates are kept (a user might want weighted entries)
 *   - cap at MAX_OPTIONS for UI sanity
 */
function parseOptions(raw) {
  if (typeof raw !== 'string') return { options: [], count: 0, truncated: false };
  var lines = raw.split(/\r?\n/);
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (t.length > 0) out.push(t);
  }
  var truncated = false;
  if (out.length > MAX_OPTIONS) {
    out = out.slice(0, MAX_OPTIONS);
    truncated = true;
  }
  return { options: out, count: out.length, truncated: truncated };
}

/**
 * Validate a spin request. Returns { ok, message?, warning? }.
 *
 * A single option is technically spinnable, but we surface a warning so the
 * page can show "you only entered one option, that is the result".
 */
function validateSpin(options) {
  if (!Array.isArray(options) || options.length === 0) {
    return { ok: false, message: 'Add at least one option to spin the wheel.' };
  }
  if (options.length === 1) {
    return { ok: true, warning: 'You only entered one option, that is the result.' };
  }
  return { ok: true };
}

/**
 * Pick the winning index using an unbiased crypto draw.
 */
function pickWinnerIndex(options, randomInt) {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error('pickWinnerIndex: need at least one option.');
  }
  var rnd = randomInt || defaultRandomInt;
  return rnd(options.length);
}

/**
 * Wedge angles in degrees. Equal slices, sum to 360.
 */
function wedgeAngles(n) {
  if (n <= 0) return [];
  var slice = 360 / n;
  var arr = [];
  for (var i = 0; i < n; i++) arr.push(slice);
  return arr;
}

/**
 * Centre angle of the i-th wedge, in degrees clockwise from 12 o'clock.
 *   wedge 0 spans [0, slice], centre at slice/2
 */
function wedgeCentreAngle(i, n) {
  var slice = 360 / n;
  return i * slice + slice / 2;
}

/**
 * Final wheel rotation needed so that wedge `winnerIndex` lands under a
 * pointer fixed at 12 o'clock. Includes `spins` full rotations of theatre
 * before the settling angle.
 *
 *   settle = (360 - wedgeCentreAngle(i, n)) mod 360
 *   final  = spins * 360 + settle
 */
function computeFinalRotation(winnerIndex, n, spins) {
  var s = (typeof spins === 'number' && spins >= 0) ? spins : 5;
  var centre = wedgeCentreAngle(winnerIndex, n);
  var settle = ((360 - centre) % 360 + 360) % 360;
  return s * 360 + settle;
}

/**
 * Distinct hue per wedge. Hue rotates evenly through 0..360 so colours feel
 * as different as possible at any wedge count.
 */
function hueForWedge(i, n) {
  if (n <= 0) return 0;
  return Math.round((i * 360) / n);
}

/**
 * Build the SVG path string for a wedge in a circle of radius r centred at
 * (cx, cy), spanning [startDeg, startDeg + sweepDeg], measured clockwise from
 * 12 o'clock.
 *
 * For the single-option full-circle case (sweepDeg === 360) we draw two
 * half-circle arcs to avoid the degenerate same-start-and-end-point case.
 */
function wedgePathD(cx, cy, r, startDeg, sweepDeg) {
  function pt(deg) {
    var rad = ((deg - 90) * Math.PI) / 180; // -90 so 0deg is at the top
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }
  if (sweepDeg >= 360) {
    var top = pt(0);
    var bottom = pt(180);
    return 'M ' + top.x.toFixed(3) + ' ' + top.y.toFixed(3) +
           ' A ' + r + ' ' + r + ' 0 1 1 ' + bottom.x.toFixed(3) + ' ' + bottom.y.toFixed(3) +
           ' A ' + r + ' ' + r + ' 0 1 1 ' + top.x.toFixed(3) + ' ' + top.y.toFixed(3) + ' Z';
  }
  var start = pt(startDeg);
  var end = pt(startDeg + sweepDeg);
  var largeArc = sweepDeg > 180 ? 1 : 0;
  return 'M ' + cx + ' ' + cy +
         ' L ' + start.x.toFixed(3) + ' ' + start.y.toFixed(3) +
         ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + end.x.toFixed(3) + ' ' + end.y.toFixed(3) +
         ' Z';
}

/**
 * Return a new array with the i-th element removed. Out-of-range returns the
 * input unchanged (defensive: the page should not rely on this branch).
 */
function removeAt(arr, i) {
  if (!Array.isArray(arr)) return [];
  if (i < 0 || i >= arr.length) return arr.slice();
  var out = arr.slice();
  out.splice(i, 1);
  return out;
}

var api = {
  MAX_OPTIONS: MAX_OPTIONS,
  parseOptions: parseOptions,
  validateSpin: validateSpin,
  pickWinnerIndex: pickWinnerIndex,
  wedgeAngles: wedgeAngles,
  wedgeCentreAngle: wedgeCentreAngle,
  computeFinalRotation: computeFinalRotation,
  hueForWedge: hueForWedge,
  wedgePathD: wedgePathD,
  removeAt: removeAt,
  defaultRandomInt: defaultRandomInt
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.DecisionWheel = api;
}
