'use strict';

/**
 * Word Count Tool.
 *
 * Reports on pasted text: words, characters (with and without spaces),
 * sentences, paragraphs, average word length, and flags for common
 * length limits (tweet, SEO meta description, SMS, Instagram caption, etc.).
 *
 * Where a hard cap is well known (Twitter/X 280, meta description ~160,
 * SMS 160) the tool returns a status, remaining count, and overflow count.
 */

function countWords(text) {
  if (typeof text !== 'string') return 0;
  var m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

function countCharacters(text, includeSpaces) {
  if (typeof text !== 'string') return 0;
  return includeSpaces ? text.length : text.replace(/\s/g, '').length;
}

function countSentences(text) {
  if (typeof text !== 'string') return 0;
  var m = text.trim().match(/[^.!?]+[.!?]+(\s|$)/g);
  if (m) return m.length;
  return text.trim().length > 0 ? 1 : 0;
}

function countParagraphs(text) {
  if (typeof text !== 'string') return 0;
  var trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  var parts = trimmed.split(/\n\s*\n/);
  return parts.filter(function (p) { return p.trim().length > 0; }).length;
}

function averageWordLength(text) {
  var words = text.trim().match(/\S+/g);
  if (!words || words.length === 0) return 0;
  var total = 0;
  for (var i = 0; i < words.length; i++) {
    total += words[i].replace(/[^\p{L}\p{N}']/gu, '').length;
  }
  return total / words.length;
}

var LIMITS = [
  { key: 'tweet',       label: 'Tweet / X post',          cap: 280, unit: 'characters' },
  { key: 'sms',         label: 'SMS message',             cap: 160, unit: 'characters' },
  { key: 'meta',        label: 'Meta description',        cap: 160, unit: 'characters' },
  { key: 'title',       label: 'Page title',              cap: 60,  unit: 'characters' },
  { key: 'ogTitle',     label: 'Open Graph title',        cap: 70,  unit: 'characters' },
  { key: 'instagram',   label: 'Instagram caption',       cap: 2200, unit: 'characters' },
  { key: 'linkedin',    label: 'LinkedIn post',           cap: 3000, unit: 'characters' },
  { key: 'facebook',    label: 'Facebook post (visible)', cap: 477,  unit: 'characters' },
];

function assessLimit(chars, cap) {
  var remaining = cap - chars;
  var status;
  if (chars === 0)          status = 'empty';
  else if (remaining < 0)   status = 'over';
  else if (remaining <= 20) status = 'near';
  else                      status = 'under';
  return { cap: cap, remaining: remaining, overBy: remaining < 0 ? -remaining : 0, status: status };
}

function analyseText(opts) {
  opts = opts || {};
  var text = typeof opts.text === 'string' ? opts.text : '';

  var words       = countWords(text);
  var chars       = countCharacters(text, true);
  var charsNoWs   = countCharacters(text, false);
  var sentences   = countSentences(text);
  var paragraphs  = countParagraphs(text);
  var avgWordLen  = averageWordLength(text);

  var limits = {};
  for (var i = 0; i < LIMITS.length; i++) {
    var L = LIMITS[i];
    limits[L.key] = Object.assign({ label: L.label, unit: L.unit }, assessLimit(chars, L.cap));
  }

  return {
    words:              words,
    characters:         chars,
    charactersNoSpaces: charsNoWs,
    sentences:          sentences,
    paragraphs:         paragraphs,
    averageWordLength:  avgWordLen,
    limits:             limits,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { analyseText, countWords, countCharacters, countSentences, countParagraphs, averageWordLength, LIMITS };
} else {
  window.WordCount = { analyseText, countWords, countCharacters, countSentences, countParagraphs, averageWordLength, LIMITS };
}
