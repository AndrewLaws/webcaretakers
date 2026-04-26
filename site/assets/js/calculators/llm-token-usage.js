// LLM Token Usage Calculator — pure-logic helpers.
//
// Pricing is baked in at build/edit time and rendered with a "Last verified"
// caption on the page. No runtime API calls: this is a static estimator.
//
// Token estimation uses a 4-characters-per-token approximation by default.
// That's the rough Anthropic/OpenAI rule of thumb for English prose and lands
// inside ~15% of the true tokeniser count for typical input. Code, JSON, and
// non-Latin scripts will drift further; the UI labels the result as approximate
// and points users at the official "count tokens" endpoints if they need the
// exact number.
//
// Pricing sources (per 1M tokens, USD, standard non-cached, non-batch):
//   - Anthropic: https://www.anthropic.com/pricing  (verified 2026-04-26)
//   - OpenAI:    https://openai.com/api/pricing/    (verified 2026-04-26)
//   - Google:    https://ai.google.dev/gemini-api/docs/pricing  (verified 2026-04-26)
//   - DeepSeek:  https://api-docs.deepseek.com/quick_start/pricing  (verified 2026-04-26)
//
// If you change a price, update PRICING_LAST_VERIFIED below and the caption
// rendered in the page so users know how fresh the figures are.

'use strict';

const PRICING_LAST_VERIFIED = '2026-04-26';

// Per 1M tokens, in USD. inputPer1M = prompt cost, outputPer1M = completion cost.
// "family" groups models by tokeniser family for the rough character-to-token
// ratio. All current frontier models hover around 3.5-4.2 chars/token for
// English prose; we use 4 across the board and label it as approximate.
const MODELS = [
  {
    id: 'claude-opus-4',
    name: 'Claude Opus 4',
    vendor: 'Anthropic',
    family: 'claude',
    inputPer1M: 15.00,
    outputPer1M: 75.00,
    notes: 'Anthropic flagship. Highest reasoning, highest cost.',
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    vendor: 'Anthropic',
    family: 'claude',
    inputPer1M: 3.00,
    outputPer1M: 15.00,
    notes: 'Anthropic workhorse. Good default for most production work.',
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    vendor: 'OpenAI',
    family: 'gpt',
    inputPer1M: 1.25,
    outputPer1M: 10.00,
    notes: 'OpenAI flagship.',
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 mini',
    vendor: 'OpenAI',
    family: 'gpt',
    inputPer1M: 0.25,
    outputPer1M: 2.00,
    notes: 'OpenAI cheap tier.',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    vendor: 'OpenAI',
    family: 'gpt',
    inputPer1M: 2.50,
    outputPer1M: 10.00,
    notes: 'Older OpenAI flagship, still widely deployed.',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    vendor: 'OpenAI',
    family: 'gpt',
    inputPer1M: 0.15,
    outputPer1M: 0.60,
    notes: 'OpenAI legacy cheap tier. Cheapest credible option for bulk work.',
  },
  {
    id: 'gemini-2-5-pro',
    name: 'Gemini 2.5 Pro',
    vendor: 'Google',
    family: 'gemini',
    inputPer1M: 1.25,
    outputPer1M: 10.00,
    notes: 'Google flagship. Pricing shown is the up-to-200K-prompt tier.',
  },
  {
    id: 'gemini-2-5-flash',
    name: 'Gemini 2.5 Flash',
    vendor: 'Google',
    family: 'gemini',
    inputPer1M: 0.30,
    outputPer1M: 2.50,
    notes: 'Google fast and cheap tier.',
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    vendor: 'DeepSeek',
    family: 'deepseek',
    inputPer1M: 0.27,
    outputPer1M: 1.10,
    notes: 'Open-weights challenger. Cheap, strong reasoning, hosted in CN.',
  },
];

