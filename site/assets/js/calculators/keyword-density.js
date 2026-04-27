'use strict';

/**
 * Keyword Density Calculator.
 *
 * Pure functions for tokenising prose and computing 1-, 2- and 3-gram
 * frequency tables with density percentages. Designed for SEO use:
 * lowercase normalisation, internal hyphens preserved, punctuation
 * stripped, contractions kept as one token, optional stop-word filter.
 *
 * Density is count / totalWords * 100. Total words is the count after
 * tokenisation but before any stop-word filtering, so a stop-word filter
 * never inflates the percentage of the words you actually care about.
 */

// Standard English stop list (~175 words). Used for the toggle. Kept as
// an array for IE-friendly indexOf rather than a Set; the list is small.
var STOP_WORDS = [
  // articles, conjunctions, common prepositions
  'a','about','above','after','again','against','all','am','an','and','any',
  'are','as','at','be','because','been','before','being','below','between',
  'both','but','by','can','cannot','could','did','do','does','doing','don',
  'down','during','each','few','for','from','further','had','has','have',
  'having','he','her','here','hers','herself','him','himself','his','how',
  'i','if','in','into','is','it','its','itself','just','let','may','me','might',
  'more','most','must','my','myself','no','nor','not','now','of','off','on',
  'once','only','or','other','ought','our','ours','ourselves','out','over',
  'own','same','shall','she','should','so','some','such','than','that','the',
  'their','theirs','them','themselves','then','there','these','they','this',
  'those','through','to','too','under','until','up','very','was','we','were',
  'what','when','where','which','while','who','whom','why','will','with',
  'would','you','your','yours','yourself','yourselves',
  // common contractions (post-tokenisation form keeps the apostrophe)
  "don't","doesn't","didn't","isn't","aren't","wasn't","weren't","won't",
  "wouldn't","shouldn't","couldn't","can't","cannot","mustn't","shan't",
  "i'm","you're","he's","she's","it's","we're","they're","i've","you've",
  "we've","they've","i'll","you'll","he'll","she'll","we'll","they'll",
  "i'd","you'd","he'd","she'd","we'd","they'd","that's","there's","here's",
  "what's","who's","let's",
  // misc filler that adds noise without meaning in SEO terms
  'also','get','got','also','one','two','three','many','much','make','made',
  'like','well','new','old','first','last'
];

// De-duplicate (paranoia, since the list above repeats nothing intentionally).
(function dedupe() {
  var seen = {};
  var out = [];
  for (var i = 0; i < STOP_WORDS.length; i++) {
    var w = STOP_WORDS[i];
    if (!seen[w]) { seen[w] = true; out.push(w); }
  }
  STOP_WORDS = out;
})();

var MIN_WORDS = 50;
var TOP_N = 25;
var PROVE_IT_TOKENS = 30;

/**
 * Tokenise prose into lowercase words.
 *
 * Rules:
 *   - Lowercase everything first.
 *   - Smart quotes normalised to ASCII apostrophe; em/en dashes treated
 *     as separators (not part of words).
 *   - A word is a run of letters/digits, optionally containing a single
 *     hyphen or apostrophe between alphanumerics ("long-tail", "don't").
 *   - Leading/trailing punctuation (including hyphens, apostrophes,
 *     percent signs, quotes, brackets, full stops) is stripped.
 *   - Numbers are kept as their own tokens.
 */
