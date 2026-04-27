// AI vs Human Writer Cost Calculator — pure-logic helpers.
//
// Compares the monthly cost of producing a target word volume of written
// content via an LLM API versus paying a human writer. The MODELS list and
// pricing here is duplicated from llm-token-usage.js so this calculator can
// stand on its own; both files should be updated together when prices move.
// PRICING_LAST_VERIFIED tracks the date the figures were last reconciled
// against provider pricing pages.

'use strict';

const PRICING_LAST_VERIFIED = '2026-04-26';

// Approximate output tokens per word of finished prose. The 4-chars-per-token
// rule of thumb plus an average English word length of about 5.1 chars
// (including a trailing space) lands at roughly 1.3 tokens per word. We use
// 1.3 across the board and label the figure as approximate.
const TOKENS_PER_WORD = 1.3;

const MODELS = [
  {
    id: 'claude-opus-4-7',
    name: 'Claude Opus 4.7',
    vendor: 'Anthropic',
    inputPer1M: 5.00,
    outputPer1M: 25.00,
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    vendor: 'Anthropic',
    inputPer1M: 3.00,
    outputPer1M: 15.00,
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    vendor: 'Anthropic',
    inputPer1M: 1.00,
    outputPer1M: 5.00,
  },
  {
    id: 'gpt-5-5',
    name: 'GPT-5.5',
    vendor: 'OpenAI',
    inputPer1M: 5.00,
    outputPer1M: 30.00,
  },
  {
    id: 'gpt-5-4',
    name: 'GPT-5.4',
    vendor: 'OpenAI',
    inputPer1M: 2.50,
    outputPer1M: 15.00,
  },
  {
    id: 'gpt-5-4-mini',
    name: 'GPT-5.4 mini',
    vendor: 'OpenAI',
    inputPer1M: 0.75,
    outputPer1M: 4.50,
  },
  {
    id: 'gemini-3-1-pro',
    name: 'Gemini 3.1 Pro (preview)',
    vendor: 'Google',
    inputPer1M: 2.00,
    outputPer1M: 12.00,
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash (preview)',
    vendor: 'Google',
    inputPer1M: 0.50,
    outputPer1M: 3.00,
  },
  {
    id: 'gemini-2-5-pro',
    name: 'Gemini 2.5 Pro',
    vendor: 'Google',
    inputPer1M: 1.25,
    outputPer1M: 10.00,
  },
  {
    id: 'gemini-2-5-flash',
    name: 'Gemini 2.5 Flash',
    vendor: 'Google',
    inputPer1M: 0.30,
    outputPer1M: 2.50,
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4-Flash',
    vendor: 'DeepSeek',
    inputPer1M: 0.14,
    outputPer1M: 0.28,
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4-Pro',
    vendor: 'DeepSeek',
    inputPer1M: 0.435,
    outputPer1M: 0.87,
  },
];

// Convert a target wordcount to an approximate output-token count using the
// 1.3 tokens-per-word approximation (4-chars-per-token rule applied to ~5 char
// English words plus spaces).
function wordsToTokens(words) {
  if (!Number.isFinite(words) || words < 0) {
    throw new Error('wordsToTokens: words must be a non-negative number');
  }
  return Math.ceil(words * TOKENS_PER_WORD);
}

// Cost of producing the given monthly word volume on a given model.
// Each article is one API call: inputTokensPerArticle covers the system
// prompt plus brief; outputTokens is derived from articleWords. Returns
// the all-in monthly cost (USD) plus the per-article breakdown.
function llmMonthlyCost({ model, wordsPerMonth, articleWords, inputTokensPerArticle }) {
  if (!model || typeof model.inputPer1M !== 'number' || typeof model.outputPer1M !== 'number') {
    throw new Error('llmMonthlyCost: model with inputPer1M and outputPer1M required');
  }
  if (!Number.isFinite(wordsPerMonth) || wordsPerMonth < 0) {
    throw new Error('llmMonthlyCost: wordsPerMonth must be a non-negative number');
  }
  if (!Number.isFinite(articleWords) || articleWords <= 0) {
    throw new Error('llmMonthlyCost: articleWords must be a positive number');
  }
  if (!Number.isFinite(inputTokensPerArticle) || inputTokensPerArticle < 0) {
    throw new Error('llmMonthlyCost: inputTokensPerArticle must be a non-negative number');
  }

  const articlesPerMonth = wordsPerMonth / articleWords;
  const outputTokensPerArticle = wordsToTokens(articleWords);
  const inputCostPerArticle = (inputTokensPerArticle / 1_000_000) * model.inputPer1M;
  const outputCostPerArticle = (outputTokensPerArticle / 1_000_000) * model.outputPer1M;
  const costPerArticle = inputCostPerArticle + outputCostPerArticle;
  const monthly = costPerArticle * articlesPerMonth;

  return {
    monthly: round2(monthly),
    articlesPerMonth: round2(articlesPerMonth),
    inputTokensPerArticle: Math.round(inputTokensPerArticle),
    outputTokensPerArticle,
    costPerArticle: round6(costPerArticle),
    inputCostPerArticle: round6(inputCostPerArticle),
    outputCostPerArticle: round6(outputCostPerArticle),
  };
}

