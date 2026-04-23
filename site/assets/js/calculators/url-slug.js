'use strict';

/**
 * URL Slug Generator.
 *
 * Turns any text into a clean URL slug: lowercase, hyphen-separated,
 * ASCII only, optionally with stop words removed, and trimmed to a
 * maximum length without breaking a word.
 */

// Small but pragmatic English stop-word list. Slug-builders usually strip
// these for SEO slugs; they rarely add meaning and inflate the URL.
var STOP_WORDS = [
  'a','an','and','as','at','be','but','by','for','from','how','if','in','into',
  'is','it','of','on','or','so','than','that','the','then','this','to','was',
  'were','what','when','where','which','who','will','with','you','your','yours',
  'i','me','my','we','our','he','she','they','them','his','her','their','its',
  'are','am','been','being','do','does','did','has','have','had','just','not',
  'can','about','over','under','up','down','out','off'
];

// Transliteration map for common Latin-1 + Unicode accents/characters to
// ASCII. Not exhaustive but covers Western European prose well.
var TRANSLIT = {
  'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a','ā':'a','ă':'a','ą':'a',
  'è':'e','é':'e','ê':'e','ë':'e','ē':'e','ĕ':'e','ė':'e','ę':'e','ě':'e',
  'ì':'i','í':'i','î':'i','ï':'i','ī':'i','ĭ':'i','į':'i',
  'ò':'o','ó':'o','ô':'o','õ':'o','ö':'o','ø':'o','ō':'o','ŏ':'o','ő':'o',
  'ù':'u','ú':'u','û':'u','ü':'u','ū':'u','ŭ':'u','ů':'u','ű':'u','ų':'u',
  'ý':'y','ÿ':'y',
  'ç':'c','ć':'c','ĉ':'c','ċ':'c','č':'c',
  'ñ':'n','ń':'n','ņ':'n','ň':'n',
  'ß':'ss','æ':'ae','œ':'oe','ð':'d','þ':'th',
  'š':'s','ś':'s','ş':'s','ŝ':'s','ș':'s',
  'ž':'z','ź':'z','ż':'z',
  'ł':'l','ľ':'l','ĺ':'l','ļ':'l',
  'ť':'t','ţ':'t','ț':'t',
  'ř':'r','ŕ':'r','ŗ':'r',
  '’':"'", '‘':"'", '“':'"', '”':'"', '–':'-', '—':'-'
};

function transliterate(str) {
  var out = '';
  for (var i = 0; i < str.length; i++) {
    var ch = str.charAt(i);
    var lower = ch.toLowerCase();
    if (TRANSLIT.hasOwnProperty(lower)) {
      out += TRANSLIT[lower];
    } else {
      out += ch;
    }
  }
  return out;
}

function generateSlug(opts) {
  opts = opts || {};
  var text        = typeof opts.text === 'string' ? opts.text : '';
  var separator   = opts.separator === '_' ? '_' : '-';
  var removeStops = opts.removeStopWords === true;
  var maxLength   = opts.maxLength != null ? Math.max(0, parseInt(opts.maxLength, 10) || 0) : 0; // 0 = unlimited
  var lowercase   = opts.lowercase !== false; // default true

  if (!text.trim()) {
    return { slug: '', wordCount: 0, dropped: [], truncated: false, original: text };
  }

  var working = transliterate(text);
  if (lowercase) working = working.toLowerCase();

  // Replace anything not a letter/digit with a space, then collapse.
  working = working.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  var words = working.length ? working.split(/\s+/) : [];

  var dropped = [];
  if (removeStops) {
    var kept = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i].toLowerCase();
      if (STOP_WORDS.indexOf(w) !== -1) {
        dropped.push(words[i]);
      } else {
        kept.push(words[i]);
      }
    }
    // Don't remove stops if that would leave nothing.
    if (kept.length > 0) words = kept;
    else dropped = [];
  }

  var slug = words.join(separator);

  var truncated = false;
  if (maxLength > 0 && slug.length > maxLength) {
    truncated = true;
    // Trim on word boundary.
    var cut = slug.slice(0, maxLength);
    var lastSep = cut.lastIndexOf(separator);
    if (lastSep > 0) cut = cut.slice(0, lastSep);
    slug = cut.replace(new RegExp('\\' + separator + '+$'), '');
  }

  return {
    slug:      slug,
    wordCount: words.length,
    dropped:   dropped,
    truncated: truncated,
    original:  text,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateSlug, transliterate, STOP_WORDS };
} else {
  window.UrlSlug = { generateSlug, transliterate, STOP_WORDS };
}