function tokenise(text) {
  if (typeof text !== 'string' || !text) return [];

  // Normalise smart quotes to ASCII apostrophe; treat dashes as separators.
  var s = text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, ' ');

  // Match runs of letters/digits with optional internal hyphens or apostrophes.
  // \p{L}/\p{N} would be nicer but we keep it ASCII-friendly here; modern
  // engines all support unicode property escapes, so opt in for accents.
  var re = /[\p{L}\p{N}]+(?:['\-][\p{L}\p{N}]+)*/gu;
  var tokens = s.match(re) || [];

  // A final clean pass: trim any stray apostrophes/hyphens from the edges
  // (the regex shouldn't produce them, but defence in depth).
  for (var i = 0; i < tokens.length; i++) {
    tokens[i] = tokens[i].replace(/^['\-]+|['\-]+$/g, '');
  }
  return tokens.filter(function (t) { return t.length > 0; });
}

/**
 * Build n-gram frequency map from a token list.
 *
 * If `filter` is true, any n-gram that contains a stop word is dropped.
 * That means a 3-gram like "the quick brown" is excluded with the filter
 * on, but "quick brown fox" survives.
 */
function ngrams(tokens, n, filter, stopSet) {
  var counts = Object.create(null);
  for (var i = 0; i + n <= tokens.length; i++) {
    var slice = tokens.slice(i, i + n);
    if (filter) {
      var skip = false;
      for (var j = 0; j < n; j++) {
        if (stopSet[slice[j]]) { skip = true; break; }
      }
      if (skip) continue;
    }
    var key = slice.join(' ');
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function rankTop(counts, total, topN) {
  var rows = [];
  for (var k in counts) {
    if (Object.prototype.hasOwnProperty.call(counts, k)) {
      rows.push({ term: k, count: counts[k], density: (counts[k] / total) * 100 });
    }
  }
  rows.sort(function (a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return a.term < b.term ? -1 : a.term > b.term ? 1 : 0;
  });
  return rows.slice(0, topN);
}

function analyse(opts) {
  opts = opts || {};
  var text = typeof opts.text === 'string' ? opts.text : '';
  var removeStops = opts.removeStopWords !== false; // default ON
  var topN = opts.topN || TOP_N;

  var tokens = tokenise(text);
  var totalWords = tokens.length;

  if (totalWords < MIN_WORDS) {
    return {
      tooShort: true,
      totalWords: totalWords,
      uniqueWords: 0,
      unigrams: [], bigrams: [], trigrams: [],
      proveIt: { firstTokens: tokens.slice(0, PROVE_IT_TOKENS), topTerm: null, topCount: 0, topTotal: totalWords, topDensity: 0 }
    };
  }

  // Build a set for fast stop-word lookup.
  var stopSet = Object.create(null);
  for (var s = 0; s < STOP_WORDS.length; s++) stopSet[STOP_WORDS[s]] = true;

  // Unique word count is computed across the raw token list (filtering is
  // a presentation choice, not a corpus property).
  var uniqueSet = Object.create(null);
  for (var u = 0; u < tokens.length; u++) uniqueSet[tokens[u]] = true;
  var uniqueWords = Object.keys(uniqueSet).length;

  // For unigrams, when the filter is on we drop stop words entirely.
  // For bigrams/trigrams, we drop any n-gram containing a stop word.
  var uniCounts = Object.create(null);
  for (var t = 0; t < tokens.length; t++) {
    var w = tokens[t];
    if (removeStops && stopSet[w]) continue;
    uniCounts[w] = (uniCounts[w] || 0) + 1;
  }
  var biCounts = ngrams(tokens, 2, removeStops, stopSet);
  var triCounts = ngrams(tokens, 3, removeStops, stopSet);

  var unigrams = rankTop(uniCounts, totalWords, topN);
  var bigrams  = rankTop(biCounts,  totalWords, topN);
  var trigrams = rankTop(triCounts, totalWords, topN);

  var topTerm = unigrams.length ? unigrams[0].term : null;
  var topCount = unigrams.length ? unigrams[0].count : 0;
  var topDensity = unigrams.length ? unigrams[0].density : 0;

  return {
    tooShort: false,
    totalWords: totalWords,
    uniqueWords: uniqueWords,
    unigrams: unigrams,
    bigrams: bigrams,
    trigrams: trigrams,
    proveIt: {
      firstTokens: tokens.slice(0, PROVE_IT_TOKENS),
      topTerm: topTerm,
      topCount: topCount,
      topTotal: totalWords,
      topDensity: topDensity
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tokenise, analyse, ngrams, STOP_WORDS, MIN_WORDS, TOP_N };
} else {
  window.KeywordDensity = { tokenise: tokenise, analyse: analyse, STOP_WORDS: STOP_WORDS, MIN_WORDS: MIN_WORDS, TOP_N: TOP_N };
}