// Cost of paying a human writer for the same word volume. Two pricing
// modes: "perWord" uses a flat per-word rate; "perHour" multiplies hourly
// rate by hours, where hours = wordsPerMonth / wordsPerHour.
function humanMonthlyCost({ wordsPerMonth, mode, perWordRate, hourlyRate, wordsPerHour }) {
  if (!Number.isFinite(wordsPerMonth) || wordsPerMonth < 0) {
    throw new Error('humanMonthlyCost: wordsPerMonth must be a non-negative number');
  }
  if (mode !== 'perWord' && mode !== 'perHour') {
    throw new Error('humanMonthlyCost: mode must be "perWord" or "perHour"');
  }
  if (mode === 'perWord') {
    if (!Number.isFinite(perWordRate) || perWordRate < 0) {
      throw new Error('humanMonthlyCost: perWordRate must be a non-negative number');
    }
    return {
      monthly: round2(wordsPerMonth * perWordRate),
      effectivePerWord: round6(perWordRate),
      hours: null,
    };
  }
  // perHour
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    throw new Error('humanMonthlyCost: hourlyRate must be a non-negative number');
  }
  if (!Number.isFinite(wordsPerHour) || wordsPerHour <= 0) {
    throw new Error('humanMonthlyCost: wordsPerHour must be a positive number');
  }
  const hours = wordsPerMonth / wordsPerHour;
  const monthly = hours * hourlyRate;
  const effectivePerWord = wordsPerMonth > 0 ? monthly / wordsPerMonth : 0;
  return {
    monthly: round2(monthly),
    effectivePerWord: round6(effectivePerWord),
    hours: round2(hours),
  };
}

// Word volume at which human and LLM costs match. Both costs are linear in
// wordsPerMonth, so the breakeven only depends on per-word cost on each side.
// When the LLM is cheaper per word (the usual case), human is never cheaper:
// returns null. When the LLM is more expensive per word (small models on
// short articles with very low human rates), the breakeven is the volume
// at which human total catches up — but because both scale linearly with
// volume, that breakeven is either 0 or infinity in this simple linear case.
// The figure we expose here is "how many words/month would you have to be
// at for the LLM monthly cost to equal the human monthly cost" given the
// fixed per-article overhead. Since per-article overhead is also linear
// in volume (one API call per article), there is no fixed-cost base, so
// the comparison genuinely is per-word vs per-word.
function breakevenWords({ model, articleWords, inputTokensPerArticle, humanPerWord }) {
  if (!model) throw new Error('breakevenWords: model required');
  if (!Number.isFinite(articleWords) || articleWords <= 0) {
    throw new Error('breakevenWords: articleWords must be a positive number');
  }
  if (!Number.isFinite(inputTokensPerArticle) || inputTokensPerArticle < 0) {
    throw new Error('breakevenWords: inputTokensPerArticle must be a non-negative number');
  }
  if (!Number.isFinite(humanPerWord) || humanPerWord < 0) {
    throw new Error('breakevenWords: humanPerWord must be a non-negative number');
  }
  // LLM cost per word for a given articleWords is constant:
  //   costPerArticle / articleWords
  const outputTokensPerArticle = wordsToTokens(articleWords);
  const costPerArticle =
    (inputTokensPerArticle / 1_000_000) * model.inputPer1M +
    (outputTokensPerArticle / 1_000_000) * model.outputPer1M;
  const llmPerWord = costPerArticle / articleWords;
  return {
    llmPerWord: round6(llmPerWord),
    humanPerWord: round6(humanPerWord),
    // If LLM is cheaper, no positive breakeven exists (human never catches up).
    // If LLM is more expensive, every word above zero already favours human,
    // so the breakeven is effectively zero. We return null in both cases and
    // expose a `verdict` so the UI can say so honestly.
    verdict: llmPerWord < humanPerWord ? 'llm-cheaper' :
             llmPerWord > humanPerWord ? 'human-cheaper' : 'tie',
  };
}

// Compare the same workload across every supplied model. Returns rows
// sorted cheapest first (lowest monthly LLM cost).
function modelComparison({ wordsPerMonth, articleWords, inputTokensPerArticle, models = MODELS }) {
  return models
    .map(function (m) {
      const r = llmMonthlyCost({
        model: m,
        wordsPerMonth: wordsPerMonth,
        articleWords: articleWords,
        inputTokensPerArticle: inputTokensPerArticle,
      });
      return {
        id: m.id,
        name: m.name,
        vendor: m.vendor,
        inputPer1M: m.inputPer1M,
        outputPer1M: m.outputPer1M,
        monthly: r.monthly,
        costPerArticle: r.costPerArticle,
        articlesPerMonth: r.articlesPerMonth,
      };
    })
    .sort(function (a, b) { return a.monthly - b.monthly; });
}

function round2(n) { return Math.round(n * 100) / 100; }
function round6(n) { return Math.round(n * 1_000_000) / 1_000_000; }

const exported = {
  MODELS,
  PRICING_LAST_VERIFIED,
  TOKENS_PER_WORD,
  wordsToTokens,
  llmMonthlyCost,
  humanMonthlyCost,
  breakevenWords,
  modelComparison,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.AIvsHumanWriterCost = exported;
}
