// AI Fine-Tuning Cost Calculator — pure-logic helpers.
//
// Estimates the cost of fine-tuning an LLM (training) and the per-1000-call
// hosted inference cost on the resulting tuned model. No runtime API calls.
// Pricing is baked in and dated; the page shows a "Last verified" caption.
//
// Maths:
//   total training tokens = data tokens × epochs
//   training cost         = total training tokens ÷ 1,000,000 × $/1M training rate
//   per-call inference    = (input tokens × tuned-input rate + output tokens × tuned-output rate) ÷ 1,000,000
//   per-1000 inference    = per-call × 1000
//
// Word-to-token conversion uses the standard rough factor of 1.33 tokens
// per English word (OpenAI's published heuristic). For raw token counts,
// just bypass the conversion.
//
// Pricing sources, all standard list price, all in USD per 1M tokens. Rates
// reviewed 2026-04-28 against the providers' published pages. Hosted-tuned
// inference is typically 1.5x to 2x the base model rate; the figures below
// reflect the live published multipliers, which differ slightly per vendor.
//
//   - OpenAI fine-tuning:  https://openai.com/api/pricing/
//   - Together AI tuning:  https://www.together.ai/pricing
//   - Mistral fine-tuning: https://mistral.ai/technology/#pricing
//
// If you change a price here, bump PRICING_LAST_VERIFIED and re-run tests.

'use strict';

const PRICING_LAST_VERIFIED = '2026-04-28';

// Standard rough conversion. OpenAI's published guidance is "1 token is
// roughly 0.75 words" which inverts to ~1.33 tokens per word for English.
const WORDS_TO_TOKENS = 1.33;

// Five preset fine-tunable models. Rates are USD per 1M tokens.
//   trainingPer1M:   what the provider charges per million tokens of training
//                    data processed (so total training tokens, not data tokens)
//   tunedInputPer1M: hosted-inference input rate on the tuned model
//   tunedOutputPer1M: hosted-inference output rate on the tuned model
const TUNING_MODELS = [
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o-mini',
    vendor: 'OpenAI',
    trainingPer1M: 3.00,
    tunedInputPer1M: 0.30,
    tunedOutputPer1M: 1.20,
    notes: 'Cheapest OpenAI tuning. Tuned inference is roughly 2x base.',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    vendor: 'OpenAI',
    trainingPer1M: 25.00,
    tunedInputPer1M: 3.75,
    tunedOutputPer1M: 15.00,
    notes: 'Heavyweight OpenAI tuning. Tuned inference is roughly 1.5x base.',
  },
  {
    id: 'llama-3-8b-together',
    name: 'Llama-3-8B (Together)',
    vendor: 'Together AI',
    trainingPer1M: 0.48,
    tunedInputPer1M: 0.20,
    tunedOutputPer1M: 0.20,
    notes: 'Open-weights tuning on Together. Cheap training, cheap hosted inference.',
  },
  {
    id: 'llama-3-70b-together',
    name: 'Llama-3-70B (Together)',
    vendor: 'Together AI',
    trainingPer1M: 3.50,
    tunedInputPer1M: 0.90,
    tunedOutputPer1M: 0.90,
    notes: 'Larger Llama tuning on Together. Better quality, mid-priced.',
  },
  {
    id: 'mistral-7b',
    name: 'Mistral-7B',
    vendor: 'Mistral',
    trainingPer1M: 2.00,
    tunedInputPer1M: 0.30,
    tunedOutputPer1M: 0.30,
    notes: 'Mistral La Plateforme fine-tuning. Solid open-weights baseline.',
  },
];

// ── Word → token conversion ────────────────────────────────────────────
function wordsToTokens(words) {
  if (!Number.isFinite(words) || words < 0) {
    throw new Error('wordsToTokens: words must be a non-negative number');
  }
  return Math.round(words * WORDS_TO_TOKENS);
}

// ── Training tokens (data × epochs) ────────────────────────────────────
function trainingTokens({ dataTokens, epochs }) {
  if (!Number.isFinite(dataTokens) || dataTokens < 0) {
    throw new Error('trainingTokens: dataTokens must be a non-negative number');
  }
  if (!Number.isInteger(epochs) || epochs < 1) {
    throw new Error('trainingTokens: epochs must be a positive integer');
  }
  return dataTokens * epochs;
}

// ── Training cost ──────────────────────────────────────────────────────
function trainingCost({ totalTrainingTokens, model }) {
  if (!model || typeof model.trainingPer1M !== 'number') {
    throw new Error('trainingCost: model with trainingPer1M required');
  }
  if (!Number.isFinite(totalTrainingTokens) || totalTrainingTokens < 0) {
    throw new Error('trainingCost: totalTrainingTokens must be a non-negative number');
  }
  return round2((totalTrainingTokens / 1_000_000) * model.trainingPer1M);
}

// ── Hosted inference per 1000 calls ────────────────────────────────────
function inferenceCostPer1000({ inputTokens, outputTokens, model }) {
  if (!model || typeof model.tunedInputPer1M !== 'number' || typeof model.tunedOutputPer1M !== 'number') {
    throw new Error('inferenceCostPer1000: model with tuned input/output rates required');
  }
  [inputTokens, outputTokens].forEach(function (n) {
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('inferenceCostPer1000: token counts must be non-negative numbers');
    }
  });
  const inputCost = (inputTokens / 1_000_000) * model.tunedInputPer1M;
  const outputCost = (outputTokens / 1_000_000) * model.tunedOutputPer1M;
  const perCall = inputCost + outputCost;
  return {
    inputCostPerCall: round6(inputCost),
    outputCostPerCall: round6(outputCost),
    perCall: round6(perCall),
    per1000: round2(perCall * 1000),
  };
}

// ── Full estimate ──────────────────────────────────────────────────────
function estimate({ dataTokens, epochs, inputTokens, outputTokens, model }) {
  if (!model) throw new Error('estimate: model required');
  const total = trainingTokens({ dataTokens, epochs });
  const cost = trainingCost({ totalTrainingTokens: total, model });
  const inference = inferenceCostPer1000({ inputTokens, outputTokens, model });
  return {
    modelId: model.id,
    modelName: model.name,
    vendor: model.vendor,
    dataTokens: dataTokens,
    epochs: epochs,
    totalTrainingTokens: total,
    trainingPer1M: model.trainingPer1M,
    trainingCost: cost,
    tunedInputPer1M: model.tunedInputPer1M,
    tunedOutputPer1M: model.tunedOutputPer1M,
    inputTokens: inputTokens,
    outputTokens: outputTokens,
    inferencePerCall: inference.perCall,
    inferencePer1000: inference.per1000,
    inferenceInputCostPerCall: inference.inputCostPerCall,
    inferenceOutputCostPerCall: inference.outputCostPerCall,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }
function round6(n) { return Math.round(n * 1_000_000) / 1_000_000; }

const exported = {
  PRICING_LAST_VERIFIED,
  WORDS_TO_TOKENS,
  TUNING_MODELS,
  wordsToTokens,
  trainingTokens,
  trainingCost,
  inferenceCostPer1000,
  estimate,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.FineTuningCost = exported;
}
