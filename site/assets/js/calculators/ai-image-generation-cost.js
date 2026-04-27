// AI Image Generation Cost Calculator — pure-logic helpers.
//
// Pricing baked in at edit time (April 2026 figures). The page renders a
// "Last verified" caption tied to PRICING_LAST_VERIFIED so users know how
// fresh the numbers are. No runtime API calls: this is a static estimator,
// shared between the browser bundle and the Node test runner.
//
// Per-image USD prices reflect 2026-04-26 verification. Sources:
//   - DALL-E 3 (standard and HD): OpenAI image pricing page
//   - Midjourney v6: Standard plan ($30/mo, ~3500 fast images) → ~$0.0086/img
//   - Stable Diffusion XL (Replicate): Replicate model page
//   - Google Imagen 3: Vertex AI image generation pricing
//   - Flux Pro (Replicate): Replicate model page
//
// Midjourney is sold by subscription, not per call. We treat the Standard
// plan ($30/month for ~3500 fast images) as $0.0086 per image. If the user's
// monthly volume exceeds the plan's fast image quota the real bill goes up,
// but for back-of-envelope budgeting this is the honest figure.
//
// If you change a price:
//   1. update PRICING_LAST_VERIFIED below,
//   2. update the relevant model entries,
//   3. confirm the on-page caption updates,
//   4. run the unit tests and the Playwright spec.

'use strict';

const PRICING_LAST_VERIFIED = '2026-04-26';

// Per-image USD list price. "perImage" is the all-in cost of generating a
// single 1024x1024 image (or the closest standard size each provider sells).
const MODELS = [
  {
    id: 'dalle-3-standard',
    name: 'DALL-E 3 (standard)',
    vendor: 'OpenAI',
    perImage: 0.040,
    notes: 'OpenAI standard quality, 1024x1024.',
  },
  {
    id: 'dalle-3-hd',
    name: 'DALL-E 3 (HD)',
    vendor: 'OpenAI',
    perImage: 0.080,
    notes: 'OpenAI HD quality, 1024x1024. Roughly twice the standard price.',
  },
  {
    id: 'midjourney-v6-standard',
    name: 'Midjourney v6 (Standard plan)',
    vendor: 'Midjourney',
    perImage: 0.0086,
    notes: 'Standard plan: $30/month for ~3500 fast images, so about $0.0086 per fast image. Heavy users will exceed the fast quota.',
  },
  {
    id: 'sdxl-replicate',
    name: 'Stable Diffusion XL (Replicate)',
    vendor: 'Replicate',
    perImage: 0.0023,
    notes: 'Replicate-hosted SDXL. Cheapest mainstream option, output quality varies with the prompt and sampler.',
  },
  {
    id: 'imagen-3',
    name: 'Google Imagen 3',
    vendor: 'Google',
    perImage: 0.040,
    notes: 'Vertex AI image generation, 1024x1024 standard.',
  },
  {
    id: 'flux-pro-replicate',
    name: 'Flux Pro (Replicate)',
    vendor: 'Replicate',
    perImage: 0.055,
    notes: 'Black Forest Labs Flux Pro via Replicate. Premium quality, premium price.',
  },
];

// Cost for a single batch run on one model. images is a non-negative integer.
// Returns the rounded per-image cost and the batch total in USD.
function costForBatch({ model, images }) {
  if (!model || typeof model.perImage !== 'number') {
    throw new Error('costForBatch: model with perImage required');
  }
  if (!Number.isFinite(images) || images < 0) {
    throw new Error('costForBatch: images must be a non-negative number');
  }
  const total = model.perImage * images;
  return {
    perImage: round6(model.perImage),
    total: round4(total),
  };
}

// Project a per-image cost and a monthly image volume to monthly and annual
// totals. Annual is monthly * 12 (calendar months, not 365.25 days, because
// most users will read "annual" as "this many months times twelve").
function projectUsage({ perImage, imagesPerMonth }) {
  if (!Number.isFinite(perImage) || perImage < 0) {
    throw new Error('projectUsage: perImage must be a non-negative number');
  }
  if (!Number.isFinite(imagesPerMonth) || imagesPerMonth < 0) {
    throw new Error('projectUsage: imagesPerMonth must be a non-negative number');
  }
  const monthly = perImage * imagesPerMonth;
  const annual = monthly * 12;
  return {
    perImage: round6(perImage),
    monthly: round2(monthly),
    annual: round2(annual),
  };
}

// Compare every supplied model on the same monthly volume. Returns rows
// sorted cheapest first by monthly cost.
function modelComparison({ imagesPerMonth, models = MODELS }) {
  return models
    .map(function (m) {
      const p = projectUsage({ perImage: m.perImage, imagesPerMonth: imagesPerMonth });
      return {
        id: m.id,
        name: m.name,
        vendor: m.vendor,
        perImage: m.perImage,
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
  costForBatch,
  projectUsage,
  modelComparison,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.AIImageGenerationCost = exported;
}
