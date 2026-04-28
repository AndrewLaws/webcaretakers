'use strict';

/**
 * Aspect Ratio Calculator: pure logic library.
 *
 * Given an original width and height plus one of a target width or target
 * height, derive the matching dimension that preserves the aspect ratio.
 *
 * Also exposes:
 *   gcd            : greatest common divisor (Euclidean)
 *   simplifyRatio  : reduce W:H to lowest terms (e.g. 1920x1080 -> 16:9)
 *   scaleFromWidth : derive height for a target width
 *   scaleFromHeight: derive width for a target height
 *   formatRatio    : "W:H" string
 *   roundDim       : round to nearest whole pixel
 *   PRESETS        : common aspect ratios for one-click application
 */

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    var t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function assertPositiveInt(n, label) {
  if (typeof n !== 'number' || !isFinite(n)) {
    throw new Error(label + ' must be a positive whole number.');
  }
  if (!Number.isInteger(n)) {
    throw new Error(label + ' must be a whole number (integer pixels).');
  }
  if (n <= 0) {
    throw new Error(label + ' must be a positive number, greater than zero.');
  }
}

function simplifyRatio(w, h) {
  assertPositiveInt(w, 'Width');
  assertPositiveInt(h, 'Height');
  var d = gcd(w, h);
  return { w: w / d, h: h / d, divisor: d };
}

function scaleFromWidth(originalW, originalH, targetW) {
  assertPositiveInt(originalW, 'Original width');
  assertPositiveInt(originalH, 'Original height');
  if (typeof targetW !== 'number' || !isFinite(targetW) || targetW <= 0) {
    throw new Error('Target width must be a positive number, greater than zero.');
  }
  var scale = targetW / originalW;
  return { width: targetW, height: originalH * scale, scale: scale };
}

function scaleFromHeight(originalW, originalH, targetH) {
  assertPositiveInt(originalW, 'Original width');
  assertPositiveInt(originalH, 'Original height');
  if (typeof targetH !== 'number' || !isFinite(targetH) || targetH <= 0) {
    throw new Error('Target height must be a positive number, greater than zero.');
  }
  var scale = targetH / originalH;
  return { width: originalW * scale, height: targetH, scale: scale };
}

function formatRatio(w, h) {
  return w + ':' + h;
}

function roundDim(v) {
  return Math.round(v);
}

var PRESETS = [
  { label: '16:9',  w: 16, h: 9,  note: 'HD video, YouTube, most monitors' },
  { label: '4:3',   w: 4,  h: 3,  note: 'Older TVs, iPad, slide decks' },
  { label: '3:2',   w: 3,  h: 2,  note: 'DSLR photography, 35mm film' },
  { label: '1:1',   w: 1,  h: 1,  note: 'Instagram square, profile photos' },
  { label: '9:16',  w: 9,  h: 16, note: 'Vertical video, Reels, Stories, TikTok' },
  { label: '21:9',  w: 21, h: 9,  note: 'Ultrawide monitor, cinematic crop' }
];

var api = {
  gcd: gcd,
  simplifyRatio: simplifyRatio,
  scaleFromWidth: scaleFromWidth,
  scaleFromHeight: scaleFromHeight,
  formatRatio: formatRatio,
  roundDim: roundDim,
  PRESETS: PRESETS
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.AspectRatioCalculator = api;
}