// Approximate token count from a string. Uses 4 chars per token, which is
// the canonical Anthropic/OpenAI rule of thumb for English. Whitespace is
// kept so the count behaves the same way as the real tokenisers (which all
// emit tokens for spaces and newlines).
function estimateTokensFromText(text) {
  if (text == null) return 0;
  const s = String(text);
  if (s.length === 0) return 0;
  // ceil so even a single character costs at least one token.
  return Math.ceil(s.length / 4);
}

// Cost for one call. Tokens are integers; cost returned in USD as a number
// rounded to 6 decimal places (per-call costs are tiny on cheap models).
function costForRun({ model, inputTokens, outputTokens }) {
  if (!model || typeof model.inputPer1M !== 'number' || typeof model.outputPer1M !== 'number') {
    throw new Error('costForRun: model with inputPer1M and outputPer1M required');
  }
  if (!Number.isFinite(inputTokens) || inputTokens < 0) {
    throw new Error('costForRun: inputTokens must be a non-negative number');
  }
  if (!Number.isFinite(outputTokens) || outputTokens < 0) {
    throw new Error('costForRun: outputTokens must be a non-negative number');
  }
  const inputCost = (inputTokens / 1_000_000) * model.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * model.outputPer1M;
  const total = inputCost + outputCost;
  return {
    inputCost: round6(inputCost),
    outputCost: round6(outputCost),
    total: round6(total),
  };
}

// Per-call cost projected to daily, monthly (30.4 day average) and annual
// totals. Returned as plain numbers (USD).
function projectUsage({ perCallCost, callsPerDay }) {
  if (!Number.isFinite(perCallCost) || perCallCost < 0) {
    throw new Error('projectUsage: perCallCost must be a non-negative number');
  }
  if (!Number.isFinite(callsPerDay) || callsPerDay < 0) {
    throw new Error('projectUsage: callsPerDay must be a non-negative number');
  }
  const daily = perCallCost * callsPerDay;
  // 365.25 / 12 = 30.4375 to keep annual = daily * 365.25 self-consistent.
  const monthly = daily * 30.4375;
  const annual = daily * 365.25;
  return {
    perCall: round6(perCallCost),
    daily: round4(daily),
    monthly: round2(monthly),
    annual: round2(annual),
  };
}

// monthlyCost: convenience wrapper that takes per-call cost and a frequency
// in either "perDay" or "perMonth" units, returns the monthly total.
function monthlyCost({ perCallCost, calls, frequency = 'perDay' }) {
  if (frequency !== 'perDay' && frequency !== 'perMonth') {
    throw new Error('monthlyCost: frequency must be "perDay" or "perMonth"');
  }
  const callsPerDay = frequency === 'perDay' ? calls : calls / 30.4375;
  return projectUsage({ perCallCost, callsPerDay }).monthly;
}

// Compare a given workload across every supplied model (or all known models).
// Returns an array sorted cheapest first.
function modelComparison({ inputTokens, outputTokens, callsPerDay, models = MODELS }) {
  return models
    .map(function (m) {
      const c = costForRun({ model: m, inputTokens, outputTokens });
      const p = projectUsage({ perCallCost: c.total, callsPerDay });
      return {
        id: m.id,
        name: m.name,
        vendor: m.vendor,
        inputPer1M: m.inputPer1M,
        outputPer1M: m.outputPer1M,
        perCall: c.total,
        inputCost: c.inputCost,
        outputCost: c.outputCost,
        daily: p.daily,
        monthly: p.monthly,
        annual: p.annual,
      };
    })
    .sort(function (a, b) { return a.monthly - b.monthly; });
}

function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }
function round6(n) { return Math.round(n * 1_000_000) / 1_000_000; }

const exported = {
  MODELS,
  PRICING_LAST_VERIFIED,
  estimateTokensFromText,
  estimateTokens: estimateTokensFromText, // alias kept for the spec's `estimateTokens` name
  costForRun,
  projectUsage,
  monthlyCost,
  modelComparison,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.LLMTokenUsage = exported;
}
