// AI Hallucination Risk Calculator — pure-logic scorer.
//
// Heuristic only. The score is a 0-100 sense-check: base task risk multiplied
// by model class, grounding and verification multipliers, then clamped to 100.
// Stakes does not enter the maths; it shapes the recommendation copy because
// the right action at "Moderate" risk is very different for a low-stakes
// chatbot versus a clinical decision aid.
//
// This is opinionated. The numbers come from the rough order-of-magnitude
// hallucination rates reported in public evaluations (TruthfulQA, HaluEval,
// SimpleQA), not from a formal model. The Prove-it panel says so.

'use strict';

const MODEL_CLASSES = {
  frontier: { label: 'Frontier-tier (GPT-5, Claude Opus, Gemini Ultra)', multiplier: 1.0 },
  midTier: { label: 'Mid-tier (Sonnet, GPT-4o-mini, Gemini Flash)', multiplier: 1.4 },
  small: { label: 'Small (7B-13B open weights, Haiku-class)', multiplier: 2.2 },
  fineTunedDomain: { label: 'Fine-tuned for the domain', multiplier: 0.7 },
};

// Base risk per task type, on a 0-100 scale before any multiplier.
// Creative writing is low because there is no ground truth to deviate from.
// Citation generation is highest because LLMs are notorious for fabricated
// references with plausible-sounding authors.
const TASK_TYPES = {
  creative: { label: 'Creative writing or brainstorming', baseRisk: 10 },
  generalQA: { label: 'General Q&A', baseRisk: 30 },
  code: { label: 'Code generation', baseRisk: 45 },
  factual: { label: 'Factual lookup', baseRisk: 55 },
  numerical: { label: 'Numerical reasoning or calculation', baseRisk: 70 },
  citation: { label: 'Citation or reference generation', baseRisk: 85 },
};

const GROUNDING = {
  none: { label: 'No grounding (model knowledge only)', multiplier: 1.0 },
  webSearch: { label: 'Web search at query time', multiplier: 0.7 },
  rag: { label: 'RAG over a curated corpus', multiplier: 0.5 },
  knowledgeGraph: { label: 'Verified knowledge graph or structured DB', multiplier: 0.3 },
};

const VERIFICATION = {
  none: { label: 'No verification', multiplier: 1.0 },
  human: { label: 'Human review before publish', multiplier: 0.4 },
  secondPass: { label: 'Second-pass LLM check', multiplier: 0.7 },
  programmatic: { label: 'Programmatic checker (regex, schema, unit test)', multiplier: 0.5 },
};

const STAKES = {
  low: { label: 'Low (drafting, ideation, internal notes)' },
  medium: { label: 'Medium (customer-facing copy, marketing)' },
  high: { label: 'High (legal, financial, health information for a real user)' },
  safetyCritical: { label: 'Safety-critical (medical, aviation, nuclear, life-affecting)' },
};

function bandFor(score) {
  if (score <= 25) return 'Low';
  if (score <= 50) return 'Moderate';
  if (score <= 75) return 'High';
  return 'Critical';
}

// Recommendation copy. Keyed by stakes first, then band, because the action
// depends much more on what is at stake than on the precise score.
function recommend({ band, stakes }) {
  if (stakes === 'safetyCritical') {
    if (band === 'Critical' || band === 'High') {
      return 'Do not deploy this configuration for safety-critical work. The combination of model class, task and controls is not safe enough. Add hard grounding (verified knowledge graph or structured database lookup), enforce a programmatic schema check, and require domain-expert sign-off on every output before any user sees it.';
    }
    if (band === 'Moderate') {
      return 'Safety-critical stakes require more headroom than this. Tighten grounding, add a programmatic check, and keep a human domain expert in the loop. A Moderate score is not low enough when the cost of a wrong answer is irreversible.';
    }
    return 'The score is low, but the stakes are safety-critical, so the controls still need to be visible and auditable. Keep the human domain expert sign-off, log every output, and run a periodic adversarial review. Do not relax the controls because the heuristic looks green.';
  }

  if (stakes === 'high') {
    if (band === 'Critical') {
      return 'Do not ship this for high-stakes user-facing work. Hallucinations here cause real financial, legal or health harm. Move to a frontier model, add RAG over a vetted corpus, and put a qualified human in the loop on every output.';
    }
    if (band === 'High') {
      return 'High risk against high stakes is the worst quadrant. Add stronger grounding, switch verification to qualified human review, and add a second-pass check. Do not let outputs reach a user without one of those controls in place.';
    }
    if (band === 'Moderate') {
      return 'Acceptable only with a human reviewer who is qualified for the subject matter, plus logging and a complaint channel. Tighten grounding if you can. Do not auto-publish.';
    }
    return 'Low risk, high stakes: still keep a qualified reviewer in the loop, sample outputs weekly, and write a fall-back response for the cases where the model says it does not know.';
  }

  if (stakes === 'medium') {
    if (band === 'Critical' || band === 'High') {
      return 'Too risky for customer-facing copy as it stands. Add grounding (RAG or web search), put a human editor on the workflow, and consider moving to a frontier model. The reputational cost of a confident wrong answer in marketing copy is bigger than the unit-cost saving.';
    }
    if (band === 'Moderate') {
      return 'Workable with a human editor on the loop and spot-checks of factual claims. Add grounding if the topic includes specifics like prices, names or dates.';
    }
    return 'Low risk for medium stakes. Spot-check outputs, keep a complaint channel, and review the prompt and grounding every few months as content drifts.';
  }

  // low stakes
  if (band === 'Critical' || band === 'High') {
    return 'High risk score even at low stakes is worth fixing because users notice. Add some grounding and a quick second-pass check. The cheap version of "verification" is asking the model to flag its own uncertainty, then having a human glance at the flagged ones.';
  }
  if (band === 'Moderate') {
    return 'Acceptable for drafting and internal use. Sense-check the output before forwarding it to anyone, especially for facts that look specific (numbers, names, dates).';
  }
  return 'Low risk, low stakes: this is a sensible configuration. Keep a light spot-check habit and you are fine. The heuristic is a sense-check, not a guarantee.';
}

