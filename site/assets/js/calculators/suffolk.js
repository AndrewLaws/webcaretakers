// Suffolk dialect lexicon and helpers.
// Source material: Charlie Haylock's "Larn Yarself Silly Suffolk" and
// "Sloightly on th' Huh", plus general Suffolk dialect tradition.
// This is affectionate pastiche, not a serious linguistic record.
(function (root, factory) {
  'use strict';
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  } else {
    root.Suffolk = mod;
  }
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // Word-level substitutions. Keys are English; values are Suffolk.
  // Matched case-insensitively on word boundaries. Original capitalisation
  // is preserved on the first letter.
  var WORDS = {
    // Pronouns and grammar
    'i':         'oi',
    'my':        'moi',
    'me':        'me',
    'you':       'yew',
    'your':      'yar',
    'yours':     'yars',
    'yourself':  'yarself',
    'yourselves':'yarselves',
    'we':        'we',
    'us':        'us',
    'our':       'ar',
    'they':      'they',
    'them':      'em',
    'this':      'this',
    'that':      'tha\'',
    'these':     'these',
    'those':     'them',

    // Articles and common function words
    'the':       'tha',
    'a':         'a',
    'an':        'an',
    'of':        'o\'',
    'and':       'an\'',
    'to':        'ter',
    'for':       'fer',
    'with':      'wi\'',
    'without':   'wi\'out',
    'from':      'from',
    'because':   'cos',
    'very':      'right',
    'really':    'roight',
    'just':      'jus\'',
    'also':      'also',
    'always':    'allus',
    'never':     'niver',
    'before':    'afore',
    'after':     'arter',
    'over':      'ower',
    'across':    'acrorst',
    'between':   'atween',
    'among':     'among',

    // Verbs
    'am':        'be',
    'is':        'be',
    'are':       'be',
    'was':       'were',
    'were':      'were',
    'been':      'bin',
    'have':      'hev',
    'has':       'hev',
    'had':       'hed',
    'do':        'dew',
    'does':      'dew',
    'did':       'dun',
    'done':      'dun',
    'go':        'goo',
    'goes':      'goos',
    'going':     'gooin\'',
    'gone':      'gorn',
    'come':      'cum',
    'came':      'cum',
    'see':       'see',
    'saw':       'sin',
    'seen':      'sin',
    'say':       'sayd',
    'said':      'sayd',
    'know':      'knaw',
    'knew':      'knaw\'d',
    'think':     'rekkon',
    'thought':   'rekkon\'d',
    'reckon':    'rekkon',
    'believe':   'rekkon',
    'remember':  'mind',
    'look':      'lookit',
    'looking':   'lookin\'',
    'listen':    'hark',
    'wait':      'howd hard',
    'stop':      'howd hard',
    'hurry':     'get a wiggle on',
    'work':      'graft',
    'working':   'graftin\'',
    'eat':       'ate',
    'ate':       'ate',
    'drink':     'sup',
    'sleep':     'kip',
    'walk':      'stroll',
    'talk':      'mardle',
    'talking':   'mardlin\'',
    'chat':      'mardle',
    'chatting':  'mardlin\'',
    'gossip':    'mardle',
    'fight':     'scrap',
    'make':      'mek',
    'made':      'med',
    'take':      'tek',
    'took':      'tuk',
    'taken':     'tuk',
    'give':      'giv',
    'gave':      'giv',
    'put':       'chuck',
    'throw':     'chuck',
    'let':       'let',
    'get':       'git',
    'got':       'got',
    'tell':      'tell',
    'told':      'tol\'',

    // Nouns — people
    'man':       'bor',
    'boy':       'bor',
    'lad':       'bor',
    'friend':    'owd bor',
    'mate':      'owd partner',
    'woman':     'mawther',
    'girl':      'mawther',
    'lass':      'mawther',
    'child':     'owd nipper',
    'children':  'nippers',
    'people':    'folks',
    'person':    'bor',
    'everyone':  'tha lot o\' ya',
    'father':    'farther',
    'mother':    'mar',
    'grandfather':'ganfer',
    'grandmother':'gammer',

    // Nouns — things and places
    'nothing':   'nuffen',
    'something': 'suffen',
    'anything':  'aught',
    'everything':'tha lot',
    'nonsense':  'squit',
    'rubbish':   'squit',
    'thing':     'owd thing',
    'house':     'hoose',
    'home':      'hoom',
    'road':      'drift',
    'street':    'drift',
    'field':     'medder',
    'pub':       'owd boozer',
    'beer':      'owd beer',
    'drink':     'sup',
    'food':      'grub',
    'lunch':     'dinner',
    'dinner':    'tea',
    'afternoon': 'arternoon',
    'evening':   'evenin\'',
    'morning':   'mornin\'',
    'night':     'noight',
    'today':     'terday',
    'tomorrow':  'termorrer',
    'yesterday': 'yisty',

    // Adjectives
    'old':       'owd',
    'young':     'young',
    'strange':   'rum',
    'weird':     'rum',
    'odd':       'rum',
    'crooked':   'on tha huh',
    'wonky':     'on tha huh',
    'tired':     'fair wore out',
    'cold':      'parky',
    'hot':       'roastin\'',
    'wet':       'drownded',
    'dirty':     'mucky',
    'good':      'right good',
    'great':     'a right good\'un',
    'bad':       'rum owd',
    'big':       'gert',
    'small':     'titchy',
    'stupid':    'silly\'ed',
    'clever':    'sharp',
    'angry':     'narky',
    'happy':     'chuffed',
    'drunk':     'kaylied',

    // Affirm/negate
    'yes':       'ar',
    'no':        'noo',
    'okay':      'roight yew are',
    'alright':   'roight yew are',
    'hello':     'hulloo',
    'goodbye':   'fare ya well',
    'off':       'orf',

    // Exclamations
    'wow':       'blarst me',
    'oh':        'cor',
    'well':      'well',
  };

  // Contractions — applied before the word pass so "what's" catches "what's"
  // as a unit rather than being split on the apostrophe.
  var CONTRACTIONS = {
    'what\'s':    'woss',
    'that\'s':    'tha\'s',
    'there\'s':   'tha\'s',
    'isn\'t':     'ent',
    'aren\'t':    'ent',
    'wasn\'t':    'warnt',
    'weren\'t':   'warnt',
    'don\'t':     'dornt',
    'doesn\'t':   'dornt',
    'didn\'t':    'dint',
    'can\'t':     'cor',
    'couldn\'t':  'cun\'t',
    'won\'t':     'wornt',
    'wouldn\'t':  'unt',
    'shouldn\'t': 'shunt',
    'haven\'t':   'hent',
    'hasn\'t':    'hent',
    'hadn\'t':    'hent',
    'it\'s':      'tis',
    'i\'m':       'oi be',
    'i\'ve':      'oi hev',
    'i\'ll':      'oi\'ll',
    'you\'re':    'yew be',
    'you\'ve':    'yew hev',
    'you\'ll':    'yew\'ll',
    'we\'re':     'we be',
    'we\'ve':     'we hev',
    'they\'re':   'they be',
    'he\'s':      'he be',
    'she\'s':     'she be',
  };

  // Word pool for Lorem Ipsum generation. These are Suffolk words and short
  // phrases that read naturally when mashed together. No English filler.
  var LOREM_WORDS = [
    'bor', 'mawther', 'owd', 'partner', 'tha', 'squit', 'mardle', 'dew',
    'hev', 'goo', 'gooin\'', 'gorn', 'orf', 'sin', 'suffen', 'nuffen',
    'rum', 'un', 'on', 'tha', 'huh', 'allus', 'afore', 'arter', 'ower',
    'medder', 'drift', 'hoose', 'hoom', 'grub', 'beer', 'tea', 'dinner',
    'parky', 'roastin\'', 'mucky', 'gert', 'titchy', 'narky', 'chuffed',
    'kaylied', 'sharp', 'silly\'ed', 'blarst', 'cor', 'hark', 'howd',
    'hard', 'together', 'graft', 'graftin\'', 'kip', 'chuck', 'dickey',
    'dwile', 'bishy', 'barnabee', 'tittermatorter', 'troshel', 'fourses',
    'beaver', 'jiffle', 'push', 'muckwash', 'down', 'drift', 'roight',
    'yew', 'oi', 'ent', 'woss', 'tis', 'cos', 'wi\'', 'an\'', 'ter',
    'fer', 'owd', 'bor', 'farther', 'mar', 'ganfer', 'gammer', 'nippers',
    'rekkon', 'knaw', 'mek', 'tek', 'giv', 'git', 'chuck', 'stroll',
  ];

  // Opener phrases that can lead a paragraph for flavour.
  var OPENERS = [
    'Hare we goo together',
    'Blarst me bor',
    'Cor blarst',
    'Hold yew hard',
    'Well oi\'ll be',
    'Roight yew are bor',
    'Down tha owd drift',
    'Tha\'s a rum owd dew',
    'Oi rekkon',
    'Tha\'s a roight good\'un',
    'Ha\'ar ya gooin\' on',
    'Mind how yew goo',
  ];

  // Closer phrases to end paragraphs on a local flavour note.
  var CLOSERS = [
    'an\' tha\'s tha way of it',
    'if yew tek moi meanin\'',
    'bor',
    'together',
    'owd partner',
    'tha\'s a rum\'un',
    'as they say in Woodbridge',
    'an\' no mistake',
    'fair wore out oi be',
    'all on a muckwash',
  ];

  // --- Helpers -------------------------------------------------------------

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Preserve original capitalisation: if the original starts with a capital,
  // capitalise the replacement's first letter too. If the original is ALL
  // CAPS, upper-case the whole replacement.
  function matchCase(original, replacement) {
    if (!original) return replacement;
    if (original === original.toUpperCase() && original.length > 1) {
      return replacement.toUpperCase();
    }
    if (original[0] === original[0].toUpperCase()) {
      return replacement[0].toUpperCase() + replacement.slice(1);
    }
    return replacement;
  }

  // Translate English text into Suffolk. Applies contractions first (longest
  // match wins by iterating keys sorted longest-first), then single-word
  // substitutions on word boundaries.
  function translate(text) {
    if (typeof text !== 'string' || text.length === 0) return '';

    var out = text;

    // Contractions — sort longest-first so "shouldn't" wins over "it's".
    var ckeys = Object.keys(CONTRACTIONS).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < ckeys.length; i++) {
      var ck = ckeys[i];
      var cre = new RegExp('\\b' + escapeRegExp(ck) + '\\b', 'gi');
      out = out.replace(cre, function (m) { return matchCase(m, CONTRACTIONS[ck]); });
    }

    // Single-word substitutions.
    var wkeys = Object.keys(WORDS).sort(function (a, b) { return b.length - a.length; });
    for (var j = 0; j < wkeys.length; j++) {
      var wk = wkeys[j];
      var wre = new RegExp('\\b' + escapeRegExp(wk) + '\\b', 'gi');
      out = out.replace(wre, function (m) { return matchCase(m, WORDS[wk]); });
    }

    return out;
  }

  // Seeded pseudo-random for predictable tests when a seed is provided.
  function makeRng(seed) {
    if (seed == null) return Math.random;
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  // Build one sentence of 6-14 Suffolk words, optionally topped with an
  // opener and tailed with a closer.
  function buildSentence(rng, useOpener, useCloser) {
    var len = 6 + Math.floor(rng() * 9);
    var parts = [];
    if (useOpener && rng() < 0.6) parts.push(pick(OPENERS, rng));
    for (var i = 0; i < len; i++) parts.push(pick(LOREM_WORDS, rng));
    if (useCloser && rng() < 0.5) parts.push(pick(CLOSERS, rng));
    var s = parts.join(' ').replace(/\s+/g, ' ').trim();
    // Comma somewhere in the middle for rhythm.
    if (s.length > 30 && rng() < 0.5) {
      var midTokens = s.split(' ');
      var mid = Math.floor(midTokens.length / 2);
      midTokens[mid] = midTokens[mid] + ',';
      s = midTokens.join(' ');
    }
    s = s[0].toUpperCase() + s.slice(1);
    var enders = ['.', '.', '.', '!', '?'];
    return s + enders[Math.floor(rng() * enders.length)];
  }

  // Generate Suffolk lorem ipsum.
  // opts: { paragraphs (default 3), sentencesPerParagraph (default 4),
  //         classicOpener (default true — lead with "Hare we goo bor"),
  //         seed (optional integer for reproducible output) }
  function generate(opts) {
    opts = opts || {};
    var paras  = Math.max(1, opts.paragraphs || 3);
    var sents  = Math.max(1, opts.sentencesPerParagraph || 4);
    var classic = opts.classicOpener !== false;
    var rng = makeRng(opts.seed);

    var out = [];
    for (var p = 0; p < paras; p++) {
      var sentences = [];
      for (var s = 0; s < sents; s++) {
        var isFirst = (p === 0 && s === 0);
        var useOpener = isFirst ? classic : (rng() < 0.35);
        var useCloser = (rng() < 0.4);
        sentences.push(buildSentence(rng, useOpener, useCloser));
      }
      // Force the very first sentence to start with the classic Suffolk opener.
      if (classic && p === 0) {
        sentences[0] = 'Hare we goo together, ' + sentences[0][0].toLowerCase() + sentences[0].slice(1);
      }
      out.push(sentences.join(' '));
    }
    return out.join('\n\n');
  }

  return {
    WORDS: WORDS,
    CONTRACTIONS: CONTRACTIONS,
    LOREM_WORDS: LOREM_WORDS,
    OPENERS: OPENERS,
    CLOSERS: CLOSERS,
    translate: translate,
    generate: generate,
  };
}));
