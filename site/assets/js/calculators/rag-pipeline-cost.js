// RAG Pipeline Cost Calculator — pure-logic helpers.
//
// Estimates the monthly cost of running a Retrieval-Augmented Generation
// pipeline. No runtime API calls. Pricing is baked in and dated; the page
// shows a "Last verified" caption next to every figure.
//
// Three cost legs:
//   1. Embedding cost: corpus tokens (one-off) + monthly net new tokens.
//   2. Vector DB cost: a fixed monthly figure per provider tier.
//   3. LLM query cost: per query you pay for the retrieved context as input
//      tokens, the user prompt as input tokens, and the response as output
//      tokens. Multiply by queries per day, then by 30.4375.
//
// Pricing sources, all standard list price, all in USD per 1M tokens for
// embedding and LLM, monthly for vector DB:
//   - OpenAI embeddings:  https://platform.openai.com/docs/pricing  (verified 2026-04-26)
//   - Voyage AI:          https://docs.voyageai.com/docs/pricing    (verified 2026-04-26)
//   - Cohere embeddings:  https://cohere.com/pricing                (verified 2026-04-26)
//   - Pinecone:           https://www.pinecone.io/pricing/          (verified 2026-04-26)
//   - Weaviate Cloud:     https://weaviate.io/pricing               (verified 2026-04-26)
//   - Qdrant Cloud:       https://qdrant.tech/pricing/              (verified 2026-04-26)
//   - pgvector self-host: typical small managed Postgres (Supabase / Neon
//                         starter tiers) approx 15 USD/mo            (verified 2026-04-26)
//
// LLM list shares the same shape as llm-token-usage.js so the two stay in
// sync. If you change a price here, append a snapshot to the existing
// llm-pricing-history.json where applicable, bump PRICING_LAST_VERIFIED,
// and re-run the tests.

'use strict';

const PRICING_LAST_VERIFIED = '2026-04-26';

// Embedding models. Price is USD per 1M tokens of input. Embedding APIs
// only bill input tokens, no output side.
const EMBEDDING_MODELS = [
  {
    id: 'text-embedding-3-small',
    name: 'text-embedding-3-small',
    vendor: 'OpenAI',
    pricePer1M: 0.02,
    notes: 'Cheap default. 1536 dims, good enough for most use cases.',
  },
  {
    id: 'text-embedding-3-large',
    name: 'text-embedding-3-large',
    vendor: 'OpenAI',
    pricePer1M: 0.13,
    notes: 'Higher quality, 3072 dims. Costs about 6x the small model.',
  },
  {
    id: 'voyage-3',
    name: 'Voyage 3',
    vendor: 'Voyage AI',
    pricePer1M: 0.06,
    notes: 'Strong retrieval quality, 1024 dims, mid-priced.',
  },
  {
    id: 'cohere-embed-v3',
    name: 'Cohere Embed v3',
    vendor: 'Cohere',
    pricePer1M: 0.10,
    notes: 'Good multilingual coverage. 1024 dims.',
  },
];

// Vector DB tiers. monthlyCost is the fixed bill at the smallest viable
// tier (i.e. one pod / smallest cluster). Storage charges on top of this
// are not modelled because they are negligible at the scale most readers
// run before they outgrow the starter tier.
const VECTOR_DBS = [
  {
    id: 'pinecone-starter',
    name: 'Pinecone Starter',
    monthlyCost: 70,
    notes: 'One s1 pod, ~5M vectors at 1536 dims.',
  },
  {
    id: 'weaviate-cloud',
    name: 'Weaviate Cloud (smallest)',
    monthlyCost: 25,
    notes: 'Sandbox/Standard entry tier.',
  },
  {
    id: 'pgvector-self-hosted',
    name: 'pgvector (self-hosted small Postgres)',
    monthlyCost: 15,
    notes: 'Small managed Postgres on Supabase / Neon / Render with pgvector enabled.',
  },
  {
    id: 'qdrant-cloud',
    name: 'Qdrant Cloud',
    monthlyCost: 25,
    notes: 'Smallest paid cluster, 1GB RAM.',
  },
];

