'use strict';

/**
 * Read Time Calculator.
 *
 * Given a block of text, estimate how long it takes to read aloud vs silently.
 * Adult silent-reading speeds cluster around 200-300 words per minute for
 * typical prose; 250 WPM is the near-universal default on the web.
 * Reading aloud (or for comprehension of technical material) drops to
 * 130-180 WPM; 150 WPM is a sensible default.
 *
 * Also returns word count, character count, sentence count.
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
  // Count runs ending in . ! or ? then whitespace/end.
  var m = text.trim().match(/[^.!?]+[.!?]+(\s|$)/g);
  if (m) return m.length;
  // If there's text but no terminator, call it one sentence.
  return text.trim().length > 0 ? 1 : 0;
}

function formatDuration(minutes) {
  // minutes can be fractional. Returns { minutes, seconds, label }.
  var totalSeconds = Math.round(minutes * 60);
  var m = Math.floor(totalSeconds / 60);
  var s = totalSeconds % 60;
  var label;
  if (m === 0)        label = s + ' sec';
  else if (s === 0)   label = m + ' min';
  else                label = m + ' min ' + s + ' sec';
  return { minutes: m, seconds: s, label: label };
}

function calculateReadTime(opts) {
  opts = opts || {};
  var text       = typeof opts.text === 'string' ? opts.text : '';
  var silentWpm  = opts.silentWpm != null ? Number(opts.silentWpm) : 250;
  var aloudWpm   = opts.aloudWpm  != null ? Number(opts.aloudWpm)  : 150;

  if (!isFinite(silentWpm) || silentWpm <= 0) throw new Error('Silent WPM must be greater than zero');
  if (!isFinite(aloudWpm)  || aloudWpm  <= 0) throw new Error('Aloud WPM must be greater than zero');

  var words     = countWords(text);
  var chars     = countCharacters(text, true);
  var charsNoWs = countCharacters(text, false);
  var sentences = countSentences(text);

  var silentMinutes = words / silentWpm;
  var aloudMinutes  = words / aloudWpm;

  return {
    words:            words,
    characters:       chars,
    charactersNoSpaces: charsNoWs,
    sentences:        sentences,
    silentWpm:        silentWpm,
    aloudWpm:         aloudWpm,
    silentMinutes:    silentMinutes,
    aloudMinutes:     aloudMinutes,
    silent:           formatDuration(silentMinutes),
    aloud:            formatDuration(aloudMinutes),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateReadTime, countWords, countCharacters, countSentences, formatDuration };
} else {
  window.ReadTime = { calculateReadTime, countWords, countCharacters, countSentences, formatDuration };
}
