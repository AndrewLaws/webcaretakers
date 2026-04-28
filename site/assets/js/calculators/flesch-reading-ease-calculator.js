'use strict';

/**
 * Flesch Reading Ease and Flesch-Kincaid Grade Level: pure logic library.
 *
 * Reading Ease  = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
 * Grade Level   = 0.39  * (words / sentences) + 11.8  * (syllables / words) - 15.59
 *
 * Word count: split on whitespace, ignore empty tokens.
 * Sentence count: split on . ! ? followed by whitespace or end-of-string.
 * Syllable count: vowel-group heuristic, drop trailing silent 'e' (except 'le'
 * endings where the e is sounded), minimum 1 syllable per word. Approximate.
 */

function countWords(text) {
  if (typeof text !== 'string' || text.trim() === '') return 0;
  var parts = text.trim().split(/\s+/);
  var n = 0;
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] !== '') n++;
  }
  return n;
}

function countSentences(text) {
  if (typeof text !== 'string') return 0;
  var trimmed = text.trim();
  if (trimmed === '') return 0;
  // Split on terminator punctuation followed by whitespace or end-of-string.
  var parts = trimmed.split(/[.!?]+(?:\s+|$)/);
  var n = 0;
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].trim() !== '') n++;
  }
  // If text has no terminal punctuation, treat the whole thing as one sentence.
  return n === 0 ? 1 : n;
}

function countSyllables(word) {
  if (typeof word !== 'string') return 0;
  // Strip any non-letters (apostrophes, punctuation), lowercase.
  var w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length === 0) return 0;
  if (w.length <= 3) return 1;

  // Drop trailing silent 'e', but keep 'le' endings (which add a syllable).
  if (/e$/.test(w) && !/le$/.test(w)) {
    w = w.slice(0, -1);
  }
  // Drop trailing 'es' or 'ed' that is typically silent.
  // Keep this conservative to avoid breaking common cases.
  // (Skipped: too many exceptions.)

  var groups = w.match(/[aeiouy]+/g);
  var count = groups ? groups.length : 0;
  return count > 0 ? count : 1;
}

function countTotalSyllables(text) {
  if (typeof text !== 'string') return 0;
  var trimmed = text.trim();
  if (trimmed === '') return 0;
  var parts = trimmed.split(/\s+/);
  var total = 0;
  for (var i = 0; i < parts.length; i++) {
    var stripped = parts[i].replace(/[^A-Za-z]/g, '');
    if (stripped === '') continue;
    total += countSyllables(stripped);
  }
  return total;
}

function readingEase(words, sentences, syllables) {
  if (words === 0 || sentences === 0) return 0;
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}

function gradeLevel(words, sentences, syllables) {
  if (words === 0 || sentences === 0) return 0;
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
}

function band(score) {
  if (score >= 90) {
    return { label: 'Very easy, around 5th grade', tone: 'easy' };
  }
  if (score >= 80) {
    return { label: 'Easy, around 6th grade', tone: 'easy' };
  }
  if (score >= 70) {
    return { label: 'Fairly easy, around 7th grade', tone: 'easy' };
  }
  if (score >= 60) {
    return { label: 'Plain English, 8th to 9th grade', tone: 'plain' };
  }
  if (score >= 50) {
    return { label: 'Fairly difficult, 10th to 12th grade', tone: 'tougher' };
  }
  if (score >= 30) {
    return { label: 'Difficult, college level', tone: 'hard' };
  }
  return { label: 'Very confusing, graduate level', tone: 'hard' };
}

function analyse(text) {
  var words = countWords(text);
  var sentences = countSentences(text);
  var syllables = countTotalSyllables(text);
  return {
    words: words,
    sentences: sentences,
    syllables: syllables,
    readingEase: readingEase(words, sentences, syllables),
    gradeLevel: gradeLevel(words, sentences, syllables)
  };
}

var api = {
  countWords: countWords,
  countSentences: countSentences,
  countSyllables: countSyllables,
  countTotalSyllables: countTotalSyllables,
  readingEase: readingEase,
  gradeLevel: gradeLevel,
  band: band,
  analyse: analyse
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.FleschReadingEase = api;
}