// LLM list mirrors the llm-token-usage calculator. Kept independent so this
// file is self-contained for the Node test runner. If the master list in
// llm-token-usage.js changes, mirror it here too.
const LLM_MODELS = [
  { id: 'claude-opus-4-7',    name: 'Claude Opus 4.7',           vendor: 'Anthropic', inputPer1M: 5.00,  outputPer1M: 25.00 },
  { id: 'claude-sonnet-4-6',  name: 'Claude Sonnet 4.6',         vendor: 'Anthropic', inputPer1M: 3.00,  outputPer1M: 15.00 },
  { id: 'claude-haiku-4-5',   name: 'Claude Haiku 4.5',          vendor: 'Anthropic', inputPer1M: 1.00,  outputPer1M: 5.00  },
  { id: 'gpt-5-5',            name: 'GPT-5.5',                   vendor: 'OpenAI',    inputPer1M: 5.00,  outputPer1M: 30.00 },
  { id: 'gpt-5-4',            name: 'GPT-5.4',                   vendor: 'OpenAI',    inputPer1M: 2.50,  outputPer1M: 15.00 },
  { id: 'gpt-5-4-mini',       name: 'GPT-5.4 mini',              vendor: 'OpenAI',    inputPer1M: 0.75,  outputPer1M: 4.50  },
  { id: 'gemini-3-1-pro',     name: 'Gemini 3.1 Pro (preview)',  vendor: 'Google',    inputPer1M: 2.00,  outputPer1M: 12.00 },
  { id: 'gemini-3-flash',     name: 'Gemini 3 Flash (preview)',  vendor: 'Google',    inputPer1M: 0.50,  outputPer1M: 3.00  },
  { id: 'gemini-2-5-pro',     name: 'Gemini 2.5 Pro',            vendor: 'Google',    inputPer1M: 1.25,  outputPer1M: 10.00 },
  { id: 'gemini-2-5-flash',   name: 'Gemini 2.5 Flash',          vendor: 'Google',    inputPer1M: 0.30,  outputPer1M: 2.50  },
  { id: 'deepseek-v4-flash',  name: 'DeepSeek V4-Flash',         vendor: 'DeepSeek',  inputPer1M: 0.14,  outputPer1M: 0.28  },
  { id: 'deepseek-v4-pro',    name: 'DeepSeek V4-Pro',           vendor: 'DeepSeek',  inputPer1M: 0.435, outputPer1M: 0.87  },
];

const DAYS_PER_MONTH = 30.4375;

// ── Embedding cost ──────────────────────────────────────────────────────
// One-off corpus embedding cost (you only pay this the first time you
// build the index). Monthly cost is just the new tokens added since.
function embeddingCost({ tokens, model }) {
  if (!model || typeof model.pricePer1M !== 'number') {
    throw new Error('embeddingCost: embedding model with pricePer1M required');
  }
  if (!Number.isFinite(tokens) || tokens < 0) {
    throw new Error('embeddingCost: tokens must be a non-negative number');
  }
  return round6((tokens / 1_000_000) * model.pricePer1M);
}

// ── LLM query cost ──────────────────────────────────────────────────────
// Per query: input tokens are (context injected from retrieval) + (user
// prompt). Output tokens are the model's response.
function llmQueryCost({ contextTokens, promptTokens, responseTokens, model }) {
  if (!model || typeof model.inputPer1M !== 'number' || typeof model.outputPer1M !== 'number') {
    throw new Error('llmQueryCost: LLM model with input/output pricing required');
  }
  [contextTokens, promptTokens, responseTokens].forEach(function (n) {
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('llmQueryCost: token counts must be non-negative numbers');
    }
  });
  const inputTokens = contextTokens + promptTokens;
  const inputCost = (inputTokens / 1_000_000) * model.inputPer1M;
  const outputCost = (responseTokens / 1_000_000) * model.outputPer1M;
  return {
    inputTokens: inputTokens,
    outputTokens: responseTokens,
    inputCost: round6(inputCost),
    outputCost: round6(outputCost),
    perQuery: round6(inputCost + outputCost),
  };
}

