'use strict';

/**
 * Meta Length Checker.
 *
 * Checks SEO title and meta description against Google's display limits.
 * Length is measured in characters AND an approximate pixel width, because
 * Google truncates on pixel width, not character count. The tool uses a
 * conservative average-width heuristic (derived from published tests of
 * the Arial font Google uses in SERPs) to give a close estimate.
 *
 * Pixel widths (approximate, desktop):
 *   - Title:       600 px cap (roughly 60 characters)
 *   - Description: 920 px cap (roughly 160 characters)
 *
 * We don't ship a full font-metrics table. Instead, every character gets a
 * pragmatic width in a small lookup, with a default for unknown chars.
 */

// Rough widths in px at Google's SERP font size. Common narrow/wide chars
// are tuned; everything else falls back to default.
var CHAR_WIDTHS = {
  ' ': 4, 'i':3, 'l':3, 'I':4, 'j':3, '.':3, ',':3, '!':3, ';':3, ':':3, '|':3, "'":3,
  'f':4, 't':4, 'r':4, '(':4, ')':4, '[':4,']':4,
  'm':10,'w':9, 'M':10,'W':12,
  '-':4, '_':6, '/':4,
};
var DEFAULT_WIDTH = 7; // generic lowercase letter
var DEFAULT_UPPER = 8; // generic uppercase letter
var DEFAULT_DIGIT = 7;

function pixelWidth(str) {
  if (typeof str !== 'string') return 0;
  var total = 0;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charAt(i);
    if (CHAR_WIDTHS.hasOwnProperty(ch)) {
      total += CHAR_WIDTHS[ch];
    } else if (/[A-Z]/.test(ch)) {
      total += DEFAULT_UPPER;
    } else if (/[0-9]/.test(ch)) {
      total += DEFAULT_DIGIT;
    } else {
      total += DEFAULT_WIDTH;
    }
  }
  return total;
}

function classify(chars, px, charCap, pxCap, nearMargin) {
  nearMargin = nearMargin || 0.9;
  if (chars === 0) return { status: 'empty', note: 'Nothing to check yet.' };
  if (px > pxCap || chars > charCap) {
    return { status: 'over', note: 'Likely truncated in search results.' };
  }
  if (px > pxCap * nearMargin || chars > charCap * nearMargin) {
    return { status: 'near', note: 'Close to the truncation line. Trim a word or two for safety.' };
  }
  // Under but short of a healthy target
  if (chars < charCap * 0.5) {
    return { status: 'short', note: 'Could be longer. Google often favours titles and descriptions that use the space.' };
  }
  return { status: 'good', note: 'Within range and using the space well.' };
}

var TITLE_CHAR_CAP = 60;
var TITLE_PX_CAP   = 600;
var DESC_CHAR_CAP  = 160;
var DESC_PX_CAP    = 920;

function checkTitle(text) {
  var t = typeof text === 'string' ? text : '';
  var chars = t.length;
  var px    = pixelWidth(t);
  return Object.assign({
    text: t, characters: chars, pixelWidth: px,
    charCap: TITLE_CHAR_CAP, pxCap: TITLE_PX_CAP,
    remainingChars: TITLE_CHAR_CAP - chars,
    remainingPx:    TITLE_PX_CAP - px,
  }, classify(chars, px, TITLE_CHAR_CAP, TITLE_PX_CAP));
}

function checkDescription(text) {
  var t = typeof text === 'string' ? text : '';
  var chars = t.length;
  var px    = pixelWidth(t);
  return Object.assign({
    text: t, characters: chars, pixelWidth: px,
    charCap: DESC_CHAR_CAP, pxCap: DESC_PX_CAP,
    remainingChars: DESC_CHAR_CAP - chars,
    remainingPx:    DESC_PX_CAP - px,
  }, classify(chars, px, DESC_CHAR_CAP, DESC_PX_CAP));
}

function checkMeta(opts) {
  opts = opts || {};
  return {
    title:       checkTitle(opts.title),
    description: checkDescription(opts.description),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkMeta, checkTitle, checkDescription, pixelWidth, TITLE_CHAR_CAP, TITLE_PX_CAP, DESC_CHAR_CAP, DESC_PX_CAP };
} else {
  window.MetaLength = { checkMeta, checkTitle, checkDescription, pixelWidth, TITLE_CHAR_CAP, TITLE_PX_CAP, DESC_CHAR_CAP, DESC_PX_CAP };
}
