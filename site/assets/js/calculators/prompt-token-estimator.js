(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PromptTokenEstimator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  // Chars-per-token divisors per model family. These are public-information
  // back-of-envelope figures: GPT and Anthropic both quote roughly 4 chars per
  // token for English prose, Llama and Mistral's sentencepiece tokenisers run
  // tighter (more tokens per character), Gemini's runs slightly looser.
  // Real tokenisers will vary by ±15% depending on the text.
  var FAMILY_DIVISORS = {
    gpt: 4.0,
    claude: 3.8,
    gemini: 4.1,
    llama: 3.5,
    mistral: 3.7
  };

  var MODELS = [
    { id: 'gpt-4o', name: 'GPT-4o', vendor: 'OpenAI', family: 'gpt' },
    { id: 'gpt-4o-mini', name: 'GPT-4o mini', vendor: 'OpenAI', family: 'gpt' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', vendor: 'Anthropic', family: 'claude' },
    { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', vendor: 'Anthropic', family: 'claude' },
    { id: 'claude-4-opus', name: 'Claude 4 Opus', vendor: 'Anthropic', family: 'claude' },
    { id: 'gemini-1-5-pro', name: 'Gemini 1.5 Pro', vendor: 'Google', family: 'gemini' },
    { id: 'gemini-1-5-flash', name: 'Gemini 1.5 Flash', vendor: 'Google', family: 'gemini' },
    { id: 'llama-3', name: 'Llama 3 (70B)', vendor: 'Meta', family: 'llama' },
    { id: 'mistral', name: 'Mistral Large', vendor: 'Mistral', family: 'mistral' }
  ];

  function findModel(id) {
    for (var i = 0; i < MODELS.length; i++) {
      if (MODELS[i].id === id) return MODELS[i];
    }
    return null;
  }

  function divisorFor(modelId) {
    var m = findModel(modelId);
    if (!m) return FAMILY_DIVISORS.gpt;
    return FAMILY_DIVISORS[m.family] || FAMILY_DIVISORS.gpt;
  }

  function estimateTokens(opts) {
    opts = opts || {};
    var prompt = typeof opts.prompt === 'string' ? opts.prompt : '';
    var modelId = opts.model || 'gpt-4o';

    var chars = prompt.length;
    var trimmed = prompt.trim();
    if (trimmed.length === 0) {
      return { tokens: 0, words: 0, chars: chars, divisor: divisorFor(modelId), model: modelId };
    }

    // Word count: whitespace-separated runs of non-whitespace.
    var words = trimmed.split(/\s+/).length;

    var divisor = divisorFor(modelId);
    var tokens = Math.round(chars / divisor);

    return {
      tokens: tokens,
      words: words,
      chars: chars,
      divisor: divisor,
      model: modelId
    };
  }

  function estimateCost(opts) {
    opts = opts || {};
    var tokens = typeof opts.tokens === 'number' && isFinite(opts.tokens) ? opts.tokens : 0;
    var price = opts.pricePer1k;
    if (typeof price !== 'number' || !isFinite(price) || price < 0) return null;
    return (tokens / 1000) * price;
  }

  return {
    MODELS: MODELS,
    FAMILY_DIVISORS: FAMILY_DIVISORS,
    estimateTokens: estimateTokens,
    estimateCost: estimateCost
  };
}));