function score(answers) {
  const model = MODEL_CLASSES[answers.modelClass];
  const task = TASK_TYPES[answers.taskType];
  const grounding = GROUNDING[answers.grounding];
  const verification = VERIFICATION[answers.verification];

  if (!model || !task || !grounding || !verification) {
    throw new Error('Unknown option in score(): ' + JSON.stringify(answers));
  }

  const raw = task.baseRisk * model.multiplier * grounding.multiplier * verification.multiplier;
  const clamped = Math.min(100, raw);
  // One-decimal precision is overkill for a heuristic. Round to integer.
  const finalScore = Math.round(clamped);
  const band = bandFor(finalScore);
  const recommendation = recommend({ band, stakes: answers.stakes });

  return {
    score: finalScore,
    raw: round2(raw),
    band,
    recommendation,
    breakdown: {
      baseRisk: task.baseRisk,
      modelMultiplier: model.multiplier,
      groundingMultiplier: grounding.multiplier,
      verificationMultiplier: verification.multiplier,
      product: round2(raw),
      capped: raw > 100,
    },
    labels: {
      modelClass: model.label,
      taskType: task.label,
      grounding: grounding.label,
      verification: verification.label,
      stakes: STAKES[answers.stakes] ? STAKES[answers.stakes].label : answers.stakes,
    },
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

const exported = {
  MODEL_CLASSES,
  TASK_TYPES,
  GROUNDING,
  VERIFICATION,
  STAKES,
  score,
  bandFor,
  recommend,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.HallucinationRiskCalculator = exported;
}

// ── DOM controller ────────────────────────────────────────────────────────
//
// Only runs in a browser. Wires up the form, pushes dataLayer events on
// interaction, calculate, and prove-it open.

(function () {
  if (typeof document === 'undefined') return;

  const CALC_NAME = 'AI Hallucination Risk Calculator';

  function init() {
    const form = document.querySelector('[data-hr-form]');
    if (!form) return;

    const calcBtn = form.querySelector('[data-calculate]');
    const resultPanel = document.querySelector('[data-result]');
    const scoreEl = document.querySelector('[data-score]');
    const bandEl = document.querySelector('[data-band]');
    const recommendationEl = document.querySelector('[data-recommendation]');
    const breakdownEl = document.querySelector('[data-breakdown]');
    const proveIt = document.querySelector('[data-prove-it]');

    function readAnswers() {
      return {
        modelClass: form.querySelector('[data-model-class]').value,
        taskType: form.querySelector('[data-task-type]').value,
        grounding: form.querySelector('[data-grounding]').value,
        verification: form.querySelector('[data-verification]').value,
        stakes: form.querySelector('[data-stakes]').value,
      };
    }

    form.addEventListener('change', (e) => {
      const target = e.target;
      const field = target && target.getAttribute && (
        target.getAttribute('data-model-class') !== null ? 'modelClass' :
        target.getAttribute('data-task-type') !== null ? 'taskType' :
        target.getAttribute('data-grounding') !== null ? 'grounding' :
        target.getAttribute('data-verification') !== null ? 'verification' :
        target.getAttribute('data-stakes') !== null ? 'stakes' : null
      );
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'calculator_interaction',
        calculator_name: CALC_NAME,
        field: field || (target && target.name) || 'unknown',
      });
    });

    calcBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const answers = readAnswers();
      const result = score(answers);

      scoreEl.textContent = String(result.score);
      bandEl.textContent = result.band;
      bandEl.setAttribute('data-band-value', result.band.toLowerCase());
      recommendationEl.textContent = result.recommendation;

      const b = result.breakdown;
      breakdownEl.innerHTML =
        '<li><span>Base risk (task type)</span><strong>' + b.baseRisk + '</strong></li>' +
        '<li><span>× Model class</span><strong>×' + b.modelMultiplier + '</strong></li>' +
        '<li><span>× Grounding</span><strong>×' + b.groundingMultiplier + '</strong></li>' +
        '<li><span>× Verification</span><strong>×' + b.verificationMultiplier + '</strong></li>' +
        '<li><span>= Raw product</span><strong>' + b.product + '</strong></li>' +
        '<li><span>Final (capped at 100)</span><strong>' + result.score + '</strong></li>';

      if (resultPanel.hasAttribute('hidden')) resultPanel.removeAttribute('hidden');

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'calculator_result',
        calculator_name: CALC_NAME,
        risk_score: result.score,
        band: result.band,
        model_class: answers.modelClass,
        task_type: answers.taskType,
        grounding: answers.grounding,
        verification: answers.verification,
        stakes: answers.stakes,
      });
    });

    if (proveIt) {
      proveIt.addEventListener('toggle', () => {
        if (!proveIt.open) return;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'prove_it',
          calculator_name: CALC_NAME,
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
