(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HeadlinePowerWordScore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  // Curated power-word lists, grouped by the lever they pull on the reader.
  // Kept reasonably tight: ~60 words across four buckets, common copywriter staples.
  var POWER_WORDS = {
    emotional: [
      'amazing', 'incredible', 'beautiful', 'heartbreaking', 'unbelievable',
      'love', 'hate', 'painful', 'shocking', 'stunning',
      'remarkable', 'inspiring', 'gut-wrenching', 'jaw-dropping', 'devastating'
    ],
    curiosity: [
      'secret', 'hidden', 'discover', 'revealed', 'untold',
      'truth', 'mystery', 'why', 'reason', 'behind',
      'little-known', 'surprising', 'unexpected', 'confession', 'forbidden'
    ],
    urgency: [
      'now', 'instant', 'today', 'immediately', 'fast',
      'quick', 'urgent', 'deadline', 'last chance', 'stop',
      'warning', 'hurry', 'limited', 'rapid', 'overnight'
    ],
    value: [
      'free', 'proven', 'easy', 'essential', 'best',
      'guaranteed', 'effective', 'powerful', 'simple', 'ultimate',
      'mistake', 'definitive', 'complete', 'killer', 'no-nonsense'
    ]
  };

  // Tiny stop-word list for the common-word ratio. Kept short on purpose: this is a
  // ratio penalty for headlines where "the the of and" outnumbers the meat, not a
  // full NLP stop-word filter.
  var STOP_WORDS = [
    'a', 'an', 'and', 'or', 'but', 'the', 'of', 'in', 'on', 'at',
    'to', 'for', 'with', 'is', 'are', 'was', 'were', 'be', 'been',
    'as', 'by', 'it', 'its', 'this', 'that', 'these', 'those', 'from'
  ];

  // Crude positive/negative sentiment lists. We are not doing real sentiment analysis.
  // We just want to detect whether the headline leans hard one way (good) or sits
  // in flavourless neutral territory (bad for engagement).
  var POSITIVE_WORDS = [
    'win', 'best', 'love', 'great', 'amazing', 'happy', 'success',
    'beautiful', 'incredible', 'easy', 'free', 'proven', 'powerful',
    'inspiring', 'remarkable', 'guaranteed', 'effective'
  ];
  var NEGATIVE_WORDS = [
    'mistake', 'fail', 'worst', 'hate', 'shocking', 'painful',
    'devastating', 'warning', 'stop', 'avoid', 'ruin', 'broken',
    'wrong', 'terrible', 'awful', 'heartbreaking', 'gut-wrenching'
  ];

  // Audience profiles tilt the weighting slightly. B2B cares more about specificity
  // and length, consumer responds harder to emotion and urgency.
  var AUDIENCE_WEIGHTS = {
    general:  { power: 1.0, length: 1.0, sentiment: 1.0, number: 1.0, common: 1.0, format: 1.0 },
    B2B:      { power: 0.85, length: 1.15, sentiment: 0.75, number: 1.2, common: 1.1, format: 1.1 },
    consumer: { power: 1.2, length: 0.9, sentiment: 1.2, number: 1.1, common: 1.0, format: 1.05 }
  };

  function tokenise(headline) {
    if (typeof headline !== 'string') return [];
    return headline.toLowerCase().match(/[a-z][a-z'-]*/g) || [];
  }

  function findMatches(words, headlineLower) {
    var hits = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      // Word boundary, but allow hyphens inside (little-known etc.).
      // Allow simple plural/suffix matches (secret -> secrets, win -> winning) by
      // anchoring the start on a word boundary but letting the end be any non-letter
      // or end-of-string. This is rough on purpose: it keeps the lists short while
      // catching common inflections.
      var pattern = new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z]{0,3}($|[^a-z])', 'i');
      if (pattern.test(headlineLower)) hits.push(w);
    }
    return hits;
  }

  function scoreHeadline(input) {
    input = input || {};
    var headline = (input.headline || '').trim();
    var audience = input.audience && AUDIENCE_WEIGHTS[input.audience] ? input.audience : 'general';
    var weights = AUDIENCE_WEIGHTS[audience];

    if (!headline) {
      return {
        score: 0,
        label: 'Weak',
        headline: '',
        audience: audience,
        wordCount: 0,
        powerWords: { emotional: [], curiosity: [], urgency: [], value: [], total: 0 },
        commonWordRatio: 0,
        hasNumber: false,
        hasQuestion: false,
        isHowTo: false,
        sentiment: 'neutral',
        suggestions: ['Type a headline to score it.'],
        components: { power: 0, length: 0, sentiment: 0, number: 0, common: 0, format: 0 }
      };
    }

    var headlineLower = headline.toLowerCase();
    var tokens = tokenise(headline);
    var wordCount = tokens.length;

    // Power words: each category contributes up to 10 points.
    var powerWords = {
      emotional: findMatches(POWER_WORDS.emotional, headlineLower),
      curiosity: findMatches(POWER_WORDS.curiosity, headlineLower),
      urgency: findMatches(POWER_WORDS.urgency, headlineLower),
      value: findMatches(POWER_WORDS.value, headlineLower)
    };
    var totalPower = powerWords.emotional.length + powerWords.curiosity.length +
                     powerWords.urgency.length + powerWords.value.length;
    powerWords.total = totalPower;

    var powerScore = 0;
    powerScore += Math.min(powerWords.emotional.length * 7, 10);
    powerScore += Math.min(powerWords.curiosity.length * 7, 10);
    powerScore += Math.min(powerWords.urgency.length * 7, 10);
    powerScore += Math.min(powerWords.value.length * 7, 10);
    // Cap power component at 35 so it can't drown the rest of the score.
    powerScore = Math.min(powerScore, 35);

    // Length: ideal 6-12 words. Outside that band, lose points proportionally.
    var lengthScore;
    if (wordCount === 0) {
      lengthScore = 0;
    } else if (wordCount >= 6 && wordCount <= 12) {
      lengthScore = 20;
    } else if (wordCount >= 4 && wordCount < 6) {
      lengthScore = 12;
    } else if (wordCount > 12 && wordCount <= 16) {
      lengthScore = 12;
    } else if (wordCount < 4) {
      lengthScore = 5;
    } else {
      lengthScore = Math.max(0, 20 - (wordCount - 12) * 2);
    }

    // Sentiment skew: neutral is the worst place to be.
    var posHits = findMatches(POSITIVE_WORDS, headlineLower).length;
    var negHits = findMatches(NEGATIVE_WORDS, headlineLower).length;
    var sentiment;
    var sentimentScore;
    if (posHits === 0 && negHits === 0) {
      sentiment = 'neutral';
      sentimentScore = 2;
    } else if (Math.abs(posHits - negHits) >= 1 && (posHits >= 2 || negHits >= 2)) {
      sentiment = posHits > negHits ? 'positive-strong' : 'negative-strong';
      sentimentScore = 15;
    } else {
      sentiment = posHits > negHits ? 'positive' : (negHits > posHits ? 'negative' : 'mixed');
      sentimentScore = 10;
    }

    // Number bonus: digits suggest listicle structure ("7 things", "10 ways").
    var hasNumber = /\d/.test(headline);
    var numberScore = hasNumber ? 10 : 0;

    // Common-word ratio: too much filler dilutes the headline.
    var commonHits = 0;
    for (var i = 0; i < tokens.length; i++) {
      if (STOP_WORDS.indexOf(tokens[i]) !== -1) commonHits++;
    }
    var commonWordRatio = wordCount > 0 ? commonHits / wordCount : 0;
    var commonScore;
    if (commonWordRatio <= 0.25) commonScore = 10;
    else if (commonWordRatio <= 0.4) commonScore = 6;
    else if (commonWordRatio <= 0.55) commonScore = 3;
    else commonScore = 0;

    // Format bonus: how-to and questions both lean into reader curiosity.
    var hasQuestion = /\?/.test(headline) || /^(why|how|what|who|when|where|which)\b/i.test(headline.trim());
    var isHowTo = /^how\s+to\b/i.test(headline.trim());
    var formatScore = 0;
    if (isHowTo) formatScore = 10;
    else if (hasQuestion) formatScore = 8;

    // Apply audience weights.
    var components = {
      power: powerScore * weights.power,
      length: lengthScore * weights.length,
      sentiment: sentimentScore * weights.sentiment,
      number: numberScore * weights.number,
      common: commonScore * weights.common,
      format: formatScore * weights.format
    };

    var raw = components.power + components.length + components.sentiment +
              components.number + components.common + components.format;
    var score = Math.max(0, Math.min(100, Math.round(raw)));

    var label;
    if (score >= 80) label = 'Killer';
    else if (score >= 60) label = 'Strong';
    else if (score >= 40) label = 'Average';
    else label = 'Weak';

    var suggestions = [];
    if (powerWords.emotional.length === 0) suggestions.push('Add an emotional power word (love, shocking, beautiful).');
    if (powerWords.curiosity.length === 0) suggestions.push('Add a curiosity hook (secret, hidden, why, untold).');
    if (powerWords.urgency.length === 0 && audience !== 'B2B') suggestions.push('Try an urgency word (now, instant, today).');
    if (powerWords.value.length === 0) suggestions.push('Promise value (free, proven, easy, essential).');
    if (wordCount > 12) suggestions.push('Shorten to 12 words or fewer.');
    if (wordCount > 0 && wordCount < 6) suggestions.push('Lengthen to at least 6 words.');
    if (!hasNumber) suggestions.push('Add a number for a listicle feel ("7 ways", "10 mistakes").');
    if (sentiment === 'neutral') suggestions.push('Push the sentiment one way: bold positive or bold negative beats flavourless neutral.');
    if (commonWordRatio > 0.4) suggestions.push('Cut filler words. Too many of, the, and, in, etc.');
    if (!hasQuestion && !isHowTo) suggestions.push('Consider a how-to or question framing.');

    return {
      score: score,
      label: label,
      headline: headline,
      audience: audience,
      wordCount: wordCount,
      powerWords: powerWords,
      commonWordRatio: commonWordRatio,
      hasNumber: hasNumber,
      hasQuestion: hasQuestion,
      isHowTo: isHowTo,
      sentiment: sentiment,
      suggestions: suggestions,
      components: components
    };
  }

  return {
    scoreHeadline: scoreHeadline,
    POWER_WORDS: POWER_WORDS,
    STOP_WORDS: STOP_WORDS,
    POSITIVE_WORDS: POSITIVE_WORDS,
    NEGATIVE_WORDS: NEGATIVE_WORDS
  };
}));