// ── Pipeline projection ─────────────────────────────────────────────────
// Pulls the full monthly bill together, with a separate first-month total
// (which carries the one-off corpus embedding cost) and an ongoing-month
// total (which does not).
function projectPipeline({
  corpusTokens,
  monthlyNewTokens,
  embeddingModel,
  vectorDb,
  queriesPerDay,
  contextTokens,
  promptTokens,
  responseTokens,
  llmModel,
}) {
  if (!vectorDb || typeof vectorDb.monthlyCost !== 'number') {
    throw new Error('projectPipeline: vectorDb with monthlyCost required');
  }
  if (!Number.isFinite(queriesPerDay) || queriesPerDay < 0) {
    throw new Error('projectPipeline: queriesPerDay must be a non-negative number');
  }

  const oneOffEmbedding = embeddingCost({ tokens: corpusTokens, model: embeddingModel });
  const monthlyEmbedding = embeddingCost({ tokens: monthlyNewTokens, model: embeddingModel });
  const perQuery = llmQueryCost({ contextTokens, promptTokens, responseTokens, model: llmModel });
  const queriesPerMonth = queriesPerDay * DAYS_PER_MONTH;
  const monthlyLLM = perQuery.perQuery * queriesPerMonth;
  const monthlyVectorDb = vectorDb.monthlyCost;

  const ongoingMonth = monthlyEmbedding + monthlyVectorDb + monthlyLLM;
  const firstMonth = ongoingMonth + oneOffEmbedding;

  return {
    oneOffEmbedding: round2(oneOffEmbedding),
    monthlyEmbedding: round2(monthlyEmbedding),
    monthlyVectorDb: round2(monthlyVectorDb),
    monthlyLLM: round2(monthlyLLM),
    perQueryCost: round6(perQuery.perQuery),
    queriesPerMonth: Math.round(queriesPerMonth),
    firstMonth: round2(firstMonth),
    ongoingMonth: round2(ongoingMonth),
  };
}

// ── LLM swap comparison ─────────────────────────────────────────────────
// Hold every other choice constant, swap the LLM, sort cheapest first by
// ongoing-month total. Useful for the "could you save money by switching
// just the model?" question.
function llmComparison(opts) {
  const llms = opts.llmModels || LLM_MODELS;
  return llms
    .map(function (llm) {
      const projection = projectPipeline(Object.assign({}, opts, { llmModel: llm }));
      return {
        id: llm.id,
        name: llm.name,
        vendor: llm.vendor,
        inputPer1M: llm.inputPer1M,
        outputPer1M: llm.outputPer1M,
        perQueryCost: projection.perQueryCost,
        monthlyLLM: projection.monthlyLLM,
        ongoingMonth: projection.ongoingMonth,
        firstMonth: projection.firstMonth,
      };
    })
    .sort(function (a, b) { return a.ongoingMonth - b.ongoingMonth; });
}

// ── Month-by-month breakdown ────────────────────────────────────────────
// Returns an array of N months. Month 1 includes the one-off corpus
// embedding cost; every subsequent month is the ongoing-month figure.
function monthByMonth({ months = 12, projection }) {
  if (!Number.isFinite(months) || months < 1) {
    throw new Error('monthByMonth: months must be a positive integer');
  }
  if (!projection) throw new Error('monthByMonth: projection required');
  const out = [];
  for (let m = 1; m <= months; m++) {
    out.push({
      month: m,
      embedding: m === 1
        ? round2(projection.oneOffEmbedding + projection.monthlyEmbedding)
        : projection.monthlyEmbedding,
      vectorDb: projection.monthlyVectorDb,
      llm: projection.monthlyLLM,
      total: m === 1 ? projection.firstMonth : projection.ongoingMonth,
    });
  }
  return out;
}

function round2(n) { return Math.round(n * 100) / 100; }
function round6(n) { return Math.round(n * 1_000_000) / 1_000_000; }

const exported = {
  PRICING_LAST_VERIFIED,
  EMBEDDING_MODELS,
  VECTOR_DBS,
  LLM_MODELS,
  DAYS_PER_MONTH,
  embeddingCost,
  llmQueryCost,
  projectPipeline,
  llmComparison,
  monthByMonth,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.RAGPipelineCost = exported;
}
