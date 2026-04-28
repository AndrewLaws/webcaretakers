// Embedding Cost Calculator — pure-logic helpers.
//
// Estimates the cost of generating embeddings for a corpus of documents.
// No runtime API calls. Pricing baked in and dated; the page surfaces a
// "Last verified" caption beside every figure.
//
// Sources, all USD per 1M tokens, list price, non-batch:
//   - OpenAI text-embedding-3-small:  $0.02/M  (verified 2026-04-28)
//   - OpenAI text-embedding-3-large:  $0.13/M  (verified 2026-04-28)
//   - Cohere embed-v3:                $0.10/M  (verified 2026-04-28)
//   - Voyage AI voyage-3:             $0.06/M  (verified 2026-04-28)

'use strict';

const PRICING_LAST_VERIFIED = '2026-04-28';

const EMBEDDING_MODELS = [
  {
    id: 'text-embedding-3-small',
    name: 'text-embedding-3-small',
    vendor: 'OpenAI',
    pricePer1M: 0.02,
    dimensions: 1536,
    notes: 'Cheap default. Good enough for most retrieval workloads.',
  },
  {
    id: 'text-embedding-3-large',
    name: 'text-embedding-3-large',
    vendor: 'OpenAI',
    pricePer1M: 0.13,
    dimensions: 3072,
    notes: 'Higher recall than the small model, costs about 6.5x.',
  },
  {
    id: 'cohere-embed-v3',
    name: 'embed-v3',
    vendor: 'Cohere',
    pricePer1M: 0.10,
    dimensions: 1024,
    notes: 'Strong multilingual coverage.',
  },
  {
    id: 'voyage-3',
    name: 'voyage-3',
    vendor: 'Voyage AI',
    pricePer1M: 0.06,
    dimensions: 1024,
    notes: 'Strong retrieval quality, mid-priced.',
  },
  {
    id: 'custom',
    name: 'Custom $/M tokens',
    vendor: 'Custom',
    pricePer1M: null,
    dimensions: null,
    notes: 'Use your own price per million tokens.',
  },
];

const DAYS_PER_MONTH = 30.4375;
const WEEKS_PER_MONTH = DAYS_PER_MONTH / 7; // ~4.345

// Refreshes-per-month multiplier for the monthly recurring cost.
function refreshesPerMonth(refresh) {
  switch (refresh) {
    case 'one-off': return 0;
    case 'monthly': return 1;
    case 'weekly':  return WEEKS_PER_MONTH;
    case 'daily':   return DAYS_PER_MONTH;
    default:
      throw new Error('estimateEmbeddingCost: unknown refresh frequency "' + refresh + '"');
  }
}

function totalTokens({ docCount, avgWords, wordsToTokens }) {
  return docCount * avgWords * wordsToTokens;
}

function findModel(modelId) {
  for (let i = 0; i < EMBEDDING_MODELS.length; i++) {
    if (EMBEDDING_MODELS[i].id === modelId) return EMBEDDING_MODELS[i];
  }
  throw new Error('estimateEmbeddingCost: unknown modelId "' + modelId + '"');
}

function estimateEmbeddingCost({
  docCount,
  avgWords,
  wordsToTokens,
  modelId,
  customPrice,
  refresh,
  months,
}) {
  if (!Number.isFinite(docCount) || docCount < 0) {
    throw new Error('estimateEmbeddingCost: docCount must be a non-negative number');
  }
  if (!Number.isFinite(avgWords) || avgWords < 0) {
    throw new Error('estimateEmbeddingCost: avgWords must be a non-negative number');
  }
  if (!Number.isFinite(wordsToTokens) || wordsToTokens <= 0) {
    throw new Error('estimateEmbeddingCost: wordsToTokens must be positive');
  }
  if (!Number.isFinite(months) || months < 0) {
    throw new Error('estimateEmbeddingCost: months must be non-negative');
  }

  const model = findModel(modelId);
  let pricePer1M;
  if (model.id === 'custom') {
    if (!Number.isFinite(customPrice) || customPrice <= 0) {
      throw new Error('estimateEmbeddingCost: custom price must be a positive number');
    }
    pricePer1M = customPrice;
  } else {
    pricePer1M = model.pricePer1M;
  }

  const tokens = totalTokens({ docCount, avgWords, wordsToTokens });
  const costPerRefresh = (tokens / 1_000_000) * pricePer1M;

  const oneOffCost = costPerRefresh; // First embed always happens
  const refreshes = refreshesPerMonth(refresh);
  const monthlyCost = costPerRefresh * refreshes;
  const totalCost = oneOffCost + monthlyCost * months;
  const per1000DocsCost = docCount > 0 ? oneOffCost * (1000 / docCount) : 0;

  return {
    totalTokens: tokens,
    oneOffCost: round6(oneOffCost),
    monthlyCost: round6(monthlyCost),
    totalCost: round6(totalCost),
    per1000DocsCost: round6(per1000DocsCost),
    pricePer1M: pricePer1M,
    dimensions: model.dimensions,
    modelId: model.id,
    modelLabel: model.vendor + ' — ' + model.name,
    refresh: refresh,
    months: months,
    refreshesPerMonth: refreshes,
  };
}

function round6(n) { return Math.round(n * 1_000_000) / 1_000_000; }

const exported = {
  PRICING_LAST_VERIFIED,
  EMBEDDING_MODELS,
  DAYS_PER_MONTH,
  WEEKS_PER_MONTH,
  totalTokens,
  estimateEmbeddingCost,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.EmbeddingCost = exported;
}
